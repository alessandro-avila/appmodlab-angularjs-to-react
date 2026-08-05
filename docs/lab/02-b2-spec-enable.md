# Step 02 · B2 · Spec-Enable

> **Phase** B2 · Spec-Enable &nbsp;|&nbsp; **Branch** [`lab/02-b2-spec-enable`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/02-b2-spec-enable) &nbsp;|&nbsp; **Parent** `lab/01-b1-extract`
> **Human gates** 🧑‍⚖️ PRD Review ✅ · FRD Review · Refinement Review &nbsp;|&nbsp; **Status** 🟡 B2a approved, B2b next

---

## 🎯 Goal

Turn the factual extraction into **specifications**. A PRD that describes the product from the
outside in, and one FRD per feature — each with a **Current Implementation** section that pins the
spec to today's code.

This is the step that pays for itself even if you never write a line of React. A 2016 codebase
with no spec now has one.

> **B1 answered "what is this?" B2 answers "what does it do?"** Neither answers "what should it
> do" — that comes after the assessment.

---

## 🧰 Skills invoked

| # | Skill | Reads | Writes |
|---|-------|-------|--------|
| B2a | `prd-generator` | all of `specs/docs/`, `specs/contracts/api/` | `specs/prd.md` |
| B2b | `frd-generator` | PRD + extraction + the actual source of each module | `specs/frd-{feature}.md` × 7 |
| B2c | `spec-refinement` | PRD + all FRDs | edits in place, max 5 passes |
| — | `ddd-modeling` *(optional)* | FRDs + data models | `specs/domain/{proposals,domain-model,database-model}.md` |

---

## ✅ Prerequisites

- [ ] [Step 01](01-b1-extract.md) approved at the Extraction Review gate
- [ ] `specs/docs/**` and `specs/contracts/api/**` are populated
- [ ] You have actually read the extraction — the FRDs inherit its errors

---

## 🌿 Branch setup

```bash
git switch lab/01-b1-extract
git switch -c lab/02-b2-spec-enable
```

---

## 🗣️ The prompts

Three prompts, three gates. Do **not** collapse them into one.

### B2a — PRD

```text
Generate the PRD from the previous extraction.

Work from the extraction artifacts, not from app/.

The product is GlobalTravel Corp's internal corporate travel portal. Describe it from
the outside in: who uses it, what job it does for them, what the system guarantees.
Open with a Mermaid diagram of the end-to-end travel workflow, and cite the extraction artifact behind every claim.

Where the product intent is genuinely unclear from the code, put it under Open Questions and ask me rather than resolving it yourself.
```

<details>
<summary><b>Why "work from the extraction, not from app/"</b></summary>

It is the only line in that prompt doing real work. Let the agent re-read the source and the PRD
comes out subtly better than B1 deserved — which feels like a win until [step 03](03-testability-gate.md),
when you are making a track decision from extraction docs nobody has actually stress-tested.
The PRD is the first consumer of B1. Let it be an honest one.

In this run it held: the generation metadata records **"Source code read during generation: None"**,
and the audit log carries a matching `constraint-check`. That is what makes the result a genuine
test of B1 — everything the PRD found, it found in the extraction.
</details>

<details>
<summary><b>What was deliberately <i>left out</i> of this prompt</b></summary>

An earlier draft added "Not modules, not controllers", "Nothing aspirational. No roadmap, no
personas or KPIs that the code does not evidence, no target architecture, no React", and "Stop at
the PRD Review gate."

All of it was cut, and the output did not suffer: the PRD invented no roadmap, no KPIs and no
target architecture, rejected four candidate personas **with evidence**, and stopped at the gate
with `brownfield-b2a-prd-approved: false`. Those constraints are already in `AGENTS.md` and the
`prd-generator` skill. Re-stating them costs prompt space and teaches nothing — which is the rule
this lab follows throughout: **if a line would be equally true of any AngularJS app, delete it.**
</details>

### B2b — FRD, one feature at a time

The PRD lists **22 features** (`F-001`…`F-022`). The `frd-generator` skill says one FRD per PRD
feature, which would be 22 documents — eight of them describing P3 dead surface (uncalled routes,
a stub, an unreachable endpoint).

**Group them into 7 instead, by feature vertical**, because that is the unit you will actually
migrate: you will port `flight-search/` once, not search-then-booking-then-popular-routes. Each FRD
names the `F-IDs` it covers, so PRD → FRD traceability survives the grouping.

| FRD | Covers | Source |
|-----|--------|--------|
| `frd-authentication.md` | F-001, F-022 | `app/services/auth.service.js`, the inline login controller in `app/app.routes.js`, the `$stateChangeStart` guard in `app/app.js` |
| `frd-app-shell.md` | F-002, F-003, F-004 | `app/app.js`, `app/app.routes.js`, `app/index.html` — 7 states, the dashboard's inline template, the `notification:add` bus |
| `frd-flight-search.md` | F-005, F-006, F-018, F-020 | `app/components/flight-search/*`, `'flights'` state, `/api/flights*`, `test/spec/flight-search.spec.js` |
| `frd-hotel-booking.md` | F-007, F-008, F-021 | `app/components/hotel-booking/*`, `'hotels'` state, `/api/hotels*` |
| `frd-itinerary.md` | F-009, F-010, F-011, F-019 | `app/components/itinerary/*`, `'itinerary'` state, `/api/trips*`, `/api/itinerary-items*`, plus the `itinerary:refresh` broadcast it listens for |
| `frd-travel-request.md` | F-012, F-013, F-014 | `app/components/travel-request/*`, `app/directives/approval-status.directive.js`, `'travelRequest'` state, `/api/travel-requests*` |
| `frd-expense-reconciliation.md` | F-015, F-016, F-017 | `app/components/expense-reconciliation/*`, `app/directives/currency-input.directive.js`, `app/filters/currency.filter.js`, `'expenses'` state, `/api/expense*` |

> Record the deviation. The skill's rule is explicit, and grouping is a defensible departure from it
> — but only if it is written down. One line in an ADR is enough.

**Start with `flight-search`.** It is the richest module and the only one with existing tests to
reconcile, so it sets the standard the other six are scored against.

