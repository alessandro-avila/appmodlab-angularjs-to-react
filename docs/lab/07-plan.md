# Step 07 · Phase P · Plan

> **Phase** P · Plan &nbsp;|&nbsp; **Branch** [`lab/07-plan`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/07-plan) &nbsp;|&nbsp; **Parent** `lab/06-assess`
> **Human gates** 🧑‍⚖️ Plan Review ✅ · Tech-Stack Review ✅ &nbsp;|&nbsp; **Status** ✅ Verified

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
git checkout main -- docs/ README.md   # current lab instructions
```

<sub>That third line matters. `docs/` lives on `main`; a `lab/*` branch cut from its predecessor carries whatever `docs/` looked like back then. Increment 0 was run against instructions **1935 lines out of date** because of exactly this — see [step 08](08-deliver-inc0-shell.md#-outcome).</sub>

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

Five constraints that have to be visible in the plan itself:
  - per ADR-005 there is no strangler-fig bridge: the two stacks do not share a page.
    The AngularJS app stays startable in the repo until the final increment, and the
    HTTP API is the seam. Say how incrementality survives without an in-page bridge
  - every @existing-behavior scenario passes after every increment, against whichever
    implementation now owns that route
  - a module's AngularJS route is removed only AFTER its React route is green
  - flight:selected crosses the increment 1 / increment 2 boundary. With no bridge, the
    cross-feature journey is unserved in the gap. Say so explicitly rather than
    designing interop for it.
  - increment 2 (hotel-booking) has scope no baseline scenario covers. Its room table
    has never rendered, so React will switch on a screen nobody has seen work. Plan for
    that discovery instead of assuming the module is a port.

Deliberate behaviour changes need their own Gherkin delta and an ADR. From Phase A
there is exactly one candidate.

One caution about your inputs. Re-derive any figure you rely on from source rather
than quoting the assessment. Its summary block disagrees with its own tables on the
finding counts, and two numbers in it were carried over from ADR-005 instead of being
re-measured. If a count matters to the plan, count it.

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

The target language is TypeScript, in strict mode. ADR-005 recorded JavaScript and
accepted a specific consequence for it: with no compiler, the API contract could not be
enforced at build time, so conformance was pushed to the test layer. That requirement has
since been clarified — TypeScript is the landing stack. Write a new ADR that supersedes
ADR-005 on this point. It must say what changed and why: the requirement was clarified,
ADR-005's reasoning was not faulty. Then state what strict mode now enforces and which of
ADR-005's test-layer obligations are consequently relaxed. Do not edit ADR-005 itself.

One thing strict mode does not buy, so do not let it into the ADR as if it did: types are
erased at runtime. Step 06 finding P-7 is the proof — the rooms payload has no `id` field,
and a generated type declaring one would have made the compiler agree with the bug. Say
where response validation happens, and note that it is a separate mechanism from typing.

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
<summary><b>A reference mapping, and what it actually chose</b></summary>

The middle column is what the prompt deliberately did **not** say — the agent had to derive it. The
right column is the answer it came back with, so you can see where the prediction held and where it
did not:

| Legacy | Expected role | What it chose |
|--------|---------------|---------------|
| AngularJS 1.6.10 | React 19 | React **19.2.8** ✅ |
| Grunt + Bower | a bundler + npm | **Vite 8.2.1** ✅ |
| angular-ui-router 0.4.3 | a router | **React Router 8.3.0**, declarative ✅ |
| Restangular 1.6.1 | a data-fetching client + `fetch` | **one `fetch` client, no library** ⚠️ |
| `$rootScope` event bus | a state store | **Zustand 5.0.15**, vanilla store ✅ |
| Karma 1.7 + Jasmine 2.8 | a unit runner + Testing Library | **Vitest 4.1.11** + Testing Library ✅ |
| "click it and see" | Playwright | Playwright **1.62.1** — pin corrected, see G-1 ✅ |
| Moment.js 2.18 | a date library, parsing explicitly | **date-fns 4.4.0** ✅ |
| global Bootstrap 3 CSS | scoped styles | **Bootstrap 3, carried forward unchanged** ❌ |
| angular-ui-bootstrap | dropped entirely | dropped ✅ |
| — | ESLint flat config; responses validated at the boundary | **oxlint + tsgolint** ❌ · **Zod** ✅ |

**Three rows did not go as predicted, and all three are the interesting ones:**

- **No data-fetching library.** The prediction assumed one. Two NFRs titled *"No caching"* say
  otherwise, against a server that generates results per call.
- **Bootstrap 3 stays.** "Scoped styles" assumed a styling migration. This is a component rewrite,
  not a redesign — nothing in the FRDs asks for it.
- **oxlint, not ESLint.** Nobody predicted this, because it depends on a fact you only find by
  querying the registry: `typescript-eslint` caps `typescript` at `<6.1.0`.

That last row is the argument for the research step in one line. **A prediction made from training
data would have written `eslint.config.js` into Increment 0 and hit `ERESOLVE` on day one.**

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
    │  ── from P1, the increment plan ──
    ├── adr-009-explicit-date-parsing.md            ← the behaviour change
    ├── adr-010-authentication-surface-sequencing.md ← unpredicted; reshapes Inc-0
    │  ── from P2, the tech stack ──
    ├── adr-011-target-language-typescript.md       ← supersedes ADR-005 on language
    ├── adr-012-routing.md
    ├── adr-013-server-state-and-caching.md
    ├── adr-014-client-state-store.md
    ├── adr-015-config-and-environment.md
    └── adr-016-auth-jwt-localstorage-accepted-risk.md
```

<sub>The first two are what P1 actually produced. **ADR-010 was not predicted by anyone** — the
planner derived it from a collision between ADR-006 and ADR-005 that neither ADR noticed. P2's
numbering therefore starts at 011. Phase A ended at ADR-008; the P2 slugs name the *role*, not the
package, because the package is P2's output rather than its input.</sub>

### The increment plan, expected shape

| # | Increment | Scope | Verification |
|---|-----------|-------|--------------|
| 0 | Walking skeleton | Vite + React 19 (TypeScript, `strict`), router tree, data-fetching client, auth store, Vitest, Playwright config | `npm start` serves legacy; React dev server serves a trivial route; **all existing `@existing-behavior` scenarios still pass** |
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
- **adr-009**, recording that we chose determinism over bug-compatibility
- a note in `specs/frd-flight-search.md`

> The rule this illustrates: *behaviour changes are allowed. Undocumented behaviour changes are
> not.* The green baseline will catch it either way — the ADR is what makes the failure
> **expected** rather than a regression.

---

## 📤 Outcome

### P1 — Increment plan · ✅ Verified

> Branch [`lab/07-plan`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/07-plan) ·
> [compare with `lab/06-assess`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/compare/lab/06-assess...lab/07-plan)

```
 .spec2cloud/audit.log                             |   36 +
 .spec2cloud/state.json                            |  220 ++-
 specs/adrs/adr-009-explicit-date-parsing.md       |  204 +++
 specs/adrs/adr-010-authentication-surface-…       |  198 +++
 specs/increment-plan.md                           | 1754 ++++++++++++++++
 5 files changed, 2405 insertions(+), 7 deletions(-)
```

`git status -- app/ api-mock/ test/` = **0 changes**. No package is named anywhere in the plan; §13
hands the entire stack to P2. It stopped at the gate.

### The deltas are real

This was the thing to check hardest, and it passes. Every increment classifies its scenarios
**Preserve / Supersede / Net-new**, line-numbered, each with a mechanism and an authorising ADR, and
the scenario arithmetic is carried forward increment to increment. A sample from Inc-1:

| Line | Verdict | Why |
|---|---|---|
| `:118` | **SUPERSEDE** | C-4 — `step=50` with `min=230` caps the filter at 630, hiding flights at 638 and 642 |
| `:123` | **SUPERSEDE** | same root cause — `controller.js:120` broadcasts the *unfiltered* count |
| `:62` | **PRESERVE** | the generator ignores the requested date. Unauthorised, therefore reproduced |
| *typed departure date* | **NET-NEW** | the field is `<input type="text">`; typing never fires `onSelect`, so the model stays null while the field looks filled. React makes typing work **for the first time** |

Seven line citations sampled at random — `feature:91`, `:118`, `:123`, `template.html:57`,
`page.js:7`, `controller.js:107`, `controller.js:120` — were **7/7 exact**.

### The finding that changes the project

§0.6 ran the baseline before relying on it:

```
235 scenarios (189 passed, 46 failed)
1944 steps (1781 passed, 117 skipped, 46 failed)
```

**`git diff app/` and `git diff api-mock/` are both 0 lines.** Not one line of application source
changed since the baseline was approved at 235/235. **The suite decayed on its own.**

Cause, proven by driving a browser rather than inferred: the datepickers are configured `minDate: 0`
and `minDate: 1`, so every past day of the current month renders `unselectable` with no `<a>` inside.
The baseline hard-codes **absolute** August 2026 dates. On approval day all were in the future; they
are now in the past, and `pickDate` waits 30 s for a locator that will never appear. All 46 failures
carry the identical signature.

I verified the mechanism independently — `minDate: 0`/`1` confirmed in `flight-search`,
`hotel-booking` and `travel-request` controllers, and the hard-coded August days confirmed in both
the feature files and the step definitions. *(One slip: §0.6 attributes `minDate: 0` to
"departure, check-in, **expense** date" — `expense.controller.js` has no `minDate` at all. The third
is travel-request.)*

Its chosen repair is the right one, and the reasoning is the interesting part. **Rejected:** relative
dates, because deriving from the run date rewrites `Then` literals — `flight-search.feature:93`
asserts the field reads *"Tue Aug 25 2026"* — and editing assertions is exactly what ADR-008 exists
to prevent. **Chosen:** pin the suite clock. Inputs stay literal, assertions stay untouched, and
Inc-0's *"no feature file changes"* proof survives.

> A green baseline is not green forever. This one rotted with **zero commits** against it, and it
> would have been discovered mid-increment as a "React regression" that was nothing of the kind.
> Re-run the baseline at the start of every increment, not just after changes.

### It found a genuine ADR conflict

§1.7: `adr-006:164` states *"Both frameworks are loaded simultaneously, the bundle is larger than
either endpoint"* — which is only possible if they share a document, and **ADR-005 forbids exactly
that**. I confirmed the quote is real and at that line.

The plan implements ADR-005's reading — two documents, two bundles, one origin, never co-loaded —
**says so**, and escalates rather than silently choosing. That is the correct behaviour for a
contradiction between two approved decisions.

### ADR-010 was not on anyone's list

Predicted ADRs for this step were all stack decisions. The planner produced one nobody asked for,
and it reshapes an increment boundary.

ADR-006 put authentication in Inc-0. But with no bridge, **the login screen cannot move before `/`
moves** — so the auth *surface* cannot live in an increment that migrates no feature. ADR-010 splits
it: Inc-0 takes the **plumbing** (token store on the same `localStorage` key, `Authorization` header,
route guard, `GET /api/auth/me` rehydration for the C-1 repair, 401 handling) with a Gherkin delta of
**0 affected / 235 untouched / 0 new**; the **surface** moves to cutover.

This is a planner deriving a consequence its own inputs implied but never stated. It also means
[step 08](08-deliver-inc0-shell.md) is *shell + auth plumbing*, not *shell + auth*.

### Figures re-derived, as instructed

§0 exists because the P1 prompt told it not to trust its inputs. It paid off:

| Figure | Assessment said | Plan re-derived | Verdict |
|---|---|---|---|
| Findings | 34 (5/13/13/3) | **41** (5/**15**/**18**/3), 43 rows | ✅ matches my count exactly |
| `$broadcast` sites | 24 | **29** | ✅ matches |
| `app/` size | 27 files / 4462 lines | 27 files ✓ / 4925 physical, **4458 non-blank** | ADR-005's figure was non-blank lines, and 4 short |
| API-only scenarios | 15 | **15** ✓ | see below — this one corrected *me* |

