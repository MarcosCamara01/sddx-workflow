---
name: review
description: Lighter human-touch final pass after /verify reports green. Qualitative reading — clarity, naming, simplicity, leaky abstractions, comments that lie. Notes minor follow-ups; mechanical checks live in /verify.
---

Execute the /review command defined in .sdd/workflow.md.

Read the implementation qualitatively. Surface unclear naming, leaky abstractions, copy-paste smell, and comments that lie. Note minor follow-ups; do not enforce mechanical checks (that is /verify's job). If a structural issue is found, escalate to /spec-amend.
