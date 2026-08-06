# Modernization Assessment — `globaltravel-portal` client

## Summary

- **Assessment depth:** **Level 3** (deep)
- **Scope:** the AngularJS client (`app/`) **only**. `api-mock/server.js` is explicitly out of scope
  per **ADR-005**, which keeps the server and its HTTP contract as the stable seam.
- **Total findings:** **34**
- **Critical:** 5 · **High:** 13 · **Medium:** 13 · **Low:** 3
- **Escalation triggered:** **yes, twice.** Level 1 returned 6 critical/high items (threshold is 5),
  auto-escalating to Level 2. Level 2 surfaced architectural concerns — no build step, no module
  system, global mutable state as the only cross-cutting mechanism — escalating to Level 3.
- **Code changed:** **none.** This is analysis only.

### What was measured, not assumed

Every number below comes from running a measurement over the source, not from reading it. The
per-module metric table, the 46 DOM-manipulation sites, the 95 lodash and 77 moment call sites, the
`track by` audit and the accessibility counts were all produced by scripted measurement against
`app/`. Two facts were verified against the running system (the rooms payload) and one against
upstream sources (AngularJS and Karma support status).

### Inputs carried in, not rediscovered

Per the brief, the following are **inputs** to this assessment. They are cited where they affect
scoring and are not re-derived:

| Input | Source |
|---|---|
| Four dead or trapped primary controls (itinerary status filter, itinerary Add Note, travel-request search, expense date range) | Track A green baseline, approved 2026-08-06 |
| Hotel booking cannot be completed through the UI | Track A green baseline |
| 235 scenarios / 1944 steps, all green; 15 are server-only | Track A green baseline |
| Product decisions Q-1…Q-12, SEAM-1…SEAM-5 | ADR-001, ADR-002 |
| Track A adopted, `testability: full` | ADR-003 |
| Modernize to React 19 / JavaScript, server survives | ADR-005 |
| The eight README "known legacy debt" entries | `README.md` §Known Legacy Debt |

**The README list is the floor.** All eight of its entries are confirmed below and carry a `README`
marker. **26 of the 34 findings are new to this assessment.**

---

## The client, measured

| Area | Controller | Service | Template | Total |
|---|---:|---:|---:|---:|
| flight-search | 224 | 69 | 260 | **553** |
| hotel-booking | 246 | 71 | 247 | **564** |
| itinerary | 204 | 94 | 218 | **516** |
| travel-request | 274 | 81 | 360 | **715** |
| expense-reconciliation | 295 | 103 | 383 | **781** |
| *shared* — `app.js` 49, `app.routes.js` 61, `index.html` 79, `style.css` 583 | | | | **772** |
| *dead per Q-10* — 3 directives (319), 2 filter files / 4 filter definitions (109), 2 services (84) | | | | **512** |
| **Client total** | | | | **4462** in 27 files |

Nine runtime dependencies load as global `<script>` tags from a committed `bower_components/`
(**964 tracked files**). There is **no build step for `app/`** and **no linter of any kind**.

### Per-module metrics

| Metric | flight-search | hotel-booking | itinerary | travel-request | expense |
|---|---:|---:|---:|---:|---:|
| `$scope` members assigned | 22 | 22 | 22 | 24 | **29** |
| `$scope.` references | 85 | 98 | 70 | 98 | **102** |
| `$rootScope` references | 11 | 10 | 11 | **14** | 13 |
| `$watch` / `$watchGroup` | 3 | 3 | 1 | **4** | 3 |
| `$timeout` | 1 | 1 | 1 | **3** | 2 |
| jQuery / DOM sites | **8** | 7 | 5 | 7 | 7 |
| jQuery UI datepickers | 2 | 2 | **0** | 2 | 2 |
| Bootstrap-modal-via-jQuery | 0 | 1 | 0 | 1 | 1 |
| lodash calls | 15 | 14 | 22 | 10 | **34** |
| moment calls | 10 | 12 | 19 | **20** | 14 |
| Functions | 32 | 37 | 33 | 37 | **54** |
| Max brace nesting | 7 | 7 | 6 | 7 | 7 |
| Template `ng-if` | 13 | 13 | 11 | 11 | **14** |
| **Template max `ng-if`/repeat depth** | 3 | 3 | **6** | 3 | 4 |
| Template `{{ }}` expressions | 29 | 34 | 38 | 42 | **44** |
| Template `ng-model` | 10 | 8 | 1 | **15** | 12 |
| Baseline scenarios | 25 | 25 | 32 | 45 | **57** |