Three of the four inputs did not survive re-measurement. None changed an increment boundary, which is
itself worth noting: the plan recorded them so the gate would not inherit them, then carried on.

**And it caught an error in this lab's own review.** Step 06's outcome claimed the assessment's
*"15 server-only"* should read 19. It should not. The full correction is
[in step 06](06-assess.md#the-reviewer-broke-his-own-rule) — briefly, **API-only (15)** and
**`@bypasses-ui` (4)** are different categories and do not add, `itinerary.feature:27` is a comment
rather than a tag, and the one scenario that looks server-only calls `page.goto()`. The plan resolved
every step against `tests/steps/*.js`; the reviewer added two numbers that looked related.

### Six decisions handed to the gate

The plan refuses to answer six questions it judges outside its authority, and states §3.2's supersede
figure as a **range (65–69)** rather than picking answers to close it. Only one has real blast radius:

| # | Decision | Blast radius |
|---|---|---|
| **1** | **§1.7 — ADR-005 vs ADR-006 on simultaneous loading** | **the whole plan** |
| 2 | §10.1 — cutover carries auth, or a separate Inc-5b? | one increment boundary |
| 3 | §12 — authorise the 14 reproduced defects now? | 14 scenarios, plus rework if deferred |
| 4 | §7.5 — do cancelled items count toward a server-derived `Trip.totalCost`? | one scenario, one API field |
| 5 | §1.5 — where is Q-7 ownership enforced? | one scenario, the API contract |
| 6 | §11.3 — P-6, client-minted expense IDs | one scenario, one server field |

**Resolved at the gate:** ADR-005's reading stands (it is the governing decision; ADR-006's bullet is
a loosely worded consequence, corrected by note rather than edit). The 7-increment shape stands. The
14 reproduced defects are authorised now.

