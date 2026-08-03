# Step 01 · B1 · Extract

> **Phase** B1 · Extract &nbsp;|&nbsp; **Branch** [`lab/01-b1-extract`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/01-b1-extract) &nbsp;|&nbsp; **Parent** `lab/00-spec2cloud-init`
> **Human gate** 🧑‍⚖️ Extraction Review &nbsp;|&nbsp; **Status** ⏳ Pending

---

## 🎯 Goal

Six skills read the legacy codebase and **write down reality**. No opinions, no improvements, no
"this should be refactored". The output is a factual snapshot of what exists in August 2016 terms.

This is the foundation everything else stands on. If the extraction says there are four feature
modules when there are five, the PRD is wrong, the FRDs are wrong, the Gherkin is wrong, and you
migrate a system that does not exist.

> **The rule:** *if the docs and the code disagree, the code wins.*

---

## 🧰 Skills invoked

Six, in sequence, one per Ralph-loop iteration:

| # | Skill | Reads | Writes |
|---|-------|-------|--------|
| B1a | `codebase-scanner` | `app/`, `api-mock/`, `Gruntfile.js`, `package.json` | `specs/docs/technology/stack.md` |
| B1b | `dependency-inventory` | `bower.json`, `package.json`, `package-lock.json` | `specs/docs/technology/dependencies.md` |
| B1c | `architecture-mapper` | `app/app.js`, `app/app.routes.js`, `app/components/**`, `app/services/**` | `specs/docs/architecture/overview.md`, `components.md` |
| B1d | `api-extractor` | `api-mock/server.js`, `app/services/api.service.js` | `specs/contracts/api/*.yaml` |
| B1e | `data-model-extractor` | `api-mock/server.js`, controllers, services | `specs/docs/architecture/data-models.md` |
| B1f | `test-discovery` | `test/karma.conf.js`, `test/spec/*.js` | `specs/docs/testing/coverage.md` |

---

## ✅ Prerequisites

- [ ] [Step 00](00-spec2cloud-init.md) complete — `AGENTS.md` and `.github/skills/` exist
- [ ] `npm start` runs; app renders at http://localhost:8080
- [ ] Copilot CLI authenticated (`copilot`)

---

## 🌿 Branch setup

```bash
git switch lab/00-spec2cloud-init
git switch -c lab/01-b1-extract
```

---

## 🗣️ The prompt

```text
Run Phase B1 extraction on this legacy AngularJS application.

Scope is app/, api-mock/, test/, and the build manifests (bower.json, package.json,
Gruntfile.js). Ignore node_modules/ and do not inventory bower_components/ — record
only the fact that dependencies are vendored and committed.

Two rules I care about: where a comment, a README or a filename disagrees with the
code, the code wins. And where you cannot determine something from the source, write
"unknown" rather than guessing.

Stop at the Extraction Review gate.
```

<details>
<summary><b>Why the prompt is shaped like this</b></summary>

`AGENTS.md` already knows B1 means six skills, what order they run in, where they write, and that
extraction carries no judgment. Restating all of that is noise — and it trains you to write
prompts that stop working the moment the framework changes.

What the agent genuinely cannot know is in the three sentences that remain:

- **`bower_components/` is committed to this repo.** 2016 archaeology. Without that line the agent
  inventories every file in Angular's dist folder and burns the context window before it reaches
  `app/`.
- **"the code wins"** is the brownfield golden rule. `bower.json` declares
  `angular-ui-bootstrap`; `app/app.js:10` loads the module. Neither is evidence it is *used*.
  Only the templates are.
- **"write unknown rather than guessing"** is the highest-value instruction in the whole
  walkthrough. Extraction that hallucinates is worse than extraction that admits a gap, because
  everything downstream treats it as fact.

**"Stop at the gate"** earns its place too — without it the orchestrator will run B2 in the same
session, before you have read a word of the output.
</details>

### If you want to see each skill land separately

Six discrete prompts make each output reviewable on its own. After the first, just name what you
want next:

```text
Continue B1. Run dependency-inventory only.

For each dependency record whether app/index.html actually loads it, and its
maintenance status as a fact with a source. Flag anything declared but never
referenced in app/ as an observation, not a defect.
```

---

## 📦 Expected artifacts

```
specs/
├── contracts/
│   └── api/
│       └── *.yaml                         ← OpenAPI reverse-engineered from api-mock/server.js
└── docs/
    ├── architecture/
    │   ├── overview.md                    ← UI-Router state graph, layer diagram (Mermaid)
    │   ├── components.md                  ← controller ↔ service ↔ Restangular map
    │   └── data-models.md                 ← Flight, Hotel, Trip, ItineraryItem, TravelRequest, ExpenseReport
    ├── technology/
    │   ├── stack.md                       ← AngularJS 1.6.10, Bower, Grunt, Karma
    │   └── dependencies.md                ← 9 Bower + 16 npm
    └── testing/
        └── coverage.md                    ← 1 spec file, 11 tests, 11 failing
```

