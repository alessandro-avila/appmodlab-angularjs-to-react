# Step 01 · B1 · Extract

> **Phase** B1 · Extract &nbsp;|&nbsp; **Branch** [`lab/01-b1-extract`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/01-b1-extract) &nbsp;|&nbsp; **Parent** `lab/00-spec2cloud-init`
> **Human gate** 🧑‍⚖️ Extraction Review &nbsp;|&nbsp; **Status** ✅ Run complete, gate **approved**

---

## 🎯 Goal

Six skills read the legacy codebase and **write down reality**. No opinions, no improvements, no "this should be refactored". The output is a factual snapshot of what exists in August 2016 terms.

This is the foundation everything else stands on. If the extraction says there are four feature modules when there are five, the PRD is wrong, the FRDs are wrong, the Gherkin is wrong, and you migrate a system that does not exist.

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

- [ ] [Step 00](00-spec2cloud-init.md) complete,  `AGENTS.md` and `.github/skills/` exist
- [ ] `npm start` runs; app renders at http://localhost:8080
- [ ] Copilot CLI authenticated (`copilot`)

---

## 🌿 Branch setup

```bash
git switch lab/00-spec2cloud-init
git switch -c lab/01-b1-extract
git checkout main -- docs/ README.md   # current lab instructions
```

