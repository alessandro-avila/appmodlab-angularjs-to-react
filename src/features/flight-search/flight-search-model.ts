/**
 * FLIGHT-SEARCH MODEL — the pure logic of `flight-search.controller.js`.
 *
 * Everything here is a pure function so the 19 retired Karma assertions have
 * direct, fast replacements (ADR-008 §2). The React component owns rendering
 * and effects; this module owns behaviour.
 *
 * Legacy dependencies and their replacements:
 *   lodash  _.uniq/_.map/_.minBy/_.maxBy/_.filter/_.orderBy  -> native array methods
 *   moment  duration/format/parse                            -> date-fns + Intl
 *   jQuery  DOM effects                                      -> React + scrollIntoView
 */
import { parse, format, isValid } from 'date-fns';
import type {
  Flight,
  FlightBooking,
  Filters,
  PriceRange,
  SearchParams,
  SortField,
  DepartTimeRange,
} from '../../types/flight';

/* ------------------------------------------------------------------ dates */

/**
 * The date and money primitives moved to `src/lib/format.ts` in Increment 2, so
 * hotel-booking uses the same implementations rather than a second copy. They
 * are re-exported here because this module's public surface — and the tests
 * that pin it — were established in Increment 1.
 */
export {
  UI_DATE_FORMAT,
  INPUT_DATE_FORMAT,
  API_DATE_FORMAT,
  parseInputDate,
  parseUiDate,
  toInputValue,
  toApiValue,
  addDays,
} from '../../lib/format';

import { addDays, formatMoneyPlain } from '../../lib/format';

/* --------------------------------------------------------------- formatting */

/**
 * `formatDuration` — controller:231, via `moment.duration(m,'minutes')`.
 * Produces "5h 47m".
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

/** `formatTime` — controller:236, `moment(t,'HH:mm').format('h:mm A')`. */
export function formatTime(time: string): string {
  const parsed = parse(time, 'HH:mm', new Date());
  if (!isValid(parsed)) return time;
  return format(parsed, 'h:mm a').toUpperCase().replace(/\./g, '');
}

/** `formatDate` — controller:240, `moment(d).format('ddd, MMM D, YYYY')`. */
export function formatFlightDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return '';
  return format(date, 'EEE, MMM d, yyyy');
}

/** `moment(d).format('ddd, MMM D')` — service.js:26 `departDateFormatted`. */
export function formatShortDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return '';
  return format(date, 'EEE, MMM d');
}

/**
 * Currency. The legacy row renders `${{flight.price}}`
 * (`flight-search.template.html:216`) and the Max Price label renders
 * `Max Price: ${{filters.maxPrice}}` (`:126`) — plain concatenation, so an
 * integer price shows as "$215" and NOT "$215.00".
 *
 * `Intl.NumberFormat` is configured to reproduce that exactly: no forced
 * decimals, up to two when a price genuinely has them. Q-9 made currency
 * single-value USD.
 *
 * (The legacy service also computed `priceFormatted` with `.toFixed(2)` at
 * `flight-search.service.js:25`, but no template ever rendered it, so it is not
 * ported — it is dead code.)
 */
export function formatPrice(price: number): string {
  return formatMoneyPlain(price);
}

/* --------------------------------------------------------------- validation */

export const VALIDATION_MESSAGES = {
  missingRoute: 'Please enter origin and destination.',
  missingDepartDate: 'Please select a departure date.',
  missingReturnDate: 'Please select a return date for round trips.',
} as const;

/**
 * `validateSearch` — controller:131-149, in the same order, with the same
 * messages. The order matters: the route check runs before the date checks, so
 * an empty form reports the route message and not the date one.
 */
export function validateSearch(params: SearchParams): string | null {
  if (!params.origin || !params.destination) return VALIDATION_MESSAGES.missingRoute;
  if (!params.departDate) return VALIDATION_MESSAGES.missingDepartDate;
  if (params.tripType === 'roundtrip' && !params.returnDate) {
    return VALIDATION_MESSAGES.missingReturnDate;
  }
  return null;
}

/* ------------------------------------------------------------ date coupling */

/**
 * The return-date consistency rule — controller:45-53.
 *
 * The legacy `$watch` fires only when BOTH the new and old values are truthy
 * (`if (newVal && oldVal && newVal !== oldVal)`), which is why choosing the
 * FIRST departure date leaves an existing return date alone
 * (`flight-search.feature:78`) while CHANGING it pushes the return date to the
 * day after (`:71`).
 *
 * ADR-009 changes only the parse beneath this rule; the rule itself survives
 * unchanged.
 */
export function reconcileReturnDate(
  previousDepart: Date | null,
  nextDepart: Date | null,
  returnDate: Date | null,
): Date | null {
  if (!nextDepart || !previousDepart) return returnDate;
  if (nextDepart.getTime() === previousDepart.getTime()) return returnDate;
  if (!returnDate) return returnDate;
  return nextDepart.getTime() > returnDate.getTime() ? addDays(nextDepart, 1) : returnDate;
}

/* -------------------------------------------------------------- result stats */

/** `_.uniq(_.map(results,'airline'))` — controller:114, insertion-ordered. */
export function airlinesOf(flights: readonly Flight[]): string[] {
  return [...new Set(flights.map((f) => f.airline))];
}

