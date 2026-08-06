# ADR-005 — Path selection: Modernize `globaltravel-portal` from AngularJS 1.6 to React 19 (JavaScript)

- **Status:** accepted
- **Date:** 2026-08-06
- **Phase:** B3 → Path Selection (end of Track A green baseline, before Phase A/P)
- **Deciders:** product owner, orchestrator
- **Supersedes:** —
- **Depends on:** ADR-001 (Q-1…Q-7), ADR-002 (Q-8…Q-12, especially **Q-10** and **Q-12**), ADR-003 (Track A adopted)

## Context

The brownfield common trunk is complete. `globaltravel-portal` v1.6.0 now has a PRD, six FRDs, full
extraction output, and — as of this gate — an approved **Track A green baseline of 235 scenarios /
1944 steps**, all passing against unmodified source. Twelve product-intent questions are answered.
Path selection is the first decision that authorises a change to the application.

Three facts from the trunk bound this decision.

**1. The client and the server are not in the same situation.**

| | Files | Lines | Fate |
|---|---:|---:|---|
| `app/` — AngularJS client | 20 JS + 6 HTML + 1 CSS | 2332 + 1547 + 583 = **4462** | **replaced entirely** |
| `api-mock/server.js` — Express API | 1 | **634** | **survives**, with three seam fixes |

Nine runtime dependencies are loaded as raw `<script>` tags from vendored `bower_components/`:
`angular`, `angular-ui-router`, `angular-ui-bootstrap`, `restangular`, `jquery`, `jquery-ui`,
`bootstrap`, `lodash`, `moment`. **All nine are AngularJS-era and none survives.** `app/index.html`
carries 20 hand-written `<script src>` lines; there is no build step for `app/` at all (Grunt exists
only to produce `dist/`).

**2. The application is not merely being re-platformed — its behaviour is changing.** ADR-001 and
ADR-002 already decided: a booking must create an itinerary item (**Q-3**, SEAM-3); the server
recomputes `Trip.totalCost` (**Q-6**); every collection is scoped to the authenticated user
(**Q-7**); a real multi-user credential form replaces the hardcoded button (**Q-8**); currency
becomes single-value USD (**Q-9**); and seven files — three directives, two filters and two unused
services (`api.service.js`, `user.service.js`) — are **deleted rather than ported** (**Q-10**),
along with the `ui.bootstrap` dependency. Separately, the baseline proved four features have a dead
or trapped primary control caused by AngularJS `ng-if` scope shadowing; those controls **start
working** the moment the scope chain disappears.

**3. There is nothing deployed.** **Q-12** put production deployment out of scope for this
hackathon. There is no live instance, no user traffic, and no rollback obligation.

## Decision

**Select the Modernize path.** Migrate the client from AngularJS 1.6.10 to **React 19**, authored in
**JavaScript (not TypeScript)**, delivered as a **sequence of increments, one per FRD feature area**,
each going through the standard Phase 2 pipeline (tests → contracts → implementation → verify).

Invoke `modernization-planner` to produce `specs/increment-plan.md`.

### Scope of the modernization

| Concern | From | To |
|---|---|---|
| Framework | AngularJS 1.6.10 | React 19 |
| Language | ES5 + `'use strict'` | Modern JavaScript (ESM), **no TypeScript** |
| Routing | ui-router 0.4.3, hash URLs (`#!/expenses`) | React router, real paths |
| HTTP | Restangular + a `$rootScope` interceptor | `fetch` |
| Templating | 6 HTML partials, `ng-*` directives | JSX components |
| Cross-cutting state | `$rootScope.currentUser`, `$rootScope.notifications`, 24 `$broadcast` sites | React context / state |
| Dates | `moment` + jQuery UI datepicker | native `Intl` + a React date control |
| Collections | `lodash` | native JS |
| CSS | Bootstrap 3 + `style.css` (583 lines) | carried forward initially, revisited per increment |
| Build | none for `app/`; Grunt for `dist/` | a single modern bundler |
| Server | `api-mock/server.js` | **unchanged in structure**; SEAM-3/4/5 fixed, Q-6/Q-7 enforced |

### What the green baseline is, and is not

The 235 scenarios are a **reference**, not a contract to reproduce verbatim. They split three ways,
and the planner must classify every scenario before an increment is written:

| Class | Meaning | Examples |
|---|---|---|
| **Preserve** | Correct behaviour; the React version must match | flight search results, request validation rules, the server's 401 surface |
| **Supersede** | The scenario encodes a defect that ADR-001/002 already decided to fix | the four dead controls, `ngRepeat:dupes` blocking hotel booking, SEAM-3/4/5, the un-dismissable alerts |
| **Net-new** | No baseline exists, because the behaviour does not exist yet | Q-8's real login form, Q-7's ownership isolation, sign-out, a 401 policy |

**A superseded scenario is replaced, never deleted silently.** Each one is rewritten in the same
feature file, its `@existing-behavior` tag swapped for the increment's tag, and the original
preserved in git history with the ADR reference that authorised the change. Net-new behaviour needs
new Gherkin through the normal Step 1 gate.

