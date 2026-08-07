# Step 07 · Phase P · Plan

> **Phase** P · Plan &nbsp;|&nbsp; **Branch** [`lab/07-plan`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/07-plan) &nbsp;|&nbsp; **Parent** `lab/06-assess`
> **Human gates** 🧑‍⚖️ Plan Review · Tech-Stack Review &nbsp;|&nbsp; **Status** ⏳ Pending

---

## 🎯 Goal

Turn the assessment into a **commitment**: an ordered increment plan, a resolved target stack,
and an ADR for every technology choice.

The critical output is not the list of increments — it is the **deltas**. Each increment carries
its Gherkin delta (which scenarios change, which are new) and its FRD delta. That is what makes
Phase 2 a red-green cycle instead of a rewrite with tests bolted on afterwards.

---

## 🧰 Skills invoked

| # | Skill | Writes |
|---|-------|--------|
| P1 | `modernization-planner` | `specs/increment-plan.md` + per-increment Gherkin/FRD deltas |
| P2 | `tech-stack-resolution` | `specs/tech-stack.md` |
| P3 | `adr` | `specs/adrs/adr-NNN-*.md`, one per significant choice |
| — | `research-best-practices` | current guidance via `context7`, `microsoft.docs`, `deepwiki` |

---

## ✅ Prerequisites

- [ ] [Step 06](06-assess.md) approved at the Assessment Review gate
- [ ] Migration order agreed
- [ ] `context7` MCP server reachable — React 19, TanStack Router and TanStack Query are all
      newer than most model training data, and this is the step where that matters

---

## 🌿 Branch setup

```bash
git switch lab/06-assess
git switch -c lab/07-plan
```

---

## 🗣️ The prompts

### P1 — Increment plan

```text
Phase P. Turn the assessment into an increment plan.

Shape it as: increment 0 is a walking skeleton — React running alongside the
AngularJS app, no feature migrated. Then one increment per feature module, in the
assessment's order. Then cutover as its own increment, not a bullet at the end of
the last one.

The thing I actually care about is the deltas. For every increment I want the
Gherkin delta — which existing @existing-behavior scenarios are affected, which are
untouched, which are new — and the FRD delta. An increment plan without deltas is a
list of module names, and Phase 2 has nothing to work against.

Four constraints that have to be visible in the plan itself:
  - per ADR-005 there is no strangler-fig bridge: the two stacks do not share a page.
    The AngularJS app stays startable in the repo until the final increment, and the
    HTTP API is the seam. Say how incrementality survives without an in-page bridge
  - every @existing-behavior scenario passes after every increment, against whichever
    implementation now owns that route
  - a module's AngularJS route is removed only AFTER its React route is green
  - flight:selected crosses the increment 1 / increment 2 boundary. With no bridge, the
    cross-feature journey is unserved in the gap. Say so explicitly rather than
    designing interop for it.

Deliberate behaviour changes need their own Gherkin delta and an ADR. From Phase A
there is exactly one candidate.

Do not resolve the tech stack yet. Stop at the Plan Review gate.
```

### P2 — Tech stack

```text
Phase P, continued. Resolve the target stack.

Use the MCP research tools, context7 especially, and check current versions and
current patterns. Do not answer from training data — React 19 and the current
generation of React routers and data-fetching clients are all newer than most of
it, and I would rather find that out now than in increment 0.

Every legacy technology needs a named replacement or an explicit "dropped", justified
against the FRDs and the green baseline rather than against popularity. If nothing in
the specs needs it, it does not go in the stack.

Then one ADR per real decision. Four of them I know I want, because they are choices
rather than translations:
  - routing: hash URLs (#!/flights) become real paths. Decide explicitly whether the
    old ones redirect or just break.
  - client state: $rootScope becomes a store — map every event to a store concern,
    including flight:selected across the module boundary.
  - dates: replacing Moment.js also means parsing explicitly, which changes
    user-visible behaviour. This one needs the Gherkin delta referenced in the ADR.
  - auth: the JWT stays in localStorage for this lab. Record it as a known, accepted
    risk with a follow-up owner — not as resolved, and not silently.

Stop at the Tech-Stack Review gate.
```

<details>
<summary><b>A reference mapping, if you want to check its work</b></summary>

Not part of the prompt — the agent should derive this. Use it to mark the result:

