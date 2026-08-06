# Step 04 · Green Baseline (Track A)

> **Phase** B3 · Track A &nbsp;|&nbsp; **Branch** [`lab/04-green-baseline`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/04-green-baseline) &nbsp;|&nbsp; **Parent** `lab/03-testability-gate`
> **Human gate** 🧑‍⚖️ Green Baseline (consolidated) &nbsp;|&nbsp; **Status** ✅ Verified — 235 scenarios green, one gate item open

---

## 🎯 Goal

Turn every FRD behaviour into an executable scenario that **passes against the legacy AngularJS
app**. Not the app you want. The app you have.

When this step is done you have a regression net. Every subsequent React commit is measured
against it, and the question *"did we just change the behaviour of the system?"* becomes
answerable by a command instead of an argument.

> ## ⚠️ The golden rule
> **If a test fails against the legacy app, fix the test — not the app.**
> The legacy behaviour, bugs included, *is* the specification.

---

## 🧰 Skills invoked

Three per feature, in order:

| # | Skill | Mode | Writes |
|---|-------|------|--------|
| A1 | `gherkin-generation` | `capture-existing` | `specs/features/{feature}.feature` tagged `@existing-behavior` |
| A2 | `test-generation` | `green-baseline` | Cucumber step definitions, Playwright e2e specs, unit tests |
| A3 | `test-runner` | verification | test output — must be green |

Supporting: `playwright-cli` (drives the real browser), `e2e-generation` (POMs).

---

## ✅ Prerequisites

- [ ] [Step 03](03-testability-gate.md) approved — Track A recorded in `state.json` and adr-003
- [ ] `npm start` running: mock API on :3000, app on :8080
- [ ] Playwright browsers installed (the dev container does this for you)

---

## 🌿 Branch setup

```bash
git switch lab/03-testability-gate
git switch -c lab/04-green-baseline
```

---

## 🗣️ The prompts

One feature at a time. Start with `flight-search` — it is the richest and it is the only module
with existing tests to reconcile.

### A1 — Gherkin capture

```text
Track A, step A1. Capture the existing behaviour of flight-search as Gherkin.
This feature only.

Work from the FRD's Current Implementation section, with the running app at
http://localhost:8080/#!/flights as the tiebreaker — if the FRD and the app
disagree, the app wins and the FRD gets corrected.

Scenarios describe what this app does TODAY. Bugs included, surprises included. If
the behaviour is odd, the scenario is odd. Nothing aspirational: no "should validate
gracefully" unless it demonstrably does. Use the vocabulary a user would use, not
$scope property names.

Four behaviours in here are counter-intuitive enough that I want to see them
explicitly pinned, because they are exactly what a migration will "helpfully" fix:
  - setting a departure date after the current return date silently moves the
    return date forward by one day
  - after every search, the max-price filter resets to the highest price in the
    new result set, discarding what the user had set
  - the departure-time buckets are morning 06:00-11:59, afternoon 12:00-17:59,
    evening 18:00-05:59
  - clicking an already-sorted column reverses it

Tag everything @existing-behavior @feature-flight-search. Show me the feature file
before you generate any tests.
```

### A2 — Test scaffolding

```text
Track A, step A2. Scaffold green-baseline tests for
specs/features/flight-search.feature, targeting the LEGACY app.

Five things about this app that will cost you an hour if you discover them yourself:
  - Login is a mock: go to http://localhost:8080 and click "Enter Portal", which
    writes a JWT to localStorage. Capture it as Playwright storage state and reuse
    it — do not log in in every scenario.
  - Routing is hash-based. It is #!/flights, not /flights.
  - The date fields are jQuery UI datepickers bound to #departDate and #returnDate.
    Setting .value directly will not trigger what the widget listens for.
  - A #search-overlay spinner fades in and out over 200ms. Wait for results, never
    for a timeout.
  - Selecting a flight animates a 400ms scroll before the details panel settles.

These tests are a snapshot, not an aspiration — they pass against the code as it
exists right now. Nothing under app/ changes.
```

