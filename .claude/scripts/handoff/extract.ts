/**
 * Handoff Consumption - Requirement Extraction & Categorization
 * Feature 033 - Extracts actionable requirements from handoffs
 */

import type { HandoffDocument } from './types.js';
import type {
  ExtractedRequirement,
  WorkItemCategory,
  RiskItem,
} from './types-consume.js';
import {
  CATEGORY_KEYWORDS,
  CATEGORY_FILE_PATTERNS,
  requirementCategoryToPriority,
} from './types-consume.js';

// =============================================================================
// Requirement Extraction
// =============================================================================

/**
 * Parse a handoff document and extract actionable requirements
 */
export function parseHandoffToRequirements(handoff: HandoffDocument): ExtractedRequirement[] {
  const requirements: ExtractedRequirement[] = [];
  let reqCounter = 1;

  const { frontmatter, content } = handoff;

  // Extract from frontmatter.requires
  if (frontmatter.requires && Array.isArray(frontmatter.requires)) {
    for (let i = 0; i < frontmatter.requires.length; i++) {
      const req = frontmatter.requires[i];
      const category = categorizeRequirement(req.description);
      const id = generateRequirementId(reqCounter++);

      requirements.push({
        id,
        category,
        description: req.description,
        source: { type: 'frontmatter', field: `requires[${i}]` },
        priority: requirementCategoryToPriority(category),
        completed: false,
        tests: inferTestsForRequirement(category, req.description),
        files: inferImpactedFiles(category),
      });
    }
  }

  // Extract from frontmatter.acceptance
  if (frontmatter.acceptance && Array.isArray(frontmatter.acceptance)) {
    for (let i = 0; i < frontmatter.acceptance.length; i++) {
      const acceptance = frontmatter.acceptance[i];
      const category = categorizeRequirement(acceptance);
      const id = generateRequirementId(reqCounter++);

      requirements.push({
        id,
        category,
        description: acceptance,
        source: { type: 'frontmatter', field: `acceptance[${i}]` },
        priority: requirementCategoryToPriority(category),
        completed: false,
        tests: inferTestsForRequirement(category, acceptance),
        files: inferImpactedFiles(category),
      });
    }
  }

  // Extract from content - look for requirement patterns
  const contentRequirements = extractRequirementsFromContent(content);
  for (const { description, line } of contentRequirements) {
    const category = categorizeRequirement(description);
    const id = generateRequirementId(reqCounter++);

    requirements.push({
      id,
      category,
      description,
      source: { type: 'content', line },
      priority: requirementCategoryToPriority(category),
      completed: false,
      tests: inferTestsForRequirement(category, description),
      files: inferImpactedFiles(category),
    });
  }

  // Sort by priority
  return requirements.sort((a, b) => a.priority - b.priority);
}

/**
 * Extract requirements from markdown content
 * Looks for checklist items, numbered lists, and requirement patterns
 */
function extractRequirementsFromContent(content: string): Array<{ description: string; line: number }> {
  const requirements: Array<{ description: string; line: number }> = [];
  const lines = content.split('\n');

  // Skip frontmatter section
  let inFrontmatter = false;
  let frontmatterEnd = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
      } else {
        frontmatterEnd = i;
        break;
      }
    }
  }

  // Look for requirement patterns after frontmatter
  for (let i = frontmatterEnd + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Checklist items: - [ ] or * [ ]
    const checklistMatch = line.match(/^[-*]\s*\[\s*[xX ]?\s*\]\s*(.+)$/);
    if (checklistMatch) {
      requirements.push({ description: checklistMatch[1].trim(), line: i + 1 });
      continue;
    }

    // Numbered items with "must", "should", "shall"
    const numberedMatch = line.match(/^\d+\.\s*(.+(?:must|should|shall|need).+)$/i);
    if (numberedMatch) {
      requirements.push({ description: numberedMatch[1].trim(), line: i + 1 });
      continue;
    }

    // Lines starting with requirement keywords
    const reqMatch = line.match(/^(?:Requirement|REQ|Task|TODO|Action):\s*(.+)$/i);
    if (reqMatch) {
      requirements.push({ description: reqMatch[1].trim(), line: i + 1 });
    }
  }

  return requirements;
}

// =============================================================================
// Categorization
// =============================================================================

/**
 * Categorize a requirement based on keywords
 */