/** `_.minBy`/`_.maxBy` with the legacy empty-list fallbacks — controller:115-116. */
export function priceRangeOf(flights: readonly Flight[]): PriceRange {
  if (flights.length === 0) return { min: 0, max: 5000 };
  const prices = flights.map((f) => f.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * C-4 — THE PRICE-SLIDER SNAP, REPRODUCED DELIBERATELY.
 *
 * The control is `<input type="range" min={priceRange.min} max={priceRange.max}
 * step="50">` (`flight-search.template.html:127-129`) and the controller assigns
 * `filters.maxPrice = priceRange.max` (`controller:117`).
 *
 * AngularJS 1.6's `input[range]` directive clamps the model to the step grid,
 * which starts at `min`. With min=230 and max=642 the highest representable
 * value is 630, so the filter settles BELOW the dearest flight and hides the
 * flights priced 638 and 642 — while `controller:120` announces the UNFILTERED
 * count. That is what `flight-search.feature:118` and `:123` pin.
 *
 * increment-plan §5.3 authorises superseding both under ADR-006. This increment
 * authorises ONLY ADR-009, so the snap is PRESERVED and this function exists to
 * reproduce it. Removing it is a separate, deliberate increment.
 */
export function snapToStep(value: number, min: number, max: number, step: number): number {
  if (step <= 0) return Math.min(Math.max(value, min), max);
  const clamped = Math.min(Math.max(value, min), max);
  const steps = Math.floor((clamped - min) / step);
  const snapped = min + steps * step;
  return snapped < min ? min : snapped;
}

export const PRICE_STEP = 50;

/** The value the slider settles on after a search — controller:117 through C-4. */
export function initialMaxPrice(range: PriceRange): number {
  return snapToStep(range.max, range.min, range.max, PRICE_STEP);
}

/* ------------------------------------------------------------------ filtering */

/** The fixed bands at controller:174-176. Note evening wraps midnight. */
export function isWithinBand(departureTime: string, band: DepartTimeRange): boolean {
  if (band === 'any') return true;
  const hour = Number(departureTime.split(':')[0] ?? NaN);
  if (Number.isNaN(hour)) return false;
  switch (band) {
    case 'morning':
      return hour >= 6 && hour < 12;
    case 'afternoon':
      return hour >= 12 && hour < 18;
    case 'evening':
      return hour >= 18 || hour < 6;
    default:
      return true;
  }
}

/** Replaces `_.orderBy(list,[field],[dir])` for the three sortable fields. */
function compare(a: Flight, b: Flight, field: SortField): number {
  const left = a[field];
  const right = b[field];
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

/**
 * `applyFilters` — controller:152-186, in the same order:
 * price, then stops, then airline, then departure band, then sort.
 */
export function applyFilters(
  flights: readonly Flight[],
  filters: Filters,
  sortField: SortField,
  sortReverse: boolean,
): Flight[] {
  let filtered = flights.filter((f) => f.price <= filters.maxPrice);

  if (filters.stops !== 'any') {
    const maxStops = Number.parseInt(filters.stops, 10);
    filtered = filtered.filter((f) => f.stops <= maxStops);
  }

  if (filters.airline) {
    filtered = filtered.filter((f) => f.airline === filters.airline);
  }

  if (filters.departTimeRange !== 'any') {
    filtered = filtered.filter((f) => isWithinBand(f.departureTime, filters.departTimeRange));
  }

  const sorted = [...filtered].sort((a, b) => compare(a, b, sortField));
  return sortReverse ? sorted.reverse() : sorted;
}

/**
 * `sortBy` — controller:189-197. Selecting the field already sorted reverses it;
 * selecting a new field sorts ascending.
 */
export function nextSortState(
  current: { field: SortField; reverse: boolean },
  field: SortField,
): { field: SortField; reverse: boolean } {
  if (current.field === field) return { field, reverse: !current.reverse };
  return { field, reverse: false };
}

/* ------------------------------------------------------------- notifications */

export function foundNotification(count: number): string {
  // controller:120 — 'Found ' + results.length + ' flights'
  return `Found ${count} flights`;
}

/**
 * controller:220 — 'Flight booked successfully! Confirmation: ' + booking.confirmationCode
 *
 * DEFECT REPAIRED — ADR-024 D-3.
 *
 * The legacy controller read `booking.confirmationCode`. The API returns
 * `confirmationNumber`, so the legacy expression evaluated to `undefined` and
 * every successful booking told the user:
 *
 *     "Flight booked successfully! Confirmation: undefined"
 *
 * That was reproduced deliberately through the increments, on the grounds that
 * no decision authorised changing it. Post-cutover review authorised the repair,
 * so this now reads the field the payload actually carries and shows a real code.
 *
 * Worth remembering how it survived: `flight-search.feature:183` asserts only the
 * message PREFIX. The scenario passed against `undefined` and would pass equally
 * against a real code — an assertion that stopped one token short of the bug.
 * Tightening it is tracked as FOLLOW-1 rather than smuggled in here.
 *
 * The hotel path (`hotel-booking-model.ts`) always read `confirmationNumber` and
 * needed no change.
 */
export function bookedNotification(booking: FlightBooking): string {
  return `Flight booked successfully! Confirmation: ${booking.confirmationNumber}`;
}
