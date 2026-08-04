# FRD: Flight Search & Booking

**Feature ID**: F-005 (primary) · also covers F-006, F-018, F-020
**Status**: Draft
**Priority**: P1
**Last Updated**: 2026-08-04
**Source of truth**: `app/components/flight-search/*`, `app/app.routes.js`, `test/spec/flight-search.spec.js`

> **Phase note.** This is a B2b brownfield FRD. It documents what the code **does today**,
> read directly from source. It is not a design, not a backlog, and not an assessment.
> Behaviour that is surprising is recorded under *Known Limitations* in neutral, falsifiable
> terms; deciding what to do about any of it belongs to Phase A, not here.

---

## Description

Flight Search is the module an employee uses to find and book a flight for a business trip. It is
one of the five UI-Router feature states in the portal (`'flights'`, URL `/flights`,
`app/app.routes.js:32-37`), it requires authentication (`data: { requireAuth: true }`,
`app/app.routes.js:36`), and it is the richest module in the application by behaviour count.

The user fills a search form — trip type, origin, destination, departure and return dates,
passenger count and cabin class — and submits it. The controller validates the form, formats the
dates, and calls `GET /api/flights`. The mock API generates a fresh set of 5–12 flights per call;
no flight is stored anywhere, so the same search run twice returns different results. Returned
flights are enriched client-side, then narrowed by four filters (max price, stops, airline,
departure-time bucket) and ordered by one of three sort fields. All filtering and sorting happens
in the browser with Lodash — no filter or sort parameter is sent to the server.

Selecting a flight opens a details panel and scrolls the window to it. Booking posts to
`POST /api/flights/{id}/book`, which returns a confirmation number and writes nothing to any
collection. The controller reports success, marks the flight `booked` in local scope, and asks the
itinerary module to refresh itself.

The module also contains three service methods that reach real, working endpoints —
airport lookup (F-018), popular routes and flight detail (F-020) — none of which has a caller
anywhere in the application.

---

## User Stories

### US-F005-001: Search for a flight

**As an** Employee (the traveller)
**I want to** enter an origin, destination, dates, passenger count and cabin class and submit a search
**So that** I can see the flights available for my trip

**Acceptance Criteria:**
- GIVEN the flights state is loaded WHEN the controller initialises THEN `searchParams` is `{ origin: '', destination: '', departDate: null, returnDate: null, passengers: 1, cabinClass: 'economy', tripType: 'roundtrip' }`
- GIVEN origin and destination are both non-empty AND a departure date is set AND (trip type is `oneway` OR a return date is set) WHEN the form is submitted THEN a `GET` request is issued to `/api/flights` and `isLoading` becomes `true`
- GIVEN a search is in flight WHEN the response arrives THEN `flights` holds the returned array, `hasSearched` is `true`, and `isLoading` returns to `false`
- GIVEN a successful search returning N flights WHEN the response is applied THEN `notification:add` is broadcast with the message `Found N flights` and type `success`
- GIVEN the request rejects WHEN the failure is handled THEN `errorMessage` is `Failed to search flights. Please try again.`, `notification:add` is broadcast with `Flight search failed` / `error`, and `isLoading` returns to `false`

### US-F005-002: Be stopped from submitting an incomplete search

**As an** Employee
**I want to** be told which field is missing before the search runs
**So that** I do not submit a search that cannot succeed

**Acceptance Criteria:**
- GIVEN origin or destination is empty WHEN the form is submitted THEN no request is issued, `errorMessage` is `Please enter origin and destination.`, and the class `has-error` is added to every `.search-field-required` element and removed 3000 ms later
- GIVEN origin and destination are set but `departDate` is null WHEN the form is submitted THEN no request is issued and `errorMessage` is `Please select a departure date.`
- GIVEN `tripType` is `roundtrip` and `returnDate` is null WHEN the form is submitted THEN no request is issued and `errorMessage` is `Please select a return date for round trips.`

### US-F005-003: Narrow the result set

**As an** Employee
**I want to** filter results by price, stops, airline and departure time
**So that** I can find the flight that fits my schedule and my budget

**Acceptance Criteria:**
- GIVEN a completed search WHEN any property of `filters` changes THEN `applyFilters()` runs automatically (deep `$watch`, gated on `hasSearched`)
- GIVEN `filters.maxPrice` is set WHEN filters are applied THEN only flights with `price <= filters.maxPrice` remain
- GIVEN `filters.stops` is not `'any'` WHEN filters are applied THEN only flights with `stops <= parseInt(filters.stops, 10)` remain
- GIVEN `filters.airline` is a non-empty string WHEN filters are applied THEN only flights whose `airline` equals it exactly remain
- GIVEN `filters.departTimeRange` is `morning` WHEN filters are applied THEN only flights whose `departureTime` hour is `>= 6 and < 12` remain; `afternoon` is `>= 12 and < 18`; `evening` is `>= 18 or < 6`
- GIVEN a search completes WHEN the results are applied THEN `filters.maxPrice` is overwritten with the highest price in the result set