<sub>That third line matters. `docs/` lives on `main`; a `lab/*` branch cut from its predecessor carries whatever `docs/` looked like back then. Increment 0 was run against instructions **1935 lines out of date** because of exactly this — see [step 08](08-deliver-inc0-shell.md#-outcome).</sub>

---

## 🗣️ The prompt

```text
Run Phase B1 extraction on this legacy AngularJS application.

Scope is app/, api-mock/, test/, and the build manifests (bower.json, package.json,
Gruntfile.js). Ignore node_modules/ and do not inventory bower_components/ — record
only the fact that dependencies are vendored and committed.

Two rules I care about: where a comment, a README or a filename disagrees with the code, the code wins. And where you cannot determine something from the source, write "unknown" rather than guessing.
```

<details>
<summary><b>Why the prompt is shaped like this</b></summary>

`AGENTS.md` already knows B1 means six skills, what order they run in, where they write, and that extraction carries no judgment. Restating all of that is noise and it trains you to write prompts that stop working the moment the framework changes.

What the agent genuinely cannot know is in the three sentences that remain:

- **`bower_components/` is committed to this repo.** 2016 archaeology. Without that line the agent inventories every file in Angular's dist folder and burns the context window before it reaches `app/`.
- **"the code wins"** is the brownfield golden rule. `bower.json` declares
  `angular-ui-bootstrap`; `app/app.js:10` loads the module. Neither is evidence it is *used*.
  Only the templates are.
- **"write unknown rather than guessing"** is the highest-value instruction in the whole
  walkthrough. Extraction that hallucinates is worse than extraction that admits a gap, because
  everything downstream treats it as fact.
</details>

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

Use this as your marking scheme at the gate. These are facts about the repo, verified against source:

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
| Filters | **4** registrations across **2** files — `usdCurrency`, `gtDateFormat`, `gtTimeAgo`, `gtDuration` |
| Services | **8** `.service()` registrations, **0** `.factory()` |
| Controllers | **5** named + **1** inline anonymous (the login controller in `app.routes.js`) |
| Build | Grunt 1.x — `concat`, `uglify`, `cssmin`, `connect`, `watch`, `copy` |
| Packages | Bower, with `bower_components/` committed |
| Tests | Karma 1.7 + Jasmine 2.8, `test/spec/flight-search.spec.js`, 11 tests, **11 failing** |
| Backend | Express mock API, `api-mock/server.js`, **36 routes**, JWT middleware via `jsonwebtoken` |

---

## 📤 Outcome

> ✅ **Ran 2026-08-03** on `lab/01-b1-extract` via `copilot --autopilot`.
> **14 artifacts, ≈251 KB, written in 41 minutes.** Source untouched.
> Extraction Review gate **approved** — see [Human gate](#️-human-gate--extraction-review).
>
> 📂 **Artifacts:** [`lab/01-b1-extract`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/01-b1-extract)
> &nbsp;·&nbsp; [compare against `lab/00-spec2cloud-init`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/compare/lab/00-spec2cloud-init...lab/01-b1-extract)

### What was produced

Everything below was **untracked working-tree output** during the run, which is correct: the gate
comes before the commit.

| Artifact | Size | Skill | Written |
|---|---:|---|---|
| `.spec2cloud/state.json` | 2.0 KB | B0 protocol | 14:31 |
| `.spec2cloud/audit.log` | 3.2 KB | B0 protocol | 14:31 |
| `specs/docs/technology/stack.md` | 24.0 KB | `codebase-scanner` | 14:33 |
| `specs/docs/technology/dependencies.md` | 17.5 KB | `dependency-inventory` | 14:36 |
| `specs/docs/architecture/overview.md` | 32.6 KB | `architecture-mapper` | 14:39 |
| `specs/docs/architecture/components.md` | 25.2 KB | `architecture-mapper` | 14:50 |
| `specs/contracts/api/auth.yaml` | 8.6 KB | `api-extractor` | 14:51 |
| `specs/contracts/api/flight-search.yaml` | 15.3 KB | `api-extractor` | 14:52 |
| `specs/contracts/api/hotel-booking.yaml` | 17.3 KB | `api-extractor` | 14:53 |
| `specs/contracts/api/itinerary.yaml` | 16.7 KB | `api-extractor` | 14:56 |
| `specs/contracts/api/travel-request.yaml` | 17.5 KB | `api-extractor` | 14:57 |
| `specs/contracts/api/expense-reconciliation.yaml` | 20.8 KB | `api-extractor` | 15:00 |
| `specs/docs/architecture/data-models.md` | 35.4 KB | `data-model-extractor` | 15:07 |
| `specs/docs/testing/coverage.md` | 20.7 KB | `test-discovery` | 15:12 |

≈251 KB, extracted **14:31 → 15:12 (41 min)**.

### Counts it verified

From `.spec2cloud/state.json` — every one re-counted from source during the gate review, **all
correct**:

| | | | |
|---|---|---|---|
| files in scope **30** | lines in scope **5,966** | angular modules **1** | feature verticals **5** |
| UI-Router states **7** | controllers **5 + 1 inline** | services **8** | directives **3** |
| filters **4** | Express routes **36** | OpenAPI operations **36** | Bower runtime deps **9** |

The 36 OpenAPI operations were re-counted straight out of the six YAML files — 3 + 6 + 5 + 8 + 7 + 7
— and reconcile **1:1 with the 36 Express routes, by method and path**. That is a real
correspondence, not two numbers that happen to agree. **It also settles the README's unverified
"~36 routes" claim.**

---

### 🔍 What it found — the part that actually matters

This is the payload of B1. Extraction is not a formality that produces a file tree; it is the pass
that tells you **what you are really migrating**. Reading the code closely enough to describe it
surfaced defects that nobody had written down — several of which change how the React version must
behave.

**Latent bugs in the legacy app.** Every one of these was re-verified against source before the
gate was approved:

| What | Where | Why it matters for the migration |
|---|---|---|
| **Auth survives reload, the user does not** | `auth.service.js:42` vs `:50` | `isAuthenticated()` reads the `localStorage` token; `getCurrentUser()` returns `$rootScope.currentUser`, which is in-memory. After a refresh you are authenticated with **no user object**. The doc-comment above it even says *"Get current user from localStorage"* — the comment describes the intended design, the body does not implement it. |
| **Room booking totals are `NaN`** | `hotel-booking.controller.js:231` | Reads `selectedRoom.pricePerNight`. Rooms carry `price` (`server.js:131-133`); only *hotels* carry `pricePerNight` (`:127`). `undefined * n * n` → `NaN` written straight into `totalPrice`. |
| **Stored vs computed trip cost disagree** | `Trip.totalCost` | The seeded value and the client-side recomputation differ for **both** seeded trips. Whichever React picks is a visible behaviour change, so it has to be a deliberate decision. |
| **Emptying an expense report leaves a stale total** | `server.js:652` | The recalculation is guarded by `expenses.length > 0`. Remove the last expense and `totalAmount` keeps its old value forever. |
| **Itinerary notes are a scalar behind a plural route** | `POST /api/itinerary-items/:id/notes` | The handler *assigns* rather than appends. The second note silently replaces the first. |
| **Currency is stored and never honoured** | `Expense.currency` | Persisted, read by no code. `totalAmount` sums mixed currencies with no conversion. |

**Dead surface — code that exists but nothing reaches.** Each of the following appears **exactly
once** in the entire repository, at its own definition:

- `ApiService` — registered at `api.service.js:9`, injected nowhere.
- `linkToTravelRequest` — defined at `expense.service.js:107`, called by nothing. It is the only
  writer of `ExpenseReport.travelRequestId`, which is therefore `null` in every seed.
- `travelPolicy.preferredHotels` — written at `server.js:266` as `Marriott` / `Hilton` / `Hyatt`,
  read by nothing. Worth noting anyway: none is an exact member of `hotelNames`, which holds
  `Marriott Marquis`, `Hilton Garden Inn`, `Grand Hyatt`. Had anything compared them, it would
  have matched nothing.
- `gtDatePicker` — the directive is registered, but **no template uses `gt-date-picker`**. All
  four date-handling controllers call `$('#...').datepicker(...)` directly instead.

That last one reframes a migration task. "Port the datepicker directive" is the wrong job: the
directive is dead, and the real work is **8 direct jQuery calls across 4 controllers**.

**It also refused to be led.** 14 files under `app/` carry comment headers with the words `Legacy`
and `Anti-patterns:` — the codebase editorialising about itself. The extraction recorded them as
*comments that describe no behaviour* rather than promoting them to findings. That is exactly right:
B1 documents what the code **does**, and a comment is not behaviour. The judgement call belongs to
Phase A, later.

---

### 📌 Two findings for the framework

**1. `.spec2cloud/state.json` and `audit.log` do exist — they are created at B0, not at init.**
This closes the open question from
[step 00](00-spec2cloud-init.md#️-finding-spec2cloud-was-not-created). `spec2cloud init` does not
write them; the **first orchestrator run** does, as its first act (`audit.log` line 2:
`action=init-state ... created .spec2cloud/state.json and .spec2cloud/audit.log`). The README is
describing the right files at the wrong moment.

**2. 🔴 `audit.log` was silently gitignored — now fixed.** `git check-ignore` caught it:

```
.gitignore:2:*.log      .spec2cloud/audit.log
```

spec2cloud documents `audit.log` as *"workflow state, committed to git"*, but this repo's generic
`*.log` rule swallowed it — so `git status` showed only `state.json`, and the audit trail would
never have reached the branch. **Fixed on this run** by adding a negation immediately after the
`*.log` line:

```gitignore
*.log
!.spec2cloud/*.log
```

`git add -n .spec2cloud/` now lists `audit.log` alongside `state.json`. Without this, every step in
this lab loses its provenance record — and you would not notice, because nothing errors.

### The prompt, unchanged

The prompt in this doc was used **verbatim** — confirmed from the session transcript. No follow-up
steering was needed.

---


## 🧑‍⚖️ Human gate — Extraction Review

> 🔴 **Blast radius if you rubber-stamp this: every spec below is fiction.**
>
> **Status on this run: ✅ APPROVED**, after one correction. `state.json` now records
> `"brownfield-b1-extraction-approved": true`.

Do not approve until you have personally checked:

- [x] **Module count is 5**, not 4 and not 6 — ✅ verified
- [x] The UI-Router state graph in `overview.md` matches `app/app.routes.js` — ✅ all 7 states, and
      the three Mermaid diagrams agree with each other
- [x] `dependencies.md` lists **9** Bower runtime deps, and reports `angular-ui-bootstrap` as
      *declared* — ✅ and it correctly proves it is **not used**, with the grep
- [x] `data-models.md` covers the entities — ✅ found **15** (11 persisted + 4 generated), well
      beyond the 6 this checklist originally asked for
- [x] `coverage.md` says **11 tests, 11 failing** — ✅ with the runner output and a two-error
      breakdown
- [x] The OpenAPI contract's route count matches `api-mock/server.js` — ✅ **36 = 36**, and matched
      **1:1 by method and path**, not merely by count
- [x] **No recommendations anywhere.** — ✅ the agent ran this scan on itself:
      `verify-extraction-purity` returned 23 banned-word hits, triaged all as quoted evidence
      (Jasmine test names, source comments, npm package names) except one `itinerary.yaml` summary,
      which it reworded to remove the inference. A second, independent scan at the gate found none.
- [x] `git diff` touches nothing under `app/`, `api-mock/` or `test/` — ✅ empty, independently
      re-verified
- [x] **Every artifact admits what it could not determine** — ✅ `components.md`, `data-models.md`,
      `overview.md` and `coverage.md` each carry a `## Not determinable from source` section that
      says *why* the gap cannot be closed instead of guessing
- [x] `.gitignore` amended so `.spec2cloud/audit.log` is not silently dropped — ✅ added
      `!.spec2cloud/*.log`; `git add -n` now lists `audit.log`

**One correction was required before approving.** `data-models.md:37` read *"**Four** module-level
JavaScript arrays and one object literal"*, while its own evidence column immediately below listed
**five** — `users:42`, `airports:50`, `trips:142`, `travelRequests:175`, `expenseReports:222` — and
the diagram in the next section drew five nodes. Corrected to *"Five"*. The count appears nowhere
else, so the slip was isolated.

<details>
<summary><b>Why "approve" and not "approve with reservations"</b></summary>

The distinction that decided it: **the checks are structural, not statistical.** A count agreeing
with a count is weak evidence — two independent mistakes can produce the same number. What was
verified here is that the 36 extracted operations and the 36 source routes are the *same 36*, as a
set difference. That is falsifiable, and it came back empty.

The stronger signal is that the extraction **found things nobody had written down** — the `NaN`
booking total, the auth-reload split, the four dead code paths. An extraction that merely
paraphrases the README cannot do that. It read the code.

And it declined the bait: 14 files carry `Legacy` / `Anti-patterns:` comment headers, and it
recorded them as comments rather than promoting them to findings. A rubber-stamping extraction
would have copied the codebase's opinion of itself straight into the specs, and B2 would have
inherited it as fact.
</details>

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

**On this run it did the work** — 36 Express routes, cross-checked 1:1 by line, method and path,
and emitted 36 OpenAPI operations across six files. The approximation happened to be exact.
</details>


<details>
<summary><b>🆕 <code>.spec2cloud/audit.log</code> is gitignored by a generic <code>*.log</code> rule</b></summary>

`git check-ignore -v .spec2cloud/audit.log` → `.gitignore:2:*.log`. spec2cloud treats the audit log
as committed state; this repo's `.gitignore` disagreed, silently. Check before your first commit, or
the provenance trail for every step of this lab is lost. **Fixed here** with a `!.spec2cloud/*.log`
negation placed directly after the `*.log` rule — order matters in `.gitignore`, a negation cannot
resurrect a file whose parent *directory* is excluded.
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
