Execute the /impl-gap command defined in .sdd/workflow.md.

A task is blocked by ambiguity, contradiction, or technical impossibility. STOP execution. Append a GAP entry to specs/$ARGUMENTS/impl-gaps.md with the current task, problem, impact, proposed resolution, and action required. Do not improvise — wait for human direction.

If the gap requires changing the spec:
- Team / Enterprise: escalate to /spec-amend (formal CR required before any spec edit).
- Solo mode ("amendments": false in .sdd/config.json): present the proposed spec change directly to the user, wait for explicit approval, then apply it and note the Resolution in the gap entry. No formal CR needed, but the change must still be user-approved.

Feature: $ARGUMENTS
