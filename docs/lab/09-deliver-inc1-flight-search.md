# Step 09 · Increment 1 — flight-search

> **Phase** 2 · Deliver (increment 1) &nbsp;|&nbsp; **Branch** [`lab/09-deliver-inc1-flight-search`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/09-deliver-inc1-flight-search) &nbsp;|&nbsp; **Parent** `lab/08-deliver-inc0-shell`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ✅ Verified

---

## 🎯 Goal

Migrate the **hardest module first**, under the thickest safety net.

`flight-search` carries every piece of debt in the codebase at once: jQuery DOM manipulation,
a jQuery UI datepicker, Moment.js parsing without a format string, Lodash data wrangling,
`$rootScope` events, `$watch` side effects, and imperative scroll animation. It is also the
module with the **best test coverage** — the only one with a Karma spec.

That is the whole argument for going first: the module that will teach you the most about the
migration is also the one where a mistake is loudest.

---

## 🧰 Skills invoked

| Step | Skill | Notes |
|------|-------|-------|
| 1 | `gherkin-generation` | Only if the increment introduces a **delta** — here it does |
| 2 | `test-generation` | Red tests first |
| 3 | `contract-generation` | Types for `/api/flights` |
| 4 | `implementation` | The React module |
| 5 | `test-runner`, `build-check` | Verify |
| — | `commit-protocol` | Commit + PR |

---

## ✅ Prerequisites

- [ ] [Step 08](08-deliver-inc0-shell.md) merged; the shell renders and the baseline is green
- [ ] `specs/frd-flight-search.md` approved in [step 02](02-b2-spec-enable.md)
- [ ] `specs/features/flight-search.feature` green in [step 04](04-green-baseline.md)
- [ ] The date-parsing ADR from [step 07](07-plan.md) exists — it authorises the one behaviour
      change in this increment

---

## 🌿 Branch setup

```bash
git switch lab/08-deliver-inc0-shell
git switch -c lab/09-deliver-inc1-flight-search
git checkout main -- docs/ README.md   # current lab instructions
```

