# FRD: Trip Itinerary

**Feature ID**: F-009 (primary) · also covers F-010, F-011, F-019
**Status**: Draft
**Priority**: P1
**Last Updated**: 2026-08-04
**Source of truth**: `app/components/itinerary/*`, `app/app.routes.js`, `specs/contracts/api/itinerary.yaml`

> **Phase note.** This is a B2b brownfield FRD. It documents what the code **does today**,
> read directly from source. Behaviour that is surprising is recorded under *Known Limitations*
> in neutral, falsifiable terms; deciding what to do about any of it belongs to Phase A.

---

## Description

Itinerary is the module an employee uses to see the trips already booked for them and to work with
the individual items inside a trip. It is one of the five UI-Router feature states (`'itinerary'`,
URL `/itinerary`, `app/app.routes.js:44-49`) and requires authentication
(`data: { requireAuth: true }`, `app/app.routes.js:48`).

Unlike the search modules, this one loads on entry rather than on submit: the controller calls
`loadTrips()` as its last construction statement. Trips arrive from `GET /api/trips` with their
items already embedded, so the trip list needs no second call. Each trip is decorated client-side
with formatted dates, a day count, a countdown, and a **recomputed** status and total cost — both
of which overwrite values the server already sent.

Selecting a trip calls `GET /api/trips/{id}` and reshapes the flat item list into day groups:
items are grouped by calendar date with Lodash, each group is given a formatted heading and a day
number relative to the trip start, and items inside a group are ordered by time. The same data
renders through two view modes — a list and a timeline — switched by a scope flag and cross-faded
with jQuery. A status filter narrows the visible days.

Within a trip the user can annotate an item with a note and cancel an item. Both act on the item
object in place. A print action clones the rendered itinerary into a new window.

This module is the **sole consumer** of the `itinerary:refresh` event, which both the flight and
hotel modules broadcast after a booking.

Four service methods — create, update, delete and share a trip (F-019) — are implemented on both
tiers and have no caller.

---

## User Stories

### US-F009-001: See my trips on arrival

**As an** Employee (the traveller)
**I want to** see my trips as soon as I open the itinerary screen
**So that** I do not have to search for something already booked

**Acceptance Criteria:**
- GIVEN the itinerary state is entered WHEN the controller finishes constructing THEN `loadTrips()` runs without any user action
- GIVEN trips are returned WHEN they are processed THEN each carries `startFormatted`, `endFormatted`, `daysUntil`, `duration`, `status`, `itemCount` and `totalCost`
- GIVEN trips are processed WHEN the list is ordered THEN it ascends by `startDate`
- GIVEN at least one trip exists AND none is selected WHEN loading completes THEN the first trip is selected automatically
- GIVEN the request rejects WHEN the failure is handled THEN `errorMessage` is `Failed to load trips. Please try again.` and `notification:add` is broadcast with `Failed to load itinerary` / `error`
- GIVEN no trips are returned WHEN the list renders THEN an empty state offers links to the flights and hotels states

### US-F009-002: Open a trip and see it day by day

**As an** Employee
**I want to** open a trip and see its items organised by day
**So that** I can follow my schedule in order

**Acceptance Criteria:**
- GIVEN a trip in the list WHEN it is clicked THEN `GET /api/trips/{id}` is issued and the response becomes `itinerary`
- GIVEN trip details arrive WHEN they are reshaped THEN items are grouped by their calendar date
- GIVEN day groups are built WHEN each is described THEN it carries `date`, `dateFormatted`, `dayNumber` (days from trip start, plus one) and `items` ordered by `time`
- GIVEN day groups are built WHEN the collection is ordered THEN days ascend by date
- GIVEN the `#itinerary-details` element is present WHEN details arrive THEN the window scrolls to `offset().top - 20` over 400 ms
- GIVEN the request rejects WHEN the failure is handled THEN `errorMessage` is `Failed to load trip details.`

### US-F009-003: See what the trip costs by category

**As an** Employee
**I want to** see the trip broken down into flights, hotels and activities
**So that** I understand where the money goes

**Acceptance Criteria:**
- GIVEN a loaded itinerary WHEN totals are calculated THEN `totals` carries `flights`, `hotels`, `activities` and `transport`, each the sum of `cost` over items of that type
- GIVEN the four category totals WHEN the grand total is derived THEN `totals.total` is their sum
- GIVEN no itinerary or no items WHEN `calculateTotals()` is invoked THEN it returns without assigning

### US-F009-004: Switch between a list and a timeline

**As an** Employee
**I want to** switch between a list view and a timeline view
**So that** I can read the trip the way that suits me

**Acceptance Criteria:**
- GIVEN either view button is clicked WHEN `toggleView(mode)` runs THEN `viewMode` becomes that mode
- GIVEN the mode changed WHEN the next tick occurs THEN the matching container is hidden and faded in over 300 ms
- GIVEN `viewMode` is `list` THEN the list container renders; GIVEN it is `timeline` THEN the timeline container renders

