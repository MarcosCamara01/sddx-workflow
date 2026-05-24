import { COMMAND_NAMES } from './commands/command-names';

export type ProviderId =
  | 'claude-code'
  | 'cursor'
  | 'windsurf'
  | 'copilot'
  | 'codex'
  | 'gemini'
  | 'zed';

export interface InstallFile {
  src: string;
  dest: string;
}

export interface Provider {
  name: string;
  dirs: string[];
  files: InstallFile[];
}

export const CORE_FILES: InstallFile[] = [
  { src: 'workflow.md', dest: '.sdd/workflow.md' },
  { src: 'project-overview.md', dest: '.sdd/project-overview.md' },
  { src: 'conventions/base.md', dest: '.sdd/conventions.md' },
  { src: 'specs/_template/1-requirements.md', dest: 'specs/_template/1-requirements.md' },
  { src: 'specs/_template/2-plan.md', dest: 'specs/_template/2-plan.md' },
  { src: 'specs/_template/3-tasks.md', dest: 'specs/_template/3-tasks.md' },
  { src: 'specs/_template/amendments.md', dest: 'specs/_template/amendments.md' },
  { src: 'specs/_template/impl-gaps.md', dest: 'specs/_template/impl-gaps.md' },
  { src: 'specs/_template/verify-report.md', dest: 'specs/_template/verify-report.md' },
  { src: 'specs/_template/review-report.md', dest: 'specs/_template/review-report.md' },
  { src: 'specs/_template/analysis.md', dest: 'specs/_template/analysis.md' },
  { src: 'specs/_template/2a-data-model.md', dest: 'specs/_template/2a-data-model.md' },
  { src: 'specs/_template/2b-api-contracts.md', dest: 'specs/_template/2b-api-contracts.md' },
  { src: 'specs/_template/2c-research.md', dest: 'specs/_template/2c-research.md' },
];

export const USER_OWNED_CORE_FILES = new Set(['.sdd/project-overview.md', '.sdd/conventions.md']);

export const USER_OWNED_PROVIDER_FILES = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.github/copilot-instructions.md',
  '.cursor/rules/sddguard.mdc',
  '.windsurf/rules/sddguard.md',
  '.rules',
]);

const claudeCommandFiles = COMMAND_NAMES.map((name) => ({
  src: `claude-commands/${name}.md`,
  dest: `.claude/commands/${name}.md`,
}));

const copilotPromptFiles = COMMAND_NAMES.map((name) => ({
  src: `copilot-prompts/${name}.prompt.md`,
  dest: `.github/prompts/${name}.prompt.md`,
}));

const geminiCommandFiles = COMMAND_NAMES.map((name) => ({
  src: `gemini-commands/${name}.toml`,
  dest: `.gemini/commands/${name}.toml`,
}));

const windsurfWorkflowFiles = COMMAND_NAMES.map((name) => ({
  src: `windsurf-workflows/${name}.md`,
  dest: `.windsurf/workflows/${name}.md`,
}));

const codexSkillDirs = COMMAND_NAMES.map((name) => `.agents/skills/${name}`);
const codexSkillFiles = COMMAND_NAMES.map((name) => ({
  src: `codex-skills/${name}/SKILL.md`,
  dest: `.agents/skills/${name}/SKILL.md`,
}));

export const PROVIDERS: Record<ProviderId, Provider> = {
  'claude-code': {
    name: 'Claude Code',
    dirs: ['.claude/commands'],
    files: [{ src: 'CLAUDE.md', dest: 'CLAUDE.md' }, ...claudeCommandFiles],
  },
  cursor: {
    name: 'Cursor',
    dirs: ['.cursor/rules'],
    files: [{ src: 'cursor-rules/sddguard.mdc', dest: '.cursor/rules/sddguard.mdc' }],
  },
  windsurf: {
    name: 'Windsurf',
    dirs: ['.windsurf/rules', '.windsurf/workflows'],
    files: [
      { src: 'windsurf-rules/sddguard.md', dest: '.windsurf/rules/sddguard.md' },
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
    files: [{ src: 'AGENTS.md', dest: 'AGENTS.md' }, ...codexSkillFiles],
  },
  gemini: {
    name: 'Gemini CLI',
    dirs: ['.gemini/commands'],
    files: [{ src: 'gemini.md', dest: 'GEMINI.md' }, ...geminiCommandFiles],
  },
  zed: {
    name: 'Zed',
    dirs: [],
    files: [{ src: 'zed-rules/sddguard.md', dest: '.rules' }],
  },
};

export const ALL_PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export const COMMAND_PROVIDER_IDS: ProviderId[] = [
  'claude-code',
  'copilot',
  'codex',
  'gemini',
  'windsurf',
];

export const WORKFLOW_FILES: InstallFile[] = [
  { src: 'workflow.md', dest: '.sdd/workflow.md' },
  ...Object.values(PROVIDERS).flatMap((provider) => provider.files),
];

export function parseProviderList(value: string): ProviderId[] {
  const rawIds = value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (rawIds.length === 0) {
    throw new Error('Provider list cannot be empty');
  }

  const invalid = rawIds.filter((id) => !ALL_PROVIDER_IDS.includes(id as ProviderId));

  if (invalid.length > 0) {
    throw new Error(`Unknown provider: ${invalid.join(', ')}`);
  }

  return [...new Set(rawIds)] as ProviderId[];
}
