import { createRequire } from 'node:module';
import { Command } from 'commander';
import { addCommand } from './commands/add';
import { commandsCommand } from './commands/commands';
import { doctorCommand } from './commands/doctor';
import { gateCommand } from './commands/gate';
import { initCommand } from './commands/init';
import { statusCommand } from './commands/status';
import { updateCommand } from './commands/update';

const pkg = createRequire(__filename)('../package.json') as { version: string };

const program = new Command();

program.name('sddguard').description('Spec-Driven Development CLI').version(pkg.version);

program
  .command('init')
  .description('Initialize SDD protocol in the current project')
  .option('--force', 'Overwrite files that already exist')
  .option(
    '--existing',
    'Brownfield mode: prints next-steps that start with /scan and /bootstrap --scan',
  )
  .option(
    '--provider <ids>',
    'Comma-separated providers to install (claude-code,cursor,windsurf,copilot,codex,gemini,zed)',
  )
  .option('--all', 'Install all provider integrations without prompting')
  .addHelpText(
    'after',
    '\nNon-TTY default:\n  When stdout is not a TTY (CI, piped scripts), init defaults to installing\n  every provider - equivalent to --all. Pass --provider to limit.\n',
  )
  .action(initCommand);

program
  .command('add <type> <name>')
  .description('Add an SDD component to an existing installation')
  .addHelpText(
    'after',
    '\nExamples:\n  $ sddguard add domain auth\n  $ sddguard add domain payments',
  )
  .action(addCommand);

program
  .command('update')
  .description('Update protocol files to the latest version')
  .option('--dry-run', 'Show which installed workflow files would change')
  .option('--check', 'Exit non-zero when installed workflow files are outdated')
  .action(updateCommand);

program
  .command('gate <phase> <feature>')
  .description('Check whether an SDD workflow phase may proceed')
  .addHelpText(
    'after',
    '\nExamples:\n  $ sddguard gate spec-tasks auth-refresh\n  $ sddguard gate finish auth-refresh',
  )
  .action(gateCommand);

program
  .command('status')
  .description('Show bootstrap status and open specs progress')
  .option('--strict', 'Exit non-zero when active specs have blocking states')
  .action(statusCommand);

program
  .command('doctor')
  .description('Check SDD installation health and provider files')
  .action(doctorCommand);

program
  .command('commands')
  .description('List the agent commands defined by the SDD protocol')
  .option('--installed', 'Show installed command files by detected provider')
  .action(commandsCommand);

program.parseAsync();