### US-F009-005: Narrow the itinerary by item status

**As an** Employee
**I want to** show only the days containing items of a given status
**So that** I can concentrate on what is unconfirmed

**Acceptance Criteria:**
- GIVEN `filterStatus` is `all` WHEN days are filtered THEN `displayDays` is the full day list
- GIVEN `filterStatus` is a specific status WHEN days are filtered THEN `displayDays` keeps every day containing **at least one** item of that status
- GIVEN `filterStatus` changes WHEN the watcher fires AND an itinerary with days exists THEN the day list is recomputed

### US-F010-001: Annotate an itinerary item

**As an** Employee
**I want to** attach a note to an item
**So that** I can record something about that leg of the trip

**Acceptance Criteria:**
- GIVEN the note box is empty or whitespace WHEN the add button is pressed THEN nothing happens
- GIVEN note text is present WHEN the add button is pressed THEN `POST /api/itinerary-items/{id}/notes` is issued with `text` and `createdAt`
- GIVEN the call resolves WHEN the result is handled THEN a note is appended to the item carrying the text, a formatted timestamp and an author name
- GIVEN a current user exists on `$rootScope` WHEN the author is resolved THEN it is that user's name, otherwise the literal `You`
- GIVEN the call resolves WHEN it completes THEN the note box is cleared and `notification:add` is broadcast with `Note added` / `success`
- GIVEN the call rejects WHEN the failure is handled THEN `notification:add` is broadcast with `Failed to add note` / `error`

### US-F011-001: Cancel an itinerary item

**As an** Employee
**I want to** cancel a single item without cancelling the trip
**So that** I can drop one leg and keep the rest

**Acceptance Criteria:**
- GIVEN the cancel button is pressed WHEN the handler runs THEN a native browser confirmation is requested first
- GIVEN the confirmation is declined WHEN the handler runs THEN no request is issued
- GIVEN the confirmation is accepted WHEN the handler proceeds THEN `PUT /api/itinerary-items/{id}` is issued with `status: 'cancelled'`
- GIVEN the call resolves WHEN the result is handled THEN the item's status becomes `cancelled`, totals are recalculated, and `notification:add` is broadcast with the item type followed by ` cancelled` / `warning`
- GIVEN an item is already cancelled WHEN the row renders THEN the cancel button is hidden and the row is styled as danger

### US-F009-006: Print the itinerary

**As an** Employee
**I want to** print my itinerary
**So that** I can carry it with me

**Acceptance Criteria:**
- GIVEN the print button is pressed WHEN the handler runs THEN the rendered `#itinerary-details` subtree is cloned
- GIVEN the clone is made WHEN it is prepared THEN every `.btn` and every `.no-print` element is removed from it
- GIVEN the clone is prepared WHEN the window opens THEN a new blank window receives the clone's HTML inside a Bootstrap-styled document and the browser print dialog is invoked

### US-F009-007: Have the itinerary refresh after I book elsewhere

**As an** Employee
**I want to** see a newly booked flight or hotel without reloading the page
**So that** my itinerary stays current

**Acceptance Criteria:**
- GIVEN the itinerary controller is alive WHEN `itinerary:refresh` is broadcast THEN `loadTrips()` runs
- GIVEN the controller scope is destroyed WHEN `$destroy` fires THEN the `itinerary:refresh` listener is deregistered

---

## Functional Requirements

### FR-F009-001: Initialise itinerary state and load on entry

The system SHALL establish scope state and immediately request the trip list.

- **Input**: none (controller construction)
- **Processing**: assigns `itinerary`, `trips`, `selectedTrip`, `isLoading`, `errorMessage`, `viewMode` (`'list'`), `filterStatus` (`'all'`), `newNote`, `editingItem`; registers the `filterStatus` watcher and the `itinerary:refresh` listener; calls `loadTrips()` as the final statement
- **Output**: a populated `$scope` and an in-flight `GET /api/trips`
- **Error handling**: handled by the load path, below

### FR-F009-002: Decorate each trip for display

The system SHALL derive presentation values for every returned trip.

- **Input**: the trip array from `GET /api/trips`
- **Processing**: in the service, assigns `itemCount` (item array length, or 0) and `totalCost` (sum of item `cost`). In the controller, assigns `startFormatted` and `endFormatted` (`MMM D, YYYY`), `daysUntil` (days from now to start), `duration` (days from start to end), and `status` from `_getTripStatus`
- **Output**: the same trip objects, mutated in place, then ordered ascending by `startDate`
- **Error handling**: `itemCount` and `totalCost` guard on the item array being absent; the controller's four assignments do not guard

### FR-F009-003: Classify a trip as upcoming, active or completed

