# Step 11 · Increment 3 — itinerary

> **Phase** 2 · Deliver (increment 3) &nbsp;|&nbsp; **Branch** [`lab/11-deliver-inc3-itinerary`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/11-deliver-inc3-itinerary) &nbsp;|&nbsp; **Parent** `lab/10-deliver-inc2-hotel-booking`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ✅ Verified

---

## 🎯 Goal

Migrate itinerary — the module that **consumes** what the previous two produce.

Both migrated modules broadcast `itinerary:refresh` after a booking. This is where that lands, and
where the event bus gets a strictly better replacement: invalidating a query key. Same outcome,
no pub/sub, and the refresh becomes something you can point at in code rather than something you
have to trace through two files.

The module also has the two most awkward legacy pieces in the codebase: a print function that
clones DOM into a new window, and a Moment call with a format string — the only one in the app
that gets date parsing right.

---

## ✅ Prerequisites

- [ ] [Step 10](10-deliver-inc2-hotel-booking.md) merged and green
- [ ] Booking a flight *and* booking a hotel both still refresh the itinerary — verify before you
      start, so you know which of the two breaks if one does
- [ ] ⚠️ **SEAM-3 is unverified, and this increment owns the fix — on both sides.**
      `POST /api/bookings/hotels` echoes the request and **creates no itinerary item**
      (`api-mock/server.js:445-455`), so a client-side subscription alone cannot satisfy Q-3.
      **`api-mock/server.js` is in scope here**, and so is `specs/contracts/api/itinerary.yaml` —
      ADR-005 says the server *"survives, **with three seam fixes**… unchanged **in structure**;
      SEAM-3/4/5 fixed, Q-6/Q-7 enforced"*, and plan §7.3 names both files. It was untouched in
      increments 0–2 because none of them needed it, not because it was fenced off.
