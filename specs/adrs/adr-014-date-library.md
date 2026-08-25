# ADR-014 — Date library: `date-fns`, chosen for explicit parsing and a controllable clock

- **Status:** proposed — decided at the Tech-Stack Review gate
- **Date:** 2026-08-25
- **Phase:** P → `tech-stack-resolution`
- **Deciders:** product owner, orchestrator
- **Supersedes:** —
- **Depends on:** **ADR-009** (explicit date parsing — decides the *behaviour*; this ADR decides the
  *package*), ADR-007 (category 1 — the shared date component), ADR-003 (constraint **C-2**),
  ADR-011 (TypeScript), increment plan **§0.6** (the pinned suite clock), §11.1, §13 item 6
- **Answers:** ADR-005 follow-on decision 3; increment plan §13 items 6 and 17

## Context

ADR-009 already made the behavioural decision and deliberately stopped short of the package:

> **This ADR does not choose a date library.** It decides *explicit parsing*. Which package performs
> the parsing is a `tech-stack-resolution` decision (Phase 1d), constrained only by the requirement to
> support explicit parse and format patterns. Native `Intl` for formatting is in scope for that
> decision.

### What is being replaced

**79 `moment` call sites** (76 live, 3 in Q-10 dead files) and **8 live jQuery UI datepicker init
sites** — two each in flight-search, hotel-booking, travel-request and expense — plus four more in
`date-picker.directive.js`, the 88-line abstraction that was built to solve this exact duplication and
acquired **zero consumers** (**P-3**). Both dependencies are dropped entirely under ADR-005; neither
survives.

### Two requirements, from two different decisions

**Requirement 1 — explicit parse and format, from ADR-009.** Every input boundary parses with a named
format; every output boundary formats with a named format; an absent date renders as absent; an
unparseable value is a validation failure that never reaches the API.

**Requirement 2 — the library's notion of "now" must be controllable by a fake clock, from increment
plan §0.6.** This is the newer constraint, and it arrived by costing the project something. The
approved 235-scenario green baseline decayed to **189/235** in seventeen days with **zero lines of
application source changed**: the suite hard-codes absolute August 2026 calendar days, the datepickers
are configured `minDate: 0`, and five of the eight days the baseline asks for had drifted into the
past. The chosen repair pins the suite clock rather than rewriting the fixtures — one file
(`tests/support/hooks.js`), zero feature files, zero assertions.

That repair only holds if the date library derives "now" from the clock the test harness can pin:
Playwright's Clock API in the browser suites, and `vi.setSystemTime` in the unit suite. A library with
a private time source would sit outside both, and §0.6's repair would silently stop covering the
library that does most of the date work.

The plan states the reason this is not a tidy-up:

> It is the second time date handling has cost this project something, which is independent support
> for ADR-009 being a real decision rather than a tidy-up.

### What is *not* a requirement

**Time zones.** Searching the specs for timezone handling returns three hits, all describing the same
defect — `flight-search.feature:93` asserting the departure field reads *"Tue Aug 25 2026" followed by
a time and time zone*, which is `Date.prototype.toString()` leaking into the DOM. ADR-009 classifies
that scenario **SUPERSEDE**. There is no FRD requirement for zone conversion, zone-aware display, or
cross-zone arithmetic anywhere in the six feature areas. This matters, because time-zone handling is
the single strongest argument for the heaviest candidate.

## Decision

**`date-fns@4` (4.4.0) is the date library. `Intl.DateTimeFormat` is retained for locale-presentational
formatting only, where a value is shown to a user in locale form rather than in a fixed pattern.
Native `Date` remains the in-memory representation.**

Two named formats are fixed by this ADR and used everywhere:

```ts
const UI_FORMAT  = 'MM/dd/yyyy';   // what the user types and reads (matches today's placeholder)
const API_FORMAT = 'yyyy-MM-dd';   // what crosses the wire
```

The ADR-009 obligations map to specific calls, all verified:

| ADR-009 | Implementation | Verified |
|---|---|---|
| (1) Explicit parse at input | `parse(text, UI_FORMAT, new Date())` + `isValid` | `'08/15/2026'` → `2026-08-15` |
| (2) Explicit format at output | `format(d, API_FORMAT)` — no default stringification | `2026-08-15` |
| (3) Absence renders as absent | `null` short-circuits before `format` | `''`, never `"Invalid date"` |
| (4) Unparseable is a validation failure | `isValid` → `null` → form error, never transmitted | `'13/45/2026'` → `null` |
| (5) Typing works | controlled React input; parse on change | typed `08/15/2026` → model `2026-08-15` |

