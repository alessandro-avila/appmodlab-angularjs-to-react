# Step 03 · The Testability Gate

> **Phase** Gate (between B2 and B3) &nbsp;|&nbsp; **Branch** [`lab/03-testability-gate`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/03-testability-gate) &nbsp;|&nbsp; **Parent** `lab/02-b2-spec-enable`
> **Human gate** 🧑‍⚖️ Testability Gate &nbsp;|&nbsp; **Status** ⏳ Pending

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
| `adr` | Writes `specs/adrs/adr-001-testability-gate.md` |
| `state-management` | Records `testability`, `track`, `testabilityChecklist` in `.spec2cloud/state.json` |
| `test-runner` | Runs the existing suite so question 6 has evidence |

---

## ✅ Prerequisites

- [ ] [Step 02](02-b2-spec-enable.md) approved at all three gates
- [ ] PRD + 5–6 FRDs exist and are accurate
- [ ] `npm start` is running (mock API :3000 + web :8080)

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
└── adr-001-testability-gate.md         ← the decision + evidence + alternatives

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

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/02-b2-spec-enable..lab/03-testability-gate`
> 2. The six answers **with the actual command output** the agent produced
> 3. Whether it correctly scored question 6 as ✅ despite 11 failures — or argued itself into ❌
> 4. The full `adr-001-testability-gate.md`
> 5. The resulting `.spec2cloud/state.json`
> 6. Whether Playwright MCP actually drove the browser for question 4, or whether it inferred

---

## 🧑‍⚖️ Human gate — Testability Gate

> 🔴 **Blast radius if you rubber-stamp this: you migrate blind.**

- [ ] Every one of the six answers has **command output**, not prose
- [ ] Question 6 is scored ✅ with the 11 failures explained, not ❌
- [ ] Question 4 was answered by actually driving a browser (screenshot or Playwright trace)
- [ ] The count matches the track: 6 checks → Track A, not "Hybrid to be safe"
- [ ] `adr-001-testability-gate.md` lists **alternatives considered** — an ADR with one option
      is a note, not a decision record
- [ ] `state.json` has `track`, `testability` **and** `testabilityChecklist`
- [ ] `featureTracks` assigns all five modules to A

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
