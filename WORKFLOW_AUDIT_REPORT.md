# SDD Workflow Audit Report

Date: 2026-05-23  
Auditor: Codex  
Repo: `sddx-workflow`  
Version under audit: `0.10.0`  
Primary scratch workspace: `/tmp/sddx-audit-20260523-lJWfnT`  
Second scratch workspace: `/tmp/sddx-audit-rerun-20260523-0tj2CA`

## Executive Summary

Verdict: **GO for the install golden path; remaining risk is robustness, not
known golden-path breakage.**

The SDD workflow installer is healthy on the golden path. The package builds,
the CLI installs all provider surfaces, `doctor` reports a clean full install,
`update` detects and repairs drift, provider command parity holds across all
command-aware providers, and a complete SDD feature flow was exercised in a
throwaway Node.js project with a real red/green test loop.

The first pass of this audit was too generous: it proved the workflow can run
end-to-end, but it did not critique the AI-facing response quality and code
quality harshly enough. A follow-up senior review found two important bugs:
`init --force` overwrote user-owned project context despite docs saying it never
should, and `status` treated malformed verify reports as review-ready. Both
bugs have since been fixed with focused smoke coverage.

The workflow is useful and coherent. The remaining material concerns are that
`status` still relies on brittle Markdown inference and the smoke coverage is
not yet a formal automated test suite.

## Scope

This audit covered:

- CLI commands: `init`, `add`, `update`, `status`, `doctor`, `commands`.
- Provider install surfaces: Claude Code, Cursor, Windsurf, GitHub Copilot,
  OpenAI Codex, Gemini CLI, and Zed.
- Command-aware provider parity for all 20 SDD protocol commands.
- Core files and spec templates installed into a scratch project.
- Domain template creation for `auth`, `payments`, `storage`, and `email`.
- Protocol workflow execution in a fixture project:
  `/scan`, `/bootstrap --scan`, `/spec-new`, `/spec-clarify`, `/spec-plan`,
  `/spec-tasks`, `/spec-analyze`, `/verify`, `/review`, and `/finish`.
- Status edge cases for draft, awaiting approval, in-progress, awaiting verify,
  verify failed, pending CR, unresolved gap, and malformed verify report states.
- Package dry-run contents for publishability.

Out of scope:

- Publishing to npm.
- Testing actual Claude/Copilot/Gemini/Windsurf/Cursor/Zed runtime behavior.
- Fixing findings found during the audit.
- Adding an automated test framework.

## Environment

- Host project: `/Users/marcospenelascamara/proyectos/sddx-workflow`
- Scratch root: `/tmp/sddx-audit-20260523-lJWfnT`
- Fixture app: `/tmp/sddx-audit-20260523-lJWfnT/fixture-app`
- Status edge-case app: `/tmp/sddx-audit-20260523-lJWfnT/status-lab`
- Provider-specific app: `/tmp/sddx-audit-20260523-lJWfnT/provider-codex`
- Second-run app: `/tmp/sddx-audit-rerun-20260523-0tj2CA/notes-app`
- Runtime: local Node/npm environment

## Success Criteria

The workflow is considered audit-green when:

- `npm run build` succeeds.
- `npm pack --dry-run` includes `dist/` and all required `templates/` files.
- A fresh `init --all --existing` creates core files and all provider files.
- `doctor` reports the full install as healthy.
- `status` correctly reflects bootstrap and spec phase state.
- `update --check` reports current files as clean, detects deliberate drift,
  exits non-zero for outdated files, and `update` repairs the drift.
- `add domain <name>` creates every built-in domain and skips existing domains.
- Invalid commands return non-zero with actionable output.
- A scratch project can follow the installed SDD workflow through a real feature
  task with red/green verification.
- Provider command templates are present for every command in `COMMAND_NAMES`.

## Commands Executed

### Build and Package

| Command | Result | Evidence |
|---|---:|---|
| `npm run build` | PASS | `tsup` built `dist/cli.js` successfully. |
| `npm pack --dry-run` | PASS | Tarball preview included `dist/cli.js`, `README.md`, and 127 package files, including all template surfaces. |

### Full Install Smoke

Fixture project created at:

```text
/tmp/sddx-audit-20260523-lJWfnT/fixture-app
```

