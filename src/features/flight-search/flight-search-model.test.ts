/**
 * FLIGHT-SEARCH MODEL — the replacement for the retired Karma suite.
 *
 * ADR-008 §2 requires the 19 AngularJS assertions to be replaced, in this
 * increment, by React tests asserting the same things. The retirement mapping
 * is recorded in `docs/architecture/karma-retirement.md`.
 *
 * Several cases here pin behaviour that is SURPRISING. They assert the legacy
 * outcome on purpose — the baseline is the specification, and the only change
 * authorised in this increment is ADR-009 (explicit date parsing).
 */
import { describe, it, expect } from 'vitest';
import type { Flight, Filters, SearchParams } from '../../types/flight';
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
  VALIDATION_MESSAGES,
  parseInputDate,
  parseUiDate,
  toInputValue,
  toApiValue,
  addDays,
  formatDuration,
  formatTime,
  formatFlightDate,
  formatShortDate,
  formatPrice,
  isWithinBand,
  foundNotification,
  bookedNotification,
} from './flight-search-model';

function flight(over: Partial<Flight> = {}): Flight {
  return {
    id: 'f1',
    airline: 'United',
    origin: 'SFO',
    destination: 'JFK',
    departDate: '2026-08-26T14:57:44.537Z',
    departureTime: '08:30',
    arrivalTime: '17:00',
    durationMinutes: 510,
    stops: 0,
    price: 300,
    cabinClass: 'economy',
    booked: false,
    ...over,
  };
}

const params = (over: Partial<SearchParams> = {}): SearchParams => ({
  origin: 'SFO',
  destination: 'JFK',
  departDate: new Date(2026, 7, 25),
  returnDate: new Date(2026, 7, 30),
  passengers: 1,
  cabinClass: 'economy',
  tripType: 'roundtrip',
  ...over,
});

const filters = (over: Partial<Filters> = {}): Filters => ({
  maxPrice: 5000,
  stops: 'any',
  airline: '',
  departTimeRange: 'any',
  ...over,
});

/* ------------------------------------------------------------- validation */

describe('validateSearch — controller:131-149', () => {
  it('refuses a missing origin', () => {
    expect(validateSearch(params({ origin: '' }))).toBe(VALIDATION_MESSAGES.missingRoute);
  });

  it('refuses a missing destination', () => {
    expect(validateSearch(params({ destination: '' }))).toBe(VALIDATION_MESSAGES.missingRoute);
  });

  it('refuses a missing departure date', () => {
    expect(validateSearch(params({ departDate: null }))).toBe(
      VALIDATION_MESSAGES.missingDepartDate,
    );
  });

  it('refuses a round trip with no return date', () => {
    expect(validateSearch(params({ returnDate: null }))).toBe(
      VALIDATION_MESSAGES.missingReturnDate,
    );
  });

  it('allows a one way trip with no return date', () => {
    expect(validateSearch(params({ tripType: 'oneway', returnDate: null }))).toBeNull();
  });

  it('checks the route BEFORE the dates, so an empty form reports the route', () => {
    // The order is observable: an empty form shows "Please enter origin and
    // destination." and never the date message.
    expect(validateSearch(params({ origin: '', destination: '', departDate: null }))).toBe(
      VALIDATION_MESSAGES.missingRoute,
    );
  });

  it('accepts a fully populated round trip', () => {
    expect(validateSearch(params())).toBeNull();
  });
});

/* ----------------------------------------------------------- date coupling */

