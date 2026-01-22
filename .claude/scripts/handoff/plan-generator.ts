/**
 * Handoff Consumption - Plan Generator
 * Feature 033 - Generates consumption plans from handoffs
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';
import type { HandoffDocument } from './types.js';
import type {
  ConsumptionPlan,
  ConsumptionPlanFrontmatter,
  ExtractedRequirement,
  RiskItem,
  TestPlanItem,
  FileImpact,
  ConsumptionStatus,
} from './types-consume.js';
import {
  parseHandoffToRequirements,
  extractRisks,
  detectBackwardsCompatMode,
  checkValidationRemovalWarning,
} from './extract.js';

// =============================================================================
// Plan Generation
// =============================================================================

/**
 * Generate a consumption plan from a handoff document
 */
export function generateConsumptionPlan(handoff: HandoffDocument): ConsumptionPlan {
  const now = new Date().toISOString();
  const requirements = parseHandoffToRequirements(handoff);
  const risks = extractRisks(handoff);
  const backwardsCompat = detectBackwardsCompatMode(handoff);

  // Check for validation removal warnings
  const warnings: string[] = [];
  for (const req of requirements) {
    const warning = checkValidationRemovalWarning(req.description);
    if (warning) {
      warnings.push(warning);
    }
  }

  // Add backwards compatibility risk if applicable
  if (backwardsCompat) {
    risks.push({
      description: 'Backwards compatibility is required - do not introduce breaking changes',
      severity: 'high',
      mitigation: 'Ensure all existing functionality continues to work',
    });
  }

  // Add validation warnings as risks
  for (const warning of warnings) {
    risks.push({
      description: warning,
      severity: 'high',
      mitigation: 'Update schemas to match contracts instead of removing validation',
    });
  }

  const frontmatter: ConsumptionPlanFrontmatter = {
    handoff_id: handoff.frontmatter.handoff_id,
    source_handoff: handoff.filePath,
    status: 'pending',
    created_at: now,
    updated_at: now,
    requirements_total: requirements.length,
    requirements_done: 0,
    breaking_change: !backwardsCompat,
  };

  // Generate test plan from requirements
  const testPlan = generateTestPlan(requirements);

  // Aggregate impacted files
  const impactedFiles = generateFileImpacts(requirements);

  // Generate summary from handoff
  const summary = generateSummary(handoff);

  return {
    frontmatter,
    summary,
    requirements,
    risks,
    testPlan,
    impactedFiles,
  };
}

/**
 * Generate a summary from the handoff document
 */