---

## Findings by Category

Effort estimates are rough guidance for a single developer, not commitments.

### Dependencies

| # | Sev | Finding | Location | Remediation | Effort |
|---|---|---|---|---|---|
| D-1 | **Critical** | **AngularJS 1.6.10 is 4 years 7 months past end of life.** Google's LTS ended **31 December 2021**; no security patches are issued. Every one of the 27 client files depends on it. | `bower.json`, all of `app/` | Replace with React 19 (ADR-005) | the migration |
| D-2 | **Critical** | **Bower is the package manager.** Deprecated by its maintainers in 2017. `bower_components/` is committed — **964 tracked files**. No integrity checking, no lockfile semantics, no transitive resolution. | `bower.json`, `bower_components/` | Delete at the end of migration; npm + a bundler | 0.5d `README` |
| D-3 | **High** | **Restangular 1.6.1 is unmaintained** (last meaningful release 2017). It wraps `$http` with a fluent-collection abstraction that has no modern analogue, so its call sites cannot be mechanically translated. | `app/app.js:16-28`, all 5 services | `fetch` wrapper; re-express each service call explicitly | 1d |
| D-4 | **High** | **ui-router 0.4.3** — the 0.x line, superseded twice over. The route guard depends on `$stateChangeStart`, an event removed in 1.x. | `app/app.routes.js`, `app/app.js:32-38` | React router; re-express the guard | 1d |
| D-5 | **High** | **jQuery 2.2.4 (2016) and jQuery UI 1.12.1.** The 2.x line is end-of-life. jQuery UI is in maintenance-only status. Both are load-bearing, not incidental — see P-1. | `app/index.html`, 46 sites | Eliminate entirely | see P-1 `README` |
| D-6 | **High** | **Bootstrap 3.3.7 reached end of life in 2019.** Its JavaScript components (modal, collapse) *require* jQuery, so Bootstrap 3 and jQuery cannot be removed independently. | `app/index.html`, 3 modal sites | Decide at tech-stack-resolution; CSS may be carried forward per ADR-005 | 1–2d `README` |
| D-7 | **High** | **Karma 1.7.1 + Jasmine 2.8.0.** Karma was **deprecated by the Angular team in December 2023**. Karma is 5 majors behind; Jasmine 2.8 dates from 2017. The suite also loads `angular-mocks`, binding it to AngularJS permanently. | `package.json`, `test/karma.conf.js` | Retire with AngularJS — see ADR-008 | 0.5d |
| D-8 | **Medium** | **`ui.bootstrap` is declared and never used.** Zero `uib-*` directives, zero `$uibModal`. Exactly one line to remove — and its presence has been misleading readers into thinking modals are Angular-managed when they are raw jQuery. | `app/app.js:10` | Delete the line and the bower entry | 5min `README` |
| D-9 | **Medium** | **moment 2.18.1**, and the project is in maintenance mode by its own maintainers' declaration. **77 call sites.** Compounded by the format-less parsing warning the README documents. | 5 controllers + services | Native `Intl` / a modern date library, decided at tech-stack-resolution | 1–2d `README` |
| D-10 | **Medium** | **lodash 4.17.4 — 95 call sites**, the large majority (`map`, `filter`, `find`, `sumBy`, `groupBy`) replaceable by native JavaScript. `_.uniqueId` is the one genuinely stateful use (see P-6). | all controllers | Replace with native; no direct dependency in React | 1d |
| D-11 | **Medium** | **Grunt 1.0.4** with 6 contrib plugins, in maintenance mode. Produces `dist/` by concatenation and uglification only — **no source maps, no hashing, no cache-busting, no module resolution**. | `Gruntfile.js`, `package.json` | Replaced by the bundler chosen at tech-stack-resolution | included in shell |

### Patterns

