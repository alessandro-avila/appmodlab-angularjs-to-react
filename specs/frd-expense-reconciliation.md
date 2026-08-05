# FRD: Expense Reconciliation

**Feature ID**: F-015 (primary) · also covers F-016, F-017
**Status**: Draft
**Priority**: P1
**Last Updated**: 2026-08-04
**Source of truth**: `app/components/expense-reconciliation/*`, `app/app.routes.js`, `specs/contracts/api/expense-reconciliation.yaml`

> **Phase note.** This is a B2b brownfield FRD. It documents what the code **does today**,
> read directly from source. Behaviour that is surprising is recorded under *Known Limitations*
> in neutral, falsifiable terms; deciding what to do about any of it belongs to Phase A.

---

## Description

Expense Reconciliation is the module an employee uses to account for money already spent on a trip.
It is one of the five UI-Router feature states (`'expenses'`, URL `/expenses`,
`app/app.routes.js:56-61`) and requires authentication (`data: { requireAuth: true }`,
`app/app.routes.js:60`).

The screen carries four surfaces: a six-tile dashboard, a create-report form containing a nested
line-item builder, a filter bar with a status group, a text search and a date range, and a table of
existing reports. All four read the same `$scope.reports` array, loaded from
`GET /api/expense-reports` at construction (`controller:339`), after a successful submit
(`controller:206`), and on `auth:login` (`controller:330-332`).

A report is a container: it has a title, a trip destination, an optional travel-request link, notes,
and an `expenses` array. Line items are built entirely client-side — the user fills a date,
category, description, amount, currency and optional receipt, presses Add, and the item is pushed
onto the in-memory array with a locally generated id (`controller:162-171`). Nothing is sent to the
server until the whole report is submitted as a single `POST`. A deep `$watch` on the array keeps
`totalAmount` and a per-category breakdown current (`controller:37-44`).

The dashboard is computed entirely on the client from the loaded reports: six figures covering
submitted, pending and approved totals, a report count, a mean, a top category and a
current-month total (`controller:125-136`).

Opening a report issues `GET /api/expense-reports/{id}` and re-derives per-expense display fields
and a `categoryTotals` map before showing a Bootstrap modal (`controller:216-230`, `service:34-49`).
Deleting a report is a real `DELETE`; it is offered only for reports in `draft` status
(`template:301-302`).

Three further capabilities are implemented on both sides but are not reachable from the UI: updating
a report, linking a report to a travel request, and fetching statistics. Receipt upload is
half-wired — the UI captures a file, but the multipart method that would send it is never called.

This module emits notifications and listens for `auth:login`. It neither emits nor listens for
`itinerary:refresh`.

---

## User Stories

### US-F015-001: See a spending dashboard on arrival

**AS A** GlobalTravel employee
**I WANT** headline expense figures as soon as I open the screen
**SO THAT** I can see where my reimbursements stand without opening anything

**GIVEN** I am authenticated and navigate to `/expenses`
**WHEN** the controller is constructed
**THEN** `GET /api/expense-reports` is issued (`controller:339` → `service:18`)
**AND** six dashboard figures are computed from the loaded reports (`controller:125-136`)
**AND** the tiles render only once `dashboard` exists (`template:22`)

### US-F015-002: Start a new expense report

**AS A** GlobalTravel employee
**I WANT** a form that opens on demand
**SO THAT** the report list stays readable when I am not filing anything

**GIVEN** the expenses screen is showing
**WHEN** I press the new-report button (`template:7`)
**THEN** `showNewReport` is toggled and both the report and line-item models are reset
(`controller:140-142`)
**AND** the panel is revealed with a jQuery slide-down and three datepickers are bound
(`controller:145-148`)

### US-F015-003: Add expense line items

**AS A** GlobalTravel employee
**I WANT** to add each expense as a line on the report
**SO THAT** the report itemises what I spent

**GIVEN** the new-report form is open
**WHEN** I enter a description and an amount and press Add (`template:156`)
**THEN** the line item is copied, given a Lodash-generated id, a formatted date and a formatted
amount (`controller:162-165`)
**AND** it is pushed onto `newReport.expenses` and the entry fields are reset
(`controller:167-168`)
**AND** an `info` notification is broadcast (`controller:170`)

### US-F015-004: See the report total as I build it

**AS A** GlobalTravel employee
**I WANT** the report total and a category breakdown to update as I add lines
**SO THAT** I know what I am claiming before I submit

**GIVEN** at least one line item exists
**WHEN** the `expenses` array changes in any way
**THEN** a deep `$watch` recomputes `totalAmount` with `_.sumBy` and rebuilds
`categoryBreakdown` by grouping on category (`controller:37-44`)
**AND** both are rendered — the total in the table footer (`template:199`) and the breakdown as
one progress bar per category (`template:209-213`)

### US-F015-005: Remove a line item

**AS A** GlobalTravel employee
**I WANT** to delete a line I entered by mistake
**SO THAT** the report is accurate

**GIVEN** the line-item table is showing
**WHEN** I press the trash button on a row (`template:190`)
**THEN** that entry is spliced out of `newReport.expenses` by index (`controller:174-176`)

### US-F015-006: Submit the report

**AS A** GlobalTravel employee
**I WANT** to send the completed report
**SO THAT** it can be reimbursed

**GIVEN** the report has a title and at least one line item
**WHEN** I press Submit (`template:230`)
**THEN** the model is copied, stamped with an ISO `submittedAt` and a `submittedBy` taken from
`$rootScope.currentUser` (`controller:192-194`)
**AND** every line item's `date` is reformatted to `YYYY-MM-DD` (`controller:197-200`)
**AND** the report is sent to `POST /api/expense-reports` (`service:54`)
**AND** a success notification is broadcast, the form closes and the list re-loads
(`controller:203-206`)

### US-F015-007: Narrow the report list

**AS A** GlobalTravel employee
**I WANT** to filter by status, search by text and bound by date
**SO THAT** I can find one report among many

