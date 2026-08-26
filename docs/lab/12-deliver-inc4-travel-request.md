# Step 12 · Increment 4 — travel-request

> **Phase** 2 · Deliver (increment 4) &nbsp;|&nbsp; **Branch** [`lab/12-deliver-inc4-travel-request`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/12-deliver-inc4-travel-request) &nbsp;|&nbsp; **Parent** `lab/11-deliver-inc3-itinerary`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ⏳ Pending

---

## 🎯 Goal

Migrate travel-request — the validation-heavy form, and the first module where "obviously better"
is the enemy.

The validation here is **fail-fast**: six checks, in a fixed order, showing exactly one message at
a time. Every React form library does the opposite — validate everything, show all errors at once,
per field. That is genuinely better UX and it is a **behaviour change**, so it needs a delta and a
decision rather than a library default.

This is also where the first custom directive gets dissolved: `approval-status.directive.js`.

---

## ✅ Prerequisites

- [ ] [Step 11](11-deliver-inc3-itinerary.md) merged and green
- [ ] `specs/features/travel-request.feature` green
- [ ] You have looked at the six validation rules and decided, in advance, whether fail-fast
      survives — because the agent will not ask

---

## 🌿 Branch setup

```bash
git switch lab/11-deliver-inc3-itinerary
git switch -c lab/12-deliver-inc4-travel-request
git checkout main -- docs/ README.md   # current lab instructions
```

