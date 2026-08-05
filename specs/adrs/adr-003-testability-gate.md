# ADR-003 — Testability gate: the application is fully testable, adopt Track A

- **Status:** accepted
- **Date:** 2026-08-05
- **Phase:** B2 → B3 (Spec-Enable → Green Baseline), at the Testability Gate
- **Deciders:** product owner, orchestrator
- **Supersedes:** —
- **Depends on:** ADR-002 Q-11 (the failing Jasmine suite is stale and carries no authority)

## Context

The testability gate decides whether the brownfield pipeline generates **executable tests**
(Track A) or **structured behavioural documentation** (Track B) for `globaltravel-portal` v1.6.0.
The decision is binding: it sets the shape of every increment in Phase 2, because Track A verifies
at the gates automatically and Track B verifies by manual checklist.

The gate is scored against six questions. The governing rule for this ADR is that **no question is
answered from inspection** — each answer below is backed by output from actually running the
thing. Reading a file tells you what a developer wrote; running it tells you what the machine does.
Twice during this gate the two disagreed, and both times the run was right (see
*Corrections made during evidence gathering*).

**Threshold:** 5–6 → Track A (`full`) · 3–4 → Hybrid (`partial`) · 0–2 → Track B (`none`).

## Decision

**Score 6/6. Adopt Track A. `testability: "full"`.** All five feature modules
(`authentication`, `flight-search`, `hotel-booking`, `itinerary`, `travel-request`,
`expense-reconciliation`) are assigned to Track A.

The green baseline in B3 is captured from **observed runtime behaviour**, not from the existing
Jasmine suite, per ADR-002 Q-11.

## Evidence

| # | Question | Score | Evidence |
|---|----------|-------|----------|
| 1 | Builds and starts? | ✅ | `npm start` → both servers; `npm run build` → `dist/` (931 files) |
| 2 | Dependencies reachable / mockable? | ✅ | No external dependency exists to reach — 4 local packages, in-memory data |
| 3 | API exercisable? | ✅ | 200 public, 401 guarded, JWT login, 2 trips authenticated |
| 4 | UI renderable and driveable? | ✅ | Playwright completed a full search flow, 6 results, 0 console errors |
| 5 | Dev/test environment? | ✅ | `.devcontainer/` pins Node 22, Chromium and Playwright browsers |
| 6 | Test suite executable? | ✅ | Karma launched Chrome and reported 11 of 11 — **executable, and red** |

### Q1 — builds and starts ✅

`npm start` runs `concurrently` over `npm:api` and `npm:serve`:

```
[api] GlobalTravel Corp Mock API running on http://localhost:3000
[web] Started connect web server on http://localhost:8080
```

`npm run build` (`npm run clean && grunt build`):

```
Running "uglify:dist" (uglify) task
>> 1 file created 91.89 kB → 40.7 kB
Running "cssmin:target" (cssmin) task
>> 1 file created. 13.23 kB → 8.63 kB
Running "copy:main" (copy) task
Created 174 directories, copied 928 files
Done.
```

Result: `dist/` — 931 files, 18,139,911 bytes, containing `index.html`, `js/`, `css/`,
`components/`, `bower_components/`.

### Q2 — dependencies reachable ✅

This is the easiest ✅ on the sheet, because **there is no external dependency to reach**. The
mock API declares four runtime requires and nothing else (`api-mock/server.js:6-9`):

```js
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
```

A search across `api-mock/server.js` and `app/**/*.js` for
`mongodb|mysql|postgres|redis|axios|node-fetch|http.request|https.request` and for
URL/host/key/secret environment variables returned **zero matches**. All data is in-memory
JavaScript arrays seeded at boot — `users:42`, `airports:50`, `flights:80`, `hotels:112`,
`trips:142`, `travelRequests:175`, `expenseReports:222`.

Front-end dependencies are **vendored and committed**: `bower_components/` holds 10 packages
across 964 git-tracked files, so no network fetch is required to serve the app.

One consequence worth recording: `app/services/auth.service.js:18` hardcodes
`http://localhost:3000/api/auth/login`. That is why the app works with no configuration, and it is
a migration concern — but for testability it counts in our favour.

### Q3 — API exercisable ✅

Four real HTTP calls against the running server:

```
GET /api/airports?q=SFO          → HTTP 200
  [{"code":"SFO","name":"San Francisco International","city":"San Francisco"}]

GET /api/trips  (no token)       → HTTP 401  {"error": "Unauthorized"}

POST /api/auth/login             → user: Sarah Johnson <demo@globaltravel.com> role=employee
                                   token: eyJhbGciOiJIUzI1NiIsInR5cCI6...

GET /api/trips  (Bearer token)   → 2 trips
  trip-1  totalCost=2450  items=5
  trip-2  totalCost=1800  items=3
```

Both sides of the auth boundary are exercisable, and the guarded route returns real data. The
persisted `totalCost` values confirm the stored-vs-derived change recorded under ADR-001 Q-6.

### Q4 — UI renderable and driveable ✅

Driven with a real browser via the Playwright MCP server. Not inferred from `index.html`.

1. `http://localhost:8080` → redirected to `#!/login`.
2. The login screen contains exactly one control — `button "Enter Portal"`, captioned
   *"Mock login - click to enter"*. This is the Q-8 gap visible in the DOM.
3. Clicking it landed on **`#!/dashboard`**. *(Worth noting: the lab prompt anticipated
   `#!/flights`. The application goes to the dashboard. Recorded as observed.)*
4. Navigated to `#!/flights`, filled `From=SFO`, `To=JFK`, `Depart=12/15/2026`, submitted.
   The app correctly refused: **"Please select a return date for round trips."** — round trip is
   the default. Validation is reactive and observable.
5. Added `Return=12/20/2026`, dismissed the datepicker, submitted. The browser issued:

```
[GET] http://localhost:3000/api/flights?cabinClass=economy&departDate=2026-12-15
      &destination=JFK&origin=SFO&passengers=1&returnDate=2026-12-20&tripType=roundtrip
      => [200] OK
```

6. The page rendered **"Found 6 flights"** with airline, times, duration, stops and price per
   result (e.g. *American Airlines 3:30 PM SFO — 6h 42m Non-stop — 10:12 PM JFK — $230 per
   person*), plus a filter panel derived from the result set (Max Price `$630`; airlines American,
   JetBlue, Southwest, United).
7. Console: **0 errors**, 1 warning (moment.js deprecation, because `12/15/2026` is not ISO —
   the app still converted it to `2026-12-15` correctly, as the query string shows).

Screenshot: `specs/docs/testing/evidence/q4-flight-search-results.png`.

A complete user journey — authenticate, navigate, fill, validate, submit, receive, render — runs
end to end under browser automation. That is the definition of Track A viability.

### Q5 — dev/test environment ✅

`.devcontainer/devcontainer.json` pins the toolchain that makes the above reproducible:

- image `mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm`
- `CHROME_BIN=/usr/bin/chromium` — what Karma's launcher needs
- `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` — browsers pre-downloaded
- `runArgs: ["--shm-size=1g"]` — Docker's 64 MB default `/dev/shm` crashes Chromium mid-run under
  both Karma and Playwright; the comment in the file records this explicitly
- `forwardPorts: [3000, 8080, 35729, 5173, 4173]` — the last two already reserved for the React
  target
- a named volume for `node_modules` and a `post-create.sh` bootstrap

**Honest caveat:** this gate was executed on a **Windows host, outside the devcontainer**, and
every check above still passed (Karma reported `HeadlessChrome 150.0.0 (Windows 10.0.0)`). So the
environment requirement is satisfied by two independent paths, not one. That strengthens the score
rather than weakening it, but the devcontainer remains the supported path because it pins versions.

### Q6 — test suite executable ✅ (the one that is easy to score wrong)

`npm test` → `karma start test/karma.conf.js --single-run`:

```
HeadlessChrome 150.0.0 (Windows 10.0.0): Executed 11 of 11 (11 FAILED) ERROR (0.396 secs / 0.071 secs)
```

Individual results, with assertion-level errors and source lines:

```
FlightSearchController Initialization should initialize with empty results FAILED
    Error: No pending request to flush !
      at UserContext.<anonymous> (test/spec/flight-search.spec.js:50:20)
FlightSearchController Search Flights should search for flights with valid params FAILED
    Error: Unsatisfied requests: POST /\/api\/flights/
      at UserContext.<anonymous> (test/spec/flight-search.spec.js:34:18)
```

**This scores ✅, and the distinction matters.** *Executable* and *green* are different
properties, and the gate asks about the first:

- Karma **launched a browser** (`HeadlessChrome 150.0.0`).
- It **loaded and ran every spec** (`Executed 11 of 11`) and reported them individually.
- Each failure is an **assertion failure with a file and line number** — a test *result*.
- Exit code 1 is the correct response to a red suite.

