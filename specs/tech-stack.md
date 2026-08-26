# Target Stack — `globaltravel-portal` AngularJS 1.6 → React 19

- **Status:** proposed — awaiting the **Tech-Stack Review gate**
- **Date:** 2026-08-25
- **Produced by:** `tech-stack-resolution`, Phase P
- **Inputs:** ADR-005 (path selection), ADR-006…ADR-010, `specs/increment-plan.md` §13,
  `specs/assessment/modernization.md`, six FRDs, the 235-scenario green baseline
- **Decisions taken here:** **ADR-011** … **ADR-016**

> **Every version below was installed into one project and executed together.** Nothing is quoted
> from memory or from a compatibility matrix. Where a decision turned on behaviour, the behaviour was
> run — see each ADR's Verification section. The single resolved tree is reproduced in ADR-016.

---

## 1. The resolved stack

| Concern | Choice | Version | Decision |
|---|---|---|---|
| UI framework | `react` + `react-dom` | 19.2.8 | ADR-005 |
| **Language** | **TypeScript, `strict`** | **7.0.2** | **ADR-011** |
| Routing | `react-router`, Declarative mode | 8.3.0 | ADR-012 |
| Client state | `zustand` (vanilla store) | 5.0.15 | ADR-013 |
| Dates | `date-fns` + native `Intl` | 4.4.0 | ADR-014 |
| **Runtime response validation** | `zod` | 4.4.3 | ADR-011 §4 |
| Data fetching | one `fetch` client — no library | — | ADR-011 §4, §5 below |
| Token persistence | `localStorage['authToken']` | — | **ADR-015** *(accepted, open risk)* |
| Bundler / dev server / front door | `vite` (Rolldown + Oxc) | 8.2.1 | ADR-016, ADR-012 §2 |
| React integration | `@vitejs/plugin-react` | 6.0.5 | ADR-016 |
| Unit / component runner | `vitest` | 4.1.11 | ADR-016 |
| Component testing | `@testing-library/react` · `jest-dom` · `user-event` | 16.3.2 · 7.0.1 · 14.6.5 | ADR-016 |
| DOM environment | `jsdom` | 30.0.1 | ADR-016 |
| **Linter** | **`oxlint` + `oxlint-tsgolint`** | 1.79.0 · 7.0.2001 | **ADR-016 §3** |
| Formatter | `prettier` | 3.9.6 | ADR-016 |
| Styling | Bootstrap 3 CSS, carried forward | 3.3.7 | ADR-005; §13 item 8 |

**Runtime floors, all verified on the host (Node 22.22.2):**

| Floor | Imposed by |
|---|---|
| **Node ≥ 22.22.0** | `react-router@8` — the host clears it by two patch versions. **`engines` must be pinned in `package.json` in Inc-0.** |
| React ≥ 19.2.7 | `react-router@8` |
| Vite ≥ 7 | `react-router@8` |
| ESM-only | `react-router@8` |

---

## 2. The legacy ledger — every technology accounted for

**Rule applied:** each row gets a **named replacement** or an explicit **DROPPED**, justified against
an FRD, a baseline scenario or an assessment finding. Popularity is not a justification anywhere in
this table.

### 2.1 Bower runtime dependencies — all 9 leave

