---
description: Execute approved plan one task at a time, TDD-first
---

Execute the /spec-tasks command defined in .sdd/workflow.md.

The spec name is whatever you typed after the command (e.g. `/spec-tasks auth-refresh`).

Then read the approved specs/<spec>/2-plan.md and execute tasks one at a time. Write the test first (red), implement until green, run the full suite, then move to the next task.

If a task is blocked by ambiguity, contradiction, or technical impossibility, STOP and run /impl-gap — never improvise. If the gap requires changing the spec, escalate to /spec-amend.
