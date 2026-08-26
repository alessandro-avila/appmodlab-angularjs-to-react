/**
 * FLIGHT SEARCH — the React port of `app/components/flight-search/`.
 *
 * Replaces, in one screen:
 *   $scope / $rootScope   -> React state + the notification store (ADR-013)
 *   $watch                -> derived state and explicit handlers
 *   jQuery UI datepicker  -> native <input type="date"> (ADR-007 cat 1)
 *   jQuery fadeIn/fadeOut -> conditional render
 *   jQuery .animate scroll-> element.scrollIntoView (ADR-007 cat 3)
 *   Moment.js             -> date-fns with explicit formats (ADR-009/ADR-014)
 *   Lodash                -> native array methods
 *   Restangular           -> Increment 0's API client
 *
 * Behaviour is preserved exactly except for ADR-009 (explicit date parsing),
 * which is the one change authorised for this increment. Where the legacy screen
 * does something surprising, it is reproduced and annotated — see the price
 * slider (C-4) and the booking confirmation.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { Flight, Filters, SearchParams, SortField, StopsFilter, DepartTimeRange, TripType } from '../../types/flight';
import { notify } from '../../stores/notification-store';
import { publishScope, clearScope, announce } from '../../lib/test-seam';
import { searchFlights, bookFlight } from './flight-search-api';
import {
  applyFilters,
  airlinesOf,
  priceRangeOf,
  initialMaxPrice,
  snapToStep,
  PRICE_STEP,
  nextSortState,
  reconcileReturnDate,
  validateSearch,
  parseInputDate,
  toInputValue,
  formatDuration,
  formatTime,
  formatFlightDate,
  formatPrice,
  foundNotification,
  bookedNotification,
} from './flight-search-model';

const INITIAL_PARAMS: SearchParams = {
  origin: '',
  destination: '',
  departDate: null,
  returnDate: null,
  passengers: 1,
  cabinClass: 'economy',
  tripType: 'roundtrip',
};

const INITIAL_FILTERS: Filters = {
  maxPrice: 5000,
  stops: 'any',
  airline: '',
  departTimeRange: 'any',
};

export function FlightSearch(): ReactElement {
  const [searchParams, setSearchParams] = useState<SearchParams>(INITIAL_PARAMS);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 5000 });
  const [sort, setSort] = useState<{ field: SortField; reverse: boolean }>({
    field: 'price',
    reverse: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const detailsRef = useRef<HTMLDivElement | null>(null);

  const airlines = useMemo(() => airlinesOf(flights), [flights]);
  const filteredFlights = useMemo(
    () => applyFilters(flights, filters, sort.field, sort.reverse),
    [flights, filters, sort],
  );

  /* -------- the test seam: a scope-shaped snapshot for the green baseline --- */
  useEffect(() => {
    publishScope({
      searchParams,
      flights,
      filteredFlights,
      selectedFlight,
      filters,
      priceRange,
      airlines,
      sortField: sort.field,
      sortReverse: sort.reverse,
      isLoading,
      hasSearched,
      errorMessage,
    });
  });
  useEffect(() => clearScope, []);

  /* ------------------------------------------------------------------ dates */

  /**
   * The return-date consistency rule (controller:45-53). Preserved exactly:
   * changing an existing departure date past the return date pushes the return
   * date to the day after, while setting the FIRST departure date leaves it be.
   */
  const changeDepartDate = useCallback((value: string) => {
    const next = parseInputDate(value);
    setSearchParams((prev) => ({
      ...prev,
      departDate: next,
      returnDate: reconcileReturnDate(prev.departDate, next, prev.returnDate),
    }));
  }, []);

  const changeReturnDate = useCallback((value: string) => {
    setSearchParams((prev) => ({ ...prev, returnDate: parseInputDate(value) }));
  }, []);

  /** controller:55-59 — switching to one way clears the return date. */
  const changeTripType = useCallback((tripType: TripType) => {
    setSearchParams((prev) => ({
      ...prev,
      tripType,
      returnDate: tripType === 'oneway' ? null : prev.returnDate,
    }));
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
    setSelectedFlight(null);

    try {
      const results = await searchFlights(searchParams);
      const range = priceRangeOf(results);

      setFlights(results);
      setPriceRange(range);
      // controller:117 — the filter resets to the top of the new range on every
      // search. `initialMaxPrice` applies the C-4 slider snap; see the model.
      setFilters({ ...INITIAL_FILTERS, maxPrice: initialMaxPrice(range) });
      notify(foundNotification(results.length), 'success');
    } catch {
      // controller:121-123. The legacy service had no rejection handler at all
      // (finding P-8); the client now has one error policy and the screen shows
      // the same message the controller set.
      setErrorMessage('Failed to search flights. Please try again.');
      notify('Flight search failed', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  /* -------------------------------------------------- selection and booking */

  /**
   * controller:200-208. The jQuery scroll animation
   * (`$('html, body').animate({scrollTop: ...}, 400)`) becomes
   * `scrollIntoView` — ADR-007 category 3, the declarative scroll effect.
   *
   * NOTE: the legacy code also broadcast `flight:selected` here. ADR-013 maps
   * that event to NO store concern — it is deliberately dropped, not ported.
   * Its only listener was the hotel-booking controller, which was never alive at
   * the same time, so the pre-fill never happened. The journey stays unserved;
   * `hotel-booking.feature:209` passes by construction because there is no
   * pre-fill mechanism at all (increment-plan §2.4).
   */
  const selectFlight = useCallback((flight: Flight) => {
    setSelectedFlight(flight);
  }, []);

  useEffect(() => {
    if (selectedFlight !== null) {
      // Feature-detected: `scrollIntoView` is not implemented in jsdom, and a
      // scroll effect must never be the reason a screen fails to render.
      detailsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedFlight]);

  const book = useCallback(async () => {
    if (selectedFlight === null) return;
    setIsLoading(true);
    try {
      const booking = await bookFlight(selectedFlight.id, {
        passengers: searchParams.passengers,
        cabinClass: searchParams.cabinClass,
      });
      // controller:220 — reproduces the legacy "Confirmation: undefined". The
      // payload has `confirmationNumber`; the legacy code read
      // `confirmationCode`. See bookedNotification() for why that is preserved.
      notify(bookedNotification(booking), 'success');
      // controller:221 — announced, and (still) nothing consumes it.
      announce('itinerary:refresh');
      setSelectedFlight({ ...selectedFlight, booked: true });
      setFlights((prev) =>
        prev.map((f) => (f.id === selectedFlight.id ? { ...f, booked: true } : f)),
      );
    } catch {
      notify('Booking failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFlight, searchParams.passengers, searchParams.cabinClass]);

  /* ------------------------------------------------------------------ render */

  const stopsLabel = (stops: number): string =>
    stops === 0 ? 'Non-stop' : stops === 1 ? '1 stop' : `${stops} stops`;

  return (
    <div className="container" data-testid="flight-search">
      {/* ------------------------------------------------------- search form */}
      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">Find Your Flight</h3>
        </div>
        <div className="panel-body">
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn ${searchParams.tripType === 'roundtrip' ? 'btn-primary' : 'btn-default'}`}
              onClick={() => changeTripType('roundtrip')}
            >
              Round Trip
            </button>
            <button
              type="button"
              className={`btn ${searchParams.tripType === 'oneway' ? 'btn-primary' : 'btn-default'}`}
              onClick={() => changeTripType('oneway')}
            >
              One Way
            </button>
          </div>

          <div className="row" style={{ marginTop: 15 }}>
            <div className="col-md-2 search-field-required">
              <label htmlFor="origin">From</label>
              <input
                type="text"
                id="origin"
                className="form-control"
                placeholder="City or Airport"
                value={searchParams.origin}
                onChange={(e) => setSearchParams((p) => ({ ...p, origin: e.target.value }))}
              />
            </div>
            <div className="col-md-2 search-field-required">
              <label htmlFor="destination">To</label>
              <input
                type="text"
                id="destination"
                className="form-control"
                placeholder="City or Airport"
                value={searchParams.destination}
                onChange={(e) => setSearchParams((p) => ({ ...p, destination: e.target.value }))}
              />
            </div>

            {/*
              ADR-007 category 1: the jQuery UI datepicker becomes a native date
              input. ADR-009: its value is parsed with an explicit format, and
              typing now updates the model — which the legacy text field could
              not do, because a typed value never fired the widget's onSelect.
            */}
            <div className="col-md-2">
              <label htmlFor="departDate">Departure</label>
              <input
                type="date"
                id="departDate"
                className="form-control"
                value={toInputValue(searchParams.departDate)}
                onChange={(e) => changeDepartDate(e.target.value)}
              />
            </div>

            {/*
              `ng-show`, not `ng-if` — the legacy template at
              `flight-search.template.html:61` HIDES this field for a one-way
              trip, it does not remove it. The difference is observable: the
              scenario "Switching to a one way trip clears the return date"
              reads the field's value, which requires the element to exist.
              Conditional rendering would remove it and the read would fail.
            */}
            <div
              className="col-md-2"
              style={{ display: searchParams.tripType === 'roundtrip' ? undefined : 'none' }}
            >
              <label htmlFor="returnDate">Return</label>
              <input
                type="date"
                id="returnDate"
                className="form-control"
                value={toInputValue(searchParams.returnDate)}
                onChange={(e) => changeReturnDate(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label htmlFor="passengers">Passengers</label>
              <select
                id="passengers"
                className="form-control"
                value={String(searchParams.passengers)}
                onChange={(e) =>
                  setSearchParams((p) => ({ ...p, passengers: Number(e.target.value) }))
                }
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label htmlFor="cabinClass">Cabin</label>
              <select
                id="cabinClass"
                className="form-control"
                value={searchParams.cabinClass}
                onChange={(e) => setSearchParams((p) => ({ ...p, cabinClass: e.target.value }))}
              >
                <option value="economy">Economy</option>
                <option value="premium">Premium Economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ marginTop: 15 }}
            onClick={() => void runSearch()}
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Search Flights'}
          </button>

          {errorMessage !== '' && (
            <div className="alert alert-danger" style={{ marginTop: 15 }} data-testid="validation-error">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* jQuery fadeIn/fadeOut (controller:104, :126) -> conditional render. */}
      {isLoading && (
        <div id="search-overlay" className="search-overlay" data-testid="search-overlay">
          <p>Searching for the best flights...</p>
        </div>
      )}

      {/* ----------------------------------------------------------- results */}
      {hasSearched && !isLoading && (
        <div className="row">
          <div className="col-md-3">
            <div className="panel panel-default">
              <div className="panel-heading">
                <h4 className="panel-title">Filter Results</h4>
              </div>
              <div className="panel-body">
                <label htmlFor="maxPrice">Max Price: {formatPrice(filters.maxPrice)}</label>
                {/*
                  C-4, REPRODUCED DELIBERATELY. step=50 counted from `min` means
                  the highest representable value can sit below the dearest
                  flight, so the filter hides flights the notification counted.
                  increment-plan §5.3 authorises superseding this under ADR-006;
                  this increment authorises only ADR-009, so it is preserved.
                */}
                <input
                  type="range"
                  id="maxPrice"
                  className="form-control"
                  min={priceRange.min}
                  max={priceRange.max}
                  step={PRICE_STEP}
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      maxPrice: snapToStep(
                        Number(e.target.value),
                        priceRange.min,
                        priceRange.max,
                        PRICE_STEP,
                      ),
                    }))
                  }
                />

                <label htmlFor="stopsFilter">Stops</label>
                <select
                  id="stopsFilter"
                  className="form-control"
                  data-testid="filter-stops"
                  value={filters.stops}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, stops: e.target.value as StopsFilter }))
                  }
                >
                  <option value="any">Any</option>
                  <option value="0">Non-stop</option>
                  <option value="1">1 stop or fewer</option>
                  <option value="2">2 stops or fewer</option>
                </select>

                <label htmlFor="airlineFilter">Airline</label>
                <select
                  id="airlineFilter"
                  className="form-control"
                  data-testid="filter-airline"
                  value={filters.airline}
                  onChange={(e) => setFilters((f) => ({ ...f, airline: e.target.value }))}
                >
                  <option value="">All Airlines</option>
                  {airlines.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>

                <label htmlFor="departTimeFilter">Departure Time</label>
                <select
                  id="departTimeFilter"
                  className="form-control"
                  data-testid="filter-depart-time"
                  value={filters.departTimeRange}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      departTimeRange: e.target.value as DepartTimeRange,
                    }))
                  }
                >
                  <option value="any">Any Time</option>
                  <option value="morning">Morning (6am - 12pm)</option>
                  <option value="afternoon">Afternoon (12pm - 6pm)</option>
                  <option value="evening">Evening (6pm - 6am)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="col-md-9">
            <div className="panel panel-default">
              <div className="panel-heading">
                <h4 className="panel-title" style={{ paddingTop: 5 }}>
                  {filteredFlights.length} flights found
                </h4>
                <div className="btn-group" role="group" style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-default" onClick={() => setSort((s) => nextSortState(s, 'price'))}>
                    Price
                  </button>
                  <button type="button" className="btn btn-default" onClick={() => setSort((s) => nextSortState(s, 'durationMinutes'))}>
                    Duration
                  </button>
                  <button type="button" className="btn btn-default" onClick={() => setSort((s) => nextSortState(s, 'departureTime'))}>
                    Departure
                  </button>
                </div>
              </div>

              <div className="list-group">
                {filteredFlights.map((flight) => (
                  // eslint-disable-next-line jsx-a11y/anchor-is-valid
                  <a
                    key={flight.id}
                    href=""
                    className={`list-group-item${selectedFlight?.id === flight.id ? ' active' : ''}`}
                    data-testid="flight-row"
                    onClick={(e) => {
                      e.preventDefault();
                      selectFlight(flight);
                    }}
                  >
                    <div className="row">
                      <div className="col-md-2">
                        <strong>{flight.airline}</strong>
                        <br />
                        {/* The API sends no flight number — feature:177. */}
                        <small className="text-muted"></small>
                      </div>
                      <div className="col-md-3 text-center">
                        <span className="h4">{formatTime(flight.departureTime)}</span>
                        <br />
                        <small>{flight.origin}</small>
                      </div>
                      <div className="col-md-2 text-center">
                        <small className="text-muted">{formatDuration(flight.durationMinutes)}</small>
                        {/*
                          The whitespace below is load-bearing. The legacy
                          template had newlines between these tags, so the
                          row's textContent read "5h 47m 1 stop". JSX strips
                          newlines between elements, which would collapse it to
                          "5h 47m1 stop" and break the word boundary that the
                          baseline's row parser matches on.
                        */}{' '}
                        <br />
                        <hr style={{ margin: '2px 0' }} />
                        <small>{stopsLabel(flight.stops)}</small>{' '}
                      </div>
                      <div className="col-md-3 text-center">
                        <span className="h4">{formatTime(flight.arrivalTime)}</span>
                        <br />
                        <small>{flight.destination}</small>
                      </div>
                      <div className="col-md-2 text-right">
                        <span className="h3 text-primary">{formatPrice(flight.price)}</span>
                        <br />
                        <small className="text-muted">per person</small>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {filteredFlights.length === 0 && (
                <div className="panel-body text-center">
                  <p className="text-muted">
                    No flights match your filters. Try adjusting your search criteria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- details panel */}
      {selectedFlight !== null && (
        <div id="flight-details" className="row" ref={detailsRef}>
          <div className="col-md-12">
            <div className="panel panel-success">
              <div className="panel-heading">
                <h3 className="panel-title">Selected Flight Details</h3>
              </div>
              <div className="panel-body">
                <div className="row">
                  <div className="col-md-4">
                    {/* "<airline> - <flightNumber>"; the number is always absent. */}
                    <h4>{selectedFlight.airline} - </h4>
                    <p>
                      <strong>Route:</strong> {selectedFlight.origin} → {selectedFlight.destination}
                    </p>
                    <p>
                      <strong>Date:</strong> {formatFlightDate(selectedFlight.departDate)}
                    </p>
                    <p>
                      <strong>Departure:</strong> {formatTime(selectedFlight.departureTime)}
                    </p>
                    <p>
                      <strong>Arrival:</strong> {formatTime(selectedFlight.arrivalTime)}
                    </p>
                  </div>
                  <div className="col-md-4">
                    <p>
                      <strong>Duration:</strong> {formatDuration(selectedFlight.durationMinutes)}
                    </p>
                    <p>
                      <strong>Stops:</strong>{' '}
                      {selectedFlight.stops === 0 ? 'Non-stop' : selectedFlight.stops}
                    </p>
                    <p>
                      <strong>Cabin:</strong> {searchParams.cabinClass.toUpperCase()}
                    </p>
                    {/* The API sends no aircraft; the legacy default was 'TBD'. */}
                    <p>
                      <strong>Aircraft:</strong> TBD
                    </p>
                  </div>
                  <div className="col-md-4 text-right">
                    <h2 className="text-success">
                      {formatPrice(selectedFlight.price * searchParams.passengers)}
                    </h2>
                    <p className="text-muted">
                      Total for {searchParams.passengers} passenger(s)
                    </p>
                    <button
                      type="button"
                      className="btn btn-lg btn-success"
                      onClick={() => void book()}
                      disabled={isLoading || selectedFlight.booked}
                    >
                      {selectedFlight.booked ? 'Booked!' : 'Book This Flight'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