### US-F005-004: Order the result set

**As an** Employee
**I want to** sort results by price, duration or departure time
**So that** I can compare the options that matter to me first

**Acceptance Criteria:**
- GIVEN `sortField` is `price` WHEN `sortBy('price')` is invoked THEN `sortReverse` is inverted and the list is reordered
- GIVEN `sortField` is `price` WHEN `sortBy('durationMinutes')` is invoked THEN `sortField` becomes `durationMinutes` and `sortReverse` is reset to `false`
- GIVEN any sort state WHEN filters are applied THEN ordering is `_.orderBy(filtered, [sortField], [sortReverse ? 'desc' : 'asc'])`

### US-F005-005: Inspect a flight before booking

**As an** Employee
**I want to** select a flight and see its full detail
**So that** I can confirm it before committing

**Acceptance Criteria:**
- GIVEN a result list WHEN a flight row is clicked THEN `selectedFlight` is set to that flight object and `flight:selected` is broadcast with the flight as payload
- GIVEN the `#flight-details` element is present in the DOM WHEN a flight is selected THEN the window scrolls to `offset().top - 20` over 400 ms
- GIVEN a flight is selected WHEN the details panel renders THEN the displayed total is `selectedFlight.price * searchParams.passengers`

### US-F006-001: Book the selected flight

**As an** Employee
**I want to** book the flight I selected
**So that** the trip is reserved and appears on my itinerary

**Acceptance Criteria:**
- GIVEN `selectedFlight` is null WHEN `bookFlight()` is invoked THEN nothing happens
- GIVEN a flight is selected WHEN `bookFlight()` is invoked THEN `POST /api/flights/{id}/book` is issued with body `{ passengers, cabinClass }`
- GIVEN the booking resolves WHEN the result is handled THEN `notification:add` is broadcast with `Flight booked successfully! Confirmation: ` + `booking.confirmationCode`, `itinerary:refresh` is broadcast, and `selectedFlight.booked` is set to `true`
- GIVEN `selectedFlight.booked` is `true` WHEN the details panel renders THEN the book button is disabled and reads `Booked!`
- GIVEN the booking rejects WHEN the failure is handled THEN `notification:add` is broadcast with `Booking failed. Please try again.` / `error`

### US-F005-006: Carry my cabin-class preference into the search form

**As an** Employee
**I want to** have my saved cabin class pre-selected
**So that** I do not re-pick it on every search

**Acceptance Criteria:**
- GIVEN the flights controller is alive WHEN `auth:login` is broadcast with a user object THEN `searchParams.cabinClass` is set to `user.preferences.cabinClass`, defaulting to `'economy'` when that path is absent
- GIVEN the controller scope is destroyed WHEN `$destroy` fires THEN the `auth:login` listener is deregistered

---

## Functional Requirements

### FR-F005-001: Initialise search state on entry

The system SHALL establish a search form state when the flights state is entered.

- **Input**: none (controller construction)
- **Processing**: assigns `searchParams` (7 properties), `flights`, `filteredFlights`, `selectedFlight`, `isLoading`, `hasSearched`, `sortField`, `sortReverse`, `errorMessage`, `filters` (4 properties), `airlines`, `priceRange`
- **Output**: a populated `$scope` as specified in *Current Implementation → Scope shape*
- **Error handling**: none — no I/O occurs

### FR-F005-002: Keep the return date consistent with the departure date

The system SHALL adjust the return date when a changed departure date would fall after it.

- **Input**: a change to `searchParams.departDate` where both the previous and new values are truthy and differ
- **Processing**: parses the new departure date with `moment()`; if a return date is set and the departure date is after it, sets `returnDate` to the departure date plus one day
- **Output**: a mutated `searchParams.returnDate`
- **Error handling**: none — the watcher does not run when either value is falsy

### FR-F005-003: Clear the return date for one-way trips

The system SHALL null `searchParams.returnDate` whenever `searchParams.tripType` becomes `'oneway'`.

- **Input**: a change to `searchParams.tripType`
- **Processing**: equality test against the literal `'oneway'`
- **Output**: `returnDate` set to `null`; the return-date input is also hidden by `ng-show` in the template
- **Error handling**: none

### FR-F005-004: Bind date entry to jQuery UI datepickers

The system SHALL attach jQuery UI datepickers to the departure and return date inputs.

