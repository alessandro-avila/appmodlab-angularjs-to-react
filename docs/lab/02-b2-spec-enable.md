# Step 02 · B2 · Spec-Enable

> **Phase** B2 · Spec-Enable &nbsp;|&nbsp; **Branch** [`lab/02-b2-spec-enable`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/02-b2-spec-enable) &nbsp;|&nbsp; **Parent** `lab/01-b1-extract`
> **Human gates** 🧑‍⚖️ PRD Review · FRD Review · Refinement Review &nbsp;|&nbsp; **Status** ⏳ Pending

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
| B2b | `frd-generator` | PRD + extraction + the actual source of each module | `specs/frd-{feature}.md` × 5 |
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
Phase B2a. Generate the PRD from the B1 extraction.

Work from the extraction artifacts, not from app/ — if B1 got something wrong I want
to find that out now rather than have it silently corrected.

The product is GlobalTravel Corp's internal corporate travel portal. Describe it from
the outside in: who uses it, what job it does for them, what the system guarantees.
Not modules, not controllers. Open with a Mermaid diagram of the end-to-end travel
workflow, and cite the extraction artifact behind every claim.

Nothing aspirational. No roadmap, no personas or KPIs that the code does not evidence,
no target architecture, no React. Where the product intent is genuinely unclear from
the code, put it under Open Questions and ask me rather than resolving it yourself.

Stop at the PRD Review gate.
```

<details>
<summary><b>Why "work from the extraction, not from app/"</b></summary>

It is the only line in that prompt doing real work. Let the agent re-read the source and the PRD
comes out subtly better than B1 deserved — which feels like a win until [step 03](03-testability-gate.md),
when you are making a track decision from extraction docs nobody has actually stress-tested.
The PRD is the first consumer of B1. Let it be an honest one.
</details>

### B2b — FRD, one feature at a time

Run this five times, substituting the feature. Start with `flight-search`.

```text
Phase B2b. Generate the FRD for flight-search only.

Read the real code for this one — app/components/flight-search/*, plus the
date-picker directive, the currency and dateFormat filters, the 'flights' state,
and test/spec/flight-search.spec.js.

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
<summary><b>The other four features</b></summary>

Same prompt, swap the feature name and its sources:

| Feature | Source files |
|---------|--------------|
| `hotel-booking` | `app/components/hotel-booking/*`, the shared `date-picker.directive.js`, `'hotels'` state, `/api/hotels*` |
| `itinerary` | `app/components/itinerary/*`, `'itinerary'` state, `/api/itinerary*`, plus the `itinerary:refresh` broadcast it listens for |
| `travel-request` | `app/components/travel-request/*`, `app/directives/approval-status.directive.js`, `'travelRequest'` state, `/api/travel-requests*` |
| `expense-reconciliation` | `app/components/expense-reconciliation/*`, `app/directives/currency-input.directive.js`, `app/filters/currency.filter.js`, `'expenses'` state, `/api/expenses*` |

Then one for the cross-cutting auth flow — `app/services/auth.service.js`, the inline login
controller in `app/app.routes.js`, and the `$stateChangeStart` guard in `app/app.js`. It is not a
UI-Router feature module, but it is a feature, and every other FRD depends on it.
</details>

### B2c — Refinement

```text
Phase B2c. Refine the PRD and all FRDs against each other and against the B1
extraction. Cap it at 5 passes.

I care most about the cross-cutting seams, because that is where five
independently-written FRDs disagree: the date-picker directive is shared by
flight-search and hotel-booking, api.service.js is the single Restangular entry
point, and the $rootScope events (auth:login, notification:add, flight:selected,
itinerary:refresh) are described in more than one document. Those descriptions
must match.

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

## 📤 Outcome

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/01-b1-extract..lab/02-b2-spec-enable`
> 2. The PRD's Open Questions section — what did it refuse to invent?
> 3. The full **Current Implementation** section of `frd-flight-search.md`, so we can score it
>    against the table above
> 4. How many of the 19 behaviours it caught, and which it missed
> 5. What `spec-refinement` found — contradictions are the interesting output here
> 6. Anything you had to correct by hand

---

## 🧑‍⚖️ Human gates

### PRD Review
> 🔴 **Blast radius: you modernize the wrong product.**

- [ ] The PRD describes a *travel portal*, not "an AngularJS application"
- [ ] All seven capabilities are covered, including auth and dashboard
- [ ] There is a Mermaid workflow diagram
- [ ] No invented personas, KPIs, OKRs or roadmap
- [ ] Open Questions exist — a PRD reverse-engineered from code with zero open questions is
      a PRD that guessed

### FRD Review
> 🟠 **Blast radius: features silently change.**

- [ ] Every FRD has a **Current Implementation** section with file paths
- [ ] Score `frd-flight-search.md` against the 19-row table above
- [ ] The three quirks are documented as *behaviour*, not as bugs:
      `maxPrice` overwrite, the `returnDate` auto-push, the window scroll on select
- [ ] The test-coverage section states 11 tests / 11 failing **and why**
- [ ] Shared assets (`date-picker.directive.js`, `api.service.js`) are described identically in
      every FRD that uses them

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