function generateSummary(handoff: HandoffDocument): string {
  const { frontmatter, content } = handoff;

  // Try to extract summary from content
  const lines = content.split('\n');
  const summaryLines: string[] = [];
  let inSummary = false;

  for (const line of lines) {
    // Look for summary section
    if (line.match(/^#+\s*(Summary|Overview|Description)/i)) {
      inSummary = true;
      continue;
    }
    if (inSummary && line.match(/^#+/)) {
      break; // End of summary section
    }
    if (inSummary && line.trim()) {
      summaryLines.push(line.trim());
    }
  }

  if (summaryLines.length > 0) {
    return summaryLines.slice(0, 3).join(' ');
  }

  // Fallback: use frontmatter notes or first content paragraph
  if (frontmatter.notes) {
    return frontmatter.notes;
  }

  // Extract first meaningful paragraph
  const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---/, '').trim();
  const paragraphs = contentWithoutFrontmatter.split(/\n\n+/);
  for (const para of paragraphs) {
    const clean = para.replace(/^#+.*$/gm, '').trim();
    if (clean.length > 20) {
      return clean.slice(0, 200) + (clean.length > 200 ? '...' : '');
    }
  }

  return `Implementation required for handoff ${handoff.frontmatter.handoff_id}`;
}

/**
 * Generate test plan from requirements
 */
function generateTestPlan(requirements: ExtractedRequirement[]): TestPlanItem[] {
  const testPlan: TestPlanItem[] = [];
  const seenDescriptions = new Set<string>();

  for (const req of requirements) {
    for (const testDesc of req.tests) {
      if (seenDescriptions.has(testDesc)) continue;
      seenDescriptions.add(testDesc);

      // Determine test category from description
      let category: 'unit' | 'integration' | 'e2e' = 'unit';
      if (testDesc.toLowerCase().includes('integration')) {
        category = 'integration';
      } else if (testDesc.toLowerCase().includes('e2e') || testDesc.toLowerCase().includes('end-to-end')) {
        category = 'e2e';
      } else if (testDesc.toLowerCase().includes('component')) {
        category = 'unit';
      }

      // Infer test file path
      const file = inferTestFilePath(req.category, category);

      testPlan.push({
        category,
        description: testDesc,
        file,
        status: 'pending',
      });
    }
  }

  return testPlan;
}

/**
 * Infer test file path based on category
 */
function inferTestFilePath(
  itemCategory: string,
  testCategory: 'unit' | 'integration' | 'e2e'
): string {
  if (testCategory === 'e2e') {
    return 'tests/e2e/';
  }
  if (testCategory === 'integration') {
    return 'tests/integration/';
  }

  switch (itemCategory) {
    case 'api_client':
      return 'tests/unit/api/';
    case 'schema':
      return 'tests/unit/';
    case 'ui':
      return 'tests/component/';
    default:
      return 'tests/unit/';
  }
}

/**
 * Generate file impacts from requirements
 */
function generateFileImpacts(requirements: ExtractedRequirement[]): FileImpact[] {
  const impacts = new Map<string, FileImpact>();

  for (const req of requirements) {
    for (const filePath of req.files) {
      if (!impacts.has(filePath)) {
        impacts.set(filePath, {
          path: filePath,
          changeType: 'modify',
          reason: req.description.slice(0, 100),
        });
      }
    }
  }

  return Array.from(impacts.values());
}

// =============================================================================
// Plan File I/O
// =============================================================================

/**
 * Write consumption plan to file
 */
export async function writeConsumptionPlan(
  plan: ConsumptionPlan,
  outputDir: string
): Promise<string> {
  // Ensure directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const filePath = path.join(outputDir, 'plan.md');
  const content = formatConsumptionPlan(plan);

  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Format consumption plan as markdown
 */
function formatConsumptionPlan(plan: ConsumptionPlan): string {
  const { frontmatter, summary, requirements, risks, testPlan, impactedFiles } = plan;

  // Build frontmatter
  const fm = matter.stringify('', frontmatter).trim();

  // Group requirements by priority
  const reqsByPriority = new Map<number, ExtractedRequirement[]>();
  for (const req of requirements) {
    const existing = reqsByPriority.get(req.priority) || [];
    existing.push(req);
    reqsByPriority.set(req.priority, existing);
  }

  // Build requirements section
  const priorityLabels: Record<number, string> = {
    1: 'P1: API Client Compatibility',
    2: 'P2: Schema/Types',
    3: 'P3: UI Behavior',
    4: 'P4: Telemetry/Logging',
    5: 'P5: Testing',
    6: 'P6: Deployment',
  };

  let reqsSection = '';
  for (let p = 1; p <= 6; p++) {
    const reqs = reqsByPriority.get(p);
    if (reqs && reqs.length > 0) {
      reqsSection += `\n### ${priorityLabels[p]}\n\n`;
      for (const req of reqs) {
        const checkbox = req.completed ? '[x]' : '[ ]';
        reqsSection += `- ${checkbox} **${req.id}**: ${req.description}\n`;
        if (req.files.length > 0) {
          reqsSection += `  - Files: ${req.files.map(f => `\`${f}\``).join(', ')}\n`;
        }
        if (req.tests.length > 0) {
          reqsSection += `  - Tests: ${req.tests.slice(0, 2).join('; ')}\n`;
        }
      }
    }
  }

  // Build risks section
  let risksSection = '';
  if (risks.length > 0) {
    risksSection = '\n## Risks\n\n| Risk | Severity | Mitigation |\n|------|----------|------------|\n';
    for (const risk of risks) {
      risksSection += `| ${risk.description.slice(0, 60)}... | ${risk.severity} | ${risk.mitigation.slice(0, 40)}... |\n`;
    }
  }

  // Build test plan section
  let testSection = '\n## Test Plan\n\n';
  const unitTests = testPlan.filter(t => t.category === 'unit');
  const intTests = testPlan.filter(t => t.category === 'integration');
  const e2eTests = testPlan.filter(t => t.category === 'e2e');

  if (unitTests.length > 0) {
    testSection += '### Unit Tests\n\n';
    for (const t of unitTests) {
      const checkbox = t.status === 'passing' ? '[x]' : '[ ]';
      testSection += `- ${checkbox} ${t.description} in \`${t.file}\`\n`;
    }
  }
  if (intTests.length > 0) {
    testSection += '\n### Integration Tests\n\n';
    for (const t of intTests) {
      const checkbox = t.status === 'passing' ? '[x]' : '[ ]';
      testSection += `- ${checkbox} ${t.description} in \`${t.file}\`\n`;
    }
  }
  if (e2eTests.length > 0) {
    testSection += '\n### E2E Tests\n\n';
    for (const t of e2eTests) {
      const checkbox = t.status === 'passing' ? '[x]' : '[ ]';
      testSection += `- ${checkbox} ${t.description} in \`${t.file}\`\n`;
    }
  }

  // Build impacted files section
  let filesSection = '\n## Impacted Files\n\n| File | Change Type | Reason |\n|------|-------------|--------|\n';
  for (const f of impactedFiles) {
    filesSection += `| \`${f.path}\` | ${f.changeType} | ${f.reason.slice(0, 40)}... |\n`;
  }

  // Assemble document
  const doc = `${fm}

# Consumption Plan: ${frontmatter.handoff_id}

**Source Handoff**: [${frontmatter.source_handoff}](../../${frontmatter.source_handoff})
**Created**: ${frontmatter.created_at.split('T')[0]}
**Status**: ${frontmatter.status}

## Summary

${summary}

## Requirements Checklist
${reqsSection}
${risksSection}
${testSection}
${filesSection}

---

*Generated by Handoff Consumption Workflow*
`;

  return doc;
}

// =============================================================================
// Plan Parsing
// =============================================================================

/**
 * Parse an existing consumption plan file
 */
export async function parseConsumptionPlan(filePath: string): Promise<ConsumptionPlan | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: body } = matter(content);

    const frontmatter = data as ConsumptionPlanFrontmatter;

    // Parse requirements from checklist
    const requirements = parseRequirementsFromMarkdown(body);

    // Parse risks (simplified - just count)
    const risks: RiskItem[] = [];

    // Parse test plan (simplified)
    const testPlan: TestPlanItem[] = [];

    // Parse impacted files (simplified)
    const impactedFiles: FileImpact[] = [];

    // Extract summary
    const summaryMatch = body.match(/## Summary\s*\n\n([^\n#]+)/);
    const summary = summaryMatch ? summaryMatch[1].trim() : '';

    return {
      frontmatter,
      summary,
      requirements,
      risks,
      testPlan,
      impactedFiles,
    };
  } catch {
    return null;
  }
}

/**
 * Parse requirements from markdown checklist
 */
function parseRequirementsFromMarkdown(content: string): ExtractedRequirement[] {
  const requirements: ExtractedRequirement[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match: - [ ] **REQ-001**: Description or - [x] **REQ-001**: Description
    const match = line.match(/^-\s*\[([ xX])\]\s*\*\*([A-Z]+-\d+)\*\*:\s*(.+)$/);
    if (match) {
      const completed = match[1].toLowerCase() === 'x';
      const id = match[2];
      const description = match[3].trim();

      requirements.push({
        id,
        category: 'api_client', // Will be recategorized if needed
        description,
        source: { type: 'content' },
        priority: 1,
        completed,
        tests: [],
        files: [],
      });
    }
  }

  return requirements;
}

/**
 * Write updated consumption plan
 */
export async function writeUpdatedPlan(
  plan: ConsumptionPlan,
  filePath: string
): Promise<void> {
  const content = formatConsumptionPlan(plan);
  await fs.writeFile(filePath, content, 'utf-8');
}

// =============================================================================
// Plan Status Updates
// =============================================================================

/**
 * Update plan frontmatter with new values
 */
export function updatePlanFrontmatter(
  plan: ConsumptionPlan,
  updates: Partial<ConsumptionPlanFrontmatter>
): ConsumptionPlan {
  return {
    ...plan,
    frontmatter: {
      ...plan.frontmatter,
      ...updates,
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Calculate auto-transition status based on progress
 */
export function calculateAutoStatus(plan: ConsumptionPlan): ConsumptionStatus {
  const { requirements_total, requirements_done } = plan.frontmatter;

  if (requirements_done === 0) {
    return 'pending';
  }
  if (requirements_done < requirements_total) {
    return 'in_progress';
  }
  // All requirements done - move to testing
  return 'testing';
}
