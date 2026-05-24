import fs from 'node:fs';
import path from 'node:path';
import {
  countPendingCrs,
  countUnresolvedGaps,
  hasApprovedPlanMarker,
  hasBlockingClarifications,
  hasRequirementsReadyMarker,
  hasSubstantiveVerifyReport,
  readIfExists,
  readReviewResult,
  readVerifyResult,
  taskProgress,
} from '../spec-state';

type GatePhase = 'spec-plan' | 'spec-tasks' | 'verify' | 'finish';

interface Blocker {
  message: string;
  next: string;
}

const PHASES = new Set<GatePhase>(['spec-plan', 'spec-tasks', 'verify', 'finish']);

function addCommonBlockers(specDir: string, feature: string, blockers: Blocker[]): void {
  const requirements = readIfExists(path.join(specDir, '1-requirements.md'));
  if (!requirements) {
    blockers.push({
      message: 'requirements are missing: specs/<feature>/1-requirements.md was not found',
      next: `Run \`/spec-new ${feature}\` or restore the requirements file.`,
    });
    return;
  }

  if (hasBlockingClarifications(requirements)) {
    blockers.push({
      message: 'there is at least one unchecked blocking clarification',
      next: `Run \`/spec-clarify ${feature}\` and record the answer before continuing.`,
    });
  }
}

function addRequirementsReadyBlockers(specDir: string, feature: string, blockers: Blocker[]): void {
  const requirements = readIfExists(path.join(specDir, '1-requirements.md'));
  if (!requirements) return;

  if (!hasRequirementsReadyMarker(requirements)) {
    blockers.push({
      message: 'requirements are not ready for /spec-plan',
      next: `Check \`- [x] Ready for /spec-plan\` in specs/${feature}/1-requirements.md after open questions and scenarios are complete.`,
    });
  }
}

function addPlanBlockers(specDir: string, feature: string, blockers: Blocker[]): void {
  const plan = readIfExists(path.join(specDir, '2-plan.md'));
  if (!plan) {
    blockers.push({
      message: 'plan is missing: specs/<feature>/2-plan.md was not found',
      next: `Run \`/spec-plan ${feature}\` after requirements are complete.`,
    });
    return;
  }

  if (!hasApprovedPlanMarker(plan)) {
    blockers.push({
      message: 'plan is not approved',
      next: `Get explicit human approval and check \`- [x] **Approved**\` in specs/${feature}/2-plan.md.`,
    });
  }
}

function addOpenChangeBlockers(specDir: string, feature: string, blockers: Blocker[]): void {
  const pendingCrs = countPendingCrs(specDir);
  if (pendingCrs > 0) {
    blockers.push({
      message: `${pendingCrs} pending CR${pendingCrs === 1 ? '' : 's'} found`,
      next: `Resolve specs/${feature}/amendments.md before continuing.`,
    });
  }

  const unresolvedGaps = countUnresolvedGaps(specDir);
  if (unresolvedGaps > 0) {
    blockers.push({
      message: `${unresolvedGaps} unresolved gap${unresolvedGaps === 1 ? '' : 's'} found`,
      next: `Resolve specs/${feature}/impl-gaps.md before continuing.`,
    });
  }
}

function addTaskBlockers(specDir: string, feature: string, blockers: Blocker[]): void {
  const content = readIfExists(path.join(specDir, '3-tasks.md'));
  if (!content) {
    blockers.push({
      message: 'tasks are missing: specs/<feature>/3-tasks.md was not found',
      next: `Create the task checklist from \`/spec-plan ${feature}\` before continuing.`,
    });
    return;
  }

  const tasks = taskProgress(content);
  if (tasks.total === 0) {
    blockers.push({
      message: 'tasks are not planned: no task checkboxes were found',
      next: `Add atomic tasks to specs/${feature}/3-tasks.md before continuing.`,
    });
  } else if (tasks.done < tasks.total) {
    blockers.push({
      message: `tasks are incomplete: ${tasks.done}/${tasks.total} complete`,
      next: `Finish \`/spec-tasks ${feature}\` before continuing.`,
    });
  }
}

