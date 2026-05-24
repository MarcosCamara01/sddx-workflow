const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'dist', 'cli.js');

function makeTempDir(prefix = 'sddguard-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runCli(args, options = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    output: `${result.stdout}${result.stderr}`,
  };
}

function expectCliOk(args, options = {}) {
  const result = runCli(args, options);
  assert.equal(result.status, 0, result.output);
  return result;
}

function expectCliFail(args, options = {}) {
  const result = runCli(args, options);
  assert.notEqual(result.status, 0, result.output);
  return result;
}

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function readFile(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function mkdir(root, relativePath) {
  fs.mkdirSync(path.join(root, relativePath), { recursive: true });
}

module.exports = {
  assert,
  exists,
  expectCliFail,
  expectCliOk,
  makeTempDir,
  mkdir,
  path,
  readFile,
  repoRoot,
  runCli,
  writeFile,
};
