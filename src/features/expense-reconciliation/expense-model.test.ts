/**
 * Tests for the expense model.
 *
 * The dashboard block is the point of this file: every figure is checked
 * against the seeded fixture to the cent, and the average is checked to be over
 * ALL reports rather than the filtered set.
 *
 * The fixtures are the exact seeds from `api-mock/server.js:222-256`.
 */
import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  calculateDashboard,
  categoryBreakdown,
  emptyEntry,
  emptyReport,
  entryIsComplete,
  formatLineDate,
  formatSubmitted,
  monthlyTotal,
  recomputeTotal,
  sortBySubmittedDesc,
  statusClass,
  actionsFor,
  topCategory,
  EMPTY_RANGE,
  type EntryDraft,
  type ExpenseDraftLine,
} from './expense-model';
import { formatMoneyCurrency, formatMoneyFixed } from '../../lib/format';
import type { ExpenseReport } from '../../types/expense';

const EXP_1: ExpenseReport = {
  id: 'exp-1',
  userId: 1,
  title: 'NYC Business Trip Expenses',
  tripDestination: 'New York',
  travelRequestId: null,
  status: 'pending',
  submittedAt: '2024-03-20T10:00:00Z',
  submittedBy: 'Sarah Johnson',
  totalAmount: 1875.5,
  expenses: [
    { id: 'e-1', date: '2024-03-15', category: 'flights', description: 'SFO to JFK round trip', amount: 930, currency: 'USD', notes: '' },
    { id: 'e-2', date: '2024-03-15', category: 'hotels', description: 'Grand Hyatt - 3 nights', amount: 750, currency: 'USD', notes: 'Corporate rate applied' },
    { id: 'e-3', date: '2024-03-16', category: 'meals', description: 'Client dinner at Nobu', amount: 145.5, currency: 'USD', notes: 'With client team' },
    { id: 'e-4', date: '2024-03-17', category: 'transport', description: 'Uber rides', amount: 50, currency: 'USD', notes: '' },
  ],
};

/** The undated draft. `submittedAt` is null, and two behaviours hinge on it. */
const EXP_2: ExpenseReport = {
  id: 'exp-2',
  userId: 1,
  title: 'Q1 Miscellaneous',
  tripDestination: 'Local',
  travelRequestId: null,
  status: 'draft',
  submittedAt: null,
  submittedBy: 'Sarah Johnson',
  totalAmount: 250,
  expenses: [
    { id: 'e-5', date: '2024-02-10', category: 'other', description: 'Office supplies for remote work', amount: 150, currency: 'USD', notes: '' },
    { id: 'e-6', date: '2024-02-20', category: 'meals', description: 'Team lunch', amount: 100, currency: 'USD', notes: 'Team building event' },
  ],
};

const ALL = [EXP_1, EXP_2];
/** The suite's pinned clock, well after every seeded submission. */
const NOW = new Date(2026, 7, 6, 9, 0, 0);

/* -------------------------------------------------------------- dashboard */