| # | Sev | Finding | Location | Remediation | Effort |
|---|---|---|---|---|---|
| P-1 | **Critical** | **46 direct DOM-manipulation sites — the framework fighting the framework.** Not incidental jQuery: it owns validation display, modal visibility, animation, scroll position, and one widget's entire state. Falls into **7 distinct categories** (enumerated below), each needing a *category-level* decision, not 46 ad-hoc ones. | 5 controllers, 3 directives | See **ADR-007** | 3–5d total `README` |
| P-2 | **Critical** | **`ng-if` child-scope shadowing — 4 confirmed dead controls.** A non-dotted `ng-model`/`ng-click` inside an `ng-if` writes to a child scope; the controller never observes it, but `ng-class` reads the same shadowed copy so **the UI appears to respond**. *(Baseline input.)* | itinerary status filter + Add Note; travel-request alert; expense alert | Disappears by construction in React — but the controls then **start working**, which is **net-new behaviour needing new Gherkin** | per module |
| P-3 | **High** | **`initDatepickers` is duplicated verbatim across 4 controllers** — while `app/directives/date-picker.directive.js` (88 lines) exists *specifically to solve this* and has **zero consumers**. The abstraction was built and abandoned. | `flight-search:69`, `hotel-booking:70`, `travel-request:70`, `expense:57`; `date-picker.directive.js` | One React date component; the directive is deleted unported (Q-10) | 1d |
| P-4 | **High** | **8 manual `$scope.$apply()` calls** exist purely to drag jQuery events back into the digest cycle. Each is a latent `$digest already in progress` error. `expense.controller.js:256` is a **bare `$apply()`** with no guard. | 4 controllers + 2 directives | Vanishes with the digest cycle | included |
| P-5 | **High** | **`$rootScope` is the application's only cross-cutting state mechanism**, holding `currentUser` and an unbounded `notifications` array, with **24 `$broadcast` sites** and no ownership or teardown discipline. | `app/app.js:40`, `app/index.html:41-45`, 24 sites | Explicit React state/context with a defined owner | 1d (shell) |
| P-6 | **Medium** | **Client-generated identifiers.** `_.uniqueId('exp_')` mints expense line IDs in the browser; the counter **resets to `exp_1` on every page load**, so IDs are not unique across sessions. | `expense.controller.js:163` | Server-assigned IDs, or a UUID | 0.5d |
| P-7 | **Medium** | **`track by room.id` where rooms have no `id`.** Verified against the running API: `/api/hotels/h-1/rooms` returns 5 objects with keys `type, price, available, beds, maxGuests` — **no `id`**. All five track-keys are `undefined`, which is a duplicate-key set, so AngularJS throws `ngRepeat:dupes` and renders nothing. **This is the mechanism behind the baseline's "hotel booking cannot be completed".** | `hotel-booking.template.html:184` | React tolerates duplicate keys with a warning, so the table renders — see the hotel-booking scoring note | see scoring |
| P-8 | **Medium** | **No error path on authentication.** `AuthService.login` returns a `.then()` chain with **no rejection handler** (`auth.service.js:17-27`); a failed login rejects unhandled. Across all 5 feature services, `.then` appears 9 times and `.catch` **zero** times — every error path lives in controllers, and the services silently assume success. | `auth.service.js:17`, 5 `*.service.js` | Explicit error handling at the fetch wrapper | 0.5d |
| P-9 | **Medium** | **Business logic embedded in templates.** 187 inline `{{ }}` expressions across 5 templates (44 in expense alone), plus computed calls in bindings such as `getStars(hotel.rating)` invoked inside `ng-repeat`. | all 5 templates | Compute in the component, render values | per module |
| P-10 | **Medium** | **Validation state is stored in the DOM, not in the model.** `has-error` is added by jQuery selector and removed by a 3-second `.delay().queue()` chain — so the validity of a field is discoverable only by inspecting class names. | `flight-search:135`, `hotel-booking:97`, `expense:156` | React validation state | included |
| P-11 | **Medium** | **The `has-error` treatment is inconsistent across modules.** Three modules add-then-remove after 3s; **`travel-request.controller.js:204` adds it and never removes it**, so the destination field stays red until reload. *(Documented as FRD limitation 13; carried as an input.)* | `travel-request.controller.js:204` | Single consistent validation pattern | included |
| P-12 | **Low** | **Five near-identical Restangular service wrappers.** Each is a thin `getList`/`post`/`one().get()` shell (69–103 lines) differing mainly in the resource name and a decoration step. | 5 `*.service.js` | One fetch wrapper + per-feature modules | included in D-3 |

#### P-1 expanded — the 7 categories of DOM manipulation

