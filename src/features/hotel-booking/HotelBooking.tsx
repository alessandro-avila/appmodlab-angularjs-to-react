/**
 * HOTEL BOOKING — the React port of `app/components/hotel-booking/`.
 *
 * Follows the pattern established by `FlightSearch.tsx` in Increment 1: pure
 * logic in `hotel-booking-model.ts`, data access through Increment 0's API
 * client, shared date/money primitives from `src/lib/format.ts`, and a
 * scope-shaped snapshot published for the baseline harness.
 *
 * THREE THINGS ARE NEW RATHER THAN PORTED, because the room table has never
 * rendered (`ngRepeat:dupes`, finding P-7): the room table itself, room
 * selection with a booking summary, and the confirmation dialogue. See
 * `specs/docs/architecture/hotel-booking-room-path.md`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THERE IS DELIBERATELY NO `flight:selected` PRE-FILL.
 * ─────────────────────────────────────────────────────────────────────────
 * The legacy controller listened for `flight:selected` and pre-filled the city
 * and dates (`controller:266-270`), but the two controllers were never alive at
 * the same time, so it never ran. `hotel-booking.feature:209` pins the absence.
 * Both modules are React now, so a store read COULD trivially make it work —
 * and it is deliberately not built. Decided at the start of Increment 2, per
 * increment-plan §6.5 and §6.8. A unit test asserts the absence.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { Hotel, HotelFilters, HotelSearchParams, Room, HotelSortBy } from '../../types/hotel';
import { notify } from '../../stores/notification-store';
import { publishScope, clearScope, announce } from '../../lib/test-seam';
import { toInputValue, toApiValue, parseInputDate } from '../../lib/format';
import { Modal } from '../../components/modal';
import { searchHotels, getHotelRooms, bookRoom } from './hotel-booking-api';
import {
  AVAILABLE_AMENITIES,
  applyFilters,
  validateSearch,
  reconcileCheckOut,
  nightCount as computeNights,
  starCount,
  ratingText,
  reviewSummary,
  amenitiesText,
  orderRooms,
  toggleAmenity,
  formatHotelPrice,
  formatMaxPriceLabel,
  stayTotal,
  roomKey,
  isRoomAvailable,
  bookingTotal,
  formatBookingTotal,
  bookedNotification,
  foundNotification,
} from './hotel-booking-model';

const INITIAL_PARAMS: HotelSearchParams = {
  city: '',
  checkIn: null,
  checkOut: null,
  guests: 1,
  rooms: 1,
};

const INITIAL_FILTERS: HotelFilters = {
  minRating: 0,
  maxPrice: 1000,
  amenities: [],
  sortBy: 'recommended',
};

export function HotelBooking(): ReactElement {
  const [searchParams, setSearchParams] = useState<HotelSearchParams>(INITIAL_PARAMS);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filters, setFilters] = useState<HotelFilters>(INITIAL_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmation, setConfirmation] = useState<{ code: string; total: number } | null>(null);

  const roomsRef = useRef<HTMLDivElement | null>(null);

  const nights = computeNights(searchParams.checkIn, searchParams.checkOut);
  const filteredHotels = useMemo(() => applyFilters(hotels, filters), [hotels, filters]);

  /* -------- the test seam: a scope-shaped snapshot for the baseline -------- */
  useEffect(() => {
    publishScope({
      searchParams,
      hotels,
      filteredHotels,
      // The legacy harness reads rooms off the selected hotel.
      selectedHotel: selectedHotel === null ? null : { ...selectedHotel, rooms },
      selectedRoom,
      filters,
      nightCount: nights,
      isLoading,
      hasSearched,
      errorMessage,
      bookingConfirmation: confirmation,
    });
  });
  useEffect(() => clearScope, []);

  /* ------------------------------------------------------------------ dates */

  const changeCheckIn = useCallback((value: string) => {
    const next = parseInputDate(value);
    setSearchParams((prev) => ({
      ...prev,
      checkIn: next,
      checkOut: reconcileCheckOut(next, prev.checkOut),
    }));
  }, []);

  const changeCheckOut = useCallback((value: string) => {
    setSearchParams((prev) => ({ ...prev, checkOut: parseInputDate(value) }));
  }, []);

  /* ----------------------------------------------------------------- search */

  const runSearch = useCallback(async () => {
    const message = validateSearch(searchParams);
    if (message !== null) {
      setErrorMessage(message);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setHasSearched(true);
    setSelectedHotel(null);
    setSelectedRoom(null);
    setRooms([]);

    try {
      const results = await searchHotels(searchParams);
      setHotels(results);
      notify(foundNotification(results.length, searchParams.city), 'success');
    } catch {
      setErrorMessage('Hotel search failed. Please try again.');
      notify('Hotel search failed', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  /* -------------------------------------------------------- rooms & booking */

  const viewRooms = useCallback(
    async (hotel: Hotel) => {
      setSelectedHotel(hotel);
      setSelectedRoom(null);
      setRooms([]);
      setIsLoading(true);
      try {
        const loaded = await getHotelRooms(hotel.id, {
          checkIn: searchParams.checkIn,
          checkOut: searchParams.checkOut,
        });
        setRooms(orderRooms(loaded));
      } catch {
        setErrorMessage('Could not load room details.');
      } finally {
        setIsLoading(false);
      }
    },
    [searchParams.checkIn, searchParams.checkOut],
  );

  // controller:201-205 — the jQuery scroll animation becomes scrollIntoView
  // (ADR-007 category 3). Feature-detected: jsdom does not implement it.
  useEffect(() => {
    if (rooms.length > 0) {
      roomsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }, [rooms]);

  const confirmBooking = useCallback(async () => {
    if (selectedHotel === null || selectedRoom === null) return;
    setIsLoading(true);
    try {
      const total = bookingTotal(selectedRoom, nights, searchParams.rooms);
      const booking = await bookRoom({
        hotelId: selectedHotel.id,
        // Rooms carry no `id`; `type` is the natural key, and `roomType` is the
        // field name the server actually reads (`api-mock/server.js:449`).
        roomType: roomKey(selectedRoom),
        checkIn: toApiValue(searchParams.checkIn) ?? '',
        checkOut: toApiValue(searchParams.checkOut) ?? '',
        guests: searchParams.guests,
        rooms: searchParams.rooms,
        totalPrice: total,
      });
      setConfirmation({ code: booking.confirmationNumber, total });
      notify(bookedNotification(booking), 'success');
      // controller:238 — announced, and (still) nothing consumes it until Inc-3.
      announce('itinerary:refresh');
    } catch {
      notify('Hotel booking failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedHotel, selectedRoom, nights, searchParams]);

  /* ------------------------------------------------------------------ render */

  return (
    <div className="container" data-testid="hotel-booking">
      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">Find Your Hotel</h3>
        </div>
        <div className="panel-body">
          <div className="row">
            <div className="col-md-3" id="cityInput">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                className="form-control"
                placeholder="Where are you going?"
                value={searchParams.city}
                onChange={(e) => setSearchParams((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div className="col-md-2">
              <label htmlFor="hotelCheckIn">Check-in</label>
              <input
                type="date"
                id="hotelCheckIn"
                className="form-control"
                value={toInputValue(searchParams.checkIn)}
                onChange={(e) => changeCheckIn(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label htmlFor="hotelCheckOut">Check-out</label>
              <input
                type="date"
                id="hotelCheckOut"
                className="form-control"
                value={toInputValue(searchParams.checkOut)}
                onChange={(e) => changeCheckOut(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label htmlFor="guests">Guests</label>
              <select
                id="guests"
                className="form-control"
                value={String(searchParams.guests)}
                onChange={(e) => setSearchParams((p) => ({ ...p, guests: Number(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label htmlFor="rooms">Rooms</label>
              <select
                id="rooms"
                className="form-control"
                value={String(searchParams.rooms)}
                onChange={(e) => setSearchParams((p) => ({ ...p, rooms: Number(e.target.value) }))}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 15 }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => void runSearch()}
              disabled={isLoading}
            >
              {isLoading ? 'Searching...' : 'Search Hotels'}
            </button>
            {nights > 0 && (
              <span className="label label-info" style={{ marginLeft: 10 }}>
                {nights} night(s)
              </span>
            )}
          </div>

          {errorMessage !== '' && (
            <div className="alert alert-danger" style={{ marginTop: 15 }}>
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {hasSearched && !isLoading && (
        <div className="row">
          {/* ------------------------------------------------------ filters */}
          <div className="col-md-3">
            <div className="panel panel-default">
              <div className="panel-heading">
                <h4 className="panel-title">Filter</h4>
              </div>
              <div className="panel-body">
                <label htmlFor="minRating">Min Rating: {filters.minRating}</label>
                <input
                  type="range"
                  id="minRating"
                  className="form-control"
                  min={0}
                  max={5}
                  step={1}
                  value={filters.minRating}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minRating: Number(e.target.value) }))
                  }
                />

                <label htmlFor="maxPrice">
                  Max Price/Night: {formatMaxPriceLabel(filters.maxPrice)}
                </label>
                <input
                  type="range"
                  id="maxPrice"
                  className="form-control"
                  min={50}
                  max={1000}
                  step={25}
                  value={filters.maxPrice}
                  onChange={(e) => setFilters((f) => ({ ...f, maxPrice: Number(e.target.value) }))}
                />

                <label htmlFor="sortBy">Sort By</label>
                <select
                  id="sortBy"
                  className="form-control"
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, sortBy: e.target.value as HotelSortBy }))
                  }
                >
                  <option value="recommended">Recommended</option>
                  <option value="priceLow">Price: Low to High</option>
                  <option value="priceHigh">Price: High to Low</option>
                  <option value="rating">Guest Rating</option>
                </select>

                <div style={{ marginTop: 10 }}>
                  <strong>Amenities</strong>
                  {AVAILABLE_AMENITIES.map((amenity) => (
                    <div className="checkbox" key={amenity}>
                      <label>
                        <input
                          type="checkbox"
                          checked={filters.amenities.includes(amenity)}
                          onChange={() =>
                            setFilters((f) => ({
                              ...f,
                              amenities: toggleAmenity(f.amenities, amenity),
                            }))
                          }
                        />{' '}
                        {amenity}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------ results */}
          <div className="col-md-9">
            <p className="text-muted">{filteredHotels.length} hotels found</p>

            {filteredHotels.map((hotel) => (
              <div className="panel panel-default" key={hotel.id} data-testid="hotel-card">
              <div className="panel-body">
                <div className="row">
                  <div className="col-md-5">
                    <h4>
                      {hotel.name}{' '}
                      {hotel.featured && <span className="label label-warning">Featured</span>}
                    </h4>
                    {/*
                      DOM structure carried over from `template:136-143`, which
                      the baseline's card parser depends on. In particular the
                      FIRST `p.text-muted` in the card is the ADDRESS line, and
                      it renders empty because the API sends no address
                      (`hotel-booking.feature:91`, PRESERVED).
                    */}
                    <p>
                      {Array.from({ length: starCount(hotel.rating) }, (_, i) => (
                        <span key={i}>
                          <i className="glyphicon glyphicon-star text-warning" />
                        </span>
                      ))}{' '}
                      <span className="text-muted">
                        ({ratingText(hotel.rating)} - {reviewSummary(hotel.reviewCount)})
                      </span>
                    </p>
                    <p className="text-muted">
                      <i className="glyphicon glyphicon-map-marker" />{' '}
                    </p>
                    <p>
                      <small>{amenitiesText(hotel.amenities)}</small>
                    </p>
                  </div>
                  <div className="col-md-4 text-right">
                    <h3 className="text-primary">{formatHotelPrice(hotel.pricePerNight)}</h3>
                    <p className="text-muted">per night</p>
                    {nights > 0 && (
                      <p>
                        <strong>
                          Total:{' '}
                          {formatHotelPrice(
                            stayTotal(hotel.pricePerNight, nights, searchParams.rooms),
                          )}
                        </strong>
                      </p>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void viewRooms(hotel)}
                    >
                      View Rooms
                    </button>
                  </div>
                </div>
              </div>
              </div>
            ))}

            {filteredHotels.length === 0 && (
              <div className="text-center">
                <p className="text-muted">No hotels match your criteria. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- rooms panel */}
      {selectedHotel !== null && rooms.length > 0 && (
        <div id="hotel-rooms" className="panel panel-info" ref={roomsRef}>
          <div className="panel-heading">
            <h4 className="panel-title">Rooms at {selectedHotel.name}</h4>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Room Type</th>
                <th>Price/Night</th>
                <th>Beds</th>
                <th>Max Guests</th>
                <th>Available</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {/*
                Keyed by `type`, NOT by `id`. Rooms carry no `id` — that is
                exactly what produced five undefined keys, `ngRepeat:dupes`, and
                a table that never rendered (finding P-7).
              */}
              {rooms.map((room) => {
                const available = isRoomAvailable(room);
                const isSelected = selectedRoom !== null && roomKey(selectedRoom) === roomKey(room);
                return (
                  <tr
                    key={roomKey(room)}
                    className={isSelected ? 'info' : undefined}
                    data-testid="room-row"
                    data-room-type={room.type}
                    data-available={String(room.available)}
                  >
                    <td>{room.type}</td>
                    <td>
                      <strong>{formatHotelPrice(room.price)}</strong>
                    </td>
                    <td>{room.beds}</td>
                    <td>{room.maxGuests}</td>
                    <td>
                      {available ? (
                        `${room.available} left`
                      ) : (
                        <span className="text-danger" data-testid="room-unavailable">
                          Unavailable
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        disabled={!available}
                        onClick={() => setSelectedRoom(room)}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --------------------------------------------------- booking summary */}
      {selectedRoom !== null && selectedHotel !== null && (
        <div className="panel panel-success" data-testid="booking-summary">
          <div className="panel-heading">
            <h3 className="panel-title">Booking Summary</h3>
          </div>
          <div className="panel-body">
            <p>
              <strong>Hotel:</strong> {selectedHotel.name}
            </p>
            <p>
              <strong>Room:</strong> {selectedRoom.type}
            </p>
            <p>
              <strong>Nights:</strong> {nights}
            </p>
            <p>
              <strong>Rooms:</strong> {searchParams.rooms}
            </p>
            <h2>{formatBookingTotal(selectedRoom, nights, searchParams.rooms)}</h2>
            <button
              type="button"
              className="btn btn-lg btn-success"
              onClick={() => void confirmBooking()}
              disabled={isLoading}
            >
              Confirm Booking
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------- confirmation dialogue */}
      <Modal
        id="bookingConfirmationModal"
        open={confirmation !== null}
        title="Booking Confirmed"
        onClose={() => setConfirmation(null)}
      >
        <p>
          <strong>Confirmation:</strong> {confirmation?.code}
        </p>
        <p>
          <strong>Total:</strong> {confirmation ? formatHotelPrice(confirmation.total) : ''}
        </p>
      </Modal>
    </div>
  );
}
