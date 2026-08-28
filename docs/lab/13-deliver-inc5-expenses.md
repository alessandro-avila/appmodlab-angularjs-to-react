# Step 13 · Increment 5 — expense-reconciliation

> **Phase** 2 · Deliver (increment 5) &nbsp;|&nbsp; **Branch** [`lab/13-deliver-inc5-expenses`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/13-deliver-inc5-expenses) &nbsp;|&nbsp; **Parent** `lab/12-deliver-inc4-travel-request`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ✅ Verified

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
- [ ] ⚠️ **You inherit ADR-022.** The date filter is one of ADR-005's *"four dead controls"*, so it
      **works** in React — authorised, not accidental. Supersede the scenarios pinning it one-way.
      Check the same clause for an **un-dismissable alert** in this module: ADR-005 names those in the
      same sentence, and Increment 4 found one in travel-request.
- [ ] **Reuse `useConfirm()` from `src/components/`** — Increment 4 built it and it is still blocking.
      Do **not** invent a second confirmation mechanism; there are already two in the product.
- [ ] **This module is the last `bootstrap.js` consumer** (`expense.controller.js:223`). Once its
      modal is React, `app/index.html` can drop the script — verify rather than assume.
- [ ] `app/directives/currency-input.directive.js` and `app/filters/currency.filter.js` both go with
      this module. **Check for consumers first** — Increment 4 found `approval-status` had zero.
- [ ] ⚠️ **Restart the front door after cutting the branch** and confirm `GET /` returns the
      AngularJS index (~4 kB, contains `ng-app`). A stale Vite server answers while serving nothing
      useful — it has happened three times.

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

> ✅ **Verified** — branch [`lab/13-deliver-inc5-expenses`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/13-deliver-inc5-expenses) ·
> [compare with `lab/12-deliver-inc4-travel-request`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/compare/lab/12-deliver-inc4-travel-request...lab/13-deliver-inc5-expenses)

**All six feature areas are React. `app/components/` is empty.**

| Check | Result |
|---|---|
| Full `@existing-behavior` suite | ✅ **250 scenarios · 2144 steps** |
| Unit | ✅ 438 |
| `tsc` · `oxlint src` · `vite build` | ✅ clean — 426 kB, 120 kB gzipped |
| `api-mock/` · `test/` | ✅ untouched |

### The third zero-consumer file — and the reading that found it

The prompt said *"read the parser and formatter"*. Doing so is exactly what exposed that **neither
`currency-input.directive.js` nor `currency.filter.js` has a single consumer**. No template in `app/`
uses **any** `gt-` directive; the amount field is a plain `<input type="number">`; and the screen's
money goes through Angular's **built-in** `currency` filter via `formatCurrency()`.

The subtle part it got right: the custom filter registers as **`usdCurrency`**, not `currency`. Had
it registered as `currency` it would have **shadowed the built-in** — and every `| currency` in the
app would silently have been running it, making it heavily used rather than dead.

That is the third dead abstraction (`gtDateFormat` makes four): **`approval-status`,
`currency-input`, `usdCurrency`, `gtDateFormat` — all built to solve problems nobody had.**

> Porting them would ship behaviour the app has never executed: no baseline, no scenario, no
> authorisation. §13 item 9 — *"Do not replace a dependency nothing used."*

### A bug the baseline could not have caught

Its port hardcoded `submittedBy: 'Demo User'` — the **observed value** of `controller:194`, not its
**conditional**.

Every scenario exercises the placeholder branch, because the suite signs in by planting a token and
identity is never read back. So the hardcode was **indistinguishable from correct across all 250
scenarios**, while being wrong for a live session. And the mock does
`Object.assign({defaults}, req.body)`, so the client's value wins and would have persisted.

Now ported as the conditional it is, with a unit test pinning the other branch.

> A green suite proves the scenarios pass. It does not prove the code is right — only that nothing
> written down disagrees with it. This is what "the baseline is a reference, not a contract" means in
> practice.

### It found a harness bug Increment 4 left behind

`auth.page.js` **restated** the React path set, and Increment 4 forgot to add `travel-request`. Its
authentication scenarios kept addressing `/#!/travel-request` — a hash with no UI-Router state — so
`otherwise('/login')` produced **exactly the redirect the guard was supposed to produce**.

Two scenarios green, both meaningless, for a whole increment.

The fix is the right shape: the set is now **derived from `route-ledger.ts`** rather than restated,
so it cannot drift again. One source of truth, mechanically read.

### ⚠️ The C-1 divergence — right action, wrong reason

Plan §9.3 says supersede `authentication.feature:179`, on the grounds that *"Inc-0's identity
rehydration means the report is filed by the real user."* The agent found no rehydration exists,
concluded **nothing authorises the repair**, and preserved the scenario.

**Preserving was correct. The reason was not.** ADR-010:80 explicitly authorises it:

> *"Inc-0 takes the plumbing: the token store…, identity **rehydration via `GET /api/auth/me` (the
> C-1 repair)** and the 401 handling path."*

So the true position is sharper than either document says:

| | |
|---|---|
| **Authorised?** | Yes — ADR-010, restated in plan §10.2 |
| **Scheduled for?** | Increment **0** |
| **Built?** | **No** — `auth/me` is never called outside tests |
| **Where did it go?** | `auth-store.ts:37` reschedules it to Inc-6 — **in a code comment, with no ADR** |

The repair was authorised, scheduled, **silently deferred in a comment**, and then nearly written off
as unauthorised two increments later. Had that reasoning stood, cutover would have shipped C-1
permanently and the plan's own supersede would have been quietly dropped.

**`:179` stays preserved — but Increment 6 owes the repair and the supersede.** Added to
[step 14](14-cutover.md)'s checklist.

> A decision deferred in a code comment is not deferred, it is lost. This one survived only because
> a later increment tripped over its absence.

### The cutover inventory

Eight files left under `app/`, and only **three** of nine bower libraries are still referenced:

| File | Depended on by |
|---|---|
| `index.html`, `app.js`, `app.routes.js` | the front door — still serves `/` and `/dashboard` |
| `services/auth.service.js` | **live** — the `$stateChangeStart` guard and login |
| `assets/css/style.css` | both stacks |
| `services/api.service.js` · `services/user.service.js` · `filters/date-format.filter.js` | **zero consumers** |

**jQuery, jQuery UI, Lodash, ui-bootstrap and bootstrap.js now have zero code references.** Moment
survives only inside the unused date filter. Bootstrap's *CSS* is still live.

And `app.js:14` still hardcodes `http://localhost:3000/api` — the Increment 0 finding — now feeding
only dead code.

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
