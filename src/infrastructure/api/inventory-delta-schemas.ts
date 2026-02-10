/**
 * Inventory Delta Zod Schemas
 * Feature: 047-inventory-delta-viewer
 *
 * Contract-first validation schemas for inventory analysis API responses.
 * All field names use snake_case matching Go JSON tags.
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const AnalysisStatusSchema = z.enum([
  'pending',
  'completed',
  'needs_review',
  'approved',
  'failed',
]);
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

export const ItemConditionSchema = z.enum([
  'excellent',
  'good',
  'fair',
  'poor',
  'expired',
  'unknown',
]);
export type ItemCondition = z.infer<typeof ItemConditionSchema>;

export const ReviewActionSchema = z.enum(['approve', 'override']);
export type ReviewAction = z.infer<typeof ReviewActionSchema>;

// ============================================================================
// Value Objects
// ============================================================================

export const BoundingBoxSchema = z.object({
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

// ============================================================================
// Entities
// ============================================================================

export const InventoryItemSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  quantity: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  bounding_box: BoundingBoxSchema.optional(),
  condition: ItemConditionSchema.optional(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const DeltaEntrySchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  before_count: z.number().int().nonnegative(),
  after_count: z.number().int().nonnegative(),
  change: z.number().int(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().optional(),
});
export type DeltaEntry = z.infer<typeof DeltaEntrySchema>;

export const OverlayItemSchema = z.object({
  label: z.string(),
  bounding_box: BoundingBoxSchema,
  confidence: z.number().min(0).max(1).optional(),
});
export type OverlayItem = z.infer<typeof OverlayItemSchema>;

export const OverlayDataSchema = z.object({
  before: z.array(OverlayItemSchema).optional(),
  after: z.array(OverlayItemSchema).optional(),
});
export type OverlayData = z.infer<typeof OverlayDataSchema>;

export const EvidenceImagesSchema = z.object({
  before_image_url: z.string().optional(),
  after_image_url: z.string().optional(),
  overlays: OverlayDataSchema.optional(),
});
export type EvidenceImages = z.infer<typeof EvidenceImagesSchema>;

export const ReviewCorrectionSchema = z.object({
  name: z.string().min(1),
  sku: z.string().nullable().optional(),
  original_count: z.number().int().nonnegative(),
  corrected_count: z.number().int().nonnegative(),
  added: z.boolean().optional(),
  removed: z.boolean().optional(),
});
export type ReviewCorrection = z.infer<typeof ReviewCorrectionSchema>;

export const ReviewSchema = z.object({
  reviewer_id: z.string(),
  action: ReviewActionSchema,
  corrections: z.array(ReviewCorrectionSchema).optional(),
  notes: z.string().optional(),
  reviewed_at: z.string(),
});
export type Review = z.infer<typeof ReviewSchema>;

export const AnalysisMetadataSchema = z.object({
  provider: z.string(),
  processing_time_ms: z.number().optional(),
  model_version: z.string().optional(),
  error_message: z.string().optional(),
  created_at: z.string(),
  completed_at: z.string().optional(),
});
export type AnalysisMetadata = z.infer<typeof AnalysisMetadataSchema>;

// ============================================================================
// Main Entity
// ============================================================================

export const InventoryAnalysisRunSchema = z.object({
  run_id: z.string().min(1),
  session_id: z.string().min(1),
  container_id: z.string().min(1),
  status: AnalysisStatusSchema,
  items_before: z.array(InventoryItemSchema).nullable().optional(),
  items_after: z.array(InventoryItemSchema).nullable().optional(),
  delta: z.array(DeltaEntrySchema).nullable().optional(),
  evidence: EvidenceImagesSchema.nullable().optional(),
  review: ReviewSchema.nullable().optional(),
  metadata: AnalysisMetadataSchema,
});
export type InventoryAnalysisRun = z.infer<typeof InventoryAnalysisRunSchema>;

// ============================================================================
// Response Envelopes
// ============================================================================

export const InventoryLatestResponseSchema = z.object({
  success: z.boolean(),
  data: InventoryAnalysisRunSchema.optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean().optional(),
      retry_after_seconds: z.number().optional(),
    })
    .optional(),
  timestamp: z.string().optional(),
  request_id: z.string().optional(),
});
export type InventoryLatestResponse = z.infer<typeof InventoryLatestResponseSchema>;

// ============================================================================
// Request Schemas
// ============================================================================

export const SubmitReviewRequestSchema = z.object({
  action: ReviewActionSchema,
  corrections: z.array(ReviewCorrectionSchema).optional(),
  notes: z.string().optional(),
});
export type SubmitReviewRequest = z.infer<typeof SubmitReviewRequestSchema>;

export const ReviewResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      run_id: z.string(),
      status: AnalysisStatusSchema,
      review: ReviewSchema,
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean().optional(),
    })
    .optional(),
  timestamp: z.string().optional(),
});
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

// ============================================================================
// Run List (Feature 048)
// ============================================================================

export const DeltaSummarySchema = z.object({
  total_items: z.number().nonnegative(),
  items_changed: z.number().nonnegative(),
  items_added: z.number().nonnegative(),
  items_removed: z.number().nonnegative(),
});
export type DeltaSummary = z.infer<typeof DeltaSummarySchema>;

export const RunListItemSchema = z.object({
  run_id: z.string().min(1),
  session_id: z.string().min(1),
  container_id: z.string().min(1),
  status: AnalysisStatusSchema,
  delta_summary: DeltaSummarySchema.nullable().optional(),
  metadata: AnalysisMetadataSchema,
});
export type RunListItem = z.infer<typeof RunListItemSchema>;

export const InventoryPaginationSchema = z.object({
  total: z.number().nonnegative(),
  limit: z.number().positive(),
  offset: z.number().nonnegative(),
  has_more: z.boolean(),
});
export type InventoryPagination = z.infer<typeof InventoryPaginationSchema>;

export const RunListDataSchema = z.object({
  runs: z.array(RunListItemSchema),
  pagination: InventoryPaginationSchema,
});
export type RunListData = z.infer<typeof RunListDataSchema>;

export const RunListResponseSchema = z.object({
  success: z.boolean(),
  data: RunListDataSchema.optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean().optional(),
      retry_after_seconds: z.number().optional(),
    })
    .optional(),
  timestamp: z.string().optional(),
  request_id: z.string().optional(),
});
export type RunListResponse = z.infer<typeof RunListResponseSchema>;

export interface RunListFilters {
  limit?: number;
  offset?: number;
  status?: AnalysisStatus;
}
