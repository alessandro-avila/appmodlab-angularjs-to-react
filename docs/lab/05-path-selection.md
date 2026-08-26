# Step 05 · Path Selection

> **Phase** Gate (between B3 and A) &nbsp;|&nbsp; **Branch** [`lab/05-path-selection`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/05-path-selection) &nbsp;|&nbsp; **Parent** `lab/04-green-baseline`
> **Human gate** 🧑‍⚖️ Path Selection &nbsp;|&nbsp; **Status** ✅ Verified

---

## 🎯 Goal

You have specs and a safety net. Now decide **what kind of change** you are making. spec2cloud
supports seven brownfield paths, and only the ones you select trigger assessment and planning.

This lab uses **Modernize**. The point of this step is not the answer — it is writing down *why*,
because that is the question people will ask six months from now.

---

## 🧰 Skills invoked

| Skill | Purpose |
|-------|---------|
| `human-gate` | Presents the paths, blocks until you choose |
| `adr` | Writes `specs/adrs/adr-005-path-selection-modernize-to-react.md` |
| `state-management` | Records the selected path(s) in `.spec2cloud/state.json` |

No assessment runs yet. That is [step 06](06-assess.md).

---

## ✅ Prerequisites

- [ ] [Step 04](04-green-baseline.md) approved — green baseline exists and passes
- [ ] `.spec2cloud/state.json` has `track: "A"` and `greenBaseline.status: "green"`

---

## 🌿 Branch setup

```bash
git switch lab/04-green-baseline
git switch -c lab/05-path-selection
git checkout main -- docs/ README.md   # current lab instructions
```