```text
Generate frd-flight-search.md — it covers F-005, F-006, F-018 and F-020.

Read the real code for this one: app/components/flight-search/*, the 'flights'
state, and test/spec/flight-search.spec.js.

Current Implementation is the point of this document, so make it forensic — the
$scope shape, every $watch, every $rootScope broadcast, every jQuery selector,
the datepicker's date format, every Moment.js call and whether it passes a format
string, and what the existing tests actually assert.

Describe behaviour as behaviour, not as defects. Surprising-but-real behaviour
goes under Known Limitations, phrased neutrally, with the evidence. And do not
tidy it up in passing: where the code reads a field the object does not carry,
the FRD says exactly that.

Apply ADR-001 where it is relevant. Show me Current Implementation before moving on.
```

Then the remaining six — same prompt, swap the name, the `F-IDs` and the sources from the table:

```text
Same for frd-hotel-booking.md — F-007, F-008, F-021.
```

<details>
<summary><b>Why "do not tidy it up in passing" is in there</b></summary>

It was not in the original prompt. B1 earned it.

The extraction found `hotel-booking.controller.js:231` reading `selectedRoom.pricePerNight` —
a field rooms do not have, so the booking total is `NaN`. An FRD generator reading that line has
three options, and two of them are wrong:

1. *"Calculates the total from the room's nightly rate"* — describes the intent. The bug vanishes
   from the spec, and the React rewrite silently fixes it. The migration now carries an undeclared
   behaviour change.
2. *"Bug: reads a non-existent field"* — a Phase A judgement, arriving two phases early.
3. *"Multiplies `selectedRoom.pricePerNight`, which room objects do not define, by the night count"*
   — correct. Neutral, falsifiable, and it survives into the assessment where the decision belongs.

Option 1 is the dangerous one, because it reads as the *better* document.
</details>

<details>
<summary><b>Two traps in the source table</b></summary>

**Do not list `date-picker.directive.js` as a source for any FRD.** B1 verified that
`gt-date-picker` appears in zero templates. All five screens initialise jQuery UI directly. Naming
the directive as a source is how an FRD ends up claiming a shared component that nothing shares.
The same applies to `api.service.js` — registered, injected nowhere.

**`frd-app-shell.md` is the one nobody expects.** It has no feature folder, so it is easy to skip —
but F-002, F-003 and F-004 are where the notification bus lives, and F-004 is the feature that
reports success for bookings that persisted nothing. Skip it and SEAM-3's user-visible symptom has
no home.

*In the real run the generator folded it into `frd-authentication.md` and retitled that document
"Authentication, Shell & Notifications" — the same `app.js` / `app.routes.js` surface auth already
owned. Fine as long as the `F-IDs` survive. Check that they did rather than assuming.*
</details>

### B2c — Refinement

```text
Phase B2c. Refine the PRD and all FRDs against each other and against the B1
extraction. Cap it at 5 passes.

I care most about the cross-cutting seams, because that is where independently
written FRDs disagree. The $rootScope events - auth:login, notification:add,
flight:selected, itinerary:refresh - are described in more than one document and
those descriptions must match, by event name, payload and listener.

Two things you may expect to be shared are not. date-picker.directive.js is used
by no template, and ApiService is injected nowhere; each controller talks to
Restangular directly. If any FRD describes either as a shared component, that is a
contradiction with the extraction - flag it, do not harmonise the FRDs around it.

Also flag anything evaluative that leaked in from B1 — "should", "recommend",
"modern", "best practice" — and any Current Implementation section that describes
intent instead of code.

Do not close a gap by inventing behaviour. Unanswerable questions go to Open
Questions and come to me. Report what changed in each pass, then stop at the
Refinement Review gate.
```

<details>
<summary><b>Optional: DDD modelling</b></summary>

Only worth it if you want explicit target boundaries before planning. It is a stretch goal
for a 3-hour lab.

```text
Optional. Run ddd-modeling using specs/docs/architecture/data-models.md,
specs/contracts/api/*.yaml and the approved FRDs.

Separate clearly:
  - OBSERVED boundaries in the current implementation (what the code actually does)
  - PROPOSED target bounded contexts (labelled as proposals, not decisions)
  - persistence ownership and integration seams

The mock API is a single Express file with in-memory data. Say so. Do not pretend
there are microservices.

Write specs/domain/proposals.md, domain-model.md, database-model.md.
Stop at the gate.
```
</details>

---

## 📦 Expected artifacts

```
specs/
├── prd.md                              ← product from the outside in + Mermaid workflow
├── adrs/
│   └── adr-001-product-intent-decisions.md   ← Q-1…Q-7, answered at the B2a gate
├── frd-flight-search.md                ← with Current Implementation
├── frd-hotel-booking.md
├── frd-itinerary.md
├── frd-travel-request.md
├── frd-expense-reconciliation.md
├── frd-authentication.md
├── frd-app-shell.md                    ← or folded into frd-authentication.md
└── domain/                             ← optional
    ├── proposals.md
    ├── domain-model.md
    └── database-model.md
```

### What `frd-flight-search.md` must contain

This is the marking scheme for the FRD gate. Every one of these is verifiable against
`app/components/flight-search/flight-search.controller.js`:

| Behaviour | Evidence |
|-----------|----------|
| `$scope.searchParams` has 7 properties, defaults `passengers: 1`, `cabinClass: 'economy'`, `tripType: 'roundtrip'` | lines 15–23 |
| `$scope.filters` shape is `{ maxPrice: 5000, stops: 'any', airline: '', departTimeRange: 'any' }` | lines 34–39 |
| Changing `departDate` past `returnDate` **silently pushes `returnDate` forward by one day** | `$watch`, lines 45–53 |
| Switching to `oneway` nulls `returnDate` | `$watch`, lines 55–59 |
| A **deep** `$watch` on `filters` re-applies filters after a search | lines 62–66 |
| Datepickers are jQuery UI, initialised in a `$timeout(…, 0)`, format `mm/dd/yy` | `initDatepickers`, lines 69–91 |
| Search fades in `#search-overlay` via jQuery `.fadeIn(200)` | line 104 |
| Dates are sent to the API as `YYYY-MM-DD` via `moment(...).format(...)` | lines 107–110 |
| Airlines list is `_.uniq(_.map(results,'airline'))`; price range from `_.minBy`/`_.maxBy` | lines 114–116 |
| **`filters.maxPrice` is overwritten by the result set's max price on every search** | line 117 |
| Success broadcasts `notification:add` with `'Found N flights'` | line 120 |
| Validation failure adds `.has-error` via jQuery, removed after a 3s `.delay().queue()` | lines 135–137 |
| Filtering and sorting are Lodash (`_.filter`, `_.orderBy`), not Angular filters | lines 152–186 |
| `departTimeRange` buckets: morning 6–12, afternoon 12–18, evening 18–6 | lines 174–176 |
| `sortBy(field)` toggles direction when the field is unchanged | lines 189–197 |
| Selecting a flight **scrolls the window** via `$('html, body').animate(...)` to `offset().top - 20` | lines 203–206 |
| Booking broadcasts `notification:add` **and** `itinerary:refresh`, then sets `selectedFlight.booked = true` | lines 220–222 |
| `auth:login` overwrites `cabinClass` from `user.preferences.cabinClass`, default `'economy'` | lines 245–247 |
| **There is no `popularRoutes` and no call to `/api/flights/popular`** | absent — see below |

### The test-coverage section must say this

`test/spec/flight-search.spec.js` has **11 tests, all failing**. They fail for three distinct
reasons, and the FRD must record the *discrepancy*, not "fix" it:

| # | The test expects | The controller actually does |
|---|------------------|------------------------------|
| 1 | `$httpBackend` to have a pending `GET /api/flights/popular` to flush | never calls it — every `$httpBackend.flush()` throws |
| 2 | `$scope.popularRoutes` with 2 entries | property does not exist |
| 3 | `$scope.filters` = `{ airlines: [], stops: null, priceRange: {min,max} }` | `{ maxPrice, stops, airline, departTimeRange }` |

This is the single most valuable artifact in the repo. It is the honest answer to Testability
Gate question 6, and it is the drill for the Track A rule **"fix the test, not the app"** in
[step 04](04-green-baseline.md).

---

## 📤 Outcome — B2a (PRD)

`specs/prd.md` — **613 lines**, 22 features, 2 personas, 12 open questions, 3 Mermaid diagrams.
Committed on [`lab/02-b2-spec-enable`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/02-b2-spec-enable).

The generation metadata records **"Source code read during generation: None"**, with a matching
`constraint-check` in `.spec2cloud/audit.log`. That is what makes this run a real test of B1:
everything below was found *in the extraction*, not by re-reading the app.

### 🔍 What it found — the part that actually matters

B1 answered *"what is this?"* and found six behavioural defects, each local to one module. The PRD
answered *"what does it do?"* and found something B1 structurally could not: **the workflow does not
join up.** Five product-level seams, each a place where the product implies a transition that no
code performs.

| Seam | The product implies | The code does | Evidence |
|------|--------------------|--------------|----------|
| **SEAM-1** | Travel policy constrains what you can book | Policy is published; nothing compares anything against it, and the client method that fetches it has no caller | `server.js:257-267, :609` |
| **SEAM-2** | A manager approves or rejects a request | No approve/reject endpoint exists at any method | verified: zero matching routes |
| **SEAM-3** | You book a flight, then see it on your itinerary | Both booking handlers return a confirmation and write nothing — yet both controllers broadcast `itinerary:refresh` | `server.js:365-372`, `:445` |
| **SEAM-4** | An expense report gets approved and reimbursed | `approved` is counted by the statistics handler, present in no seed, written by no handler | `server.js:671` |
| **SEAM-5** | Spend ties back to the request that authorised it | `ExpenseReport.travelRequestId` is `null` in every seed; its only writer has no caller | `expense.service.js:107` |

> This reframes the migration. A port that faithfully reproduces all five screens still produces a
> product where **you cannot get permission, cannot be approved, and cannot see what you booked.**
> That is a Phase A/P conversation the increment plan has to make room for — and it is not visible
> from any single module.

<details>
<summary><b>Three findings the extraction contained but nobody had surfaced</b></summary>

Each was latent in the B1 artifacts. It took the PRD's product-level reading to notice them, and
each was re-verified against source before this document recorded it.

**1 · The statistics endpoint is unreachable.** `GET /api/expense-reports/statistics` is registered
at `server.js:668`, *after* `GET /api/expense-reports/:id` at `:636`. Express matches the
parameterised route first, so the literal route is dead code and the call returns
`404 {"error":"Expense report not found"}`. Verified — registration order is exactly as claimed.

**2 · Seed data contains an approval no handler could have produced.** Every new request gets one
hardcoded `{approver:'Mike Chen', role:'Manager', status:'pending'}` (`server.js:567`). But seed
record `tr-2` carries **two completed approvals**, including a `VP Finance / VP` approver
(`server.js:216-217`) — a role and a status the only writing code path cannot generate. Something
once approved requests, and that something is no longer in the repository.

**3 · The login screen bypasses its own authentication.** The API implements a real credential check
against a two-user table, and the client calls it with the literal pair
`AuthService.login('demo@globaltravel.com', 'password')` (`app.routes.js:20`). The login form takes
no input. Whether the credential form was removed, deferred, or never built is Q-8.
</details>

### Where the PRD improved on the gate's own expectations

The gate asked for a rubric-based feature list. The PRD **rejected the default rubric and said why**:
`prd-generator` grades partly by test coverage, and in this repo that dimension carries no signal —
one spec file, 11 tests, all failing, no coverage tooling. It substituted reachability and
end-to-end completeness, and stated the rule per band. Adapting a rubric is fine; adapting it
silently is not.

It also checked for four personas it did **not** find — Administrator, Finance officer, API
integrator, Operator — and recorded the evidence for each rejection. A reverse-engineered PRD that
lists only what it found tells you nothing about what it looked for.

### 12 open questions, none resolved by inference

The prompt said to ask rather than resolve, and it did — including declaring, in the document
itself, that **Q-1…Q-7 block FRD generation**, because each selects between *"preserve this
behaviour"* and *"change it"*:

