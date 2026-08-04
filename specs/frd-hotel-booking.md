# FRD: Hotel Search & Booking

**Feature ID**: F-007 (primary) · also covers F-008, F-021
**Status**: Draft
**Priority**: P1
**Last Updated**: 2026-08-04
**Source of truth**: `app/components/hotel-booking/*`, `app/app.routes.js`, `specs/contracts/api/hotel-booking.yaml`

> **Phase note.** This is a B2b brownfield FRD. It documents what the code **does today**,
> read directly from source. Behaviour that is surprising is recorded under *Known Limitations*
> in neutral, falsifiable terms; deciding what to do about any of it belongs to Phase A.

---

## Description

Hotel Booking is the module an employee uses to find a hotel in a destination city and reserve a
room. It is one of the five UI-Router feature states (`'hotels'`, URL `/hotels`,
`app/app.routes.js:38-43`) and requires authentication (`data: { requireAuth: true }`,
`app/app.routes.js:42`).

The user enters a city, check-in and check-out dates, a guest count and a room count, then submits.
The controller validates that a city and both dates are present, formats the dates, and calls
`GET /api/hotels`. The mock API generates hotels on the fly; nothing is stored, so repeating a
search returns a different set. Results are enriched client-side with a rating label, a formatted
price, a joined amenities string and a review summary, then narrowed by three filters (minimum
rating, maximum nightly price, and a set of required amenities) and ordered by one of four sort
modes. All filtering and sorting is done in the browser with Lodash.

Selecting a hotel issues a second call, `GET /api/hotels/{id}/rooms`, and attaches the result to
the hotel object. The user picks a room, reviews a booking summary showing a computed total, and
confirms. Booking posts to `POST /api/bookings/hotels`, which returns a confirmation and writes
nothing. A Bootstrap modal is then opened directly with jQuery.

The module is also a **consumer** of the flight module: it listens for `flight:selected` and
pre-fills the city and a three-night date range from the chosen flight.

Two service methods — hotel detail and paginated reviews (F-021) — are implemented on both tiers
and have no caller.

---

## User Stories

### US-F007-001: Search for a hotel

**As an** Employee (the traveller)
**I want to** enter a city, dates, guest count and room count and search
**So that** I can see the hotels available for my stay

**Acceptance Criteria:**
- GIVEN the hotels state is entered WHEN the controller initialises THEN `searchParams` is `{ city: '', checkIn: null, checkOut: null, guests: 1, rooms: 1 }` and `nightCount` is `0`
- GIVEN a city and both dates are set WHEN the form is submitted THEN `GET /api/hotels` is issued with `city`, `checkIn`, `checkOut`, `guests` and `rooms`, and `hasSearched` becomes `true`
- GIVEN a search is submitted WHEN it begins THEN `selectedHotel` and `selectedRoom` are both reset to `null`
- GIVEN a successful search returning N hotels for city C WHEN the response is applied THEN `notification:add` is broadcast with `Found N hotels in C` / `success`
- GIVEN the request rejects WHEN the failure is handled THEN `errorMessage` is `Hotel search failed. Please try again.` and `notification:add` is broadcast with `Hotel search failed` / `error`

### US-F007-002: Be stopped from submitting an incomplete search

**As an** Employee
**I want to** be told what is missing before the search runs
**So that** I do not submit a search that cannot succeed

**Acceptance Criteria:**
- GIVEN `searchParams.city` is empty WHEN the form is submitted THEN no request is issued, `errorMessage` is `Please enter a city.`, and the class `has-error` is added to `#cityInput` and removed 3000 ms later
- GIVEN a city is set but either date is missing WHEN the form is submitted THEN no request is issued and `errorMessage` is `Please select check-in and check-out dates.`

### US-F007-003: Have the stay length maintained automatically

**As an** Employee
**I want to** have the check-out date and the night count kept consistent with my check-in date
**So that** I do not have to compute the stay myself

**Acceptance Criteria:**
- GIVEN a check-in date is set AND no check-out date exists WHEN the check-in watcher runs THEN `checkOut` is set to check-in plus one day
- GIVEN a check-in date is set that is the same as or after the current check-out WHEN the watcher runs THEN `checkOut` is set to check-in plus one day
- GIVEN both dates are set WHEN either changes THEN `nightCount` becomes the whole-day difference between them
- GIVEN `nightCount` is greater than zero WHEN the form renders THEN a `{{nightCount}} night(s)` label is shown

### US-F007-004: Narrow and order the results

**As an** Employee
**I want to** filter by rating, nightly price and amenities, and sort the results
**So that** I can find a hotel that meets my requirements

