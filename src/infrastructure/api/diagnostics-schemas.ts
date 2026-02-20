/**
 * Zod API Validation Schemas - Diagnostics
 * Feature: 038-dev-observability-panels (original)
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Runtime schema validation for diagnostics API responses.
 * Validates health checks, sessions, and evidence data.
 * Schemas match PiOrchestrator Go struct JSON tags (Constitution II.A).
 */

import { z } from 'zod';

// ============================================================================
// Service Health Schemas
// ============================================================================

/**
 * Service health status enum
 */
export const ServiceStatusSchema = z.enum([
  'healthy',
  'degraded',
  'unhealthy',
  'timeout',
  'unknown',
]);

export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;

/**
 * Service name identifiers
 */
export const ServiceNameSchema = z.enum([
  'bridgeserver',
  'piorchestrator',
  'minio',
]);

export type ServiceName = z.infer<typeof ServiceNameSchema>;

/**
 * Check result for sub-checks (database, storage, etc.)
 */
export const CheckResultSchema = z.object({
  status: z.enum(['healthy', 'error']),
  message: z.string().optional(),
});

export type CheckResult = z.infer<typeof CheckResultSchema>;

/**
 * Service health response schema
 */
export const ServiceHealthSchema = z.object({
  service_name: ServiceNameSchema,
  status: ServiceStatusSchema,
  last_checked: z.string(),
  response_time_ms: z.number().nonnegative().optional(),
  error_message: z.string().optional(),
  checks: z.record(CheckResultSchema).optional(),
});

export type ServiceHealth = z.infer<typeof ServiceHealthSchema>;

/**
 * BridgeServer health response (from /health/ready)
 */
export const BridgeServerHealthResponseSchema = z.object({
  status: z.enum(['healthy', 'not_ready', 'unhealthy']),
  timestamp: z.string(),
  checks: z.record(CheckResultSchema).optional(),
});

export type BridgeServerHealthResponse = z.infer<typeof BridgeServerHealthResponseSchema>;

/**
 * Storage health response (from /health/storage)
 */
export const StorageHealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string(),
  buckets: z.array(z.object({
    name: z.string(),
    accessible: z.boolean(),
  })).optional(),
  error: z.string().optional(),
});

export type StorageHealthResponse = z.infer<typeof StorageHealthResponseSchema>;

/**
 * All health checks aggregated response
 */
export const AllHealthChecksSchema = z.object({
  services: z.array(ServiceHealthSchema),
  last_refresh: z.string(),
});

export type AllHealthChecks = z.infer<typeof AllHealthChecksSchema>;

// ============================================================================
// Session Schemas (V1 — matches PiOrchestrator Go structs)
// ============================================================================

/**
 * Session status enum (PiOrchestrator values)
 */
export const SessionStatusSchema = z.enum(['active', 'complete', 'partial', 'failed']);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * Last error nested object for failed sessions
 */
export const LastErrorSchema = z.object({
  phase: z.string(),
  failure_reason: z.string(),
  device_id: z.string(),
  occurred_at: z.string(),
  correlation_id: z.string().optional(),
});

export type LastError = z.infer<typeof LastErrorSchema>;

/**
 * Session diagnostic entry (V1 response shape from PiOrchestrator)
 */
