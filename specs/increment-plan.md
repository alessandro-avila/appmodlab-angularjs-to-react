# Increment Plan — AngularJS 1.6 client → React

- **Phase:** P · Plan
- **Status:** proposed — awaiting the **Plan Review** human gate
- **Mode:** brownfield · Track A (`testability: full`, ADR-003)
- **Path:** Modernize (ADR-005)
- **Inputs:** `specs/assessment/modernization.md`, ADR-005, ADR-006, ADR-007, ADR-008, the six FRDs,
  `specs/features/*.feature` (the green baseline), `specs/contracts/api/`
- **Scope of this document:** increment sequence, per-increment **Gherkin delta** and **FRD delta**,
  and the constraints that bind them. **The target stack is deliberately not resolved here** — every
  technology reference is role-shaped and is handed to `tech-stack-resolution` in §13.

---

## How to read this plan

The increment list is the cheap part. The payload is §5–§11: for every increment, which
`@existing-behavior` scenarios are **affected**, which are **untouched**, and which are **new**.
Without that, Phase 2 has no red baseline and "implementation" degenerates into porting files.

Every scenario is classified using ADR-005's three-way scheme:

| Class | Meaning | What Phase 2 does with it |
|---|---|---|
| **PRESERVE** | Behaviour is identical. The scenario re-points at the React route and must pass **unchanged in substance**. | Only navigation and selectors may change (§2.4). |
| **SUPERSEDE** | The scenario encodes behaviour a recorded decision changes. Rewritten in place, `@existing-behavior` swapped for the increment tag, **with the authorising ADR named in the scenario**. Never silently deleted. | Becomes a *red* test at the start of the increment. |
| **NET-NEW** | No baseline exists because the behaviour does not exist yet. | New Gherkin through the Step 1b gate. |

> A scenario with no authorising decision is **PRESERVE**, even when it pins something ugly.
> §12 lists every ugly thing this plan is therefore committed to reproducing, so the gate can
> authorise more if it wants to. Silently improving a scenario is the failure mode this rule exists
> to prevent.

---

## 0. Figures re-derived from source

Every number this plan relies on was re-measured against the working tree, not quoted. Three inputs
did not survive re-measurement.

### 0.1 Where the assessment disagrees with itself

`specs/assessment/modernization.md` §Summary claims **34 findings — 5 critical, 13 high, 13 medium,
3 low**. Counting the finding tables in the same document:

| Severity | Summary block claims | Counted from the tables | Rows |
|---|---:|---:|---|
| Critical | 5 | **5** ✓ | D-1, D-2, P-1, P-2, A-1 |
| High | 13 | **15** ✗ | D-3…D-7, P-3…P-5, A-2…A-4, T-1, C-1, C-2, X-1 |
| Medium | 13 | **18** ✗ | D-8…D-11, P-6…P-11, A-5…A-7, T-2, T-3, C-3, Doc-1, X-2 |
| Low | 3 | **3** ✓ | P-12, Doc-2, X-3 |
| *Asset* (no severity) | — | **2** | T-4, Doc-3 |
| **Total** | **34** | **41 severity-bearing (43 rows)** | |

`.spec2cloud/state.json` carries the same 34/5/13/13/3 figures, while its own category breakdown
(`dependencies=11; patterns=12; architecture=7; testing=4; devops=3; documentation=3;
accessibility=3`) sums to **43**. The tables are right; the summary block is stale.

**Effect on this plan:** none. No increment is scoped by a finding count. Recorded so the gate does
not inherit the error, and so §13 can hand the correction back.

> Note also a name collision worth avoiding in review: **C-1/C-2** are DevOps findings in the
> assessment (no CI, no linter) *and* testability constraints in ADR-003 (identity does not survive
> reload; the open datepicker blocks submit). This plan always qualifies them.

### 0.2 Two figures carried from ADR-005 rather than measured

| Figure | ADR-005 / assessment | Re-measured | Verdict |
|---|---|---|---|
| `$rootScope.$broadcast` sites | **24** (ADR-005 lines 62, 115 → assessment P-5) | **29** | ✗ 24 is the `notification:add` subset alone. See §0.4. |
| `app/` size | **27 files / 4462 lines** (ADR-005 `clientFate`, split 2332 js + 1547 html + 583 css) | **27 files ✓ / 4925 physical lines** (2619 js + 1607 html + 699 css); **4458 non-blank** | ~ file count correct; the line figure is *non-blank* lines, not lines, and is 4 short on JS |

**Effect on this plan:** the `$broadcast` correction matters. The store-mapping work in Inc-0 must
cover **five distinct events across 29 emit sites**, not 24 sites of one event. §0.4 enumerates
them, and three of the five turn out to be dead — which changes the plan (§7, §2.4).

### 0.3 The green baseline, counted

Parsed from `specs/features/*.feature` with `Scenario Outline` expanded over its `Examples` rows:

| Feature file | Authored blocks | Outlines | **Expanded scenarios** | Browser-driving | API-only |
|---|---:|---:|---:|---:|---:|
| `flight-search.feature` | 23 | 1 | **25** | 25 | 0 |
| `hotel-booking.feature` | 25 | 0 | **25** | 25 | 0 |
| `itinerary.feature` | 30 | 1 | **32** | 32 | 0 |
| `travel-request.feature` | 37 | 3 | **45** | 45 | 0 |
| `expense-reconciliation.feature` | 54 | 2 | **57** | 57 | 0 |
| `authentication.feature` | 35 | 5 | **51** | 36 | **15** |
| **Total** | **204** | **12** | **235** | **220** | **15** |

`@existing-behavior` is a **feature-level** tag — one per file, inherited by all 235. Scenario-level
tags: `@unauthenticated` 22, `@mutates-fixture` 15, `@bypasses-ui` 4.

**The 15 API-only scenarios were derived, not quoted.** Every step of every scenario (including
`Background:`) was resolved against `tests/steps/*.js` and the definition body inspected for browser
use. All 15 sit in `authentication.feature` under *"The server's side of the bargain"*. That section
holds 16 expanded scenarios; the sixteenth — *"The server can identify the holder of a token"*
(`authentication.feature:274`) — boots the legacy client to obtain the token, so it is
browser-driving. The five expense "seams" scenarios read as server-only but inherit a `Background:`
that opens the page, so they are browser-driving too.

**This 15 is the number §1 rests on.** It is the part of the baseline that is indifferent to which
stack owns the client.

### 0.4 The `$rootScope` event bus, enumerated

29 `$broadcast` sites, 15 `$on` registrations of which **8 are `$destroy` cleanups**, leaving
**7 real listeners**. Five custom events:

| Event | Emits | Listeners | Alive together? | Status today |
|---|---:|---|---|---|
| `notification:add` | 24 | `app/app.js:44` (on `$rootScope`) | always | **works** |
| `auth:login` | 1 (`auth.service.js:24`) | flight-search:245, travel-request:299, expense:330 | never — emitted on the login route, listeners live on feature routes | **never delivered** |
| `auth:logout` | 1 (`auth.service.js:35`) | **none** | — | **dead in both directions** |
| `flight:selected` | 1 (`flight-search.controller.js:207`) | hotel-booking:266 | never | **never delivered** |
| `itinerary:refresh` | 2 (flight-search:221, hotel-booking:238) | itinerary:223 | never | **never delivered** |

The mechanism is `app/index.html:37` — a **single `<div ui-view>`**. ui-router destroys the outgoing
state's controller before instantiating the incoming one, so no two feature controllers are ever
alive at the same time. Only the `$rootScope`-level listener in `app.js` can hear anything.

The baseline already pins three of these as non-functional:

- `hotel-booking.feature:209` — *"Selecting a flight does not carry the destination over to hotels"*
- `itinerary.feature:240` — *"A booked flight never reaches the itinerary"*
- `authentication.feature:138` — *"Nothing is listening for a sign-out announcement"*

This is the evidence base for §2.4 and §7.

### 0.5 Everything else this plan cites

| Fact | Measured |
|---|---|
| `app/` inventory | 27 files: 20 js (2619 lines), 6 html (1607), 1 css (699) = **4925** |
| Q-10 dead files | 7 files, **561 lines**: 3 directives (348), 2 filters (122), 2 services (91) |
| ui-router states | **7** (`login, dashboard, flights, hotels, itinerary, travelRequest, expenses`) |
| `<script src>` tags in `app/index.html` | **20 app** + **9 bower** = 29, loaded serially |
| bower runtime dependencies | **9** (+ `angular-mocks` dev) |
| `bower_components/` tracked files | **964** across 10 directories |
| jQuery UI datepicker init sites | **8 live** (2 each in flight-search, hotel-booking, travel-request, expense) + 4 in the abandoned `date-picker.directive.js` |
| jQuery `$(` sites | **40** — 34 in live files, 6 in Q-10 dead files |
| lodash call sites | **95** |
| moment call sites | **79** — 76 live, 3 in dead files |
| `/api/hotels/:id/rooms` payload | **5 objects**, keys `type, price, available, beds, maxGuests` — **no `id`**; consumed by `hotel-booking.template.html:184` as `track by room.id` |
| Legacy unit suite | **19 `it()`** in 7 `describe()`, one 416-line spec, **0 skip markers** |
| Baseline harness | 6 page objects, 6 step files; **7** hardcoded `http://localhost:8080` literals and **14** `#!/` literals outside `world.js` |

### 0.6 The baseline is **not** green today, and the reason changes Inc-0

The plan's central invariant (§2.2) is *"all 235 scenarios pass after every increment"*. Before
relying on it, this plan ran it. The result:

```
235 scenarios (189 passed, 46 failed)
1944 steps (1781 passed, 117 skipped, 46 failed)
32m 2.631s
```

`git diff -- app/` and `git diff -- api-mock/` are both **0 lines**. Not one line of application
source has changed since the baseline was approved at 235/235 on 2026-08-06. **The suite decayed on
its own.**

**Root cause, proven by execution rather than inferred.** Driving a real browser against the running
app on the current system date (2026-08-23):

```
system date        : 2026-08-23
calendar shows     : August 2026
selectable days    : 23 24 25 26 27 28 29 30 31
unselectable days  : 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22
```

The jQuery UI datepickers are configured `minDate: 0` (departure, check-in, expense date) and
`minDate: 1` (return, check-out), so every past day of the current month renders as
`td.ui-datepicker-unselectable` with no `<a>` inside. The baseline hard-codes **absolute** dates in
August 2026 — `10`, `12`, `13`, `15`, `20`, `21`, `25`, `26` — across both the feature files and the
step definitions (`hotel-booking.steps.js` `DEFAULT_CHECK_IN`, `itinerary.steps.js:396`
`08/15/2026` and `08/20/2026`). On 2026-08-06 all eight were in the future and selectable. Today
five are in the past:

| Day the baseline asks for | 10 | 12 | 13 | 15 | 20 | 21 | 25 | 26 |
|---|---|---|---|---|---|---|---|---|
| Selectable on 2026-08-23 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |

`tests/pages/*.page.js`'s `pickDate` then waits 30 s for a locator that will never appear, and the
scenario fails. Every one of the 46 failures carries the identical signature:
`locator.dispatchEvent: Timeout 30000ms exceeded … waiting for locator('#ui-datepicker-div')`.

### The fix: pin the clock, do not rewrite the fixtures

Two repairs are available, and they are not equivalent.

**Rejected — relative dates.** Deriving each date from the run date reads like the obvious fix, but
it edits **assertions**, not just inputs. `flight-search.feature:76` asserts *"the return date becomes
`08/26/2026`"*; `flight-search.feature:93` asserts the field reads *"Tue Aug 25 2026"*;
`hotel-booking.feature:48` and `:67` assert specific rendered dates. A relative-date repair rewrites
those `Then` literals, which is exactly the kind of baseline edit ADR-008 §7 exists to prevent, and
it would make Inc-0's *"no feature file changes"* proof unavailable.

**Chosen — pin the suite clock.** Playwright's Clock API is available in the installed version
(1.63.0-alpha) and was verified against the running application:

```
browser clock pinned to : 2026-08-06        (ctx.clock.install({ time: … }) in tests/support/hooks.js)
calendar shows          : August 2026
selectable days         : 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31
  day 10 -> SELECTABLE      day 15 -> SELECTABLE      day 25 -> SELECTABLE
  day 12 -> SELECTABLE      day 20 -> SELECTABLE      day 26 -> SELECTABLE
  day 13 -> SELECTABLE      day 21 -> SELECTABLE
```

Every day the baseline asks for is restored. The change is **one file** —
`tests/support/hooks.js` — and **zero** feature files, zero step definitions, zero assertions. The
suite becomes deterministic rather than merely un-stuck: it will give the same answer in 2027 as it
does today, which relative dates would not guarantee (they drift into different weekdays, month
boundaries and `minDate` edges).

**Why this matters to the plan, not just to the harness:**

1. **§2.2 is currently unenforceable.** "All 235 green" cannot be an increment gate while 46 fail for
   reasons unrelated to any increment. Inc-0 must repair this *before* it can prove its own zero
   delta, which makes it the **first** thing Inc-0 does, not a cleanup at the end.
2. **It is a harness defect, not a behaviour change.** The application behaves exactly as it did on
   2026-08-06; `minDate: 0` is correct and intentional. With the pinned clock, no scenario is edited
   at all, so ADR-008 §7 is not engaged and Inc-0's Gherkin delta stays a true `0 / 235 / 0`.
3. **The pinned clock is itself a decision with consequences.** A frozen clock means the suite stops
   exercising "today"-relative behaviour — `daysUntil`, `daysSinceSubmission`, *"this month's
   spending"* (`expense-reconciliation.feature:61`), and the trip-status recomputation
   (`itinerary.feature:46`) are all clock-dependent. Those scenarios currently pass *because* the
   fixtures are stale relative to now; pinning to 2026-08-06 restores exactly the world they were
   authored against. This must be stated at the gate, not assumed.
