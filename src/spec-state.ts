import fs from 'node:fs';
import path from 'node:path';

export type VerifyResult = 'PASS' | 'FAIL' | 'MALFORMED';
export type ReviewResult = 'PASS' | 'FOLLOW_UPS' | 'ESCALATED' | 'MALFORMED';

export interface TaskProgress {
  done: number;
  total: number;
}

export function stripComments(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, '');
}

export function readIfExists(file: string): string | null {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

export function hasBlockingClarifications(content: string): boolean {
  return /^\s*- \[ \]\s*\u26d4\ufe0f?\s*BLOCKING\b/imu.test(stripComments(content));
}

export function hasRequirementsReadyMarker(content: string): boolean {
  return /^- \[x\]\s+Ready for \/spec-plan\b/im.test(stripComments(content));
}

export function hasApprovedPlanMarker(content: string): boolean {
  return /^- \[x\]\s+\*\*Approved\*\*/im.test(stripComments(content));
}

export function hasPlanApprovedLine(content: string): boolean {
  const match = content.match(/^Plan approved:\s*(.+)$/im);
  return Boolean(match?.[1].trim() && !match[1].includes('<!--'));
}

export function readVerifyResult(content: string): VerifyResult {
  const result = content.match(/^Result:\s*(PASS|FAIL)\s*$/m)?.[1];
  return result === 'PASS' || result === 'FAIL' ? result : 'MALFORMED';
}

export function hasSubstantiveVerifyReport(content: string): boolean {
  const stripped = stripComments(content);
  const requiredHeadings = [
    /^## Checks\s*$/im,
    /^## Detail\s*$/im,
    /^### Tasks\s*$/im,
    /^### Goals\s*$/im,
    /^### Scenarios\s*$/im,
    /^### Scope\s*$/im,
    /^### Gaps and CRs\s*$/im,
    /^## Conclusion\s*$/im,
  ];

  if (!requiredHeadings.every((heading) => heading.test(stripped))) {
    return false;
  }

  const checkRows = stripped.match(/^\|\s*[1-7]\s*\|[^|\n]+\|[^|\n]*\|[^|\n]*\|\s*$/gim) ?? [];
  if (checkRows.length < 7) {
    return false;
  }

  return checkRows.every((row) => {
    const cells = row
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    const status = cells[2];
    const evidence = cells[3];
    return /^(PASS|FAIL)$/i.test(status) && evidence.length > 0;
  });
}

export function readReviewResult(content: string): ReviewResult {
  const result = content.match(/^Result:\s*(PASS|FOLLOW_UPS|ESCALATED)\s*$/m)?.[1];
  return result === 'PASS' || result === 'FOLLOW_UPS' || result === 'ESCALATED'
    ? result
    : 'MALFORMED';
}

export function taskProgress(content: string): TaskProgress {
  const taskMatches = [...content.matchAll(/^- \[(x| )\]\s+\*\*(?:T\d+|Task\b)/gim)];
  return {
    done: taskMatches.filter((match) => match[1].toLowerCase() === 'x').length,
    total: taskMatches.length,
  };
}

export function countPendingCrs(specDir: string): number {
  const content = readIfExists(path.join(specDir, 'amendments.md'));
  if (!content) return 0;
  return (stripComments(content).match(/\*\*Status:\*\*\s*Pending approval/gi) ?? []).length;
}

export function countUnresolvedGaps(specDir: string): number {
  const content = readIfExists(path.join(specDir, 'impl-gaps.md'));
  if (!content) return 0;
  const entries = stripComments(content)
    .split(/^##\s+GAP-\d+/gim)
    .slice(1);
  return entries.filter((entry) => {
    const resolution = entry.match(/\*\*Resolution:\*\*\s*(.*)/i);
    return (
      !resolution || resolution[1].trim().length === 0 || /filled|pending|tbd/i.test(resolution[1])
    );
  }).length;
}
