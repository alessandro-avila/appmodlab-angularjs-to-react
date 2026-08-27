# Discovery — the hotel room path

> **Increment 2, Step 0** (increment plan §6.2). A bounded investigation whose only
> output is this document. **No production code, no Gherkin was written before it.**
>
> Style: Phase B1 extraction — **facts only, no recommendations**. Every figure was
> obtained by querying the running `api-mock` server on 2026-08-26.

## Why this investigation was necessary

`hotel-booking.template.html:184` repeats `room in selectedHotel.rooms track by room.id`.
The rooms payload has **no `id`**, so all five track-keys are `undefined` — a
duplicate-key set — and AngularJS throws `ngRepeat:dupes` and renders nothing.

**The room table has therefore never rendered for any user or any test.** Everything
behind it — room selection, per-room pricing, the booking POST, the confirmation
dialogue — has never been exercised through the interface. Three baseline scenarios
(`:167`, `:177`, `:188`) pin the *absence*, not the behaviour.

React renders duplicate keys with a console warning, so the table switches on the
moment the module migrates, and all of this becomes visible at once.

---

## Q1 · What does the room table contain when it renders?

`GET /api/hotels/:id/rooms` returns **5 objects**, keys
`type, price, available, beds, maxGuests`:

| # | type | price | available | beds | maxGuests |
|---|---|---:|---:|---|---:|
| 0 | Standard King | 183 | 10 | 1 King | 2 |
| 1 | Standard Double | 189 | 5 | 2 Double | 4 |
| 2 | Deluxe King | 258 | 2 | 1 King | 2 |
| 3 | Executive Suite | 481 | 1 | 1 King | 3 |
| 4 | Presidential Suite | 512 | 1 | 1 King + Living Area | 4 |

Prices ascend with room class. `beds` is free text. The five rows fit the existing
panel; the template's columns map one-to-one onto these five fields.

### A second, different room shape exists

The **hotel** object carries its own embedded `rooms` array with only **three** keys —
`type, price, available` — and different type names (`Standard`, `Deluxe`, `Suite`):

```json
"rooms": [ { "type": "Standard", "price": 140, "available": 3 },
           { "type": "Deluxe",   "price": 336, "available": 1 },
           { "type": "Suite",    "price": 423, "available": 0 } ]
```

`selectHotel()` overwrites it: `$scope.selectedHotel.rooms = rooms` (`controller:200`).
So the embedded array is **never rendered** — it is replaced before the panel appears.
Two shapes share one property name.

---

## Q2 · What happens to a room with `available: 0`?

**Reachable, and common.** Across 30 sampled responses:

| type | sold-out observations |
|---|---:|
| Presidential Suite | 12 / 30 |
| Deluxe King | 8 / 30 |
| Executive Suite | 6 / 30 |
| Standard King | 0 / 30 |
| Standard Double | 0 / 30 |

Three of the five room types can be sold out, matching the generator's
`randomInt(0, …)` ranges. **No scenario covers it and no user has seen it**, because
the table has never rendered.

The template has no `available`-conditional markup at all — no disabled state, no
"sold out" label. Whatever a sold-out room should do is *undefined by the current
implementation*.

---

## Q3 · What identifies a room to the booking POST?

**Nothing.** No room object carries an `id`.

`controller:226` sends `roomId: $scope.selectedRoom.id` → **`undefined`**, and
`hotel-booking.feature:199` records that *"the booking request carries no room
identifier"*. The server accepts the booking regardless: the handler does not read
`roomId`, and the response does not echo it.

**`type` is unique within a response** (verified across all sampled responses — five
distinct type strings, never repeated), so it is the only natural key the payload
offers.

---

## Q4 · Why is the total not a number?

`controller:231`:

```js
totalPrice: $scope.selectedRoom.pricePerNight * $scope.nightCount * $scope.searchParams.rooms
```

| expression | value |
|---|---|
| `room.pricePerNight` | **`undefined`** — the field does not exist on a room |
| `room.price` | `183` — the field the API actually sends |
| legacy total | `undefined * 3 * 1` = **`NaN`** |
| total from `price` | `183 * 3 * 1` = `549` |

**The likely origin of the mistake is visible in the data.** A *hotel* object **does**
have `pricePerNight` (`374` in the sample). A *room* has `price`. The two shapes sit
next to each other in the same controller, and the wrong one was read.

The server does not validate it: the POST is accepted with `totalPrice: NaN`
(serialised as `null` in JSON), and the response does not echo it back.

---

## Q5 · Why is the confirmation `undefined`?

`POST /api/bookings/hotels` returns:

```json
{ "confirmationNumber": "HT4BJV4XC5S", "hotelId": "h-1", "checkIn": "…",
  "checkOut": "…", "status": "confirmed", "bookedAt": "…" }
```

`controller:237` reads `confirmation.confirmationCode` → **`undefined`**, so the
notification renders:

```
Hotel booked! Confirmation: undefined
```

**This is the same defect, in the same shape, as the flight booking** — where
`flight-search.controller.js:220` reads `confirmationCode` from a payload carrying
`confirmationNumber`. Two modules, one mistake, made twice.

> The flight instance was **reproduced** in Increment 1, because its scenario passes
> either way and no decision authorised changing it. The hotel instance is
> **superseded** — see the disposition note below. The difference is not
> inconsistency; it is that one path has never been reachable and the other has.

---

## Q6 · Does the layout survive five rows?

Yes. The panel is a standard Bootstrap 3 `table` inside `#hotel-rooms`; five rows is
unremarkable. The panel heading (`:162`) already renders today — it is only the
`ng-repeat` body that is empty.

---

## Q7 · What else is missing from the payload?

- **No hotel `address`.** `hotel-booking.feature:91` pins that the address is never
  shown; the API never sends one. Unchanged.
- Hotel keys: `id, name, city, rating, reviewCount, pricePerNight, amenities,
  featured, rooms`.

---

## Disposition of the three booking defects

These are **not** decided by this document. They were decided in advance by
**increment plan §6.5, scenario 24 (`:188`)**, authorised by **ADR-005** and **Q-3**:

> *"the scenario exists **only** because the table could not be used. It is rewritten
> as a UI scenario and `@bypasses-ui` is removed … **The three defects it documents
> are fixed as part of building a path that has never existed.**"*

So all three — the missing room identifier, the `NaN` total and the `undefined`
confirmation — are **corrected** in Increment 2, and the correction is recorded in
the Gherkin delta rather than applied silently.

The reasoning is that no user has ever reached this path, so there is no existing
behaviour to preserve. Building it correctly is building it for the first time.

---

## What this closes

Plan §6.5 left the net-new count as a **range of 8–14**, to be closed here.

| Area | Planned | Closed at | Why |
|---|---:|---:|---|
| Room table renders five rooms | 2–3 | **2** | One shape, five fields; one scenario for the rows and one for the columns |
| Room selection updates the summary | 2 | **2** | Selection, and the summary total |
| Sold-out room (`available: 0`) | 1–2 | **1** | Reachable on 3 of 5 types; the template defines no behaviour, so one scenario fixes it |
| Booking POST carries an identifier and a real total | 2–3 | **2** | Identifier, and total |
| Confirmation dialogue shows a real code and total | 1–2 | **2** | Code, and the dialogue opening/closing |
| Whatever discovery reveals | 0–2 | **0** | Q1's second room shape is never rendered, so it needs no scenario |

**Net-new closed at 9.**
