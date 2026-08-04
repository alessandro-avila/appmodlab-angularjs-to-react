# FRD: Travel Request

**Feature ID**: F-012 (primary) · also covers F-013, F-014
**Status**: Draft
**Priority**: P1
**Last Updated**: 2026-08-04
**Source of truth**: `app/components/travel-request/*`, `app/app.routes.js`, `specs/contracts/api/travel-request.yaml`

> **Phase note.** This is a B2b brownfield FRD. It documents what the code **does today**,
> read directly from source. Behaviour that is surprising is recorded under *Known Limitations*
> in neutral, falsifiable terms; deciding what to do about any of it belongs to Phase A.

---

## Description

Travel Request is the module an employee uses to ask for permission to travel before anything is
booked. It is one of the five UI-Router feature states (`'travelRequest'`, URL `/travel-request`,
`app/app.routes.js:50-55`) and requires authentication (`data: { requireAuth: true }`,
`app/app.routes.js:54`).

The module is a single screen carrying three surfaces at once: a create/edit form, a four-tile
status summary, and a filterable table of the requests already submitted. All three read the same
`$scope.requests` array, which is loaded from `GET /api/travel-requests` when the controller is
constructed (`controller:308`) and re-loaded after every successful submit (`controller:188`) and
after an `auth:login` event (`controller:299-301`).

A request captures a destination, a departure and return date, a purpose, a department, a free-text
business justification, a five-line cost estimate (flights, hotels, meals, transport, other), a
travellers list, and two boolean flags for visa and travel insurance. Two derived values are
maintained live by `$watch` while the form is open: `totalEstimate`, the Lodash sum of the five cost
lines, and `tripDuration`, the Moment.js day difference between the two dates.

Submission is client-validated in six ordered checks (`controller:198-228`) and then sent as either
a `POST` (create) or a `PUT` (edit). The client stamps `travelerName` and `travelerEmail` onto the
payload from `$rootScope.currentUser` before sending. The server responds by wrapping the body in a
skeleton that assigns an id, a `userId` from the JWT, a `pending` status, a `createdAt`, and a
single-entry approval chain.

Cancellation (F-012) is a `PUT` that sets `status: 'cancelled'`; the record is not deleted. Approval
(F-013) exists as data only — the chain is created, it can be read back, and it is never advanced by
any code path. Travel policy (F-014) is published by one endpoint that nothing in the client calls.

The module has no outbound `$rootScope` broadcasts other than notifications, and no other module
listens for anything it emits. It is the only feature module that does **not** participate in the
`itinerary:refresh` seam.

---

## User Stories

### US-F012-001: See my travel requests on arrival

**AS A** GlobalTravel employee
**I WANT** the travel request screen to already show my requests when I open it
**SO THAT** I can see what is outstanding without taking an action first

**GIVEN** I am authenticated and navigate to `/travel-request`
**WHEN** the controller is constructed
**THEN** `GET /api/travel-requests` is issued (`controller:309` → `service:18`)
**AND** each returned request is decorated with formatted dates, a duration, a formatted total and a
countdown (`service:20-25`)
**AND** the table is sorted with the most recently created request first (`controller:127`)

### US-F012-002: Open a form and enter a request

**AS A** GlobalTravel employee
**I WANT** a form that opens on demand rather than always occupying the screen
**SO THAT** the list stays readable when I am not filing anything

**GIVEN** the travel request screen is showing
**WHEN** I press "New Request" (`template:7`)
**THEN** `showForm` is toggled, `editMode` is cleared and the model is reset to an empty request
(`controller:132-134`)
**AND** the form panel is revealed with a jQuery slide-down (`controller:139`)
**AND** both date fields are bound to jQuery UI datepickers (`controller:72-90`)

### US-F012-003: See the cost estimate total as I type

**AS A** GlobalTravel employee
**I WANT** the five cost lines to add up as I enter them
**SO THAT** I can see the total I am asking for before I submit

**GIVEN** the form is open
**WHEN** I change any of flights, hotels, meals, transport or other
**THEN** a deep `$watch` recomputes `totalEstimate` as the Lodash sum of the five parsed values
(`controller:38-48`)
**AND** the total is rendered to two decimals (`template:162`)

### US-F012-004: See the trip length as I pick dates

**AS A** GlobalTravel employee
**I WANT** the number of days to appear once I have both dates
**SO THAT** I can sanity-check the trip length

**GIVEN** the form is open
**WHEN** I set a departure date and a return date
**THEN** `tripDuration` is set to the Moment.js `diff` in days between them
(`controller:50-55`, `controller:57-62`)
**AND** a badge showing the day count appears only while `tripDuration > 0` (`template:78-80`)

### US-F012-005: Submit a new request

**AS A** GlobalTravel employee
**I WANT** to submit the completed form
**SO THAT** my trip can be approved

**GIVEN** the form passes all six validation checks
**WHEN** I press "Submit Request"
**THEN** both dates are reformatted to `YYYY-MM-DD`, a `submittedAt` ISO timestamp is added, and
traveller name and email are copied from `$rootScope.currentUser` (`controller:169-173`)
**AND** the payload is sent to `POST /api/travel-requests` (`service:46`)
**AND** a success notification is broadcast, the form closes, and the list is re-loaded
(`controller:184-188`)

