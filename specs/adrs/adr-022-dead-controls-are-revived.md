# ADR-022 — The four dead controls are revived, because ADR-005 already decided to fix them

- **Status:** proposed — decided at the Inc-3 PR Review gate
- **Date:** 2026-08-27
- **Phase:** 2 → increment 3 (`itinerary`), and standing for increments 4 and 5
- **Deciders:** product owner, orchestrator
- **Supersedes:** **ADR-019** — *"Controls the baseline pins as dead stay dead through migration"*,
  entirely. ADR-019 was proposed and never accepted.
- **Depends on:** **ADR-005** (path selection — the scenario classification and the Fix-Bugs
  rejection), ADR-001/ADR-002 (the product-intent decisions ADR-005 refers to), ADR-003 (Track A;
  constraint **C-1**), ADR-013 (`flight:selected` dropped), increment plan **§7.4**
- **Applies to:** the four controls counted at the testability gate

## Context

AngularJS `ng-if` and `ng-repeat` create child scopes. A control inside one writes its `ng-model` to
the child, shadowing the controller's property of the same name; the controller never sees the value
and the control does nothing (finding **P-2**). Four controls are in this condition:

| Control | Module | Increment |
|---|---|---|
| Status filter | itinerary | 3 |
| Add Note | itinerary | 3 |
| Search box | travel-request | 4 |
| Date filter | expense | 5 |

React has no scope chain, so a direct port makes all four start working.

### Why ADR-019 was wrong

ADR-019 argued that a control which starts working *because the framework stopped preventing it* is
an unauthorised behaviour change, and kept all four inert. It reasoned entirely from **mechanism**,
and never checked whether an authorisation existed. One does, in the ADR it claimed to be consistent
with.

**ADR-005's scenario classification, verbatim:**

> | **Supersede** | The scenario encodes a defect that ADR-001/002 already decided to fix | **the four
> dead controls**, `ngRepeat:dupes` blocking hotel booking, SEAM-3/4/5, the un-dismissable alerts |

**And ADR-005's rejection of the Fix-Bugs path:**

> …the overwhelming majority live in code that increment 1 deletes — **the four dead controls**, the
> shadowed alerts, the inert search, the trapped date filter. Fixing them in AngularJS to delete them
> weeks later is pure waste; **they are resolved by being reimplemented correctly.**

The Fix-Bugs path was rejected *on the strength of* these defects being repaired during migration. If
they are not repaired, that rejection loses its basis and roughly forty documented limitations have no
route to resolution at all. ADR-019 did not merely disagree with increment plan §7.4 — it quietly
removed the mechanism by which ADR-005's chosen path delivers.

Increment plan §7.4 was right, and cited ADR-005 correctly.

## Decision

**The four dead controls work in React.** Each is ordinary component state: one value, written by the
control and read by the logic. No scope chain is modelled, simulated, or reproduced.

For increment 3 this supersedes **nine** scenarios (seven `Scenario`/`Scenario Outline` blocks;
the filter outline contributes three):

| Line | Scenario | Becomes |
|---:|---|---|
| `:121` ×3 | *Choosing a status highlights the button but filters nothing* | the filter filters |
| `:133` | *The chosen status never reaches the controller* | it reaches the filtering logic |
| `:139` | `@bypasses-ui` *Set on the controller instead, the filter works* | a UI scenario |
| `:162` | *Typing a note and adding it does nothing at all* | the note is recorded |
| `:170` | *The note I type never reaches the controller* | it reaches the add handler |
| `:175` | `@bypasses-ui` *…credited to nobody in particular* | credited to its author |
| `:187` | `@bypasses-ui` *shown immediately but never stored* | shown **and** stored |

**`@bypasses-ui` reaches zero across the whole suite.** Every scenario that carried it existed only to
reach behind a dead control; with the controls reachable there is nothing left to reach past. This is
what increment plan §7.4 predicted and what ADR-019 would have prevented.

## The distinction is authorisation, not mechanism

This is the correction ADR-019 most needed, and it cuts both ways.

