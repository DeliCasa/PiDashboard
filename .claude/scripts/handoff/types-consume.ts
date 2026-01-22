/**
 * Handoff Consumption Workflow - Type Definitions
 * Feature 033 - Extends Feature 032 (Handoff Sentinel) types
 * Based on data-model.md specification
 */

import type { HandoffDocument, HandoffStatus } from './types.js';

// =============================================================================
// Enums & Categories
// =============================================================================

/**
 * Implementation domain categories for prioritization.
 * Priority Order: api_client (P1) → schema (P2) → ui (P3) → logging (P4) → testing (P5) → deployment (P6)
 */
export type WorkItemCategory =
  | 'api_client'   // Routes, headers, params, error handling
  | 'schema'       // Zod schemas, TypeScript types, validation
  | 'ui'           // Components, data display, user interactions
  | 'logging'      // Telemetry, error messages, debug info
  | 'testing'      // Unit tests, integration tests, e2e tests
  | 'deployment';  // Config, environment, deployment notes

/** Consumption plan lifecycle status */
export type ConsumptionStatus =
  | 'pending'      // Not started
  | 'in_progress'  // Implementation underway
  | 'testing'      // Implementing tests
  | 'review'       // Awaiting review
  | 'done'         // Complete
  | 'blocked';     // Cannot proceed

/** Test plan item status */
export type TestStatus = 'pending' | 'written' | 'passing' | 'failing';

/** Risk severity levels */
export type RiskSeverity = 'low' | 'medium' | 'high';

/** Test category types */
export type TestCategory = 'unit' | 'integration' | 'e2e';

/** File change types */
export type ChangeType = 'create' | 'modify' | 'delete';

// =============================================================================
// Priority Mapping
// =============================================================================

/** Maps WorkItemCategory to numeric priority (1 = highest) */
export const CATEGORY_PRIORITY: Record<WorkItemCategory, number> = {
  api_client: 1,
  schema: 2,
  ui: 3,
  logging: 4,
  testing: 5,
  deployment: 6,
};

/** Maps priority number back to category */
export const PRIORITY_CATEGORY: Record<number, WorkItemCategory> = {
  1: 'api_client',
  2: 'schema',
  3: 'ui',
  4: 'logging',
  5: 'testing',
  6: 'deployment',
};

/**
 * Convert WorkItemCategory to numeric priority
 */
export function requirementCategoryToPriority(category: WorkItemCategory): number {
  return CATEGORY_PRIORITY[category];
}

/**
 * Convert numeric priority to WorkItemCategory
 */
export function priorityToCategory(priority: number): WorkItemCategory | undefined {
  return PRIORITY_CATEGORY[priority];
}

// =============================================================================
// Extracted Requirement Types
// =============================================================================

/** Source of an extracted requirement */
export interface RequirementSource {
  type: 'frontmatter' | 'content';
  field?: string;   // e.g., "requires[0]", "acceptance[2]"
  line?: number;    // For content-sourced items
}

/** A single actionable requirement extracted from a handoff */
export interface ExtractedRequirement {
  id: string;                     // Auto-generated: "REQ-001", "REQ-002"
  category: WorkItemCategory;     // Implementation domain
  description: string;            // What needs to be done
  source: RequirementSource;      // Where it came from
  priority: number;               // 1-6 based on category
  completed: boolean;             // Checklist status
  tests: string[];                // Required test descriptions
  files: string[];                // Likely impacted files
}

// =============================================================================
// Consumption Plan Types
// =============================================================================

/** YAML frontmatter for consumption plan files */
export interface ConsumptionPlanFrontmatter {
  handoff_id: string;             // Source handoff ID
  source_handoff: string;         // Path to source handoff file
  status: ConsumptionStatus;      // Plan status
  created_at: string;             // ISO 8601 timestamp
  updated_at: string;             // ISO 8601 timestamp
  requirements_total: number;     // Total requirement count
  requirements_done: number;      // Completed requirement count
  blocker_reason?: string;        // If status is blocked, explains why
  breaking_change?: boolean;      // If true, backwards-compat not required
}

/** Risk item in consumption plan */
export interface RiskItem {
  description: string;
  severity: RiskSeverity;
  mitigation: string;
}

/** Test plan item in consumption plan */
export interface TestPlanItem {
  category: TestCategory;
  description: string;
  file: string;                   // Test file path
  status: TestStatus;
}

/** File impact entry in consumption plan */
export interface FileImpact {
  path: string;
  changeType: ChangeType;
  reason: string;
}

/** Complete consumption plan document */
export interface ConsumptionPlan {
  frontmatter: ConsumptionPlanFrontmatter;
  summary: string;                // Overview from handoff
  requirements: ExtractedRequirement[];
  risks: RiskItem[];
  testPlan: TestPlanItem[];
  impactedFiles: FileImpact[];
}

// =============================================================================
// Consumption Report Types
// =============================================================================

