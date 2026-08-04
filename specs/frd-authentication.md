# FRD: Authentication, Shell & Notifications

**Feature ID**: F-001 (primary) · also covers F-002, F-003, F-004, F-022
**Status**: Draft
**Priority**: P0
**Last Updated**: 2026-08-04
**Source of truth**: `app/app.js`, `app/app.routes.js`, `app/services/auth.service.js`, `app/services/user.service.js`, `app/index.html`, `specs/contracts/api/auth.yaml`

> **Phase note.** This is a B2b brownfield FRD. It documents what the code **does today**,
> read directly from source. Behaviour that is surprising is recorded under *Known Limitations*
> in neutral, falsifiable terms; deciding what to do about any of it belongs to Phase A.

> **Cross-cutting FRD.** Unlike the other five, this is not a UI-Router feature module with a
> component folder. It is the substrate every other FRD sits on: the route guard that admits the
> user, the token that authorises every API call, the `$rootScope` state that identities are read
> from, and the notification bus all five feature modules broadcast into. `frd-flight-search.md`,
> `frd-hotel-booking.md`, `frd-itinerary.md`, `frd-travel-request.md` and
> `frd-expense-reconciliation.md` each depend on this document for the `auth:login` and
> `notification:add` seams.

---

## Description

Authentication in the portal is a single-button gate. The `'login'` state (`app/app.routes.js:13-26`)
declares an inline template string containing an `<h2>Login</h2>`, the sentence
`Mock login - click to enter`, and one button bound to `ng-click="enter()"`
(`app/app.routes.js:15`). There are no email or password inputs. Pressing the button calls
`AuthService.login('demo@globaltravel.com', 'password')` with both credentials written as literals
in the controller (`app/app.routes.js:20`).

`AuthService.login` (`app/services/auth.service.js:17-27`) `POST`s those two fields to a hardcoded
absolute URL, `http://localhost:3000/api/auth/login` (`:18`). On success it performs four actions in
order: writes the returned JWT to `localStorage` under the key `authToken` (`:22`), assigns the
returned user object to `$rootScope.currentUser` (`:23`), broadcasts `auth:login` with that user as
the payload (`:24`), and resolves with the whole response body (`:25`). The login controller waits
on that promise and only then transitions to `'dashboard'` (`app/app.routes.js:21-23`); an inline
comment at `:18-19` records that the wait is deliberate, because the guard would otherwise bounce
the transition back to `/login`.

Authorisation on every subsequent request is carried by a Restangular request interceptor
registered in the config block (`app/app.js:20-28`). It reads `authToken` from `localStorage`
(`:21`) and, when present, sets `headers.Authorization = 'Bearer ' + token` (`:23`). Every
Restangular call in all five feature services therefore carries the token without any feature code
referring to it. `AuthService.login` itself uses `$http` rather than Restangular
(`app/services/auth.service.js:18`), so the interceptor does not apply to the login request.

Route protection is a single listener in the run block (`app/app.js:32-37`). On `$stateChangeStart`
it tests `toState.data && toState.data.requireAuth && !AuthService.isAuthenticated()` (`:33`); if
that holds it calls `event.preventDefault()` (`:34`) and `$state.go('login')` (`:35`). Six of the
seven states declare `data: { requireAuth: true }` — `dashboard` (`app/app.routes.js:30`), `flights`
(`:36`), `hotels` (`:42`), `itinerary` (`:48`), `travelRequest` (`:54`) and `expenses` (`:60`).
`login` declares no `data` block, so the guard's first conjunct is falsy and login is always
reachable.

`AuthService.isAuthenticated` (`app/services/auth.service.js:42-44`) returns
`!!localStorage.getItem('authToken')` — the presence of a string, not its validity. The companion
`AuthService.getCurrentUser` (`:50-52`) returns `$rootScope.currentUser`, a different store
entirely. That split is the module's defining characteristic and is recorded in full under
*Known Limitations 1*.

The shell (F-002) is `app/index.html`: a fixed Bootstrap 3 navbar whose brand links to
`#/dashboard` (`:21`) and whose five links use `ui-sref` to the five feature states (`:25-29`), a
single `<div ui-view></div>` (`:37`), and a notification area (`:41-45`). All application and vendor
JavaScript is loaded as 29 unbundled `<script>` tags (`:48-86`); there is no module loader and
ordering is manual.

The dashboard (F-003) is the post-login landing state (`app/app.routes.js:27-31`). It declares an
inline template string listing the same five `ui-sref` links and **no controller** (`:29-30`), so it
has no behaviour beyond navigation.

Notifications (F-004) are a `$rootScope` bus. The run block seeds `$rootScope.notifications = []`
(`app/app.js:41`) and registers a listener for `notification:add` (`:44-50`) that pushes
`{ message, type: type || 'info', timestamp: new Date() }` (`:45-49`). All five feature controllers
broadcast into it. `app/index.html:41-45` renders the array through `ng-repeat` into
`alert alert-{{notif.type}}`.

User profile (F-022) is `UserService` (`app/services/user.service.js`), which exposes `getProfile()`
(`:14-19`) and `updatePreferences(preferences)` (`:26-28`). It is registered on the module (`:8`)
and loaded by the shell (`app/index.html:65`), and it is injected into nothing.