The system SHALL derive a trip status from the current date.

- **Input**: a trip's `startDate` and `endDate`
- **Processing**: now before start → `upcoming`; now after end → `completed`; otherwise `active`
- **Output**: `trip.status`, overwriting the value supplied by the server
- **Error handling**: none

### FR-F009-004: Auto-select the first trip

The system SHALL open a trip without user action when none is selected.

- **Input**: the ordered trip list
- **Processing**: when the list is non-empty and `selectedTrip` is falsy, calls `selectTrip` with the first entry
- **Output**: a second request for that trip's details
- **Error handling**: none

### FR-F009-005: Load and reshape trip details into day groups

The system SHALL convert a flat item list into ordered day groups.

- **Input**: a trip id
- **Processing**: issues `GET /api/trips/{id}`; the service enriches each item with `dateFormatted`, `timeFormatted` and `costFormatted`; the controller groups items by `YYYY-MM-DD`, maps the group keys into objects carrying `date`, `dateFormatted` (`dddd, MMMM D`), `dayNumber` and time-ordered `items`, then orders the groups by `date`
- **Output**: `itinerary`, `itinerary.dayGroups`, `itinerary.days`; then `calculateTotals()`
- **Error handling**: rejection sets `errorMessage` to `Failed to load trip details.`; `isLoading` is cleared in a `finally` block on both paths

### FR-F009-006: Compute category and grand totals

The system SHALL total item costs per category and overall.

- **Input**: `itinerary.items`
- **Processing**: sums `cost` over items matching each of four literal type values, then sums those four values
- **Output**: `itinerary.totals` with five numeric properties
- **Error handling**: returns early when `itinerary` or `itinerary.items` is absent

### FR-F009-007: Filter days by item status

The system SHALL narrow the rendered day list by item status.

- **Input**: `filterStatus`, `itinerary.days`
- **Processing**: `all` assigns the full list; otherwise keeps days for which at least one item matches the status
- **Output**: `displayDays`
- **Error handling**: the watcher only invokes the filter when `itinerary` and `itinerary.days` both exist

### FR-F009-008: Switch view mode with a cross-fade

The system SHALL alternate between the list and timeline renderings.

- **Input**: a mode string
- **Processing**: assigns `viewMode`, then inside a `$timeout(fn, 0)` hides and fades in the container matching the mode over 300 ms
- **Output**: `viewMode`; a jQuery animation on `.itinerary-timeline` or `.itinerary-list`
- **Error handling**: none — no guard on the container existing

### FR-F010-001: Add a note to an itinerary item

The system SHALL record an annotation against an item.

- **Input**: the item, and `newNote`
- **Processing**: returns early on empty or whitespace-only text; issues `POST /api/itinerary-items/{id}/notes` with `{ text, createdAt }`; on resolution creates the item's `notes` array if absent and pushes a note carrying the text, a `MMM D, YYYY h:mm A` timestamp, and the author
- **Output**: a mutated `item.notes`; a cleared `newNote`; a success notification
- **Error handling**: rejection broadcasts a failure notification; the pushed note is built from client state, not from the response

### FR-F011-001: Cancel an itinerary item

The system SHALL mark an item cancelled after explicit confirmation.

- **Input**: the item
- **Processing**: requests a native `confirm()`; on acceptance issues `PUT /api/itinerary-items/{id}` with `{ status: 'cancelled' }`; on resolution sets `item.status` and recalculates totals
- **Output**: a mutated item; refreshed `totals`; a warning notification naming the item type
- **Error handling**: rejection broadcasts a failure notification

### FR-F009-009: Print the itinerary

The system SHALL produce a print-ready rendering in a new window.

- **Input**: the rendered `#itinerary-details` subtree
- **Processing**: clones it, removes `.btn` and `.no-print` descendants, opens a blank window, writes a document with the Bootstrap 3 CDN stylesheet and the clone's inner HTML, closes it and calls `print()`
- **Output**: a new browser window and a print dialog
- **Error handling**: none — the return value of `window.open` is not checked

### FR-F009-010: Provide presentation helpers

The system SHALL expose date, time, icon and status-class helpers to the template.

- **Input**: a date, a time string, an item type, an item status
- **Processing**: `formatDate` → `ddd, MMM D, YYYY`; `formatTime` parses with the explicit format `HH:mm` and renders `h:mm A`; `getItemIcon` maps four types to glyphicons with a default; `getStatusLabel` maps three statuses to Bootstrap label classes with a default
- **Output**: formatted strings and CSS class names
- **Error handling**: defaults are returned for unrecognised values

### FR-F019-001: Trip creation, update, deletion and sharing (defined, not reachable from the UI)

The system SHALL expose methods for the four remaining trip operations.