### US-F012-006: Correct a request I have already sent

**AS A** GlobalTravel employee
**I WANT** to edit a request that has not yet been decided
**SO THAT** I can fix a date or a cost without filing a second one

**GIVEN** a request whose status is `pending`
**WHEN** I press its edit button (`template:290-291`)
**THEN** the form opens in edit mode pre-filled with a copy of that request (`controller:147-149`)
**AND** the page scrolls to the form with a jQuery animation (`controller:153-159`)
**AND** submitting sends `PUT /api/travel-requests/{id}` instead of a `POST` (`controller:177`)

### US-F012-007: Cancel a request

**AS A** GlobalTravel employee
**I WANT** to withdraw a request I no longer need
**SO THAT** it stops appearing as outstanding

**GIVEN** a request whose status is `pending`
**WHEN** I press its cancel button and confirm the native dialog (`controller:232`)
**THEN** `PUT /api/travel-requests/{id}` is sent with `{ status: 'cancelled' }` (`service:65`)
**AND** the in-memory request object has its status changed to `cancelled` (`controller:235`)
**AND** a `warning` notification is broadcast (`controller:236`)

### US-F012-008: Narrow the list

**AS A** GlobalTravel employee
**I WANT** to filter by status and search by text
**SO THAT** I can find one request among many

**GIVEN** the list is populated
**WHEN** I press a status button or type in the search box
**THEN** a `$watchGroup` on `searchQuery` and `filterStatus` re-runs the filter
(`controller:65-67`)
**AND** the search matches destination, purpose or traveller name, case-insensitively
(`controller:119-123`)

### US-F012-009: Read a request in full

**AS A** GlobalTravel employee
**I WANT** to open a request and see everything it contains
**SO THAT** I can check the justification and the cost breakdown

**GIVEN** a request row in the table
**WHEN** I press its view button
**THEN** the request is assigned to `selectedRequest` and a Bootstrap modal is opened through
jQuery (`controller:243-247`)
**AND** the modal renders the traveller, department, purpose, dates, duration, status, totals, visa
and insurance flags, justification and a five-line cost breakdown (`template:330-364`)

### US-F013-001: See the approval chain exists

**AS A** GlobalTravel employee
**I WANT** my request to be routed to an approver
**SO THAT** somebody can decide on it

**GIVEN** I submit a new request
**WHEN** the server creates it
**THEN** it is stored with one approval entry — approver `Mike Chen`, role `Manager`, status
`pending`, date `null` (`api-mock/server.js:566-568`)
**AND** `GET /api/travel-requests/{id}/approvals` will return that entry
(`api-mock/server.js:601-607`)

> The chain is created and readable. No code path advances it, and no UI in this module displays
> it. See *Known Limitations* 2, 3 and 4.

---

## Functional Requirements

### FR-F012-001: Initialise state and load on entry

- **Input**: controller construction.
- **Processing**: initialise `requests`, `filteredRequests`, `isLoading`, `errorMessage`,
  `showForm`, `editMode`, `selectedRequest`, `filterStatus` (`'all'`), `searchQuery`
  (`controller:15-23`); set `newRequest` from `_getEmptyRequest()` (`controller:25`); define the
  eight-entry `departments` list (`controller:27-30`) and the seven-entry `travelPurposes` list
  (`controller:32-35`); call `loadRequests()` (`controller:308`).
- **Output**: a populated table and status tiles.
- **Error handling**: on rejection set `errorMessage` to `'Failed to load travel requests.'` and
  broadcast an `error` notification (`controller:101-103`); `isLoading` is cleared in `finally`
  (`controller:104-106`).

### FR-F012-002: Decorate each request for display

- **Input**: the raw array from `GET /api/travel-requests`.
- **Processing**: `_.map` over the list adding `departFormatted` and `returnFormatted`
  (`MMM D, YYYY`), `createdFormatted` (`MMM D, YYYY h:mm A`), `tripDuration` (Moment `diff` in
  days), `totalFormatted` (`'$'` concatenated with `toFixed(2)` of `totalEstimate` or `0`), and
  `daysUntilTravel` (Moment `diff` from now in days) (`service:19-27`).
- **Output**: decorated request objects mutated in place.
- **Error handling**: none; the promise is returned to the caller.

### FR-F012-003: Maintain the cost estimate total

- **Input**: any change under `newRequest.estimatedCosts`.
- **Processing**: a deep `$watch` (third argument `true`, `controller:48`) sums the five lines with
  `_.sum`, coercing each with `parseFloat` and defaulting to `0` (`controller:40-47`).
- **Output**: `newRequest.totalEstimate`.
- **Error handling**: none; non-numeric input contributes `0`.

### FR-F012-004: Maintain the trip duration

