# sddguard

[![npm](https://img.shields.io/npm/v/sddguard)](https://www.npmjs.com/package/sddguard)
[![node](https://img.shields.io/node/v/sddguard)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/sddguard)](LICENSE)

Spec-Driven Development for AI-assisted projects.

`sddguard` installs a local protocol that guides AI agents through
**clarify → plan → execute → verify → review**, stopping at explicit gates where a
human approves before the agent continues. The CLI is intentionally small: it copies
Markdown command definitions into your repo, then you work inside your agent chat with
commands like `/spec-plan`, `/spec-tasks`, `/verify`, and `/finish`.

```bash
npx sddguard init
```

Works with any stack (Next.js, Python, Go, Rails, …) and ships provider templates for
**Claude Code, OpenAI Codex, GitHub Copilot, Gemini CLI, Windsurf, Cursor, and Zed**.

After install, the workflow happens inside your AI agent:

```text
/spec-new auth-refresh
/spec-plan auth-refresh      # stops for your approval before any code
/spec-tasks auth-refresh     # executes one task at a time
/verify auth-refresh         # mechanical audit — writes verify-report.md
/review auth-refresh         # qualitative final pass — writes review-report.md
/finish                      # requires verify + review, then proposes a commit
```

---

## Mental model

There is no daemon, server, database, or task runner. `sddguard` is an
**installer** for plain-Markdown protocol files your repo owns and you can edit.

Two command surfaces:

- **CLI commands** run in your terminal — install, status, updates:
  `npx sddguard init`, `sddguard status`, `sddguard update`.
- **Agent commands** run inside your AI tool — the actual workflow:
  `/spec-plan`, `/spec-tasks`, `/verify`, `/finish`.

The agent reads `.sdd/workflow.md` before every task. That file defines the commands,
per-phase permissions, and **non-negotiable stop points**. The agent
drafts plans and reports; the human approves structural decisions. Each feature lives
in `specs/<feature>/` as Markdown you can read and diff.

---

## Why this exists

Left unsupervised, AI agents implement before validating assumptions, refactor more
than asked, add dependencies silently, and have no model of *when to stop and ask*.

This protocol gives the agent explicit stop points: plan before code, ask before
guessing, verify before finish, and amend approved specs through a visible Change
Request instead of editing them silently.

---

## Quick start

New project:

```bash
# 1. Install the protocol (prompts for which agents to set up)
npx sddguard init

# 2. Populate project context — run inside your AI agent
/bootstrap

# 3. Build a feature, using a real feature name
/spec-new auth-refresh
/spec-clarify auth-refresh  # resolve blockers, then mark requirements ready
/spec-plan auth-refresh     # STOPS for your approval before any code
/spec-tasks auth-refresh    # executes task by task
/verify auth-refresh        # mechanical audit — writes verify-report.md
/review auth-refresh        # qualitative final pass — writes review-report.md
/finish                     # requires verify + review, then proposes a commit
```

Existing codebase:

```bash
npx sddguard init --existing

# Then have the agent discover the code before writing context files:
/scan                       # discovery only — writes scan-report.md
/bootstrap --scan           # proposes project-overview.md + conventions.md for approval
```

---

## Which flow should I use?

| Situation | Use |
|---|---|
| Small confirmed bug (≤ ~50 lines, 1 file) | `/bugfix` → `/finish` |
| Behavior-preserving cleanup | `/refactor` → `/finish` |
| New feature | `/spec-new <name>` → `/spec-clarify <name>` → `/spec-plan <name>` → `/spec-tasks <name>` → `/verify` → `/review` → `/finish` |
| Unsure how the code works | `/ask` |
| Comparing libraries or approaches | `/research <feature> <topic>` |
| Requirements ambiguous before planning | `/spec-clarify <feature>` |
| Implementation blocked mid-task | `/impl-gap <feature>` |
| Approved requirements or plan must change | `/spec-amend <feature> <change-summary>` |
| Work done, needs audit | `/verify <feature>` → `/review <feature>` |

---

## Agent commands

20 slash commands, installed for every agent you select. Full contract lives in
`.sdd/workflow.md`.

### Project setup
| Command | Purpose |
|---|---|
| `/bootstrap` | Populate project context — interview (new) or `--scan` (existing codebase) |
| `/scan` | Discovery-only pass — writes `scan-report.md`, no `.sdd/` changes |
| `/conventions-sync` | Refresh `.sdd/conventions.md`, preserving `<!-- manual -->` sections |

### Exploration and research artifacts
| Command | Purpose |
|---|---|
| `/ask` | Research and explanation — never modifies files |
| `/research` | Compare libraries/patterns — writes only non-binding `research-<topic>.md`, never code |
| `/assume` | Surface every assumption and stop until they're confirmed |

### Feature flow
| Command | Purpose |
|---|---|
| `/spec-new` | Scaffold `specs/<feature>/` from the template |
| `/spec-clarify` | Ask blocking/non-blocking questions, record answers, and get requirements ready |
| `/spec-plan` | Generate the technical plan from requirements marked ready — **stops for approval before any code** |
| `/spec-tasks` | Execute the plan one atomic task at a time, test-first |
| `/impl-gap` | Stop and log a blocking ambiguity/contradiction — no improvising |
| `/spec-amend` | Documented Change Request to edit an already-approved spec |
| `/spec-analyze` | Cross-consistency check: goals↔tasks, plan↔tasks, scope creep |
| `/verify` | Strict mechanical audit — read-only `verify-report.md` |
| `/review` | Lighter qualitative pass — writes `review-report.md` |
| `/finish` | Requires passing verify + non-escalated review, then stages files + drafts a commit message |

### Multi-spec awareness
| Command | Purpose |
|---|---|
| `/spec-status` | State of every active spec (phase, progress, open CRs/gaps) |
| `/spec-conflicts` | Detect specs that touch the same files before they collide |

### Quick changes
| Command | Purpose |
|---|---|
| `/bugfix` | Reproduce → diagnose → fix → validate |
| `/refactor` | Restructure with a green-test invariant, no behavior change |

**`/verify` vs `/review`:** `/verify` is the deterministic audit (tasks complete,
goals covered, suite green, no out-of-scope edits, no open gaps/CRs) and must record
evidence for every check, not just a `Result: PASS` line. `/review` is the qualitative
human-touch pass, recorded in `review-report.md`. Both avoid code/spec edits except
for their report outputs.

---

## CLI reference

```bash
npx sddguard init                  # install protocol (prompts for agents)
npx sddguard init --provider codex # install only one provider integration
npx sddguard init --provider codex,gemini
npx sddguard init --all            # install every provider integration
npx sddguard init --existing       # brownfield: next steps start with /scan
npx sddguard init --force          # refresh protocol files, preserving project context

npx sddguard add domain auth       # add a built-in domain template
                                        # built-in: auth, payments, storage, email
                                        # for custom domains, create .sdd/domains/<name>.md manually

npx sddguard status                # bootstrap state + open specs progress
npx sddguard commands              # list protocol command catalog
npx sddguard update                # refresh protocol files
npx sddguard update --dry-run      # preview installed files that would change
npx sddguard update --check        # CI-friendly outdated check
npx sddguard doctor                # validate install health + stale files
```

> **Non-TTY default:** When stdout is not a TTY (CI, piped scripts), `init`
> without flags installs every provider - equivalent to `--all`. Pass
> `--provider` explicitly to limit.

Everything is **copied locally** — your repo owns the files, no runtime dependency,
edit freely.

## Updating an existing install

`sddguard update` refreshes managed workflow and command files that
**already exist** in your project. It preserves project context and provider
entrypoints/rules, and it does not silently create newly introduced provider
commands in older installs.

| Need | Command |
|---|---|
| Refresh managed files you already have | `sddguard update` |
| List protocol command catalog | `sddguard commands` |
| Preview template updates | `sddguard update --dry-run` |
| Fail CI when templates are outdated | `sddguard update --check` |
| Pull in commands added by a newer version | `sddguard init --force` |
| Add a built-in domain template | `sddguard add domain auth` |
| Check installation health | `sddguard doctor` |

`update` and `init --force` never touch `project-overview.md`, `conventions.md`,
`domains/`, or provider entrypoints/rules such as `AGENTS.md`, `CLAUDE.md`,
`GEMINI.md`, Copilot instructions, Cursor/Windsurf rules, and `.rules`.
Before `init --force`, review local changes to provider command files.

---

## Generated structure

```
.sdd/
  workflow.md            # commands, permissions, stop points
  project-overview.md    # what this app is — populated by /bootstrap
  conventions.md         # stack & patterns — populated by /bootstrap
  domains/               # optional domain rules (auth, payments, …)
specs/
  _template/             # source templates copied by /spec-new
    1-requirements.md    #   problem, goals (G1…), BDD acceptance criteria
    2-plan.md            #   approach, tradeoffs, components, abort criteria
    3-tasks.md           #   atomic task checklist with a TDD gate
    2a-data-model.md     #   optional: non-trivial persistence
    2b-api-contracts.md  #   optional: new external contracts
    2c-research.md       #   optional: research that belongs in the plan
    amendments.md        #   Change Requests (/spec-amend)
    impl-gaps.md         #   blocking gaps logged during execution (/impl-gap)
    analysis.md          #   /spec-analyze output
    verify-report.md     #   /verify output
    review-report.md     #   /review output
  _done/                 # shipped specs, moved here after verify + review close
CLAUDE.md                # agent entry point — points at .sdd/
```

- **You edit:** `project-overview.md`, `conventions.md`, and per-feature
  `1-requirements.md` / `2-plan.md` / `3-tasks.md`.
- **The agent generates as history/reports:** `amendments.md`, `impl-gaps.md`,
  `analysis.md`, `verify-report.md`, and `review-report.md`.

Per selected agent, command files are also installed (see Provider support).

---

## How approval works

The agent may draft plans and reports, but structural decisions stay with the human.

- `/spec-plan` stops before code. You approve the plan before `/spec-tasks`.
- `/spec-tasks` can edit code and tests, but not approved requirements or plan files.
- `/impl-gap` records a blocker and waits for direction — no improvising.
- `/spec-amend` records a Change Request and waits for approval before changing
  `1-requirements.md` or `2-plan.md`.
- `/verify` and `/review` are read-only, except for `verify-report.md` and
  `review-report.md`.
- `/finish` may proceed only after `verify-report.md` is complete with `Result: PASS`
  and `review-report.md` is non-blocking (`Result: PASS` or `Result: FOLLOW_UPS`).

---

## Spec structure

Each feature lives in `specs/<name>/`. Three core files gate progress:

- **`1-requirements.md`** — problem, measurable goals (G1, G2…), BDD acceptance
  criteria, constraints, blocking vs. non-blocking open questions, and a
  Clarifications section populated by `/spec-clarify`. Its Status checklist must mark
  `Ready for /spec-plan` before planning can start.
- **`2-plan.md`** — goals coverage, assumptions confirmed via `/assume`, approach +
  tradeoffs, components affected, abort criteria. *Requires explicit approval before
  any code is written.*
- **`3-tasks.md`** — one atomic task at a time; each names the test to write first
  (red → green), files to change, and the goal ID it serves.

Once approved, `1-requirements.md` and `2-plan.md` are read-only — changes go through
`/spec-amend`. After `/verify` passes and `/review` is `PASS` or `FOLLOW_UPS`, the
spec moves to `specs/_done/`.

---

## Provider support

| Provider | Installed files |
|---|---|
| Claude Code | `.claude/commands/*.md`, `CLAUDE.md` |
| OpenAI Codex | `.agents/skills/*/SKILL.md`, `AGENTS.md` |
| GitHub Copilot | `.github/prompts/*.prompt.md`, `.github/copilot-instructions.md` |
| Gemini CLI | `.gemini/commands/*.toml`, `GEMINI.md` |
| Windsurf | `.windsurf/workflows/*.md`, `.windsurf/rules/sddguard.md` |
| Cursor | `.cursor/rules/sddguard.mdc` |
| Zed | `.rules` |

Providers with native slash-command or workflow support get per-command files.
Rule-only providers get the protocol as always-on project context.

---

## Execution principles

Enforced by every command:

1. **Surface assumptions** — list them before acting, not mid-execution.
2. **Minimum code** — only what was asked; no "while I'm here" changes.
3. **Surgical changes** — touch only what the task requires.
4. **Verify before moving on** — define "done" before starting, not after.
5. **Use the right channel for changes** — `/impl-gap` for blocked tasks,
   `/spec-amend` for approved spec edits. Never edit approved specs silently.

---

## Design principles

- **Zero runtime dependency** — files copied locally, no server, daemon, or watcher.
- **npx-first** — one command, no Python/uv/pipx.
- **The human decides, the agent executes** — no automated structural decisions.
- **Files you can read** — pure Markdown, no databases, no binary formats.

---

## Development

```bash
git clone https://github.com/MarcosCamara01/sddguard.git
cd sddguard
npm install
npm run dev      # watch mode
npm run build    # production build → dist/cli.js
```

### Publishing

```bash
npm version patch   # bug fix:     0.1.0 → 0.1.1
npm version minor   # new feature: 0.1.0 → 0.2.0
npm publish
```

Users running `npx sddguard init` always get the latest version.

---

## License

MIT