### A3 — Green verification

```text
Track A, step A3. Run the flight-search tests against the legacy app and get them
green. Paste the full output.

When a test fails, the test misunderstood current behaviour — fix the test, never
app/. For each one, tell me what you assumed and what the app actually does, and
add that to the FRD.

When you are green, report the scenario and step counts, every assumption you had
to correct, and anything you could not capture as a test and why. Then stop at the
Green Baseline gate.
```

### The Karma reconciliation

Run this once, alongside the flight-search baseline. It is the set-piece of the whole lab.

```text
Now reconcile the existing Karma suite with reality.

test/spec/flight-search.spec.js has 11 tests and all 11 fail. Diagnose each failure
and classify it. Then, per the Track A rule, correct the TEST to match current
behaviour - never the controller.

The three known discrepancies:
  1. Every test calls $httpBackend.flush() expecting a pending GET /api/flights/popular.
     FlightSearchController never makes that call.
  2. "should load popular routes on init" asserts $scope.popularRoutes with 2 entries.
     The controller has no popularRoutes property.
  3. The Filters tests set $scope.filters to
        { airlines: [], stops: null, priceRange: { min, max } }
     The controller's actual shape is
        { maxPrice: 5000, stops: 'any', airline: '', departTimeRange: 'any' }

For each: fix the test, and record the discrepancy in specs/frd-flight-search.md under
"Known Limitations" or a new "Test Reconciliation" section - what the test believed,
what the app does, and which one is now the specification.

Do NOT add getPopularRoutes() to the controller. Do NOT change the filters model.
The legacy behaviour is the spec.

Run npm test and paste the output. Target: 11 passing, or fewer tests if a test
asserts behaviour that genuinely does not exist and cannot be meaningfully rewritten -
in which case delete it and say why.
```

---

## 📦 Expected artifacts

```
specs/features/                          ← all tagged @existing-behavior at Feature level
├── flight-search.feature                ← @feature-flight-search
├── hotel-booking.feature
├── itinerary.feature
├── travel-request.feature
├── expense-reconciliation.feature
└── authentication.feature

tests/
├── pages/       ← 6 Page Object Models
├── steps/       ← 6 Cucumber step-definition files
└── support/     ← hooks.js (storage state, fixture restore), world.js
cucumber.js                              ← runner config

test/spec/flight-search.spec.js          ← RECONCILED: 11 → 19 passing
specs/frd-*.md                           ← all 6 updated with a Green Baseline section
```

> The `@existing-behavior` tag sits once per file at **Feature** level, where Gherkin scope rules
> hand it to every scenario beneath. That satisfies the gate — do not expect it repeated per
> scenario.

### A scenario that captures a quirk correctly

This is the shape to aim for. It describes a behaviour most people would call a bug, without
editorialising:

```gherkin
@existing-behavior @feature-flight-search
Scenario: The maximum price filter is reset by every search
  Given I am on the flight search page
  And I have searched SFO to JFK and set the maximum price filter to 400
  When I search SFO to JFK again
  Then the maximum price filter shows the highest price in the new results
  And the price filter I set is no longer applied
```

And one for the silent date shift:

```gherkin
@existing-behavior @feature-flight-search
Scenario: Choosing a departure date after the return date moves the return date
  Given I am on the flight search page
  And the trip type is "roundtrip"
  And the return date is "08/20/2026"
  When I set the departure date to "08/25/2026"
  Then the return date becomes "08/26/2026"
```

> Neither scenario says "incorrectly", "unfortunately" or "should". They state what happens.
> Phase A decides whether it is a defect. Phase P decides whether to change it.

### The hard case: when the app produces a broken value

Quirks are easy — they are strange but coherent. This is the one that tests whether you actually
believe the Track A rule. B1 verified that `hotel-booking.controller.js:231` computes the booking
total from a field room objects do not carry, so the total is **`NaN`**.