export const SessionSchema = z.object({
  session_id: z.string().min(1),
  container_id: z.string().min(1),
  started_at: z.string(),
  status: SessionStatusSchema,
  total_captures: z.number().int().min(0),
  successful_captures: z.number().int().min(0),
  failed_captures: z.number().int().min(0),
  has_before_open: z.boolean(),
  has_after_close: z.boolean(),
  pair_complete: z.boolean(),
  last_error: LastErrorSchema.optional(),
  elapsed_seconds: z.number().int().min(0),
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Session with derived is_stale field (client-side)
 */
export const SessionWithStaleSchema = SessionSchema.extend({
  is_stale: z.boolean().optional(),
});

export type SessionWithStale = z.infer<typeof SessionWithStaleSchema>;

/**
 * Session list API response (V1 envelope from PiOrchestrator)
 */
export const SessionListResponseSchema = z.object({
  success: z.boolean(),
  status: z.string().optional(),
  data: z.object({
    sessions: z.array(SessionSchema),
    total: z.number().int().optional(),
    queried_at: z.string().optional(),
  }),
  timestamp: z.string().optional(),
});

export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

// ============================================================================
// Evidence Capture Schemas (V1 — matches PiOrchestrator Go structs)
// ============================================================================

/**
 * Capture tag enum (evidence capture phase)
 */
export const CaptureTagSchema = z.enum([
  'BEFORE_OPEN',
  'AFTER_OPEN',
  'BEFORE_CLOSE',
  'AFTER_CLOSE',
]);

export type CaptureTag = z.infer<typeof CaptureTagSchema>;

/**
 * Capture status enum
 */
export const CaptureStatusSchema = z.enum(['captured', 'failed', 'timeout']);

export type CaptureStatus = z.infer<typeof CaptureStatusSchema>;

/**
 * Upload status enum
 */
export const UploadStatusSchema = z.enum(['uploaded', 'failed', 'unverified']);

export type UploadStatus = z.infer<typeof UploadStatusSchema>;

/**
 * Evidence capture entry (V1 response shape from PiOrchestrator)
 */
export const CaptureEntrySchema = z.object({
  evidence_id: z.string().min(1),
  capture_tag: CaptureTagSchema,
  status: CaptureStatusSchema,
  failure_reason: z.string().optional(),
  device_id: z.string(),
  container_id: z.string(),
  session_id: z.string(),
  created_at: z.string(),
  image_data: z.string().optional(),
  content_type: z.string().optional(),
  image_size_bytes: z.number().int().optional(),
  object_key: z.string().optional(),
  upload_status: UploadStatusSchema.optional(),
  upload_error: z.string().optional(),
});

export type CaptureEntry = z.infer<typeof CaptureEntrySchema>;

/**
 * Evidence summary (included in session evidence response)
 */
export const EvidenceSummarySchema = z.object({
  total_captures: z.number().int().min(0),
  successful_captures: z.number().int().min(0),
  failed_captures: z.number().int().min(0),
  has_before_open: z.boolean(),
  has_after_close: z.boolean(),
  pair_complete: z.boolean(),
});

export type EvidenceSummary = z.infer<typeof EvidenceSummarySchema>;

/**
 * Session evidence API response (V1 envelope from PiOrchestrator)
 */
export const SessionEvidenceResponseSchema = z.object({
  success: z.boolean(),
  status: z.string().optional(),
  data: z.object({
    session_id: z.string(),
    container_id: z.string(),
    captures: z.array(CaptureEntrySchema),
    summary: EvidenceSummarySchema,
  }),
  timestamp: z.string().optional(),
});

export type SessionEvidenceResponse = z.infer<typeof SessionEvidenceResponseSchema>;

// ============================================================================
// Evidence Pair Schemas (V1 — structured before/after)
// ============================================================================

/**
 * Pair status enum
 */
export const PairStatusSchema = z.enum(['complete', 'incomplete', 'missing']);

export type PairStatus = z.infer<typeof PairStatusSchema>;

/**
 * Capture slot — extends CaptureEntry with optional pair-specific fields
 */
export const CaptureSlotSchema = CaptureEntrySchema.extend({
  missing_reason: z.string().optional(),
  failure_detail: z.string().optional(),
  captured_at: z.string().optional(),
});

export type CaptureSlot = z.infer<typeof CaptureSlotSchema>;

/**
 * Evidence pair (structured before/after for a session)
 */
export const EvidencePairSchema = z.object({
  contract_version: z.literal('v1'),
  session_id: z.string(),
  container_id: z.string(),
  pair_status: PairStatusSchema,
  before: CaptureSlotSchema.nullable(),
  after: CaptureSlotSchema.nullable(),
  queried_at: z.string(),
  retry_after_seconds: z.number().optional(),
});

export type EvidencePair = z.infer<typeof EvidencePairSchema>;

/**
 * Evidence pair API response (V1 envelope)
 */
export const EvidencePairResponseSchema = z.object({
  success: z.boolean(),
  status: z.string().optional(),
  data: EvidencePairSchema,
  timestamp: z.string().optional(),
});

export type EvidencePairResponse = z.infer<typeof EvidencePairResponseSchema>;

// ============================================================================
// Aggregate View Model Schemas
// ============================================================================

/**
 * Diagnostics page state schema
 */
export const DiagnosticsStateSchema = z.object({
  services: z.array(ServiceHealthSchema),
  sessions: z.array(SessionWithStaleSchema),
  last_refresh: z.string(),
  is_refreshing: z.boolean(),
});

export type DiagnosticsState = z.infer<typeof DiagnosticsStateSchema>;
