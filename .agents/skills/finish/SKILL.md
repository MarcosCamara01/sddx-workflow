---
name: finish
description: Stage changed files and produce a conventional commit message for approval. Use after completing any unit of work — bug fix, refactor, or feature tasks.
---

Execute the /finish command defined in .sdd/workflow.md.

Run git status and git diff. Stage all relevant files. Determine the commit type.
Draft a conventional commit message following the format in workflow.md.
Stop and present the staged files and commit message for approval before committing.
