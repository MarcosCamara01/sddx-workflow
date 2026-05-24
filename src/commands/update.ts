import fs from 'node:fs';
import path from 'node:path';
import { USER_OWNED_PROVIDER_FILES, WORKFLOW_FILES } from '../providers';
import { copyTemplate, displayPath, TEMPLATES_DIR } from '../utils';

interface UpdateOptions {
  dryRun?: boolean;
  check?: boolean;
}

function fileChanged(src: string, dest: string): boolean {
  const template = fs.readFileSync(path.join(TEMPLATES_DIR, src), 'utf8');
  const current = fs.readFileSync(dest, 'utf8');
  return template !== current;
}

export function updateCommand(options: UpdateOptions = {}): void {
  const cwd = process.cwd();

  if (!fs.existsSync(path.join(cwd, '.sdd'))) {
    console.error('\n  error    No SDD installation found in this directory.');
    console.error(
      '  next     Run `npx sddguard init` or cd into a project that already has .sdd/.\n',
    );
    process.exit(1);
  }

  console.log('');
  console.log(
    `  SDD Workflow — ${options.check ? 'checking' : options.dryRun ? 'previewing' : 'updating'} workflow files`,
  );
  console.log('  (project context and provider entrypoints/rules are yours — preserved)');
  console.log(
    '  (only files that already exist are updated — run `init --force` to add new commands)',
  );
  console.log('');

  let updated = 0;
  let unchanged = 0;
  let preserved = 0;
  let missing = 0;

  for (const file of WORKFLOW_FILES) {
    const dest = path.join(cwd, file.dest);

    // Only update files that already exist — never silently create new command files
    // on old installs, as users may not have opted into the new commands.
    if (!fs.existsSync(dest)) {
      missing++;
      continue;
    }

    if (USER_OWNED_PROVIDER_FILES.has(file.dest)) {
      preserved++;
      continue;
    }

    if (!fileChanged(file.src, dest)) {
      unchanged++;
      continue;
    }

    if (options.check || options.dryRun) {
      console.log(`  update   ${displayPath(dest)}`);
      updated++;
      continue;
    }

    copyTemplate(file.src, dest, true);
    updated++;
  }

  console.log('');
  if (options.check) {
    console.log(
      `  ${updated === 0 ? 'ok' : 'outdated'}      ${updated} outdated, ${unchanged} current, ${preserved} preserved, ${missing} not installed`,
    );
    if (updated > 0) process.exit(1);
    console.log('');
    return;
  }

  if (options.dryRun) {
    console.log(
      `  Preview. ${updated} file${updated !== 1 ? 's' : ''} would be updated, ${unchanged} current, ${preserved} preserved, ${missing} not installed.\n`,
    );
    return;
  }

  console.log(
    `  Done. ${updated} file${updated !== 1 ? 's' : ''} updated, ${unchanged} current, ${preserved} preserved, ${missing} not installed.\n`,
  );
}
