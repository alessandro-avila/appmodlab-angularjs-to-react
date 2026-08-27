/**
 * HOTEL-BOOKING MODEL — the pure logic of `hotel-booking.controller.js`.
 *
 * Same shape as `flight-search-model.ts`: pure functions, so behaviour is
 * testable without a DOM and the component owns only rendering and effects.
 * Shared date and money primitives come from `src/lib/format.ts` — there is no
 * second implementation of either here.
 */
import {
  addDays,
  differenceInDays,
  formatMoneyCurrency,
  formatMoneyPlain,
} from '../../lib/format';
import type { Hotel, HotelFilters, HotelSearchParams, Room, HotelSortBy } from '../../types/hotel';

/* ---------------------------------------------------------------- constants */

/** `controller:39-42`, in order. */
export const AVAILABLE_AMENITIES: readonly string[] = [
  'WiFi',
  'Pool',
  'Gym',
  'Spa',
  'Restaurant',
  'Parking',
  'Airport Shuttle',
  'Business Center',
];

export const VALIDATION_MESSAGES = {
  missingCity: 'Please enter a city.',
  missingDates: 'Please select check-in and check-out dates.',
} as const;

/* --------------------------------------------------------------- validation */

/** `controller:94-105`, in the same order and with the same messages. */
export function validateSearch(params: HotelSearchParams): string | null {
  if (!params.city) return VALIDATION_MESSAGES.missingCity;
  if (!params.checkIn || !params.checkOut) return VALIDATION_MESSAGES.missingDates;
  return null;
}

/* ------------------------------------------------------------ date coupling */

/**
 * The check-out consistency rule — `controller:45-54`.
 *
 * Choosing a check-in date moves check-out to the day after **whenever
 * check-out is absent OR is not strictly later than check-in**
 * (`!checkOut || checkIn.isSameOrAfter(checkOut)`).
 *
 * This differs from flight-search's rule, and the difference is observable:
 * flight-search requires a PREVIOUS departure date before it will move the
 * return date, so the first date chosen leaves the return alone. Hotel booking
 * has no such guard, so the first check-in chosen DOES set check-out.
 * `hotel-booking.feature:46` pins that, and `:61` pins the discard.
 */
export function reconcileCheckOut(checkIn: Date | null, checkOut: Date | null): Date | null {
  if (!checkIn) return checkOut;
  if (!checkOut || checkIn.getTime() >= checkOut.getTime()) return addDays(checkIn, 1);
  return checkOut;
}

/**
 * `_calculateNights` — `controller:258-263`. Zero unless BOTH dates are set,
 * which is what `hotel-booking.feature:57` pins: choosing only a check-out date
 * leaves the stay length unknown.
 */
export function nightCount(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  return differenceInDays(checkIn, checkOut);
}

/* -------------------------------------------------------------------- stars */

/**
 * `getStars` — `controller:250-252`, `new Array(Math.round(rating))`.
 * The template repeats over it, so only the LENGTH is observable.
 */
export function starCount(rating: number): number {
  return Math.round(rating);
}

/* ------------------------------------------------- service-computed fields */

/**
 * The three fields `hotel-booking.service.js:20-26` decorates onto every hotel
 * before the card renders. They are NOT sent by the API — the card reads
 * `hotel.ratingText`, `hotel.reviewSummary` and `hotel.amenitiesText`, all of
 * which the service computes.
 *
 * Computed in the component rather than mutated onto the payload (finding P-9,
 * "business logic embedded in templates" — compute in the component, render
 * values), but the OUTPUT is identical.
 */

/** `_getRatingText` — `service.js:71-77`, thresholds in this order. */
export function ratingText(rating: number): string {
  if (rating >= 4.5) return 'Exceptional';
  if (rating >= 4.0) return 'Excellent';
  if (rating >= 3.5) return 'Very Good';
  if (rating >= 3.0) return 'Good';
  return 'Average';
}

/** `service.js:24` — `hotel.reviewCount + ' reviews'`. */
export function reviewSummary(reviewCount: number): string {
  return `${reviewCount} reviews`;
}

/** `service.js:23` — `_.join(hotel.amenities, ', ')`. */
export function amenitiesText(amenities: readonly string[]): string {
  return amenities.join(', ');
}

/**
 * Room order.
 *
 * `service.js:38` sorts with `_.sortBy(rooms, 'pricePerNight')` — a field rooms
 * do not have. Every key is `undefined`, so lodash's stable sort leaves the API
 * order untouched. Reproducing that means NOT sorting at all.
 */
export function orderRooms(rooms: readonly Room[]): Room[] {
  return [...rooms];
}

/* ------------------------------------------------------------------ filters */

