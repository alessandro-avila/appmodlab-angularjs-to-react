# ADR-016 — Toolchain: Vite 8, Vitest 4, and oxlint instead of ESLint

- **Status:** proposed — decided at the Tech-Stack Review gate
- **Date:** 2026-08-25
- **Phase:** P → `tech-stack-resolution`
- **Deciders:** product owner, orchestrator
- **Supersedes:** —
- **Depends on:** **ADR-011** (TypeScript 7 — this ADR exists mainly because of it), ADR-008 §3 and
  §6, ADR-012 (the front door is this bundler's dev server), assessment findings **A-1**, **P-8**,
  DevOps constraints **C-1** and **C-2**, increment plan §4.2, §13 items 1, 7 and 8
- **Answers:** ADR-005 follow-on decision 1; §13 items 1, 7, 8

## Context

**A-1: the client has no build step.** `app/index.html` carries 20 hand-written `<script src>` tags
plus 9 vendored bower scripts, loaded serially. Grunt exists only to produce `dist/`. Introducing a
build is *"increment 1's first act"* per ADR-005, and §4.2 puts it in Inc-0 together with the front
door, the two test runners, the linter and CI.

Three tools are needed before Inc-1 can begin: a **bundler**, a **unit runner with a component testing
library** (ADR-008 §3: *"A modern unit runner is introduced in Inc-0, alongside the AngularJS suite,
not in place of it … this ADR requires only that it exist before Inc-1 needs it"*), and a **linter**
(C-2), all wired into **CI** (C-1, ADR-008 §6 — *"the entire safety net depends on a human
remembering"*, which is exactly how §0.6's 17-day silent decay happened).

Two of the three would ordinarily be uncontroversial. The linter is not, and the reason is ADR-011.

## Decision

| Role | Choice | Version |
|---|---|---|
| Bundler + dev server + **front door** | **Vite** | 8.2.1 |
| React integration | `@vitejs/plugin-react` | 6.0.5 |
| Unit / component runner | **Vitest** | 4.1.11 |
| Component testing library | `@testing-library/react` + `jest-dom` + `user-event` | 16.3.2 / 7.0.1 / 14.6.5 |
| DOM environment | `jsdom` | 30.0.1 |
| **Linter** | **`oxlint` + `oxlint-tsgolint`** — *not* ESLint | 1.79.0 / 7.0.2001 |
| Formatter | **Prettier** | 3.9.6 |

### 1. Vite 8 — bundler, dev server and front door

Vite 8 uses **Rolldown** for both dependency optimisation in dev and the production build, with
**Oxc** for transforms. One bundler across both modes, rather than the historical esbuild/Rollup split
— which also removes the CJS-interop inconsistency that split produced.

It is chosen over the alternatives principally because **ADR-012 makes its dev server the front
door**. `server.proxy` accepts regular-expression keys, so §1.2's *"exactly one origin"* and §1.3's
*"the ledger is data, not scattered conditionals"* are satisfied by a configuration object each
increment edits by one row — no extra process, no reverse proxy, nothing to deploy under **Q-12**.
`react-router@8` independently requires **Vite 7+**, so the floor is set from two directions.

### 2. Vitest 4 — unit runner

Chosen for one structural reason ahead of any feature: **it consumes the same `vite.config.ts` as the
build**, so the module resolution, JSX transform and TypeScript handling under test are the ones that
ship. A separate runner with its own transform pipeline is a second source of truth about what the
code means.

It also directly serves §0.6. The pinned-clock repair depends on the test harness controlling time;
`vi.setSystemTime` mocks `Date.*` (and `Temporal.Now.*` when that exists), and ADR-014's verification
shows the date library moving with it in both directions. The browser suites pin the clock through
Playwright's Clock API; the unit suite pins it through Vitest. **Both halves of the suite gain the same
determinism, from the same decision.**

`@testing-library/react` 16.3.2 declares React 19 support and was verified rendering React 19.2.8
components under TypeScript 7 strict.

**Karma, Jasmine and `angular-mocks` are untouched by this ADR.** ADR-008 §2 retires them *in Inc-1*,
alongside `FlightSearchController`, and §3 requires the new runner to sit *alongside* the old one
through the hybrid period. Vitest is added; nothing is removed. Inc-0's exit criteria still include
**19 Karma tests green**.

### 3. The linter — **oxlint, because `typescript-eslint` does not support TypeScript 7**

This is the only genuinely surprising decision in this ADR, and it was found by executing the install
rather than by reading a compatibility table.

**The finding.** `typescript-eslint` declares `peerDependencies.typescript: ">=4.8.4 <6.1.0"`. That
range excludes TypeScript 7. It is not a warning:

```
$ npm install -D eslint@10 typescript-eslint@latest
npm error code ERESOLVE
npm error Found: typescript@7.0.2
npm error Could not resolve dependency:
npm error peer typescript@">=4.8.4 <6.1.0" from typescript-eslint@8.67.1-alpha.17
npm error exit 1
```

Two details make this worse than a version lag. The cap is `<6.1.0`, so it excludes TS 7 **by
construction** rather than by not having caught up. And `typescript-eslint`'s own `latest` dist-tag
resolves to **`8.67.1-alpha.17`** — the published-stable pointer is an alpha, which is a project
mid-transition, not one about to publish a compatible release.

**This matters more than a linter choice normally would**, because ESLint's default parser cannot read
TypeScript syntax at all. Without `typescript-eslint` there is no ESLint-based path to linting `.ts`
and `.tsx` files, type-aware or otherwise. The available responses were: install with
`--legacy-peer-deps` and run a linter against a compiler it disclaims; drop to TypeScript 6.0.3; or
change linters.

**The decision: `oxlint` 1.79.0, with `oxlint-tsgolint` for type-aware rules.** It installs cleanly
alongside TypeScript 7 — `oxlint-tsgolint` peers `>=7.0.2001`, i.e. it targets the native compiler on
purpose — and it was verified doing real work:

```
$ npx oxlint src/lintbait.ts
  eslint(no-unused-vars): Variable 'unused' is declared but never used
  eslint(no-debugger): `debugger` statement is not allowed

$ npx oxlint --type-aware src/lintbait.ts
  … both of the above, plus
  typescript(no-floating-promises): Promises must be awaited, add void operator to ignore
```

**The third diagnostic is the one that justifies the choice on this project's own evidence, not on
performance.** **P-8** records: *"`AuthService.login` returns a `.then()` chain with no rejection
handler; a failed login rejects unhandled. Across all 5 feature services, `.then` appears 9 times and
`.catch` zero times — every error path lives in controllers, and the services silently assume
success."* `no-floating-promises` is precisely the rule that makes P-8 unrepeatable, and it requires
type information. **A linter without type-aware rules would leave the second-largest recurring defect
class in this codebase uncovered.** Choosing oxlint is what keeps that coverage available under
TypeScript 7.

Two supporting points, both secondary: Oxc is already in the dependency tree via Vite 8, so this adds
a tool from a toolchain the project has adopted rather than a new one; and oxlint needs no separate
parser package, so the TypeScript-version coupling that caused this problem does not exist.

**Formatter: Prettier 3.9.6**, not `oxfmt`. Prettier declares no peer dependencies, so it is immune to
the coupling above, and it is stable. `oxfmt` is at **0.64.0** — pre-1.0 — and formatting is the one
part of this toolchain with no upside to being early.

### 4. CI

One workflow from Inc-0, running **both suites** plus lint and typecheck (ADR-008 §6, C-1):

```
tsc --noEmit          typecheck (ADR-011)
oxlint --type-aware   lint
vitest run            React unit tests
karma … --single-run  19 AngularJS tests (until Inc-1 retires them, ADR-008 §2)
cucumber-js           235 baseline scenarios
```

§0.6 is the argument for CI existing at all: the baseline decayed from 235/235 to 189/235 over
seventeen days with zero source changes, *"precisely because nothing ran it."*

## Alternatives considered

### TypeScript 6.0.3 instead, so ESLint keeps working — rejected

The honest framing of the fork: the linter incompatibility is an argument against TS 7, not merely a
consequence of it, and TS 6.0.3 + `typescript-eslint` was verified compatible.

Rejected because it inverts the dependency. It would mean adopting the final release of a superseded
compiler implementation on day one of a brand-new client — taking on a migration debt immediately, in
a project whose entire purpose is discharging one — in order to keep a *linter* plugin. ADR-011 §1
gives the ground for TS 7 (its whole breaking-change surface is JavaScript inference, and this
codebase type-checks zero JavaScript). The linter has a working answer that was executed end to end;
the compiler choice should not be made by the linter's release schedule.

**It remains the fallback**, jointly with ADR-011's: if TS 7 blocks Inc-0, both decisions revert
together, and no source code changes under either.

### ESLint with `--legacy-peer-deps` — rejected

The path of least resistance, and it would probably work. Rejected because it means running a
type-aware linter against a compiler whose maintainers have declared it unsupported, in the increment
that establishes every convention for the project. When a type-aware rule then misbehaves, the first
question is whether it is a bug or the disclaimed pairing — an unfalsifiable position to build a
migration on. `--legacy-peer-deps` also disables the check globally, so the next genuine conflict
passes silently.

### ESLint with syntax-only rules and no type-aware linting — rejected

Even non-type-aware linting of `.ts` needs `@typescript-eslint/parser`, which carries the same cap. And
it would abandon `no-floating-promises`, forfeiting the P-8 coverage that is the main reason to lint
this codebase at all.

### webpack, Parcel, or Rspack — rejected

All can bundle React. None is chosen because **ADR-012 needs the dev server to be the front door**,
Vitest's config-sharing is a Vite property, and `react-router@8` requires Vite 7+ regardless. Nothing
in the FRDs asks for a capability Vite lacks.

### Jest — rejected

Would need its own transform configuration for TypeScript and JSX, creating a second definition of
what the code means, and it does not read `vite.config.ts`. No advantage here to offset that.

### Playwright's component testing instead of Testing Library — rejected

Real-browser component tests are closer to production. Rejected because the baseline already drives a
real browser through Cucumber and Playwright; a second browser-based layer would slow the fast
feedback loop that unit tests exist to provide. jsdom is the right trade at this level, and ADR-008 §1
keeps the 235 scenarios as the primary invariant regardless.

## Consequences

**Positive.**
- One config (`vite.config.ts`) serves build, dev server, front door and unit runner.
- Type-aware `no-floating-promises` closes **P-8** mechanically, at build time, everywhere.
- CI from Inc-0 makes §0.6's silent 17-day decay structurally impossible.
- Vitest and Playwright pin the clock by the same principle, so §0.6's determinism covers both suites.
- 20 serial `<script>` tags and 9 vendored bower scripts (**A-1**) are replaced by one bundle.

**Negative / accepted.**
- **The project's linter is not the ecosystem default.** Rule coverage differs from
  `typescript-eslint`, some ESLint plugins have no oxlint equivalent, and shared configs are not
  portable. Accepted because the alternative is no type-aware linting at all, and because the tool was
  verified doing the specific job P-8 requires.
- **Two of the three tools chosen here are on very recent majors** — Vite 8 and Vitest 4 — layered on
  ADR-011's five-day-old TypeScript 7. The mitigation is that all of them were installed and executed
  together during this decision; the full resolved set is in `specs/tech-stack.md` and reproduced
  below.
- Prettier and oxlint are separate tools where one might eventually serve. Revisit when `oxfmt`
  reaches 1.0; there is no urgency.
- **`@vitejs/plugin-react` 6 peers `babel-plugin-react-compiler@^1`.** The React Compiler is
  **deliberately not enabled**: nothing in the FRDs or the assessment identifies a rendering
  performance problem, and ADR-005 rejected the Performance path outright — *"Profiling code with a
  scheduled demolition date is waste."* Enabling it would be an unmeasured optimisation adopted for
  its own sake. Recorded so the omission reads as a decision.

**Blocked / unblocked.**
- **Unblocks** every tooling item in §4.2 — bundler, front door, unit runner, Playwright config for the
  React side, linter and CI.
- **Closes** §13 items 1, 7 and 8, and ADR-005 follow-on decision 1.
- **Does not touch** ADR-008 §2's Inc-1 retirement of the Karma suite, or §7's test-discipline rules.

## Verification

Every package below was installed into a single project and executed together — this is one resolved
tree, not a list of individually plausible versions:

```
typescript 7.0.2 · vite 8.2.1 · @vitejs/plugin-react 6.0.5 · vitest 4.1.11
react 19.2.8 · react-dom 19.2.8 · react-router 8.3.0 · zustand 5.0.15
zod 4.4.3 · date-fns 4.4.0 · @testing-library/react 16.3.2 · jest-dom 7.0.1
user-event 14.6.5 · jsdom 30.0.1 · oxlint 1.79.0 · oxlint-tsgolint 7.0.2001 · prettier 3.9.6

npm install                                -> 0 ERESOLVE, 0 vulnerabilities
tsc --strict (React + router + store + JSX) -> exit 0
tsc --strict (5 deliberate violations)      -> exit 1, 5 errors
oxlint                                      -> untyped rules fire
oxlint --type-aware                         -> typescript(no-floating-promises) fires   <- P-8
vitest run                                  -> 16/16 passed (7 node + 9 jsdom/React)
```

Contrast, from the same project:

```
npm install -D eslint@10 typescript-eslint@latest   -> npm error ERESOLVE, exit 1
```

That single contrast is the entire argument of §3.
