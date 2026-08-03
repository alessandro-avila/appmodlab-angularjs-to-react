# Step 01 · B1 · Extract

> **Phase** B1 · Extract &nbsp;|&nbsp; **Branch** [`lab/01-b1-extract`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/01-b1-extract) &nbsp;|&nbsp; **Parent** `lab/00-spec2cloud-init`
> **Human gate** 🧑‍⚖️ Extraction Review &nbsp;|&nbsp; **Status** ⚠️ Run complete — 12 artifacts good, 2 damaged, gate **not yet approved**

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
```

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

> ⚠️ **Two rows in this table were wrong when it was written, and the extraction caught both.**
> It originally said *2 filters (`currency`, `dateFormat`)* — that counted **files**, not
> registrations, and got the names wrong; there are 4, and they are prefixed (`usdCurrency`,
> `gtDateFormat`, `gtTimeAgo`, `gtDuration`). It also listed only 6 data entities; the extraction
> found 15. Both are corrected above. Kept visible rather than quietly fixed, because the
> lesson generalises: **a hand-written expectation is not ground truth — the source is.** Bring
> the marking scheme to the gate, but let the code settle disputes.

---

## 📤 Outcome

> ✅ **Ran 2026-08-03** on `lab/01-b1-extract` via `copilot --autopilot`.
> **14 artifacts written.** 2 were damaged by an agent bug after extraction finished; both have
> since been **fully recovered and verified**. Source untouched.
> Extraction Review gate **not yet approved** — one reconciliation item remains, see
> [Human gate](#️-human-gate--extraction-review).
>
> 📂 **Artifacts:** commit
> [`316bece`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/commit/316bece)
> on [`lab/01-b1-extract`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/01-b1-extract)
> &nbsp;·&nbsp; [compare against `lab/00-spec2cloud-init`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/compare/lab/00-spec2cloud-init...lab/01-b1-extract)

### What was produced

During the run these were **untracked working-tree output**, which is correct: the gate comes
before the commit. They were committed only after the corrupted artifacts had been recovered and
re-verified.

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

≈251 KB. Extraction proper ran **14:31 → 15:12 (41 min)**; the remaining ~30 min went on
verification and then on the corruption incident below.

### Counts it verified

From `.spec2cloud/state.json` — every one of these was cross-checked against source while writing
this doc, and **all are correct**:

| | | | |
|---|---|---|---|
| files in scope **30** | lines in scope **5,966** | angular modules **1** | feature verticals **5** |
| UI-Router states **7** | controllers **5 + 1 inline** | services **8** | directives **3** |
| filters **4** | Express routes **36** | OpenAPI operations **36** | Bower runtime deps **9** |

The 36 OpenAPI operations were re-counted straight out of the six YAML files — 3 + 6 + 5 + 8 + 7 + 7
— and they reconcile exactly with the 36 Express routes. **This settles the README's unverified
"~36 routes" claim.**

### Three things it got right that are worth calling out

**1. It corrected the project's own README.** `dependencies.md` carries a
README-versus-reality table: the README claims *8 Bower packages*, the extraction found **9** and
named the omission — `bootstrap ~3.3.7`. That is the "code wins" rule in the prompt doing real work.

**2. It proved a negative properly.** `ui.bootstrap` is declared in `bower.json:14`, registered at
`app/app.js:10` and script-tagged at `index.html:54` — and matched **zero** times across `app/**`
for `uib-`, `$uibModal`, `uibDate`. It reported the dependency as declared-but-unused *with the
grep that justifies it*, rather than asserting it.

**3. Its failure analysis is better than the one in this doc's own scaffold.** This walkthrough had
described the 11 red tests as having "three causes". The extraction found the real structure:

- **Error A — `No pending request to flush!`, 11×** (one per test). `FlightSearchController` issues
  no HTTP on construction, so the `flush()` after `createController()` always throws. It then makes
  a distinction this doc had missed: the `whenGET(/\/api\/flights\/popular/)` stub at `:27` is
  **passive** — unlike `expectPOST` it creates no outstanding expectation, so it produces no
  second error.
- **Error B — `Unsatisfied requests: POST /api/flights`, 2×.** `FlightSearchService.search` issues
  a **GET** (`flight-search.service.js:19` → `GET /api/flights`), so the `expectPOST` in tests 6
  and 7 is never satisfied. `api-mock/server.js:333` does declare `POST /api/flights`, but nothing
  in `app/` calls it.
- **Plus four assertions that would still fail** even with `flush()` fixed — and it checked each
  rather than assuming. Test 5 asserts `errorMessage` contains `'origin'`; the real message is
  `'Please enter origin and destination.'`, so it **would pass**. That is a falsifiable claim the
  scaffold had lazily lumped in with the genuine mismatches.

### ⚠️ The incident: two artifacts corrupted by an agent bug

Roughly 20 minutes after the last skill finished, the agent damaged two of its own outputs.

**Root cause**, from `corrupted-backup/REPAIR-NOTE.md`: a PowerShell helper was handed a single
`@(@('old','new'))` pair. PowerShell flattens a one-element array of arrays, so the loop iterated
the **two strings** instead of the one pair. `$p[0]` then indexed the *first character* of a string
and `$p[1]` the second — turning an intended token substitution into a blind single-character
`.Replace()` across the whole file.

| File | Damage | Outcome |
|---|---|---|
| `specs/docs/architecture/components.md` | every lowercase `t` → `h` (0 `t` / 1891 `h` remaining) | ✅ **Fully recovered** — 387 distinct word-runs restored, 0 unresolved |
| `specs/docs/architecture/overview.md` | every uppercase `U` → `R`, then a half-finished manual repair | ✅ **Fully recovered** — 19 replacements, 0 unresolved |

The header of `components.md` read `# Componenh Invenhory — globalhravel-porhal`. The repair note
judged it **unrecoverable**, on sound reasoning: once every `t` is an `h`, an original `h` and an
original `t` are indistinguishable *by character inspection*. Uppercase survived, so `CamelCase`
capitals were intact, but that alone does not disambiguate `hesh` → `test`/`tesh`/`hest`/`hesth`.

`overview.md` was in a worse state — three manual edits had landed before repairs were halted, so
Mermaid diagram 1 declared nodes under corrupted ids and referenced them under corrected ones.

**What did *not* happen matters more.** `git diff --name-only HEAD` is empty. Nothing under `app/`,
`api-mock/` or `test/` was touched. The blast radius was entirely inside `specs/`, and both
originals were backed up before repair was attempted:

```
~/.copilot/session-state/00bb33c6-.../files/corrupted-backup/
├── components.corrupt.md   25.2 KB
├── overview.corrupt.md     32.6 KB
└── REPAIR-NOTE.md           6.0 KB   ← root cause, token map, and the traps in applying it
```

The agent recorded the failure honestly rather than hiding it — `audit.log` carries
`action=artifact-corruption result=error` and `action=repair-halted result=blocked`, and
`state.json` set `"extractionStatus": "complete-with-damaged-artifacts"` with a per-file
`damagedArtifacts` array. **That is the behaviour you want.** A silent partial repair would have
sailed through the gate.

### 🛠️ How both files were recovered

Character-level inspection is the wrong frame. These artifacts are **redundant technical English
about a codebase that is right there on disk**, and — critically — **twelve sibling extraction
artifacts were undamaged and share the same vocabulary**. That turns an information-theory problem
into a dictionary lookup.

The method, applied to both files:

1. **Build a weighted corpus** from the uncorrupted `specs/**` artifacts, all source under `app/`,
   `api-mock/` and `test/`, the manifests, and a small English function-word list.
2. **Enumerate candidates.** For each word-run containing the substituted character, generate all
   2ⁿ readings (each `h` was either an original `h` or an original `t`).
3. **Score against the corpus**, exact-case weighted above lowercase, and take the best.
4. **Override by hand** only where the corpus genuinely could not decide.

| | `components.md` | `overview.md` |
|---|---|---|
| Distinct runs repaired | 387 | 19 |
| Unresolved | 0 | 0 |
| Ambiguous ties | 0 | 0 |

The corpus did the heavy lifting unaided: `wihhHhhpConfig` → `withHttpConfig`, `localShorage` →
`localStorage`, `jsonwebhoken` → `jsonwebtoken`, `cushomPUT` → `customPUT`, `bhn` → `btn`, `dish` →
`dist`. Best of all, bare `gh` → `gt` — recovering the project's own filter prefix and yielding
`gtDateFormat`, `gtTimeAgo`, `gtDuration`, which match the real registrations exactly.

Two classes of word needed human judgement, and both are instructive:

- **Genuine `h`-words that must not change.** `hides` ("shows/hides a jQuery overlay") and
  `enriches` ("enriches each result") are correct as written. A naive `h`→`t` pass destroys them.
- **Identifiers with no linguistic signal.** Mermaid's
  `classDef ghosh fill:none,shroke:none,color:hransparenh` → `ghost` / `stroke` / `transparent`.

`overview.md` needed three fixes the token pass could not make safely, all flagged in the repair
note. Both sequence diagrams declared `participant R as Rser` (= `User`), but **diagram 1 also
declares `participant R as Restangular`** — a genuine id collision. Only the `User` participant and
the two user-initiated `clicks` arrows become `U`; every other `R->>` is legitimately Restangular
and had to stay.

<details>
<summary><b>Verification — how we know the repair is right, not just plausible</b></summary>

Plausibility is not enough for an artifact that feeds PRD/FRD generation. Three independent checks:

1. **Cross-reference identifiers against source.** All 7 directive and filter names in
   `components.md` — and all 7 declaration line numbers — match `app/` exactly:
   `gtApprovalStatus:13`, `gtCurrencyInput:13`, `gtDatePicker:13`, `usdCurrency:12`,
   `gtDateFormat:14`, `gtTimeAgo:47`, `gtDuration:60`. A wrong repair does not land 7/7 on both
   name and line.
2. **Residue scan.** Case-sensitive grep for corruption signatures returns nothing in
   `overview.md`. In `components.md` the only `hh` digraphs left are `searchHotels` and
   `withHttpConfig` — both correct camelCase.
3. **Vocabulary sweep.** Every word in the repaired files that appears nowhere in the sibling corpus
   was listed and read by hand: ~40 words, all ordinary English (`Responsibilities`, `deregistered`,
   `twelve`) or Mermaid node ids (`RST`, `AUTHS`, `UIR`). No misses.

Plus a structural check on `overview.md`: all three Mermaid sequence diagrams now declare exactly
the participants they use — the collision is gone.

Sampling 8 source line references turned up 2 imprecisions unrelated to the corruption:
`app/app.js:19` and `api-mock/server.js:29` point at the enclosing block rather than the exact
statement (the real ones are `:21` and `:31`). Recorded in `state.json` under
`extractionAccuracyNotes` rather than silently patched — the extraction's own accuracy is the gate's
business, not the repair's.
</details>

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

<details>
<summary><b>Minor: a counting inconsistency inside the artifacts</b></summary>

`state.json` records `9 persisted + 4 generated` entities. `data-models.md` actually carries **11**
persisted headings (User, Airport, Trip, ItineraryItem, TravelRequest, EstimatedCosts, Traveler,
Approval, ExpenseReport, Expense, TravelPolicy — 6 top-level, 5 embedded) and 4 generated (Flight,
Hotel, Room, Review). The document is the more careful artifact; the summary count in `state.json`
matches neither the top-level nor the total. Small, but exactly the class of thing the gate exists
to catch — reconcile it before approving.
</details>

### The prompt, unchanged

The prompt in this doc was used **verbatim** — confirmed from the session transcript. No follow-up
steering was needed to get the extraction done; the only later turns concerned the corruption.

---

## 🧑‍⚖️ Human gate — Extraction Review

> 🔴 **Blast radius if you rubber-stamp this: every spec below is fiction.**
>
> **Status on this run: NOT APPROVED.** `state.json` records
> `"brownfield-b1-extraction-approved": false`. Both damaged artifacts are now recovered; the
> outstanding blocker is the entity-count discrepancy.

Do not approve until you have personally checked:

- [x] **Module count is 5**, not 4 and not 6 — ✅ verified
- [x] The UI-Router state graph in `overview.md` matches `app/app.routes.js` — all 7 states
      &nbsp;·&nbsp; ✅ *unblocked: `overview.md` recovered, all three Mermaid diagrams consistent*
- [x] `dependencies.md` lists **9** Bower runtime deps, and reports `angular-ui-bootstrap` as
      *declared* — ✅ and it correctly proves it is **not used**, with the grep
- [x] `data-models.md` covers the entities — ✅ found **15** (11 persisted + 4 generated), well
      beyond the 6 this checklist originally asked for
- [x] `coverage.md` says **11 tests, 11 failing** — ✅ with the runner output and a two-error
      breakdown
- [x] The OpenAPI contract's route count matches `api-mock/server.js` — ✅ **36 = 36**
- [x] **No recommendations anywhere.** — ✅ the agent ran this scan on itself:
      `verify-extraction-purity` returned 23 banned-word hits, triaged all as quoted evidence
      (Jasmine test names, source comments, npm package names) except one `itinerary.yaml` summary,
      which it reworded to remove the inference
- [x] `git diff` touches nothing under `app/`, `api-mock/` or `test/` — ✅ empty, independently
      re-verified
- [x] 🆕 `components.md` and `overview.md` recovered — ✅ 387 and 19 runs restored, 0 unresolved;
      7/7 identifiers **and** their line numbers re-verified against `app/`
- [ ] 🆕 `state.json`'s entity count reconciled with `data-models.md`
- [x] 🆕 `.gitignore` amended so `.spec2cloud/audit.log` is not silently dropped — ✅ added
      `!.spec2cloud/*.log`; `git add -n` now lists `audit.log`

**Ten of eleven checks pass on evidence.** The extraction *itself* was never in question — the
damage was inflicted after the skills had finished, by a post-processing bug, and has been undone.
The one open item is a genuine extraction discrepancy: `state.json` says 9 persisted entities,
`data-models.md` carries 11 persisted headings. Reconcile before approving.

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
<summary><b>🆕 The agent's own shell scripting is inside the blast radius</b></summary>

Earned the hard way on this run. The six extraction skills behaved perfectly; then a
**post-processing PowerShell one-liner destroyed two finished artifacts** — a one-element array of
pairs got flattened, and a token substitution became a blind single-character replace across two
whole files.

Two lessons worth more than the incident cost:

- **Batch text surgery on artifacts is dangerous even when the source is untouched.** "It's only
  editing markdown" is how you lose 25 KB of verified work. Back up before scripted rewrites —
  this agent did, which is the only reason recovery was possible at all.
- **Check for *damage*, not just for correctness, at the gate.** A file can be structurally intact,
  the right length, and full of confident prose while being systematically wrong. `git status`
  showed nothing unusual; the only signal was reading it. `wc`, `git diff --stat` and a glance at
  the file tree would all have passed.

Cheap detection: grep a corrupted-looking artifact for a word you *know* must appear. Zero hits for
`the` in an English document is conclusive.

And a third, learned during recovery: **"unrecoverable" is a claim about a method, not about a
file.** The repair note declared `components.md` a write-off because original `t` and original `h`
had become indistinguishable — true, *character by character*. But the file was ordinary technical
English about a codebase sitting on disk, next to twelve undamaged siblings using the same
vocabulary. Scored against that corpus, 387 of 387 ambiguous runs resolved with zero ties. Before
regenerating a damaged artifact, ask what *else* in the repo already encodes its content.
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