## Alternatives considered

### Rewrite — the serious contender, rejected

This is the only alternative a reasonable person could have picked instead, and the case for it is
strong enough to state properly.

**The case for Rewrite.** The framework defines the rewrite path as *"component-by-component
rewrite from one stack to another using the strangler fig pattern"* — which is, word for word, what
is about to happen. **100% of the 4462-line client is deleted and re-authored**; not one AngularJS
file, directive or filter survives. By any plain-English reading that is a rewrite, and calling it
"modernization" risks the label doing damage: `modernization-planner` is described as *"upgrade
deps, fix patterns, reduce debt"*, and none of those verbs describes replacing AngularJS with React.
A planner working from the wrong label could emit increments shaped like *"upgrade lodash to 4.17"*
for a dependency that is being deleted outright. Rewrite would also force an explicit target-stack
ADR by construction, and its strangler sequencing would satisfy the brownfield rule *"every change
must leave the application in a working state — no big-bang transformations"* mechanically, by
mounting React components inside the running AngularJS shell and migrating screen by screen.

**Why it is still rejected.**

1. **Strangler fig buys insurance against live traffic, and there is no live traffic.** The pattern's
   entire purchase is the ability to roll back a partially-migrated production system with real
   users on it. **Q-12** removed production deployment from scope. Nothing is deployed, nobody is
   using it, and there is no rollback obligation to insure. We would pay the premium and own no
   policy.

2. **The interop bridge is expensive and 100% throwaway.** Running React 19 inside AngularJS 1.6
   requires, before a single feature moves: a bundler introduced into a client that currently has
   **no build step and 20 hand-written `<script>` tags**; a bridge between `$rootScope.currentUser`
   / `$rootScope.notifications` and React state across **24 `$broadcast` sites**; dual routing
   reconciling ui-router's hash URLs with a React router; and a Restangular-and-`fetch` coexistence
   story for the auth interceptor. Every line of that is deleted at the end. Against a 4462-line
   client, the scaffolding plausibly rivals the migration it exists to de-risk.

3. **Four of six features cannot serve as a working legacy reference.** Strangler fig assumes the
   old side keeps working while you replace it piece by piece. The baseline proved otherwise:
   hotel booking **cannot complete a booking through the UI** (`ngRepeat:dupes` empties the room
   table), the itinerary status filter and Add Note are **completely dead**, travel-request search
   is **inert**, and the expense date filter **traps the user behind two empty inputs**. Keeping
   that alive alongside React preserves a reference that is, in the places that matter most, wrong.

4. **The system already has its seam, and it is not inside the client.** The strangler pattern's
   hard part is manufacturing a boundary to migrate across. Here one already exists: the HTTP API.
   It is extracted to `specs/contracts/api/`, unchanged by this work, and independently pinned by
   **15 baseline scenarios that never open a browser**. Migrating the client feature-by-feature
   behind a stable, test-pinned API boundary *is* incremental delivery. It does not need a fig.

5. **Incrementality is preserved by a different mechanism, not abandoned.** Each increment ships one
   FRD's screens in React with that feature's baseline scenarios re-pointed and green, against the
   same running server. The AngularJS app stays in the repository and remains startable until the
   final increment. What we give up is *both stacks serving one user in one page* — which, with no
   users, costs nothing.

> **The condition under which this decision is wrong:** if a production instance with real users
> existed, or if Q-12 were reversed and deployment brought into scope mid-flight, the risk
> calculation inverts and the strangler bridge becomes worth its cost. This ADR should be revisited
> the moment either becomes true.

**Residual concern accepted.** Point 1 of the case *for* Rewrite is legitimate and is not dismissed:
the Modernize label is a poorer description of the work than the Rewrite label is. It is chosen for
the **increment shape it produces**, not for descriptive accuracy. Mitigation: `modernization-planner`
is to be invoked with this ADR as explicit input, and **if it emits dependency-upgrade-shaped
increments, that is a signal it has mis-scoped the work** — reject the plan and re-run it rather
than accepting increments that assume AngularJS survives.

### Cloud-Native — rejected, but only deferred

The genuine argument: the app is nowhere near 12-factor. Two `http://localhost:3000` literals are
compiled into the client (`app/app.js:14`, `app/services/auth.service.js:18`), the signing secret is
a source literal (`api-mock/server.js:13`), all state lives in in-memory arrays, and there is no
container definition. Those are real gaps and a real path exists to close them.

It is rejected because **Q-12 already removed the destination**. There is no deployment target this
hackathon, so containerising and externalising configuration would produce infrastructure for a
system that will not be provisioned. Worse, the two hardcoded URLs live in files being **deleted in
increment 1** — externalising them first is work performed on a corpse.

This is a *deferral*, not a refutation. Once the React client exists, `cloud-native-planner` applies
cleanly to the new stack, and the in-memory datastore becomes the obvious next question.

### Security — rejected as a separate path, partly absorbed

