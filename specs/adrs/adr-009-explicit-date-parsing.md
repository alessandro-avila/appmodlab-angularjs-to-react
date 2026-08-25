# ADR-009: Explicit Date Parsing

- **Status:** proposed — decided at the Plan Review gate
- **Date:** 2026-08-23
- **Deciders:** Product owner (hackathon), spec2cloud orchestrator
- **Supersedes:** —
- **Related:** ADR-005 (path selection — Modernize to React), ADR-006 (migration order), ADR-007
  (eliminating direct DOM manipulation — category 1, the date input), ADR-008 (testing strategy),
  ADR-003 (testability gate — constraint C-2, the open datepicker blocks the submit button)
- **Increment plan:** `specs/increment-plan.md` §11.1

## Context

The migration recorded in ADR-005 preserves behaviour except where a prior decision changes it.
Q-1…Q-12 and SEAM-1…SEAM-5 authorise most of the behaviour change in the plan; ADR-007 authorises
the rest. Scanning the Phase A modernization assessment for behaviour changes it proposes that **no
prior decision authorises**, exactly one survives: **D-9, date handling**.

### What the source actually does

The assessment's one-line version (*"`moment(newVal)` on a user-entered date with no format string;
Moment falls back to `new Date()`, logs a deprecation warning, and parses locale-dependently"*) is
close but not accurate, and the inaccuracy matters to the decision. Traced through the source:

1. `app/components/flight-search/flight-search.template.html:57` is
   `<input type="text" id="departDate" class="form-control" placeholder="mm/dd/yyyy"
   ng-model="searchParams.departDate" required />` — a **plain text field, freely typeable**.
2. `flight-search.controller.js:72` upgrades it with jQuery UI:
   `$('#departDate').datepicker({ minDate: 0, dateFormat: 'mm/dd/yy', onSelect: … })`.
3. **Choosing from the calendar** fires `onSelect`, which runs
   `$scope.searchParams.departDate = new Date(dateText)` at `controller:77` — a **native parse of a
   non-ISO `mm/dd/yyyy` string**. ECMA-262 leaves the result of parsing a non-ISO string
   implementation-defined.
4. The resulting `Date` object then reaches `moment(newVal)` at `controller:47`. Because the input is
   a `Date` and not a string, **moment parses it deterministically and logs nothing**.
5. **Typing** into the field never fires `onSelect`. `ng-model` binds the raw **string**, and
   `moment("08/15/2026")` at `controller:47` falls back to `new Date()` and logs the deprecation
   warning the README records under *Known Legacy Debt*.
6. `tests/pages/flight-search.page.js:7-11` documents why the green baseline never types a date:
   *"Dates are driven through the jQuery UI calendar widget, never by typing. … a typed value never
   fires `onSelect`, so the Angular model would stay null while the field looked filled."*

### The consequences of (5) and (6)

**The loose-parse path is real but unobserved.** No baseline scenario reaches it, because typing a
date is itself broken: the field fills, the model stays null, and the search then fails validation
for a date the user can see on screen.

That is precisely why this needs an ADR. Without one, "React parses dates explicitly" would arrive as
an *undocumented* change to a code path no test covers — the failure mode ADR-005 exists to prevent.

### Measured scope

