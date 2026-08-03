# Step 05 · Path Selection

> **Phase** Gate (between B3 and A) &nbsp;|&nbsp; **Branch** [`lab/05-path-selection`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/05-path-selection) &nbsp;|&nbsp; **Parent** `lab/04-green-baseline`
> **Human gate** 🧑‍⚖️ Path Selection &nbsp;|&nbsp; **Status** ⏳ Pending

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
| `adr` | Writes `specs/adrs/adr-002-path-selection.md` |
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
```

---

## 🗣️ The prompt

```text
The green baseline is approved. Walk me through Path Selection.

Give a verdict on each of the seven paths, but ground every one in the B1 extraction
and the FRDs — I want to see "restangular 1.6.1, unmaintained, per
specs/docs/technology/dependencies.md", not "legacy apps often have outdated
dependencies".

Two scoping facts you will not find in the extraction: the Express mock API is
explicitly out of scope for this exercise, and there is no cloud deployment today
and none is required.

I am selecting Modernize, delivered as a strangler-fig sequence of increments. Write
the ADR for it — and make the rejected alternatives real arguments rather than
placeholders, especially Rewrite, since it is the only one someone could reasonably
have picked instead.

Stop at the gate. No assessment yet.
```

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
└── adr-002-path-selection.md

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
| **Cloud-Native** | `cloud-native-assessment` | `cloud-native-planner` | ⚪ Optional stretch. `api-mock/server.js` is a lab fixture, not a workload. Nothing to containerize that anyone would deploy. |
| **Extend** | — | `extension-planner` | ❌ No new features in scope. Adding features while the framework is EOL is how you get a bigger EOL app. |
| **Fix Bugs** | — | `bug-fix` | ❌ The quirks (`maxPrice` reset, `returnDate` shift) are *documented behaviour* with green tests. No defect reports exist. |
| **Security** | `security-assessment` | `security-planner` | ⚪ Deferred. The JWT-in-`localStorage` finding is real, but it survives the migration unchanged — fix it once, in React, not twice. |
| **Performance** | `performance-assessment` | — | ❌ No performance evidence was extracted. Optimising without a measurement is guessing. |

### Modernize vs Rewrite — the argument worth having

This is the discussion to have out loud with the team, because "we are replacing AngularJS with
React, surely that is a rewrite?" is a reasonable objection.

| | **Modernize** | **Rewrite** |
|---|---|---|
| Unit of work | Increment per feature, behaviour preserved | Component replaced wholesale, behaviour re-specified |
| Safety net | The Track A `@existing-behavior` suite must keep passing | New tests, written against the new spec |
| Old and new coexist? | Yes — strangler-fig, both run behind one entry point | Usually not |
| Answer to *"did behaviour change?"* | The test suite answers it | You argue about it |
| Failure mode | Slow | Big bang that never ships |

The stack changes completely, but **the specification does not**. Every migrated module is held
to the Gherkin captured in [step 04](04-green-baseline.md). That is what makes this Modernize:
the FRDs are the constant, the implementation is the variable.

Where we *deliberately* deviate from legacy behaviour — the Moment.js date parsing in
[step 09](09-deliver-inc1-flight-search.md) — it is recorded as a Gherkin delta plus an ADR, not
smuggled in.

---

## 📤 Outcome

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/04-green-baseline..lab/05-path-selection`
> 2. The agent's verdict per path — did it reason from the extraction or from generalities?
> 3. The full `adr-002-path-selection.md`
> 4. Did it push back on Modernize and argue for Rewrite? (A good agent might. Record the
>    argument either way.)
> 5. The updated `state.json`

---

## 🧑‍⚖️ Human gate — Path Selection

> 🟠 **Blast radius if you rubber-stamp this: wrong strategy, wasted effort.**

- [ ] All seven paths are addressed, not just the selected one
- [ ] Each rejection cites a **fact from the extraction**, not a generic argument
- [ ] The Modernize-vs-Rewrite distinction is articulated, not assumed
- [ ] Consequences and **non-goals** are both written down
- [ ] The Security path is explicitly *deferred with a reason*, not silently dropped —
      JWT-in-`localStorage` is a real finding and it should reappear later
- [ ] `state.json` records the selection; `audit.log` records the gate

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
