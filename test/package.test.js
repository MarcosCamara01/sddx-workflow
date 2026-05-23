const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { assert, repoRoot } = require('./helpers');

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

test('published package contains only the runtime CLI and templates', () => {
  const result = spawnSync(npmCommand(), ['pack', '--dry-run', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);

  const [pack] = JSON.parse(result.stdout);
  const files = pack.files.map((file) => file.path).sort();

  for (const required of [
    'README.md',
    'package.json',
    'dist/cli.js',
    'templates/workflow.md',
    'templates/AGENTS.md',
    'templates/CLAUDE.md',
    'templates/specs/_template/1-requirements.md',
    'templates/specs/_template/2-plan.md',
    'templates/specs/_template/3-tasks.md',
    'templates/specs/_template/verify-report.md',
    'templates/codex-skills/bugfix/SKILL.md',
    'templates/claude-commands/bugfix.md',
    'templates/copilot-prompts/bugfix.prompt.md',
    'templates/gemini-commands/bugfix.toml',
    'templates/windsurf-workflows/bugfix.md',
  ]) {
    assert.equal(files.includes(required), true, `${required} missing from package`);
  }

  for (const excludedPrefix of ['src/', 'test/', 'smoke/', '.sdd/', '.agents/']) {
    assert.equal(
      files.some((file) => file.startsWith(excludedPrefix)),
      false,
      `${excludedPrefix} should not be published`,
    );
  }
});