Requirement 2 is satisfied because `date-fns` operates on native `Date` and takes its reference date
as an explicit argument. Under `vi.setSystemTime`:

```
daysUntil('08/15/2026'), clock pinned to 2026-08-06  ->   9
daysUntil('08/15/2026'), clock advanced to 2026-09-06 -> -22
```

The library moved with the clock, in both directions.

## Alternatives considered

Every candidate was executed against the two requirements rather than compared on reputation. The
discriminating input is `"09/08/2026"` parsed with a **day-first** format: a library that honours the
format returns **9 August**; one that ignores it and delegates to native parsing returns **8
September**.

| Candidate | `"09/08/2026"` as `dd/MM/yyyy` | Explicit by default? | Follows a fake clock? |
|---|---|---|---|
| **date-fns 4.4.0** | `2026-08-09` ✅ | **yes** | ✅ |
| Luxon 3.7.2 | `2026-08-09` ✅ | **yes** | ✅ |
| Day.js 1.11.23, no plugin | `2026-09-08` ❌ | **no — format ignored** | ✅ |
| Day.js + `customParseFormat` | `2026-08-09` ✅ | opt-in | ✅ |
| native `new Date(str)` | `2026-09-07` ❌ | no | ✅ |
| Temporal | — | — | **not available** |

### Day.js — rejected, and the reason was measured rather than assumed

The obvious moment replacement: near-identical API, 2 KB, and the shortest migration path from 79
`moment` call sites.

It is rejected because **`dayjs(text, 'DD/MM/YYYY')` silently ignores the format string** unless
`customParseFormat` has been extended, delegating instead to native parsing. The table above shows it
returning **8 September** for an input the format says is **9 August**.

This was tested precisely because the first two probes made it look safe: `dayjs('13/45/2026',
'MM/DD/YYYY').isValid()` correctly returned `false`, and `dayjs('08/09/2026', 'MM/DD/YYYY')` correctly
returned 9 August. Both right answers, arrived at by the native parser rather than by the format —
which is invisible until an input exists where the two interpretations differ.

**That is moment's failure mode exactly**, and it is what ADR-009 exists to eliminate:

> A user in a locale where `08/09/2026` means **8 September** currently gets **9 August**, because the
> native parse is implementation-defined.

Adopting a library whose *default* reproduces the defect — and whose correct behaviour is one missing
`extend()` call away, in a codebase that will hold dozens of parse sites across four modules — puts the
entire ADR-009 guarantee behind a line of setup nothing enforces. **A guarantee that depends on
remembering is not a guarantee.** Rejected on that ground alone.

### Luxon — rejected, and it was the strongest alternative

Explicit by default, verified correct on the discriminating input, verified to follow a fake clock,
and materially better than date-fns at exactly one thing: time zones.

Rejected on two grounds, in order of weight:

1. **The thing it is better at is not required.** As established above, no FRD asks for zone-aware
   behaviour, and the only scenario that mentions a time zone is a SUPERSEDE describing a defect. §13
   is explicit: *"Anything that does not trace to a finding or an FRD, does not go in the stack."*
2. **It introduces a second date representation.** Luxon's currency is its own `DateTime` object,
   while native `Date` is what the React date input yields, what the API client formats, what
   `vi.setSystemTime` moves, and what Playwright's `clock.install()` overrides. Every one of those
   boundaries would gain a conversion. date-fns is a set of pure functions over the representation
   everything else already speaks, so there are no boundaries to convert.

Recorded as the strongest alternative because it is: if a zone requirement ever appears, this is the
decision to revisit, and the reversal is mechanical because both libraries parse and format by pattern.

### `Temporal` — rejected on availability, not on merit

The correct long-term answer and the one that makes this entire category of ADR obsolete: immutable,
explicit, zone-aware, and standardised. Verified on the host:

```
node -e "typeof Temporal"   ->   undefined      (Node 22.22.2)
```

Not available. Adopting it would mean a polyfill — a substantial dependency, for a lab, to obtain an
API that no other part of the stack yet speaks. `vi.setSystemTime` already mocks `Temporal.Now.*`
alongside `Date.*`, so requirement 2 would have been satisfied; requirement 0, existing, is not.
Revisit when it ships in the runtime.

### `Intl` alone, with no library — rejected, but partially adopted

Worth taking seriously because ADR-009 explicitly put it in scope, and it verifiably produces the UI
format with no dependency at all:

```
new Intl.DateTimeFormat('en-US', { year:'numeric', month:'2-digit', day:'2-digit' })  ->  08/15/2026
```