| Command | Result | Evidence |
|---|---:|---|
| `npm init -y` | PASS | Created a minimal CommonJS Node project. |
| `node dist/cli.js init --all --existing` | PASS | Created `.sdd/`, `specs/_template/`, all provider files, and printed brownfield next steps. |
| `node dist/cli.js doctor` | PASS | `install found`, `core files ok`, all 7 providers detected, `obsolete none`. |
| `node dist/cli.js status` before bootstrap | PASS | `bootstrap pending`, `open specs 0`. |
| `node dist/cli.js update --check` | PASS | `0 outdated, 108 current, 0 not installed`. |
| `node dist/cli.js commands` | PASS | Listed all 20 agent commands. |

### Domain Creation

| Command | Result | Evidence |
|---|---:|---|
| `add domain auth` | PASS | Created `.sdd/domains/auth.md`. |
| `add domain payments` | PASS | Created `.sdd/domains/payments.md`. |
| `add domain storage` | PASS | Created `.sdd/domains/storage.md`. |
| `add domain email` | PASS | Created `.sdd/domains/email.md`. |
| `add domain auth` again | PASS | Skipped the existing file without overwrite. |
| `add domain billing` | PASS | Exited 1 with built-in domain list and manual custom-domain hint. |
| `add widget auth` | PASS | Exited 1 with `Unknown type "widget". Available: domain`. |

### No-Install Errors

Commands executed from a directory without `.sdd/`:

| Command | Result | Evidence |
|---|---:|---|
| `doctor` | PASS | Exited 1 and told the user to run `init`. |
| `status` | PASS | Exited 1 with `No SDD installation found`. |
| `update --check` | PASS | Exited 1 with `No SDD installation found`. |
| `add domain auth` | PASS | Exited 1 with `.sdd/ not found`. |

### Provider Selection

| Command | Result | Evidence |
|---|---:|---|
| `init --provider codex` | PASS | Installed core + Codex files only. |
| `doctor` in Codex-only install | PASS | Detected OpenAI Codex and healthy core. |
| `update --check` in Codex-only install | PASS | `0 outdated, 22 current, 86 not installed`. |
| `init --provider unknown` | PASS | Exited 1 with valid provider list. |
| `init --provider codex --all` | PASS | Exited 1 with mutually exclusive option error. |
| `init --provider codex` again | PASS | Skipped existing files. |
| `init --force --provider codex` | PASS | Overwrote/recreated provider files. |

### Update Drift Detection

In the Codex-only scratch project, `.sdd/workflow.md` was deliberately modified
to simulate local drift.

| Command | Result | Evidence |
|---|---:|---|
| `update --dry-run` | PASS | Reported `.sdd/workflow.md` as needing update. |
| `update --check` | PASS | Exited 1 with `1 outdated`. |
| `update` | PASS | Overwrote `.sdd/workflow.md`. |
| `update --check` after repair | PASS | Returned to `0 outdated`. |

### Doctor Edge Cases

| Scenario | Result | Evidence |
|---|---:|---|
| Deleted `.agents/skills/verify/SKILL.md` | PASS | `doctor` warned about a partial Codex install and exited 0. |
| Deleted `specs/_template/2-plan.md` | PASS | `doctor` reported missing core file and exited 1. |
| Re-ran `init --force --provider codex` | PASS | Recreated missing core and provider file. |

## SDD Workflow Execution in Fixture Project

The installed workflow was exercised against a real mini feature:
add `subtract(a, b)` to a calculator module.

### Fixture App Baseline

Created:

```text
src/calculator.js
test/calculator.test.js
```

Baseline test:

```text
npm test
```

Result: PASS, 1 test, 1 pass.

### `/scan`

Created `scan-report.md` with:

- Runtime and test framework detection.
- Project structure.
- Observed conventions.
- Open questions.

Result: PASS.

### `/bootstrap --scan`

Populated:

- `.sdd/project-overview.md`
- `.sdd/conventions.md`

Result: PASS. `status` changed from `bootstrap pending` to `bootstrap done`.

### `/spec-new`

Created `specs/calculator-subtract/` from installed templates:

- `1-requirements.md`
- `2-plan.md`
- `3-tasks.md`
- `amendments.md`
- `impl-gaps.md`
- `analysis.md`
- `verify-report.md`

Result: PASS.

### `/spec-clarify`

Recorded a blocking clarification:

```text
Should `subtract` validate non-number inputs? -> No.
```

Result: PASS. No unchecked blocking questions remained.

