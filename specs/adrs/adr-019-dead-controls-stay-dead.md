# ADR-019 — Controls the baseline pins as dead stay dead through migration

- **Status:** proposed — decided at the Inc-3 PR Review gate
- **Date:** 2026-08-27
- **Phase:** 2 → increment 3 (`itinerary`), and standing for increments 4 and 5
- **Deciders:** product owner, orchestrator
- **Supersedes:** the supersede classifications in increment plan **§7.4** for the eight dead-control
  scenarios listed below. It does **not** supersede any ADR.
- **Depends on:** ADR-003 (Track A — the baseline is the specification), ADR-005, ADR-008 (testing
  strategy), finding **P-2** (scope-inheritance shadowing)
- **Applies to:** the four dead controls counted at the testability gate

## Context

AngularJS `ng-if` and `ng-repeat` create **child scopes**. A control inside one writes its `ng-model`
or assignment to the child, shadowing the controller's property of the same name. The controller never
sees the value; its `$watch` never fires; the control looks alive and does nothing. Finding **P-2**.

**React has no scope chain.** Port such a control naively and it becomes ordinary component state — it
starts working. Not because anyone decided it should, but because the defect was an artifact of the
framework being left behind. Step 04 counted **four** controls in this condition:

| Control | Module | Increment | Mechanism |
|---|---|---|---|
| Status filter | itinerary | 3 | `ng-if="itinerary && selectedTrip"` child scope (`itinerary.template.html:85`, buttons at `:124-131`) |
| Add Note | itinerary | 3 | `ng-repeat="item in day.items"` row scope (`:146`, input at `:187`) |
| Search box | travel-request | 4 | same class |
| Date filter | expense | 5 | same class |

### The plan and the instruction disagree

Increment plan **§7.4** classifies eight itinerary scenarios as SUPERSEDE, on the reasoning
*"React has no scope chain; the filter works"*, authorised by ADR-005's *"the four dead controls"*.

The instruction governing this increment says the opposite:

> *"That is a user-visible behaviour change and it needs authorising, not inheriting. Where a baseline
> scenario pins a control as dead, keep it dead and say so. Where none does, stop and ask before
> making it work."*

This is not an oversight on either side. The lab records the correction and its cause
(`b6c90a9`):

> *"These prompts were scaffolded before the green baseline existed, from assumptions about what the
> legacy app did. The baseline then proved several of those assumptions wrong."*

§7.4 was written from the same pre-baseline assumptions. The baseline is the later and better
evidence, and under ADR-003 it is the specification.

## Decision

**Where a green-baseline scenario pins a control as inert, the React port reproduces the inertness.**
Reviving a dead control is a product decision, taken deliberately, with its own authorisation — never
a side effect of changing framework.

For increment 3 this preserves **eight** scenarios that §7.4 would have superseded:

| Line | Scenario |
|---:|---|
| `:121` ×3 | *Choosing a status highlights the button but filters nothing* (Confirmed / Pending / Cancelled) |
| `:133` | *The chosen status never reaches the controller* |
| `:139` | `@bypasses-ui` *Set on the controller instead, the filter works — and keeps whole days* |
| `:162` | *Typing a note and adding it does nothing at all* |
| `:170` | *The note I type never reaches the controller* |
| `:175` | `@bypasses-ui` *Added through the controller, a note is credited to nobody in particular* |
| `:187` | `@bypasses-ui` *A note is shown immediately but never stored* |

`@bypasses-ui` therefore stays at **3**, where §7.4 predicted **0**. The tag survives because the
controls it reaches past survive.

## How inertness is reproduced

The scope chain is modelled explicitly, because that is what the scenarios assert. Each dead control
gets **two** pieces of state, standing in for the two scopes:

- **the child-scope value** — what the control writes and what the interface reflects. The filter
  button still highlights; the note box still holds what was typed.
- **the parent value** — what the logic reads. It is never written by the control.

`applyFilter()` reads the parent value, so filtering never happens. `addNote()` reads the parent
`newNote`, finds it empty, and returns at its guard — no request, no note, no notification. Both
functions are otherwise **correct and complete**, which is what the three `@bypasses-ui` scenarios
prove when they set the parent value through the test seam and watch the logic work.

This is deliberate defect reproduction, and it is commented as such at each site so that a later
reader cannot mistake it for a mistake.

## Consequences

- Increment plan §7.4's supersede table is wrong on these eight rows and is corrected by this ADR.
  §7.4's *"`@bypasses-ui` drops from 3 to 0"* is likewise wrong; it stays at 3.
- Increments 4 and 5 inherit the rule for the travel-request search box and the expense date filter.
- Each revival remains available as its own increment, with its own Gherkin delta, whenever the
  product owner wants the control to work. Nothing here forecloses that; it only refuses to do it by
  accident.
- The migration's central claim stays true: **the only behaviour that changes is behaviour someone
  decided to change.**

## Alternatives considered

**Follow §7.4 and revive the controls.** Rejected: eight scenarios would change with no product
decision behind them, and the app would ship a status filter and a note composer that no one has
specified, tested against intent, or asked for. "The framework stopped preventing it" is not a
requirement.

**Revive them but keep the scenarios by rewriting them.** Rejected as the same change wearing a
disguise — it alters what the product does and then edits the evidence to match.

**Delete the dead controls from the UI.** Tempting, and genuinely better product design, but it is
still an unauthorised behaviour change: `:121` asserts the button is present and highlights. Removing
the control fails the scenario just as surely as making it work. Also available later, as its own
decision.
