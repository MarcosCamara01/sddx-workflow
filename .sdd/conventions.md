# Project Conventions

> Fill this out before starting any non-trivial work.
> The AI agent reads this file before implementing anything.

## Tech Stack

<!-- auto -->
- **Runtime:** Node.js ≥ 18 ([package.json](package.json) `engines`)
- **Language:** TypeScript 5.6 in `strict` mode, target ES2020, module CommonJS ([tsconfig.json](tsconfig.json))
- **Bundler:** tsup 8 → single CommonJS file `dist/cli.js` with `#!/usr/bin/env node` banner ([tsup.config.ts](tsup.config.ts))
- **CLI parsing:** [commander](https://www.npmjs.com/package/commander) ^12
- **Interactive prompts:** [@inquirer/prompts](https://www.npmjs.com/package/@inquirer/prompts) ^8 (`checkbox`)
- **Package layout:** published to npm as `sddx-workflow`; `bin` field exposes `sddx-workflow` → `dist/cli.js`; `files` ships `dist/` and `templates/` only
- **No test framework, no linter, no formatter configured yet** — this is a known gap, not a deliberate non-goal.

## File & Folder Structure

<!-- auto -->
```
src/
  cli.ts                  # entry point — wires commander to subcommand handlers
  providers.ts            # provider registry + CORE_FILES + WORKFLOW_FILES + parseProviderList
  utils.ts                # TEMPLATES_DIR, ensureDir, displayPath, copyTemplate
  commands/
    command-names.ts      # COMMAND_NAMES — single source of truth for agent slash-command list
    init.ts               # `init` subcommand
    add.ts                # `add domain <name>` subcommand
    update.ts             # `update` subcommand (--dry-run, --check)
    doctor.ts             # `doctor` subcommand
    status.ts             # `status` subcommand
    commands.ts           # `commands` subcommand
templates/                # the Markdown protocol the CLI copies into target projects
  claude-commands/        # per-provider command files (one per COMMAND_NAMES entry)
  codex-skills/<name>/SKILL.md
  copilot-prompts/<name>.prompt.md
  gemini-commands/<name>.toml
  windsurf-workflows/<name>.md
  cursor-rules/sddx-workflow.mdc
  windsurf-rules/sddx-workflow.md
  zed-rules/sddx-workflow.md
  conventions/base.md
  domains/{auth,email,payments,storage}.md
  specs/_template/{1-requirements,2-plan,2a-data-model,2b-api-contracts,2c-research,3-tasks,amendments,impl-gaps,analysis,verify-report}.md
  AGENTS.md / CLAUDE.md / gemini.md / copilot-instructions.md / project-overview.md
dist/                     # build output (git-ignored)
```

Non-obvious:
- `templates/` is **bundled into the published package** via `package.json#files`. It is loaded at runtime via `path.join(__dirname, '../templates')` ([src/utils.ts:4](src/utils.ts#L4)) — so the relative layout of `dist/` to `templates/` must be preserved by the build.
- `src/` and `templates/` are independent trees. Editing protocol Markdown is a `templates/` change, not a `src/` change.
- `.claude/commands/`, `.sdd/`, `CLAUDE.md` at the repo root are this project's own **dogfood install** — `sddx-workflow` uses its own protocol on itself.

## Naming Conventions

<!-- auto -->
- **Files:** kebab-case `.ts` (`command-names.ts`, `spec-clarify.md`).
- **Subcommand modules:** each file in `src/commands/` exports a single named function `<verb>Command` (`initCommand`, `addCommand`, `doctorCommand`).
- **Agent slash commands:** kebab-case (`spec-plan`, `impl-gap`, `conventions-sync`). All names listed in [src/commands/command-names.ts:1](src/commands/command-names.ts#L1) — adding a command means updating that array AND adding the matching template file under every command-aware provider directory.
- **Provider IDs:** lowercase, hyphenated where multi-word (`claude-code`, `copilot`, `codex`).
- **Variables:** camelCase. **Types/interfaces:** PascalCase (`ProviderId`, `InstallFile`).
- **Spec folders (in user projects):** kebab-case under `specs/<name>/`.

## Code Style

<!-- auto -->
- **Strict TypeScript**, no implicit `any`, `esModuleInterop: true`.
- **CommonJS only — do not switch to ESM casually.** [src/cli.ts:10](src/cli.ts#L10) uses `createRequire(__filename)` and [src/utils.ts:4](src/utils.ts#L4) uses `__dirname`; both are CJS globals. tsup emits CJS by configuration. An ESM port is a multi-file design decision, not a tooling tweak.
- **Procedural functions, no classes.** Each subcommand is a top-level function; shared helpers live in `utils.ts` or `providers.ts`.
- **Synchronous `fs` is the default.** Only `init` is async (because of `@inquirer/prompts`). Don't add async unless a dependency requires it.
- **Console output format** is part of the UX contract:
  - Leading two spaces, then a verb column, then the message: `  create    .sdd/workflow.md`, `  skip      CLAUDE.md`, `  overwrite .claude/commands/init.md`.
  - Section breaks: a blank `console.log('')` before and after blocks.
  - Errors go to `stderr` as `\n  error    <message>` then `process.exit(1)`.
  - Match the existing column-aligned style — don't introduce a logger or color library without surfacing it as a decision.
- **No abstraction beyond what's already present.** The `Provider` record + `COMMAND_NAMES` array are deliberately flat data. Resist building a registry, plugin system, or rendering pipeline.
- **Imports:** Node built-ins (`fs`, `path`, `module`) come first; local relative imports last. No path aliases.
- **Templates are dumb data.** Logic stays in `src/`. Don't put templating syntax (mustache, EJS) inside `templates/` — they are copied verbatim, byte-for-byte (`update` detects drift by string equality, see [src/commands/update.ts:11-15](src/commands/update.ts#L11-L15)).

## Patterns to Avoid

<!-- manual -->
- **Editing only one provider's command file.** A protocol change must land across every command-aware provider that ships that command (see [src/providers.ts:32-56](src/providers.ts#L32-L56)). Single-provider edits cause silent drift and have already been called out as a category of shipped bug in QA. Provider parity is a hard invariant.
- **Adding runtime behavior to the target project.** This tool is an installer. No "watch", "daemon", "lint", or "hook" features without an explicit architecture decision — it would break the zero-runtime invariant.
- **Silent overwrites.** `copyTemplate` skips existing files unless `force` is passed ([src/utils.ts:22-29](src/utils.ts#L22-L29)). New code paths must preserve that contract; never use `fs.writeFileSync` to clobber user-owned files.
- **Bundling templating engines or markdown processors.** Templates are copied as bytes. If a template needs variable substitution, surface that as a design decision first.
- **Treating `doctor`/`status` exit codes as gospel without checking the bugs.** Still-open in HEAD: B-02 (`doctor` never exits non-zero) and B-03 (`status` false-positive "verify failed"). See [QA_REPORT.md](QA_REPORT.md) and the Known Bugs section of [project-overview.md](.sdd/project-overview.md).
- **Letting `dist/` or `node_modules/` leak into git.** Already gitignored ([.gitignore](.gitignore)) — keep it that way.

## Testing

<!-- auto -->
- **No automated test suite yet.** No `test` script in [package.json](package.json), no test runner installed, no CI workflow under `.github/workflows/`. This is a known gap — adding tests is an open priority and is welcome.
- **Current verification baseline is manual**, recorded in [QA_REPORT.md](QA_REPORT.md) (2026-05-19, v0.10.0). When changing CLI behavior, that report's matrix is the closest thing to a regression checklist. Update it if the change invalidates any row.
- **Smoke procedure for a CLI-side change:**
  1. `npm run build` — must succeed and produce `dist/cli.js` (pure tsup; no chmod step since commit `07d8a61`).
  2. Smoke-test against a scratch directory: `mkdir /tmp/sdd-smoke && cd /tmp/sdd-smoke && node /path/to/sddx-workflow/dist/cli.js init --all`, inspect output.
  3. Run `doctor` and `status` against the smoke install — but cross-check with QA_REPORT's known bugs (B-02, B-03) before trusting the result.
  4. Re-run the affected row from QA_REPORT's verification matrix.
- **For protocol-only changes (Markdown under `templates/`):** open the generated file in an actual agent and walk through the affected command path. Provider parity must hold across all command-aware providers.
- **When introducing a test framework:** surface it via `/research` before adopting (Jest vs Vitest vs node:test, ESM vs CJS impact on tsup output, etc.). The current zero-test state is a gap to close, but how to close it is itself a real design decision.

## Domain Glossary

<!-- manual -->
- **SDD Protocol** — the Markdown contract installed under `.sdd/workflow.md` plus the per-provider command files. The protocol, not the CLI, is what AI agents actually consume.
- **Provider** — an AI agent integration (Claude Code, Cursor, Windsurf, Copilot, Codex, Gemini CLI, Zed). Registered in `PROVIDERS` in [src/providers.ts](src/providers.ts).
- **Command-aware provider vs rule-only provider** — command-aware providers (Claude Code, Copilot, Codex, Gemini CLI, Windsurf) get one file per `COMMAND_NAMES` entry. Rule-only providers (Cursor, Zed) get a single always-on rules file containing the protocol. `COMMAND_PROVIDER_IDS` in [src/providers.ts:117](src/providers.ts#L117) is the split.
- **Core files** (`CORE_FILES`) — protocol files copied for every install regardless of provider (`.sdd/workflow.md`, `.sdd/project-overview.md`, `.sdd/conventions.md`, `specs/_template/*`).
- **Workflow files** (`WORKFLOW_FILES`) — the union of `workflow.md` + every provider's files. This is what `update` walks.
- **Spec** — a feature folder under `specs/<name>/` in the user's project, with `1-requirements.md` → `2-plan.md` → `3-tasks.md` plus optional `2a/2b/2c`, `amendments.md`, `impl-gaps.md`, `verify-report.md`, `analysis.md`.
- **Bootstrap** — running the agent's `/bootstrap` command to populate `.sdd/project-overview.md` and `.sdd/conventions.md` for a target project. `status` considers a project "bootstrapped" once `project-overview.md` has non-comment, non-heading content (see [src/commands/status.ts:4-13](src/commands/status.ts#L4-L13)).
- **Stop point** — a non-negotiable place where the agent must halt and wait for human approval (defined in `.sdd/workflow.md` §Stop Points).
- **CR (Change Request)** — a documented amendment in `amendments.md` that gates edits to already-approved `1-requirements.md`/`2-plan.md`.
- **Gap** — a blocking ambiguity/contradiction logged in `impl-gaps.md` via `/impl-gap` during `/spec-tasks`.