| Cat | Pattern | Sites | Where |
|---|---|---:|---|
| 1 | **jQuery UI datepicker** bound to a DOM id, with `onSelect` → manual `$apply` | 8 | flight-search ×2, hotel-booking ×2, travel-request ×2, expense ×2 |
| 2 | **Bootstrap 3 modal shown imperatively** — `$('#x').modal('show')`; visibility lives in the DOM, not in `$scope` | 3 | hotel-booking:241, travel-request:246, expense:223 |
| 3 | **Scroll-into-view animation** — `$('html, body').animate({scrollTop: …})` | 4 | flight-search:205, hotel-booking:204, itinerary:84, travel-request:156 |
| 4 | **Show/hide + fade/slide**, competing with `ng-if`/`ng-show` for the same elements | 6 | expense:146, travel-request:139, itinerary:131/133, flight-search:104/126 |
| 5 | **Validation flash** — `addClass('has-error').delay(3000).queue(…)` | 4 | flight-search, hotel-booking, expense, travel-request *(asymmetric — P-11)* |
| 6 | **DOM as data source** — `$('#itinerary-details').clone()` to build a print view | 1 | itinerary:172 |
| 7 | **Imperative input trigger** — `$('#receiptFileInput').trigger('click')` | 1 | expense:248 |
| — | *(dead per Q-10)* direct `.css('transform')` loop driven by `.animate({dummy:1})` | 6 | `approval-status.directive.js:97-103` |

### Architecture

| # | Sev | Finding | Location | Remediation | Effort |
|---|---|---|---|---|---|
| A-1 | **Critical** | **There is no build step for the client and no module system.** `app/index.html` carries **20 hand-written `<script src>` tags** plus 9 bower globals, loaded serially. No imports, no exports, no tree-shaking, no source maps, no dependency graph — load order in an HTML file *is* the dependency graph. | `app/index.html` | The shell increment introduces a bundler (choice deferred to tech-stack-resolution) | 1–2d |
| A-2 | **High** | **No state management layer.** All state is `$scope` (component-local, two-way bound) or `$rootScope` (global, unguarded). There is no intermediate concept — no store, no service-held state, no cache. Data is refetched per controller instantiation. | all controllers | Explicit state ownership decided in the shell increment | 1d |
| A-3 | **High** | **The login controller is inline inside a route definition** (`app.routes.js:13-27`), so it has no name, cannot be injected, and cannot be unit tested. It also hardcodes the only credentials the UI can submit. | `app/app.routes.js:13-27` | A real component + the Q-8 credential form | see ADR-006 Inc-0 |
| A-4 | **High** | **No separation between HTTP transport and feature logic.** Each service builds its own Restangular chain and each controller owns its own error handling, so the auth header, base URL and failure policy are decided in five places. | 5 services, `app/app.js:16-28` | Single API client in the shell | included in D-3 |
| A-5 | **Medium** | **Configuration is compiled into source.** `http://localhost:3000` appears as a literal at **`app/app.js:14`** and **`app/services/auth.service.js:18`**. There is no environment mechanism of any kind. | 2 sites | Build-time environment config | 0.5d `README` |
| A-6 | **Medium** | **583 lines of unscoped global CSS** plus global Bootstrap 3. Selectors such as `.has-error` are shared across modules and are also written by jQuery at runtime, so styling and behaviour are coupled through class names. | `app/assets/css/style.css` | Scoped styling; ADR-005 carries Bootstrap forward initially | per module `README` |
| A-7 | **Medium** | **Routing state is hash-based** (`#!/expenses`). Every URL in the product, in the baseline's navigation steps and in any bookmark changes if real paths are adopted. | `app/app.routes.js` | Decided at tech-stack-resolution; flagged in ADR-005 | — |

### Testing

