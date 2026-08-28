# ADR-024 — Repair four preserved presentation defects

- **Status:** Accepted
- **Date:** 2026-08-28
- **Increment:** Post-cutover (inc-6 follow-up)
- **Supersedes (in part):** ADR-005 §"carried forward unchanged", ADR-013
- **Related:** ADR-001, ADR-002, ADR-022, RISK-001

## Context

The migration completed with 258/258 scenarios green and AngularJS fully removed. A
manual browser walkthrough of the delivered React application then surfaced four
user-visible presentation defects.

Three of them are **faithfully preserved legacy behaviour**, verified against the
AngularJS source:

| # | Defect | Legacy evidence |
|---|---|---|
| D-1 | Page headings are clipped behind the fixed navbar | `app/index.html` used `navbar-fixed-top`; `app/assets/css/style.css` set no `body { padding-top }`. Measured underlap: 13px. |
| D-2 | Notifications accumulate and never disappear | `app/app.js:44-50` pushes onto `$rootScope.notifications` with no `$timeout` and no removal path. |
| D-3 | Flight booking reports `Confirmation: undefined` | `flight-search.controller.js:220` reads `booking.confirmationCode`; the API returns `confirmationNumber`. |

The fourth is **new**, introduced by this migration:

| # | Defect | Cause |
|---|---|---|
| D-4 | The navbar username is illegible (1.05:1 contrast) | Increment 6 added `<span data-testid="nav-identity">` inside a navbar `<li>`. The ported stylesheet only colours `.navbar-brand` and `.navbar-nav > li > a`, so the span inherits `#333` from `body` onto a `#1a237e` bar. WCAG AA requires 4.5:1. |

None of the four was caught by the suite, and the reason is the same in every case:
**every assertion reads `innerText`.** Text content is correct in all four defects. What is
wrong is geometry (D-1), lifetime (D-2), a value that renders as the literal string
`"undefined"` (D-3), and colour (D-4). The green baseline pinned *what the app says*, never
*whether a human can read it*.

D-3 deserves particular note: `flight-search.feature:183` asserts only the message **prefix**,
so the scenario passed against `undefined` and would equally pass against a real code. The
defect survived precisely because the assertion stopped one token short.

## Decision

**Repair all four.**

For D-1, D-2 and D-4 this is a straightforward presentation fix. For D-3 it is a deliberate
reversal of a documented preservation decision, taken on the authority of the product owner
during post-cutover review.

### D-1 — reserve space for the fixed navbar

Add `padding-top` to `body` matching the rendered navbar height. This is a pure layout
correction; no component changes.

### D-2 — notifications expire, and can be dismissed by clicking

Two changes, both chosen specifically to **add no text to the alert**:

1. Each notification auto-dismisses after `NOTIFICATION_TTL_MS`.
2. Clicking an alert dismisses it immediately.

A visible close button (`×`) was **rejected**. `tests/pages/flight-search.page.js` reads
`.notification-area .alert` via `allInnerTexts()` and
`the notification counts every flight that was found` compares the result with
`assert.strictEqual`. A `×` glyph would join that string and break the assertion for
reasons unrelated to the behaviour under test. Auto-expiry and click-to-dismiss change
lifetime without changing text, so every existing assertion holds.

The store already exposed `dismiss(id)` (ADR-013) and a `MAX_NOTIFICATIONS` cap; only the
view changes. The TTL is generous enough that no scenario can observe an alert disappearing
mid-assertion.

### D-3 — read the field the API actually returns

`bookedNotification()` reads `booking.confirmationNumber` instead of the phantom
`booking.confirmationCode`. The parameter type drops the intersection that existed solely to
describe a field that is never present.

This is a **user-visible behaviour change** and is recorded as such: the message changes from
`Flight booked successfully! Confirmation: undefined` to a real code such as
`Flight booked successfully! Confirmation: GT7K2M9XQ4P`.

`src/features/flight-search/flight-search-model.test.ts` asserted the literal `undefined` and
is updated. Because the change alters what a test asserts, it required product-owner approval,
which was given.

The equivalent hotel path (`hotel-booking-model.ts`) already reads `confirmationNumber` and is
unaffected.

### D-4 — colour the navbar identity

Add an explicit rule for non-anchor navbar content so the username matches the nav links
(`#c5cae9`, 8.2:1 against `#1a237e`).

## Consequences

**Positive**

- Headings are fully visible on every route.
- Notifications behave as users expect and no longer obscure the page indefinitely.
- Booking confirmations are actionable rather than showing `undefined`.
- The navbar meets WCAG AA.

**Negative / accepted**

- Three legacy behaviours no longer match the original application. Anyone diffing against
  the AngularJS build will see four intentional differences; this ADR is the record of why.
- One baseline unit assertion changed. That is a contract change, taken deliberately and
  with approval, not a silent edit.
- The Gherkin scenario for D-3 still asserts only a prefix. It is **not** tightened here —
  doing so would widen the change beyond the defect. The gap is noted below.

**Follow-up**

- `FOLLOW-1` — `flight-search.feature:183` asserts a message prefix where it could assert the
  whole message. Tightening it would have caught D-3. Left open deliberately; tightening an
  assertion is a separate decision from fixing a defect.
- The suite has no coverage for geometry, colour, or element lifetime. Three of these four
  defects were invisible to it by construction. Visual-regression coverage is out of scope
  here and is recorded as a known limitation.

## Alternatives considered

**Preserve all four, document them as legacy fidelity.** Rejected by the product owner. The
migration's purpose is a working modern application, not a museum reproduction. Fidelity was
the right default *during* the increments, when it protected against unauthorised drift; it
is not the right default once the cutover is complete and a human has reviewed the result.

**Fix only D-4, the genuinely new defect.** Rejected. D-1 and D-2 are equally visible to a
user and equally cheap to correct. Declining to fix a defect merely because the previous
implementation also had it optimises for the wrong thing.

**Add a visible close button for D-2.** Rejected — breaks `assert.strictEqual` on notification
text, as described above.