**GIVEN** the list is populated
**WHEN** I press a status button, type in the search box, or set either date bound
**THEN** the corresponding watch re-runs `applyFilters` (`controller:46-48`, `controller:50-54`)
**AND** the search matches title or trip destination, case-insensitively
(`controller:100-105`)
**AND** the date bounds compare against `submittedAt` with Moment
(`controller:107-119`)
**AND** the result is ordered newest first (`controller:121`)

### US-F015-008: Open a report and read its lines

**AS A** GlobalTravel employee
**I WANT** to open a report and see every line and a per-category total
**SO THAT** I can check what was claimed

**GIVEN** a report row in the table
**WHEN** I press its view button (`template:298`)
**THEN** `GET /api/expense-reports/{id}` is issued (`service:35`)
**AND** each expense receives a formatted date and amount, and a `categoryTotals` map is derived
by grouping on category (`service:36-45`)
**AND** a Bootstrap modal is opened through jQuery (`controller:223`)

### US-F015-009: Delete a draft report

**AS A** GlobalTravel employee
**I WANT** to remove a report I never submitted
**SO THAT** it stops cluttering the list

**GIVEN** a report whose status is `draft` (`template:302`)
**WHEN** I press its delete button and confirm the native dialog (`controller:233`)
**THEN** `DELETE /api/expense-reports/{id}` is issued (`service:73`)
**AND** the report is removed from the local array, the filters and dashboard are recomputed, and
a `warning` notification is broadcast (`controller:236-239`)

### US-F016-001: Attach a receipt to a line item

**AS A** GlobalTravel employee
**I WANT** to attach a receipt file to an expense line
**SO THAT** the claim is evidenced

**GIVEN** the line-item entry row is showing
**WHEN** I press the paperclip button (`template:151`)
**THEN** a hidden file input is clicked through jQuery (`controller:248`)
**AND** on selection the file and its name are stored on the line-item model, followed by an
explicit `$scope.$apply()` (`controller:251-258`)
**AND** the file name is shown beneath the entry row (`template:161-162`) and a paperclip icon
appears on the line once added (`template:185-186`)

> The captured file never leaves the browser. `ExpenseService.uploadReceipt` is never called. See
> *Known Limitations* 9.

---

## Functional Requirements

### FR-F015-001: Initialise state and load on entry

- **Input**: controller construction.
- **Processing**: initialise `reports`, `filteredReports`, `selectedReport`, `isLoading`,
  `errorMessage`, `showNewReport`, `filterStatus` (`'all'`), `searchQuery` and `dateRange`
  (`controller:15-23`); set `newReport` and `newExpense` from their factories
  (`controller:25-26`); define the twelve-entry `expenseCategories` list (`controller:28-32`) and
  the six-entry `currencies` list (`controller:34`); call `loadReports()` (`controller:339`).
- **Output**: dashboard, filtered table.
- **Error handling**: on rejection set `errorMessage` to `'Failed to load expense reports.'` and
  broadcast an `error` notification (`controller:83-85`); `isLoading` cleared in `finally`
  (`controller:86-88`).

### FR-F015-002: Decorate each report for display

- **Input**: the raw array from `GET /api/expense-reports`.
- **Processing**: `_.map` adds `submittedFormatted` (`MMM D, YYYY`), `totalFormatted` (`'$'`
  concatenated with `toFixed(2)` of `totalAmount` or `0`), `expenseCount` (array length or `0`)
  and `daysSinceSubmission` (Moment `diff` from now) (`service:19-25`).
- **Output**: decorated reports mutated in place.
- **Error handling**: none.

### FR-F015-003: Compute the dashboard

- **Input**: `$scope.reports`.
- **Processing**: build an eight-key `dashboard` object — `totalSubmitted` (`_.sumBy` over all),
  `totalApproved`, `totalPending`, `totalRejected` (each a `_.sumBy` over a `_.filter` by status),
  `reportCount`, `avgAmount` (`_.meanBy`, guarded against an empty array), `topCategory` and
  `recentMonth` (`controller:125-136`).
- **Output**: `$scope.dashboard`.
- **Error handling**: `avgAmount` is `0` when there are no reports (`controller:132`).

### FR-F015-004: Derive the top spending category

- **Input**: `$scope.reports`.
- **Processing**: flatten every report's `expenses` with `_.flatMap`; return `'N/A'` if empty;
  group by `category`; sum each group with `parseFloat` coercion; return the key with the largest
  total via `_.maxBy` over `_.keys`, falling back to `'N/A'` (`controller:311-319`).
- **Output**: a category name string.
- **Error handling**: two explicit `'N/A'` fallbacks.

### FR-F015-005: Derive the current-month total

- **Input**: `$scope.reports`.
- **Processing**: take `moment().startOf('month')`; filter reports whose `submittedAt` is at or
  after it; sum `totalAmount`, defaulting to `0` (`controller:321-327`).
- **Output**: a number.
- **Error handling**: `|| 0` guard on the sum (`controller:326`).

### FR-F015-006: Maintain the running report total and breakdown

- **Input**: any change under `newReport.expenses`.
- **Processing**: a deep `$watch` (third argument `true`, `controller:44`), guarded by
  `expenses && expenses.length > 0` (`controller:38`), sums `parseFloat(exp.amount) || 0` into
  `totalAmount` (`controller:39-41`) and assigns `categoryBreakdown` from `_getCategoryBreakdown`
  (`controller:42`), which groups by `category` and sums each group
  (`controller:305-309`).
- **Output**: `newReport.totalAmount`, `newReport.categoryBreakdown`.
- **Error handling**: non-numeric amounts contribute `0`.

### FR-F015-007: Filter, bound and sort the report list

- **Input**: `reports`, `filterStatus`, `searchQuery`, `dateRange`.
- **Processing**: shallow-copy with `_.clone` (`controller:93`); status filter by exact match when
  not `'all'` (`controller:95-97`); case-insensitive substring search over `title` and
  `tripDestination` (`controller:99-106`); lower bound via `isSameOrAfter` and upper bound via
  `isSameOrBefore` against `submittedAt` (`controller:107-119`); order by `submittedAt` descending
  (`controller:121`).