**Acceptance Criteria:**
- GIVEN a completed search WHEN any property of `filters` changes THEN `applyFilters()` runs automatically (deep `$watch`, gated on `hasSearched`)
- GIVEN `filters.minRating` is set WHEN filters are applied THEN only hotels with `rating >= minRating` remain
- GIVEN `filters.maxPrice` is set WHEN filters are applied THEN only hotels with `pricePerNight <= maxPrice` remain
- GIVEN one or more amenities are selected WHEN filters are applied THEN only hotels whose `amenities` contain **every** selected amenity remain
- GIVEN an amenity checkbox is clicked WHEN `toggleAmenity` runs THEN that amenity is added to `filters.amenities` if absent and removed if present
- GIVEN `filters.sortBy` is `priceLow` THEN results ascend by `pricePerNight`; `priceHigh` reverses that; `rating` orders by rating descending; `recommended` (the default) orders by `featured` then `rating`, both descending

### US-F008-001: View the rooms available at a hotel

**As an** Employee
**I want to** open a hotel and see its rooms
**So that** I can choose the room type I want

**Acceptance Criteria:**
- GIVEN a result list WHEN "View Rooms" is clicked THEN `selectedHotel` is set, `selectedRoom` is reset to `null`, and `GET /api/hotels/{id}/rooms` is issued with the formatted `checkIn` and `checkOut`
- GIVEN the rooms request resolves WHEN the result is applied THEN the array is assigned to `selectedHotel.rooms` and the rooms table becomes visible
- GIVEN the `#hotel-rooms` element is present in the DOM WHEN the rooms arrive THEN the window scrolls to `offset().top - 20` over 400 ms
- GIVEN the rooms request rejects WHEN the failure is handled THEN `errorMessage` is `Could not load room details.`

### US-F008-002: Book a room

**As an** Employee
**I want to** confirm a booking for the room I selected
**So that** my accommodation is reserved

**Acceptance Criteria:**
- GIVEN either `selectedHotel` or `selectedRoom` is null WHEN `bookRoom()` is invoked THEN nothing happens
- GIVEN both are set WHEN `bookRoom()` is invoked THEN `POST /api/bookings/hotels` is issued with `hotelId`, `roomId`, `checkIn`, `checkOut`, `guests`, `rooms` and `totalPrice`
- GIVEN the booking resolves WHEN the result is handled THEN `bookingConfirmation` is assigned, `notification:add` is broadcast with `Hotel booked! Confirmation: ` + `confirmation.confirmationCode`, `itinerary:refresh` is broadcast, and `#bookingConfirmationModal` is opened via the jQuery `.modal('show')` plugin
- GIVEN the booking rejects WHEN the failure is handled THEN `notification:add` is broadcast with `Hotel booking failed. Please try again.` / `error`

### US-F007-005: Have the hotel search pre-filled from my chosen flight

**As an** Employee
**I want to** have the destination and dates carried over from the flight I selected
**So that** I do not re-enter them

**Acceptance Criteria:**
- GIVEN the hotels controller is alive WHEN `flight:selected` is broadcast with a flight THEN `searchParams.city` becomes `flight.destination`, `checkIn` becomes `flight.departDate`, and `checkOut` becomes `flight.departDate` plus three days
- GIVEN the controller scope is destroyed WHEN `$destroy` fires THEN the `flight:selected` listener is deregistered

---

## Functional Requirements

### FR-F007-001: Initialise search state on entry

The system SHALL establish hotel search state when the hotels state is entered.

- **Input**: none (controller construction)
- **Processing**: assigns `searchParams` (5 properties), `hotels`, `filteredHotels`, `selectedHotel`, `selectedRoom`, `isLoading`, `hasSearched`, `errorMessage`, `bookingConfirmation`, `filters` (4 properties), `availableAmenities` (8 entries), and finally `nightCount = 0`
- **Output**: a populated `$scope` as specified in *Current Implementation → Scope shape*
- **Error handling**: none — no I/O occurs

### FR-F007-002: Maintain the check-out date and night count

The system SHALL keep the check-out date after the check-in date and recompute the stay length.

- **Input**: a change to `searchParams.checkIn` or `searchParams.checkOut`
- **Processing**: on a truthy check-in, if no check-out exists **or** the check-in is the same as or after it, sets check-out to check-in plus one day; then recomputes `nightCount` as `moment(checkOut).diff(moment(checkIn), 'days')`. A change to check-out recomputes `nightCount` only.
- **Output**: `searchParams.checkOut`, `nightCount`
- **Error handling**: both watchers no-op on a falsy value; `_calculateNights` returns `0` unless both dates are set

