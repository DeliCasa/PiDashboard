#!/usr/bin/env npx tsx
/**
 * Handoff Consumption Workflow - Main CLI
 * Feature 033 - Consumes incoming handoffs from PiOrchestrator
 *
 * Usage:
 *   npx tsx scripts/handoff/consume.ts --discover          # List incoming handoffs
 *   npx tsx scripts/handoff/consume.ts --plan <id>         # Generate consumption plan
 *   npx tsx scripts/handoff/consume.ts --complete <id> <req>  # Mark requirement complete
 *   npx tsx scripts/handoff/consume.ts --close <id>        # Close handoff with report
 *   npx tsx scripts/handoff/consume.ts --block <id> "reason"  # Block with outgoing handoff
 *
 * Options:
 *   --verbose  Show detailed output
 *   --json     Output machine-readable JSON
 *   --help     Show this help message
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import chalk from 'chalk';
import { detectHandoffs } from './detect.js';
import type { HandoffDocument, HandoffStatus } from './types.js';
import { PENDING_STATUSES } from './types.js';
import type {
  ConsumeOptions,
  DiscoveryResult,
  ConsumptionPlan,
  VerificationResult,
} from './types-consume.js';
import { STATUS_SORT_PRIORITY } from './types-consume.js';
import {
  generateConsumptionPlan,
  writeConsumptionPlan,
  parseConsumptionPlan,
  writeUpdatedPlan,
  updatePlanFrontmatter,
  calculateAutoStatus,
} from './plan-generator.js';
import {
  generateConsumptionReport,
  writeConsumptionReport,
  updateHandoffStatus,
  generateBlockerHandoff,
  updateHandoffAsBlocked,
  generateBlockedReport,
} from './report.js';

const execAsync = promisify(exec);

// =============================================================================
// Discovery Workflow
// =============================================================================

/**
 * Discover incoming handoffs from PiOrchestrator
 */
export async function discoverIncomingHandoffs(): Promise<DiscoveryResult> {
  const result = await detectHandoffs();
  const timestamp = new Date().toISOString();
  const errors: string[] = [];

  // Filter to incoming handoffs targeting PiDashboard
  const incoming = result.handoffs.filter(
    h => h.frontmatter.direction === 'incoming' && h.frontmatter.to_repo === 'PiDashboard'
  );

  // Filter to unresolved (not done, not acknowledged)
  const unresolved = filterUnresolvedHandoffs(incoming);

  // Sort by priority and date
  const sorted = sortByPriorityAndDate(unresolved);

  // Check for existing consumption plans
  const hasConsumptionPlan = new Map<string, string>();
  for (const h of incoming) {
    const planPath = path.join('specs', `${h.frontmatter.handoff_id}-consumption`, 'plan.md');
    try {
      await fs.access(planPath);
      hasConsumptionPlan.set(h.frontmatter.handoff_id, planPath);
    } catch {
      // No plan exists
    }
  }

  // Add validation errors
  for (const err of result.errors) {
    errors.push(`${err.file}: ${err.message}`);
  }

  return {
    timestamp,
    incoming,
    unresolved: sorted,
    hasConsumptionPlan,
    errors,
  };
}

/**
 * Filter to unresolved handoffs (status != done, != acknowledged)
 */
export function filterUnresolvedHandoffs(handoffs: HandoffDocument[]): HandoffDocument[] {
  return handoffs.filter(h => PENDING_STATUSES.includes(h.frontmatter.status));
}

/**
 * Sort handoffs by status priority (new → in_progress → blocked) then by date (newest first)
 */
export function sortByPriorityAndDate(handoffs: HandoffDocument[]): HandoffDocument[] {
  return [...handoffs].sort((a, b) => {
    // First by status priority
    const statusDiff =
      STATUS_SORT_PRIORITY[a.frontmatter.status] - STATUS_SORT_PRIORITY[b.frontmatter.status];
    if (statusDiff !== 0) return statusDiff;

    // Then by date (newest first)
    const dateA = new Date(a.frontmatter.created_at).getTime();
    const dateB = new Date(b.frontmatter.created_at).getTime();
    return dateB - dateA;
  });
}

