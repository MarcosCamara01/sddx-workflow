const { test } = require('node:test');
const { assert, expectCliFail, expectCliOk, makeTempDir, mkdir, writeFile } = require('./helpers');

function createSddProject() {
  const root = makeTempDir('sddguard-gate-');
  mkdir(root, '.sdd');
  mkdir(root, 'specs/_template');
  writeFile(root, '.sdd/workflow.md', '# SDD Protocol\n');
  writeFile(root, '.sdd/conventions.md', '# Conventions\n');
  writeFile(root, '.sdd/project-overview.md', '# Project\n\nReal context.\n');
  return root;
}

function writeSpec(root, name, files) {
  const base = `specs/${name}`;
  mkdir(root, base);
  for (const [file, content] of Object.entries(files)) {
    writeFile(root, `${base}/${file}`, content);
  }
}

function requirements(extra = '', ready = true) {
  return `# Requirements\n\n## Status\n\n- [x] Draft\n- [x] Reviewed\n- [${ready ? 'x' : ' '}] Ready for /spec-plan — all open questions resolved, all scenarios written\n\n## Goals\n\n- **G1**: Do it.\n${extra}`;
}

function plan(approved = false) {
  return `# Technical Plan\n\n## Status\n\n- [x] Draft\n- [${approved ? 'x' : ' '}] **Approved**\n`;
}

function tasks(items) {
  return `# Tasks\n\nPlan approved: 2026-05-23\n\n${items.join('\n')}\n`;
}

function verify(result) {
  return result === null
    ? '# Verify Report\n\nNo result line here.\n'
    : `# Verify Report

Result: ${result}

## Checks

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | All tasks in \`3-tasks.md\` marked complete | ${result} | evidence |
| 2 | Every goal (G1, G2…) has a referencing task and an observable artifact | ${result} | evidence |
| 3 | Every acceptance scenario has a corresponding passing test | ${result} | evidence |
| 4 | Full test suite passes | ${result} | evidence |
| 5 | No files modified outside "Components Affected" in \`2-plan.md\` | ${result} | evidence |
| 6 | No unresolved \`/impl-gap\` entries | ${result} | evidence |
| 7 | No CRs in "Pending approval" status | ${result} | evidence |

## Detail

### Tasks

Task evidence.

### Goals

Goal evidence.

### Scenarios

Scenario evidence.

### Scope

Scope evidence.

### Gaps and CRs

No blockers.

## Conclusion

Conclusion evidence.
`;
}

function review(result) {
  return `# Review Report

Result: ${result}
`;
}

test('gate fails outside an SDD installation', () => {
  const root = makeTempDir('sddguard-gate-missing-');
  const result = expectCliFail(['gate', 'spec-plan', 'demo'], { cwd: root });

  assert.match(result.output, /No SDD installation found/);
});

test('gate spec-plan fails on unchecked blocking clarifications', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(
      '\n## Clarifications\n\n- [ ] ⛔ BLOCKING — Which flow wins?\n',
    ),
  });

  const result = expectCliFail(['gate', 'spec-plan', 'demo'], { cwd: root });

  assert.match(result.output, /blocking clarification/);
  assert.match(result.output, /Run `\/spec-clarify demo`/);
});

test('gate fails when the feature spec is missing', () => {
  const root = createSddProject();
  const result = expectCliFail(['gate', 'spec-plan', 'missing-feature'], { cwd: root });

  assert.match(result.output, /feature spec is missing/);
  assert.match(result.output, /\/spec-new missing-feature/);
});

test('gate spec-plan requires requirements to be marked ready', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements('', false),
  });

  const result = expectCliFail(['gate', 'spec-plan', 'demo'], { cwd: root });

  assert.match(result.output, /requirements are not ready/);
  assert.match(result.output, /Ready for \/spec-plan/);
});

test('gate spec-plan passes when requirements are ready and unblocked', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
  });

  const result = expectCliOk(['gate', 'spec-plan', 'demo'], { cwd: root });

  assert.match(result.stdout, /gate passed/);
});

test('gate spec-tasks requires a plan file', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
  });

  const result = expectCliFail(['gate', 'spec-tasks', 'demo'], { cwd: root });

  assert.match(result.output, /plan is missing/);
  assert.match(result.output, /\/spec-plan demo/);
});

test('gate spec-tasks requires an approved plan and clear blockers', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(false),
    'amendments.md': '# Amendments\n\n## CR-001\n\n- **Status:** Pending approval\n',
    'impl-gaps.md': '# Gaps\n\n## GAP-001\n\n- **Resolution:** pending\n',
  });

  const result = expectCliFail(['gate', 'spec-tasks', 'demo'], { cwd: root });

  assert.match(result.output, /plan is not approved/);
  assert.match(result.output, /pending CR/);
  assert.match(result.output, /unresolved gap/);
});

test('gate verify requires complete tasks before running verify', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.', '- [ ] **T2** Pending.']),
  });

  const result = expectCliFail(['gate', 'verify', 'demo'], { cwd: root });

  assert.match(result.output, /tasks are incomplete/);
});

test('gate finish requires a passing verify report', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify('FAIL'),
    'review-report.md': review('PASS'),
  });

  const result = expectCliFail(['gate', 'finish', 'demo'], { cwd: root });

  assert.match(result.output, /verify report is failing/);
});

test('gate finish requires a verify report', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
  });

  const result = expectCliFail(['gate', 'finish', 'demo'], { cwd: root });

  assert.match(result.output, /verify report is missing/);
});

test('gate finish requires a well formed verify report', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify(null),
    'review-report.md': review('PASS'),
  });

  const result = expectCliFail(['gate', 'finish', 'demo'], { cwd: root });

  assert.match(result.output, /verify report is malformed/);
});

test('gate finish requires a complete verify report, not just a PASS result line', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': '# Verify Report\n\nResult: PASS\n',
    'review-report.md': review('PASS'),
  });

  const result = expectCliFail(['gate', 'finish', 'demo'], { cwd: root });

  assert.match(result.output, /verify report is incomplete/);
});

test('gate finish rejects an unfilled verify report template', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': `# Verify Report

Result: PASS

## Checks

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | All tasks in \`3-tasks.md\` marked complete | | |
| 2 | Every goal has a referencing task and an observable artifact | | |
| 3 | Every acceptance scenario has a corresponding passing test | | |
| 4 | Full test suite passes | | |
| 5 | No files modified outside Components Affected | | |
| 6 | No unresolved gaps | | |
| 7 | No pending CRs | | |

## Detail

### Tasks
### Goals
### Scenarios
### Scope
### Gaps and CRs

## Conclusion
`,
    'review-report.md': review('PASS'),
  });

  const result = expectCliFail(['gate', 'finish', 'demo'], { cwd: root });

  assert.match(result.output, /verify report is incomplete/);
});

test('gate finish requires a review report', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify('PASS'),
  });

  const result = expectCliFail(['gate', 'finish', 'demo'], { cwd: root });

  assert.match(result.output, /review report is missing/);
});

test('gate finish requires a review report without escalation', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify('PASS'),
    'review-report.md': review('ESCALATED'),
  });

  const result = expectCliFail(['gate', 'finish', 'demo'], { cwd: root });

  assert.match(result.output, /review report is escalated/);
});

test('gate finish passes when the feature is ready to finish', () => {
  const root = createSddProject();
  writeSpec(root, 'demo', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify('PASS'),
    'review-report.md': review('FOLLOW_UPS'),
  });

  const result = expectCliOk(['gate', 'finish', 'demo'], { cwd: root });

  assert.match(result.stdout, /gate passed/);
});