- **Input**: DOM elements `#departDate` and `#returnDate`
- **Processing**: inside a `$timeout(fn, 0)`, calls `.datepicker()` on each; `#departDate` uses `minDate: 0`, `#returnDate` uses `minDate: 1`; both use `dateFormat: 'mm/dd/yy'`; each `onSelect` wraps the assignment in `$scope.$apply` and stores `new Date(dateText)`
- **Output**: `searchParams.departDate` / `searchParams.returnDate` as JavaScript `Date` objects
- **Error handling**: none — no guard on element presence or on the plugin being loaded

### FR-F005-005: Validate the search form before dispatch

The system SHALL reject an incomplete search without issuing a request.

- **Input**: `searchParams`
- **Processing**: three ordered checks — origin **and** destination present; departure date present; return date present when `tripType` is `roundtrip`. The first failing check returns immediately.
- **Output**: boolean; `errorMessage` set to the message for the first failing check
- **Error handling**: the origin/destination failure additionally applies the `has-error` class to `.search-field-required` elements and schedules its removal after 3000 ms

### FR-F005-006: Dispatch a flight search

The system SHALL request flights matching the entered criteria.

- **Input**: a validated `searchParams`
- **Processing**: copies `searchParams`; formats `departDate` — and `returnDate` when present — to `YYYY-MM-DD` with Moment.js; issues `GET /api/flights` with the copy as query parameters; fades in `#search-overlay` over 200 ms
- **Output**: `flights`, `airlines` (`_.uniq` of the result airlines), `priceRange.min` / `priceRange.max` (`_.minBy` / `_.maxBy`, falling back to `0` / `5000` on an empty result), `filters.maxPrice` (set to `priceRange.max`), then `filteredFlights` via `applyFilters()`
- **Error handling**: rejection sets `errorMessage` and broadcasts an error notification; `isLoading` is cleared and the overlay faded out in a `finally` block, on both paths

### FR-F005-007: Enrich each returned flight with display fields

The system SHALL derive formatted display values for each returned flight.

- **Input**: the raw flight array from `GET /api/flights`
- **Processing**: in `FlightSearchService.search`, maps each flight adding `departureFormatted`, `arrivalFormatted` (`moment(value, 'HH:mm').format('h:mm A')`), `durationFormatted`, `priceFormatted` (`'$' + price.toFixed(2)`) and `departDateFormatted` (`moment(value).format('ddd, MMM D')`)
- **Output**: the same flight objects, mutated in place
- **Error handling**: none — `price.toFixed(2)` is unguarded

### FR-F005-008: Filter and order the result set client-side

The system SHALL narrow and order the results without contacting the server.

- **Input**: `flights`, `filters`, `sortField`, `sortReverse`
- **Processing**: shallow-clones `flights`, then applies price, stops, airline and departure-time-bucket predicates in that order using Lodash, then `_.orderBy`
- **Output**: `filteredFlights`
- **Error handling**: none

### FR-F005-009: Toggle sort direction

The system SHALL invert the sort direction when the same field is re-selected and reset it otherwise.

- **Input**: a field name from one of three template buttons (`price`, `durationMinutes`, `departureTime`)
- **Processing**: if the field equals `sortField`, inverts `sortReverse`; otherwise sets `sortField` and resets `sortReverse` to `false`. Calls `applyFilters()`.
- **Output**: reordered `filteredFlights`
- **Error handling**: none

### FR-F005-010: Select a flight

The system SHALL record the chosen flight and reveal its detail panel.

- **Input**: a flight object from the result list
- **Processing**: assigns `selectedFlight`; if `#flight-details` exists, animates `html, body` scroll to `offset().top - 20` over 400 ms; broadcasts `flight:selected`
- **Output**: `selectedFlight`; a scrolled viewport; a `$rootScope` event consumed by the hotel module
- **Error handling**: the scroll is guarded by an element-presence check

### FR-F006-001: Book the selected flight

The system SHALL submit a booking for the selected flight.

- **Input**: `selectedFlight.id`, `searchParams.passengers`, `searchParams.cabinClass`
- **Processing**: guards on `selectedFlight`; sets `isLoading`; issues `POST /api/flights/{id}/book` via Restangular `customPOST`
- **Output**: a success notification quoting `booking.confirmationCode`; an `itinerary:refresh` broadcast; `selectedFlight.booked = true`
- **Error handling**: rejection broadcasts `Booking failed. Please try again.`; `isLoading` is cleared in a `finally` block on both paths

### FR-F005-011: Apply the signed-in user's cabin-class preference

The system SHALL update the cabin class in the search form when a user signs in.