---

## User Stories

### US-F001-001: Enter the portal

**AS A** GlobalTravel employee
**I WANT** to be taken to a sign-in screen when I open the portal
**SO THAT** I know where to start

**GIVEN** I open the application at any URL that is not a declared state
**WHEN** the router resolves
**THEN** I am sent to `/login` (`app/app.routes.js:10`)
**AND** I see a heading, the sentence `Mock login - click to enter`, and one button labelled
`Enter Portal` (`app/app.routes.js:15`)
**AND** I am not asked for an email address or a password.

### US-F001-002: Authenticate

**AS A** GlobalTravel employee
**I WANT** to sign in with a single action
**SO THAT** I can reach the screens that require a session

**GIVEN** I am on the login screen
**WHEN** I press `Enter Portal`
**THEN** the application submits `demo@globaltravel.com` / `password` on my behalf
(`app/app.routes.js:20`)
**AND** on success a 24-hour JWT is stored in my browser (`app/services/auth.service.js:22`,
`api-mock/server.js:286`)
**AND** my user record is held in memory (`app/services/auth.service.js:23`)
**AND** `auth:login` is broadcast, carrying that user object, for any feature controller already
constructed (`app/services/auth.service.js:24`)
**AND** I land on the dashboard (`app/app.routes.js:22`).

### US-F001-003: Be kept out of protected screens

**AS A** GlobalTravel employee
**I WANT** the portal to stop me reaching a feature screen before I have signed in
**SO THAT** I am never shown a screen that cannot load its data

**GIVEN** no `authToken` exists in my browser
**WHEN** I navigate to `/flights`, `/hotels`, `/itinerary`, `/travel-request`, `/expenses` or
`/dashboard`
**THEN** the transition is cancelled (`app/app.js:34`)
**AND** I am redirected to the login screen (`app/app.js:35`).

### US-F001-004: Have my identity attached to what I create

**AS A** GlobalTravel employee
**I WANT** my name and email recorded on what I submit
**SO THAT** a request, report or note is attributable to me

**GIVEN** I am authenticated and my user record is in memory
**WHEN** I submit a travel request or an expense report
**THEN** my name and email are written onto the payload
(`travel-request.controller.js:172-173`, `expense.controller.js:194`)
**AND** when I add an itinerary note my name is recorded as its author
(`itinerary.controller.js:147`).

### US-F001-005: Have my requests authorised without doing anything

**AS A** GlobalTravel employee
**I WANT** my session to authorise every API call on my behalf
**SO THAT** I do not have to re-authenticate on each screen

**GIVEN** I am authenticated
**WHEN** any feature screen calls the API
**THEN** the `Authorization: Bearer <token>` header is added for me (`app/app.js:21-23`)
**AND** the server decodes it and exposes my claims to the handler (`api-mock/server.js:30-31`).

### US-F002-001: Move between features from anywhere

**AS A** GlobalTravel employee
**I WANT** one persistent navigation bar
**SO THAT** I can move between features without returning to a menu

**GIVEN** I am anywhere in the portal
**WHEN** I use the fixed navbar
**THEN** I can reach Flights, Hotels, Itinerary, Travel Requests and Expenses
(`app/index.html:25-29`)
**AND** the active screen renders into the single `ui-view` outlet (`app/index.html:37`).

### US-F003-001: Land somewhere after logging in

**AS A** GlobalTravel employee
**I WANT** a landing screen once I have signed in
**SO THAT** I have a starting point for the task I came to do

**GIVEN** I have just authenticated
**WHEN** the dashboard renders
**THEN** I see the portal title and the same five links (`app/app.routes.js:29`)
**AND** nothing else happens, because the state declares no controller (`app/app.routes.js:27-31`).

### US-F004-001: Be told what happened

**AS A** GlobalTravel employee
**I WANT** feedback after each action I take
**SO THAT** I know whether it succeeded

**GIVEN** I performed an action in any feature screen
**WHEN** that action succeeds or fails
**THEN** a coloured alert appears in the notification area (`app/index.html:41-45`)
**AND** it stays there for the rest of the session, because nothing removes it.

### US-F022-001: Read and update my profile — **no derivable story**

> **Not a user story. Generates no Gherkin scenario.** No behaviour is reachable, so nothing can be
> asserted. `UserService` is injected nowhere, so neither `getProfile()` nor `updatePreferences()`
> can be called from any screen. Recorded as *Known Limitations 13-14*. This heading is retained
> only so F-022 has a visible home in the traceability chain; downstream generation must skip it.

---

## Functional Requirements

### FR-F001-001: Login request

`AuthService.login(email, password)` issues `$http.post` to the literal
`http://localhost:3000/api/auth/login` with body `{ email: email, password: password }`
(`app/services/auth.service.js:17-21`).

- **Input**: two strings, supplied by the caller.
- **Processing**: none client-side; no trimming, no validation, no format check.
- **Output**: a promise resolving to `response.data`, shape `{ token, user }`
  (`api-mock/server.js:289-292`).
- **Error handling**: none in the service. The method declares no `.catch`
  (`app/services/auth.service.js:17-27`).

### FR-F001-002: Session establishment