### P2 — Tech stack · ✅ Verified

```
 .spec2cloud/audit.log                       |   +47
 .spec2cloud/state.json                      |  +100
 specs/adrs/adr-011-typescript-strict-mode.md
 specs/adrs/adr-012-routing-real-paths.md
 specs/adrs/adr-013-client-state-store.md
 specs/adrs/adr-014-date-library.md
 specs/adrs/adr-015-jwt-localstorage-accepted-risk.md
 specs/adrs/adr-016-toolchain-vite-vitest-oxlint.md
 specs/tech-stack.md                         | 245 lines
```

`app/`, `api-mock/`, `test/`, `tests/` and `specs/features/` — **0 lines changed**.

| Concern | Choice | Version |
|---|---|---|
| Language | **TypeScript, `strict`** | 7.0.2 |
| UI | React + React DOM | 19.2.8 |
| Routing | `react-router`, declarative | 8.3.0 |
| Client state | `zustand` (vanilla store) | 5.0.15 |
| Dates | `date-fns` + native `Intl` | 4.4.0 |
| **Response validation** | `zod` | 4.4.3 |
| **Data fetching** | **one `fetch` client — no library** | — |
| Bundler | `vite` (Rolldown + Oxc) | 8.2.1 |
| Unit runner | `vitest` | 4.1.11 |
| **Linter** | **`oxlint` + `oxlint-tsgolint`** | 1.79.0 · 7.0.2001 |
| Styling | Bootstrap 3 CSS, carried forward | 3.3.7 |