- **Output**: `filteredReports`.
- **Error handling**: none. `report.title` and `report.tripDestination` are dereferenced without a
  guard.

### FR-F015-008: Toggle and reset the report form

- **Input**: the new-report button.
- **Processing**: invert `showNewReport`, reset both models (`controller:140-142`); when opening,
  defer a jQuery `hide().slideDown(300)` on `#new-expense-report` and initialise the datepickers
  (`controller:144-150`).
- **Output**: form visible or hidden.
- **Error handling**: none.

### FR-F015-009: Initialise the date pickers

- **Input**: an explicit call from the form toggle.
- **Processing**: inside a `$timeout`, bind a jQuery UI datepicker to `#expenseDate` with
  `maxDate: 0` and `dateFormat: 'mm/dd/yy'`, its `onSelect` writing the model inside
  `$scope.$apply` (`controller:59-67`); bind a second datepicker to the combined selector
  `#reportStartDate, #reportEndDate` with only a `dateFormat` and no `onSelect`
  (`controller:68-70`).
- **Output**: three date inputs backed by calendar widgets.
- **Error handling**: none.

### FR-F015-010: Add a line item

- **Input**: `newExpense`.
- **Processing**: reject when `description` or `amount` is falsy, flashing `has-error` on
  `.expense-required` for three seconds through a jQuery `delay`/`queue` chain
  (`controller:154-160`); otherwise `angular.copy` the entry, assign `_.uniqueId('exp_')`, a
  Moment-formatted `dateFormatted` and a `'$'`-prefixed `amountFormatted`
  (`controller:162-165`); push and reset (`controller:167-168`); broadcast an `info` notification
  (`controller:170`).
- **Output**: one more entry in `newReport.expenses`.
- **Error handling**: the falsy-field branch is the only validation.

### FR-F015-011: Remove a line item

- **Input**: the row index.
- **Processing**: `splice(index, 1)` on `newReport.expenses` (`controller:175`).
- **Output**: one fewer entry.
- **Error handling**: none; the index comes from `$index` (`template:190`).

### FR-F015-012: Submit the report

- **Input**: `newReport`.
- **Processing**: reject with `'Report title is required.'` when the title is empty
  (`controller:180-183`) and with `'Add at least one expense item.'` when the array is empty
  (`controller:184-187`); copy the model, stamp `submittedAt` and `submittedBy`
  (`controller:192-194`); `_.map` each line item's `date` to `YYYY-MM-DD` (`controller:197-200`);
  `POST` (`service:54`).
- **Output**: a created report.
- **Error handling**: on rejection set `errorMessage` to `'Failed to submit expense report.'` and
  broadcast an `error` notification (`controller:207-210`); `isLoading` cleared in `finally`
  (`controller:210-212`).

### FR-F015-013: Open a report

- **Input**: a report object.
- **Processing**: assign it to `selectedReport` immediately, set `isLoading`
  (`controller:217-218`); fetch details and replace `selectedReport` with the decorated result;
  open the modal through jQuery (`controller:220-224`).
- **Output**: an open modal showing lines and category totals.
- **Error handling**: on rejection set `errorMessage` to `'Failed to load report details.'`
  (`controller:224-226`); `isLoading` cleared in `finally` (`controller:226-228`).

### FR-F015-014: Delete a report

- **Input**: a report object.
- **Processing**: native `confirm()` gate (`controller:233`); `DELETE` (`service:73`); on success
  `_.remove` the report from `$scope.reports` by id, re-run `applyFilters` and
  `calculateDashboard`, broadcast a `warning` notification (`controller:235-239`).
- **Output**: the report gone from both sides.
- **Error handling**: on rejection broadcast `'Failed to delete report'` as `error`
  (`controller:240-242`).

### FR-F015-015: Presentation helpers

- **Input**: a date, an amount or a status string.
- **Processing**: `formatDate` returns Moment `MMM D, YYYY` (`controller:261-263`);
  `formatCurrency` delegates to the built-in AngularJS `currency` filter with symbol `'$'` and two
  fraction digits (`controller:265-267`); `getStatusClass` maps `approved`→`label-success`,
  `pending`→`label-warning`, `rejected`→`label-danger`, `draft`→`label-default`, default
  `label-info` (`controller:269-277`).
- **Output**: strings.
- **Error handling**: none.

### FR-F016-001: Receipt capture (client-side only)

- **Input**: a file chosen from the OS dialog.
- **Processing**: `uploadReceipt` triggers a click on `#receiptFileInput` through jQuery
  (`controller:246-249`); the input's native `onchange` reaches the controller via
  `angular.element(this).scope()` (`template:154-155`); `onReceiptSelected` stores the `File`
  object and its name on `newExpense` and calls `$scope.$apply()`
  (`controller:251-258`).
- **Output**: `newExpense.receipt`, `newExpense.receiptName`.
- **Error handling**: guarded by `files && files.length > 0` (`controller:252`).

### FR-F016-002: Receipt upload transport (defined, never invoked)

- **Input**: an expense id and a `File`.
- **Processing**: `ExpenseService.uploadReceipt` builds a `FormData`, appends the file under the
  key `receipt`, and posts it with `transformRequest: angular.identity` and an undefined
  `Content-Type` so the browser sets the multipart boundary (`service:82-90`). The server route
  responds with an `expenseId`, a synthesised `receiptUrl` and an `uploadedAt`
  (`api-mock/server.js:693-699`).
- **Output**: a receipt URL.
- **Error handling**: none.

> `uploadReceipt` has no caller. See *Known Limitations* 9.

### FR-F017-001: Expense statistics (defined, never reachable)

- **Input**: optional query parameters.
- **Processing**: `ExpenseService.getStatistics` requests `expense-reports/statistics`
  (`service:97-99`). The server handler computes `totalExpenses`, `reportCount`, `pendingCount`
  and `approvedCount` from the array, then returns a literal `categoryBreakdown` object and a
  literal `monthlyTotals` array (`api-mock/server.js:668-691`).
