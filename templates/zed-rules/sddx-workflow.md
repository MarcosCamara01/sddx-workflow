This project uses the SDD Protocol. Before starting any task, read:

1. `.sdd/workflow.md` — all commands, ceremony levels, permissions, stop points, anti-patterns
2. `.sdd/project-overview.md` — what this app is, its non-goals, and domains
3. `.sdd/conventions.md` — project-specific conventions and patterns
4. `.sdd/config.json` — ceremony level

## Workflows

### Project setup
| Workflow | Purpose |
|---|---|
| `bootstrap` | Populate project context — interview or `--scan` |
| `scan` | Discovery-only pass over an existing codebase |
| `conventions-sync` | Refresh conventions, preserving manual sections |

### Exploration
| Workflow | Purpose |
|---|---|
| `ask` | Research only — no code changes |
| `research` | Non-binding research artifact |
| `assume` | List assumptions and stop for confirmation |

### Feature flow
| Workflow | Purpose |
|---|---|
| `spec-new` | Scaffold a spec folder |
| `spec-clarify` | Pre-plan clarification |
| `spec-plan` | Generate technical plan — stop for approval |
| `spec-tasks` | Execute plan one task at a time, TDD-first |
| `impl-gap` | Stop and report blocking ambiguity |
| `spec-amend` | Documented Change Request |
| `spec-analyze` | Cross-consistency analysis |
| `verify` | Strict mechanical audit |
| `review` | Lighter human-touch final pass |
| `finish` | Stage files and generate commit message |

### Multi-spec
| Workflow | Purpose |
|---|---|
| `spec-status` | Show all active specs and phase |
| `spec-conflicts` | Detect file conflicts between specs |

### Other
| Workflow | Purpose |
|---|---|
| `bugfix` | Reproduce → diagnose → fix → validate |
| `refactor` | Restructure without behavior change |

Invoke by name (e.g., "run bootstrap", "start spec-new for auth-refresh").
Standard feature flow: `spec-new` → `spec-clarify` (Enterprise) → `spec-plan` → `spec-tasks` → `verify` → `review` → `finish`.
Full definitions are in `.sdd/workflow.md`.
