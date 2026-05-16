Execute the /spec-tasks command defined in .sdd/workflow.md.

First action: invoke `sddx-workflow snapshot $ARGUMENTS` to capture the approved spec state. If the CLI is unavailable, warn the user that no snapshot was taken and proceed — do not abort, but make the missing safety net explicit.

Then read the approved specs/$ARGUMENTS/2-plan.md and execute tasks one at a time. Write the test first (red), implement until green, run the full suite, then move to the next task.

If a task is blocked by ambiguity, contradiction, or technical impossibility, STOP and run /impl-gap — never improvise. If the gap requires changing the spec, escalate to /spec-amend.