- **Input**: trip data; a trip id and a patch; a trip id; a trip id and an email
- **Processing**: `POST /api/trips`, `PUT /api/trips/{id}`, `DELETE /api/trips/{id}`, `POST /api/trips/{id}/share`
- **Output**: a created trip; an updated trip; a deletion acknowledgement; a share URL with an expiry
- **Error handling**: none
- **Reachability**: `createTrip`, `updateTrip`, `deleteTrip` and `shareTrip` have no caller in the application

---

## Non-Functional Requirements

### NFR-F009-001: Authentication is required for every endpoint in this module

All eight endpoints (`GET`/`POST /api/trips`, `GET`/`PUT`/`DELETE /api/trips/{id}`,
`POST /api/trips/{id}/share`, `PUT /api/itinerary-items/{id}`,
`POST /api/itinerary-items/{id}/notes`) are registered behind `authMiddleware`. The bearer token is
attached by the global Restangular request interceptor (`app/app.js:20-28`). The state is
additionally guarded by `$stateChangeStart` (`app/app.js:32-37`).

### NFR-F009-002: The trip list is fetched whole, with items embedded

`GET /api/trips` returns every trip with its full item array. No pagination, no projection and no
date-window parameter exist. Opening a trip issues a second request for data the list response
already contained.

### NFR-F009-003: Server state is in-process and mutable

The trips collection is a module-level array in the mock server. `PUT /api/itinerary-items/{id}`
and `POST /api/itinerary-items/{id}/notes` mutate it in place, so their effects persist for the
lifetime of the server process and are shared by every client. They are lost on restart.

### NFR-F009-004: Reshaping is synchronous and repeated per selection

Grouping, day construction, sorting and totalling run in full each time a trip is opened. Seeded
trips carry three to five items.

### NFR-F009-005: Presentation is coupled to the DOM

Three behaviours bypass the template: the scroll to the details panel, the view-mode cross-fade,
and the print clone. The print path in particular reads rendered DOM rather than model state, so
its output depends on what AngularJS has already rendered.

---

## Dependencies

| Dependency | Type | Direction | Description |
|------------|------|-----------|-------------|
| Authentication (`frd-authentication.md`) | Feature | Upstream | The `itinerary` state declares `requireAuth`; the token interceptor supplies the bearer header; `addNote` reads `$rootScope.currentUser` |
| Application shell (`app/app.js`, `app/app.routes.js`) | Feature | Upstream | Registers the `'itinerary'` state, the notification listener and the auth guard |
| Flight search (`frd-flight-search.md`) | Feature | **Upstream** | Broadcasts `itinerary:refresh` after a flight booking |
| Hotel booking (`frd-hotel-booking.md`) | Feature | **Upstream** | Broadcasts `itinerary:refresh` after a hotel booking |
| Notifications (`$rootScope` bus) | Feature | Downstream | Consumes the five `notification:add` broadcasts from this module |
| `GET /api/trips`, `GET /api/trips/{id}` | External | — | Mock Express API — the two endpoints this module actually calls |
| `PUT /api/itinerary-items/{id}`, `POST /api/itinerary-items/{id}/notes` | External | — | Item cancellation and annotation |
| `POST /api/trips`, `PUT`/`DELETE /api/trips/{id}`, `POST /api/trips/{id}/share` | External | — | Implemented; no caller |
| Restangular 1.6.1 | External | — | HTTP client, including `customPOST` and `customPUT` |
| jQuery 2.2.4 | External | — | Scroll animation, view cross-fade, print clone |
| Lodash 4.17.4 | External | — | `map`, `keys`, `orderBy`, `sortBy`, `groupBy`, `filter`, `some`, `sumBy`, `sum`, `values` |
| Moment.js 2.18.1 | External | — | All date and time formatting and differencing |
| AngularJS built-in `number` filter | External | — | `\| number:2` on every money value in the template |
| Browser `window.open` / `confirm` | External | — | Print window; cancellation confirmation |

---

## Current Implementation (Brownfield Extension)

### Files Involved

| File Path | Role | Lines |
|-----------|------|-------|
| `app/components/itinerary/itinerary.controller.js` | Controller — all scope state and behaviour | 1–235 |
| `app/components/itinerary/itinerary.service.js` | Restangular service + item enrichment | 1–103 |
| `app/components/itinerary/itinerary.template.html` | Bootstrap 3 template, two view modes | 1–226 |
| `app/app.routes.js` | `'itinerary'` state registration | 44–49 |
| `app/app.js` | Restangular base URL, token interceptor, auth guard, notification bus | 13–50 |
| `api-mock/server.js` | Trips seed data and eight handlers | 142, 461, 480, 518, 535 |

**Not involved, despite proximity.** These were checked and are *not* used by this module:

