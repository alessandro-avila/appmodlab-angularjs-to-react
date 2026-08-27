# Step 13 · Increment 5 — expense-reconciliation

> **Phase** 2 · Deliver (increment 5) &nbsp;|&nbsp; **Branch** [`lab/13-deliver-inc5-expenses`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/13-deliver-inc5-expenses) &nbsp;|&nbsp; **Parent** `lab/12-deliver-inc4-travel-request`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ⏳ Pending

---

## 🎯 Goal

Migrate the last module — and with it the last two custom directives, the last filter, and the
last `.modal()` call.

Two things are unique to this one. A file upload driven by
`$('#receiptFileInput').trigger('click')`, which is the most jQuery thing in the codebase. And
`currency-input.directive.js`, a custom two-way-binding directive whose parse/format behaviour has
to survive a translation into a controlled React input.

After this, `app/` contains routing, three services, and nothing else worth keeping.

---

## ✅ Prerequisites

- [ ] [Step 12](12-deliver-inc4-travel-request.md) merged and green
- [ ] `specs/features/expense-reconciliation.feature` green
- [ ] `app/app.routes.js` now has exactly one feature state left
- [ ] ⚠️ **`BASELINE-ISOLATION` applies most sharply here.** The expense scenarios mutate server
      state but carry **zero `@mutates-fixture` tags**, the restore hook in `hooks.js` covers
      itinerary only, and `api-mock/server.js:222` holds `expenseReports` in an in-memory array with
      no reset endpoint. **Restart the mock API before every full run**, and consider tagging the
      mutating scenarios and extending the restore hook as part of this increment — it is the module
      the gap is about. See
      [step 09](09-deliver-inc1-flight-search.md#-new-finding--the-baseline-is-not-hermetic).

---

## 🌿 Branch setup

```bash
git switch lab/12-deliver-inc4-travel-request
git switch -c lab/13-deliver-inc5-expenses
git checkout main -- docs/ README.md   # current lab instructions
```

<sub>That third line matters. `docs/` lives on `main`; a `lab/*` branch cut from its predecessor carries whatever `docs/` looked like back then. Increment 0 was run against instructions **1935 lines out of date** because of exactly this — see [step 08](08-deliver-inc0-shell.md#-outcome).</sub>

---

## 🗣️ The prompt

```text
Phase 2, increment 5 — migrate expense-reconciliation to React. Last module.

specs/features/expense-reconciliation.feature is the spec, same constraints as
before.

Three things are specific to this module.

Receipt upload works by hiding a file input and triggering a click on it with
jQuery. Use a ref and a controlled file input. The visible behaviour must not
change: same button, same file name shown after selection.

app/directives/currency-input.directive.js and app/filters/currency.filter.js both
dissolve. Read the directive's parser and formatter before you replace it — how it
handles a partially typed number, a paste, and an empty field is behaviour, and
Intl.NumberFormat alone will not reproduce it.

The dashboard aggregates are the point of this screen. Totals per status, report
count, average, top category and the current-month total must all match to the
cent. Note that the average is over ALL reports, not the filtered set.

Remove the AngularJS 'expenses' state only after the React route is green, and
delete app/components/expense-reconciliation/, the two directives' worth of dead
code, and the currency filter in the same commit.

This is the last feature module, so after it is green, tell me what is left under
app/ and what still depends on it.

The date filter is one-way today: clearing both dates never un-filters. In React
it works both ways. That is the AUTHORISED outcome: ADR-005 classifies the trapped
date filter among "the four dead controls" as SUPERSEDE, because ADR-001/002
already decided to fix them and they are "resolved by being reimplemented
correctly". Supersede the scenarios that pin the one-way behaviour, with the ADR
named — do not write code to reproduce it.

Paste the unit run, the full @existing-behavior suite across all five modules, and
the build. Stop at the PR Review gate.
```

---

## 📦 What this module actually contains

Ground truth from `app/components/expense-reconciliation/expense.controller.js`:

| Behaviour | Lines | Note |
|-----------|-------|------|
| Deep `$watch` on `newReport.expenses` → auto-total | 37–44 | recalculates on every keystroke |
| `$watchGroup(['searchQuery','filterStatus'])` | 46–48 | |
| `$watch` on `dateRange` | 50–55 | |
| Datepickers `#expenseDate`, and `#reportStartDate, #reportEndDate` together | 57–73 | multi-selector init |
| Date-range filter uses `isSameOrAfter` / `isSameOrBefore` | 108–117 | **inclusive** both ends |
| Dashboard: totals by status, count, mean, top category, this month | 125–136 | `_.sumBy`, `_.meanBy` |
| Average is over **all** reports, guarded against empty | 132 | not the filtered set |
| New-report form slides down over 300 ms | 146 | |
| Missing fields flash `.expense-required` for 3 s | 156–159 | `.delay(3000).queue()` |
| Each expense gets `dateFormatted` `MMM D, YYYY` | 164 | mutated onto the object |
| Adding an item raises an `info` notification | 170 | not `success` |
| Submit stamps `submittedAt` ISO, formats item dates `YYYY-MM-DD` | 193–198 | |
| Detail opens a Bootstrap jQuery modal | 223 | `#expenseDetailModal` — last one |
| **Upload = `$('#receiptFileInput').trigger('click')`** | 246–249 | |
| `onReceiptSelected` stores the `File` and its name, then `$apply()` | 251–258 | outside the digest |
| Monthly total via `moment().startOf('month')` | 322–325 | |
| Re-loads on `auth:login` | 330 | |

### The dissolution — the last of them

| Legacy | Target |
|--------|--------|
| `$('#receiptFileInput').trigger('click')` | `ref.current.click()`, or a styled `<label>` |
| `$scope.$apply()` after file select | nothing — React has no digest |
| `currency-input.directive.js` | controlled input with its parse/format behaviour preserved |
| `currency.filter.js` | `Intl.NumberFormat` |
| `date-format.filter.js` | already gone in [increment 1](09-deliver-inc1-flight-search.md) |
| `$('#expenseDetailModal').modal('show')` | React modal — **`bootstrap.js` now has no callers** |
| `_.sumBy` / `_.meanBy` / `_.filter` dashboard | one `reduce` pass |
| `isSameOrAfter` / `isSameOrBefore` | date-fns, **keeping both bounds inclusive** |

> With this increment, all three `.modal()` calls are gone — hotel-booking, travel-request,
> expenses. Confirm nothing else references `bootstrap.js` and note it for
> [cutover](14-cutover.md).

---

## 📤 Outcome

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/12-deliver-inc4-travel-request..lab/13-deliver-inc5-expenses`
> 2. Dashboard figures before and after, side by side — all six
> 3. How the currency input behaves on partial input, paste, and clear
> 4. How receipt upload works now
> 5. **What is left under `app/`** and what still depends on it
> 6. Unit run, full Playwright, build

---

## 🧑‍⚖️ Human gate — PR Review

- [ ] All `@existing-behavior` scenarios pass, all five modules
- [ ] Dashboard matches to the cent: submitted, approved, pending, rejected, count, average
- [ ] Average is over **all** reports, and an empty list gives 0 rather than `NaN`
- [ ] Top category and current-month total match
- [ ] Date-range filtering is inclusive at **both** ends
- [ ] Receipt upload selects a file and shows its name
- [ ] Currency input handles partial typing, paste and clearing as it did
- [ ] Adding an item still raises an **info** notification, not success
- [ ] `expenses` state removed; module, directives and `currency.filter.js` all deleted
- [ ] `app/directives/` and `app/filters/` are now empty — or you can say exactly why not
- [ ] Nothing references `bootstrap.js` any more

---

## ⚠️ Pitfalls

<details>
<summary><b>The currency input is not a formatter</b></summary>

`currency-input.directive.js` is a two-way binding with a parser and a formatter. It decides what
happens while you are *mid-type* — whether `12.` is valid, whether the symbol appears as you type
or on blur, what an empty field parses to.

`Intl.NumberFormat` only does the display half. Replace the directive with formatting alone and
the field becomes unusable in ways no scenario is likely to cover: cursor jumps, a decimal point
you cannot type past, `NaN` on clear. Read the parser first.
</details>

<details>
<summary><b>Average silently changes meaning</b></summary>

`_.meanBy($scope.reports, ...)` averages every report. Compute it from the filtered list — which is
what is on screen, so it feels right — and the number moves whenever a filter changes. Same
label, different metric, no test failure unless a scenario pins the value.
</details>

<details>
<summary><b>Inclusive bounds become exclusive</b></summary>

`isSameOrAfter` / `isSameOrBefore` include both endpoints. `>` / `<` do not. A report submitted on
the range's start date disappears — off by one day, at the edge, where nobody looks.
</details>

<details>
<summary><b><code>$apply()</code> gets ported</b></summary>

Line 256 exists because the file-input callback fires outside AngularJS's digest. React has no
digest. Any `$apply`, `$digest` or `$timeout(fn, 0)` surviving into React is a sign the port was
mechanical.
</details>

<details>
<summary><b>Notification severity drifts</b></summary>

Adding an expense item raises `info`. Submitting a report raises `success`. Deleting raises
`warning`. Three levels, deliberately different, easy to flatten into one during a port — and
if the scenarios only assert on message text, nothing catches it.
</details>

---

## ⏭️ Next

[**Step 14 — Cutover**](14-cutover.md) — delete AngularJS.
