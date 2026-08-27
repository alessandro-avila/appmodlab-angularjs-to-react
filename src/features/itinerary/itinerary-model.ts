/**
 * ITINERARY MODEL — the pure half of the screen.
 *
 * Everything here is a function of its arguments so it can be tested without a
 * browser, a clock or a server. It carries the 22 lodash and 19 moment call
 * sites that did real work in `itinerary.controller.js` and
 * `itinerary.service.js`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE ONE PLACE THIS CODEBASE PARSED A DATE CORRECTLY
 * ─────────────────────────────────────────────────────────────────────────
 * `itinerary.controller.js:190` is `moment(time, 'HH:mm')` — WITH a format
 * string. It is the only parse in the entire application that names its input
 * format; every other moment call in the product hands moment a bare string and
 * lets it guess, which is the defect ADR-009 exists to remove.
 *
 * `formatTime` below keeps that correctness. It is not loosened to match the
 * rest of the codebase — the rest of the codebase was raised to match it.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY EVERY DATE GOES THROUGH `parse`, NEVER `new Date()`
 * ─────────────────────────────────────────────────────────────────────────
 * `new Date('2024-03-15')` is UTC midnight; `moment('2024-03-15')` is LOCAL
 * midnight. Substituting one for the other shifts a day boundary for anyone
 * west of Greenwich and would silently regroup the day breakdown. date-fns
 * `parse` is local, which is what the baseline pins.
 */
import { parse, format } from 'date-fns';
import { differenceInDays } from '../../lib/format';
import type { Trip, ItineraryItem } from '../../types/itinerary';

/* ------------------------------------------------------------------ formats */

const API_DAY = 'yyyy-MM-dd';
const REFERENCE = new Date(2000, 0, 1);

/** `moment(date).format('MMM D, YYYY')` — trip list and item dates. */
export function formatTripDate(date: string): string {
  return format(parse(date, API_DAY, REFERENCE), 'MMM d, yyyy');
}

/** `moment(date).format('dddd, MMMM D')` — day headings. */
export function formatDayHeading(date: string): string {
  return format(parse(date, API_DAY, REFERENCE), 'EEEE, MMMM d');
}

/**
 * `moment(time, 'HH:mm').format('h:mm A')` — `itinerary.controller.js:189-191`.
 *
 * The explicit source format is the point of this function. An item whose time
 * is absent or unparseable renders as absent, per ADR-009 (3) — the template's
 * `{{item.timeFormatted || 'TBD'}}` then supplies "TBD".
 */
export function formatTime(time: string | undefined): string {
  if (time === undefined || time === '') return '';
  const parsed = parse(time, 'HH:mm', REFERENCE);
  return Number.isNaN(parsed.getTime()) ? '' : format(parsed, 'h:mm a');
}

/**
 * `'$' + (item.cost || 0).toFixed(2)` — `itinerary.service.js:36`.
 *
 * DELIBERATELY UNGROUPED, and this is not the same as the trip total. The
 * template renders trip and summary money through AngularJS `number:2`, which
 * groups (`$1,330.00`); item costs are built by string concatenation with
 * `toFixed`, which does not (`$1250.00`). Both renderings were measured against
 * the running legacy app.
 *
 * Until Increment 3 the difference was unreachable, because no seeded item cost
 * $1,000 or more. SEAM-3 makes it reachable: a booked hotel can. The
 * inconsistency is a defect, it is now visible, and it is PRESERVED — no
 * scenario pins it and nothing authorises changing it (ADR-020).
 */
export function formatItemCost(cost: number | undefined): string {
  return `$${(cost ?? 0).toFixed(2)}`;
}

/* -------------------------------------------------------------------- trips */

export type TripStatus = 'upcoming' | 'active' | 'completed';

/**
 * `_getTripStatus()` — `itinerary.controller.js:213-220`.
 *
 * The server sends "upcoming" for both seeds and the client throws it away.
 * `itinerary.feature` pins that the derived value wins and both trips read
 * "completed"; PRESERVED.
 */
export function deriveTripStatus(trip: Trip, now: Date): TripStatus {
  const start = parse(trip.startDate, API_DAY, REFERENCE);
  const end = parse(trip.endDate, API_DAY, REFERENCE);
  if (now < start) return 'upcoming';
  if (now > end) return 'completed';
  return 'active';
}

export interface DecoratedTrip extends Trip {
  readonly startFormatted: string;
  readonly endFormatted: string;
  readonly daysUntil: number;
  readonly duration: number;
  readonly derivedStatus: TripStatus;
}

/**
 * `loadTrips()`'s decoration step — `itinerary.controller.js:32-41`.
 *
 * The legacy MUTATED the API response, adding five fields to the object it had
 * just been handed. This returns a new object instead; nothing else changes.
 */
export function decorateTrip(trip: Trip, now: Date): DecoratedTrip {
  const start = parse(trip.startDate, API_DAY, REFERENCE);
  const end = parse(trip.endDate, API_DAY, REFERENCE);
  return {
    ...trip,
    startFormatted: formatTripDate(trip.startDate),
    endFormatted: formatTripDate(trip.endDate),
    daysUntil: differenceInDays(now, start),
    duration: differenceInDays(start, end),
    derivedStatus: deriveTripStatus(trip, now),
  };
}