- **Output**: a statistics document.
- **Error handling**: none.

> The route is registered after `GET /api/expense-reports/:id` and is shadowed by it. See
> *Known Limitations* 10.

### FR-F015-016: Report update and travel-request linking (defined, not reachable from the UI)

- **Input**: a report id plus either a full report body or a `travelRequestId`.
- **Processing**: `updateReport` sends the whole body (`service:63-65`);
  `linkToTravelRequest` sends only `{ travelRequestId }` (`service:107-111`). Both target
  `PUT /api/expense-reports/{id}`, which merges the body onto the stored record and then
  recomputes `totalAmount` from the expenses array when that array is non-empty
  (`api-mock/server.js:644-657`).
- **Output**: an updated report.
- **Error handling**: `404` when the id is unknown (`api-mock/server.js:646-648`).

> Neither method has a caller. The form does expose a `travelRequestId` text input
> (`template:100`), but its value travels only through the initial `POST`.

---

## Non-Functional Requirements

### NFR-F015-001: Authentication is required for every endpoint in this module

All seven handlers are registered with `authMiddleware` (`api-mock/server.js:617`, `:621`,
`:636`, `:644`, `:659`, `:668`, `:693`), and the UI-Router state carries `requireAuth: true`
(`app/app.routes.js:60`).

### NFR-F015-002: Ownership is not evaluated

No handler compares `req.user.id` with `ExpenseReport.userId`, and none reads `req.user.role`.
`GET /api/expense-reports` returns the whole array (`api-mock/server.js:617-619`), and `PUT` and
`DELETE` accept any id from any authenticated caller
(`specs/contracts/api/expense-reconciliation.yaml §x-discrepancies/no-ownership-check`).

### NFR-F015-003: Line items exist only in the browser until submit

`addExpense` mutates a local array (`controller:167`); there is no per-item endpoint. A report is
therefore all-or-nothing: closing the form or reloading the page discards every unsubmitted line.

### NFR-F015-004: The dashboard is a client-side derivation

All six figures are computed in `calculateDashboard` from the already-loaded array
(`controller:125-136`). The server's statistics endpoint is not used, so the dashboard is
consistent with the list by construction and independent of the server's own totals.

### NFR-F015-005: Server state is in-process and mutable

`expenseReports` is a module-level array seeded with two records
(`api-mock/server.js:222-255`). Creates push, updates mutate, deletes splice. Restarting the mock
API restores the seed.

### NFR-F015-006: Presentation is coupled to the DOM

Six jQuery call sites manipulate elements by id, class or tag (`controller:59`, `:68`, `:146`,
`:156`, `:223`, `:248`). Two depend on third-party plugins — jQuery UI `datepicker` and Bootstrap
`modal`. One template binding reaches back into AngularJS from raw DOM via
`angular.element(this).scope()` (`template:155`).

---

## Dependencies

| Depends on | Why | Evidence |
|---|---|---|
| F-001 Authentication | The state is `requireAuth`, all endpoints are behind `authMiddleware`, and `submittedBy` is read from `$rootScope.currentUser` | `app/app.routes.js:60`; `api-mock/server.js:617`; `controller:194` |
| `auth:login` event | Triggers a list reload without a state change | `controller:330-332` |
| `notification:add` event | The module's only outbound broadcast | `controller:85`, `:170`, `:203`, `:209`, `:239`, `:241` |
| Restangular | Every call in `service` is a Restangular builder | `service:11`, `:35`, `:54`, `:64`, `:73`, `:85-89`, `:98`, `:108` |
| Moment.js | Date bounds, display formatting, payload date normalisation, month start | `controller:108`, `:110`, `:115`, `:117`, `:164`, `:193`, `:198`, `:262`, `:322`, `:324`; `service:20`, `:23`, `:37` |
| Lodash | Sum, mean, group, map-values, flat-map, max, clone, filter, order, remove, unique-id | `controller:39`, `:93`, `:96`, `:101`, `:109`, `:116`, `:121`, `:127-132`, `:163`, `:197`, `:236`, `:306-307`, `:312-318`, `:323-326`; `service:19`, `:36`, `:41-42` |
| jQuery + jQuery UI | Datepickers, slide, error flash, file-input trigger | `controller:59`, `:68`, `:146`, `:156`, `:248` |
| Bootstrap 3 JS | The detail modal is opened imperatively | `controller:223`; `template:328` |
| AngularJS `currency` filter | The module's only currency formatter | `controller:266` |
| F-012 Travel Request | `travelRequestId` links a report to a request | `controller:284`; `template:100`; `service:107-111` |

**Direction.** Every row above is **upstream** — this module consumes it — with one exception:
`notification:add` is **downstream**, broadcast by this module (6 sites) and consumed by the single
listener in `app/app.js:44`. **Nothing else depends on this module:** it emits no other event, and
no other controller or service references `ExpenseService`.

---

## Current Implementation (Brownfield Extension)

### Files Involved

| File | Lines | Role |
|---|---|---|
| `app/components/expense-reconciliation/expense.controller.js` | 342 | All view logic: state, three watches, dashboard derivation, line-item builder, jQuery effects |
| `app/components/expense-reconciliation/expense.service.js` | 113 | Seven Restangular methods; Moment/Lodash decoration on list and details |
| `app/components/expense-reconciliation/expense.template.html` | 396 | Dashboard, report form, line-item table, filters, report table, detail modal |
| `app/app.routes.js` | 56-61 | `'expenses'` state registration |
| `api-mock/server.js` | 222-255, 617-699 | Seed records and seven handlers |
| `specs/contracts/api/expense-reconciliation.yaml` | — | Extracted contract and its seven recorded discrepancies |

#### Not involved, despite proximity

- **`app/directives/currency-input.directive.js`** (120 lines) declares `gtCurrencyInput` with
  `restrict: 'A'` (`currency-input.directive.js:13-15`), so it would activate on a
  `gt-currency-input` attribute. That attribute appears in **zero** templates in the application.
  The amount field here is a plain `<input type="number">` (`template:138`).
  **This contradicts the B2b source table**, which lists the directive as a source for this FRD —
  see *Known Limitations* 14.
