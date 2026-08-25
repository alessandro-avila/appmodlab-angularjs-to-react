# ADR-010: The Authentication Surface Moves to the Cutover Increment

- **Status:** proposed — decided at the Plan Review gate
- **Date:** 2026-08-23
- **Deciders:** Product owner (hackathon), spec2cloud orchestrator
- **Supersedes:** **ADR-006** on increment boundaries only. ADR-006's ordering principles, its
  dependency graph and its module sequence (flight-search → hotel-booking → itinerary →
  travel-request → expense) are unchanged.
- **Related:** ADR-005 (no strangler-fig bridge; the HTTP API is the seam), ADR-002 (Q-8 multi-user
  login), ADR-003 (constraint C-1 — identity does not survive reload), ADR-008 (testing strategy)
- **Increment plan:** `specs/increment-plan.md` §10.1

## Context

ADR-006 decided six increments and merged authentication into Inc-0:

> **Increment boundaries follow FRD feature areas**, one increment per FRD, with the single exception
> that authentication is merged with the shell. The two are inseparable: the auth interceptor, the
> route guard, the navbar and global `currentUser` ownership are all shell concerns that only exist
> because authentication does.

That reasoning is sound for the *plumbing*. It does not survive contact with two other constraints
once the increment plan is written.

### Constraint 1 — Inc-0 must migrate no feature

The Plan Review gate requires *"Increment 0 is a walking skeleton with **no feature migration**"*.
Authentication is one of the six FRD feature areas, with its own FRD, its own 51-scenario feature
file and its own Track A assignment in `state.json`. Moving the login screen to React is migrating a
feature — which is what makes Inc-0's Gherkin delta non-zero and turns the walking skeleton into a
feature increment wearing a skeleton's name.

### Constraint 2 — with no bridge, the login screen cannot move before `/` moves

ADR-005 rejected the strangler-fig bridge and recorded: *"The AngularJS app and the React app coexist
**in the repository** (not in one page) until the final increment."*

Route ownership is therefore expressed by which document a URL serves
(`specs/increment-plan.md` §1.2). The AngularJS client expresses all **7** of its ui-router states as
fragments under the single path `/` (`app/app.routes.js`), and `app/index.html:37` holds a single
`<div ui-view>`. So `/` is indivisible: whoever owns `/` owns login **and** dashboard **and** the
navbar **and** the notification area, and serves them to every unmigrated module.

The consequence is a fork with only two prongs:

- **React takes `/` in Inc-0.** The AngularJS app then has no login screen and no way in. Every one
  of its 220 browser-driving baseline scenarios starts from a session, so the whole baseline breaks
  in the walking skeleton. Excluded.
- **React takes `/` last.** Authentication's surface lands with it.

There is no third option that does not reintroduce a bridge — a token hand-off between two origins,
or a duplicate login screen in Inc-0, both of which ADR-005 excludes.

### What is actually in "authentication"

Structurally trivial, behaviourally almost entirely net-new. The assessment scored it 29/45 with
**5 on D5 (behavioural change required)** and **5 on D6 (unproven surface)** — the joint worst D6 in
the product — precisely because so little of it exists:

| Element | Exists today? |
|---|---|
| Auth interceptor / `Authorization` header | yes — `app/app.js:16-28`, Restangular |
| Route guard | yes — `app/app.js:32-38`, but tests for the **presence** of a token, never its validity |
| Token store | yes — `localStorage`, written by `auth.service.js` |
| Login screen | yes — one button, inline anonymous controller at `app.routes.js:13-27` (finding A-3) |
| Credential form (**Q-8**) | **no** — net-new; the API already checks credentials and a second employee exists server-side |
| Sign-out | **no** — `AuthService.logout` has no caller, no control on any of the six screens, and `$rootScope` has **zero** `auth:logout` listeners at all times |
| 401 / session-expiry policy | **no** — a rejected session renders as an empty account with nothing saying the session is the problem |
| Identity surviving reload (**C-1**) | **no** — `app/app.js:40` nulls `currentUser` while the token survives; `GET /api/auth/me` is never called |

