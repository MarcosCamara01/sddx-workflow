import path from 'path';
import fs from 'fs';
import { checkbox, select } from '@inquirer/prompts';
import { ensureDir, copyTemplate } from '../utils';
import { COMMAND_NAMES } from './command-names';

interface InitOptions {
  force?: boolean;
  existing?: boolean;
}

const CORE_FILES: Array<{ src: string; dest: string }> = [
  { src: 'workflow.md', dest: '.sdd/workflow.md' },
  { src: 'project-overview.md', dest: '.sdd/project-overview.md' },
  { src: 'conventions/base.md', dest: '.sdd/conventions.md' },
  { src: 'CLAUDE.md', dest: 'CLAUDE.md' },
  { src: 'specs/_template/1-requirements.md', dest: 'specs/_template/1-requirements.md' },
  { src: 'specs/_template/2-plan.md', dest: 'specs/_template/2-plan.md' },
  { src: 'specs/_template/3-tasks.md', dest: 'specs/_template/3-tasks.md' },
  { src: 'specs/_template/amendments.md', dest: 'specs/_template/amendments.md' },
  { src: 'specs/_template/impl-gaps.md', dest: 'specs/_template/impl-gaps.md' },
  { src: 'specs/_template/verify-report.md', dest: 'specs/_template/verify-report.md' },
  { src: 'specs/_template/analysis.md', dest: 'specs/_template/analysis.md' },
  { src: 'specs/_template/2a-data-model.md', dest: 'specs/_template/2a-data-model.md' },
  { src: 'specs/_template/2b-api-contracts.md', dest: 'specs/_template/2b-api-contracts.md' },
  { src: 'specs/_template/2c-research.md', dest: 'specs/_template/2c-research.md' },
];

type ProviderId = 'claude-code' | 'cursor' | 'windsurf' | 'copilot' | 'codex' | 'gemini' | 'zed';

interface Provider {
  name: string;
  dirs: string[];
  files: Array<{ src: string; dest: string }>;
}

const claudeCommandFiles = COMMAND_NAMES.map(name => ({
  src: `claude-commands/${name}.md`,
  dest: `.claude/commands/${name}.md`,
}));

const copilotPromptFiles = COMMAND_NAMES.map(name => ({
  src: `copilot-prompts/${name}.prompt.md`,
  dest: `.github/prompts/${name}.prompt.md`,
}));

const geminiCommandFiles = COMMAND_NAMES.map(name => ({
  src: `gemini-commands/${name}.toml`,
  dest: `.gemini/commands/${name}.toml`,
}));

const windsurfWorkflowFiles = COMMAND_NAMES.map(name => ({
  src: `windsurf-workflows/${name}.md`,
  dest: `.windsurf/workflows/${name}.md`,
}));

const codexSkillDirs = COMMAND_NAMES.map(name => `.agents/skills/${name}`);
const codexSkillFiles = COMMAND_NAMES.map(name => ({
  src: `codex-skills/${name}/SKILL.md`,
  dest: `.agents/skills/${name}/SKILL.md`,
}));

const PROVIDERS: Record<ProviderId, Provider> = {
  'claude-code': {
    name: 'Claude Code',
    dirs: ['.claude/commands'],
    files: claudeCommandFiles,
  },
  cursor: {
    name: 'Cursor',
    dirs: ['.cursor/rules'],
    files: [
      { src: 'cursor-rules/sddx-workflow.mdc', dest: '.cursor/rules/sddx-workflow.mdc' },
    ],
  },
  windsurf: {
    name: 'Windsurf',
    dirs: ['.windsurf/rules', '.windsurf/workflows'],
    files: [
      { src: 'windsurf-rules/sddx-workflow.md', dest: '.windsurf/rules/sddx-workflow.md' },
      ...windsurfWorkflowFiles,
    ],
  },
  copilot: {
    name: 'GitHub Copilot',
    dirs: ['.github/prompts'],
    files: [
      ...copilotPromptFiles,
      { src: 'copilot-instructions.md', dest: '.github/copilot-instructions.md' },
    ],
  },
  codex: {
    name: 'OpenAI Codex',
    dirs: codexSkillDirs,
    files: [
      { src: 'AGENTS.md', dest: 'AGENTS.md' },
      ...codexSkillFiles,
    ],
  },
  gemini: {
    name: 'Gemini CLI',
    dirs: ['.gemini/commands'],
    files: [
      { src: 'gemini.md', dest: 'GEMINI.md' },
      ...geminiCommandFiles,
    ],
  },
  zed: {
    name: 'Zed',
    dirs: [],
    files: [
      { src: 'zed-rules/sddx-workflow.md', dest: '.rules' },
    ],
  },
};

const ALL_PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

type Ceremony = 'solo' | 'team' | 'enterprise';

interface CeremonyConfig {
  ceremony: Ceremony;
}

async function selectCeremony(): Promise<Ceremony> {
  if (!process.stdout.isTTY) {
    return 'team';
  }

  const choice = await select<Ceremony>({
    message: 'Ceremony level:',
    default: 'team',
    choices: [
      {
        name: 'Solo / MVP   — minimal: /spec-plan, /spec-tasks, /finish',
        value: 'solo',
        description: 'Single developer, prototypes, exploratory work',
      },
      {
        name: 'Team / Product   — standard: full feature flow + /verify + /review',
        value: 'team',
        description: 'Cross-functional team, real product, normal cadence',
      },
      {
        name: 'Enterprise   — full: + mandatory /spec-clarify + mandatory /spec-amend on changes',
        value: 'enterprise',
        description: 'Compliance, audit trails, multi-team',
      },
    ],
  });

  return choice;
}

