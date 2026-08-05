# Step 03 · The Testability Gate

> **Phase** Gate (between B2 and B3) &nbsp;|&nbsp; **Branch** [`lab/03-testability-gate`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/03-testability-gate) &nbsp;|&nbsp; **Parent** `lab/02-b2-spec-enable`
> **Human gate** 🧑‍⚖️ Testability Gate &nbsp;|&nbsp; **Status** ✅ Verified

---

## 🎯 Goal

Answer six questions about the legacy app, honestly, **with evidence**, and pick a track. This
decision determines whether you migrate with an executable safety net or with a checklist and
hope.

It is the highest-leverage gate in the whole workflow, and the easiest one to lie to yourself
about.

```
5–6 ✅  🟢 Track A — Green Baseline    executable tests that pass against the legacy app
3–4 ✅  🟡 Hybrid                       Track A for testable features, Track B for the rest
0–2 ✅  📋 Track B — Doc-Only           @documentation-only scenarios + manual checklists
```

---

## 🧰 Skills invoked

| Skill | Purpose |
|-------|---------|
| `human-gate` | Presents the checklist, blocks until you decide |
| `adr` | Writes `specs/adrs/adr-003-testability-gate.md` |
| `state-management` | Records `testability`, `track`, `testabilityChecklist` in `.spec2cloud/state.json` |
| `test-runner` | Runs the existing suite so question 6 has evidence |

---

## ✅ Prerequisites

- [ ] [Step 02](02-b2-spec-enable.md) approved at all three gates
- [ ] PRD + **6** FRDs exist and are accurate
- [ ] `npm start` is running (mock API :3000 + web :8080)

