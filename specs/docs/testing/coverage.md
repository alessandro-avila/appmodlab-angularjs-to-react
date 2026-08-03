# Test Coverage — globaltravel-portal

> **Extraction output — Phase B1f.** Produced by the `test-discovery` skill from `test/`,
> `package.json` and an execution of the suite. This document records the tests that exist and
> what happens when they run. Where a comment, README or filename disagrees with the code, the
> code and the observed run are recorded. Where a fact cannot be determined from source it is
> recorded as **unknown** rather than inferred.

---

## Contents

- [Summary](#summary)
- [Test infrastructure](#test-infrastructure)
- [Test inventory](#test-inventory)
- [Execution evidence](#execution-evidence)
- [Failure analysis](#failure-analysis)
- [Coverage instrumentation](#coverage-instrumentation)
- [What is not covered](#what-is-not-covered)
- [Skipped, focused and pending tests](#skipped-focused-and-pending-tests)
- [Comments and filenames vs code](#comments-and-filenames-vs-code)
- [Not determinable from source](#not-determinable-from-source)

---

## Summary

| Metric | Value |
|--------|-------|
| Test frameworks present | 1 — Jasmine 2.99.1, run by Karma 1.7.1 |
| Test files | 1 — `test/spec/flight-search.spec.js` (248 lines) |
| Config files | 1 — `test/karma.conf.js` (75 lines) |
| `describe` blocks | 6 |
| `it` blocks | 11 |
| `expect` assertions | 24 |
| Tests skipped, focused or pending | **0** |
| Tests executed | 11 |
| Tests passing | **0** |
| Tests failing | **11** |
| Exit code | 1 |
| Coverage tooling configured | none |
| Coverage reports in repository | none |
| End-to-end tests | none |
| API / integration tests | none |

The suite is executable — the runner starts, the browser connects, all 11 tests run to completion.
Every one of them fails.

---

## Test infrastructure

### Frameworks and runners

| Component | Declared version | Resolved version | Evidence |
|-----------|-----------------|------------------|----------|
| Karma | `^1.7.1` | 1.7.1 | `package.json` devDependencies; banner line of the run: `Karma v1.7.1 server started` |
| karma-jasmine | `^1.1.2` | 1.1.2 | `package.json` devDependencies; `test/karma.conf.js:22` `frameworks: ['jasmine']` |
| karma-chrome-launcher | `^2.2.0` | 2.2.0 | `package.json` devDependencies; `test/karma.conf.js:62-67` |
| jasmine-core | `^2.8.0` | 2.99.1 | `package.json` devDependencies |
| angular-mocks | `1.6.10` (exact) | 1.6.10 | `bower.json` devDependencies; loaded at `test/karma.conf.js:34` |

There is no second test framework. No Mocha, no Jest, no Protractor, no Cypress, no Playwright, no
Selenium, no supertest — neither in `package.json` nor anywhere under `test/`.

### Invocation

| Route | Command | Source |
|-------|---------|--------|
| npm script | `npm test` → `karma start test/karma.conf.js --single-run` | `package.json` `scripts.test` |
| Direct | `npx karma start test/karma.conf.js --single-run` | — |

### Configuration — `test/karma.conf.js`

| Setting | Value | Line |
|---------|-------|------|
| `basePath` | `'../'` — paths resolve from the repository root, not from `test/` | 20 |
| `frameworks` | `['jasmine']` | 22 |
| `files` | 9 vendor scripts, 6 application globs, 1 spec glob | 24-46 |
| `exclude` | `[]` | 48 |
| `preprocessors` | `{}` — **empty** | 50 |
| `reporters` | `['progress']` | 52 |
| `port` | `9876` | 54 |
| `colors` | `true` | 56 |
| `logLevel` | `config.LOG_INFO` | 58 |
| `autoWatch` | `!process.env.CI` | 60 |
| `customLaunchers` | `ChromeHeadlessContainer` = `ChromeHeadless` + `--no-sandbox --disable-dev-shm-usage --disable-gpu` | 63-68 |
| `browsers` | `[inContainer ? 'ChromeHeadlessContainer' : 'ChromeHeadless']` | 70 |
| `singleRun` | `!!process.env.CI` | 72 |
| `concurrency` | `Infinity` | 74 |

`inContainer` is computed at `test/karma.conf.js:15-16` from `CODESPACES`, `REMOTE_CONTAINERS`,
`DEVCONTAINER`, `CI` or the existence of `/.dockerenv`. `fs` is required at `:5` for that check —
it is the file's only `require`.

### Files loaded into the browser

Vendor, `test/karma.conf.js:26-34`:

```
bower_components/jquery/dist/jquery.min.js
bower_components/jquery-ui/jquery-ui.min.js
bower_components/lodash/dist/lodash.min.js
bower_components/moment/min/moment.min.js
bower_components/angular/angular.min.js
bower_components/angular-ui-router/release/angular-ui-router.min.js
bower_components/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js
bower_components/restangular/dist/restangular.min.js
bower_components/angular-mocks/angular-mocks.js
```

Application, `:37-42`: `app/app.js`, `app/app.routes.js`, then the globs
`app/services/**/*.js`, `app/components/**/*.js`, `app/directives/**/*.js`, `app/filters/**/*.js`.

Specs, `:45`: `test/spec/**/*.spec.js`.

Two differences from what the browser loads at runtime, both read from source:

| Difference | Detail |
|------------|--------|
| `bootstrap.min.js` | loaded by `app/index.html:56`, **absent** from the Karma `files` array. No test exercises anything that needs it. |
| CSS | `app/index.html:12,14,15` loads three stylesheets; Karma loads none. No test asserts on styling. |
| `angular-mocks.js` | loaded by Karma at `:33`, **not** loaded by `app/index.html`. This is the expected split. |

The globs match every `.js` file under those four directories, so all 21 AngularJS registrations
are present in the browser when the suite runs. No HTML template is loaded — `.html` files are not
in the `files` array and no `ng-html2js` preprocessor is configured.

---

## Test inventory

One spec file. All 11 tests target a single controller, `FlightSearchController`.

| # | `describe` path | `it` | Line | `expect` count |
|---|-----------------|------|------|----------------|
| 1 | FlightSearchController › Initialization | should initialize with default search params | 48 | 4 |
| 2 | FlightSearchController › Initialization | should initialize with empty results | 58 | 2 |
| 3 | FlightSearchController › Initialization | should set loading to false after init | 66 | 1 |
| 4 | FlightSearchController › Initialization | should load popular routes on init | 73 | 2 |
| 5 | FlightSearchController › Search Flights | should validate required fields before searching | 126 | 2 |
| 6 | FlightSearchController › Search Flights | should search for flights with valid params | 139 | 3 |
| 7 | FlightSearchController › Search Flights | should handle search errors gracefully | 158 | 2 |
| 8 | FlightSearchController › Filters | should filter by airline | 177 | 2 |
| 9 | FlightSearchController › Filters | should filter by number of stops | 195 | 2 |
| 10 | FlightSearchController › Sorting | should sort flights by price | 215 | 2 |
| 11 | FlightSearchController › Flight Selection | should select a flight and broadcast event | 235 | 2 |

Shared setup:

| Hook | Line | Content |
|------|------|---------|
| `beforeEach(module(...))` | 14 | loads the `globalTravelApp` module |
| `beforeEach(inject(...))` | 16-31 | injects `$controller`, `$rootScope`, `$httpBackend`, `Restangular`; creates a child `$scope`; writes `authToken` to real `localStorage` (`:24`); registers `whenGET(/\/api\/flights\/popular/)` (`:27-30`) |
| `afterEach` | 33-37 | `verifyNoOutstandingExpectation()`, `verifyNoOutstandingRequest()`, removes `authToken` |
| `createController()` | 39-45 | instantiates `FlightSearchController` with `$scope` and `$rootScope` only |
| `beforeEach` (Search Flights) | 85-124 | builds a 3-element `mockFlights` fixture (`:86-123`) |

The `beforeEach` at `:16` writes to the browser's real `localStorage`, not a mock. The `afterEach`
at `:35` removes it, so the suite leaves no residue, but the tests are coupled to a real browser
API rather than an injected one.

`createController()` supplies only `$scope` and `$rootScope`. `FlightSearchController` declares
four dependencies — `$scope`, `$rootScope`, `$timeout`, `FlightSearchService`
(`app/components/flight-search/flight-search.controller.js`) — so `$timeout` and
`FlightSearchService` are resolved from the real injector. The service is the genuine
Restangular-backed implementation, with only the HTTP layer mocked.

---

## Execution evidence

Command run from the repository root, with `CHROME_BIN` pointing at the local Chrome executable:

```
npx karma start test/karma.conf.js --single-run
```

Result:

```
03 08 2026 17:11:03.980:INFO [karma]: Karma v1.7.1 server started at http://0.0.0.0:9876/
03 08 2026 17:11:04.020:INFO [launcher]: Starting browser ChromeHeadless
03 08 2026 17:11:07.298:INFO [HeadlessChrome 150.0.0 (Windows 10.0.0)]: Connected on socket ...
HeadlessChrome 150.0.0 (Windows 10.0.0): Executed 0 of 11 SUCCESS (0 secs / 0 secs)
...
HeadlessChrome 150.0.0 (Windows 10.0.0): Executed 11 of 11 (11 FAILED) ERROR (0.042 secs / 0.029 secs)
```

Exit code `1`. Every one of the 11 tests reported `FAILED`. Total execution time 0.042 s.

The run required `CHROME_BIN` to be set on this machine; `karma-chrome-launcher` locates Chrome
through that variable or the platform default. No `.env`, `.npmrc` or setup script in the
repository sets it — see [Not determinable from source](#not-determinable-from-source).

---

## Failure analysis

Two distinct errors account for all 11 failures.

### Error A — `No pending request to flush !` (11 occurrences, one per test)

```
Error: No pending request to flush !
    at $httpBackend.flush (bower_components/angular-mocks/angular-mocks.js:1856:41)
    at UserContext.<anonymous> (test/spec/flight-search.spec.js:50:20)
```

Reported at spec lines 50, 60, 68, 75, 128, 143, 162, 179, 197, 217 and 237 — the
`$httpBackend.flush()` call that follows `createController()` in every test.

Cause, traced to source: `FlightSearchController` issues no HTTP request when it is constructed.
Its constructor body assigns `$scope` state (`flight-search.controller.js:15-42`), registers two
`$watch` handlers (`:44-58`) and defines functions. The first call to `FlightSearchService` is
inside `$scope.searchFlights` (`:112`), which runs only on user action. With no request in flight,
`flush()` throws.

The `whenGET(/\/api\/flights\/popular/)` backend registered at `:27` is therefore never matched.
`whenGET` is a passive stub — unlike `expectPOST` it does not create an outstanding expectation, so
it produces no second error.

### Error B — `Unsatisfied requests: POST /\/api\/flights/` (2 occurrences)

```
Error: Unsatisfied requests: POST /\/api\/flights/
    at $httpBackend.verifyNoOutstandingExpectation (bower_components/angular-mocks/angular-mocks.js:1890:13)
    at UserContext.<anonymous> (test/spec/flight-search.spec.js:34:18)
```

Raised by the `afterEach` at `:34` for tests 6 and 7, the two that call
`$httpBackend.expectPOST(/\/api\/flights/)` (`:140` and `:159`).

Cause, traced to source: `FlightSearchService.search` issues a **GET**, not a POST —
`flightsEndpoint.getList(params)` at `app/components/flight-search/flight-search.service.js:19`,
resolving to `GET /api/flights` (`api-mock/server.js:328`). The expectation is never satisfied.
`api-mock/server.js` does declare `POST /api/flights` (`:333`), but no code in `app/` calls it.

### Assertions that do not match the implementation

Independently of the two errors above, four assertions target state the controller does not
produce. These would still fail if the `flush()` problem were resolved.

| # | Test | Assertion | Implementation | Source |
|---|------|-----------|----------------|--------|
| 4 | should load popular routes on init | `$scope.popularRoutes` is defined, length 2 (`:77-78`) | `$scope.popularRoutes` is never assigned anywhere in `app/`. `FlightSearchService.getPopularRoutes` exists (`flight-search.service.js:46`) but has no caller | `flight-search.controller.js` |
| 5 | should validate required fields | `$scope.errorMessage` contains `'origin'` (`:136`) | the message is `'Please enter origin and destination.'` — lower-case `origin` is present, so this assertion would hold | `flight-search.controller.js:133` |
| 8 | should filter by airline | sets `$scope.filters = { airlines: [...], stops: null, priceRange: {min, max} }` (`:187`) | the controller's shape is `{ maxPrice, stops, airline, departTimeRange }` — `airlines` (plural array) and `priceRange` do not exist, and `airline` is a single string | `flight-search.controller.js:34-39` |
| 9 | should filter by number of stops | sets `stops: 0` and expects 1 result (`:205`) | `applyFilters` compares `$scope.filters.stops !== 'any'` then `flight.stops <= maxStops` — the controller's sentinel is the string `'any'`, not `null`, and the comparison is `<=`, not `===` | `flight-search.controller.js:159-163` |

Test 10 (`should sort flights by price`) sets `$scope.flights` directly and calls `applyFilters()`,
which reads `$scope.filters.maxPrice`. Because the test never replaces `$scope.filters`, the
controller default of `5000` applies and all three fixtures survive the filter. The sort assertion
matches `_.orderBy` behaviour at `flight-search.controller.js:183`.

Test 11 spies on `$rootScope.$broadcast` and expects `('flight:selected', flight)`. The controller
broadcasts exactly that at `flight-search.controller.js:207`.

---

## Coverage instrumentation

| Question | Finding | Evidence |
|----------|---------|----------|
| Is a coverage preprocessor configured? | No | `test/karma.conf.js:50` is `preprocessors: {}` |
| Is a coverage package installed? | No | no `karma-coverage`, `istanbul`, `nyc`, `c8` or `babel-plugin-istanbul` in `package.json` |
| Is a coverage reporter configured? | No | `test/karma.conf.js:52` is `reporters: ['progress']` |
| Does a coverage report exist in the repository? | No | no `coverage/`, `.nyc_output/`, `lcov.info` or `clover.xml` anywhere in scope |
| Is there a coverage threshold or gate? | No | no `check-coverage`, no `coverageThreshold`, no CI workflow of any kind |

**No coverage percentage exists for this repository, and none can be produced without adding
tooling.** Any figure quoted elsewhere is not derived from an instrumented run — see
[Comments and filenames vs code](#comments-and-filenames-vs-code).

The mapping below is therefore stated as *which units are referenced by a test*, not as a
line- or branch-coverage figure.

---

## What is not covered

All 11 tests reference one controller. The following units are referenced by no test file.

### Controllers — 1 of 6 referenced

| Controller | Referenced by a test? |
|------------|----------------------|
| `FlightSearchController` | yes — all 11 tests |
| `HotelBookingController` | no |
| `ItineraryController` | no |
| `TravelRequestController` | no |
| `ExpenseController` | no |
| the inline anonymous controller on the `login` state (`app/app.routes.js:16-25`) | no |

### Services — 0 of 8 referenced directly

`AuthService`, `ApiService`, `UserService`, `FlightSearchService`, `HotelBookingService`,
`ItineraryService`, `TravelRequestService`, `ExpenseService`.

`FlightSearchService` is injected transitively when the controller is constructed, but no test
asserts on it and no test calls one of its methods directly. The other seven are loaded into the
browser by the `app/services/**` and `app/components/**` globs and are never touched.

Across the 8 services there are 44 methods. **1** is reached by the suite —
`FlightSearchService.search`, and only via `$scope.searchFlights()` in tests 6 and 7, both of which
fail before the assertion stage.

### Directives — 0 of 3 referenced

`gtApprovalStatus`, `gtCurrencyInput`, `gtDatePicker`. No test compiles an element, and no test
injects `$compile`.

### Filters — 0 of 4 referenced

`usdCurrency`, `gtDateFormat`, `gtTimeAgo`, `gtDuration`. No test injects `$filter`.

### Routing — 0 of 7 states referenced

No test injects `$state` or `$stateParams`, and no test exercises the `$stateChangeStart` guard at
`app/app.js:32-37`.

### Server — 0 of 36 route handlers referenced

`api-mock/server.js` is not in the Karma `files` array and could not be loaded there — it is a Node
module using `require`. No supertest, no HTTP client, no fixture harness exists. The 36 handlers,
the `authMiddleware` (`:23-35`), `generateFlights` (`:78`), `generateHotels` (`:110`) and
`generateId` (`:66`) are exercised by no automated test.

### Templates — 0 of 5 referenced

No `.html` file is in the Karma `files` array and no HTML preprocessor is configured, so no
template is compiled during the run.

### Other gaps

| Area | Status |
|------|--------|
| End-to-end / browser-driving tests | none — no Protractor, Cypress, Playwright or Selenium dependency or directory |
| API / integration tests | none — no supertest, no HTTP assertions against `api-mock/` |
| Contract tests | none |
| Accessibility tests | none |
| Visual regression tests | none |
| Performance tests | none |
| Test fixtures directory | none — the only fixture is the inline `mockFlights` array at `test/spec/flight-search.spec.js:86-123` |
| CI pipeline running the suite | none — no `.github/workflows/`, no `azure-pipelines.yml`, no `Jenkinsfile`, no `.gitlab-ci.yml` |

---

## Skipped, focused and pending tests

A scan for every skipping and focusing mechanism available in Jasmine and Karma:

```
xit(   xdescribe(   .skip(   .only(   fdescribe(   fit(   pending(
```

across `test/` returns **0 matches**. All 11 declared tests execute. The 11 failures are genuine
failures, not suppressed or excluded tests.

---

## Comments and filenames vs code

| Artefact | What it says | What the code and the run show |
|----------|--------------|-------------------------------|
| `test/spec/flight-search.spec.js:1-8` header, listing `Anti-patterns:` | — | a comment only. It describes no behaviour and changes none. The failures analysed above come from the executable statements, not from the practices the comment names |
| `test/karma.conf.js:2` comment `"Legacy test runner setup"` | — | a comment only |
| `README.md:55` "1 Karma spec file, 11 tests, **0% meaningful coverage**" | a measured coverage figure | the file and test counts are correct. No coverage tooling is configured (`test/karma.conf.js:50` is `preprocessors: {}`) and no coverage report exists in the repository, so **no coverage percentage has been measured**. The observable fact is that 11 of 11 tests fail, so no assertion currently passes |
| Test 4, `should load popular routes on init` (`:73`) | the controller loads popular routes on init | `$scope.popularRoutes` is assigned nowhere in `app/`, and the controller issues no request when constructed |
| Test 6, `should search for flights with valid params` (`:139`), expecting `POST` | the search is a POST | `FlightSearchService.search` calls `getList`, a **GET** (`flight-search.service.js:19`) |
| Tests 8 and 9, setting `$scope.filters = { airlines, stops, priceRange }` | that is the filter shape | the controller declares `{ maxPrice, stops, airline, departTimeRange }` (`flight-search.controller.js:34-39`) |
| Suite name `FlightSearchController` | the suite tests the controller in isolation | `createController()` (`:39`) supplies only `$scope` and `$rootScope`; `$timeout` and the real `FlightSearchService` are resolved from the injector, so the tests exercise the controller and its service together with only the HTTP layer faked |

---

## Not determinable from source

| Question | Status |
|----------|--------|
| Whether the suite ever passed | unknown — no CI history, no test report, no coverage artefact and no lockfile-adjacent record exists in the repository |
| Whether the spec was written against a different revision of the controller | unknown — the assertions describe a `popularRoutes` load, a POST search and a `{ airlines, priceRange }` filter shape that no source file in this repository implements. No source states whether the spec led the implementation or the implementation moved away from the spec |
| Intended coverage target | unknown — no threshold, no gate, no configuration expresses one |
| How `CHROME_BIN` is expected to be provided | unknown — `karma-chrome-launcher` needs Chrome discoverable; no `.env`, setup script, devcontainer definition or documentation in scope sets it. It was set manually to run the suite for this document |
| Whether `singleRun: !!process.env.CI` implies an intended CI system | unknown — the flag exists at `test/karma.conf.js:71`, alongside the `inContainer` detection at `:15-16`, but no CI configuration file exists anywhere in the repository |
| Intended test strategy for the API tier | unknown — `api-mock/server.js` has no test file, no test hook, no exported module surface (it calls `app.listen` at `:705` unconditionally) and no test dependency capable of driving it |
| Why only `FlightSearchController` has a spec | unknown — no source comment, no README statement and no configuration explains the choice |