### The research was real — I checked all of it

Every version claim was verified against live npm. **14 of 14 exact.** Not "close" — exact, including
`oxlint-tsgolint@7.0.2001`, which is not a version anyone guesses.

The load-bearing claims held too:

| Claim | Verified |
|---|---|
| `typescript-eslint` peers `typescript: '>=4.8.4 <6.1.0'` | ✅ verbatim — and its own latest is `8.67.1-alpha.17` |
| `react-router` engines `node: '>=22.22.0'` | ✅ exact; host is v22.22.2 |
| `react-router-dom` removed in v8 | ✅ frozen at 7.18.2 |
| `NFR-F005-003` / `NFR-F007-004` justify no cache | ✅ both literally titled *"No caching"* |

**The ESLint finding is the one that changed a decision.** TypeScript 7 is outside
`typescript-eslint`'s peer range, so `npm` fails with `ERESOLVE`. ESLint cannot parse `.ts` without
it. There is therefore **no ESLint path on TS 7 today** — hence `oxlint` + `oxlint-tsgolint`, which
also fires `no-floating-promises` and mechanically closes finding **P-8**.

That is a dependency conflict you meet on day one of Increment 0 or you meet it now, in research.

### Two things it proved rather than described

**P-7, executed.** It compiled a cast to a `Room` type declaring `id: string` under `tsc --strict`
— **exit 0** — while every `r.id` was `undefined` at runtime and the `Set` size collapsed to 1. That
is the duplicate-key set behind `ngRepeat:dupes`, reproduced through a *"typed"* client. **The
compiler agreed with the bug.** ADR-011 says so in those words, then puts validation in the API
client and infers the type *from* the schema so the two cannot drift.

**Day.js, disqualified by measurement.** Two probes made it look safe. A third — the day-first
discriminator `09/08/2026` as `dd/MM/yyyy` — showed it **silently ignoring the format string**.
That is Moment's exact failure mode, and it is the whole reason ADR-009 exists. `date-fns` won on a
measurement, not a download count.

