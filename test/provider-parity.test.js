const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { assert, repoRoot } = require('./helpers');

function commandNames() {
  const source = fs.readFileSync(path.join(repoRoot, 'src/commands/command-names.ts'), 'utf8');
  return [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function canonicalWorkflowInstruction(name) {
  return `Execute the /${name} command defined in .sdd/workflow.md.`;
}

test('every command-aware provider has exactly one file per command', () => {
  const names = commandNames();
  const providers = {
    'claude-commands': {
      dir: 'templates/claude-commands',
      fileFor: (name) => `${name}.md`,
      normalize: (file) => file.replace(/\.md$/, ''),
    },
    'codex-skills': {
      dir: 'templates/codex-skills',
      fileFor: (name) => path.join(name, 'SKILL.md'),
      normalize: (file) => file,
    },
    'copilot-prompts': {
      dir: 'templates/copilot-prompts',
      fileFor: (name) => `${name}.prompt.md`,
      normalize: (file) => file.replace(/\.prompt\.md$/, ''),
    },
    'gemini-commands': {
      dir: 'templates/gemini-commands',
      fileFor: (name) => `${name}.toml`,
      normalize: (file) => file.replace(/\.toml$/, ''),
    },
    'windsurf-workflows': {
      dir: 'templates/windsurf-workflows',
      fileFor: (name) => `${name}.md`,
      normalize: (file) => file.replace(/\.md$/, ''),
    },
  };

  for (const [provider, config] of Object.entries(providers)) {
    const providerDir = path.join(repoRoot, config.dir);
    const installed = fs.readdirSync(providerDir).map(config.normalize).sort();
    const expected = [...names].sort();

    assert.deepEqual(installed, expected, `${provider} command list drifted`);

    for (const name of names) {
      const file = path.join(providerDir, config.fileFor(name));

      assert.equal(fs.existsSync(file), true, `${provider} is missing ${name}`);

      const content = fs.readFileSync(file, 'utf8');
      assert.ok(
        content.includes(canonicalWorkflowInstruction(name)),
        `${provider} ${name} does not reference its canonical workflow instruction`,
      );
    }
  }
});

test('entry and rule files mention every protocol command', () => {
  const names = commandNames();
  const entryFiles = [
    'templates/workflow.md',
    'templates/AGENTS.md',
    'templates/CLAUDE.md',
    'templates/gemini.md',
    'templates/copilot-instructions.md',
    'templates/cursor-rules/sddguard.mdc',
    'templates/windsurf-rules/sddguard.md',
    'templates/zed-rules/sddguard.md',
  ];

  for (const file of entryFiles) {
    const content = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    const missing = names.filter((name) => !content.includes(name));
    assert.deepEqual(missing, [], `${file} does not mention every command`);
  }
});

test('plan template defines structured components for exact conflict checks', () => {
  const plan = fs.readFileSync(path.join(repoRoot, 'templates/specs/_template/2-plan.md'), 'utf8');
  const workflow = fs.readFileSync(path.join(repoRoot, 'templates/workflow.md'), 'utf8');

  assert.match(plan, /\| Exact path \| Role \| Notes \|/);
  assert.match(workflow, /`Exact path`, `Role`, and `Notes`/);
  assert.match(workflow, /Use only exact paths from the `Exact path` column/);
  assert.match(workflow, /Do not infer conflicts from prose/);
});
