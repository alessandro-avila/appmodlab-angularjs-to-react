# ADR-013 — Client state: a vanilla Zustand store replaces `$rootScope`

- **Status:** proposed — decided at the Tech-Stack Review gate
- **Date:** 2026-08-25
- **Phase:** P → `tech-stack-resolution`
- **Deciders:** product owner, orchestrator
- **Supersedes:** —
- **Depends on:** ADR-005, ADR-011 (TypeScript), assessment finding **P-5**, increment plan §0.2,
  §0.4, §2.4, §4.3, §13 item 5
- **Related:** ADR-012 (routing — the route guard reads this store), ADR-015 (JWT storage — the store
  is the read model, `localStorage` is the persistence)

## Context

### The mechanism being replaced

**P-5:** *"`$rootScope` is the application's only cross-cutting state mechanism, holding
`currentUser` and an unbounded `notifications` array, with no ownership or teardown discipline."*

The assessment counted 24 `$broadcast` sites. Increment plan §0.2 re-measured and found **29 emit
sites across five distinct events** — 24 was the `notification:add` subset alone. The plan's own
conclusion:

> The store-mapping work in Inc-0 must cover **five distinct events across 29 emit sites**, not 24
> sites of one event. §0.4 enumerates them, and three of the five turn out to be dead — which changes
> the plan.

### The event bus, and how much of it is alive

From §0.4, re-derived from source: 29 `$broadcast` sites; 15 `$on` registrations of which 8 are
`$destroy` cleanups, leaving **7 real listeners**.

| Event | Emit sites | Listeners | Ever alive together? | Status today |
|---|---:|---|---|---|
| `notification:add` | 24 | `app.js:44`, on `$rootScope` | always | **works** |
| `auth:login` | 1 (`auth.service.js:24`) | `flight-search:245`, `travel-request:299`, `expense:330` | never | never delivered |
| `auth:logout` | 1 (`auth.service.js:35`) | **none** | — | dead in both directions |
| `flight:selected` | 1 (`flight-search.controller.js:207`) | `hotel-booking:266` | never | never delivered |
| `itinerary:refresh` | 2 (`flight-search:221`, `hotel-booking:238`) | `itinerary:223` | never | never delivered |

The mechanism is `app/index.html:37` — a **single `<div ui-view>`**. ui-router destroys the outgoing
state's controller before instantiating the incoming one, so no two feature controllers are ever alive
simultaneously. Only the `$rootScope`-level listener in `app.js` can hear anything.

**The precise count, because §0 insists figures be re-derived rather than quoted.** Of the five
events, **one works** and **four are never delivered**. Of those four, **three are pinned as
non-functional by a baseline scenario**:

- `hotel-booking.feature:209` — *"Selecting a flight does not carry the destination over to hotels"*
- `itinerary.feature:240` — *"A booked flight never reaches the itinerary"*
- `authentication.feature:138` — *"Nothing is listening for a sign-out announcement"*

The fourth, `auth:login`, is never delivered for the same structural reason but has no scenario of its
own, because its failure has no user-visible symptom — nothing downstream depended on it.

**Only one of the 29 emit sites does anything.** That is the finding that shapes this decision: what
is being replaced is not an event bus with four features, it is one working notification channel and
four pieces of scaffolding.

### The requirement that actually discriminates between the options

A React store must serve four consumers. Three are components. **One is not.**

| Consumer | Component? | Needs |
|---|---|---|
| Notification area (shell chrome) | ✅ | subscribe to the notification list |
| Navbar / route guard (ADR-012) | ✅ | subscribe to session presence |
| **The API client** (§13 item 4, ADR-011 §4) | ❌ | **read the token to build the `Authorization` header** |
| **The 401 handler** (§13 item 12) | ❌ | **clear the session on rejection** |

The API client is a module, not a component. It has no hooks, no context, and no position in the React
tree. If session state lives only in a React context, the token must either be threaded from a hook
into every call site, or mirrored into a module-level variable that the client reads — **two copies of
the session, kept in sync by discipline.** That is `$rootScope`'s failure mode reproduced in new
syntax, and P-5 names it exactly: *"no ownership … discipline"*.

So the requirement is: **one store object, one copy of the state, readable and writable from outside
the React tree, with selector-scoped subscriptions inside it.**

## Decision

### 1. The store

**`zustand@5` (5.0.15), using its vanilla `createStore` as the single owner of cross-cutting client
state, with `useStore` for component subscriptions.**

Zustand 5 has **zero runtime dependencies** — React and `use-sync-external-store` are peers it uses
when present. The vanilla store is a plain object with `getState`, `setState` and `subscribe`, so the
API client and the 401 handler read and write the same state the components render from, with no
second copy and no bridge.

### 2. Every event mapped to a store concern

