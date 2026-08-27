/**
 * Tests for the itinerary model.
 *
 * The fixtures below are the exact seeds from `api-mock/server.js:142-173`, so
 * a failure here means the model disagrees with the data the app actually gets.
 */
import { describe, it, expect } from 'vitest';
import {
  formatTripDate,
  formatDayHeading,
  formatTime,
  formatItemCost,
  formatNoteTimestamp,
  deriveTripStatus,
  decorateTrip,
  sortTripsByStart,
  groupItemsByDay,
  sortItemsByTime,
  calculateTotals,
  filterDays,
  getItemIcon,
  getStatusLabel,
  getTripStatusLabel,
} from './itinerary-model';
import type { Trip, ItineraryItem } from '../../types/itinerary';

const NYC_ITEMS: ItineraryItem[] = [
  { id: 'item-1', type: 'flight', date: '2024-03-15', time: '08:30', description: 'SFO → JFK', cost: 450, status: 'confirmed' },
  { id: 'item-2', type: 'hotel', date: '2024-03-15', time: '15:00', description: 'Grand Hyatt New York', cost: 350, status: 'confirmed' },
  { id: 'item-3', type: 'activity', date: '2024-03-16', time: '09:00', description: 'Client Meeting - Midtown', cost: 0, status: 'confirmed' },
  { id: 'item-4', type: 'transport', date: '2024-03-16', time: '08:00', description: 'Airport Shuttle', cost: 50, status: 'pending' },
  { id: 'item-5', type: 'flight', date: '2024-03-18', time: '18:00', description: 'JFK → SFO', cost: 480, status: 'confirmed' },
];

const NYC: Trip = {
  id: 'trip-1',
  userId: 1,
  name: 'NYC Business Trip',
  startDate: '2024-03-15',
  endDate: '2024-03-18',
  status: 'upcoming',
  totalCost: 1330,
  items: NYC_ITEMS,
};

const CHICAGO: Trip = {
  id: 'trip-2',
  userId: 1,
  name: 'Chicago Conference',
  startDate: '2024-04-10',
  endDate: '2024-04-12',
  status: 'upcoming',
  totalCost: 1160,
  items: [
    { id: 'item-6', type: 'flight', date: '2024-04-10', time: '07:00', description: 'SFO → ORD', cost: 380, status: 'confirmed' },
    { id: 'item-7', type: 'hotel', date: '2024-04-10', time: '14:00', description: 'Marriott Marquis Chicago', cost: 280, status: 'confirmed' },
    { id: 'item-8', type: 'activity', date: '2024-04-11', time: '09:00', description: 'Tech Conference 2024', cost: 500, status: 'confirmed' },
  ],
};

/* --------------------------------------------------------------- formatting */

