# ADR-021 — `itinerary:refresh` becomes query invalidation, over a cache scoped to one resource

- **Status:** proposed — decided at the Inc-3 PR Review gate
- **Date:** 2026-08-27
- **Phase:** 2 → increment 3 (`itinerary`)
- **Deciders:** product owner, orchestrator
- **Supersedes:** **ADR-013**'s mapping of `itinerary:refresh` to a store concern — *only* that one row
  of the five-event table. Every other mapping in ADR-013 stands.
- **Depends on:** ADR-013 (the store), ADR-020 (SEAM-3 — without the server half this has nothing to
  show), `specs/tech-stack.md` §"not adopted", NFR-F005-003, NFR-F007-004, increment plan §4.3, §7.2
- **Answers:** increment plan §7.2 — *"the one cross-module event that is restored rather than dropped"*

## Context

`itinerary:refresh` is broadcast by both booking flows and subscribed by the itinerary controller,
which is never alive when the broadcast happens — so it has never once been delivered. ADR-013 mapped
it to a store concern; plan §7.2 restored it as the single event that Q-3 authorises keeping.

Increment 3 replaces it with **query invalidation** instead. The reasoning given for preferring
invalidation is that it removes pub/sub: the dependency becomes a function call a reader can follow,
rather than a string that has to be traced across two files with no compiler help.

### The obstacle

`specs/tech-stack.md` lists under *not adopted*:

> **TanStack Query / SWR / any data cache** — **Specified against.** NFR-F005-003 and NFR-F007-004:
> *"Every submission issues a fresh request; nothing is cached. Because the server generates hotels per
> call, two identical searches return different result sets."* Against a non-idempotent server, a cache
> would be observably wrong and would break baseline scenarios.

Invalidation without a cache is a no-op. Booking happens on `/flights` or `/hotels`; the itinerary is
not mounted at the time, and it fetches on mount when the traveller arrives. So the naive reading is
that the mechanism is unnecessary here.

## Decision

**Cache exactly one resource — `GET /api/trips` — behind a 90-line in-house query, and invalidate it
from both booking mutations.** No library is added.

`src/lib/query.ts` provides `read`, `invalidate`, `subscribe`, `peek`. `itineraryQuery` is its only
instance. Flight and hotel searches continue to call `api-client` directly, uncached.

### Why this does not contradict the tech stack

The NFRs are about **search**. Their stated reason is that *"the server generates hotels per call, two
identical searches return different result sets"* — non-idempotency. `GET /api/trips` is idempotent
and returns a stable, server-owned resource; the seeded array changes only when something writes to it,
and the only writer is a booking, which is exactly what invalidates the cache.

So the rule the NFRs express — *never show a user a stale answer to a question whose answer moves on
its own* — is preserved. What changes is the blanket phrasing "any data cache", which was written
against libraries that cache everything by default. This caches one endpoint whose invalidation points
are enumerable and enumerated.

## Consequences

- `announce()` and the seam's `events` map survive, because `createQuery` announces on invalidation
  under the same name. **`flight-search.feature:231` — *"the itinerary is asked to refresh"* — passes
  unchanged and is NOT superseded.** The behaviour it pins still happens; only the mechanism beneath
  it changed. This is the distinction the increment turns on: a mechanism change that no scenario can
  observe is not a behaviour change.
- Concurrent reads are collapsed onto one request, so a route that mounts twice does not issue two
  identical GETs — a small improvement the broadcast never offered.
- A mounted itinerary reloads immediately on invalidation, which the legacy could not do. Nothing
  exercises it today (no route shows both screens at once), and it costs nothing to have.
- ADR-013's five-event table now has **two** dispositions rather than one shape: `flight:selected`
  DROPPED, `itinerary:refresh` REPLACED BY INVALIDATION, three dead events dropped. The asymmetry
  between the first two is deliberate and is documented in both ADRs, because they look identical in
  the legacy source and are treated oppositely.

## Alternatives considered

**No cache; rely on fetch-on-mount.** Genuinely sufficient today, and simpler. Rejected because it
leaves `flight-search.feature:231` with nothing to observe — the scenario would have to be superseded
or silently weakened to "the booking succeeded", losing the only pin on the producer/consumer
relationship. Keeping a real, named invalidation point keeps that scenario meaningful.

**Adopt TanStack Query.** Rejected: it caches everything by default, which is precisely what the NFRs
forbid, and it would have to be configured off for the two search endpoints — a library adopted for one
idempotent GET and then disabled everywhere else.

**Keep the store event and add a subscriber.** Rejected on the instruction for this increment and on
ADR-013's own reasoning: it is the mechanism whose untraceability caused the defect in the first place.
