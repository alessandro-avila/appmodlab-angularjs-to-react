# ADR-006: Migration Order and Increment Boundaries

> [!IMPORTANT]
> **Correction — one Consequences bullet is wrong.** The *Negative* bullet beginning *"The
> application runs as a hybrid…"* states that **both frameworks are loaded simultaneously** and that
> **the bundle is larger than either endpoint**. Both clauses are false, and they contradict
> [ADR-005](adr-005-path-selection-modernize-to-react.md), which rejected running React inside the
> AngularJS shell.
>
> Settled at the Plan Review gate, 2026-08-26: **ADR-005 governs.** The two stacks **never share a
> document**. Each AngularJS component is fully rewritten in React 19 + TypeScript; both applications
> live in the repo and both stay startable until cutover, but a page loads exactly one of them.
>
> The bullet is corrected as follows, not deleted:
>
> | Clause | Verdict |
> |---|---|
> | *"The application runs as a hybrid"* | ✅ **true** — both apps exist in the repo and both are startable from Inc-1 to Inc-5 |
> | *"Both frameworks are loaded simultaneously"* | ❌ **false** — one origin, two documents, never co-loaded |
> | *"the bundle is larger than either endpoint"* | ❌ **false** — there is no combined bundle; the React bundle never contains AngularJS |
> | *"route transitions cross a boundary"* | ✅ **true**, but it is a **document** boundary — a full page load — not a framework boundary inside one page |
>
> **Why the bullet does not win.** It sits in a *Negative consequences* list: it describes a cost, it
> does not take a decision. Reading it literally would reinstate the interop bridge that ADR-005
> §2 rejected on cost grounds — a bundler forced into a client with no build step, a `$rootScope`
> bridge across 29 emit sites, dual routing, and Restangular/`fetch` coexistence, all of it deleted
> at cutover. A decision cannot be reversed by a consequence bullet in a downstream ADR.
>
> **Everything else in ADR-006 stands** — the module scores, the migration order, and the increment
> boundaries are unaffected. See `specs/increment-plan.md` §1.2–§1.4 for the implemented coexistence
> model and §1.7 for the escalation that produced this correction.

- **Status:** accepted — **one Consequences bullet corrected 2026-08-26** (see the note above; the
  decision itself is unchanged)
- **Date:** 2026-08-06
- **Deciders:** Product owner (hackathon), spec2cloud orchestrator
- **Supersedes:** —
- **Related:** ADR-001 (product decisions), ADR-002 (refinement decisions), ADR-003 (testability
  gate), ADR-005 (path selection — Modernize to React 19)

## Context

ADR-005 decided that the client is migrated to React 19 **as a sequence of increments**, with each
increment leaving `main` green and deployable. It did not decide what those increments are, nor in
what order they run. That is this decision.

The modernization assessment (`specs/assessment/modernization.md`) scored the six FRD feature areas
for migration difficulty across six weighted dimensions and produced:

| Module | Score /45 |
|---|---:|
| flight-search | 22 |
| authentication + shell | 29 |
| travel-request | 30 |
| itinerary | 34 |
| hotel-booking | 34 |
| expense-reconciliation | 37 |

Difficulty alone does not determine order, because three other forces act on it:

**Hard dependencies exist.** No feature can be built before a shell exists — there is currently no
bundler, no module system, no router, no API client and no state ownership (findings A-1, A-2, A-4,
D-3, D-4, P-5). SEAM-3 makes itinerary the consumer of both booking flows. Q-5 makes expense depend
on travel-request for its `travelRequestId` linkage.

**Behavioural confidence is unevenly distributed.** The green baseline pins 235 scenarios, but not
evenly: travel-request has 45 scenarios with zero UI bypasses, while **hotel-booking's room-selection
and booking-completion path has never rendered at all** (finding P-7 — `track by room.id` against a
payload with no `id`). Coverage is highest exactly where risk is lowest, and lowest exactly where the
unknown is largest.