### FR-F007-003: Bind date entry to jQuery UI datepickers

The system SHALL attach jQuery UI datepickers to the check-in and check-out inputs.

- **Input**: DOM elements `#hotelCheckIn` and `#hotelCheckOut`
- **Processing**: inside a `$timeout(fn, 0)`, calls `.datepicker()` on each; `#hotelCheckIn` uses `minDate: 0`, `#hotelCheckOut` uses `minDate: 1`; both use `dateFormat: 'mm/dd/yy'`; each `onSelect` wraps its assignment in `$scope.$apply` and stores `new Date(dateText)`
- **Output**: `searchParams.checkIn` / `searchParams.checkOut` as `Date` objects
- **Error handling**: none — no guard on element presence or on the plugin being loaded

### FR-F007-004: Validate the search form before dispatch

The system SHALL reject an incomplete hotel search without issuing a request.

- **Input**: `searchParams`
- **Processing**: two ordered checks — city present; both dates present. The first failing check returns immediately.
- **Output**: `errorMessage` set to the message for the first failing check
- **Error handling**: the city failure additionally applies `has-error` to `#cityInput` and schedules its removal after 3000 ms

### FR-F007-005: Dispatch a hotel search

The system SHALL request hotels matching the entered criteria.

- **Input**: a validated `searchParams`
- **Processing**: clears `selectedHotel` and `selectedRoom`; builds a parameter object with `city`, `checkIn` and `checkOut` formatted to `YYYY-MM-DD` with Moment.js, `guests` and `rooms`; issues `GET /api/hotels`
- **Output**: `hotels`, then `filteredHotels` via `applyFilters()`; a success notification naming the count and the city
- **Error handling**: rejection sets `errorMessage` and broadcasts an error notification; `isLoading` is cleared in a `finally` block on both paths

### FR-F007-006: Enrich each returned hotel with display fields

The system SHALL derive display values for each returned hotel.

- **Input**: the raw hotel array from `GET /api/hotels`
- **Processing**: in `HotelBookingService.searchHotels`, maps each hotel adding `ratingText` (a five-band label from `_getRatingText`), `priceFormatted` (`'$' + pricePerNight.toFixed(2)`), `amenitiesText` (`_.join(amenities, ', ')`) and `reviewSummary` (`reviewCount + ' reviews'`)
- **Output**: the same hotel objects, mutated in place
- **Error handling**: none — `pricePerNight.toFixed(2)` is unguarded

### FR-F007-007: Filter and order the result set client-side

The system SHALL narrow and order the results without contacting the server.

- **Input**: `hotels`, `filters`
- **Processing**: shallow-clones `hotels`, applies the rating, price and amenity predicates in that order with Lodash, then applies one of four sort branches
- **Output**: `filteredHotels`
- **Error handling**: none

### FR-F007-008: Toggle an amenity requirement

The system SHALL add or remove an amenity from the required set.

- **Input**: an amenity name from `availableAmenities`
- **Processing**: `indexOf`; `splice` when present, `push` when absent. `isAmenitySelected` reports membership with `_.includes`.
- **Output**: a mutated `filters.amenities`, which the deep watch turns into a re-filter
- **Error handling**: none

### FR-F008-001: Load the rooms for a hotel

The system SHALL fetch and attach the room list for the selected hotel.

- **Input**: a hotel object from the result list
- **Processing**: sets `selectedHotel`, clears `selectedRoom`, issues `GET /api/hotels/{id}/rooms` with the formatted date range, and sorts the response by `pricePerNight` in the service
- **Output**: `selectedHotel.rooms`; a scroll to `#hotel-rooms` when that element is present
- **Error handling**: rejection sets `errorMessage` to `Could not load room details.`; `isLoading` is cleared in a `finally` block

### FR-F008-002: Select a room

The system SHALL record the chosen room.

- **Input**: a room object from the rooms table
- **Processing**: assigns `selectedRoom`
- **Output**: `selectedRoom`, which reveals the booking summary panel
- **Error handling**: none

### FR-F008-003: Submit a room booking

The system SHALL submit a booking for the selected hotel and room.

- **Input**: `selectedHotel.id`, `selectedRoom.id`, the formatted date range, `guests`, `rooms`, and a computed `totalPrice`
- **Processing**: guards on both selections; computes `totalPrice` as `selectedRoom.pricePerNight * nightCount * searchParams.rooms`; issues `POST /api/bookings/hotels`
- **Output**: `bookingConfirmation`; a success notification; an `itinerary:refresh` broadcast; an opened confirmation modal
- **Error handling**: rejection broadcasts a failure notification; `isLoading` is cleared in a `finally` block on both paths