> **Two of this gate's inputs are already answered.**
> [ADR-002](02-b2-spec-enable.md#-outcome--adr-002-the-remaining-product-questions) settled **Q-10**
> (the 9 unreferenced registrations are dead code, not product surface) and **Q-11** (the 11 failing
> Jasmine tests are *stale* and carry **no authority** over the Track A baseline). Q-11 matters here:
> it is the written permission to score question 6 ✅ rather than ❌ — see
> [Question 6 is the interesting one](#question-6-is-the-interesting-one) below.
> **Q-12** put production deployment out of scope, so nothing downstream of this gate provisions
> infrastructure.

---

## 🌿 Branch setup

```bash
git switch lab/02-b2-spec-enable
git switch -c lab/03-testability-gate
```

---

## 🗣️ The prompt

```text
Run the Testability Gate assessment on this repository.

Do not answer any of the six questions from inspection — run the thing and paste the
real output. For the UI question that means actually driving it with the Playwright
MCP server: start the app, click through Enter Portal to #!/flights, screenshot what
you get. An assertion without output is not an answer.

One thing you need to know before you score question 6: the Karma suite here is
expected to fail 11 of 11. A suite that runs and reports failures is executable and
passes that check. A suite that cannot launch a browser is not. Work out which this
is and say so explicitly.

When you drive the UI, reload the page once after logging in and check whether the
session survives it. B1 found the auth check and the current-user lookup reading
from different places, so this may not behave the way a login normally does. If a
test would have to avoid reloading to stay green, that is a testability constraint
and it belongs in the ADR.

Then propose a track against the thresholds, write the ADR with pass/fail and evidence
per item plus the alternatives you rejected, and update state.json.

Stop at the gate. Do not start generating Gherkin.
```

<details>
<summary><b>Why "make it prove it" matters most here</b></summary>

Every other gate reviews a document. This one reviews a *claim about reality*. An agent that has
not actually run `npm test` will happily report "test suite executable ✅" because
`package.json` has a `test` script. That is how teams end up on Track A with no green baseline
and discover it three increments later.

Question 4 is the one people fake most often. "The UI can be rendered" is not established by the
existence of `index.html`. Drive a browser.
</details>

---

## 📦 Expected artifacts

```
specs/adrs/
└── adr-003-testability-gate.md         ← the decision + evidence + alternatives

.spec2cloud/
├── state.json                          ← track: "A", testability: "full"
└── audit.log                           ← the gate approval
```

`state.json` should end up looking roughly like:

```jsonc
{
  "mode": "brownfield",
  "brownfield": {
    "testability": "full",
    "track": "A",
    "testabilityChecklist": {
      "buildsAndStarts": true,
      "dependenciesReachable": true,
      "apiExercisable": true,
      "uiRenderable": true,
      "devEnvironment": true,
      "testSuiteExecutable": true
    },
    "featureTracks": {
      "flight-search": "A",
      "hotel-booking": "A",
      "itinerary": "A",
      "travel-request": "A",
      "expense-reconciliation": "A"
    }
  }
}
```

---

## 🧮 The expected answer: 6/6 → Track A

GlobalTravel Corp scores full marks. Here is the evidence for each, so you can check the agent's
homework:

| # | Question | Answer | Evidence |
|---|----------|--------|----------|
| 1 | Builds and starts locally? | ✅ | `npm start` → `concurrently` runs `node api-mock/server.js` (:3000) + `grunt serve` (:8080). `npm run build` → Grunt concat/uglify/cssmin → `dist/` |
| 2 | External deps reachable or mockable? | ✅ | `api-mock/server.js` is a **self-contained Express app** with in-memory data. No database, no third-party API, no network egress. `bower_components/` is committed, so the front-end has zero network dependencies either. |
| 3 | API exercisable? | ✅ | `curl http://localhost:3000/api/airports` returns JSON. `jsonwebtoken` middleware guards the authenticated routes; the token is the mock JWT written to `localStorage` at login. |
| 4 | UI renderable and interactive? | ✅ | http://localhost:8080 → **Enter Portal** → `#!/flights`. Playwright is pre-installed in the dev container with browsers already downloaded. |
| 5 | Dev/test environment? | ✅ | `.devcontainer/` — Node 22 LTS, Chromium on `CHROME_BIN`, Playwright browsers, ports 3000/8080/35729/5173/4173, multi-arch (amd64 + arm64). |
| 6 | Existing test suite executable? | ✅ | `npm test` → `karma start test/karma.conf.js --single-run`. **Runs. Fails 11/11.** Failing ≠ unrunnable. |

### Question 6 is the interesting one

The trap: *"11 of 11 tests fail, so we cannot run the tests, so ❌."*

Wrong. The distinction the gate cares about is **can you execute the suite and get a signal**,
not **is the signal green**. Karma launches Chromium, loads the app, runs 11 specs, and reports
11 failures with stack traces. That is a working test harness pointed at wrong assertions.

The failures are themselves an asset:

| Failure cause | What it tells you |
|---------------|-------------------|
| `$httpBackend.flush()` with nothing pending | The controller never calls `/api/flights/popular` — the test was written against a version that did, or against a spec that never shipped |
| `$scope.popularRoutes` undefined | Same |
| `$scope.filters` shape mismatch | The filter model was redesigned and the test was never updated |

All three get corrected in [step 04](04-green-baseline.md) — **by fixing the tests**, and by
recording each discrepancy in `specs/frd-flight-search.md`.

---

## 📤 Outcome

> ✅ **Verified** — `94b4ea8` on `lab/03-testability-gate`
>
> **Result: 6 / 6 → Track A**, `testability: "full"`, all six modules assigned to A.

```
 .spec2cloud/audit.log                                    |  20 ++
 .spec2cloud/state.json                                   | 111 +++++--
 specs/adrs/adr-003-testability-gate.md                   | 363 +++++++++++++++++++
 specs/docs/testing/evidence/q4-flight-search-results.png | Bin 0 -> 66805
 4 files changed, 480 insertions(+), 14 deletions(-)
```

`app/`, `api-mock/` and `test/` are byte-identical to step 02 — verified with
`git diff --stat lab/02-b2-spec-enable..lab/03-testability-gate -- app/ api-mock/ test/`, which
returns nothing. The gate observed the application; it did not touch it.

### The six answers

Every one is backed by output from a command that ran, not by a claim.

| # | Question | Evidence that settled it |
|---|----------|--------------------------|
| 1 | Builds and starts | api on `:3000`, web on `:8080`; build emitted `dist/`, 931 files, 91.89 → 40.7 kB |
| 2 | Dependencies reachable | **There are none.** 4 local `require`s, 0 database/http/secret matches, in-memory arrays, 964 vendored files |
| 3 | API exercisable | `200` public · `401` guarded · JWT login succeeded · 2 trips returned authenticated |
| 4 | UI driveable | Playwright drove login → dashboard → flight search → `GET /api/flights…` `200`, 0 console errors, **screenshot committed** |
| 5 | Dev environment | devcontainer pins Node 22, `CHROME_BIN`, Playwright browsers, `--shm-size=1g` — *and* it passed on bare Windows |
| 6 | Suite executable | `HeadlessChrome 150.0.0 … Executed 11 of 11 (11 FAILED)` |

Question 4 is the one that is easy to fake and wasn't: the run committed
`specs/docs/testing/evidence/q4-flight-search-results.png` alongside the answer. That screenshot
went on to produce the most interesting finding of the whole step — see **C-4** below.

### Why question 6 scored ✅ with 11 failures

This is the question the lab was built around, and the ADR answers it in one line: Karma **launched
a browser and reported 11 individual results with `file:line` assertion errors**. A suite that
cannot execute reports `Executed 0 of 0`, or never launches at all. Executable is a property of the
harness; passing is a property of the code. ADR-002 Q-11 had already ruled these tests stale and
stripped their authority, so their colour carries no weight here.

The run then corroborated Q-11 **independently, without being asked to**: the running app issues
`GET /api/flights?…` while the Jasmine spec demands `POST /api/flights`. Both routes exist
server-side. The tests describe a client redesign that was never written — which is exactly what
B2c found from the opposite direction when it caught the undocumented `POST` route at
`api-mock/server.js:333` missing from the flight-search FRD. Two phases, two methods, same fact.

### Four constraints that only a running app could reveal

The gate is scored by *running* the application, and running it turned up four things no amount of
reading would have produced. Two of them are significant.

<details open>
<summary><b>C-1 — the session is authenticated but anonymous after a reload</b> — a false-green risk</summary>

B1 had already recorded that the route guard and the identity lookup read from different places.
What the gate added is the **direction of the failure**, and it is the opposite of what was
predicted:

```
marker_gone_proves_real_reload : true
authToken_still_present        : true
rootScope_currentUser          : null
afterReload_url                : #!/dashboard   ← guard still admits the user
```

`app/app.js:21` tests only for token *presence*. `app/services/auth.service.js:23` holds the only
assignment to `currentUser`, and it runs only inside the login response handler. Zero network
requests after the reload — nothing rehydrates.

The consumers then do not fail. They substitute:

| Location | Falls back to |
|----------|---------------|
| `travel-request.controller.js:172` | `'Demo User'` |
| `expense.controller.js:194` | `'Demo User'` |
| `itinerary.controller.js:147` | `'You'` |

So a test that reloads mid-journey stays logged in, silently swaps the acting identity for a
hardcoded string, and **passes an assertion on traveller name or comment author regardless of who
logged in**. That is a false green, and it is a live hazard for [step 04](04-green-baseline.md).

> One detail the ADR did not record, worth a look when you migrate this service:
> `auth.service.js:47` documents `getCurrentUser` as *"Get current user from localStorage"*.
> Line 51 returns `$rootScope.currentUser`. The comment describes the behaviour that would have
> prevented C-1 — the code never implemented it. The brownfield rule *"when docs and code disagree,
> the code wins"* has a worked example sitting in the file that caused the constraint.
</details>

<details open>
<summary><b>C-4 — the toast says 6, the list shows 4, and both are correct</b> — found in the screenshot</summary>

Visible in the committed Q4 evidence: a toast reading **"Found 6 flights"** directly above a list
headed **"4 flights found"**.

```
flights (from API)  : 6   prices 230, 382, 475, 533, 638, 642
filters.maxPrice    : 630
filteredFlights     : 4   prices 230, 382, 475, 533
```

The mechanism is a three-line interaction, and it is worth reading slowly:

- `flight-search.controller.js:115-117` sets `priceRange.max` to the dearest result — **642** — and
  then assigns `filters.maxPrice = priceRange.max`.
- `flight-search.template.html:127-129` binds that model to
  `<input type="range" min="{{priceRange.min}}" max="{{priceRange.max}}" step="50">`. The bounds are
  dynamic; **the step is hardcoded**. With `min=230` and `step=50` the representable values are
  230, 280, … 630 — 680 would exceed the max. So **630 is the highest value the control can hold**,
  the input snaps 642 down to 630, and `ng-model` writes the snapped value back into the model.
- `flight-search.controller.js:156` filters on `price <= filters.maxPrice` and drops the flights at
  638 and 642.
- `flight-search.controller.js:120` broadcasts `results.length` — the **unfiltered** count.

The slider silently hides the most expensive results the instant they arrive, on any search whose
dearest fare is not on a step boundary. This is a **seventh defect**, found by the gate rather than
by extraction, and it did not come from the accessibility snapshot — that reported the toast text
and nothing else. It came from *looking at the picture*.
</details>

C-2 (the jQuery UI datepicker overlay covers the submit button) and C-3 (round trip is the default
and requires a return date) are mechanical, and they matter only as instructions for writing
Playwright selectors in step 04.

### Alternatives were argued, not listed

The gate checklist demands an ADR that considered alternatives, and this one rejects both with
reasons rather than a sentence:

- **Hybrid** — rejected because nothing in the evidence supports a *partial* score. Hybrid exists
  for codebases with an unreachable seam: a payment gateway, a licence server. Here every module is
  served by the same in-memory API on one port, through the same route table, in the same browser.
  **There is no seam to split along**, so any Track B assignment would be arbitrary. The ADR also
  makes the cost argument: Hybrid is not the cautious choice but the *expensive* one — every module
  put in Track B trades an automated gate for a manual checklist a human runs on every increment,
  for the life of the project, to hedge a risk the evidence says is absent.
- **Track B** — the only honest route to it is scoring Q6 ❌ because the suite is red, which
  confuses *executable* with *passing*. It would discard a fully automatable application that had
  just completed an end-to-end booking search under browser automation.

### The method, not just the result

The ADR closes with a section most would omit: **three corrections made during evidence gathering**,
recorded because the gate's own rule is that a claim without output is not an answer.

1. **A hash navigation is not a reload.** The first probe navigated `#!/dashboard` → `#!/dashboard`
   and reported the session intact. Same-document hash change — the app never restarted. The
   recorded **zero network requests** gave it away. Re-run properly with `location.reload()` and a
   sentinel, the result inverted. The first answer would have hidden C-1 completely.
2. **The prediction from reading the code was wrong in direction.** The expectation carried in from
   B1 was that a reload would fail *visibly*. It fails *invisibly*, which is strictly worse for a
   test suite — and only the run showed it.
3. **C-4 came from the screenshot, not the page.** The accessibility snapshot said "Found 6 flights"
   and the gate could have stopped there with a ✅.

That is the transferable lesson of this step. Three of the four constraints were invisible to code
reading, and one of them was invisible to *structured* browser output — it needed the image. **The
testability gate is not a formality you fill in from what you already know.** It is the first point
in the brownfield pathway where the application is executed rather than described, and on this repo
it repaid that with a new defect and a false-green trap that would have poisoned the green baseline.

---

## 🧑‍⚖️ Human gate — Testability Gate

> 🔴 **Blast radius if you rubber-stamp this: you migrate blind.**

- [x] Every one of the six answers has **command output**, not prose
- [x] Question 6 is scored ✅ with the 11 failures explained, not ❌
- [x] Question 4 was answered by actually driving a browser (screenshot or Playwright trace)
- [x] The count matches the track: 6 checks → Track A, not "Hybrid to be safe"
- [x] `adr-003-testability-gate.md` lists **alternatives considered** — an ADR with one option
      is a note, not a decision record
- [x] `state.json` has `track`, `testability` **and** `testabilityChecklist`
- [x] `featureTracks` assigns all six modules to A

> ✅ **Approved.** All six boxes verified against the artifacts, not against the summary:
> `brownfield.testability: "full"`, `brownfield.track: "A"`, all six `testabilityChecklist` entries
> `true`, and `featureTracks` naming all six FRD areas — `authentication`, `flight-search`,
> `hotel-booking`, `itinerary`, `travel-request`, `expense-reconciliation`.
>
> The run **stopped at the gate**: `testabilityGateReview.status` was left empty and no Gherkin was
> generated. That is the correct behaviour — the gate is the human's to close, and the agent did not
> close it on its own.

> ⚠️ **This decision cannot be changed without a new ADR.** That is deliberate. If you pick
> Hybrid because you are not sure, you will build a weaker safety net and never revisit it.

---

## ⚠️ Pitfalls

<details>
<summary><b>Picking Hybrid "to be safe"</b></summary>

Hybrid is not the cautious choice — it is the *expensive* choice. Track B features get manual
verification checklists that someone has to actually run, every increment, forever. Only pick it
when a feature genuinely cannot be exercised. Here, all five can.
</details>

<details>
<summary><b>Scoring question 6 as ❌ because the tests are red</b></summary>

The most common wrong answer on this repo, and the one worth discussing out loud with the team.
"Executable" is about the harness, not the result. If you score it ❌ you land on 5/6 — still
Track A, so the outcome survives — but the reasoning is wrong, and the same reasoning applied to
question 3 or 4 would flip you to Hybrid.
</details>

<details>
<summary><b>Answering question 2 with "it depends"</b></summary>

It does not. `api-mock/server.js` is Express with in-memory arrays. There is no database, no
external SaaS, no auth provider. This is the easiest ✅ in the list and a good calibration point
for the others.
</details>

<details>
<summary><b>Skipping the ADR</b></summary>

`AGENTS.md` makes it mandatory: *"The human MUST document the rationale for the track decision in
an ADR."* Six months later the only artifact that explains why there is a Playwright suite
instead of a checklist is this file.
</details>

---

## ⏭️ Next

[**Step 04 — Green Baseline**](04-green-baseline.md) — capture today's behaviour as executable
tests that pass against the legacy app.
