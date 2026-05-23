const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { assert, repoRoot } = require('./helpers');

function commandNames() {
  const source = fs.readFileSync(path.join(repoRoot, 'src/commands/command-names.ts'), 'utf8');
  return [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
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
      assert.equal(
        fs.existsSync(path.join(providerDir, config.fileFor(name))),
        true,
        `${provider} is missing ${name}`,
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
    'templates/cursor-rules/sddx-workflow.mdc',
    'templates/windsurf-rules/sddx-workflow.md',
    'templates/zed-rules/sddx-workflow.md',
  ];

  for (const file of entryFiles) {
    const content = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    const missing = names.filter((name) => !content.includes(name));
    assert.deepEqual(missing, [], `${file} does not mention every command`);
  }
});