- **Input**: the `auth:login` event payload
- **Processing**: `_.get(user, 'preferences.cabinClass', 'economy')`
- **Output**: `searchParams.cabinClass`
- **Error handling**: the Lodash default covers a missing user or missing preferences

### FR-F018-001: Look up airports (defined, not reachable from the UI)

The system SHALL expose a method that searches airports by free text and returns them sorted by name.

- **Input**: a query string
- **Processing**: `GET /api/airports?q={query}`, then `_.sortBy(airports, 'name')`
- **Output**: a sorted airport array
- **Error handling**: none
- **Reachability**: `FlightSearchService.searchAirports` has no caller in the application

### FR-F020-001: Popular routes and flight detail (defined, not reachable from the UI)

The system SHALL expose methods for `GET /api/flights/popular` and `GET /api/flights/{id}`.

- **Input**: none / a flight id
- **Processing**: Restangular `getList` and `one().get()`
- **Output**: a popular-route array / a flight detail object
- **Error handling**: none
- **Reachability**: `FlightSearchService.getPopularRoutes` and `getFlightDetails` have no caller in the application

---

## Non-Functional Requirements

### NFR-F005-001: Authentication is required for every call in this module

Both endpoints the UI reaches (`GET /api/flights`, `POST /api/flights/{id}/book`) are registered
behind `authMiddleware`. The bearer token is attached by a global Restangular full-request
interceptor that reads `authToken` from `localStorage` (`app/app.js:20-28`). The state itself is
additionally guarded by the `$stateChangeStart` handler in `app/app.js:32-38`.
`GET /api/airports` is the one endpoint in this module registered without `authMiddleware`.

### NFR-F005-002: All result processing is synchronous and client-side

Filtering and sorting run over the whole result set on every `filters` mutation, driven by a deep
`$watch`. Result sets are 5–12 flights per search, so the cost is bounded by the generator, not by
the algorithm. No pagination, virtualisation, debouncing or memoisation is present.

### NFR-F005-003: No caching

Every submission issues a fresh request. Nothing is cached in scope, in a service, or in
`localStorage`. Because the server generates flights per call, two identical searches return
different result sets.

### NFR-F005-004: Presentation is coupled to the DOM

Four behaviours reach the DOM directly rather than through the template: the overlay fade, the
validation highlight, the datepicker attachment, and the scroll-to-details. Each depends on a
specific `id` or class existing in `flight-search.template.html`, and none is covered by a
guard except the scroll.

---

## Dependencies

| Dependency | Type | Direction | Description |
|------------|------|-----------|-------------|
| Authentication (`frd-authentication.md`) | Feature | Upstream | The `flights` state declares `requireAuth`; the token interceptor supplies the bearer header; `auth:login` sets the cabin-class default |
| Application shell (`app/app.js`, `app/app.routes.js`) | Feature | Upstream | Registers the `'flights'` state, the notification listener and the auth guard |
| Itinerary (`frd-itinerary.md`) | Feature | Downstream | Listens for `itinerary:refresh`, which this module broadcasts after a booking (`itinerary.controller.js:223`) |
| Hotel booking (`frd-hotel-booking.md`) | Feature | Downstream | Listens for `flight:selected`, which this module broadcasts on selection (`hotel-booking.controller.js:266`) |
| Notifications (`$rootScope` bus) | Feature | Downstream | Consumes the four `notification:add` broadcasts from this module (`app/app.js:44-50`) |
| `GET /api/flights`, `POST /api/flights/{id}/book` | External | — | Mock Express API, `api-mock/server.js:328` and `:365` |
| `GET /api/airports`, `/api/flights/popular`, `/api/flights/{id}` | External | — | Reachable and implemented; no caller in the app |
| Restangular 1.6.1 | External | — | HTTP client; base URL `http://localhost:3000/api` (`app/app.js:14`) |
| jQuery 2.2.4 + jQuery UI | External | — | Datepickers, overlay fade, validation highlight, scroll animation |
| Lodash 4.17.4 | External | — | `uniq`, `map`, `minBy`, `maxBy`, `clone`, `filter`, `orderBy`, `get` |
| Moment.js 2.18.1 | External | — | Date formatting and the departure-time hour bucket |

---

## Current Implementation (Brownfield Extension)

> This is the forensic section. Every row is verifiable against the cited file and line.

### Files Involved

