# Release Checklist

Use this before publishing `sddguard`.

## Required

- [ ] `npm ci`
- [ ] `npm run check`
- [ ] `npm test`
- [ ] `npm pack --dry-run`
- [ ] Scratch install:
  ```bash
  tmp=$(mktemp -d)
  cd "$tmp"
  node /path/to/sddguard/dist/cli.js init --all --existing
  node /path/to/sddguard/dist/cli.js doctor
  node /path/to/sddguard/dist/cli.js status
  node /path/to/sddguard/dist/cli.js update --check
  ```
- [ ] Confirm provider parity test passed.
- [ ] Confirm package contents include `dist/` and `templates/`, not `src/`,
      `test/`, `smoke/`, `.sdd/`, or local agent files.

## Publish Flow

Use this order for GitHub and npm releases:

```bash
git status --short --branch
npm test
npm pack --dry-run
npm view sddguard version

git switch main
git merge --ff-only dev

npm version minor

npm test
npm pack --dry-run

git push origin main

npm publish --auth-type=web
npm view sddguard version

git push origin vX.Y.Z
```

Do not push the release tag until `npm publish` has completed successfully and
`npm view sddguard version` shows the new version.

Keep `.claude/settings.local.json` out of the repository.

## If Protocol Templates Changed

- [ ] Every command-aware provider has the changed command:
  - Claude Code
  - OpenAI Codex
  - GitHub Copilot
  - Gemini CLI
  - Windsurf
- [ ] Rule/entry files still mention every command:
  - `templates/workflow.md`
  - `templates/AGENTS.md`
  - `templates/CLAUDE.md`
  - `templates/gemini.md`
  - `templates/copilot-instructions.md`
  - Cursor/Windsurf/Zed rule files
- [ ] README and `.sdd/` project docs agree with the shipped behavior.

## Do Not Publish If

- `npm test` fails.
- `npm run check` reports lint, formatting, or import-order issues.
- `npm pack --dry-run` omits templates or includes local project files.
- `init --force` overwrites `.sdd/project-overview.md` or `.sdd/conventions.md`.
- `status` treats a malformed `verify-report.md` as review-ready.