| Asset | Status |
|-------|--------|
| `app/directives/date-picker.directive.js` (`gtDatePicker`) | Registered; `gt-date-picker` appears in **zero** templates. This module has no date entry at all. |
| `app/services/api.service.js` (`ApiService`) | Registered; injected **nowhere**. This module talks to Restangular directly. |
| `app/filters/currency.filter.js` (`usdCurrency`) | Registered; referenced nowhere. This template formats money as a literal `$` followed by the **built-in** `number:2` filter (`template:66`, `:100`, `:104`, `:108`, `:112`). |
| `app/filters/date-format.filter.js` (`gtDateFormat`, `gtTimeAgo`, `gtDuration`) | Registered; referenced nowhere. All date formatting here is done in JavaScript with Moment.js. |
| `$filter` | **Injected into this controller** (`controller:11-12`) and never called anywhere in its 235 lines. |

### Architecture Pattern

Controller-with-`$scope`, registered by controller name against a UI-Router state. No
`controllerAs`. The service is a Restangular wrapper that also enriches items. Cross-module
communication by `$rootScope` events — this is the only module that **listens** for
`itinerary:refresh`. Three behaviours manipulate the DOM directly with jQuery. Two native browser
dialogs are used (`confirm`, `window.open`).

Distinctive against the other modules: it loads on construction rather than on submit, it has no
form and no datepicker, and it is the only module whose service enriches on **both** list and
detail paths.

### Scope shape

| Property | Initial value | Line |
|----------|---------------|------|
| `itinerary` | `null` | 15 |
| `trips` | `[]` | 16 |
| `selectedTrip` | `null` | 17 |
| `isLoading` | `false` | 18 |
| `errorMessage` | `''` | 19 |
| `viewMode` | `'list'` | 20 |
| `filterStatus` | `'all'` | 21 |
| `newNote` | `''` | 23 |
| `editingItem` | `null` | 24 |

`displayDays` is **not** declared here; it is first assigned inside `getFilteredDays` (`:116` or
`:118`). `itinerary.dayGroups`, `itinerary.days` and `itinerary.totals` are attached to the
response object rather than declared on the scope.

### Watches

| # | Expression | Deep | Lines | Behaviour |
|---|-----------|------|-------|-----------|
| 1 | `filterStatus` | no | 108–112 | Calls `getFilteredDays()` when `itinerary` and `itinerary.days` both exist. This is the module's only watcher — there is no watcher on the trip list, on `viewMode`, or on any item. |

### `$rootScope` events

| Event | Direction | Line | Payload |
|-------|-----------|------|---------|
| `notification:add` | broadcast | 49 | `'Failed to load itinerary'`, `'error'` |
| `notification:add` | broadcast | 150 | `'Note added'`, `'success'` |
| `notification:add` | broadcast | 152 | `'Failed to add note'`, `'error'` |
| `notification:add` | broadcast | 163 | `item.type + ' cancelled'`, `'warning'` |
| `notification:add` | broadcast | 165 | `'Failed to cancel item'`, `'error'` |
| `itinerary:refresh` | **listen** | 223–225 | none — triggers `loadTrips()` |
| `$rootScope.currentUser` | **read** | 147 | note author, falling back to the literal `'You'` |

Listener lifecycle: the deregistration function is captured at `:223` and invoked from the
`$destroy` handler at `:227-229`.

`itinerary:refresh` is broadcast by `flight-search.controller.js:221` and
`hotel-booking.controller.js:238`. This module is its only listener.

### jQuery selectors and effects

| Line | Selector | Effect |
|------|----------|--------|
| 82–84 | `#itinerary-details`, `html, body` | `.animate({ scrollTop: $details.offset().top - 20 }, 400)`, guarded by `$details.length` |
| 131 | `.itinerary-timeline` | `.hide().fadeIn(300)` |
| 133 | `.itinerary-list` | `.hide().fadeIn(300)` |
| 172 | `#itinerary-details` | `.clone()` |
| 173 | `.btn, .no-print` (within the clone) | `.remove()` |

All targets exist in the template: `#itinerary-details` (`:85`), `.itinerary-list` (`:137`),
`.itinerary-timeline` (`:203`), and `.no-print` on the print button (`:18`), the cancel-button
column and the add-note row.

### Moment.js call sites — and whether a parse format is supplied

| Line | Call | Parse format supplied? |
|------|------|------------------------|
| `controller:33` | `moment(trip.startDate).format('MMM D, YYYY')` | No |
| `controller:34` | `moment(trip.endDate).format('MMM D, YYYY')` | No |
| `controller:35` | `moment(trip.startDate).diff(moment(), 'days')` | No |
| `controller:36` | `moment(trip.endDate).diff(moment(trip.startDate), 'days')` | No |
| `controller:65` | `moment(item.date).format('YYYY-MM-DD')` | No |
| `controller:72` | `moment(date).format('dddd, MMMM D')` | No |
| `controller:73` | `moment(date).diff(moment(trip.startDate), 'days') + 1` | No |
| `controller:146` | `moment().format('MMM D, YYYY h:mm A')` | No (current time) |
| `controller:186` | `moment(date).format('ddd, MMM D, YYYY')` | No |
| `controller:190` | `moment(time, 'HH:mm').format('h:mm A')` | **Yes — `'HH:mm'`** |
| `controller:214-216` | `moment()`, `moment(trip.startDate)`, `moment(trip.endDate)` | No |
| `service:34` | `moment(item.date).format('MMM D, YYYY')` | No |
| `service:35` | `moment(item.time, 'HH:mm').format('h:mm A')` | **Yes — `'HH:mm'`** |
| `service:49` | `moment().toISOString()` | No (current time) |

