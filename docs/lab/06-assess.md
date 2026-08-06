# Step 06 · Phase A · Assess

> **Phase** A · Assess &nbsp;|&nbsp; **Branch** [`lab/06-assess`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/06-assess) &nbsp;|&nbsp; **Parent** `lab/05-path-selection`
> **Human gate** 🧑‍⚖️ Assessment Review &nbsp;|&nbsp; **Status** ⏳ Pending

---

## 🎯 Goal

Score every module on complexity, risk, coupling and coverage — then use those scores to decide
**the order in which they get migrated**.

This is the first step in the whole workflow that is allowed to have an opinion. B1 forbade
judgment; B2 described behaviour neutrally. Phase A finally says *this is technical debt, this
is risky, migrate this one first.*

Still no code changes. Findings and ADRs only.

---

## 🧰 Skills invoked

| Skill | Reads | Writes |
|-------|-------|--------|
| `modernization-assessment` | `specs/docs/**`, all FRDs, `specs/features/*.feature` | assessment findings + module scoring |
| `adr` | the findings | ADRs for anything that constitutes a decision |
| `research-best-practices` | *(via MCP: context7, microsoft.docs, deepwiki)* | current guidance on the replacement libraries |

---

## ✅ Prerequisites

- [ ] [Step 05](05-path-selection.md) approved — Modernize recorded in adr-004 and `state.json`
- [ ] Green baseline exists for the features you intend to migrate
- [ ] MCP servers reachable (`context7` in particular — React 19 and TanStack are newer than
      most training cutoffs)

---

## 🌿 Branch setup

```bash
git switch lab/05-path-selection
git switch -c lab/06-assess
```

---

## 🗣️ The prompt

```text
Phase A. Assess this codebase for the Modernize path.

Score the five feature modules on complexity, risk, coupling and coverage — and
treat the green baseline as a real input to risk, not a footnote. A module the
baseline barely exercises is riskier to move than its line count suggests. Score
the cross-cutting assets separately: the three directives, the two filters, the
three app-level services, routing, and the build.

Three things are genuinely hidden and I want them found, not assumed:
  - map every $rootScope publisher and subscriber, by event name. At least one of
    these events crosses a module boundary with nothing in either file to hint at it.
  - app/directives/date-picker.directive.js wraps jQuery UI, and at least one
    controller also initialises jQuery UI datepickers directly. Report whether they
    overlap or conflict.
  - 'ui.bootstrap' is loaded as an Angular module. Verify whether anything actually
    uses it, and say either way — I am not asking you to agree that it is dead.

For every finding: severity, file:line evidence, blast radius, and whether the
migration resolves it or it needs its own decision.

B1 catalogued a set of behaviours where the code does not do what it appears to do
— a booking total that computes to NaN, an auth check and a user lookup that read
from different places. Do not re-derive them and do not re-litigate whether they
are bugs. For each one decide the only question that matters here: does the React
version reproduce it or fix it? Fixing is usually right and is never free — a fix
is a user-visible behaviour change, so it gets an ADR.

Then give me a migration order for the five modules, justified per position. The
first module should be the one that maximises learning per unit of risk.

Findings and ADRs only. No code changes, and no increment plan — that is Phase P.
Stop at the Assessment Review gate.
```

<details>
<summary><b>Why name three findings and not all of them?</b></summary>

The obvious debt — EOL AngularJS, Bower, Moment.js, jQuery in controllers, the hardcoded base
URL, the JWT in `localStorage` — is already sitting in the B1 extraction. Listing it back turns
the assessment into transcription, and worse, it tells you nothing about whether the agent can
find anything on its own.

The three that stay are the ones nothing points at:

- **the `$rootScope` event map**, because the coupling it exposes is invisible from either end
  and it dictates increment sequencing
- **the double datepicker init**, because a directive and a controller doing the same job in two
  places only shows up if you read both
- **`ui.bootstrap`**, phrased as *"verify and say either way"* rather than *"drop it"*, so that a
  wrong assumption of mine gets corrected rather than confirmed

Then use the ground-truth table below to check what it found unprompted. That gap is the actual
measurement — and it is far more interesting than a checklist the agent was handed.
</details>

---

## 📦 Expected artifacts

```
specs/
├── docs/assessment/
│   └── modernization.md            ← findings, severity, evidence, module scoring
└── adrs/
    ├── adr-005-*.md                ← e.g. drop angular-ui-bootstrap
    ├── adr-006-*.md                ← e.g. externalise API base URL
    └── ...
```

