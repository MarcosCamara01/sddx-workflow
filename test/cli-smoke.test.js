const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const {
  assert,
  exists,
  expectCliFail,
  expectCliOk,
  makeTempDir,
  readFile,
  writeFile,
} = require('./helpers');

test('init --provider codex installs only core and Codex provider files', () => {
  const root = makeTempDir('sddx-init-codex-');
  const result = expectCliOk(['init', '--provider', 'codex'], { cwd: root });

  assert.match(result.stdout, /Providers: OpenAI Codex/);
  assert.equal(exists(root, '.sdd/workflow.md'), true);
  assert.equal(exists(root, '.sdd/project-overview.md'), true);
  assert.equal(exists(root, '.sdd/conventions.md'), true);
  assert.equal(exists(root, 'AGENTS.md'), true);
  assert.equal(exists(root, '.agents/skills/bugfix/SKILL.md'), true);
  assert.equal(exists(root, 'CLAUDE.md'), false);
  assert.equal(exists(root, '.claude/commands/bugfix.md'), false);
});

test('init --all --existing installs every provider surface and brownfield next steps', () => {
  const root = makeTempDir('sddx-init-all-');
  const result = expectCliOk(['init', '--all', '--existing'], { cwd: root });

  assert.match(result.stdout, /initializing \(existing project mode\)/);
  assert.match(result.stdout, /Run \/scan to discover the codebase/);
  assert.equal(exists(root, 'CLAUDE.md'), true);
  assert.equal(exists(root, 'AGENTS.md'), true);
  assert.equal(exists(root, 'GEMINI.md'), true);
  assert.equal(exists(root, '.github/copilot-instructions.md'), true);
  assert.equal(exists(root, '.cursor/rules/sddx-workflow.mdc'), true);
  assert.equal(exists(root, '.windsurf/rules/sddx-workflow.md'), true);
  assert.equal(exists(root, '.rules'), true);
});

test('init rejects invalid provider options', () => {
  const invalidProviderRoot = makeTempDir('sddx-init-invalid-provider-');
  const invalidProvider = expectCliFail(['init', '--provider', 'nope'], {
    cwd: invalidProviderRoot,
  });

  assert.match(invalidProvider.output, /Unknown provider: nope/);
  assert.match(invalidProvider.output, /valid\s+claude-code/);

  const conflictRoot = makeTempDir('sddx-init-conflict-');
  const conflict = expectCliFail(['init', '--provider', 'codex', '--all'], { cwd: conflictRoot });

  assert.match(conflict.output, /Use either --provider or --all/);
});

test('init without force skips existing files, while force preserves project context and refreshes workflow/provider files', () => {
  const root = makeTempDir('sddx-init-force-');
  expectCliOk(['init', '--provider', 'codex'], { cwd: root });

  writeFile(root, '.sdd/project-overview.md', 'CUSTOM PROJECT CONTEXT\n');
  writeFile(root, '.sdd/conventions.md', 'CUSTOM CONVENTIONS\n');
  writeFile(root, '.sdd/workflow.md', 'CUSTOM WORKFLOW\n');
  writeFile(root, '.agents/skills/bugfix/SKILL.md', 'CUSTOM BUGFIX SKILL\n');

  const skipped = expectCliOk(['init', '--provider', 'codex'], { cwd: root });
  assert.match(skipped.stdout, /skip\s+\.sdd\/workflow\.md/);
  assert.equal(readFile(root, '.sdd/workflow.md'), 'CUSTOM WORKFLOW\n');
  assert.equal(readFile(root, '.agents/skills/bugfix/SKILL.md'), 'CUSTOM BUGFIX SKILL\n');

  const forced = expectCliOk(['init', '--force', '--provider', 'codex'], { cwd: root });
  assert.match(forced.stdout, /skip\s+\.sdd\/project-overview\.md/);
  assert.match(forced.stdout, /skip\s+\.sdd\/conventions\.md/);
  assert.equal(readFile(root, '.sdd/project-overview.md'), 'CUSTOM PROJECT CONTEXT\n');
  assert.equal(readFile(root, '.sdd/conventions.md'), 'CUSTOM CONVENTIONS\n');
  assert.notEqual(readFile(root, '.sdd/workflow.md'), 'CUSTOM WORKFLOW\n');
  assert.notEqual(readFile(root, '.agents/skills/bugfix/SKILL.md'), 'CUSTOM BUGFIX SKILL\n');
});