describe('the dashboard, to the cent', () => {
  const d = calculateDashboard(ALL, NOW);

  it('counts every stored report', () => {
    expect(d.reportCount).toBe(2);
  });

  it('totals submitted spending across every report', () => {
    expect(d.totalSubmitted).toBe(2125.5);
    expect(formatMoneyCurrency(d.totalSubmitted)).toBe('$2,125.50');
  });

  it('totals pending spending', () => {
    expect(d.totalPending).toBe(1875.5);
    expect(formatMoneyCurrency(d.totalPending)).toBe('$1,875.50');
  });

  /** SEAM-4 — nothing can reach 'approved', so the tile is structurally zero. */
  it('reports approved spending as zero', () => {
    expect(d.totalApproved).toBe(0);
    expect(formatMoneyCurrency(d.totalApproved)).toBe('$0.00');
    expect(ALL.some((r) => r.status === 'approved')).toBe(false);
  });

  it('reports rejected spending as zero', () => {
    expect(d.totalRejected).toBe(0);
  });

  it('averages to the cent', () => {
    expect(d.avgAmount).toBe(1062.75);
    expect(formatMoneyCurrency(d.avgAmount)).toBe('$1,062.75');
  });

  /**
   * THE ONE MOST EASILY GOT WRONG. `_.meanBy($scope.reports, ...)` is passed
   * the UNFILTERED array. Averaging the filtered view would move the tile when
   * a filter is touched, which the baseline does not do.
   */
  it('averages over ALL reports, never the filtered set', () => {
    const onlyPending = applyFilters(ALL, 'pending', '', EMPTY_RANGE);
    expect(onlyPending).toHaveLength(1);
    // The filtered average would be 1875.50; the dashboard must not say that.
    expect(calculateDashboard(ALL, NOW).avgAmount).toBe(1062.75);
    expect(calculateDashboard(ALL, NOW).avgAmount).not.toBe(1875.5);
  });

  it('is zero-safe on an empty account', () => {
    const empty = calculateDashboard([], NOW);
    expect(empty.avgAmount).toBe(0);
    expect(empty.totalSubmitted).toBe(0);
    expect(empty.topCategory).toBe('N/A');
  });

  it('derives the top category across every report', () => {
    // flights 930 beats hotels 750, meals 245.50, other 150, transport 50.
    expect(d.topCategory).toBe('flights');
  });

  it('reports this month as zero, because every seed predates it', () => {
    expect(d.recentMonth).toBe(0);
    expect(formatMoneyCurrency(d.recentMonth)).toBe('$0.00');
  });

  it('counts a report submitted this month', () => {
    const thisMonth: ExpenseReport = {
      ...EXP_1,
      id: 'exp-3',
      submittedAt: new Date(NOW.getFullYear(), NOW.getMonth(), 2).toISOString(),
      totalAmount: 60,
    };
    expect(monthlyTotal([...ALL, thisMonth], NOW)).toBe(60);
  });

  it('excludes an undated report from this month', () => {
    expect(monthlyTotal([EXP_2], NOW)).toBe(0);
  });

  it('recomputes when a report is added', () => {
    const added: ExpenseReport = { ...EXP_1, id: 'exp-3', totalAmount: 60, status: 'draft' };
    const next = calculateDashboard([...ALL, added], NOW);
    expect(next.reportCount).toBe(3);
    expect(next.totalSubmitted).toBe(2185.5);
    expect(formatMoneyCurrency(next.totalSubmitted)).toBe('$2,185.50');
  });
});

describe('topCategory', () => {
  it('is N/A when no report has any line', () => {
    expect(topCategory([{ ...EXP_1, expenses: [] }])).toBe('N/A');
  });

  it('sums a category across reports before comparing', () => {
    // meals: 145.50 (exp-1) + 100 (exp-2) = 245.50, still under flights' 930.
    expect(topCategory(ALL)).toBe('flights');
    const mealsHeavy: ExpenseReport = {
      ...EXP_2,
      expenses: [{ ...EXP_2.expenses[1]!, amount: 1000 }],
    };
    expect(topCategory([EXP_1, mealsHeavy])).toBe('meals');
  });
});

/* ---------------------------------------------------------------- sorting */

describe('sortBySubmittedDesc', () => {
  /** Measured against lodash in the running app before being reproduced. */
  it('puts the UNDATED draft first in a most-recent-first list', () => {
    expect(sortBySubmittedDesc([EXP_1, EXP_2]).map((r) => r.id)).toEqual(['exp-2', 'exp-1']);
    expect(sortBySubmittedDesc([EXP_2, EXP_1]).map((r) => r.id)).toEqual(['exp-2', 'exp-1']);
  });

  it('orders dated reports newest first', () => {
    const older: ExpenseReport = { ...EXP_1, id: 'old', submittedAt: '2024-01-01T00:00:00Z' };
    expect(sortBySubmittedDesc([older, EXP_1]).map((r) => r.id)).toEqual(['exp-1', 'old']);
  });

  it('does not mutate its input', () => {
    const input = [EXP_1, EXP_2];
    sortBySubmittedDesc(input);
    expect(input[0]).toBe(EXP_1);
  });
});