`flight:selected` is dead code of *exactly the same kind*: a listener that never runs because the two
controllers are never alive at once. It is **dropped**, not revived — ADR-013 maps it to no store
concern, `hotel-booking.feature:209` pins the absence of the pre-fill, and increment plan §2.4
requires Increment 2 to satisfy that **by construction**. When the instruction for Increment 2 asked
for the pre-fill to be restored, it was refused for this reason and the refusal still stands.

The difference between the two is not how dead the code is, nor how easily React would revive it. It
is whether a recorded decision says the behaviour should exist:

| | Dead in AngularJS | Revived in React? | Because |
|---|---|---|---|
| The four dead controls | yes | **yes** | ADR-001/002 decided to fix them; ADR-005 classifies them Supersede |
| `flight:selected` pre-fill | yes | **no** | no decision authorises it; ADR-013 drops it |

ADR-019's rule — *"where a baseline scenario pins a control as dead, keep it dead"* — cannot
distinguish these, because a baseline scenario pins both. Only the authorisation can. A green-baseline
scenario records what the application does; it does not by itself decide what the application should
do. Under **ADR-003** the baseline is the specification *for behaviour nothing else has decided*;
where ADR-001/002 have decided, they govern, and the scenario is superseded rather than obeyed.

## Two repairs travel with Add Note

Both are named by increment plan §7.4 and are consequences of the control becoming reachable.

**Attribution (row 22, ADR-003 C-1).** The legacy credited a note to `$rootScope.currentUser`, which
is assigned only inside the login response handler and never persisted, so on any restored session the
`'You'` fallback won. The note is now credited **by the server**, from the authenticated caller.

This is a stronger repair than the plan anticipated. §7.4 expected attribution to be fixed by
"Inc-0's identity rehydration" — but Inc-0 built no such thing; `auth-store.ts` deliberately preserves
C-1 and schedules the repair for Inc-6, where `authentication.feature:156` and `:165` supersede.
Deriving the author server-side needs no client identity at all, so attribution is correct now
*without* doing Inc-6's work early, and those two scenarios stay green and honest.

**Persistence (row 23).** `POST /api/itinerary-items/:id/notes` read `req.body.notes` while every
client posts `{ text, createdAt }`, so it stored `undefined` — and it replaced the whole array, which
a POST to a collection should not do. It appends now. This is a second, gated extension of the
`api-mock/` exception that ADR-020 opened for Q-6 and SEAM-3.

## Consequences

- Increments **4** and **5** inherit this rule for the travel-request search box and the expense date
  filter. Both are expected to work; neither needs a fresh decision.
- `tests/pages/itinerary.page.js` loses `setFilterByDrivingController` and
  `addNoteByDrivingController`. Nothing needs to reach behind these controls any more.
- The test seam stops exporting `setFilterStatus` and `addNoteDirectly`.
- The itinerary's `@existing-behavior` scenarios that recorded the defects remain in the file as
  superseded entries with ADR-005 named, per ADR-005's own rule that *"a superseded scenario is
  replaced, never deleted silently"*.
- **ADR-019 is superseded, not edited.** Its reasoning is preserved as written so the record shows
  what was decided, when, and on what basis — the same courtesy ADR-011 extended to ADR-005.

## Alternatives considered

**Keep ADR-019 and revive the controls in a later increment.** Rejected: it would leave Increment 3
shipping a React itinerary whose two headline defects are deliberately re-engineered back in — code
written specifically to reproduce a scope chain that no longer exists. That code is pure cost, and
every increment that touched the module would have to preserve it.

**Revive the controls but keep the baseline scenarios unchanged.** Impossible; they assert the
defects. Superseding them is what ADR-005 requires.

**Treat the green baseline as absolute.** Rejected on ADR-005's own framing: *"the 235 scenarios are a
reference, not a contract to reproduce verbatim"*, and the planner "must classify every scenario
before an increment is written". ADR-019 effectively promoted the baseline above the decisions the
baseline was gathered to inform.