| | Question | Why it blocks B2b |
|---|---|---|
| **Q-1** | Is a manager an approver? | Decides whether SEAM-2 is a defect or out of scope |
| **Q-2** | Is travel policy advisory or blocking? | `allowedCabinClasses` omits `first`, which the pricing code prices and the UI offers |
| **Q-3** | Should a booking create an itinerary item? | Decides whether SEAM-3 is a bug or the intended design |
| **Q-4** | Which expense category vocabulary is canonical? | 12 Title-Case form values vs 5 lowercase stored values — **zero overlap** |
| **Q-5** | Should spend link back to its travel request? | SEAM-5 |
| **Q-6** | What is a trip's cost — stored or computed? | The two disagree for both seeded trips |
| **Q-7** | Is data private to its owner? | No handler compares `req.user.id`; one seeded owner makes intent unobservable |

Q-8…Q-12 are non-blocking, but **Q-12** (intended datastore, base URL, deployment target) must be
answered before any cloud-native increment is planned.

### 🧑‍⚖️ The gate: answered, and recorded as a decision

The gate was approved on 2026-08-04. Q-1…Q-7 were answered and — this is the part worth copying —
written up as **[ADR-001 · Product intent decisions](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/blob/lab/02-b2-spec-enable/specs/adrs/adr-001-product-intent-decisions.md)**
rather than pasted into a chat reply.

That matters because these are **product decisions, not extraction findings**. They are not
derivable from the code — which is exactly why they were asked. An ADR makes them auditable,
attributable and reversible on purpose.

| # | Decision | Effect |
|---|----------|--------|
| **Q-1** | Manager is **not** an approver | SEAM-2 **accepted as-is** |
| **Q-2** | Policy is **display-only** | SEAM-1 **accepted as-is** |
| **Q-3** | A booking **must** persist to the itinerary | SEAM-3 → **defect to fix** |
| **Q-4** | The **5 lowercase server values** are canonical | 12 client values → defect to fix |
| **Q-5** | Link spend to its request **when one exists** | SEAM-5 → defect to fix, non-blocking |
| **Q-6** | Trip cost is **recomputed server-side** | Both current values are wrong |
| **Q-7** | Data **is** private to its owner | N-4 moves from *not guaranteed* to *required* |

**The seams split 2 / 3.** SEAM-1 and SEAM-2 become **intended behaviour** — Track A captures them
as *passing* tests describing what the app does today. SEAM-3, SEAM-4 and SEAM-5 become **target
behaviour** — captured as-is first, then changed under a red-green cycle in a later increment.

> **Why this is the right shape.** "The approval workflow can never reach a decision" is now a
> deliberate, documented scope boundary with a named owner — not an oversight someone discovers
> during the demo. The ADR says so plainly, and states the cost: reversing Q-1 or Q-2 later is
> **not additive** — F-013, F-014 and every FRD derived from them need regenerating.

The ADR also records two consequences that are easy to miss:

- **Q-7 has no test data.** Per-user filtering cannot be meaningfully exercised against fixtures
  with a single seeded owner. A second owner must be added, or the isolation scenarios assert nothing.
- **Q-6 is an API-visible change.** `Trip.totalCost` moves from stored to derived, so any consumer
  relying on `2450` / `1800` sees different values.

### 📌 The framework question from step 01 is answered

