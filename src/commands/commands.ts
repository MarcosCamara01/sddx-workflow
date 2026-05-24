import fs from 'node:fs';
import path from 'node:path';
import { COMMAND_PROVIDER_IDS, type InstallFile, PROVIDERS } from '../providers';
import { COMMAND_NAMES } from './command-names';

interface CommandsOptions {
  installed?: boolean;
}

function exists(cwd: string, relativePath: string): boolean {
  return fs.existsSync(path.join(cwd, relativePath));
}

function isCommandFile(file: InstallFile): boolean {
  return COMMAND_NAMES.some(
    (name) => file.src.includes(`/${name}.`) || file.src.includes(`/${name}/`),
  );
}

function showInstalledCommands(): void {
  const cwd = process.cwd();

  if (!exists(cwd, '.sdd')) {
    console.error('\n  error    No SDD installation found in this directory.');
    console.error(
      '  next     Run `npx sddguard init` or cd into a project that already has .sdd/.\n',
    );
    process.exit(1);
  }

  console.log('');
  console.log('  Installed agent commands');
  console.log('');

  let detectedProviders = 0;

  for (const id of COMMAND_PROVIDER_IDS) {
    const provider = PROVIDERS[id];
    if (!provider.files.some((file) => exists(cwd, file.dest))) {
      continue;
    }

    detectedProviders++;
    const commandFiles = provider.files.filter(isCommandFile);
    const installed = commandFiles.filter((file) => exists(cwd, file.dest));
    const missing = commandFiles.filter((file) => !exists(cwd, file.dest));

    console.log(`  ${provider.name}`);
    console.log(`  installed   ${installed.length}/${commandFiles.length}`);
    if (missing.length === 0) {
      console.log('  missing     none');
    } else {
      for (const file of missing) {
        console.log(`  missing     ${file.dest}`);
      }
    }
    console.log('');
  }

  if (detectedProviders === 0) {
    console.error('  error       No command-aware provider files detected.');
    console.error(
      '  next        Run `npx sddguard init --provider <id>` with claude-code, codex, copilot, gemini, or windsurf.\n',
    );
    process.exit(1);
  }
}

export function commandsCommand(options: CommandsOptions = {}): void {
  if (options.installed) {
    showInstalledCommands();
    return;
  }

  console.log('');
  console.log('  Agent commands');
  console.log('');
  for (const name of COMMAND_NAMES) {
    console.log(`  /${name}`);
  }
  console.log('');
}
