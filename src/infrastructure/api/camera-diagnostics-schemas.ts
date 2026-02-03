/**
 * Zod API Validation Schemas - Camera Diagnostics
 * Feature: 042-diagnostics-integration
 *
 * Runtime schema validation for camera diagnostics API responses.
 * Validates camera health, diagnostics detail, evidence capture, and sessions.
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

/**
 * Camera status enum - matches PiOrchestrator's CameraStatus
 */
export const CameraStatusSchema = z.enum([
  'online',
  'offline',
  'error',
  'rebooting',
  'discovered',
  'pairing',
  'connecting',
]);

export type CameraStatus = z.infer<typeof CameraStatusSchema>;

/**
 * Connection quality derived from wifi_rssi
 */
export const ConnectionQualitySchema = z.enum([
  'excellent',
  'good',
  'fair',
  'poor',
]);

export type ConnectionQuality = z.infer<typeof ConnectionQualitySchema>;

/**
 * Session status enum
 */
export const SessionStatusSchema = z.enum([
  'active',
  'completed',
  'cancelled',
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

// ============================================================================
// Camera Health Schemas
// ============================================================================

/**
 * Camera health metrics from ESP-CAM device
 */
export const CameraHealthSchema = z.object({
  heap: z.number().nonnegative(),
  wifi_rssi: z.number().max(0).min(-100),
  uptime: z.number().nonnegative(),
});

export type CameraHealth = z.infer<typeof CameraHealthSchema>;

/**
 * Extended diagnostics detail for debugging
 */
export const DiagnosticsDetailSchema = z.object({
  connection_quality: ConnectionQualitySchema,
  error_count: z.number().nonnegative(),
  last_error: z.string().optional(),
  last_error_time: z.string().optional(),
  firmware_version: z.string().optional(),
  resolution: z.string().optional(),
  frame_rate: z.number().optional(),
  avg_capture_time_ms: z.number().optional(),
});

export type DiagnosticsDetail = z.infer<typeof DiagnosticsDetailSchema>;

// ============================================================================
// Camera Diagnostics Schemas
// ============================================================================

/**
 * Camera ID pattern: espcam-XXXXXX (6 hex chars)
 */
const CAMERA_ID_PATTERN = /^espcam-[0-9a-f]{6}$/i;

/**
 * Full camera diagnostics response
 */
export const CameraDiagnosticsSchema = z.object({
  camera_id: z.string().regex(CAMERA_ID_PATTERN, 'Invalid camera ID format'),
  device_id: z.string().optional(), // Legacy compatibility alias
  name: z.string(),
  status: CameraStatusSchema,
  last_seen: z.string(),
  health: CameraHealthSchema.optional(),
  ip_address: z.string().optional(),
  mac_address: z.string().optional(),
  diagnostics: DiagnosticsDetailSchema.optional(),
});

export type CameraDiagnostics = z.infer<typeof CameraDiagnosticsSchema>;

/**
 * API response wrapper for camera diagnostics
 */
export const CameraDiagnosticsResponseSchema = z.object({
  success: z.boolean(),
  data: CameraDiagnosticsSchema,
});

export type CameraDiagnosticsResponse = z.infer<typeof CameraDiagnosticsResponseSchema>;

/**
 * List of camera diagnostics (legacy endpoint)
 */
export const CameraDiagnosticsListSchema = z.array(CameraDiagnosticsSchema);

export type CameraDiagnosticsList = z.infer<typeof CameraDiagnosticsListSchema>;

// ============================================================================
// Evidence Capture Schemas
// ============================================================================

/**
 * Captured evidence entity
 */
export const CapturedEvidenceSchema = z.object({
  id: z.string().min(1),
  camera_id: z.string().regex(CAMERA_ID_PATTERN, 'Invalid camera ID format'),
  session_id: z.string().min(1),
  captured_at: z.string(),
  image_base64: z.string(),
  thumbnail_url: z.string().url().optional(),
  expires_at: z.string().optional(),
  size_bytes: z.number().positive().optional(),
  content_type: z.string().optional(),
});

export type CapturedEvidence = z.infer<typeof CapturedEvidenceSchema>;

/**
 * API response wrapper for evidence capture
 */
export const CapturedEvidenceResponseSchema = z.object({
  success: z.boolean(),
  data: CapturedEvidenceSchema,
});

export type CapturedEvidenceResponse = z.infer<typeof CapturedEvidenceResponseSchema>;

/**
 * Evidence capture request body
 */
export const CaptureEvidenceRequestSchema = z.object({
  session_id: z.string().optional(),
});

export type CaptureEvidenceRequest = z.infer<typeof CaptureEvidenceRequestSchema>;

// ============================================================================
// Session Detail Schemas
// ============================================================================

/**
 * Session detail with capture history
 */
export const SessionDetailSchema = z.object({
  id: z.string().min(1),
  delivery_id: z.string().optional(),
  started_at: z.string(),
  completed_at: z.string().optional(),
  status: SessionStatusSchema,
  capture_count: z.number().nonnegative(),
  cameras: z.array(z.string()).optional(),
  evidence: z.array(CapturedEvidenceSchema).optional(),
});

export type SessionDetail = z.infer<typeof SessionDetailSchema>;

/**
 * API response wrapper for session detail
 */
export const SessionDetailResponseSchema = z.object({
  success: z.boolean(),
  data: SessionDetailSchema,
});

export type SessionDetailResponse = z.infer<typeof SessionDetailResponseSchema>;

// ============================================================================
// Error Response Schema
// ============================================================================

/**
 * Standard API error response
 */
export const ApiErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Derive connection quality from RSSI value
 */
export function deriveConnectionQuality(rssi: number): ConnectionQuality {
  if (rssi >= -50) return 'excellent';
  if (rssi >= -60) return 'good';
  if (rssi >= -70) return 'fair';
  return 'poor';
}

/**
 * Check if camera ID is valid format
 */
export function isValidCameraId(id: string): boolean {
  return CAMERA_ID_PATTERN.test(id);
}