| # | Sev | Finding | Location | Remediation | Effort |
|---|---|---|---|---|---|
| T-1 | **High** | **The entire unit suite is bound to AngularJS and cannot survive the migration.** All 19 tests instantiate `FlightSearchController` through `$controller` with a mocked `$scope`, and the config loads `angular-mocks`. There is no framework-agnostic assertion in the suite. | `test/spec/flight-search.spec.js`, `test/karma.conf.js` | See **ADR-008** | 0.5d |
| T-2 | **Medium** | **Unit coverage exists for 1 of 6 feature areas.** flight-search has 19 tests; hotel-booking, itinerary, travel-request, expense and authentication have **zero**. | `test/spec/` | Unit tests authored per increment against the React implementation | per increment |
| T-3 | **Medium** | **No accessibility testing and no `data-testid` convention.** Zero `data-testid` attributes exist, so the baseline page objects had to select by role, text and DOM id — the most brittle option available. | all templates | Adopt `data-testid` in the React components | included |
| T-4 | *Asset* | **The 235-scenario green baseline is framework-agnostic and is the single most valuable artefact for this migration.** Scenarios are phrased in user language; the 15 server-only scenarios stay green throughout and act as a continuous invariant. | `specs/features/`, `tests/` | Preserve; re-point per ADR-005's three-way classification | — |

### DevOps / CI

| # | Sev | Finding | Location | Remediation | Effort |
|---|---|---|---|---|---|
| C-1 | **High** | **There is no CI pipeline.** No `.github/workflows/` directory exists. Nothing runs the 235-scenario baseline automatically, so the regression safety net depends entirely on a human remembering to run it. | repo root | A workflow running the unit suite + the baseline | 0.5d |
| C-2 | **High** | **No linter, no formatter, no `.editorconfig`.** No ESLint, JSHint, JSCS or Prettier configuration exists anywhere in the repository. | repo root | ESLint + Prettier in the shell increment | 0.5d |
| C-3 | **Medium** | **The build produces no cache-busting.** `grunt build` concatenates and uglifies to fixed filenames with no content hashing. | `Gruntfile.js` | Handled by the bundler | included |

### Documentation

| # | Sev | Finding | Location | Remediation | Effort |
|---|---|---|---|---|---|
| Doc-1 | **Medium** | **JSDoc has drifted from behaviour.** `getCurrentUser`'s doc comment says *"Get current user from localStorage"* while the body reads `$rootScope` (`auth.service.js:47-51`). Three directives carry doc comments describing anti-patterns as if they were features. | `app/services/auth.service.js:47`, 3 directives | Do not port comments; re-document from the specs | included |
| Doc-2 | **Low** | **No component-level documentation and no design system.** There is no inventory of shared UI patterns, though `style.css` and the templates clearly share several (status badges, cards, filter bars). | `app/` | Component inventory produced during increments | per increment |
| Doc-3 | *Asset* | `specs/` is comprehensive — PRD, 6 FRDs, 5 ADRs, extraction, contracts and the baseline. Documentation is a strength, not a debt. | `specs/` | — | — |

### Accessibility

| # | Sev | Finding | Location | Remediation | Effort |
|---|---|---|---|---|---|
| X-1 | **High** | **Zero ARIA attributes exist in the entire client.** Modals opened by jQuery receive no focus management, no `aria-modal` and no focus trap, so keyboard and screen-reader users cannot operate them. | all 6 HTML files | Accessible component primitives | 1–2d |
| X-2 | **Medium** | **34 of 45 `<label>` elements have no `for` attribute**, so most form controls have no programmatic label. Only 1 `alt` attribute exists across the client. | all templates | Associate labels during each increment | per increment |
| X-3 | **Low** | **Only 5 `role=` attributes exist**, all Bootstrap boilerplate on dialog markup rather than deliberate semantics. | templates | — | included |

---

## Module scoring — migration difficulty

Six FRD feature areas scored 1 (easy) to 5 (hard) across six dimensions. **Dimensions are weighted**,
because line count is the least predictive input and unexercised behaviour is among the most.

| Dimension | Weight | What it captures |
|---|:---:|---|
| **D1 Size** | ×1 | controller + service + template lines |
| **D2 State & logic** | ×1 | `$scope` members, `$watch`, lodash/moment density, function count |
| **D3 DOM entanglement** | **×2** | jQuery sites weighted by category — datepickers and modals cost more than a scroll call |
| **D4 Template complexity** | ×1 | `ng-if` depth, inline expressions, `ng-model` count, number of render modes |
| **D5 Behavioural change required** | **×2** | net-new + superseded behaviour mandated by ADR-001/002 and the dead controls |
| **D6 Unproven surface** | **×2** | how much of the module has **no** behavioural coverage, inverted from baseline confidence |

