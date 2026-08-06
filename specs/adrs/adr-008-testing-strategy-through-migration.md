# ADR-008: Testing Strategy Through the Migration

- **Status:** accepted
- **Date:** 2026-08-06
- **Deciders:** Product owner (hackathon), spec2cloud orchestrator
- **Related:** ADR-003 (testability gate — Track A), ADR-004 (Karma reconciliation), ADR-005 (path
  selection), ADR-006 (migration order)

## Context

The project has two test suites, and the migration affects them very differently.

**The AngularJS unit suite — 19 tests, one module, terminal.** All 19 live in
`test/spec/flight-search.spec.js` and instantiate `FlightSearchController` through AngularJS's
`$controller` with a hand-built `$scope`. `test/karma.conf.js` loads `angular-mocks`. There is not a
single framework-agnostic assertion in the suite (finding T-1). Coverage is 1 of 6 feature areas —
hotel-booking, itinerary, travel-request, expense and authentication have zero unit tests (T-2).

The runner is also end-of-life: **Karma was deprecated by the Angular team in December 2023**, and
the project pins Karma 1.7.1 (five majors behind) with Jasmine 2.8.0 from 2017 (finding D-7).

**The green baseline — 235 scenarios, all six features, framework-agnostic.** Produced under Track A
(ADR-003) and approved on 2026-08-06: 235 scenarios / 1944 steps, all passing. Scenarios are phrased
in user language and driven through the browser, so **not one of them names AngularJS**. 15 are
server-only and never touch the client at all.

The tension: the unit suite is the only thing testing controller logic directly, and it dies the
moment `FlightSearchController` is deleted in Inc-1. If nothing is decided, Inc-0 or Inc-1 quietly
deletes 19 tests, and the project's stated rule — *never delete a test* — is broken by omission
rather than by decision.

## Decision

**1. The 235-scenario green baseline is the migration's primary invariant.** It runs unchanged in
substance at every increment gate. Per ADR-005's three-way classification, each scenario is
**preserved** (behaviour identical), **superseded** (behaviour deliberately changed — the scenario is
amended with the change recorded), or joined by **net-new** scenarios. The 15 server-only scenarios
are untouched by the migration and act as a continuous control: if they ever fail, the cause is
environmental, not the port.

**2. Karma, Jasmine and `angular-mocks` are retired — not deleted silently.** They remain in place
and green until AngularJS itself is removed. The 19 tests are retired as `FlightSearchController` is
retired, in **Inc-1**, and are replaced in the same increment by React unit tests covering the same
assertions. **Inc-1 does not close until the replacement assertions exist and pass.** Retirement is
recorded against each test in the Inc-1 gate, so the count is auditable rather than implicit.

**3. A modern unit runner is introduced in Inc-0**, alongside the AngularJS suite, not in place of
it. Both run during the hybrid period. The specific runner is a `tech-stack-resolution` decision;
this ADR requires only that it exist before Inc-1 needs it.

**4. Unit-test coverage is authored per increment, closing T-2.** Every migrated module gets unit
tests for its logic — not just flight-search. The gap the AngularJS suite left (5 of 6 features
untested) is not carried forward.

**5. `data-testid` is adopted in every React component**, closing T-3. The baseline page objects
currently select by role, text and DOM id because zero `data-testid` attributes exist — the most
brittle option available. As each module migrates, its page object is re-pointed to stable test ids.
**This is the only permitted change to baseline test code that does not require a behavioural
justification**, because it changes how a scenario finds an element, never what it asserts.

**6. CI runs both suites on every push, from Inc-0.** There is no CI pipeline today (finding C-1) —
nothing runs the 235-scenario baseline automatically, so the entire safety net depends on a human
remembering. The workflow lands in Inc-0 alongside the linter (C-2).

**7. The test-discipline rules already in force continue to apply**: no `test.skip`, no `.only`, no
commented-out assertions, and no modification to a baseline scenario without an explicit behavioural
justification recorded at the increment gate.

## What this means at each gate

| Gate | Must be green |
|---|---|
| Inc-0 | 235 baseline scenarios · 19 AngularJS unit tests · new shell unit tests · lint · CI wired |
| Inc-1 | 235 baseline (flight-search re-pointed) · React flight-search unit tests · **AngularJS suite retired, replacements passing** |
| Inc-2…Inc-5 | 235 baseline (module re-pointed, superseded amended, net-new added) · React unit tests for that module |
| Final | 235+ baseline · React unit tests for all 6 features · zero AngularJS artefacts |