**Some modules carry more product change than code.** Authentication is 238 trivial lines, but almost
everything about it is net-new: the Q-8 credential form, sign-out (which does not exist anywhere in
the product today), a 401 policy, Q-7's enforcement point, and repairing C-1. Line count is the least
predictive input available.

## Decision

**Six increments, in this order:**

| # | Increment | Score | Contains |
|---|---|---:|---|
| **Inc-0** | **Shell + authentication** | 29 | Bundler, router, API client, auth interceptor, global state ownership, environment config, navbar, notification area, ESLint/Prettier, CI, date-control decision, plus the login/logout/session behaviour |
| **Inc-1** | **flight-search** | 22 | Search → filter → results → detail; supersedes C-4 |
| **Inc-2** | **hotel-booking** | 34 | Search → filter → **room selection → booking** (never previously rendered); SEAM-3 producer |
| **Inc-3** | **itinerary** | 34 | List + timeline modes, print, Q-6 derived `totalCost`, SEAM-3 consumer, two dead controls made live |
| **Inc-4** | **travel-request** | 30 | Large form, validation, modal, approval flow; dead search made live |
| **Inc-5** | **expense-reconciliation** | 37 | Line items, receipts, Q-4 categories, Q-5 linkage, Q-9 currency removal, SEAM-4 |

**The ordering principles, in precedence order:**

1. **Hard dependencies first.** Shell before anything. Both booking producers before their itinerary
   consumer. travel-request before expense.
2. **Discover unknowns early.** A module whose behaviour has never been observed is scheduled while
   slack remains to absorb what it reveals.
3. **Establish patterns on the best-covered module.** The first *feature* increment should be the one
   where a stack or pattern mistake surfaces fastest and cheapest.

**Increment boundaries follow FRD feature areas**, one increment per FRD, with the single exception
that authentication is merged with the shell. The two are inseparable: the auth interceptor, the
route guard, the navbar and global `currentUser` ownership are all shell concerns that only exist
because authentication does.

**Every increment must leave the full 235-scenario baseline green** (as re-pointed per ADR-005's
three-way classification) before the next begins.

## Rationale for the non-obvious calls

**Inc-0 delivers no feature, and that is intentional.** A "walking skeleton" that migrates a feature
alongside the shell would entangle stack decisions with product decisions in the same review. Inc-0
is the only increment where the answer to "why is this like that?" is allowed to be "because the
framework requires it".

**hotel-booking is second despite scoring 34.** Its structure is flight-search's twin, so pattern
reuse from Inc-1 peaks immediately — but the real reason is principle 2. P-7 means the room table has
never rendered for any user or any test. React tolerates duplicate keys with a console warning rather
than throwing, so **migrating this module switches on a screen nobody has ever seen work.** Whatever
that reveals — layout that was never designed, server fields that were never consumed, a booking
POST that has never been issued from the UI — is undiscovered scope. Discovering it in increment 2 of
6 is materially better than discovering it in increment 6 of 6.

**itinerary is third, immediately after both its producers.** SEAM-3 (a booking must create an
itinerary item) spans three increments. Scheduling the consumer directly after the second producer
means the seam is verified end-to-end while that work is still fresh, rather than re-opened later.
Itinerary also carries **Q-6, the only API-visible change in the migration** (`Trip.totalCost` moves
from stored to derived), which is better landed mid-sequence than at either end.

**expense is last on both difficulty and dependency.** It is the hardest module by every structural
measure and absorbs the most product decisions. It also needs travel-request to exist (Q-5). By the
time it runs, every pattern it requires — large form, modal, date control, data table, filter bar —
already exists and has been proven by four prior increments.

## Alternatives Considered

### Strict easiest-first: flight-search → hotel-booking → itinerary → travel-request → expense

**This is very nearly the chosen order**, and its similarity is the point worth stating: sorting by
score alone happens to satisfy every hard dependency in this particular product. Rejected anyway,
because it satisfies them **by luck rather than by construction**. If a later re-scoring moved
travel-request above expense, or moved itinerary before hotel-booking, a difficulty-sorted order would
silently produce a dependency violation with nothing in the rule to catch it. The dependency graph is
the constraint; difficulty is the tie-breaker within it. Encoding that precedence explicitly costs
nothing here and prevents a class of error later.