| Module | D1 | D2 | D3 | D4 | D5 | D6 | **Score** /45 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---:|
| flight-search | 2 | 3 | 3 | 3 | 3 | 1 | **22** |
| authentication + shell | 2 | 4 | 1 | 1 | 5 | 5 | **29** |
| travel-request | 4 | 4 | 4 | 4 | 3 | 2 | **30** |
| itinerary | 1 | 4 | 3 | 5 | 5 | 4 | **34** |
| hotel-booking | 2 | 3 | 4 | 3 | 4 | 5 | **34** |
| expense-reconciliation | 5 | 5 | 4 | 5 | 5 | 2 | **37** |

### Why each score

**flight-search — 22, the easiest.** Middle-of-the-road on every structural dimension and the only
module with an existing unit suite (19 tests). Its 25 baseline scenarios cover the full
search → filter → select → detail path with nothing bypassed. Two datepickers, an overlay fade and a
scroll animation are its only DOM entanglements — no modal. The one wrinkle is constraint **C-4**
(the price slider's `step=50` hides the two most expensive flights while the toast still counts
them), which is *superseded* behaviour, not a port.

**authentication + shell — 29, but its position is dictated by dependency, not score.** Structurally
trivial: a one-button login screen and 238 lines. It scores high entirely on **D5** and **D6**,
because almost everything about it is net-new — the Q-8 credential form, sign-out (which does not
exist anywhere today), a 401/session-expiry policy, Q-7's enforcement point, and repairing C-1 so
identity survives a reload. **51 baseline scenarios exist, but 15 are server-only and the remainder
describe a screen with one button**, so the client surface has essentially no reusable coverage.

**travel-request — 30.** The largest form in the product (15 `ng-model`, 373-line template), the most
`$watch` and `$timeout`, and a jQuery-driven modal. It scores *low* on D6 because its 45 baseline
scenarios are the most thorough in the suite with **zero UI bypasses** — the behaviour is very well
pinned. Its dead search box is a known input.

**itinerary — 34.** The smallest module by line count (516) and the hardest to reason about. It has
the **deepest template nesting in the product (`ng-if`/repeat depth 6)** and **two complete render
modes** (list and timeline) over the same data. 22 lodash and 19 moment calls do real work — day
grouping and date-window shaping. It carries the heaviest behavioural change of any feature module:
**Q-6 moves `Trip.totalCost` from stored to derived, which is an API-visible change**, SEAM-3 makes
it the consumer of both booking flows, and **two of its controls are dead and must be made to work**.
Its print path (`.clone()` of a DOM subtree) has no React analogue and was never captured by the
baseline.

**hotel-booking — 34, and the most under-estimated module in the product.** Structurally it is
flight-search's twin — similar size, similar search-and-filter shape. It scores **5 on D6**, the
worst in the product, for one reason: **the room table has never rendered.** `track by room.id`
against a payload with no `id` field (P-7) throws `ngRepeat:dupes` and blanks the table, so **room
selection and the entire booking completion path have never been exercised by a user or a test.**
React tolerates duplicate keys with a console warning, which means **migrating this module will
switch on a screen nobody has ever seen work.** That is not a free win — it is undiscovered scope
arriving at implementation time.

**expense-reconciliation — 37, the hardest.** Largest on every structural axis: 781 lines, 29 scope
members, 54 functions, 34 lodash calls, a 383-line template with 44 inline expressions. It also
absorbs the most product decisions — **Q-4** (client and server category vocabularies do not
intersect at all: 12 Title Case versus 5 lowercase), **Q-5** (`travelRequestId` linkage, which
requires travel-request to exist), **Q-9** (delete the six-value currency selector), **SEAM-4** (a
submitted report is stored as a draft), plus the trapped date-range filter and client-minted IDs.
Its 57 baseline scenarios are the largest in the suite and none bypass the UI, so the behaviour is at
least thoroughly pinned.

---

## Recommended migration order

Three principles, applied in this precedence:

1. **Hard dependencies first.** Nothing can be built before the shell. Itinerary consumes bookings
   (SEAM-3), so it must follow both producers. Expense links to travel requests (Q-5), so it must
   follow travel-request.
2. **Discover unknowns early.** A module whose behaviour has never been observed should be attempted
   while there is still slack to absorb the surprise — not last.
3. **Establish patterns on the best-covered module.** The first feature migrated should be the one
   where a mistake is caught fastest.