<sub>That third line matters. `docs/` lives on `main`; a `lab/*` branch cut from its predecessor carries whatever `docs/` looked like back then. Increment 0 was run against instructions **1935 lines out of date** because of exactly this — see [step 08](08-deliver-inc0-shell.md#-outcome).</sub>

---

## 🗣️ The prompt

```text
Phase 2, increment 4 — migrate travel-request to React.

specs/features/travel-request.feature is the spec, same constraints as before.

The validation in this form is fail-fast and order-dependent: six checks, first
failure wins, one message shown at a time. Preserve that exactly, including the
order and the message text. If you introduce a form library, make it behave this
way rather than letting its defaults decide — and if you think all-errors-at-once
is better, say so and I will consider it as a delta, but do not just ship it.

app/directives/approval-status.directive.js dissolves into a component. Check
whether any other module renders approval status before you assume it is
travel-request's alone.

Cancelling uses window.confirm(). Replace it with a React confirmation, and keep it
blocking — cancelling must still require an explicit confirm.

Remove the AngularJS 'travelRequest' state only after the React route is green,
delete app/components/travel-request/ and the directive in the same commit.

The search box does nothing today — a TypeError escapes the digest, so typing has
no effect. React will make it work by accident. That is a user-visible behaviour
change: keep it inert if a baseline scenario pins it, and stop and ask if none
does. Do not silently ship a working search box.

Paste the unit run, the full @existing-behavior suite across all five modules, and
the build. Stop at the PR Review gate.
```

---

## 📦 What this module actually contains

Ground truth from `app/components/travel-request/travel-request.controller.js`:

| Behaviour | Lines | Note |
|-----------|-------|------|
| Fixed `departments` list (8) and `travelPurposes` list (7) | 27–35 | hardcoded, not fetched |
| Deep `$watch` on `estimatedCosts` → `totalEstimate` | 38–48 | sums 5 fields, `parseFloat(x) \|\| 0` |
| `$watch` on `departDate` / `returnDate` → `tripDuration` | 50–63 | Moment `diff` in days |
| `$watchGroup(['searchQuery','filterStatus'])` → re-filter | 65–68 | two-key watch |
| jQuery UI datepickers `#trDepartDate` / `#trReturnDate` | 70–91 | |
| Opening the form slides it down over 300 ms | 139 | `.hide().slideDown(300)` |
| Editing loads the request and scrolls to the form | 146–160 | Moment `toDate()` on both dates |
| Submit formats dates `YYYY-MM-DD`, stamps `submittedAt` ISO | 169–171 | |
| **Fail-fast validation, 6 checks, one message** | 198–228 | see below |
| `#destinationField` gets `has-error` — and is never cleared | 204 | no matching `removeClass` |
| Cancel goes through `window.confirm()` | 232 | blocking |
| View detail opens a Bootstrap jQuery modal | 246 | `#requestDetailModal` |
| Status counts for the filter chips | 264 | |
| Re-loads on `auth:login` | 299 | |

### The validation order — preserve it exactly

| # | Check | Message |
|---|-------|---------|
| 1 | `destination` present | `Destination is required.` |
| 2 | both dates present | `Travel dates are required.` |
| 3 | return **not** before depart | `Return date must be after departure date.` |
| 4 | `purpose` present | `Travel purpose is required.` |
| 5 | `department` present | `Department is required.` |
| 6 | `totalEstimate > 0` | `Please provide cost estimates.` |

First failure returns; nothing after it runs. Submit an empty form today and you see exactly one
message — *"Destination is required."* — and nothing else.

> Check 3 says *"must be after"* but tests `isBefore`, so **return == depart passes**. A
> same-day trip is valid. Preserve that; a stricter check is a behaviour change.

### The dissolution

| Legacy | Target |
|--------|--------|
| `approval-status.directive.js` | `<ApprovalStatus status={…} />` |
| `window.confirm()` | React confirmation dialog, still blocking |
| `$('#requestDetailModal').modal('show')` | React modal — second of three `bootstrap.js` users |
| `.hide().slideDown(300)` | CSS transition, or drop it |
| deep `$watch` on `estimatedCosts` | `useMemo` over the five inputs |
| `$watchGroup` | derived filtering, no watcher |
| `_.sum([...])` with `parseFloat \|\| 0` | `reduce` — **keep the `\|\| 0`**, empty inputs are common |

---

## 📤 Outcome

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/11-deliver-inc3-itinerary..lab/12-deliver-inc4-travel-request`
> 2. **Is validation still fail-fast?** Submit an empty form — one message or six?
> 3. Did it introduce a form library, and did the library's defaults win?
> 4. Does same-day travel (return == depart) still validate?
> 5. What replaced `confirm()`, and is it still blocking
> 6. Where `approval-status` ended up, and whether anything else used it
> 7. Unit run, full Playwright, build

---

## 🧑‍⚖️ Human gate — PR Review

- [ ] All `@existing-behavior` scenarios pass, all five modules
- [ ] **Empty form → exactly one message, and it is `Destination is required.`**
- [ ] All six messages match the originals, word for word
- [ ] Validation order is unchanged
- [ ] Return == depart still passes
- [ ] `totalEstimate` handles empty and non-numeric cost fields as 0
- [ ] `tripDuration` matches the old Moment `diff` — check an overnight and a same-day trip
- [ ] Cancel still requires confirmation
- [ ] `approval-status` is a component; the directive file is deleted
- [ ] `travelRequest` state removed; `app/components/travel-request/` deleted
- [ ] `expenses` still works in AngularJS

---

## ⚠️ Pitfalls

<details>
<summary><b>The form library quietly redefines the UX</b></summary>

Drop in a schema validator and you get every error at once, live per field, on blur. It is better —
and it is not what this app does. The green baseline will go red, and the temptation at that point
is to "fix the outdated scenario".

That is the wrong instinct in the wrong direction. Either preserve fail-fast, or change it
deliberately with a delta and an ADR. What must not happen is a library default silently becoming
a product decision.

If you *do* take the change: it needs its own scenarios, because "shows all errors" has different
edge cases than "shows the first error".
</details>

<details>
<summary><b><code>has-error</code> is never removed</b></summary>

Line 204 adds the class; nothing takes it off. Fix a destination and the field stays red until the
page reloads.

It is a bug. It is also current behaviour, and it may be pinned by a scenario. If it is,
preserving it in React means deliberately writing worse code — which is a good moment to stop and
ask whether this should be its own tiny bug-fix increment instead. Either answer is fine. Silently
fixing it is not.
</details>

<details>
<summary><b>Same-day trips start failing</b></summary>

*"Return date must be after departure date"* reads like `>`, but the code is `!isBefore`, i.e.
`>=`. Implement what the message says and every one-day trip breaks.
</details>

<details>
<summary><b><code>parseFloat(x) || 0</code> becomes <code>Number(x)</code></b></summary>

`Number('')` is `0`, but `Number(undefined)` is `NaN` — and `NaN` propagates through the sum,
through `totalEstimate > 0`, and out the other side as *"Please provide cost estimates."* on a
form the user filled in. Keep the `|| 0`.
</details>

<details>
<summary><b>Departments and purposes get "improved" into an API call</b></summary>

Both lists are hardcoded arrays. There is no endpoint. Inventing one is scope creep that fails at
runtime.
</details>

---

## ⏭️ Next

[**Step 13 — Increment 5: expense-reconciliation**](13-deliver-inc5-expenses.md) — the last
module, and the last two directives.