| Legacy | Fate | Replacement | Justification |
|---|---|---|---|
| `angular` 1.6.10 | replaced | **React 19.2.8** | ADR-005. The whole 4462-line client is re-authored. |
| `angular-ui-router` 0.4.3 | replaced | **`react-router` 8.3.0** | ADR-012. 7 hash states → real paths; §1.2 makes real paths structural, not cosmetic. |
| `angular-ui-bootstrap` 2.5.6 | **DROPPED** | **none** | **D-8**: *zero* `uib-*` directives, `$uibModal` or `uibDate` references exist anywhere in `app/`. The module is listed at `app/app.js:10` and never used. §13 item 9: *"Do not replace a dependency nothing used."* |
| `jquery` 2.2.4 | **DROPPED** | **none — React owns the DOM** | **P-1**: 46 direct DOM-manipulation sites across 7 categories, retired by **ADR-007**. **P-4**: 8 `$scope.$apply()` calls exist only to drag jQuery events back into the digest cycle. Both disappear with the framework. |
| `jquery-ui` 1.12.1 | **DROPPED** | **shared React date component** (ADR-007 cat. 1) + `date-fns` | Two widgets are used: `.datepicker()` at **8 live sites** (**P-3** — duplicated verbatim across 4 controllers while the purpose-built `date-picker.directive.js` has zero consumers) and `.tooltip()`. One React component replaces all 8. **ADR-014**, **ADR-009**. |
| `bootstrap` 3.3.7 | **CARRIED FORWARD** | itself, unchanged | ADR-005: *"carried forward initially to keep increments honest about scope; replacing it is a separate decision, not a smuggled one."* §13 item 8. Revisit per increment. |
| `restangular` 1.6.1 | replaced | **one `fetch` client** + `zod` | **D-12 / P-12**: five near-identical wrappers (69–103 lines each) differing only in resource name. §13 item 4: one base URL from config, one auth header, one error policy. **ADR-011 §4** adds response validation as the fourth thing it owns. |
| `lodash` 4.17.23 | **DROPPED** | **native JavaScript** | 95 call sites, all of which have ES2022 equivalents. One exception carries a caveat: `_.uniqueId('exp_')` at `expense.controller.js:163` mints expense IDs client-side and **resets to `exp_1` on every page load** (**P-6**). Its replacement is *not* a native equivalent — §11.3 of the plan leaves P-6's disposition to the gate. |
| `moment` 2.18.1 | replaced | **`date-fns` 4.4.0** | 79 call sites (76 live). **ADR-014**; behaviour fixed by **ADR-009**. Moment is in maintenance mode upstream and its format-less parse is the defect ADR-009 exists to eliminate. |
| *(dev)* `angular-mocks` 1.6.10 | retired **Inc-1** | — | Retired with Karma per **ADR-008 §2**, not before. |
| `bower` itself · `bower_components/` (964 files) · `.bowerrc` · `bower.json` | **DELETED at Inc-6** | npm | Untouched until cutover — §4.4: *"not one line of `bower.json`, not one file in `bower_components/`."* |

### 2.2 Build tooling

| Legacy | Fate | Replacement | Justification |
|---|---|---|---|
| `grunt` + `grunt-contrib-concat` / `-uglify` / `-cssmin` / `-copy` / `-watch` | replaced at **Inc-6** | **Vite 8.2.1** | **A-1**: no build step exists for `app/`; Grunt only produces `dist/`. ADR-016. |
| `grunt-contrib-connect` (static server, :8080) | **RETAINED until Inc-6** | then deleted | **Load-bearing during the migration.** It serves the AngularJS document behind the front door (ADR-012 §2). Removing it early would break §1.2's one-origin design. |
| `concurrently` 9.2.4 | **RETAINED** | itself | Already runs `npm:api` + `npm:serve`; gains the Vite dev server as a third process in Inc-0. |

### 2.3 Test tooling

| Legacy | Fate | Replacement | Justification |
|---|---|---|---|
| `karma` 1.7.1 · `karma-jasmine` · `karma-chrome-launcher` · `jasmine-core` | **RETAINED through Inc-0**, retired **Inc-1** | **Vitest 4.1.11** | **ADR-008 §3**: the new runner arrives *alongside*, not instead. **§2**: the 19 tests retire with `FlightSearchController` in Inc-1, and *"Inc-1 does not close until the replacement assertions exist and pass."* Inc-0's exit criteria still require **19 Karma tests green**. |
| `@cucumber/cucumber` 13.2.0 | **RETAINED** | itself | The 235-scenario baseline is the migration's primary invariant (ADR-008 §1). Never replaced. |
| `@playwright/test` `^1.63.0-alpha-2026-07-29` | **RETAINED** — **but see §6, item G-1** | itself | Drives the baseline and supplies the §0.6 Clock API. The **pre-release pin** is raised as a gate item, not changed here. |

### 2.4 Server — unchanged, per ADR-005

`api-mock/server.js` (634 lines) *"survives in structure"*. `express` 4.22.1, `cors` 2.8.6,
`body-parser` 1.20.4 and `jsonwebtoken` 9.0.3 are **retained at their current versions**. No upgrade
is proposed: ADR-005 rejected Cloud-Native and Security as parallel paths, and **Q-12** removed the
deployment that would motivate hardening. The three server-side seams (SEAM-3/4/5) and Q-6/Q-7 are
fixed by the increments that touch their endpoints, not by a dependency change.