/** YAML frontmatter for consumption report files */
export interface ConsumptionReportFrontmatter {
  handoff_id: string;             // Source handoff ID
  consumption_plan: string;       // Path to consumption plan
  status: 'done' | 'blocked';     // Final status
  completed_at: string;           // ISO 8601 timestamp
  related_commits: string[];      // Git commit hashes
  related_prs: string[];          // PR URLs
  blocker_handoff?: string;       // If blocked, outgoing handoff ID
}

/** File change entry in consumption report */
export interface FileChange {
  path: string;
  changeType: ChangeType;
  summary: string;
}

/** Change summary in consumption report */
export interface ChangeSummary {
  filesModified: FileChange[];
  testsAdded: number;
  testsModified: number;
  linesAdded: number;
  linesRemoved: number;
}

/** Verification result for a test command */
export interface VerificationResult {
  command: string;                // Verification command
  expected: string;               // Expected outcome
  actual?: string;                // Actual outcome (if run)
  passed: boolean;
}

/** Complete consumption report document */
export interface ConsumptionReport {
  frontmatter: ConsumptionReportFrontmatter;
  requestSummary: string;         // What was requested
  changesSummary: ChangeSummary;  // What was changed
  verification: VerificationResult[];
  followUps: string[];            // Any remaining items
}

// =============================================================================
// CLI Options
// =============================================================================

export interface ConsumeOptions {
  discover: boolean;
  plan?: string;                  // handoff_id to generate plan for
  complete?: { handoffId: string; reqId: string };  // Mark requirement complete
  close?: string;                 // handoff_id to close
  block?: { handoffId: string; reason: string };    // Block with reason
  verbose: boolean;
  json: boolean;
  help: boolean;
}

// =============================================================================
// Category Detection Keywords
// =============================================================================

/** Keywords for detecting requirement categories */
export const CATEGORY_KEYWORDS: Record<WorkItemCategory, string[]> = {
  api_client: [
    'route', 'endpoint', 'api', 'request', 'response', 'header', 'param',
    'fetch', 'http', 'url', 'client', 'axios', 'query', 'mutation',
  ],
  schema: [
    'schema', 'type', 'interface', 'zod', 'validation', 'dto', 'model',
    'entity', 'shape', 'field', 'property', 'struct',
  ],
  ui: [
    'component', 'ui', 'screen', 'page', 'view', 'display', 'render',
    'button', 'form', 'input', 'modal', 'dialog', 'layout',
  ],
  logging: [
    'log', 'logging', 'telemetry', 'metric', 'trace', 'debug', 'error',
    'console', 'monitor', 'observe', 'analytics',
  ],
  testing: [
    'test', 'spec', 'unit', 'integration', 'e2e', 'coverage', 'mock',
    'fixture', 'assert', 'expect', 'vitest', 'jest', 'playwright',
  ],
  deployment: [
    'deploy', 'config', 'environment', 'env', 'build', 'docker', 'ci',
    'cd', 'pipeline', 'release', 'version', 'package',
  ],
};

/** File path patterns for each category */
export const CATEGORY_FILE_PATTERNS: Record<WorkItemCategory, string[]> = {
  api_client: [
    'src/infrastructure/api/',
    'src/application/hooks/',
  ],
  schema: [
    'src/domain/types/',
    'src/infrastructure/api/schemas.ts',
  ],
  ui: [
    'src/presentation/components/',
    'src/components/',
  ],
  logging: [
    'src/infrastructure/',
    'src/lib/',
  ],
  testing: [
    'tests/',
  ],
  deployment: [
    '.github/',
    'scripts/',
  ],
};

// =============================================================================
// Status Transitions
// =============================================================================

/** Valid consumption status transitions */
export const CONSUMPTION_STATUS_TRANSITIONS: Record<ConsumptionStatus, ConsumptionStatus[]> = {
  pending: ['in_progress', 'blocked'],
  in_progress: ['testing', 'blocked', 'done'],
  testing: ['review', 'in_progress', 'blocked'],
  review: ['done', 'in_progress', 'blocked'],
  done: [],  // Terminal state
  blocked: ['in_progress', 'pending'],  // Can unblock
};

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  from: ConsumptionStatus,
  to: ConsumptionStatus
): boolean {
  return CONSUMPTION_STATUS_TRANSITIONS[from].includes(to);
}

// =============================================================================
// Discovery Types
// =============================================================================

/** Discovery result for incoming handoffs */
export interface DiscoveryResult {
  timestamp: string;
  incoming: HandoffDocument[];
  unresolved: HandoffDocument[];
  hasConsumptionPlan: Map<string, string>;  // handoff_id -> plan path
  errors: string[];
}

/** Status priority for sorting (lower = higher priority) */
export const STATUS_SORT_PRIORITY: Record<HandoffStatus, number> = {
  new: 1,
  in_progress: 2,
  blocked: 3,
  acknowledged: 4,
  done: 5,
};