- **Input**: a change to `newRequest.departDate` or `newRequest.returnDate`.
- **Processing**: each watch checks that the *other* date is already set, then assigns
  `tripDuration` as `moment(return).diff(moment(depart), 'days')` (`controller:50-62`).
- **Output**: `newRequest.tripDuration`.
- **Error handling**: none; when only one date is set the watch body does not run.

### FR-F012-005: Filter and sort the list

- **Input**: `requests`, `filterStatus`, `searchQuery`.
- **Processing**: shallow-copy with `_.clone` (`controller:111`); if `filterStatus` is not `'all'`
  narrow by exact status match (`controller:113-115`); if a search query is present narrow by
  case-insensitive substring against `destination`, `purpose` or `travelerName`
  (`controller:117-124`); order by `createdAt` descending (`controller:127`).
- **Output**: `filteredRequests`.
- **Error handling**: none. `req.destination`, `req.purpose` and `req.travelerName` are dereferenced
  without a guard.

### FR-F012-006: Toggle and reset the form

- **Input**: the New Request / Cancel button.
- **Processing**: invert `showForm`, clear `editMode`, reset `newRequest` (`controller:132-134`);
  when opening, defer a jQuery `hide().slideDown(300)` on `#travel-request-form` and re-initialise
  the datepickers (`controller:137-141`).
- **Output**: form visible or hidden.
- **Error handling**: none.

### FR-F012-007: Load a request into the form for editing

- **Input**: a request object from the table.
- **Processing**: set `editMode` and `showForm`; `angular.copy` the request into `newRequest`;
  convert both dates back to `Date` objects with Moment (`controller:147-151`); defer a scroll
  animation to the form's offset and re-initialise the datepickers (`controller:153-159`).
- **Output**: a pre-filled form.
- **Error handling**: the scroll is guarded by `$form.length` (`controller:155`).

### FR-F012-008: Initialise the date pickers

- **Input**: an explicit call from form toggle or edit.
- **Processing**: inside a `$timeout`, bind jQuery UI datepickers to `#trDepartDate`
  (`minDate: 0`) and `#trReturnDate` (`minDate: 1`), both with `dateFormat: 'mm/dd/yy'`, each
  `onSelect` handler wrapping the model write in `$scope.$apply` (`controller:70-91`).
- **Output**: two date inputs backed by a calendar widget.
- **Error handling**: none; no check that the elements exist or that `datepicker` is defined.

### FR-F012-009: Validate before submit

- **Input**: `newRequest`.
- **Processing**: six ordered checks, each returning `false` on the first failure and setting
  `errorMessage` (`controller:198-228`) — destination present (and, on failure only, add
  `has-error` to `#destinationField` via jQuery, `controller:204`); both dates present; return not
  before departure; purpose present; department present; `totalEstimate > 0`.
- **Output**: boolean.
- **Error handling**: this **is** the error handling; the server performs no validation.

### FR-F012-010: Submit a create or an update

- **Input**: a validated `newRequest`.
- **Processing**: `angular.copy` the model; reformat both dates to `YYYY-MM-DD`; add
  `submittedAt` as an ISO timestamp; set `travelerName` and `travelerEmail` from
  `$rootScope.currentUser`, falling back to `'Demo User'` / `'demo@globaltravel.com'`
  (`controller:168-173`); dispatch to `updateRequest` when `editMode`, otherwise `submitRequest`
  (`controller:175-180`).
- **Output**: a created or updated request.
- **Error handling**: on rejection set `errorMessage` to
  `'Failed to submit request. Please try again.'` and broadcast an `error` notification
  (`controller:189-191`); `isLoading` cleared in `finally` (`controller:192-194`).

### FR-F012-011: Cancel a request

- **Input**: a request object.
- **Processing**: native `confirm()` gate (`controller:232`); on confirmation call
  `cancelRequest(id)`, which sends `PUT` with a body of `{ status: 'cancelled' }` (`service:65`);
  on success mutate the local object's status and broadcast a `warning` notification
  (`controller:234-236`).
- **Output**: a request marked cancelled on both sides.
- **Error handling**: on rejection broadcast `'Failed to cancel request'` as `error`
  (`controller:237-239`).

### FR-F012-012: Present a request in a modal

- **Input**: a request object.
- **Processing**: assign to `selectedRequest`, then call jQuery `.modal('show')` on
  `#requestDetailModal` (`controller:243-247`).
- **Output**: an open Bootstrap 3 modal.
- **Error handling**: none; the call assumes Bootstrap's jQuery plugin is loaded.

### FR-F012-013: Provide presentation helpers

- **Input**: a date or a status string.
- **Processing**: `formatDate` returns Moment `MMM D, YYYY` (`controller:250-252`);
  `getStatusClass` maps `approved`→`label-success`, `pending`→`label-warning`,
  `rejected`→`label-danger`, `cancelled`→`label-default`, default `label-info`
  (`controller:254-262`); `getStatusCounts` returns totals for all, pending, approved and rejected
  (`controller:264-271`).
- **Output**: strings and a counts object.
- **Error handling**: none.

### FR-F013-001: Approval chain (created and readable, never advanced)

