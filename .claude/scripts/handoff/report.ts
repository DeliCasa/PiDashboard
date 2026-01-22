/**
 * Handoff Consumption - Report Generator
 * Feature 033 - Generates consumption reports and handles closure
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import matter from 'gray-matter';
import type { HandoffDocument, HandoffFrontmatter } from './types.js';
import type {
  ConsumptionReport,
  ConsumptionReportFrontmatter,
  ConsumptionPlan,
  ChangeSummary,
  FileChange,
  VerificationResult,
} from './types-consume.js';

const execAsync = promisify(exec);

// =============================================================================
// Report Generation
// =============================================================================

/**
 * Generate a consumption report for a completed handoff
 */
export async function generateConsumptionReport(
  handoff: HandoffDocument,
  plan: ConsumptionPlan,
  verification: VerificationResult[]
): Promise<ConsumptionReport> {
  const now = new Date().toISOString();

  // Gather change summary from git
  const changesSummary = await gatherChangeSummary(plan.frontmatter.created_at);

  // Gather related commits
  const relatedCommits = await gatherRelatedCommits(plan.frontmatter.created_at);

  const frontmatter: ConsumptionReportFrontmatter = {
    handoff_id: handoff.frontmatter.handoff_id,
    consumption_plan: `specs/${handoff.frontmatter.handoff_id}-consumption/plan.md`,
    status: 'done',
    completed_at: now,
    related_commits: relatedCommits,
    related_prs: [], // Would need GitHub API to populate
  };

  // Generate request summary from handoff
  const requestSummary = generateRequestSummary(handoff);

  return {
    frontmatter,
    requestSummary,
    changesSummary,
    verification,
    followUps: [],
  };
}

/**
 * Generate request summary from handoff
 */
