#!/usr/bin/env bash
set -eu

CLI="${1:-$(pwd)/dist/cli.js}"
ROOT="$(mktemp -d /tmp/sddguard-f002-status-XXXXXX)"
trap 'rm -rf "$ROOT"' EXIT

make_fixture() {
  name="$1"
  verify="$2"
  dir="$ROOT/$name"

  mkdir -p "$dir/.sdd" "$dir/specs/$name"
  printf '# Project\n\nBootstrapped content.\n' > "$dir/.sdd/project-overview.md"
  printf '# Workflow\n' > "$dir/.sdd/workflow.md"
  printf '# Conventions\n' > "$dir/.sdd/conventions.md"
  printf '# Requirements\n\nSome requirement.\n' > "$dir/specs/$name/1-requirements.md"
  printf '# Plan\n\n- [x] **Approved** by human.\n' > "$dir/specs/$name/2-plan.md"
  printf '# Tasks\n\nPlan approved: 2026-05-23\n\n- [x] **T1** Do the work.\n- [x] **T2** Validate it.\n' > "$dir/specs/$name/3-tasks.md"
  printf '%s\n' "$verify" > "$dir/specs/$name/verify-report.md"
}

assert_phase() {
  name="$1"
  expected="$2"
  output="$(cd "$ROOT/$name" && node "$CLI" status)"

  if ! printf '%s\n' "$output" | grep -q "$name[[:space:]]*$expected · 2/2 tasks"; then
    printf 'Expected %s to show phase "%s".\nOutput:\n%s\n' "$name" "$expected" "$output" >&2
    exit 1
  fi
}

make_fixture pass-case '# Verify Report

Result: PASS'
make_fixture fail-case '# Verify Report

Result: FAIL'
make_fixture malformed-case '# Verify Report

Everything was checked, but this file has no result header.'
make_fixture invalid-case '# Verify Report

Result: UNKNOWN'

assert_phase pass-case 'review pending'
assert_phase fail-case 'verify failed'
assert_phase malformed-case 'verify report malformed'
assert_phase invalid-case 'verify report malformed'

printf 'F-002 status verify-result smoke passed\n'
