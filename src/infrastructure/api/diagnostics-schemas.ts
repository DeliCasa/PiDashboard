/**
 * Zod API Validation Schemas - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Runtime schema validation for diagnostics API responses.
 * Validates health checks, sessions, and evidence data.
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
// Session Schemas
// ============================================================================

/**
 * Session status enum
 */
export const SessionStatusSchema = z.enum(['active', 'completed', 'cancelled']);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * Session entity schema
 */
export const SessionSchema = z.object({
  id: z.string().min(1),
  delivery_id: z.string().optional(),
  started_at: z.string(),
  status: SessionStatusSchema,
  capture_count: z.number().int().min(0),
  last_capture_at: z.string().optional(),
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Session with derived is_stale field
 */
export const SessionWithStaleSchema = SessionSchema.extend({
  is_stale: z.boolean().optional(),
});

export type SessionWithStale = z.infer<typeof SessionWithStaleSchema>;

/**
 * Session list API response (from BridgeServer)
 */
export const SessionListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    sessions: z.array(SessionSchema),
  }),
});

export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

/**
 * Session detail API response (from BridgeServer)
 */
export const SessionDetailResponseSchema = z.object({
  success: z.boolean(),
  data: SessionSchema,
});

export type SessionDetailResponse = z.infer<typeof SessionDetailResponseSchema>;

// ============================================================================
// Evidence Capture Schemas
// ============================================================================

/**
 * Camera ID pattern: espcam-XXXXXX (6 hex chars)
 */
const CAMERA_ID_PATTERN = /^espcam-[0-9a-f]{6}$/i;

/**
 * Evidence capture entity schema
 */
export const EvidenceCaptureSchema = z.object({
  id: z.string().min(1),
  session_id: z.string().min(1),
  captured_at: z.string(),
  camera_id: z.string().regex(CAMERA_ID_PATTERN, 'Invalid camera ID format'),
  thumbnail_url: z.string().url(),
  full_url: z.string().url(),
  expires_at: z.string(),
  size_bytes: z.number().positive().optional(),
  content_type: z.string().optional(),
});

export type EvidenceCapture = z.infer<typeof EvidenceCaptureSchema>;

/**
 * Evidence list API response (from BridgeServer)
 */
export const EvidenceListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    evidence: z.array(EvidenceCaptureSchema),
  }),
});

export type EvidenceListResponse = z.infer<typeof EvidenceListResponseSchema>;

/**
 * Presign URL API response (from BridgeServer)
 */
export const PresignResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    url: z.string().url(),
    expires_at: z.string(),
  }),
});

export type PresignResponse = z.infer<typeof PresignResponseSchema>;

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