This table is the deliverable. §4.3 requires that **all five events be recorded, including the two
that map to nothing** — *"a store mapping that silently omits `flight:selected` is how the pre-fill
gets implemented by accident."*

| Event | Emits | Store concern | Owner | Disposition and authority |
|---|---:|---|---|---|
| `notification:add` | 24 | **`notifications`** | app shell | **Ported.** Append, auto-expire on a timer, **bounded** — closing P-5's unbounded array. The only event that works today; its behaviour is PRESERVE. |
| `auth:login` | 1 | **`session`** — set on authenticate | app shell | **Absorbed, not replayed.** The store makes the value *available* to any reader; it does not re-broadcast an event. Its three listeners were never reachable and are not recreated. |
| `auth:logout` | 1 | **`session`** — clear | app shell | **Absorbed.** No listener exists today. The sign-out *surface* is NET-NEW and lands in **Inc-6** (ADR-010); the store slice it will call exists from Inc-0. |
| `flight:selected` | 1 | **none — deliberately dropped** | — | **Dropped, not ported.** §2.4. A store could trivially make the hotel pre-fill work; **no recorded decision authorises it**, so `hotel-booking.feature:209` is PRESERVE and Inc-2 must satisfy it *by construction* — there is no pre-fill mechanism at all. |
| `itinerary:refresh` | 2 | **deferred to Inc-3** | itinerary feature | **Deferred, authorised.** The one exception, because **Q-3 / SEAM-3** already decides that a booking must create an itinerary item. Not implemented in Inc-0. §7.2. |

**Two live concerns. Two dropped-or-deferred. Twenty-nine emit sites collapse to two owners.**

```ts
interface AppState {
  session: { token: string | null; user: User | null };
  notifications: Notification[];
  signIn(token: string, user: User): void;   // <- auth:login
  signOut(): void;                            // <- auth:logout
  notify(text: string, level: Level): void;   // <- notification:add  (x24)
}
```

There is deliberately **no `selectedFlight`** and **no `itineraryVersion`** in Inc-0's store. Their
absence is the enforcement mechanism for §2.4, and it is enforced by ADR-011's compiler: a component
that reaches for a pre-filled flight does not fail a review, it fails the build.

### 3. `session` is a read model, not the storage

The store holds the session **in memory**. It is not where the JWT lives — `localStorage` is
(**ADR-015**), and the two must not be confused:

- **On boot**, the store hydrates: read the token from `localStorage`, then call `GET /api/auth/me` to
  recover identity. This is the **ADR-003 C-1** repair — today `$rootScope.currentUser` is populated
  only by the login exchange and never persisted, so after any reload the itinerary attributes notes
  to *"You"* rather than their author (`frd-itinerary.md`, corrected assumption 5), and
  `authentication.feature:156` pins *"Reloading the page keeps my token but forgets who I am"*.
- **That repair is observable on `/` and therefore lands in Inc-6**, where `:156` and `:165`
  supersede (§10.4). Inc-0 builds the *plumbing* and the store shape that make it possible — it ships
  no auth surface (§4.2).
- **On sign-out and on 401**, both the store slice and `localStorage` are cleared, from the same
  function. One caller, two effects, no possibility of a cleared store with a surviving token.

### 4. Notifications are bounded, with a named owner

P-5's *"unbounded `notifications` array"* is closed by construction: the shell owns the slice, entries
auto-expire on a timer, and the list is capped. Verified:

```
12 notifications pushed -> length 5, oldest surviving entry is n7   ✅
```

The cap and the expiry interval are implementation details for Inc-0, not decisions for this ADR. What
this ADR fixes is that the array **has a bound and an owner**, which is precisely what P-5 says it does
not have today.

## Alternatives considered

### React Context alone — rejected, and it is the option most teams would have taken

The obvious React-native answer, no dependency, and it serves the three component consumers perfectly
well. Rejected on the fourth consumer: **the API client and the 401 handler are not components.**
Context cannot be read outside the tree, so the token would live in a context *and* in a module
variable the client reads. Two copies of the session, reconciled by convention — which is the exact
defect P-5 raises against `$rootScope`. Swapping one undisciplined global for another with better
syntax is not a migration.

### A hand-rolled store on `useSyncExternalStore` — rejected, and it was the closest call

React 19 ships `useSyncExternalStore` precisely for external stores. Two slices this small are perhaps
thirty lines, with zero dependencies, complete control, and trivial testability. Given §13's *"anything
that does not trace to a finding or an FRD does not go in the stack"*, this deserved to win.

It is rejected for two specific reasons rather than a general preference for libraries:

1. **`useSyncExternalStore`'s snapshot contract is a sharp edge**, and the notification slice sits
   exactly on it. `getSnapshot` must return a referentially stable value between changes; a selector
   deriving anything from the array — a filtered list, a count with an object wrapper — returns a fresh
   reference on every render and produces an infinite re-render loop. The failure is at runtime, is not
   caught by ADR-011's compiler, and would land in the increment that has the least behavioural cover:
   Inc-0 ships **no product route**, so **no baseline scenario observes the shell at all** (§4.2).
2. **Zustand is not a framework here, it is that contract implemented once.** ~1 KB, no runtime
   dependencies, no provider, no reducers, no middleware adopted. The alternative is not
   "library versus no library" but "this contract written once by its maintainers, or re-written by us
   in the increment whose defining property is that nothing tests it."

Recorded as a close call because it is one. If the notification slice were the only concern, the
hand-rolled store would win.

### Redux Toolkit — rejected

The mature answer, with the best devtools and a genuinely useful discipline for large state trees.
Rejected on proportion: the state being modelled is **one token, one user object, and a capped array**.
RTK's slice/reducer/action ceremony is designed to impose order on state graphs vastly larger than
this, and adopting it would mean 29 emit sites collapsing into two concerns and then re-expanding into
a store directory. Nothing in the FRDs or the baseline needs time-travel debugging or serialisable
action logs.

### An event emitter — a faithful `$rootScope` port — rejected

The most literal translation: a `mitt`-style emitter with `notification:add`, `auth:login`,
`auth:logout`, `flight:selected` and `itinerary:refresh` preserved as events. Rejected because it
**faithfully reproduces the defect**. §0.4's finding is that four of five events are never delivered
*because emitter and listener are never alive together*. In React they would be — so a faithful port
would silently switch on the hotel pre-fill and the itinerary refresh, making two unauthorised
behaviour changes that ADR-005 forbids and that `hotel-booking.feature:209` and `itinerary.feature:240`
would immediately fail on. **The events must be resolved into state, not carried across**, and that is
the deeper reason §4.3 demands every event be mapped rather than migrated.

### Server state in the store (TanStack Query or similar) — rejected, on an FRD

Flights, hotels, trips, requests and expenses are **not** placed in this store. **NFR-F005-003** and
**NFR-F007-004** both state *"No caching"*: *"Every submission issues a fresh request; nothing is
cached. Because the server generates hotels per call, two identical searches return different result
sets."* Caching is specified against, and against a non-idempotent server it would be observably wrong.
Feature data stays local to the component that requested it. See `specs/tech-stack.md`.

## Consequences

**Positive.**
- One copy of the session, readable by the API client and the 401 handler without a bridge — the
  requirement no context-based design meets.
- P-5's unbounded array is bounded, and both slices have a named owner.
- `flight:selected` is dropped **explicitly and visibly**; the store's shape makes accidental
  re-implementation a compile error rather than a review miss.
- The store shape accommodates the ADR-003 C-1 identity repair from Inc-0, so Inc-6 adds a call, not a
  refactor.

**Negative / accepted.**
- A dependency where React's own primitive would nearly have done. Rebutted above, but it is a real
  cost and the hand-rolled alternative should be reconsidered if Zustand ever becomes an obstacle.
- **Inc-0's store ships with no scenario observing it** (§4.2 — no product route is React yet). Its
  cover is React unit tests only, which §4.5 already anticipates: *"React unit tests for the API
  client, token store, state store and the four shared components. These are new tests, not new
  scenarios."* This makes those unit tests load-bearing rather than incidental, and the gate should
  read them as such.
- Two concerns is a small store, and a small store invites additions. The mapping table above is the
  authority: **a new top-level concern requires an ADR**, because every one of the five events that
  exists today already has a recorded disposition.

**Blocked / unblocked.**
- **Unblocks** Inc-0's state store (§4.2, §4.3) and the API client's auth header.
- **Closes** §13 item 5 and the store half of ADR-005's P-5 remediation.
- **Does not close** §13 item 12 (the 401 / session-expiry *policy*). This ADR provides the mechanism
  the policy will call; the policy itself is needed by **Inc-3** and remains open for the gate.

## Verification

Reproduced on `zustand` 5.0.15 with React 19.2.8 under TypeScript 7.0.2 strict:

```
authHeader() with no session          -> {}                                   ✅
authHeader() after signIn             -> { Authorization: "Bearer jwt-abc" }  ✅   (read outside React)
onUnauthorized() from a non-component -> token === null                       ✅   (written outside React)
12 notifications pushed               -> capped at 5, oldest kept is n7       ✅   (P-5 closed)
component subscribed to same store    -> re-renders 0 -> 1 on notify()        ✅
tsc --strict over store + components  -> exit 0                               ✅
```

Rows 1–3 are the evidence for the discriminating requirement in §Context: a plain React context passes
none of them.
