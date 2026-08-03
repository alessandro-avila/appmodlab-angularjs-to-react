# Step 10 · Increment 2 — hotel-booking

> **Phase** 2 · Deliver (increment 2) &nbsp;|&nbsp; **Branch** [`lab/10-deliver-inc2-hotel-booking`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/10-deliver-inc2-hotel-booking) &nbsp;|&nbsp; **Parent** `lab/09-deliver-inc1-flight-search`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ⏳ Pending

---

## 🎯 Goal

Migrate hotel-booking, and **close the bridge** you opened in increment 1.

This is the increment where the strangler fig proves itself. `flight:selected` currently crosses
from a React publisher to an AngularJS subscriber through whatever interop the plan specified.
Once hotel-booking is React, that coupling becomes an ordinary store read — and the temporary
bridge gets deleted.

If increment 1 was about proving one module can move, this one is about proving two modules can
still **talk** while they are on different sides of the fence.

---

## ✅ Prerequisites

- [ ] [Step 09](09-deliver-inc1-flight-search.md) merged and green
- [ ] The `flight:selected` bridge is documented — you are about to remove it
- [ ] `specs/features/hotel-booking.feature` green from [step 04](04-green-baseline.md)

---

## 🌿 Branch setup

```bash
git switch lab/09-deliver-inc1-flight-search
git switch -c lab/10-deliver-inc2-hotel-booking
```

---

## 🗣️ The prompt

```text
Phase 2, increment 2 — migrate hotel-booking to React.

specs/features/hotel-booking.feature is the spec. Same constraints as increment 1:
no jQuery, no jQuery UI, no Moment.js, no Lodash, no Restangular, no $rootScope,
no `any`. Reuse the patterns increment 1 established — if you find yourself
inventing a second way to do something we already solved, stop and reuse the first.

Two things are specific to this module.

First, flight:selected. Both ends are now React, so delete the interop bridge from
increment 1 and make the pre-fill a normal store read. The behaviour must not
change: selecting a flight still fills in the destination city, the check-in date,
and check-out three days later.

Second, the booking confirmation is a Bootstrap 3 jQuery modal —
$('#bookingConfirmationModal').modal('show'). That is jQuery AND bootstrap.js, not
ui-bootstrap. Replace it with a React modal. Check whether anything else in app/
still needs bootstrap.js before assuming it can go.

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
| jQuery UI datepickers `#hotelCheckIn` / `#hotelCheckOut` | 70–91 | shared directive *and* direct init |
| Empty-city validation flashes the field for 3s | 96–101 | `.addClass('has-error').delay(3000).queue()` |
| Amenity filter — **every** selected amenity must match | 149–153 | `_.every` + `_.includes`, i.e. AND not OR |
| Sort: price ↑, price ↓, rating ↓, featured-then-rating | 157–170 | four modes |
| Selecting a hotel fetches rooms, then scrolls to `#hotel-rooms` | 191–210 | 400 ms animation |
| Booking → notification + `itinerary:refresh` + **jQuery modal** | 236–241 | `bootstrap.js` dependency |
| `flight:selected` pre-fills city, check-in, check-out **+3 days** | 266–270 | the cross-module coupling |

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
- [ ] The increment-1 interop bridge is **deleted**, not orphaned
- [ ] No jQuery, no `bootstrap.js` call, no Moment, no Lodash, no `any` in the new code
- [ ] Amenity filtering is still **AND**, not OR — easiest silent regression in this module
- [ ] The featured-then-rating sort still produces the same order
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
<summary><b>The bridge outlives its purpose</b></summary>

Increment 1's interop shim becomes dead code the moment hotel-booking is React. Dead interop code
is worse than most dead code: it looks load-bearing, so the next person leaves it, and it survives
to cutover as a mysterious adapter nobody can delete confidently.

Delete it in this increment, while the reason is still obvious.
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