- **Input**: a create request.
- **Processing**: the server literal
  `{ approver: 'Mike Chen', role: 'Manager', status: 'pending', date: null }` is attached to every
  new request (`api-mock/server.js:566-568`). `GET /api/travel-requests/{id}/approvals` returns
  `request.approvals || []` (`api-mock/server.js:601-607`). The client method
  `getApprovalHistory` formats each entry's date with Moment (`service:73-80`).
- **Output**: a one-entry chain per created request.
- **Error handling**: `404` when the request id is unknown (`api-mock/server.js:603-605`).

> `getApprovalHistory` has no caller anywhere under `app/`, and no template in this module renders
> `approvals`. See *Known Limitations* 3.

### FR-F014-001: Travel policy (published, never applied)

- **Input**: `GET /api/travel-policy`.
- **Processing**: the handler returns the `travelPolicy` object verbatim
  (`api-mock/server.js:609-611`). The object declares `maxFlightCost`, `maxHotelPerNight`,
  `maxMealPerDay`, `maxTripDuration`, a `requiresApproval` threshold trio, `allowedCabinClasses`,
  `advanceBookingDays`, preferred airlines and preferred hotels
  (`api-mock/server.js:257-267`). The client method `getPolicyLimits` fetches it
  (`service:86-88`).
- **Output**: the policy document.
- **Error handling**: none; the route is unconditional behind auth.

> `getPolicyLimits` has no caller, and no handler compares a request against any of these values.
> See *Known Limitations* 4.

---

## Non-Functional Requirements

### NFR-F012-001: Authentication is required for every endpoint in this module

All seven `/api/travel-request*` and `/api/travel-policy` handlers are registered with
`authMiddleware` (`api-mock/server.js:556`, `:560`, `:575`, `:583`, `:592`, `:601`, `:609`), and
the UI-Router state carries `requireAuth: true` (`app/app.routes.js:54`).

### NFR-F012-002: Authorisation is not evaluated

No handler in this module reads `req.user.role`, although the JWT carries one
(`api-mock/server.js:284`). Every authenticated caller can read, modify or delete every request,
regardless of owner (`specs/contracts/api/travel-request.yaml §x-discrepancies/no-authorization-check`).

### NFR-F012-003: Validation is client-side only

The six checks in `validateRequest` (`controller:198-228`) are the only validation in the feature.
`POST` and `PUT` accept any body shape (`api-mock/server.js:560-590`).

### NFR-F012-004: Server state is in-process and mutable

`travelRequests` is a module-level array seeded with two records (`api-mock/server.js:176-219`).
Creates push onto it, updates mutate the stored object, deletes splice it. Restarting the mock API
restores the seed.

### NFR-F012-005: The status tiles recompute on every digest

`getStatusCounts()` is invoked from four separate template bindings (`template:198`, `:206`,
`:214`, `:222`). Each invocation builds a new object and runs three `_.filter` passes over
`$scope.requests`, so a single digest performs twelve filter passes.

### NFR-F012-006: Presentation is coupled to the DOM

Seven jQuery call sites manipulate elements by id or tag directly (`controller:72`, `:81`, `:139`,
`:154`, `:156`, `:204`, `:246`). Three of them depend on third-party plugins — jQuery UI
`datepicker` and Bootstrap `modal`.

---

## Dependencies

| Depends on | Why | Evidence |
|---|---|---|
| F-001 Authentication | The state is `requireAuth`, all endpoints are behind `authMiddleware`, and `travelerName` / `travelerEmail` are read from `$rootScope.currentUser` | `app/app.routes.js:54`; `api-mock/server.js:556`; `controller:172-173` |
| `auth:login` event | Triggers a list reload without a state change | `controller:299-301` |
| `notification:add` event | The module's only outbound broadcast; consumed by the notification module | `controller:103`, `:184`, `:191`, `:236`, `:238` |
| Restangular | Every call in `service` is a Restangular builder | `service:11`, `:37`, `:46`, `:56`, `:65`, `:74`, `:87` |
| Moment.js | Duration maths, payload date formatting, display formatting | `controller:52-53`, `:59-60`, `:150-151`, `:169-171`, `:211`, `:251`; `service:20-25`, `:76` |
| Lodash | Sum, clone, filter, order, map | `controller:40`, `:111`, `:114`, `:119`, `:127`, `:267-269`; `service:19`, `:75` |
| jQuery + jQuery UI | Datepickers, slide/scroll animation, error class | `controller:72`, `:81`, `:139`, `:154`, `:156`, `:204` |
| Bootstrap 3 JS | The detail modal is opened imperatively | `controller:246`; `template:321` |
| `travelPolicy` fixture | F-014's only data source | `api-mock/server.js:257-267` |

**Nothing depends on this module.** It emits no feature-specific events, and no other controller or
service references `TravelRequestService`.

---

## Current Implementation (Brownfield Extension)

### Files Involved