The strongest of the remaining alternatives, because the findings are real and documented as NFRs:
credentials compared in plaintext (NFR-F001-002), the JWT secret a source-code literal
(NFR-F001-003), authorisation that is authentication only (NFR-F001-004), ownership never evaluated
(NFR-F001-005), and — proven at the baseline gate — a route guard that tests for the **presence** of
a token and never its validity, so a token the server rejects opens every screen.

It is rejected as a *separate* path for a specific reason: **most of these findings are already
scheduled by decisions taken.** Q-7 (per-user scoping) fixes NFR-F001-005. Q-8 (a real credential
form) fixes the presence-only guard and the hardcoded login. Running Security as a parallel path
would mean building the login form and the ownership filter **twice** — once against AngularJS,
once against React — for an application with no users to protect in the interim.

**Two findings genuinely survive the client migration untouched**, because they are server-side and
independent: the plaintext credential comparison and the literal `JWT_SECRET`. These are recommended
as a **follow-on path after the migration completes**, not as a reason to fork the plan now.

### Performance — rejected

A performance assessment would flag the `$digest`-cycle patterns, the unbounded `notifications`
array, the absence of pagination on every collection, and 9 unminified vendor scripts loaded
serially. Every one of those findings is an artefact of AngularJS 1.6 and the no-build-step script
loading — **they are deleted, not optimised, by increment 1**. Profiling code with a scheduled
demolition date is waste. Performance becomes a legitimate question against the React client, and
only then.

### Extend — rejected, though the boundary is genuinely blurry

No new product capability was requested. The honest complication: **Q-8's multi-user login and
sign-out are extension-shaped** — they are net-new behaviour with no baseline scenario, not
corrections to something that exists. They are nonetheless carried *inside* the migration increments
rather than as a separate path, because they cannot be built twice and their natural home is the
authentication increment. `extension-planner` is not invoked; the net-new Gherkin goes through the
normal Step 1 gate within its increment.

### Fix Bugs — rejected

Roughly forty documented limitations sit across the six FRDs, and the `bug-fix` skill exists exactly
for traceable individual fixes. It is rejected because **the overwhelming majority live in code that
increment 1 deletes** — the four dead controls, the shadowed alerts, the inert search, the trapped
date filter. Fixing them in AngularJS to delete them weeks later is pure waste; they are resolved by
being reimplemented correctly.

The exception is **SEAM-3, SEAM-4 and SEAM-5**, which are server-side and marked `defect-to-fix` in
state. Those survive the client migration and are folded into the increments that touch their
endpoints, rather than run as standalone bug fixes.

## Consequences

**Positive.**
- The green baseline becomes the acceptance harness for the migration. Scenarios are written in user
  language, not framework language, so the *Preserve* class re-points at React with no rewording.
- The API boundary is stable and already contract-documented, so the 15 server-level scenarios stay
  green throughout and act as a continuous invariant.
- Six FRDs give six natural increment boundaries, each already independently tested.
- Q-10's seven dead files (3 directives, 2 filters, 2 unused services) are never ported — the work
  is smaller than the
  file count suggests.
- The four scope-shadowed controls start working for free once the AngularJS scope chain is gone.

**Negative / accepted.**
- **JavaScript, not TypeScript, is a deliberate cost.** The repository conventions anticipate shared
  contract types under `src/shared/`. Without a compiler, the API contract cannot be enforced at
  build time. Mitigation: `specs/contracts/api/` remains the normative source, contract shapes are
  documented in JSDoc, and conformance is asserted at the **test** layer — which is where the 15
  server-level scenarios already sit. This must not be quietly reversed later without a new ADR.
- The AngularJS app and the React app coexist **in the repository** (not in one page) until the final
  increment, so the repo temporarily holds two clients.
- Every *Supersede* scenario requires a documented ADR reference at rewrite time. This is deliberate
  friction, to stop a failing scenario being "fixed" by weakening it.
- Bootstrap 3 CSS is carried forward initially to keep increments honest about scope; replacing it is
  a separate decision, not a smuggled one.

**Blocked / unblocked.**
- **Unblocks** `modernization-planner` → `specs/increment-plan.md`, then `tech-stack-resolution` →
  `specs/tech-stack.md` (React 19 version pinning, bundler, router and date-control choices — each
  warranting its own ADR).
- **Blocked until after the migration:** Cloud-Native, Performance, and the two server-side Security
  findings.
- Phase 2 Step 4 retains no Azure form, per **Q-12**.

## Follow-on decisions required

These are named here so they are not made implicitly during implementation. Each needs its own ADR
at `tech-stack-resolution`:

| # | Decision | Why it cannot be deferred past Phase 1d |
|---|---|---|
| 1 | Bundler / toolchain | The client has no build step today; this is increment 1's first act |
| 2 | Router, and hash URLs vs real paths | Changes every URL in the baseline's navigation steps |
| 3 | Date control replacing jQuery UI | Constraint **C-2** (the open datepicker blocks the submit button) disappears or changes shape |
| 4 | Ownership enforcement point for **Q-7** | Server-side filter vs client-side — affects the API contract and the 15 server scenarios |
| 5 | 401 / session-expiry policy | Net-new: today a rejected session renders as an empty account with no mention of the session |
