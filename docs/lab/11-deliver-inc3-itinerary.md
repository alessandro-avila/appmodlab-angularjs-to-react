# Step 11 · Increment 3 — itinerary

> **Phase** 2 · Deliver (increment 3) &nbsp;|&nbsp; **Branch** [`lab/11-deliver-inc3-itinerary`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/11-deliver-inc3-itinerary) &nbsp;|&nbsp; **Parent** `lab/10-deliver-inc2-hotel-booking`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ⏳ Pending

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
- [ ] ⚠️ **SEAM-3 is unverified, and this increment owns the consumer.**
      `POST /api/bookings/hotels` echoes the request and **creates no itinerary item**
      (`api-mock/server.js:445-455`). Q-3 requires a booking to reach the itinerary. Find out what
      the plan authorises before you build anything — this is a server-visible question, and
      `api-mock/` has been out of scope since ADR-005.
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
modules. Replace it with query invalidation rather than a store event — the
booking mutation invalidates the itinerary query and the data reloads. Verify by
hand that booking a flight and booking a hotel both still refresh this view.

printItinerary clones #itinerary-details into a new window with window.open. Do not
reproduce that. Use a print stylesheet and window.print(), and if that changes what
the printed output looks like, treat it as a behaviour change: Gherkin delta plus an
ADR, not a silent improvement.

formatTime calls moment(time, 'HH:mm') — with a format string. It is the only place
in this codebase that parses dates correctly. Keep that correctness; do not
accidentally make it as loose as everything else.

Remove the AngularJS 'itinerary' state only after the React route is green, delete
app/components/itinerary/ in the same commit.

This module has controls that do nothing today. React will make some of them work
by accident — it has no scope chain, so an ng-model trapped in an ng-if child
scope becomes an ordinary piece of state. That is a user-visible behaviour change
and it needs authorising, not inheriting. Where a baseline scenario pins a control
as dead, keep it dead and say so. Where none does, stop and ask before making it
work.

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

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/10-deliver-inc2-hotel-booking..lab/11-deliver-inc3-itinerary`
> 2. **Booking a flight refreshes the itinerary — verified by hand?** And booking a hotel?
> 3. What `itinerary:refresh` became — query invalidation, or a store event in disguise?
> 4. How printing works now, and whether it needed a Gherkin delta
> 5. Whether `formatTime` kept its explicit parse format
> 6. Whether derived trip fields are still mutated onto cached data
> 7. Unit run, full Playwright, build

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
