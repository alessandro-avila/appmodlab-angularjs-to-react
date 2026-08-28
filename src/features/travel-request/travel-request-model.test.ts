/**
 * Tests for the travel-request model.
 *
 * The validation block is the point of this file. The order is contractual, so
 * it is asserted as an ORDER — walking the form one field at a time and
 * checking that each newly-satisfied check hands over to the next — rather than
 * as six independent cases that would still pass if the order changed.
 */
import { describe, it, expect } from 'vitest';
import {
  emptyDraft,
  totalEstimate,
  tripDuration,
  validateDraft,
  applyFilters,
  statusCounts,
  statusClass,
  actionsFor,
  formatListDate,
  formatSubmittedAt,
  type RequestDraft,
} from './travel-request-model';
import type { TravelRequest } from '../../types/travel-request';

function draftWith(over: Partial<RequestDraft> = {}): RequestDraft {
  return { ...emptyDraft(), ...over };
}

const COSTED = { flights: 1200, hotels: 800, meals: 300, transport: 150, other: 50 };

/** The seeded requests, from `api-mock/server.js:175-215`. */
const LONDON: TravelRequest = {
  id: 'tr-1',
  userId: 1,
  destination: 'London, UK',
  departDate: '2024-05-01',
  returnDate: '2024-05-05',
  purpose: 'Client onboarding meetings',
  department: 'Engineering',
  justification: 'Need to meet with new enterprise client for product integration.',
  estimatedCosts: COSTED,
  totalEstimate: 2500,
  travelers: [{ name: 'Sarah Johnson', email: 'demo@globaltravel.com' }],
  needsVisa: false,
  needsInsurance: true,
  status: 'pending',
  createdAt: '2024-02-15T10:30:00Z',
};

const TOKYO: TravelRequest = {
  ...LONDON,
  id: 'tr-2',
  destination: 'Tokyo, Japan',
  purpose: 'Annual technology conference',
  status: 'approved',
  createdAt: '2024-02-10T09:00:00Z',
  totalEstimate: 4300,
};

/* -------------------------------------------------------------- validation */

describe('validateDraft — fail-fast, in a fixed order', () => {
  it('complains about the destination first, on an empty form', () => {
    expect(validateDraft(emptyDraft())?.message).toBe('Destination is required.');
  });

  /**
   * The order walk. Each step satisfies exactly one more check and must then
   * hear about the NEXT one. If the checks were reordered — or evaluated all at
   * once — these expectations would move.
   */
  it('hands over to the next check as each field is satisfied', () => {
    const steps: { draft: RequestDraft; expected: string }[] = [
      { draft: draftWith(), expected: 'Destination is required.' },
      { draft: draftWith({ destination: 'Oslo' }), expected: 'Travel dates are required.' },
      {
        draft: draftWith({ destination: 'Oslo', departDate: '2026-09-10' }),
        expected: 'Travel dates are required.',
      },
      {
        draft: draftWith({
          destination: 'Oslo',
          departDate: '2026-09-10',
          returnDate: '2026-09-05',
        }),
        expected: 'Return date must be after departure date.',
      },
      {
        draft: draftWith({
          destination: 'Oslo',
          departDate: '2026-09-10',
          returnDate: '2026-09-17',
        }),
        expected: 'Travel purpose is required.',
      },
      {
        draft: draftWith({
          destination: 'Oslo',
          departDate: '2026-09-10',
          returnDate: '2026-09-17',
          purpose: 'Conference',
        }),
        expected: 'Department is required.',
      },
      {
        draft: draftWith({
          destination: 'Oslo',
          departDate: '2026-09-10',
          returnDate: '2026-09-17',
          purpose: 'Conference',
          department: 'Engineering',
        }),
        expected: 'Please provide cost estimates.',
      },
    ];

    for (const step of steps) {
      expect(validateDraft(step.draft)?.message, JSON.stringify(step.draft)).toBe(step.expected);
    }
  });

  it('passes a complete draft', () => {
    const complete = draftWith({
      destination: 'Oslo',
      departDate: '2026-09-10',
      returnDate: '2026-09-17',
      purpose: 'Conference',
      department: 'Engineering',
      estimatedCosts: COSTED,
    });
    expect(validateDraft(complete)).toBeNull();
  });

  it('reports ONE failure, never a list', () => {
    // Everything is wrong; only the first complaint is produced.
    const failure = validateDraft(emptyDraft());
    expect(failure).not.toBeNull();
    expect(Object.keys(failure ?? {})).toEqual(['message', 'field']);
  });

  it('marks the destination field, and only the destination field', () => {
    expect(validateDraft(emptyDraft())?.field).toBe('destination');
    expect(validateDraft(draftWith({ destination: 'Oslo' }))?.field).toBeNull();
  });

  /** `moment(return).isBefore(moment(depart))` — STRICTLY before. */
  it('allows a same-day return, which is a 0-day trip', () => {
    const sameDay = draftWith({
      destination: 'Oslo',
      departDate: '2026-09-10',
      returnDate: '2026-09-10',
      purpose: 'Conference',
      department: 'Engineering',
      estimatedCosts: COSTED,
    });
    expect(validateDraft(sameDay)).toBeNull();
  });

  it('rejects a zero total even when every field is filled', () => {
    const noCosts = draftWith({
      destination: 'Oslo',
      departDate: '2026-09-10',
      returnDate: '2026-09-17',
      purpose: 'Conference',
      department: 'Engineering',
    });
    expect(validateDraft(noCosts)?.message).toBe('Please provide cost estimates.');
  });
});

