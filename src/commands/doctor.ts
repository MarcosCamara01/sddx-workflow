import fs from 'fs';
import path from 'path';
import { CORE_FILES, ProviderId, PROVIDERS } from '../providers';

const OBSOLETE_PATHS = [
  'src/commands/snapshot.ts',
  'templates/claude-commands/spec-restore.md',
  'templates/codex-skills/spec-restore/SKILL.md',
  'templates/copilot-prompts/spec-restore.prompt.md',
  'templates/gemini-commands/spec-restore.toml',
  'templates/windsurf-workflows/spec-restore.md',
  '.claude/commands/spec-restore.md',
  '.agents/skills/spec-restore/SKILL.md',
  '.github/prompts/spec-restore.prompt.md',
  '.gemini/commands/spec-restore.toml',
  '.windsurf/workflows/spec-restore.md',
];

function exists(cwd: string, relativePath: string): boolean {
  return fs.existsSync(path.join(cwd, relativePath));
}

interface ProviderHealth {
  id: ProviderId;
  name: string;
  installed: number;
  missing: string[];
}

function providerHealth(cwd: string): ProviderHealth[] {
  return Object.entries(PROVIDERS)
    .map(([id, provider]) => ({
      id: id as ProviderId,
      name: provider.name,
      installed: provider.files.filter(file => exists(cwd, file.dest)).length,
      missing: provider.files.filter(file => !exists(cwd, file.dest)).map(file => file.dest),
    }))
    .filter(provider => provider.installed > 0);
}

export function doctorCommand(): void {
  const cwd = process.cwd();
  const issues: string[] = [];
  const warnings: string[] = [];

  console.log('');
  console.log('  SDD Workflow doctor');
  console.log('');

  const hasSdd = exists(cwd, '.sdd');
  console.log(`  install       ${hasSdd ? 'found' : 'missing'}`);
  if (!hasSdd) {
    console.log('');
    console.log('  error        No .sdd/ directory found. Run `npx sddx-workflow init`.');
    console.log('');
    process.exit(1);
  }

  const missingCore = CORE_FILES
    .map(file => file.dest)
    .filter(dest => !exists(cwd, dest));

  console.log(`  core files    ${missingCore.length === 0 ? 'ok' : `${missingCore.length} missing`}`);
  for (const missing of missingCore) {
    issues.push(`Missing core file: ${missing}`);
  }

  const providers = providerHealth(cwd);
  console.log(`  providers     ${providers.length > 0 ? providers.map(provider => provider.name).join(', ') : 'none detected'}`);
  if (providers.length === 0) {
    issues.push('No provider files detected. Run `npx sddx-workflow init --provider <id>` or `npx sddx-workflow init --all`.');
  }
  for (const provider of providers) {
    if (provider.missing.length > 0) {
      warnings.push(`${provider.name} appears partially installed (${provider.missing.length} missing file${provider.missing.length === 1 ? '' : 's'}). Run \`npx sddx-workflow init --force --provider ${provider.id}\` to reinstall it.`);
    }
  }

  const obsolete = OBSOLETE_PATHS.filter(relativePath => exists(cwd, relativePath));
  console.log(`  obsolete      ${obsolete.length === 0 ? 'none' : `${obsolete.length} found`}`);
  for (const item of obsolete) {
    warnings.push(`Obsolete snapshot/restore file remains: ${item}`);
  }

  console.log('');
  if (issues.length === 0 && warnings.length === 0) {
    console.log('  ok           installation looks healthy');
    console.log('');
    return;
  }

  for (const issue of issues) {
    console.log(`  error        ${issue}`);
  }
  for (const warning of warnings) {
    console.log(`  warn         ${warning}`);
  }
  console.log('');

  if (issues.length > 0) process.exit(1);
}