### FR-F007-009: Format currency and render a star rating

The system SHALL provide two presentation helpers to the template.

- **Input**: a numeric amount; a numeric rating
- **Processing**: `formatCurrency` delegates to the **built-in** AngularJS `currency` filter with symbol `$` and 2 decimal places; `getStars` returns `new Array(Math.round(rating))`, an array whose length drives an `ng-repeat`
- **Output**: a currency string; an array of that many iterations
- **Error handling**: none

### FR-F021-001: Hotel detail and paginated reviews (defined, not reachable from the UI)

The system SHALL expose methods for `GET /api/hotels/{id}` and `GET /api/hotels/{id}/reviews`.

- **Input**: a hotel id; a hotel id and a page number defaulting to 1
- **Processing**: Restangular `one().get()` and `one().getList('reviews', { page })`
- **Output**: a hotel detail object; a review page
- **Error handling**: none
- **Reachability**: `HotelBookingService.getHotelDetails` and `getReviews` have no caller in the application

---

## Non-Functional Requirements

### NFR-F007-001: Authentication is required for every endpoint in this module

All four endpoints (`GET /api/hotels`, `GET /api/hotels/{id}`, `GET /api/hotels/{id}/rooms`,
`GET /api/hotels/{id}/reviews`) and the booking endpoint (`POST /api/bookings/hotels`) are
registered behind `authMiddleware`. The bearer token is attached by the global Restangular
interceptor reading `authToken` from `localStorage` (`app/app.js:20-28`). The state is additionally
guarded by `$stateChangeStart` (`app/app.js:32-37`).

### NFR-F007-002: Two sequential round trips are required to reach a bookable room

A booking needs `GET /api/hotels` followed by `GET /api/hotels/{id}/rooms`. The room list is not
included in the search response in the shape the rooms table expects, so the second call cannot be
avoided. Both calls set the same `isLoading` flag.

### NFR-F007-003: All result processing is synchronous and client-side

Filtering and sorting run over the whole result set on every `filters` mutation, driven by a deep
`$watch`. Result sets are 6–15 hotels per search. No pagination, virtualisation, debouncing or
memoisation is present.

### NFR-F007-004: No caching

Every submission issues a fresh request; nothing is cached. Because the server generates hotels per
call, two identical searches return different result sets.

### NFR-F007-005: Presentation is coupled to the DOM and to Bootstrap's jQuery plugins

Four behaviours bypass the template: the datepicker attachment, the validation highlight, the
scroll to the rooms panel, and the confirmation modal. The modal in particular is opened by calling
the Bootstrap 3 jQuery plugin directly rather than by a scope flag.

---

## Dependencies

| Dependency | Type | Direction | Description |
|------------|------|-----------|-------------|
| Authentication (`frd-authentication.md`) | Feature | Upstream | The `hotels` state declares `requireAuth`; the token interceptor supplies the bearer header |
| Application shell (`app/app.js`, `app/app.routes.js`) | Feature | Upstream | Registers the `'hotels'` state, the notification listener and the auth guard |
| Flight search (`frd-flight-search.md`) | Feature | **Upstream** | Broadcasts `flight:selected`, which this module consumes to pre-fill city and dates |
| Itinerary (`frd-itinerary.md`) | Feature | Downstream | Listens for `itinerary:refresh`, which this module broadcasts after a booking |
| Notifications (`$rootScope` bus) | Feature | Downstream | Consumes the four `notification:add` broadcasts from this module |
| `GET /api/hotels`, `/api/hotels/{id}/rooms`, `POST /api/bookings/hotels` | External | — | Mock Express API |
| `GET /api/hotels/{id}`, `/api/hotels/{id}/reviews` | External | — | Implemented; no caller |
| Restangular 1.6.1 | External | — | HTTP client |
| jQuery 2.2.4 + jQuery UI | External | — | Datepickers, validation highlight, scroll animation |
| Bootstrap 3 JS (`.modal`) | External | — | Confirmation modal, invoked imperatively |
| Lodash 4.17.4 | External | — | `clone`, `filter`, `every`, `includes`, `sortBy`, `orderBy`, `map`, `join` |
| Moment.js 2.18.1 | External | — | Date formatting and the night-count difference |
| AngularJS built-in `currency` and `date` filters | External | — | `$filter('currency')` in the controller; `| date:'mediumDate'` in the template |

---

## Current Implementation (Brownfield Extension)

### Files Involved

