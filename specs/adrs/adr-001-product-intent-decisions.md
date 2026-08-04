# ADR-001 — Product intent decisions for the GlobalTravel portal migration

- **Status:** accepted
- **Date:** 2026-08-04
- **Phase:** B2a (Spec-Enable — PRD generation)
- **Deciders:** product owner
- **Supersedes:** —

## Context

Phase B1 extraction documented the `globaltravel-portal` codebase as-is. Generating the PRD
(`specs/prd.md`) surfaced twelve questions the **code cannot answer** — points where the
implementation contradicts itself, or where a field, route or vocabulary exists but nothing
consumes it. Each was recorded either in an extraction artifact's *Not determinable from source*
section or as a contradiction between two parts of the codebase.

Seven of them (Q-1 … Q-7) are blocking for B2b (FRD generation), because each decides whether an
observed behaviour is:

- a **defect to fix** — the code is wrong and the migration target differs from today, or
- **intended behaviour** — the code is right and the Track A green baseline must capture it as-is.

That distinction propagates into every FRD, every Gherkin scenario and every increment. Resolving
it by inference would silently write a product decision into the specification under the guise of
an extraction finding, which the brownfield rules explicitly forbid ("extraction is not
assessment"; "existing code is truth" applies to *what is*, not to *what should be*).

The questions were put to the product owner with a recommended answer for each, framed for a
time-boxed hackathon context: fix the cheap correctness defects and the one central product seam,
and keep out of scope anything requiring a new UI surface or a rules engine.

## Decision

| # | Question | Decision |
|---|----------|----------|
| Q-1 | Is a manager an approver? | **No** — the approval chain is informational; nobody acts on it |
| Q-2 | Is travel policy advisory or blocking? | **Display-only** — publish the limits, never compare |
| Q-3 | Should a booking create an itinerary item? | **Yes** — a booking must persist and appear on the itinerary |
| Q-4 | Which expense category vocabulary is canonical? | **The 5 lowercase server values** |
| Q-5 | Link an expense report to its travel request? | **Optional** — populate `travelRequestId` when one exists |
| Q-6 | What is a trip's cost? | **Server recomputes from items** — both current values are wrong |
| Q-7 | Is data private to its owner? | **Yes** — scope every collection to the authenticated user |

### Effect on the five product seams

| Seam | Extraction finding | Disposition |
|------|-------------------|-------------|
| SEAM-1 | Travel policy published, never enforced | **Accepted** (Q-2) — capture as-is in the green baseline |
| SEAM-2 | No approve/reject endpoint | **Accepted** (Q-1) — capture as-is; `tr-2`'s completed approvals are fixture data with no producing code path |
| SEAM-3 | Bookings persist nothing | **Defect to fix** (Q-3) — the core product promise |
| SEAM-4 | Expense `approved` counted, never written | **Defect to fix** — follows from Q-3's persistence work and Q-4's vocabulary fix |
| SEAM-5 | `travelRequestId` never populated | **Defect to fix, non-blocking** (Q-5) |

## Consequences

**Positive**

- B2b (FRD generation) is unblocked; no FRD needs to carry an unresolved product question forward.
- The Track A green baseline has an unambiguous target: SEAM-1 and SEAM-2 are captured as passing
  tests describing current behaviour; SEAM-3 / SEAM-4 / SEAM-5 are captured as current behaviour
  first, then changed under a red-green cycle in a later increment.
- Q-4, Q-6 and Q-7 are low-cost, high-clarity fixes that remove genuine data-consistency and
  data-isolation defects.

**Negative / accepted trade-offs**

- Q-1 = no and Q-2 = display-only leave the portal with a travel-request workflow that can never
  reach a decision, and a policy that constrains nothing. This is a deliberate scope boundary, not
  an oversight. The product remains, in these two respects, a front office over a mock back office.
- Reversing Q-1 or Q-2 later is **not additive**: F-013 and F-014 and every FRD derived from them
  would need regeneration, and new endpoints, new UI and new Gherkin would be required.
- Q-7 introduces per-user filtering that the current single-seeded-owner fixture data cannot
  meaningfully exercise. Test data must be extended with a second owner for the isolation
  scenarios to have any assertive power.
- Q-6 changes `Trip.totalCost` from a stored field to a derived one, which is an API-visible
  behaviour change for any consumer relying on the stored `2450` / `1800` values.

**Neutral**

- Q-8 … Q-12 remain open. Q-12 (production datastore, API base URL, deployment target) blocks any
  cloud-native or deployment increment and must be answered before Phase P planning for that path.

## Evidence

Every contradiction underlying these questions is cited in `specs/prd.md` §Open Questions against
the Phase B1 extraction artifacts (`specs/docs/**`, `specs/contracts/api/*.yaml`), which were
themselves approved at the B1 human gate on 2026-08-03.
