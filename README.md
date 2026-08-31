# 🌆 ANGULARJS to REACT: AI-ASSISTED MODERNIZATION LAB

![Workflow](assets/migrate-modernize-evolve.png)

---

## 🎯 MISSION

**GlobalTravel Corp** runs a corporate travel portal built in 2016 on AngularJS 1.6 - Bower packages, a Grunt pipeline, jQuery DOM manipulation, `$scope` soup, Restangular, and a test suite that has been red for years.

AngularJS reached **end of life in January 2022** ([link to the blog](https://blog.angular.dev/discontinued-long-term-support-for-angularjs-cc066b82e65a)).

Your mission is to modernize it into **React 19 + TypeScript**, *without* the "big bang rewrite that never ships". You will do it the way real modernization programmes should be run: **understand first, specify second, test third, change last** - using the [**spec2cloud**](https://github.com/EmeaAppGbb/spec2cloud) as the framework and GitHub Copilot as the engine.

---

## 🧭 WHY NOT JUST "COPILOT, PORT THIS TO REACT"?

You can absolutely paste an AngularJS controller into Copilot and get a React component back. That might work for *some files*. It falls apart across 40 files, because nobody - human or model - can answer the only question that matters:

> **"Did we just change the behaviour of the system?"**

Legacy apps have no spec. The behaviour *is* the code. So before you touch anything, you make the implicit explicit:

```text
   the code           →   what it DOES        →   what it SHOULD do   →   the new code
 (AngularJS 1.6)         (extracted specs)       (reviewed specs)         (React 19)
                                ▲                       ▲
                                │                       │
                         humans review here     humans approve here
```

That is **Spec-Driven Development (SDD)** applied to brownfield, and it is exactly what spec2cloud automates: a set of Copilot skills plus an (agentic) orchestrator that keeps state, stops at human gates, and never silently invents behaviour.

📖 Reference: [spec2cloud/docs/brownfield.md](https://github.com/EmeaAppGbb/spec2cloud/blob/vNext/docs/brownfield.md)

---

## 🔁 THE WORKFLOW

![Brownfield modernization pipeline](assets/brownfield-pipeline.svg)

### Phase B1 · Extract
<sub>*Document what IS, not what SHOULD BE.*</sub>

Six skills read the legacy codebase and write down reality. No opinions, no improvements.

| Skill | Output for this repo |
|-------|----------------------|
| `codebase-scanner` | AngularJS 1.6.10, Bower + Grunt, 5 feature modules, 3 directives, 2 filters, 3 services |
| `dependency-inventory` | 8 Bower packages (angular, ui-router, ui-bootstrap, restangular, jquery, jquery-ui, moment, lodash) + npm devDeps |
| `architecture-mapper` | UI-Router state graph, controller ↔ service ↔ Restangular data flow, Mermaid diagrams |
| `api-extractor` | OpenAPI contract reverse-engineered from `api-mock/server.js` (~36 routes) |
| `data-model-extractor` | Flight, Hotel, Trip, ItineraryItem, TravelRequest, ExpenseReport entities + relationships |
| `test-discovery` | 1 Karma spec file, 11 tests, 0% meaningful coverage |

➡️ **🧑‍⚖️ Human Gate: Extraction Review.** If the extraction is wrong, *everything* downstream is wrong, so read it, correct it, then approve.

### Phase B2 · Spec-Enable
<sub>*Always produces valuable specifications.*</sub>

| Skill | Output |
|-------|--------|
| `prd-generator` | `specs/prd.md` - **Product Requirement Documentation**. What the product does, from the outside in |
| `frd-generator` | `specs/frds/*.md` - **Feature Requirement Documentation**, one per feature, each with a **"Current Implementation"** section that pins the spec to today's code |
| `spec-refinement` | Ambiguities resolved, gaps closed, contradictions surfaced |
| `ddd-modeling` *(optional)* | `specs/domain/{proposals,domain-model,database-model}.md` |

➡️ **🧑‍⚖️ Human Gates: PRD Review, FRD Review, Refinement Review.**

### 🧪 The Testability Gate

Before writing a single line of React you answer six questions about the legacy app:

| # | Question | This repo |
|---|----------|-----------|
| 1 | Can you build and start it locally? | ✅ `npm start` |
| 2 | Are external dependencies reachable or mockable? | ✅ `api-mock/` is a self-contained Express API |
| 3 | Can you exercise the API? | ✅ `curl http://localhost:3000/api/...` |
| 4 | Can you render the UI? | ✅ http://localhost:8080 |
| 5 | Is there a dev/test environment? | ✅ the dev container you are reading this in |
| 6 | Can you run the existing test suite? | ✅ `npm test` runs — **and fails 11/11 on purpose** (see below) |

| Boxes ticked | Track | What you do |
|--------------|-------|-------------|
| 5–6 | 🟢 **Track A — Green Baseline** | Capture behaviour as Gherkin `@existing-behavior`, scaffold tests that **pass against the legacy app**, then migrate with a safety net |
| 3–4 | 🟡 **Hybrid** | Track A for the testable features, Track B for the rest |
| 0–2 | 📋 **Track B — Doc-Only** | `@documentation-only` scenarios + manual verification checklists + a testability roadmap |

**GlobalTravel Corp will score 6/6, so we are in Track A.** The decision must be recorded as an ADR in `specs/adrs/` (skill: `adr`) — because in a real programme, *why* you chose a track is the thing people will question six months later.

### 🟢 Track A in three steps

1. **Gherkin capture** (`gherkin-generation`): every FRD behaviour becomes a scenario tagged `@existing-behavior`.
2. **Test scaffolding** (`test-generation`, `e2e-generation`, `playwright-cli`): Cucumber steps, Playwright e2e, unit tests.
3. **Green verification** (`test-runner`, `build-check`): everything must be green before any migration starts.

> ⚠️ **The golden rule of a green baseline:**
> if a test fails against the legacy app, **fix the test, not the app.**
> The legacy behaviour - bugs included - *is* the specification.

➡️ **🧑‍⚖️ Human Gate: Green Baseline.**

### 🔀 Choose your path

spec2cloud supports six brownfield paths. **This lab uses `Modernize`.**

| Path | Assessment skill | Planning skill | Used here |
|------|------------------|----------------|-----------|
| **Modernize** (tech debt, dead frameworks) | `modernization-assessment` | `modernization-planner` | ✅ **yes** |
| **Rewrite** (replace components entirely) | `rewrite-assessment` | `rewrite-planner` | optional stretch |
| **Cloud-Native** (containers / Azure) | `cloud-native-assessment` | `cloud-native-planner` | optional stretch |
| **Extend** (add features) | — | `extension-planner` | no |
| **Security** | `security-assessment` | `security-planner` | no |
| **Performance** | `performance-assessment` | — | no |

➡️ **🧑‍⚖️ Human Gate: Path Selection.**

### Phases A → P → 2

| Phase | What happens | Key skills |
|-------|--------------|------------|
| **A · Assess** | Score every module: complexity, risk, coupling, migration order | `modernization-assessment` |
| **P · Plan** | Increment plan + target stack decision, written as ADRs | `modernization-planner`, `tech-stack-resolution`, `adr` |
| **2 · Deliver** | Per increment: tests → contracts → implementation → verification → PR | `test-generation`, `contract-generation`, `implementation`, `test-runner`, `build-check`, `commit-protocol` |

---

## 📚 STEP-BY-STEP WALKTHROUGH

Everything above is the map. **[`docs/lab/`](docs/lab/README.md) is the route** — one file per
step, each with the prompt we actually used, the artifacts it produced, the gate checklist, and
what went wrong.

> ✅ **The lab has been run end to end.** All fifteen steps are recorded from real executions on
> this repository. The finished React 19 + TypeScript application is on
> **[`lab/final-solution`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/blob/lab/final-solution/WRAP-UP.md)**.
>
> Companion pages:
> [Running the apps](docs/lab/running-the-apps.md)
> [Is this really React?](docs/lab/code-tour.md)
> [What it cost](docs/lab/token-economics.md)

| # | Step | Phase | Branch |
|---|------|-------|--------|
| 00 | [spec2cloud init](docs/lab/00-spec2cloud-init.md) | B0 · Onboarding | `lab/00-spec2cloud-init` |
| 01 | [B1 · Extract](docs/lab/01-b1-extract.md) | B1 · Extract | `lab/01-b1-extract` |
| 02 | [B2 · Spec-Enable](docs/lab/02-b2-spec-enable.md) | B2 · Spec-Enable | `lab/02-b2-spec-enable` |
| 03 | [Testability Gate](docs/lab/03-testability-gate.md) | Gate | `lab/03-testability-gate` |
| 04 | [Green Baseline](docs/lab/04-green-baseline.md) | Track A | `lab/04-green-baseline` |
| 05 | [Path Selection](docs/lab/05-path-selection.md) | Gate | `lab/05-path-selection` |
| 06 | [Assess](docs/lab/06-assess.md) | A · Assess | `lab/06-assess` |
| 07 | [Plan](docs/lab/07-plan.md) | P · Plan | `lab/07-plan` |
| 08 | [Increment 0 — React shell](docs/lab/08-deliver-inc0-shell.md) | 2 · Deliver | `lab/08-deliver-inc0-shell` |
| 09 | [Increment 1 — flight-search](docs/lab/09-deliver-inc1-flight-search.md) | 2 · Deliver | `lab/09-deliver-inc1-flight-search` |
| 10 | [Increment 2 — hotel-booking](docs/lab/10-deliver-inc2-hotel-booking.md) | 2 · Deliver | `lab/10-deliver-inc2-hotel-booking` |
| 11 | [Increment 3 — itinerary](docs/lab/11-deliver-inc3-itinerary.md) | 2 · Deliver | `lab/11-deliver-inc3-itinerary` |
| 12 | [Increment 4 — travel-request](docs/lab/12-deliver-inc4-travel-request.md) | 2 · Deliver | `lab/12-deliver-inc4-travel-request` |
| 13 | [Increment 5 — expenses](docs/lab/13-deliver-inc5-expenses.md) | 2 · Deliver | `lab/13-deliver-inc5-expenses` |
| 14 | [Cutover](docs/lab/14-cutover.md) | 2 · Deliver | `lab/14-cutover` |

---

## 🤖 THE RALPH LOOP

<sub>*Ralph is the spec2cloud orchestrator. It runs the 11-step loop below, over and over, until the work is done.*</sub>

spec2cloud's orchestrator (`AGENTS.md`) runs a deterministic 11-step cycle, over and over, until the work is done. 

```mermaid
flowchart LR
    R["📖 Read state<br/>.spec2cloud/state.json"] --> D["🧠 Determine<br/>next task"]
    D --> F["🔎 Find skill<br/>(skill-discovery)"]
    F --> C{"skill<br/>exists?"}
    C -- no --> N["🛠️ Create it<br/>(skill-creator)"] --> E
    C -- yes --> E["⚙️ Execute skill"]
    E --> V["✅ Verify<br/>(test-runner / build-check)"]
    V --> G{"human<br/>gate?"}
    G -- yes --> H["🧑‍⚖️ STOP<br/>await approval"] --> U
    G -- no --> U["💾 Update state<br/>+ audit.log + commit"]
    U --> R
```

**State lives in git**, and is updated after *every* action:

| File | Purpose |
|------|---------|
| `.spec2cloud/state.json` | Current phase, track, increment, gate status |
| `.spec2cloud/audit.log` | Append-only trail of every skill invocation |
| `.spec2cloud/models.json` | Which model did what |

Brownfield adds these to `state.json`:

```jsonc
{
  "mode": "brownfield",
  "brownfield": {
    "testability": "high",
    "track": "A",
    "testabilityChecklist": { /* the 6 answers */ },
    "featureTracks": { "flight-search": "A", "expenses": "A" },
    "greenBaseline": { "status": "green", "verifiedAt": "..." }
  }
}
```

Because state is in git, you can **stop, hand over, and resume** — `resume` is a first-class skill. 

---

## 🧑‍⚖️ HUMAN-IN-THE-LOOP GATES

The agent **stops and waits** at each of these. Nothing is approved by default.

| Gate | You are approving… | Blast radius if you rubber-stamp it |
|------|--------------------|-------------------------------------|
| **Extraction Review** | "this is genuinely what the code does" | 🔴 every spec below is fiction |
| **PRD Review** | product scope & intent | 🔴 you modernize the wrong product |
| **FRD Review** | per-feature behaviour | 🟠 features silently change |
| **Testability Gate** | Track A / B / Hybrid + ADR | 🔴 you migrate blind |
| **Green Baseline** | the safety net is real and green | 🔴 regressions ship undetected |
| **Track B Review** | doc-only scenarios are sufficient | 🟠 manual verification misses cases |
| **Path Selection** | Modernize vs Rewrite vs … | 🟠 wrong strategy, wasted effort |
| **Assessment Review** | complexity & risk scoring | 🟠 wrong migration order |
| **Gherkin Review** | scenarios == real behaviour | 🔴 tests encode wrong behaviour |
| **Spec / Design / Tech-Stack Review** | target architecture | 🟠 expensive to reverse later |
| **PR Review** | the actual diff | 🟠 the usual |
| **Deploy Review** | going live | 🔴 the usual, but louder |

---

## 🎯 THE TARGET STACK

React 19 + TypeScript (strict) was settled from the start. **Everything below it was a role to fill,
not a decision already made** — and [step 07](docs/lab/07-plan.md) filled them by researching live
package registries and writing an ADR for each. The result is what the agent chose, not what this
README assumed:

```
React 19.2.8 + TypeScript 7.0.2 (strict)
    ├── ⚡ Vite 8.2.1              bundler + dev server      ← Grunt + Bower        ADR-016
    ├── 🧭 React Router 8.3.0      real paths, declarative   ← UI-Router hash URLs  ADR-012
    ├── 🔄 one fetch client        no cache library          ← Restangular          ADR-011
    ├── 🛡️ Zod 4.4.3               validates every response  ← nothing did          ADR-011
    ├── 🐻 Zustand 5.0.15          vanilla store             ← $rootScope events    ADR-013
    ├── 🧪 Vitest 4.1.11           unit / component tests    ← Karma + Jasmine      ADR-016
    ├── 🎭 Playwright 1.62.1       e2e / behaviour tests     ← "click it and see"
    ├── 📅 date-fns 4.4.0          explicit parsing          ← Moment.js            ADR-014
    ├── 🧹 oxlint + tsgolint       lint                      ← nothing              ADR-016
    └── 🎨 Bootstrap 3 CSS         carried forward unchanged                        ADR-005
```

Four of those are worth a second look, because they are the ones a stack diagram normally gets wrong:

- **No data-cache library.** Not an oversight — *specified against*. `NFR-F005-003` and
  `NFR-F007-004` are both titled **"No caching"**, and the mock server generates results per call, so
  a cache would be **observably wrong** and would break baseline scenarios.
- **Zod is new, and it is the point.** [Step 06 finding P-7](docs/lab/06-assess.md) proved a
  compile-time type is not a runtime check: `tsc --strict` compiles a `Room` type declaring
  `id: string` at **exit 0** while every `id` is `undefined` at runtime. Types are erased. Something
  has to actually look.
- **oxlint instead of ESLint.** `typescript-eslint` peers `typescript: '>=4.8.4 <6.1.0'` and hard-fails
  on TypeScript 7 with `ERESOLVE`. There is no ESLint path on TS 7 today.
- **Bootstrap 3 stays.** The migration is a component rewrite, not a redesign.

### Migration map

| Legacy (AngularJS 1.6) | Target (React 19) | Notes |
|------------------------|-------------------|-------|
| Controller + `$scope` | Function component + `useState`/`useReducer` | `$scope` is not state — it is a DI-scoped bag. Untangle it. |
| `$rootScope` broadcast/on | **Zustand store** | 5 events across 29 emit sites — and 3 of the 5 turned out to be dead |
| UI-Router `$stateProvider` | **React Router 8** route tree | Hash routing (`#!/flights`) → real paths (`/flights`); old URLs break, deliberately |
| Restangular | **one `fetch` client + Zod** | No cache library — two NFRs specify *"No caching"*. Base URL from `import.meta.env` |
| `.directive()` | Component (or hook, if behaviour-only) | `date-picker` wraps jQuery UI → native `<input type="date">` or Radix |
| `.filter('currency')` | `Intl.NumberFormat` | Delete the filter entirely |
| `.filter('dateFormat')` | **`date-fns` `format()`** | Delete the filter entirely |
| `$(...).animate()` / `.offset()` | `element.scrollIntoView({ behavior: 'smooth' })` | **remove jQuery completely** |
| `$http` interceptors (auth) | **`fetch` wrapper + Zustand auth store** | JWT stays in `localStorage` — **ADR-015, RISK-001, still OPEN**, owner `@alessandro-avila` |
| Bower + Grunt | **npm + Vite 8** | `bower_components/` is deleted at the end |
| Karma + Jasmine | **Vitest 4** | The 11 red tests become the first Gherkin scenarios |

### 🎯 Non-negotiable outcomes

- Zero jQuery in the React app.
- Every migrated feature has a passing Gherkin-derived test.
- Legacy app stays startable until the last module is migrated (incremental, not big bang).

---

## ⚡ QUICK START

### Option A: GitHub Codespaces (recommended)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/alessandro-avila/appmodlab-angularjs-to-react)

1. Click the badge (or **Code ▸ Codespaces ▸ Create codespace on main**).
2. Wait for `post-create.sh` — it installs everything **and verifies it**.
   You should see `Dev container is ready.` in green. If you see red `[FAIL]` lines, tell a facilitator.
3. **Open the codespace in VS Code Desktop**: see the box below. This step is required for the legacy app.
4. In the terminal:
   ```bash
   npm start
   ```
5. In the **PORTS** panel, open port **8080**. Click **Enter Portal**. You are in.



> ### ⚠️ Use VS Code Desktop, not the browser
>
> The legacy AngularJS app **will not log in** from a browser-based codespace
> (`*.app.github.dev`). You will get `ERR_CONNECTION_REFUSED` on `localhost:3000` and an empty
> Local Storage.
>
> That is not a broken setup — it is the app. `app/services/auth.service.js:18` and
> `app/app.js:14` hardcode `http://localhost:3000`. In a browser codespace, `localhost` means
> **your own laptop**, where nothing is listening. In VS Code Desktop, ports are tunnelled to
> your real localhost, so the hardcoded URL resolves correctly.
>
> This is assessment finding **A-5** - *"configuration is compiled into source"* - meeting reality.
> The React app does not have the problem: it calls a relative `/api` path that Vite
> proxies server-side, which is why it works in either mode.
>
> **To switch:** `Cmd/Ctrl + Shift + P` → **Codespaces: Open in VS Code Desktop**
> (or from [github.com/codespaces](https://github.com/codespaces), the **`…`** menu ▸
> **Open in Visual Studio Code**).
>
> **Then verify** in the **PORTS** panel - the *Forwarded Address* column must read:
>
> | Port | Expected |
> |---|---|
> | 3000 | `localhost:3000` |
> | 8080 | `localhost:8080` |
>
> If you see `…app.github.dev`, you are still in the browser. If you see `localhost:3001`,
> something on your machine already holds 3000, free it (see **Troubleshooting** at the end of
> this file) and reload the window. The port number must match exactly, because the app
> hardcodes `3000`.

### Option B: Local dev container (VS Code + Docker)

```bash
git clone https://github.com/alessandro-avila/appmodlab-angularjs-to-react.git
cd appmodlab-angularjs-to-react
code .
# then: Ctrl/Cmd+Shift+P → "Dev Containers: Reopen in Container"

# ⚠️ everything below runs in the CONTAINER terminal, not your host shell.
# Wait for post-create.sh to print "Dev container is ready." — it runs `npm ci` for you.
npm start
```

> 🔁 **Pulled new commits into an existing clone?** Run `npm ci` again before `npm start`.
> npm does not re-install on `git pull`, so a stale `node_modules/` gives you
> `'concurrently' is not recognized`.

### Option C: Bare metal (no container)

Only if A and B are impossible. You need **Node.js 22 LTS**, **git**, and a Chromium
browser on `CHROME_BIN` for the Karma suite.

```bash
git clone https://github.com/alessandro-avila/appmodlab-angularjs-to-react.git
cd appmodlab-angularjs-to-react
npm ci
npm start
```

### Everything the container gives you

| Tool | Why |
|------|-----|
| Node.js 22 LTS | React 19 / Vite 6 require Node ≥ 20.19 |
| GitHub CLI (`gh`) | PRs, gates, `gh auth` |
| **GitHub Copilot CLI** (`copilot`) | agentic loop from the terminal |
| Chromium + Playwright browsers | Karma today, Playwright e2e tomorrow — pre-installed so nobody downloads 300 MB on conference wifi |
| Python 3 | some spec2cloud skills shell out to it |
| Azure CLI + `azd` | optional deployment stretch goal |
| Docker-in-Docker | containerised stretch goals |
| VS Code extensions | Copilot, Copilot Chat, Playwright, Vitest, ESLint, Prettier, YAML, Docker |
| Ports 3000 / 8080 / 35729 / 5173 / 4173 | mock API · legacy app · livereload · Vite dev · Vite preview |
| `spec2cloud` npm package pre-cached | `npx spec2cloud init` works instantly, even offline-ish |

### Verified platforms

The container is **multi-architecture** - it is built from `linux/amd64` **and** `linux/arm64` images, so it runs natively on Apple Silicon with no emulation and no Rosetta.

| Host | Arch | Status |
|------|------|--------|
| GitHub Codespaces | x86-64 | ✅ verified |
| Linux | x86-64 | ✅ verified |
| Windows + Docker Desktop / WSL2 | x86-64 | ✅ verified |
| **macOS Apple Silicon** (M1–M4) | arm64 | ✅ image + all 6 features build and every tool runs natively |
| macOS Intel | x86-64 | ✅ same image as Linux/Windows |

> **macOS tip:** give Docker Desktop at least **4 CPUs / 8 GB** under
> *Settings → Resources*. `NODE_OPTIONS` asks for a 4 GB heap, and the default
> macOS allocation is often too small.

---

## 🏃 RUNNING THE LEGACY APP

> ▶️ Want the **finished React app** instead, or both side by side?
> See **[Running the apps](docs/lab/running-the-apps.md)** for commands, ports and credentials
> for the AngularJS original *and* the React rewrite.

```bash
npm start           # mock API (:3000) + web app (:8080) together  ← use this
npm run api         # mock API only
npm run serve       # web app only
npm run build       # Grunt production build → dist/
npm test            # Karma suite (single run) — expected: 11 failures
npm run test:watch
```

| Service | URL | Notes |
|---------|-----|-------|
| Legacy app | http://localhost:8080 | UI-Router hash routes, e.g. `#!/flights` |
| Mock API | http://localhost:3000/api | Express, ~36 routes, JWT middleware |
| LiveReload | :35729 | injected automatically by `grunt serve` |

**Login:** there is no real login. Click **Enter Portal** — a mock JWT is written to `localStorage`. (`AuthService` + a `$rootScope.$on('$stateChangeStart')` guard.)

**Try:** Flights → `SFO` → `JFK` → pick two dates → **Search Flights** → click a result.
That single flow touches routing, a directive wrapping a jQuery plugin, a filter, a service, Restangular, and jQuery DOM manipulation. It is the perfect first migration target.

### What you are modernizing

| | |
|---|---|
| ![Login](assets/screenshots/01-login.png) | ![Dashboard](assets/screenshots/02-dashboard.png) |
| **Login** — mock auth, JWT into `localStorage` | **Dashboard** — hub for the five modules |
| ![Flights](assets/screenshots/03-flights.png) | ![Hotels](assets/screenshots/04-hotels.png) |
| **Flight search** — round-trip toggle, jQuery UI datepickers, filters, sorting | **Hotel booking** — destination, date range, guests/rooms, card results |
| ![Itinerary](assets/screenshots/05-itinerary.png) | ![Travel requests](assets/screenshots/06-travel-request.png) |
| **Itinerary** — list / timeline / print views | **Travel requests** — status filters, search, validation-heavy form |

![Expenses](assets/screenshots/07-expenses.png)
**Expense reconciliation** — status tabs, search, date-range filter, report creation.

---

## 🌿 RUNNING THE REACT SHELL (Increment 0 onwards)

From Increment 0 the React client runs **alongside** the AngularJS app behind a
single entry point — the *front door*. The legacy commands above are unchanged.

```bash
npm start              # legacy AngularJS (:8080) + mock API (:3000)  ← still required
npm run shell:dev      # the front door (:5173)                       ← browse here

npm run shell:test     # Vitest — the React shell suite
npm run shell:typecheck # tsc --noEmit, TypeScript strict
npm run shell:lint     # oxlint, type-aware
npm run shell:build    # production build → dist-react/
npm run shell:verify   # typecheck + lint + test + build, in order
```

| Service | URL | Notes |
|---------|-----|-------|
| **Front door** | http://localhost:5173 | **one origin**; routes between both apps |
| React shell health | http://localhost:5173/__shell | non-product route; shows the route ledger |
| Legacy app | http://localhost:8080 | still works standalone, unchanged |
| Mock API | http://localhost:3000/api | unchanged |

**Both servers must be running.** The front door proxies everything it does not
own to `:8080` and `:3000`.

Copy `.env.example` to `.env` first — the API base URL comes from the
environment, never from source (finding **A-5**).

> **How the front door works — and how a route moves from AngularJS to React —
> is documented in
> [`docs/architecture/strangler-fig-entry-point.md`](docs/architecture/strangler-fig-entry-point.md).**
> Increments 1–5 all depend on it.

### Where the two test suites live

| Suite | Command | Covers | Status |
|-------|---------|--------|--------|
| Karma + Jasmine | `npm test` | the 19 legacy AngularJS tests | unchanged, still green — retired in Inc-1 per ADR-008 §2 |
| Vitest | `npm run shell:test` | the React shell | new |
| Cucumber + Playwright | `npm run test:baseline` | the 235-scenario green baseline | unchanged; runs against `:8080` directly, **not** through the front door |


**Try:** Flights → `SFO` → `JFK` → pick two dates → **Search Flights** → click a result.
That single flow touches routing, a directive wrapping a jQuery plugin, a filter, a service, Restangular, and jQuery DOM manipulation. It is the perfect first migration target.

### What you are modernizing

| | |
|---|---|
| ![Login](assets/screenshots/01-login.png) | ![Dashboard](assets/screenshots/02-dashboard.png) |
| **Login** — mock auth, JWT into `localStorage` | **Dashboard** — hub for the five modules |
| ![Flights](assets/screenshots/03-flights.png) | ![Hotels](assets/screenshots/04-hotels.png) |
| **Flight search** — round-trip toggle, jQuery UI datepickers, filters, sorting | **Hotel booking** — destination, date range, guests/rooms, card results |
| ![Itinerary](assets/screenshots/05-itinerary.png) | ![Travel requests](assets/screenshots/06-travel-request.png) |
| **Itinerary** — list / timeline / print views | **Travel requests** — status filters, search, validation-heavy form |

![Expenses](assets/screenshots/07-expenses.png)
**Expense reconciliation** — status tabs, search, date-range filter, report creation.

---

## 🧨 KNOWN LEGACY DEBT

This is a *brownfield* lab. Some things are broken **on purpose** because fixing them is the exercise. Do not "helpfully" repair these before the hackathon starts.

| Fact | Notes |
|------|--------------|
| **`npm test` fails 11/11.** `test/spec/flight-search.spec.js` asserts behaviour the controller does not have (e.g. a `getPopularRoutes()` call on init, a different `$scope.filters` shape). | This is the single best artefact in the repo. It feeds `test-discovery`, it is the honest answer to Testability-Gate question 6, and it is the perfect drill for the Track A rule **"fix the test, not the app"**. |
| `ui.bootstrap` is declared in `app/app.js` but **never used**. No `uib-*` directive, no `$uibModal`. | A real dependency-inventory finding. `modernization-assessment` should catch it and drop the dependency. |
| API base URL hardcoded to `http://localhost:3000/api` in `app/app.js`. | Config-as-code smell. Becomes `import.meta.env.VITE_API_URL`. |
| **Searching flights logs a Moment.js deprecation warning** - `moment("08/15/2026")` is parsed with no format string, so it falls back to `new Date()`. | Expected, and harmless. A real `data-model-extractor` / date-handling finding: the React rewrite parses dates explicitly instead of guessing. |
| JWT stored in `localStorage`, no refresh, no expiry handling. | Feeds the optional `security-assessment` path. |
| `bower_components/` is **committed to the repo**. | 2016 called. It also means the app runs with zero network access. Deleted at the end of the migration. |
| Global Bootstrap 3 CSS, no scoping. | Needs a scoped-styling decision in step 07. |
| jQuery used for scrolling, datepickers, and animations inside Angular controllers. | The canonical "framework fighting the framework" anti-pattern. |

---

## 🌿 BRANCH STRATEGY

`main` carries the story — the legacy app plus [`docs/lab/`](docs/lab/README.md). The
**artifacts** live on `lab/*` branches, one per step, each branched from its predecessor.

So `lab/07-plan` contains everything from steps 00–07, and checking out any branch gives you a
working snapshot of the journey at that moment. Each step doc carries the exact `git` command to
create its branch.

> ⚠️ **Pull `docs/` forward at every branch cut** — `git checkout main -- docs/ README.md`.
> A `lab/*` branch carries whatever `docs/` looked like when it was cut, and nothing merges `main`
> forward. Increment 0 was run against instructions 1935 lines out of date because of this.

| Branch | Contents |
|--------|----------|
| `main` | 🏛️ The legacy AngularJS app + the full walkthrough |
| `lab/00-spec2cloud-init` | 🧰 spec2cloud installed — `AGENTS.md`, 46 skills, `.mcp.json`, `specs/` |
| `lab/01-b1-extract` | 📋 Extraction: stack, dependencies, architecture, API contracts, coverage |
| `lab/02-b2-spec-enable` | 📖 PRD + FRDs, refined |
| `lab/03-testability-gate` | 🚦 Testability ADR + track decision |
| `lab/04-green-baseline` | ✅ `@existing-behavior` Gherkin + tests, green against the legacy app |
| `lab/05-path-selection` | 🔀 Path ADR (Modernize) |
| `lab/06-assess` | 🔍 Module scoring, findings, migration order |
| `lab/07-plan` | 🗺️ Increment plan + target stack + ADRs |
| `lab/08-deliver-inc0-shell` | ⚛️ React shell alongside AngularJS — no feature migrated |
| `lab/09-deliver-inc1-flight-search` | ✈️ First module in React |
| `lab/10-deliver-inc2-hotel-booking` | 🏨 Second module |
| `lab/11-deliver-inc3-itinerary` | 🗓️ Third module |
| `lab/12-deliver-inc4-travel-request` | 📝 Fourth module |
| `lab/13-deliver-inc5-expenses` | 💳 Fifth module |
| `lab/14-cutover` | 🔥 AngularJS, Bower and Grunt deleted |

> **Worth internalising:** because the chain is cumulative, an error in step 01's extraction
> travels all the way to step 14. That is not a flaw in the tooling — it is *why* the Extraction
> Review gate exists, and why you should read the output rather than clicking approve.


<details>
<summary><b>What <code>spec2cloud init</code> adds to your working tree</b></summary>

| Path | Purpose |
|------|---------|
| `AGENTS.md` | The orchestrator. Copilot reads it automatically — this is what runs the Ralph loop. |
| `.github/skills/**/SKILL.md` | 46 skills (extract, spec, test, plan, implement, deploy) |
| `skills-lock.json` | Pinned skill versions |
| `.spec2cloud/state.json`, `audit.log`, `models.json` | Workflow state, committed to git |
| `.vscode/mcp.json`, `.mcp.json` | MCP server wiring |
| `specs/` | Where PRDs, FRDs, ADRs, and Gherkin land |

Useful flags: `--minimal` (add to an existing project), `--force` (overwrite), `--ref vNext` (pin the branch), `--target <dir>`. Conflicting files are preserved as `*.spec2cloud` rather than clobbered.
</details>

---

## 🚀 STARTING THE MODERNIZATION

```bash
# 1. Install the framework (skip if you branched from lab/00-spec2cloud-init)
npx spec2cloud init --flow brownfield --ref vNext

# 2. Authenticate Copilot CLI (once per Codespace)
copilot

# 3. Kick off the loop
```

Then, in Copilot CLI or Copilot Chat, the orchestrator in `AGENTS.md` activates automatically:

```
Analyze this codebase and start the spec2cloud brownfield workflow.
This is an AngularJS 1.6 app. Target is React 19 + TypeScript.
```

➡️ **From here, follow [`docs/lab/`](docs/lab/README.md) step by step** — starting with
[step 00](docs/lab/00-spec2cloud-init.md). Every step has its prompt, its branch, its gate
checklist, and what actually happened.

### 🗣️ Prompting that actually works

The canonical prompts live in the step docs. These are the patterns behind them:

| ❌ Weak | ✅ Strong |
|---------|----------|
| "Convert this to React" | "Run Phase B1 extraction. `bower_components/` is committed — record the fact, don't inventory it. Where the code and a comment disagree, the code wins." |
| "Write tests" | "Capture flight-search's existing behaviour as Gherkin. Bugs included — if the behaviour is odd, the scenario is odd." |
| "Make it modern" | "Migrate flight-search. `specs/features/flight-search.feature` is the spec; every scenario must pass. No jQuery, no Moment, no `any`." |
| "Fix the failing tests" | "The Karma suite asserts `popularRoutes`, which the controller never populates. Per the Track A rule, fix the **test** and record the discrepancy in the FRD." |

**Rules of thumb**

1. **Say what you want, not how the framework works.** `AGENTS.md` already knows which skills a
   phase runs and in what order. Listing them makes the prompt fragile and teaches you to drive
   spec2cloud like a CLI.
2. **Carry only what the agent can't know.** Local facts with consequences, scoping decisions only
   a human holds, and what is authorised to change.
3. **State things so they can be falsified.** "Verify whether `ui.bootstrap` is used and say either
   way" beats "drop the unused dependency" — one of them can prove you wrong.
4. **Make it prove it.** "Run `npm test` and paste the output" beats "make sure it works".
5. **Let the artifacts do the talking.** By increment 1 the prompt doesn't list behaviours to
   preserve — it points at the feature file. If that isn't enough, your baseline has a hole, and
   that is worth finding out.

> If a line in your prompt would be equally true of any AngularJS app, delete it. What's left is
> the prompt. More on this in [the walkthrough index](docs/lab/README.md#-a-note-on-the-prompts).

---

## 📅 HACKATHON RUNBOOK

| # | Block | ⏱️ | What you actually do | Deliverable |
|---|-------|----|----------------------|-------------|
| 1 | **Kick-off & context** | 30m | Use cases, current pain, success criteria | Agreed definition of done |
| 2 | **Modernisation approach** | 60m | AngularJS → React patterns; incremental vs strangler-fig vs rewrite; React architecture; **why SDD for brownfield** | Path decision (Modernize) |
| 3 | **AI-assisted development** | 75m | Copilot for transformation & refactoring; prompting; agentic development; the Ralph loop; HITL gates | Everyone has Copilot CLI working in their Codespace |
| 4 | **Live demo** | 60m | Facilitator drives **B1 → B2 → Testability Gate → Track A → first React component**, end to end, live | Reference walkthrough |
| 5 | **🏗️ Hands-on hackathon** | 3h | Teams run the loop on real modules (see below) | Migrated components + specs |
| 6 | **Wrap-up & next steps** | 60m | Playback, reusable patterns, pilot workloads, follow-on plan | Pilot shortlist |

### Suggested 3-hour team plan

| Time | Phase | Target | Step |
|------|-------|--------|------|
| 0:00–0:30 | B1 Extract | Full extraction + **Extraction Review gate** | [01](docs/lab/01-b1-extract.md) |
| 0:30–1:00 | B2 Spec-Enable | PRD + FRD for **one** module + **gate** | [02](docs/lab/02-b2-spec-enable.md) |
| 1:00–1:20 | Testability Gate | Checklist + Track A + ADR | [03](docs/lab/03-testability-gate.md) |
| 1:20–1:50 | Track A | Gherkin `@existing-behavior` + green baseline | [04](docs/lab/04-green-baseline.md) |
| 1:50–2:10 | Assess + Plan | Migration order, target stack ADR | [05](docs/lab/05-path-selection.md) · [06](docs/lab/06-assess.md) · [07](docs/lab/07-plan.md) |
| 2:10–2:50 | Deliver | First React 19 component, tests green | [08](docs/lab/08-deliver-inc0-shell.md) · [09](docs/lab/09-deliver-inc1-flight-search.md) |
| 2:50–3:00 | PR | Open PR, capture learnings | — |

<sub>Steps [10–13](docs/lab/README.md) (the remaining four modules) and
[14 Cutover](docs/lab/14-cutover.md) are beyond a 3-hour block — they are documented so a team can
carry on afterwards.</sub>

---

## 📂 PROJECT STRUCTURE

```
appmodlab-angularjs-to-react/
├── .devcontainer/
│   ├── devcontainer.json          # Codespaces + local dev container
│   ├── post-create.sh             # installs AND verifies the toolchain
│   └── welcome.sh                 # terminal banner with the commands you need
├── api-mock/
│   └── server.js                  # Express mock API — the "backend" (:3000)
├── app/
│   ├── index.html                 # script manifest (the 2016 way)
│   ├── app.js                     # module decl, Restangular config, route guards
│   ├── app.routes.js              # UI-Router states + inline login
│   ├── components/
│   │   ├── flight-search/         # controller + service + template
│   │   ├── hotel-booking/
│   │   ├── itinerary/
│   │   ├── travel-request/
│   │   └── expense-reconciliation/
│   ├── directives/
│   │   ├── approval-status.directive.js
│   │   ├── currency-input.directive.js
│   │   └── date-picker.directive.js     # wraps the jQuery UI datepicker
│   ├── filters/
│   │   ├── currency.filter.js
│   │   └── date-format.filter.js
│   ├── services/
│   │   ├── api.service.js
│   │   ├── auth.service.js
│   │   └── user.service.js
│   └── assets/css/
├── bower_components/              # committed on purpose (2016 archaeology)
├── test/
│   ├── karma.conf.js
│   └── spec/flight-search.spec.js # 11 tests, 11 red, intentionally
├── Gruntfile.js                   # concat + uglify + cssmin + connect + watch
├── bower.json
└── package.json
```

**After `spec2cloud init` you additionally get** `AGENTS.md`, `.github/skills/`, `.spec2cloud/`, `specs/`, `skills-lock.json`.

---

## 🏗️ LEGACY STACK

| Layer | Technology | Status |
|-------|------------|--------|
| Framework | AngularJS **1.6.10** | ☠️ EOL Jan 2022 |
| Router | UI-Router 0.4.x | ☠️ unmaintained |
| HTTP | Restangular 1.6.x | ☠️ unmaintained |
| UI kit | Bootstrap 3 + angular-ui-bootstrap 2.5 | ⚠️ Bootstrap 3 EOL |
| DOM | jQuery 2.2 + jQuery UI 1.12 | ⚠️ anti-pattern inside Angular |
| Dates | Moment.js 2.x | ⚠️ in maintenance mode |
| Utils | Lodash 4 | ⚠️ mostly redundant with ES2015+ |
| Packages | **Bower** | ☠️ deprecated 2017 |
| Build | Grunt 1.x | ⚠️ legacy |
| Tests | Karma 1.7 + Jasmine 2.8 | ☠️ Karma deprecated 2023 |
| Backend | Express mock API | ✅ keep as-is for the lab |

---

## ✅ ACCEPTANCE CRITERIA

**Minimum viable outcome (every team)**

- [ ] Phase B1 extraction complete and reviewed at the gate
- [ ] PRD + at least one FRD with a "Current Implementation" section, reviewed
- [ ] Testability Gate answered, track chosen, **ADR written**
- [ ] Gherkin `@existing-behavior` scenarios for at least one module
- [ ] Green baseline: the scenarios pass **against the legacy app**
- [ ] At least one module migrated to React 19 + TypeScript, tests still green
- [ ] PR opened with the spec + tests + code in the same changeset

**Stretch**

- [ ] All five modules migrated; `bower_components/` deleted
- [ ] React and AngularJS coexisting in the repo, both startable, sharing only the HTTP API
- [ ] API responses validated at the client boundary — no silently-undefined fields
- [ ] Playwright e2e covering the full booking flow
- [ ] Deployed to Azure Static Web Apps via `azd`
- [ ] `security-assessment` run on the JWT/`localStorage` handling

**Definition of done for a migrated module**

1. Its FRD describes current *and* target behaviour.
2. Its Gherkin scenarios pass on both the legacy and the React implementation.
3. No jQuery. No `any`. No `$scope`.
4. The gate that approved it is recorded in `.spec2cloud/audit.log`.

---

## 🛠️ TROUBLESHOOTING

<details>
<summary><b><code>EADDRINUSE: address already in use :::3000</code> — how to free a port</b></summary>

Something is already listening on the port. Usually an earlier `npm start` that was
interrupted: `concurrently -k` only kills processes **it** spawned, so an API server from a
previous run survives as an orphan and `Ctrl+C` will not touch it.

**Works everywhere** (Windows, macOS, Linux, Codespaces) — no tools to install:

```bash
npx kill-port 3000
npx kill-port 3000 8080      # both at once
```

If you would rather not use npx:

**Codespaces / Linux / macOS**
```bash
pkill -f "api-mock/server.js"     # targets this repo's API precisely
lsof -ti :3000 | xargs -r kill -9 # or: anything on the port
fuser -k 3000/tcp                 # or: if lsof is unavailable
```

**Windows (PowerShell)**
```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

**Windows (cmd)**
```cmd
netstat -ano | findstr :3000
taskkill /PID <pid-from-the-last-column> /F
```

Confirm it is clear, then restart:

```bash
npx kill-port 3000 8080 && npm start
```

> 💡 In a codespace, **stopping and restarting the codespace** clears every orphan at once and
> is often quicker than hunting processes.

Ports this lab uses: **3000** mock API · **8080** legacy AngularJS · **5173** React (Vite) ·
**4173** React preview · **35729** LiveReload.
</details>

<details>
<summary><b>Legacy app: <code>ERR_CONNECTION_REFUSED</code> on <code>localhost:3000</code>, login does nothing</b></summary>

You are running the codespace **in a browser** (the URL bar shows `*.app.github.dev`). The
legacy app cannot work there.

`app/services/auth.service.js:18` and `app/app.js:14` hardcode `http://localhost:3000`. From a
browser codespace, `localhost` is **your own laptop**, not the codespace — nothing is
listening, so the login POST fails. Local Storage stays empty because the token is only
written inside the request's success handler.

**Fix:** open the codespace in **VS Code Desktop**, where ports are tunnelled to your real
localhost.

`Cmd/Ctrl + Shift + P` → **Codespaces: Open in VS Code Desktop**

Then check the **PORTS** panel — *Forwarded Address* must read `localhost:3000` and
`localhost:8080`. If it shows `localhost:3001`, free port 3000 on your machine (see above) and
reload the window; the app hardcodes `3000`, so the number has to match.

Open **`http://localhost:8080`** — not the `app.github.dev` URL.

> This is assessment finding **A-5** (*"configuration is compiled into source"*) showing up as a
> portability problem. The React app is unaffected: it calls a relative `/api` path that Vite
> proxies server-side, so it works in the browser and the desktop alike.
</details>

<details>
<summary><b><code>'concurrently' is not recognized</code> / <code>command not found</code> when running <code>npm start</code></b></summary>

Your `node_modules/` is **stale** — it was installed before `concurrently` was added to
`package.json`. npm does not re-install automatically when you pull.

```bash
npm ci        # preferred: exact versions from package-lock.json
# or, if npm ci complains:
npm install
```

You will hit this if you cloned the repo *before* the lab commit landed, or if you are
running `npm start` **on your host machine** rather than inside the dev container.
Inside the container `post-create.sh` runs `npm ci` for you, so it cannot happen there.

Sanity check:
```bash
npx concurrently --version   # should print 9.x
```
</details>

<details>
<summary><b>The app loads but every page is blank</b></summary>

Almost always a vendored library failing to load, which stops Angular bootstrapping.
Open DevTools → Console. Check `bower_components/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js` and `bower_components/jquery-ui/jquery-ui.min.js` return **200**, not 404.
Both are committed — if they 404, your `grunt serve` is serving only `app/` (see `Gruntfile.js` → `connect.server.options.base` must be `['app', '.']`).
</details>

<details>
<summary><b>"Failed to load…" errors in every module</b></summary>

The mock API is not running. Use `npm start` (both) rather than `npm run serve` (web only).
Verify: `curl http://localhost:3000/api/airports`.
</details>

<details>
<summary><b>Port already in use</b></summary>

```bash
# Linux / macOS / Codespaces
lsof -ti:3000 | xargs -r kill -9
lsof -ti:8080 | xargs -r kill -9
```
```powershell
# Windows
Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
</details>

<details>
<summary><b><code>npm test</code> fails with 11 failures</b></summary>

✅ **Correct.** That is the designed starting state - see *Known and intentional legacy debt*.
A **crash** (browser never launches) is different: check `CHROME_BIN`.
```bash
echo $CHROME_BIN   # should be /usr/bin/chromium in the container
chromium --version
```
</details>

<details>
<summary><b>Karma hangs and never exits</b></summary>

Use `npm test` (adds `--single-run`). `npm run test:watch` is the watching variant.
</details>

<details>
<summary><b><code>Cannot start ChromeHeadless</code> / Chrome crashes mid-run</b></summary>

`test/karma.conf.js` auto-detects a container (via `/.dockerenv`) and switches to a
`ChromeHeadlessContainer` launcher with `--no-sandbox --disable-dev-shm-usage
--disable-gpu`, so this should not happen. If it does:

```bash
node -e "var c={set:o=>console.log(o.browsers),LOG_INFO:1};require('./test/karma.conf.js')(c)"
# in a container this must print [ 'ChromeHeadlessContainer' ]
```

| Symptom | Cause | Handled by |
|---------|-------|-----------|
| `Running as root without --no-sandbox is not supported` | running as root; Chrome refuses | `--no-sandbox` |
| Chrome dies part-way through the run | Docker gives `/dev/shm` only **64 MB** | `--disable-dev-shm-usage` + `"runArgs": ["--shm-size=1g"]` |
| `GPU process isn't usable` | no GPU in a container | `--disable-gpu` |

Outside a container the plain `ChromeHeadless` launcher is used, so your local
Chrome keeps its normal sandbox.
</details>

<details>
<summary><b>Apple Silicon: is anything emulated?</b></summary>

No. The base image and every feature publish native `linux/arm64` builds, and
`node_modules` contains no native binaries, so nothing is cross-compiled or
emulated. Confirm with:

```bash
uname -m          # aarch64
node -p process.arch   # arm64
```

If you see `x86_64` inside the container on an M-series Mac, Docker Desktop is
forcing amd64 — clear **Settings → General → "Use Rosetta for x86/amd64 emulation"**
and any `DOCKER_DEFAULT_PLATFORM=linux/amd64` in your shell profile.
</details>

<details>
<summary><b>Datepickers do nothing</b></summary>

jQuery UI failed to load. Check the console for a 404 on `jquery-ui.min.js`, and that
`app/index.html` loads it **after** `jquery.min.js`.
</details>

<details>
<summary><b>In Codespaces the browser cannot reach :8080</b></summary>

`Gruntfile.js` detects containers (`CODESPACES` / `REMOTE_CONTAINERS` / `DEVCONTAINER`)
and binds to all interfaces. If you overrode the env, unset it and restart.
Then use the **Ports** panel — not `localhost` in your host browser.
</details>

<details>
<summary><b><code>copilot</code>: command not found</b></summary>

```bash
npm install -g @github/copilot
copilot        # follow the device-code sign-in
```
</details>

<details>
<summary><b><code>npx spec2cloud init</code> hangs</b></summary>

It is waiting on an interactive prompt that has no TTY. Pass the flags explicitly:
```bash
npx spec2cloud init --flow brownfield --ref vNext --minimal --force
```
</details>

<details>
<summary><b>Copilot ignores the workflow / invents its own plan</b></summary>

It has not picked up `AGENTS.md`. Confirm the file exists at the repo root, that you opened the repo root (not a subfolder), and start with an explicit instruction:
*"Read AGENTS.md and follow the brownfield workflow. Do not skip human gates."*
</details>

---

## 📚 RESOURCES

**spec2cloud**
- [Repository](https://github.com/EmeaAppGbb/spec2cloud) · [Brownfield guide](https://github.com/EmeaAppGbb/spec2cloud/blob/vNext/docs/brownfield.md) · [Concepts / Ralph loop](https://github.com/EmeaAppGbb/spec2cloud/blob/vNext/docs/concepts.md) · [State & gates](https://github.com/EmeaAppGbb/spec2cloud/blob/vNext/docs/state-and-gates.md) · [Quick start](https://github.com/EmeaAppGbb/spec2cloud/blob/vNext/docs/quickstart.md)

**GitHub Copilot**
- [Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) · [Prompt engineering](https://docs.github.com/copilot/using-github-copilot/prompt-engineering-for-github-copilot) · [Custom instructions](https://docs.github.com/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)

**React**
- [react.dev](https://react.dev/) · [Vite](https://vite.dev/) · [TanStack Router](https://tanstack.com/router) · [TanStack Query](https://tanstack.com/query) · [Zustand](https://zustand.docs.pmnd.rs/) · [Vitest](https://vitest.dev/) · [Testing Library](https://testing-library.com/react) · [Playwright](https://playwright.dev/)

**Migration background**
- [AngularJS EOL](https://blog.angular.dev/discontinued-long-term-support-for-angularjs-cc066b82e65a) · [Strangler Fig pattern](https://learn.microsoft.com/azure/architecture/patterns/strangler-fig) · [date-fns](https://date-fns.org/) · [You Might Not Need Lodash](https://youmightnotneed.com/lodash)

---

## 🙋 SUPPORT

- **During the hackathon:** grab a Microsoft facilitator, that is what they are there for.
- **Lab issues:** open an issue in [this repository](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/issues).
- **Framework issues:** open an issue in [EmeaAppGbb/spec2cloud](https://github.com/EmeaAppGbb/spec2cloud/issues).

---

## 📜 LICENSE

MIT.
Originally derived from [EmeaAppGbb/appmodlab-angularjs-to-react-angular-modern](https://github.com/EmeaAppGbb/appmodlab-angularjs-to-react-angular-modern), re-targeted to React-only and re-platformed onto the spec2cloud brownfield workflow.