function generateRequestSummary(handoff: HandoffDocument): string {
  const { frontmatter } = handoff;
  const lines: string[] = [];

  if (frontmatter.requires) {
    for (const req of frontmatter.requires) {
      lines.push(`- ${req.description}`);
    }
  }

  if (frontmatter.acceptance) {
    for (const acc of frontmatter.acceptance) {
      lines.push(`- ${acc}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : 'See source handoff for details.';
}

// =============================================================================
// Git Operations
// =============================================================================

/**
 * Gather change summary from git
 */
export async function gatherChangeSummary(sinceDate: string): Promise<ChangeSummary> {
  const filesModified: FileChange[] = [];
  const testsAdded = 0;
  let testsModified = 0;
  let linesAdded = 0;
  let linesRemoved = 0;

  try {
    // Get files changed since date
    const { stdout: diffStat } = await execAsync(
      `git diff --stat --since="${sinceDate}" HEAD 2>/dev/null || echo ""`
    );

    // Parse diff stat output
    const lines = diffStat.split('\n');
    for (const line of lines) {
      // Match: file.ts | 10 ++--
      const match = line.match(/^\s*([^\s|]+)\s*\|\s*(\d+)\s*([+-]*)/);
      if (match) {
        const [, filePath, changes, plusMinus] = match;
        const changeCount = parseInt(changes, 10);

        filesModified.push({
          path: filePath,
          changeType: 'modify',
          summary: `${changeCount} changes`,
        });

        // Count lines
        const plusCount = (plusMinus.match(/\+/g) || []).length;
        const minusCount = (plusMinus.match(/-/g) || []).length;
        linesAdded += plusCount;
        linesRemoved += minusCount;

        // Count test changes
        if (filePath.includes('test') || filePath.includes('spec')) {
          if (filePath.includes('.test.ts') || filePath.includes('.spec.ts')) {
            testsModified++;
          }
        }
      }
    }

    // Get actual line counts
    const { stdout: numstat } = await execAsync(
      `git diff --numstat --since="${sinceDate}" HEAD 2>/dev/null || echo ""`
    );

    for (const line of numstat.split('\n')) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const added = parseInt(parts[0], 10) || 0;
        const removed = parseInt(parts[1], 10) || 0;
        linesAdded += added;
        linesRemoved += removed;
      }
    }
  } catch {
    // Git operations may fail, return empty summary
  }

  return {
    filesModified,
    testsAdded,
    testsModified,
    linesAdded,
    linesRemoved,
  };
}

/**
 * Gather related commits since a date
 */
export async function gatherRelatedCommits(sinceDate: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      `git log --oneline --since="${sinceDate}" 2>/dev/null || echo ""`
    );

    return stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.split(' ')[0])
      .slice(0, 20); // Limit to 20 commits
  } catch {
    return [];
  }
}

// =============================================================================
// Report File I/O
// =============================================================================

/**
 * Write consumption report to file
 */
export async function writeConsumptionReport(
  report: ConsumptionReport,
  outputPath: string
): Promise<string> {
  // Ensure directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const content = formatConsumptionReport(report);
  await fs.writeFile(outputPath, content, 'utf-8');
  return outputPath;
}

/**
 * Format consumption report as markdown
 */
function formatConsumptionReport(report: ConsumptionReport): string {
  const { frontmatter, requestSummary, changesSummary, verification, followUps } = report;

  // Build frontmatter
  const fm = matter.stringify('', frontmatter).trim();

  // Build files changed table
  let filesTable = '| File | Change Type | Summary |\n|------|-------------|---------|\n';
  for (const f of changesSummary.filesModified) {
    filesTable += `| \`${f.path}\` | ${f.changeType} | ${f.summary} |\n`;
  }

  // Build verification table
  let verifyTable = '| Command | Expected | Actual | Status |\n|---------|----------|--------|--------|\n';
  for (const v of verification) {
    const status = v.passed ? '✓ PASS' : '✗ FAIL';
    verifyTable += `| \`${v.command}\` | ${v.expected} | ${v.actual || '-'} | ${status} |\n`;
  }

  // Build commits section
  const commitsSection = frontmatter.related_commits.length > 0
    ? frontmatter.related_commits.map(c => `- \`${c}\``).join('\n')
    : '- No commits recorded';

  // Build follow-ups
  const followUpsSection = followUps.length > 0
    ? followUps.map(f => `- ${f}`).join('\n')
    : '- None';

  const doc = `${fm}

# Consumption Report: ${frontmatter.handoff_id}

**Handoff ID**: ${frontmatter.handoff_id}
**Source Handoff**: [Link](../../docs/HANDOFF_${frontmatter.handoff_id.toUpperCase().replace(/-/g, '_')}.md)
**Consumption Plan**: [Link](../../${frontmatter.consumption_plan})
**Completed**: ${frontmatter.completed_at.split('T')[0]}

## What Was Requested

${requestSummary}

## What Was Changed

### Files Modified

${filesTable}

### Statistics

- **Files changed**: ${changesSummary.filesModified.length}
- **Tests added**: ${changesSummary.testsAdded}
- **Tests modified**: ${changesSummary.testsModified}
- **Lines added**: ${changesSummary.linesAdded}
- **Lines removed**: ${changesSummary.linesRemoved}

### Related Commits

${commitsSection}

### Related PRs

${frontmatter.related_prs.length > 0 ? frontmatter.related_prs.map(pr => `- [${pr}](${pr})`).join('\n') : '- None'}

## Verification

### Verification Steps Executed

${verifyTable}

## Follow-ups

${followUpsSection}

## Blockers

${frontmatter.status === 'blocked' ? `- Blocked: See [${frontmatter.blocker_handoff}](../../docs/${frontmatter.blocker_handoff}.md)` : '- N/A'}

---

*Generated by Handoff Consumption Workflow*
`;

  return doc;
}

// =============================================================================
// Handoff Status Updates
// =============================================================================

/**
 * Update handoff document status to done
 */
export async function updateHandoffStatus(
  handoffPath: string,
  status: 'done' | 'blocked',
  relatedCommits: string[],
  relatedPrs: string[] = []
): Promise<void> {
  try {
    const content = await fs.readFile(handoffPath, 'utf-8');
    const { data, content: body } = matter(content);

    const frontmatter = data as HandoffFrontmatter;
    frontmatter.status = status;
    frontmatter.related_commits = relatedCommits;
    frontmatter.related_prs = relatedPrs;

    const updated = matter.stringify(body, frontmatter);
    await fs.writeFile(handoffPath, updated, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to update handoff status: ${(error as Error).message}`);
  }
}

// =============================================================================
// Blocker Handling
// =============================================================================

/**
 * Generate an outgoing handoff for a blocker
 */
export async function generateBlockerHandoff(
  originalHandoff: HandoffDocument,
  blockerReason: string
): Promise<string> {
  const now = new Date().toISOString();
  const featureNum = originalHandoff.frontmatter.handoff_id.split('-')[0];
  const slug = 'blocker-' + originalHandoff.frontmatter.handoff_id;

  const frontmatter = {
    handoff_id: slug,
    direction: 'outgoing',
    from_repo: 'PiDashboard',
    to_repo: 'PiOrchestrator',
    created_at: now,
    status: 'new',
    related_prs: [],
    related_commits: [],
    requires: [
      {
        type: 'api',
        description: blockerReason,
      },
    ],
    notes: `Blocker from incoming handoff ${originalHandoff.frontmatter.handoff_id}`,
  };

  const content = `

## Context

This handoff was automatically generated because PiDashboard encountered a blocker while implementing incoming handoff **${originalHandoff.frontmatter.handoff_id}**.

## Blocker Details

${blockerReason}

## Related Handoff

- **Original Handoff**: ${originalHandoff.filePath}
- **Direction**: incoming → PiDashboard
- **Status**: blocked

## Requested Action

PiOrchestrator must address the blocker before PiDashboard can complete implementation.

---

*Generated by Handoff Consumption Workflow*
`;

  const doc = matter.stringify(content, frontmatter);
  const fileName = `HANDOFF_${featureNum}_BLOCKER_${originalHandoff.frontmatter.handoff_id.toUpperCase().replace(/-/g, '_')}.md`;
  const outputPath = path.join('docs', fileName);

  await fs.mkdir('docs', { recursive: true });
  await fs.writeFile(outputPath, doc, 'utf-8');

  return outputPath;
}

/**
 * Update handoff as blocked
 */
export async function updateHandoffAsBlocked(
  handoffPath: string,
  blockerReason: string,
  blockerHandoffPath: string
): Promise<void> {
  try {
    const content = await fs.readFile(handoffPath, 'utf-8');
    const { data, content: body } = matter(content);

    const frontmatter = data as HandoffFrontmatter & { blocker_reason?: string; blocker_handoff?: string };
    frontmatter.status = 'blocked';
    // @ts-expect-error - Adding custom fields
    frontmatter.blocker_reason = blockerReason;
    // @ts-expect-error - Adding custom fields
    frontmatter.blocker_handoff = blockerHandoffPath;

    const updated = matter.stringify(body, frontmatter);
    await fs.writeFile(handoffPath, updated, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to update handoff as blocked: ${(error as Error).message}`);
  }
}

/**
 * Generate a consumption report for a blocked handoff
 */
export async function generateBlockedReport(
  handoff: HandoffDocument,
  plan: ConsumptionPlan,
  blockerReason: string,
  blockerHandoffPath: string
): Promise<ConsumptionReport> {
  const now = new Date().toISOString();

  const changesSummary = await gatherChangeSummary(plan.frontmatter.created_at);
  const relatedCommits = await gatherRelatedCommits(plan.frontmatter.created_at);

  const frontmatter: ConsumptionReportFrontmatter = {
    handoff_id: handoff.frontmatter.handoff_id,
    consumption_plan: `specs/${handoff.frontmatter.handoff_id}-consumption/plan.md`,
    status: 'blocked',
    completed_at: now,
    related_commits: relatedCommits,
    related_prs: [],
    blocker_handoff: blockerHandoffPath,
  };

  const requestSummary = generateRequestSummary(handoff);

  return {
    frontmatter,
    requestSummary,
    changesSummary,
    verification: [],
    followUps: [`Blocked: ${blockerReason}`, `Outgoing handoff created: ${blockerHandoffPath}`],
  };
}
