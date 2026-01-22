#!/usr/bin/env npx tsx
/**
 * Handoff Sentinel - Generation Script
 * Generates standardized outgoing handoff documents for PiOrchestrator
 *
 * Usage:
 *   npx tsx scripts/handoff/generate.ts [options]
 *
 * Options:
 *   --feature <num>   Feature number (e.g., 031)
 *   --slug <slug>     URL-friendly identifier (e.g., backend-gaps)
 *   --title <title>   Handoff title
 *   --to <repo>       Target repository (default: PiOrchestrator)
 *   --priority <p>    Priority level (High, Medium, Low)
 *   --interactive     Run in interactive mode (prompts for input)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import chalk from 'chalk';

import type { HandoffFrontmatter, RequirementType } from './types.js';

// =============================================================================
// Constants
// =============================================================================

const TEMPLATE_PATH = 'specs/032-handoff-sentinel/contracts/handoff-template.md';
const OUTPUT_DIR = 'docs';
const DEFAULT_TO_REPO = 'PiOrchestrator';

// =============================================================================
// Template Loading
// =============================================================================

/**
 * Load the handoff template from the contracts directory
 */
async function loadTemplate(): Promise<string> {
  const templatePath = path.join(process.cwd(), TEMPLATE_PATH);

  try {
    return await fs.readFile(templatePath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to load template from ${TEMPLATE_PATH}: ${(err as Error).message}`);
  }
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate a handoff ID from feature number and slug
 */
export function generateHandoffId(featureNum: string, slug: string): string {
  // Normalize feature number to 3 digits
  const normalizedNum = featureNum.padStart(3, '0');

  // Normalize slug: lowercase, replace spaces/underscores with hyphens
  const normalizedSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${normalizedNum}-${normalizedSlug}`;
}

/**
 * Generate output filename from handoff ID
 */
export function generateFilename(handoffId: string): string {
  // Extract feature number and slug
  const [num, ...slugParts] = handoffId.split('-');
  const slug = slugParts.join('-').toUpperCase().replace(/-/g, '_');

  return `HANDOFF_${num}_${slug}.md`;
}

// =============================================================================
// Template Population
// =============================================================================

interface GenerateOptions {
  featureNum: string;
  slug: string;
  title: string;
  toRepo: string;
  priority: 'High' | 'Medium' | 'Low';
  summary?: string;
  requirements?: Array<{ type: RequirementType; description: string }>;
  acceptance?: string[];
  verification?: string[];
}

/**
 * Populate template with provided values
 */
export function populateTemplate(template: string, options: GenerateOptions): string {
  const handoffId = generateHandoffId(options.featureNum, options.slug);
  const now = new Date();
  const isoDate = now.toISOString();
  const dateOnly = isoDate.substring(0, 10);

  // Build frontmatter
  const frontmatter: Partial<HandoffFrontmatter> = {
    handoff_id: handoffId,
    direction: 'outgoing',
    from_repo: 'PiDashboard',
    to_repo: options.toRepo,
    created_at: isoDate,
    status: 'new',
    related_prs: [],
    related_commits: [],
    requires: options.requirements || [],
    acceptance: options.acceptance || [],
    verification: options.verification || [],
    risks: [],
    notes: '',
  };

  // Convert to YAML
  const yamlContent = [
    '---',
    `handoff_id: "${frontmatter.handoff_id}"`,
    `direction: ${frontmatter.direction}`,
    `from_repo: ${frontmatter.from_repo}`,
    `to_repo: ${frontmatter.to_repo}`,
    `created_at: "${frontmatter.created_at}"`,
    `status: ${frontmatter.status}`,
    'related_prs: []',
    'related_commits: []',
    formatYamlArray('requires', frontmatter.requires || []),
    formatYamlArray('acceptance', frontmatter.acceptance || []),
    formatYamlArray('verification', frontmatter.verification || []),
    'risks: []',
    'notes: ""',
    '---',
  ].join('\n');

  // Build markdown body
  const bodyContent = `
# Handoff: ${options.title}

**Date**: ${dateOnly}
**Source**: PiDashboard Feature ${options.featureNum}
**Target**: ${options.toRepo}
**Priority**: ${options.priority}

## Summary

${options.summary || '[TODO: Add 1-2 paragraphs describing what this handoff is about and why it\'s needed]'}

## Requirements

### API Changes

**Current State**:
\`\`\`
[TODO: Code/config showing current behavior]
\`\`\`

**Required State**:
\`\`\`
[TODO: Code/config showing expected behavior after changes]
\`\`\`

**Details**:
- [TODO: Add requirement details]

## Acceptance Criteria

${(options.acceptance || []).map(c => `- [ ] ${c}`).join('\n') || '- [ ] [TODO: Add acceptance criteria]'}

## Verification Steps

After implementation, verify with these commands:

\`\`\`bash
# TODO: Add verification commands
\`\`\`

## Risks

| Risk | Mitigation |
|------|------------|
| [TODO: Identify risks] | [TODO: Add mitigation] |

## Related Files

| Repository | File | Change Type |
|------------|------|-------------|
| ${options.toRepo} | \`path/to/file\` | Modify |

## Notes

[TODO: Add any additional context]

---

*Generated by Handoff Sentinel*
`;

  return yamlContent + '\n' + bodyContent;
}

/**
 * Format an array for YAML output
 */
function formatYamlArray(key: string, items: unknown[]): string {
  if (items.length === 0) {
    return `${key}: []`;
  }

  const formattedItems = items.map(item => {
    if (typeof item === 'string') {
      return `  - "${item}"`;
    } else if (typeof item === 'object' && item !== null) {
      // Handle requirement objects
      const req = item as { type: string; description: string };
      return `  - type: ${req.type}\n    description: "${req.description}"`;
    }
    return `  - ${item}`;
  });

  return `${key}:\n${formattedItems.join('\n')}`;
}

// =============================================================================
// File Writing
// =============================================================================

/**
 * Write the generated handoff to the output directory
 */
export async function writeHandoff(content: string, filename: string): Promise<string> {
  const outputPath = path.join(process.cwd(), OUTPUT_DIR, filename);

  // Check if file already exists
  try {
    await fs.access(outputPath);
    throw new Error(`File already exists: ${outputPath}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  // Ensure output directory exists
  await fs.mkdir(path.join(process.cwd(), OUTPUT_DIR), { recursive: true });

  // Write file
  await fs.writeFile(outputPath, content, 'utf-8');

  return outputPath;
}

// =============================================================================
// Interactive Mode
// =============================================================================

/**
 * Create readline interface for interactive prompts
 */
function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 */
async function prompt(rl: readline.Interface, question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? chalk.dim(` [${defaultValue}]`) : '';

  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/**
 * Run interactive mode to gather handoff information
 */
async function runInteractive(): Promise<GenerateOptions> {
  const rl = createReadline();

  console.log('');
  console.log(chalk.bold.cyan('📬 Handoff Generator'));
  console.log(chalk.dim('────────────────────────────────────'));
  console.log('');

  try {
    const featureNum = await prompt(rl, chalk.white('Feature number (e.g., 031)'));
    if (!featureNum) {
      throw new Error('Feature number is required');
    }

    const slug = await prompt(rl, chalk.white('Slug (e.g., backend-gaps)'));
    if (!slug) {
      throw new Error('Slug is required');
    }

    const title = await prompt(rl, chalk.white('Title (e.g., PiOrchestrator Backend Gaps)'));
    if (!title) {
      throw new Error('Title is required');
    }

    const toRepo = await prompt(rl, chalk.white('Target repository'), DEFAULT_TO_REPO);

    const priorityInput = await prompt(rl, chalk.white('Priority (High/Medium/Low)'), 'High');
    const priority = (['High', 'Medium', 'Low'].includes(priorityInput)
      ? priorityInput
      : 'High') as 'High' | 'Medium' | 'Low';

    const summary = await prompt(rl, chalk.white('Summary (optional, press Enter to skip)'));

    console.log('');
    console.log(chalk.dim('Requirements (press Enter when done):'));
    const requirements: Array<{ type: RequirementType; description: string }> = [];

    while (true) {
      const reqType = await prompt(rl, chalk.white('  Requirement type (api/route/ui/deploy/test/docs)'));
      if (!reqType) break;

      if (!['api', 'route', 'ui', 'deploy', 'test', 'docs'].includes(reqType)) {
        console.log(chalk.yellow('    Invalid type, try again'));
        continue;
      }

      const reqDesc = await prompt(rl, chalk.white('  Description'));
      if (reqDesc) {
        requirements.push({ type: reqType as RequirementType, description: reqDesc });
        console.log(chalk.green(`    ✓ Added ${reqType} requirement`));
      }
    }

    console.log('');
    console.log(chalk.dim('Acceptance criteria (press Enter when done):'));
    const acceptance: string[] = [];

    while (true) {
      const criterion = await prompt(rl, chalk.white('  Criterion'));
      if (!criterion) break;
      acceptance.push(criterion);
      console.log(chalk.green('    ✓ Added criterion'));
    }

    return {
      featureNum,
      slug,
      title,
      toRepo,
      priority,
      summary: summary || undefined,
      requirements: requirements.length > 0 ? requirements : undefined,
      acceptance: acceptance.length > 0 ? acceptance : undefined,
    };
  } finally {
    rl.close();
  }
}

// =============================================================================
// CLI Interface
// =============================================================================

interface CliArgs {
  feature?: string;
  slug?: string;
  title?: string;
  to?: string;
  priority?: string;
  interactive: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = { interactive: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--feature':
        result.feature = args[++i];
        break;
      case '--slug':
        result.slug = args[++i];
        break;
      case '--title':
        result.title = args[++i];
        break;
      case '--to':
        result.to = args[++i];
        break;
      case '--priority':
        result.priority = args[++i];
        break;
      case '--interactive':
      case '-i':
        result.interactive = true;
        break;
    }
  }

  return result;
}

/**
 * Main function - generate a handoff document
 */
export async function generateHandoff(options: GenerateOptions): Promise<string> {
  // Load template (for future use - currently we generate from scratch)
  await loadTemplate();

  // Generate content
  const content = populateTemplate('', options);

  // Generate filename
  const handoffId = generateHandoffId(options.featureNum, options.slug);
  const filename = generateFilename(handoffId);

  // Write file
  const outputPath = await writeHandoff(content, filename);

  return outputPath;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  try {
    let options: GenerateOptions;

    if (args.interactive || (!args.feature && !args.slug)) {
      // Interactive mode
      options = await runInteractive();
    } else {
      // CLI mode - validate required args
      if (!args.feature) {
        throw new Error('Missing required argument: --feature');
      }
      if (!args.slug) {
        throw new Error('Missing required argument: --slug');
      }
      if (!args.title) {
        throw new Error('Missing required argument: --title');
      }

      options = {
        featureNum: args.feature,
        slug: args.slug,
        title: args.title,
        toRepo: args.to || DEFAULT_TO_REPO,
        priority: (args.priority as 'High' | 'Medium' | 'Low') || 'High',
      };
    }

    // Generate handoff
    const outputPath = await generateHandoff(options);

    console.log('');
    console.log(chalk.green('✓ Handoff generated successfully'));
    console.log(chalk.dim(`  ${outputPath}`));
    console.log('');
    console.log(chalk.yellow('Next steps:'));
    console.log('  1. Edit the generated file to fill in details');
    console.log('  2. Run ' + chalk.cyan('npm run handoff:detect') + ' to verify');
    console.log('  3. Commit and push to share with target repository');
    console.log('');

    process.exit(0);
  } catch (err) {
    const error = err as Error;
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

// Run if executed directly
main();