**The server stays JavaScript.** ADR-011 applies to the React client only — and that asymmetry is
exactly why runtime response validation is required rather than optional (ADR-011 §4).

---

## 3. Additions, each traced to a finding or an FRD

§13: *"Every entry above traces to a finding or an FRD. Anything that does not, does not go in the
stack."* Applied literally:

| Added | Traces to |
|---|---|
| `typescript` | Clarified product requirement (ADR-011). Restores the build-time contract enforcement ADR-005 booked as a cost. |
| `zod` | **P-7** — the rooms payload has no `id`, and a type declaring one compiles clean. Verified. |
| `react-router` | **A-7** + §1.2 — route ownership is inexpressible without real paths. |
| `zustand` | **P-5** — `$rootScope`, 29 emit sites, no ownership or teardown discipline. |
| `date-fns` | **D-9 / ADR-009** — explicit parse; **§0.6** — must follow a pinned clock. |
| `vite` | **A-1** — no build step; and ADR-012 needs a front door. |
| `vitest` + Testing Library + `jsdom` | **ADR-008 §3**, **T-2** (5 of 6 features have no unit tests). |
| `oxlint` + `oxlint-tsgolint` | **C-2** (no linter) and **P-8** (9 `.then`, 0 `.catch`) — `no-floating-promises` needs type information. |
| `prettier` | **C-2**. |

---

## 4. Not adopted, and why

| Not adopted | Reason |
|---|---|
| **TanStack Query / SWR / any data cache** | **Specified against.** **NFR-F005-003** and **NFR-F007-004**: *"Every submission issues a fresh request; nothing is cached. Because the server generates hotels per call, two identical searches return different result sets."* Against a non-idempotent server, a cache would be observably wrong and would break baseline scenarios. |
| **UI component library** (MUI, Chakra, shadcn…) | §13 item 9 — `angular-ui-bootstrap` had **zero** usages. Replacing an unused dependency is pure addition. ADR-005 carries Bootstrap 3 CSS forward. |
| **Form library** (React Hook Form, Formik) | §13: an **Inc-4** decision, *"made when the travel-request form is visible"*. Not smuggled in now. |
| **Redux Toolkit** | ADR-013 — two concerns (one token, one user, one capped array). Disproportionate. |
| **TanStack Router** | ADR-012 — seven flat, parameter-free paths. A code-generation step for the least demanding routing problem available. |
| **Luxon · Day.js · Temporal** | ADR-014 — Day.js *silently ignores the format string* without a plugin (measured); Luxon's advantage is time zones, which no FRD requires; `Temporal` is `undefined` in Node 22.22.2. |
| **ESLint + `typescript-eslint`** | ADR-016 §3 — `npm ERESOLVE` against TypeScript 7; peer capped at `<6.1.0`. |
| **React Compiler** | ADR-016 — no rendering performance requirement exists, and ADR-005 rejected the Performance path: *"Profiling code with a scheduled demolition date is waste."* |
| **SSR / pre-rendering / Framework mode** | **Q-12** — no deployment target this hackathon. |
| **Azure / Bicep / `azd` / containers** | **Q-12**. ADR-005: Cloud-Native is *deferred, not refuted*, and applies cleanly once the React client exists. |
| **i18n / l10n library** | No FRD requires it. **Q-9** made currency single-value USD, and no locale requirement exists. ADR-009 fixes date *format* explicitly rather than by locale. |
| **`oxfmt`** | Pre-1.0 (0.64.0). Prettier for now. |

---

## 5. Where a response becomes application data

One paragraph, because it is the stack's most important structural property and the one most easily
lost between documents.

**There is exactly one place a payload enters the client: the API client.** It owns the base URL from
configuration (**A-5** — `app/app.js:14` and `auth.service.js:18` currently hold
`http://localhost:3000` as literals), the single `Authorization` header (read from the store outside
React — ADR-013), the single error policy (**P-8**), and **schema validation of every response**
(ADR-011 §4). The TypeScript type is *inferred from the schema*, never declared beside it, so the
checked shape and the claimed shape cannot drift.