4. **It is the second time date handling has cost this project something**, which is independent
   support for ADR-009 (§11.1) being a real decision rather than a tidy-up.

Inc-0 scope, verification and exit criteria (§4) carry this as a first-class task. Until it is done,
**the true green figure is 189/235**, and this plan says so rather than quoting the approved 235.

---

## 1. How incrementality survives with no in-page bridge

ADR-005 rejected the strangler-fig bridge and recorded the consequence in its own words: *"The
AngularJS app and the React app coexist **in the repository** (not in one page) until the final
increment."* Nothing mounts React inside an AngularJS template. No `$rootScope` value is proxied
into React state. No dual router reconciles hash URLs with real paths.

Incrementality is therefore not achieved inside the page. It is achieved by **four separate
mechanisms**, and each has to be built or protected explicitly.

### 1.1 The seam is the HTTP API, and it does not move

`api-mock/server.js` survives (ADR-005). `specs/contracts/api/` already documents it. Whichever
client owns a route, it talks to the same 36 operations with the same JWT. A migrated module is not
integrating with an unmigrated one — both integrate with the server, which is the only shared
runtime object in the system.

This is why the migration is decomposable at all. The five feature modules have **no client-side
runtime coupling that works** (§0.4): every cross-module event is undelivered today. There is
nothing to bridge because nothing currently crosses.

### 1.2 One origin, two documents, never co-rendered

The two clients must share a browser origin, because the JWT lives in `localStorage` and
`localStorage` is origin-scoped. If React were served from a second port, a user signed in on the
AngularJS side would arrive at a React route as a stranger — and the plan would need either a token
hand-off (a bridge by another name) or a duplicate login screen in Inc-0 (a migrated feature in the
walking skeleton). Both are excluded.

So: **one front door on one origin**, holding a route ledger.

| Request path | Document served | Owner |
|---|---|---|
| `/` and `/#!/…` | `app/index.html` | AngularJS — login, dashboard, and every unmigrated module |
| `/assets/*`, `/components/*`, `/bower_components/*` | legacy static | AngularJS |
| a migrated module's path | the React document | React |
| React bundle assets | React | React |

Exactly one document answers any given URL. The two never co-render. Crossing between them is a
**full document navigation** — an ordinary `href`, not client-side routing — which is precisely why
no bridge is needed: the outgoing app is torn down by the browser before the incoming one boots.
Shared state survives the crossing only through `localStorage` (the JWT) and the server.

> **This forces the routing decision earlier than the assessment assumed.** Finding A-7 filed
> hash-vs-real-paths as a tech-stack preference. It is not. A front door can only route on the
> **path**; the fragment (`#!/flights`) is never sent to the server. AngularJS expresses all 7 states
> as fragments under the single path `/`. Therefore React routes must be real paths for route
> ownership to be expressible at all. §13 hands this to `tech-stack-resolution` as a **constraint,
> not a preference** — the plan does not choose the router, but it does record that hash-shaped
> React routes make the plan unbuildable.

Which component plays the front door — a bundler dev server proxying unmatched paths to the legacy
static server, or a thin reverse proxy in front of both — is a Phase 1d decision. The plan requires
only that **exactly one origin exists** and that the ledger is data, not scattered conditionals.

### 1.3 The route ledger is the unit of progress

