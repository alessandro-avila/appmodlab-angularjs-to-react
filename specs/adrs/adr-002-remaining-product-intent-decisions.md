# ADR-002 — Remaining product intent decisions and the migration scope boundary

- **Status:** accepted
- **Date:** 2026-08-05
- **Phase:** B2c (Spec-Enable — spec refinement), at the Refinement Review gate
- **Deciders:** product owner
- **Supersedes:** —
- **Extends:** ADR-001 (which resolved Q-1 … Q-7)

## Context

ADR-001 resolved Q-1 … Q-7 and unblocked B2b (FRD generation). Five questions from
`specs/prd.md` §Open Questions were deferred: **Q-8 … Q-12**. B2c (spec refinement) then raised a
sixth, procedural question about the shape of the authentication FRD.

Two of the deferred questions bite at the **testability gate**, which is the next step after this
one:

- **Q-10** decides what the React migration is obliged to port. Nine registrations are loaded on
  every page and consumed by nothing; if they are product surface they must be carried across, and
  if they are dead they must not be.
- **Q-11** decides whether the existing Jasmine suite has any authority over the Track A green
  baseline. All 11 of its tests fail, and four of its assertions describe behaviour no source file
  implements.

**Q-12** was the only genuinely blocking unknown, because nothing in the repository states a
datastore, base URL or deployment target. It is answered here by a **scope decision** rather than a
technology choice.

The questions were put to the product owner framed for a time-boxed hackathon: prefer the answer
that removes work from the migration without discarding a real product capability.

## Decision

| # | Question | Decision |
|---|----------|----------|
| Q-8 | Is multi-user login in scope? | **Yes** — build the real credential form; the API already implements the check |
| Q-9 | Is multi-currency real? | **No** — single currency (USD). Remove the 6-value selector |
| Q-10 | Are the 9 unreferenced registrations product surface or dead code? | **Dead code** — do not port |
| Q-11 | What did the failing test suite intend to specify? | **Stale** — it has no authority; baseline from observed behaviour |
| Q-12 | Production datastore, API base URL, deployment target? | **Out of scope** — no production deployment for this hackathon |
| Q-B2c | Restructure the 13 unstructured authentication requirements? | **No** — accept as-is; the auth FRD is revised under Q-8 anyway |

### Q-8 — multi-user login is in scope

The login screen takes no input and calls the API with the literal pair
`demo@globaltravel.com` / `password`, while the API performs a real credential check against a
two-user table. The client bypasses its own authentication surface.

The gap is entirely client-side, so closing it costs one form and no server work. The credential
check lives at `api-mock/server.js:273-290`, with the match at `:277`. `UserService`
already declares `getProfile()` and `updatePreferences()` against routes the server does not
declare — those remain out of scope under Q-10.

### Q-9 — single currency

`currency` is stored on every expense and read by nothing; totals are summed across currencies with
no conversion; no rate source exists anywhere in the repository. The 6-value selector is a UI
affordance over a capability that was never built. Removing it eliminates a class of totals that
mix currencies without conversion, rather than deferring it.

### Q-10 — the nine unreferenced registrations are dead code

Re-verified mechanically at this gate, against `app/` at this commit:

| Registration | Declared as | Consumers found |
|---|---|---|
| `app/directives/approval-status.directive.js` | `gtApprovalStatus` | **0** templates |
| `app/directives/currency-input.directive.js` | `gtCurrencyInput` | **0** templates |
| `app/directives/date-picker.directive.js` | `gtDatePicker` | **0** templates |
| `app/filters/*.js` | `usdCurrency`, `gtDateFormat`, `gtTimeAgo`, `gtDuration` | **0** uses each |
| `app/services/api.service.js` | `ApiService` | **0** injections |
| `app/services/user.service.js` | `UserService` | **0** injections |

`ui.bootstrap` is declared as a module dependency (`app/app.js:10`) and used by no template. All
six FRDs already document these as dead; this decision makes the migration consequence explicit.

The 25 of 44 service methods with no caller are covered by the same decision, with one exception:
`ExpenseService.linkToTravelRequest` acquires a caller under ADR-001 Q-5 and must be ported.