describe('formatTime — the one correct date parse in the codebase', () => {
  it('renders 24-hour times the way moment(time, "HH:mm") did', () => {
    expect(formatTime('08:30')).toBe('8:30 AM');
    expect(formatTime('15:00')).toBe('3:00 PM');
    expect(formatTime('00:15')).toBe('12:15 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('18:00')).toBe('6:00 PM');
  });

  /**
   * The guard against loosening. `moment('15:00')` without a format string is
   * exactly the defect ADR-009 removes; a bare `new Date('15:00')` is Invalid
   * Date. This function names its input format, so the value round-trips.
   */
  it('parses with an EXPLICIT format rather than guessing', () => {
    // A bare Date parse of the same string is not a time at all.
    expect(Number.isNaN(new Date('15:00').getTime())).toBe(true);
    // The model still reads it correctly.
    expect(formatTime('15:00')).toBe('3:00 PM');
  });

  it('renders an absent or unparseable time as absent, not as a fake one', () => {
    expect(formatTime(undefined)).toBe('');
    expect(formatTime('')).toBe('');
    expect(formatTime('not-a-time')).toBe('');
  });
});

describe('date formatting matches the legacy moment patterns', () => {
  it('formats trip dates as "MMM D, YYYY"', () => {
    expect(formatTripDate('2024-03-15')).toBe('Mar 15, 2024');
    expect(formatTripDate('2024-03-18')).toBe('Mar 18, 2024');
  });

  it('formats day headings as "dddd, MMMM D"', () => {
    expect(formatDayHeading('2024-03-15')).toBe('Friday, March 15');
    expect(formatDayHeading('2024-03-18')).toBe('Monday, March 18');
  });

  /**
   * `new Date('2024-03-15')` is UTC midnight and shifts a day west of
   * Greenwich; date-fns `parse` is local, like moment. If this ever regresses
   * the day breakdown silently regroups.
   */
  it('parses dates as LOCAL midnight, like moment did', () => {
    expect(formatDayHeading('2024-03-15')).toBe('Friday, March 15');
  });
});

describe('formatItemCost — ungrouped, unlike the trip total', () => {  it("reproduces '$' + cost.toFixed(2)", () => {
    expect(formatItemCost(450)).toBe('$450.00');
    expect(formatItemCost(0)).toBe('$0.00');
    expect(formatItemCost(undefined)).toBe('$0.00');
  });

  /**
   * The legacy inconsistency, now reachable because SEAM-3 can create an item
   * over $1,000. The item row does NOT group; the trip total does. PRESERVED.
   */
  it('does NOT group thousands, even though the trip total does', () => {
    expect(formatItemCost(1250)).toBe('$1250.00');
    expect(formatItemCost(1000)).toBe('$1000.00');
  });
});

/* -------------------------------------------------------------------- trips */

describe('formatNoteTimestamp — the note byline', () => {
  it("reproduces moment's 'MMM D, YYYY h:mm A'", () => {
    const when = new Date(2026, 7, 6, 9, 5);
    expect(formatNoteTimestamp(when)).toBe('Aug 6, 2026 9:05 AM');
  });

  it('renders an ISO string read back from the server the same way', () => {
    const when = new Date(2026, 7, 6, 14, 30);
    expect(formatNoteTimestamp(when.toISOString())).toBe('Aug 6, 2026 2:30 PM');
  });

  /**
   * Node and modern browsers put a NARROW NO-BREAK SPACE before AM/PM. It is
   * invisible in a diff and breaks a literal comparison, so it is normalised.
   */
  it('uses an ordinary space before AM/PM, not U+202F', () => {
    expect(formatNoteTimestamp(new Date(2026, 7, 6, 9, 5))).not.toMatch(/\u202f/);
  });

  it('renders an unparseable timestamp as absent rather than "Invalid Date"', () => {
    expect(formatNoteTimestamp('not-a-date')).toBe('');
  });
});

describe('trip status is derived from the dates and overrides the stored one', () => {
  it('reads "completed" for a trip that has already happened', () => {
    expect(deriveTripStatus(NYC, new Date(2026, 7, 6))).toBe('completed');
    expect(deriveTripStatus(CHICAGO, new Date(2026, 7, 6))).toBe('completed');
  });

  it('reads "upcoming" before the start and "active" between the dates', () => {
    expect(deriveTripStatus(NYC, new Date(2024, 0, 1))).toBe('upcoming');
    expect(deriveTripStatus(NYC, new Date(2024, 2, 16))).toBe('active');
  });

  it('ignores the status the server sent', () => {
    expect(NYC.status).toBe('upcoming');
    expect(deriveTripStatus(NYC, new Date(2026, 7, 6))).toBe('completed');
  });
});

describe('decorateTrip', () => {
  const now = new Date(2026, 7, 6);

  it('adds the formatted dates and the duration', () => {
    const d = decorateTrip(NYC, now);
    expect(d.startFormatted).toBe('Mar 15, 2024');
    expect(d.endFormatted).toBe('Mar 18, 2024');
    expect(d.duration).toBe(3);
  });

  it('gives a past trip a negative countdown, so no countdown is shown', () => {
    expect(decorateTrip(NYC, now).daysUntil).toBeLessThan(0);
  });

  it('does not mutate the trip it was handed', () => {
    const before = JSON.stringify(NYC);
    decorateTrip(NYC, now);
    expect(JSON.stringify(NYC)).toBe(before);
  });

  it('renders the server-derived totalCost as given, without recomputing', () => {
    // Q-6: if the server ever disagrees with the item sum, the server wins.
    const odd: Trip = { ...NYC, totalCost: 9999 };
    expect(decorateTrip(odd, now).totalCost).toBe(9999);
  });
});

describe('sortTripsByStart', () => {
  it('puts the earliest trip first', () => {
    const sorted = sortTripsByStart([CHICAGO, NYC]);
    expect(sorted.map((t) => t.name)).toEqual(['NYC Business Trip', 'Chicago Conference']);
  });

  it('does not mutate its input', () => {
    const input = [CHICAGO, NYC];
    sortTripsByStart(input);
    expect(input[0]).toBe(CHICAGO);
  });
});

/* ------------------------------------------------------------- day grouping */

describe('groupItemsByDay', () => {
  const days = groupItemsByDay(NYC_ITEMS, NYC.startDate);

  it('leaves an empty day out and does NOT close the numbering gap', () => {
    // 17 March has nothing booked. 18 March keeps its position as Day 4, on a
    // trip whose duration reads "3 days".
    expect(days.map((d) => d.dayNumber)).toEqual([1, 2, 4]);
  });

  it('labels each day the way the template does', () => {
    expect(days.map((d) => `Day ${d.dayNumber} — ${d.dateFormatted}`)).toEqual([
      'Day 1 — Friday, March 15',
      'Day 2 — Saturday, March 16',
      'Day 4 — Monday, March 18',
    ]);
  });

  it('orders the items inside a day by time', () => {
    const daySecond = days.find((d) => d.dayNumber === 2);
    expect(daySecond?.items.map((i) => i.description)).toEqual([
      'Airport Shuttle',
      'Client Meeting - Midtown',
    ]);
  });

  it('numbers from the TRIP start, not from the first day with items', () => {
    const late = groupItemsByDay(
      [{ id: 'x', type: 'flight', date: '2024-03-18', time: '10:00', description: 'x', cost: 1, status: 'confirmed' }],
      '2024-03-15',
    );
    expect(late[0]?.dayNumber).toBe(4);
  });

  it('sorts an item with no time first, without throwing', () => {
    const mixed = sortItemsByTime([
      { id: 'a', type: 'flight', date: '2024-03-15', time: '08:00', description: 'a', cost: 0, status: 'confirmed' },
      { id: 'b', type: 'flight', date: '2024-03-15', description: 'b', cost: 0, status: 'confirmed' },
    ]);
    expect(mixed.map((i) => i.id)).toEqual(['b', 'a']);
  });
});

/* ------------------------------------------------------------------ totals */

describe('calculateTotals', () => {
  it('sums each type', () => {
    const t = calculateTotals(NYC_ITEMS);
    expect(t.flights).toBe(930);
    expect(t.hotels).toBe(350);
    expect(t.activities).toBe(0);
    expect(t.transport).toBe(50);
  });

  it('includes transport in the total although no card shows it', () => {
    const t = calculateTotals(NYC_ITEMS);
    // The three cards add to 1280; the total reads 1330. The $50 shuttle has
    // no card. PRESERVED.
    expect(t.flights + t.hotels + t.activities).toBe(1280);
    expect(t.total).toBe(1330);
  });

  it('adds up exactly when a trip has no transport', () => {
    const t = calculateTotals(CHICAGO.items);
    expect(t.flights + t.hotels + t.activities).toBe(t.total);
    expect(t.total).toBe(1160);
  });

  /** Increment plan §7.5, answered at the Inc-3 gate: INCLUDED (ADR-020). */
  it('counts a cancelled item towards the total', () => {
    const cancelled = NYC_ITEMS.map((i) =>
      i.id === 'item-4' ? { ...i, status: 'cancelled' } : i,
    );
    expect(calculateTotals(cancelled).total).toBe(1330);
  });

  it('is 0 for an empty itinerary rather than NaN', () => {
    expect(calculateTotals([]).total).toBe(0);
  });
});

/* ------------------------------------------------------------- the filter */

describe('filterDays — correct, and unreachable through the interface', () => {
  const days = groupItemsByDay(NYC_ITEMS, NYC.startDate);

  it('returns every day for "all"', () => {
    expect(filterDays(days, 'all')).toHaveLength(3);
  });

  /**
   * `_.some` — a day survives if ANY item matches, and it then displays WHOLE.
   * Filtering by "pending" still shows the confirmed meeting beside it. That is
   * an OR, unlike the hotel amenity filter, which is an AND.
   */
  it('keeps a day WHOLE when any one of its items matches', () => {
    const pending = filterDays(days, 'pending');
    expect(pending).toHaveLength(1);
    expect(pending[0]?.items.map((i) => i.status)).toEqual(['pending', 'confirmed']);
  });

  it('returns nothing when no item matches', () => {
    expect(filterDays(days, 'cancelled')).toHaveLength(0);
  });
});

/* ------------------------------------------------------------ presentation */

describe('icons and labels', () => {
  it('maps each item type to its glyph', () => {
    expect(getItemIcon('flight')).toBe('glyphicon-plane');
    expect(getItemIcon('hotel')).toBe('glyphicon-bed');
    expect(getItemIcon('activity')).toBe('glyphicon-flag');
    expect(getItemIcon('transport')).toBe('glyphicon-road');
    expect(getItemIcon('anything-else')).toBe('glyphicon-map-marker');
  });

  it('maps each status to its label class', () => {
    expect(getStatusLabel('confirmed')).toBe('label-success');
    expect(getStatusLabel('pending')).toBe('label-warning');
    expect(getStatusLabel('cancelled')).toBe('label-danger');
    expect(getStatusLabel('other')).toBe('label-default');
  });

  it('maps each trip status to its label class', () => {
    expect(getTripStatusLabel('upcoming')).toBe('label-info');
    expect(getTripStatusLabel('active')).toBe('label-success');
    expect(getTripStatusLabel('completed')).toBe('label-default');
  });
});
