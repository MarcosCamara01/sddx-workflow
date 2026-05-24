const { test } = require('node:test');
const {
  assert,
  expectCliFail,
  expectCliOk,
  makeTempDir,
  readFile,
  writeFile,
} = require('./helpers');

function createMiniProject() {
  const root = makeTempDir('sddguard-e2e-');

  writeFile(
    root,
    'package.json',
    JSON.stringify(
      {
        name: 'audit-ledger-mini-app',
        version: '0.0.0',
        type: 'module',
        scripts: {
          test: 'node --test test/*.test.js',
        },
        devDependencies: {},
      },
      null,
      2,
    ),
  );
  writeFile(
    root,
    'README.md',
    '# Audit Ledger Mini App\n\nTiny ledger library used as an SDD workflow test fixture.\n',
  );
  writeFile(
    root,
    'src/ledger.ts',
    `export function debit(balance: number, amount: number): number {
  return balance - amount;
}
`,
  );
  writeFile(
    root,
    'test/ledger.test.js',
    `import assert from 'node:assert/strict';
import { test } from 'node:test';

test('placeholder ledger flow', () => {
  assert.equal(10 - 3, 7);
});
`,
  );

  return root;
}

function writeWorkflowArtifacts(root) {
  writeFile(root, '.sdd/project-overview.md', '# Project\n\nMini ledger app for audit coverage.\n');
  writeFile(
    root,
    '.sdd/conventions.md',
    '# Conventions\n\nUse small TypeScript modules under src/.\n',
  );
  writeFile(
    root,
    'specs/negative-debit-validation/1-requirements.md',
    `# Negative Debit Validation Requirements

## Goals

- **G1**: Reject debit amounts below zero.

## Clarifications

- [x] ⛔ BLOCKING — Should zero be accepted? → Yes, zero is a no-op.
- [x] ⚠️ NON-BLOCKING — Which error type should be used? → Use RangeError by default.
`,
  );
  writeFile(
    root,
    'specs/negative-debit-validation/2-plan.md',
    `# Negative Debit Validation Plan

## Status

- [x] Draft
- [x] **Approved**

## Components Affected

- src/ledger.ts
- test/ledger.test.js
`,
  );
  writeFile(
    root,
    'specs/negative-debit-validation/3-tasks.md',
    `# Tasks

Plan approved: 2026-05-23

- [x] **T1** Add failing debit validation tests.
- [x] **T2** Reject negative debit amounts.
`,
  );
  writeFile(
    root,
    'specs/negative-debit-validation/impl-gaps.md',
    `# Implementation Gaps

## GAP-001

- **Problem:** Existing API does not document overdraft semantics.
- **Resolution:** pending
`,
  );
  writeFile(
    root,
    'specs/negative-debit-validation/amendments.md',
    `# Amendments

## CR-001

- **Status:** Pending approval
- **Request:** Also reject debit amounts above the current balance.
`,
  );
  writeFile(
    root,
    'specs/negative-debit-validation/verify-report.md',
    `# Verify Report

Result: PASS

## Evidence

- npm test passed in the mini app before this report was recorded.
`,
  );
}

test('realistic mini project workflow artifacts drive status, doctor, and update checks', () => {
  const root = createMiniProject();

  expectCliOk(['init', '--provider', 'codex', '--existing'], { cwd: root });
  writeWorkflowArtifacts(root);

  const status = expectCliOk(['status'], { cwd: root });
  assert.match(status.stdout, /bootstrap\s+done/);
  assert.match(status.stdout, /open specs\s+1/);
  assert.match(
    status.stdout,
    /negative-debit-validation\s+review pending · 2\/2 tasks · 1 pending CR · 1 unresolved gap/,
  );

  const strict = expectCliFail(['status', '--strict'], { cwd: root });
  assert.match(strict.stderr, /negative-debit-validation: 1 pending CR/);
  assert.match(strict.stderr, /negative-debit-validation: 1 unresolved gap/);

  const doctor = expectCliOk(['doctor'], { cwd: root });
  assert.match(doctor.stdout, /installation looks healthy/);

  const clean = expectCliOk(['update', '--check'], { cwd: root });
  assert.match(clean.stdout, /ok\s+0 outdated/);

  writeFile(root, '.sdd/workflow.md', '# Drifted Workflow\n');
  const drifted = expectCliFail(['update', '--check'], { cwd: root });
  assert.match(drifted.stdout, /outdated\s+1 outdated/);
  assert.match(drifted.stdout, /update\s+\.sdd\/workflow\.md/);

  expectCliOk(['update'], { cwd: root });
  const repaired = expectCliOk(['update', '--check'], { cwd: root });
  assert.match(repaired.stdout, /ok\s+0 outdated/);

  assert.equal(
    readFile(root, '.sdd/project-overview.md'),
    '# Project\n\nMini ledger app for audit coverage.\n',
  );
  assert.equal(
    readFile(root, 'specs/negative-debit-validation/amendments.md'),
    `# Amendments

## CR-001

- **Status:** Pending approval
- **Request:** Also reject debit amounts above the current balance.
`,
  );
});
