# Step 10 · Increment 2 — hotel-booking

> **Phase** 2 · Deliver (increment 2) &nbsp;|&nbsp; **Branch** [`lab/10-deliver-inc2-hotel-booking`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/10-deliver-inc2-hotel-booking) &nbsp;|&nbsp; **Parent** `lab/09-deliver-inc1-flight-search`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ✅ Verified

---

## 🎯 Goal

Migrate hotel-booking, and **restore the journey** that increment 1 broke.

`flight:selected` is an AngularJS `$rootScope` event. Once flight-search moved to React, that
publisher left the AngularJS app — and with no in-page bridge (ADR-005), the
flight → hotel journey has been unserved ever since. Once hotel-booking is React too, the
coupling becomes an ordinary store read and the journey works again, in one stack.

If increment 1 was about proving one module can move, this one is about proving a **cross-feature
journey** survives the move — the first real test of whether the baseline scenarios are
re-pointable or merely re-runnable.

---

## ✅ Prerequisites

- [ ] [Step 09](09-deliver-inc1-flight-search.md) merged and green
- [ ] `hotel-booking.feature:209` is tagged `@deferred-to-inc-2` — **this increment must make it pass
      by construction**, with both endpoints in React and no interop built
- [ ] `specs/features/hotel-booking.feature` green from [step 04](04-green-baseline.md)
- [ ] **Restart the mock API before the full baseline run.** It holds fixtures in an in-memory array
      with no reset endpoint, and a long-lived server makes runs order-dependent — see
      [`BASELINE-ISOLATION`](09-deliver-inc1-flight-search.md#-new-finding--the-baseline-is-not-hermetic)

---

## 🌿 Branch setup

```bash
git switch lab/09-deliver-inc1-flight-search
git switch -c lab/10-deliver-inc2-hotel-booking
git checkout main -- docs/ README.md   # current lab instructions
```

<sub>That third line matters. `docs/` lives on `main`; a `lab/*` branch cut from its predecessor carries whatever `docs/` looked like back then. Increment 0 was run against instructions **1935 lines out of date** because of exactly this — see [step 08](08-deliver-inc0-shell.md#-outcome).</sub>

---

## 🗣️ The prompt

```text
Phase 2, increment 2 — migrate hotel-booking to React.

specs/features/hotel-booking.feature is the spec. Same constraints as increment 1:
no jQuery, no jQuery UI, no Moment.js, no Lodash, no Restangular, no $rootScope,
no `any`. Reuse the patterns increment 1 established — if you find yourself
inventing a second way to do something we already solved, stop and reuse the first.

Two things are specific to this module.

First, flight:selected. Do NOT restore the pre-fill. hotel-booking.feature:209
asserts the destination does not carry over, and that scenario is PRESERVE — the
event maps to no store concern per ADR-013, and increment plan §2.4 requires this
increment to satisfy :209 BY CONSTRUCTION, meaning there is no pre-fill mechanism
at all rather than one that happens not to fire. The pre-fill is dead code today:
the two controllers are never alive at the same time, so the listener never runs.
A React store would make it work by accident, and that is an unauthorised
user-visible behaviour change. If you find yourself building a way for the flight
to reach the hotel search, stop.

Second, the booking confirmation is a Bootstrap 3 jQuery modal —
$('#bookingConfirmationModal').modal('show'). That is jQuery AND bootstrap.js, not
ui-bootstrap. Replace it with a React modal. Check whether anything else in app/
still needs bootstrap.js before assuming it can go.

Line 231 computes the booking total from a field the room object does not have, so
the total is NaN today. Do not silently correct it while porting. Check whether the
assessment already decided this; if it did, follow that decision and say which one
it was. If it did not, stop and ask me.

Remove the AngularJS 'hotels' state only after the React route is green, delete
app/components/hotel-booking/ in the same commit, and touch nothing else.

Paste the unit run, the full @existing-behavior suite across all five modules, and
the build. Stop at the PR Review gate.
```

---

## 📦 What this module actually contains

Ground truth from `app/components/hotel-booking/hotel-booking.controller.js` — use it to mark the
result, not to write the prompt:

| Behaviour | Lines | Note |
|-----------|-------|------|
| `$watch` on `checkIn` → recompute `nightCount` | 45–53 | Moment, no format string |
| `$watch` on `checkOut` → recompute `nightCount` | 56–59 | |
| deep `$watch` on `filters` | 63–66 | → `useMemo`, not an effect |
| jQuery UI datepickers `#hotelCheckIn` / `#hotelCheckOut` | 70–91 | direct init; the shared directive is **never used** — see [step 01](01-b1-extract.md#-what-it-found--the-part-that-actually-matters) |
| Empty-city validation flashes the field for 3s | 96–101 | `.addClass('has-error').delay(3000).queue()` |
| Amenity filter — **every** selected amenity must match | 149–153 | `_.every` + `_.includes`, i.e. AND not OR |
| Sort: price ↑, price ↓, rating ↓, featured-then-rating | 157–170 | four modes |
| Selecting a hotel fetches rooms, then scrolls to `#hotel-rooms` | 191–210 | 400 ms animation |
| **`totalPrice` computes to `NaN`** | 231 | reads `selectedRoom.pricePerNight`; rooms carry `price` — **decide before you port it** |
| Booking → notification + `itinerary:refresh` + **jQuery modal** | 236–241 | `bootstrap.js` dependency |
| `flight:selected` pre-fills city, check-in, check-out **+3 days** | 266–270 | the cross-module coupling |

> 🔴 **Line 231 is the one to watch.** It is the only line in this module where writing the
> *obvious* React code changes behaviour. `selectedRoom.price` is what the author meant and it
> produces a working total — which is precisely the problem: the AngularJS app ships `NaN`, so a
> faithful port ships `NaN` too. Fixing it is almost certainly right, but it is a **feature
> change**, it belongs in an ADR from [step 06](06-assess.md), and the green-baseline scenario
> for booking has to be updated to match. Silently "porting" it to `price` is how a migration
> acquires undeclared behaviour changes.

### The dissolution

| Legacy | Target |
|--------|--------|
| `$('#bookingConfirmationModal').modal('show')` | React modal — **and one less reason to keep `bootstrap.js`** |
| `_.every` + `_.includes` amenity matching | `amenities.every(a => hotel.amenities.includes(a))` |
| `_.sortBy(...).reverse()` | `toSorted()` |
| `_.orderBy(['featured','rating'], ['desc','desc'])` | explicit comparator — two-key sorts are where naive ports quietly change order |
| `moment(checkOut).diff(moment(checkIn), 'days')` | `differenceInCalendarDays` |
| `$rootScope.$on('flight:selected')` | store selector |

---

## 📤 Outcome

> ✅ **Verified** — branch [`lab/10-deliver-inc2-hotel-booking`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/10-deliver-inc2-hotel-booking) ·
> [compare with `lab/09-deliver-inc1-flight-search`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/compare/lab/09-deliver-inc1-flight-search...lab/10-deliver-inc2-hotel-booking)

**34 files, +2732 / −942.** The discovery increment found what it was sequenced to find.

| Check | Result |
|---|---|
| **Full baseline** *(my own run, fresh servers)* | ✅ **240 scenarios, 240 passed · 1987/1987 steps · 17m41s** |
| `npm test` | ✅ 204/204 |
| `tsc` · `oxlint` · `vite build` | ✅ all exit 0 |
| Three unmigrated modules · `api-mock/` · bower · Grunt | ✅ untouched |
| `app/components/hotel-booking/` | ✅ deleted |
| jQuery · Moment · Lodash · Restangular · `$rootScope` · `any` | ✅ none |

236 → **240 scenarios.**

### The discovery, and it was in the data

P-7 said `track by room.id` fails because rooms have no `id`. Step 0 discovery went further and found
**why the field is missing** — and it is not an omission:

> **A *hotel* has `pricePerNight`. A *room* has `price`.** Two different shapes, sitting side by side
> in one controller.

That is the origin of the NaN total. The legacy code reaches for a hotel-shaped field on a
room-shaped object. And a fourth defect fell out of the same reading: the server reads
**`roomType`**, not `roomId` (`api-mock/server.js:449`, verified — there is no `roomId` anywhere).
So the legacy request was wrong **twice over**: wrong field name, *and* a property rooms do not have.

Discovery also closed the plan's open range — *"8–14 net-new scenarios"* — at **9**, and established
that `type` **is** unique, so it is the natural key the payload was missing.

### The defects were corrected, not reproduced — and that is not a contradiction

Increment 1 *preserved* its defects (C-4, `Confirmation: undefined`). Increment 2 *fixed* three. The
difference is authorisation, not mood:

> **increment plan §6.5, scenario 24 (`:188`), authorised by ADR-005 and Q-3** — *"the scenario exists
> **only** because the table could not be used… The three defects it documents are fixed as part of
> building a path that has never existed."*

The prompt told it to check whether the assessment had already decided this, and to ask only if it
had not. It found the decision, followed it, and **named it**. Verified verbatim.

> You cannot reproduce the behaviour of a screen that has never rendered. There is no baseline to
> preserve — so this is net-new, and net-new is where a fix is free.

### It refused an instruction, correctly

The prompt on this page **told it to restore the flight → hotel pre-fill**. It stopped and asked,
because `hotel-booking.feature:209` asserts the opposite and plan §6.5/§6.8 make that scenario an
**exit criterion**.

It was right and **the prompt was wrong** — the pre-fill is dead code: the two
controllers are never alive simultaneously, so the listener has never run. The prompt was also
self-contradictory, saying *"restore the pre-fill"* and *"match the baseline"* in one breath when the
baseline **is** that the pre-fill never happens.

**Gate ruling: keep the plan.** There is now no pre-fill mechanism anywhere in the module, two unit
tests assert its absence, and `:209` is PRESERVE with the decision written into the feature file.

That is the second prompt on this lab to contradict the specs it serves, and the cause is the same as
[C-4](09-deliver-inc1-flight-search.md#-outcome): **these prompts were written before the green
baseline existed**, from assumptions about what the legacy app did. The baseline proved several of
them wrong. Steps 11–13 were audited for the same defect and now carry the rule explicitly, because
**React has no scope chain — every control trapped in an `ng-if` child scope starts working by
accident on migration.**

### Two questions answered by measuring

**`bootstrap.js` must stay.** Verified: `travel-request.controller.js:246` and
`expense.controller.js:223` both call `.modal(`, and `app/index.html` still loads it. It goes at
Increment 5 at the earliest. The hotel modal itself is now a React modal (ADR-007 cat 2).

**Hotel money is not flight money.** It ran the *real* Angular `currency` filter in the legacy app
rather than reading the docs: `currency(1234,'$',2)` → `$1,234.00` — **grouped, two decimals**, unlike
flight-search's plain `$1250`. And `undefined` renders the literal string `"undefined"` while `NaN`
renders **empty**. Both reproduced in `src/lib/format.ts`.

On reuse: the date and money primitives moved into `src/lib/format.ts` and flight-search re-exports
them, so Increment 1's public surface is unchanged and its 69 tests still pass.

### ⚠️ The finding that matters most: the suite is flaky

It reported this rather than burying it, which is the right call.

| Run | Result | Failures |
|---|---|---|
| A | 238/240 | itinerary container timeout · notification race |
| B | 237/240 | **three different** — angular injector undefined · Enter Portal 30s · expenses table |
| C | 240/240 | — |
| **D — mine, fresh servers** | **240/240** | — |

Five failures across 960 scenario-executions ≈ **0.52% per scenario**. The number that matters is not
that one:

> P(clean run) = 0.9948²⁴⁰ ≈ **29%** — about **two runs in three come back red**.

A suite that needs three attempts to go green is not a green suite. If Increment 3 breaks one
scenario, it is indistinguishable from noise — and that distinction is the entire method.

**It measured instead of guessing:** the front-door proxy is **0.8× direct — faster**, warm legacy
loads are ~10ms, and browser contexts close correctly. `authentication.feature` alone passes 51/51.

Reviewing that, one more number: **`app/index.html` loads 24 script tags**, so every AngularJS page
boot is 24 proxied requests — roughly **5,000 per run**. Against 10ms warm loads, a 30s stall is a
**hang, not slowness**, and *"angular injector undefined"* means a script never arrived. The proxy
under sustained load is the suspect, not ambient noise.

And the flakiness exposed a **genuine latent race**, which it fixed: the shared step
*"I see a notification containing"* **sampled the list once**, but notifications only arrive after the
triggering request settles. It now polls. That changes how a scenario *observes*, never what it
*asserts* — the ADR-008 §5 class.

> **The load causing this is on a demolition schedule.** ~185 of 240 scenarios still boot AngularJS
> today; that falls to ~150 after Inc-3, ~105 after Inc-4, ~36 after Inc-5, and **0 at cutover**. Do
> not build a deep fix for a subsystem being deleted — time-box it, raise the budgets, move on.

### Still unverified: SEAM-3

`POST /api/bookings/hotels` echoes the request and **creates no itinerary item** (`server.js:445-455`
— confirmed). Q-3 requires a booking to reach the itinerary. Increment 3 migrates the consumer, so it
is the increment that has to confront it.

---

## 🧑‍⚖️ Human gate — PR Review

- [ ] All `@existing-behavior` scenarios pass, all five modules
- [ ] **Flight → hotel pre-fill verified by hand**: search a flight, select it, go to hotels,
      check city + check-in + check-out (= depart + 3 days)
- [ ] The flight → hotel journey deferred in increment 1 is **restored**, and the baseline
      scenario that covers it is un-deferred
- [ ] No jQuery, no `bootstrap.js` call, no Moment, no Lodash in the new code
- [ ] Amenity filtering is still **AND**, not OR — easiest silent regression in this module
- [ ] The featured-then-rating sort still produces the same order
- [ ] **`totalPrice` at `:231` was handled deliberately** — either reproduced as `NaN` or fixed
      with an ADR and an updated baseline scenario. Not quietly changed to `price`.
- [ ] `hotels` state removed from `app/app.routes.js`; `app/components/hotel-booking/` deleted
- [ ] The other three AngularJS modules are untouched and still work
- [ ] Patterns match increment 1 — same folder shape, same hook naming, same test style

---

## ⚠️ Pitfalls

<details>
<summary><b>Amenity filtering flips from AND to OR</b></summary>

`_.every(selected, a => _.includes(hotel.amenities, a))` means *all* selected amenities must be
present. `.some()` is one keystroke away and produces plausible-looking results that are simply
wrong — and only wrong when a user picks two amenities, which a thin scenario may never do.

Worth checking the feature file covers the two-amenity case. If it does not, that is a baseline
hole worth fixing here.
</details>

<details>
<summary><b>Leaving the journey deferred</b></summary>

Increment 1 deliberately left the flight → hotel pre-fill unserved, because ADR-005 rejected an
in-page bridge and there was nowhere for the event to land. That was a defensible one-increment
gap. It stops being defensible here — both ends are React, so the only thing standing between the
user and the journey is someone remembering it was deferred.

A deferred scenario nobody un-defers is indistinguishable from a dropped one. Restore it in this
increment, while the reason it was deferred is still fresh.
</details>

<details>
<summary><b>Assuming <code>bootstrap.js</code> can go</b></summary>

This module drops one `.modal()` call, but `travel-request` ([step 12](12-deliver-inc4-travel-request.md))
and `expense-reconciliation` ([step 13](13-deliver-inc5-expenses.md)) each have their own. Removing
the script tag now breaks both. Note the dependency, remove it at [cutover](14-cutover.md).
</details>

<details>
<summary><b>Two-key sort ports as one-key</b></summary>

`_.orderBy(['featured','rating'], ['desc','desc'])` sorts featured hotels first, then by rating
within each group. A comparator that only sorts by rating still puts good hotels at the top, so it
looks right in a screenshot and fails only on ordering assertions.
</details>

---

## ⏭️ Next

[**Step 11 — Increment 3: itinerary**](11-deliver-inc3-itinerary.md) — the module that reads two
other modules' writes.