| File Path | Role | Lines |
|-----------|------|-------|
| `app/components/flight-search/flight-search.controller.js` | Controller — all scope state and behaviour | 1–258 |
| `app/components/flight-search/flight-search.service.js` | Restangular service + result enrichment | 1–77 |
| `app/components/flight-search/flight-search.template.html` | Bootstrap 3 template | 1–269 |
| `app/app.routes.js` | `'flights'` state registration | 32–37 |
| `app/app.js` | Restangular base URL, token interceptor, auth guard, notification bus | 13–50 |
| `api-mock/server.js` | `GET /api/flights`, `POST /api/flights/{id}/book` | 328, 365 |
| `test/spec/flight-search.spec.js` | Jasmine spec — 11 tests | 1–248 |

**Not involved, despite proximity.** These were checked and are *not* used by this module:

| Asset | Status |
|-------|--------|
| `app/directives/date-picker.directive.js` (`gt-date-picker`) | Registered; appears in **zero** templates. This controller initialises jQuery UI datepickers itself. |
| `app/services/api.service.js` (`ApiService`) | Registered at `api.service.js:9`; injected **nowhere**. This module talks to Restangular directly. |
| `app/filters/currency.filter.js` (`usdCurrency`) | Registered; referenced in no template. Prices here are rendered as `${{flight.price}}` and `'$' + price.toFixed(2)`. |
| `app/filters/date-format.filter.js` (`gtDateFormat`, `gtTimeAgo`, `gtDuration`) | Registered; referenced in no template. Dates and durations here go through controller methods calling Moment.js. |

The only Angular filter this template uses is the built-in `uppercase`
(`flight-search.template.html:251`).

### Architecture Pattern

Controller-with-`$scope` (AngularJS 1.6 pre-component style), registered against a UI-Router state
by `controller:` name rather than as a `component`. There is no `controllerAs`; the template binds
to `$scope` properties directly. Business logic sits in the controller; the service is a thin
Restangular wrapper that also performs display formatting. Cross-module communication is by
`$rootScope.$broadcast`. Four behaviours bypass Angular entirely and manipulate the DOM with
jQuery. This is the dominant pattern across all five feature modules.

### Scope shape

`$scope.searchParams` — 7 properties (`flight-search.controller.js:15-23`):

| Property | Initial value |
|----------|---------------|
| `origin` | `''` |
| `destination` | `''` |
| `departDate` | `null` |
| `returnDate` | `null` |
| `passengers` | `1` |
| `cabinClass` | `'economy'` |
| `tripType` | `'roundtrip'` |

`$scope.filters` — 4 properties (`:34-39`): `{ maxPrice: 5000, stops: 'any', airline: '', departTimeRange: 'any' }`.

Remaining scope state: `flights: []` (`:25`), `filteredFlights: []` (`:26`), `selectedFlight: null`
(`:27`), `isLoading: false` (`:28`), `hasSearched: false` (`:29`), `sortField: 'price'` (`:30`),
`sortReverse: false` (`:31`), `errorMessage: ''` (`:32`), `airlines: []` (`:41`),
`priceRange: { min: 0, max: 5000 }` (`:42`).

`filters.stops` is bound to a `<select>` whose options carry plain string values
(`template:133-139`), so it holds `'any' | '0' | '1' | '2'` as strings — which is why
`applyFilters` calls `parseInt(…, 10)` before comparing.

### Watches

| # | Expression | Deep | Lines | Behaviour |
|---|-----------|------|-------|-----------|
| 1 | `searchParams.departDate` | no | 45–53 | Guarded on `newVal && oldVal && newVal !== oldVal`, so it does not fire on first assignment. Parses the new value with `moment(newVal)` — **no format string**. If a return date is set and the departure date is after it, assigns `returnDate = dept.add(1, 'days').toDate()`. Because `.add()` mutates, the new return date is **departure date + 1 day**, not the old return date + 1 day. |
| 2 | `searchParams.tripType` | no | 55–59 | On `'oneway'`, sets `returnDate = null`. Fires once at registration with the initial `'roundtrip'`, which is a no-op. |
| 3 | `filters` | **yes** (`true`) | 62–66 | Calls `applyFilters()` on any nested change, gated on `hasSearched`. Because `searchFlights` assigns `filters.maxPrice` at `:117` and then calls `applyFilters()` explicitly at `:118`, filters are applied twice per successful search — once directly, once on the next digest. |

### `$rootScope` events

| Event | Direction | Line | Payload |
|-------|-----------|------|---------|
| `notification:add` | broadcast | 120 | `'Found ' + results.length + ' flights'`, `'success'` |
| `notification:add` | broadcast | 123 | `'Flight search failed'`, `'error'` |
| `notification:add` | broadcast | 220 | `'Flight booked successfully! Confirmation: ' + booking.confirmationCode`, `'success'` |
| `notification:add` | broadcast | 224 | `'Booking failed. Please try again.'`, `'error'` |
| `itinerary:refresh` | broadcast | 221 | none |
| `flight:selected` | broadcast | 207 | the flight object |
| `auth:login` | **listen** | 245–247 | sets `cabinClass` from `user.preferences.cabinClass`, default `'economy'` |

