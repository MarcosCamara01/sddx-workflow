#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
tmp=$(mktemp -d /tmp/sddguard-f001-smoke-XXXXXX)

cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT

cd "$tmp"

node "$repo_root/dist/cli.js" init --provider codex >/dev/null

printf 'CUSTOM PROJECT OVERVIEW F-001\n' > .sdd/project-overview.md
printf 'CUSTOM CONVENTIONS F-001\n' > .sdd/conventions.md
printf 'CUSTOM WORKFLOW F-001\n' > .sdd/workflow.md
printf 'CUSTOM BUGFIX SKILL F-001\n' > .agents/skills/bugfix/SKILL.md

node "$repo_root/dist/cli.js" init --force --provider codex >/dev/null

grep -q 'CUSTOM PROJECT OVERVIEW F-001' .sdd/project-overview.md
grep -q 'CUSTOM CONVENTIONS F-001' .sdd/conventions.md

if grep -q 'CUSTOM WORKFLOW F-001' .sdd/workflow.md; then
  echo 'workflow was not refreshed'
  exit 1
fi

if grep -q 'CUSTOM BUGFIX SKILL F-001' .agents/skills/bugfix/SKILL.md; then
  echo 'provider file was not refreshed'
  exit 1
fi

echo 'F-001 smoke passed'
