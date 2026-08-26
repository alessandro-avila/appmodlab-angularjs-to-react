# Step 09 · Increment 1 — flight-search

> **Phase** 2 · Deliver (increment 1) &nbsp;|&nbsp; **Branch** [`lab/09-deliver-inc1-flight-search`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/09-deliver-inc1-flight-search) &nbsp;|&nbsp; **Parent** `lab/08-deliver-inc0-shell`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ⏳ Pending

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
| --- | --- | --- |
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
| --- | --- | --- |
| `flight-search.controller.js` | split across components + `filters.ts` | 258 lines of controller become several small units |
| `flight-search.service.js` | `use-flight-search.ts` | Restangular → a `fetch` call + Zod parse; **no cache layer** |
| `flight-search.template.html` | JSX across the components |  |
| `date-picker.directive.js` | **dissolved** | native `<input type="date">` |
| `currency.filter.js` | **dissolved** | `Intl.NumberFormat` |
| `date-format.filter.js` | **dissolved** | `date-fns` `format()` |
| `$('#search-overlay').fadeIn/fadeOut` | React state | loading is state, not a DOM effect |
| `$('html,body').animate(scrollTop)` | `scrollIntoView({behavior:'smooth'})` |  |
| `.addClass('has-error').delay(3000)` | validation state + CSS |  |
| `_.uniq/_.map/_.minBy/_.maxBy` | `Set`, `map`, `reduce` |  |
| `$watch` × 3 | derived state / effects |  |
| `$broadcast('notification:add')` | notification store |  |
| `$broadcast('itinerary:refresh')` | query invalidation | `queryClient.invalidateQueries` is the idiomatic replacement |

> **`itinerary:refresh` deserves a thought.** The AngularJS version tells the itinerary controller
> to re-fetch. The React version has a better answer: invalidate the itinerary query key. Same
> outcome, no event bus. Worth an ADR if increment 3 ends up depending on it.

### The `$watch` translations

The three watchers are where the subtle bugs live. Translate them deliberately:

| Watcher | Lines | React equivalent |
| --- | --- | --- |
| `departDate` → push `returnDate` +1 day | 45–53 | derive in the change handler, not an effect — effects that write state that triggers effects are how you get loops |
| `tripType` → null `returnDate` | 55–59 | change handler |
| `filters` (deep) → re-filter | 62–66 | **not an effect at all** — filtered results are `useMemo` over `results` and `filters` |

The third one is the interesting case. A deep `$watch` that recomputes a derived list is exactly
what `useMemo` is for. Porting it as a `useEffect` that calls `setState` reproduces the AngularJS
digest cycle in React, badly.

---

## 📤 Outcome

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/08-deliver-inc0-shell..lab/09-deliver-inc1-flight-search`
> 2. The Gherkin delta — did it write the modified date-parsing scenario **before** the code?
> 3. Vitest output
> 4. Playwright `@existing-behavior` output, **all five modules**
> 5. Did any jQuery / Moment / Lodash / Restangular survive? (`grep -rn "jquery\|moment\|lodash\|restangular" src/`)
> 6. Did it remove the AngularJS `flights` route, and did it do so **last**?
> 7. How it handled the `maxPrice` reset — preserved, or silently "fixed"?
> 8. How it translated the three `$watch`es — `useMemo` or `useEffect`?
> 9. **What it did about `flight:selected`** — the journey should be *explicitly deferred* to
>    increment 2, not bridged and not silently dropped
> 10. Anything it discovered that the FRD got wrong

---

## 🧑‍⚖️ Human gate — PR Review

> 🔴 **Blast radius: this is the template for four more increments.** Whatever you accept here,
> you will get four more times. Be harder on this PR than on any other.

- [ ] All `@existing-behavior` scenarios pass — for **every** module, not just flights
- [ ] The only modified scenario is the date-parsing one, and its ADR explains it
- [ ] `grep -rn "jquery|jQuery|moment|lodash|restangular" src/` → nothing
- [ ] `grep -rn ": any|as any|@ts-expect-error|@ts-ignore" src/` → nothing
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