Listener lifecycle: the `auth:login` handler is the only `$rootScope.$on` in this controller. Its
deregistration function is captured at `:245` and invoked from the `$destroy` handler at
`:250-252`. The three `$scope.$watch` registrations are cleaned up automatically with the scope.

Consumers elsewhere: `flight:selected` → `hotel-booking.controller.js:266`;
`itinerary:refresh` → `itinerary.controller.js:223`; `notification:add` → `app/app.js:44`.
`auth:login` is broadcast by `auth.service.js:24`.

### jQuery selectors and effects

| Line | Selector | Effect |
|------|----------|--------|
| 72 | `#departDate` | `.datepicker({ minDate: 0, dateFormat: 'mm/dd/yy', onSelect })` |
| 81 | `#returnDate` | `.datepicker({ minDate: 1, dateFormat: 'mm/dd/yy', onSelect })` |
| 104 | `#search-overlay` | `.fadeIn(200)` |
| 126 | `#search-overlay` | `.fadeOut(200)` |
| 135–137 | `.search-field-required` | `.addClass('has-error').delay(3000).queue(fn)` → `.removeClass('has-error').dequeue()` |
| 203–206 | `#flight-details`, `html, body` | `.animate({ scrollTop: $details.offset().top - 20 }, 400)`, guarded by `$details.length` (selector at `:203`, guard at `:204`, animation at `:205`) |

All six targets exist in the template: `#departDate` (`:57`), `#returnDate` (`:64`),
`#search-overlay` (`:109`, inline `display: none`), `.search-field-required` (`:40` and `:47` — two
elements, the origin and destination columns), `#flight-details` (`:230`).

Datepicker initialisation runs inside `$timeout(fn, 0)` (`:70`) and is invoked once at the end of
construction (`:255`).

### Moment.js call sites — and whether a format string is supplied

| Line | Call | Parse format supplied? |
|------|------|------------------------|
| `controller:47` | `moment(newVal)` — departure date in the `$watch` | **No** |
| `controller:48` | `moment($scope.searchParams.returnDate)` | **No** |
| `controller:107` | `moment(params.departDate).format('YYYY-MM-DD')` | **No** (output format only) |
| `controller:109` | `moment(params.returnDate).format('YYYY-MM-DD')` | **No** (output format only) |
| `controller:172` | `moment(flight.departureTime, 'HH:mm').hour()` | **Yes** — `'HH:mm'` |
| `controller:232` | `moment.duration(minutes, 'minutes')` | n/a — duration, not a date |
| `controller:237` | `moment(time, 'HH:mm').format('h:mm A')` | **Yes** — `'HH:mm'` |
| `controller:241` | `moment(date).format('ddd, MMM D, YYYY')` | **No** (output format only) |
| `service:22` | `moment(flight.departureTime, 'HH:mm').format('h:mm A')` | **Yes** — `'HH:mm'` |
| `service:23` | `moment(flight.arrivalTime, 'HH:mm').format('h:mm A')` | **Yes** — `'HH:mm'` |
| `service:26` | `moment(flight.departDate).format('ddd, MMM D')` | **No** (output format only) |

The values reaching the four unformatted parse sites are `Date` objects produced by
`new Date(dateText)` in the datepicker `onSelect` callbacks (`:77`, `:86`), except `service:26`,
where the input is the `YYYY-MM-DD` string the generator emits.

### Lodash call sites

`_.uniq` / `_.map` (`:114`), `_.minBy` (`:115`), `_.maxBy` (`:116`), `_.clone` (`:153` — shallow,
so the filtered array holds the same flight objects as `$scope.flights`), `_.filter` (`:155`,
`:161`, `:167`, `:171`), `_.orderBy` (`:183`), `_.get` (`:246`), `_.sortBy` (`service:66`).

Filtering and sorting are Lodash operations inside the controller, not AngularJS `filter` /
`orderBy` expressions in the template.

### Departure-time buckets

`applyFilters` reads the hour with `moment(flight.departureTime, 'HH:mm').hour()` and buckets
(`:174-176`):

| Bucket | Predicate | Template label (`:150-153`) |
|--------|-----------|------------------------------|
| `morning` | `hour >= 6 && hour < 12` | Morning (6am-12pm) |
| `afternoon` | `hour >= 12 && hour < 18` | Afternoon (12pm-6pm) |
| `evening` | `hour >= 18 \|\| hour < 6` | Evening (6pm-6am) |

### API surface used