**Typing and validation are two mechanisms, not one.** Types are erased at runtime; a declared type is
a claim about the program, not a check on the data. **P-7 is the proof, and it was executed**: a strict
build compiles a cast to a `Room` type declaring `id: string` with exit code 0, while every `r.id` at
runtime is `undefined` and `Object.keys` shows no such field. A generated type would have made the
compiler agree with the bug. The schema is what disagrees with it.

---

## 6. Open for the Tech-Stack Review gate

> [!NOTE]
> **Resolved at the gate on 2026-08-26.** The three rows below marked ✅ are closed; the authoritative
> record is `.spec2cloud/state.json` → `humanGates`. This section is kept as written so the gate's
> inputs stay visible alongside its outputs.
>
> | Item | Ruling |
> |---|---|
> | **§13-16** | ✅ **Settled — ADR-005 governs.** The two stacks never share a document. A correction note is on ADR-006 and the affected bullet is struck through in place. **Increment 0 is unblocked.** |
> | **G-1** | ✅ **Resolved — move `@playwright/test` to stable 1.62.1.** Not "leave the caret and rely on `--save-exact`": the caret itself is the finding, and it survives in `package.json` regardless of how new packages are installed. |
> | **G-3** | ✅ **Resolved — owner is `@alessandro-avila`**, recorded in ADR-015 and `riskRegister`. Naming the owner does **not** close RISK-001, which stays `OPEN`. |
>
> Also settled at the Plan Review gate: the 7-increment shape, and the 14 reproduced defects
> authorised. **Still open:** §13-11, §13-12, §13-14, §13-17 and **G-2**, plus three product
> decisions from the increment plan. None blocks Increment 0.

Items §13 hands to this phase that are **not** stack decisions, plus items this phase discovered.
None is decided here.

| # | Item | Why it is not decided here | Needed by |
|---|---|---|---|
| **§13-11** | **Q-7 ownership enforcement point** — server-side filter or client-side | A product and API-contract decision, not a package choice. If server-side, `authentication.feature:314` supersedes and the *"14 API-only scenarios never edited"* control becomes 13. | before the increment implementing trip ownership |
| **§13-12** | **401 / session-expiry policy** | Behaviour requiring Gherkin through a Step 1b gate. ADR-013 supplies the mechanism; the policy is a product decision. **Supersedes 3 scenarios in Inc-3 and 2 in Inc-5 — it cannot wait for Inc-6.** | **Inc-3** |
| **§13-14** | **ADR-008 §5 extension** — permit page-object **URL** re-pointing on the same footing as `data-testid` re-pointing | Amends ADR-008, which needs the gate's authority. Without it, every feature increment technically violates ADR-008 §7. *(The §0.6 clock pin does not need this — it edits no scenario.)* | Inc-1 |
| ~~**§13-15**~~ | ✅ **RESOLVED 2026-08-26** — recount confirmed at **41** (5/15/18/3) + 2 asset rows = 43 table rows. Correct `modernization.md` and `verifiedCounts` as housekeeping. | — | done |
| ~~**§13-16**~~ | ✅ **RESOLVED 2026-08-26 — ADR-005 GOVERNS.** The two stacks never share a document; each component is fully rewritten. ADR-006 carries a correction note and its bullet is struck through in place. | — | **Increment 0 unblocked** |
| **§13-17** | **Suite clock policy** — confirm the pinned instant, and decide whether CI runs an unpinned canary on a cadence | ADR-014 chooses a library that follows the pinned clock; *which instant*, and whether drift is monitored, is a gate call. The suite decayed silently for 17 days because nothing ran it. | Inc-0 |
| ~~**G-1**~~ | ✅ **RESOLVED 2026-08-26** — pinned **exactly** as `1.63.0-alpha-2026-07-29`, caret removed. The finding was the *caret*, not the version: the baseline is proven green on this build, so downgrading would cost a reinstall and a full re-verification to leave a version that works. | — | done |
| ~~**G-2**~~ | ✅ **RESOLVED 2026-08-26** — `engines.node >= 22.22.0` added to `package.json` in Increment 0. | — | done |
| ~~**G-3**~~ | ✅ **RESOLVED 2026-08-26** — owner is **@alessandro-avila**, recorded in ADR-015 and `riskRegister`; `ownerNamed: true`. Naming the owner does **not** close RISK-001, which stays `OPEN`. | — | done |

---

