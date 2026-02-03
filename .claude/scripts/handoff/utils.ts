/**
 * Handoff Sentinel - Utility Functions
 * File scanning, parsing, and terminal output formatting
 */

import fg from 'fast-glob';
import matter from 'gray-matter';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

import type {
  HandoffDocument,
  HandoffFrontmatter,
  ValidationError,
  Requirement,
  DetectionResult,
} from './types.js';
import { ErrorCode, DEFAULT_HANDOFF_PATTERNS, PENDING_STATUSES } from './types.js';

// =============================================================================
// File Scanning
// =============================================================================

/**
 * Scan for handoff documents matching configured patterns
 */
export async function scanHandoffPaths(
  patterns: readonly string[] = DEFAULT_HANDOFF_PATTERNS,
  cwd: string = process.cwd()
): Promise<string[]> {
  const files = await fg([...patterns], {
    cwd,
    absolute: true,
    onlyFiles: true,
    ignore: ['**/node_modules/**'],
  });

  return files.sort();
}

// =============================================================================
// File Parsing
// =============================================================================

/**
 * Parse a handoff document from file
 */
export async function parseHandoffFile(
  filePath: string
): Promise<{ document: HandoffDocument | null; error: ValidationError | null }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: markdownContent } = matter(content);

    // Basic check that we got frontmatter
    if (!data || Object.keys(data).length === 0) {
      return {
        document: null,
        error: {
          file: filePath,
          message: 'No YAML frontmatter found',
          code: ErrorCode.INVALID_YAML,
        },
      };
    }

    const document: HandoffDocument = {
      frontmatter: data as HandoffFrontmatter,
      content: markdownContent,
      filePath,
    };

    return { document, error: null };
  } catch (err) {
    const error = err as Error;

    // Check if it's a YAML parsing error
    if (error.message?.includes('YAMLException') || error.name === 'YAMLException') {
      return {
        document: null,
        error: {
          file: filePath,
          message: `Invalid YAML: ${error.message}`,
          code: ErrorCode.INVALID_YAML,
        },
      };
    }

    return {
      document: null,
      error: {
        file: filePath,
        message: `Failed to read file: ${error.message}`,
        code: ErrorCode.FILE_READ_ERROR,
      },
    };
  }
}

/**
 * Calculate MD5 hash of file content for change detection
 */
export function calculateContentHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
}

// =============================================================================
// Terminal Output Formatting
// =============================================================================

const BOX_WIDTH = 65;

/**
 * Create a boxed output section
 */
export function formatBox(title: string, content: string[]): string {
  const lines: string[] = [];
  const horizontalLine = '─'.repeat(BOX_WIDTH - 2);

  lines.push(chalk.dim(`┌${horizontalLine}┐`));
  lines.push(chalk.dim('│') + ` ${chalk.bold(title)}`.padEnd(BOX_WIDTH - 2) + chalk.dim('│'));
  lines.push(chalk.dim(`├${horizontalLine}┤`));

  for (const line of content) {
    const paddedLine = ` ${line}`.padEnd(BOX_WIDTH - 2);
    lines.push(chalk.dim('│') + paddedLine + chalk.dim('│'));
  }

  lines.push(chalk.dim(`└${horizontalLine}┘`));

  return lines.join('\n');
}

/**
 * Format a single handoff for display
 */