- [ ] ⚠️ **The suite is flaky (~0.5% per scenario ≈ two runs in three come back red).** Re-run
      before concluding a failure is yours, and restart the servers first. See
      [step 10](10-deliver-inc2-hotel-booking.md#-outcome).

---

## 🌿 Branch setup

```bash
git switch lab/10-deliver-inc2-hotel-booking
git switch -c lab/11-deliver-inc3-itinerary
git checkout main -- docs/ README.md   # current lab instructions
```

<sub>That third line matters. `docs/` lives on `main`; a `lab/*` branch cut from its predecessor carries whatever `docs/` looked like back then. Increment 0 was run against instructions **1935 lines out of date** because of exactly this — see [step 08](08-deliver-inc0-shell.md#-outcome).</sub>

---

## 🗣️ The prompt

```text
Phase 2, increment 3 — migrate itinerary to React.

specs/features/itinerary.feature is the spec, same constraints as before.

Three things are specific to this module.

itinerary:refresh has subscribers here and publishers in both already-migrated
modules — and unlike flight:selected, this one is RESTORED rather than dropped,
because Q-3 decided a booking must persist and appear on the itinerary and SEAM-3
is marked defect-to-fix. The fix is mostly server-side: today the booking POST
only echoes, so a client subscription or query invalidation on its own would
refetch identical data and prove nothing. api-mock/server.js is in scope for this
increment, and so is specs/contracts/api/itinerary.yaml — ADR-005 says the server
"survives, with three seam fixes ... unchanged in structure; SEAM-3/4/5 fixed,
Q-6/Q-7 enforced". Make a booking write an itinerary item, make Trip.totalCost
server-derived per Q-6, update the contract, and supersede the scenarios that pin
the current behaviour. Verify by hand that booking a flight and booking a hotel
both refresh this view.

printItinerary clones #itinerary-details into a new window with window.open. Do not
reproduce that. Use a print stylesheet and window.print(), and if that changes what
the printed output looks like, treat it as a behaviour change: Gherkin delta plus an
ADR, not a silent improvement.

formatTime calls moment(time, 'HH:mm') — with a format string. It is the only place
in this codebase that parses dates correctly. Keep that correctness; do not
accidentally make it as loose as everything else.

Remove the AngularJS 'itinerary' state only after the React route is green, delete
app/components/itinerary/ in the same commit. Do not touch travel-request or
expense-reconciliation.

This module has two controls that do nothing today — the status filter and Add
Note. Both are `ng-if` child-scope shadowing, and React has no scope chain, so
they start working on migration. That is the AUTHORISED outcome, not an accident
to suppress: ADR-005 classifies "the four dead controls" as SUPERSEDE because
ADR-001/002 already decided to fix them, and says they are "resolved by being
reimplemented correctly". Plan §7.4 lists the eight scenarios to supersede and
expects @bypasses-ui to reach zero, because every scenario using that tag existed
only to reach behind a dead control. Do not write code to keep them inert.

Note the contrast with flight:selected, which stays dropped. The difference is
authorisation, not mechanism: a recorded decision fixes these four, and none
covers the pre-fill.

Paste the unit run, the full @existing-behavior suite across all five modules, and
the build. Stop at the PR Review gate.
```

---

## 📦 What this module actually contains

Ground truth from `app/components/itinerary/itinerary.controller.js`:

| Behaviour | Lines | Note |
|-----------|-------|------|
| Trips get `startFormatted`, `endFormatted`, `daysUntil`, `duration` | 32–41 | derived fields **mutated onto** the API response |
| Trips sorted by `startDate` ascending | 42 | |
| Items grouped by day (`YYYY-MM-DD`), then sorted by `time` | 64–77 | `_.groupBy` + `_.sortBy` |
| `dayNumber` = day − trip start + 1 | 73 | 1-indexed |
| Selecting a trip scrolls to `#itinerary-details` | 82–85 | |
| Totals per type + grand total | 94–105 | `_.sumBy` × 4, then `_.sum(_.values(...))` |
| `$watch` on `filterStatus` | 108–112 | |
| Day filter keeps a day if **any** item matches | 114–123 | `_.some` — OR, unlike hotel amenities |
| List ↔ timeline toggle, with a 300 ms jQuery fade | 126–137 | `.hide().fadeIn(300)` |
| Add note → timestamped `MMM D, YYYY h:mm A` + notification | 139–155 | |
| Cancel item → `'<type> cancelled'` warning notification | 157–168 | message includes the item type |
| **Print via `.clone()` into `window.open('', '_blank')`** | 170–183 | the awkward one |
| `formatTime` uses `moment(time, 'HH:mm')` | 189–191 | **has** a format string |
| Trip status derived from now vs start/end | 213–221 | |
| **Subscribes to `itinerary:refresh`** | 223–225 | deregistered on `$destroy` |

### The dissolution

| Legacy | Target |
|--------|--------|
| `$rootScope.$on('itinerary:refresh')` | `queryClient.invalidateQueries({ queryKey: ['itinerary'] })` at the mutation site |
| `.clone()` + `window.open` print | print stylesheet + `window.print()` |
| `.hide().fadeIn(300)` view toggle | CSS transition, or nothing |
| `_.groupBy` + `_.sortBy` day grouping | `Map` + `toSorted` — or `Object.groupBy` if the target supports it |
| `_.sumBy` × 4 + `_.sum(_.values())` | one `reduce` |
| mutated `startFormatted` / `daysUntil` fields | derived at render — do **not** mutate query data |

> **The mutation is worth pausing on.** Lines 32–41 write formatted strings back onto the objects
> the API returned. Under any caching data-fetching client that data is cached and shared; mutating
> it in place is how you get a component that renders correctly once and staler every time after.
> Derive at render.

---

## 📤 Outcome

> ✅ **Verified** — branch [`lab/11-deliver-inc3-itinerary`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/11-deliver-inc3-itinerary) ·
> [compare with `lab/10-deliver-inc2-hotel-booking`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/compare/lab/10-deliver-inc2-hotel-booking...lab/11-deliver-inc3-itinerary)

**Three commits** — implementation, deletion, then a correction. The heaviest increment in the plan,
and the one where the reviewer got it wrong.

| Check | Result |
|---|---|
| Full `@existing-behavior` suite | ✅ **245 scenarios · 2095 steps · all passing** |
| Unit | ✅ 292 |
| `tsc` · `oxlint src` · `vite build` | ✅ all clean |
| `@bypasses-ui` | ✅ **0 executable tags** (was 3) |
| `app/` in the rework commit | ✅ 0 files |
| bower · Grunt · `package.json` · lockfile | ✅ untouched |

### Four decisions, all escalated rather than assumed

The prompt described client-side work. Plan §7 carried far more, and the agent stopped **four times**:

| # | Question | Ruling |
|---|---|---|
| 1 | `api-mock/server.js` in scope? | **Yes** — ADR-005 says the server *"survives, with three seam fixes"* |
| 2 | Do cancelled items count toward a derived total? (§7.5) | **Included** — Q-6 moved *who computes*, not *what it means* |
| 3 | The 401 session policy, deferred by Inc-0 | **Adopt now** — ADR-018 |
| 4 | Query invalidation vs *"no caching"* | **Cache one idempotent resource** — ADR-021 |

Question 4 is the sharpest. `tech-stack.md` §4 excludes every data cache, citing two NFRs — but those
NFRs' *stated rationale* is that **searches** are non-idempotent (*"the server generates flights per
call"*). `GET /api/trips` returns a stable array. The rule's title was broader than its body, and the
resolution respects the body: cache trips, never searches.

> That precedent gets used twice more — `travel-requests` and `expense-reports` are stable arrays too.
> **Cache idempotent collections, never search results.**

### The first server change in the project

`api-mock/server.js` had been untouched since ADR-005. Increment 3 changed it twice, both authorised:

- **Q-6** — `Trip.totalCost` derived on read from `items[].cost`. The stale seeds (2450, 1800) stay in
  the fixture **on purpose**, so removing the derivation fails loudly instead of silently passing.
- **SEAM-3** — both booking endpoints now append an itinerary item, so the journey Q-3 requires
  exists end to end.

Verified by hand through the page objects, both producers: flight 8→9 items, hotel 9→10, each row
rendered, trip total moved $1330 → $1684 **server-derived**, fixture restored.

### ⚠️ The reviewer was wrong, and it cost a rework

The prompt on this page told the agent to **keep the dead controls dead**. That rule was mine, added
two steps earlier, and it contradicts three ADRs.

ADR-005 says the opposite — **twice**:

> *"**Supersede** | The scenario encodes a defect that **ADR-001/002 already decided to fix** | **the
> four dead controls**, `ngRepeat:dupes` blocking hotel booking, SEAM-3/4/5…"*

> *"the overwhelming majority live in code that increment 1 deletes — **the four dead controls**, the
> shadowed alerts, the inert search, the trapped date filter… they are **resolved by being
> reimplemented correctly**."*

So the controls working in React is the **authorised outcome**. Plan §7.4 was right all along.

**The error was over-generalisation.** I was correcting the `flight:selected` pre-fill — where
PRESERVE genuinely is right, because nothing authorises the change — and extended it to every dead
control, where ADR-001/002 explicitly *had* decided. The distinction is **authorisation, not
mechanism**, and I flattened it.

| | Dead in AngularJS | Revived? | Why |
|---|---|---|---|
| The four dead controls | yes | **yes** | ADR-001/002 decided to fix them |
| `flight:selected` pre-fill | yes | **no** | nothing authorises it; ADR-013 drops it |

ADR-019's rule — *"where a baseline scenario pins a control as dead, keep it dead"* — **cannot tell
these apart**, because a baseline scenario pins both. Only the authorisation can.

The consequence would have been larger than eight scenarios. ADR-005 rejects the whole **Fix-Bugs
path** *because* those defects get resolved by reimplementation. Leaving the controls inert would
have removed the mechanism by which the chosen path delivers — roughly forty documented limitations
with no route to resolution.

**Reworked as a third commit**, not a rewrite: nine scenarios superseded across seven blocks,
`@bypasses-ui` driven to zero, and **ADR-022 supersedes ADR-019 by header note only — its reasoning
left exactly as written.** Same discipline applied to the reviewer's error as to ADR-005's language
reversal.

> **A correction is a claim too, and needs deriving from source exactly like the thing it corrects.**
> This page had been teaching that rule for three steps before its author broke it.

### What the agent caught that no one asked for

**Two 401 scenarios had been silently testing AngularJS.** `goToState()` addressed `/itinerary` by
*hash* — and a fragment is never sent to the server, so the front door never saw it. Fixed for
migrated routes **only**: addressing a legacy route by real path would 302 and reboot the app, losing
the `$rootScope.currentUser` two other scenarios depend on. That precision is the whole finding.

**Its own stub was weakening four scenarios.** During the rework it noticed it had stubbed
`signedInIdentity()` to return `null` unconditionally — a step **shared** with three
`authentication.feature` scenarios and one in `travel-request.feature`, all on AngularJS screens.
Caught and reverted by the agent, unprompted.

**`number:2` groups; `toFixed` does not.** It ran the real Angular filter rather than reading about
it: trip totals render `$1,000.00`, item costs render `$1000.00`. SEAM-3 makes a booked hotel exceed
$1000, so this legacy inconsistency becomes **reachable for the first time**. Both renderings
preserved.

**The plan's own count was off.** §7.4 lists three authentication scenarios superseding here; only
**two** do. `:220` survives, because the guard re-renders on a *store* mutation and the harness clears
`localStorage` from outside the app. Predicted from the code, then confirmed in the run.

**Attribution was repaired server-side.** §7.4 assumed *"Inc-0's identity rehydration"* — which Inc-0
never built (`auth-store.ts` schedules it for Inc-6). Deriving the author from the authenticated
caller needs no client identity, so attribution is correct **without** pulling Inc-6's work forward.

### Also here

`printItinerary` had **no baseline at all** — the `.clone()` path was never captured — so its
scenarios are the first coverage that control has ever had. And the dashboard still `ui-sref`s three
deleted states, matching what increments 1 and 2 left; its scenario pins link **text**, not
destination. That is Inc-6's to clean up.

---

## 🧑‍⚖️ Human gate — PR Review

- [ ] All `@existing-behavior` scenarios pass, all five modules
- [ ] **Book a flight → itinerary updates. Book a hotel → itinerary updates.** By hand, both.
- [ ] `itinerary:refresh` is gone as an event — nothing publishes or subscribes to it
- [ ] Day grouping, ordering and 1-indexed `dayNumber` all unchanged
- [ ] Day filtering is still **OR** across items in a day
- [ ] Totals match, including the grand total
- [ ] `formatTime` still parses with an explicit format
- [ ] No query data is mutated — derived fields are computed at render
- [ ] Print produces something sane, and any change is documented
- [ ] `itinerary` state removed; `app/components/itinerary/` deleted
- [ ] `travel-request` and `expenses` still work in AngularJS

---

## ⚠️ Pitfalls

<details>
<summary><b>Replacing the event bus with... an event bus</b></summary>

The tempting port is a store action called `refreshItinerary()` that components subscribe to.
That is `$rootScope.$broadcast` with different imports.

The idiomatic answer is that the booking mutation invalidates the itinerary query key and the data
reloads because it is stale. No coordination, no subscription, no ordering questions. If the
result still has something named `refresh`, look again.
</details>

<details>
<summary><b>Mutating cached query data</b></summary>

Lines 32–41 do exactly this in AngularJS, where it is merely untidy. Behind a query cache it is a
correctness bug — the cache is shared, and a second component reading the same key sees fields
that were computed against a different render's assumptions.
</details>

<details>
<summary><b>The print function gets ported literally</b></summary>

`window.open('', '_blank')` plus cloned DOM is blocked by popup blockers, loses styles, and cannot
be tested. A print stylesheet is better in every way — but it is a **different output**, so it
needs a delta rather than a quiet upgrade. That distinction is the entire discipline of this lab
in one function.
</details>

<details>
<summary><b>Losing the one correct date parse</b></summary>

`moment(time, 'HH:mm')` at line 189 is the only place in this codebase that passes a format
string. A find-and-replace of Moment → date-fns that treats every call the same will happily make
it as loose as the rest. Ironic, and easy to miss.
</details>

<details>
<summary><b>OR vs AND, again — but the other way round</b></summary>

Hotel amenities are AND ([step 10](10-deliver-inc2-hotel-booking.md)). Itinerary day filtering is
OR — a day shows if *any* item matches. Two similar-looking filters with opposite semantics, two
increments apart. Read the source; do not pattern-match on the previous increment.
</details>

---

## ⏭️ Next

[**Step 12 — Increment 4: travel-request**](12-deliver-inc4-travel-request.md) — the
validation-heavy form.