| File Path | Role | Lines |
|-----------|------|-------|
| `app/components/hotel-booking/hotel-booking.controller.js` | Controller — all scope state and behaviour | 1–281 |
| `app/components/hotel-booking/hotel-booking.service.js` | Restangular service + result enrichment | 1–79 |
| `app/components/hotel-booking/hotel-booking.template.html` | Bootstrap 3 template | 1–256 |
| `app/app.routes.js` | `'hotels'` state registration | 38–43 |
| `app/app.js` | Restangular base URL, token interceptor, auth guard, notification bus | 13–50 |
| `api-mock/server.js` | Hotel search, detail, rooms, reviews, booking | 379, 384, 404, 437, 446 |

**Not involved, despite proximity.** These were checked and are *not* used by this module:

| Asset | Status |
|-------|--------|
| `app/directives/date-picker.directive.js` (`gt-date-picker`) | Registered; appears in **zero** templates. This controller initialises jQuery UI datepickers itself, exactly as flight-search does. |
| `app/services/api.service.js` (`ApiService`) | Registered; injected **nowhere**. This module talks to Restangular directly. |
| `app/filters/currency.filter.js` (`usdCurrency`) | Registered; referenced nowhere. This module uses the **built-in** AngularJS `currency` filter via `$filter` (`controller:255`). |
| `app/filters/date-format.filter.js` (`gtDateFormat`, `gtTimeAgo`, `gtDuration`) | Registered; referenced nowhere. This template uses the **built-in** `date` filter (`template:216-217`). |

### Architecture Pattern

Controller-with-`$scope`, registered by controller name against a UI-Router state. No
`controllerAs`. Business logic in the controller; the service is a thin Restangular wrapper that
also performs display formatting. Cross-module communication by `$rootScope` events. Four
behaviours manipulate the DOM directly with jQuery. Identical in shape to `flight-search`, with one
addition: this controller injects `$filter` and uses a built-in AngularJS filter programmatically.

### Scope shape

`$scope.searchParams` — 5 properties (`controller:15-21`):

| Property | Initial value |
|----------|---------------|
| `city` | `''` |
| `checkIn` | `null` |
| `checkOut` | `null` |
| `guests` | `1` |
| `rooms` | `1` |

`$scope.filters` — 4 properties (`:32-37`): `{ minRating: 0, maxPrice: 1000, amenities: [], sortBy: 'recommended' }`.

Remaining scope state: `hotels: []` (`:23`), `filteredHotels: []` (`:24`), `selectedHotel: null`
(`:25`), `selectedRoom: null` (`:26`), `isLoading: false` (`:27`), `hasSearched: false` (`:28`),
`errorMessage: ''` (`:29`), `bookingConfirmation: null` (`:30`), `availableAmenities` — 8 fixed
strings (`:39-42`), and `nightCount`, which is **not declared with the others**: it is first
assigned inside the check-in watcher (`:52`) and initialised to `0` at the very end of construction
(`:277`).

`availableAmenities` (`:39-42`): `WiFi`, `Pool`, `Gym`, `Spa`, `Restaurant`, `Parking`,
`Airport Shuttle`, `Business Center`. The server draws hotel amenities from its own fixed list of
10 (`hotel-booking.yaml` → `Hotel.amenities`).

### Watches

| # | Expression | Deep | Lines | Behaviour |
|---|-----------|------|-------|-----------|
| 1 | `searchParams.checkIn` | no | 45–54 | Guarded only on `newVal` being truthy — unlike the flight module, there is **no `oldVal` comparison**, so it also runs on the first digest in which a check-in exists. If no check-out is set, or the check-in is the same as or after it, assigns `checkOut = checkIn.add(1, 'days').toDate()`. `.add()` mutates the local moment only; `searchParams.checkIn` is unchanged. Then recomputes `nightCount`. |
| 2 | `searchParams.checkOut` | no | 56–60 | On a truthy value, recomputes `nightCount`. Does not adjust the check-in date. |
| 3 | `filters` | **yes** (`true`) | 63–67 | Calls `applyFilters()` on any nested change, gated on `hasSearched`. Amenity toggles mutate the array in place and are picked up by this watch, not by an explicit call. |

### `$rootScope` events

| Event | Direction | Line | Payload |
|-------|-----------|------|---------|
| `notification:add` | broadcast | 124 | `'Found ' + results.length + ' hotels in ' + params.city`, `'success'` |
| `notification:add` | broadcast | 127 | `'Hotel search failed'`, `'error'` |
| `notification:add` | broadcast | 236–237 | `'Hotel booked! Confirmation: ' + confirmation.confirmationCode`, `'success'` |
| `notification:add` | broadcast | 243 | `'Hotel booking failed. Please try again.'`, `'error'` |
| `itinerary:refresh` | broadcast | 238 | none |
| `flight:selected` | **listen** | 266–270 | sets `city` from `flight.destination`, `checkIn` from `flight.departDate`, `checkOut` from `flight.departDate` plus 3 days |

