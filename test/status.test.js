const { test } = require('node:test');
const {
  assert,
  expectCliFail,
  expectCliOk,
  makeTempDir,
  mkdir,
  runCli,
  writeFile,
} = require('./helpers');

function createSddProject(options = {}) {
  const root = makeTempDir('sddguard-status-');
  mkdir(root, '.sdd');
  mkdir(root, 'specs/_template');
  writeFile(root, '.sdd/workflow.md', '# SDD Protocol\n');
  writeFile(root, '.sdd/conventions.md', '# Conventions\n');
  writeFile(
    root,
    '.sdd/project-overview.md',
    options.bootstrapped
      ? '# Project\n\nReal project context.\n'
      : '# Project\n\n<!-- pending -->\n',
  );
  return root;
}

function writeSpec(root, name, files) {
  const base = `specs/${name}`;
  mkdir(root, base);
  for (const [file, content] of Object.entries(files)) {
    writeFile(root, `${base}/${file}`, content);
  }
}

function requirements() {
  return '# Requirements\n\n## Goals\n\n- **G1**: Do it.\n';
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
    : `# Verify Report\n\nResult: ${result}\n`;
}

function assertStatusLine(output, specName, expected) {
  assert.match(output, new RegExp(`${specName}\\s+${expected}`));
}

test('status fails outside an SDD installation', () => {
  const root = makeTempDir('sddguard-status-missing-');
  const result = expectCliFail(['status'], { cwd: root });

  assert.match(result.output, /No SDD installation found/);
});

test('status reports bootstrap and every active spec phase', () => {
  const root = createSddProject({ bootstrapped: true });

  writeSpec(root, 'draft-only', {
    '1-requirements.md': requirements(),
  });
  writeSpec(root, 'awaiting-plan', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(false),
  });
  writeSpec(root, 'awaiting-tasks', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
  });
  writeSpec(root, 'tasks-not-planned', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': '# Tasks\n\nPlan approved: 2026-05-23\n',
  });
  writeSpec(root, 'in-progress', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.', '- [ ] **T2** Pending.']),
  });
  writeSpec(root, 'awaiting-verify', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
  });
  writeSpec(root, 'verify-failed', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify('FAIL'),
  });
  writeSpec(root, 'verify-malformed', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify(null),
  });
  writeSpec(root, 'review-pending', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify('PASS'),
  });
  writeSpec(root, 'pending-cr-gap', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [ ] **T1** Pending.']),
    'amendments.md': '# Amendments\n\n## CR-001\n\n- **Status:** Pending approval\n',
    'impl-gaps.md': '# Gaps\n\n## GAP-001\n\n- **Resolution:** pending\n',
  });
  writeSpec(root, '_done/ignored-done', {
    '1-requirements.md': requirements(),
  });

  const result = expectCliOk(['status'], { cwd: root });

  assert.match(result.stdout, /bootstrap\s+done/);
  assert.match(result.stdout, /open specs\s+10/);
  assertStatusLine(result.stdout, 'draft-only', 'drafting requirements · no tasks');
  assertStatusLine(result.stdout, 'awaiting-plan', 'awaiting plan approval · no tasks');
  assertStatusLine(result.stdout, 'awaiting-tasks', 'awaiting tasks · no tasks');
  assertStatusLine(result.stdout, 'tasks-not-planned', 'tasks not planned · no tasks');
  assertStatusLine(result.stdout, 'in-progress', 'in /spec-tasks · 1/2 tasks');
  assertStatusLine(result.stdout, 'awaiting-verify', 'awaiting /verify · 1/1 tasks');
  assertStatusLine(result.stdout, 'verify-failed', 'verify failed · 1/1 tasks');
  assertStatusLine(result.stdout, 'verify-malformed', 'verify report malformed · 1/1 tasks');
  assertStatusLine(result.stdout, 'review-pending', 'review pending · 1/1 tasks');
  assertStatusLine(
    result.stdout,
    'pending-cr-gap',
    'in /spec-tasks · 0/1 tasks · 1 pending CR · 1 unresolved gap',
  );
  assert.doesNotMatch(result.stdout, /ignored-done/);
});

test('status reports pending bootstrap when project overview only contains comments', () => {
  const root = createSddProject({ bootstrapped: false });
  const result = expectCliOk(['status'], { cwd: root });

  assert.match(result.stdout, /bootstrap\s+pending/);
});

test('status treats invalid verify result as malformed', () => {
  const root = createSddProject({ bootstrapped: true });
  writeSpec(root, 'invalid-result', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify('UNKNOWN'),
  });

  const result = runCli(['status'], { cwd: root });

  assert.equal(result.status, 0, result.output);
  assertStatusLine(result.stdout, 'invalid-result', 'verify report malformed · 1/1 tasks');
});

test('status --strict fails on blocking spec states while default status remains dashboard-only', () => {
  const root = createSddProject({ bootstrapped: true });
  writeSpec(root, 'clean', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify('PASS'),
  });
  writeSpec(root, 'failed-verify', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify('FAIL'),
  });
  writeSpec(root, 'malformed-verify', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify(null),
  });
  writeSpec(root, 'open-cr-gap', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify('PASS'),
    'amendments.md': '# Amendments\n\n## CR-001\n\n- **Status:** Pending approval\n',
    'impl-gaps.md': '# Gaps\n\n## GAP-001\n\n- **Resolution:** pending\n',
  });
  writeSpec(root, 'premature-verify', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [ ] **T1** Pending.']),
    'verify-report.md': verify('PASS'),
  });

  assert.equal(runCli(['status'], { cwd: root }).status, 0);

  const result = expectCliFail(['status', '--strict'], { cwd: root });

  assert.match(result.stdout, /bootstrap\s+done/);
  assert.match(result.stderr, /failed-verify: verify-report.md Result is FAIL/);
  assert.match(result.stderr, /malformed-verify: verify-report.md is malformed/);
  assert.match(result.stderr, /open-cr-gap: 1 pending CR/);
  assert.match(result.stderr, /open-cr-gap: 1 unresolved gap/);
  assert.match(
    result.stderr,
    /premature-verify: verify-report.md exists before tasks are complete/,
  );
  assert.doesNotMatch(result.stderr, /clean:/);
});

test('status --strict passes when active specs have no blocking states', () => {
  const root = createSddProject({ bootstrapped: true });
  writeSpec(root, 'clean', {
    '1-requirements.md': requirements(),
    '2-plan.md': plan(true),
    '3-tasks.md': tasks(['- [x] **T1** Done.']),
    'verify-report.md': verify('PASS'),
  });

  const result = expectCliOk(['status', '--strict'], { cwd: root });

  assert.match(result.stdout, /strict\s+passed/);
});