describe('reconcileReturnDate — controller:45-53', () => {
  it('pushes the return date to the day after when departure moves past it', () => {
    // feature:71 — departure 08/10 -> 08/25 with return 08/20 gives 08/26.
    const result = reconcileReturnDate(
      new Date(2026, 7, 10),
      new Date(2026, 7, 25),
      new Date(2026, 7, 20),
    );
    expect(toInputValue(result)).toBe('2026-08-26');
  });

  it('leaves the return date alone when the FIRST departure date is chosen', () => {
    // feature:78 — the legacy $watch requires BOTH newVal and oldVal, so with no
    // previous departure date the rule does not fire even though 08/25 > 08/20.
    const result = reconcileReturnDate(null, new Date(2026, 7, 25), new Date(2026, 7, 20));
    expect(toInputValue(result)).toBe('2026-08-20');
  });

  it('leaves the return date alone when departure is still before it', () => {
    const result = reconcileReturnDate(
      new Date(2026, 7, 10),
      new Date(2026, 7, 15),
      new Date(2026, 7, 20),
    );
    expect(toInputValue(result)).toBe('2026-08-20');
  });

  it('does nothing when there is no return date', () => {
    expect(reconcileReturnDate(new Date(2026, 7, 10), new Date(2026, 7, 25), null)).toBeNull();
  });

  it('does nothing when the departure date is unchanged', () => {
    const same = new Date(2026, 7, 10);
    const result = reconcileReturnDate(same, new Date(2026, 7, 10), new Date(2026, 7, 5));
    expect(toInputValue(result)).toBe('2026-08-05');
  });

  it('addDays does not mutate its input', () => {
    const start = new Date(2026, 7, 25);
    addDays(start, 1);
    expect(toInputValue(start)).toBe('2026-08-25');
  });
});

/* ------------------------------------------------------- explicit parsing */

describe('explicit date parsing — ADR-009', () => {
  it('parses the native input value with a named format', () => {
    expect(toInputValue(parseInputDate('2026-08-25'))).toBe('2026-08-25');
  });

  it('parses a UI date with a named format', () => {
    expect(toInputValue(parseUiDate('08/25/2026'))).toBe('2026-08-25');
  });

  it('is order-explicit: 08/09/2026 is 9 August, decided by the format', () => {
    expect(toInputValue(parseUiDate('08/09/2026'))).toBe('2026-08-09');
  });

  it('treats an empty value as absent, not as an error', () => {
    expect(parseInputDate('')).toBeNull();
    expect(toInputValue(null)).toBe('');
  });

  it('refuses an unparseable value instead of producing Invalid Date', () => {
    // ADR-009 (4). The legacy path sent the literal string "Invalid date" to the
    // API via moment(...).format('YYYY-MM-DD') at controller:107.
    expect(parseInputDate('not-a-date')).toBeNull();
    expect(parseUiDate('13/45/2026')).toBeNull();
  });

  it('never sends "Invalid date" to the API', () => {
    expect(toApiValue(null)).toBeNull();
    expect(toApiValue(parseUiDate('08/25/2026'))).toBe('2026-08-25');
  });
});

/* -------------------------------------------------------------- formatting */

