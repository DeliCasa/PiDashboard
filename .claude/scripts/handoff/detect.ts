#!/usr/bin/env npx tsx
/**
 * Handoff Sentinel - Detection Script
 * Scans for incoming handoffs and displays status summary
 *
 * Usage:
 *   npx tsx scripts/handoff/detect.ts [options]
 *
 * Options:
 *   --quiet    Suppress output on success (for predev/pretest hooks)
 *   --verbose  Show all handoffs, not just pending
 *   --strict   Exit with code 1 if any pending handoffs exist
 *   --json     Output machine-readable JSON
 */

import {
  scanHandoffPaths,
  parseHandoffFile,
  formatBox,
  formatDetectionSummary,
  formatVerboseOutput,
  formatJsonOutput,
  calculateContentHash,
} from './utils.js';
import { validateHandoff, checkDuplicateIds } from './validate.js';
import { loadState, saveState, identifyNewHandoffs } from './state.js';
import type {
  DetectOptions,
  DetectionResult,
  DetectionSummary,
  HandoffDocument,
  ValidationError,
} from './types.js';
import { PENDING_STATUSES } from './types.js';
import chalk from 'chalk';

// =============================================================================
// Detection Logic
// =============================================================================

/**
 * Main detection function - scans and validates all handoffs
 */
export async function detectHandoffs(): Promise<DetectionResult> {
  const timestamp = new Date().toISOString();
  const errors: ValidationError[] = [];
  const handoffs: HandoffDocument[] = [];

  // Scan for handoff files
  const files = await scanHandoffPaths();

  // Parse each file
  for (const filePath of files) {
    const { document, error } = await parseHandoffFile(filePath);

    if (error) {
      errors.push(error);
      continue;
    }

    if (document) {
      // Validate frontmatter
      const validationErrors = validateHandoff(document);
      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
        continue;
      }

      handoffs.push(document);
    }
  }

  // Check for duplicate IDs
  const duplicateErrors = checkDuplicateIds(handoffs);
  errors.push(...duplicateErrors);

  // Filter incoming handoffs to PiDashboard
  const incomingHandoffs = handoffs.filter(
    h => h.frontmatter.direction === 'incoming' && h.frontmatter.to_repo === 'PiDashboard'
  );

  // Also include outgoing handoffs with pending status (useful to track)
  const outgoingPending = handoffs.filter(
    h => h.frontmatter.direction === 'outgoing' && PENDING_STATUSES.includes(h.frontmatter.status)
  );

  // Filter to pending statuses
  const pending = [
    ...incomingHandoffs.filter(h => PENDING_STATUSES.includes(h.frontmatter.status)),
    // Include outgoing with blocked status for visibility
    ...outgoingPending.filter(h => h.frontmatter.status === 'blocked'),
  ];

  // Load state and identify new handoffs
  const state = await loadState();
  const newSinceLastRun = identifyNewHandoffs(handoffs, state);

  // Calculate summary
  const summary: DetectionSummary = {
    total: handoffs.length,
    new: handoffs.filter(h => h.frontmatter.status === 'new').length,
    inProgress: handoffs.filter(h => h.frontmatter.status === 'in_progress').length,
    blocked: handoffs.filter(h => h.frontmatter.status === 'blocked').length,
    done: handoffs.filter(h => h.frontmatter.status === 'done').length,
    acknowledged: handoffs.filter(h => h.frontmatter.status === 'acknowledged').length,
  };

  // Save updated state
  await saveState({
    version: 1,
    lastRun: timestamp,
    seen: Object.fromEntries(
      handoffs.map(h => [
        h.frontmatter.handoff_id,
        {
          status: h.frontmatter.status,
          lastSeen: timestamp,
          contentHash: calculateContentHash(h.content),
        },
      ])
    ),
  });

  return {
    timestamp,
    handoffs,
    pending,
    newSinceLastRun,
    errors,
    summary,
  };
}

// =============================================================================
// CLI Interface
// =============================================================================

function parseArgs(args: string[]): DetectOptions {
  return {
    quiet: args.includes('--quiet') || args.includes('-q'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    strict: args.includes('--strict') || args.includes('-s'),
    json: args.includes('--json'),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  try {
    const result = await detectHandoffs();

    // JSON output mode
    if (options.json) {
      console.log(formatJsonOutput(result));
      process.exit(options.strict && result.pending.length > 0 ? 1 : 0);
    }

    // Quiet mode - no output on success
    if (options.quiet && result.pending.length === 0 && result.errors.length === 0) {
      process.exit(0);
    }

    // Verbose mode - show everything
    if (options.verbose) {
      console.log('');
      console.log(formatBox('📬 HANDOFF SENTINEL', [formatVerboseOutput(result)]));
      console.log('');
    } else if (result.pending.length > 0 || result.errors.length > 0) {
      // Normal mode - show pending and errors
      console.log('');
      const content = formatDetectionSummary(result).split('\n');
      console.log(formatBox('📬 HANDOFF SENTINEL', content));
      console.log('');
      console.log(
        chalk.dim("Run 'npm run handoff:list' for details or edit status in frontmatter.")
      );
      console.log('');
    }

    // Strict mode - exit 1 if pending handoffs exist
    if (options.strict && result.pending.length > 0) {
      console.log(chalk.red(`\n✗ ${result.pending.length} pending handoff(s) blocking build`));
      process.exit(1);
    }

    process.exit(0);
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
const isMainModule = process.argv[1]?.includes('detect');
if (isMainModule) {
  main();
}