/** `toggleAmenity` — `controller:177-184`. */
export function toggleAmenity(selected: readonly string[], amenity: string): string[] {
  return selected.includes(amenity)
    ? selected.filter((a) => a !== amenity)
    : [...selected, amenity];
}

/**
 * The sort arm of `applyFilters` — `controller:157-171`.
 *
 * `recommended` is `_.orderBy(['featured','rating'], ['desc','desc'])`: featured
 * hotels first, then rating descending within each group.
 */
export function sortHotels(hotels: readonly Hotel[], sortBy: HotelSortBy): Hotel[] {
  const out = [...hotels];
  switch (sortBy) {
    case 'priceLow':
      return out.sort((a, b) => a.pricePerNight - b.pricePerNight);
    case 'priceHigh':
      // `_.sortBy(...).reverse()` — ascending, then reversed.
      return out.sort((a, b) => a.pricePerNight - b.pricePerNight).reverse();
    case 'rating':
      return out.sort((a, b) => b.rating - a.rating);
    case 'recommended':
    default:
      return out.sort((a, b) => {
        const featured = Number(b.featured) - Number(a.featured);
        return featured !== 0 ? featured : b.rating - a.rating;
      });
  }
}

/**
 * `applyFilters` — `controller:134-174`, in the same order:
 * rating, then price, then amenities (ALL must match), then sort.
 */
export function applyFilters(hotels: readonly Hotel[], filters: HotelFilters): Hotel[] {
  let filtered = hotels.filter((h) => h.rating >= filters.minRating);
  filtered = filtered.filter((h) => h.pricePerNight <= filters.maxPrice);

  if (filters.amenities.length > 0) {
    filtered = filtered.filter((h) => filters.amenities.every((a) => h.amenities.includes(a)));
  }

  return sortHotels(filtered, filters.sortBy);
}

/* ------------------------------------------------------------------- prices */

/** Hotel card price and stay total — `template:146`, `:149`. */
export function formatHotelPrice(amount: number): string {
  return formatMoneyCurrency(amount);
}

/** The "Max Price/Night: $N" label — `template:100`, plain concatenation. */
export function formatMaxPriceLabel(amount: number): string {
  return formatMoneyPlain(amount);
}

/** `hotel.pricePerNight * nightCount * rooms` — `template:149`. */
export function stayTotal(pricePerNight: number, nights: number, rooms: number): number {
  return pricePerNight * nights * rooms;
}

/* --------------------------------------------------------- rooms and booking */

/**
 * THE ROOM KEY.
 *
 * Rooms carry no `id` (discovery Q3), which is exactly why the legacy
 * `track by room.id` produced five `undefined` keys and AngularJS refused to
 * render the table. `type` is unique within a response, so it is the natural
 * key — used both for React list keys and as the room identifier sent to the
 * booking API.
 */
export function roomKey(room: Room): string {
  return room.type;
}

/** Discovery Q2: `available: 0` is reachable on three of the five room types. */
export function isRoomAvailable(room: Room): boolean {
  return room.available > 0;
}

/**
 * The booking total.
 *
 * CORRECTED, NOT REPRODUCED. `controller:231` reads `selectedRoom.pricePerNight`
 * — a field a ROOM does not have (a HOTEL does) — so the legacy total is `NaN`.
 *
 * increment-plan §6.5 scenario 24 authorises the fix under **ADR-005** and
 * **Q-3**: the scenario documenting the defect exists only because the room
 * table never rendered, so there is no reachable behaviour to preserve.
 * Building this path correctly is building it for the first time.
 */
export function bookingTotal(room: Room, nights: number, rooms: number): number {
  return room.price * nights * rooms;
}

/** The booking summary total, rendered — `template:222`. */
export function formatBookingTotal(room: Room, nights: number, rooms: number): string {
  return formatMoneyCurrency(bookingTotal(room, nights, rooms));
}

/**
 * The confirmation notification — `controller:236-237`.
 *
 * CORRECTED, NOT REPRODUCED, under the same authority as `bookingTotal`. The
 * legacy expression read `confirmation.confirmationCode` from a payload that
 * carries `confirmationNumber`, rendering the literal text
 * "Hotel booked! Confirmation: undefined".
 *
 * > Note the asymmetry with flight-search, which REPRODUCES the identical
 * > mistake. That is deliberate: the flight booking path works and its scenario
 * > passes either way, so changing it would be an unauthorised user-visible
 * > change. This path has never been reachable at all.
 */
export function bookedNotification(booking: { confirmationNumber: string }): string {
  return `Hotel booked! Confirmation: ${booking.confirmationNumber}`;
}

export function foundNotification(count: number, city: string): string {
  // controller:124 — 'Found ' + results.length + ' hotels in ' + params.city
  return `Found ${count} hotels in ${city}`;
}
