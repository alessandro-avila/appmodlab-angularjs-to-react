# Step 08 · Increment 0 — the React shell

> **Phase** 2 · Deliver (increment 0) &nbsp;|&nbsp; **Branch** [`lab/08-deliver-inc0-shell`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/08-deliver-inc0-shell) &nbsp;|&nbsp; **Parent** `lab/07-plan`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ⏳ Pending

---

## 🎯 Goal

Stand up React 19 + TypeScript + Vite **alongside** the AngularJS app. Migrate **nothing**.

This is the walking skeleton. Its only job is to prove the new stack runs against the same API
before you bet a feature on it. If increment 0 is wrong, increments 1–5 inherit the wrongness
five times over.

> **Success looks boring:** two apps serve independently, a trivial React page renders against
> the real API, and every `@existing-behavior` scenario still passes untouched.

> **Not a strangler fig.** ADR-005 rejected mounting React inside the AngularJS shell — no
> bundler forced into the legacy client, no `$rootScope` bridge, no dual routing. The two stacks
> coexist in the *repository*, not in one page, and the seam between them is the HTTP API.

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
```

---

## 🗣️ The prompt

```text
Phase 2, increment 0 — the walking skeleton.

Build the React app the plan and tech-stack call for, running ALONGSIDE the
AngularJS app as a separate app on its own port — not mounted inside it, per
ADR-005. Mirror the seven UI-Router states as routes, but every one except login is
a placeholder in this increment. No feature is migrated.

Two ports of substance:
  - app/services/auth.service.js becomes the auth store. Keep the behaviour identical
    and keep the localStorage key exactly as it is — the Playwright storage state
    from the green baseline depends on it. The $stateChangeStart guard in app/app.js
    becomes a router guard.
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
│   ├── login.tsx
│   ├── dashboard.tsx
│   ├── flights.tsx                 ← placeholder
│   ├── hotels.tsx                  ← placeholder
│   ├── itinerary.tsx               ← placeholder
│   ├── travel-request.tsx          ← placeholder
│   └── expenses.tsx                ← placeholder
├── lib/
│   ├── api-client.ts               ← fetch wrapper, VITE_API_URL, Bearer token
│   └── query-client.ts
├── stores/
│   ├── auth-store.ts               ← replaces auth.service.js + auth:login/auth:logout
│   └── notification-store.ts       ← replaces notification:add
└── types/
    └── api.ts                      ← generated from specs/contracts/api/*.yaml

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

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/07-plan..lab/08-deliver-inc0-shell`
> 2. **How the two apps coexist** — two dev servers? Which ports? How does each reach the API on
>    :3000? Increments 1–5 all depend on this, and per ADR-005 it is *not* an in-page bridge.
> 3. The `package.json` diff — additions only?
> 4. Output of: Vite build, Vitest, `npm test` (Karma), full Playwright `@existing-behavior`
> 5. Whether it used React 19 APIs or fell back to React 18 patterns
> 6. Whether `tsconfig.json` really has `strict: true` and whether any `any` slipped in — and,
>    separately, whether the API client validates the response shape at **runtime**. Types are
>    erased at the network boundary; step 06's **P-7** is the proof
> 7. Anything it wanted to delete and had to be stopped from deleting

---

## 🧑‍⚖️ Human gate — PR Review

- [ ] **`git diff app/ api-mock/ test/` is empty.** Check this first; if it fails, nothing else
      matters.
- [ ] `npm start` still serves the legacy app at :8080 and the mock API at :3000
- [ ] All `@existing-behavior` scenarios pass, unchanged
- [ ] `npm test` (Karma) still green from step 04
- [ ] `tsconfig.json` has `strict: true`; `grep -rn ': any\|as any' src/` returns nothing
- [ ] The API client validates the response before returning it — a generated type is not a runtime
      guarantee (step 06, **P-7**)
- [ ] No hardcoded `http://localhost:3000` anywhere in `src/` — it comes from
      `import.meta.env.VITE_API_URL`
- [ ] `.env.example` is committed; a real `.env` is **not**
- [ ] The auth store uses the `authToken` localStorage key
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
