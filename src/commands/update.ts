import fs from 'fs';
import path from 'path';
import { copyTemplate } from '../utils';
import { COMMAND_NAMES } from './command-names';

const claudeCommands = COMMAND_NAMES.map(name => ({
  src: `claude-commands/${name}.md`,
  dest: `.claude/commands/${name}.md`,
}));

const copilotPrompts = COMMAND_NAMES.map(name => ({
  src: `copilot-prompts/${name}.prompt.md`,
  dest: `.github/prompts/${name}.prompt.md`,
}));

const codexSkills = COMMAND_NAMES.map(name => ({
  src: `codex-skills/${name}/SKILL.md`,
  dest: `.agents/skills/${name}/SKILL.md`,
}));

const WORKFLOW_FILES: Array<{ src: string; dest: string }> = [
  { src: 'workflow.md', dest: '.sdd/workflow.md' },
  ...claudeCommands,
  { src: 'cursor-rules/sddx-workflow.mdc', dest: '.cursor/rules/sddx-workflow.mdc' },
  { src: 'windsurf-rules/sddx-workflow.md', dest: '.windsurf/rules/sddx-workflow.md' },
  ...copilotPrompts,
  { src: 'copilot-instructions.md', dest: '.github/copilot-instructions.md' },
  ...codexSkills,
  { src: 'zed-rules/sddx-workflow.md', dest: '.rules' },
];

export function updateCommand(): void {
  const cwd = process.cwd();

  if (!fs.existsSync(path.join(cwd, '.sdd'))) {
    console.error('\n  error    .sdd/ not found. Run `npx sddx-workflow init` first.\n');
    process.exit(1);
  }

  console.log('');
  console.log('  SDD Workflow — updating workflow files');
  console.log('  (project-overview.md, conventions.md, CLAUDE.md, config.json, and domains are yours — untouched)');
  console.log('  (only files that already exist are updated — run `init --force` to add new commands)');
  console.log('');

  let updated = 0;
  for (const file of WORKFLOW_FILES) {
    const dest = path.join(cwd, file.dest);

    // Only update files that already exist — never silently create new command files
    // on old installs, as users may not have opted into the new commands.
    if (!fs.existsSync(dest)) continue;

    copyTemplate(file.src, dest, true);
    updated++;
  }

  console.log('');
  console.log(`  Done. ${updated} file${updated !== 1 ? 's' : ''} updated.\n`);
}