<sub>That third line matters. `docs/` lives on `main`; a `lab/*` branch cut from its predecessor carries whatever `docs/` looked like back then. Increment 0 was run against instructions **1935 lines out of date** because of exactly this — see [step 08](08-deliver-inc0-shell.md#-outcome).</sub>

---

## 🗣️ The prompt

```text
The green baseline is approved. Walk me through Path Selection.

I am selecting Modernize, from AngularJS to React 19 + TypeScript, delivered as a
sequence of increments. Write the ADR for it — and make the rejected alternatives real
arguments rather than placeholders, especially Rewrite, since it is the only one someone
could reasonably have picked instead.
```

> ⚠️ **This lab originally ran with JavaScript as the target language, and the outcome below
> records that.** The customer later clarified that the landing stack is **React + TypeScript**,
> and the hackathon follows that. The prompt above is the corrected one — but ADR-005 on
> `lab/05-path-selection` still says JavaScript, and that is **left alone deliberately**.
> See [the note below](#the-language-decision-changed-after-this-step).

That is the prompt that produced the outcome below, and it is deliberately short. Three
sentences: the state, the decision, the standard of argument. Everything else the agent needed
was already in the artifacts.

<details>
<summary><b>What a longer prompt would have added — and why it was not needed</b></summary>

An earlier draft of this step also supplied two scoping facts (*"the Express mock API is out of
scope"*, *"there is no cloud deployment and none is required"*) and an instruction to stop at the
gate. None of the three turned out to be necessary:

- **Both scoping facts were already decided.** Q-12 in `adr-002` had removed deployment from
  scope, and the agent cited it by name to reject Cloud-Native. Restating a decision the ADR chain
  already carries teaches the agent to trust the prompt over the artifacts — the opposite of what
  this pipeline is for.
- **It stopped at the gate anyway**, because path selection *is* a gate in the framework.

The one instruction worth keeping is the standard of argument — *"real arguments rather than
placeholders"*. That is not recoverable from the artifacts, and it is what produced a
five-point rejection of Rewrite instead of a one-line dismissal.

**The general rule:** state what only you know. Everything already written down, leave written
down.

</details>

<details>
<summary><b>Why not restate the findings in the prompt?</b></summary>

Because they are already in `specs/docs/technology/dependencies.md`, and the point of B1 was to
put them there. A prompt that re-feeds the extraction back to the agent is a prompt that works
just as well without the extraction — which tells you the extraction was not being used.

The two lines that *do* belong are the ones no artifact contains: that the backend is out of
scope, and that nobody is asking for cloud. Those are facilitator decisions, not repository
facts, and without them Cloud-Native looks defensible.

If the ADR comes back citing generalities, that is a signal worth acting on: it means the agent
never opened the extraction, and everything downstream inherits that.
</details>

---

## 📦 Expected artifacts

```
specs/adrs/
└── adr-005-path-selection-modernize-to-react.md

.spec2cloud/
├── state.json         ← selected path recorded
└── audit.log
```

---

## 🧭 The seven paths, scored for this repo

Use this to check the agent's reasoning at the gate.

| Path | Assessment skill | Planning skill | Verdict here |
|------|------------------|----------------|--------------|
| **Modernize** | `modernization-assessment` | `modernization-planner` | ✅ **Selected.** Dead framework, deprecated package manager, unmaintained router and HTTP client, an anti-pattern (jQuery inside Angular) baked into every controller. This is the textbook case. |
| **Rewrite** | `rewrite-assessment` | `rewrite-planner` | ⚪ Optional stretch. Genuinely arguable — see below. |
| **Cloud-Native** | `cloud-native-assessment` | `cloud-native-planner` | ⚪ Deferred, not refuted. Q-12 removed the deployment target, and the two hardcoded `localhost:3000` literals live in files increment 1 deletes. Applies cleanly once the React client exists. |
| **Extend** | — | `extension-planner` | ❌ No new features in scope. Adding features while the framework is EOL is how you get a bigger EOL app. |
| **Fix Bugs** | — | `bug-fix` | ❌ ~40 documented limitations across the six FRDs — but the overwhelming majority live in code increment 1 deletes. Fixing them in AngularJS to delete them later is waste. SEAM-3/4/5 are server-side and fold into the increments touching their endpoints. |
| **Security** | `security-assessment` | `security-planner` | ⚪ Partly absorbed, partly deferred. Q-7 and Q-8 already schedule the ownership filter and the credential form. The plaintext credential comparison and the literal `JWT_SECRET` are server-side, survive the migration, and become a follow-on path. |
| **Performance** | `performance-assessment` | — | ❌ No performance evidence was extracted. Optimising without a measurement is guessing. |

### Modernize vs Rewrite — the argument worth having

This is the discussion to have out loud with the team, because "we are replacing AngularJS with
React, surely that is a rewrite?" is a reasonable objection. It is more than reasonable — on the
plain reading it is *correct*, and the run below concedes it.

| | **Modernize** | **Rewrite** |
|---|---|---|
| Unit of work | Increment per feature, behaviour preserved | Component replaced wholesale, behaviour re-specified |
| Safety net | The Track A `@existing-behavior` suite must keep passing | New tests, written against the new spec |
| Old and new coexist? | In the repository, both startable — **not in one page** | Usually not |
| Answer to *"did behaviour change?"* | The test suite answers it | You argue about it |
| Failure mode | Slow | Big bang that never ships |

The stack changes completely, but **the specification does not**. Every migrated module is held
to the Gherkin captured in [step 04](04-green-baseline.md). That is what makes this Modernize:
the FRDs are the constant, the implementation is the variable.

Where we *deliberately* deviate from legacy behaviour — the Moment.js date parsing in
[step 09](09-deliver-inc1-flight-search.md) — it is recorded as a Gherkin delta plus an ADR, not
smuggled in.

> ⚠️ **Note the coexistence row.** This lab originally assumed strangler fig — React mounted
> inside the running AngularJS shell, both stacks serving one user in one page. ADR-005 rejected
> that, and the reasoning is in the Outcome below. Increments are still incremental; the
> mechanism is a stable HTTP API rather than an in-page bridge.

---

## 📤 Outcome

> ✅ **Verified against the artifacts on `lab/05-path-selection`.** One commit —
> [`8419bd4`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/commit/8419bd4),
> 3 files, +328/−8. Nothing under `app/`, `api-mock/` or `test/` was touched: this step decides,
> it does not change code.

**Decision: Modernize.** AngularJS 1.6.10 → React 19, authored in JavaScript, delivered as one
increment per FRD feature area. The client goes entirely — all 27 files, all 9 bower runtime
dependencies. `api-mock/server.js` survives.

The numbers behind that, each independently confirmed:

| Claim | Verified |
|-------|----------|
| `app/` is 4 462 lines | 20 JS = 2 332 · 6 HTML = 1 547 · 1 CSS = 583 ✅ exact |
| `api-mock/server.js` survives at 634 lines | ✅ exact |
| 9 vendored runtime deps, none survives | ✅ `angular`, `ui-router`, `ui-bootstrap`, `restangular`, `jquery`, `jquery-ui`, `bootstrap`, `lodash`, `moment` |
| `index.html` has 20 hand-written `<script src>` lines | ✅ 29 total = 9 vendor + 20 app-owned |
| Two `localhost:3000` literals | ✅ `app/app.js:14`, `app/services/auth.service.js:18` |
| `JWT_SECRET` is a source literal | ✅ `api-mock/server.js:13` |
| Q-10 deletes 7 files rather than porting them | ✅ 3 directives, 2 filters, 2 unused services — all present |

### The Rewrite argument — conceded, then defeated

The most interesting part of the run is that the agent **argued the case against its own
instruction before rejecting it**, and the concession is not a rhetorical throat-clear:

> *"100% of the 4462-line client is deleted and re-authored; not one AngularJS file, directive or
> filter survives. By any plain-English reading that is a rewrite, and calling it 'modernization'
> risks the label doing damage."*

It then names the concrete hazard: `modernization-planner` is described as *"upgrade deps, fix
patterns, reduce debt"*, so a planner given the wrong label **could emit `upgrade lodash to 4.17`
for a dependency being deleted outright**. It ends with a tripwire — if the plan in
[step 07](07-plan.md) comes back shaped like dependency upgrades, that is the mis-scoping showing,
and the plan is to be rejected and re-run.

Four grounds defeat it:

1. **Strangler fig is insurance against live traffic, and Q-12 means there is none.** *"We would
   pay the premium and own no policy."*
2. **The interop bridge is 100% throwaway** — a bundler forced into a client with no build step,
   a `$rootScope`-to-React-state bridge, dual routing across ui-router's hash URLs, and a
   Restangular/`fetch` coexistence story for the auth interceptor. Against 4 462 lines, the
   scaffolding plausibly rivals the migration it exists to de-risk.
3. **Four of six features cannot serve as a working legacy reference.** Strangler fig assumes the
   old side keeps working. [Step 04](04-green-baseline.md) proved it does not — hotel booking
   cannot complete a booking at all, two itinerary controls are dead, request search is inert.
4. **The seam already exists and is not in the client — it is the HTTP API**, extracted to
   `specs/contracts/api/`, unchanged by this work, and pinned by baseline scenarios that never
   open a browser.

And it states the condition that flips the decision: *"if a production instance with real users
existed, or if Q-12 were reversed."* A rejection you can re-open is worth more than one you cannot.

### Two counting errors — both understating its own case

Verification found two numbers wrong. Both are **per-item sub-counts promoted to totals**, and
both make the ADR's argument *weaker* than the evidence supports:

| ADR says | Actually | Where the wrong number came from |
|---|---|---|
| 24 `$broadcast` sites | **29** broadcasts, or **36** call sites with listeners | 24 is `notification:add` **alone** (`frd-authentication.md:704`). B1's `overview.md:410` had it right: *"6 event names, 36 call sites"* |
| 15 browser-free scenarios | **19** | 15 is **authentication's** count in `state.json`; hotel-booking adds 1 and itinerary 3 |

Neither changes the decision — argument 2 is *stronger* with 29 bridge points than 24, and
argument 4 is stronger with 19 API-level pins than 15. But the pattern is worth naming, because
it is the failure mode of an agent reading a rich state file: **a number sitting next to the
feature you are currently thinking about gets read as the number for everything.** The defence is
cheap — when an ADR cites a count, re-derive it from source rather than from the artifact that
quotes it.

### What it did without being told

The prompt supplied neither scoping fact. The agent recovered both from the ADR chain:

- **Cloud-Native rejected via Q-12** — and sharpened, in a way the prompt could not have: the two
  hardcoded URLs *"live in files being deleted in increment 1 — externalising them first is work
  performed on a corpse."* Explicitly a deferral, not a refutation.
- **`api-mock/` scoped out** by observing it is the one thing that survives.
- **Security partly absorbed rather than deferred wholesale.** Q-7 already schedules the ownership
  filter and Q-8 the credential form; running Security in parallel would build both twice. It then
  isolates the two findings that genuinely survive the client migration — the plaintext credential
  comparison and the literal `JWT_SECRET` — as a follow-on path.
- **Extend rejected while admitting the boundary is blurry:** Q-8's login and sign-out are
  *"genuinely extension-shaped — net-new behaviour with no baseline scenario"*. They ride inside
  the authentication increment because they cannot be built twice.

### The baseline is a reference, not a contract

The most consequential paragraph in the ADR, and the one that shapes every increment from here:

> The 235 scenarios are a **reference, not a contract to reproduce verbatim.**

Every scenario must be classified before an increment is written:

| Class | Meaning | Examples |
|-------|---------|----------|
| **Preserve** | Correct behaviour; React must match | flight search results, request validation, the server's 401 surface |
| **Supersede** | Encodes a defect ADR-001/002 already decided to fix | the four dead controls, `ngRepeat:dupes`, SEAM-3/4/5 |
| **Net-new** | No baseline exists — the behaviour does not exist yet | Q-7 ownership isolation, Q-8 login form, sign-out, 401 policy |

With the rule that keeps it honest: **a superseded scenario is rewritten in place with the
authorising ADR reference, never silently deleted.** That is the difference between a migration
and a quiet loss of coverage.

### The JavaScript cost, recorded rather than glossed

> *"Without a compiler, the API contract cannot be enforced at build time… conformance is asserted
> at the **test** layer. This must not be quietly reversed later without a new ADR."*

`specs/contracts/api/` stays normative, shapes are documented in JSDoc, and the API-level scenarios
carry the enforcement burden.

### The language decision changed after this step

The target language was later changed to **TypeScript**, which reverses exactly the consequence
ADR-005 recorded above. Note what did **not** happen: ADR-005 was not edited. It still reads
JavaScript, and it stays that way.

**And it was not wrong.** This is the distinction worth taking away. ADR-005 reasoned correctly
from the input it had; the input then changed — the customer clarified that the landing stack is
React + TypeScript. A decision overturned by a changed requirement is a completely different
artefact from a decision that was mistaken, and only one of them suggests the process needs
fixing. Erasing ADR-005 would flatten the two into each other and leave the repo implying the
team knew all along.

That is ADR discipline, and it is the whole reason the sentence *"must not be quietly reversed
later without a new ADR"* was written into it. An ADR is a dated record of what was decided and
why, on the evidence available then. When the decision changes you write a **new** ADR that
supersedes it and says what changed — you do not rewrite the old one, because rewriting it destroys
the only evidence that the trade-off was ever considered.

So the supersession is a `tech-stack-resolution` output in [step 07](07-plan.md), not a retroactive
edit here. Concretely it must say: TypeScript is now the target **because the requirement was
clarified, not because the original reasoning failed**; the build-time contract enforcement ADR-005
gave up is regained; and the test-layer burden this ADR imposed is relaxed accordingly.

One consequence survives the switch intact. The increment-0 pitfall in
[step 08](08-deliver-inc0-shell.md) is *"trusting the API response shape"*, and it is **not** a
JavaScript-only problem — types are erased at runtime, so a generated type claiming `room.id: string`
buys nothing when the server never sends the field. [Step 06](06-assess.md) proved that exact case
(finding **P-7**). Under TypeScript the risk is arguably worse, because the compiler reports green.

### Five follow-on ADRs, named now so they are not decided by accident

Bundler · router and hash-vs-real URLs · the date control replacing jQuery UI (constraint C-2
lives here) · **where Q-7 ownership is enforced** — server-side or client-side, which changes the
API contract · and the 401 / session-expiry policy, which is net-new because today a rejected
session renders as an empty account.

### State

`currentPhase: "P-planning"`, `selectedPaths: ["modernize"]`, and a `pathSelection` block carrying
the target, both fates, every rejection with its reason, the label caveat and the three-way
baseline disposition. Four audit entries — gate, selection, ADR, phase transition. The
consolidated green-baseline gate from [step 04](04-green-baseline.md) is recorded `approved` here
with `appDiffLines: 0`.

---

## 🧑‍⚖️ Human gate — Path Selection

> 🟠 **Blast radius if you rubber-stamp this: wrong strategy, wasted effort.**

- [x] All seven paths are addressed, not just the selected one — each with its own section
- [x] Each rejection cites a **fact from the extraction**, not a generic argument — Q-12 for
      Cloud-Native, the NFR IDs for Security, `app/app.js:14` and `api-mock/server.js:13` by line
- [x] The Modernize-vs-Rewrite distinction is articulated, not assumed — five numbered grounds
      plus a stated condition under which the decision is wrong
- [x] Consequences and **non-goals** are both written down, including the JavaScript cost
- [x] The Security path is explicitly *deferred with a reason*, not silently dropped — and split:
      the parts absorbed by Q-7/Q-8 versus the two server-side findings that survive
- [x] `state.json` records the selection; `audit.log` records the gate — 4 entries
- [x] ⚠️ **Counts re-derived from source, not from the artifact that quotes them.** Two were
      wrong — `24 $broadcast sites` is 29, `15 browser-free scenarios` is 19. Both understate the
      ADR's own case, so the decision stands. **Check this box by re-measuring, not by reading.**

---

## ⚠️ Pitfalls

<details>
<summary><b>Selecting three paths because they all look useful</b></summary>

Every selected path runs an assessment and a planner and generates increments. Select
Modernize + Security + Cloud-Native and you have tripled the planning surface before writing a
line of React. Select one. Defer the rest with a reason.
</details>

<details>
<summary><b>An ADR with one option</b></summary>

"We chose Modernize because it is the right fit" is a note. An ADR needs the roads not taken,
and *why*. If the alternatives section is shorter than the decision section, send it back.
</details>

<details>
<summary><b>Letting the agent skip straight into assessment</b></summary>

The orchestrator is eager. `Do NOT run modernization-assessment yet` is in the prompt for a
reason — path selection is a gate, and gates are where a human looks at something before it
becomes expensive.
</details>

---

## ⏭️ Next

[**Step 06 — Assess**](06-assess.md) — score every module and decide the migration order.