- **`app/filters/currency.filter.js`** declares the `usdCurrency` filter. It is applied in no
  template. This module formats currency through `$filter('currency')` (`controller:266`) and
  through string concatenation in the service (`service:21`, `:38`).
  **The B2b source table lists this file as a source for this FRD** — likewise recorded as
  not-involved.
- **`app/directives/date-picker.directive.js`** declares `gtDatePicker`; this module initialises
  jQuery UI datepickers directly (`controller:57-72`).
- **`app/services/api.service.js`** (`ApiService`) is injected nowhere; this module uses
  Restangular.

### Architecture Pattern

The classic AngularJS 1.x controller-plus-service split, with the controller owning view state,
derivations and DOM effects:

```
expense.template.html
        │  ng-click / ng-model / {{ }} / raw onchange
        ▼
ExpenseController  ── $rootScope.$broadcast('notification:add', …)
        │  3 × $watch, 6 × jQuery, $filter('currency')
        ▼
ExpenseService  ── Restangular ──▶  /api/expense-reports*
                                    /api/expenses/{id}/receipt
```

Both files use the IIFE + `'use strict'` + array-annotated DI wrapper used everywhere in this
codebase (`controller:6-12`, `service:5-9`).

### Scope shape

| Property | Initial value | Written by | Read by |
|---|---|---|---|
| `reports` | `[]` (`:15`) | `loadReports` (`:80`), `deleteReport` (`:236`) | `applyFilters` (`:93`), `calculateDashboard` (`:127-133`) |
| `filteredReports` | `[]` (`:16`) | `applyFilters` (`:121`) | `template:275`, `:289`, `:313` |
| `selectedReport` | `null` (`:17`) | `viewReport` (`:217`, `:221`) | `template:330-388` |
| `isLoading` | `false` (`:18`) | `:76`, `:87`, `:189`, `:211`, `:218`, `:227` | `template:230`, `:313`, `:322` |
| `errorMessage` | `''` (`:19`) | `:77`, `:84`, `:181`, `:185`, `:190`, `:208`, `:225` | `template:16` |
| `showNewReport` | `false` (`:20`) | `:140`, `:204` | `template:74` |
| `filterStatus` | `'all'` (`:21`) | `template:243-252` | `applyFilters` (`:95-97`) |
| `searchQuery` | `''` (`:22`) | `template:259` | `applyFilters` (`:99-106`) |
| `dateRange` | `{ start: null, end: null }` (`:23`) | `template:265`, `:268` | `applyFilters` (`:107-119`) |
| `newReport` | `_getEmptyReport()` (`:25`) | `:141`, `:167`, `:175`, `:205`, watch | the whole form |
| `newExpense` | `_getEmptyExpense()` (`:26`) | `:142`, `:168`, `:254-255` | the entry row |
| `dashboard` | *undefined until first load* | `calculateDashboard` (`:126`) | `template:22-67` |
| `expenseCategories` | 12-item literal (`:28-32`) | never | `template:121` |
| `currencies` | 6-item literal (`:34`) | never | `template:146` |

`_getEmptyReport()` (`controller:280-290`) returns seven keys; `_getEmptyExpense()`
(`controller:292-303`) returns eight, with `date` defaulting to `new Date()` and `currency`
defaulting to `'USD'`.

`dashboard` is the only scope property with no initial value; the tiles are guarded by
`ng-if="dashboard"` (`template:22`).

### Watches

| Watch | Expression | Deep? | Body |
|---|---|---|---|
| `:37-44` | `newReport.expenses` | **yes** (`:44`) | guarded by `length > 0`; recompute `totalAmount` and `categoryBreakdown` |
| `:46-48` | `$watchGroup(['searchQuery', 'filterStatus'])` | no | `applyFilters()` |
| `:50-54` | `dateRange` | **yes** (`:54`) | guarded by `start \|\| end`; `applyFilters()` |

All three are registered unconditionally at construction and are never deregistered; they are
destroyed with the scope.

### `$rootScope` events

| Direction | Event | Site | Payload |
|---|---|---|---|
| out | `notification:add` | `:85` | `'Failed to load expenses'`, `'error'` |
| out | `notification:add` | `:170` | `'Expense item added'`, `'info'` |
| out | `notification:add` | `:203` | `'Expense report submitted successfully!'`, `'success'` |
| out | `notification:add` | `:209` | `'Expense submission failed'`, `'error'` |
| out | `notification:add` | `:239` | `'Expense report deleted'`, `'warning'` |
| out | `notification:add` | `:241` | `'Failed to delete report'`, `'error'` |
| in | `auth:login` | `:330-332` | ignored; triggers `loadReports()` |

The `auth:login` listener is registered on `$rootScope` and explicitly deregistered on `$destroy`
(`controller:334-336`) — the same pattern used by the itinerary and travel-request modules. This is
the only module that emits an `info`-level notification.

### jQuery selectors and effects

| Site | Selector | Operation |
|---|---|---|
| `:59` | `#expenseDate` | jQuery UI `.datepicker({ maxDate: 0, dateFormat: 'mm/dd/yy' })` |
| `:68` | `#reportStartDate, #reportEndDate` | jQuery UI `.datepicker({ dateFormat: 'mm/dd/yy' })` — one call, two elements, no `onSelect` |
| `:146` | `#new-expense-report` | `.hide().slideDown(300)` |
| `:156-158` | `.expense-required` | `.addClass('has-error').delay(3000).queue(…)` then `.removeClass('has-error').dequeue()` |
| `:223` | `#expenseDetailModal` | Bootstrap `.modal('show')` |
| `:248` | `#receiptFileInput` | `.trigger('click')` |

The `#expenseDate` `onSelect` handler writes to the model inside `$scope.$apply`
(`controller:63-65`). The two report-range pickers have no `onSelect`, so their selections reach
the model only through the ordinary `ng-model` binding on the input
(`template:265`, `:268`).