| Call | Client site | Server site | Notes |
|------|-------------|-------------|-------|
| `GET /api/flights` | `service:19` ← `controller:112` | `api-mock/server.js:328` | Client sends `origin`, `destination`, `departDate`, `returnDate`, `passengers`, `tripType`, `cabinClass`. Handler reads `origin`, `destination`, `date`, `cabinClass`. |
| `POST /api/flights/{id}/book` | `service:39` ← `controller:216` | `api-mock/server.js:365` | Client sends `{ passengers, cabinClass }`. Handler reads neither, validates nothing, persists nothing, returns `confirmationNumber`. |
| `GET /api/airports` | `service:65` | — | No caller |
| `GET /api/flights/popular` | `service:47` | — | No caller |
| `GET /api/flights/{id}` | `service:56` | — | No caller |

The search is a **GET** with query parameters (`Restangular.all('flights').getList(params)`).

### Test Coverage

| Test Type | File | Tests | Passing | Coverage |
|-----------|------|-------|---------|----------|
| Unit (Jasmine/Karma) | `test/spec/flight-search.spec.js` | 11 | **0** | 0% effective |
| Integration | — | 0 | — | 0% |
| E2E | — | 0 | — | 0% |

**All 11 tests fail.** They fail for three distinct reasons. The FRD records the discrepancy; the
spec file is evidence and is not modified at B2.

| # | Reason | Tests affected | The test expects | The controller actually does |
|---|--------|----------------|------------------|------------------------------|
| 1 | `$httpBackend.flush()` with nothing pending | **all 11** | A pending `GET /api/flights/popular` to flush, primed by `whenGET` in `beforeEach` (`spec:27-30`) and flushed immediately after `createController()` | Never calls `/api/flights/popular`. `FlightSearchService.getPopularRoutes` exists (`service:46`) but has no caller. With no pending request, `flush()` throws. |
| 2 | `$scope.popularRoutes` does not exist | 1 (`should load popular routes on init`, `spec:73-80`) | `$scope.popularRoutes` defined, `length === 2` | The property is never assigned anywhere in the application. |
| 3 | `$scope.filters` contract mismatch | 2 (`should filter by airline` `spec:177-193`; `should filter by number of stops` `spec:195-212`) | `{ airlines: [], stops: null, priceRange: { min, max } }` | `{ maxPrice, stops, airline, departTimeRange }`. `applyFilters` reads none of the three properties the tests set. |

Two further mismatches are present in the same file and would surface once reason 1 is resolved:

- `spec:140` and `spec:159` declare `$httpBackend.expectPOST(/\/api\/flights/)`, but
  `FlightSearchService.search` issues a **GET**. The unmet expectation would also fail
  `verifyNoOutstandingExpectation()` in `afterEach` (`spec:34`).
- `createController()` invokes `initDatepickers()`, but its body is inside `$timeout(fn, 0)` and the
  spec never calls `$timeout.flush()`, so the jQuery UI calls do not execute under test.

**Untested paths**: `validateSearch` return-date branch; `applyFilters` price, departure-time and
sort branches as actually shaped; `sortBy` toggle; `bookFlight` in full; the `departDate` and
`tripType` watches; the `auth:login` listener; `$destroy` deregistration; every jQuery effect;
`formatDuration` / `formatTime` / `formatDate`; the whole of `FlightSearchService`.

### Known Limitations

Stated as behaviour, with evidence. No judgement is implied and no fix is proposed here. Where
ADR-001 has already settled the product intent behind an item, the decision follows in a separate
**Target behaviour** note; the numbered paragraph above each note continues to describe what the
code does today, which is what the Track A green baseline captures.

1. **`filters.maxPrice` is overwritten on every search.** `searchFlights` assigns
   `$scope.filters.maxPrice = $scope.priceRange.max` (`:117`) after each successful response, so a
   max-price the user set before searching does not survive the next search.

2. **A changed departure date can move the return date.** When the departure date is edited to a
   value after the current return date, the return date is reassigned to departure + 1 day
   (`:45-53`). No notice is shown.

3. **Selecting a flight scrolls the window.** `selectFlight` animates `html, body` to the details
   panel offset (`:204-206`), independently of where the user was.

4. **The departure date the user picks does not reach the generator.** The client sends
   `departDate` (`:107`); the handler reads `req.query.date` (`api-mock/server.js:329`). `origin`,
   `destination` and `cabinClass` do reach it. `returnDate`, `passengers` and `tripType` are sent
   and not read.

5. **The booking confirmation renders as `undefined`.** The handler returns `confirmationNumber`
   (`api-mock/server.js:367`); the controller reads `booking.confirmationCode` (`:220`), producing
   the notification text `Flight booked successfully! Confirmation: undefined`.

