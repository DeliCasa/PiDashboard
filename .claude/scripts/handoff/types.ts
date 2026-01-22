/**
 * Handoff Sentinel - Type Definitions
 * Based on data-model.md specification
 */

// =============================================================================
// Enums
// =============================================================================

/** Handoff direction - incoming to or outgoing from this repo */
export type HandoffDirection = 'incoming' | 'outgoing';

/** Handoff lifecycle status */
export type HandoffStatus = 'new' | 'acknowledged' | 'in_progress' | 'done' | 'blocked';

/** Requirement type categories */
export type RequirementType = 'api' | 'route' | 'ui' | 'deploy' | 'test' | 'docs';

/** Validation error codes */
export enum ErrorCode {
  INVALID_YAML = 'INVALID_YAML',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_ENUM = 'INVALID_ENUM',
  DUPLICATE_ID = 'DUPLICATE_ID',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  INVALID_TRANSITION = 'INVALID_TRANSITION',
}

// =============================================================================
// Entities
// =============================================================================

/** Requirement object within a handoff */
export interface Requirement {
  type: RequirementType;
  description: string;
}

/** Handoff document frontmatter */
export interface HandoffFrontmatter {
  handoff_id: string;
  direction: HandoffDirection;
  from_repo: string;
  to_repo: string;
  created_at: string;
  status: HandoffStatus;
  related_prs?: string[];
  related_commits?: string[];
  requires?: Requirement[];
  acceptance?: string[];
  verification?: string[];
  risks?: string[];
  notes?: string;
}

/** Complete handoff document including content */
export interface HandoffDocument {
  frontmatter: HandoffFrontmatter;
  content: string;
  filePath: string;
}

/** Entry in the seen handoffs state */
export interface SeenEntry {
  status: HandoffStatus;
  lastSeen: string;
  contentHash: string;
}

/** Detection state persisted to .handoff-state.json */
export interface HandoffState {
  version: number;
  lastRun: string;
  seen: Record<string, SeenEntry>;
}

/** Validation error encountered during parsing */
export interface ValidationError {
  file: string;
  line?: number;
  field?: string;
  message: string;
  code: ErrorCode;
}

/** Summary statistics from detection */
export interface DetectionSummary {
  total: number;
  new: number;
  inProgress: number;
  blocked: number;
  done: number;
  acknowledged: number;
}

/** Complete detection result */
export interface DetectionResult {
  timestamp: string;
  handoffs: HandoffDocument[];
  pending: HandoffDocument[];
  newSinceLastRun: HandoffDocument[];
  errors: ValidationError[];
  summary: DetectionSummary;
}

// =============================================================================
// CLI Options
// =============================================================================

export interface DetectOptions {
  quiet: boolean;
  verbose: boolean;
  strict: boolean;
  json: boolean;
}

export interface GenerateOptions {
  featureNumber?: string;
  slug?: string;
  summary?: string;
  outputDir?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Default paths to scan for handoff documents */
export const DEFAULT_HANDOFF_PATTERNS = [
  'docs/HANDOFF_*.md',
  'docs/handoffs/**/*.md',
  'specs/**/HANDOFF*.md',
  'specs/**/handoff*.md',
] as const;

/** Repository names for validation */
export const VALID_REPOS = ['PiDashboard', 'PiOrchestrator'] as const;

/** Status values that require attention */
export const PENDING_STATUSES: HandoffStatus[] = ['new', 'in_progress', 'blocked'];

/** Status values that are considered complete/silent */
export const COMPLETE_STATUSES: HandoffStatus[] = ['done', 'acknowledged'];

/** Valid status transitions */
export const VALID_TRANSITIONS: Record<HandoffStatus, HandoffStatus[]> = {
  new: ['acknowledged', 'in_progress', 'blocked'],
  acknowledged: ['in_progress', 'blocked', 'done'],
  in_progress: ['done', 'blocked'],
  blocked: ['in_progress', 'done'],
  done: [], // Terminal state
};