function addVerifyBlockers(specDir: string, feature: string, blockers: Blocker[]): void {
  const content = readIfExists(path.join(specDir, 'verify-report.md'));
  if (!content) {
    blockers.push({
      message: 'verify report is missing: specs/<feature>/verify-report.md was not found',
      next: `Run \`/verify ${feature}\` before continuing.`,
    });
    return;
  }

  const result = readVerifyResult(content);
  if (result === 'MALFORMED') {
    blockers.push({
      message: 'verify report is malformed: missing exact `Result: PASS` or `Result: FAIL` line',
      next: `Regenerate specs/${feature}/verify-report.md with \`/verify ${feature}\`.`,
    });
  } else if (result === 'FAIL') {
    blockers.push({
      message: 'verify report is failing',
      next: `Resolve the failed checks in specs/${feature}/verify-report.md before continuing.`,
    });
  } else if (!hasSubstantiveVerifyReport(content)) {
    blockers.push({
      message:
        'verify report is incomplete: required checks, evidence, or detail sections are missing',
      next: `Regenerate specs/${feature}/verify-report.md with \`/verify ${feature}\`.`,
    });
  }
}

function addReviewBlockers(specDir: string, feature: string, blockers: Blocker[]): void {
  const content = readIfExists(path.join(specDir, 'review-report.md'));
  if (!content) {
    blockers.push({
      message: 'review report is missing: specs/<feature>/review-report.md was not found',
      next: `Run \`/review ${feature}\` before continuing.`,
    });
    return;
  }

  const result = readReviewResult(content);
  if (result === 'MALFORMED') {
    blockers.push({
      message:
        'review report is malformed: missing exact `Result: PASS`, `Result: FOLLOW_UPS`, or `Result: ESCALATED` line',
      next: `Regenerate specs/${feature}/review-report.md with \`/review ${feature}\`.`,
    });
  } else if (result === 'ESCALATED') {
    blockers.push({
      message: 'review report is escalated',
      next: `Resolve the escalation in specs/${feature}/review-report.md before continuing.`,
    });
  }
}

function printFailure(phase: GatePhase, feature: string, blockers: Blocker[]): void {
  console.error('');
  console.error(`  error    gate failed: ${phase} ${feature}`);
  for (const blocker of blockers) {
    console.error(`  blocker  ${blocker.message}`);
    console.error(`  next     ${blocker.next}`);
  }
  console.error('');
}

export function gateCommand(phase: string, feature: string): void {
  const cwd = process.cwd();

  if (!PHASES.has(phase as GatePhase)) {
    console.error('');
    console.error(`  error    Unknown gate phase: ${phase}`);
    console.error('  next     Use one of: spec-plan, spec-tasks, verify, finish.');
    console.error('');
    process.exit(1);
  }

  if (!fs.existsSync(path.join(cwd, '.sdd'))) {
    console.error('');
    console.error('  error    No SDD installation found in this directory.');
    console.error(
      '  next     Run `npx sddx-workflow init` or cd into a project that already has .sdd/.',
    );
    console.error('');
    process.exit(1);
  }

  const gatePhase = phase as GatePhase;
  const specDir = path.join(cwd, 'specs', feature);
  const blockers: Blocker[] = [];

  if (!fs.existsSync(specDir) || !fs.statSync(specDir).isDirectory()) {
    blockers.push({
      message: `feature spec is missing: specs/${feature}/ was not found`,
      next: `Run \`/spec-new ${feature}\` or pass the correct feature name.`,
    });
  } else {
    addCommonBlockers(specDir, feature, blockers);
    if (gatePhase === 'spec-plan') addRequirementsReadyBlockers(specDir, feature, blockers);
    if (gatePhase !== 'spec-plan') addPlanBlockers(specDir, feature, blockers);
    if (gatePhase !== 'spec-plan') addOpenChangeBlockers(specDir, feature, blockers);
    if (gatePhase === 'verify' || gatePhase === 'finish') {
      addTaskBlockers(specDir, feature, blockers);
    }
    if (gatePhase === 'finish') {
      addVerifyBlockers(specDir, feature, blockers);
      addReviewBlockers(specDir, feature, blockers);
    }
  }

  if (blockers.length > 0) {
    printFailure(gatePhase, feature, blockers);
    process.exit(1);
  }

  console.log('');
  console.log(`  ok       gate passed: ${gatePhase} ${feature}`);
  console.log('');
}
