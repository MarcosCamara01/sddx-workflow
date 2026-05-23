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

- **Installation** — `init` (interactive provider selection or `--provider` / `--all`; non-TTY stdout defaults to all providers; `--existing` switches the next-step instructions to brownfield mode pointing at `/scan` and `/bootstrap --scan`; `--force` to overwrite), `add domain <name>` for built-in templates (auth, payments, storage, email; custom domains are created manually). See [src/commands/init.ts](src/commands/init.ts), [src/commands/add.ts](src/commands/add.ts).
- **Maintenance** — `update` (refreshes existing files only), `doctor` (health check, detects partial installs and obsolete `spec-restore`/`snapshot` files). See [src/commands/update.ts](src/commands/update.ts), [src/commands/doctor.ts](src/commands/doctor.ts).
- **Inspection** — `status` (bootstrap state + per-spec phase/progress), `commands` (lists the protocol command catalog). See [src/commands/status.ts](src/commands/status.ts), [src/commands/commands.ts](src/commands/commands.ts).
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
- **Tiny runtime dependency surface.** Only `commander` (CLI parsing) and `@inquirer/prompts` (interactive selection). Dev: TypeScript + tsup + Biome + `node:test` → checked, tested, single CommonJS bin.

## Definition of Done

A change to this repo is "done" when:
- `npm run build` succeeds and produces `dist/cli.js` (tsup). The `#!/usr/bin/env node` banner is added by tsup config; npm handles the bin symlink/mode on install.
- `npm run check` passes with no Biome formatting, lint, or import-order diagnostics.
- The TypeScript `strict` compiler passes on the new code.
- `npm test` passes; it runs static checks, builds the CLI, and executes the `node:test` suite.
- `npx sddx-workflow init`, `update`, `doctor`, and `status` still work end-to-end on a fresh directory and on an existing install.
- `doctor` reports healthy after `init` against a clean target.
- Public-facing surfaces — README, `CLAUDE.md`, `templates/CLAUDE.md`, `.sdd/workflow.md` — agree with whatever protocol changes were made. The protocol contract is the product; doc drift is a real bug.
- For protocol changes: every command-aware provider format (claude-commands, codex-skills, copilot-prompts, gemini-commands, windsurf-workflows) reflects the change. Rule-only providers (cursor, zed) get the protocol via their always-on rules file. The CLI is fan-out; an inconsistent provider is a shipped bug.

## Current Verification Baseline

There is now a focused automated test suite using Node's built-in `node:test`
runner and a GitHub Actions CI workflow (see [conventions.md §Testing](.sdd/conventions.md#testing)).

The current manual-verification record lives at the repo root:

- **[WORKFLOW_AUDIT_REPORT.md](WORKFLOW_AUDIT_REPORT.md)** — full audit of the v0.10.0 surface, dated 2026-05-23, with a second independent scratch-project rerun. CLI commands, provider parity, domain creation, update drift, doctor/status edge cases, package contents, end-to-end SDD workflows, and a brutal AI/code-quality review were exercised. F-001 through F-004 are now fixed or mitigated with automated coverage.

### QA and audit status from v0.10.0

Highlights found in the v0.10.0 QA pass and addressed in this repo:

- **B-02 (HIGH) — `doctor` never exited non-zero.** Fixed: missing core files and no provider files are now errors.
- **B-03 (MEDIUM) — `status` reported "verify failed" on healthy `verify-report.md`.** Fixed: `status` reads the `Result:` header line only.
- **B-04 (LOW) — `commands` subcommand description was misleading.** Fixed: help text now describes the static protocol catalog.
- ~~**B-01 (MEDIUM) — `npm run build` `chmod +x` step fails on Windows.**~~ **Fixed in `07d8a61`** — the `chmod` step was dropped from the build script entirely; the tsup banner + npm's bin handling cover the executable bit.

Future QA findings should be recorded here until they are fixed or moved into a dedicated issue tracker.

Resolved follow-ups from the 2026-05-23 audit:

- **F-001 (HIGH) — `init --force` overwrote user-owned `.sdd/project-overview.md` and `.sdd/conventions.md`.** Fixed with `smoke/f001-init-force-preserves-context.sh`.
- **F-002 (MEDIUM) — `status` treated malformed `verify-report.md` as `review pending`.** Fixed with `smoke/f002-status-verify-result.sh`.

Mitigated follow-ups:

- **F-003 (MEDIUM) — `status` remains Markdown-based, but phase inference now has matrix coverage in `test/status.test.js` and smaller parsing helpers.**
- **F-004 (MEDIUM) — formal automated regression suite now exists via `npm test`.**