test('update detects drift, repairs existing files, and does not create uninstalled providers or touch project context', () => {
  const root = makeTempDir('sddx-update-');
  expectCliOk(['init', '--provider', 'codex'], { cwd: root });
  expectCliOk(['add', 'domain', 'auth'], { cwd: root });

  writeFile(root, '.sdd/project-overview.md', 'CUSTOM PROJECT CONTEXT\n');
  writeFile(root, '.sdd/conventions.md', 'CUSTOM CONVENTIONS\n');
  writeFile(root, '.sdd/domains/auth.md', 'CUSTOM AUTH DOMAIN\n');
  writeFile(root, '.sdd/workflow.md', 'DRIFTED WORKFLOW\n');

  const check = expectCliFail(['update', '--check'], { cwd: root });
  assert.match(check.stdout, /outdated\s+1 outdated/);
  assert.match(check.stdout, /update\s+\.sdd\/workflow\.md/);

  const update = expectCliOk(['update'], { cwd: root });
  assert.match(update.stdout, /Done\. 1 file updated/);

  const clean = expectCliOk(['update', '--check'], { cwd: root });
  assert.match(clean.stdout, /ok\s+0 outdated/);
  assert.equal(readFile(root, '.sdd/project-overview.md'), 'CUSTOM PROJECT CONTEXT\n');
  assert.equal(readFile(root, '.sdd/conventions.md'), 'CUSTOM CONVENTIONS\n');
  assert.equal(readFile(root, '.sdd/domains/auth.md'), 'CUSTOM AUTH DOMAIN\n');
  assert.equal(exists(root, '.claude/commands/bugfix.md'), false);
});

test('add domain creates built-in domains, skips existing files, and rejects invalid requests', () => {
  const root = makeTempDir('sddx-add-domain-');
  expectCliOk(['init', '--provider', 'codex'], { cwd: root });

  for (const domain of ['auth', 'payments', 'storage', 'email']) {
    const added = expectCliOk(['add', 'domain', domain], { cwd: root });
    assert.match(added.stdout, new RegExp(`create\\s+\\.sdd/domains/${domain}\\.md`));
    assert.equal(exists(root, `.sdd/domains/${domain}.md`), true);
  }

  writeFile(root, '.sdd/domains/auth.md', 'CUSTOM AUTH DOMAIN\n');
  const skipped = expectCliOk(['add', 'domain', 'auth'], { cwd: root });
  assert.match(skipped.stdout, /skip\s+\.sdd\/domains\/auth\.md/);
  assert.equal(readFile(root, '.sdd/domains/auth.md'), 'CUSTOM AUTH DOMAIN\n');

  const invalidDomain = expectCliFail(['add', 'domain', 'analytics'], { cwd: root });
  assert.match(invalidDomain.output, /Unknown domain "analytics"/);
  assert.match(invalidDomain.output, /Built-in templates: auth, payments, storage, email/);

  const invalidType = expectCliFail(['add', 'flow', 'auth'], { cwd: root });
  assert.match(invalidType.output, /Unknown type "flow"\. Available: domain/);
});

test('doctor reports healthy installs, missing installs, missing core files, and partial providers', () => {
  const missingRoot = makeTempDir('sddx-doctor-missing-');
  const missing = expectCliFail(['doctor'], { cwd: missingRoot });
  assert.match(missing.output, /No \.sdd\/ directory found/);

  const healthyRoot = makeTempDir('sddx-doctor-healthy-');
  expectCliOk(['init', '--provider', 'codex'], { cwd: healthyRoot });
  const healthy = expectCliOk(['doctor'], { cwd: healthyRoot });
  assert.match(healthy.stdout, /installation looks healthy/);

  fs.rmSync(path.join(healthyRoot, 'specs/_template/2-plan.md'));
  const missingCore = expectCliFail(['doctor'], { cwd: healthyRoot });
  assert.match(missingCore.stdout, /core files\s+1 missing/);
  assert.match(missingCore.stdout, /Missing core file: specs\/_template\/2-plan\.md/);

  const partialRoot = makeTempDir('sddx-doctor-partial-');
  expectCliOk(['init', '--provider', 'codex'], { cwd: partialRoot });
  fs.rmSync(path.join(partialRoot, '.agents/skills/verify/SKILL.md'));
  const partial = expectCliOk(['doctor'], { cwd: partialRoot });
  assert.match(partial.stdout, /OpenAI Codex appears partially installed/);
});

test('commands lists the static protocol command catalog', () => {
  const result = expectCliOk(['commands']);

  assert.match(result.stdout, /Agent commands/);
  assert.match(result.stdout, /\/bootstrap/);
  assert.match(result.stdout, /\/spec-analyze/);
});

test('update, status, and add fail clearly outside an SDD installation', () => {
  const root = makeTempDir('sddx-no-install-');

  assert.match(
    expectCliFail(['update', '--check'], { cwd: root }).output,
    /No SDD installation found/,
  );
  assert.match(expectCliFail(['status'], { cwd: root }).output, /No SDD installation found/);
  assert.match(expectCliFail(['add', 'domain', 'auth'], { cwd: root }).output, /\.sdd\/ not found/);
});
