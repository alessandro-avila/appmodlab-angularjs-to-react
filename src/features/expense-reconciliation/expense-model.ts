/**
 * EXPENSE MODEL — the pure half of the screen.
 *
 * The dashboard aggregates are the point of this module, so they live here
 * where they can be tested to the cent without a browser.
 *
 * Every behaviour below was measured against the running legacy app rather
 * than inferred: `moment(null).format(...)` really does produce the literal
 * string "Invalid date"; lodash `orderBy(..., 'desc')` really does put a null
 * FIRST; and `moment(null).isSameOrAfter(x)` really is false, which is why the
 * undated draft disappears under any date bound.
 */
import { parse, isValid, format } from 'date-fns';
import { API_DATE_FORMAT } from '../../lib/format';
import type { ExpenseReport, ExpenseLine } from '../../types/expense';

export const EXPENSE_CATEGORIES = [
  'Airfare',
  'Hotel',
  'Meals',
  'Ground Transport',
  'Car Rental',
  'Fuel',
  'Parking',
  'Tips',
  'Phone/Internet',
  'Office Supplies',
  'Entertainment',
  'Other',
] as const;

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] as const;

/* -------------------------------------------------------------- formatting */

/**
 * `moment(date).format('MMM D, YYYY')` — `expense.service.js:20`.
 *
 * A null or unparseable timestamp renders the literal text **"Invalid date"**,
 * which is what moment produces and what the list shows for `exp-2`. This is a
 * defect and it is PRESERVED: a scenario pins the exact words.
 */
export function formatSubmitted(submittedAt: string | null | undefined): string {
  if (submittedAt === null || submittedAt === undefined || submittedAt === '') {
    return 'Invalid date';
  }
  const when = new Date(submittedAt);
  if (Number.isNaN(when.getTime())) return 'Invalid date';
  return format(when, 'MMM d, yyyy');
}

/** `moment(exp.date).format('MMM D, YYYY')` for a line item's own day. */
export function formatLineDate(date: string): string {
  const parsed = parse(date, API_DATE_FORMAT, new Date());
  if (isValid(parsed)) return format(parsed, 'MMM d, yyyy');
  const loose = new Date(date);
  return Number.isNaN(loose.getTime()) ? 'Invalid date' : format(loose, 'MMM d, yyyy');
}

/* ---------------------------------------------------------------- sorting */

/**
 * `_.orderBy(filtered, ['submittedAt'], ['desc'])` — `controller:121`.
 *
 * Lodash puts `null` LAST when ascending, so reversing places it FIRST. The
 * undated draft therefore sits above the dated report in a list that claims to
 * be most-recent-first. Measured in the running app, then reproduced.
 */
export function sortBySubmittedDesc(reports: readonly ExpenseReport[]): ExpenseReport[] {
  return [...reports].sort((a, b) => {
    const av = a.submittedAt;
    const bv = b.submittedAt;
    if (av === bv) return 0;
    // null sorts last ascending -> first descending.
    if (av === null || av === undefined) return -1;
    if (bv === null || bv === undefined) return 1;
    return av < bv ? 1 : -1;
  });
}

/* -------------------------------------------------------------- filtering */

export interface DateRange {
  readonly start: string;
  readonly end: string;
}

export const EMPTY_RANGE: DateRange = { start: '', end: '' };

/**
 * `applyFilters()` — `expense.controller.js:92-122`.
 *
 * THE DATE FILTER NOW WORKS BOTH WAYS (ADR-005, ADR-022). The legacy
 * `$watch('dateRange')` re-filtered only when a bound was SET
 * (`controller:50-54`), so clearing both left the table narrowed while the
 * inputs read empty. It is the fourth and last of "the four dead controls",
 * and nothing here reproduces the guard.
 *
 * A report with a null `submittedAt` is excluded by ANY bound, because
 * `moment(null).isSameOrAfter(x)` and `.isSameOrBefore(x)` are both false.
 * That is preserved — a scenario pins it.
 */