| File | Lines | Role |
|---|---|---|
| `app/components/travel-request/travel-request.controller.js` | 311 | All view logic: state, four watches, validation, submit dispatch, jQuery effects |
| `app/components/travel-request/travel-request.service.js` | 90 | Seven Restangular methods; Moment/Lodash decoration on list and approvals |
| `app/components/travel-request/travel-request.template.html` | 372 | Form, status tiles, filters, table, detail modal |
| `app/app.routes.js` | 50-55 | `'travelRequest'` state registration |
| `api-mock/server.js` | 176-219, 257-267, 556-611 | Seed records, policy fixture, seven handlers |
| `specs/contracts/api/travel-request.yaml` | — | Extracted contract and its six recorded discrepancies |

#### Not involved, despite proximity

- **`app/directives/approval-status.directive.js`** (130 lines) declares `gtApprovalStatus` with
  `restrict: 'E'` (`approval-status.directive.js:13-15`). The element `<gt-approval-status>`
  appears in **zero** templates in the application. This module renders status badges inline
  instead, using `getStatusClass` and a Bootstrap `label` class (`template:283`, `:340`).
  **This contradicts the B2b source table**, which lists the directive as a source for this FRD —
  see *Known Limitations* 5.
- **`app/directives/date-picker.directive.js`** declares `gtDatePicker`; this module initialises
  jQuery UI datepickers directly instead (`controller:72-90`).
- **`app/services/api.service.js`** (`ApiService`) is injected nowhere; this module uses
  Restangular.
- **`app/filters/currency.filter.js`** (`usdCurrency`) is used in no template; this module formats
  currency two other ways — string concatenation in the service (`service:24`) and the built-in
  `number:2` filter in the template (`template:162`, `:356-360`).

### Architecture Pattern

The classic AngularJS 1.x controller-plus-service split, with the controller owning both view state
and DOM effects:

```
travel-request.template.html
        │  ng-click / ng-model / {{ }}
        ▼
TravelRequestController  ── $rootScope.$broadcast('notification:add', …)
        │  4 × $watch, 7 × jQuery
        ▼
TravelRequestService  ── Restangular ──▶  /api/travel-requests*
                                          /api/travel-policy
```

Both files use the IIFE + `'use strict'` + array-annotated DI wrapper used everywhere in this
codebase (`controller:6-12`, `service:5-9`).

### Scope shape

| Property | Initial value | Written by | Read by |
|---|---|---|---|
| `requests` | `[]` (`:15`) | `loadRequests` (`:99`) | `applyFilters` (`:111`), `getStatusCounts` (`:266-269`) |
| `filteredRequests` | `[]` (`:16`) | `applyFilters` (`:127`) | `template:277` |
| `isLoading` | `false` (`:17`) | `:95`, `:105`, `:166`, `:193` | `template:315`, `:182` |
| `errorMessage` | `''` (`:18`) | `:96`, `:102`, `:190`, `:199-226` | `template:16` |
| `showForm` | `false` (`:19`) | `:132`, `:148`, `:185` | `template:8`, `:9`, `:22` |
| `editMode` | `false` (`:20`) | `:133`, `:147`, `:186` | `template:25`, `:184` |
| `selectedRequest` | `null` (`:21`) | `viewRequest` (`:244`) | `template:331-364` |
| `filterStatus` | `'all'` (`:22`) | `template:233-247` | `applyFilters` (`:113-115`) |
| `searchQuery` | `''` (`:23`) | `template:255` | `applyFilters` (`:117-124`) |
| `newRequest` | `_getEmptyRequest()` (`:25`) | `:134`, `:149`, `:187`, watches | the whole form |
| `departments` | 8-item literal (`:27-30`) | never | `template:54` |
| `travelPurposes` | 7-item literal (`:32-35`) | never | `template:45` |

`_getEmptyRequest()` (`controller:274-296`) returns fifteen keys, including a `travelers` array
seeded with one blank `{ name: '', email: '' }` entry (`controller:291`) and
`needsInsurance: true` as the only non-empty default (`controller:293`).

### Watches

| Watch | Expression | Deep? | Body |
|---|---|---|---|
| `:38-48` | `newRequest.estimatedCosts` | **yes** (`:48`) | `_.sum` of five `parseFloat` values into `totalEstimate` |
| `:50-55` | `newRequest.departDate` | no | sets `tripDuration` if `returnDate` is set |
| `:57-62` | `newRequest.returnDate` | no | sets `tripDuration` if `departDate` is set |
| `:65-67` | `$watchGroup(['searchQuery', 'filterStatus'])` | no | calls `applyFilters()` |

All four are registered unconditionally at construction and are never deregistered; they are
destroyed with the scope.

### `$rootScope` events

| Direction | Event | Site | Payload |
|---|---|---|---|
| out | `notification:add` | `:103` | `'Failed to load requests'`, `'error'` |
| out | `notification:add` | `:184` | `'Travel request submitted successfully!'` or `'Travel request updated successfully!'`, `'success'` |
| out | `notification:add` | `:191` | `'Request submission failed'`, `'error'` |
| out | `notification:add` | `:236` | `'Travel request cancelled'`, `'warning'` |
| out | `notification:add` | `:238` | `'Failed to cancel request'`, `'error'` |
| in | `auth:login` | `:299-301` | ignored; triggers `loadRequests()` |