/* ------------------------------------------------------------------ totals */

describe('totalEstimate', () => {
  it('adds the five categories', () => {
    expect(totalEstimate(COSTED)).toBe(2500);
  });

  it('treats a blank or unparseable box as zero rather than NaN', () => {
    const messy = { ...COSTED, meals: Number.NaN, other: 0 };
    expect(totalEstimate(messy)).toBe(2150);
  });

  it('is 0 for an untouched form', () => {
    expect(totalEstimate(emptyDraft().estimatedCosts)).toBe(0);
  });
});

describe('tripDuration', () => {
  it('counts whole days between the dates', () => {
    expect(tripDuration('2026-09-10', '2026-09-17')).toBe(7);
  });

  it('is null until both dates are set', () => {
    expect(tripDuration('', '2026-09-17')).toBeNull();
    expect(tripDuration('2026-09-10', '')).toBeNull();
  });

  /** The badge is hidden by `> 0`, but the value is still computed. */
  it('returns a NEGATIVE number for a backwards range', () => {
    expect(tripDuration('2026-09-10', '2026-09-05')).toBe(-5);
  });
});

/* ------------------------------------------------------ filtering + search */

describe('applyFilters — the repaired search', () => {
  const ALL = [LONDON, TOKYO];

  it('lists everything newest first when nothing is set', () => {
    expect(applyFilters(ALL, 'all', '').map((r) => r.destination)).toEqual([
      'London, UK',
      'Tokyo, Japan',
    ]);
  });

  it('narrows by status', () => {
    expect(applyFilters(ALL, 'pending', '').map((r) => r.destination)).toEqual(['London, UK']);
    expect(applyFilters(ALL, 'approved', '').map((r) => r.destination)).toEqual(['Tokyo, Japan']);
    expect(applyFilters(ALL, 'rejected', '')).toEqual([]);
  });

  it('searches the destination', () => {
    expect(applyFilters(ALL, 'all', 'London').map((r) => r.destination)).toEqual(['London, UK']);
  });

  it('searches the purpose too', () => {
    expect(applyFilters(ALL, 'all', 'onboarding').map((r) => r.destination)).toEqual([
      'London, UK',
    ]);
  });

  it('ignores case', () => {
    expect(applyFilters(ALL, 'all', 'tOkYo').map((r) => r.destination)).toEqual(['Tokyo, Japan']);
  });

  it('returns nothing when no request matches', () => {
    expect(applyFilters(ALL, 'all', 'zzzznowhere')).toEqual([]);
  });

  it('combines the status filter and the search', () => {
    expect(applyFilters(ALL, 'pending', 'London').map((r) => r.destination)).toEqual(['London, UK']);
    expect(applyFilters(ALL, 'approved', 'London')).toEqual([]);
  });

  /**
   * The defect this increment repairs. The legacy called
   * `req.travelerName.toLowerCase()` on requests that carry no such field.
   */
  it('does NOT throw when travelerName is absent — the old TypeError', () => {
    expect(LONDON.travelerName).toBeUndefined();
    expect(() => applyFilters(ALL, 'all', 'anything')).not.toThrow();
  });

  it('searches travelerName when a request does carry one', () => {
    const named: TravelRequest = { ...LONDON, id: 'tr-3', travelerName: 'Priya Raman' };
    expect(applyFilters([named, TOKYO], 'all', 'priya').map((r) => r.id)).toEqual(['tr-3']);
  });

  it('does not mutate the list it was given', () => {
    const input = [LONDON, TOKYO];
    applyFilters(input, 'all', '');
    expect(input[0]).toBe(LONDON);
  });
});