On a resolved login the service performs, in source order (`app/services/auth.service.js:22-25`):

| # | Line | Action |
|---|------|--------|
| 1 | `:22` | `localStorage.setItem('authToken', response.data.token)` |
| 2 | `:23` | `$rootScope.currentUser = response.data.user` |
| 3 | `:24` | `$rootScope.$broadcast('auth:login', response.data.user)` |
| 4 | `:25` | `return response.data` |

Steps 1 and 2 write to two different stores. Only step 1 survives a page reload.

### FR-F001-003: Session teardown

`AuthService.logout()` (`app/services/auth.service.js:32-36`) removes the `authToken` key (`:33`),
sets `$rootScope.currentUser = null` (`:34`) and broadcasts `auth:logout` (`:35`). It issues no HTTP
request. It has no callers (*Known Limitations 2*) and the broadcast has no listeners
(*Known Limitations 3*).

### FR-F001-004: Authentication predicate

`AuthService.isAuthenticated()` returns `!!localStorage.getItem('authToken')`
(`app/services/auth.service.js:42-44`).

- **Input**: none.
- **Processing**: a truthiness coercion over a string lookup. The token is not decoded, its
  signature is not checked, and its `exp` claim is not read.
- **Output**: `boolean`.
- **Error handling**: none. `localStorage` access is unguarded; a browser that blocks storage would
  throw out of this method.

### FR-F001-005: Current-user accessor

`AuthService.getCurrentUser()` returns `$rootScope.currentUser`
(`app/services/auth.service.js:50-52`). The JSDoc immediately above it reads
`Get current user from localStorage` (`:47`); the body reads `$rootScope`. This accessor has no
callers — the three consumers read `$rootScope.currentUser` directly instead
(`itinerary.controller.js:147`, `travel-request.controller.js:172-173`,
`expense.controller.js:194`).

### FR-F001-006: Request authorisation

The Restangular config block registers a full-request interceptor (`app/app.js:20-28`) that reads
`authToken` (`:21`) and sets `headers.Authorization = 'Bearer ' + token` when it is present
(`:22-24`), returning `{ headers: headers }` (`:25-27`). The same block fixes the API base URL to
`http://localhost:3000/api` (`:14`) and a default `Content-Type: application/json` (`:15-17`).

### FR-F001-007: Route guard

A `$stateChangeStart` listener (`app/app.js:32-37`) cancels and redirects any transition whose
target declares `data.requireAuth` while `isAuthenticated()` is false.

- **Input**: the `toState` object supplied by UI-Router 0.4.3.
- **Processing**: `toState.data && toState.data.requireAuth && !AuthService.isAuthenticated()`
  (`:33`).
- **Output**: `event.preventDefault()` then `$state.go('login')` (`:34-35`).
- **Error handling**: none. `toState.data` is short-circuit-guarded, so a state without a `data`
  block passes through untouched.

### FR-F001-008: Server-side authorisation

`authMiddleware` (`api-mock/server.js:23-36`) is passed explicitly as the second argument to 33 of
the 36 route handlers; it is not mounted with `app.use`. It reads `req.headers.authorization`
(`:24`) and responds `401 {"error":"Unauthorized"}` if the header is absent or does not start with
`Bearer ` (`:25-27`). Otherwise it splits on a space (`:29`), calls `jwt.verify(token, JWT_SECRET)`
(`:30`), assigns `req.user = decoded` (`:31`) and calls `next()` (`:32`). A throw from `jwt.verify`
is caught and answered `401 {"error":"Invalid token"}` (`:33-35`).

### FR-F001-009: Token issuance

`POST /api/auth/login` (`api-mock/server.js:273-293`) reads `email` and `password` from the body
(`:274-275`) and searches the in-memory `users` array for an exact match on both
(`:277`). On no match it returns `401 {"error":"Invalid credentials"}` (`:279-281`). On a match it
signs a JWT carrying `{ id, email, name, role }` (`:284`) with `JWT_SECRET` (`:285`) and
`{ expiresIn: '24h' }` (`:286`), then responds with `{ token, user }` where `user` carries
`id, name, email, department, role` (`:289-292`) — the stored `password` field is excluded.

### FR-F001-010: Server-side logout

`POST /api/auth/logout` (`api-mock/server.js:295-297`) responds
`{ message: 'Logged out successfully' }` (`:296`). It does not read the request, does not require
authentication, and does not invalidate anything.

### FR-F001-011: Current-user endpoint

`GET /api/auth/me` (`api-mock/server.js:299-305`) is guarded by `authMiddleware`, looks the caller
up by the `id` claim (`:300`), returns `404 {"error":"User not found"}` when absent (`:301-303`),
and otherwise returns the same five-field user shape as login (`:304`). No client code calls it.

### FR-F002-001: Application shell

`app/index.html` declares `ng-app="globalTravelApp"` on `<html>` (`:2`), a fixed inverse navbar
(`:18-33`) with a brand anchor to `#/dashboard` (`:21`) and five `ui-sref` links (`:25-29`), the
routed outlet (`:35-38`) offset by an inline `margin-top: 70px` (`:35`), and the notification area
(`:40-45`). Styling is Bootstrap 3.3.7 (`:12`), jQuery UI base theme (`:14`) and one project
stylesheet (`:15`). A favicon is inlined as a data URI (`:9`) with a comment recording that the
alternative is a 404 on every page load (`:7-8`).