Listener lifecycle: `flight:selected` is the only `$rootScope.$on` here. Its deregistration function
is captured at `:266` and invoked from the `$destroy` handler at `:272-274`.

`flight:selected` is broadcast by `flight-search.controller.js:207`. Because the listener assigns
`city`, then `checkIn`, then `checkOut` synchronously, watcher #1 sees a check-out already three
days after the check-in and leaves it alone; `nightCount` settles at `3`.

### jQuery selectors and effects

| Line | Selector | Effect |
|------|----------|--------|
| 72 | `#hotelCheckIn` | `.datepicker({ minDate: 0, dateFormat: 'mm/dd/yy', onSelect })` |
| 81 | `#hotelCheckOut` | `.datepicker({ minDate: 1, dateFormat: 'mm/dd/yy', onSelect })` |
| 97–99 | `#cityInput` | `.addClass('has-error').delay(3000).queue(fn)` → `.removeClass('has-error').dequeue()` |
| 202–205 | `#hotel-rooms`, `html, body` | `.animate({ scrollTop: $rooms.offset().top - 20 }, 400)`, guarded by `$rooms.length` |
| 241 | `#bookingConfirmationModal` | `.modal('show')` — Bootstrap 3 jQuery plugin |

All targets exist in the template: `#hotelCheckIn` (`:29`), `#hotelCheckOut` (`:36`), `#cityInput`
(`:19` — a **column wrapper**, not the `<input id="city">` itself, so the highlight class lands on
the enclosing `div`), `#hotel-rooms` (`:166`), `#bookingConfirmationModal` (`:236`).

There is no loading-overlay element in this module — unlike flight-search, `isLoading` is surfaced
only through `ng-if`/`ng-disabled` bindings.

### Moment.js call sites — and whether a format string is supplied

| Line | Call | Parse format supplied? |
|------|------|------------------------|
| `controller:47` | `moment(newVal)` — check-in in the `$watch` | **No** |
| `controller:48` | `moment($scope.searchParams.checkOut)` | **No** |
| `controller:115` | `moment(...checkIn).format('YYYY-MM-DD')` | **No** (output format only) |
| `controller:116` | `moment(...checkOut).format('YYYY-MM-DD')` | **No** (output format only) |
| `controller:197` | `moment(...checkIn).format('YYYY-MM-DD')` | **No** (output format only) |
| `controller:198` | `moment(...checkOut).format('YYYY-MM-DD')` | **No** (output format only) |
| `controller:227` | `moment(...checkIn).format('YYYY-MM-DD')` | **No** (output format only) |
| `controller:228` | `moment(...checkOut).format('YYYY-MM-DD')` | **No** (output format only) |
| `controller:260` | `moment(checkOut).diff(moment(checkIn), 'days')` | **No** |
| `controller:268` | `moment(flight.departDate).toDate()` | **No** |
| `controller:269` | `moment(flight.departDate).add(3, 'days').toDate()` | **No** |

No Moment call in this module supplies a parse format string. The values are `Date` objects from
the datepicker `onSelect` callbacks (`:77`, `:86`), except `:268-269`, where the input is the
`departDate` string carried on the flight object.

### Lodash call sites

`_.clone` (`:135` — shallow), `_.filter` (`:138`, `:143`, `:149`), `_.every` (`:150`),
`_.includes` (`:151`, `:187`), `_.sortBy` (`:159`, `:162`), `_.orderBy` (`:165`, `:169`),
`_.map` (`service:20`), `_.join` (`service:23`), `_.sortBy` (`service:38`).

### Sort branches

| `filters.sortBy` | Implementation | Line |
|------------------|----------------|------|
| `priceLow` | `_.sortBy(filtered, 'pricePerNight')` | 159 |
| `priceHigh` | `_.sortBy(filtered, 'pricePerNight').reverse()` | 162 |
| `rating` | `_.orderBy(filtered, ['rating'], ['desc'])` | 165 |
| `recommended` (default) | `_.orderBy(filtered, ['featured', 'rating'], ['desc', 'desc'])` | 169 |

### API surface used