export function categorizeRequirement(description: string): WorkItemCategory {
  const lowerDesc = description.toLowerCase();

  // Score each category based on keyword matches
  const scores: Record<WorkItemCategory, number> = {
    api_client: 0,
    schema: 0,
    ui: 0,
    logging: 0,
    testing: 0,
    deployment: 0,
  };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [WorkItemCategory, string[]][]) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        scores[category]++;
      }
    }
  }

  // Find category with highest score
  let maxScore = 0;
  let bestCategory: WorkItemCategory = 'api_client'; // Default

  for (const [category, score] of Object.entries(scores) as [WorkItemCategory, number][]) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Assign priority based on category
 */
export function assignPriorities(requirements: ExtractedRequirement[]): ExtractedRequirement[] {
  return requirements.map(req => ({
    ...req,
    priority: requirementCategoryToPriority(req.category),
  }));
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate a requirement ID (REQ-001, REQ-002, etc.)
 */
export function generateRequirementId(counter: number): string {
  return `REQ-${counter.toString().padStart(3, '0')}`;
}

// =============================================================================
// File Impact Inference
// =============================================================================

/**
 * Infer impacted files based on category
 */
export function inferImpactedFiles(category: WorkItemCategory): string[] {
  return CATEGORY_FILE_PATTERNS[category] || [];
}

/**
 * Infer test descriptions for a requirement
 */
function inferTestsForRequirement(category: WorkItemCategory, description: string): string[] {
  const tests: string[] = [];

  switch (category) {
    case 'api_client':
      tests.push(`Unit test: ${description} - route builder`);
      tests.push(`Unit test: ${description} - response parsing`);
      break;
    case 'schema':
      tests.push(`Unit test: ${description} - valid data`);
      tests.push(`Unit test: ${description} - invalid data rejection`);
      break;
    case 'ui':
      tests.push(`Component test: ${description} - renders correctly`);
      break;
    case 'logging':
      tests.push(`Unit test: ${description} - log output verification`);
      break;
    case 'testing':
      // Meta: tests for testing infrastructure
      tests.push(`Integration test: ${description}`);
      break;
    case 'deployment':
      tests.push(`Integration test: ${description} - config validation`);
      break;
  }

  return tests;
}

// =============================================================================
// Risk Extraction
// =============================================================================

/**
 * Extract risks from handoff frontmatter
 */
export function extractRisks(handoff: HandoffDocument): RiskItem[] {
  const risks: RiskItem[] = [];

  if (handoff.frontmatter.risks && Array.isArray(handoff.frontmatter.risks)) {
    for (const risk of handoff.frontmatter.risks) {
      risks.push({
        description: risk,
        severity: inferRiskSeverity(risk),
        mitigation: 'Review and address before implementation',
      });
    }
  }

  return risks;
}

/**
 * Infer risk severity from description
 */
function inferRiskSeverity(description: string): 'low' | 'medium' | 'high' {
  const lower = description.toLowerCase();

  if (lower.includes('breaking') || lower.includes('critical') || lower.includes('security')) {
    return 'high';
  }
  if (lower.includes('performance') || lower.includes('compatibility') || lower.includes('migration')) {
    return 'medium';
  }
  return 'low';
}

// =============================================================================
// Backwards Compatibility Detection (FR-011)
// =============================================================================

/**
 * Detect if backwards compatibility mode is required
 * Returns true if breaking changes are NOT authorized
 */
export function detectBackwardsCompatMode(handoff: HandoffDocument): boolean {
  const { frontmatter, content } = handoff;

  // Check for explicit breaking_change flag in frontmatter
  // @ts-expect-error - breaking_change may exist as custom field
  if (frontmatter.breaking_change === true) {
    return false; // Breaking changes authorized
  }

  // Check content for breaking change authorization patterns
  const lowerContent = content.toLowerCase();
  const breakingPatterns = [
    'breaking change authorized',
    'breaking changes allowed',
    'backwards compatibility not required',
    'no backwards compatibility',
  ];

  for (const pattern of breakingPatterns) {
    if (lowerContent.includes(pattern)) {
      return false; // Breaking changes authorized
    }
  }

  // Default: backwards compatibility required
  return true;
}

// =============================================================================
// Validation Guard (FR-012)
// =============================================================================

/**
 * Check if a requirement suggests removing validation (FR-012 guard)
 * Returns warning message if found, null otherwise
 */
export function checkValidationRemovalWarning(description: string): string | null {
  const lowerDesc = description.toLowerCase();

  const dangerPatterns = [
    'remove validation',
    'skip validation',
    'disable validation',
    'remove schema',
    'delete validation',
    'bypass validation',
  ];

  for (const pattern of dangerPatterns) {
    if (lowerDesc.includes(pattern)) {
      return `WARNING: Requirement suggests "${pattern}". Per FR-012, validation MUST NOT be removed - schemas should be updated to match contracts instead.`;
    }
  }

  return null;
}