/* ------------------------------------------------------------------ counts */

describe('statusCounts', () => {
  it('counts over ALL requests, never the filtered view', () => {
    expect(statusCounts([LONDON, TOKYO])).toEqual({
      all: 2,
      pending: 1,
      approved: 1,
      rejected: 0,
    });
  });

  /** The contradiction the baseline pins. */
  it('drops the pending count as soon as a request is cancelled', () => {
    const cancelled = [{ ...LONDON, status: 'cancelled' }, TOKYO];
    expect(statusCounts(cancelled).pending).toBe(0);
  });
});

describe('statusClass and actionsFor', () => {
  it('maps each status to its label class', () => {
    expect(statusClass('approved')).toBe('label-success');
    expect(statusClass('pending')).toBe('label-warning');
    expect(statusClass('rejected')).toBe('label-danger');
    expect(statusClass('cancelled')).toBe('label-default');
  });

  /** Differs from the itinerary, whose default is `label-default`. */
  it('falls back to label-info, not label-default', () => {
    expect(statusClass('something-else')).toBe('label-info');
  });

  it('offers edit and cancel only on a pending request', () => {
    expect(actionsFor('pending')).toEqual(['View Details', 'Edit', 'Cancel']);
    expect(actionsFor('approved')).toEqual(['View Details']);
    expect(actionsFor('cancelled')).toEqual(['View Details']);
  });
});

/* -------------------------------------------------------------- formatting */

describe('date formatting matches the legacy moment patterns', () => {
  it("formats list dates as 'MMM D, YYYY'", () => {
    expect(formatListDate('2024-05-01')).toBe('May 1, 2024');
    expect(formatListDate('2024-05-05')).toBe('May 5, 2024');
  });

  it("formats the submitted timestamp as 'MMM D, YYYY h:mm A'", () => {
    // 2024-02-15T10:30:00Z rendered in the suite's pinned local zone.
    expect(formatSubmittedAt('2024-02-15T10:30:00Z')).toMatch(/^Feb 15, 2024 \d{1,2}:\d{2} (AM|PM)$/);
  });

  it('uses an ordinary space before AM/PM, not U+202F', () => {
    expect(formatSubmittedAt('2024-02-15T10:30:00Z')).not.toMatch(/\u202f/);
  });

  it('renders an unparseable value as absent', () => {
    expect(formatListDate('')).toBe('');
    expect(formatSubmittedAt('nonsense')).toBe('');
  });
});