### FR-F002-002: Routing

`$urlRouterProvider.otherwise('/login')` (`app/app.routes.js:10`). Seven states are declared:
`login` (`:13`), `dashboard` (`:27`), `flights` (`:32`), `hotels` (`:38`), `itinerary` (`:44`),
`travelRequest` (`:50`) and `expenses` (`:56`). The five feature states each name a `templateUrl`
and a `controller`; `login` and `dashboard` each carry an inline `template` string instead.

### FR-F003-001: Dashboard

The `dashboard` state (`app/app.routes.js:27-31`) declares `url: '/dashboard'` (`:28`), an inline
template listing the five feature links (`:29`) and `data: { requireAuth: true }` (`:30`). It
declares no controller and no scope, so it has no inputs, no outputs and no error handling.

### FR-F004-001: Notification bus

The run block initialises `$rootScope.notifications = []` (`app/app.js:41`) and registers
`$rootScope.$on('notification:add', ...)` (`:44`), pushing an object with `message` (`:46`),
`type: type || 'info'` (`:47`) and `timestamp: new Date()` (`:48`).

- **Input**: `(event, message, type)` — a broadcast from any controller.
- **Processing**: default the type, stamp the time, append.
- **Output**: a growing array rendered by `ng-if="notifications.length > 0"` and
  `ng-repeat="notif in notifications"` into `alert alert-{{notif.type}}` (`app/index.html:41-43`).
- **Error handling**: none. There is no de-duplication, no cap and no expiry.

### FR-F022-001: Profile read (defined, never invoked)

`UserService.getProfile()` (`app/services/user.service.js:14-19`) requests
`Restangular.one('users', 'me').get()` (`:15`), assigns the result to `$rootScope.currentUser`
(`:16`) and returns it (`:17`). The target route `GET /api/users/me` is not declared server-side,
and `UserService` is injected nowhere.

### FR-F022-002: Preferences update (defined, never invoked)

`UserService.updatePreferences(preferences)` (`app/services/user.service.js:26-28`) issues
`Restangular.one('users', 'me').customPUT({ preferences: preferences })` (`:27`). The target route
`PUT /api/users/me` is not declared server-side.

---

## Non-Functional Requirements

### NFR-F001-001: The token is the only durable session artefact

`localStorage` is written at one site (`app/services/auth.service.js:22`), removed at one site
(`:33`) and read at two (`:43` and `app/app.js:21`). Nothing else in `app/` touches browser storage.

### NFR-F001-002: Credentials travel and rest in plaintext

The login handler compares `u.password === password` against literal strings held in the seed array
(`api-mock/server.js:277`, `:43-44`). `api-mock/server.js` requires no hashing library
(`package.json` lists `express`, `cors`, `body-parser`, `jsonwebtoken` only). The base URL is
`http://` (`app/app.js:14`, `app/services/auth.service.js:18`).

### NFR-F001-003: The signing secret is a source-code literal

`var JWT_SECRET = 'globaltravel-secret-key-2024'` (`api-mock/server.js:13`). It is not read from
`process.env`. The port is likewise a literal, `var PORT = 3000` (`:12`).

### NFR-F001-004: Authorisation is authentication only

The token carries a `role` claim (`api-mock/server.js:284`) and the seed data contains both
`employee` and `manager` (`:43-44`), but no handler branches on `req.user.role` and no client code
reads `currentUser.role`. Per **Q-1**, the approval chain is informational, so no role check is
expected at this stage (`specs/adrs/adr-001-product-intent-decisions.md`).

### NFR-F001-005: Ownership is not evaluated

`authMiddleware` establishes *who* the caller is but no handler filters by it. Per **Q-7** every
collection is to be scoped to the authenticated user; today none is. This is stated identically in
the other five FRDs.

### NFR-F002-001: No build step is involved in loading the application

29 `<script>` tags load vendor and application code in a manually maintained order
(`app/index.html:48-86`). There is no bundler, no module system and no minification in the served
path; the Grunt `build` task exists (`package.json`) but the served entry point is the raw
`app/index.html`.

### NFR-F004-001: Notification volume is unbounded

`$rootScope.notifications` grows for the lifetime of the page. Twenty-four broadcast sites across
five controllers append to it and nothing removes an entry.

---

## Dependencies

| Dependency | Version | Used for | Where |
|------------|---------|----------|-------|
| AngularJS | 1.6.10 | `$rootScope`, `$http`, DI, run/config blocks | `bower.json`; `app/index.html:52` |
| UI-Router | 0.4.3 | states, `$stateChangeStart`, `$state.go`, `ui-sref`, `ui-view` | `bower.json`; `app/index.html:53` |
| Restangular | 1.6.1 | base URL, default headers, request interceptor | `app/app.js:13-28` |
| angular-ui-bootstrap | 2.5.4 | declared as a module dependency | `app/app.js:10` |
| Bootstrap CSS | 3.3.7 | navbar, alert classes | `app/index.html:12`, `:56` |
| jQuery | 2.2.4 | loaded first; used by the feature modules, not by this one | `app/index.html:48` |
| Express | 4.x | mock API host | `api-mock/server.js:6`, `:11` |
| jsonwebtoken | 9.x | `jwt.sign`, `jwt.verify` | `api-mock/server.js:9`, `:30`, `:283` |
| cors | 2.8.5 | permits the browser origin | `api-mock/server.js:7`, `:15` |
| body-parser | 1.20.x | JSON and urlencoded bodies | `api-mock/server.js:8`, `:16-17` |
| `AuthService` | — | consumed by `app/app.js:30` and `app/app.routes.js:16` | `app/services/auth.service.js` |