### What the extraction should find

Use this as your marking scheme at the gate. These are facts about the repo, verified against
source:

| Area | Ground truth |
|------|--------------|
| Framework | AngularJS **1.6.10** (pinned in `bower.json` `resolutions`) |
| Router | `angular-ui-router ~0.4.3`, hash routing, 7 states: `login`, `dashboard`, `flights`, `hotels`, `itinerary`, `travelRequest`, `expenses` |
| HTTP | `restangular ~1.6.1`, base URL hardcoded in `app/app.js` |
| UI kit | `bootstrap ~3.3.7` + `angular-ui-bootstrap ~2.5.6` |
| DOM | `jquery ~2.2.4`, `jquery-ui ~1.12.1` |
| Dates | `moment ~2.18.1` |
| Utils | `lodash ~4.17.4` |
| Feature modules | **5** — flight-search, hotel-booking, itinerary, travel-request, expense-reconciliation |
| Directives | **3** — `approval-status`, `currency-input`, `date-picker` |
| Filters | **2** — `currency`, `dateFormat` |
| Services | **3** app-level (`api`, `auth`, `user`) + 5 feature-level |
| Build | Grunt 1.x — `concat`, `uglify`, `cssmin`, `connect`, `watch`, `copy` |
| Packages | Bower, with `bower_components/` committed |
| Tests | Karma 1.7 + Jasmine 2.8, `test/spec/flight-search.spec.js`, 11 tests, **11 failing** |
| Backend | Express mock API, `api-mock/server.js`, JWT middleware via `jsonwebtoken` |

---

## 📤 Outcome

> ⏳ **Pending** — this section gets filled in from the real run.
>
> Once you have run the prompt, paste back:
> 1. The branch and `git --no-pager diff --stat lab/00-spec2cloud-init..lab/01-b1-extract`
> 2. What `codebase-scanner` actually detected (vs. the ground-truth table above)
> 3. How many routes `api-extractor` found in `api-mock/server.js`
> 4. Whether `data-model-extractor` found all six entities
> 5. Anything the extraction got **wrong** — that is the most valuable part of this doc
> 6. Whether `.spec2cloud/state.json` finally appeared (see the [step 00 finding](00-spec2cloud-init.md#️-finding-spec2cloud-was-not-created))

---

## 🧑‍⚖️ Human gate — Extraction Review

> 🔴 **Blast radius if you rubber-stamp this: every spec below is fiction.**

Do not approve until you have personally checked:

- [ ] **Module count is 5**, not 4 and not 6
- [ ] The UI-Router state graph in `overview.md` matches `app/app.routes.js` — all 7 states
- [ ] `dependencies.md` lists **9** Bower runtime deps, and reports `angular-ui-bootstrap` as
      *declared* (it is in `app/app.js`'s module list) — check whether it also claims it is *used*
- [ ] `data-models.md` covers all six entities: Flight, Hotel, Trip, ItineraryItem, TravelRequest,
      ExpenseReport
- [ ] `coverage.md` says **11 tests, 11 failing** — not "tests exist" and not "no tests"
- [ ] The OpenAPI contract's route count matches `api-mock/server.js`
- [ ] **No recommendations anywhere.** Search the output for "should", "recommend", "consider",
      "modern", "best practice". Any hit is a violation of the extraction rules — send it back.
- [ ] `git diff` touches nothing under `app/`, `api-mock/` or `test/`

---

## ⚠️ Pitfalls

<details>
<summary><b>The agent starts "helpfully" fixing things</b></summary>

Classic failure mode. It notices `moment("08/15/2026")` has no format string and edits the
controller. **B1 is read-only.** If this happens, revert and re-prompt with
`Do not modify a single file under app/` restated first, not last.
</details>

<details>
<summary><b>Extraction drowns in <code>bower_components/</code></b></summary>

There are thousands of vendored files in there. Without the out-of-scope block the agent will
try to inventory them, blow the context window, and produce a stack document that is 80% Angular's
own source. The fact that matters is *"dependencies are vendored and committed"* — one sentence.
</details>

<details>
<summary><b>"36 routes" from the README is not evidence</b></summary>

The root README says the mock API has *~36 routes*. That is an approximation written by a human.
`api-extractor` must count them from `api-mock/server.js`. If it just repeats "36", ask it to
list them.
</details>

<details>
<summary><b>Opinions smuggled in as adjectives</b></summary>

"Legacy jQuery usage", "outdated Bower workflow", "problematic global CSS" — all judgments
wearing a factual coat. The correct phrasing is "jQuery 2.2.4 is used in
`flight-search.controller.js` lines N–M for scroll animation". Facts have line numbers.
</details>

---

## ⏭️ Next

[**Step 02 — B2 · Spec-Enable**](02-b2-spec-enable.md) — turn the extraction into a PRD and five
FRDs.