Rejected as the whole answer because **`Intl` formats and does not parse**, and parsing is the entire
subject of ADR-009. Obligations (1) and (4) — explicit parse, and unparseable-is-a-failure — have no
`Intl` expression, so the choice is not *"`Intl` or a library"* but *"`Intl` plus a hand-written
parser, or a library"*. A hand-written `MM/dd/yyyy` parser is roughly ten lines and roughly four edge
cases (two-digit years, out-of-range components, leap days, whitespace), and it would be the one piece
of date logic in the system with no upstream test suite behind it.

**Partially adopted:** `Intl.DateTimeFormat` is retained for locale-presentational output, where the
intent is *"render this to the reader's locale"* rather than *"render this in a fixed pattern"*.
date-fns owns every pattern boundary.

### Keeping `moment` — not considered

Dropped by ADR-005 with the other eight bower dependencies, and in maintenance mode upstream. Recorded
only for completeness of the ledger in `specs/tech-stack.md`.

## Consequences

**Positive.**
- ADR-009's five obligations are expressible as ordinary calls, with (3) and (4) additionally enforced
  at compile time by ADR-011's `strict` and `exactOptionalPropertyTypes` (`TS2531: Object is possibly
  'null'`).
- §0.6's pinned clock covers the date library, so the repair that restored 46 scenarios keeps
  covering the code that caused them to fail.
- Tree-shakeable pure functions: only the four or five functions actually used reach the bundle,
  against `moment`'s monolith.
- No representation boundary — the date input, the API client, the store and both test harnesses all
  speak native `Date`.
- The legacy raw-`Date` rendering is reproducible **explicitly** if ever wanted
  (`format(d, 'EEE MMM dd yyyy')` → `Tue Aug 25 2026`, byte-identical to `toString()`), so a PRESERVE
  classification would remain achievable without reintroducing implicit stringification. ADR-009
  currently classifies that scenario SUPERSEDE, so this is a safety margin rather than a plan.

**Negative / accepted.**
- **A pinned clock stops the suite exercising "today"-relative behaviour.** §0.6 point 3 already
  raises this: `daysUntil`, `daysSinceSubmission`, *"this month's spending"*
  (`expense-reconciliation.feature:61`) and the trip-status recomputation (`itinerary.feature:46`) are
  all clock-dependent, and freezing to 2026-08-06 restores exactly the world they were authored
  against rather than testing them against a moving one. This is a property of the repair, not of the
  library, but this ADR is where the library that reads that clock is chosen, so **§13 item 17 stays
  open for the gate**: confirm the pinned instant, and decide whether CI also runs an unpinned canary
  on a cadence. The suite decayed silently for 17 days because nothing ran it.
- `date-fns` is functions, not objects, so date logic is composed rather than chained. A stylistic
  cost, not a capability one.
- No zone support. Accepted, with Luxon named as the reversal.

**Blocked / unblocked.**
- **Unblocks** ADR-007 category 1 — the shared React date component replacing all 8 jQuery UI
  datepicker sites, which Inc-0 must ship (§4.2).
- **Closes** §13 item 6 and ADR-005 follow-on decision 3.
- **Changes the shape of constraint C-2.** ADR-003's C-2 records that the open jQuery UI datepicker
  overlay blocks the submit button, forcing the baseline to drive dates through the calendar widget
  and never by typing. With a controlled React input, typing works (ADR-009 item 5) and the overlay
  constraint disappears. **The baseline is not re-pointed to typing on that account** — page objects
  change how they reach a screen, not what a scenario asserts (§1.4), and each feature increment
  decides its own page-object mechanics at its own gate.

## Verification

Reproduced on `date-fns` 4.4.0 under TypeScript 7.0.2 strict, with Vitest 4.1.11 and React 19.2.8:

```
parse/format round trip  '08/15/2026' -> 2026-08-15 -> '08/15/2026'      ✅
unparseable              '13/45/2026' -> null (not Invalid Date)          ✅
absent                   null         -> '' (never "Invalid date")        ✅
locale-order explicit    '08/09/2026' as MM/dd/yyyy -> 2026-08-09         ✅
day-first discriminator  '09/08/2026' as dd/MM/yyyy -> 2026-08-09         ✅
fake clock, pinned       daysUntil -> 9   | advanced -> -22               ✅
controlled input, typed  '08/15/2026' -> model 2026-08-15                 ✅   (ADR-009 item 5)
controlled input, bad    '99/99/9999' -> invalid, nothing transmitted     ✅   (ADR-009 item 4)
```

The day-first row is the one that decided the ADR: it is the only test on which the candidates
disagreed.