**Depended on by**: all five feature FRDs. Every feature state declares `requireAuth`; every
feature service is authorised by the interceptor; three feature controllers listen for `auth:login`
(`flight-search.controller.js:245`, `travel-request.controller.js:299`,
`expense.controller.js:330`); three read `$rootScope.currentUser`
(`itinerary.controller.js:147`, `travel-request.controller.js:172-173`,
`expense.controller.js:194`); all five broadcast `notification:add`.

---

## Current Implementation (Brownfield Extension)

### Files Involved

| File | Lines | Role |
|------|-------|------|
| `app/app.js` | 52 | Module declaration, Restangular config, auth interceptor, route guard, notification bus |
| `app/app.routes.js` | 63 | `otherwise`, seven states, the inline login controller |
| `app/services/auth.service.js` | 54 | `login`, `logout`, `isAuthenticated`, `getCurrentUser` |
| `app/services/user.service.js` | 30 | `getProfile`, `updatePreferences` — registered, never injected |
| `app/index.html` | 88 | Shell, navbar, `ui-view`, notification area, 30 script tags |
| `api-mock/server.js` | 23-36, 42-45, 273-305 | `authMiddleware`, seed users, three auth handlers |
| `specs/contracts/api/auth.yaml` | — | B1 extraction of the three handlers |

#### Not involved, despite proximity

| Asset | Registered at | Why it is not a dependency |
|-------|---------------|----------------------------|
| `app/services/api.service.js` | `:9` (`ApiService`) | Loaded by `app/index.html:64` and by Karma (`test/karma.conf.js:39`). Injected into nothing — every feature service calls `Restangular` directly. |
| `app/directives/date-picker.directive.js` | — | `gt-date-picker` appears in zero templates. |
| `app/directives/currency-input.directive.js` | — | `gt-currency-input` appears in zero templates. |
| `app/directives/approval-status.directive.js` | — | `gt-approval-status` appears in zero templates. |
| `app/filters/currency.filter.js` | — | `usdCurrency` appears in zero templates. |
| `app/filters/date-format.filter.js` | — | `gtDateFormat`, `gtTimeAgo`, `gtDuration` appear in zero templates. |
| `GET /api/auth/me` | `api-mock/server.js:299` | Declared and guarded, but no code in `app/` requests it. |
| `POST /api/auth/logout` | `api-mock/server.js:295` | Declared, but `AuthService.logout` never calls it. |

> The lab source table names `approval-status.directive.js` and `currency-input.directive.js` as
> sources for `frd-travel-request.md` and `frd-expense-reconciliation.md`. B1 verified, and this
> phase re-verified by grepping every `.html` under `app/` for `gt-`, that all three custom
> directives and all four custom filters are referenced by no template. Per the lab's own
> instruction this contradiction is flagged, not harmonised.

### Architecture Pattern

Two AngularJS lifecycle blocks and one service, with no component folder:

- **`.config`** (`app/app.js:13-29`) — runs at provider time. Sets the Restangular base URL and
  default headers, then registers the request interceptor. Nothing here can be injected with a
  runtime service.
- **`.run`** (`app/app.js:30-51`) — runs once after bootstrap, injected with `$rootScope`, `$state`
  and `AuthService`. Registers the route guard, seeds two `$rootScope` properties and registers the
  notification listener.
- **`AuthService`** — a `.service` (constructor-invoked), injected with `$http` and `$rootScope`
  (`app/services/auth.service.js:9`). Four methods assigned to `this`. `var self = this` is declared
  at `:10` and never read.
- **Inline controller** — the login controller is an array-annotated function literal inside the
  state definition (`app/app.routes.js:16-25`) rather than a named registration, so it cannot be
  targeted by a unit test through `$controller('...')`.

### Cross-module state

| Store | Written at | Read at | Survives reload |
|-------|-----------|---------|-----------------|
| `localStorage['authToken']` | `auth.service.js:22`; removed `:33` | `auth.service.js:43`, `app.js:21` | **Yes** |
| `$rootScope.currentUser` | `app.js:40` (`null`), `auth.service.js:23`, `:34` (`null`), `user.service.js:16` | `auth.service.js:51`, `itinerary.controller.js:147`, `travel-request.controller.js:172-173`, `expense.controller.js:194` | **No** |
| `$rootScope.notifications` | `app.js:41` (`[]`), pushed `:45` | `index.html:41-43` | **No** |

### `$rootScope` events