Two call sites supply an explicit parse format, both parsing the item `time` field. This is the
only module in the application that does so.

### Lodash call sites

`_.map` (`:32`, `:69`, `service:17`, `service:33`), `_.orderBy` (`:42`), `_.groupBy` (`:64`),
`_.keys` (`:69`), `_.sortBy` (`:74`, `:77`), `_.sumBy` (`:99`–`:102`, `service:19`),
`_.filter` (`:99`–`:102`, `:118`), `_.some` (`:119`), `_.sum` (`:104`), `_.values` (`:104`).

`_.filter(items, { type: 'flight' })` uses Lodash's object shorthand rather than a predicate
function; `_.some(day.items, { status: $scope.filterStatus })` does the same.

### API surface used

| Call | Client site | Server site | Notes |
|------|-------------|-------------|-------|
| `GET /api/trips` | `service:16` ← `controller:31` | `api-mock/server.js:461` | Returns the whole seeded array, items embedded. `userId` is not filtered against the caller. |
| `GET /api/trips/{id}` | `service:31` ← `controller:60` | `api-mock/server.js:480` | 404s with `{ error: 'Trip not found' }` when unknown |
| `PUT /api/itinerary-items/{id}` | `service:62` ← `controller:160` | `api-mock/server.js:518` | `Object.assign(item, req.body)` across every trip's items |
| `POST /api/itinerary-items/{id}/notes` | `service:50` ← `controller:142` | `api-mock/server.js:535` | Handler assigns `item.notes = req.body.notes` |
| `POST /api/trips` | `service:71` | `api-mock/server.js:465` | No caller |
| `PUT /api/trips/{id}` | `service:81` | `api-mock/server.js:488` | No caller |
| `DELETE /api/trips/{id}` | `service:90` | `api-mock/server.js:497` | No caller |
| `POST /api/trips/{id}/share` | `service:100` | `api-mock/server.js:506` | No caller |

Four of the eight service methods, and four of the eight handlers, are unreachable from the UI.

### Fields the template reads that the seed data does not carry

| Binding | Template line | Present in seed data? |
|---------|---------------|----------------------|
| `trip.destination` | 50 | **No** — trips carry `id`, `userId`, `name`, `startDate`, `endDate`, `status`, `totalCost`, `items` |
| `selectedTrip.destination` | 92 | **No** |
| `item.title` | 157, 215 | **No** — items carry `id`, `type`, `date`, `time`, `description`, `cost`, `status` |
| `item.confirmationCode` | 160 | **No** — guarded by `ng-if`, so the block does not render |
| `item.notes` | 175, 177 | **No** initially — created client-side by `addNote` |

### Test Coverage

| Test Type | Files | Tests | Coverage |
|-----------|-------|-------|----------|
| Unit | — | 0 | 0% |
| Integration | — | 0 | 0% |
| E2E | — | 0 | 0% |

`test/spec/` contains a single file, `flight-search.spec.js`. There is **no test of any kind** for
this module.

**Untested paths**: all of them.

### Known Limitations

Stated as behaviour, with evidence. No judgement is implied and no fix is proposed here. Where
ADR-001 has already settled the product intent behind an item, the decision follows in a separate
**Target behaviour** note; the numbered paragraph above each note continues to describe what the
code does today, which is what the Track A green baseline captures.

1. **The stored trip cost and the client-side recomputation disagree.** The server seeds
   `totalCost: 2450.00` for `trip-1` and `totalCost: 1800.00` for `trip-2`
   (`api-mock/server.js:150`, `:166`). `ItineraryService.getTrips` overwrites that field with
   `_.sumBy(trip.items, 'cost')` (`service:19`), which is **1330** for `trip-1`
   (450 + 350 + 0 + 50 + 480) and **1160** for `trip-2` (380 + 280 + 500). The trip list
   (`template:66`) therefore never shows the stored figure. Nothing reconciles the two.

   > **Target behaviour — settled by Q-6 of ADR-001**
   > (`specs/adrs/adr-001-product-intent-decisions.md`). A trip's cost is what the **server**
   > computes from the trip's items. Neither value the code produces today is authoritative under
   > that decision — not the seeded `2450` / `1800`, and not the client-side sum. Two consequences
   > follow for this FRD:
   >
   > - **`Trip.totalCost` changes from a stored field to a derived one.** It ceases to be seed data
   >   that `GET /api/trips` echoes back and becomes a value the handler computes per response.
   >   `specs/docs/architecture/data-models.md` lists `totalCost` under `Trip`'s stored fields, and
   >   `specs/contracts/api/itinerary.yaml` will need the same amendment.
   > - **This is an API-visible behaviour change**, not an internal refactor. Any consumer relying
   >   on the stored `2450` / `1800` values will observe different numbers after the change, so it
   >   cannot be treated as backward-compatible. The client-side overwrite at `service:19` becomes
   >   redundant once the server is authoritative.
   >
   > The paragraph above remains the green-baseline description of today's behaviour; the change is
   > made in a later increment under a red-green cycle.