export function applyFilters(
  reports: readonly ExpenseReport[],
  filterStatus: string,
  searchQuery: string,
  range: DateRange,
): ExpenseReport[] {
  let filtered = [...reports];

  if (filterStatus !== 'all') {
    filtered = filtered.filter((r) => r.status === filterStatus);
  }

  const query = searchQuery.trim().toLowerCase();
  if (query !== '') {
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.tripDestination.toLowerCase().includes(query),
    );
  }

  if (range.start !== '') {
    const start = boundToTime(range.start);
    filtered = filtered.filter((r) => {
      const t = submittedTime(r);
      return t !== null && start !== null && t >= start;
    });
  }

  if (range.end !== '') {
    const end = boundToTime(range.end);
    filtered = filtered.filter((r) => {
      const t = submittedTime(r);
      return t !== null && end !== null && t <= end;
    });
  }

  return sortBySubmittedDesc(filtered);
}

function submittedTime(report: ExpenseReport): number | null {
  if (report.submittedAt === null || report.submittedAt === undefined) return null;
  const t = new Date(report.submittedAt).getTime();
  return Number.isNaN(t) ? null : t;
}

/** A `yyyy-MM-dd` bound from a native date input, at local midnight. */
function boundToTime(value: string): number | null {
  const parsed = parse(value, API_DATE_FORMAT, new Date());
  return isValid(parsed) ? parsed.getTime() : null;
}

/* -------------------------------------------------------------- dashboard */

export interface Dashboard {
  readonly totalSubmitted: number;
  readonly totalApproved: number;
  readonly totalPending: number;
  readonly totalRejected: number;
  readonly reportCount: number;
  readonly avgAmount: number;
  readonly topCategory: string;
  readonly recentMonth: number;
}

/**
 * `calculateDashboard()` — `expense.controller.js:125-136`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EVERY FIGURE IS OVER ALL REPORTS, NEVER THE FILTERED VIEW
 * ─────────────────────────────────────────────────────────────────────────
 * The legacy passes `$scope.reports` — the unfiltered array — to every one of
 * these, including the average. Computing any of them over `filteredReports`
 * would make the tiles move when a filter is touched, which the baseline does
 * not do. `avgAmount` is called out because it is the easiest to get wrong.
 *
 * Against the seeded fixture: 1875.50 + 250.00 = $2,125.50 submitted,
 * $1,875.50 pending, $0.00 approved (SEAM-4 — nothing can reach that status),
 * 2 reports, $1,062.75 average, "flights" top category, $0.00 this month.
 */
export function calculateDashboard(reports: readonly ExpenseReport[], now: Date): Dashboard {
  const sumOf = (status: string): number =>
    reports.filter((r) => r.status === status).reduce((s, r) => s + r.totalAmount, 0);

  const totalSubmitted = reports.reduce((s, r) => s + r.totalAmount, 0);

  return {
    totalSubmitted,
    totalApproved: sumOf('approved'),
    totalPending: sumOf('pending'),
    totalRejected: sumOf('rejected'),
    reportCount: reports.length,
    // `_.meanBy($scope.reports, 'totalAmount')` — ALL reports, not the filtered set.
    avgAmount: reports.length > 0 ? totalSubmitted / reports.length : 0,
    topCategory: topCategory(reports),
    recentMonth: monthlyTotal(reports, now),
  };
}

/**
 * `_getTopCategory()` — `controller:311-319`.
 *
 * Flattens every line of every report, groups by category, sums, and takes the
 * largest. Derived on every dashboard recompute and never rendered — a
 * scenario pins that it is computed but not displayed.
 */
export function topCategory(reports: readonly ExpenseReport[]): string {
  const lines = reports.flatMap((r) => r.expenses);
  if (lines.length === 0) return 'N/A';

  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.category, (totals.get(line.category) ?? 0) + (Number(line.amount) || 0));
  }

  let best: string | null = null;
  let bestValue = -Infinity;
  for (const [category, value] of totals) {
    // `_.maxBy` keeps the FIRST maximum, so ties resolve to insertion order.
    if (value > bestValue) {
      best = category;
      bestValue = value;
    }
  }
  return best ?? 'N/A';
}

/**
 * `_getMonthlyTotal()` — `controller:321-327`.
 *
 * Reports submitted on or after the start of the current month. An undated
 * report is excluded, because `moment(null).isSameOrAfter(...)` is false.
 */
