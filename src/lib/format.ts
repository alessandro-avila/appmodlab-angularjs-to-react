/**
 * SHARED FORMATTING AND DATE PRIMITIVES.
 *
 * Extracted in Increment 2 from `flight-search-model.ts`, where they were first
 * written. Both feature modules import from here so there is exactly one
 * implementation of each — a second way of parsing a date or rendering money is
 * how two screens drift apart.
 *
 * ADR-009 (explicit date parsing) and ADR-014 (date-fns) govern the date half.
 */
import { parse, format, isValid } from 'date-fns';

/* ------------------------------------------------------------------- dates */

/** What the user reads and types. */
export const UI_DATE_FORMAT = 'MM/dd/yyyy';
/** What a native <input type="date"> holds in `.value`. */
export const INPUT_DATE_FORMAT = 'yyyy-MM-dd';
/** What the API is sent — the legacy `moment(d).format('YYYY-MM-DD')`. */
export const API_DATE_FORMAT = 'yyyy-MM-dd';

/** ADR-009 (1): explicit parse at every input boundary. */
export function parseInputDate(value: string): Date | null {
  if (value === '') return null;
  const parsed = parse(value, INPUT_DATE_FORMAT, new Date());
  return isValid(parsed) ? parsed : null;
}

export function parseUiDate(value: string): Date | null {
  if (value === '') return null;
  const parsed = parse(value, UI_DATE_FORMAT, new Date());
  return isValid(parsed) ? parsed : null;
}

/** ADR-009 (2)+(3): explicit format out; an absent date renders as absent. */
export function toInputValue(date: Date | null): string {
  return date === null ? '' : format(date, INPUT_DATE_FORMAT);
}

export function toApiValue(date: Date | null): string | null {
  return date === null ? null : format(date, API_DATE_FORMAT);
}

/** Adds whole days without moment's mutating `.add()`. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/** Whole days between two dates — replaces `moment(b).diff(moment(a),'days')`. */
export function differenceInDays(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

/* -------------------------------------------------------------------- money */

/**
 * PLAIN money — reproduces string concatenation, `'$' + n`.
 *
 * Used where the legacy template interpolates a raw number:
 *   flight rows            `${{flight.price}}`         -> "$215"
 *   flight Max Price label `${{filters.maxPrice}}`     -> "$630"
 *   hotel Max Price label  `${{filters.maxPrice}}`     -> "$1000"
 *
 * `useGrouping: false` is REQUIRED: `'$' + 1250` is "$1250", and Intl would
 * otherwise render "$1,250". Verified against the legacy output.
 */
const PLAIN = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  useGrouping: false,
});

export function formatMoneyPlain(amount: number): string {
  return PLAIN.format(amount);
}

/**
 * CURRENCY-FILTER money — reproduces AngularJS `$filter('currency')(n, '$', 2)`.
 *
 * Used by hotel-booking's `formatCurrency` (`hotel-booking.controller.js:254`)
 * for hotel card prices, stay totals, room prices and the confirmation total.
 *
 * Differs from PLAIN in BOTH respects, verified against the real filter running
 * in the legacy app:
 *   374     -> "$374.00"     (always two decimals)
 *   1234    -> "$1,234.00"   (grouped)
 *   0.5     -> "$0.50"
 */
const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
});

export function formatMoneyCurrency(amount: number): string {
  // AngularJS's currency filter renders NaN as an EMPTY STRING (verified). The
  // legacy booking summary relied on that to show "no total price" when the
  // total was NaN. Keeping the behaviour means a non-finite amount never
  // renders as the text "NaN".
  if (!Number.isFinite(amount)) return '';
  return CURRENCY.format(amount);
}