| Event | Broadcast at | Payload | Listeners |
|-------|-------------|---------|-----------|
| `auth:login` | `app/services/auth.service.js:24` | the user object from `response.data.user` | `flight-search.controller.js:245` (reads `user.preferences.cabinClass`), `travel-request.controller.js:299` (payload ignored), `expense.controller.js:330` (payload ignored) — each deregisters on `$destroy` |
| `auth:logout` | `app/services/auth.service.js:35` | none | **none** |
| `notification:add` | 24 sites across the five feature controllers | `(message, type)` | `app/app.js:44` — the only listener, registered in the run block and never deregistered |
| `$stateChangeStart` | UI-Router 0.4.3 | `(event, toState, toParams)` | `app/app.js:32` |

`itinerary:refresh` and `flight:selected` do not cross this module; they are documented in
`frd-itinerary.md` and `frd-flight-search.md`.

### API surface used

| Method | Path | Guarded | Client caller | Transport |
|--------|------|---------|---------------|-----------|
| `POST` | `/api/auth/login` | no | `app/services/auth.service.js:18` | `$http`, absolute literal URL |
| `POST` | `/api/auth/logout` | no | none | — |
| `GET` | `/api/auth/me` | yes | none | — |
| `GET` | `/api/users/me` | — | `app/services/user.service.js:15` | Restangular — **route not declared** |
| `PUT` | `/api/users/me` | — | `app/services/user.service.js:27` | Restangular — **route not declared** |

`POST /api/auth/login`, `POST /api/auth/logout` and `GET /api/airports` are the only three of the
36 handlers declared without `authMiddleware` (`specs/contracts/api/auth.yaml`).

### Seed users

| id | name | email | department | role |
|----|------|-------|------------|------|
| 1 | Sarah Johnson | `demo@globaltravel.com` | Engineering | `employee` |
| 2 | Mike Chen | `manager@globaltravel.com` | Engineering | `manager` |

`api-mock/server.js:42-45`. Both carry `password: 'password'`. The login controller hardcodes user 1
(`app/app.routes.js:20`), so user 2 is unreachable through the UI.

### Test Coverage

`test/karma.conf.js` loads `app/app.js` (`:37`), `app/app.routes.js` (`:38`) and
`app/services/**/*.js` (`:39`), so `AuthService`, `UserService` and `ApiService` are all present in
the test bundle. The spec glob is `test/spec/**/*.spec.js` (`:45`) and the single matching file is
`test/spec/flight-search.spec.js`, which exercises `FlightSearchController` only.

**Zero tests cover any behaviour in this FRD.** There is no spec for `AuthService`, no spec for the
route guard, no spec for the Restangular interceptor, no spec for the notification listener and no
spec for `UserService`. The login controller is inline (`app/app.routes.js:16`) and therefore not
addressable by name from a test.

### Known Limitations

Stated as behaviour, not as defects. Each is falsifiable against the cited lines.

1. **The authenticated check and the current-user lookup read different stores, and they disagree
   after a reload.** `isAuthenticated()` reads `localStorage` (`app/services/auth.service.js:43`);
   `getCurrentUser()` reads `$rootScope` (`:51`). `localStorage` persists across a page load;
   `$rootScope.currentUser` is reassigned to `null` by the run block on every bootstrap
   (`app/app.js:40`). After pressing F5 on `/expenses`: the token is still present, so the guard's
   `!AuthService.isAuthenticated()` is false (`app/app.js:33`) and the transition is admitted, but
   `$rootScope.currentUser` is `null`, so `expense.controller.js:194` writes `'Demo User'` instead
   of the signed-in name, `travel-request.controller.js:172-173` writes `'Demo User'` and
   `'demo@globaltravel.com'`, and `itinerary.controller.js:147` records a note author of `'You'`.
   Nothing rehydrates `$rootScope.currentUser` from the token: `GET /api/auth/me` exists
   (`api-mock/server.js:299`) and would supply it, but has no callers, and
   `UserService.getProfile()` sets it (`app/services/user.service.js:16`) but `UserService` is
   injected nowhere. The JSDoc above `getCurrentUser` states
   `Get current user from localStorage` (`app/services/auth.service.js:47`) while the body reads
   `$rootScope`.

2. **`auth:login` does not fire on a reload, and its payload is never usefully consumed.** It is
   broadcast only inside the resolved `login()` promise (`app/services/auth.service.js:24`). A
   reload restores the session from the token without calling `login()`, so its three listeners
   never run — `flight-search.controller.js:245`, `travel-request.controller.js:299` and
   `expense.controller.js:330`. The latter two take no payload argument and reload their own
   collections, which their constructors already do, so no screen appears empty. The first is the
   only payload consumer: `flight-search.controller.js:245-247` reads
   `_.get(user, 'preferences.cabinClass', 'economy')`. The object carried by the broadcast is
   `response.data.user`, which the login handler builds from `id, name, email, department, role`
   only (`api-mock/server.js:291`); no seeded user record carries a `preferences` field
   (`api-mock/server.js:43-44`) and no handler adds one, so that lookup path is always absent and
   `'economy'` is always applied. The event is therefore neither a reliable session-start signal nor
   a carrier of usable data.

3. **`AuthService.logout()` has no callers.** No `ng-click` binds to it, and the navbar
   (`app/index.html:24-30`) contains five feature links and no sign-out control. The only way to
   end a session is to clear browser storage manually.