<sub>Exact paths depend on how `modernization-assessment` is configured — the shape matters more
than the location.</sub>

### The eight findings, with ground truth

Your marking scheme at the gate:

| # | Finding | Evidence | Resolved by migration? |
|---|---------|----------|------------------------|
| 1 | `ui.bootstrap` declared, never used | `app/app.js:10` declares it; `bower.json` pins `angular-ui-bootstrap ~2.5.6`; no `uib-*` directive or `$uibModal` in `app/` | ✅ Dependency simply disappears |
| 2 | API base URL hardcoded | `app/app.js:14` — `RestangularProvider.setBaseUrl('http://localhost:3000/api')` | ✅ Becomes `import.meta.env.VITE_API_URL` |
| 3 | jQuery DOM manipulation in controllers | `flight-search.controller.js:104` `.fadeIn(200)`; `:135` `.addClass('has-error').delay(3000).queue()`; `:205` `$('html,body').animate({scrollTop: …})` | ✅ Removed entirely |
| 4 | The `gtDatePicker` directive is dead; four controllers init jQuery UI directly | `app/directives/date-picker.directive.js` is registered, but `gt-date-picker` appears in **no template**; `$('#…').datepicker(` is called 8 times across `flight-search`, `hotel-booking`, `travel-request` and `expense` controllers | ✅ All replaced by a native date input |
| 5 | `moment()` without a format string | `flight-search.controller.js:47-48` on `$watch`; also `:107` (that one *does* format on output) | ⚠️ **Requires a decision** — see below |
| 6 | JWT in `localStorage`, no expiry | `app/services/auth.service.js`, guard at `app/app.js:32` | ❌ **Survives unchanged** — deferred to the Security path |
| 7 | `bower_components/` committed | repo root | ✅ Deleted at [cutover](14-cutover.md) |
| 8 | `$rootScope` as an event bus | publishers/subscribers across controllers; `notification:add` handled at `app/app.js:44` | ✅ Becomes an explicit Zustand store |

<details>
<summary><b>Finding 4 was rewritten after step 01 — and it changed the work</b></summary>

It originally read *"Two datepicker mechanisms"*, citing the directive and one controller, with the
implied job: **reconcile them**.

B1 established that they are not two competing mechanisms. `gt-date-picker` appears in **zero
templates** — the directive has never been used by anything. The live mechanism is 8 direct
`$('#…').datepicker(` calls spread across **four** controllers.

The migration task is not "port the directive". It is "replace 8 call sites and delete the
directive". Different work, different risk, different increment sizing — and the original phrasing
would have hidden it behind a reasonable-sounding finding.
</details>

### The behavioural defects, with ground truth