6. **A booking persists nothing** — this is **SEAM-3**. `POST /api/flights/{id}/book` writes to no
   collection (`api-mock/server.js:365`). The controller nevertheless broadcasts `itinerary:refresh`
   (`:221`) and sets `selectedFlight.booked = true` (`:222`), so the UI reports a booking that a
   subsequent `GET /api/trips` will not show. `booked` lives only on the in-memory flight object and
   is lost on the next search or state change.

   > **Target behaviour — settled by Q-3 of ADR-001**
   > (`specs/adrs/adr-001-product-intent-decisions.md`). A booking must persist and appear on the
   > traveller's itinerary, so SEAM-3 is dispositioned a **defect to fix** rather than accepted
   > behaviour — the ADR calls it "the core product promise". `POST /api/flights/{id}/book` is to
   > write an itinerary item that a subsequent `GET /api/trips` returns, which makes the existing
   > `itinerary:refresh` broadcast at `:221` correct rather than misleading. The paragraph above
   > remains the green-baseline description of today's behaviour; the change is made in a later
   > increment under a red-green cycle, and it raises F-006 above its current P1 rank.

7. **Search results are non-deterministic.** Every `GET /api/flights` generates 5–12 flights on the
   fly; nothing is stored. Re-running the same search returns a different result set, and a
   `selectedFlight` cannot be re-found after a re-search.

8. **The service's five derived display fields are never rendered.** `departureFormatted`,
   `arrivalFormatted`, `durationFormatted`, `priceFormatted` and `departDateFormatted` are computed
   for every flight (`service:22-26`); the template instead calls the controller's `formatTime`,
   `formatDuration` and `formatDate` and interpolates `${{flight.price}}` directly. The two
   formatting paths produce the same strings for time and duration.

9. **Three service methods have no caller.** `getPopularRoutes` (defined `service:46`),
   `getFlightDetails` (`service:55`) and `searchAirports` (`service:64`) are implemented on both
   tiers and invoked from nowhere. `$scope.popularRoutes`, which the test suite asserts on, does
   not exist.

10. **`price.toFixed(2)` is unguarded.** `service:25` calls it on every returned flight without a
    type or presence check.

11. **`_.clone` in `applyFilters` is shallow** (`:153`), so `filteredFlights` holds the same objects
    as `flights`. Setting `selectedFlight.booked = true` mutates the object visible in both arrays.

12. **No TODO, FIXME or HACK markers exist in this module.** The file header comments
    (`controller:1-5`, `service:1-4`) and six inline comments label patterns as
    "legacy" or "anti-pattern"; they describe style, not defects.

### Integration Points

| External System | Protocol | Purpose | Config Location |
|----------------|----------|---------|-----------------|
| Mock Express API | HTTP/JSON | Flight search, booking, airports, popular routes, flight detail | `RestangularProvider.setBaseUrl('http://localhost:3000/api')` — `app/app.js:14`, hardcoded |
| Browser `localStorage` | — | Bearer token read on every request | `app/app.js:21` |
| jQuery UI datepicker | — | Date entry for `#departDate` / `#returnDate` | `app/index.html` (vendor script tags) |

---

## Traceability

| PRD Feature | Covered here | Priority |
|-------------|--------------|----------|
| F-005 Flight Search | FR-F005-001 … 011 | P1 |
| F-006 Flight Booking | FR-F006-001 | P1 |
| F-018 Airport Lookup | FR-F018-001 | P2 |
| F-020 Popular Routes & Flight Details | FR-F020-001 | P2 |

Resolved product decisions that bound this FRD: **Q-3** — a booking must create an itinerary item,
so **SEAM-3** (*bookings persist nothing*, Known Limitation 6) is a **defect to fix** and F-006's
target behaviour differs from what the code does today
(`specs/adrs/adr-001-product-intent-decisions.md`).

Extraction artifacts corroborating this FRD: `specs/contracts/api/flight-search.yaml`
(6 operations, 5 `x-discrepancies`), `specs/docs/architecture/components.md`
(`FlightSearchController`, `FlightSearchService`), `specs/docs/testing/coverage.md`
(11 tests / 11 failing), `specs/docs/architecture/overview.md` (`$rootScope` event bus).

> **Track B sections omitted.** The testability gate has not run —
> `.spec2cloud/state.json` → `brownfield.testability` is `null`. Per the `frd-generator` skill,
> *Expected Behavior Scenarios*, *Manual Verification Checklist* and *Testability Roadmap* are
> included only for features assigned to Track B. If the gate assigns this feature to Track B,
> those three sections must be added before the FRD is considered complete.