### `/spec-plan`

Drafted and approved a one-task plan with:

- Goals coverage: G1, G2, G3.
- Assumptions.
- Components affected.
- Abort criteria.
- Verification criteria.

Result: PASS.

### `/spec-tasks`

Task 1 was executed test-first.

Red phase:

```text
TypeError: subtract is not a function
```

Implementation:

- Added `subtract(a, b)` in `src/calculator.js`.
- Exported `{ add, subtract }`.

Green phase:

```text
npm test
```

Result: PASS, 3 tests, 3 pass.

### `/spec-analyze`

Created `specs/calculator-subtract/analysis.md`.

Checks:

- Goal-to-task coverage: PASS.
- Plan-to-task coverage: PASS.
- Scope creep: PASS.

Result: PASS.

### `/verify`

Created `specs/calculator-subtract/verify-report.md`.

Header:

```text
Result: PASS
```

Checks:

- All tasks complete.
- Goals covered.
- Acceptance scenarios covered by tests.
- Full suite passes.
- Modified files limited to plan.
- No unresolved gaps.
- No pending CRs.

Result: PASS.

### `/review`

Qualitative review result:

- Implementation is minimal.
- Naming is clear.
- No unnecessary abstraction.
- No follow-up needed for the fixture.

Result: PASS.

### `/finish`

Initialized git in the fixture app, inspected status and staged files.

Evidence:

- `git status --short` showed all generated workflow, spec, source, and test
  files.
- `git diff --cached --stat` showed 135 staged files after `git add .`.
- Proposed commit type for the fixture would be `feat(calculator)`.

Result: PASS. No commit was created.

## Second Independent Audit Run

Date: 2026-05-23  
Scratch project: `/tmp/sddx-audit-rerun-20260523-0tj2CA/notes-app`

Purpose: repeat the audit in a different project, with a different feature and
with explicit re-tests of the high-risk findings from the first pass.

### Install and CLI Health

| Command / Scenario | Result | Evidence |
|---|---:|---|
| `npm run build` in source repo | PASS | `tsup` rebuilt `dist/cli.js`. |
| `npm init -y` in second scratch project | PASS | Created `notes-app`. |
| `init --all --existing` | PASS | Created full `.sdd/`, spec templates, and all provider files. |
| `doctor` | PASS | Healthy install, all 7 providers detected, obsolete none. |
| `status` before bootstrap | PASS | `bootstrap pending`, `open specs 0`. |
| `update --check` | PASS | `0 outdated, 108 current, 0 not installed`. |
| `commands` | PASS | Listed all 20 commands. |
| Built-in domains | PASS | Created `auth`, `payments`, `storage`, and `email`; repeated `email` skipped. |
| Invalid domain/type | PASS | `analytics` and `flow` exited 1 with actionable errors. |

### Update Drift Re-Test

`.sdd/workflow.md` was deliberately edited in the second project.

| Command | Result | Evidence |
|---|---:|---|
| `update --dry-run` | PASS | Reported `.sdd/workflow.md`. |
| `update --check` | PASS | Exited 1 with `1 outdated, 107 current`. |
| `update` | PASS | Overwrote `.sdd/workflow.md`. |
| `update --check` after repair | PASS | Returned to `0 outdated, 108 current`. |

### End-to-End SDD Feature Re-Test

Different feature from the first run:

```text
normalizeTitle(title)
```

Baseline:

- Created `src/notes.js`.
- Created `test/notes.test.js`.
- `npm test` passed with 1 test.

Workflow artifacts:

- `scan-report.md`
- `.sdd/project-overview.md`
- `.sdd/conventions.md`
- `specs/normalize-note-title/1-requirements.md`
- `specs/normalize-note-title/2-plan.md`
- `specs/normalize-note-title/3-tasks.md`
- `specs/normalize-note-title/analysis.md`
- `specs/normalize-note-title/verify-report.md`

Red phase:

```text
TypeError: normalizeTitle is not a function
```

Implementation:

- Added `normalizeTitle(title)`.
- Exported it beside `createNote`.
- Kept `createNote` behavior unchanged.

Green phase:

```text
npm test
```

Result: PASS, 3 tests, 3 pass.

Final second-run status:

```text
bootstrap    done
normalize-note-title review pending · 1/1 tasks
```

Result: PASS.

### Known Finding Re-Tests