An increment is *"one row of the ledger moves from AngularJS to React"*. That is what makes each
increment independently reviewable, independently revertible (flip the row back), and independently
verifiable (the module's scenarios run against whichever document now answers).

Route ownership by increment:

| Route | Inc-0 | Inc-1 | Inc-2 | Inc-3 | Inc-4 | Inc-5 | Inc-6 |
|---|---|---|---|---|---|---|---|
| `/` login + dashboard | NG | NG | NG | NG | NG | NG | **React** |
| flights | NG | **React** | React | React | React | React | React |
| hotels | NG | NG | **React** | React | React | React | React |
| itinerary | NG | NG | NG | **React** | React | React | React |
| travel-request | NG | NG | NG | NG | **React** | React | React |
| expenses | NG | NG | NG | NG | NG | **React** | React |
| *AngularJS startable* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ deleted |

### 1.4 The baseline is re-pointed, never forked

There is one suite of 235 scenarios, not two. When a module's route changes owner, its **page
object** changes the URL it opens and the selectors it uses. The **feature file and the step
definitions do not change** unless a scenario is superseded, and then only with an ADR reference.

That is a two-line edit per module, concentrated in `tests/pages/*.js`. §0.5 counts the coupling:
7 hardcoded origin literals and 14 `#!/` literals sit outside `world.js`. Inc-0 pulls all of them
behind `BASE_URL` and a single route map so that later increments touch one line each.

> **ADR-008 §5 needs a two-word extension, and the gate should grant it explicitly.** ADR-008
> permits re-pointing page-object *selectors* to `data-testid` without behavioural justification,
> and calls that *"the only permitted change to baseline test code"* not requiring one. Re-pointing a
> page object's **URL** is the same class of change — it alters how a scenario reaches a screen,
> never what it asserts — but it is not currently covered. Without the extension, every increment
> technically violates ADR-008 §7. §13 raises it.

### 1.5 The API-only scenarios are the continuous control — with one exception

The 15 API-only scenarios drive no browser, so no increment re-points them and no increment can
break them by accident. They run identically on the day before Inc-0 and the day after Inc-6.

**14 of the 15 are never edited at all.** The exception is
`authentication.feature:314` — *"A second employee exists but is served the same data as the first"*,
whose final step asserts *"the manager is served exactly the same trips as the employee"*. **Q-7**
decided *"scope every collection to the authenticated user"* (ADR-001). If Q-7 is enforced
server-side, that assertion becomes false and the scenario supersedes; if it is enforced client-side,
the server keeps serving the same trips and the scenario stays green.

**Which it is has not been decided** — it is ADR-005 follow-on 4 and §13 item 11. So this plan
classifies `:314` as **SUPERSEDE-conditional**, resolved in whichever increment implements trip
ownership (Inc-3 at the earliest, since trips are the itinerary's resource). Claiming all 15 are
untouched would have been the tidier sentence and the wrong one.

So the honest form of the control is: **14 scenarios that are stack-independent by construction and
never edited**, plus one that a pending architectural decision may move. If any of the 14 ever fails,
the cause is environmental or server-side — never the port.

The other **220** are the moving part, and each is re-pointed exactly once — but *not* always by the
increment that owns its feature file. See §3.1.

### 1.6 What this costs, stated

- **Cross-module journeys stay as they are today, with one authorised exception.** Of the five
  `$rootScope` events, three are never delivered (§0.4) and stay that way: `flight:selected` is
  dropped deliberately (§2.4), `auth:logout` has no listeners, and `auth:login` is replaced by store
  availability rather than event replay. The exception is `itinerary:refresh`, which **is** restored
  in Inc-3 — while the application is still hybrid — because Q-3/SEAM-3 authorises it (§7.2). It
  works across the hybrid boundary without a bridge because the fix is server-side: a booking writes
  an itinerary item, and the itinerary route reads it on load.
- **The legacy navbar must learn real hrefs, and keep them.** `app/index.html:25-29` uses `ui-sref`.
  As each route moves, its navbar entry becomes a plain `href` causing a full page load — and the
  entry **stays** until Inc-6 (§2.3). This is the first and only time this plan modifies `app/`, and
  it ends the `appDiffLines: 0` invariant that has held through B1–B3. The gate should see that
  explicitly rather than discover it in a diff.
- **Each React route carries its own chrome from Inc-1.** A React document cannot use the AngularJS
  navbar, so Inc-0 builds a minimal React navbar and notification area as shell (no product route
  is React yet, so no scenario observes them). From Inc-1 they render on React routes. **The React
  chrome must carry no sign-out control before Inc-6**, or `authentication.feature:124`'s per-area
  rows turn red one increment at a time — sign-out is net-new and scheduled for Inc-6 (§10).
- **Two dev servers and two build outputs** until Inc-6.
- **A user crossing a boundary pays a full page load.** Accepted; Q-12 means there is no production
  traffic to care.

### 1.7 A conflict between ADR-005 and ADR-006 that the gate must settle

ADR-006 *Consequences* states: *"The application runs as a hybrid — some routes React, some
AngularJS — from Inc-1 to Inc-5. **Both frameworks are loaded simultaneously, the bundle is larger
than either endpoint**, and route transitions cross a boundary."*

A single bundle containing both frameworks is only possible if they share a document — which
ADR-005 forbids in the same breath. **This plan reads ADR-006's bullet as loose wording for "two
apps live in the repo and both are startable", and implements ADR-005's reading:** two documents,
two bundles, one origin, never co-loaded. Under this plan the React bundle never contains AngularJS
and the legacy page never loads React, so *"the bundle is larger than either endpoint"* is simply
not true of either artifact.

If the reviewer intends ADR-006 literally, §1.2–§1.4 are wrong and the plan must be re-run. Flagged
in §14.

---

## 2. The five standing constraints

These bind **every** increment. Each increment section repeats its specific obligation; this is the
general statement.

### 2.1 No strangler-fig bridge — ADR-005

The two stacks never share a page. No React-in-AngularJS mount, no `$rootScope` proxy, no dual
router, no Restangular/`fetch` coexistence layer. **The AngularJS app stays startable from the
repository until Inc-6** — `npm start` must serve it at every increment gate, and the gate checklist
asks for the evidence. `bower_components/` (964 tracked files) is not touched before Inc-6: the
legacy app loads its 9 runtime dependencies from there, and deleting it early stops the app booting
and takes every unmigrated module's scenarios with it.

Mechanism: §1.

### 2.2 All 235 scenarios pass after every increment

Against whichever implementation now owns that route. Not "the affected ones" — all of them, plus
the legacy Karma suite until Inc-1 retires it, plus the React unit suite as it grows. ADR-008's
*"What this means at each gate"* table is the authority on what must be green at each increment.

> **This invariant is broken today and Inc-0 repairs it first.** The suite is **189/235** on
> 2026-08-23 with zero source changes, because the baseline hard-codes absolute August-2026 dates
> that the datepicker's `minDate` now renders unselectable (§0.6). Every increment gate from Inc-0
> onward depends on this being fixed, so it is the first task in Inc-0 and its own exit criterion.

The count only ever moves **up**: superseded scenarios are rewritten in place, never removed
(ADR-005), and net-new scenarios add. §3 tracks the running total. Any gate where the total falls is
a failed gate.

Skip detection (`test.skip`, `it.skip`, `xit(`, `@wip`, `.only(`) runs at every step transition. The
tree is clean today: **0 skip markers** across `test/spec/`, `tests/` and `specs/features/`.

### 2.3 A module's AngularJS route is removed only after its React route is green

The ordering inside every feature increment is fixed:

```
1. classify   scenarios → PRESERVE / SUPERSEDE / NET-NEW  (this document; reviewed at Step 1b)
2. red        supersede + net-new scenarios written and failing; PRESERVE still green on AngularJS
3. build      React route implemented behind the ledger, not yet serving
4. switch     ledger row flips; page object re-points; full 235 + unit suites run
5. green      all suites pass against the React route
6. only then  the AngularJS state is deleted from app.routes.js and its files removed
```

Steps 5 and 6 are separate commits. Between them the legacy implementation still exists and the
ledger row can be flipped back in one line — which is the entire rollback story, and the reason
step 6 is not allowed to be part of step 4.

Deleting the AngularJS state also deletes its `<script>` tags from `app/index.html`. It does **not**
delete the navbar entry: the entry is rewritten from `ui-sref="flights"` to `href="/flights"` and
**kept until Inc-6**. A user sitting on an unmigrated AngularJS screen must still be able to reach
every migrated route, and the legacy navbar is the only chrome those screens have. Both facts are
verified by the legacy app still booting and every route still being reachable from it.

### 2.4 `flight:selected` is unserved in the Inc-1 → Inc-2 gap, and stays unserved after it

`flight-search.controller.js:207` broadcasts `flight:selected`; `hotel-booking.controller.js:266`
listens and would pre-fill the hotel city and dates. The event spans the Inc-1 / Inc-2 boundary. With
no bridge, a React flight-search cannot deliver it to an AngularJS hotel-booking.

**No interop is designed for this, and none is needed, because the journey does not work today.**
Per §0.4 the two controllers are never alive simultaneously. The baseline says so in a scenario:

```gherkin
Scenario: Selecting a flight does not carry the destination over to hotels
  # The hotel controller listens for a "flight:selected" event to pre-fill the
  # city and the dates. The two screens are separate routes, so the hotel
  # controller does not exist when the event is broadcast and is created fresh
  # afterwards. The pre-fill can never happen.
  Given I have selected a flight to "Boston" on the flight search page
  When I go to the hotel booking page
  Then the destination city is empty
  And no check-in date is set
```
> `specs/features/hotel-booking.feature:209`

So the honest statement, in three parts:

- **During the gap (after Inc-1, before Inc-2):** the journey is unserved. The emitter is deleted
  with the AngularJS flight-search controller; the AngularJS listener survives and continues never
  to fire. Observable behaviour is identical to today. `hotel-booking.feature:209` **passes
  unchanged**, now because the emitter has gone rather than because the listener was not alive.
- **After Inc-2, when both modules are React:** the journey is *still* unserved — **deliberately**.
  `flight:selected` maps to **no store concern**. The event is dropped, not ported.
- **Why dropped and not fixed:** a React store *could* trivially make the pre-fill work. Doing so
  would be a user-visible behaviour change, and no recorded decision authorises it. Q-1…Q-12 and
  SEAM-1…SEAM-5 do not mention it. Under ADR-005 an unauthorised behaviour change is forbidden, so
  `hotel-booking.feature:209` is **PRESERVE** and Inc-2 must satisfy it *by construction* — there is
  no pre-fill mechanism at all — rather than by accident.

If the product wants the pre-fill, that is net-new behaviour: a new acceptance criterion in
`specs/frd-hotel-booking.md`, new Gherkin through the Step 1b gate, and its own ADR. **Explicitly
out of scope for this plan.** §12 lists it among the things the gate may choose to authorise.

The same reasoning applies to `auth:login` (never delivered) and `auth:logout` (no listeners at all).
`itinerary:refresh` is the one exception, and only because **Q-3/SEAM-3 already authorises the fix**
— see §8.

### 2.5 Inc-2 is a discovery increment, not a port

`hotel-booking.template.html:184` repeats `room in selectedHotel.rooms track by room.id`.
`/api/hotels/:id/rooms` returns 5 objects keyed `type, price, available, beds, maxGuests` — verified
against the running server, **no `id` field**. All 5 track-keys are `undefined`, a duplicate-key set,
so AngularJS throws `ngRepeat:dupes` and renders nothing.

The consequence is that **the room table has never rendered for any user or any test**, and
everything behind it — room selection, per-room pricing, the booking POST, the confirmation dialogue
— has never been exercised through the UI. React tolerates duplicate keys with a console warning, so
migrating the module switches the screen on.

The baseline pins the *absence*, not the behaviour: three scenarios
(`hotel-booking.feature:167, :177, :188`) say the table is empty, the booking cannot be completed,
and — driving the controller directly to get behind the table — that the booking is *"priced at
nothing and confirmed with nothing"*.

**Scope behind that table is unknown, and the plan says so rather than estimating it.** Inc-2
therefore begins with an explicit discovery step before any Gherkin is written (§7.2), and its
Gherkin delta carries a **range**, not a number. Inc-2's estimate is the least reliable of the seven
and must not be treated as equivalent to its neighbours at planning time.

---

## 3. The scenario ledger

### 3.1 Scenarios do not partition by feature file

The obvious ledger — *"each feature file's scenarios re-point in that feature's increment"* — is
**wrong**, and getting it wrong would leave Phase 2 with unaccounted scenarios at four different
gates.

`authentication.feature` is not a single-route file. It signs in and then asserts on **other
modules' screens**. Resolved by mapping every step to its definition and every definition to the
page object it drives:

| Scenario | Asserts on | Re-points in |
|---|---|---|
| `:57` *A direct hit on a protected area is turned away* — **6 Examples rows** | dashboard, flights, hotels, itinerary, travel-request, expenses | **one row per increment, Inc-1 → Inc-6** |
| `:124` *No screen offers a way to sign out* — **6 Examples rows** | same six areas | **one row per increment, Inc-1 → Inc-6** |
| `:114` *Signing in announces itself to the modules that care* | expenses | Inc-5 |
| `:138` *Nothing is listening for a sign-out announcement* | expenses | Inc-5 |
| `:172` *A reload leaves me where I was rather than at the login screen* | itinerary | Inc-3 |
| `:179` *After a reload my work is attributed to a placeholder* | expenses | Inc-5 |
| `:193` *A token the server rejects still opens the portal* | expenses | Inc-5 |
| `:199` *A rejected session looks like an empty expense account* | expenses | Inc-5 |
| `:207` *A rejected session looks like an empty itinerary* | itinerary | Inc-3 |
| `:215` *A rejected session raises a failure notice that names the data* | itinerary | Inc-3 |
| `:220` *Losing my session mid-visit leaves the page on screen* | itinerary | Inc-3 |
| `:226` *The next move after losing my session sends me to the login screen* | itinerary, then expenses | Inc-5 *(the assertion is the guard on the expenses navigation)* |

**A `Scenario Outline` can straddle increments row by row.** `:57` and `:124` each have six
Examples rows naming six different areas, so six rows re-point in six different increments from one
authored block. Any ledger that treats a block as atomic mis-counts them.

The other five feature files **do** partition cleanly: each has a `Background:` that opens its own
page, and no scenario in them asserts on a foreign module's screen.

**Authentication's 36 browser-driving scenarios therefore distribute like this:**

| Re-points in | Count | Which |
|---|---:|---|
| Inc-1 | 2 | `:57` flights row, `:124` flights row |
| Inc-2 | 2 | `:57` hotels row, `:124` hotels row |
| Inc-3 | 6 | `:57` + `:124` itinerary rows, `:172`, `:207`, `:215`, `:220` |
| Inc-4 | 2 | `:57` + `:124` travel-request rows |
| Inc-5 | 8 | `:57` + `:124` expenses rows, `:114`, `:138`, `:179`, `:193`, `:199`, `:226` |
| Inc-6 | 16 | `:57` + `:124` dashboard rows, and the 14 login/dashboard scenarios incl. `:274` |
| **Total** | **36** | |

> `:274` *The server can identify the holder of a token* sits in the server section but boots the
> legacy client to obtain the token (§0.3), so it is browser-driving and re-points at Inc-6.

**Re-pointing is not superseding.** `:124`'s flights row re-points in Inc-1 but still **passes** —
the React chrome has no sign-out either (§1.6). It supersedes only in Inc-6, when sign-out ships. By
contrast `:207` both re-points *and* supersedes in Inc-3, because the 401 policy built in Inc-0
becomes observable the moment the itinerary route is React.

### 3.2 The ledger

Counts are expanded scenarios. `Δ` is net change to the suite total.

| After | Re-pointed *(own feature + auth)* | SUPERSEDE | NET-NEW | Suite total | Δ |
|---|---|---:|---:|---:|---:|
| **today, measured** | — | — | — | **189 / 235 passing** (§0.6) | — |
| Inc-0 | 0 | **0** | 0 | **235** | 0 *(46 restored by the §0.6 clock pin)* |
| Inc-1 | 25 + 2 = **27** | 4 | 2 | **237** | +2 |
| Inc-2 | 25 + 2 = **27** | 4 | **8–14** (est.) | **245–251** | +8…+14 |
| Inc-3 | 32 + 6 = **38** | 14 (+1 conditional) | 4–6 | **249–257** | +4…+6 |
| Inc-4 | 45 + 2 = **47** | 9 | 5–6 | **254–263** | +5…+6 |
| Inc-5 | 57 + 8 = **65** | 22 (+1 conditional) | 7–9 | **261–272** | +7…+9 |
| Inc-6 | **16** *(+15 API-only never re-pointed)* | 12 (+2 pending) | 8–9 | **269–281** | +8…+9 |

- **220** browser-driving scenarios, each re-pointed exactly once:
  27 + 27 + 38 + 47 + 65 + 16 = **220** ✓
- **15** API-only scenarios are never re-pointed. 14 are never edited either; `:314` is
  SUPERSEDE-conditional on the Q-7 enforcement point (§1.5).
- **SUPERSEDE totals 65 firm**, plus **2 conditional** (`itinerary.feature:218` on §7.5;
  `authentication.feature:314` on Q-7) and **2 pending** (`authentication.feature:143`, `:237`) —
  so **65 to 69**, i.e. **28–29%** of the baseline. That is high, and it is the correct signal:
  ADR-001/002 authorised a lot of behaviour change, and four of the six modules have a dead or
  trapped primary control.
- The total never falls.

> Four scenarios in that ledger are **not yet classified** and are listed as decisions the gate must
> make (§14). The plan states the range rather than picking a number it has no authority to pick.

---

## 4. Increment 0 — Walking skeleton

> **No feature is migrated. React owns no route a user can reach.**

### 4.1 Goal

Stand up the React application, the front door, the route ledger, the auth *plumbing*, the two test
runners, the linter and CI — and change **no observable behaviour whatsoever**. The proof that Inc-0
is correct is that all 235 scenarios pass **without a single edit to a feature file**.

### 4.2 Scope

**Task 0 — restore the baseline to green (§0.6).** Before anything else. The suite is 189/235 today
because 46 scenarios pick calendar days that the wall clock has moved into the past. **Pin the suite
clock** in `tests/support/hooks.js` — one file, no feature-file change, no assertion change — and
record at the gate that the suite is now clock-frozen and what that means for the clock-dependent
scenarios (§0.6 point 3). **Until this is done Inc-0 cannot demonstrate its own zero delta**, because
it cannot tell a stale fixture from a regression.

Then:

- React application shell: entry point, root component, router tree with **one trivial route** that
  is not a product route (a shell health route), error boundary.
- **Front door + route ledger** (§1.2–§1.3), with every product route pointing at AngularJS.
- **API client** replacing Restangular's role (D-3, A-4): one base URL from environment
  configuration (A-5 — `app/app.js:14` and `app/services/auth.service.js:18` hold
  `http://localhost:3000` as literals), one `Authorization` header, one error policy.
- **Auth plumbing, no auth surface:** a token store reading the same `localStorage` key the legacy
  app writes, a route guard, and the 401 handling path. No login screen, no sign-out control, no
  credential form — those are surface, and surface needs a route (§10).
- **Client state store** with a named owner for each concern replacing `$rootScope` (P-5). Mapping
  in §4.3.
- **Shared cross-cutting components** required by ADR-007 to land in Inc-0: the date input
  (category 1, replacing 8 live jQuery UI datepicker sites), the modal (category 2), the declarative
  scroll effect (category 3), and the validation-state pattern (category 5).
- **Minimal React chrome** — navbar and notification area — because a React document cannot use the
  AngularJS navbar (§1.6). No product route is React yet, so no scenario observes it. **It must carry
  no sign-out control**: sign-out is net-new and belongs to Inc-6, and shipping it early turns
  `authentication.feature:124`'s per-area rows red one increment at a time.
- **Unit runner** alongside Karma, not replacing it (ADR-008 §3). **Playwright config** for the React
  side. **ESLint + formatter** (C-2 DevOps). **CI running both suites** (C-1 DevOps, ADR-008 §6).
  CI is what stops §0.6 recurring: the baseline decayed silently for 17 days precisely because
  nothing ran it.
- **Baseline harness de-coupling:** the 7 hardcoded origin literals and 14 `#!/` literals move behind
  `world.js`'s `BASE_URL` and one shared route map, so each later increment re-points in one line.

### 4.3 `$rootScope` → store mapping (all five events, per §0.2's correction)

| Event | Emits | Store concern | Note |
|---|---:|---|---|
| `notification:add` | 24 | **notifications** — append + auto-expire, owned by the shell | the only event that works today; P-5's unbounded array is bounded here |
| `auth:login` | 1 | **session** — set on authenticate | today never delivered; in React the store makes the value *available*, which is not the same as replaying the event |
| `auth:logout` | 1 | **session** — clear | no listeners today; the sign-out *surface* is net-new and lands in Inc-6 |
| `flight:selected` | 1 | **none — deliberately dropped** | §2.4 |
| `itinerary:refresh` | 2 | **deferred to Inc-3** | authorised by Q-3/SEAM-3; §8 |

Recording all five — including the two that map to nothing — is the point. A store mapping that
silently omits `flight:selected` is how the pre-fill gets implemented by accident.

### 4.4 Files

**Created** — React app root, front door + route ledger, API client, token store, state store, the
four ADR-007 shared components, unit-runner config, Playwright config, ESLint config, CI workflow,
environment config. *(Directory layout is a tech-stack output; §13.)*

**Modified** — `package.json` (React + tooling dependencies added; **nothing removed**), `cucumber.js`
if the harness needs the front-door origin, **`tests/support/hooks.js`** (the §0.6 clock pin),
`tests/support/world.js`, `tests/pages/*.js` ×6 and `tests/steps/flight-search.steps.js` (URL
literals → `BASE_URL` + route map; **navigation only, zero assertion changes**), `README.md` (how to
start both).

**Deleted** — **nothing.** Not one file under `app/`, not one line of `bower.json`, not one file in
`bower_components/`. This is the increment where "clean up while we're here" does the most damage.

### 4.5 Gherkin delta

| | Count | Detail |
|---|---:|---|
| **Affected (SUPERSEDE)** | **0** | — |
| **Untouched (PRESERVE)** | **235** | all six feature files, **byte-identical** |
| **New (NET-NEW)** | **0** | Inc-0 adds no behaviour, so it adds no scenario |

**The zero is the deliverable, and it is literal.** Inc-0 introduces a bundler, a router, a store, an
API client, a front door, two test runners and the §0.6 clock pin — and `git diff -- specs/features/`
must come back **empty**. If any feature file needs a single character changed, something in Inc-0
has migrated a feature it should not have, or has taken the rejected relative-date route (§0.6).

That is why the clock pin is the chosen repair rather than the obvious one: it is the only fix that
restores 46 scenarios *and* leaves this check as a hard, unambiguous, one-command gate.

Non-Gherkin test coverage added: React unit tests for the API client, token store, state store and
the four shared components. These are new tests, not new scenarios.

### 4.6 FRD delta

No behavioural section of any FRD changes. **Additive only:**

- A new `## Migration Status` section in each of the six FRDs, initialised to
  `owner: AngularJS · route: <path> · increment: —`, updated by the increment that takes the route.
  This is the FRD-side mirror of the route ledger and makes ownership answerable from the spec.
- `specs/frd-authentication.md` › *Current Implementation* › *Files Involved*: record that the token
  store and route guard now have a React implementation while the login **screen** does not, and
  that Q-8's credential form and sign-out are scheduled for Inc-6 with the reason (§10.1).

### 4.7 Verification

```bash
npm start                      # legacy still serves: AngularJS at / and #!/…
<react dev server>             # React serves its shell route only
npm test                       # 19 Karma tests — unchanged, still green
<react unit runner>            # new shell unit tests green
npx cucumber-js                # 235 / 235 — up from 189/235, restored by the clock pin alone
git diff -- specs/features/    # EMPTY
<lint>                         # clean
git diff --stat -- app/        # EMPTY — no legacy source touched in Inc-0
```

Then re-run the suite with the host clock advanced a month. It must still be 235/235 — that is the
proof the clock pin works, as opposed to the project simply having a good day. A single green run on
one date is exactly what it already had on 2026-08-06.

### 4.8 Exit criteria

- [ ] **235/235 baseline green**, and `git diff -- specs/features/` is **empty**
- [ ] The suite is green **with the host clock advanced**, not just today
- [ ] The clock pin is recorded at the gate, including which scenarios are clock-dependent and what
      freezing the clock means for them (§0.6 point 3)
- [ ] 19 Karma tests green; React unit tests green; lint clean; **CI runs both suites** — so the next
      17-day silent decay is impossible
- [ ] `npm start` serves the AngularJS app; every one of the 7 states reachable
- [ ] React serves a non-product route only; the route ledger shows **6 of 6** product rows on `NG`
- [ ] `git diff --stat -- app/ bower.json bower_components/` is empty
- [ ] The store mapping records **all five** events, including the two mapping to nothing
- [ ] The React chrome exists but carries **no sign-out control** (§1.6)
- [ ] 0 skip markers

**Commit:** `[increment] inc-0/skeleton — React alive, no route owned, 235 green`

---

## 5. Increment 1 — flight-search

> First feature migrated. Establishes the search → filter → results → detail pattern. Chosen first
> because a stack mistake surfaces here fastest: 25 scenarios with zero UI bypasses and the only
> 19 unit tests in the product (ADR-006).

### 5.1 Scope

`app/components/flight-search/*` → React. The two jQuery UI datepickers dissolve into Inc-0's shared
date input. `date-picker.directive.js` is **not ported** (Q-10: 0 consumers, re-verified). C-4 — the
price-slider `step=50` snap — is superseded. Retires the Karma suite (ADR-008 §2): the 19 tests are
replaced by React unit tests asserting the same things, **in this increment, before it closes**.

### 5.2 Files

**Created** — React flight-search route, search form, results list, filter bar, sort control, detail
panel; a flight data module over Inc-0's API client; React unit tests replacing all 19 Karma tests.

**Modified** — route ledger (`flights` → React); `tests/pages/flight-search.page.js` (URL + selectors
→ `data-testid`, ADR-008 §5); `specs/features/flight-search.feature` (4 scenarios superseded, 2
added); `specs/frd-flight-search.md`; `app/index.html` navbar (Flights → real `href`).

**Deleted** — *after* the React route is green (§2.3), in a separate commit:
`app/components/flight-search/flight-search.controller.js` (258),
`flight-search.service.js` (77), `flight-search.template.html` (269); the `flights` state from
`app/app.routes.js`; the two `<script>` tags at `app/index.html:68-69`;
**`app/directives/date-picker.directive.js`** (98) and its `<script>` tag at `:80` — the abandoned
abstraction P-3 describes, deleted unported in the increment that would otherwise have ported it
(Q-10: 0 consumers, re-verified at the B2c gate);
`test/spec/flight-search.spec.js` (416) and `test/karma.conf.js` (75) with the retirement of each of
the 19 tests recorded against its replacement; `karma`, `karma-jasmine`, `karma-chrome-launcher`,
`jasmine-core` from `package.json`. **`bower.json` and `bower_components/` untouched.**

### 5.3 Gherkin delta — `specs/features/flight-search.feature`

**Affected — SUPERSEDE (4 of 25):**

| # | Line | Scenario | Why it changes | Authorised by |
|---|---:|---|---|---|
| 10 | `:91` | *A chosen date is shown as a raw date string, not as a calendar date* — asserts the field reads `"Tue Aug 25 2026"` followed by a time and time zone | the field currently displays `Date.prototype.toString()` because the datepicker writes text and AngularJS re-renders the bound `Date` over it. A controlled date input renders a formatted value. | **ADR-009** (§11) |
| 11 | `:95` | *The flight I selected covers the date calendar* — days behind the details panel cannot be clicked | a z-index artefact between the jQuery UI popup and the details panel. The shared date component does not reproduce it. | **ADR-007** cat 1 |
| 14 | `:118` | *The maximum price filter cannot always reach the dearest flight* | constraint **C-4**: `step=50` with `min=230` makes 630 the highest representable value, so the filter snaps below the true max (642) and hides flights at 638 and 642 | **ADR-006** ("Inc-1 … supersedes C-4") |
| 15 | `:123` | *The result count in the notification can exceed the number of flights listed* | same root cause: `flight-search.controller.js:120` broadcasts the unfiltered count while the list is filtered by the snapped maximum | **ADR-006** |

Each rewritten scenario keeps its title where the title still describes the behaviour, swaps
`@existing-behavior` for `@inc-1`, and carries the authorising ADR as a comment.

**Untouched — PRESERVE (21 of 25):** scenarios 1–9, 12, 13, 16–23. Notably:

- `:62` *The departure date I searched for does not reach the results* — the generator ignores the
  requested date. Unauthorised, therefore reproduced. §12.
- `:177` *Flights are offered without a flight number* — the API sends none. Reproduced. §12.
- `:71`, `:78` the return-date consistency rules — **the rule survives ADR-009 unchanged**; only the
  parse beneath it becomes explicit.
- `:56` *Repeating the same search returns a different set of flights* — server-side randomness.

**Also re-pointed here, from `authentication.feature` (§3.1):** 2 scenarios — the `flights` rows of
`:57` *A direct hit on a protected area is turned away* and `:124` *No screen offers a way to sign
out*. Both are **PRESERVE**: the React route guard must bounce a tokenless visitor to the AngularJS
login screen, and the React chrome must offer no sign-out (§1.6). Neither supersedes here.

**New — NET-NEW (2):**

| Scenario | Why it is new |
|---|---|
| A typed departure date is accepted | The date inputs are `<input type="text">` with `ng-model` (`flight-search.template.html:57`). A typed value never fires the datepicker's `onSelect`, so **the model stays null while the field looks filled** — the baseline never types a date for exactly this reason (`tests/pages/flight-search.page.js:7`). A controlled React input makes typing work for the first time. No baseline exists. |
| An unparseable typed date is refused with a message | Today an unparseable value reaches `moment(...).format('YYYY-MM-DD')` at `controller:107` and would be sent to the API as the string `"Invalid date"`. Explicit parsing (ADR-009) makes it a validation failure. No baseline exists. |

**Running total after Inc-1: 237.**

### 5.4 FRD delta — `specs/frd-flight-search.md`

| Section | Change |
|---|---|
| `## Migration Status` | `owner: React · increment: 1` |
| `FR-F005-002` *Keep the return date consistent with the departure date* | rule unchanged; **implementation note added**: parsing is explicit per ADR-009 |
| `FR-F005-004` *Bind date entry to jQuery UI datepickers* | **rewritten** — jQuery UI is gone; the shared date component (ADR-007 cat 1) owns date entry; add the two net-new acceptance criteria from §5.3 |
| `FR-F005-008` *Filter and order the result set client-side* | **amended** — the maximum-price control's range is the true price range; C-4's snap is removed (ADR-006) |
| `FR-F005-010` *Select a flight* | **amended** — remove the `flight:selected` broadcast; the event is dropped (§2.4, ADR-005) |
| *Current Implementation* › *Moment.js call sites* | **replaced** by an explicit-parse table naming format strings per site (ADR-009) |
| *Current Implementation* › *jQuery selectors and effects* | **replaced** by the ADR-007 category mapping |
| *Current Implementation* › *Test Coverage* / *Test Reconciliation* | Karma retired; React unit tests listed with the 19-to-N retirement mapping (ADR-008 §2) |
| *Known Limitations* | mark superseded entries with the increment and ADR; **entries the plan reproduces stay, annotated "preserved deliberately — see increment-plan §12"** |

### 5.5 Verification

```bash
npx cucumber-js specs/features/flight-search.feature   # 27 (25 → 21 preserved + 4 superseded + 2 new)
npx cucumber-js                                        # 237 / 237
<react unit runner>                                    # ≥19 replacement assertions green
npm start                                              # AngularJS still boots; 6 of 7 states remain
```

### 5.6 Exit criteria

- [ ] 237/237 green; every superseded scenario names its ADR
- [ ] All 19 Karma assertions have a named, passing React replacement (auditable list at the gate)
- [ ] React route green **before** the AngularJS state is deleted — two commits, in that order
- [ ] `npm start` boots; `#!/hotels`, `#!/itinerary`, `#!/travel-request`, `#!/expenses`, `#!/login`,
      `#!/dashboard` all still work
- [ ] `bower_components/` untouched; `bower.json` untouched
- [ ] `hotel-booking.feature:209` still passes — the pre-fill still does not happen (§2.4)

**Commits:** `[impl] inc-1/flight-search — React route green` → `[increment] inc-1 — AngularJS route removed, 237 green`

---

## 6. Increment 2 — hotel-booking · **the discovery increment**

> Scheduled second against its difficulty score of 34, on ADR-006 principle 2: confront the largest
> unknown while four increments of slack remain. Its structural twin (flight-search) has just been
> built, so when this module surprises us the surprise is unambiguously the module, not the stack.

### 6.1 Why this is not a port — §2.5 restated as scope

Three of its 25 scenarios describe a screen that has never rendered. Everything those three
scenarios *do not* describe — how five room rows should look, what a sold-out room does, what the
booking summary contains, what the confirmation dialogue shows — is scope that arrives at
implementation time. React renders duplicate keys with a console warning, so the moment the module
is migrated the table switches on and all of it becomes visible at once.

**Planning for that instead of assuming a port** means three things:

1. Discovery happens **before** any Gherkin is written (§6.2) and produces a written finding list.
2. The Gherkin delta carries a **range**, not a number, and the range is closed at the Step 1b gate
   after discovery — not now.
3. The increment's estimate is explicitly the least reliable of the seven and must not be treated as
   comparable to its neighbours.

### 6.2 Step 0 — discovery, before Step 1

A short, bounded investigation whose only output is a document. **No production code, no Gherkin.**

| Question | Method | Why it cannot be answered from the baseline |
|---|---|---|
| What does the room table contain when it renders? | Render the real `/api/hotels/:id/rooms` payload (5 objects: `type, price, available, beds, maxGuests`) against `hotel-booking.template.html:184-…` in isolation | Never rendered; the template's columns have never been seen populated |
| What happens to a room with `available: 0`? | The generator emits `randomInt(0, 5)` for Deluxe, `randomInt(0, 3)` for Executive Suite and `randomInt(0, 1)` for Presidential — **zero is reachable on three of five rooms** | No scenario covers it; no user has seen it |
| What identifies a room to the booking POST? | Read the booking handler; the payload has no `id`, and `hotel-booking.feature:199` confirms *"the booking request carries no room identifier"* | The server accepts the booking regardless — so what should React send? |
| Why is the total not a number? | `hotel-booking.feature:196-197`: the nightly price is read from a field the API does not send | Only observed by driving the controller directly |
| Why is the confirmation `undefined`? | `hotel-booking.feature:203`: the confirmation code is read from a field the API does not send | Same |
| Does the layout survive 5 rows? | Render it | The panel has only ever been seen empty |

**Discovery output:** `specs/docs/architecture/hotel-booking-room-path.md` — factual, no
recommendations, in the Phase B1 extraction style. It closes the Gherkin range and feeds the Inc-2
contract work.

**If discovery reveals the booking path is materially larger than assessed**, ADR-006 permits
resequencing the remaining increments provided the dependency constraints hold. That decision is
taken at the Inc-2 Step 1b gate and supersedes ADR-006.

### 6.3 Scope

`app/components/hotel-booking/*` → React. Search, filters (6 scenarios), sorting (4), the rooms panel
— and, for the first time, the room table, room selection, the booking summary and the confirmation
dialogue. Bootstrap-modal-via-jQuery (`hotel-booking.controller.js:241`) becomes Inc-0's
state-driven modal (ADR-007 cat 2). Both datepickers dissolve. SEAM-3 producer #2 — a hotel booking
must create an itinerary item; the seam is **verified in Inc-3**, which is why itinerary follows.

### 6.4 Files

**Created** — React hotel-booking route, search form, hotel list, filter bar, sort control, rooms
panel, **room table, room selector, booking summary, confirmation dialogue** (the last four have no
AngularJS behaviour to port from); a hotel data module; React unit tests.

**Modified** — route ledger (`hotels` → React); `tests/pages/hotel-booking.page.js`;
`specs/features/hotel-booking.feature`; `specs/frd-hotel-booking.md`; `app/index.html` navbar;
possibly `specs/contracts/api/hotel-booking.yaml` — **annotated, not changed**: the rooms payload's
missing `id` is documented against the operation, since P-7's root cause is a contract fact.

**Deleted** — after green: `hotel-booking.controller.js` (281), `hotel-booking.service.js` (79),
`hotel-booking.template.html` (256); the `hotels` state; two `<script>` tags at
`app/index.html:70-71`.

### 6.5 Gherkin delta — `specs/features/hotel-booking.feature`

**Affected — SUPERSEDE (4 of 25):**

| # | Line | Scenario | Why it changes | Authorised by |
|---|---:|---|---|---|
| 4 | `:51` | *A chosen date is displayed as a raw JavaScript date string* | same mechanism as flight-search `:91` | **ADR-009** |
| 22 | `:167` | *The room table is empty even though rooms were loaded* — asserts five rooms loaded, no rows shown, and a duplicate-key error in the console | React renders duplicate keys with a warning. The table renders. The scenario inverts: five rooms loaded, **five rows shown**, no error. | **ADR-005** (names *"`ngRepeat:dupes` blocking hotel booking"* as Supersede) |
| 23 | `:177` | *A hotel booking cannot be completed through the interface* — *"there is no room I can select"*, *"no booking summary is offered"* | the completion path becomes reachable | **ADR-005**; **Q-3** (a booking must persist and appear on the itinerary) |
| 24 | `:188` | `@bypasses-ui` *Driven directly, a booking is priced at nothing and confirmed with nothing* — no room identifier sent, stay priced as nothing, notification reads `"Hotel booked! Confirmation: undefined"` | the scenario exists **only** because the table could not be used. It is rewritten as a UI scenario and **`@bypasses-ui` is removed**, taking the suite from 4 bypasses to 3. The three defects it documents are fixed as part of building a path that has never existed. | **ADR-005**; **Q-3** |

**Untouched — PRESERVE (21 of 25):** validation (2), dates (3 of 4), search and cards (4), filters
(6), sorting (4), the rooms panel heading (`:162`) — and, critically:

> **`:209` *Selecting a flight does not carry the destination over to hotels* — PRESERVE.**
> This is the `flight:selected` scenario. It passed in the Inc-1 → Inc-2 gap because the emitter had
> been deleted. It must **keep** passing now that both modules are React, which means the React
> implementation must contain **no pre-fill mechanism at all** (§2.4). Inc-2's gate asks
> specifically for this. A React store that helpfully wires `flight:selected` to a hotel-search
> pre-fill turns this scenario red and is an unauthorised behaviour change.

Also preserved: `:91` *The hotel address is never shown* (the API never sends one) and `:61`
*Choosing a check-in after the check-out silently discards my check-out* — both unauthorised, both
reproduced. §12.

**Also re-pointed here, from `authentication.feature` (§3.1):** 2 scenarios — the `hotels` rows of
`:57` and `:124`. Both **PRESERVE**, for the same reasons as Inc-1.

**New — NET-NEW (8–14, estimated; closed at the Step 1b gate after §6.2):**

| Area | Expected scenarios |
|---|---:|
| Room table renders the five rooms with type / price / beds / max guests | 2–3 |
| Room selection updates the booking summary | 2 |
| A room with `available: 0` (reachable on 3 of 5 room types) | 1–2 |
| The booking POST carries a room identifier and a real total | 2–3 |
| The confirmation dialogue shows a real code and total | 1–2 |
| Whatever discovery reveals | 0–2 |

**Running total after Inc-2: 245–251.**

### 6.6 FRD delta — `specs/frd-hotel-booking.md`

| Section | Change |
|---|---|
| `## Migration Status` | `owner: React · increment: 2` |
| *User Stories* | the room-selection and booking-completion stories move from **documented-but-unreachable** to **implemented**; acceptance criteria written for the first time from §6.2's findings |
| *Functional Requirements* | **new FRs** for room-table rendering, room selection, sold-out rooms, the booking payload and the confirmation dialogue — this is the largest FRD delta in the plan, and it is net-new specification rather than migration |
| *Current Implementation* › *Known Limitations* | the `ngRepeat:dupes` entry and the three booking defects marked superseded with their ADR; the address and pre-fill entries annotated *"preserved deliberately"* |
| *Integration Points* | record that `flight:selected` is **dropped, not ported**, with the §2.4 reasoning inline so a future reader does not restore it as an obvious oversight |
| *Dependencies* | SEAM-3 producer; consumer verification is Inc-3 |
| new: *Discovery findings* | link `specs/docs/architecture/hotel-booking-room-path.md` |

### 6.7 Verification

```bash
npx cucumber-js specs/features/hotel-booking.feature   # 33–39
npx cucumber-js                                        # 245–251, all green
<react unit runner>                                    # hotel-booking unit tests green
npm start                                              # AngularJS boots; 5 of 7 states remain
```

### 6.8 Exit criteria

- [ ] Discovery document exists and was reviewed **before** Gherkin was written
- [ ] The net-new range was closed at the Step 1b gate with a stated number
- [ ] Full suite green; the 4 superseded scenarios name their ADRs
- [ ] `@bypasses-ui` count drops from 4 to 3, and the reason is recorded
- [ ] **`:209` passes, and the implementation contains no `flight:selected` pre-fill**
- [ ] React route green before the AngularJS state is deleted
- [ ] `npm start` boots; `bower_components/` untouched

**Commits:** `[impl] inc-2/hotel-booking — React route green` → `[increment] inc-2 — AngularJS route removed`

---

## 7. Increment 3 — itinerary

> Consumer of both booking flows. Scheduled directly after its second producer so SEAM-3 is verified
> end-to-end while that work is fresh (ADR-006). Carries **Q-6, the only API-visible change in the
> migration**, and two dead controls that must be brought to life.

### 7.1 Scope

`app/components/itinerary/*` → React. Two complete render modes (list and timeline) over the same
data. The deepest template nesting in the product (`ng-if`/repeat depth 6). `itinerary:refresh`
becomes a store subscription — **the one cross-module event that is restored rather than dropped**,
because Q-3/SEAM-3 authorises it. The print path (`$('#itinerary-details').clone()`,
`itinerary.controller.js:172`) becomes a data-rendered print view (ADR-007 cat 6). Scroll-on-open
becomes a declarative effect (ADR-007 cat 3).

**Q-6 makes `Trip.totalCost` server-derived.** This is the only change in the plan that alters the
HTTP contract, so `specs/contracts/api/itinerary.yaml` is edited, not merely annotated — and the
change is visible to every consumer.

### 7.2 `itinerary:refresh` — the exception to §2.4

Like `flight:selected`, this event is never delivered today: it is broadcast from flight-search
(`:221`) and hotel-booking (`:238`), and the itinerary controller that listens (`:223`) is not alive
on those routes. `itinerary.feature:240` pins the outcome — *"A booked flight never reaches the
itinerary"*.

The difference is authorisation. **Q-3** decided *"yes — a booking must persist and appear on the
itinerary"*, and **SEAM-3** is marked `defect-to-fix`. So this event is restored, as a store
subscription, and the scenario is superseded with Q-3/SEAM-3 named. `flight:selected` has no such
decision behind it and is therefore dropped. The two events look identical in the code and are
treated oppositely — which is exactly why the store mapping in §4.3 lists all five explicitly.

Note the fix is mostly **server-side**: `itinerary.feature:240`'s comment records that the booking
POST succeeds and the app announces it, *but nothing is written to any trip*. A client-side
subscription alone does not satisfy Q-3.

### 7.3 Files

**Created** — React itinerary route, trip list, trip detail, day grouping, list and timeline modes,
print view, note composer, status filter, cancel flow; an itinerary data module; React unit tests
(day grouping and date-window shaping carry the 22 lodash and 19 moment calls that do real work).

**Modified** — route ledger; `tests/pages/itinerary.page.js`; `specs/features/itinerary.feature`;
`specs/frd-itinerary.md`; `app/index.html` navbar; **`api-mock/server.js`** (SEAM-3: a booking writes
an itinerary item; Q-6: `Trip.totalCost` derived from items); **`specs/contracts/api/itinerary.yaml`**
(Q-6 — the first real contract change in the plan).

**Deleted** — after green: `itinerary.controller.js` (235), `itinerary.service.js` (103),
`itinerary.template.html` (226); the `itinerary` state; two `<script>` tags at `app/index.html:72-73`.

### 7.4 Gherkin delta — `specs/features/itinerary.feature`

**Affected — SUPERSEDE (12 of 32):**

| # | Line | Scenario | Why | Authorised by |
|---|---:|---|---|---|
| 5 | `:56` | *A trip's cost is recomputed from its items and overrides the stored total* | the client recomputes today; the **server** derives it | **Q-6** |
| 15 | `:121` ×3 | *Choosing a status highlights the button but filters nothing* | dead control 1 of 4 — `ng-if` child-scope shadowing (P-2). React has no scope chain; the filter works. | **ADR-005** (*"the four dead controls"*) |
| 16 | `:133` | *The chosen status never reaches the controller* | same | **ADR-005** |
| 17 | `:139` | `@bypasses-ui` *Set on the controller instead, the filter works — and keeps whole days* | exists only because the UI control is dead; becomes a UI scenario, **`@bypasses-ui` removed** | **ADR-005** |
| 20 | `:162` | *Typing a note and adding it does nothing at all* | dead control 2 of 4 | **ADR-005** |
| 21 | `:170` | *The note I type never reaches the controller* | same | **ADR-005** |
| 22 | `:175` | `@bypasses-ui` *Added through the controller, a note is credited to nobody in particular* | UI scenario after the control works; attribution repaired by the C-1 fix | **ADR-005**; ADR-003 C-1 |
| 23 | `:187` | `@bypasses-ui` *A note is shown immediately but never stored* | UI scenario; the note persists | **ADR-005** |
| 27 | `:218` | *A cancelled item still counts towards the trip total* | Q-6 moves derivation to the server; whether cancelled items are excluded is **not settled by Q-6** — see §7.5 | **CONDITIONAL — unclassified until §7.5 is answered** |
| 30 | `:240` | *A booked flight never reaches the itinerary* | §7.2 | **Q-3 / SEAM-3** |

**Also superseded here, from `authentication.feature` (§3.1) — 3 scenarios:**

| Line | Scenario | Why it changes here | Authorised by |
|---:|---|---|---|
| `:207` | *A rejected session looks like an empty itinerary* — *"No trips yet"*, *"nothing on the page tells me my session is the problem"* | the 401 policy built as Inc-0 plumbing becomes **observable** the moment the itinerary route is React. A rejected session must say so. | **401 policy** (ADR-005 follow-on 5) |
| `:215` | *A rejected session raises a failure notice that names the data, not the session* — *"Failed to load itinerary"* | same | same |
| `:220` | *Losing my session mid-visit leaves the page on screen* | same | same |

> **This is the correction §3.1 exists to make.** These three are in `authentication.feature`, but
> they assert on the **itinerary** screen. Scheduling them in Inc-6 with the rest of their file
> would leave Inc-3 shipping a React itinerary that either silently keeps the old broken 401
> behaviour, or turns three scenarios red with nothing in the plan expecting it.

**Also re-pointed here (PRESERVE):** the `itinerary` rows of `authentication.feature:57` and `:124`,
and `:172` *A reload leaves me where I was rather than at the login screen* — with the Inc-0 identity
rehydration, a reload still leaves the user on the itinerary. 3 scenarios, none superseded.

**Itinerary supersede count: 11 firm + 1 conditional (`:218`). With the 3 authentication scenarios,
Inc-3 supersedes 14 firm + 1 conditional.**

`@bypasses-ui` drops from 3 to **0** — the tag disappears from the suite entirely in this increment,
because every scenario that used it existed to reach behind a dead control.

**Untouched — PRESERVE (20 of 32):** trip ordering and dates (4), the earliest-trip auto-open,
summary-card arithmetic (2), day grouping and ordering (3), row rendering (2), opening another trip,
scroll-on-open, cancel confirmation flow (3), timeline mode (2). Including several that pin visible
breakage nothing authorises fixing:

- `:62` *No trip shows a destination* — the API never sends one
- `:90` *The details heading ends with a separator and nothing after it* — a consequence of the above
- `:109` *Every row's headline is blank and only the smaller description carries the text*

All three are reproduced. §12 asks the gate whether that is really intended.

**New — NET-NEW (4–6):** the print view, which has no baseline at all — the `.clone()` path was never
captured (**1–2**); server-side `Trip.totalCost` derivation (Q-6, server scenarios, **1–2**); a
booking creating an itinerary item end-to-end, one scenario per producer (SEAM-3, **2**).

**Running total after Inc-3: 249–257.**

### 7.5 Open question this increment must close

**Does a cancelled item count towards a server-derived `Trip.totalCost`?** Q-6 says the server
derives the total from items; it does not say whether cancelled items are excluded. Today
`itinerary.feature:218` says they are included.

**Until that question is answered, `:218` is unclassified.** It is not SUPERSEDE — no recorded
decision authorises changing it, and ADR-005's default for an unauthorised scenario is PRESERVE. It
is not confidently PRESERVE either, because Q-6 plausibly implies exclusion. The plan therefore
carries it as **conditional** in every count (§3.2) rather than picking an answer it has no authority
to pick. It must be answered at the Inc-3 Step 1b gate, and if the answer is "excluded" that is an
API-visible change on top of Q-6 and needs recording as such.

### 7.6 FRD delta — `specs/frd-itinerary.md`

`## Migration Status` → React/3. `Trip.totalCost` requirement **rewritten** as server-derived (Q-6),
with the §7.5 answer recorded. Status-filter and Add-Note requirements **rewritten** from "control
exists but is inert" to working behaviour. New FR for the print view. *Integration Points* records
`itinerary:refresh` as a **restored** store subscription with Q-3/SEAM-3 named — and contrasts it
with `flight:selected`, dropped, so the asymmetry is documented where a reader will hit it.
*Known Limitations*: dead-control entries marked superseded; the destination/heading/headline entries
annotated *"preserved deliberately"*.

### 7.7 Verification & exit

```bash
npx cucumber-js specs/features/itinerary.feature   # 36–38
npx cucumber-js                                    # 249–257, all green
npm start                                          # AngularJS boots; 4 of 7 states remain
```

- [ ] SEAM-3 verified end-to-end from **both** producers
- [ ] Q-6 contract change reflected in `specs/contracts/api/itinerary.yaml` and its server scenarios
- [ ] §7.5 answered and recorded
- [ ] `@bypasses-ui` count is **0**
- [ ] `hotel-booking.feature:209` still passes — restoring `itinerary:refresh` must not tempt anyone
      into restoring `flight:selected` alongside it
- [ ] React route green before the AngularJS state is deleted; `bower_components/` untouched

**Commits:** `[impl] inc-3/itinerary — React route green` → `[increment] inc-3 — AngularJS route removed`

---

## 8. Increment 4 — travel-request

> Opens the request/expense chain. Establishes the large-form, validation and modal patterns that
> expense inherits. The best-pinned module in the product: 45 scenarios, **zero UI bypasses**.

### 8.1 Scope

`app/components/travel-request/*` → React. The largest form in the product (15 `ng-model`, 372-line
template), the most `$watch` (4) and `$timeout` (3), a jQuery-driven modal (ADR-007 cat 2), two
datepickers, and the inert search box. `approval-status.directive.js` is **not ported** (Q-10: 0
consumers, 130 lines, including the 6 dead `.css('transform')` sites). Q-2 turns the travel policy
from never-fetched into display-only.

### 8.2 Files

**Created** — React travel-request route, request list, summary cards, status filter, **working**
search, detail modal, the create/edit form with validation, cancel flow; a travel-request data
module; React unit tests.

**Modified** — route ledger; `tests/pages/travel-request.page.js`;
`specs/features/travel-request.feature`; `specs/frd-travel-request.md`; `app/index.html` navbar.

**Deleted** — after green: `travel-request.controller.js` (311), `travel-request.service.js` (90),
`travel-request.template.html` (372); the `travelRequest` state; two `<script>` tags at
`app/index.html:74-75`; **`app/directives/approval-status.directive.js`** (130, Q-10) and its
`<script>` tag at `:82`.

### 8.3 Gherkin delta — `specs/features/travel-request.feature`

**Affected — SUPERSEDE (9 of 45):**

| # | Line | Scenario | Why | Authorised by |
|---|---:|---|---|---|
| 9 | `:97` | *Searching throws an error and filters nothing* — a `TypeError` on `req.travelerName` escapes the digest, so `filteredRequests` is never reassigned | dead control 3 of 4 | **ADR-005** |
| 10 | `:102` | *The search box keeps the text I typed even though nothing happens* | same | **ADR-005** |
| 11 | `:106` | *Searching for something no request matches still lists everything* | same | **ADR-005** |
| 12 | `:110` | *A status filter set before a search survives the failed search* | same — there is no failed search any more | **ADR-005** |
| 20 | `:179` | *The destination field is marked when it is the field at fault* | **P-11**: `travel-request.controller.js:204` adds `has-error` and never removes it, so the field stays red until reload — the one asymmetric case of four | **ADR-007** cat 5 (both the 3-second auto-clear **and** the never-clearing variant are superseded) |
| 21 | `:184` | *The complaint cannot be dismissed* | third occurrence of the `ng-if` shadowing class | **ADR-005** (*"the un-dismissable alerts"*) |
| 27 | `:233` | *A request raised in a restored session is filed under "Demo User"* | ADR-003 constraint C-1 — identity does not survive reload; `travel-request.controller.js:172-173` falls back to the placeholder. Repairing C-1 is Inc-0 plumbing; this is where it becomes observable. | ADR-003 C-1; **ADR-006** |
| 35 | `:304` | *The portal never asks the server for the travel policy* | **Q-2**: publish policy limits (display-only) | **Q-2 / ADR-001** |
| 36 | `:308` | *No spending limit is shown anywhere on the page* | same | **Q-2 / ADR-001** |

**Untouched — PRESERVE (36 of 45):** the list and its columns (2), summary cards (2), edit/cancel
eligibility (2), status filtering (5), the detail dialogue (2), form show/hide/abandon (2), the
6-row required-field outline, the estimate and duration behaviour (3), submission and edit flows
(10), and:

- `:312` *A request far above the policy limit is accepted without a word* — **PRESERVE**, and it is
  the sharp edge of Q-2. Limits become *visible*; they are still never *compared against*. A React
  form that helpfully blocks over-limit requests breaks this scenario and exceeds Q-2.
- `:144` *The approval chain is never shown, though the server holds one* — **PRESERVE** per **Q-1**
  (the chain is informational; no approver UI).
- `:139` *The traveller line is blank because no request carries a traveller name* and `:241`
  *The form never collects who is travelling* — unauthorised; reproduced. §12.

**New — NET-NEW (5–6):** the search box actually filtering (the superseded scenarios assert the old
behaviour; the new behaviour needs its own scenarios, **2**); the policy display (Q-2, **2**); Q-7
ownership isolation for `/api/travel-requests` (**1–2**, and the enforcement point is a Phase 1d
decision — §13).

**Also re-pointed here (PRESERVE), from `authentication.feature` (§3.1):** 2 scenarios — the
`travel-request` rows of `:57` and `:124`. Neither supersedes here.

**Running total after Inc-4: 254–263.**

### 8.4 FRD delta — `specs/frd-travel-request.md`

`## Migration Status` → React/4. The search requirement **rewritten** from inert to working. The
validation requirement **rewritten** to one error shape, one presentation, no timers (ADR-007 cat 5)
— explicitly covering the never-clearing `has-error` (P-11). New FR for policy display (Q-2), with
the non-comparison constraint stated so nobody adds enforcement. New FR for ownership scoping (Q-7).
*Current Implementation* › *Files Involved*: record `approval-status.directive.js` as deleted
unported (Q-10), including the 6 dead transform sites, so the deletion is traceable.

### 8.5 Verification & exit

```bash
npx cucumber-js specs/features/travel-request.feature   # 49–51
npx cucumber-js                                         # 254–263, all green
npm start                                               # AngularJS boots; 3 of 7 states remain
```

- [ ] Full suite green; 9 superseded scenarios name their ADRs
- [ ] `:312` still passes — limits are displayed, never enforced (Q-2)
- [ ] `:144` still passes — no approver UI (Q-1)
- [ ] `approval-status.directive.js` deleted, not ported; the legacy app still boots without it
- [ ] React route green before the AngularJS state is deleted

**Commits:** `[impl] inc-4/travel-request — React route green` → `[increment] inc-4 — AngularJS route removed`

---

## 9. Increment 5 — expense-reconciliation

> Hardest module (37/45) and most product decisions. Last on both difficulty and dependency: Q-5
> needs travel-request to exist, and by now every pattern it requires — large form, modal, date
> control, data table, filter bar — is built and proven.

### 9.1 Scope

`app/components/expense-reconciliation/*` → React: 342-line controller, 396-line template, 29 scope
members, 54 functions, 34 lodash calls, 44 inline expressions. Absorbs **Q-4** (category vocabulary),
**Q-5** (`travelRequestId` linkage), **Q-9** (remove the currency selector), **SEAM-4** (a submitted
report is stored as a draft), **P-6** (client-minted `exp_` IDs), the trapped date-range filter, and
the fourth un-dismissable alert. `currency-input.directive.js` (120) and `currency.filter.js` (46)
are **not ported** (Q-10); `date-format.filter.js` (76) likewise. The receipt file input becomes a
ref-driven control (ADR-007 cat 7).

### 9.2 Files

**Created** — React expense route, spending dashboard, report list, status filter, search, date-range
filter, report form, line-item editor, receipt attachment, detail dialogue, delete flow; an expense
data module; React unit tests.

**Modified** — route ledger; `tests/pages/expense.page.js`;
`specs/features/expense-reconciliation.feature`; `specs/frd-expense-reconciliation.md`;
`app/index.html` navbar; **`api-mock/server.js`** (SEAM-4 submitted-vs-draft; Q-5 linkage validation;
P-6 server-assigned line-item IDs); `specs/contracts/api/expense-reconciliation.yaml`.

**Deleted** — after green: `expense.controller.js` (342), `expense.service.js` (113),
`expense.template.html` (396); the `expenses` state; two `<script>` tags at `app/index.html:76-77`;
`currency-input.directive.js` (120), `currency.filter.js` (46), `date-format.filter.js` (76) and
their `<script>` tags at `:81`, `:85`, `:86`.

### 9.3 Gherkin delta — `specs/features/expense-reconciliation.feature`

**Affected — SUPERSEDE (17 of 57):**

| # | Line | Scenario | Why | Authorised by |
|---|---:|---|---|---|
| 2 | `:57` | *The approved total is structurally zero because no report can reach that status* | **SEAM-4** | ADR-002 SEAM-4 |
| 7 | `:88` | *A report with no submission date renders the words "Invalid date"* | `moment(undefined).format(...)` emits the literal string into the table. Explicit parsing renders an absent date as absent. | **ADR-009** |
| 20 | `:155` | *Clearing the dates does not bring the reports back* | dead control 4 of 4 — the `$watch` guard re-filters only when a bound is *set*, so clearing both leaves the table filtered behind two empty inputs | **ADR-005** |
| 21 | `:162` | *Touching the search box escapes the stuck date filter* | exists only to describe the escape hatch from the trap above | **ADR-005** |
| 25 | `:187` | *The category dropdown offers twelve values that no stored expense uses* | **Q-4**: the 5 lowercase server values are canonical | **Q-4 / ADR-001** |
| 26 | `:192` | *The currency dropdown offers six values that change nothing* | **Q-9**: single currency (USD); remove the selector — no rate source exists | **Q-9 / ADR-002** |
| 29 | `:224` ×3 | *An incomplete line item is refused in silence with three fields flashed* | ADR-007 cat 5 — one error shape, one presentation, no timers | **ADR-007** cat 5 |
| 30 | `:238` | *The flashed fields are the date, description and amount* | same | **ADR-007** cat 5 |
| 31 | `:243` | *The flash clears itself after three seconds* | same — the timer is removed | **ADR-007** cat 5 |
| 32 | `:249` | *A line item with no category is accepted and buckets under a blank label* | **Q-4** | **Q-4 / ADR-001** |
| 35 | `:280` | *Picking an expense date fills the field with a raw JavaScript date string* | same mechanism as flight-search `:91` | **ADR-009** |
| 41 | `:321` | *The expense error alert cannot be dismissed* | fourth occurrence of the `ng-if` shadowing class | **ADR-005** |
| 42 | `:330` | *A submitted report is stored as a draft, credited to Demo User, and stays deletable* | **SEAM-4** (status) + ADR-003 C-1 (attribution) | ADR-002 SEAM-4; ADR-003 C-1 |
| 50 | `:398` | *A linked travel request id is stored without being checked (SEAM-5)* | **SEAM-5** `defect-to-fix`; **Q-5** makes the linkage optional-but-valid | ADR-002 SEAM-5; Q-5 |
| 51 | `:408` | *There is no approval endpoint for an expense report (SEAM-4)* | **SEAM-4** | ADR-002 SEAM-4 |

**Untouched — PRESERVE (40 of 57):** the dashboard (4 of 5), the report list and its formatting (4),
status filtering (4), search (4), the from-date filter (4), the form open/cancel (3), line-item add,
remove and totalling (3), the receipt flow (2), report validation (2), notes, the detail dialogue
(3), delete flow (2), and the remaining server scenarios (3). Including several unauthorised
defects reproduced verbatim — `:113` the Draft filter's unselected button, `:119` the
create-your-first-report empty state offered while two reports exist, `:268` the stale total left in
the model, `:64` the top spending category derived but never displayed, `:366` the detail dialogue's
blank submission date and item count. §12.

> **P-6 is a special case.** `_.uniqueId('exp_')` mints line-item IDs in the browser and the counter
> resets to `exp_1` on every page load. **No scenario pins it** — grep across all six feature files
> finds no `exp_` assertion. Moving to server-assigned IDs is therefore *unobserved* behaviour
> change: no scenario supersedes, but it is a real change and gets a NET-NEW scenario rather than
> being made silently. It is also the **second** unauthorised behaviour change in the plan, which
> sits awkwardly beside §11.1's *"exactly one"* — see §11.3 and gate decision 6.

**Also superseded here, from `authentication.feature` (§3.1) — 5 scenarios:**

| Line | Scenario | Why it changes here | Authorised by |
|---:|---|---|---|
| `:114` | *Signing in announces itself to the modules that care* — asserts a `$rootScope` listener is registered, checked **on the expenses page** | once expenses is React there is no `$rootScope` to inspect | **ADR-005** (P-5) |
| `:138` | *Nothing is listening for a sign-out announcement* — also checked on the expenses page | same | **ADR-005** (P-5) |
| `:179` | *After a reload my work is attributed to a placeholder* — *"a new expense report would be filed by `Demo User`"* | ADR-003 **C-1**: Inc-0's identity rehydration means the report is filed by the real user. Observable the moment expenses is React. | ADR-003 C-1 |
| `:193` | *A token the server rejects still opens the portal* — *"I go straight to expenses"*, *"I am let in"* | 401 policy | **401 policy** (ADR-005 follow-on 5) |
| `:199` | *A rejected session looks like an empty expense account* | 401 policy | same |

**Also re-pointed here (PRESERVE):** the `expenses` rows of `:57` and `:124`, and `:226` *The next
move after losing my session sends me to the login screen* (the guard still bounces). 3 scenarios.

**Expense supersede count: 17. With the 5 authentication scenarios, Inc-5 supersedes 22.**

**New — NET-NEW (7–9):** the date-range filter clearing correctly (**1**); Q-4's five canonical
categories (**1**); Q-5 linkage validated against a real travel request (**1–2**); SEAM-4's submitted
status and the approval surface (**1–2**); server-assigned line-item IDs, P-6 (**1**); Q-7 ownership
isolation for `/api/expense-reports` (**1**); **ADR-009's *"An absent submission date renders as
absent, not as text"*** (**1**), which pairs with superseding `:88`.

**Running total after Inc-5: 261–272.**

### 9.4 FRD delta — `specs/frd-expense-reconciliation.md`

`## Migration Status` → React/5. Category requirement **rewritten** to the 5 server values (Q-4).
Currency requirement **deleted** — the selector goes (Q-9), and the deletion is recorded rather than
dropped. Date-range filter **rewritten** as symmetric. Validation **rewritten** to ADR-007 cat 5.
Submission **rewritten** — a submitted report reaches submitted status (SEAM-4). Linkage
**rewritten** — `travelRequestId` optional but validated (Q-5, SEAM-5). New FR for server-assigned
line-item IDs (P-6). New FR for ownership scoping (Q-7). *Known Limitations*: 20–28 marked superseded
where authorised; the five unauthorised entries annotated *"preserved deliberately"*.

### 9.5 Verification & exit

```bash
npx cucumber-js specs/features/expense-reconciliation.feature   # 64–66
npx cucumber-js                                                 # 261–272, all green
npm start                                                       # AngularJS boots; 2 of 7 states remain (login, dashboard)
```

- [ ] Full suite green; 17 superseded scenarios name their ADRs
- [ ] Q-9's currency selector is gone and its FRD requirement is deleted, not orphaned
- [ ] All three Q-10 dead files deleted unported; the legacy app still boots
- [ ] React route green before the AngularJS state is deleted
- [ ] `bower_components/` **still** untouched — this is the last increment where that is true

**Commits:** `[impl] inc-5/expense — React route green` → `[increment] inc-5 — AngularJS route removed`

---

## 10. Increment 6 — Cutover

> Its own increment, deliberately. Not a bullet at the end of Inc-5.

### 10.1 Why cutover also carries the authentication surface

By the end of Inc-5, AngularJS owns exactly one route: `/` — login and dashboard — plus the chrome
that lives in `app/index.html` (navbar, notification area). Cutover is the increment that takes it.

That has a consequence the gate should see plainly. **The authentication *surface* lands here**, not
in Inc-0, because:

- ADR-006 merged authentication into Inc-0. But the Plan Review gate requires *"Increment 0 is a
  walking skeleton with **no feature migration**"*, and moving the login screen to React is
  migrating a feature.
- With no in-page bridge (§2.1), React cannot own the login screen while AngularJS still serves `/`.
  There is no third option: either React takes `/` early — which strands the AngularJS app without a
  way in — or it takes it last.
- Q-8's credential form, sign-out (which exists nowhere today) and the 401 policy are **net-new**
  behaviour. They need a React route the user can actually reach, and until Inc-6 there isn't one at
  `/`.

**This is a deviation from ADR-006, and it needs a decision.** ADR-006 itself states *"The order is a
plan, not a contract… Any resequencing supersedes this ADR."* → **ADR-010** (§11.2).

> **The gate may reasonably reject this.** Inc-6 is the largest behavioural increment in the plan —
> 20 superseded scenarios plus 6–9 net-new, on top of deleting the entire legacy stack. The
> alternative is to split it: **Inc-5b** takes `/` and the authentication surface, **Inc-6** becomes
> pure deletion. That is arguably the better shape, and it costs only an increment boundary. The
> plan presents the 7-increment form because that is the shape asked for; §14 puts the split on the
> gate agenda explicitly.

### 10.2 Scope

**Authentication surface** — React login screen with the **Q-8 credential form** (the API already
checks credentials; a second employee, Mike Chen, already exists server-side), a **sign-out
control** (net-new: `AuthService.logout` has no caller, no control on any of the six screens, and
`$rootScope` has zero `auth:logout` listeners), the React navbar identity display, notification area
and dashboard.

> **The C-1 repair and the 401 policy are *not* built here.** Both are Inc-0 plumbing — identity
> rehydration via `GET /api/auth/me` (which the portal has never called) and the 401 handling path
> live in the token store and API client from the start. What arrives per increment is
> **observability**: the 401 policy supersedes 3 scenarios in Inc-3 and 2 in Inc-5, and C-1
> supersedes 1 in Inc-5, because those scenarios assert on the itinerary and expenses screens
> (§3.1). Inc-6 supersedes only the two that assert on `/` itself — `:156` and `:165`. Building the
> policy in Inc-0 and revealing it route by route is the only sequencing that does not require
> shipping a knowingly-broken 401 path on React routes for three increments.

**Legacy removal** — delete `app/` (27 files, 4925 lines), `bower.json`, `.bowerrc`,
`bower_components/` (964 tracked files), `Gruntfile.js`; prune `package.json` of grunt and its 6
contrib plugins; retire the front door's proxy leg (one origin, one document, one app).

### 10.3 Files

**Created** — React login route, credential form, sign-out control, session-expiry handling,
navbar, notification area, dashboard; React unit tests; net-new Gherkin.

**Modified** — route ledger (`/` → React; the AngularJS leg removed entirely); `package.json`;
`tests/pages/auth.page.js` (the `#!/…` route map becomes real paths — the largest single re-point in
the migration, 8 of the 14 `#!/` literals live here); `specs/features/authentication.feature`;
`specs/frd-authentication.md`; `README.md`; CI workflow (the Karma leg is already gone; the legacy
serve leg goes now).

**Deleted** — after green: `app/` entire; `bower.json`; `.bowerrc`; `bower_components/`;
`Gruntfile.js`; the `serve`/`build` grunt scripts and 7 grunt devDependencies. `app/` still contains
the last two Q-10 dead files at this point — `services/api.service.js` (61) and
`services/user.service.js` (30), 0 consumers each — which go with it, unported.

### 10.4 Gherkin delta — `specs/features/authentication.feature`

> **Read §3.1 first.** 20 of authentication's 36 browser-driving scenarios re-point *before* this
> increment, and 8 of them supersede in Inc-3 and Inc-5 rather than here, because they assert on the
> itinerary and expenses screens. What follows is Inc-6's **residual**: the 16 scenarios that assert
> on `/` — login, dashboard and the chrome.

**Affected — SUPERSEDE (12 of the 16 residual, + 2 pending):**

| # | Line | Scenario | Why | Authorised by |
|---|---:|---|---|---|
| 2 | `:43` | *The login screen asks for no credentials* | **Q-8**: build the real credential form | **Q-8 / ADR-002** |
| 6 | `:82` | *Entering the portal signs me in as the built-in employee* | Q-8 — the hardwired employee goes | **Q-8** |
| 7 | `:89` | *The portal signs in with credentials nobody typed* | Q-8 | **Q-8** |
| 11 | `:124` ×6 | *No screen offers a way to sign out* — **all six rows** | the rows re-pointed one per increment (§3.1) but **passed** throughout, because no React chrome offered sign-out either. All six supersede **here**, together, the moment sign-out ships. | **Q-8 / ADR-005** |
| 14 | `:156` | *Reloading the page keeps my token but forgets who I am* | ADR-003 **C-1** repair, observable on `/` | ADR-003 C-1; **ADR-010** |
| 15 | `:165` | *The portal never asks the server who the token belongs to* | C-1 repair — `GET /api/auth/me` is called | ADR-003 C-1 |
| 25 | `:243` | *Entering the portal a second time replaces my session token* | with a real form and a real guard, the second entry is a different interaction | **Q-8** |

That is 3 + 6 + 2 + 1 = **12**.

> **`:124` is the clearest illustration of re-point ≠ supersede.** Its six rows change owner across
> five increments, and none of them changes *outcome* until Inc-6. A plan that superseded them
> per-increment would be wrong; a plan that ignored the per-increment re-point would leave five gates
> unable to account for them.

**Pending (2)** — decided at the Inc-6 Step 1b gate, not now:

- `:143` *The dashboard carries no controls at all* — PRESERVE if sign-out lives in the navbar,
  SUPERSEDE if it lives on the dashboard.
- `:237` *A signed-in user can walk back to the login screen* — PRESERVE if `/login` stays reachable
  when signed in, SUPERSEDE if the guard redirects to the dashboard. Either is defensible; silence
  is not.

**Untouched — PRESERVE (2 of the residual + 15 API-only, less 1 conditional):**

- Residual browser-driving: `:36` *The portal opens on the login screen*, `:50` *The navigation bar
  advertises the protected areas to a stranger*, `:72` *An unknown address falls back to the login
  screen*, `:95` *Entering the portal stores a session token*, `:103` *The dashboard is the way into
  every module*, `:274` *The server can identify the holder of a token*, and the `dashboard` rows of
  `:57` and `:124`… of which `:124`'s dashboard row supersedes with its five siblings above. Net
  residual PRESERVE: **`:36`, `:50`, `:57` dashboard row, `:72`, `:95`, `:103`, `:274`**.
- **The API-only scenarios** (§0.3, §1.5): **14 never re-pointed and never edited** — green on the
  day before Inc-0 and the day after Inc-6, the cleanest evidence that the seam held. The fifteenth,
  `:314`, is SUPERSEDE-conditional on the Q-7 enforcement point and resolves in whichever increment
  implements trip ownership.

> **JWT-in-`localStorage` is preserved deliberately**, not by omission. `:95` *Entering the portal
> stores a session token* stays green. It is an accepted risk with a follow-up owner, not a resolved
> one — and it needs its own ADR at `tech-stack-resolution` (§13).

**New — NET-NEW (8–9):** signing in as a second real user (Mike Chen exists server-side and is
unreachable through the UI today, **2**); signing out and being returned to login (**2**); an expired
or rejected session on `/` telling the user *the session* is the problem (**2**); identity surviving
reload (**1**); hash-route compatibility — whether `#!/flights` redirects or 404s (**1–2**, **and the
decision is a Phase 1d output**, §13).

**Running total after Inc-6: 269–281.**

### 10.5 FRD delta — `specs/frd-authentication.md`

The largest FRD delta in the plan, and mostly *additive specification* rather than migration.
`## Migration Status` → React/6 for the auth surface, and all six FRDs updated to
`owner: React · AngularJS: deleted`. New FRs for the credential form (Q-8), sign-out, the 401 /
session-expiry policy, and identity restoration via `GET /api/auth/me` (C-1). *Current
Implementation* › *Known Limitations* 1, 2, 3, 6, 13, 14, 17, 20, 21, 22 marked superseded with their
ADRs. A note recording that `localStorage` persistence is retained as an accepted risk with a named
follow-up.

### 10.6 Verification & exit

```bash
<build>                        # production build succeeds
npx cucumber-js                # 269–281, all green — including the 14 untouched API-only
<react unit runner>            # all six features covered (closes T-2)
<lint>                         # clean
npm start                      # React only; there is no AngularJS app left to start
```

- [ ] Full suite green
- [ ] The 15 API-only scenarios have **never been edited** — `git log -p` on their line range shows
      no change since the baseline gate. This is the single best evidence that the seam held.
- [ ] Zero AngularJS artefacts: `app/`, `bower.json`, `.bowerrc`, `bower_components/`, `Gruntfile.js`
      all gone; `grep -ri angular src/ package.json` returns nothing
- [ ] `package.json` holds no grunt, no karma, no jasmine
- [ ] React unit tests exist for all six feature areas (T-2 closed); `data-testid` in every component
      (T-3 closed)
- [ ] Both pending scenarios (§10.4) decided and recorded
- [ ] 0 skip markers; `@bypasses-ui` 0; `@existing-behavior` retired or re-tagged per the Step 1b gate

**Commits:** `[impl] inc-6/auth — React owns /` → `[increment] inc-6 — cutover complete, AngularJS deleted`

---

## 11. Deliberate behaviour changes and their ADRs

Everything else in this migration either preserves behaviour or changes it under a decision that
**already exists** (Q-1…Q-12, SEAM-1…SEAM-5, ADR-005, ADR-006, ADR-007). Scanning Phase A for
**user-visible** behaviour changes it proposes that **no prior decision authorises**, there is
exactly one. A second candidate — P-6, client-minted expense IDs — changes behaviour that nothing
observes; §11.3 sets out why it is treated differently and puts the judgement to the gate.

### 11.1 ADR-009 — Explicit date parsing *(the one deliberate behaviour change)*

**Candidate:** assessment **D-9** — *moment 2.18.1, 77 call sites … compounded by the format-less
parsing warning the README documents*. Re-measured: **79 moment call sites, 76 in live files**.

Every other Phase A finding that changes behaviour traces to an existing decision:

| Finding | Changes behaviour? | Already authorised by |
|---|---|---|
| P-2 four dead controls | yes | ADR-005 (*"the four dead controls"*) |
| P-7 `ngRepeat:dupes` | yes | ADR-005 (*"blocking hotel booking"*) |
| P-10 / P-11 validation in the DOM | yes | ADR-007 cat 5 |
| A-7 hash routing | yes | ADR-005 follow-on 2 → Phase 1d |
| P-6 client-minted IDs | yes, but **unobserved** | nothing — see §11.3 |
| D-8 `ui.bootstrap` unused | no | 0 consumers |
| D-10 lodash, D-11 grunt, A-1…A-6, T-*, C-*, X-*, Doc-* | no | structural / additive |
| **D-9 date parsing** | **yes** | **nothing — this ADR** |

**What actually happens today** (traced through the source, because the README's one-line version is
misleading):

1. `flight-search.template.html:57` is `<input type="text" id="departDate" ng-model="…">` — a plain
   text field, freely typeable.
2. jQuery UI upgrades it (`controller:72`, `dateFormat: 'mm/dd/yy'`). Picking from the calendar fires
   `onSelect`, which does `new Date(dateText)` at `controller:77` — a **native parse of a non-ISO
   `mm/dd/yyyy` string**, which the ECMAScript spec leaves implementation-defined.
3. The resulting `Date` reaches `moment(newVal)` at `controller:47`. Because it is a `Date` and not a
   string, moment parses it deterministically and **logs nothing**.
4. **Typing** into the field never fires `onSelect`. `ng-model` then binds the raw **string**, and
   `moment("08/15/2026")` at `controller:47` falls back to `new Date()` with the deprecation warning
   the README records.
5. `tests/pages/flight-search.page.js:7` documents why the baseline never types a date: *"a typed
   value never fires `onSelect`, so the Angular model would stay null while the field looked
   filled."*

So the loose-parse path is **real but unobserved** — no baseline scenario reaches it, because typing
a date is itself broken. That makes this ADR necessary rather than optional: without it, "React parses
dates explicitly" would arrive as an undocumented change to code nobody has tested.

**Decision:** parse with an explicit format at every input boundary; render with an explicit format at
every output boundary; an unparseable value is a validation failure, never an `Invalid Date` that
flows onward.

**Why it is a change, not a fix:** a user in a locale where `08/09/2026` means 8 September currently
gets 9 August from the engine's month-first reading. Deterministic parsing makes that explicit and
may make it *different*. That is user-visible, so it needs a Gherkin delta and this ADR.

**Gherkin delta referenced by the ADR** — 4 superseded, 3 net-new, across 3 increments:

| Increment | Scenario | Class |
|---|---|---|
| 1 | `flight-search.feature:91` *A chosen date is shown as a raw date string* | SUPERSEDE |
| 1 | A typed departure date is accepted | NET-NEW |
| 1 | An unparseable typed date is refused with a message | NET-NEW |
| 2 | `hotel-booking.feature:51` *A chosen date is displayed as a raw JavaScript date string* | SUPERSEDE |
| 5 | `expense-reconciliation.feature:88` *A report with no submission date renders the words "Invalid date"* | SUPERSEDE |
| 5 | `expense-reconciliation.feature:280` *Picking an expense date fills the field with a raw JavaScript date string* | SUPERSEDE |
| 5 | An absent submission date renders as absent, not as text | NET-NEW |

Travel-request has 2 datepickers but **no scenario pinning raw-date display**, so it takes no delta
from this ADR — only the implementation note that its date validation
(`travel-request.feature:174`, *"Return date must be after departure date"*) now sits on explicit
parsing. That rule is **PRESERVE**.

> The library that replaces moment is **not** decided here. This ADR decides *explicit parsing*;
> Phase 1d decides *what does the parsing*.

→ `specs/adrs/adr-009-explicit-date-parsing.md` · status **proposed**

### 11.2 ADR-010 — The authentication surface moves to the cutover increment

Not a behaviour change; a **sequencing** change, and ADR-006 requires an ADR for one. §10.1 has the
argument. → `specs/adrs/adr-010-authentication-surface-sequencing.md` · status **proposed**

### 11.3 P-6 — the second unauthorised change, and why it does not get an ADR yet

§11.1 opens by claiming Phase A surfaces *exactly one* deliberate behaviour change. **P-6 is a
second candidate and the claim needs qualifying rather than defending.**

`expense.controller.js:163` mints line-item IDs with `_.uniqueId('exp_')`, and the counter resets to
`exp_1` on every page load — so IDs are not unique across sessions and can collide server-side. The
assessment's remediation is server-assigned IDs. No Q-decision, SEAM or ADR authorises that.

The difference from ADR-009:

| | ADR-009 (dates) | P-6 (IDs) |
|---|---|---|
| User-visible? | **yes** — a date can be interpreted differently | **no** — line-item IDs are never rendered |
| Pinned by a baseline scenario? | yes — 4 supersede | **no** — zero `exp_` assertions in all six feature files |
| Changes what a user gets? | yes | no; it changes whether two sessions can collide |

So P-6 is a **correctness fix with no observable surface**, not a deliberate behaviour change in
ADR-005's sense — which is why §11.1's "exactly one" holds for *user-visible* change, and why P-6 is
handled as a NET-NEW scenario in Inc-5 rather than a supersession.

**But that is a judgement, not a decision.** The gate should either confirm it (P-6 rides in Inc-5 as
net-new), give it its own ADR, or drop it from scope and keep client-minted IDs. §14 decision 6.

> ADR numbering continues from **ADR-008** (the last in `.spec2cloud/state.json`). This step takes
> **009** and **010**; `tech-stack-resolution` continues from **011**.

---

## 12. Defects this plan is committed to reproducing

Under ADR-005, a scenario with no authorising decision is PRESERVE — which means React must
faithfully reproduce it. That rule is right (it is what stops a failing scenario being "fixed" by
weakening it), but it has a cost, and the cost should be visible **before** Phase 2 rather than
discovered as an argument in an increment gate.

**These are the scenarios this plan will reproduce, bug and all, unless the gate authorises
otherwise** — **14 defect scenarios**, plus one deliberate case listed separately because it is
different in kind:

| Increment | Scenario | What gets reproduced |
|---|---|---|
| 1 | `flight-search.feature:62` | the searched departure date never reaches the results — flights come back dated today |
| 1 | `flight-search.feature:177` | flights are offered with no flight number |
| 2 | `hotel-booking.feature:91` | the hotel card has a place for an address and never shows one |
| 2 | `hotel-booking.feature:61` | choosing a check-in after the check-out silently discards the check-out |
| 3 | `itinerary.feature:62`, `:90`, `:109` | no trip shows a destination; the details heading ends in a dangling separator; every row headline is blank |
| 4 | `travel-request.feature:139`, `:241` | the traveller line is blank, and the form never collects who is travelling |
| 5 | `expense-reconciliation.feature:113` | the Draft filter applies but its button never looks selected |
| 5 | `expense-reconciliation.feature:119` | filtering to an empty status offers to create a first report while two exist |
| 5 | `expense-reconciliation.feature:268` | removing the last line item leaves a stale total in the model |
| 5 | `expense-reconciliation.feature:64` | the top spending category is computed across all reports and never displayed |
| 5 | `expense-reconciliation.feature:366` | the detail dialogue shows a blank submission date and a blank item count on every report |

**Fourteen scenarios.** Every one is cheap to fix while the component is being written and expensive
to fix afterwards.

> **Listed separately, because it is different in kind:** `hotel-booking.feature:209` — *selecting a
> flight does not carry the destination to hotels* — is also reproduced without authorisation, but
> reproducing it is a **deliberate design position** (§2.4), not an accepted cost. The other fourteen
> are things the plan would fix if someone said yes; this one is a thing the plan argues *should not*
> be fixed without a new FRD acceptance criterion. It is not part of the fourteen, and the gate
> should not treat it as a batch item.

**The gate's choice on the fourteen is binary and should be made explicitly:** authorise them now (a
new ADR, moving them to SUPERSEDE and adding their Gherkin deltas to the affected increments), or
confirm that reproducing them is intended. §14 decision 3.

---

## 13. Handed to `tech-stack-resolution` (Phase 1d) — not decided here

| # | Item | Why the plan raises it | Constraint the plan imposes |
|---|---|---|---|
| 1 | Bundler / toolchain | A-1: no build step exists | must produce the React document served by the front door |
| 2 | **Router, and hash vs real paths** | A-7 — and §1.2 shows this is **load-bearing, not cosmetic** | React routes **must be real paths**; a fragment-based React router makes route ownership inexpressible and the plan unbuildable |
| 3 | Front door | §1.2 | exactly one origin; the ledger is data, not scattered conditionals |
| 4 | Data-fetching client | D-3, D-12, A-4 | one base URL from config, one auth header, one error policy |
| 5 | Client state store | P-5 — **29 emit sites across 5 events**, corrected from 24 (§0.2) | must map all five events including the two that map to nothing (§4.3) |
| 6 | **Date library** | D-9 / **ADR-009** | must support explicit parse formats; ADR-009 decides the behaviour, Phase 1d decides the package |
| 7 | Unit runner + component testing library | D-7, ADR-008 §3 | must exist before Inc-1 needs it |
| 8 | Styling approach | A-6: 699 lines of unscoped global CSS | ADR-005 carries Bootstrap 3 forward initially |
| 9 | Component library | — | **`angular-ui-bootstrap` is dropped outright** (D-8: 0 `uib-*` directives, 0 `$uibModal`). Do not replace a dependency nothing used. |
| 10 | **Hash-route compatibility** | §10.4 net-new | redirect `#!/flights` → `/flights`, or let it break — **either answer is fine, silence is not** |
| 11 | **Q-7 ownership enforcement point** | ADR-005 follow-on 4, §1.5 | server-side filter vs client-side. If server-side, `authentication.feature:314` — one of the 15 API-only control scenarios — supersedes. Decide before the increment that implements trip ownership |
| 12 | **401 / session-expiry policy** | ADR-005 follow-on 5 | net-new, and **needed by Inc-3, not Inc-6**: it supersedes 3 scenarios in Inc-3 and 2 in Inc-5 (§3.1). It cannot be deferred to the cutover increment |
| 13 | **JWT storage** | §10.4 | `localStorage` is retained for this lab. Record as an **accepted risk with a named follow-up owner** — not "resolved", and not silently |
| 14 | **ADR-008 §5 extension** | §1.4 | permit page-object **URL** re-pointing on the same footing as `data-testid` re-pointing. Without it every feature increment technically violates ADR-008 §7. *(The §0.6 clock pin does **not** need this — it edits no scenario.)* |
| 15 | Assessment summary correction | §0.1 | `specs/assessment/modernization.md` §Summary and `state.json` both carry 34/5/13/13/3 against a measured 41 (5/15/18/3) |
| 16 | ADR-005 / ADR-006 conflict | §1.7 | ADR-006's *"both frameworks are loaded simultaneously"* contradicts ADR-005's *"not in one page"*. Settle it before Inc-0 |
| 17 | **Suite clock policy** | §0.6 | the pinned clock is verified and chosen; Phase 1d confirms the pinned instant and whether CI also runs an unpinned canary on a cadence. The suite decayed silently for 17 days because nothing ran it |

**Not in scope and not to be smuggled in:** a form library (travel-request is validation-heavy, but
that is an Inc-4 decision made when the form is visible), a UI kit, a schema-validation library
beyond what item 4's error policy needs. Every entry above traces to a finding or an FRD. Anything
that does not, does not go in the stack.

---

## 14. Plan Review gate

### The checklist

- [ ] **Increment 0 is a walking skeleton with no feature migration** — §4; the proof is that its
      Gherkin delta is `0 / 235 / 0` and `git diff -- specs/features/` is empty
- [ ] **Every increment lists files created / modified / deleted** — §4.4, §5.2, §6.4, §7.3, §8.2,
      §9.2, §10.3
- [ ] **Every increment carries a Gherkin delta** — §4.5, §5.3, §6.5, §7.4, §8.3, §9.3, §10.4, at
      scenario granularity with line numbers and authorising ADRs, **and §3.1 accounts for the
      scenarios that cross feature-file boundaries**
- [ ] **Every increment carries an FRD delta** — §4.6, §5.4, §6.6, §7.6, §8.4, §9.4, §10.5
- [ ] **Every increment has a verification command** — §4.7, §5.5, §6.7, §7.7, §8.5, §9.5, §10.6
- [ ] **"The legacy app keeps working until the final increment" is visible** — §2.1, and every
      increment's exit criteria include `npm start` and an untouched `bower_components/`
- [ ] **AngularJS route removal is sequenced after the React route goes green, per module** — §2.3,
      enforced as two separate commits in every feature increment
- [ ] **Cutover is its own increment** — §10
- [ ] **`flight:selected` is answered honestly, not designed around** — §2.4: unserved in the gap,
      and deliberately still unserved afterwards, because nothing authorises the fix
- [ ] **Inc-2 is planned as discovery, not as a port** — §6.1, §6.2, with a ranged Gherkin delta
- [ ] **Exactly one deliberate user-visible behaviour change, with an ADR and a Gherkin delta** —
      §11.1; the second candidate is surfaced rather than buried — §11.3
- [ ] **No figure is quoted from the assessment without re-measurement** — §0, including the
      approved "235 green", which is **189/235** today (§0.6)

### Six decisions the gate must make

1. **§1.7 — ADR-005 vs ADR-006 on "both frameworks loaded simultaneously".** This plan implements
   ADR-005's reading. If ADR-006 was meant literally, §1.2–§1.4 are wrong and the plan must be
   re-run. *Blast radius: the whole plan.*
2. **§10.1 — does cutover carry the authentication surface, or is there an Inc-5b?** The plan
   presents 7 increments because that is the shape asked for. Splitting is defensible and arguably
   better balanced. *Blast radius: one increment boundary.*
3. **§12 — the 14 reproduced defects.** Authorise them now with an ADR, or confirm reproduction is
   intended. *Blast radius: 14 scenarios and roughly a day of avoidable rework if deferred.*
4. **§7.5 — do cancelled items count towards a server-derived `Trip.totalCost`?** Q-6 does not say,
   so `itinerary.feature:218` is currently unclassified. *Blast radius: one scenario and one API
   response field.*
5. **§1.5 / §13 item 11 — where is Q-7 ownership enforced?** If server-side,
   `authentication.feature:314` supersedes and the "14 API-only scenarios never edited" control
   becomes 13. *Blast radius: one scenario, the API contract, and the strength of the §1.5 argument.*
6. **§11.3 — P-6, client-minted expense IDs.** Confirm it rides in Inc-5 as net-new, give it its own
   ADR, or drop it from scope. *Blast radius: one scenario and one server field.*

> Decisions 4, 5 and 6 are the reason §3.2's supersede figure is a range (**65–69**) rather than a
> number. The plan states the range instead of picking answers it has no authority to pick.

### Not done here, deliberately

The target stack is **not** resolved. No package is named anywhere in this document. §13 is the
hand-off. **Stop.**