## Alternatives Considered

### Keep Karma running against React

Technically possible — Karma is a browser runner and is not intrinsically Angular-specific. Rejected
because it solves nothing: the 19 tests would still fail, since their dependency is `$controller` and
`angular-mocks`, not the runner. Keeping a deprecated runner (December 2023) pinned five majors
behind, purely to avoid changing a config file, imports a maintenance liability for no benefit. The
runner is not what is holding those tests up.

### Port the 19 tests one-for-one to React

Superficially the most faithful option and it preserves the count exactly. Rejected because the tests
assert against a `$scope` object — they check that `$scope.filteredFlights` has a certain length
after `$scope.applyFilters()` runs. In React there is no `$scope`; that state is internal to a
component or a hook. A one-for-one port would either reach into implementation details (a test that
breaks on every refactor) or quietly become an integration test. **Their intent transfers; their
mechanism cannot.** Inc-1 therefore replaces the assertions rather than the tests, which is why
requirement 2 above is phrased as coverage-equivalence, not file-equivalence.

### Delete the 19 tests at the start of Inc-0

Honest about their fate and removes a dead weight early. Rejected on two grounds. First, they are
green today and cost nothing to keep — deleting a passing test to save effort is exactly the erosion
the test-discipline rules exist to prevent. Second, they are the only direct assertions on
flight-search's filter logic, and flight-search is **Inc-1**, the increment where the React patterns
are established. Having them still running while that module is ported gives a second signal
alongside the baseline. They should die when their subject dies, not before.

### Rely on the green baseline alone; write no unit tests

The most tempting option for a hackathon, and the argument is not weak: 235 browser-driven scenarios
already cover all six features, which is far more behavioural coverage than the 19 unit tests
provide. Rejected on feedback latency. The full baseline takes **11 minutes 12 seconds**. A developer
mid-port needs a signal in seconds, not minutes, and without one the practical outcome is that the
suite gets run rarely and regressions are found late and in bulk. Unit tests are not redundant with
the baseline — they occupy a different point on the feedback curve. The baseline is also
deliberately blind to logic that has no user-visible manifestation.

### Write new tests only for changed behaviour; leave preserved behaviour to the baseline

A narrower version of the previous option, and the closest call here. Rejected because it makes
coverage a function of migration history rather than of risk — a module ported cleanly would end up
with no unit tests, while a module that happened to change would be well covered. That produces
exactly the uneven distribution the project already has (1 of 6 features covered) and would be
locked in for the new codebase.

### Freeze the baseline and forbid all edits to test code

Maximally strict, and it would guarantee that no regression is ever hidden by an edited test.
Rejected because it makes requirement 5 impossible: page objects must be re-pointed to `data-testid`
selectors, and superseded scenarios must be amended when ADR-001/002 decisions deliberately change
behaviour. The rule that actually protects the baseline is narrower and is adopted instead — **a
scenario's assertions may not change without a recorded behavioural justification**, while its
selectors may.

## Consequences

**Positive**

- The 235-scenario baseline gives the migration a continuous, framework-agnostic definition of
  correctness. Every increment has an unambiguous pass/fail.
- The 15 server-only scenarios are a permanent control group across the whole migration.
- T-2 closes: unit coverage goes from 1 of 6 features to 6 of 6.
- T-3 closes: `data-testid` makes the page objects durable instead of brittle.
- C-1 closes in Inc-0: the safety net stops depending on human memory.
- No test is ever deleted without a recorded replacement.

**Negative**

- Two unit runners coexist during the hybrid period, so `npm test` gets more complicated and both
  configurations must be maintained until Inc-1 completes.
- Writing unit tests for five previously untested features is real, unbudgeted work distributed
  across Inc-2 to Inc-5.
- Re-pointing page objects to `data-testid` touches baseline test code in every increment. The narrow
  rule keeps this safe, but it does mean the baseline is not literally frozen, and each gate must
  confirm that only selectors changed.
- The full baseline at 11m12s is too slow for inner-loop use, so CI carries it while developers rely
  on unit tests — meaning a class of integration regression is found at push time, not at save time.

**Neutral**

- The unit runner, assertion library and component-testing approach are not chosen here. This ADR
  states what must be true of them; `tech-stack-resolution` picks them.