The `auth:login` listener is registered on `$rootScope` and therefore survives scope destruction; it
is explicitly deregistered on `$destroy` (`controller:303-305`). This is the same
register-and-deregister pattern used by the itinerary module.

This module neither emits nor listens for `itinerary:refresh`.

### jQuery selectors and effects

| Site | Selector | Operation |
|---|---|---|
| `:72` | `#trDepartDate` | jQuery UI `.datepicker({ minDate: 0, dateFormat: 'mm/dd/yy' })` |
| `:81` | `#trReturnDate` | jQuery UI `.datepicker({ minDate: 1, dateFormat: 'mm/dd/yy' })` |
| `:139` | `#travel-request-form` | `.hide().slideDown(300)` |
| `:154` | `#travel-request-form` | read `.length` and `.offset().top` |
| `:156` | `html, body` | `.animate({ scrollTop: … }, 400)` |
| `:204` | `#destinationField` | `.addClass('has-error')` |
| `:246` | `#requestDetailModal` | Bootstrap `.modal('show')` |

Both datepicker `onSelect` handlers write to the model inside `$scope.$apply`
(`controller:76-78`, `:85-87`), because they fire outside the AngularJS digest.

### Moment.js call sites — and whether a parse format is supplied

| Site | Call | Parse format supplied? |
|---|---|---|
| `controller:52-53` | `moment(returnDate).diff(moment(newVal), 'days')` | no |
| `controller:59-60` | `moment(newVal).diff(moment(departDate), 'days')` | no |
| `controller:150` | `moment(request.departDate).toDate()` | no |
| `controller:151` | `moment(request.returnDate).toDate()` | no |
| `controller:169` | `moment(departDate).format('YYYY-MM-DD')` | no |
| `controller:170` | `moment(returnDate).format('YYYY-MM-DD')` | no |
| `controller:171` | `moment().toISOString()` | n/a (now) |
| `controller:211` | `moment(returnDate).isBefore(moment(departDate))` | no |
| `controller:251` | `moment(date).format('MMM D, YYYY')` | no |
| `service:20` | `moment(req.departDate).format('MMM D, YYYY')` | no |
| `service:21` | `moment(req.returnDate).format('MMM D, YYYY')` | no |
| `service:22` | `moment(req.createdAt).format('MMM D, YYYY h:mm A')` | no |
| `service:23` | `moment(req.returnDate).diff(moment(req.departDate), 'days')` | no |
| `service:25` | `moment(req.departDate).diff(moment(), 'days')` | no |
| `service:76` | `moment(a.date).format('MMM D, YYYY h:mm A')` | no |

Fourteen parse sites, **none** supplying an explicit format. The values fed in are of three
different kinds: JavaScript `Date` objects produced by the datepicker `onSelect`
(`controller:77`, `:86`), `YYYY-MM-DD` strings from the seed data
(`api-mock/server.js:180-181`), and ISO-8601 timestamps (`api-mock/server.js:191`). Moment emits a
deprecation warning for non-ISO string input parsed without a format.

### Lodash call sites

| Site | Call | Purpose |
|---|---|---|
| `controller:40` | `_.sum([...])` | total the five cost lines |
| `controller:111` | `_.clone(requests)` | shallow copy before filtering |
| `controller:114` | `_.filter(filtered, { status })` | status filter, exact match |
| `controller:119` | `_.filter(filtered, fn)` | text search |
| `controller:127` | `_.orderBy(filtered, ['createdAt'], ['desc'])` | newest first |
| `controller:267-269` | `_.filter(requests, { status })` × 3 | status tile counts |
| `service:19` | `_.map(requests, fn)` | decorate list |
| `service:75` | `_.map(approvals, fn)` | decorate approvals |

`_.clone` at `:111` is a **shallow** copy: `filteredRequests` holds the same object references as
`requests`, which is why the in-place status mutation at `controller:235` is visible in the table
without re-running `applyFilters`.

### API surface used

| Endpoint | Client method | Called from | Reached by the UI? |
|---|---|---|---|
| `GET /api/travel-requests` | `getRequests` (`service:17`) | `controller:98` | yes |
| `POST /api/travel-requests` | `submitRequest` (`service:45`) | `controller:179` | yes |
| `PUT /api/travel-requests/{id}` | `updateRequest` (`service:55`) | `controller:177` | yes |
| `PUT /api/travel-requests/{id}` | `cancelRequest` (`service:64`) | `controller:234` | yes |
| `GET /api/travel-requests/{id}` | `getRequest` (`service:36`) | — | **no caller** |
| `GET /api/travel-requests/{id}/approvals` | `getApprovalHistory` (`service:73`) | — | **no caller** |
| `GET /api/travel-policy` | `getPolicyLimits` (`service:86`) | — | **no caller** |
| `DELETE /api/travel-requests/{id}` | — | — | **no client method at all** |

Four of the seven client methods are reachable; three are dead. One server route has no client
counterpart.

### Fields the template reads that the seed data does not carry