/** `_.orderBy(trips, ['startDate'], ['asc'])` — `:42`. */
export function sortTripsByStart<T extends { startDate: string }>(trips: readonly T[]): T[] {
  return [...trips].sort((a, b) =>
    a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0,
  );
}

/* ------------------------------------------------------------- day grouping */

export interface ItineraryDay {
  readonly date: string;
  readonly dateFormatted: string;
  readonly dayNumber: number;
  readonly items: readonly ItineraryItem[];
}

/**
 * `_.groupBy` + `_.map` + `_.sortBy` — `itinerary.controller.js:64-77`.
 *
 * Two behaviours the baseline pins, both preserved:
 *
 *   A day with no items is ABSENT, and the numbering does not close the gap.
 *   17 March has nothing booked, so the NYC trip shows Day 1, Day 2, Day 4 —
 *   on a trip whose duration reads "3 days".
 *
 *   `dayNumber` is 1-indexed off the TRIP start, not off the first day that
 *   has items.
 */
export function groupItemsByDay(
  items: readonly ItineraryItem[],
  tripStartDate: string,
): ItineraryDay[] {
  const start = parse(tripStartDate, API_DAY, REFERENCE);
  const groups = new Map<string, ItineraryItem[]>();

  for (const item of items) {
    const key = item.date;
    const bucket = groups.get(key);
    if (bucket === undefined) groups.set(key, [item]);
    else bucket.push(item);
  }

  return [...groups.entries()]
    .map(([date, dayItems]) => ({
      date,
      dateFormatted: formatDayHeading(date),
      dayNumber: differenceInDays(start, parse(date, API_DAY, REFERENCE)) + 1,
      items: sortItemsByTime(dayItems),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** `_.sortBy(items, 'time')` — a lexicographic sort on 'HH:mm'. */
export function sortItemsByTime(items: readonly ItineraryItem[]): ItineraryItem[] {
  return [...items].sort((a, b) => {
    const at = a.time ?? '';
    const bt = b.time ?? '';
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
}

/* ------------------------------------------------------------------ totals */

export interface ItineraryTotals {
  readonly flights: number;
  readonly hotels: number;
  readonly activities: number;
  readonly transport: number;
  readonly total: number;
}

/**
 * `calculateTotals()` — `itinerary.controller.js:94-105`.
 *
 * TWO PRESERVED ODDITIES:
 *
 *   `transport` is summed into the total but has NO CARD. The NYC trip's cards
 *   read 930 + 350 + 0 = 1,280 while the total reads 1,330; the missing $50 is
 *   the airport shuttle. `itinerary.feature` pins that the cards do not add up.
 *
 *   Cancelled items are INCLUDED — every item counts regardless of status.
 *   That was `_.sumBy` over an unfiltered array here; since Q-6 it is also the
 *   server's rule (ADR-020, answering plan §7.5).
 */
export function calculateTotals(items: readonly ItineraryItem[]): ItineraryTotals {
  const sumOf = (type: string): number =>
    items.filter((i) => i.type === type).reduce((sum, i) => sum + i.cost, 0);

  const flights = sumOf('flight');
  const hotels = sumOf('hotel');
  const activities = sumOf('activity');
  const transport = sumOf('transport');

  return {
    flights,
    hotels,
    activities,
    transport,
    total: flights + hotels + activities + transport,
  };
}

/* ------------------------------------------------------------- the filter */

/**
 * `getFilteredDays()` — `itinerary.controller.js:114-123`.
 *
 * `_.some` — a day survives if ANY ONE of its items matches, and it then
 * displays WHOLE. Filtering by "pending" therefore still shows the confirmed
 * meeting that shares the day. That is an OR, unlike the hotel amenity filter
 * in Increment 2, which is an AND. `itinerary.feature` pins it.
 *
 * NOTE ON REACHABILITY: this function is correct and, through the interface,
 * unreachable. The filter buttons write to a value it does not read — see
 * ADR-019 and the component. The three `@bypasses-ui` scenarios exist to prove
 * the logic below works despite that.
 */
export function filterDays(
  days: readonly ItineraryDay[],
  status: string,
): readonly ItineraryDay[] {
  if (status === 'all') return days;
  return days.filter((day) => day.items.some((item) => item.status === status));
}

/* ------------------------------------------------------------ presentation */

/** `getItemIcon()` — `itinerary.controller.js:193-201`. */
export function getItemIcon(type: string): string {
  switch (type) {
    case 'flight':
      return 'glyphicon-plane';
    case 'hotel':
      return 'glyphicon-bed';
    case 'activity':
      return 'glyphicon-flag';
    case 'transport':
      return 'glyphicon-road';
    default:
      return 'glyphicon-map-marker';
  }
}

/** `getStatusLabel()` — `itinerary.controller.js:203-210`. */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'label-success';
    case 'pending':
      return 'label-warning';
    case 'cancelled':
      return 'label-danger';
    default:
      return 'label-default';
  }
}

/** `ng-class` on the trip list label — `itinerary.template.html:58`. */
export function getTripStatusLabel(status: TripStatus): string {
  switch (status) {
    case 'upcoming':
      return 'label-info';
    case 'active':
      return 'label-success';
    case 'completed':
      return 'label-default';
  }
}