The first four are **plumbing** and have no user-visible surface of their own. The last four are
**surface** and need a React route the user can reach.

## Decision

**Authentication is split across two increments.**

**Inc-0 (walking skeleton) takes the plumbing:** the token store reading the same `localStorage` key
the legacy app writes, the API client's `Authorization` header, the route guard, **identity
rehydration via `GET /api/auth/me` (the C-1 repair)** and the 401 handling path. None of these has a
user-visible surface *of its own*. React owns no product route, and the Gherkin delta is
**0 affected / 235 untouched / 0 new**.

**Inc-1 … Inc-5 reveal that plumbing route by route.** Because a React route serves its own document
and boots its own token store, the C-1 repair and the 401 policy become *observable* the moment a
route becomes React — not when the login screen does. Several `authentication.feature` scenarios
assert on the itinerary and expenses screens rather than on `/`, so they supersede in **Inc-3** (3
scenarios, 401 policy) and **Inc-5** (5 scenarios, 401 policy + C-1), well before cutover. This is
set out in `specs/increment-plan.md` §3.1 and is the reason authentication's delta cannot be treated
as a single Inc-6 block.

**Inc-6 (cutover) takes the surface:** React takes `/`, and with it the login screen, the Q-8
credential form, the sign-out control, the navbar identity display, the notification area and the
dashboard — plus the two C-1 scenarios that assert on `/` itself (`:156`, `:165`). Its Gherkin delta
is **12 superseded (+2 pending) / 7 residual untouched / 8–9 net-new**
(`specs/increment-plan.md` §10.4).

**The module sequence in ADR-006 is unchanged.** Inc-1 flight-search, Inc-2 hotel-booking, Inc-3
itinerary, Inc-4 travel-request, Inc-5 expense-reconciliation — same order, same rationale, same
dependency graph. Only the placement of the authentication *surface* moves, and Inc-6 (cutover) is
added as its own increment rather than being a bullet at the end of Inc-5.

**Cutover remains a real cutover.** It still deletes `app/` (27 files, 4925 lines), `bower.json`,
`.bowerrc`, `bower_components/` (964 tracked files) and `Gruntfile.js`, and prunes `package.json`.
Taking `/` is the last route move; deleting the legacy stack is what the route move makes possible.
They are the same increment because they are the same event.

## Consequences

**Positive**

- Inc-0 is a genuine walking skeleton, and its correctness has a one-line proof:
  `git diff -- specs/features/` is empty.
- The AngularJS app keeps a working way in for the entire hybrid period. Every unmigrated module's
  scenarios keep starting from a real session, on the real login screen, through Inc-5.
- Q-8, sign-out and the login surface land **together**, in the increment where React owns `/`. The
  401 policy and the C-1 repair are built once in Inc-0 rather than twice, which matters because the
  guard's presence-only check, the missing 401 interceptor and C-1 are three faces of the same
  omission — "the client never asks the server who the bearer is". Building them in the shell and
  revealing them route by route is the only sequencing that avoids either duplication or knowingly
  shipping a broken 401 path on React routes.
- The 15 API-only authentication scenarios stay untouched throughout and finish the migration
  unedited, which is the cleanest available evidence that the seam held
  (`specs/increment-plan.md` §1.5).

**Negative / accepted**

- **Inc-6 remains the heaviest single gate** — 12 superseded scenarios plus 8–9 net-new, on top of
  deleting the entire legacy stack. Lighter than it first appeared (8 of authentication's
  supersessions move to Inc-3 and Inc-5 once cross-route scenarios are accounted for), but still the
  largest final review in the plan.
- The net-new authentication behaviour (a real login, sign-out) is the behaviour a reviewer would
  most like to see early, and it arrives last.