| Call | Client site | Server site | Notes |
|------|-------------|-------------|-------|
| `GET /api/hotels` | `service:19` ← `controller:121` | `api-mock/server.js:379` | Client sends `city`, `checkIn`, `checkOut`, `guests`, `rooms`. Handler reads `checkIn`/`checkOut` and passes them to the generator, which does not write them into the returned objects. |
| `GET /api/hotels/{id}/rooms` | `service:37` ← `controller:196` | `api-mock/server.js:404` | Client sends the date range; the handler does not read it. |
| `POST /api/bookings/hotels` | `service:48` ← `controller:234` | `api-mock/server.js:446` | Client sends 7 keys; the handler reads `hotelId`, `checkIn`, `checkOut` and `roomType`. |
| `GET /api/hotels/{id}` | `service:57` | `api-mock/server.js:384` | No caller |
| `GET /api/hotels/{id}/reviews` | `service:67` | `api-mock/server.js:437` | No caller |

### Room object shapes

Three different room shapes exist, and the rooms table binds against the third:

| Shape | Where | Keys |
|-------|-------|------|
| `HotelRoomSummary` | nested in the search response and in hotel detail | `type`, `price`, `available` |
| `HotelRoom` | returned by `GET /api/hotels/{id}/rooms` — **the one the table renders** | `type`, `price`, `available`, `beds`, `maxGuests` |
| What the template reads | `template:184-190` | `id`, `type`, `maxGuests`, `bedType`, `amenities`, `pricePerNight` |

Of the six keys the template reads from a room, **two exist** (`type`, `maxGuests`) and four do not
(`id`, `bedType`, `amenities`, `pricePerNight`). No room shape in the API carries an identifier.

### Test Coverage

| Test Type | Files | Tests | Coverage |
|-----------|-------|-------|----------|
| Unit | — | 0 | 0% |
| Integration | — | 0 | 0% |
| E2E | — | 0 | 0% |

`test/spec/` contains a single file, `flight-search.spec.js`. There is **no test of any kind** for
this module — no controller test, no service test, no template test.

**Untested paths**: all of them. Every behaviour in this document is unverified by any automated
check.

### Known Limitations

Stated as behaviour, with evidence. No judgement is implied and no fix is proposed here.

1. **The booking total is `NaN`.** `bookRoom` computes
   `totalPrice: $scope.selectedRoom.pricePerNight * $scope.nightCount * $scope.searchParams.rooms`
   (`:231`). Room objects from `GET /api/hotels/{id}/rooms` carry `price`, not `pricePerNight`
   (`hotel-booking.yaml` → `HotelRoom`), so the multiplication yields `NaN`. The same expression
   drives the headline total in the booking summary (`template:222`) and the per-room price cell
   (`template:190`), so both render blank or `NaN`. The handler does not read `totalPrice`, so the
   value does not affect the response.

2. **Room objects carry no identifier, and the template keys on one.** The rooms table declares
   `ng-repeat="room in selectedHotel.rooms track by room.id"` (`template:184`). Every room's `id`
   is `undefined`, so every tracking key is identical. AngularJS rejects duplicate `track by` keys
   with `[ngRepeat:dupes]`, which applies whenever the endpoint returns more than one room.

3. **Room selection state cannot distinguish rooms.** The selected-row highlight and the button
   label both test `selectedRoom.id === room.id` (`template:185`, `:193`, `:196`). With every `id`
   undefined, the comparison is true for every row once any room is selected.

4. **`roomId` is sent; `roomType` is read.** The client sends `roomId: $scope.selectedRoom.id`
   (`:226`) — itself undefined. The handler echoes `req.body.roomType`
   (`api-mock/server.js:449`), a key the client never sends. The confirmation therefore carries no
   room identification of either kind.

5. **The booking confirmation renders as `undefined`.** The handler returns `confirmationNumber`;
   the controller reads `confirmation.confirmationCode` (`:237`) and the modal renders the same
   key (`template:244`), producing `Hotel booked! Confirmation: undefined`.

6. **The confirmation modal's Total is blank.** It renders
   `formatCurrency(bookingConfirmation.totalPrice)` (`template:247`), but the confirmation object
   has no `totalPrice` key — its keys are `confirmationNumber`, `hotelId`, `roomType`, `checkIn`,
   `checkOut`, `status` and `bookedAt`.

7. **Two further room fields are read and not supplied.** The table renders `{{room.bedType}}`
   (`template:188`) — rooms carry `beds` — and `{{room.amenities.join(', ')}}` (`template:189`),
   where rooms carry no `amenities` array at all. The booking summary repeats `bedType`
   (`template:215`).

8. **A booking persists nothing.** `POST /api/bookings/hotels` writes to no collection. The
   controller nevertheless broadcasts `itinerary:refresh` (`:238`) and opens a success modal, so
   the UI reports a booking that a subsequent `GET /api/trips` will not show.