async function selectProviders(): Promise<ProviderId[]> {
  if (!process.stdout.isTTY) {
    return ALL_PROVIDER_IDS;
  }

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

const CEREMONY_HEADERS: Record<Ceremony, string> = {
  solo: `> **Active ceremony level: Solo / MVP.**
> Required flow: \`/spec-plan\` → \`/spec-tasks\` → \`/finish\`
> The rest of this file documents the full protocol. The sections relevant to your level are: Execution Principles, /spec-plan, /spec-tasks, /finish, Stop Points. Other commands are available opt-in.
`,
  team: `> **Active ceremony level: Team / Product.**
> Required flow: \`/spec-new\` → \`/spec-plan\` → \`/spec-tasks\` → \`/verify\` → \`/review\` → \`/finish\`
> Use \`/spec-amend\` for any post-approval change and \`/impl-gap\` whenever a task is blocked.
`,
  enterprise: `> **Active ceremony level: Enterprise.**
> Required flow: \`/spec-new\` → \`/spec-clarify\` → \`/spec-plan\` → \`/spec-tasks\` → \`/verify\` → \`/review\` → \`/finish\`
> Mandatory: \`/spec-clarify\` before \`/spec-plan\` and \`/spec-amend\` for every post-approval change.
`,
};

function injectCeremonyHeader(cwd: string, ceremony: Ceremony): void {
  const target = path.join(cwd, '.sdd/workflow.md');
  if (!fs.existsSync(target)) return;
  const content = fs.readFileSync(target, 'utf8');
  if (content.includes('> **Active ceremony level:')) return;

  const header = CEREMONY_HEADERS[ceremony];
  const lines = content.split('\n');
  const firstHeading = lines.findIndex(line => line.startsWith('# '));
  if (firstHeading < 0) return;

  const before = lines.slice(0, firstHeading + 1);
  const after = lines.slice(firstHeading + 1);
  const merged = [...before, '', header.trimEnd(), ...after].join('\n');
  fs.writeFileSync(target, merged, 'utf8');
  console.log(`  patch     .sdd/workflow.md (ceremony: ${ceremony})`);
}

function writeConfig(cwd: string, ceremony: Ceremony, force?: boolean): void {
  const dest = path.join(cwd, '.sdd/config.json');
  const existed = fs.existsSync(dest);
  if (existed && !force) {
    console.log(`  skip     ${dest}`);
    return;
  }
  const config: CeremonyConfig = {
    ceremony,
  };
  fs.writeFileSync(dest, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`  ${existed ? 'overwrite' : 'create  '}  ${dest}`);
}

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const { force, existing } = options;

  console.log('');
  console.log(`  SDD Workflow — initializing${existing ? ' (existing project mode)' : ''}`);
  console.log('');

  const ceremony = await selectCeremony();
  const selectedProviders = await selectProviders();

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
    copyTemplate(file.src, path.join(cwd, file.dest), force);
  }

  injectCeremonyHeader(cwd, ceremony);
  writeConfig(cwd, ceremony, force);

  for (const id of selectedProviders) {
    for (const file of PROVIDERS[id].files) {
      copyTemplate(file.src, path.join(cwd, file.dest), force);
    }
  }

  console.log('');
  console.log(`  Done. Ceremony: ${ceremony}. Next steps:`);
  console.log('');
  if (existing) {
    console.log('  1. Run /scan to discover the codebase (no .sdd/ writes — produces scan-report.md)');
    console.log('     then /bootstrap --scan to populate .sdd/project-overview.md and .sdd/conventions.md');
  } else {
    console.log('  1. Run /bootstrap to populate project context (new project)');
    console.log('     or /bootstrap --scan to let the agent analyze the codebase (existing project)');
  }
  if (!claudeExisted) {
    console.log('  2. CLAUDE.md was created — share it with your AI agent as context');
  } else {
    console.log('  2. CLAUDE.md already exists — add a reference to .sdd/ files manually');
  }
  if (selectedProviders.includes('gemini')) {
    if (!geminiExisted) {
      console.log('     GEMINI.md was created — Gemini CLI will read it automatically');
    } else {
      console.log('     GEMINI.md already exists — add a reference to .sdd/ files manually');
    }
  }
  if (selectedProviders.includes('codex')) {
    if (!agentsExisted) {
      console.log('     AGENTS.md was created — Codex will read it automatically');
    } else {
      console.log('     AGENTS.md already exists — add a reference to .sdd/ files manually');
    }
  }

  const commandProviders: ProviderId[] = ['claude-code', 'copilot', 'codex', 'gemini', 'windsurf'];
  const withCommands = selectedProviders.filter(id => commandProviders.includes(id));
  const rulesOnly = selectedProviders.filter(id => !commandProviders.includes(id));

  if (withCommands.length > 0) {
    const names = withCommands.map(id => PROVIDERS[id].name).join(', ');
    console.log(`  3. Slash commands ready in: ${names}. Type / to see them.`);
  }
  if (rulesOnly.length > 0) {
    const names = rulesOnly.map(id => PROVIDERS[id].name).join(', ');
    const step = withCommands.length === 0 ? '3.' : '   ';
    console.log(`  ${step} Context rules installed for: ${names}. The agent reads workflow.md on every task.`);
  }
  console.log('');
}