A second marking scheme, and the more important one. Everything above is *debt* — patterns that are
dated but work. Everything below is **code that does not do what it appears to do**, verified
against source in [step 01](01-b1-extract.md#-what-it-found--the-part-that-actually-matters).

The assessment's job here is not to rediscover these. It is to decide, for each one, **whether the
React version reproduces it or fixes it** — because every "fix" is an undeclared behaviour change
unless someone writes it down.

| # | Defect | Evidence | The decision it forces |
|---|--------|----------|------------------------|
| 9 | Authenticated with no user after reload | `auth.service.js:42` reads the `localStorage` token; `:50` returns in-memory `$rootScope.currentUser` | Does React rehydrate the user from the token, or reproduce the split? Rehydrating is correct **and** is a behaviour change. |
| 10 | Room booking total is `NaN` | `hotel-booking.controller.js:231` reads `selectedRoom.pricePerNight`; rooms carry `price` (`server.js:131-133`) | Fixing it makes a previously-broken flow work. That is a feature, and it needs to be declared as one. |
| 11 | Stored vs computed trip cost disagree | `Trip.totalCost` seeded value ≠ client recomputation, for both seeded trips | Which one is authoritative? The answer changes what users see. |
| 12 | Stale total after emptying a report | `server.js:652` guards recalculation with `expenses.length > 0` | Server-side, so it survives the migration untouched unless someone decides otherwise. |
| 13 | Itinerary notes overwrite each other | `POST /api/itinerary-items/:id/notes` assigns rather than appends | Plural route, scalar field. Fixing it is an API contract change. |
| 14 | Currency stored, never honoured | `Expense.currency` read by no code; `totalAmount` sums mixed currencies unconverted | Either implement conversion or state that totals are single-currency. Silence is the one option that is wrong. |
| 15 | Price slider hides the dearest results | `flight-search.template.html:129` hardcodes `step="50"` against a dynamic `min`/`max`; `controller.js:117` assigns the unrepresentable `priceRange.max` to the model | Found by [step 03](03-testability-gate.md#-outcome) *running* the app, not by extraction. A native React range input inherits the same snapping rule — reproducing the markup reproduces the bug. |
| 16 | **Rooms never render — no hotel is bookable** | `hotel-booking.template.html:184` tracks by `room.id`; the fixture defines rooms as `{ type, price, available }` with **no `id`**. Three `undefined` keys → `ngRepeat:dupes` → the repeater renders nothing. | Found by [step 04](04-green-baseline.md#-outcome). A whole feature is unreachable through the UI. Decide whether the fixture gains an `id` or the template stops tracking — then finding 10 (`pricePerNight` → `NaN`) becomes reachable and needs its own answer. |
| 17 | Four primary controls dead via `ng-if` scope shadowing | Undotted `ng-model`/`ng-click` inside `ng-if` writes to a child scope — e.g. `itinerary.template.html:188` binds `ng-model="newNote"` | **React has no scope chain, so these controls start working when migrated.** Itinerary filter, itinerary notes, request search and expense dates all arrive as new behaviour nobody asked for. Each needs a spec, not a port. |
| 18 | Auth guard checks token presence, never validity | A garbage token opens the portal; a rejected session renders as an empty account | Found by [step 04](04-green-baseline.md#-outcome). Compounds C-1 — the guard admits, then `currentUser` is `null`, so the UI substitutes `'Demo User'`. |

Finding 15 was not in the B1 six. The testability gate produced it by driving a browser and
**looking at the screenshot**: the toast reported six flights above a list rendering four. With
`min=230` and `step=50` the highest value the control can hold is 630, so `filters.maxPrice` snaps
down from 642 and the filter at `controller.js:156` drops two results, while the toast broadcasts
the unfiltered count. Both numbers are correct for what they measure — which is precisely why
neither a code read nor an accessibility snapshot caught it.

Findings 16-18 came from step 04 the same way — by *executing* the app rather than reading it.
Finding 17 is the one to sit with: it is the only defect in the table that the migration **fixes by
accident**. AngularJS swallowed those four controls in a child scope; React has no scope chain, so
they will simply start working. A port that reproduces the markup faithfully still changes the
product's behaviour, and nobody asked it to.

**A coverage gap you inherit, not a defect.** Q-7 — data is private to its owner — has **zero
baseline scenarios**, and cannot have any. Every fixture is `userId: 1` and no endpoint filters by
owner, so a manager's `GET /api/trips` is byte-identical to an employee's. The green baseline
therefore protects nothing about ownership isolation. Treat it as untested when assessing.

**With one exception, none of these is resolved incidentally by moving to React** — finding 17 is
the exception, and it is *resolved* only in the sense that the control starts working, which is
itself an unrequested change. That is what separates findings 9-18 from findings 1-8, and it is why
they each need an ADR or an explicit deferral.

### The workflow seams — a third scheme, and the hardest one

Findings 1-8 are debt. Findings 9-18 are defects inside one module. The five seams the PRD raised in
[step 02](02-b2-spec-enable.md#-what-it-found--the-part-that-actually-matters) are neither: each is a
**transition the product implies and no code performs**, spanning two features, so no single module's
assessment can see it.

They matter here because the assessment produces the **migration order**, and a migration order built
from module complexity alone will faithfully port five screens into a product where you still cannot
get permission, be approved, or see what you booked.

**Four of the five are already decided.** [ADR-001](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/blob/lab/02-b2-spec-enable/specs/adrs/adr-001-product-intent-decisions.md),
accepted at the B2a gate, dispositioned every seam. The assessment's job is not to reopen them — it
is to sequence the three that are in scope, and to **not** schedule work for the two that are not.

| Seam | ADR-001 disposition | What the assessment must do |
|------|--------------------|-----------------------------|
| **SEAM-1** policy never enforced | **Accepted as-is** (Q-2 = display-only) | Nothing. No rules engine. Reporting it as a gap is re-litigating a closed decision. |
| **SEAM-2** no approve/reject endpoint | **Accepted as-is** (Q-1 = manager is not an approver) | Nothing. Building it is new feature work and out of scope. |
| **SEAM-3** bookings never persist | **Defect to fix** (Q-3) | The highest-value item in the migration — it is what makes the app feel real. Needs its own increment; changes the API contract. |
| **SEAM-4** `approved` counted, never written | **Defect to fix** | Follows SEAM-3's persistence work and Q-4's vocabulary fix. Sequence it after both. |
| **SEAM-5** spend never links to its request | **Defect to fix, non-blocking** | `linkToTravelRequest` acquires a caller — so it leaves the dead-code list below. Do not delete it. |

- [ ] The assessment **applies** ADR-001 rather than rediscovering the seams. Findings that
      recommend a policy engine or an approver UI are proposing scope the product owner already declined.
- [ ] SEAM-3, SEAM-4 and SEAM-5 appear in the migration order with their dependency stated —
      SEAM-4 after SEAM-3, not beside it.


<details>
<summary><b>Dead code the assessment should also confirm</b></summary>

Each appears **exactly once** in the repo, at its own definition — B1 verified this. Cheap to
check, and each one removes work from the migration:

- `ApiService` (`api.service.js:9`) — registered, injected nowhere
- `travelPolicy.preferredHotels` (`server.js:266`) — read by nothing. Also worth noting: its
  values (`Marriott`, `Hilton`, `Hyatt`) match no exact member of `hotelNames`, so had anything
  compared them it would have matched nothing

> **Not on this list any more:** `linkToTravelRequest` (`expense.service.js:107`). It is the only
> writer of `ExpenseReport.travelRequestId` and today has no caller — but ADR-001 answered Q-5 with
> *populate the link when a request exists*, so it acquires one. **Deleting it as dead code and
> implementing SEAM-5 are opposite actions.** An assessment that lists it for removal has not read
> the ADR.

If the assessment reports any of these as *"needs migrating"*, it did not check whether anything
calls them.
</details>

**Finding 5 is the one that needs an ADR.** Every other finding is resolved incidentally by
moving to React. Date parsing is different: the React version *could* faithfully reproduce
`new Date("08/15/2026")`-style loose parsing, or it could parse explicitly and change behaviour.
That is a choice, it is user-visible, and it must be written down — because the green baseline
will notice.

### The `$rootScope` event map

The assessment should produce something equivalent to this. It is the input to the Zustand store
design in [step 08](08-deliver-inc0-shell.md):

| Event | Published by | Consumed by |
|-------|--------------|-------------|
| `auth:login` | `auth.service.js` | `flight-search.controller.js:245` (sets `cabinClass` from user preferences) |
| `notification:add` | every controller | `app/app.js:44` (global notification handler) |
| `flight:selected` | `flight-search.controller.js:207` | **`hotel-booking.controller.js:266`** — pre-fills city + check-in/check-out |
| `itinerary:refresh` | `flight-search.controller.js:221`, `hotel-booking.controller.js:238` | `itinerary.controller.js:223` |
| `auth:logout` | `auth.service.js:35` | *(verify — may be unsubscribed)* |
| `$stateChangeStart` | UI-Router | `app/app.js:32` (auth guard) |

> 🔴 **The one that will bite you.** `flight:selected` is a **cross-module coupling**:
> selecting a flight silently pre-fills the hotel search with the destination, the departure date,
> and departure + 3 days as the check-out. Two modules, no shared service, no visible wiring — a
> `$rootScope` broadcast and 200 lines of distance.
>
> This dictates increment sequencing. When flight-search is React
> ([step 09](09-deliver-inc1-flight-search.md)) but hotel-booking is still AngularJS
> ([step 10](10-deliver-inc2-hotel-booking.md)), a React component must reach an AngularJS
> `$rootScope` listener. Either the plan bridges it deliberately, or the behaviour disappears
> between increments and no one notices until a `@existing-behavior` scenario goes red.
>
> Make sure Phase A surfaces this. It is the finding most likely to be missed, because nothing in
> either file mentions the other.

> An event with a publisher and no subscriber is a finding. It is also exactly the kind of thing
> that survives a naive port forever, because nobody dares delete it.

### The migration order

The recommendation this lab expects:

| # | Module | Why here |
|---|--------|----------|
| 0 | *(walking skeleton)* | No feature. Prove React + AngularJS coexist behind one entry point before betting a module on it. |
| 1 | **flight-search** | Highest complexity **and** the best coverage. It touches routing, a directive, two filters, a service, Restangular, Lodash, Moment and jQuery — so migrating it forces every pattern decision at once, under the protection of the strongest part of the baseline. Get the hard one wrong early and cheaply. |
| 2 | **hotel-booking** | Shares the date-picker pattern with flight-search. Second use validates the pattern instead of inventing a new one. |
| 3 | **itinerary** | Subscribes to `itinerary:refresh`. Migrating it after flight-search proves the Zustand store replaced the event bus correctly across a module boundary. |
| 4 | **travel-request** | Validation-heavy form + `approval-status.directive.js`. Different shape of problem; low coupling. |
| 5 | **expense-reconciliation** | `currency-input.directive.js` + `currency.filter.js`. Last because it is the most self-contained — by now the patterns are settled. |

<details>
<summary><b>Why not migrate the easiest module first?</b></summary>

The usual argument for easiest-first is momentum. The argument against it here is that the easy
modules teach you nothing you will not learn anyway, and the hard module — flight-search — is
the one whose pattern decisions everything else inherits.

If you migrate `expense-reconciliation` first, you will make four architectural decisions
(routing, data fetching, state, dates) based on the simplest possible case, then discover in
module 5 that flight-search needs all of them to be different.

Also: flight-search has the only existing test coverage. Its baseline is the strongest. Spend
your risk where the net is thickest.

This is a judgment call. If your assessment argues the other way with evidence, that is a
legitimate outcome — record it.
</details>

---

## 📤 Outcome

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/05-path-selection..lab/06-assess`
> 2. The module scoring table
> 3. **How many of the eight findings it caught unprompted** vs. only after being named
> 4. The `$rootScope` event map — did it find a publisher with no subscriber?
> 5. The proposed migration order and its justification. Did it agree with flight-search first?
> 6. Which ADRs it wrote
> 7. Anything it flagged that is **not** on the list above — the genuinely new findings are the
>    most interesting output of this step

---

## 🧑‍⚖️ Human gate — Assessment Review

> 🟠 **Blast radius if you rubber-stamp this: wrong migration order.**

- [ ] All five modules scored on all four dimensions
- [ ] Cross-cutting assets scored separately from the modules
- [ ] All eight debt findings addressed with **file:line evidence**, not prose
- [ ] Finding 1 was *verified*, not assumed — the agent actually searched for `uib-*`
- [ ] Finding 4 reports the directive as **unused**, not as a second mechanism to reconcile
- [ ] Finding 5 has an ADR, because it is a behaviour decision and not a free win
- [ ] Finding 6 is explicitly deferred with a reason, not marked "fixed by migration"
- [ ] **Each of the six behavioural defects (9-14) has a reproduce-or-fix decision**, and every
      *fix* has an ADR saying so out loud
- [ ] Nothing in 9-14 is marked "resolved by migration" — none of them is
- [ ] The `$rootScope` event map has publishers **and** subscribers for every event
- [ ] The migration order has a justification per position, not just a list
- [ ] **`git diff` shows no changes to `app/`, `test/` or `specs/features/`**
- [ ] No increment plan — that is [step 07](07-plan.md)

---

## ⚠️ Pitfalls

<details>
<summary><b>Generic legacy-app findings</b></summary>

"Consider adopting a modern build tool." Everyone knows. The value is in
`app/app.js:14 hardcodes http://localhost:3000/api` — specific, located, actionable, verifiable.
If a finding has no file path, it is an opinion about JavaScript, not an assessment of this repo.
</details>

<details>
<summary><b>Assessment turns into planning</b></summary>

Phase A says *what is wrong and in what order to address it*. Phase P says *what we will build,
in which increments, with which stack*. If `specs/increment-plan.md` appears in this step, the
phases have collapsed — and you have skipped the gate between "here are the problems" and
"here is the commitment".
</details>

<details>
<summary><b>Everything is Critical</b></summary>

If all eight findings come back High severity, the severity field carries no information. The
JWT-in-`localStorage` finding is genuinely more serious than `bower_components/` being committed
— the ranking is the point.
</details>

<details>
<summary><b>Coverage treated as a score instead of a risk multiplier</b></summary>

A module with a thin green baseline is *riskier* to migrate, not safer. If the assessment ranks
modules purely by complexity and ignores coverage, you will end up migrating the least-tested
module at the point where you understand the target stack the least.
</details>

---

## ⏭️ Next

[**Step 07 — Plan**](07-plan.md) — increments, target stack, and the ADRs that lock them in.