/**
 * Format discovery output with chalk table
 */
export function formatDiscoveryOutput(result: DiscoveryResult, verbose: boolean): string {
  const lines: string[] = [];

  if (result.unresolved.length === 0) {
    lines.push(chalk.green('✓ No unresolved incoming handoffs'));
    if (verbose && result.incoming.length > 0) {
      lines.push('');
      lines.push(chalk.dim(`${result.incoming.length} resolved handoff(s) found`));
    }
    return lines.join('\n');
  }

  lines.push(chalk.bold('📥 INCOMING HANDOFFS'));
  lines.push('');

  // Group by status
  const newHandoffs = result.unresolved.filter(h => h.frontmatter.status === 'new');
  const inProgressHandoffs = result.unresolved.filter(h => h.frontmatter.status === 'in_progress');
  const blockedHandoffs = result.unresolved.filter(h => h.frontmatter.status === 'blocked');

  if (newHandoffs.length > 0) {
    lines.push(chalk.yellow('NEW (consume first):'));
    for (const h of newHandoffs) {
      const hasPlan = result.hasConsumptionPlan.has(h.frontmatter.handoff_id);
      const planIndicator = hasPlan ? chalk.green(' [plan exists]') : '';
      lines.push(formatHandoffLine(h, planIndicator));
    }
    lines.push('');
  }

  if (inProgressHandoffs.length > 0) {
    lines.push(chalk.blue('IN PROGRESS:'));
    for (const h of inProgressHandoffs) {
      const hasPlan = result.hasConsumptionPlan.has(h.frontmatter.handoff_id);
      const planIndicator = hasPlan ? chalk.green(' [plan exists]') : '';
      lines.push(formatHandoffLine(h, planIndicator));
    }
    lines.push('');
  }

  if (blockedHandoffs.length > 0) {
    lines.push(chalk.red('BLOCKED:'));
    for (const h of blockedHandoffs) {
      lines.push(formatHandoffLine(h, ''));
    }
    lines.push('');
  }

  // Show resolved in verbose mode
  if (verbose) {
    const resolved = result.incoming.filter(
      h => !PENDING_STATUSES.includes(h.frontmatter.status)
    );
    if (resolved.length > 0) {
      lines.push(chalk.dim('RESOLVED:'));
      for (const h of resolved) {
        lines.push(chalk.dim(formatHandoffLine(h, '')));
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format a single handoff line
 */
function formatHandoffLine(h: HandoffDocument, suffix: string): string {
  const date = h.frontmatter.created_at.split('T')[0];
  const id = h.frontmatter.handoff_id;
  const status = h.frontmatter.status;
  const filePath = h.filePath;

  const statusIcon = getStatusIcon(status);

  return `  ${statusIcon} ${id} (${date})${suffix}\n     ${chalk.dim(filePath)}`;
}

/**
 * Get status icon
 */
function getStatusIcon(status: HandoffStatus): string {
  switch (status) {
    case 'new':
      return '⚠️';
    case 'in_progress':
      return '🔄';
    case 'blocked':
      return '🚫';
    case 'done':
      return '✅';
    case 'acknowledged':
      return '👀';
    default:
      return '❓';
  }
}

// =============================================================================
// Plan Workflow
// =============================================================================

/**
 * Generate consumption plan for a handoff
 */
async function handlePlan(handoffId: string, options: ConsumeOptions): Promise<void> {
  // Find the handoff
  const result = await detectHandoffs();
  const handoff = result.handoffs.find(h => h.frontmatter.handoff_id === handoffId);

  if (!handoff) {
    console.error(chalk.red(`Handoff not found: ${handoffId}`));
    process.exit(1);
  }

  // Check if plan already exists
  const planDir = path.join('specs', `${handoffId}-consumption`);
  const planPath = path.join(planDir, 'plan.md');

  try {
    await fs.access(planPath);
    console.log(chalk.yellow(`Consumption plan already exists: ${planPath}`));
    console.log(chalk.dim('Delete the existing plan to regenerate.'));
    return;
  } catch {
    // Plan doesn't exist, continue
  }

  // Generate plan
  console.log(chalk.blue(`Generating consumption plan for ${handoffId}...`));
  const plan = generateConsumptionPlan(handoff);

  // Write plan
  const writtenPath = await writeConsumptionPlan(plan, planDir);

  console.log(chalk.green(`✓ Consumption plan created: ${writtenPath}`));
  console.log('');
  console.log(chalk.bold('Summary:'));
  console.log(`  Requirements: ${plan.requirements.length}`);
  console.log(`  Risks: ${plan.risks.length}`);
  console.log(`  Test items: ${plan.testPlan.length}`);
  console.log(`  Impacted files: ${plan.impactedFiles.length}`);
  console.log('');
  console.log(chalk.dim(`Next: Review ${writtenPath} and start implementation`));
}

// =============================================================================
// Complete Workflow
// =============================================================================

/**
 * Mark a requirement as complete
 */
async function handleComplete(
  handoffId: string,
  reqId: string,
  _options: ConsumeOptions
): Promise<void> {
  const planPath = path.join('specs', `${handoffId}-consumption`, 'plan.md');

  // Parse existing plan
  const plan = await parseConsumptionPlan(planPath);
  if (!plan) {
    console.error(chalk.red(`Consumption plan not found: ${planPath}`));
    console.error(chalk.dim(`Run: npm run handoff:consume -- --plan ${handoffId}`));
    process.exit(1);
  }

  // Find and update requirement
  const req = plan.requirements.find(r => r.id === reqId);
  if (!req) {
    console.error(chalk.red(`Requirement not found: ${reqId}`));
    console.error(chalk.dim(`Available: ${plan.requirements.map(r => r.id).join(', ')}`));
    process.exit(1);
  }

  if (req.completed) {
    console.log(chalk.yellow(`${reqId} is already completed`));
    return;
  }

  // Mark as complete
  const updatedReqs = markRequirementComplete(plan.requirements, reqId);
  const completedCount = updatedReqs.filter(r => r.completed).length;

  // Update plan
  const updatedPlan = updatePlanFrontmatter(
    { ...plan, requirements: updatedReqs },
    {
      requirements_done: completedCount,
      status: calculateAutoStatus({
        ...plan,
        frontmatter: { ...plan.frontmatter, requirements_done: completedCount },
      }),
    }
  );

  // Write updated plan
  await writeUpdatedPlan(updatedPlan, planPath);

  console.log(chalk.green(`✓ Marked ${reqId} as complete`));
  console.log(`  Progress: ${completedCount}/${plan.frontmatter.requirements_total}`);
  console.log(`  Status: ${updatedPlan.frontmatter.status}`);
}

/**
 * Mark a requirement as complete in the list
 */
export function markRequirementComplete(
  requirements: import('./types-consume.js').ExtractedRequirement[],
  reqId: string
): import('./types-consume.js').ExtractedRequirement[] {
  return requirements.map(req => (req.id === reqId ? { ...req, completed: true } : req));
}

/**
 * Update plan status based on progress
 */
export function updatePlanStatus(
  plan: ConsumptionPlan
): import('./types-consume.js').ConsumptionStatus {
  return calculateAutoStatus(plan);
}

// =============================================================================
// Close Workflow
// =============================================================================

/**
 * Close a handoff with verification and report generation
 */
async function handleClose(handoffId: string, options: ConsumeOptions): Promise<void> {
  const planPath = path.join('specs', `${handoffId}-consumption`, 'plan.md');

  // Parse plan
  const plan = await parseConsumptionPlan(planPath);
  if (!plan) {
    console.error(chalk.red(`Consumption plan not found: ${planPath}`));
    process.exit(1);
  }

  // Find handoff
  const result = await detectHandoffs();
  const handoff = result.handoffs.find(h => h.frontmatter.handoff_id === handoffId);
  if (!handoff) {
    console.error(chalk.red(`Handoff not found: ${handoffId}`));
    process.exit(1);
  }

  // Run verification commands
  console.log(chalk.blue('Running verification...'));
  const verification = await runVerificationCommands();

  // Check if all tests pass
  const allPassed = validateTestsPassing(verification);
  if (!allPassed) {
    console.log('');
    console.log(formatVerificationResults(verification));
    console.error(chalk.red('\n✗ Cannot close: verification failed'));
    console.error(chalk.dim('Fix failing tests before closing the handoff.'));
    process.exit(1);
  }

  console.log(chalk.green('✓ All verification checks passed'));

  // Generate report
  console.log(chalk.blue('Generating consumption report...'));
  const report = await generateConsumptionReport(handoff, plan, verification);

  // Write report
  const reportPath = path.join('docs', 'handoffs', `CONSUMPTION_REPORT_${handoffId}.md`);
  await writeConsumptionReport(report, reportPath);

  // Update handoff status
  await updateHandoffStatus(
    handoff.filePath,
    'done',
    report.frontmatter.related_commits
  );

  console.log(chalk.green(`✓ Handoff ${handoffId} closed successfully`));
  console.log(`  Report: ${reportPath}`);
  console.log(`  Handoff status: done`);
}

/**
 * Run verification commands (npm test)
 */
export async function runVerificationCommands(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Run npm test
  try {
    const { stdout } = await execAsync('npm test 2>&1', { timeout: 120000 });
    results.push({
      command: 'npm test',
      expected: 'All tests pass',
      actual: 'All tests pass',
      passed: true,
    });
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    results.push({
      command: 'npm test',
      expected: 'All tests pass',
      actual: err.stderr || err.stdout || 'Tests failed',
      passed: false,
    });
  }

  return results;
}

/**
 * Check if all verification results passed
 */
export function validateTestsPassing(results: VerificationResult[]): boolean {
  return results.every(r => r.passed);
}

/**
 * Format verification results as a table
 */
export function formatVerificationResults(results: VerificationResult[]): string {
  const lines: string[] = [];
  lines.push('Verification Results:');
  lines.push('');

  for (const r of results) {
    const status = r.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
    lines.push(`  ${status} ${r.command}`);
    if (!r.passed && r.actual) {
      lines.push(chalk.dim(`         ${r.actual.slice(0, 80)}`));
    }
  }

  return lines.join('\n');
}

// =============================================================================
// Block Workflow
// =============================================================================

/**
 * Block a handoff and generate outgoing handoff
 */
async function handleBlock(
  handoffId: string,
  reason: string,
  _options: ConsumeOptions
): Promise<void> {
  const planPath = path.join('specs', `${handoffId}-consumption`, 'plan.md');

  // Parse plan
  const plan = await parseConsumptionPlan(planPath);
  if (!plan) {
    console.error(chalk.red(`Consumption plan not found: ${planPath}`));
    process.exit(1);
  }

  // Find handoff
  const result = await detectHandoffs();
  const handoff = result.handoffs.find(h => h.frontmatter.handoff_id === handoffId);
  if (!handoff) {
    console.error(chalk.red(`Handoff not found: ${handoffId}`));
    process.exit(1);
  }

  // Generate outgoing handoff
  console.log(chalk.blue('Generating outgoing handoff for blocker...'));
  const blockerPath = await generateBlockerHandoff(handoff, reason);

  // Update original handoff as blocked
  await updateHandoffAsBlocked(handoff.filePath, reason, blockerPath);

  // Generate blocked report
  const report = await generateBlockedReport(handoff, plan, reason, blockerPath);
  const reportPath = path.join('docs', 'handoffs', `CONSUMPTION_REPORT_${handoffId}.md`);
  await writeConsumptionReport(report, reportPath);

  console.log(chalk.yellow(`⚠️ Handoff ${handoffId} marked as blocked`));
  console.log(`  Reason: ${reason}`);
  console.log(`  Outgoing handoff: ${blockerPath}`);
  console.log(`  Report: ${reportPath}`);
}

// =============================================================================
// CLI Interface
// =============================================================================

function parseArgs(args: string[]): ConsumeOptions {
  const options: ConsumeOptions = {
    discover: false,
    verbose: args.includes('--verbose') || args.includes('-v'),
    json: args.includes('--json'),
    help: args.includes('--help') || args.includes('-h'),
  };

  // Parse commands
  const discoverIdx = args.indexOf('--discover');
  if (discoverIdx !== -1) {
    options.discover = true;
  }

  const planIdx = args.indexOf('--plan');
  if (planIdx !== -1 && args[planIdx + 1]) {
    options.plan = args[planIdx + 1];
  }

  const completeIdx = args.indexOf('--complete');
  if (completeIdx !== -1 && args[completeIdx + 1] && args[completeIdx + 2]) {
    options.complete = {
      handoffId: args[completeIdx + 1],
      reqId: args[completeIdx + 2],
    };
  }

  const closeIdx = args.indexOf('--close');
  if (closeIdx !== -1 && args[closeIdx + 1]) {
    options.close = args[closeIdx + 1];
  }

  const blockIdx = args.indexOf('--block');
  if (blockIdx !== -1 && args[blockIdx + 1] && args[blockIdx + 2]) {
    options.block = {
      handoffId: args[blockIdx + 1],
      reason: args[blockIdx + 2],
    };
  }

  return options;
}

function printHelp(): void {
  console.log(`
${chalk.bold('Handoff Consumption Workflow')}

${chalk.dim('Consume incoming handoffs from PiOrchestrator')}

${chalk.bold('Usage:')}
  npm run handoff:consume -- --discover          List incoming handoffs
  npm run handoff:consume -- --plan <id>         Generate consumption plan
  npm run handoff:consume -- --complete <id> <req>  Mark requirement complete
  npm run handoff:consume -- --close <id>        Close handoff with report
  npm run handoff:consume -- --block <id> "reason"  Block with outgoing handoff

${chalk.bold('Options:')}
  --verbose, -v  Show detailed output
  --json         Output machine-readable JSON
  --help, -h     Show this help message

${chalk.bold('Examples:')}
  npm run handoff:consume -- --discover
  npm run handoff:consume -- --plan 031-backend-gaps
  npm run handoff:consume -- --complete 031-backend-gaps REQ-001
  npm run handoff:consume -- --close 031-backend-gaps
  npm run handoff:consume -- --block 031-backend-gaps "WiFi endpoint not implemented"
`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  try {
    if (options.discover) {
      const result = await discoverIncomingHandoffs();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('');
        console.log(formatDiscoveryOutput(result, options.verbose));
        console.log('');
      }
    } else if (options.plan) {
      await handlePlan(options.plan, options);
    } else if (options.complete) {
      await handleComplete(options.complete.handoffId, options.complete.reqId, options);
    } else if (options.close) {
      await handleClose(options.close, options);
    } else if (options.block) {
      await handleBlock(options.block.handoffId, options.block.reason, options);
    } else {
      printHelp();
    }
  } catch (err) {
    const error = err as Error;
    console.error(chalk.red(`Error: ${error.message}`));
    if (options.json) {
      console.log(JSON.stringify({ error: error.message }, null, 2));
    }
    process.exit(1);
  }
}

// Run if executed directly (not imported)
const isMainModule = process.argv[1]?.includes('consume');
if (isMainModule) {
  main();
}