### Q-11 — the existing test suite is stale and carries no authority

> ⚠️ **Superseded in part by [ADR-004](adr-004-karma-reconciliation.md) (2026-08-06).** The premise
> below stands — the suite carried no authority. Its disposition does not: the tests were **not**
> preserved unmodified. During B3 they were reconciled to observed behaviour, reaching 19 specs all
> passing, with none deleted. Read ADR-004 before acting on this section.

All 11 Jasmine tests fail. Four assertions describe a `popularRoutes` load on init, a `POST` flight
search, and a `{ airlines, priceRange }` filter shape — none of which any source file implements.
No source states whether the spec led the implementation or the implementation moved away from it.

The Track A green baseline is therefore authored from **observed behaviour of the running
application**, not from the existing suite. The failing tests are preserved unmodified — the
"existing tests are sacred" rule forbids deleting them — but they do not define the baseline and
their failure does not block the gate.

> This is the one decision that could be revisited cheaply: if `POST /api/flights`
> (`api-mock/server.js:333`, recorded as Known Limitation 12 in `specs/frd-flight-search.md`) turns
> out to be what the `POST` flight-search test was written against, the suite may be evidence of an
> abandoned redesign rather than of drift. That does not change the baseline decision.

### Q-12 — no production deployment

Nothing in the repository names a datastore, connection string, environment variable, Dockerfile,
CI workflow, IaC template or host configuration. Rather than invent a production topology, the
product owner has scoped production deployment **out** for this hackathon.

The target of this project is the **AngularJS → React migration**, exercised locally. The mock
Express API (`api-mock/server.js`) and its in-memory fixtures remain the datastore for the duration.

## Consequences

**Positive**

- The testability gate is unblocked. Q-10 and Q-11 were its two open inputs.
- The migration surface shrinks by 9 registrations and 24 uncalled service methods, none of which
  carries product behaviour.
- Q-9 removes a defect class (cross-currency summation) instead of porting it.
- Q-11 prevents the Track A baseline from being anchored to assertions that describe software that
  does not exist.

**Negative / accepted trade-offs**

- **Q-12 removes Phase 2 Step 4 (Verify & Ship) in its Azure form.** No `azd provision`, no
  `azd deploy`, no smoke tests against a live URL, no `infra/` Bicep. The increment definition of
  done becomes *all tests green locally* rather than *deployed and verified*. Any later decision to
  deploy requires a new ADR and a cloud-native assessment that has not been run.
- **Q-8 widens the authentication FRD** rather than narrowing it: a credential form, validation and
  error states are new target behaviour with no current implementation to capture as a baseline.
  F-001 acceptance criteria must distinguish captured behaviour from target behaviour.
- **Q-9 is API-visible.** `currency` remains on the wire as a field; the client stops offering
  alternatives to `USD`. Any consumer that set it to another value would silently change meaning.
- **Q-10 is irreversible in practice.** Once the React port omits the directives and filters,
  restoring one means re-implementing it rather than translating it. The AngularJS originals remain
  in git history.
- **Q-B2c leaves the authentication contracts thinner than the other five features'.**
  13 of 17 requirements stay prose-only, so `contract-generation` has less structured input for
  F-001 than for F-005, F-007, F-009, F-012 and F-015. This is accepted because Q-8 revises the
  authentication FRD regardless, and restructuring before that revision would be rework.

**Neutral**

- Q-1 … Q-7 are unchanged; ADR-001 stands.
- The five product seams keep the dispositions ADR-001 assigned them. Nothing here reopens SEAM-1
  or SEAM-2.

## Evidence

- `specs/prd.md` §Open Questions — the twelve questions and the extraction artifact behind each.
- The Q-10 consumer counts above were produced at this gate by matching each registered directive
  name against its kebab-case form in every `app/**/*.html`, and each registered filter name
  against `| filterName` in every template and controller.
- `specs/frd-*.md` — all six already document the unreferenced registrations as dead; this ADR
  records the migration consequence, not a new finding.
