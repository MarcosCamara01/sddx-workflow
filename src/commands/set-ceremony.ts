import fs from 'fs';
import path from 'path';
import { select } from '@inquirer/prompts';

type Ceremony = 'solo' | 'team' | 'enterprise';

interface CeremonyConfig {
  ceremony: Ceremony;
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

function updateCeremonyHeader(workflowPath: string, ceremony: Ceremony): void {
  if (!fs.existsSync(workflowPath)) return;

  let content = fs.readFileSync(workflowPath, 'utf8');
  const newHeader = CEREMONY_HEADERS[ceremony].trimEnd();

  // Replace existing ceremony header block if present
  const headerPattern = /> \*\*Active ceremony level:[\s\S]*?(?=\n[^>])/;
  if (headerPattern.test(content)) {
    content = content.replace(headerPattern, newHeader);
  } else {
    // Inject after the first top-level heading
    const lines = content.split('\n');
    const firstHeading = lines.findIndex(line => line.startsWith('# '));
    if (firstHeading >= 0) {
      const before = lines.slice(0, firstHeading + 1);
      const after = lines.slice(firstHeading + 1);
      content = [...before, '', newHeader, ...after].join('\n');
    }
  }

  fs.writeFileSync(workflowPath, content, 'utf8');
}

export async function setCeremonyCommand(ceremonyArg?: string): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.sdd/config.json');
  const workflowPath = path.join(cwd, '.sdd/workflow.md');

  if (!fs.existsSync(path.join(cwd, '.sdd'))) {
    console.error('\n  error    .sdd/ not found. Run `npx sddx-workflow init` first.\n');
    process.exit(1);
  }

  let ceremony: Ceremony;

  const validLevels: Ceremony[] = ['solo', 'team', 'enterprise'];

  if (ceremonyArg && validLevels.includes(ceremonyArg as Ceremony)) {
    ceremony = ceremonyArg as Ceremony;
  } else {
    if (!process.stdout.isTTY) {
      console.error('\n  error    Provide a ceremony level: solo | team | enterprise\n');
      process.exit(1);
    }

    const current = fs.existsSync(configPath)
      ? (JSON.parse(fs.readFileSync(configPath, 'utf8')) as CeremonyConfig).ceremony
      : 'team';

    ceremony = await select<Ceremony>({
      message: `Change ceremony level (current: ${current}):`,
      default: current,
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
  }

  console.log('');

  const config: CeremonyConfig = { ceremony };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`  update   .sdd/config.json (ceremony: ${ceremony})`);

  updateCeremonyHeader(workflowPath, ceremony);
  console.log(`  patch    .sdd/workflow.md (ceremony header updated)`);

  console.log('');
  console.log(`  Done. Ceremony level is now: ${ceremony}`);
  console.log('');
}