> Both of these are the same habit: where behaviour was decidable, it ran the code instead of
> reading the docs. It also corrected itself once — the first two Day.js probes were not
> discriminating, and it said so.

### What it refused to buy

Every rejection is argued from an FRD, an ADR or a measurement — never popularity:

- **TanStack Query / SWR / any cache** — *specified against.* Two NFRs say **"No caching"**, and the
  server generates results per call. A cache would be **observably wrong** and would break baseline
  scenarios. *(This is also why naming TanStack Query in these docs earlier would have been wrong.)*
- **UI kit** — `angular-ui-bootstrap` had **zero** usages. Replacing an unused dependency is pure addition.
- **Form library** — deferred to Inc-4, *"when the travel-request form is visible"*.
- **TanStack Router** — seven flat, parameter-free paths. Codegen for the least demanding routing problem available.
- **React Compiler** — no performance requirement exists, and ADR-005 rejected the Performance path.

### Two errors

| Claim | Actual |
|---|---|
| TypeScript 7.0.2 *"GA five days ago"* | published **2026-07-08 — 48 days** before the run |
| P-8 is *"9 `.then`, 0 `.catch`"* | **10** `.then`, 0 `.catch` — all ten real code, none in comments |

Neither changes a decision. The second is the interesting one: **P-8's own figure is off by one, and
P2 quoted it instead of counting.** In the same step whose P1 half built an entire section on
re-deriving. The discipline did not survive the boundary between two prompts.

### The gate: three findings it would not decide alone

It raised **G-1, G-2, G-3** — distinct from the `§13` items, which were *known* hand-offs. These were
new, and it raised them rather than acting:

**G-1 — the Playwright pin, and it was already bleeding.** `package.json` pins
`^1.63.0-alpha-2026-07-29`. Stable is 1.62.1, and `next` had **already moved** to
`1.63.0-alpha-2026-08-25` — which that caret accepts. A floating test harness directly undercuts the
determinism §0.6's clock repair exists to buy. **Resolved: stable 1.62.1** (Clock API landed in 1.45,
so nothing is lost).

> Sequence it deliberately: change the version **first** and confirm the baseline still fails exactly
> 46 with the same datepicker signature — that isolates the downgrade as a no-op. *Then* apply the
> clock repair. Both at once gives a surprise two possible causes.

**G-3 — ADR-015 needs a person, not a role.** The JWT stays in `localStorage`: readable by any script
on the origin, valid 24h, **unrevocable** (the server holds no session state). That acceptance rests
entirely on Q-12 — *nothing is deployed*. The ADR is blunt about what follows:

> *"A risk whose justification is 'nobody can reach it' must be re-examined the instant somebody can,
> and the only mechanism that guarantees re-examination is a written owner and a written trigger."*

So it is a deferred decision with a tripwire, and a tripwire needs somewhere to fire.
**Resolved: `@alessandro-avila`**, recorded in the ADR and `riskRegister`, `ownerNamed: true`.

**Naming the owner does not close the risk.** `RISK-001` stays `OPEN`; closure requires a new ADR
superseding ADR-015. Trigger 2 is the one to watch here — it is blocking, and it covers *"a demo
against a live audience with attendee-supplied data."* On a hackathon stage, that fires.

### §1.7 settled — ADR-005 governs

The conflict P1 escalated is resolved: **the two stacks never share a document.** Each AngularJS
component is fully rewritten in React 19 + TypeScript; both apps live in the repo and stay startable
until cutover, but a page loads exactly one of them.

ADR-006's contradicting text was corrected **in place, not erased** — struck through, with the
correction beside it:

| Clause | Verdict |
|---|---|
| *"runs as a hybrid"* | ✅ true |
| *"both frameworks loaded simultaneously"* | ❌ false |
| *"the bundle is larger than either endpoint"* | ❌ false — there is no combined bundle |
| *"route transitions cross a boundary"* | ✅ true — a **document** boundary, a full page load |

Its decision, module scores, migration order and increment boundaries are untouched. **Increment 0 is
unblocked.**

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
- [ ] An ADR **supersedes ADR-005 on language**, and **ADR-005 itself is unedited** —
      `git diff` on it must be empty
- [ ] That ADR does not claim strict mode validates API responses. Types are erased; P-7 is the
      counter-example
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
