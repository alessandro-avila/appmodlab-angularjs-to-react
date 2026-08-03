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

- [ ] [Step 05](05-path-selection.md) approved — Modernize recorded in ADR-002 and `state.json`
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
    ├── adr-003-*.md                ← e.g. drop angular-ui-bootstrap
    ├── adr-004-*.md                ← e.g. externalise API base URL
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
| 4 | Two datepicker mechanisms | `app/directives/date-picker.directive.js` **and** `flight-search.controller.js:69-91` initialising jQuery UI directly in `$timeout` | ✅ Both replaced by a native date input |
| 5 | `moment()` without a format string | `flight-search.controller.js:47-48` on `$watch`; also `:107` (that one *does* format on output) | ⚠️ **Requires a decision** — see below |
| 6 | JWT in `localStorage`, no expiry | `app/services/auth.service.js`, guard at `app/app.js:32` | ❌ **Survives unchanged** — deferred to the Security path |
| 7 | `bower_components/` committed | repo root | ✅ Deleted at [cutover](14-cutover.md) |
| 8 | `$rootScope` as an event bus | publishers/subscribers across controllers; `notification:add` handled at `app/app.js:44` | ✅ Becomes an explicit Zustand store |

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
- [ ] All eight findings addressed with **file:line evidence**, not prose
- [ ] Finding 1 was *verified*, not assumed — the agent actually searched for `uib-*`
- [ ] Finding 5 has an ADR, because it is a behaviour decision and not a free win
- [ ] Finding 6 is explicitly deferred with a reason, not marked "fixed by migration"
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