/* -------------------------------------------------------------- filtering */

describe('applyFilters', () => {
  it('narrows by status', () => {
    expect(applyFilters(ALL, 'pending', '', EMPTY_RANGE).map((r) => r.title)).toEqual([
      'NYC Business Trip Expenses',
    ]);
    expect(applyFilters(ALL, 'draft', '', EMPTY_RANGE).map((r) => r.title)).toEqual([
      'Q1 Miscellaneous',
    ]);
    expect(applyFilters(ALL, 'rejected', '', EMPTY_RANGE)).toEqual([]);
  });

  it('searches title and destination, case-insensitively', () => {
    expect(applyFilters(ALL, 'all', 'nyc', EMPTY_RANGE).map((r) => r.id)).toEqual(['exp-1']);
    expect(applyFilters(ALL, 'all', 'local', EMPTY_RANGE).map((r) => r.id)).toEqual(['exp-2']);
  });

  it('combines search and status', () => {
    expect(applyFilters(ALL, 'pending', 'local', EMPTY_RANGE)).toEqual([]);
  });

  it('excludes reports submitted before a from-date', () => {
    expect(applyFilters(ALL, 'all', '', { start: '2025-01-01', end: '' })).toEqual([]);
  });

  /** `moment(null).isSameOrAfter(x)` is false — measured, then reproduced. */
  it('excludes the UNDATED draft under any bound', () => {
    const result = applyFilters(ALL, 'all', '', { start: '2020-01-01', end: '' });
    expect(result.map((r) => r.id)).toEqual(['exp-1']);
  });

  /**
   * THE REPAIR (ADR-005). The legacy `$watch` re-filtered only when a bound was
   * SET, so clearing left the table narrowed. Clearing now restores.
   */
  it('restores every report when the dates are cleared', () => {
    const narrowed = applyFilters(ALL, 'all', '', { start: '2025-01-01', end: '' });
    expect(narrowed).toEqual([]);
    const cleared = applyFilters(ALL, 'all', '', EMPTY_RANGE);
    expect(cleared.map((r) => r.id)).toEqual(['exp-2', 'exp-1']);
  });

  it('applies a to-date bound', () => {
    expect(applyFilters(ALL, 'all', '', { start: '', end: '2024-01-01' })).toEqual([]);
    expect(
      applyFilters(ALL, 'all', '', { start: '', end: '2025-01-01' }).map((r) => r.id),
    ).toEqual(['exp-1']);
  });
});

/* -------------------------------------------------------------- formatting */

describe('formatSubmitted', () => {
  /** `moment(null).format('MMM D, YYYY')` produces exactly this. Verified. */
  it('renders a null submission as the words "Invalid date"', () => {
    expect(formatSubmitted(null)).toBe('Invalid date');
    expect(formatSubmitted(undefined)).toBe('Invalid date');
    expect(formatSubmitted('')).toBe('Invalid date');
    expect(formatSubmitted('not-a-date')).toBe('Invalid date');
  });

  it('formats a real submission as "MMM D, YYYY"', () => {
    expect(formatSubmitted('2024-03-20T10:00:00Z')).toBe('Mar 20, 2024');
  });
});

describe('formatLineDate', () => {
  it('formats a plain day', () => {
    expect(formatLineDate('2024-03-15')).toBe('Mar 15, 2024');
  });

  it('renders an unparseable day as "Invalid date"', () => {
    expect(formatLineDate('nonsense')).toBe('Invalid date');
  });
});

describe('money rendering', () => {
  /** The list total is `'$' + toFixed(2)` — UNGROUPED. */
  it('renders a report total ungrouped', () => {
    expect(formatMoneyFixed(EXP_1.totalAmount)).toBe('$1875.50');
  });

  /** The dashboard tiles go through the built-in currency filter — GROUPED. */
  it('renders a dashboard tile grouped', () => {
    expect(formatMoneyCurrency(2125.5)).toBe('$2,125.50');
  });
});

