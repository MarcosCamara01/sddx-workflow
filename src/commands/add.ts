import fs from 'node:fs';
import path from 'node:path';
import { copyTemplate } from '../utils';

const DOMAIN_MAP: Record<string, string> = {
  auth: 'domains/auth.md',
  payments: 'domains/payments.md',
  storage: 'domains/storage.md',
  email: 'domains/email.md',
};

export function addCommand(type: string, name: string): void {
  const cwd = process.cwd();

  if (type !== 'domain') {
    console.error(`  error    Unknown type "${type}". Available: domain`);
    process.exit(1);
  }

  const templateSrc = DOMAIN_MAP[name];
  if (!templateSrc) {
    const available = Object.keys(DOMAIN_MAP).join(', ');
    console.error(`  error    Unknown domain "${name}". Built-in templates: ${available}.`);
    console.error(`  hint     For other domains, create .sdd/domains/${name}.md manually.`);
    process.exit(1);
  }

  if (!fs.existsSync(path.join(cwd, '.sdd'))) {
    console.error('  error    .sdd/ not found. Run `npx sddguard init` first.');
    process.exit(1);
  }

  console.log('');
  copyTemplate(templateSrc, path.join(cwd, `.sdd/domains/${name}.md`));
  console.log('');
}
