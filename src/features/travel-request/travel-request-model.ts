/**
 * TRAVEL-REQUEST MODEL — the pure half of the screen.
 *
 * Everything here is a function of its arguments, so the validation order, the
 * search and the totals can be tested without a browser or a server.
 */
import { parse, isValid, format } from 'date-fns';
import { API_DATE_FORMAT, differenceInDays } from '../../lib/format';
import type { TravelRequest, EstimatedCosts } from '../../types/travel-request';

export type EstimatedCostKey = keyof EstimatedCosts;

export const DEPARTMENTS = [
  'Engineering',
  'Sales',
  'Marketing',
  'Finance',
  'Human Resources',
  'Operations',
  'Legal',
  'Executive',
] as const;

export const TRAVEL_PURPOSES = [
  'Client Meeting',
  'Conference',
  'Training',
  'Team Building',
  'Site Visit',
  'Vendor Meeting',
  'Other',
] as const;

/* ------------------------------------------------------------ the form draft */

export interface RequestDraft {
  readonly id?: string;
  readonly destination: string;
  /** '' when unset. Held in `yyyy-MM-dd`, what a native date input carries. */
  readonly departDate: string;
  readonly returnDate: string;
  readonly purpose: string;
  readonly department: string;
  readonly justification: string;
  readonly estimatedCosts: EstimatedCosts;
  readonly needsVisa: boolean;
  readonly needsInsurance: boolean;
  readonly notes: string;
}

/** `_getEmptyRequest()` — `travel-request.controller.js:274-296`. */
export function emptyDraft(): RequestDraft {
  return {
    destination: '',
    departDate: '',
    returnDate: '',
    purpose: '',
    department: '',
    justification: '',
    estimatedCosts: { flights: 0, hotels: 0, meals: 0, transport: 0, other: 0 },
    needsVisa: false,
    needsInsurance: true,
    notes: '',
  };
}

/**
 * `$watch('newRequest.estimatedCosts', ..., true)` — `controller:38-48`.
 *
 * `parseFloat(x) || 0` per field, so a blank or unparseable box contributes
 * nothing rather than poisoning the sum with NaN.
 */
export function totalEstimate(costs: EstimatedCosts): number {
  return (
    (Number(costs.flights) || 0) +
    (Number(costs.hotels) || 0) +
    (Number(costs.meals) || 0) +
    (Number(costs.transport) || 0) +
    (Number(costs.other) || 0)
  );
}

/**
 * `$watch('newRequest.departDate' / '.returnDate')` — `controller:50-62`.
 *
 * Returns `null` when either date is missing or unparseable. A BACKWARDS range
 * yields a negative number rather than null: the template hides the badge with
 * `ng-if="tripDuration > 0"`, but the value is still computed, and
 * `travel-request.feature` asserts on it directly ("the controller has worked
 * the duration out as -5 days").
 */
export function tripDuration(departDate: string, returnDate: string): number | null {
  const from = parseApiDate(departDate);
  const to = parseApiDate(returnDate);
  if (from === null || to === null) return null;
  return differenceInDays(from, to);
}

function parseApiDate(value: string): Date | null {
  if (value === '') return null;
  const parsed = parse(value, API_DATE_FORMAT, new Date());
  return isValid(parsed) ? parsed : null;
}

/* ------------------------------------------------------------- formatting */

/**
 * `moment(d).format('MMM D, YYYY')` — `travel-request.service.js:20-21`.
 *
 * Parsed with an explicit format (ADR-009). `new Date('2024-05-01')` is UTC
 * midnight while moment's was LOCAL midnight, so substituting it would shift
 * the rendered day for anyone west of Greenwich.
 */
export function formatListDate(date: string): string {
  const parsed = parseApiDate(date);
  return parsed === null ? '' : format(parsed, 'MMM d, yyyy');
}

/**
 * `moment(createdAt).format('MMM D, YYYY h:mm A')` — `service.js:22`.
 *
 * `createdAt` is a full ISO timestamp, not a plain day, so it is parsed as one.
 * The narrow no-break space modern runtimes put before AM/PM is normalised —
 * it is invisible in a diff and breaks a literal comparison.
 */
export function formatSubmittedAt(isoTimestamp: string): string {
  const when = new Date(isoTimestamp);
  if (Number.isNaN(when.getTime())) return '';
  return format(when, 'MMM d, yyyy h:mm a').replace(/\u202f/g, ' ');
}

/* -------------------------------------------------------------- validation */