| Field | Rendered at | Produced by |
|---|---|---|
| `travelerName` | `template:333`; search key at `controller:121` | only `controller:172`, on submit |
| `departFormatted`, `returnFormatted`, `createdFormatted`, `totalFormatted`, `tripDuration` | `template:280-284`, `:336-341` | `service:20-25`, on list load |

Seed records `tr-1` and `tr-2` carry a `travelers` array (`api-mock/server.js:187`, `:207-210`) but
no `travelerName` key. The decoration in `service:19-27` does not add one. Consequently the modal's
"Traveler" line renders empty for the two seed records, and the search-by-traveller branch
dereferences `undefined` for them — see *Known Limitations* 8.

### Test Coverage

**None.** There is no test file for this module anywhere in the repository, no test runner
configured, and no assertion of any behaviour described above
(`specs/docs/testing/coverage.md`). Every statement in this FRD was verified by reading source,
not by executing it.

### Known Limitations

Recorded as observed behaviour. No remedy is proposed here.

1. **A client-supplied body can override every server-assigned field.** `POST` builds a skeleton
   containing `id`, `userId`, `status`, `createdAt` and `approvals`, then calls
   `Object.assign(skeleton, req.body)` with the body **second**
   (`api-mock/server.js:561-569`). A body carrying any of those keys replaces the server's value.
   `PUT` assigns the raw body straight onto the stored record (`api-mock/server.js:588`). The
   client's own edit payload is an `angular.copy` of a decorated request
   (`controller:168`), so it includes `id`, `status`, `createdAt`, `approvals` and the six
   client-added display fields, all of which are written back to the store.

2. **The approval chain is a hardcoded literal with one entry.** Every created request receives
   exactly `{ approver: 'Mike Chen', role: 'Manager', status: 'pending', date: null }`
   (`api-mock/server.js:566-568`), regardless of department, cost or traveller. No endpoint exists
   to approve or reject; the only way a status changes is the generic `PUT`.

3. **The approval history is never displayed.** `getApprovalHistory` (`service:73-80`) has no
   caller under `app/`, and `approvals` appears in no template in this module. The detail modal
   (`template:321-370`) shows status but not the chain.

4. **Travel policy is published and never applied.** `getPolicyLimits` (`service:86-88`) has no
   caller. No handler compares a request's `estimatedCosts`, `tripDuration` or dates against
   `maxFlightCost`, `maxHotelPerNight`, `maxMealPerDay`, `maxTripDuration`, `requiresApproval` or
   `advanceBookingDays` (`api-mock/server.js:257-267`). The `requiresApproval` thresholds
   (`flights: 500`, `hotels: 250`, `total: 1000`) are read by nothing, and the approval chain is
   attached unconditionally rather than when a threshold is crossed.

5. **`gtApprovalStatus` is declared and never used.** The directive registers with
   `restrict: 'E'` (`approval-status.directive.js:13-15`), so it would activate on a
   `<gt-approval-status>` element. That element occurs in zero templates across the application.
   The B2b source table names this file as a source for this FRD; it is recorded here as
   not-involved rather than described as a shared component.

6. **Two seed approvals could not have been produced by any code path.** Record `tr-2` carries two
   completed approvals — a Manager and a VP, both `approved`, both dated
   (`api-mock/server.js:215-218`). The create handler only ever writes the single Manager entry,
   and no handler advances one. They are fixture data.

7. **No handler checks ownership or role.** `req.user.role` is present on the token
   (`api-mock/server.js:284`) and read by none of the seven handlers. `GET /api/travel-requests`
   returns the entire array without filtering by `req.user.id`
   (`api-mock/server.js:556-558`), so every authenticated user sees every user's requests.

8. **Search dereferences fields the seed records do not have.** The text filter reads
   `req.destination`, `req.purpose` and `req.travelerName` and calls `.toLowerCase()` on each
   (`controller:120-122`). Seed records carry no `travelerName`
   (`api-mock/server.js:176-195`, `:196-219`), so typing in the search box while seed records are
   present throws on the third dereference. The status filter is unaffected because it never
   touches those fields.

9. **Traveller identity is supplied by the client.** `travelerName` and `travelerEmail` are taken
   from `$rootScope.currentUser` and fall back to the literals `'Demo User'` and
   `'demo@globaltravel.com'` (`controller:172-173`). The server assigns `userId` from the JWT
   (`api-mock/server.js:563`) but does not derive or cross-check the name and email, and — per
   limitation 1 — a body-supplied `userId` would win.

10. **`submittedAt` is set but never read.** The client stamps it on every submit
    (`controller:171`); the server never reads it, no template renders it, and the table's
    "Submitted" column shows `createdFormatted`, derived from the server's `createdAt`
    (`template:284`).

11. **The cancelled status has no filter button and no counter.** The four filter buttons offer
    `all`, `pending`, `approved` and `rejected` (`template:233-247`) and the four tiles count the
    same set minus `cancelled` (`controller:266-269`). `getStatusClass` does map `cancelled` to
    `label-default` (`controller:259`), so a cancelled request renders correctly — but only under
    the "All" filter, and it is counted only in the `all` tile.