2. **The two totals in the UI are computed by different rules.** The trip-list figure sums **every**
   item regardless of type (`service:19`); the trip-summary panel sums only items whose `type` is
   one of four literals (`controller:99-102`). With the seeded data every item matches one of the
   four, so both arrive at the same number; an item of any other type would be counted by the first
   and omitted by the second.

3. **Cancelling an item does not change any total.** `cancelItem` sets `item.status = 'cancelled'`
   and calls `calculateTotals()` (`:161-162`), but `calculateTotals` filters on `type` only
   (`:99-102`) — no total excludes cancelled items. The row is styled as cancelled
   (`template:147`) while its cost continues to contribute.

4. **Adding a note discards the note text server-side.** The client posts
   `{ text: noteText, createdAt: ... }` (`service:50-53`). The handler assigns
   `item.notes = req.body.notes` (`api-mock/server.js:540`) — a key the request does not contain —
   so the stored value becomes `undefined`, replacing whatever was there before. The UI appears to
   accumulate notes only because the controller pushes onto its own local array (`:143-148`) and
   ignores the response. After any `loadTrips()` — including one triggered by `itinerary:refresh`
   — the notes are gone.

5. **`trip.status` from the server is always overwritten.** The seed sets `status: 'upcoming'` for
   both trips (`api-mock/server.js:149`, `:165`); `_getTripStatus` recomputes it from the current
   date (`:37`, `:213-219`). Because the seeded dates are in 2024, both trips resolve to
   `completed`, and `daysUntil` is negative, so the `in N days` badge is hidden by its
   `ng-if="trip.daysUntil > 0"` guard (`template:61`).

6. **Every note input on the screen is bound to the same model.** The template renders one
   add-note box per item, each with `ng-model="newNote"` (`template:188`) against the single
   scope property declared at `:23`. Typing in one box updates all of them simultaneously.

7. **`item.title` is rendered but never supplied.** Both views bind `{{item.title}}`
   (`template:157`, `:215`); seeded items carry `description`, which is rendered separately on the
   following line. The title element renders empty.

8. **`trip.destination` is rendered but never supplied.** The trip list (`template:50`) and the
   details heading (`template:92`) both bind it; no trip object carries the key.

9. **The status filter keeps whole days, not matching items.** `getFilteredDays` retains a day if
   **any** item matches (`:118-120`) and does not filter the day's `items` array, so selecting
   `cancelled` shows every item on a day that contains one cancelled item.

10. **`displayDays` is undefined until the filter is first changed.** It is assigned only inside
   `getFilteredDays`, which the watcher invokes only on a `filterStatus` change (`:108-112`);
   `selectTrip` does not call it. The template compensates with the fallback expression
   `displayDays || itinerary.days` (`template:138`, `:204`).

11. **`displayDays` is not recomputed when a different trip is opened.** Once the user has changed
    the filter, `displayDays` holds days belonging to the previously selected trip and the fallback
    no longer applies, because `selectTrip` neither clears it nor re-runs the filter.

12. **The print window is opened without checking that it exists.** `window.open` (`:174`) returns
    `null` when a popup blocker intervenes; the following five statements dereference it
    unconditionally (`:175-181`).

13. **The print output is a clone of rendered DOM.** `$('#itinerary-details').clone()` (`:172`)
    captures whatever AngularJS has rendered, including the currently selected view mode and the
    active status filter — the printed page reflects screen state, not the trip.

14. **`$filter` is injected and never used.** It appears in the dependency array and the function
    signature (`controller:11-12`) and at no other point in the file.

15. **`editingItem` is declared and never read or written again.** It is assigned `null` at `:24`
    and appears nowhere else in the controller or the template.

16. **`item.dateFormatted` is computed and never rendered.** `service:34` derives it for every
    item; the template shows the day-group heading's `dateFormatted` instead (`template:142`,
    `:207`). The sibling fields `timeFormatted` (`template:153`, `:215`) and `costFormatted`
    (`template:164`) **are** used.