### Hardest-first: expense → itinerary/hotel-booking → travel-request → flight-search

The argument is real: attempt the hardest work while enthusiasm and budget are highest, and let the
easy modules mop up at the end when energy is low. Rejected because expense **inherits** patterns
rather than defining them — it needs the large-form pattern from travel-request, the modal pattern,
the date control and the table pattern. Building it first means inventing all of those inside the
most complicated module in the product, then very likely rewriting them when the simpler modules
reveal a better shape. It also violates Q-5's dependency outright.

### Riskiest-first: hotel-booking immediately after the shell

Principle 2 taken to its conclusion — attack the unknown at the first possible moment. Genuinely
tempting, and it was close. Rejected because in Inc-1 position the React patterns do not yet exist,
so hotel-booking would be simultaneously **inventing** the search/filter/results pattern *and*
**discovering** what the never-rendered booking path does. Those two unknowns would be confounded:
when something breaks, it would be unclear whether the cause is the new stack or the newly-visible
legacy behaviour. Putting flight-search first separates them — the pattern is proven on a module with
25 green scenarios and 19 unit tests, so when hotel-booking surprises us in Inc-2, the surprise is
unambiguously the module, not the stack.

### One big-bang client rewrite (no increments)

Rejected in ADR-005 for the whole path; restated here for boundaries specifically. A single
increment means one review at the end, no green `main` in between, and no opportunity for the
baseline to catch a regression while its cause is still small.

### Layer-first: all services, then all controllers, then all templates

Superficially attractive because the five Restangular services are near-identical (P-12). Rejected
because it never produces a working screen until the very last layer lands. Nothing is demonstrable,
no baseline scenario can go green, and every human gate would be reviewing code with no observable
behaviour attached to it. It also contradicts ADR-005's per-FRD increment commitment.

## Consequences

**Positive**

- Every increment maps to exactly one FRD, so traceability from PRD → FRD → Gherkin → increment
  stays intact with no new mapping to maintain.
- The largest unknown (P-7) is confronted in increment 2 of 6, with four increments of slack behind
  it.
- SEAM-3 is verified across three consecutive increments rather than across the whole project.
- Every increment after Inc-0 has an existing pattern to follow, so increment cost trends downward
  even as module difficulty trends upward.

**Negative**

- Inc-0 produces no user-visible feature, so the first human gate reviews infrastructure only. The
  gate must be framed accordingly or it will read as "nothing happened".
- ~~The application runs as a **hybrid** — some routes React, some AngularJS — from Inc-1 to Inc-5.
  Both frameworks are loaded simultaneously, the bundle is larger than either endpoint, and route
  transitions cross a boundary.~~ **Corrected 2026-08-26 — see the note at the top of this ADR.**
  The application does run as a hybrid from Inc-1 to Inc-5 and route transitions do cross a
  boundary, but it is a **document** boundary (a full page load), not a framework boundary inside
  one page. The two stacks are never co-loaded and there is no combined bundle. This is the
  accepted cost of incremental delivery.
- Migrating hotel-booking early means accepting undiscovered scope early. This is deliberate, but it
  makes Inc-2's estimate the least reliable of the six.
- expense's product decisions (Q-4, Q-5, Q-9, SEAM-4) sit unaddressed until the final increment, so
  they stay open longest.

**Neutral**

- The order is a plan, not a contract. If Inc-2 reveals that hotel-booking's booking path is
  substantially larger than assessed, resequencing later increments is permitted — provided the
  dependency constraints in principle 1 still hold. Any resequencing supersedes this ADR.

## Follow-on

- `modernization-planner` consumes this ADR to produce `specs/increment-plan.md`.
- `tech-stack-resolution` (Phase 1d) resolves the specific libraries Inc-0 needs; this ADR names
  *what* Inc-0 contains, not *which packages* deliver it.
- ADR-007 decides how Inc-0's four cross-cutting DOM categories are eliminated.
- ADR-008 decides what happens to the unit suite during Inc-0.