12. **A cancelled request stays in a filtered view until the filter changes.** `cancelRequest`
    mutates `request.status` in place (`controller:235`) and does not call `applyFilters()`.
    Because `_.clone` is shallow (`controller:111`), the badge updates immediately, but the row is
    not removed from a `pending`-filtered list until the next `searchQuery` or `filterStatus`
    change fires the `$watchGroup`.

13. **The error highlight is added and never removed.** `has-error` is applied to
    `#destinationField` when the destination is missing (`controller:204`). No code path removes
    the class — not the successful re-validation, not the form reset in `toggleForm`
    (`controller:132-134`), and not a successful submit.

14. **Duration is computed twice, by two different rules.** The controller watches compute
    `tripDuration` from the in-form values (`controller:52-53`, `:59-60`); the service recomputes
    it from the server's `departDate` and `returnDate` on every list load (`service:23`). The
    controller's value is discarded on reload. Both use the same Moment expression, so they agree
    only when the datepicker `Date` and the `YYYY-MM-DD` round-trip resolve to the same instant.

15. **A same-day trip passes validation and shows no duration.** The date check rejects only
    `isBefore` (`controller:211`), so departure equal to return is valid; `tripDuration` is then
    `0`, and the duration badge is hidden by `ng-if="newRequest.tripDuration > 0"`
    (`template:78`), while the table renders `0 days` (`template:281`).

16. **Editing sends display fields back to the server.** `angular.copy(request)`
    (`controller:149`) copies the six fields added by `service:20-25`
    (`departFormatted`, `returnFormatted`, `createdFormatted`, `tripDuration`, `totalFormatted`,
    `daysUntilTravel`) into `newRequest`; `submitRequest` copies `newRequest` again
    (`controller:168`) and `PUT` assigns all of it onto the stored record
    (`api-mock/server.js:588`). Those six fields then persist server-side and are recomputed over
    on the next load.

17. **`daysUntilTravel` is computed and never rendered.** The service adds it on every list load
    (`service:25`); it appears in no template binding in this module.

18. **Currency is formatted three ways in one feature.** The service concatenates a `$` with
    `toFixed(2)` (`service:24`); the form total uses `${{… | number:2}}` (`template:162`); the
    modal's cost breakdown uses the same `number:2` pattern per line (`template:356-360`) but its
    total row reuses `totalFormatted` (`template:361`). The `usdCurrency` filter that exists in the
    codebase is used by none of them.

19. **`DELETE /api/travel-requests/{id}` is unreachable.** The handler exists and splices the record
    out (`api-mock/server.js:592-599`); no client method calls it and none is defined. Cancellation
    is a status change, so no request is ever removed through the UI.

20. **Departments and purposes are client-side literals.** The eight departments
    (`controller:27-30`) and seven purposes (`controller:32-35`) exist only in the controller. The
    server accepts any string in either field, and the `travelPolicy` fixture defines neither list.

21. **The datepickers are re-bound on every form open.** `initDatepickers` is called from
    `toggleForm` (`controller:140`) and from `editRequest` (`controller:158`), each time invoking
    `.datepicker()` on the same two element ids inside a `$timeout`. The elements themselves are
    inside an `ng-if` (`template:22`), so each open produces new DOM.

22. **No TODO, FIXME or HACK markers exist in this module.** Seven inline comments label patterns as
    "legacy" or "anti-pattern" (`controller:3`, `:14`, `:37`, `:69`, `:137`, `:203`, `:245`); they
    describe style, not defects.

### Integration Points

| Point | Mechanism | Other side |
|---|---|---|
| Authentication | `requireAuth` state data, `authMiddleware`, `$rootScope.currentUser` | F-001 (`frd-authentication.md`) |
| Login refresh | `$rootScope.$on('auth:login')` | F-001 |
| Notifications | `$rootScope.$broadcast('notification:add', message, level)` | Notification module (5 sites) |
| Travel policy | `GET /api/travel-policy` | F-014; also referenced by no other module |

---

## Traceability

| PRD feature | Priority | Covered by |
|---|---|---|
| F-012 Travel Request Lifecycle | P1 | US-F012-001 … US-F012-009; FR-F012-001 … FR-F012-013 |
| F-013 Travel Request Approval | P3 | US-F013-001; FR-F013-001; Known Limitations 2, 3, 6 |
| F-014 Travel Policy | P3 | FR-F014-001; Known Limitations 4 |

Resolved product decisions that bound this FRD: **Q-1** — a manager is *not* an approver; the chain
is informational and F-013 stays P3. **Q-2** — travel policy is *display-only*; F-014 is a read-only
surface and no rules engine is in scope (`specs/adrs/adr-001-product-intent-decisions.md`).

---

> **Track B sections omitted deliberately.** `brownfield.testability` is still `null` in
> `.spec2cloud/state.json`; the testability gate has not run. Manual verification checklists and
> `@documentation-only` scenarios are added only if the gate selects Track B or Hybrid for this
> feature.
