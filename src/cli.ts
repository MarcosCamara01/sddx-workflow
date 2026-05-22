import { Command } from 'commander';
import { initCommand } from './commands/init';
import { addCommand } from './commands/add';
import { updateCommand } from './commands/update';
import { statusCommand } from './commands/status';
import { doctorCommand } from './commands/doctor';
import { commandsCommand } from './commands/commands';
import { createRequire } from 'module';

const pkg = createRequire(__filename)('../package.json') as { version: string };

const program = new Command();

program
  .name('sddx-workflow')
  .description('Spec-Driven Development CLI')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize SDD protocol in the current project')
  .option('--force', 'Overwrite files that already exist')
  .option('--existing', 'Brownfield mode: prints next-steps that start with /scan and /bootstrap --scan')
  .option('--provider <ids>', 'Comma-separated providers to install (claude-code,cursor,windsurf,copilot,codex,gemini,zed)')
  .option('--all', 'Install all provider integrations without prompting')
  .addHelpText('after', '\nNon-TTY default:\n  When stdout is not a TTY (CI, piped scripts), init defaults to installing\n  every provider - equivalent to --all. Pass --provider to limit.\n')
  .action(initCommand);

program
  .command('add <type> <name>')
  .description('Add an SDD component to an existing installation')
  .addHelpText('after', '\nExamples:\n  $ sddx-workflow add domain auth\n  $ sddx-workflow add domain payments')
  .action(addCommand);

program
  .command('update')
  .description('Update protocol files to the latest version')
  .option('--dry-run', 'Show which installed workflow files would change')
  .option('--check', 'Exit non-zero when installed workflow files are outdated')
  .action(updateCommand);

program
  .command('status')
  .description('Show bootstrap status and open specs progress')
  .action(statusCommand);

program
  .command('doctor')
  .description('Check SDD installation health and provider files')
  .action(doctorCommand);

program
  .command('commands')
  .description('List the agent commands defined by the SDD protocol')
  .action(commandsCommand);

program.parseAsync();