17. **`trip.itemCount` is computed and never rendered.** `service:18` derives it; no template
    binding reads it.

18. **Half the itinerary API is unreachable.** `createTrip`, `updateTrip`, `deleteTrip` and
    `shareTrip` (`service:71`, `:81`, `:90`, `:100`) have no caller, and their four handlers
    (`api-mock/server.js:465`, `:488`, `:497`, `:506`) cannot be exercised through the UI. There is
    no create-trip, delete-trip or share control anywhere in the template.

19. **`GET /api/trips` does not filter by user.** The handler returns the entire array
    (`api-mock/server.js:461-463`) although every seeded trip carries a `userId` and the middleware
    has already resolved `req.user`.

20. **A cancelled item can be cancelled again through a reload.** `PUT /api/itinerary-items/{id}`
    applies `Object.assign` unconditionally (`api-mock/server.js:523`); the guard that hides the
    button is client-side only (`template:169`).

21. **A refresh triggered by a booking reloads an unchanged collection** — this module sits on the
    receiving end of **SEAM-3**. It is the sole listener of `itinerary:refresh`
    (`controller:223-225`), which `flight-search.controller.js:221` and
    `hotel-booking.controller.js:238` broadcast after a booking. Neither booking handler writes to
    any collection (`api-mock/server.js:365`, `:445`), and `GET /api/trips` returns the seeded
    array unmodified (`api-mock/server.js:461-463`), so `loadTrips()` re-renders exactly the two
    trips the user was already looking at. The event fires, the request is issued, and nothing the
    user just booked appears.

    > **Target behaviour — settled by Q-3 of ADR-001**
    > (`specs/adrs/adr-001-product-intent-decisions.md`). A booking must persist and appear on the
    > traveller's itinerary, so SEAM-3 is dispositioned a **defect to fix** rather than accepted
    > behaviour — the ADR calls it "the core product promise". Once both booking handlers write an
    > itinerary item, `GET /api/trips` returns it and this module's existing refresh path delivers
    > the new booking with no change to the controller. This screen is where that promise is
    > observable, so F-009 is the verification surface for the SEAM-3 fix as well as a feature in
    > its own right. The paragraph above remains the green-baseline description of today's
    > behaviour; the change is made in a later increment under a red-green cycle.

22. **No TODO, FIXME or HACK markers exist in this module.** Six inline comments label patterns as
    "legacy" or "anti-pattern" (`controller:3`, `:14`, `:81`, `:107`, `:128`, `:171`); they
    describe style, not defects.

### Integration Points

| External System | Protocol | Purpose | Config Location |
|----------------|----------|---------|-----------------|
| Mock Express API | HTTP/JSON | Trips, trip details, item cancellation, item notes | `RestangularProvider.setBaseUrl('http://localhost:3000/api')` — `app/app.js:14`, hardcoded |
| Browser `localStorage` | — | Bearer token read on every request | `app/app.js:21` |
| Browser `window.open` | — | Print window | `controller:174` |
| Browser `confirm` | — | Cancellation confirmation | `controller:158` |
| Bootstrap CDN (`maxcdn.bootstrapcdn.com`) | HTTPS | Stylesheet for the print window | `controller:176`, hardcoded |

---

## Traceability

| PRD Feature | Covered here | Priority |
|-------------|--------------|----------|
| F-009 Trip Itinerary | FR-F009-001 … 010 | P1 |
| F-010 Itinerary Item Annotation | FR-F010-001 | P1 |
| F-011 Itinerary Item Cancellation | FR-F011-001 | P0 |
| F-019 Trip Management & Sharing | FR-F019-001 | P2 |

Resolved product decisions that bound this FRD: **Q-3** — a booking must create an itinerary item,
so **SEAM-3** (*bookings persist nothing*, Known Limitation 21) is a **defect to fix**; this module
is where that fix becomes observable, because it already reloads on `itinerary:refresh`. **Q-6** —
the server recomputes a trip's cost from its items, which moves `Trip.totalCost` from a **stored**
field to a **derived** one and is an **API-visible** change for any consumer relying on the stored
`2450` / `1800` values (Known Limitation 1)
(`specs/adrs/adr-001-product-intent-decisions.md`).

Extraction artifacts corroborating this FRD: `specs/contracts/api/itinerary.yaml`,
`specs/docs/architecture/components.md` (`ItineraryController`, `ItineraryService`),
`specs/docs/architecture/data-models.md` (`Trip`, `ItineraryItem`, client-side derived fields),
`specs/docs/testing/coverage.md` (no tests for this module).

> **Track B sections omitted.** The testability gate has not run —
> `.spec2cloud/state.json` → `brownfield.testability` is `null`. Per the `frd-generator` skill,
> *Expected Behavior Scenarios*, *Manual Verification Checklist* and *Testability Roadmap* are
> included only for features assigned to Track B.
