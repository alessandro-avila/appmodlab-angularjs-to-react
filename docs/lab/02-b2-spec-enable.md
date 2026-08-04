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
| B2b | `frd-generator` | PRD + extraction + the actual source of each module | `specs/frd-{feature}.md` × 6 |
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

Run this **six** times, substituting the feature. Start with `flight-search` — it is the richest,
and it is the only module with existing tests to reconcile.

```text
Phase B2b. Generate the FRD for flight-search only.

Read the real code for this one — app/components/flight-search/*, the currency and
dateFormat filters, the 'flights' state, and test/spec/flight-search.spec.js.

app/directives/date-picker.directive.js exists but no template uses it. This
controller initialises jQuery UI datepickers directly. Describe what it does, not
what the shared directive would have done.

The Current Implementation section is the point of this document, so make it
forensic: the exact $scope shape, every $watch and what it triggers, every
$rootScope broadcast and listener by event name, every jQuery selector and effect,
the datepicker's date format, every Moment.js call and whether it passes a format
string, and what the existing tests actually assert.

Describe behaviour as behaviour, not as defects. "Parses the departure date with
moment() and no format string" is right. "Has a date parsing bug" is a Phase A
finding and does not belong here yet. Surprising-but-real behaviour goes under
Known Limitations, phrased neutrally, with the evidence.

And do not tidy it up in passing. Where the code reads a field the object does not
carry, or keeps a total it never recalculates, the FRD says exactly that. Writing
what the code evidently meant to do is how a real behaviour disappears before
anyone has decided what to do about it.

Show me the Current Implementation section before moving to the next feature.
```

<details>
<summary><b>Why the "do not tidy it up" line was added after step 01</b></summary>

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
<summary><b>The other five features</b></summary>

Same prompt, swap the feature name and its sources:

| Feature | Source files |
|---------|--------------|
| `hotel-booking` | `app/components/hotel-booking/*`, `'hotels'` state, `/api/hotels*` |
| `itinerary` | `app/components/itinerary/*`, `'itinerary'` state, `/api/itinerary*`, plus the `itinerary:refresh` broadcast it listens for |
| `travel-request` | `app/components/travel-request/*`, `app/directives/approval-status.directive.js`, `'travelRequest'` state, `/api/travel-requests*` |
| `expense-reconciliation` | `app/components/expense-reconciliation/*`, `app/directives/currency-input.directive.js`, `app/filters/currency.filter.js`, `'expenses'` state, `/api/expenses*` |

Then one for the cross-cutting auth flow — `app/services/auth.service.js`, the inline login
controller in `app/app.routes.js`, and the `$stateChangeStart` guard in `app/app.js`. It is not a
UI-Router feature module, but it is a feature, and every other FRD depends on it. **Do not skip
it** — it is the sixth FRD, and `frd-authentication.md` is where the reload behaviour gets pinned.

> **Do not list `date-picker.directive.js` as a source for any of these.** B1 verified that
> `gt-date-picker` appears in zero templates. `hotel-booking`, `travel-request` and
> `expense-reconciliation` each initialise jQuery UI directly, exactly as `flight-search` does.
> Naming the directive as a source is how an FRD ends up claiming a shared component that nothing
> shares.
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
├── frd-flight-search.md                ← with Current Implementation
├── frd-hotel-booking.md
├── frd-itinerary.md
├── frd-travel-request.md
├── frd-expense-reconciliation.md
├── frd-authentication.md
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
B2b and B2c have not run yet.

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

## 📤 Outcome — B2b / B2c

> ⏳ **Pending** — unblocked; B2b is next.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/01-b1-extract..lab/02-b2-spec-enable`
> 2. The full **Current Implementation** section of `frd-flight-search.md`, so we can score it
>    against the 19-row table above
> 3. How many of the 19 behaviours it caught, and which it missed
> 4. Whether the six B1 defects reached **Known Limitations**, per FRD
> 5. Whether each FRD applied its ADR-001 decision — SEAM-1/2 as intended behaviour, SEAM-3/4/5 as
>    defects with a target
> 6. What `spec-refinement` found — contradictions are the interesting output here

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
> 🟠 **Blast radius: features silently change.**

- [ ] **Six** FRDs exist — the five feature modules *and* `frd-authentication.md`
- [ ] Every FRD has a **Current Implementation** section with file paths
- [ ] Score `frd-flight-search.md` against the 19-row table above
- [ ] The three quirks are documented as *behaviour*, not as bugs:
      `maxPrice` overwrite, the `returnDate` auto-push, the window scroll on select
- [ ] The test-coverage section states 11 tests / 11 failing **and why**
- [ ] **No FRD claims to use `date-picker.directive.js` or `api.service.js`.** B1 verified both are
      dead: `gt-date-picker` is in no template, `ApiService` is injected nowhere. An FRD that
      describes either as "the shared component" invented a dependency.

#### The B1 defects are the real marking scheme

These are the six behaviours [step 01](01-b1-extract.md#-what-it-found--the-part-that-actually-matters)
verified against source. Each belongs in its FRD's **Known Limitations**, stated neutrally. If an
FRD reads cleanly and none of these appear, it did not get better — it got quieter.

| FRD | Must record |
|-----|-------------|
| `frd-authentication.md` | The authenticated check reads `localStorage`; the current-user lookup reads `$rootScope`. They disagree after a reload. |
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

- [ ] Every FRD applies its **[ADR-001](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/blob/lab/02-b2-spec-enable/specs/adrs/adr-001-product-intent-decisions.md)**
      decision and cites it. The distinction is the whole point: SEAM-1 and SEAM-2 are behaviour the
      green baseline must **preserve**; SEAM-3, SEAM-4 and SEAM-5 are behaviour it must **capture,
      then change**. An FRD that files all five under "Known Limitations" has lost the decision.
- [ ] **Q-7 (data isolation) is marked as needing a second seeded owner.** ADR-001 flags it: with one
      owner in the fixtures, per-user filtering cannot be asserted. An FRD that specifies isolation
      without noting the test data cannot exercise it sets up a green baseline that proves nothing.


### Refinement Review
- [ ] Max 5 passes, and the report says what changed in each
- [ ] Contradictions are listed, not silently resolved
- [ ] No "should" / "recommend" / "modern" survived

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
