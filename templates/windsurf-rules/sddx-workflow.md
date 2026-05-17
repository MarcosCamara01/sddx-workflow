---
trigger: always_on
---

This project uses the SDD Protocol. Before starting any task, read:

1. `.sdd/workflow.md` — all commands, ceremony levels, permissions, stop points, anti-patterns
2. `.sdd/project-overview.md` — what this app is, its non-goals, and domains
3. `.sdd/conventions.md` — project-specific conventions and patterns
4. `.sdd/config.json` — ceremony level

## Available commands

### Project setup
| Command | Purpose |
|---|---|
| `/bootstrap` | Populate project context — interview or `--scan` |
| `/scan` | Discovery-only pass over an existing codebase |
| `/conventions-sync` | Refresh conventions, preserving manual sections |

### Exploration
| Command | Purpose |
|---|---|
| `/ask` | Research only — no code changes |
| `/research` | Non-binding research artifact |
| `/assume` | List assumptions and stop for confirmation |

### Feature flow
| Command | Purpose |
|---|---|
| `/spec-new` | Scaffold a spec folder |
| `/spec-clarify` | Pre-plan clarification |
| `/spec-plan` | Generate technical plan — stop for approval |
| `/spec-tasks` | Execute plan one task at a time, TDD-first |
| `/impl-gap` | Stop and report blocking ambiguity |
| `/spec-amend` | Documented Change Request |
| `/spec-analyze` | Cross-consistency analysis |
| `/verify` | Strict mechanical audit |
| `/review` | Lighter human-touch final pass |
| `/finish` | Stage files and generate commit message |

### Multi-spec
| Command | Purpose |
|---|---|
| `/spec-status` | Show all active specs and phase |
| `/spec-conflicts` | Detect file conflicts between specs |

### Other
| Command | Purpose |
|---|---|
| `/bugfix` | Reproduce → diagnose → fix → validate |
| `/refactor` | Restructure without behavior change |

Standard feature flow: `/spec-new` → `/spec-clarify` (Enterprise) → `/spec-plan` → `/spec-tasks` → `/verify` → `/review` → `/finish`.

Full definitions for each command are in `.sdd/workflow.md`.