| # | Increment | Score | Rationale |
|---|---|---:|---|
| **0** | **Shell + authentication** | 29 | Hard prerequisite. Delivers the bundler, router, API client, auth interceptor, global state, navbar, notification area, the Q-8 credential form, sign-out and the 401 policy. **No feature migrated.** |
| **1** | **flight-search** | **22** | Lowest difficulty and the best-covered module (25 scenarios + the only 19 unit tests). Establishes the search → filter → results → detail pattern the whole product reuses. A stack mistake surfaces here, cheaply. |
| **2** | **hotel-booking** | 34 | Structural twin of flight-search, so pattern reuse peaks immediately after Inc-1 — **and it carries the product's largest unknown (P-7).** Principle 2 puts it early deliberately, against its score. Also SEAM-3 producer #2. |
| **3** | **itinerary** | 34 | Consumer of both booking flows; scheduling it directly after its producers lets SEAM-3 be verified end-to-end while that work is fresh. Carries the API-visible Q-6 change and two dead controls to bring to life. Closes the booking value chain. |
| **4** | **travel-request** | 30 | Opens the request/expense chain. Establishes the large-form, validation and modal patterns that expense then inherits. Exceptionally well pinned by 45 scenarios. |
| **5** | **expense-reconciliation** | **37** | Hardest module, most product decisions, and depends on travel-request for Q-5. Deliberately last, when every pattern it needs — form, modal, date control, table, filter bar — already exists and is proven. |

**Rejected orderings.** *Strict easiest-first* (flight-search → hotel-booking → itinerary →
travel-request → expense) is very close to the above and differs only in ignoring dependency
sequencing; it was not adopted because it happens to satisfy the dependencies by luck rather than by
construction. *Strict hardest-first* was rejected because it front-loads expense before the form and
modal patterns exist, guaranteeing rework. *Deferring hotel-booking to last* — which its
twin-of-flight-search structure superficially invites — was rejected under principle 2: it would push
the product's single largest unknown to the point of least remaining slack.

---

## Modernization Roadmap

```
Inc-0  Shell + auth ──┬─→ Inc-1 flight-search ──┐
                      │                          ├─→ Inc-3 itinerary   (SEAM-3 consumer, Q-6)
                      ├─→ Inc-2 hotel-booking ──┘
                      │
                      └─→ Inc-4 travel-request ──→ Inc-5 expense       (Q-5 linkage)
```

Cross-cutting work that must land in **Inc-0** because every later increment depends on it: the
bundler (A-1), the API client replacing Restangular (D-3, A-4), the router replacing ui-router
(D-4), global state ownership (P-5), environment configuration (A-5), ESLint/Prettier (C-2), CI
(C-1), and the date-control decision (P-3, D-9) since four of five modules need it immediately.

Deferred until after the migration and explicitly **not** scheduled here: the two server-side
security findings named in ADR-005, cloud-native work (blocked by Q-12), and performance profiling
(meaningless against code being deleted).

---

## Decision Points

Three decisions surfaced that are not already settled by ADR-005 and cannot be made implicitly
during implementation. Each has its own ADR.

| Decision | ADR | Why it cannot be deferred |
|---|---|---|
| Increment boundaries and migration order | **ADR-006** | Determines every subsequent increment; dependency ordering is not cheaply reversible |
| How the 46 DOM-manipulation sites are eliminated | **ADR-007** | Seven categories, each needing one decision rather than 46 ad-hoc ones; four of the seven must be resolved in Inc-0 |
| What happens to Karma, Jasmine and the 19 unit tests | **ADR-008** | The suite cannot survive AngularJS's removal; leaving it undecided means Inc-0 silently deletes tests |

**Deliberately not decided here.** Specific library selections — bundler, router, date control,
state library — remain deferred to `tech-stack-resolution` (Phase 1d), exactly as ADR-005 requires.
ADR-007 decides *categories and target patterns*, not package names. This assessment does not
pre-empt the tech-stack gate.

---

## Assessment scope note

`api-mock/server.js` was read and queried only to establish **client-side** consequences — for
example confirming that the rooms payload has no `id` field (P-7). No finding is raised against the
server and no server remediation is proposed. Per ADR-005 the server survives the migration; the
three server-side seams (SEAM-3, SEAM-4, SEAM-5) and the two server-side security items are tracked
in state and remain outside this assessment.