`currentPhase` **did** advance — `B1-extract` → `B2-spec-enable`. The concern raised at the end of
[step 01](01-b1-extract.md#-two-findings-for-the-framework) does not reproduce. The gate trail is
honest end to end: `result=pending` while the questions were outstanding, then `result=answered`,
`adr-created` and `result=approved` — with `currentStep` advancing `prd-generation` →
`frd-generation` and the prior B1 `gateReview` preserved under `previousGateReview` rather than
overwritten.

---

## 📤 Outcome — B2b (FRDs)

**Commits:** `795dc84` (six FRDs) + `9652210` (ADR-001 links) on `lab/02-b2-spec-enable`
· **3,097 lines** · all 22 `F-IDs` covered · all five seams dispositioned

| FRD | Covers | Lines |
|-----|--------|------:|
| `frd-authentication.md` — *"Authentication, Shell & Notifications"* | F-001, **F-002, F-003, F-004**, F-022 | 532 |
| `frd-flight-search.md` | F-005, F-006, F-018, F-020 | 429 |
| `frd-hotel-booking.md` | F-007, F-008, F-021 | 438 |
| `frd-itinerary.md` | F-009, F-010, F-011, F-019 | 463 |
| `frd-travel-request.md` | F-012, F-013, F-014 | 585 |
| `frd-expense-reconciliation.md` | F-015, F-016, F-017 | 650 |

**Six, not the seven planned.** The generator folded the app-shell group into
`frd-authentication.md` and retitled it rather than creating a seventh file. That is a defensible
call — the shell, the route table and the notification bus are all `app.js` / `app.routes.js`
concerns, and auth already owned the `$stateChangeStart` guard in the same file. It is not a gap:
F-002, F-003 and F-004 each got their own functional requirements (`FR-F002-001`, `FR-F002-002`,
`FR-F003-001`, `FR-F004-001`), and the notification bus is documented where the code lives.

Worth noticing anyway. The grouping was an instruction, and the agent silently improved on it. It
happened to be right here — but "silently improved on it" is also how a feature goes missing.
Verifying `F-ID` coverage is what makes the difference between catching that and trusting it.

### 🔍 Quality: five gates passed, one gap — since closed

**Forensic accuracy — four claims verified against source, all held exactly:**

| Claim | Verified |
|-------|----------|
| `POST /api/bookings/hotels` "writes to no collection" | `server.js` — the handler is a pure `res.json({...})` echo. No collection touched. ✅ |
| `departDate` watch "silently pushes `returnDate` forward by one day" | `flight-search.controller.js:44-52` — `dept.add(1, 'days')`, no user signal. ✅ |
| `ItineraryService.getTrips` "overwrites `totalCost`" | `itinerary.service.js:19` — `trip.totalCost = trip.items ? _.sumBy(trip.items, 'cost') : 0`. ✅ |
| Empty-report total is "guarded by `length > 0`" | `server.js` — `if (report.expenses && report.expenses.length > 0)`, so the stale total survives. ✅ |

**The dead-asset trap held.** Every one of the 16 references to `date-picker.directive.js` or
`api.service.js` explicitly marks it dead — *"appears in zero templates"*, *"injected **nowhere**"*.
No FRD claimed a shared component that nothing shares. `frd-authentication.md` goes further and
records `ApiService` as finding #15, with the loader that pulls it in.

**All six B1 defects reached Known Limitations**, each in the right FRD, each phrased as behaviour
with evidence rather than as a bug.

**No premature judgement.** Zero instances of *should* / *recommend* / *modernise* across 3,097
lines. Several FRDs volunteer *"No TODO, FIXME or HACK markers exist in this module"* — a useful
negative result, since absence of markers is otherwise unfalsifiable.

**Test coverage is stated honestly.** `frd-travel-request.md` and `frd-expense-reconciliation.md`
both open the section with a flat **"None."** — no runner, no file, no hedging. `frd-flight-search.md`
is the only module with real tests and gets a real table.

### ⚠️ The gap: ADR-001 was applied unevenly — now closed

The first pass produced this:

| FRD | Cited ADR-001 | Named a SEAM |
|-----|:---:|:---:|
| `frd-authentication.md` | by path | — |
| `frd-travel-request.md` | by path | — |
| `frd-expense-reconciliation.md` | by path | — |
| `frd-flight-search.md` | **no** | — |
| `frd-hotel-booking.md` | **no** | — |
| `frd-itinerary.md` | **no** | — |

**Not one FRD named a single SEAM**, and the three booking/itinerary documents — the ones a
developer opens to implement the fix — never mentioned the ADR at all.

The behaviour itself was recorded correctly. Both booking FRDs state *"A booking persists nothing"*
plainly, which is exactly right for Current Implementation. What was missing was the **link to the
decision already taken**: ADR-001 Q-3 settled that a booking *must* create an itinerary item and
classified SEAM-3 as a defect to fix. That decision lived only in the ADR.

Same for **Q-6** in `frd-itinerary.md` — the FRD documented that `_.sumBy` overwrites the seeded
`totalCost`, but not that ADR-001 made the server the source of truth. That is an **API-visible
change**: `Trip.totalCost` moves stored → derived, and `2450` becomes `1330`.

An orphaned decision is worse than an open question, because an open question still gets asked.

**The prompt that closed it:**

```text
frd-flight-search.md, frd-hotel-booking.md and frd-itinerary.md never reference
ADR-001, and no FRD names a SEAM.

Add the missing links. Q-3 decided a booking must create an itinerary item, so
SEAM-3 belongs in all three. Q-6 decided the server recomputes trip cost, so
frd-itinerary.md needs to record that Trip.totalCost moves from stored to derived
and that this is an API-visible change.

Keep Current Implementation describing what the code does today. The ADR decision
is the target behaviour — put it where each FRD already states its limitation, and
say which ADR question settled it.
```

**Result — `9652210`, +240 / −33 across five FRDs:**

| FRD | ADR-001 | Questions | Seams |
|-----|:---:|---|---|
| `frd-flight-search.md` | ✅ | Q-3 | SEAM-3 |
| `frd-hotel-booking.md` | ✅ | Q-3 | SEAM-3 |
| `frd-itinerary.md` | ✅ | Q-3, **Q-6** | SEAM-3 |
| `frd-travel-request.md` | ✅ | Q-1, Q-2 | SEAM-1, SEAM-2 |
| `frd-expense-reconciliation.md` | ✅ | Q-3, Q-4, Q-5, Q-7 | SEAM-4, SEAM-5 |
| `frd-authentication.md` | by path | Q-1, Q-7, Q-12 | — *(deliberate no-op)* |

All five seams now sit in the FRD that owns them.

### 🔑 The pattern it invented is the reusable part

The FRDs did not absorb the decisions into their prose. They kept the two voices separate:

> **21.** A booking persists nothing — this is **SEAM-3**. `POST /api/bookings/hotels` writes to no
> collection […]
>
> > **Target behaviour — settled by Q-3 of ADR-001**
> > A booking must create an itinerary item on the traveller's itinerary, so SEAM-3 is
> > dispositioned a **defect to fix** rather than accepted as-is.

The numbered paragraph stays descriptive — what the code does today, evidence attached. The
blockquote carries what was decided. A reader can still tell, at a glance, which sentences are
observation and which are intent — which is the whole reason Current Implementation exists.

Adopt this shape for the remaining phases. Merging the two voices is how a target quietly becomes
a claim about the current system.

**It also went further than asked.** `frd-itinerary.md` reasons that because the itinerary is the
sole listener of `itinerary:refresh`, *"this module is where that fix becomes observable"* — making
F-009 the verification surface for SEAM-3. Nothing in the prompt asked for that. It is the kind of
inference that only surfaces once the decision and the code sit in the same document.

### 📌 Two smaller notes

**Auth's no-op was reasoned, not skipped.** The audit records
`result=noop detail='no SEAM belongs to this FRD; ADR-001 already cited twice'`. Defensible — but
auth now owns F-004, the notification bus, and SEAM-3's *user-visible symptom* is a success toast
for a booking that persisted nothing. A cross-reference there would close the loop. Not a blocker.

**The audit log format drifted again.** Step 01 normalised 22 lines to one shape; B2b's eleven
entries use a third (`detail=` rather than `message=`, no bracketed timestamp, no `|` separators).
The framework documents a format but does not enforce one, so every run invents its own. Harmless
while a human reads it — but anything that later parses this file has to tolerate three grammars.

### ⛔ One gate still open: Q-7 has no test data

ADR-001 decided that data is private to its owner. No FRD records that the fixtures cannot prove it.

`api-mock/server.js` seeds two users — Sarah Johnson (`1`) and Mike Chen (`2`) — and **every** record
in trips, travel requests and expense reports carries `userId: 1`. Mike Chen owns nothing.

A green-baseline test asserting *"I see only my own trips"* therefore passes whether the filter
exists, is broken, or is deleted outright. It is not a weak test; it is a test that **cannot fail**.
And a test that cannot fail reads, in a coverage report, exactly like proof.

Fix it now — one seeded record owned by user `2` — or the Track A baseline in step 04 inherits a
false green. This belongs in `frd-authentication.md` (Q-7's owner) and in every FRD whose collection
is meant to be scoped.

### ⚖️ Verdict

Six FRDs, forensically accurate, all 22 features covered, all five seams dispositioned, and the
descriptive/decided boundary held. **One gate open** — the Q-7 test-data note.
[B2c refinement](#-outcome--b2c-refinement) ran next and did not close it.

---

## 📤 Outcome — B2c (Refinement)

> ✅ **Ran on `lab/02-b2-spec-enable`** — commit
> [`cbd060a`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/commit/cbd060a)
> · five passes run, **converged at pass 3** · +151/−16 across six FRDs, `state.json` and the audit log.

Seven edits, all in passes 1 and 2. Passes 3, 4 and 5 changed nothing — which is the point of a
convergence cap: you run until the passes stop finding things, and you record that they stopped.

| Pass | Lens | Changed | Found |
|:---:|---|:---:|---|
| 1 | product | 4 | 8 missing personas, 1 non-story, 2 malformed acceptance criteria |
| 2 | technical | 3 | **an entire undocumented route**, 2 dependency tables without direction |
| 3 | cross-cutting seams | 0 | no defects — 35 event sites already agreed across six FRDs |
| 4 | residual | 0 | dead-asset trap not sprung; language scans clean |
| 5 | final | 0 | citations verified; skip-detection 0 matches |

### 🎯 The catch that justifies the pass

`POST /api/flights` (`api-mock/server.js:333`). B1 had extracted it — it appears **seven times across
four extraction artifacts**. `frd-flight-search.md` documented neither it nor its two siblings
correctly, listing two flight routes where the source has five.

It is a near-duplicate of the `GET` above it, and the divergence is the interesting part:

| | line | reads |
|---|---|---|
| `GET /api/flights` | 328 | `req.query.origin`, `.destination`, **`.date`**, `.cabinClass` |
| `POST /api/flights` | 333 | `req.body.origin`, `.destination`, **`.departDate`**, `.cabinClass` |

Same handler shape, same `generateFlights` call, **different parameter name for the date**. A
migration that consolidates these two into one React data hook has to notice that — and would not
have, because the FRD driving that work did not know the second route existed.

This is exactly the failure mode refinement exists to catch: not a disagreement *between* documents,
but a silent omission that leaves one document narrower than the extraction it came from.

### 🧾 Six contradictions — listed, not resolved

The more valuable output. Each is a real inconsistency the pass **declined to harmonise**, with the
reason recorded:

| # | Contradiction | Why it was left |
|:--:|---|---|
| 1 | `frd-authentication.md` structures **4 of 17** requirements as Input/Processing/Output/Error; the other five FRDs are **100%** | Restructuring 13 requirements risks inventing behaviour the code never states |
| 2 | Three acceptance-criterion formats coexist | All three parse as GIVEN/WHEN/THEN — normalising is cosmetic churn |
| 3 | Two event-table column conventions | Both complete and correct |
| 4 | Three dependency-table conventions | Direction added in prose instead of rewriting tables |
| 5 | `data-models.md:676` says `Trip.totalCost` intent is "not determinable"; ADR-001 Q-6 has since settled it | **The B1 artifact was deliberately not edited** — extraction records what the code said; the decision belongs in the FRD |
| 6 | No FRD has an Edge Cases section | The `frd-generator` format defines none; the refinement checklist assumes one |

Number 5 is the one to notice. The obvious move — go back and "fix" the extraction now that the
answer is known — is precisely the move that destroys the audit trail. B1 recorded that the code
does not say; ADR-001 recorded what was decided. Both remain true, and they are kept in separate
documents. Contradiction 6 is a genuine defect in the framework, not in the specs: two of its own
components disagree about the output format.

### ✅ Verified against source

| Claim | Result |
|---|:---:|
| `POST /api/flights` at `:333`, absent from FRD, present in B1 | ✅ 7 hits across 4 artifacts |
| 36 of 36 Express routes now documented | ✅ 36 exactly |
| 51 personas across 51 derivable stories | ✅ 51 personas, 52 headings — delta is `US-F022-001` |
| `frd-authentication.md` 4/17 structured, others 100% | ✅ 4/17 · 19/19 · 14/14 · 13/13 · 13/13 · 15/15 |
| Both acceptance criteria were genuinely malformed | ✅ neither had a `WHEN` clause; one packed 4 behaviours into a line |
| **35** `$rootScope` event sites, not the reported 37 | ❌ **arithmetic slip** |

The event-site count is wrong in the commit message, the audit log and `state.json`. The
*itemisation* beside it — `notification:add` 24+1, `auth:login` 1+3, `auth:logout` 1+0,
`flight:selected` 1+1, `itinerary:refresh` 2+1 — is correct, matches source exactly, and sums to
**35**. So the verification was sound and only the headline is wrong. Worth correcting because
`state.json` is read by later phases; not worth re-running the pass over.

### 🧠 The non-story is the smartest edit

`US-F022-001` (profile read/update) had a heading but no reachable behaviour — `UserService` is
injected nowhere. Deleting it would break the F-022 traceability link. Keeping it would produce a
Gherkin scenario asserting nothing. It did neither:

> **Not a user story. Generates no Gherkin scenario.** No behaviour is reachable, so nothing can be
> asserted. […] This heading is retained only so F-022 has a visible home in the traceability chain;
> **downstream generation must skip it.**

An instruction to a later phase, written into the artifact that phase will read. That is how you
stop a dead feature from quietly becoming a passing test.

### ❓ One open question for you

> Should the 13 unstructured `frd-authentication.md` requirements be restructured into
> Input/Processing/Output/Error handling before Phase 2 Step 2 (contract-generation) consumes them?

Real, and it has a deadline. `contract-generation` reads that structure to derive request/response
shapes. Leave them prose and auth's contract gets thinner than the other five — which matters,
because auth is the one every other feature depends on.

### ⚖️ Verdict

Converged honestly, caught a real omission, and refused to tidy six things that were not its to
tidy. **The Q-7 test-data gate is still open** — five passes went by and no FRD records that every
seeded record belongs to one user. *(See below: ADR-002 changes what closing it requires.)*

---

## 📤 Outcome — ADR-002 (the remaining product questions)

> ✅ **Ran on `lab/02-b2-spec-enable`** — commit
> [`2602441`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/commit/2602441)
> · `specs/adrs/adr-002-remaining-product-intent-decisions.md`, 149 lines · PRD and all six FRDs updated.

ADR-001 answered Q-1…Q-7 and unblocked FRD generation. This one clears the rest, framed for a
time-boxed hackathon: *prefer the answer that removes work without discarding a real capability.*

| # | Question | Decision | What it removes or adds |
|---|---|---|---|
| Q-8 | Multi-user login in scope? | **Yes** | **Adds** a real credential form — the API already checks properly |
| Q-9 | Multi-currency real? | **No** — USD only | Removes the 6-value selector; no rate source exists anywhere |
| Q-10 | Are the 9 unreferenced registrations product surface? | **Dead code** | Removes 3 directives, 4 filters, `ApiService`, `UserService`, `ui.bootstrap` from the port |
| Q-11 | What did the failing suite intend? | **Stale — no authority** | Preserved unmodified, but not a migration target |
| Q-12 | Datastore, base URL, deployment target? | **Out of scope** | Removes Phase 2 Step 4 in its Azure form |
| Q-B2c | Restructure auth's 13 requirements? | **No** | The auth FRD is rewritten under Q-8 anyway |

**Q-12 is the structural one.** No `azd provision`, no `azd deploy`, no `infra/`, no live smoke
tests. An increment is done when its tests pass locally. This lab was already scoped that way —
[step 00](00-spec2cloud-init.md) lists the `azure` MCP server as *"stretch goal only"* and every
delivery step's gate is a PR review, not a deployment. The ADR **ratifies the existing shape rather
than changing it**, which is the outcome you want from a scope decision this late.

**Q-B2c is a good refusal.** The B2c open question asked whether to restructure auth's 13 prose
requirements before `contract-generation` reads them. The answer is no — *because Q-8 rewrites that
FRD anyway.* Restructuring text you are about to replace is the kind of tidy-looking work that
consumes a hackathon.

### 🔓 Q-8 quietly makes Q-7 assertable — and nobody noticed

ADR-002 never mentions Q-7. It doesn't have to; the interaction is real anyway, and it changes what
"close the Q-7 gate" costs. Verified in source:

| | |
|---|---|
| `api-mock/server.js:277` | Login matches **any** row in `users` — Mike Chen has always been able to authenticate |
| `app/app.routes.js:20` | The client sends the literal `demo@globaltravel.com` / `password`, so he never could **through the UI** |
| `api-mock/server.js:461-463` | `GET /api/trips` returns the whole array, unfiltered |

Q-8 builds the real credential form. The moment it exists, Mike Chen becomes reachable — and he owns
nothing. So:

> **Log in as Mike Chen → assert zero trips.**
> Today that returns Sarah's two trips. The assertion **fails**, correctly, for the right reason.

That is a real test with **no new fixtures**. My earlier note here recommended seeding a record for
user `2`; that turns out to be needed only for the *positive* case ("Mike sees his own trip"). The
negative case — the one that actually catches a missing ownership filter — needs no new data at all,
only Q-8.

**Worth carrying into [step 04](04-green-baseline.md):** order the increments so auth lands before
the isolation scenarios are written, and Q-7 stops being a fixture problem.

### ⏳ Two items still not closed

| Item | Status |
|---|---|
| `state.json` reports **37 of 37** `$rootScope` sites; the real count is **35** | ✗ still `37` ×2 — the itemisation beside it is correct and sums to 35 |
| No FRD records the single-owner fixture constraint | ✗ still unrecorded — but Q-8 reduces it from *blocking* to *sequencing* |

Neither blocks the testability gate. The first is a one-line correction; the second is now a note
for whoever writes the isolation scenarios.

---

## 🧑‍⚖️ Human gates

### PRD Review
> 🔴 **Blast radius: you modernize the wrong product.** &nbsp;·&nbsp; ✅ **Approved 2026-08-04**

- [x] The PRD describes a *travel portal*, not "an AngularJS application"
- [x] All seven capabilities are covered, including auth and dashboard
- [x] There is a Mermaid workflow diagram — three, in fact
- [x] No invented personas, KPIs, OKRs or roadmap — and four candidate personas rejected *with evidence*
- [x] Open Questions exist — a PRD reverse-engineered from code with zero open questions is
      a PRD that guessed. **12 raised, 7 blocking, all 7 answered in [ADR-001](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/blob/lab/02-b2-spec-enable/specs/adrs/adr-001-product-intent-decisions.md).**


### FRD Review
> 🟠 **Blast radius: features silently change.** &nbsp;·&nbsp; ⏳ **Awaiting approval** — every check
> below is met; `state.json` is at `status: awaiting-approval`

- [x] **Six or seven** FRDs exist — the five feature modules plus authentication, with the app shell
      either standing alone or folded into `frd-authentication.md` *(the run produced six)*
- [x] Every FRD **names the `F-IDs` it covers**, and all 22 are accounted for exactly once
- [x] Every FRD has a **Current Implementation** section with file paths
- [ ] Score `frd-flight-search.md` against the 19-row table above
- [x] The three quirks are documented as *behaviour*, not as bugs:
      `maxPrice` overwrite, the `returnDate` auto-push, the window scroll on select
- [x] The test-coverage section states 11 tests / 11 failing **and why**
      *(0% effective, and it names three distinct failure causes)*
- [x] **No FRD claims to use `date-picker.directive.js` or `api.service.js`.** B1 verified both are
      dead: `gt-date-picker` is in no template, `ApiService` is injected nowhere. An FRD that
      describes either as "the shared component" invented a dependency.
      *All 16 references explicitly mark them dead.*

#### The B1 defects are the real marking scheme

These are the six behaviours [step 01](01-b1-extract.md#-what-it-found--the-part-that-actually-matters)
verified against source. Each belongs in its FRD's **Known Limitations**, stated neutrally. If an
FRD reads cleanly and none of these appear, it did not get better — it got quieter.

| FRD | Must record |
|-----|-------------|
| `frd-authentication.md` | The authenticated check reads `localStorage`; the current-user lookup reads `$rootScope`. They disagree after a reload. |
| `frd-app-shell.md` *(or the shell section of `frd-authentication.md`)* | A booking reports success through the notification bus without anything having been persisted (SEAM-3's user-visible symptom). |
| `frd-hotel-booking.md` | The booking total multiplies `selectedRoom.pricePerNight`, a field room objects do not define. |
| `frd-itinerary.md` | Stored trip cost and the client-side recomputation disagree. Adding a note replaces the previous one. |
| `frd-expense-reconciliation.md` | Removing the last expense leaves the previous total in place. `Expense.currency` is stored and read by nothing. |

#### …and now the PRD's seams are too

B2a raised the bar. Each seam crosses a feature boundary, so it cannot live in one FRD's
**Known Limitations** and be considered handled — the FRD on **both** sides has to acknowledge it,
or the increment plan will schedule a migration that quietly preserves a broken workflow.

| FRD | Must also record |
|-----|------------------|
| `frd-travel-request.md` | No approve/reject endpoint exists (**SEAM-2**), and every request receives the same hardcoded pending approver. Policy is published and enforced nowhere (**SEAM-1**). Per **ADR-001** both are **intended behaviour** — document them as such, not as bugs. |
| `frd-flight-search.md` · `frd-hotel-booking.md` | Booking persists nothing, yet both broadcast `itinerary:refresh` (**SEAM-3**). Per **ADR-001** this is a **defect with a target**: current behaviour in *Known Limitations*, persistence as the requirement. |
| `frd-itinerary.md` | Shows seeded trips only; no booking can reach it (**SEAM-3**, receiving end). Trip cost becomes server-derived (**Q-6**) — the client-side overwrite is deleted, not reproduced. |
| `frd-expense-reconciliation.md` | `travelRequestId` never populated (**SEAM-5**); `approved` counted but never written (**SEAM-4**); the statistics route is shadowed by `/:id` and returns 404. The 5 lowercase server categories are canonical (**Q-4**) — the 12 client values are the defect. |

- [x] Every FRD applies its **[ADR-001](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/blob/lab/02-b2-spec-enable/specs/adrs/adr-001-product-intent-decisions.md)**
      decision and cites it. The distinction is the whole point: SEAM-1 and SEAM-2 are behaviour the
      green baseline must **preserve**; SEAM-3, SEAM-4 and SEAM-5 are behaviour it must **capture,
      then change**. An FRD that files all five under "Known Limitations" has lost the decision.
      *Took a second pass — the first draft named no seams at all.*
- [x] **Q-7 (data isolation) — reclassified by ADR-002.** ADR-001 flagged that with one seeded owner,
      per-user filtering cannot be asserted, and no FRD picked it up. **Q-8 (multi-user login in
      scope) resolves it without fixtures**: once a real credential form exists, log in as Mike Chen
      and assert *zero* trips — today that returns Sarah's two, so the assertion fails correctly.
      Verified: `api-mock/server.js:277` matches any user row, `:461-463` returns trips unfiltered.
      Downgraded from a blocking gap to a **sequencing note** — auth must land before the isolation
      scenarios are written. Seeding a record for user `2` is needed only for the positive case.


### Refinement Review
> 🟡 **Blast radius: contradictions get harmonised into a lie.** &nbsp;·&nbsp; ⏳ **Awaiting approval**

- [x] Max 5 passes, and the report says what changed in each
      *(5 run, converged at 3; passes 3–5 changed nothing and said so)*
- [x] Contradictions are listed, not silently resolved *(6 listed, each with a stated reason)*
- [x] No "should" / "recommend" / "modern" survived
      *(30 raw hits, all false positives — `propert*`, the `recommended` sort value, quoted test
      names, and quoted source comments)*
- [x] **The B1 extraction was not retro-edited.** ADR-001 Q-6 answered a question `data-models.md`
      records as "not determinable from source". The tempting fix is to go back and update the
      extraction. It was left alone, and the decision recorded in `frd-itinerary.md` instead.
- [ ] **Correct the event-site count.** The commit message, audit log and `state.json` all report
      *37 of 37* `$rootScope` sites. The real number is **35** — the itemisation beside it is right
      and sums to 35. Cosmetic, but `state.json` is read by later phases.
- [x] **Answer the open question.** Settled as **Q-B2c** in
      [ADR-002](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/blob/lab/02-b2-spec-enable/specs/adrs/adr-002-remaining-product-intent-decisions.md):
      **no** — accept the 13 prose requirements as-is, because Q-8 rewrites that FRD anyway.

---

## ⚠️ Pitfalls

<details>
<summary><b>The FRD describes what the code <i>meant</i> to do</b></summary>

The most common failure. `moment(newVal)` with no format string is described as "parses the
departure date" — technically true, behaviourally misleading. The FRD must say *no format string
is supplied*, because that is the behaviour the React version will deliberately change, and
that change needs a paper trail.
</details>

<details>
<summary><b>"Known Limitations" turns into a backlog</b></summary>

It is not a to-do list. `filters.maxPrice` being overwritten on every search is a *documented
behaviour* at B2. It becomes a *finding* at Phase A and a *decision* at Phase P. Keep the phases
apart or you will find yourself fixing things before you have a safety net.
</details>

<details>
<summary><b>Generating all five FRDs in one prompt</b></summary>

You get five shallow documents that all describe `date-picker.directive.js` slightly differently.
One feature per prompt. The orchestrator handles the sequencing.
</details>

<details>
<summary><b>The agent "fixes" the failing tests</b></summary>

It will be tempted. `test/spec/flight-search.spec.js` is *evidence* at B2 — do not touch it.
It gets corrected in [step 04](04-green-baseline.md), under the Track A rule, with the
discrepancy recorded in the FRD.
</details>

---

## ⏭️ Next

[**Step 03 — The Testability Gate**](03-testability-gate.md) — six questions that decide whether
you migrate with a safety net or blind.