Historical note: this table records the second audit run before fixes were
applied. Current status is in the Findings section below.

| Finding | Re-Test Result | Evidence |
|---|---:|---|
| F-001 `init --force` overwrites user context | CONFIRMED | Custom `.sdd/project-overview.md` and `.sdd/conventions.md` were overwritten back to template headings. |
| F-002 malformed `verify-report.md` shown as review-ready | CONFIRMED | `malformed-second-run review pending · 1/1 tasks` despite missing `Result:` line. |
| Provider command parity | STILL PASS | Claude, Codex, Copilot, Gemini, and Windsurf each had 20/20 command files. |
| Package dry-run | STILL PASS | `npm pack --dry-run` reported 127 package files. |

Second-run verdict: **No new distinct finding, but F-001 and F-002 are now
independently reproduced.**

## Status State Matrix

The `status-lab` project exercised phase inference:

| Spec State | Observed Status | Result |
|---|---|---:|
| Requirements only | `drafting requirements` | PASS |
| Plan exists, not approved | `awaiting plan approval` | PASS |
| Approved plan, partial tasks | `in /spec-tasks` | PASS |
| All tasks done, no verify report | `awaiting /verify` | PASS |
| Verify report with `Result: FAIL` | `verify failed` | PASS |
| Pending CR + unresolved gap | Shows both outstanding items | PASS |
| Verify report missing `Result:` | `review pending` | **FAIL** |

The malformed verify case is a real status finding. A later quality pass also
found a higher-severity ownership bug in `init --force`; see F-001 below.

## Provider Parity

The command source of truth is `src/commands/command-names.ts`.

Expected command count: 20.

| Provider Surface | Expected | Missing | Unexpected | Result |
|---|---:|---:|---:|---:|
| `templates/claude-commands/*.md` | 20 | 0 | 0 | PASS |
| `templates/codex-skills/*/SKILL.md` | 20 | 0 | 0 | PASS |
| `templates/copilot-prompts/*.prompt.md` | 20 | 0 | 0 | PASS |
| `templates/gemini-commands/*.toml` | 20 | 0 | 0 | PASS |
| `templates/windsurf-workflows/*.md` | 20 | 0 | 0 | PASS |

Rule/entry files also mention all 20 commands:

- `templates/workflow.md`: 20/20
- `templates/AGENTS.md`: 20/20
- `templates/CLAUDE.md`: 20/20
- `templates/gemini.md`: 20/20
- `templates/copilot-instructions.md`: 20/20
- `templates/cursor-rules/sddx-workflow.mdc`: 20/20
- `templates/windsurf-rules/sddx-workflow.md`: 20/20
- `templates/zed-rules/sddx-workflow.md`: 20/20

Result: PASS.

## Brutal Quality Review

This section audits the quality of the code and the AI-facing response the
protocol is likely to induce, not just whether commands can be made to pass.

### Code Quality

Overall code quality: **good small-CLI code, not yet release-hardened.**

The positive read:

- The CLI is small, readable, and procedural in the right way.
- Provider fan-out is centralized in `src/providers.ts`, which is the correct
  shape for this product.
- Synchronous filesystem code is acceptable here; this is a short-lived CLI,
  not a server.
- Output is consistent enough to be human-readable and script-smoke-testable.

The hard read at audit time:

- `status` is doing semantic workflow inference with regexes over Markdown.
  That is acceptable for a Markdown-native product, but it needs fixture
  coverage and disciplined helpers.
- Command handlers call `process.exit` directly, which is pragmatic for a CLI
  but makes unit testing harder. A thin return-code layer would make future
  tests cleaner.
- The docs claim ownership boundaries that the code violates under `init
  --force`. That is the worst kind of drift for this project because the
  product is a trust protocol.
- The previous audit missed the `init --force` ownership bug even though the
  scratch run printed `overwrite .sdd/project-overview.md` and `overwrite
  .sdd/conventions.md`. That is a process failure in the audit itself.

Post-audit remediation added a `node:test` suite via `npm test`, including
provider parity, entry/rule command coverage, package dry-run contents,
`status` phase matrix coverage, and CLI smoke coverage for `init`, `add domain`,
`doctor`, `update`, and `commands`.

### AI Response Quality

Overall prompt/protocol quality: **strong guardrails, too much ritual, weak
enforcement feedback.**

The positive read:

- The protocol pushes the agent toward assumptions, test-first work, explicit
  stop points, and minimal code. Those are the right instincts.
- The split between `/verify` and `/review` is conceptually sound: mechanical
  checks first, qualitative pass second.
- `/impl-gap` and `/spec-amend` are good mechanisms for preventing silent
  improvisation.

The hard read:

- The workflow is heavy. For small changes, it risks producing paperwork that
  looks rigorous while adding little real signal.
- Many agent command files are thin wrappers that say "execute the command
  defined in `.sdd/workflow.md`." That is good for single source of truth, but
  weak for agents that do not reliably load or follow the full workflow file.
- The protocol says "STOP" often, but the CLI cannot enforce any stop point.
  That is honest in the docs, but it means the system depends heavily on agent
  obedience.
- The templates create good-looking artifacts even when a human or agent fills
  them poorly. Without automated checks, a bad spec can still look official.
- `/review` is described as recommendation-only. That prevents overreach, but
  also makes serious qualitative findings easy to defer unless the user insists.
  This user had to insist.

### Audit Quality Self-Critique

The first version of this report was useful but incomplete.

What it did well:

- Exercised the real CLI in scratch projects.
- Verified provider parity.
- Ran an end-to-end synthetic SDD feature with red/green tests.
- Found the malformed verify-report status bug.

What it did poorly:

- It over-indexed on "can the flow complete?" instead of "can the flow fail in
  ways that betray user trust?"
- It did not initially cross-check docs against behavior deeply enough.
- It treated the qualitative `/review` pass as fixture implementation review,
  not as a review of the protocol's AI response quality.
- It should have flagged `init --force` overwriting project context in the first
  pass because the evidence was already visible.

## Findings

### F-001 - `init --force` overwrites user-owned project context

Severity: **High**  
Area: `src/commands/init.ts`, `src/providers.ts`, README/project contract  
Status: **Fixed on 2026-05-23**

Fix evidence:

- `src/commands/init.ts` now disables `force` for `.sdd/project-overview.md`
  and `.sdd/conventions.md`.
- `smoke/f001-init-force-preserves-context.sh` covers the regression.
- Validation passed:
  - `npm run build`
  - `bash smoke/f001-init-force-preserves-context.sh`

Historical repro:

Reproduction:

1. Run:

   ```text
   node dist/cli.js init --provider codex
   ```

2. Replace the generated project-owned files with custom content:

   ```text
   .sdd/project-overview.md
   .sdd/conventions.md
   ```

3. Run:

   ```text
   node dist/cli.js init --force --provider codex
   ```

Observed:

Both files are overwritten back to template content. The explicit repro showed:

```text
project-overview first line: # Project Overview
conventions first line: # Project Conventions
```

Expected:

The docs say `update` and `init --force` never touch `.sdd/project-overview.md`,
`.sdd/conventions.md`, or `.sdd/domains/`. `init --force` should preserve
project-owned context while refreshing workflow/provider files.

Why it matters:

This can erase the user's hard-won project context. For this product, that is a
trust-breaking bug, not a cosmetic inconsistency.

Likely cause:

`initCommand` passes `force` to every `CORE_FILES` entry:

```text
src/commands/init.ts:80-82
```

`CORE_FILES` includes:

```text
.sdd/project-overview.md
.sdd/conventions.md
```

from:

```text
src/providers.ts:18-19
```

Applied fix:

`initCommand` preserves the two project-owned core files during `--force` while
still refreshing workflow/spec template/provider files.

### F-002 - `status` masks malformed verify reports

Severity: **Medium**  
Area: `src/commands/status.ts`  
Status: **Fixed on 2026-05-23**

Fix evidence:

- `src/commands/status.ts` now returns `verify report malformed` when
  `verify-report.md` exists without exact `Result: PASS` or `Result: FAIL`.
- `smoke/f002-status-verify-result.sh` covers PASS, FAIL, missing result, and
  invalid result.
- Validation passed:
  - `npm run build`
  - `bash smoke/f002-status-verify-result.sh`

Historical repro:

Reproduction:

1. Create a spec with approved plan and all tasks complete.
2. Add `verify-report.md` without a line matching:

   ```text
   Result: PASS
   ```

   or:

   ```text
   Result: FAIL
   ```

3. Run:

   ```text
   node dist/cli.js status
   ```

Observed:

```text
malformed-verify review pending · 1/1 tasks
```

Expected:

`status` should not treat a malformed verification report as review-ready.
Recommended phase wording:

```text
verify malformed
```

or:

```text
verify result missing
```

Why it matters:

The protocol explicitly says `/verify` reports must include a `Result:` line
with exactly `PASS` or `FAIL`, and `status` relies on that line. If the line is
missing, silently advancing to `review pending` weakens the approval gate.

Applied fix:

`inferPhase` now distinguishes three states:

- `PASS` -> `review pending`
- `FAIL` -> `verify failed`
- missing/invalid result -> `verify report malformed`

### F-003 - Markdown workflow inference is brittle

Severity: **Medium**  
Area: `src/commands/status.ts`  
Status: **Mitigated on 2026-05-23**

Mitigation evidence:

- `test/status.test.js` covers the full active phase matrix, including draft,
  awaiting approval, in-progress, awaiting verify, verify failed, verify
  malformed, review pending, pending CRs, unresolved gaps, and ignored `_done`
  specs.
- `src/commands/status.ts` now has smaller parsing helpers for plan approval,
  task progress, verify result, and verify phase.
- `test/provider-parity.test.js` verifies entry/rule files mention every
  protocol command.
- Validation passed: `npm test`.

Examples:

- Plan approval is inferred from a specific checked Markdown line or a
  non-comment `Plan approved:` value.
- Task counts are inferred from a regex matching `Task` or `T\d+`.
- Gap resolution status is inferred from free text around `Resolution:`.
- Verify status depends on an exact `Result:` line.

This is not automatically wrong. Markdown is the product. But regex inference
over human-edited Markdown needs a fixture suite because tiny wording changes
can alter behavior.

Residual risk:

The parser still intentionally operates on human-edited Markdown. That is the
product model, but future wording changes should update the fixtures first.

### F-004 - Automated regression suite was missing for CLI behavior

Severity: **Medium / known gap**  
Area: project verification strategy  
Status: **Fixed on 2026-05-23**

Fix evidence:

- `package.json` now has `test: npm run build && node --test`.
- `test/provider-parity.test.js` protects provider command fan-out.
- `test/status.test.js` protects status phase inference.
- `test/cli-smoke.test.js` protects `init`, `update`, `doctor`, `commands`,
  `add domain`, and no-install error behavior.
- `test/package.test.js` protects `npm pack --dry-run` contents.
- Biome is now the formal formatting/lint/import-order gate via
  `npm run check`.
- `.github/workflows/ci.yml` runs `npm ci`, `npm run check`, `npm test`, and
  `npm pack --dry-run` across Node 18, 20, and 22.
- `RELEASE_CHECKLIST.md` documents the manual release gate.
- Validation passed: `npm run check` and `npm test` with 17 passing tests.

Covered:

- `init --provider codex`
- `init --all --existing`
- `doctor` healthy and missing-core cases
- `update --check` clean and drift cases
- `status` phase matrix, including malformed verify
- provider parity against `COMMAND_NAMES`
- package contents via `npm pack --dry-run`

## Non-Findings

These areas were checked and behaved correctly:

- `doctor` exits non-zero for missing install and missing core files.
- `doctor` warns, but does not fail, for partial provider installs.
- `update --check` exits non-zero only when installed workflow files are stale.
- `update` does not create uninstalled provider files.
- `init --force` recreates missing provider/core files.
- `init --provider` and `--all` are mutually exclusive.
- Invalid providers and invalid domains return non-zero.
- Core/domain ownership boundary is respected: `update` leaves
  `project-overview.md`, `conventions.md`, and domains untouched.
- Provider command parity is complete.
- Package contents include built output and templates.

## Remaining Risks

After F-001 through F-004, the remaining meaningful issue is design-level:

- `status` still infers workflow phase from human-edited Markdown. This is now
  fixture-tested, but it remains an area to treat carefully when changing
  templates or status wording.

## Recommended Backlog

1. Consider a future internal parser module for `status` if the workflow grows.
2. Keep this report as the canonical manual audit baseline until automated tests
   replace it.
3. When the next protocol command is added, require the provider parity test
   to pass before release.

## Final Verdict

The workflow is solid enough to keep using. The confirmed functional bugs from
the audit have focused fixes, and the main regression surface is now covered by
`npm run check`, `npm test`, and CI. The next quality step is continued
discipline around Markdown status parsing as the protocol evolves.