A suite that is *not* executable fails differently: no browser binary, launcher timeout, `Executed
0 of 0`, or a config/module-resolution error before any spec runs. None of that happened.

ADR-002 Q-11 already ruled these 11 tests **stale**, with no authority over the baseline — which is
the written permission to score this ✅ without treating the red as a blocker.

The failure mode is itself corroborating evidence for that ruling. Ten of eleven fail with
`No pending request to flush !` — the controller issued **no HTTP request** where the test expected
one — and the outstanding expectation is `POST /api/flights`. But the browser run in Q4 showed the
shipped controller issuing **`GET /api/flights?...`**. Both routes exist server-side; the API boot
banner advertises `POST /api/flights` and `GET /api/flights/popular`, and the spec named
*"should load popular routes on init"* fails for the same reason. The server was built for a client
that was never written. That is drift between the tests and a planned redesign — not drift in the
app — and it confirms the baseline must come from observed behaviour.

## Testability constraints discovered

These do not lower the score; they are the conditions the Track A tests must be written under, and
they are cheaper to learn now than during B3.

### C-1 — Session identity does not survive a page reload

The gate prompt asked specifically whether the session survives a reload. It does not, and the
failure is asymmetric in a way that will silently corrupt tests.

After a genuine reload (verified with a `window.__beforeReload` sentinel that the reload cleared):

```
marker_gone_proves_real_reload : true
authToken_still_present        : true
rootScope_currentUser          : null
afterReload_url                : #!/dashboard   (guard still admits the user)
```

Mechanism, and there is no rehydration path anywhere in `app/`:

- `app/app.js:21` — the route guard tests only `localStorage.getItem('authToken')`, i.e. **token
  presence**, never validity or identity. So the guard passes.
- `app/app.js:40` — startup sets `$rootScope.currentUser = null`.
- `app/services/auth.service.js:23` — the **only** assignment to `currentUser`, and it runs only
  inside the login response handler.
- Zero network requests were recorded after the reload, confirming nothing re-fetched the user.

So the app is left **authenticated but anonymous**. The consumers do not fail — they substitute
hardcoded values:

| Location | Falls back to |
|----------|---------------|
| `app/components/travel-request/travel-request.controller.js:172-173` | `'Demo User'` / `'demo@globaltravel.com'` |
| `app/components/expense-reconciliation/expense.controller.js:194` | `'Demo User'` |
| `app/components/itinerary/itinerary.controller.js:147` | `'You'` |

**Consequence for Track A:** an e2e test that reloads mid-journey stays logged in but silently
changes the acting identity to a hardcoded fallback. Any assertion on traveller name, submitter or
comment author would then pass regardless of who logged in — a **false green**. Track A tests must
either avoid reloading within a journey, re-authenticate after any reload, or assert the fallback
identity deliberately. This is a genuine constraint on test design, and it is also a defect
candidate for the migration backlog.

### C-2 — The jQuery UI datepicker overlays the submit button

Clicking *Search Flights* immediately after filling a date fails: the open `#ui-datepicker-div`
intercepts pointer events, and Playwright retried until timeout with
`<span title="Saturday">Sa</span> from <div id="ui-datepicker-div"> subtree intercepts pointer
events`. Page Objects must dismiss the picker (Escape, or blur) before submitting.

### C-3 — Round trip is the default and requires a return date

Any flight-search fixture that sets only a departure date will hit the validation path, not the
search path.

### C-4 — The result count in the toast and the count in the list legitimately disagree

Visible in the Q4 screenshot: the toast reads **"Found 6 flights"** while the list header reads
**"4 flights found"** and renders four rows. This is not a rendering glitch, and it reproduces on
every search whose highest price is not on a step boundary.

Runtime state at that moment:

```
flights (from API)      : 6   prices 230, 382, 475, 533, 638, 642
filters.maxPrice        : 630
filteredFlights         : 4   prices 230, 382, 475, 533
toast                   : "Found 6 flights"
```

Mechanism:

- `flight-search.controller.js:116-117` sets `priceRange.max` to the dearest result (642) and then
  `filters.maxPrice = priceRange.max`.
- `flight-search.template.html:127-129` binds that model to
  `<input type="range" min="{{priceRange.min}}" max="{{priceRange.max}}" step="50">`. With
  `min=230` and `step=50` the representable values are 230, 280, … 630 — and 680 would exceed the
  max. **630 is therefore the highest value the control can hold**, so the range input snaps 642
  down to 630 and Angular writes the snapped value back through `ng-model`.