The honest baseline scenario is therefore:

```gherkin
@existing-behavior @feature-hotel-booking
Scenario: The booking confirmation shows no usable total
  Given I have selected a hotel and a room
  When I confirm the booking
  Then the confirmation shows a total price of "NaN"
```

Writing that feels wrong, and the instinct is to "fix the test" to expect a real number. **That
instinct is backwards.** A green baseline is a snapshot of the app as it is; a scenario asserting
a correct total would be *red*, and going green would then require changing `app/` — which Track A
forbids.

It also earns its keep later. Whoever migrates hotel-booking in
[step 10](10-deliver-inc2-hotel-booking.md) will write the obvious React code, produce a correct
total, and **this scenario will fail** — surfacing the behaviour change at exactly the moment
someone can decide about it, instead of six months later when a user notices the number moved.

> If a baseline scenario is uncomfortable to write, that is usually a sign it is doing its job.

### The same rule, now applied to two whole seams

[ADR-001](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/blob/lab/02-b2-spec-enable/specs/adrs/adr-001-product-intent-decisions.md)
accepted **SEAM-1** (travel policy is published, never enforced) and **SEAM-2** (no approve/reject
endpoint exists) as *intended behaviour*. So they are not limitations to note in passing — they are
behaviour the baseline must **assert as passing**, exactly like the `NaN` total:

```gherkin
@existing-behavior @feature-travel-request
Scenario: A submitted request stays pending with no way to decide it
  Given I have submitted a travel request
  Then the request status is "pending"
  And the approval chain lists "Mike Chen" as "Manager" with status "pending"
  And no action is available to approve or reject it
```

That scenario is the ADR made executable. If someone later builds an approver UI, it fails — and
the conversation happens at the right moment, with a decision record to point at.

The other three seams are the opposite: **SEAM-3, SEAM-4 and SEAM-5 are defects with a target.**
The baseline still captures them as-is — a booking that persists nothing, an itinerary that never
shows it — because Track A snapshots the app as it is. They change later, under a red-green cycle,
in their own increment.

> **Watch this one.** Q-7 (data is private to its owner) cannot be baselined meaningfully: the
> fixtures have a **single seeded owner**, so a filtering assertion passes whether or not filtering
> exists. Verified in `api-mock/server.js` — every seeded trip, travel request and expense report
> carries `userId: 1`; Mike Chen (`2`) exists as a login and owns nothing. ADR-001 flags it, and
> **no FRD picked it up**. Either add a second owner to the fixtures or record explicitly that the
> isolation scenarios are non-assertive — a green test that cannot fail is worse than no test,
> because it reads like proof.

### Two constraints the testability gate handed forward

