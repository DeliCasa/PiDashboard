/**
 * Handoff Sentinel - Validation
 * Zod schema and validation functions for handoff documents
 */

import { z } from 'zod';
import type {
  HandoffDocument,
  HandoffFrontmatter,
  HandoffStatus,
  ValidationError,
} from './types.js';
import { ErrorCode, VALID_TRANSITIONS } from './types.js';

// =============================================================================
// Zod Schemas (from contracts/handoff-schema.yaml)
// =============================================================================

/** Requirement object schema */
const RequirementSchema = z.object({
  type: z.enum(['api', 'route', 'ui', 'deploy', 'test', 'docs']),
  description: z.string().min(1),
});

/** Handoff frontmatter schema */
export const HandoffFrontmatterSchema = z.object({
  handoff_id: z
    .string()
    .regex(/^\d{3}-[a-z][a-z0-9-]*$/, 'Must match pattern NNN-slug (e.g., 031-backend-gaps)'),
  direction: z.enum(['incoming', 'outgoing']),
  from_repo: z.string().min(1),
  to_repo: z.string().min(1),
  created_at: z.string().min(1), // Allow flexible date formats
  status: z.enum(['new', 'acknowledged', 'in_progress', 'done', 'blocked']),
  related_prs: z.array(z.string()).optional().default([]),
  related_commits: z.array(z.string()).optional().default([]),
  requires: z.array(RequirementSchema).optional().default([]),
  acceptance: z.array(z.string()).optional().default([]),
  verification: z.array(z.string()).optional().default([]),
  risks: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(''),
}).refine(
  (data) => {
    // Outgoing handoffs must be from PiDashboard
    if (data.direction === 'outgoing') {
      return data.from_repo === 'PiDashboard';
    }
    return true;
  },
  { message: 'Outgoing handoffs must have from_repo = PiDashboard' }
).refine(
  (data) => {
    // Incoming handoffs must be to PiDashboard
    if (data.direction === 'incoming') {
      return data.to_repo === 'PiDashboard';
    }
    return true;
  },
  { message: 'Incoming handoffs must have to_repo = PiDashboard' }
);

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate a handoff document's frontmatter
 */
export function validateHandoff(doc: HandoffDocument): ValidationError[] {
  const errors: ValidationError[] = [];
  const result = HandoffFrontmatterSchema.safeParse(doc.frontmatter);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        file: doc.filePath,
        field: issue.path.join('.'),
        message: issue.message,
        code: getErrorCode(issue),
      });
    }
  }

  return errors;
}

/**
 * Check for duplicate handoff IDs across documents
 */
export function checkDuplicateIds(docs: HandoffDocument[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const idMap = new Map<string, string[]>();

  for (const doc of docs) {
    const id = doc.frontmatter.handoff_id;
    if (!id) continue;

    const existing = idMap.get(id) || [];
    existing.push(doc.filePath);
    idMap.set(id, existing);
  }

  for (const [id, files] of idMap.entries()) {
    if (files.length > 1) {
      for (const file of files) {
        errors.push({
          file,
          field: 'handoff_id',
          message: `Duplicate handoff_id "${id}" also found in: ${files.filter(f => f !== file).join(', ')}`,
          code: ErrorCode.DUPLICATE_ID,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate a status transition
 */
export function validateStatusTransition(
  fromStatus: HandoffStatus,
  toStatus: HandoffStatus
): { valid: boolean; error?: string } {
  // Same status is always valid (no change)
  if (fromStatus === toStatus) {
    return { valid: true };
  }

  const allowedTransitions = VALID_TRANSITIONS[fromStatus];

  if (!allowedTransitions.includes(toStatus)) {
    return {
      valid: false,
      error: `Invalid transition from "${fromStatus}" to "${toStatus}". Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
    };
  }

  return { valid: true };
}

/**
 * Map Zod issue to our error code
 */
function getErrorCode(issue: z.ZodIssue): ErrorCode {
  switch (issue.code) {
    case 'invalid_type':
      return ErrorCode.INVALID_FORMAT;
    case 'invalid_enum_value':
      return ErrorCode.INVALID_ENUM;
    case 'invalid_string':
      return ErrorCode.INVALID_FORMAT;
    case 'custom':
      return ErrorCode.INVALID_FORMAT;
    default:
      if (issue.message?.includes('Required')) {
        return ErrorCode.MISSING_FIELD;
      }
      return ErrorCode.INVALID_FORMAT;
  }
}

/**
 * Type guard to check if frontmatter is valid
 */
export function isValidFrontmatter(data: unknown): data is HandoffFrontmatter {
  return HandoffFrontmatterSchema.safeParse(data).success;
}