describe('formatting — replaces the Moment.js helpers', () => {
  it('formatDuration matches moment.duration output — controller:231', () => {
    expect(formatDuration(347)).toBe('5h 47m');
    expect(formatDuration(60)).toBe('1h 0m');
    expect(formatDuration(59)).toBe('0h 59m');
    expect(formatDuration(510)).toBe('8h 30m');
  });

  it('formatTime matches moment("HH:mm").format("h:mm A") — controller:236', () => {
    expect(formatTime('08:30')).toBe('8:30 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('00:15')).toBe('12:15 AM');
    expect(formatTime('17:47')).toBe('5:47 PM');
    expect(formatTime('23:59')).toBe('11:59 PM');
  });

  it('formatFlightDate matches moment.format("ddd, MMM D, YYYY") — controller:240', () => {
    expect(formatFlightDate(new Date(2026, 7, 25))).toBe('Tue, Aug 25, 2026');
  });

  it('formatShortDate matches moment.format("ddd, MMM D") — service.js:26', () => {
    expect(formatShortDate(new Date(2026, 7, 25))).toBe('Tue, Aug 25');
  });

  it('formatPrice reproduces the template\u2019s plain "$" + price, not toFixed(2)', () => {
    // template:216 renders `${{flight.price}}`, so an integer shows as "$215".
    expect(formatPrice(215)).toBe('$215');
    expect(formatPrice(215.5)).toBe('$215.5');
  });

  it('formatPrice does NOT group thousands — verified against the legacy output', () => {
    // `'$' + 1250` is "$1250". Intl groups by default, which would silently
    // change what the user reads. The details panel total (price x passengers)
    // reaches four digits on an ordinary journey, so this is not hypothetical.
    expect(formatPrice(1250)).toBe('$1250');
    expect(formatPrice(1800)).toBe('$1800');
  });
});

/* ---------------------------------------------------------------- filtering */

describe('applyFilters — controller:152-186', () => {
  const set = [
    flight({ id: 'a', price: 100, stops: 0, airline: 'United', departureTime: '07:00', durationMinutes: 300 }),
    flight({ id: 'b', price: 500, stops: 1, airline: 'Delta', departureTime: '13:00', durationMinutes: 200 }),
    flight({ id: 'c', price: 300, stops: 2, airline: 'United', departureTime: '20:00', durationMinutes: 400 }),
  ];

  it('drops flights above the maximum price', () => {
    const out = applyFilters(set, filters({ maxPrice: 300 }), 'price', false);
    expect(out.map((f) => f.id)).toEqual(['a', 'c']);
  });

  it('treats the stops filter as "at most", not "exactly"', () => {
    expect(applyFilters(set, filters({ stops: '1' }), 'price', false).map((f) => f.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('filters by exact airline', () => {
    expect(
      applyFilters(set, filters({ airline: 'United' }), 'price', false).map((f) => f.id),
    ).toEqual(['a', 'c']);
  });

  it('applies the fixed departure-time bands', () => {
    expect(
      applyFilters(set, filters({ departTimeRange: 'morning' }), 'price', false).map((f) => f.id),
    ).toEqual(['a']);
    expect(
      applyFilters(set, filters({ departTimeRange: 'afternoon' }), 'price', false).map((f) => f.id),
    ).toEqual(['b']);
    expect(
      applyFilters(set, filters({ departTimeRange: 'evening' }), 'price', false).map((f) => f.id),
    ).toEqual(['c']);
  });

  it('combines filters', () => {
    const out = applyFilters(
      set,
      filters({ airline: 'United', maxPrice: 200 }),
      'price',
      false,
    );
    expect(out.map((f) => f.id)).toEqual(['a']);
  });

  it('sorts ascending by default and descending when reversed', () => {
    expect(applyFilters(set, filters(), 'price', false).map((f) => f.price)).toEqual([100, 300, 500]);
    expect(applyFilters(set, filters(), 'price', true).map((f) => f.price)).toEqual([500, 300, 100]);
  });

  it('sorts by duration', () => {
    expect(applyFilters(set, filters(), 'durationMinutes', false).map((f) => f.durationMinutes)).toEqual([
      200, 300, 400,
    ]);
  });

  it('sorts by departure time as a 24-hour clock', () => {
    expect(applyFilters(set, filters(), 'departureTime', false).map((f) => f.departureTime)).toEqual([
      '07:00',
      '13:00',
      '20:00',
    ]);
  });

  it('does not mutate the input array', () => {
    const original = set.map((f) => f.id);
    applyFilters(set, filters(), 'price', true);
    expect(set.map((f) => f.id)).toEqual(original);
  });
});

describe('isWithinBand — the fixed bands at controller:174-176', () => {
  it('evening wraps past midnight', () => {
    expect(isWithinBand('23:00', 'evening')).toBe(true);
    expect(isWithinBand('02:00', 'evening')).toBe(true);
    expect(isWithinBand('06:00', 'evening')).toBe(false);
  });

  it('band boundaries are inclusive-low, exclusive-high', () => {
    expect(isWithinBand('06:00', 'morning')).toBe(true);
    expect(isWithinBand('11:59', 'morning')).toBe(true);
    expect(isWithinBand('12:00', 'morning')).toBe(false);
    expect(isWithinBand('12:00', 'afternoon')).toBe(true);
    expect(isWithinBand('17:59', 'afternoon')).toBe(true);
    expect(isWithinBand('18:00', 'afternoon')).toBe(false);
  });

  it('"any" admits everything', () => {
    expect(isWithinBand('03:00', 'any')).toBe(true);
  });
});

/* ------------------------------------------------------------------ sorting */

describe('nextSortState — controller:189-197', () => {
  it('sorts a new column ascending', () => {
    expect(nextSortState({ field: 'price', reverse: true }, 'durationMinutes')).toEqual({
      field: 'durationMinutes',
      reverse: false,
    });
  });

  it('reverses the column already sorted', () => {
    expect(nextSortState({ field: 'price', reverse: false }, 'price')).toEqual({
      field: 'price',
      reverse: true,
    });
  });

  it('toggles back on a third click', () => {
    expect(nextSortState({ field: 'price', reverse: true }, 'price')).toEqual({
      field: 'price',
      reverse: false,
    });
  });
});

/* -------------------------------------------------------------- result stats */

describe('result statistics — controller:114-117', () => {
  it('lists each airline once, in the order first seen', () => {
    const set = [flight({ airline: 'United' }), flight({ airline: 'Delta' }), flight({ airline: 'United' })];
    expect(airlinesOf(set)).toEqual(['United', 'Delta']);
  });

  it('derives the price range from the cheapest and dearest flight', () => {
    const set = [flight({ price: 230 }), flight({ price: 642 }), flight({ price: 400 })];
    expect(priceRangeOf(set)).toEqual({ min: 230, max: 642 });
  });

  it('falls back to 0..5000 for an empty result set, as _.minBy/_.maxBy did', () => {
    expect(priceRangeOf([])).toEqual({ min: 0, max: 5000 });
  });
});

/* ------------------------------------------------------------------ C-4 snap */

describe('C-4 — the price slider snap, PRESERVED deliberately', () => {
  it('snaps to the step grid counted from min, not from zero', () => {
    // min=230, max=642, step=50 -> reachable values 230, 280, ..., 630.
    expect(snapToStep(642, 230, 642, PRICE_STEP)).toBe(630);
    expect(snapToStep(500, 230, 642, PRICE_STEP)).toBe(480);
  });

  it('settles the filter BELOW the dearest flight — feature:118', () => {
    const range = { min: 230, max: 642 };
    const settled = initialMaxPrice(range);
    expect(settled).toBe(630);
    expect(settled).toBeLessThan(range.max);
  });

  it('so flights above the snapped value are hidden while the count includes them — feature:123', () => {
    const set = [
      flight({ id: 'cheap', price: 230 }),
      flight({ id: 'dear1', price: 638 }),
      flight({ id: 'dear2', price: 642 }),
    ];
    const range = priceRangeOf(set);
    const maxPrice = initialMaxPrice(range);
    const listed = applyFilters(set, filters({ maxPrice }), 'price', false);

    expect(foundNotification(set.length)).toBe('Found 3 flights');
    expect(listed.map((f) => f.id)).toEqual(['cheap']);
    expect(listed.length).toBeLessThan(set.length);
  });

  it('does not snap below the floor when asked for less than min', () => {
    // feature:113 — asking for 0 settles at the cheapest flight.
    expect(snapToStep(0, 230, 642, PRICE_STEP)).toBe(230);
  });

  it('lands exactly on max when the range is a whole number of steps', () => {
    expect(snapToStep(430, 230, 430, PRICE_STEP)).toBe(430);
  });
});

/* ------------------------------------------------------------ notifications */

describe('notifications', () => {
  it('reports the UNFILTERED count — controller:120', () => {
    expect(foundNotification(7)).toBe('Found 7 flights');
  });

  it('DEFECT PRESERVED: the booking confirmation reads "undefined"', () => {
    // controller:220 reads booking.confirmationCode; the payload carries
    // confirmationNumber. The scenario asserts only the prefix, so it never
    // caught this. Reading the right field would be an unauthorised change.
    const payload = { confirmationNumber: 'GTI84N8R6HD', flightId: 'f1', status: 'confirmed', bookedAt: '' };
    expect(bookedNotification(payload)).toBe(
      'Flight booked successfully! Confirmation: undefined',
    );
  });
});
