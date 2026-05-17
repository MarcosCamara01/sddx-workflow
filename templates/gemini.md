# Gemini — Project Context

This project uses the SDD Protocol. Read these files before starting any task:

1. **[.sdd/workflow.md](.sdd/workflow.md)** — commands, ceremony levels, permissions, stop points, anti-patterns
2. **[.sdd/project-overview.md](.sdd/project-overview.md)** — what this app is, its non-goals, domains, and definition of done
3. **[.sdd/conventions.md](.sdd/conventions.md)** — project-specific conventions and patterns
4. **[.sdd/config.json](.sdd/config.json)** — ceremony level

## Quick Reference

### Project setup
| Intent | Workflow |
|---|---|
| Initialize project context (new) | `bootstrap` |
| Initialize project context (existing codebase) | `bootstrap --scan` |
| Discovery-only scan of an existing codebase | `scan` |
| Refresh conventions from current project state | `conventions-sync` |

### Exploration
| Intent | Workflow |
|---|---|
| Research / ask without changing anything | `ask` |
| Non-binding research artifact for a topic | `research` |
| Surface and validate assumptions | `assume` |

### Feature flow
| Intent | Workflow |
|---|---|
| Scaffold a spec folder | `spec-new` |
| Clarify a draft before planning | `spec-clarify` |
| Generate technical plan (stops for approval) | `spec-plan` |
| Execute approved plan one task at a time | `spec-tasks` |
| Stop and report an implementation gap | `impl-gap` |
| Document a Change Request for spec edits | `spec-amend` |
| Cross-consistency analysis (goals / plan / tasks) | `spec-analyze` |
| Strict mechanical audit | `verify` |
| Lighter human-touch final pass | `review` |
| Stage and commit | `finish` |

### Multi-spec
| Intent | Workflow |
|---|---|
| Show state of all active specs | `spec-status` |
| Detect file-level conflicts between specs | `spec-conflicts` |

### Other
| Intent | Workflow |
|---|---|
| Fix a confirmed bug | `bugfix` → `finish` |
| Restructure without behavior change | `refactor` → `finish` |

Invoke any workflow by name (e.g., "run bootstrap", "start spec-new for auth-refresh").
Standard feature flow: `spec-new` → `spec-clarify` (Enterprise) → `spec-plan` → `spec-tasks` → `verify` → `review` → `finish`.
Full definitions are in `.sdd/workflow.md`.

## Active Specs

<!-- List specs currently in progress — completed specs live in specs/_done/ and are not active context.
- specs/auth-refresh/ — in spec-tasks (task 3 of 5)
- specs/payments-v2/ — plan pending approval
-->

## Domain Files

Relevant domain context lives in `.sdd/domains/`. Read the relevant domain file before working in that area.

<!-- List domains present in this project, e.g.:
- [.sdd/domains/auth.md](.sdd/domains/auth.md)
- [.sdd/domains/payments.md](.sdd/domains/payments.md)
-->
