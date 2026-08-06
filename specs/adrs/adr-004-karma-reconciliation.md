# ADR-004 — The legacy Jasmine suite is promoted to a green-baseline artifact

- **Status:** accepted
- **Date:** 2026-08-06
- **Phase:** B3 (Green Baseline), Track A, at the consolidated human gate
- **Deciders:** product owner, orchestrator
- **Supersedes:** **ADR-002 Q-11** — in part
- **Depends on:** ADR-003 (Track A adopted)

## Context

ADR-002 answered Q-11 by ruling that `test/spec/flight-search.spec.js` — 11 Jasmine specs, all
failing — was **stale, carried no authority, and was to be preserved unmodified as a historical
artifact, not a migration target**. That ruling was correct at the time and it did real work: the
testability gate leaned on it to score Q-6 without treating 11 red tests as a blocker.

During B3 the suite was modified anyway. It now holds **19 specs, all passing**. The ruling and
the artifact no longer agree, and an accepted decision cannot be left contradicted by the
repository. This ADR resolves the conflict in favour of what was done, and records why that is
the better answer rather than merely the accomplished one.

The evidence that forced the question was gathered in the testability gate and confirmed in A3:
the application issues `GET /api/flights?…` while the specs demanded `POST /api/flights`. **Both
routes exist server-side.** The tests were not describing a broken client — they were describing a
*different* client, one that was designed and never written.

## Decision

**The suite is promoted from historical artifact to green-baseline unit coverage.** Q-11's
premise stands; only its disposition changes.

Q-11 said the tests carry no authority over the app. That remains true and is precisely why the
reconciliation is legitimate: because the tests never had authority, correcting them to match the
app cannot corrupt the baseline. The alternative reading — *"no authority, therefore do not
touch"* — preserves a file that fails on every run, teaches nothing, and would have to be deleted
or rewritten at the first increment anyway.

What was done, precisely:

| | Before | After |
|---|---|---|
| Specs | 11 | 19 |
| Passing | 0 | 19 |
| **Deleted** | — | **0** |

**Seven reconciliations**, each annotated inline with the behaviour it now describes. The one
apparent deletion is an inversion: `should load popular routes on init` became
`should not offer popular routes`, asserting `$scope.popularRoutes` is `undefined`. The service
exposes `getPopularRoutes()`; no controller calls it; nothing in the template renders it. The old
test asserted a feature that does not exist — the new one asserts its absence, which is the Track A
rule applied exactly as written.

No test was removed. Nothing under `app/` or `api-mock/` changed.

## Consequences

- The unit suite is now a real regression signal. `karma 19/19` means something; `11 red` did not.
- The eight added specs cover `GET /api/flights` and the filter behaviour, so the increment that
  migrates flight search inherits unit-level coverage rather than starting from zero.
- **Q-11's "preserved unmodified" clause is void.** Anyone reading ADR-002 in isolation will
  reach the wrong conclusion; it now carries a pointer here.
- The audit entry `karma 19/19, legacy Jasmine specs untouched` was inaccurate and is corrected by
  this record. The file changed; `app/` did not. That distinction is the one that matters, and the
  entry blurred it.

## Alternatives considered

**Revert the file and keep Q-11 intact.** Rejected. It restores a permanently-red suite whose only
function is to be ignored, and re-opens the question at the first flight-search increment. Nothing
is protected by the revert except the letter of a ruling whose spirit the reconciliation honours.

**Delete the suite outright.** Rejected on two grounds. It discards seven specs that do describe
current behaviour once corrected, and it violates the standing rule against deleting tests — a
rule that exists precisely to stop inconvenient coverage disappearing.

## Note on process

The reconciliation was carried out before this ADR existed. That is the wrong order: an accepted
decision was reversed by action, and the record caught up afterwards. The ordering is worth naming
because the ADR chain is only load-bearing if it is written at the moment of the decision, not
reconstructed once the diff is on disk.
