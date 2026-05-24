import fs from 'node:fs';
import path from 'node:path';
import {
  countPendingCrs,
  countUnresolvedGaps,
  hasApprovedPlanMarker,
  hasPlanApprovedLine,
  readVerifyResult,
  taskProgress,
  type VerifyResult,
} from '../spec-state';

function isBootstrapped(cwd: string): boolean {
  const file = path.join(cwd, '.sdd/project-overview.md');
  if (!fs.existsSync(file)) return false;
  const withoutComments = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const lines = withoutComments.split('\n');
  return lines.some((line) => {
    const t = line.trim();
    return t.length > 0 && !t.startsWith('#') && !t.startsWith('>');
  });
}

interface SpecInfo {
  name: string;
  phase: string;
  planApproved: boolean;
  tasksDone: number;
  tasksTotal: number;
  pendingCrs: number;
  unresolvedGaps: number;
  verifyResult: VerifyResult | null;
}

interface StatusOptions {
  strict?: boolean;
}

function verifyPhase(result: VerifyResult): string {
  if (result === 'PASS') return 'review pending';
  if (result === 'FAIL') return 'verify failed';
  return 'verify report malformed';
}

function readSpecVerifyResult(specDir: string): VerifyResult | null {
  const verifyFile = path.join(specDir, 'verify-report.md');
  if (!fs.existsSync(verifyFile)) return null;
  return readVerifyResult(fs.readFileSync(verifyFile, 'utf8'));
}

function isPlanApproved(specDir: string): boolean {
  const planFile = path.join(specDir, '2-plan.md');
  const tasksFile = path.join(specDir, '3-tasks.md');

  if (fs.existsSync(planFile)) {
    if (hasApprovedPlanMarker(fs.readFileSync(planFile, 'utf8'))) return true;
  }

  if (fs.existsSync(tasksFile)) {
    return hasPlanApprovedLine(fs.readFileSync(tasksFile, 'utf8'));
  }

  return false;
}

function inferPhase(
  specDir: string,
  planApproved: boolean,
  tasksDone: number,
  tasksTotal: number,
  verifyResult: VerifyResult | null,
): string {
  const requirementsFile = path.join(specDir, '1-requirements.md');
  const planFile = path.join(specDir, '2-plan.md');
  const tasksFile = path.join(specDir, '3-tasks.md');

  if (!fs.existsSync(requirementsFile)) return 'missing requirements';
  if (!fs.existsSync(planFile)) return 'drafting requirements';
  if (!planApproved) return 'awaiting plan approval';
  if (!fs.existsSync(tasksFile)) return 'awaiting tasks';
  if (tasksTotal === 0) return 'tasks not planned';
  if (tasksDone < tasksTotal) return 'in /spec-tasks';
  if (!verifyResult) return 'awaiting /verify';
  return verifyPhase(verifyResult);
}

function readSpec(specDir: string): SpecInfo {
  const name = path.basename(specDir);
  const tasksFile = path.join(specDir, '3-tasks.md');
  const planApproved = isPlanApproved(specDir);
  const pendingCrs = countPendingCrs(specDir);
  const unresolvedGaps = countUnresolvedGaps(specDir);
  const verifyResult = readSpecVerifyResult(specDir);

  if (!fs.existsSync(tasksFile)) {
    return {
      name,
      phase: inferPhase(specDir, planApproved, 0, 0, verifyResult),
      planApproved,
      tasksDone: 0,
      tasksTotal: 0,
      pendingCrs,
      unresolvedGaps,
      verifyResult,
    };
  }

  const content = fs.readFileSync(tasksFile, 'utf8');
  const tasks = taskProgress(content);

  return {
    name,
    phase: inferPhase(specDir, planApproved, tasks.done, tasks.total, verifyResult),
    planApproved,
    tasksDone: tasks.done,
    tasksTotal: tasks.total,
    pendingCrs,
    unresolvedGaps,
    verifyResult,
  };
}

function strictIssues(spec: SpecInfo): string[] {
  const issues: string[] = [];

  if (spec.verifyResult === 'MALFORMED') {
    issues.push('verify-report.md is malformed');
  } else if (spec.verifyResult === 'FAIL') {
    issues.push('verify-report.md Result is FAIL');
  }

  if (spec.pendingCrs > 0) {
    issues.push(`${spec.pendingCrs} pending CR${spec.pendingCrs === 1 ? '' : 's'}`);
  }

  if (spec.unresolvedGaps > 0) {
    issues.push(`${spec.unresolvedGaps} unresolved gap${spec.unresolvedGaps === 1 ? '' : 's'}`);
  }

  if (spec.verifyResult && (spec.tasksTotal === 0 || spec.tasksDone < spec.tasksTotal)) {
    issues.push('verify-report.md exists before tasks are complete');
  }

  return issues;
}

export function statusCommand(options: StatusOptions = {}): void {
  const cwd = process.cwd();

  if (!fs.existsSync(path.join(cwd, '.sdd'))) {
    console.error('\n  error    No SDD installation found in this directory.');
    console.error(
      '  next     Run `npx sddguard init` or cd into a project that already has .sdd/.\n',
    );
    process.exit(1);
  }

  console.log('');

  const bootstrapped = isBootstrapped(cwd);
  console.log(`  bootstrap    ${bootstrapped ? 'done' : 'pending — run /bootstrap'}`);

  const specsDir = path.join(cwd, 'specs');
  if (!fs.existsSync(specsDir)) {
    console.log('  open specs   0');
    console.log('');
    return;
  }

  const specs = fs
    .readdirSync(specsDir)
    .filter((name) => name !== '_template' && name !== '_done')
    .filter((name) => fs.statSync(path.join(specsDir, name)).isDirectory())
    .map((name) => readSpec(path.join(specsDir, name)));

  console.log(`  open specs   ${specs.length}`);

  for (const spec of specs) {
    const label = spec.name.padEnd(14);
    const progress =
      spec.tasksTotal > 0 ? `${spec.tasksDone}/${spec.tasksTotal} tasks` : 'no tasks';
    const outstanding = [
      spec.pendingCrs > 0 ? `${spec.pendingCrs} pending CR${spec.pendingCrs === 1 ? '' : 's'}` : '',
      spec.unresolvedGaps > 0
        ? `${spec.unresolvedGaps} unresolved gap${spec.unresolvedGaps === 1 ? '' : 's'}`
        : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const suffix = outstanding ? ` · ${outstanding}` : '';
    console.log(`    ${label} ${spec.phase} · ${progress}${suffix}`);
  }

  if (options.strict) {
    const issues = specs.flatMap((spec) =>
      strictIssues(spec).map((issue) => `${spec.name}: ${issue}`),
    );

    if (issues.length > 0) {
      console.error('\n  strict    failed');
      for (const issue of issues) {
        console.error(`    ${issue}`);
      }
      console.error('');
      process.exit(1);
    }

    console.log('  strict      passed');
  }

  console.log('');
}
