import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_PROVIDER_IDS,
  COMMAND_PROVIDER_IDS,
  CORE_FILES,
  PROVIDERS,
  type ProviderId,
  parseProviderList,
  USER_OWNED_CORE_FILES,
  USER_OWNED_PROVIDER_FILES,
} from '../providers';
import { copyTemplate, ensureDir } from '../utils';

interface InitOptions {
  force?: boolean;
  existing?: boolean;
  provider?: string;
  all?: boolean;
}

async function loadCheckbox(): Promise<typeof import('@inquirer/prompts').checkbox> {
  const prompts = await import('@inquirer/prompts');
  return prompts.checkbox;
}

async function selectProviders(options: InitOptions): Promise<ProviderId[]> {
  if (options.provider && options.all) {
    console.error('\n  error    Use either --provider or --all, not both.\n');
    process.exit(1);
  }

  if (options.provider) {
    try {
      return parseProviderList(options.provider);
    } catch (error) {
      console.error(`\n  error    ${(error as Error).message}`);
      console.error(`  valid    ${ALL_PROVIDER_IDS.join(', ')}\n`);
      process.exit(1);
    }
  }

  if (options.all) {
    return ALL_PROVIDER_IDS;
  }

  if (!process.stdout.isTTY) {
    return ALL_PROVIDER_IDS;
  }

  const checkbox = await loadCheckbox();
  const selected = await checkbox({
    message: 'Select the AI providers to install:',
    choices: ALL_PROVIDER_IDS.map((id) => ({
      name: PROVIDERS[id].name,
      value: id,
      checked: true,
    })),
    required: true,
  });

  return selected as ProviderId[];
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(', ') : 'none';
}

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const { force, existing } = options;

  console.log('');
  console.log(`  SDD Workflow — initializing${existing ? ' (existing project mode)' : ''}`);
  console.log('');

  const selectedProviders = await selectProviders(options);

  console.log('');

  ensureDir(path.join(cwd, '.sdd/domains'));
  ensureDir(path.join(cwd, 'specs/_template'));

  for (const id of selectedProviders) {
    for (const dir of PROVIDERS[id].dirs) {
      ensureDir(path.join(cwd, dir));
    }
  }

  const claudeExisted = fs.existsSync(path.join(cwd, 'CLAUDE.md'));
  const geminiExisted = fs.existsSync(path.join(cwd, 'GEMINI.md'));
  const agentsExisted = fs.existsSync(path.join(cwd, 'AGENTS.md'));

  for (const file of CORE_FILES) {
    const shouldForce = force && !USER_OWNED_CORE_FILES.has(file.dest);
    copyTemplate(file.src, path.join(cwd, file.dest), shouldForce);
  }

  for (const id of selectedProviders) {
    for (const file of PROVIDERS[id].files) {
      const shouldForce = force && !USER_OWNED_PROVIDER_FILES.has(file.dest);
      copyTemplate(file.src, path.join(cwd, file.dest), shouldForce);
    }
  }

  const providerNames = selectedProviders.map((id) => PROVIDERS[id].name);
  const commandProviders = selectedProviders.filter((id) => COMMAND_PROVIDER_IDS.includes(id));
  const rulesOnly = selectedProviders.filter((id) => !COMMAND_PROVIDER_IDS.includes(id));

  console.log('');
  console.log('  SDD Workflow initialized');
  console.log('');
  console.log(`  Providers: ${formatList(providerNames)}`);
  console.log(
    `  Core:      .sdd/workflow.md, .sdd/project-overview.md, .sdd/conventions.md, specs/_template/`,
  );
  if (commandProviders.length > 0) {
    const names = commandProviders.map((id) => PROVIDERS[id].name);
    console.log(`  Commands:  ${formatList(names)}`);
  }
  if (rulesOnly.length > 0) {
    const names = rulesOnly.map((id) => PROVIDERS[id].name);
    console.log(`  Rules:     ${formatList(names)}`);
  }
  console.log('');
  console.log('  Next steps:');
  console.log('');
  if (existing) {
    console.log(
      '  1. Run /scan to discover the codebase (no .sdd/ writes — produces scan-report.md)',
    );
    console.log(
      '     then /bootstrap --scan to populate .sdd/project-overview.md and .sdd/conventions.md',
    );
  } else {
    console.log('  1. Run /bootstrap to populate project context (new project)');
    console.log(
      '     or /bootstrap --scan to let the agent analyze the codebase (existing project)',
    );
  }

  const entryMessages: string[] = [];
  if (selectedProviders.includes('claude-code')) {
    entryMessages.push(
      claudeExisted
        ? 'CLAUDE.md already exists — add a reference to .sdd/ files manually'
        : 'CLAUDE.md was created — Claude Code will read it automatically',
    );
  }
  if (selectedProviders.includes('gemini')) {
    entryMessages.push(
      geminiExisted
        ? 'GEMINI.md already exists — add a reference to .sdd/ files manually'
        : 'GEMINI.md was created — Gemini CLI will read it automatically',
    );
  }
  if (selectedProviders.includes('codex')) {
    entryMessages.push(
      agentsExisted
        ? 'AGENTS.md already exists — add a reference to .sdd/ files manually'
        : 'AGENTS.md was created — Codex will read it automatically',
    );
  }

  let nextStep = 2;

  if (entryMessages.length > 0) {
    console.log(`  ${nextStep}. ${entryMessages[0]}`);
    for (const message of entryMessages.slice(1)) {
      console.log(`     ${message}`);
    }
    nextStep++;
  }

  if (commandProviders.length > 0) {
    const names = commandProviders.map((id) => PROVIDERS[id].name).join(', ');
    console.log(`  ${nextStep}. Slash commands ready in: ${names}. Type / to see them.`);
    nextStep++;
  }
  if (rulesOnly.length > 0) {
    const names = rulesOnly.map((id) => PROVIDERS[id].name).join(', ');
    console.log(
      `  ${nextStep}. Context rules installed for: ${names}. The agent reads workflow.md on every task.`,
    );
  }
  console.log('');
}