### Moment.js call sites — and whether a parse format is supplied

| Site | Call | Parse format supplied? |
|---|---|---|
| `controller:108` | `moment(dateRange.start)` | no |
| `controller:110` | `moment(report.submittedAt).isSameOrAfter(start)` | no |
| `controller:115` | `moment(dateRange.end)` | no |
| `controller:117` | `moment(report.submittedAt).isSameOrBefore(end)` | no |
| `controller:164` | `moment(expense.date).format('MMM D, YYYY')` | no |
| `controller:193` | `moment().toISOString()` | n/a (now) |
| `controller:198` | `moment(exp.date).format('YYYY-MM-DD')` | no |
| `controller:262` | `moment(date).format('MMM D, YYYY')` | no |
| `controller:322` | `moment().startOf('month')` | n/a (now) |
| `controller:324` | `moment(r.submittedAt).isSameOrAfter(thisMonth)` | no |
| `service:20` | `moment(report.submittedAt).format('MMM D, YYYY')` | no |
| `service:23` | `moment().diff(moment(report.submittedAt), 'days')` | no |
| `service:37` | `moment(exp.date).format('MMM D, YYYY')` | no |

Thirteen call sites, **none** supplying an explicit format. The values are of three kinds:
`Date` objects from the datepicker and from `_getEmptyExpense` (`controller:294`), `YYYY-MM-DD`
strings from the seed data (`api-mock/server.js:234-237`), and ISO-8601 timestamps
(`api-mock/server.js:230`). One seeded report has `submittedAt: null`
(`api-mock/server.js:247`) — see *Known Limitations* 7.

### Lodash call sites

| Site | Call | Purpose |
|---|---|---|
| `controller:39` | `_.sumBy(expenses, fn)` | running report total |
| `controller:93` | `_.clone(reports)` | shallow copy before filtering |
| `controller:96` | `_.filter(filtered, { status })` | status filter |
| `controller:101`, `:109`, `:116` | `_.filter(filtered, fn)` | text search, lower bound, upper bound |
| `controller:121` | `_.orderBy(filtered, ['submittedAt'], ['desc'])` | newest first |
| `controller:127-130` | `_.sumBy` / `_.filter` | four dashboard totals |
| `controller:132` | `_.meanBy(reports, 'totalAmount')` | mean report value |
| `controller:163` | `_.uniqueId('exp_')` | client-side line-item id |
| `controller:197` | `_.map(expenses, fn)` | normalise line-item dates |
| `controller:236` | `_.remove(reports, { id })` | drop a deleted report |
| `controller:306-307` | `_.mapValues(_.groupBy(…), _.sumBy)` | category breakdown |
| `controller:312-318` | `_.flatMap` / `_.groupBy` / `_.mapValues` / `_.sumBy` / `_.maxBy` / `_.keys` | top category |
| `controller:323`, `:326` | `_.filter` / `_.sumBy` | current-month total |
| `service:19`, `:36` | `_.map` | decorate list and line items |
| `service:41-42` | `_.mapValues(_.groupBy(…), _.sumBy)` | per-report category totals |

This is the heaviest Lodash usage of any module in the application: 25 call sites across 16
distinct functions.

### API surface used

| Endpoint | Client method | Called from | Reached by the UI? |
|---|---|---|---|
| `GET /api/expense-reports` | `getReports` (`service:17`) | `controller:79` | yes |
| `POST /api/expense-reports` | `submitReport` (`service:53`) | `controller:202` | yes |
| `GET /api/expense-reports/{id}` | `getReportDetails` (`service:34`) | `controller:220` | yes |
| `DELETE /api/expense-reports/{id}` | `deleteReport` (`service:72`) | `controller:235` | yes |
| `PUT /api/expense-reports/{id}` | `updateReport` (`service:63`) | — | **no caller** |
| `PUT /api/expense-reports/{id}` | `linkToTravelRequest` (`service:107`) | — | **no caller** |
| `GET /api/expense-reports/statistics` | `getStatistics` (`service:97`) | — | **no caller**, and the route is shadowed |
| `POST /api/expenses/{id}/receipt` | `uploadReceipt` (`service:82`) | — | **no caller** |

Four of the eight client methods are reachable; four are dead.

### Category vocabularies

| Source | Values | Case | Count |
|---|---|---|---|
| Client dropdown (`controller:28-32`, rendered at `template:121`) | Airfare, Hotel, Meals, Ground Transport, Car Rental, Fuel, Parking, Tips, Phone/Internet, Office Supplies, Entertainment, Other | Title Case | 12 |
| Stored seed expenses (`api-mock/server.js:234-237`, `:251-252`) | flights, hotels, meals, transport, other | lowercase | 5 |
| Statistics `categoryBreakdown` (`api-mock/server.js:678-683`) | flights, hotels, meals, transport, other | lowercase | 5 |

The two vocabularies intersect on no string. `Meals`/`meals` and `Other`/`other` correspond
semantically but differ by case, and grouping is by raw string equality
(`controller:306`, `service:41`). See *Known Limitations* 1.

### Test Coverage

**None.** There is no test file for this module anywhere in the repository, no test runner
configured, and no assertion of any behaviour described above
(`specs/docs/testing/coverage.md`). Every statement in this FRD was verified by reading source,
not by executing it.

### Known Limitations

Recorded as observed behaviour. No remedy is proposed here. Where ADR-001 has already settled the
product intent behind an item, the decision follows in a separate **Target behaviour** note; the
numbered paragraph above each note continues to describe what the code does today, which is what
the Track A green baseline captures.

1. **The client and server category vocabularies do not intersect.** The dropdown offers twelve
   Title Case values (`controller:28-32`); every stored expense and the statistics breakdown use
   five lowercase values (`api-mock/server.js:234-237`, `:678-683`). The server validates neither.
   A report that mixes both produces separate buckets in `categoryBreakdown`
   (`controller:306`), in `categoryTotals` (`service:41`) and in `_getTopCategory`
   (`controller:314`), because all three group by raw string equality.

