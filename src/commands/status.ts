import fs from 'fs';
import path from 'path';

function isBootstrapped(cwd: string): boolean {
  const file = path.join(cwd, '.sdd/project-overview.md');
  if (!fs.existsSync(file)) return false;
  const withoutComments = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const lines = withoutComments.split('\n');
  return lines.some(line => {
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
}

function stripComments(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, '');
}

function isPlanApproved(specDir: string): boolean {
  const planFile = path.join(specDir, '2-plan.md');
  const tasksFile = path.join(specDir, '3-tasks.md');

  if (fs.existsSync(planFile)) {
    const plan = stripComments(fs.readFileSync(planFile, 'utf8'));
    if (/^- \[x\]\s+\*\*Approved\*\*/im.test(plan)) return true;
  }

  if (fs.existsSync(tasksFile)) {
    const tasks = fs.readFileSync(tasksFile, 'utf8');
    const match = tasks.match(/^Plan approved:\s*(.+)$/im);
    return Boolean(match && match[1].trim() && !match[1].includes('<!--'));
  }

  return false;
}

function countPendingCrs(specDir: string): number {
  const file = path.join(specDir, 'amendments.md');
  if (!fs.existsSync(file)) return 0;
  const content = stripComments(fs.readFileSync(file, 'utf8'));
  return (content.match(/\*\*Status:\*\*\s*Pending approval/gi) ?? []).length;
}

function countUnresolvedGaps(specDir: string): number {
  const file = path.join(specDir, 'impl-gaps.md');
  if (!fs.existsSync(file)) return 0;
  const content = stripComments(fs.readFileSync(file, 'utf8'));
  const entries = content.split(/^##\s+GAP-\d+/gim).slice(1);
  return entries.filter(entry => {
    const resolution = entry.match(/\*\*Resolution:\*\*\s*(.*)/i);
    return !resolution || resolution[1].trim().length === 0 || /filled|pending|tbd/i.test(resolution[1]);
  }).length;
}

function inferPhase(specDir: string, planApproved: boolean, tasksDone: number, tasksTotal: number): string {
  const requirementsFile = path.join(specDir, '1-requirements.md');
  const planFile = path.join(specDir, '2-plan.md');
  const tasksFile = path.join(specDir, '3-tasks.md');
  const verifyFile = path.join(specDir, 'verify-report.md');

  if (!fs.existsSync(requirementsFile)) return 'missing requirements';
  if (!fs.existsSync(planFile)) return 'drafting requirements';
  if (!planApproved) return 'awaiting plan approval';
  if (!fs.existsSync(tasksFile)) return 'awaiting tasks';
  if (tasksTotal === 0) return 'tasks not planned';
  if (tasksDone < tasksTotal) return 'in /spec-tasks';
  if (!fs.existsSync(verifyFile)) return 'awaiting /verify';

  const verify = fs.readFileSync(verifyFile, 'utf8');
  const result = verify.match(/^Result:\s*(PASS|FAIL)\s*$/m)?.[1];
  return result === 'FAIL' ? 'verify failed' : 'review pending';
}

function readSpec(specDir: string): SpecInfo {
  const name = path.basename(specDir);
  const tasksFile = path.join(specDir, '3-tasks.md');
  const planApproved = isPlanApproved(specDir);
  const pendingCrs = countPendingCrs(specDir);
  const unresolvedGaps = countUnresolvedGaps(specDir);

  if (!fs.existsSync(tasksFile)) {
    return {
      name,
      phase: inferPhase(specDir, planApproved, 0, 0),
      planApproved,
      tasksDone: 0,
      tasksTotal: 0,
      pendingCrs,
      unresolvedGaps,
    };
  }

  const content = fs.readFileSync(tasksFile, 'utf8');
  const taskMatches = [...content.matchAll(/^- \[(x| )\]\s+\*\*(?:T\d+|Task\b)/gim)];
  const tasksDone = taskMatches.filter(match => match[1].toLowerCase() === 'x').length;
  const tasksTotal = taskMatches.length;

  return {
    name,
    phase: inferPhase(specDir, planApproved, tasksDone, tasksTotal),
    planApproved,
    tasksDone,
    tasksTotal,
    pendingCrs,
    unresolvedGaps,
  };
}

export function statusCommand(): void {
  const cwd = process.cwd();

  if (!fs.existsSync(path.join(cwd, '.sdd'))) {
    console.error('\n  error    No SDD installation found in this directory.');
    console.error('  next     Run `npx sddx-workflow init` or cd into a project that already has .sdd/.\n');
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

  const specs = fs.readdirSync(specsDir)
    .filter(name => name !== '_template' && name !== '_done')
    .filter(name => fs.statSync(path.join(specsDir, name)).isDirectory())
    .map(name => readSpec(path.join(specsDir, name)));

  console.log(`  open specs   ${specs.length}`);

  for (const spec of specs) {
    const label = spec.name.padEnd(14);
    const progress = spec.tasksTotal > 0 ? `${spec.tasksDone}/${spec.tasksTotal} tasks` : 'no tasks';
    const outstanding = [
      spec.pendingCrs > 0 ? `${spec.pendingCrs} pending CR${spec.pendingCrs === 1 ? '' : 's'}` : '',
      spec.unresolvedGaps > 0 ? `${spec.unresolvedGaps} unresolved gap${spec.unresolvedGaps === 1 ? '' : 's'}` : '',
    ].filter(Boolean).join(' · ');
    const suffix = outstanding ? ` · ${outstanding}` : '';
    console.log(`    ${label} ${spec.phase} · ${progress}${suffix}`);
  }

  console.log('');
}
