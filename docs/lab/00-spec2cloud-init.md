# Step 00 · spec2cloud init

> **Phase** B0 · Onboarding &nbsp;|&nbsp; **Branch** [`lab/00-spec2cloud-init`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/00-spec2cloud-init) &nbsp;|&nbsp; **Parent** `main` | **Human gate**: none

---

## 🎯 Goal

Install the spec2cloud framework into the legacy repo. When this step is done, Copilot has an orchestrator (`AGENTS.md`), a skills catalog, and an empty `specs/` tree waiting to be filled.

This is the only step in the whole walkthrough that is not driven by a prompt. It is a CLI command.

---

## 🧰 Skills invoked

None. `spec2cloud init` is a scaffolding CLI, so it *installs* the skills that every later step uses.

---

## ✅ Prerequisites

- [ ] You are in the dev container (or have Node.js 22 LTS on the host)
- [ ] `npm start` works and the legacy app renders at http://localhost:8080
- [ ] `git status` is clean

---

## 🌿 Branch setup

```bash
git switch main
git switch -c lab/00-spec2cloud-init
```

---

<details>
<summary><b>Useful flags</b></summary>

| Flag | Effect |
|------|--------|
| `--flow brownfield` | Selects the brownfield pathway (B0→B1→B2→gate→A→P→2) rather than greenfield |
| `--ref vNext` | Pins the skills to the `vNext` branch of the spec2cloud repo |
| `--minimal` | Adds spec2cloud to an existing project without the shell template |
| `--force` | Overwrite instead of preserving conflicts |
| `--target <dir>` | Install somewhere other than the cwd |

Conflicting files are **not** clobbered — they are written alongside with a `.spec2cloud`
suffix. You will see this happen to `.devcontainer/devcontainer.json` on this repo.
</details>

Then authenticate Copilot CLI once per Codespace:

```bash
copilot
```

---

## 📦 Expected artifacts

| Path | Purpose |
|------|---------|
| `AGENTS.md` | The orchestrator. Copilot reads it automatically — this is what runs the Ralph loop. |
| `.github/skills/**/SKILL.md` | The skills catalog |
| `.github/copilot-instructions.md` | Repo-wide Copilot instructions |
| `skills-lock.json` | Pinned skill versions |
| `.mcp.json` | MCP server wiring |
| `specs/` | Where PRDs, FRDs, ADRs and Gherkin will land |
| `.spec2cloud/state.json`, `audit.log`, `models.json` | Workflow state, committed to git |

---

## 📤 Outcome

```
AGENTS.md                              769 lines   ← the orchestrator
.github/copilot-instructions.md        181 lines
.github/skills/                         46 skills  ← 46 × SKILL.md + references/ + scripts/
.mcp.json                               38 lines   ← 7 MCP servers
skills-lock.json                        10 lines
.devcontainer/devcontainer.json.spec2cloud  21 lines  ← conflict, preserved not clobbered
specs/.gitkeep
specs/docs/.gitkeep
specs/features/.gitkeep
specs/tasks/.gitkeep
```

### ⚠️ Finding: `.spec2cloud/` was not created

Compare that file tree against the [Expected artifacts](#-expected-artifacts) table above. The row
promising `.spec2cloud/state.json`, `audit.log` and `models.json` as *"workflow state, committed to
git"* has **no counterpart on disk**. After `init`, `.spec2cloud/` does not exist at all — the
commit that landed this step (81 files) contains none of them.

This is worth flagging rather than shrugging at, because `state.json` is what every later step reads
to know which phase it is in and which gates have been approved. A missing state file at step 00
looks, at first glance, like the framework is broken.

> ✅ **Answered at [step 01](01-b1-extract.md#-two-findings-for-the-framework).** They *are* created —
> just not by `init`. The **first orchestrator run** writes them as its opening act, before any
> extraction skill runs (`audit.log` line 2:
> `action=init-state ... created .spec2cloud/state.json and .spec2cloud/audit.log`).
> The documentation describes the right files at the wrong moment. `models.json` was still not
> present after B1.

<details>
<summary><b>The 46 skills, by category</b></summary>

**Brownfield extraction (B1)** - `codebase-scanner`, `dependency-inventory`,
`architecture-mapper`, `api-extractor`, `data-model-extractor`, `test-discovery`

**Spec generation (B2)** - `prd-generator`, `frd-generator`, `spec-refinement`,
`spec-validator`, `ddd-modeling`

**Assessment (A)** - `modernization-assessment`, `rewrite-assessment`,
`cloud-native-assessment`, `security-assessment`, `performance-assessment`

**Planning (P)** - `modernization-planner`, `rewrite-planner`, `cloud-native-planner`,
`extension-planner`, `security-planner`, `tech-stack-resolution`

**Delivery (2)** - `gherkin-generation`, `test-generation`, `e2e-generation`,
`contract-generation`, `implementation`, `azure-deployment`, `aspire`, `ui-ux-design`

**Verification** - `test-runner`, `build-check`, `deploy-diagnostics`, `playwright-cli`

**Protocol** - `state-management`, `commit-protocol`, `audit-log`, `human-gate`, `resume`,
`error-handling`

**Meta** - `adr`, `bug-fix`, `research-best-practices`, `skill-creator`, `skill-discovery`,
`find-skills`
</details>

<details>
<summary><b>The 7 MCP servers wired by <code>.mcp.json</code></b></summary>

| Server | Used by |
|--------|---------|
| `github` | PR creation, gate tracking |
| `playwright` | `playwright-cli`, `e2e-generation` - browser automation for the green baseline |
| `azure` | `azure-deployment` (stretch goal only) |
| `deepwiki` | `research-best-practices` |
| `context7` | `research-best-practices` - up-to-date library docs (React 19, TanStack, Vite) |
| `microsoft.docs.mcp` | `research-best-practices` |
| `aspire` | `aspire` skill (not used in this lab) |

`context7` is the one that earns its keep here: React 19 and TanStack Router are both newer than
most model training cutoffs.
</details>

---

## ⚠️ Pitfalls

<details>
<summary><b>"The orchestrator isn't activating"</b></summary>

`AGENTS.md` is read automatically by Copilot CLI and Copilot Chat when it sits at the repo root.
If your prompts are being answered like generic chat rather than driving the Ralph loop, check that you opened Copilot **with the repo root as the working directory**.
</details>

<details>
<summary><b>Don't commit before you look</b></summary>

`init` writes 81 files. Skim `AGENTS.md` before committing - it is the contract for every subsequent step, and it is worth knowing that §3a defines the brownfield flow you are about to run.
</details>

<details>
<summary><b>Node version</b></summary>

`npx spec2cloud init` needs Node ≥ 20.19. The container ships Node 22 LTS. On bare metal, check `node --version` first.
</details>

---

## ⏭️ Next

[**Step 01 - B1 · Extract**](01-b1-extract.md): six skills read the codebase and write down reality.