4. **`auth:logout` has no listeners.** The broadcast at `app/services/auth.service.js:35` is
   received by nothing. Were `logout()` called, no screen would react.

5. **`POST /api/auth/logout` is never called.** The handler exists and is unauthenticated
   (`api-mock/server.js:295-297`), and its body is a single `res.json`. It does not read the request
   and does not invalidate the token. A token remains valid for its full 24 hours regardless of any
   client-side logout.

6. **Credentials are literals in the router.** `'demo@globaltravel.com'` and `'password'` are
   written into the login controller (`app/app.routes.js:20`). The login template declares no input
   elements (`app/app.routes.js:15`). The second seeded user (`api-mock/server.js:44`) cannot be
   selected from the UI.

7. **`login()` declares no `.catch`.** A 401 from `api-mock/server.js:280` rejects the promise; the
   `.then` in the login controller (`app/app.routes.js:21-23`) does not run, `$state.go('dashboard')`
   is skipped and the user remains on the login screen with no message. Because the credentials are
   hardcoded and match seed user 1, the running application does not reach this path.

8. **The guard tests token presence, not validity.** `!!localStorage.getItem('authToken')`
   (`app/services/auth.service.js:43`) is true for any non-empty string. An expired 24-hour token,
   or hand-written junk under that key, satisfies the guard at `app/app.js:33`. The user reaches the
   protected screen, and every subsequent API call is answered `401 {"error":"Invalid token"}` by
   `authMiddleware` (`api-mock/server.js:33-34`).

9. **There is no 401 response interceptor.** No `$httpProvider.interceptors` entry exists anywhere in
   `app/`, and the Restangular registration handles requests only (`app/app.js:20`). Each feature
   controller catches its own rejection and sets a local `errorMessage`, so an expired session
   surfaces as a per-screen "Failed to load…" string rather than a redirect to login.

10. **The API base URL is declared twice.** `RestangularProvider.setBaseUrl('http://localhost:3000/api')`
    (`app/app.js:14`) and the absolute literal in `AuthService.login`
    (`app/services/auth.service.js:18`). They are unrelated declarations; changing one does not
    change the other. Neither is read from configuration.

11. **`AuthService.login` bypasses Restangular, so the auth interceptor does not apply to it.** It
    uses `$http` directly (`app/services/auth.service.js:18`). The login route is unauthenticated
    server-side (`api-mock/server.js:273`), so no header is needed — but it also means the login
    request does not inherit the default `Content-Type` set at `app/app.js:15-17`.

12. **`var self = this` is assigned and never read** (`app/services/auth.service.js:10`). All four
    methods are attached to `this` directly and none of them closes over `self`.

13. **`UserService` is registered and loaded but injected nowhere.** Declared at
    `app/services/user.service.js:8`, loaded by `app/index.html:65` and by Karma
    (`test/karma.conf.js:39`). Grepping every file under `app/` for `UserService` returns only its
    own registration line.

14. **`UserService` targets two routes that are not declared.** `GET /api/users/me`
    (`app/services/user.service.js:15`) and `PUT /api/users/me` (`:27`). `api-mock/server.js`
    declares no `/api/users` route at any method; the current-user route it does declare is
    `GET /api/auth/me` (`:299`), which no client code calls. Because `UserService` has no callers,
    neither request is issued at runtime, so the mismatch produces no observable failure.

15. **`ApiService` is registered and loaded but injected nowhere.** Declared at
    `app/services/api.service.js:9` with five generic Restangular wrappers, loaded by
    `app/index.html:64`. Each feature service constructs its own Restangular endpoint instead.

16. **`GET /api/auth/me` returns a user but no token.** A client using it to rehydrate a session
    would recover the user object only; it would still hold whatever token it already had
    (`api-mock/server.js:299-305`).

17. **The dashboard state declares no controller** (`app/app.routes.js:27-31`). Its inline template
    (`:29`) duplicates the five links already present in the navbar (`app/index.html:25-29`).

18. **`otherwise('/login')` sends every unknown URL to login, including for an authenticated user**
    (`app/app.routes.js:10`). A signed-in user who mistypes a URL lands on the login screen; pressing
    the button re-authenticates and returns them to the dashboard, discarding the URL they wanted.

19. **The navbar brand link uses a single hash while the router uses the AngularJS 1.6 hashbang.**
    `app/index.html:21` hardcodes `href="#/dashboard"`. No `$locationProvider.hashPrefix()` or
    `html5Mode()` call exists anywhere in `app/`, so the AngularJS 1.6 default `'!'` prefix applies
    and routed URLs carry `#!`. The five `ui-sref` links (`app/index.html:25-29`) generate the
    correct form; the brand anchor does not.

20. **The notification array is unbounded and never pruned.** `$rootScope.notifications` is seeded
    once (`app/app.js:41`) and only ever pushed to (`:45`). There is no removal, no cap, no
    de-duplication and no timeout. `timestamp` is recorded (`:48`) and is not read by the template
    (`app/index.html:41-45`).

