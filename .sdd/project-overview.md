# Project Overview

## What This App Does

`sddx-workflow` is a small Node.js CLI that **installs a Spec-Driven Development protocol** into any project. It does not run, watch, or enforce anything at runtime — it copies plain-Markdown files into the target repo (`.sdd/`, `specs/_template/`, and per-provider command dirs) so that AI coding agents (Claude Code, Cursor, Windsurf, Copilot, Codex, Gemini CLI, Zed) follow a shared clarify → plan → execute → verify → review flow with explicit human approval gates. Target user: developers using AI agents who want the agent to stop and ask instead of improvising.

## What It Does NOT Do

- **No runtime in the user's project.** Once installed, files are local and the CLI is not invoked again unless the user runs `update` or `doctor`.
- **No daemon, server, database, file watcher, or task queue.**
- **No protocol enforcement.** The CLI installs Markdown; the agent (not the CLI) reads it. There is no hook, lint rule, or guard preventing the agent from breaking the protocol.
- **No project-specific logic.** Stack-agnostic by design — does not know about Next.js, Python, Rails, etc.
- **No silent regeneration of user-owned files.** `update` and `init --force` never touch `.sdd/project-overview.md`, `.sdd/conventions.md`, or `.sdd/domains/`. Newly added agent commands are only added on explicit `init --force` — never via `update`.
- **No telemetry, no network calls** beyond `npx`/`npm` install.

## Main Domains

- **Installation** — `init` (interactive provider selection or `--provider` / `--all`; `--existing` switches the next-step instructions to brownfield mode pointing at `/scan` and `/bootstrap --scan`; `--force` to overwrite), `add domain <name>` (auth, payments, storage, email). See [src/commands/init.ts](src/commands/init.ts), [src/commands/add.ts](src/commands/add.ts).
- **Maintenance** — `update` (refreshes existing files only), `doctor` (health check, detects partial installs and obsolete `spec-restore`/`snapshot` files). See [src/commands/update.ts](src/commands/update.ts), [src/commands/doctor.ts](src/commands/doctor.ts).
- **Inspection** — `status` (bootstrap state + per-spec phase/progress), `commands` (lists installed agent commands). See [src/commands/status.ts](src/commands/status.ts), [src/commands/commands.ts](src/commands/commands.ts).
- **Provider abstraction** — single source of truth for which files each provider gets. See [src/providers.ts](src/providers.ts) and [src/commands/command-names.ts](src/commands/command-names.ts).
- **Template assets (the actual protocol)** — pure Markdown the CLI copies. See [templates/](templates/).

## Architecture Decisions

- **Zero runtime dependency in target projects.** Files are copied; the target repo owns them and can edit freely. Locked in.
- **Markdown-only protocol artifacts.** No DSL, no YAML schema, no binary format. The agent reads what the human reads.
- **One source of truth for command names.** [src/commands/command-names.ts](src/commands/command-names.ts) drives every provider's file list — adding a command means updating that array plus the per-provider template files for every command-aware provider.
- **Provider parity is a correctness invariant.** A protocol change must land across every provider that ships that command. Single-provider edits cause silent drift and are treated as shipped bugs.
- **Conservative `update` semantics.** `update` only refreshes files that already exist locally. New commands require explicit `init --force` so users who customized their local workflow are not surprised.
- **Interactive by default, scriptable on demand.** `init` prompts unless `--provider`/`--all` is passed or stdout is not a TTY (CI mode → installs all).
- **Pure procedural TypeScript.** No classes, no DI, no abstractions beyond a `Provider` record. Each subcommand exports a single `*Command` function consumed by [src/cli.ts](src/cli.ts).
- **Tiny dependency surface.** Only `commander` (CLI parsing) and `@inquirer/prompts` (interactive selection). Dev: TypeScript + tsup → single CommonJS bin.

## Definition of Done

A change to this repo is "done" when:
- `npm run build` succeeds and produces `dist/cli.js` (tsup). The `#!/usr/bin/env node` banner is added by tsup config; npm handles the bin symlink/mode on install.
- The TypeScript `strict` compiler passes on the new code.
- `npx sddx-workflow init`, `update`, `doctor`, and `status` still work end-to-end on a fresh directory and on an existing install.
- `doctor` reports healthy after `init` against a clean target.
- Public-facing surfaces — README, `CLAUDE.md`, `templates/CLAUDE.md`, `.sdd/workflow.md` — agree with whatever protocol changes were made. The protocol contract is the product; doc drift is a real bug.
- For protocol changes: every command-aware provider format (claude-commands, codex-skills, copilot-prompts, gemini-commands, windsurf-workflows) reflects the change. Rule-only providers (cursor, zed) get the protocol via their always-on rules file. The CLI is fan-out; an inconsistent provider is a shipped bug.

## Current Verification Baseline

There is **no automated test suite or CI workflow yet** (see [conventions.md §Testing](.sdd/conventions.md#testing)) — adding tests is an open priority, not a deliberate non-goal.

The current manual-verification record lives at the repo root (untracked):

- **[QA_REPORT.md](QA_REPORT.md)** — full audit of the v0.10.0 surface, dated 2026-05-19. 6/6 CLI commands and 8/20 agent commands exercised end-to-end on a sandbox project. Verdict: GO on the golden path.
- **[WORKFLOW_REVIEW.md](WORKFLOW_REVIEW.md)** — qualitative agent-perspective review of the protocol itself.

### Known bugs in v0.10.0 (from QA_REPORT)

These exist in the currently published version and are open until fixed:

- **B-02 (HIGH) — `doctor` never exits non-zero.** [src/commands/doctor.ts:43](src/commands/doctor.ts#L43) declares `const issues: string[] = []` but nothing ever pushes into it; the `if (issues.length > 0) process.exit(1)` at line 100 is unreachable. A CI gate using `doctor` will pass on broken installs.
- **B-03 (MEDIUM) — `status` reports "verify failed" on healthy `verify-report.md`.** False-positive regex.
- **B-04 (LOW) — `commands` subcommand is static.** Lists every COMMAND_NAMES entry rather than inspecting the actual install.
- ~~**B-01 (MEDIUM) — `npm run build` `chmod +x` step fails on Windows.**~~ **Fixed in `07d8a61`** — the `chmod` step was dropped from the build script entirely; the tsup banner + npm's bin handling cover the executable bit.

Any new work that touches these files should consider folding the fix in, or leave the line untouched to keep the fix patch atomic.
