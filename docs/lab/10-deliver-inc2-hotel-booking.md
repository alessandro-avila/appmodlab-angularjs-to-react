# Step 10 · Increment 2 — hotel-booking

> **Phase** 2 · Deliver (increment 2) &nbsp;|&nbsp; **Branch** [`lab/10-deliver-inc2-hotel-booking`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/10-deliver-inc2-hotel-booking) &nbsp;|&nbsp; **Parent** `lab/09-deliver-inc1-flight-search`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ⏳ Pending

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

First, flight:selected. Both ends are now React, so the pre-fill becomes a normal
store read and the journey deferred in increment 1 is restored. The behaviour must
match the baseline: selecting a flight still fills in the destination city, the
check-in date, and check-out three days later.

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

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/09-deliver-inc1-flight-search..lab/10-deliver-inc2-hotel-booking`
> 2. **Was the increment-1 bridge actually deleted**, or is it still sitting there unused?
> 3. Does the flight → hotel pre-fill still work end to end? Test it by hand.
> 4. What replaced the Bootstrap modal, and is `bootstrap.js` still needed by anything
> 5. Unit run, full Playwright across all five modules, build
> 6. Did it reuse increment 1's patterns, or invent new ones?

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