- ADR-006's *Negative* consequence — *"Inc-0 produces no user-visible feature, so the first human
  gate reviews infrastructure only"* — becomes strictly more true. The gate must be framed
  accordingly or it will read as "nothing happened".
- **The C-1 repair and the 401 policy are latent from Inc-0 and surface unevenly.** They first become
  observable in Inc-3 (`authentication.feature:207`, `:215`, `:220` on the itinerary screen), again
  in Inc-4 (`travel-request.feature:233`, a request raised in a restored session filed under "Demo
  User"), again in Inc-5 (`authentication.feature:179`, `:193`, `:199`), and finally on `/` in Inc-6.
  A latent fix revealed across four increments is harder to review than a visible one, and each of
  those gates must know it is reviewing the same Inc-0 code.

**Neutral**

- If the Plan Review gate prefers a lighter cutover, the surface can be split into an **Inc-5b** that
  takes `/` and the authentication surface, leaving Inc-6 as pure deletion. That is arguably the
  better-balanced shape and costs only an increment boundary. It is raised as an explicit gate
  decision in `specs/increment-plan.md` §14. This ADR does not foreclose it; adopting the split
  supersedes this ADR on that point alone.

## Alternatives Considered

### Keep ADR-006 as written — authentication in Inc-0

The status quo. **Rejected** because it fails the Plan Review gate's *"no feature migration"* check,
and because §Constraint 2 shows it is not physically available without a bridge: React cannot own the
login screen while AngularJS still serves the other six routes from `/`.

### Give authentication its own increment, before flight-search

Inc-0 skeleton, Inc-1 authentication, Inc-2 flight-search, and so on. Faithful to the assessment's
recommended order, which puts *shell + authentication* first. **Rejected on the same physical
ground**: an authentication increment that does not take `/` has nothing to migrate but plumbing, and
one that does take `/` strands the AngularJS app in increment 1 of 8 — breaking all 220
browser-driving scenarios for five still-unmigrated modules at the earliest possible moment. It would
also renumber every later increment, and the plan's cross-increment analysis (notably `flight:selected`
across the flight-search / hotel-booking boundary) is written against the agreed numbering.

### Give authentication its own increment, after expense and before cutover

Inc-0 skeleton, Inc-1…Inc-5 the five modules, **Inc-6 authentication**, Inc-7 cutover. This is the
same work as the chosen decision with one extra boundary, and it keeps cutover as pure deletion.
**Genuinely close, and not rejected on merit** — it is the *"Inc-5b"* option recorded under
*Neutral* and put to the gate. The 7-increment form is presented because that is the shape the plan
was asked for; if the gate prefers the split, nothing in the analysis changes except the numbering
of the last two increments.

### Build a minimal React login in Inc-0 that coexists with the AngularJS one

Two login screens on one origin, both writing the same `localStorage` key. **Rejected.** Two
implementations of the same behaviour is exactly the throwaway interop scaffolding ADR-005 rejected,
and it would require the 36 browser-driving authentication scenarios to state *which* login screen
they mean — forking the baseline, which ADR-008 §1 forbids.

## Follow-on

- `specs/increment-plan.md` §4 (Inc-0), §3.1 (the cross-route distribution) and §10 (Inc-6)
  implement this decision.
- `specs/frd-authentication.md` records the split: the token store, route guard, identity
  rehydration and 401 policy have a React implementation from Inc-0; the login screen, credential
  form and sign-out from Inc-6. It also records that the authentication feature file's scenarios
  supersede across Inc-3, Inc-5 and Inc-6 rather than in one place.
- The 401 / session-expiry policy remains an open `tech-stack-resolution` item (ADR-005 follow-on 5)
  and must be resolved **before Inc-3**, not before Inc-6 — it supersedes three scenarios there.
- The JWT-in-`localStorage` decision is **not** made here. It is retained for this lab and must be
  recorded at `tech-stack-resolution` as an accepted risk with a named follow-up owner
  (`specs/increment-plan.md` §13 item 13).
