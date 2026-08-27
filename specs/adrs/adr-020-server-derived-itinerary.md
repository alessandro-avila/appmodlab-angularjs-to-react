# ADR-020 — The itinerary becomes server-derived: `Trip.totalCost` (Q-6) and bookings that arrive (SEAM-3)

- **Status:** proposed — decided at the Inc-3 PR Review gate
- **Date:** 2026-08-27
- **Phase:** 2 → increment 3 (`itinerary`)
- **Deciders:** product owner, orchestrator
- **Supersedes:** the client-side total pinned by `itinerary.feature:56`, and the unserved journey
  pinned by `itinerary.feature:240`
- **Depends on:** **ADR-001 Q-3** (*a booking must persist and appear on the itinerary*), **ADR-002
  Q-6** (`Trip.totalCost` is server-derived), ADR-005 (scope boundary), increment plan **§7.1**,
  **§7.2**, **§7.3**, **§7.5**
- **Answers:** increment plan **§7.5** — the open question this increment was required to close

## Context

Two recorded product decisions land in the same file, and both are server-side.

### Q-6 — the total is derived twice, by the wrong party

`itinerary.service.js:19` overwrites what the server sent:

```js
trip.totalCost = trip.items ? _.sumBy(trip.items, 'cost') : 0;
```

The fixture stores `2450.00` for `trip-1` while its items sum to `1330`; `trip-2` stores `1800.00`
against items summing to `1160`. Every client is therefore obliged to recompute a field the API
already publishes, and any client that trusts the API is wrong. `itinerary.feature:56` pins the
override, ending *"the server prices the trip `trip-1` at 2450 **but** the trip is priced at
$1,330.00"*.

### SEAM-3 — the producer/consumer seam was never connected

`POST /api/bookings/hotels` (`api-mock/server.js:445-455`) echoes the request back and writes nothing.
The flight equivalent, `POST /api/flights/:id/book` (`:365-372`), does the same.
`itinerary.feature:240` pins the outcome — *"A booked flight never
reaches the itinerary"* — and its comment records the diagnosis: *"the booking POST succeeds and the
app announces it, but nothing is written to any trip"*.

Plan §7.2 is explicit that this cannot be repaired on the client: *"the fix is mostly server-side …
A client-side subscription alone does not satisfy Q-3."*

### The scope boundary

`api-mock/` has been out of scope since ADR-005 and was a stated failure condition of increment 0.
Increment 3 is the single, deliberate exception: plan **§7.3** lists `api-mock/server.js` and
`specs/contracts/api/itinerary.yaml` under **Modified**, and §7.1 calls Q-6 *"the only change in the
plan that alters the HTTP contract"*. This ADR is that exception being taken, once, with the reasons
written down. The boundary is otherwise unchanged for increments 4 and 5.

## Decision

**1. `Trip.totalCost` is computed by the server** from the trip's items, on every read
(`GET /api/trips`, `GET /api/trips/:id`). The client renders what it is given and no longer recomputes
anything.

**2. A booking writes an itinerary item.** `POST /api/flights/:id/book` and `POST /api/bookings/hotels`
append an item to the traveller's trip, so the journey Q-3 requires exists end to end.

**3. Cancelled items are included in the derived total** — the answer to §7.5.

**4. The contract is edited, not annotated.** `specs/contracts/api/itinerary.yaml` records
`totalCost` as server-derived and read-only.

## §7.5 — why "included"

The plan carried `itinerary.feature:218` as **unclassified** and refused to pick:

> *"Q-6 says the server derives the total from items; it does not say whether cancelled items are
> excluded. Until that question is answered, `:218` is unclassified. It is not SUPERSEDE — no recorded
> decision authorises changing it, and ADR-005's default for an unauthorised scenario is PRESERVE."*

The gate answered **included**, on the plan's own default: Q-6 moved *who computes the total*, not
*what the total means*. Excluding cancelled items would be a second, independent product change riding
on the back of a refactor — precisely the silent scope creep this migration is built to avoid.

So `itinerary.feature:218` — *A cancelled item still counts towards the trip total* — is
**PRESERVED**, and the trip total still reads `$1,330.00` after the $50 shuttle is cancelled. The
scenario keeps its meaning and gains a stronger one: it now pins a **server** behaviour, and it is the
regression test for anyone who later assumes "derived" implies "excludes cancelled".

If exclusion is ever wanted, it is a new decision, a new ADR, and a second API-visible change.

## Consequences

| | Before | After |
|---|---|---|
| `GET /api/trips` → `trip-1.totalCost` | `2450` (stored, ignored by clients) | `1330` (derived) |
| `GET /api/trips` → `trip-2.totalCost` | `1800` (stored, ignored by clients) | `1160` (derived) |
| Booking a flight | echoed; no itinerary item | an itinerary item is appended |
| Booking a hotel | echoed; no itinerary item | an itinerary item is appended |
| Cancelling an item | total unchanged | total unchanged — deliberately |

- **`itinerary.feature:56` is superseded**: the server and the screen now agree, so the scenario
  asserts agreement instead of contradiction.
- **`itinerary.feature:240` is superseded**, and gains a sibling so that **both** producers are pinned
  — the plan requires SEAM-3 verified from flight *and* hotel.
- The stored `totalCost` values stay in the fixture untouched. Deriving on read rather than editing
  the fixture keeps the scenarios honest: if the derivation is ever removed, `2450` reappears and the
  tests fail loudly instead of silently agreeing.
- A booked flight can cost more than $1,000, which makes a pre-existing legacy inconsistency reachable
  for the first time: item costs render through `'$' + cost.toFixed(2)` (**ungrouped** — `$1250.00`)
  while trip totals render through the `number:2` filter (**grouped** — `$1,250.00`). Both renderings
  are reproduced exactly as they are. This is a defect, it is now reachable, and it is **not** fixed
  here — no scenario pins it and nothing authorises changing it.

## Alternatives considered

**Edit the fixture so the stored totals are already correct.** Rejected: it hides the decision. The
scenarios would pass without anything having been derived, and the next person to add an item would
find the total silently wrong again.

**Keep deriving on the client and call Q-6 satisfied.** Rejected: it is what the code does today, and
it obliges every future consumer — including any non-React client — to reimplement the arithmetic.

**Wire `itinerary:refresh` as a store event and leave the server alone.** Rejected on plan §7.2: the
view would refetch identical data and the refresh would be unobservable. The client half of this
increment (query invalidation) is only meaningful because the server half exists.