| Fact | Measured against the working tree |
|---|---|
| moment call sites in `app/` | **79** — 76 in live files, 3 in Q-10 dead files *(the assessment's D-9 says 77)* |
| jQuery UI datepicker init sites | **8 live** — 2 each in flight-search, hotel-booking, travel-request, expense — plus 4 in the abandoned `date-picker.directive.js` (Q-10, 0 consumers) |
| Format-less `moment(x)` parse sites | **flight-search** `:47`, `:48`, `:107`, `:109`, `:241`; **hotel-booking** `:47`, `:48`, `:115`, `:116`, `:197`, `:198`, `:227`, `:228`, `:260`, `:268`, `:269`; **itinerary** `:33`-`:36`, `:65`, `:72`, `:73`, `:186`, `:214`-`:216`; **travel-request** `:52`, `:53`, `:59`, `:60`, `:150`, `:151`, `:169`-`:171`, `:211`, `:251`; **expense** `:108`, `:110`, `:115`, `:117`, `:164`, `:193`, `:198`, `:262`, `:322`, `:324` |
| Baseline scenarios pinning raw-`Date` display | **4** — `flight-search.feature:91`, `hotel-booking.feature:51`, `expense-reconciliation.feature:88`, `expense-reconciliation.feature:280` |
| Baseline scenarios pinning the loose parse | **0** |

## Decision

**Dates are parsed with an explicit format at every input boundary and rendered with an explicit
format at every output boundary. A value that does not parse is a validation failure, and never an
`Invalid Date` that flows onward.**

Concretely:

1. **Input.** Every date entry point parses its text with a named format. No implicit
   `new Date(string)`, no format-less parse of a string.
2. **Output.** Every date rendered to a user is formatted explicitly. A `Date` object never reaches
   the DOM via default stringification.
3. **Absence.** An absent date renders as absent. It does not render as the literal text
   `"Invalid date"`, which is what `moment(undefined).format(...)` produces today
   (`expense-reconciliation.feature:88`).
4. **Failure.** An unparseable value becomes a form validation error at the point of entry. It does
   not reach the API. Today `moment(params.departDate).format('YYYY-MM-DD')` at
   `flight-search.controller.js:107` would transmit the string `"Invalid date"`.
5. **Typing works.** The React date input is controlled, so typing updates the model. This is
   net-new: today a typed date leaves the model null while the field looks filled.

**This ADR does not choose a date library.** It decides *explicit parsing*. Which package performs
the parsing is a `tech-stack-resolution` decision (Phase 1d), constrained only by the requirement to
support explicit parse and format patterns. Native `Intl` for formatting is in scope for that
decision.

**Relationship to ADR-007.** ADR-007 category 1 replaces the 8 jQuery UI datepicker sites with one
shared React date component in Inc-0. That decision is about **DOM ownership**. This decision is
about **parse semantics**. They land in the same component and are separate decisions: a shared date
component built on implicit parsing would satisfy ADR-007 and violate this ADR.

## Why this is a change and not a fix

A user in a locale where `08/09/2026` means **8 September** currently gets **9 August**, because the
engine reads the non-ISO string month-first. Explicit parsing makes the interpretation deterministic
and stated — and, for that user, **different**. Changing what date a user's input means is
user-visible by any definition.

It therefore needs the three things ADR-005 requires of a deliberate behaviour change: a Gherkin
delta, an ADR (this document), and a note in the affected FRDs.

> The rule this illustrates: **behaviour changes are allowed; undocumented behaviour changes are
> not.** The green baseline catches this either way. The ADR is what makes the failure *expected*
> rather than a regression.

## Gherkin delta

Four scenarios superseded, three net-new, across three increments. Full context in
`specs/increment-plan.md` §5.3, §6.5, §9.3, §11.1.

| Increment | Feature file | Scenario | Class |
|---|---|---|---|
| 1 | `flight-search.feature:91` | *A chosen date is shown as a raw date string, not as a calendar date* — asserts the field reads `"Tue Aug 25 2026"` followed by a time and time zone | **SUPERSEDE** |
| 1 | *(new)* | A typed departure date is accepted | **NET-NEW** |
| 1 | *(new)* | An unparseable typed date is refused with a message | **NET-NEW** |
| 2 | `hotel-booking.feature:51` | *A chosen date is displayed as a raw JavaScript date string* | **SUPERSEDE** |
| 5 | `expense-reconciliation.feature:88` | *A report with no submission date renders the words "Invalid date"* | **SUPERSEDE** |
| 5 | `expense-reconciliation.feature:280` | *Picking an expense date fills the field with a raw JavaScript date string* | **SUPERSEDE** |
| 5 | *(new)* | An absent submission date renders as absent, not as text | **NET-NEW** |

Counted in `specs/increment-plan.md` §5.3 (Inc-1: 1 supersede + 2 net-new), §6.5 (Inc-2: 1
supersede) and §9.3 (Inc-5: 2 supersede + 1 net-new).

Each superseded scenario is **rewritten in place** in its feature file, its `@existing-behavior` tag
swapped for the increment tag, with `ADR-009` named in the scenario. The original is preserved in git
history. None is deleted (ADR-005).

**travel-request takes no Gherkin delta from this ADR.** It has 2 datepickers but no scenario pinning
raw-date display. Its date rule — `travel-request.feature:174`, *"Return date must be after departure
date."* — is **PRESERVE**: the rule is unchanged; only the parse beneath it becomes explicit. The
same is true of `flight-search.feature:71` and `:78`, the return-date consistency scenarios.

## Alternatives Considered

### Bug-compatibility — reproduce the loose parse exactly

Keep the current semantics: parse non-ISO strings the way the engine does, and let the result vary by
input shape. **Rejected.** It requires deliberately writing implementation-defined behaviour into new
code, and it cannot be specified — there is no format string that means "whatever the engine decides".
It would also make the four raw-`Date` display scenarios permanent, meaning the React app must render
`"Tue Aug 25 2026 00:00:00 GMT+0200 (Central European Summer Time)"` into a form field forever. The
scenarios pin *breakage*, not a requirement.

### Change the parse but keep the raw-`Date` display

Parse explicitly, then render with default stringification so the four display scenarios stay green.
**Rejected as incoherent.** It preserves the ugliest observable consequence of the old design while
discarding the design, and it makes the field unreadable for no benefit. If the display is preserved,
these scenarios should have been PRESERVE and the ADR unnecessary; they are not.

### ISO-only input

Require `yyyy-mm-dd` in every date field and reject everything else. **Rejected as scope creep.**
Unambiguous, but it changes every date field's contract with the user, invalidates the
`placeholder="mm/dd/yyyy"` in four templates, and would supersede far more than four scenarios. The
decision here is *explicit*, not *ISO*. Which format each field accepts is an implementation
detail settled per increment against the placeholder already on screen.

### Defer to `tech-stack-resolution` with the date-library choice

Let Phase 1d decide parsing semantics along with the package. **Rejected.** The two are different
kinds of decision. The package is reversible — swapping date libraries is a mechanical change behind
one shared component. The parse semantics are **user-visible** and change what four baseline
scenarios assert. Bundling a behaviour change inside a library choice is how behaviour changes get
made silently, which is the exact failure ADR-005's Supersede rule exists to prevent.

## Consequences

**Positive**

- Date interpretation becomes stated rather than inherited from the engine.
- The moment deprecation warning documented in the README disappears, along with moment itself
  (79 call sites).
- Typing a date starts working, closing a defect (`ng-model` binds a string the datepicker never
  wrote) that the baseline could not even express, because the harness had to avoid typing to work
  around it.
- `"Invalid date"` stops being a value that can appear in a table cell or reach the API.
- Constraint **C-2** from ADR-003 (the open jQuery UI datepicker swallows pointer events and blocks
  the submit button) disappears with the widget, simplifying every page object that dismisses it.

**Negative / accepted**

- **A user in a day-first locale may get a different date than today.** This is the change. It is
  accepted in favour of determinism, and it is the reason this ADR exists.
- Four baseline scenarios are superseded and must be rewritten with review, in three different
  increments — so this ADR stays open across most of the migration rather than closing in one.
- Three net-new scenarios must be authored and pass the Step 1b gate.

**Neutral**

- The date library is unresolved and remains a Phase 1d decision.
- Server-side date handling is untouched. `api-mock/server.js` is out of scope per ADR-005, and no
  finding is raised against it.

## Follow-on

- `tech-stack-resolution` selects the date library, constrained by the *Decision* section.
- Inc-0 builds the shared date input satisfying **both** ADR-007 category 1 (DOM ownership) and this
  ADR (parse semantics).
- Inc-1, Inc-2 and Inc-5 carry the Gherkin delta above through the Step 1b gate.
- `specs/frd-flight-search.md`, `specs/frd-hotel-booking.md` and
  `specs/frd-expense-reconciliation.md` record the change in their date-entry requirements
  (`specs/increment-plan.md` §5.4, §6.6, §9.4).