<sub>That third line matters. `docs/` lives on `main`; a `lab/*` branch cut from its predecessor carries whatever `docs/` looked like back then. Increment 0 was run against instructions **1935 lines out of date** because of exactly this — see [step 08](08-deliver-inc0-shell.md#-outcome).</sub>

---

## 🗣️ The prompt

```text
Phase 2, increment 1 — migrate flight-search to React.

The spec for this increment is specs/features/flight-search.feature. Every
@existing-behavior scenario in it must pass against the React route when you are
done. I am not going to restate the behaviour here — if the baseline is missing
something, that is a bug in step A1 and I want to find it now.

What must be gone: jQuery, jQuery UI, Moment.js, Lodash, Restangular, $rootScope,
and any `any`. The datepicker becomes a native date input, the scroll animation
becomes scrollIntoView, currency becomes Intl.NumberFormat, dates go through
date-fns with an explicit parse format, and data fetching goes through the query
hooks from increment 0.

One deliberate behaviour change is authorised: explicit date parsing, per its ADR.
Write that Gherkin delta before you write any code. Nothing else changes — and that
includes the surprising things. If you find yourself fixing something the baseline
pins, stop and tell me instead. Bug fixes are separate, deliberate increments.

One thing spans the increment boundary: hotel-booking listens for flight:selected
to pre-fill its search, and hotel-booking is still AngularJS. ADR-005 rejected an
in-page bridge, so that journey is simply unserved until increment 2. Say so in the
PR — do not build interop for it, and do not quietly drop the scenario. It is
deferred, and the baseline scenario that covers it should be marked as such.

Remove the AngularJS 'flights' state only after the React route is green, and delete
app/components/flight-search/ in the same commit. Touch no other module.

Paste the unit run, the full Playwright @existing-behavior suite including the four
modules still served by AngularJS, and the build. Then stop at the PR Review gate.
```

<details>
<summary><b>Why this prompt does not list the behaviours</b></summary>

Because [step 04](04-green-baseline.md) already did, executably.

It is tempting to re-list all ten behaviours here — the return-date push, the `maxPrice` reset,
the time buckets, the sort toggle. But if the prompt has to carry them, the green baseline is not
doing its job, and you will not discover that until a later increment where nobody thought to
write the list out.

Pointing at the feature file instead makes the baseline load-bearing. If a behaviour goes missing
because no scenario covered it, that is a real and useful failure: it tells you your safety net
has a hole, at the one moment in the lab where finding out is cheap.

The lines that stay are the ones the feature file genuinely cannot express: what to delete, what
is authorised to change, and the cross-module coupling that lives in a file this increment does
not touch.
</details>

---

## 📦 Expected artifacts

```
src/
├── routes/flights.tsx                      ← real route now, not a placeholder
└── features/flight-search/
    ├── FlightSearchPage.tsx
    ├── SearchForm.tsx                      ← replaces the searchParams block
    ├── FilterPanel.tsx                     ← replaces filters + deep watch
    ├── ResultsTable.tsx                    ← replaces the ng-repeat + sort
    ├── FlightDetails.tsx                   ← scrollIntoView target
    ├── use-flight-search.ts                ← data-fetching hook
    ├── filters.ts                          ← pure functions, unit-testable
    └── *.test.tsx / *.test.ts

specs/
├── features/flight-search.feature          ← delta applied, still tagged
├── frd-flight-search.md                    ← Current Implementation rewritten
└── adrs/                                   ← any new decision found mid-flight

app/app.routes.js                           ← `flights` state removed, LAST
```

### The dissolution table

Nothing here is a 1:1 port. Most of the legacy pieces stop existing as pieces:

| Legacy | Where it goes | Note |
|--------|---------------|------|
| `flight-search.controller.js` | split across components + `filters.ts` | 258 lines of controller become several small units |
| `flight-search.service.js` | `use-flight-search.ts` | Restangular → a `fetch` call + Zod parse; **no cache layer** |
| `flight-search.template.html` | JSX across the components | |
| `date-picker.directive.js` | **dissolved** | native `<input type="date">` |
| `currency.filter.js` | **dissolved** | `Intl.NumberFormat` |
| `date-format.filter.js` | **dissolved** | `date-fns` `format()` |
| `$('#search-overlay').fadeIn/fadeOut` | React state | loading is state, not a DOM effect |
| `$('html,body').animate(scrollTop)` | `scrollIntoView({behavior:'smooth'})` | |
| `.addClass('has-error').delay(3000)` | validation state + CSS | |
| `_.uniq/_.map/_.minBy/_.maxBy` | `Set`, `map`, `reduce` | |
| `$watch` × 3 | derived state / effects | |
| `$broadcast('notification:add')` | notification store | |
| `$broadcast('itinerary:refresh')` | query invalidation | `queryClient.invalidateQueries` is the idiomatic replacement |

> **`itinerary:refresh` deserves a thought.** The AngularJS version tells the itinerary controller
> to re-fetch. The React version has a better answer: invalidate the itinerary query key. Same
> outcome, no event bus. Worth an ADR if increment 3 ends up depending on it.

### The `$watch` translations

The three watchers are where the subtle bugs live. Translate them deliberately:

| Watcher | Lines | React equivalent |
|---------|-------|------------------|
| `departDate` → push `returnDate` +1 day | 45–53 | derive in the change handler, not an effect — effects that write state that triggers effects are how you get loops |
| `tripType` → null `returnDate` | 55–59 | change handler |
| `filters` (deep) → re-filter | 62–66 | **not an effect at all** — filtered results are `useMemo` over `results` and `filters` |

The third one is the interesting case. A deep `$watch` that recomputes a derived list is exactly
what `useMemo` is for. Porting it as a `useEffect` that calls `setState` reproduces the AngularJS
digest cycle in React, badly.

---

## 📤 Outcome

> ✅ **Verified** — branch [`lab/09-deliver-inc1-flight-search`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/09-deliver-inc1-flight-search) ·
> [compare with `lab/08-deliver-inc0-shell`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/compare/lab/08-deliver-inc0-shell...lab/09-deliver-inc1-flight-search)

**53 files, +4860 / −1883.** The first module to actually move.

### I re-executed everything

| Check | Result |
|---|---|
| **Full `@existing-behavior` suite** | ✅ **236 scenarios, 236 passed · 1952/1952 steps · 17m19s** |
| `npm test` — now Vitest | ✅ 155/155 |
| `tsc --noEmit` | ✅ exit 0 |
| `npm run shell:lint` | ✅ exit 0 |
| `vite build` | ✅ 484 modules, exit 0 |
| Four unmigrated modules + `api-mock/` | ✅ untouched |
| jQuery · jQuery UI · Moment · Lodash · Restangular | ✅ **zero imports** — remaining text matches are comments citing legacy source |
| Escape hatches | ✅ zero across all five patterns |

`/flights` now returns **200** from the front door where Increment 0 returned a 302. That is the
route ledger flip working — and it really was **one word**: `owner: 'angularjs'` → `'react'`.

### The Gherkin delta, written before the code

| Verdict | Scenario | Authority |
|---|---|---|
| **SUPERSEDE** | `:91` *raw date string* → *shown as a calendar date* | **ADR-009** — the one authorised change |
| **SUPERSEDE** | `:95` *flight covers the date calendar* → *does not block date entry* | unavoidable consequence of the instructed native date input (ADR-007 cat 1) |
| **NET-NEW** | *A typed departure date is accepted* | ADR-009 — the legacy field is `<input type="text">`, so typing never fired `onSelect` and the model silently stayed null |

235 → **236**. All three tagged `@inc-1`.

And `hotel-booking.feature:209` — the `flight:selected` journey — is tagged `@deferred-to-inc-2`
**with the reasoning written into the file, assertions untouched, and still passing.** No interop was
built. The emitter is gone; the AngularJS listener survives and still never fires. Increment 2 must
satisfy it *by construction*.

> That is the shape to copy: a scenario that cannot pass yet is **annotated and kept**, never
> deleted and never quietly bridged.

### Karma retired — with the receipts

`npm test` now runs Vitest. The 19 Karma assertions were retired under ADR-008 §2 with an auditable
**19 → 68** mapping in `docs/architecture/karma-retirement.md`, and `test/` is gone — authorised
explicitly by increment plan §5, which also carries the gate check *"all 19 Karma assertions have a
named, passing React replacement."*

One mapping **inverts its assertion**, and it is the most interesting line in the increment. Karma's
*"should select a flight and broadcast event"* becomes *"does **not** announce `flight:selected`"* —
because ADR-013 drops the event, and **asserting its absence is what stops it being reimplemented by
accident.**

### Four bugs its own suite caught, and one it caught by diffing

It reported the suite catching four of its own bugs at 227/236 — including a shared notification
selector re-pointed to a React-only `data-testid`, which broke **seven scenarios in expense and
travel-request**, modules this increment never touched.

The best one it found before the suite could: **`Intl.NumberFormat` groups thousands by default**
(`$1,250`) where the legacy renders plain concatenation (`$1250`). It caught that by running the
**real vendored Moment/AngularJS output and diffing**, rather than trusting its reading. It would
have surfaced on the details-panel total, which multiplies price by passenger count.

### The real blocker was origin scoping

Storage state captured on `:8080` was invisible to the React route, so the guard bounced **every**
scenario to login and the feature timed out. `localStorage` is origin-scoped — the exact property
Increment 0's one-origin front door exists to satisfy. The whole harness now drives the front door.

This was plan §4.2's deferred work, landing here because Increment 1 is the first increment that
needs it. Worth noting how it surfaced: not as a design discussion, but as a suite that would not
start.

### C-4 preserved — a contradiction escalated rather than resolved silently

Increment plan §5.3 **authorises** superseding `:118` and `:123` (the price-slider snap) under
ADR-006. The prompt on this page authorises **only** ADR-009 and says *"if you find yourself fixing
something the baseline pins, stop and tell me instead."*

Those two instructions conflict. It **stopped and reported** — and wrote `snapToStep()` specifically
to reproduce the AngularJS `input[range]` clamp, with the conflict named in a comment above it.

**Gate ruling: preserved.** It keeps this increment a single-change migration whose delta is minimal
and auditable. C-4 and the `Confirmation: undefined` defect *(`controller:220` reads
`booking.confirmationCode`; the API returns `confirmationNumber` — the baseline asserts only the
prefix, so it never caught it)* are now a natural pair for a later, deliberate bug-fix increment.

> Neither is tech debt. **A defect reproduced on purpose, pinned by a test, and dated is a
> decision** — the difference is whether anyone wrote it down.

### A step-A1 bug, exactly where the prompt predicted

`flight-search.steps.js:474` polled the AngularJS scope **inline inside a step definition** — the one
place framework coupling escaped the page object. It could not survive the migration, so a step
definition had to change, which plan §1.4 says should not happen. Now `this.flights.waitForIdle()`,
asserted condition unchanged.

That is the green baseline earning its keep: a hole in the safety net, found at the cheapest possible
moment.

### ⚠️ New finding — the baseline is not hermetic

**My first full run came back 235/236.** The failure was
`expense-reconciliation.feature:213`, timing out on the expenses table — a module this increment
never touched.

It is **not a regression**. Driving a browser at the page showed it rendering fine, two rows, zero
console errors. The cause:

- the expense scenarios mutate server state but carry **zero `@mutates-fixture` tags**
- the restore hook in `hooks.js` covers **itinerary only** — `FIXTURE_DEFAULTS = [{ id: 'item-4' }]`
- `api-mock/server.js:222` holds `expenseReports` in a plain in-memory array with **no reset endpoint**

My mock API had been live across several prior suites. Restarting it and re-running gave a clean
**236/236**. Recorded as `BASELINE-ISOLATION`; it predates this increment and matters most at
**Increment 5**, which migrates that exact module.

### The staleness bug, third occurrence — and this half was the reviewer's

The agent's summary again reported `§13-16` as unsettled. This time the cause was **not** stale docs:
the ruling *had* been recorded in `state.json` and the ADRs, and a resolution note *had* been added to
`tech-stack.md` — **above the table.** The table **row** still read *"Must be settled before Inc-0"*,
and `increment-plan.md` §1.7 and §14 were never touched at all.

It read the row. Correctly.

> **A resolution recorded in a note above the question, but not in the row that states it, is not
> recorded.** Fix the sentence that makes the claim — not the space near it.

Both are now struck through in place, in the rows themselves and in both plan sections. And credit
where it is due: the agent **caught its own error in the artifact**, writing into `state.json`
*"(I incorrectly repeated this as open in my Inc-1 summary.)"* Its chat report was stale; its record
was not.

---

## 🧑‍⚖️ Human gate — PR Review

> 🔴 **Blast radius: this is the template for four more increments.** Whatever you accept here,
> you will get four more times. Be harder on this PR than on any other.

- [ ] All `@existing-behavior` scenarios pass — for **every** module, not just flights
- [ ] The only modified scenario is the date-parsing one, and its ADR explains it
- [ ] `grep -rn "jquery\|jQuery\|moment\|lodash\|restangular" src/` → nothing
- [ ] `grep -rn ": any\|as any\|@ts-expect-error\|@ts-ignore" src/` → nothing
- [ ] The flight response is validated before it is rendered — the generated type is not the check
- [ ] The `maxPrice` reset still happens on every search — **surprising behaviour preserved**
- [ ] Time buckets are still 6–12 / 12–18 / 18–6
- [ ] Sorting still toggles direction on repeated header clicks
- [ ] Booking still notifies **and** refreshes the itinerary
- [ ] Login still overwrites `cabinClass`
- [ ] **Selecting a flight still pre-fills the AngularJS hotel search** — city, check-in, and
      check-out = depart + 3 days. Test it by hand: search a flight, select it, navigate to
      `#!/hotels`, look at the form.
- [ ] The AngularJS `flights` state is gone from `app/app.routes.js`, and the other four remain
- [ ] `app/components/flight-search/**` deleted — no dead code left behind
- [ ] No other AngularJS module touched
- [ ] Filtering is `useMemo`, not an effect that sets state
- [ ] `specs/frd-flight-search.md` Current Implementation now describes React

---

## ⚠️ Pitfalls

<details>
<summary><b>Fixing the maxPrice reset</b></summary>

`flight-search.controller.js:117` overwrites `filters.maxPrice` with the most expensive result on
**every** search, throwing away whatever the user had set. It looks like a bug because it is one.

It stays. The green baseline pins it, the FRD documents it, and fixing it here would mean this
increment ships two behaviour changes — one reviewed, one smuggled. File it as a follow-up
increment with its own Gherkin delta and its own ADR, and let a human decide.

This is the discipline the whole lab is teaching: **modernization preserves behaviour; bug fixes
are separate, deliberate, and documented.**
</details>

<details>
<summary><b>The date input is not a datepicker</b></summary>

`date-picker.directive.js` configures jQuery UI with `dateFormat: 'mm/dd/yy'` and
`minDate: 0`. A native `<input type="date">` renders per the browser locale and submits ISO. Those
are different UX. The `@existing-behavior` scenario that types `08/15/2026` will fail against a
native input expecting `2026-08-15`.

That is not a regression — it is the date-parsing ADR's delta showing up in a place the plan may not
have anticipated. Update the scenario, note it in the ADR, move on. What you must **not** do is add a
jQuery UI shim to make the old scenario pass.
</details>

<details>
<summary><b>Porting <code>$watch</code> as <code>useEffect</code></b></summary>

```tsx
// ✗ AngularJS digest cycle, reimplemented
useEffect(() => { setFiltered(applyFilters(results, filters)); }, [results, filters]);

// ✓ derived state
const filtered = useMemo(() => applyFilters(results, filters), [results, filters]);
```

The first version renders twice, can loop, and puts derived data in state where it can go stale.
It also passes the tests, which is why it needs to be caught in review rather than by CI.
</details>

<details>
<summary><b>One giant <code>FlightSearchPage.tsx</code></b></summary>

258 lines of controller ported to 400 lines of component is a translation, not a migration. The
filter logic in particular should end up in `filters.ts` as pure functions — testable without
rendering anything, which makes the Vitest suite fast and the time-bucket edge cases (what is
`18–6` at 23:00?) actually pinnable.
</details>

<details>
<summary><b>Removing the AngularJS route first</b></summary>

Tempting, because it feels like committing to the migration. It means that between that commit
and a green React route, `#!/flights` 404s and the baseline is red — so you lose the signal
exactly when you need it. React green **then** route removed. Always.
</details>

<details>
<summary><b>Leaving <code>app/components/flight-search/</code> behind</b></summary>

Removing the route but keeping the files means the next increment's agent reads
`flight-search.controller.js` as if it were live, and `bower_components` still ships it. Delete
the module in the same commit that removes its route.
</details>

---

## ⏭️ Next

[**Step 10 — Increment 2: hotel-booking**](10-deliver-inc2-hotel-booking.md) — the same shape,
now with a template you have proved.