export function formatHandoffEntry(doc: HandoffDocument, isNew: boolean = false): string[] {
  const lines: string[] = [];
  const { frontmatter } = doc;

  // Extract requirement types
  const requireTypes = (frontmatter.requires || [])
    .map((r: Requirement) => r.type)
    .join(', ');

  // Format date
  const date = frontmatter.created_at?.substring(0, 10) || 'unknown';

  // Status indicator
  const statusIcon = frontmatter.status === 'blocked'
    ? chalk.red('⛔')
    : frontmatter.status === 'new'
    ? chalk.yellow('⚠️')
    : chalk.blue('🔄');

  // New badge
  const newBadge = isNew ? chalk.magenta(' [NEW]') : '';

  lines.push(
    `  ${statusIcon} ${chalk.cyan(frontmatter.handoff_id)} (${date})${newBadge}` +
    (requireTypes ? chalk.dim(` [${requireTypes}]`) : '')
  );

  // Extract title from content (first # heading)
  const titleMatch = doc.content.match(/^#\s+(?:Handoff:\s*)?(.+)$/m);
  if (titleMatch) {
    lines.push(`     ${chalk.dim('→')} ${titleMatch[1].trim()}`);
  }

  return lines;
}

/**
 * Format the complete detection summary
 */
export function formatDetectionSummary(result: DetectionResult): string {
  const lines: string[] = [];
  const { pending, newSinceLastRun, errors } = result;

  // Header
  if (pending.length === 0 && errors.length === 0) {
    lines.push(chalk.green('✓ No pending handoffs'));
    return lines.join('\n');
  }

  // Warning count
  const warningCount = pending.length;
  const newCount = newSinceLastRun.length;

  if (warningCount > 0) {
    lines.push(
      chalk.yellow(`⚠️  ${warningCount} handoff${warningCount === 1 ? '' : 's'} require${warningCount === 1 ? 's' : ''} attention`) +
      (newCount > 0 ? chalk.magenta(` (${newCount} new)`) : '')
    );
    lines.push('');
  }

  // Group by status
  const byStatus = {
    new: pending.filter(h => h.frontmatter.status === 'new'),
    in_progress: pending.filter(h => h.frontmatter.status === 'in_progress'),
    blocked: pending.filter(h => h.frontmatter.status === 'blocked'),
  };

  // Display each group
  if (byStatus.new.length > 0) {
    lines.push(chalk.yellow.bold('NEW:'));
    for (const doc of byStatus.new) {
      const isNew = newSinceLastRun.some(n => n.frontmatter.handoff_id === doc.frontmatter.handoff_id);
      lines.push(...formatHandoffEntry(doc, isNew));
    }
    lines.push('');
  }

  if (byStatus.in_progress.length > 0) {
    lines.push(chalk.blue.bold('IN PROGRESS:'));
    for (const doc of byStatus.in_progress) {
      lines.push(...formatHandoffEntry(doc));
    }
    lines.push('');
  }

  if (byStatus.blocked.length > 0) {
    lines.push(chalk.red.bold('BLOCKED:'));
    for (const doc of byStatus.blocked) {
      lines.push(...formatHandoffEntry(doc));
    }
    lines.push('');
  }

  // Errors
  if (errors.length > 0) {
    lines.push(chalk.red.bold('ERRORS:'));
    for (const err of errors) {
      lines.push(`  ${chalk.red('✗')} ${path.basename(err.file)}: ${err.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format verbose output with all handoffs
 */
export function formatVerboseOutput(result: DetectionResult): string {
  const lines: string[] = [];
  const { handoffs, summary } = result;

  lines.push(chalk.bold('All Handoffs:'));
  lines.push('');

  for (const doc of handoffs) {
    const status = doc.frontmatter.status;
    const isPending = PENDING_STATUSES.includes(status);
    const statusColor = isPending ? chalk.yellow : chalk.green;

    lines.push(`  ${statusColor(status.padEnd(12))} ${doc.frontmatter.handoff_id}`);
    lines.push(`               ${chalk.dim(doc.filePath)}`);
  }

  lines.push('');
  lines.push(chalk.bold('Summary:'));
  lines.push(`  Total: ${summary.total}`);
  lines.push(`  New: ${summary.new}, In Progress: ${summary.inProgress}, Blocked: ${summary.blocked}`);
  lines.push(`  Acknowledged: ${summary.acknowledged}, Done: ${summary.done}`);

  return lines.join('\n');
}

/**
 * Format JSON output for tooling
 */
export function formatJsonOutput(result: DetectionResult): string {
  return JSON.stringify({
    timestamp: result.timestamp,
    summary: result.summary,
    pending: result.pending.map(h => ({
      id: h.frontmatter.handoff_id,
      status: h.frontmatter.status,
      direction: h.frontmatter.direction,
      from: h.frontmatter.from_repo,
      to: h.frontmatter.to_repo,
      created: h.frontmatter.created_at,
      file: h.filePath,
    })),
    errors: result.errors,
  }, null, 2);
}