- `flight-search.controller.js:156` then filters on `price <= filters.maxPrice`, excluding the
  flights at 638 and 642.
- Meanwhile `flight-search.controller.js:120` broadcasts `'Found ' + results.length + ' flights'` —
  the **unfiltered** count.

So the slider silently hides the most expensive results the moment they arrive, and the toast
reports a number the user cannot see in the list.

**Consequence for Track A:** a green-baseline test must not assume the toast count and the rendered
row count agree — on this data set they differ by two. Both numbers are correct for what they
measure, so the scenario has to assert them separately and deliberately. This is also a defect
candidate for the migration backlog.

## Alternatives considered

An ADR with one option is a note, not a decision record. Two alternatives were genuinely available.

### Rejected — Track Hybrid (`testability: "partial"`)

The defensive choice: score the awkward items down, mark some modules Track B, keep optionality.

Rejected because **nothing in the evidence supports a partial score.** Hybrid exists for codebases
where some features cannot be exercised — an unreachable payment gateway, a module behind an
unavailable licence server. Here every module is served by the same self-contained in-memory API on
one port, reached by the same browser, on the same route table. There is no seam along which to
split the tracks; any assignment to Track B would be arbitrary.

It is also the **expensive** choice, not the safe one. Every module placed in Track B trades an
automated gate for a manual checklist that a human must run on every increment, for the entire
project — permanent recurring cost, bought to hedge a risk the evidence says is absent.

### Rejected — Track B (`testability: "none"`)

The only honest route to Track B would be scoring Q6 ❌ because the suite is red. That confuses
*executable* with *passing*: the harness launches a browser and reports 11 individual results, and
ADR-002 Q-11 already removed those tests' authority. Scoring Q6 ❌ would discard a fully
automatable application — one that just completed an end-to-end booking search under browser
automation — and replace it with manual verification. The evidence contradicts it outright.

## Consequences

- **B3 runs Track A** for all five modules: Gherkin capture (`capture-existing`) → test scaffolding
  (`green-baseline`) → green verification, one feature at a time, each with a human gate.
- The green baseline is captured from **observed runtime behaviour**. The 11 existing Jasmine tests
  are **preserved unmodified** and are **not** part of the baseline (ADR-002 Q-11). They stay red;
  that is expected and recorded, not a regression.
- Phase 2 uses the **full** pipeline — tests → contracts → implementation → verify — with automated
  gates. No manual verification checklists are required.
- Constraints **C-1 … C-4** are binding inputs to e2e generation and Page Object design.
- **C-1** is additionally logged as a defect candidate: the route guard and the identity lookup read
  from different places, so a reload yields an authenticated-but-anonymous session that degrades to
  hardcoded values instead of failing.
- **C-4** is additionally logged as a defect candidate: a `step="50"` range input cannot represent
  the maximum result price, so the default filter hides the dearest results on arrival while the
  toast still counts them.
- Per ADR-002 Q-12 there is no production deployment in this hackathon, so Phase 2 Step 4 runs in
  its local/verification form only.

## Corrections made during evidence gathering

Recorded because the gate's discipline is that a claim without output is not an answer, and twice
the first attempt produced a wrong answer that output caught.

1. **A hash navigation is not a reload.** The first reload probe navigated `#!/dashboard` →
   `#!/dashboard` and reported the session intact. It was a same-document hash change: the Angular
   app never restarted, and the recorded **zero network requests** exposed it. Re-run with
   `location.reload()` plus a sentinel, the real result was the opposite — `currentUser` was
   `null`. The initial finding would have hidden constraint C-1 entirely.
2. **The prediction from code reading was wrong in direction.** B1 had established the guard and
   the identity lookup read from different places, and the expectation carried into this gate was
   that the reload would fail *visibly*. It fails *invisibly* — the guard admits the user and the
   consumers substitute `'Demo User'`. Invisible failure is the more dangerous case for a test
   suite, and only the run revealed it.
3. **C-4 was found by looking at the screenshot, not by reading the page.** The accessibility
   snapshot reported "Found 6 flights" and the gate could have stopped there with a ✅. The captured
   image showed a list headed "4 flights found" two inches below that toast. The discrepancy was
   then confirmed against live scope state and traced to `step="50"` on the price slider.