| Legacy | Expected target |
|--------|-----------------|
| AngularJS 1.6.10 | React 19 |
| Grunt + Bower | a bundler + npm |
| angular-ui-router 0.4.3 | a router |
| Restangular 1.6.1 | a data-fetching client + `fetch` |
| `$rootScope` event bus | a state store |
| Karma 1.7 + Jasmine 2.8 | a unit/component runner + Testing Library |
| "click it and see" | Playwright |
| Moment.js 2.18 | a date library, parsing explicitly |
| global Bootstrap 3 CSS | scoped styles |
| angular-ui-bootstrap | dropped entirely |
| — | ESLint flat config; response shapes validated at the API boundary |

The right-hand column is deliberately role-shaped. ADR-005 left bundler, router and date control
as follow-on ADRs, so the *names* are this step's output, not its input — that is exactly the
judgement you are here to review.

</details>

<details>
<summary><b>Why force MCP research?</b></summary>

React 19 shipped December 2024; TanStack Router v1 and TanStack Query v5 both moved fast. A model
answering from training data will confidently generate React 18 patterns — `ReactDOM.render`,
the old `createBrowserRouter` shape, `useQuery` with the object/positional signature it no longer
has. You will not notice until the build fails in [step 08](08-deliver-inc0-shell.md).

`context7` exists for exactly this. Make the plan cite versions.
</details>

---

## 📦 Expected artifacts

```
specs/
├── increment-plan.md               ← 7 increments, each with Gherkin + FRD deltas
├── tech-stack.md                   ← every technology resolved, with versions
├── contracts/
│   └── api/                        ← unchanged from B1, possibly annotated
└── adrs/
    ├── adr-009-routing.md
    ├── adr-010-server-state-and-caching.md
    ├── adr-011-client-state-store.md
    ├── adr-012-date-handling-explicit-parsing.md    ← the behaviour change
    ├── adr-013-config-and-environment.md
    └── adr-014-auth-jwt-localstorage-accepted-risk.md
```

<sub>ADR numbering continues from Phase A, which ended at **ADR-008**. Slugs name the *role*, not
the package — the package is this step's output, not its input.</sub>

### The increment plan, expected shape

| # | Increment | Scope | Verification |
|---|-----------|-------|--------------|
| 0 | Walking skeleton | Vite + React 19 (JavaScript), router tree, data-fetching client, auth store, Vitest, Playwright config, ESLint flat config | `npm start` serves legacy; React dev server serves a trivial route; **all existing `@existing-behavior` scenarios still pass** |
| 1 | flight-search | `app/components/flight-search/*` → React; `date-picker.directive.js` and both filters dissolved | `flight-search.feature` passes against the React route |
| 2 | hotel-booking | `app/components/hotel-booking/*` → React | `hotel-booking.feature` green |
| 3 | itinerary | `app/components/itinerary/*` → React; `itinerary:refresh` becomes a store subscription | `itinerary.feature` green; booking a flight still refreshes the itinerary |
| 4 | travel-request | `app/components/travel-request/*` + `approval-status.directive.js` | `travel-request.feature` green |
| 5 | expense-reconciliation | `app/components/expense-reconciliation/*` + `currency-input.directive.js` + `currency.filter.js` | `expense-reconciliation.feature` green |
| 6 | Cutover | delete `app/`, `bower.json`, `.bowerrc`, `Gruntfile.js`, `bower_components/`; prune `package.json` | `npm run build` + full Vitest + full Playwright, all green |

### The one deliberate behaviour change

Everything else in this migration preserves behaviour. Date parsing does not, and that asymmetry
is worth being explicit about.

**Today:** `flight-search.controller.js:47` calls `moment(newVal)` on a user-entered date with no
format string. Moment falls back to `new Date()`, logs a deprecation warning, and parses
locale-dependently.

**Target:** `date-fns` `parse()` with an explicit format. Deterministic, no warning, no locale
surprise.

**Why this is a change and not a fix:** a user in a locale where `08/09/2026` means 8 September
gets a different date. That is user-visible. It therefore needs:

- an entry in the increment 1 **Gherkin delta** — the `@existing-behavior` scenario that pins
  loose parsing is modified, and the modification is reviewed
- **adr-012**, recording that we chose determinism over bug-compatibility
- a note in `specs/frd-flight-search.md`