## 7. What Increment 0 installs

Ordered as §4.2 orders it. **Task 0 comes first and is not tooling**: restore the baseline to green by
pinning the suite clock (§0.6) — one file, `tests/support/hooks.js`, zero feature files, zero
assertions. *Until that is done Inc-0 cannot demonstrate its own zero delta, because it cannot tell a
stale fixture from a regression.*

```jsonc
// added to devDependencies — nothing removed (§4.4)
"typescript": "7.0.2",          "vite": "8.2.1",
"@vitejs/plugin-react": "6.0.5", "vitest": "4.1.11",
"@testing-library/react": "16.3.2", "@testing-library/jest-dom": "7.0.1",
"@testing-library/user-event": "14.6.5", "jsdom": "30.0.1",
"oxlint": "1.79.0",             "oxlint-tsgolint": "7.0.2001",
"prettier": "3.9.6",
"@types/react": "19.2.18",      "@types/react-dom": "19.2.4"

// added to dependencies
"react": "19.2.8", "react-dom": "19.2.8", "react-router": "8.3.0",
"zustand": "5.0.15", "zod": "4.4.3", "date-fns": "4.4.0"

// engines  (gate item G-2)
"engines": { "node": ">=22.22.0" }
```

**Removed in Inc-0: nothing.** Not one file under `app/`, not one line of `bower.json`, not one file
in `bower_components/`, not one Karma package. §4.4: *"This is the increment where 'clean up while
we're here' does the most damage."*

Inc-0's gate is unchanged by this document: **235/235 baseline green**, `git diff -- specs/features/`
**empty**, 19 Karma tests green, React unit tests green, lint clean, `git diff --stat -- app/`
**empty**, and the suite still green **with the host clock advanced**.

---

## 8. Verification summary

| Claim | How it was checked | Result |
|---|---|---|
| The whole stack resolves together | one `npm install` of all 22 packages | 0 ERESOLVE, 0 vulnerabilities |
| Strict mode catches contract defects | 5 deliberate violations through `tsc` | exit 1, 5 errors, 0 missed |
| **Types do not check data (P-7)** | typed-only fetch vs the live API | compiles clean; all 5 `r.id` `undefined` |
| Schema catches the wrong contract | `zod` against the live API | rejected at the boundary, field named |
| Explicit date parse | day-first discriminator `09/08/2026` | date-fns ✅ Luxon ✅ **Day.js ✗** |
| Date library follows a pinned clock | `vi.setSystemTime` | `daysUntil` 9 → −22 |
| Store readable outside React | `authHeader()` / `onUnauthorized()` from a module | ✅ / ✅ |
| Notifications bounded (P-5) | push 12 | capped at 5 |
| Real paths + hash redirect mechanism | `react-router@8` under jsdom | ✅ (shim proven, **not adopted** — ADR-012) |
| Type-aware lint closes P-8 | `oxlint --type-aware` | `no-floating-promises` fires |
| **ESLint against TypeScript 7** | `npm install -D eslint@10 typescript-eslint@latest` | **ERESOLVE, exit 1** |
| Full probe suite | `vitest run` | **16 / 16 passed** |

---

## 9. ADRs produced by this phase

| ADR | Decision | Closes |
|---|---|---|
| **011** | TypeScript, `strict` — **supersedes ADR-005 on language only** | ADR-005's language row |
| **012** | Real paths, `react-router@8` declarative, front door — **legacy hash URLs break** | §13 items 2, 3, 10; follow-on 2 |
| **013** | `zustand` vanilla store; all 5 `$rootScope` events mapped | §13 item 5 |
| **014** | `date-fns` — explicit parsing, clock-controllable | §13 item 6; follow-on 3 |
| **015** | JWT stays in `localStorage` — **accepted, owned, OPEN risk** | §13 item 13 |
| **016** | Vite 8 · Vitest 4 · **oxlint, not ESLint** | §13 items 1, 7, 8; follow-on 1 |

**Still open from ADR-005's follow-on list:** decision 4 (Q-7 enforcement point) and decision 5 (401
policy) — both product decisions, both listed in §6 above.

> **Stop here.** The Tech-Stack Review gate is the next step. No increment begins until it passes, and
> §13-16 (the ADR-005 / ADR-006 conflict) must be settled before Inc-0 in any case.