2. **Removing the last line item leaves the previous total in place.** The auto-totalling watch is
   guarded by `expenses && expenses.length > 0` (`controller:38`). `removeExpense` splices without
   touching `totalAmount` (`controller:174-176`). When the array goes from one entry to zero the
   watch fires but the body does not run, so `newReport.totalAmount` retains the value computed
   when the item was still present. The footer keeps rendering it (`template:199`), and
   `categoryBreakdown` likewise keeps its last non-empty state, so the progress bars remain
   (`template:206-214`). Submission is blocked by the empty-array check
   (`controller:184-187`), so the stale value is visible but not sendable.

3. **`Expense.currency` is stored and read by nothing.** `_getEmptyExpense` defaults it to `'USD'`
   (`controller:298`); the form offers six values (`controller:34`, `template:145-147`); every
   seeded expense carries `currency: 'USD'` (`api-mock/server.js:234-237`, `:251-252`). No
   template renders it, no sum converts by it, and `formatCurrency` hardcodes the `'$'` symbol
   (`controller:266`). A line entered in EUR is added to the same total as one in USD and is
   displayed with a dollar sign.

   > **Target behaviour — settled by Q-9 of ADR-002.** Multi-currency is **not** real and is not
   > built: the migration is single-currency (USD) and the six-value selector is removed. No rate
   > source exists anywhere in the repository, so the selector is an affordance over a capability
   > that was never implemented. Removing it eliminates the cross-currency summation defect rather
   > than porting it. `currency` remains on the wire as a field, so this is **API-visible** for any
   > consumer that set a non-USD value
   > (`specs/adrs/adr-002-remaining-product-intent-decisions.md`).

4. **`totalAmount` is recomputed on update but not on create.** `POST` accepts a client-supplied
   `expenses` array and leaves `totalAmount` at whatever the body carries, or `0`
   (`api-mock/server.js:621-635`). Only `PUT` recomputes it from the array, and only when the
   array is non-empty (`api-mock/server.js:652-654`). Since `PUT` has no caller, no report ever
   has its total recomputed server-side in the running application.

5. **The create skeleton is overridden by the body.** `POST` builds a skeleton with `id`,
   `userId`, `status: 'draft'`, `submittedAt: null`, `submittedBy` and `totalAmount: 0`, then
   calls `Object.assign(skeleton, req.body)` with the body **second**
   (`api-mock/server.js:622-630`). The client always sends `submittedAt` and `submittedBy`
   (`controller:193-194`), so both server defaults are always replaced; a body carrying `id`,
   `userId` or `status` would replace those too.

6. **Every report created through the UI is stored as a draft** — this, with limitation 11, is
   **SEAM-4**. The server's default is
   `'draft'` (`api-mock/server.js:625`) and the client never sends a `status`
   (`_getEmptyReport`, `controller:280-290`). The submit action stamps `submittedAt` and
   `submittedBy` but leaves the status untouched, so a submitted report is indistinguishable from
   a saved draft — and remains deletable, because delete is offered for `draft`
   (`template:302`). No status ever becomes `approved`: the statistics handler counts that value
   (`api-mock/server.js:671`), no seed carries it, and the only route that could set it is the
   client-supplied `PUT` body, which has no caller (limitation 4).

   > **Target behaviour — SEAM-4 is a defect to fix in ADR-001**
   > (`specs/adrs/adr-001-product-intent-decisions.md`). The ADR records that this follows from
   > Q-3's persistence work and Q-4's vocabulary fix rather than from a question of its own: an
   > expense report must be able to reach a state the statistics handler is already counting. The
   > paragraph above remains the green-baseline description of today's behaviour; the change is made
   > in a later increment under a red-green cycle.

7. **A `null` `submittedAt` produces an invalid date and an unbounded comparison.** Seed report
   `exp-2` has `submittedAt: null` (`api-mock/server.js:247`). `service:20` formats it
   (`moment(null)` is invalid, so the table shows `Invalid date` at `template:295`), `service:23`
   diffs it, and the date-range filter compares it with `isSameOrAfter` / `isSameOrBefore`
   (`controller:110`, `:117`), which return `false` for an invalid moment — so setting either date
   bound removes that report from the list regardless of the bound chosen.

8. **The text search dereferences fields without a guard.** `applyFilters` calls
   `.toLowerCase()` on `report.title` and `report.tripDestination`
   (`controller:102-103`). Both seed records carry both fields
   (`api-mock/server.js:226-227`, `:243-244`), so the running application does not hit this;
   a report created without a `tripDestination` would, since the form does not require it
   (`template:93`).

9. **Receipt upload is captured but never sent.** `onReceiptSelected` stores the `File` on the
   line-item model (`controller:254-255`) and `angular.copy` carries it into the pushed entry
   (`controller:162`). `ExpenseService.uploadReceipt` (`service:82-90`) is never called from
   anywhere. `angular.copy` of a `File` produces a plain object rather than a `File`, and the
   whole report — including that object — is JSON-serialised by the `POST`. The server route
   (`api-mock/server.js:693-699`) registers no multipart parser, reads neither `req.body` nor
   `req.file`, and returns a `receiptUrl` for a file it never received. No handler reads a
   `receiptUrl` back, and the stored `Expense` shape has no receipt field.

10. **The statistics route is unreachable.** `GET /api/expense-reports/statistics`
    (`api-mock/server.js:668`) is registered **after** `GET /api/expense-reports/:id`
    (`api-mock/server.js:636`). Express matches in registration order, so the literal path is
    captured by the parameterised route, which finds no report with id `statistics` and responds
    `404 { error: 'Expense report not found' }` (`api-mock/server.js:638-640`). Because
    `getStatistics` has no caller, the failure is not observable in the running application.

11. **Two statistics values are literals.** Inside the (unreachable) handler,
    `totalExpenses`, `reportCount`, `pendingCount` and `approvedCount` are computed from the
    array (`api-mock/server.js:669-671`), but `categoryBreakdown` and `monthlyTotals` are an
    object literal and an array literal (`api-mock/server.js:678-689`). They would not change if
    the underlying data changed.

