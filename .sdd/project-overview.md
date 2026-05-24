# Project Overview

## What This App Does

`sddguard` is a small Node.js CLI that installs a Spec-Driven Development protocol into a target project. The product is the local Markdown workflow it copies: `.sdd/` context files, `specs/_template/` templates, and provider-specific agent instructions for Claude Code, OpenAI Codex, GitHub Copilot, Gemini CLI, Windsurf, Cursor, and Zed.

The CLI helps teams guide AI-assisted development through clarify, plan, execute, verify, review, and finish phases with explicit human stop points. It also provides executable checks such as `gate`, `status --strict`, `commands --installed`, and `doctor` so CI or an obedient agent can catch common protocol blockers.

## What It Does NOT Do

- No daemon, server, database, watcher, or runtime hook in the target project.
- No automatic execution of agent commands such as `/spec-plan` or `/verify`; those are instructions consumed by the AI tool.
- No operating-system-level sandbox that prevents edits if an agent ignores the protocol.
- No project-stack detection beyond installed templates and documented scan/bootstrap workflows.
- No custom domain generation beyond built-in templates for `auth`, `payments`, `storage`, and `email`.
- No silent refresh of project-owned context or provider entrypoints/rules.

## Main Domains

- **Installation** — `init`, `init --all`, `init --provider`, `init --existing`, and `init --force`.
- **Maintenance** — `update`, `update --check`, `update --dry-run`, and `doctor`.
- **Inspection and gates** — `status`, `status --strict`, `commands`, `commands --installed`, and `gate <phase> <feature>`.
- **Provider registry** — `src/providers.ts` maps provider IDs to files copied from `templates/`.
- **Protocol templates** — `templates/` contains workflow, provider entrypoints, command files, domains, and spec templates.
- **Spec state parsing** — `src/spec-state.ts` contains shared checks for requirements readiness, approvals, task progress, verify/review results, CRs, and gaps.

## Architecture Decisions

- **Installer-only design.** Target projects own copied Markdown files after install.
- **Plain Markdown protocol.** Specs, plans, tasks, reports, gaps, and amendments remain human-readable and diffable.
- **Flat provider registry.** Provider files are declared in `src/providers.ts`; command-aware providers derive command file lists from `COMMAND_NAMES`.
- **Conservative update semantics.** `update` refreshes managed workflow/command files that already exist and preserves user-owned context and entrypoints.
- **Procedural TypeScript.** Subcommands are small functions under `src/commands/`; shared helpers live in `src/utils.ts`, `src/providers.ts`, and `src/spec-state.ts`.
- **CommonJS bundle.** `tsup` emits `dist/cli.js` as the npm bin target.

## Definition of Done

A change is done when:

- `npm ci` can install dependencies from `package-lock.json`.
- `npm run check` passes Biome checks.
- `npm test` passes; it runs check, build, and the `node:test` suite.
- `npm pack --dry-run` shows the expected runtime package contents for release-sensitive changes.
- Affected CLI flows are smoke-tested in a scratch directory when behavior changes.
- Protocol changes are reflected consistently across `.sdd/workflow.md`, README, provider entrypoints, and command-aware provider templates.
- Project-owned context files are not overwritten unless the user explicitly edits them.