/* ------------------------------------------------------------- the form */

describe('entryIsComplete', () => {
  function entry(over: Partial<EntryDraft> = {}): EntryDraft {
    return { ...emptyEntry(NOW), ...over };
  }

  it('accepts a description and a non-zero amount', () => {
    expect(entryIsComplete(entry({ description: 'Client dinner', amount: '84.25' }))).toBe(true);
  });

  it('refuses a missing description', () => {
    expect(entryIsComplete(entry({ description: '', amount: '9.99' }))).toBe(false);
  });

  it('refuses a missing amount', () => {
    expect(entryIsComplete(entry({ description: 'Coffee', amount: '' }))).toBe(false);
  });

  /** `!amount` is falsy for 0, so a zero amount counts as MISSING. */
  it('refuses a ZERO amount, because the legacy guard is falsy-based', () => {
    expect(entryIsComplete(entry({ description: 'Zero item', amount: '0' }))).toBe(false);
  });

  it('accepts a line with no category', () => {
    expect(
      entryIsComplete(entry({ description: 'Uncategorised item', amount: '11.11', category: '' })),
    ).toBe(true);
  });
});

describe('recomputeTotal', () => {
  const line = (amount: number, id: string): ExpenseDraftLine => ({
    id,
    date: '2026-08-06',
    category: 'Meals',
    description: 'x',
    amount,
    currency: 'USD',
    receiptName: '',
    notes: '',
  });

  it('sums the lines', () => {
    expect(recomputeTotal([line(300, 'a'), line(200, 'b')], 0)).toBe(500);
  });

  it('recomputes after one of two is removed', () => {
    expect(recomputeTotal([line(200, 'b')], 500)).toBe(200);
  });

  /**
   * DEFECT PRESERVED: the legacy watch is guarded by `expenses.length > 0`, so
   * emptying the list leaves the previous total in the model. The table is
   * hidden by then, but a scenario reads it.
   */
  it('leaves a STALE total when the last line is removed', () => {
    expect(recomputeTotal([], 42)).toBe(42);
  });
});

describe('categoryBreakdown', () => {
  const line = (amount: number, category: string, id: string): ExpenseDraftLine => ({
    id,
    date: '2026-08-06',
    category,
    description: 'x',
    amount,
    currency: 'USD',
    receiptName: '',
    notes: '',
  });

  it('buckets by category', () => {
    const b = categoryBreakdown([line(84.25, 'Meals', 'a')]);
    expect([...b.entries()]).toEqual([['Meals', 84.25]]);
  });

  it('buckets an uncategorised line under a blank label', () => {
    const b = categoryBreakdown([line(11.11, '', 'a')]);
    expect(b.get('')).toBe(11.11);
  });
});

describe('empty drafts', () => {
  it('starts a report with no lines and a zero total', () => {
    const r = emptyReport();
    expect(r.expenses).toEqual([]);
    expect(r.totalAmount).toBe(0);
    expect(r.title).toBe('');
  });

  it('defaults an entry to today in USD', () => {
    const e = emptyEntry(NOW);
    expect(e.date).toBe('2026-08-06');
    expect(e.currency).toBe('USD');
    expect(e.amount).toBe('');
  });
});

/* ------------------------------------------------------------ presentation */

describe('statusClass and actionsFor', () => {
  it('maps each status to its label class', () => {
    expect(statusClass('approved')).toBe('label-success');
    expect(statusClass('pending')).toBe('label-warning');
    expect(statusClass('rejected')).toBe('label-danger');
    expect(statusClass('draft')).toBe('label-default');
    expect(statusClass('other')).toBe('label-info');
  });

  it('offers Delete only on a draft', () => {
    expect(actionsFor('draft')).toEqual(['View', 'Delete']);
    expect(actionsFor('pending')).toEqual(['View']);
  });
});