[Step 03](03-testability-gate.md#-outcome) scored the gate by *running* the app, and two of its
findings are instructions for this step rather than facts about the last one.

**C-1 — never reload inside a journey.** After a genuine page reload the token survives and the
route guard admits the user, but `$rootScope.currentUser` is `null` and three controllers
substitute a hardcoded identity — `'Demo User'` in travel-request and expense, `'You'` in
itinerary. A scenario that reloads mid-flow therefore **stays logged in as nobody**, and every
assertion on traveller name, submitter or comment author passes regardless of who authenticated.
That is a false green of exactly the kind this step exists to prevent. Either avoid reloads inside
a scenario, re-authenticate after one, or assert the fallback string deliberately and say why.

**C-4 — the toast count and the list count legitimately differ.** On a search returning six flights
priced 230–642 the toast reads "Found 6 flights" and the list renders four. The price slider is
`step="50"` with a dynamic `min`, so `filters.maxPrice` snaps from 642 down to 630 and silently
filters out the two dearest results, while the toast broadcasts the *unfiltered* count. Both
numbers are correct for what they measure. A scenario that asserts them as one number will be
flaky or wrong — assert them **separately**, and tag the discrepancy so the migration backlog
inherits it.

---

## 📤 Outcome

> ✅ **Verified** — 7 commits on `lab/04-green-baseline`, one per feature plus a count
> correction. All figures below were checked against the artifacts, not the run summary.

**235 scenarios · 1 944 steps · all green · 11m 12s.** Karma 19/19. `git diff -- app/ api-mock/`
is zero lines.

| Feature | Scenarios | Steps | Headline finding |
|---|---:|---:|---|
| flight-search | 25 | 193 | Price slider `step=50` hides the two dearest flights while the toast still counts them |
| hotel-booking | 25 | 189 | `ngRepeat:dupes` empties the room table — **no hotel can be booked through the UI at all** |
| itinerary | 32 | 229 | Status filter and Add Note both entirely dead — scope shadowing |
| travel-request | 45 | 431 | Search box inert — a `TypeError` escapes the digest, typing does nothing |
| expense-reconciliation | 57 | 575 | Date filter is one-way; clearing both dates never un-filters |
| authentication | 51 | 327 | Guard checks token *presence*, never validity — a rejected session renders as an empty account |
| **Total** | **235** | **1 944** | |

The room-table failure is worse than "duplicate ids". `hotel-booking.template.html:184` tracks by
`room.id`, but the fixture at `api-mock/server.js` defines rooms as
`{ type, price, available }` — **there is no `id` field**. All three rooms track as `undefined`,
AngularJS throws `ngRepeat:dupes`, and the repeater renders nothing. It compounds finding #10:
even if the rows appeared, `pricePerNight` would still read `NaN`.

**Reproduction note.** The six files contain **204 authored** `Scenario:` / `Scenario Outline:`
blocks; 235 is the count *after* outline expansion, which is what Cucumber reports. Both numbers
are correct — they measure different things. Expect the discrepancy when you re-count by hand.

### Three cross-cutting findings — decisions, not ports

**1 · `ng-if` scope shadowing — 4 confirmed instances.** A non-dotted `ng-model` or `ng-click`
inside an `ng-if` writes to a child scope, so the controller never observes it while the UI looks
like it worked. `itinerary.template.html:188` binds `ng-model="newNote"` — undotted — and the
controller's `newNote` stays empty forever. **React has no scope chain, so these controls begin
working the moment they are migrated.** That is new behaviour arriving unrequested, and it needs
specifying rather than porting.

**2 · Four features ship a dead or trapped primary control** — itinerary filter, itinerary notes,
request search, expense dates. Not one of them is a port; each is a net-new spec.

**3 · Q-7 has zero baseline coverage, by necessity.** Every fixture is `userId: 1` and no endpoint
filters by owner, so a manager's `GET /api/trips` is byte-identical to an employee's. Ownership
isolation cannot be asserted against this app. It carries forward to Assess as an untested claim.

### The Karma reconciliation — what actually happened

`test/spec/flight-search.spec.js` went **11 → 19 `it()` blocks** (+193/−25). Ten of the eleven
originals survive; `should load popular routes on init` is gone. Only that one file changed
under `test/`.

⚠️ Two traceability gaps worth naming, because the lab is partly *about* traceability:

- **ADR-002 Q-11 ruled this suite "preserved unmodified, not a migration target."** It was modified
  anyway, and **no superseding ADR was written**. An accepted decision was reversed silently.
- The audit entry reads `karma 19/19, legacy Jasmine specs untouched`. The file was rewritten.

Neither affects the baseline's validity — `app/` is untouched and the suite is green — but both
are exactly the kind of drift the ADR chain exists to prevent. Resolve before Assess.

---

## 🧑‍⚖️ Human gate — Green Baseline

> 🔴 **Blast radius if you rubber-stamp this: regressions ship undetected.**

- [x] **The tests actually pass.** 235 scenarios / 1 944 steps green in 11m 12s. The per-feature
      step counts in `state.json` sum to exactly 1 944.
- [x] Every scenario is tagged `@existing-behavior` — once per file at Feature level, inherited
      by every scenario beneath
- [x] ~~The three quirks~~ **Two of three** captured: `maxPrice` reset and the `returnDate`
      auto-shift both have named scenarios. **Scroll-on-select is not asserted** — it is a 400 ms
      presentation animation, handled in the harness as a timing concern. Defensible, but it is a
      deliberate coverage gap rather than an oversight.
- [x] **`git diff` shows zero changes under `app/`.** Verified directly against
      `lab/03..lab/04` for both `app/` and `api-mock/` — zero lines, no untracked files.
- [ ] ⚠️ **The Karma reconciliation** changed only `test/spec/flight-search.spec.js` ✅ — but it
      contradicts **ADR-002 Q-11** with no superseding ADR, and the audit log describes the file as
      `untouched`. **This box is yours to close.**
- [x] No `test.skip()`, no `xit()`, no commented-out assertions — scanned all 22 test files and
      6 feature files, zero hits
- [x] Scenarios use user vocabulary — *"the maximum price filter no longer holds the value I set"*,
      not `$scope.filters.maxPrice`
- [x] **Broken outputs are asserted as broken.** This is the strongest part of the baseline.
      Scenario titles state the defect outright: *"The hotel address is never shown"*,
      *"Choosing a check-in after the check-out silently discards my check-out"*,
      *"The departure date I searched for does not reach the results"*.
- [x] Playwright storage state is reused — `hooks.js` loads it once and omits it only for
      `@unauthenticated`

---

## ⚠️ Pitfalls

<details>
<summary><b>The agent fixes the app to make a test pass</b></summary>

The cardinal sin, and it happens constantly because it is the *helpful* thing to do. It will
add `getPopularRoutes()` to the controller because 4 tests want it. Then your baseline validates
behaviour the legacy app never had, and your React port faithfully reproduces a feature nobody
asked for.

**Detection:** `git diff app/` must be empty. Check it before the gate, every time.
</details>

<details>
<summary><b>Aspirational scenarios</b></summary>

`Then the user sees a helpful error message` — does it? The app sets
`$scope.errorMessage = 'Please enter origin and destination.'` and slaps `.has-error` on a div
for three seconds. Write *that*.
</details>

<details>
<summary><b>Fighting the jQuery UI datepicker</b></summary>

`#departDate` and `#returnDate` are jQuery UI widgets initialised inside a `$timeout(…, 0)`.
Playwright's `fill()` may set the value without triggering the widget's `onSelect`, so
`$scope.searchParams.departDate` never updates. Either drive the widget's calendar UI, or set
the value and dispatch the events it listens for. This is the single most likely source of a
flaky baseline.

It is also a preview of why the directive gets deleted in [step 09](09-deliver-inc1-flight-search.md).
</details>

<details>
<summary><b>Timing flakiness from the fade and the scroll</b></summary>

`#search-overlay` fades over 200ms; selecting a flight animates a 400ms scroll. Waiting on
`waitForTimeout` gives you a suite that passes on your laptop and fails in CI. Wait on the
results being visible and on the details panel being in view.
</details>

<details>
<summary><b>Moment.js deprecation warnings in the console</b></summary>

Searching logs a Moment deprecation warning because `moment("08/15/2026")` is parsed with no
format string. **Expected. Harmless. Do not fix it.** If your Playwright config fails tests on
console warnings, scope the assertion — do not silence the app.
</details>

<details>
<summary><b>Doing all five features before the first gate</b></summary>

The gate is *per feature*. Get flight-search green and approved, then move on. If your Gherkin
style is wrong, you want to find out after one feature, not five.
</details>

---

## ⏭️ Next

[**Step 05 — Path Selection**](05-path-selection.md) — six brownfield paths, one decision.