21. **Broadcasting `'error'` produces an unstyled alert.** The template interpolates the type into
    `alert alert-{{notif.type}}` (`app/index.html:42`). Bootstrap 3.3.7 defines `alert-success`,
    `alert-info`, `alert-warning` and `alert-danger`; it does not define `alert-error`. `'error'` is
    the type broadcast by every failure path in all five controllers, so failure notifications carry
    a class with no rule behind it.

22. **The `notification:add` listener is registered on `$rootScope` and never deregistered**
    (`app/app.js:44`). This is consistent with an application-lifetime bus, and it is one of two
    `$rootScope.$on` registrations in the codebase without a matching deregistration — the other is
    the route guard at `:32`. All five feature controllers deregister theirs on `$destroy`.

23. **The signing secret and the port are source-code literals** (`api-mock/server.js:13`, `:12`).
    Neither is read from `process.env`, so both are fixed at whatever is committed.

24. **Seeded passwords are plaintext and compared with `===`** (`api-mock/server.js:43-44`, `:277`).
    No hashing library is required by the server.

25. **`jwt.sign` specifies no algorithm** (`api-mock/server.js:283-287`); the `jsonwebtoken` default
    applies. `jwt.verify` likewise passes no `algorithms` option (`:30`).

26. **`authMiddleware` is applied per route, not mounted.** It is passed as the second argument to
    33 of 36 handlers. A handler added without it is unauthenticated by omission, and nothing
    reports that. There is no error-handling middleware and no 404 fallback in
    `api-mock/server.js`; the only `try/catch` in the file is inside `authMiddleware` (`:28-35`).

27. **The `role` claim is signed but never used.** It is placed in the token (`api-mock/server.js:284`)
    and returned in the user object (`:291`). No handler branches on `req.user.role`; no client code
    reads `currentUser.role`. Per **Q-1** this matches the intended product behaviour, so it is
    recorded as unused rather than missing.

28. **No test covers anything in this FRD.** The single spec file targets `FlightSearchController`.
    The login controller is inline (`app/app.routes.js:16`) and cannot be instantiated by name.

29. **The application loads as 29 unbundled script tags in a manually maintained order**
    (`app/index.html:48-86`), split into vendor (`:48-56`), app (`:59-60`), services (`:63-65`),
    components (`:68-77`), directives (`:80-82`) and filters (`:85-86`). Seven of those files —
   three directives, two filter files, `api.service.js` and `user.service.js` — register code that
    nothing consumes.

30. **Three inline comments label patterns as "legacy" or "anti-pattern"**
    (`app/app.js:31`, `:39`, `:43`), and two file headers do the same (`app/app.js:3`,
    `app/services/auth.service.js:3`). Two comments in the login controller
    (`app/app.routes.js:18-19`) explain a deliberate sequencing decision. No TODO, FIXME or HACK
    markers exist in any of these files.

### Integration Points

| Consumer | Depends on | Via |
|----------|-----------|-----|
| All five feature states | the route guard | `data: { requireAuth: true }` → `app/app.js:33` |
| All five feature services | the token | Restangular request interceptor, `app/app.js:20-28` |
| `FlightSearchController`, `TravelRequestController`, `ExpenseController` | `auth:login` | `$rootScope.$on` (`:245`, `:299`, `:330`), each deregistered on `$destroy` |
| `ItineraryController`, `TravelRequestController`, `ExpenseController` | `$rootScope.currentUser` | direct property read (`:147`, `:172-173`, `:194`) |
| All five controllers | `notification:add` | `$rootScope.$broadcast`, 24 sites |
| `app/index.html` | `$rootScope.notifications` | `ng-repeat` (`:42`) |
| Every guarded handler | `authMiddleware` | explicit second argument, `api-mock/server.js:23` |

---

## Traceability

| PRD Feature | Priority | Covered by |
|-------------|----------|-----------|
| F-001 Authentication & Session | P0 | US-F001-001 … US-F001-005; FR-F001-001 … FR-F001-011 |
| F-002 Application Shell & Navigation | P0 | US-F002-001; FR-F002-001, FR-F002-002 |
| F-003 Dashboard | P2 | US-F003-001; FR-F003-001; Known Limitations 17 |
| F-004 In-App Notifications | P1 | US-F004-001; FR-F004-001; Known Limitations 20, 21, 22 |
| F-022 User Profile & Preferences | P3 | FR-F022-001, FR-F022-002; Known Limitations 13, 14 |

Resolved product decisions that bound this FRD: **Q-1** — a manager is not an approver, so the
signed `role` claim having no consumer is intended, not missing. **Q-7** — every collection is to be
scoped to the authenticated user, which makes `req.user` the intended filter key at every guarded
handler (`specs/adrs/adr-001-product-intent-decisions.md`).

Open questions that touch this FRD: **Q-12** (production datastore, API base URL, deployment
target) is unresolved and blocks any deployment increment; the two hardcoded `http://localhost:3000`
literals (`app/app.js:14`, `app/services/auth.service.js:18`) and the literal `JWT_SECRET`
(`api-mock/server.js:13`) are all downstream of it.

---

> **Track B sections omitted deliberately.** `brownfield.testability` is still `null` in
> `.spec2cloud/state.json`; the testability gate has not run. Manual verification checklists and
> `@documentation-only` scenarios are added only if the gate selects Track B or Hybrid for this
> feature.