> The rule this illustrates: *behaviour changes are allowed. Undocumented behaviour changes are
> not.* The green baseline will catch it either way — the ADR is what makes the failure
> **expected** rather than a regression.

---

## 📤 Outcome

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/06-assess..lab/07-plan`
> 2. `specs/increment-plan.md` — in particular, **do the increments actually carry Gherkin
>    deltas**, or is it just a list of modules?
> 3. `specs/tech-stack.md` with the resolved versions — and whether they are current
> 4. Which ADRs it produced, and whether the date-parsing ADR (expected **adr-012**) exists
> 5. Did it use the MCP tools, or answer from training data? (Symptom: React 18 patterns,
>    `ReactDOM.render`, outdated TanStack APIs.)
> 6. What it decided about hash routes (`#!/flights`) — redirect, or drop?
> 7. **What it says about `flight:selected` across increments 1 and 2** — with no in-page bridge,
>    the honest answer is that the cross-feature journey is unserved in the gap. A plan that
>    quietly designs interop anyway has not read ADR-005

---

## 🧑‍⚖️ Human gates

### Plan Review

- [ ] Increment 0 is a **walking skeleton with no feature migration**
- [ ] Every increment lists files created / modified / **deleted**
- [ ] Every increment carries a **Gherkin delta** — this is the whole point of Phase P in
      brownfield. A plan without deltas is a to-do list.
- [ ] Every increment has a verification command
- [ ] The constraint *"legacy app keeps working until the final increment"* is visible in the plan
- [ ] The AngularJS route removal is sequenced **after** the React route goes green, per module
- [ ] Cutover is its own increment, not a bullet at the end of increment 5

### Tech-Stack Review

> 🟠 **Blast radius: expensive to reverse later.**

- [ ] Versions are **current**, and were researched — not recalled
- [ ] React 19 patterns, not React 18 (`createRoot`, not `ReactDOM.render`)
- [ ] Every legacy technology has a named replacement or an explicit "dropped"
- [ ] `angular-ui-bootstrap` is dropped, per Phase A finding 1
- [ ] The date-parsing ADR exists and references the Gherkin delta
- [ ] The JWT-in-`localStorage` ADR says **accepted risk with a follow-up**, not "resolved"
- [ ] A decision exists about hash-route compatibility — either answer is fine, silence is not
- [ ] Nothing was added that no FRD needs. A state library *and* a form library *and* a UI kit
      is scope creep wearing a stack diagram.

---

## ⚠️ Pitfalls

<details>
<summary><b>An increment plan with no deltas</b></summary>

The single most common failure of this step. You get seven increments named after the five
modules and nothing that says *which scenarios change*. Phase 2 then has no red baseline to work
against, and "implementation" degenerates into "port the file and hope".

If the deltas are missing, send it back. It is the difference between brownfield planning and a
Jira board.
</details>

<details>
<summary><b>The stack is chosen from popularity, not from the FRDs</b></summary>

Ask of every entry: *which FRD requires this?* A state store is justified because
`specs/docs/assessment` mapped four `$rootScope` events that need a home. A form library is not
justified by anything — `travel-request` is validation-heavy, but that is an increment-4
decision, made when you can see the actual form.
</details>

<details>
<summary><b>Big-bang smuggled into the plan</b></summary>

Watch for an increment 0 that "sets up React and migrates routing". That deletes UI-Router, which
breaks all five AngularJS routes at once, which breaks the entire green baseline in one commit.
Increment 0 must leave the legacy app fully working.
</details>

<details>
<summary><b>Deleting bower_components/ early "to clean up"</b></summary>

The AngularJS app loads its dependencies from there. Delete it before cutover and the legacy app
stops booting — and with it, every `@existing-behavior` scenario for every unmigrated module.
It goes in increment 6, alone, deliberately.
</details>

<details>
<summary><b>Hash routes silently dropped</b></summary>

`#!/flights` is what the app serves today. Moving to `/flights` is correct, but it is a URL
change — bookmarks and any deep links break. Decide it explicitly. This is a two-line ADR that
saves an argument.
</details>

---

## ⏭️ Next

[**Step 08 — Increment 0: the React shell**](08-deliver-inc0-shell.md) — the first line of React,
and not a single migrated feature.
