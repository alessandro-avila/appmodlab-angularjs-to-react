# Step 08 · Increment 0 — the React shell

> **Phase** 2 · Deliver (increment 0) &nbsp;|&nbsp; **Branch** [`lab/08-deliver-inc0-shell`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/08-deliver-inc0-shell) &nbsp;|&nbsp; **Parent** `lab/07-plan`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ✅ Verified

---

## 🎯 Goal

Stand up React 19 + TypeScript + Vite **alongside** the AngularJS app. Migrate **nothing**.

This is the walking skeleton. Its only job is to prove the new stack runs against the same API
before you bet a feature on it. If increment 0 is wrong, increments 1–5 inherit the wrongness
five times over.

> **Success looks boring:** two apps serve independently, a trivial React page renders against
> the real API, and every `@existing-behavior` scenario still passes untouched.

> **Authentication: plumbing only, no *new* surface.** ADR-010 (written during
> [step 07](07-plan.md#adr-010-was-not-on-anyones-list)) split it. Increment 0 takes the token store,
> the `Authorization` header, the route guard, `GET /api/auth/me` identity rehydration (the C-1
> repair) and the 401 path — none of which has a user-visible surface of its own. The auth *surface*
> lands in [cutover](14-cutover.md), because with no in-page bridge the login screen cannot move
> before `/` moves. This increment's Gherkin delta is **0 affected / 235 untouched / 0 new**.
>
> A React `/login` route that *mirrors* the legacy screen — one button, hardcoded demo credentials,
> unreachable because the front door still sends `/login` to AngularJS — is fine, and is what the run
> actually produced. What must **not** appear is the **Q-8 credential form**: real email and password
> inputs, multi-user sign-in. That is net-new behaviour scheduled for Inc-6, and building it here
> would supersede `authentication.feature:43`, `:82` and `:89` five increments early.

> **A strangler fig at the HTTP edge — not inside the page.** This distinction is the whole
> architecture, so be precise about it. ADR-005 rejected mounting React *inside* the AngularJS shell:
> no bundler forced into the legacy client, no `$rootScope` bridge, no dual routing. What it did
> **not** reject is Fowler's original formulation — intercepting at the edge and moving one route at
> a time. That is exactly what gets built here: one origin, two documents, a front door that decides
> which app serves each path. The two stacks coexist in the *repository* and behind one origin, never
> in one page, and the seam between them is the HTTP API.

---

## 🧰 Skills invoked

The full Phase 2 pipeline, in order. No step may be skipped.

| Step | Skill | Output |
|------|-------|--------|
| 1 | `test-generation` | Tests for the shell itself — routing, store, query client |
| 2 | `contract-generation` | Shared types from `specs/contracts/api/*.yaml` |
| 3 | `implementation` | The scaffold |
| 4 | `test-runner`, `build-check` | Verification |
| — | `commit-protocol` | The commit + PR |

---

## ✅ Prerequisites

- [ ] [Step 07](07-plan.md) approved at both gates
- [ ] `specs/increment-plan.md` and `specs/tech-stack.md` exist with resolved versions
- [ ] The green baseline is green **right now** — run it before you start, so you know the
      starting state
- [ ] Node ≥ 20.19 (the container has 22 LTS)

---

## 🌿 Branch setup

```bash
git switch lab/07-plan
git switch -c lab/08-deliver-inc0-shell
git checkout main -- docs/ README.md   # current lab instructions
```

<sub>That third line matters. `docs/` lives on `main`; a `lab/*` branch cut from its predecessor carries whatever `docs/` looked like back then. Increment 0 was run against instructions **1935 lines out of date** because of exactly this — see [step 08](08-deliver-inc0-shell.md#-outcome).</sub>

---

## 🗣️ The prompt

```text
Phase 2, increment 0 — the walking skeleton.

Build the React app the plan and tech-stack call for, running ALONGSIDE the
AngularJS app behind ONE ORIGIN — a front door that decides which app serves each
path — not mounted inside the legacy page, per ADR-005. One origin matters: the
JWT lives in localStorage, which is origin-scoped, so two ports would make a
signed-in user arrive at React as a stranger. Mirror the seven UI-Router states as
routes, all placeholders in this increment. No feature is migrated, and per
ADR-010 no NEW auth surface is built — the Q-8 credential form belongs to Inc-6.
A /login route mirroring the legacy one-button screen is fine; real email and
password inputs are not. AngularJS still serves every route a user can reach.

Two ports of substance:
  - app/services/auth.service.js becomes the auth store — plumbing only. Keep the
    behaviour identical and keep the localStorage key exactly as it is, because the
    Playwright storage state from the green baseline depends on it. The
    $stateChangeStart guard in app/app.js becomes a router guard. Add identity
    rehydration via GET /api/auth/me: today a reload leaves currentUser null while
    the token survives, so consumers silently fall back to 'Demo User'. That is
    constraint C-1, and it fails invisibly rather than loudly.
  - the notification:add handler in app/app.js becomes a notification store.

The API base URL comes from the environment, never hardcoded — it is currently
pinned in app/app.js and that is one of the findings.

This increment fails if any of these break, so check them before you tell me you
are done:
  - nothing under app/, api-mock/ or test/ is modified. git diff on those is empty.
  - npm start still serves the working legacy app.
  - every existing @existing-behavior scenario still passes, unchanged.
  - package.json gains scripts and devDependencies and loses nothing.
  - bower.json, Gruntfile.js and bower_components/ are untouched.

Document how the React app and the legacy app coexist in the repo — two servers, two
entry points, no shared page per ADR-005. Increments 1 to 5 all depend on it and I
need to be able to explain it.

Paste the build, the new test suite, npm test, and the full Playwright
@existing-behavior run against the legacy app. Then stop at the PR Review gate.
```

<details>
<summary><b>Why the constraints are phrased as failure conditions</b></summary>

The agent's instinct at this step is to finish the job — replace `app/index.html`, retire
UI-Router, tidy `package.json`. Any of those breaks the legacy app, which breaks the green
baseline for all five unmigrated modules, in the one increment whose entire purpose is to prove
nothing broke.

Written as *"this increment fails if"* rather than *"please don't"*, they become checkable at the
gate — and the first line of the review checklist is just `git diff app/`.

The other line doing real work is the localStorage key. It is what
`app/services/auth.service.js:22` writes, what `test/spec/flight-search.spec.js:24` seeds, and
what your Playwright storage state captured in [step 04](04-green-baseline.md). Renaming it to
something tidier is a one-word edit that silently breaks all three.
</details>

---

## 📦 Expected artifacts

```
src/                                ← or wherever tech-stack.md put it
├── main.tsx                        ← createRoot (React 19), not ReactDOM.render
├── routes/
│   ├── __root.tsx
│   ├── login.tsx                    ← route only; AngularJS still owns sign-in (ADR-010)
│   ├── dashboard.tsx               ← placeholder
│   ├── flights.tsx                 ← placeholder
│   ├── hotels.tsx                  ← placeholder
│   ├── itinerary.tsx               ← placeholder
│   ├── travel-request.tsx          ← placeholder
│   └── expenses.tsx                ← placeholder
├── lib/
│   ├── api-client.ts               ← fetch wrapper, VITE_API_URL, Bearer token
│   └── schemas.ts                  ← Zod schemas; types are INFERRED from these (ADR-011)
├── stores/
│   ├── auth-store.ts               ← replaces auth.service.js + auth:login/auth:logout
│   └── notification-store.ts       ← replaces notification:add
└── contracts/
    └── api.ts                      ← z.infer<> re-exports, so type and check cannot drift

vite.config.ts
tsconfig.json                       ← strict: true
vitest.config.ts
playwright.config.ts
.env.example                        ← VITE_API_URL=http://localhost:3000/api
package.json                        ← new scripts ADDED, legacy scripts UNTOUCHED
```

### What must **not** appear in the diff

| Path | Why |
|------|-----|
| `app/**` | The legacy app must be byte-identical |
| `api-mock/**` | Backend is out of scope for the whole lab |
| `test/**` | The Karma suite went green in step 04; leave it |
| `bower.json`, `.bowerrc`, `Gruntfile.js` | Deleted at [cutover](14-cutover.md), not before |
| `bower_components/**` | The legacy app loads its dependencies from here |
| Removed lines in `package.json` | Add scripts and devDependencies. Remove nothing. |

### The two mappings that matter

**`auth.service.js` → `auth-store.ts`.** The behaviour must be preserved exactly, because the
`@existing-behavior` scenarios assert on it:

| Legacy | Target |
|--------|--------|
| `localStorage.setItem('authToken', token)` | same key — the Playwright storage state depends on it |
| `$rootScope.$broadcast('auth:login', user)` | store update; subscribers become selectors |
| `$rootScope.$broadcast('auth:logout')` | store update |
| `isAuthenticated()` → `!!localStorage.getItem('authToken')` | same predicate |
| `$rootScope.$on('$stateChangeStart')` guard in `app/app.js:32` | Router `beforeLoad` guard |

> Keep the `authToken` key. Changing it is a one-character edit that invalidates every Playwright
> storage-state fixture you built in step 04.

**`notification:add` → `notification-store.ts`.** Handled globally at `app/app.js:44` today;
published by every controller. In React it is a store with an `add(message, type)` action and a
toast component subscribed to it.

---

## 📤 Outcome

> ✅ **Verified** — branch [`lab/08-deliver-inc0-shell`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/08-deliver-inc0-shell) ·
> [compare with `lab/07-plan`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/compare/lab/07-plan...lab/08-deliver-inc0-shell)

**45 files, +5914 / −164.** First application code in the project.

### The five failure conditions

```
app/  api-mock/  test/  bower.json  .bowerrc  Gruntfile.js
bower_components/  specs/features/  tests/steps/  tests/pages/
                                         ALL 0 LINES CHANGED
```

The only baseline-harness edit is `tests/support/hooks.js` — **45 insertions, 0 deletions.** Purely
additive, as required.

### I re-ran the things that mattered

Not read — executed:

| Check | Result |
|---|---|
| **Full `@existing-behavior` baseline** | ✅ **235 scenarios, 235 passed · 1944/1944 steps · 10m55s** |
| `npm test` (legacy Karma) | ✅ 19/19 SUCCESS |
| `npm run shell:test` | ✅ 7 files, 85 tests |
| `tsc --noEmit` | ✅ exit 0 |
| `npm run shell:lint` | ✅ exit 0, zero warnings |
| `package.json` additive | ✅ **0 removed, 0 changed**, 19 deps + 9 scripts = 28 added |
| Escape hatches in `src/` | ✅ `: any`, `as any`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `eslint-disable` — **all zero** |
| Types inferred from schemas | ✅ 5 × `z.infer<>` |
| Strict flags | ✅ `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals` |

*(One process note: my first `oxlint` run reported warnings because I ran it unscoped and it walked
`bower_components/`. The project's own `shell:lint` script scopes it correctly. My error, not the
agent's.)*

### The baseline was restored — and the decay was still running

It ran the baseline **before** touching anything: **188/235, 47 failed.** The plan predicted 189/235
on 2026-08-23. This run was the 26th — one more calendar day had drifted past, so **exactly one more
scenario had broken.** The decay §0.6 diagnosed was still advancing, on schedule, with nobody
touching the code.

The repair was the one the plan chose: pin the clock, don't rewrite fixtures. **One file, zero
feature files, zero assertions, zero deletions.** Runtime fell from 32m to 10m55s because
forty-seven 30-second timeouts stopped happening.

> This is the clearest lesson in the lab so far. **A green baseline is not green forever.** It rotted
> with zero commits against it, and if Increment 0 hadn't run it first, those 47 failures would have
> been read as a React regression. Run the baseline *before* you change anything, every increment.

### The bug it found by probing, not reading

Its first front-door implementation **404'd on all six product routes**. The cause is a genuinely
easy thing to get wrong: AngularJS expresses every state as a **fragment** under `/`, and a fragment
is never sent to the server. There is no `/flights` resource to proxy to.

```
/                 200  AngularJS      /__shell        200  React
/flights          302 → /#!/flights   /api/airports   200  mock API
```

A `302`, deliberately — not `301` — because the mapping dies the moment that row migrates, and a
cached permanent redirect would outlive it.

It then **extracted the rule out of the Vite config into a pure `decide()` function** so it is
unit-testable, and pinned it with 15 tests — including one proving that flipping a single row moves
`/flights` to React *and leaves the other six exactly where they were*. Increment 1 is now a
one-word change: `owner: 'angularjs'` → `'react'`.

**One origin, proven end to end:** signed in through the front door, then `/__shell` read the *same*
`authToken`. That is what makes the no-bridge design work — `localStorage` is origin-scoped, so two
ports would have made a signed-in user arrive at React as a stranger.

### Two defects reproduced on purpose

`isAuthenticated()` still tests token *presence*, not validity. `currentUser` still doesn't survive a
reload. Both are Inc-6 repairs, both now have tests asserting the broken behaviour — because fixing
them here would supersede baseline scenarios five increments early.

That is the discipline this lab is about: **a defect you reproduce deliberately, with a test and a
scheduled repair, is not tech debt. It's a dated decision.**

### It diverged from this page, and was right to

The version of this page it read still illustrated TanStack Router and a query client. It followed
`tech-stack.md` instead — ADR-012 rejected TanStack Router, and §4 excludes every data cache because
two NFRs state *"No caching"*. It flagged the divergence rather than silently picking one.

Which brings us to the real finding of this increment.

### ⚠️ The lab's own structural bug

**It was working from instructions 1935 lines out of date.**

`docs/` lives on `main`. A `lab/*` branch is cut from its predecessor, so it carries whatever `docs/`
looked like *then* — and nothing ever merges `main`'s docs forward. The blob it read was `81c9914`;
`main` had `bd539b2`.

Everything downstream follows from that:

| Symptom | Cause |
|---|---|
| Used TanStack examples | removed from `main` three commits earlier |
| Called it a "strangler fig" | `main` had already corrected that framing |
| **G-1 not applied** — Playwright left on a floating caret | the gate checks were only on `main`'s copy |
| **G-2 not applied** — no `engines.node` | same |

And one that was **not** the agent's fault at all: it reported the ADR-005/ADR-006 conflict as
*unsettled*, and `planReview` as *pending with 6 decisions*. Both had been settled the day before —
but the rulings were recorded in `state.json` and the ADRs, and **`tech-stack.md` §6 still listed
them as open.** That was the reviewer's omission, and it is the same class of error the lab keeps
catching: *the decision was recorded in one place and read from another.*

**The fix is one line at every branch cut**, now in every step's Branch setup:

```bash
git checkout main -- docs/ README.md
```

> A lab whose instructions live on a branch the exercise never reads is a lab that teaches the wrong
> thing at every step. This cost three deviations in the first increment that produced code.

### Applied at review

`@playwright/test` pinned **exactly** (`1.63.0-alpha-2026-07-29`, caret removed) and
`engines.node >= 22.22.0` added; `tech-stack.md` §6 updated with the gate rulings.

Note the revision on G-1: the original ruling said *move to stable 1.62.1*. That was wrong once the
baseline was proven green **on the alpha** — downgrading would mean a reinstall and another
11-minute re-verification to move *off* a version that demonstrably works. The finding was the
**caret**, not the version. Pinning it exactly closes the float at zero cost.

---

## 🧑‍⚖️ Human gate — PR Review

- [ ] **`git diff app/ api-mock/ test/` is empty.** Check this first; if it fails, nothing else
      matters.
- [ ] `npm start` still serves the legacy app at :8080 and the mock API at :3000
- [ ] All `@existing-behavior` scenarios pass, unchanged
- [ ] **The baseline was re-run at the start of this increment, not just at the end.** Step 07 found
      it had decayed to 189/235 with zero code changes
- [ ] `npm test` (Karma) still green from step 04
- [ ] `tsconfig.json` has `strict: true`; `grep -rn ': any\|as any' src/` returns nothing
- [ ] `npx oxlint src/` is clean — **not** ESLint; `typescript-eslint` caps `typescript` at `<6.1.0`
      and hard-fails on TS 7 (ADR-016)
- [ ] `engines.node` is pinned `>= 22.22.0` in `package.json` — React Router 8 requires it (G-2)
- [ ] `@playwright/test` is on stable **1.62.1**, not a floating `^…-alpha` (G-1)
- [ ] The API client validates the response before returning it — a generated type is not a runtime
      guarantee (step 06, **P-7**). Types are `z.infer<>`d from the schema, not declared alongside it
- [ ] No hardcoded `http://localhost:3000` anywhere in `src/` — it comes from
      `import.meta.env.VITE_API_URL`
- [ ] `.env.example` is committed; a real `.env` is **not**
- [ ] The auth store uses the `authToken` localStorage key
- [ ] **No Q-8 credential form** (ADR-010) — a `/login` route mirroring the legacy one-button
      screen is fine; real email/password inputs are not. Identity rehydrates via
      `GET /api/auth/me`, so a reload no longer leaves `currentUser` null (constraint C-1)
- [ ] The route tree covers all seven states
- [ ] `package.json` has additions only — no removed dependencies, no changed legacy scripts
- [ ] The coexistence mechanism is **documented**, not just implemented — and it does not
      smuggle in an AngularJS/React in-page bridge that ADR-005 rejected

---

## ⚠️ Pitfalls

<details>
<summary><b>"While I'm here, let me remove UI-Router"</b></summary>

The defining failure of increment 0. Removing UI-Router breaks all five AngularJS routes
simultaneously, which fails the entire green baseline, in the increment designed to prove the
baseline survives. Routes are removed **one at a time**, in increments 1–5, each only after its
React replacement is green.
</details>

<details>
<summary><b>Vite and Grunt fighting over a port</b></summary>

Grunt `connect` serves :8080 and LiveReload uses :35729. Vite defaults to :5173 (preview :4173).
The dev container forwards all four. Keep them separate — do not "simplify" by putting Vite on
8080, because then `npm start` and the React dev server cannot run at the same time, and you need
both for the whole of increments 1–5.
</details>

<details>
<summary><b>React 18 patterns from training data</b></summary>

`ReactDOM.render(<App />, root)` is React 18. React 19 uses
`createRoot(root).render(<App />)`. Same class of error appears in TanStack Query v5's `useQuery`
signature and TanStack Router's route definitions. If [step 07](07-plan.md) skipped the MCP
research, you will find out here.
</details>

<details>
<summary><b><code>strict: true</code> with escape hatches</b></summary>

`strict: true` plus `// @ts-expect-error` scattered around, or `any` renamed to `unknown` and
immediately cast, is not strict mode — it is strict mode theatre. Grep the diff.
</details>

<details>
<summary><b>Trusting the API response shape — <i>especially</i> with TypeScript</b></summary>

TypeScript is erased at runtime, so a type generated from `specs/contracts/api/*.yaml` is a
**claim about** the response, never a check on it. The API client is the only place that can
actually verify one arrived.

The legacy app already demonstrates the failure, and [step 06](06-assess.md) measured it:
`room.id` **does not exist** in the payload (`api-mock/server.js:403–411`), and `pricePerNight`
is never sent — both surface as `undefined` rather than as an error. That is finding **P-7**, and
it is the reason a hotel cannot be booked in the legacy UI at all.

A generated `Room` type declaring `id: string` would not have caught it. It would have made the
compiler agree with the bug. Validate at the boundary.
</details>

<details>
<summary><b>Changing the localStorage key</b></summary>

`authToken` is what `app/services/auth.service.js:22` writes, what the Karma spec seeds at
`test/spec/flight-search.spec.js:24`, and what your Playwright storage state captured in
step 04. Renaming it to `auth_token` silently breaks all three.
</details>

<details>
<summary><b>Skipping the tests step because "it's just scaffolding"</b></summary>

The pipeline is Tests → Contracts → Implementation → Verify, and `AGENTS.md` calls it sacred for
a reason. The shell's tests are what prove the auth store, the query client and the router guard
behave like the AngularJS versions they replace. Skip them here and you will debug them in
increment 1 while also debugging flight-search.
</details>

---

## ⏭️ Next

[**Step 09 — Increment 1: flight-search**](09-deliver-inc1-flight-search.md) — the first real
migration, and the hardest one, on purpose.