9. **The date range does not affect results.** `GET /api/hotels` reads `checkIn` and `checkOut` and
   passes them to the generator, which does not write them into the returned hotels;
   `GET /api/hotels/{id}/rooms` does not read them at all. `guests` and `rooms` are sent and not
   read by either handler.

10. **The room sort has no effect.** `HotelBookingService.getHotelRooms` sorts with
    `_.sortBy(rooms, 'pricePerNight')` (`service:38`). Rooms carry `price`; with the key absent the
    sort is a stable no-op and the server's order is preserved.

11. **The scroll to the rooms panel does not occur on the first hotel selected.** The scroll is
    performed inside the `.then()` callback (`:202-205`), immediately after `selectedHotel.rooms` is
    assigned (`:201`). The `#hotel-rooms` element is created by `ng-if="selectedHotel.rooms"`
    (`template:166`), which AngularJS evaluates later in the same digest — so at the moment
    `$('#hotel-rooms')` is queried the element does not yet exist and the `$rooms.length` guard is
    false. On a second selection the element is already in the DOM and the scroll runs.

12. **The validation highlight targets a wrapper, not the input.** `$('#cityInput')` (`:97`)
    resolves to the `col-md-3` `div` (`template:19`); the text input carries `id="city"`
    (`template:21`). The `has-error` class is therefore applied to the column, which is the
    Bootstrap 3 convention for `.form-group`, not for a column wrapper.

13. **`searchHotels` does not clear a previous result set on validation failure.** An early return
    on a missing city or date (`:95-105`) leaves `hasSearched`, `hotels` and `filteredHotels` from
    the previous search intact, so the stale result list remains on screen beneath the new error
    message.

14. **`priceFormatted` is computed and never rendered.** `service:22` derives it for every hotel;
    the template instead calls `formatCurrency(hotel.pricePerNight)` (`template:146`). The other
    three derived fields — `ratingText`, `reviewSummary`, `amenitiesText` — **are** used
    (`template:140`, `:143`).

15. **`getReviews` would be rejected by Restangular if called.** It uses `getList`
    (`service:67`), which expects a JSON array, while the endpoint responds with the object
    `{ reviews, totalCount, page, perPage }`. It has no caller, so this is never exercised.

16. **`nightCount` is initialised after the watchers are registered.** It is assigned `0` at
    `:277`, the second-to-last statement of the constructor, while the watchers that write it are
    registered at `:45` and `:56`. Until a check-in date exists it is `0`, so the `{{nightCount}}
    night(s)` label and the per-hotel total row are hidden by their `ng-if="nightCount > 0"`
    guards (`template:64`, `:148`).

17. **No TODO, FIXME or HACK markers exist in this module.** Six inline comments label patterns
    as "legacy" or "anti-pattern" (`controller:3`, `:14`, `:44`, `:69`, `:201`, `:240`); they
    describe style, not defects.

### Integration Points

| External System | Protocol | Purpose | Config Location |
|----------------|----------|---------|-----------------|
| Mock Express API | HTTP/JSON | Hotel search, rooms, booking, detail, reviews | `RestangularProvider.setBaseUrl('http://localhost:3000/api')` — `app/app.js:14`, hardcoded |
| Browser `localStorage` | — | Bearer token read on every request | `app/app.js:21` |
| jQuery UI datepicker | — | Date entry for `#hotelCheckIn` / `#hotelCheckOut` | `app/index.html` (vendor script tags) |
| Bootstrap 3 JS | — | `#bookingConfirmationModal` opened with `.modal('show')` | `app/index.html` (vendor script tags) |

---

## Traceability

| PRD Feature | Covered here | Priority |
|-------------|--------------|----------|
| F-007 Hotel Search | FR-F007-001 … 009 | P1 |
| F-008 Hotel Room Selection & Booking | FR-F008-001 … 003 | P1 |
| F-021 Hotel Details & Reviews | FR-F021-001 | P3 |

Extraction artifacts corroborating this FRD: `specs/contracts/api/hotel-booking.yaml`
(7 operations, 7 `x-discrepancies`), `specs/docs/architecture/components.md`
(`HotelBookingController`, `HotelBookingService`), `specs/docs/testing/coverage.md`
(no tests for this module), `specs/docs/architecture/overview.md` (`$rootScope` event bus).

> **Track B sections omitted.** The testability gate has not run —
> `.spec2cloud/state.json` → `brownfield.testability` is `null`. Per the `frd-generator` skill,
> *Expected Behavior Scenarios*, *Manual Verification Checklist* and *Testability Roadmap* are
> included only for features assigned to Track B.
