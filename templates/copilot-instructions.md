# GitHub Copilot Instructions

This project uses the SDD Protocol. Before starting any task, read:

1. `.sdd/workflow.md` — commands, ceremony levels, permissions, stop points, anti-patterns
2. `.sdd/project-overview.md` — what this app is, its non-goals, and domains
3. `.sdd/conventions.md` — project-specific conventions and patterns
4. `.sdd/config.json` — ceremony level

## Available commands

Use these slash commands in Copilot Chat (type `/` to see them):

### Project setup
| Command | Purpose |
|---|---|
| `/bootstrap` | Populate project context — interview or `--scan` |
| `/scan` | Discovery-only pass — writes `scan-report.md`, no `.sdd/` |
| `/conventions-sync` | Refresh `.sdd/conventions.md`, preserving manual sections |

### Exploration
| Command | Purpose |
|---|---|
| `/ask` | Research only — no code changes |
| `/research` | Non-binding research artifact for a topic |
| `/assume` | List assumptions and stop for confirmation |

### Feature flow
| Command | Purpose |
|---|---|
| `/spec-new` | Scaffold a spec folder |
| `/spec-clarify` | Pre-plan clarification — blocking vs. non-blocking questions |
| `/spec-plan` | Generate technical plan — stop for approval |
| `/spec-tasks` | Execute plan one task at a time, TDD-first |
| `/impl-gap` | Stop and report a blocking ambiguity |
| `/spec-amend` | Documented Change Request for post-approval edits |
| `/spec-analyze` | Cross-consistency analysis — writes `analysis.md` |
| `/verify` | Strict mechanical audit — read-only |
| `/review` | Lighter human-touch final pass |
| `/finish` | Stage files and generate commit message |

### Multi-spec
| Command | Purpose |
|---|---|
| `/spec-status` | Show all active specs and their phase |
| `/spec-conflicts` | Detect file-level conflicts between specs |

### Other
| Command | Purpose |
|---|---|
| `/bugfix` | Reproduce → diagnose → fix → validate |
| `/refactor` | Restructure without behavior change |

Standard feature flow: `/spec-new` → `/spec-clarify` (Enterprise) → `/spec-plan` → `/spec-tasks` → `/verify` → `/review` → `/finish`.

## Execution principles

1. Surface assumptions before acting — never pick an interpretation silently; if a simpler approach exists, say so and push back
2. Minimum code — only what was asked; no speculative flexibility, no error handling for impossible scenarios; ask "would a senior engineer say this is overcomplicated?"
3. Surgical changes — touch only what the task requires; match existing style; remove only orphans *your* changes created, not pre-existing dead code; every changed line must trace to the request
4. Verify before moving on — transform vague tasks into verifiable goals ("Fix bug" → "Write failing test, then make it pass"); define "done" before starting
5. Use the right channel for changes — never edit approved spec files silently; `/spec-amend` for spec changes, `/impl-gap` for blocked tasks

Full definitions for each command are in `.sdd/workflow.md`.