export function monthlyTotal(reports: readonly ExpenseReport[], now: Date): number {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return reports
    .filter((r) => {
      const raw = r.submittedAt;
      if (raw === null || raw === undefined) return false;
      const t = new Date(raw).getTime();
      return !Number.isNaN(t) && t >= monthStart;
    })
    .reduce((s, r) => s + r.totalAmount, 0);
}

/* --------------------------------------------------------- the draft form */

export interface ExpenseDraftLine {
  readonly id: string;
  readonly date: string;
  readonly category: string;
  readonly description: string;
  readonly amount: number;
  readonly currency: string;
  readonly receiptName: string;
  readonly notes: string;
}

export interface ReportDraft {
  readonly title: string;
  readonly tripDestination: string;
  readonly travelRequestId: string;
  readonly expenses: readonly ExpenseDraftLine[];
  readonly totalAmount: number;
  readonly notes: string;
}

export interface EntryDraft {
  readonly date: string;
  readonly category: string;
  readonly description: string;
  readonly amount: string;
  readonly currency: string;
  readonly receiptName: string;
  readonly notes: string;
}

/** `_getEmptyReport()` — `controller:280-290`. */
export function emptyReport(): ReportDraft {
  return {
    title: '',
    tripDestination: '',
    travelRequestId: '',
    expenses: [],
    totalAmount: 0,
    notes: '',
  };
}

/** `_getEmptyExpense()` — `controller:292-303`. Date defaults to today. */
export function emptyEntry(today: Date): EntryDraft {
  return {
    date: format(today, API_DATE_FORMAT),
    category: '',
    description: '',
    amount: '',
    currency: 'USD',
    receiptName: '',
    notes: '',
  };
}

/**
 * The guard at `addExpense()` — `controller:154-160`.
 *
 * `if (!description || !amount)`. A ZERO amount is falsy, so it counts as
 * missing — a scenario pins that explicitly. Rejection is SILENT: three fields
 * flash for three seconds and no notification is raised.
 */
export function entryIsComplete(entry: EntryDraft): boolean {
  if (entry.description.trim() === '') return false;
  if (entry.amount.trim() === '') return false;
  const amount = Number(entry.amount);
  return !Number.isNaN(amount) && amount !== 0;
}

/**
 * `$watch('newReport.expenses', ...)` — `controller:37-44`.
 *
 * NOTE THE GUARD: `if (expenses && expenses.length > 0)`. Removing the LAST
 * line leaves the previous total in place, because the watch does not run on an
 * empty array. The table is hidden by then, so the stale figure is invisible —
 * but a scenario reads it off the model, so it is preserved.
 */
export function recomputeTotal(
  lines: readonly ExpenseDraftLine[],
  previousTotal: number,
): number {
  if (lines.length === 0) return previousTotal;
  return lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
}

/** `_getCategoryBreakdown()` — `controller:305-309`. */
export function categoryBreakdown(
  lines: readonly ExpenseDraftLine[],
): ReadonlyMap<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.category, (totals.get(line.category) ?? 0) + (Number(line.amount) || 0));
  }
  return totals;
}

/** `getStatusClass()` — `controller:269-277`. Note `draft` -> label-default. */
export function statusClass(status: string): string {
  switch (status) {
    case 'approved':
      return 'label-success';
    case 'pending':
      return 'label-warning';
    case 'rejected':
      return 'label-danger';
    case 'draft':
      return 'label-default';
    default:
      return 'label-info';
  }
}

/** Only a draft can be deleted — the template guards the button on status. */
export function actionsFor(status: string): readonly string[] {
  return status === 'draft' ? ['View', 'Delete'] : ['View'];
}

/**
 * `getReportDetails()` — `expense.service.js:34-46`.
 *
 * DEFECT PRESERVED: the detail fetch re-applies `dateFormatted` and
 * `amountFormatted` to each line, but NOT `submittedFormatted` or
 * `expenseCount` to the report. The modal binds both, so every report shows
 * "Submitted:" with no date and " expense items" with no number.
 */
export function detailCategoryTotals(lines: readonly ExpenseLine[]): ReadonlyMap<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.category, (totals.get(line.category) ?? 0) + (Number(line.amount) || 0));
  }
  return totals;
}