12. **Line-item ids are generated client-side and are not unique across reports.**
    `_.uniqueId('exp_')` (`controller:163`) produces `exp_1`, `exp_2`, … from a counter that
    resets on every page load. The seeded expenses use a different scheme entirely
    (`e-1` … `e-6`, `api-mock/server.js:234-237`, `:251-252`). The id is used as the `track by`
    key in the builder table (`template:179`); the detail modal tracks by `$index` instead
    (`template:362`).

13. **The dashboard is not recomputed after every mutation that changes it.**
    `calculateDashboard` is called on load (`controller:82`) and after a delete
    (`controller:238`). It is not called after a submit — but a submit triggers
    `loadReports()` (`controller:206`), which calls it. There is no path that leaves the dashboard
    stale; the coupling is implicit rather than declared.

14. **`gtCurrencyInput` and `usdCurrency` are declared and never used.** The directive registers
    with `restrict: 'A'` (`currency-input.directive.js:13-15`) and its attribute appears in zero
    templates; the filter is applied in zero templates. The B2b source table names both files as
    sources for this FRD; they are recorded here as not-involved rather than described as shared
    components. The module formats currency two other ways instead — `$filter('currency')`
    (`controller:266`) and `'$' +` string concatenation (`service:21`, `:38`).

15. **`travelRequestId` is captured but never validated or resolved** — this is **SEAM-5**. The form
    offers a free-text
    input (`template:100`); `_getEmptyReport` defaults it to `''` (`controller:284`). No code
    checks that the id refers to an existing travel request, no template resolves it to a
    destination, and both seed reports carry `travelRequestId: null`
    (`api-mock/server.js:228`, `:245`).

    > **Target behaviour — settled by Q-5 of ADR-001**
    > (`specs/adrs/adr-001-product-intent-decisions.md`). The link is **optional**: populate
    > `travelRequestId` when a linked request exists. SEAM-5 is therefore a **defect to fix,
    > non-blocking** — the field stays nullable and `ExpenseService.linkToTravelRequest`
    > (`service:107`) acquires a caller. The paragraph above remains the green-baseline description
    > of today's behaviour.

16. **`daysSinceSubmission` is computed and never rendered.** The service adds it on every list
    load (`service:23`); it appears in no template binding.

17. **The report-range datepickers write a string, the expense datepicker writes a `Date`.**
    `#expenseDate` has an `onSelect` that assigns `new Date(dateText)` (`controller:64`);
    `#reportStartDate, #reportEndDate` are bound in a single call with no `onSelect`
    (`controller:68-70`), so their values reach `dateRange` as the raw `mm/dd/yy` strings typed or
    written by the widget (`template:265`, `:268`). `moment('05/01/24')` parses a non-ISO string
    without a format and emits a deprecation warning.

18. **The line-item error flash targets a class that the entry row does not carry.** The flash
    applies `has-error` to `.expense-required` (`controller:156`). No element in
    `expense.template.html` carries that class, so the three-second jQuery `delay`/`queue` chain
    runs against an empty set and no visual feedback appears; only the silent `return`
    (`controller:159`) is observable.

19. **No TODO, FIXME or HACK markers exist in this module.** Seven inline comments label patterns
    as "legacy" or "anti-pattern" (`controller:3`, `:14`, `:36`, `:56`, `:155`, `:222`, `:247`);
    they describe style, not defects.

### Integration Points

| Point | Mechanism | Other side |
|---|---|---|
| Authentication | `requireAuth` state data, `authMiddleware`, `$rootScope.currentUser` | F-001 (`frd-authentication.md`) |
| Login refresh | `$rootScope.$on('auth:login')` | F-001 |
| Notifications | `$rootScope.$broadcast('notification:add', message, level)` | Notification module (6 sites) |
| Travel request link | `travelRequestId` field, `linkToTravelRequest` (uncalled) | F-012 (`frd-travel-request.md`) |

---

## Traceability

| PRD feature | Priority | Covered by |
|---|---|---|
| F-015 Expense Report Lifecycle | P1 | US-F015-001 … US-F015-009; FR-F015-001 … FR-F015-016 |
| F-016 Receipt Upload | P3 | US-F016-001; FR-F016-001, FR-F016-002; Known Limitations 9 |
| F-017 Expense Statistics | P3 | FR-F017-001; Known Limitations 10, 11 |

Resolved product decisions that bound this FRD: **Q-4** — the five lowercase server values are the
canonical category vocabulary, so the twelve Title Case client values are the side that diverges.
**Q-5** — `travelRequestId` is intended to be optional, populated when a linked request exists, so
**SEAM-5** (*the link is never populated*, Known Limitation 15) is a **defect to fix,
non-blocking**. **Q-7** — every collection is to be scoped to the authenticated user, with no
role-based access. **SEAM-4** (*`approved` is counted but never written*, Known Limitations 6 and
11) is a **defect to fix** that the ADR derives from Q-3's persistence work and Q-4's vocabulary fix
rather than from a question of its own
(`specs/adrs/adr-001-product-intent-decisions.md`). **Q-9** — multi-currency is not real; the
migration is single-currency (USD) and the six-value selector is removed (Known Limitation 3).
**Q-10** — the unreferenced registrations this FRD lists as dead (`gtCurrencyInput`, `usdCurrency`,
`gtDatePicker`, `ApiService`) are **dead code and are not ported**, with one exception:
`ExpenseService.linkToTravelRequest` acquires a caller under Q-5 and **must** be ported. **Q-11** —
the existing Jasmine suite is **stale and carries no authority**; this module has no tests of its
own, so its Track A baseline is authored entirely from observed behaviour
(`specs/adrs/adr-002-remaining-product-intent-decisions.md`).

---

> **Track B sections omitted deliberately.** `brownfield.testability` is still `null` in
> `.spec2cloud/state.json`; the testability gate has not run. Manual verification checklists and
> `@documentation-only` scenarios are added only if the gate selects Track B or Hybrid for this
> feature.