/**
 * `validateRequest()` — `travel-request.controller.js:198-228`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FAIL-FAST, ORDER-DEPENDENT, ONE MESSAGE AT A TIME
 * ─────────────────────────────────────────────────────────────────────────
 * Six checks in a fixed order. The first failure wins and returns immediately;
 * later checks never run. The screen shows exactly one complaint, because the
 * legacy holds a single `errorMessage` string rather than a per-field map.
 *
 * This is REPRODUCED DELIBERATELY, not inherited. `travel-request.feature`'s
 * validation outline walks the order one field at a time — filling
 * "destination" must produce the DATES complaint, which is only true if the
 * checks run in this sequence and stop at the first failure.
 *
 * No form library is used. One would have to be configured back into this
 * shape, and the configuration would be more code than the six ifs.
 *
 * The order and the message text are both part of the contract:
 *
 *   1. destination missing        -> "Destination is required."
 *   2. either date missing        -> "Travel dates are required."
 *   3. return before depart       -> "Return date must be after departure date."
 *   4. purpose missing            -> "Travel purpose is required."
 *   5. department missing         -> "Department is required."
 *   6. total estimate <= 0        -> "Please provide cost estimates."
 */
export interface ValidationFailure {
  readonly message: string;
  /** The field the legacy marks with `has-error`. Only destination has one. */
  readonly field: 'destination' | null;
}

export function validateDraft(draft: RequestDraft): ValidationFailure | null {
  if (!draft.destination) {
    // controller:204 — `$('#destinationField').addClass('has-error')`, the only
    // field-level marking in the form (ADR-007 category 4).
    return { message: 'Destination is required.', field: 'destination' };
  }

  if (!draft.departDate || !draft.returnDate) {
    return { message: 'Travel dates are required.', field: null };
  }

  // controller:211 — `moment(return).isBefore(moment(depart))`. STRICTLY
  // before, so a same-day return passes and yields a 0-day trip.
  const depart = parseApiDate(draft.departDate);
  const back = parseApiDate(draft.returnDate);
  if (depart !== null && back !== null && back.getTime() < depart.getTime()) {
    return { message: 'Return date must be after departure date.', field: null };
  }

  if (!draft.purpose) {
    return { message: 'Travel purpose is required.', field: null };
  }

  if (!draft.department) {
    return { message: 'Department is required.', field: null };
  }

  if (totalEstimate(draft.estimatedCosts) <= 0) {
    return { message: 'Please provide cost estimates.', field: null };
  }

  return null;
}

/* ------------------------------------------------------ filtering + search */

/**
 * `applyFilters()` — `travel-request.controller.js:110-128`.
 *
 * THE SEARCH IS THE REPAIR THIS INCREMENT CARRIES (ADR-005, plan §8.3). The
 * legacy called `req.travelerName.toLowerCase()` unconditionally on requests
 * that carry no such field, throwing a TypeError out of the digest before
 * `filteredRequests` was reassigned — so the table never changed.
 *
 * The intent was to search destination, purpose and traveller name. That is
 * what happens; an absent field contributes nothing instead of throwing. The
 * TypeScript type makes the unguarded call a compile error, so the defect
 * cannot come back by accident.
 *
 * Status filter and search COMBINE, and the result is ordered newest first.
 */
export function applyFilters(
  requests: readonly TravelRequest[],
  filterStatus: string,
  searchQuery: string,
): TravelRequest[] {
  let filtered = [...requests];

  if (filterStatus !== 'all') {
    filtered = filtered.filter((r) => r.status === filterStatus);
  }

  const query = searchQuery.trim().toLowerCase();
  if (query !== '') {
    filtered = filtered.filter((r) => matchesQuery(r, query));
  }

  // `_.orderBy(filtered, ['createdAt'], ['desc'])`
  return filtered.sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
}

function matchesQuery(request: TravelRequest, lowerQuery: string): boolean {
  const haystacks = [request.destination, request.purpose, request.travelerName ?? ''];
  return haystacks.some((h) => h.toLowerCase().includes(lowerQuery));
}

/* ------------------------------------------------------------------ counts */

export interface StatusCounts {
  readonly all: number;
  readonly pending: number;
  readonly approved: number;
  readonly rejected: number;
}

/**
 * `getStatusCounts()` — `controller:264-271`.
 *
 * Counted over ALL requests, never the filtered view. That is what produces the
 * contradiction `travel-request.feature` pins: cancelling under the Pending
 * filter leaves the row on screen while the cards already say 0 pending.
 */
export function statusCounts(requests: readonly TravelRequest[]): StatusCounts {
  return {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };
}

/**
 * `getStatusClass()` — `controller:254-262`.
 *
 * This is what `approval-status.directive.js` was built to provide and never
 * did — the directive has zero consumers (Q-10) and is deleted, not ported.
 * The mapping below is the one the template actually uses, so the rendered
 * output is unchanged: a lowercase status in a Bootstrap label, no icon.
 *
 * Note `default: 'label-info'`, which differs from the itinerary's
 * `label-default`. The two modules genuinely disagree, which is why this stays
 * local rather than being hoisted into a shared component.
 */
export function statusClass(status: string): string {
  switch (status) {
    case 'approved':
      return 'label-success';
    case 'pending':
      return 'label-warning';
    case 'rejected':
      return 'label-danger';
    case 'cancelled':
      return 'label-default';
    default:
      return 'label-info';
  }
}

/** Only a pending request offers Edit and Cancel. `template:290-297`. */
export function actionsFor(status: string): readonly string[] {
  return status === 'pending' ? ['View Details', 'Edit', 'Cancel'] : ['View Details'];
}
