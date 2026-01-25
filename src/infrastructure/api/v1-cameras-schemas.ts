/**
 * V1 Cameras API Zod Schemas
 * Feature: 034-esp-camera-integration
 *
 * Runtime validation schemas for ESP camera API responses.
 * Based on OpenAPI spec: specs/034-esp-camera-integration/contracts/v1-cameras-api.yaml
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

// CRITICAL: This enum MUST match PiOrchestrator's CameraStatus values
// See: PiOrchestrator/internal/domain/entities/camera.go
// See: PiOrchestrator/internal/domain/entities/camera_device.go
export const CameraStatusSchema = z.enum([
  'online',      // Camera is actively communicating
  'offline',     // Camera not responding
  'idle',        // Camera not seen recently but still registered (2-10 min)
  'error',       // Camera in error state
  'rebooting',   // Camera is rebooting (requested)
  'discovered',  // Found via mDNS but not paired
  'pairing',     // Token exchange in progress
  'connecting',  // Joining WiFi network
]);
export type CameraStatus = z.infer<typeof CameraStatusSchema>;

export const CameraResolutionSchema = z.enum([
  'QQVGA',
  'QVGA',
  'VGA',
  'SVGA',
  'XGA',
  'SXGA',
  'UXGA',
]);
export type CameraResolution = z.infer<typeof CameraResolutionSchema>;

export const ConnectionQualitySchema = z.enum(['excellent', 'good', 'fair', 'poor']);
export type ConnectionQuality = z.infer<typeof ConnectionQualitySchema>;

// ============================================================================
// Camera Health
// ============================================================================

// Flexible health schema that accepts various backend formats
export const CameraHealthSchema = z.object({
  // Core metrics (may use different names)
  wifi_rssi: z.number().optional(),
  free_heap: z.number().nonnegative().optional(),
  heap: z.number().nonnegative().optional(), // Alternative name for free_heap
  uptime: z.union([z.string(), z.number()]).optional(),
  uptime_seconds: z.number().nonnegative().optional(),
  resolution: CameraResolutionSchema.optional(),
  firmware_version: z.string().optional(),
  last_capture: z.string().optional(),
  last_error: z.string().optional(),
});
export type CameraHealth = z.infer<typeof CameraHealthSchema>;

// ============================================================================
// Camera Entity
// ============================================================================

export const CameraSchema = z.object({
  id: z.string().min(1),
  name: z.string(), // Allow any name (backend may return device_id as name)
  status: CameraStatusSchema,
  lastSeen: z.string(), // Accept any string format (ISO datetime or other)
  health: CameraHealthSchema.optional(),
  ip_address: z.string().optional(),
  mac_address: z.string().optional(),
});
export type Camera = z.infer<typeof CameraSchema>;

// ============================================================================
// Diagnostics
// ============================================================================

export const DiagnosticsInfoSchema = z.object({
  connection_quality: ConnectionQualitySchema,
  error_count: z.number().nonnegative(),
  last_error: z.string().optional(),
});
export type DiagnosticsInfo = z.infer<typeof DiagnosticsInfoSchema>;

export const CameraDiagnosticsSchema = CameraSchema.extend({
  diagnostics: DiagnosticsInfoSchema.optional(),
});
export type CameraDiagnostics = z.infer<typeof CameraDiagnosticsSchema>;

// ============================================================================
// Operation Results
// ============================================================================

export const CaptureResultSchema = z.object({
  success: z.boolean(),
  image: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  camera_id: z.string().optional(),
  file_size: z.number().nonnegative().optional(),
  error: z.string().optional(),
});
export type CaptureResult = z.infer<typeof CaptureResultSchema>;

export const RebootResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});
export type RebootResult = z.infer<typeof RebootResultSchema>;

// ============================================================================
// Response Envelopes
// ============================================================================

export const CameraListResponseSchema = z.object({
  cameras: z.array(CameraSchema),
  count: z.number().nonnegative(),
});
export type CameraListResponse = z.infer<typeof CameraListResponseSchema>;

export const DiagnosticsListResponseSchema = z.array(CameraDiagnosticsSchema);
export type DiagnosticsListResponse = z.infer<typeof DiagnosticsListResponseSchema>;

// ============================================================================
// Error Response
// ============================================================================

export const CameraErrorCodeSchema = z.enum([
  'CAMERA_OFFLINE',
  'CAMERA_NOT_FOUND',
  'CAPTURE_FAILED',
  'CAPTURE_TIMEOUT',
  'REBOOT_FAILED',
  'NETWORK_ERROR',
  'INTERNAL_ERROR',
]);
export type CameraErrorCode = z.infer<typeof CameraErrorCodeSchema>;

export const CameraErrorResponseSchema = z.object({
  error: z.string(),
  code: CameraErrorCodeSchema,
  retryable: z.boolean().optional(),
  retry_after_seconds: z.number().optional(),
});
export type CameraErrorResponse = z.infer<typeof CameraErrorResponseSchema>;

// ============================================================================
// ESP-CAM Paired Devices (GET /api/v1/espcam/paired)
// CRITICAL: These schemas MUST match PiOrchestrator responses exactly
// See: PiOrchestrator/internal/api/handlers/espcam_v1.go (ESPCamV1PairedData)
// See: PiOrchestrator/internal/domain/entities/camera_device.go (CameraDevice)
// ============================================================================

/**
 * CameraDevice entity from PiOrchestrator
 * This is the actual structure returned by /api/v1/espcam/paired
 */
export const CameraDeviceSchema = z.object({
  mac_address: z.string(),
  container_id: z.string(),
  position: z.number().min(1).max(4),
  status: CameraStatusSchema,
  firmware_version: z.string(),
  signal_strength: z.number(), // WiFi RSSI in dBm
  last_image: z.string(),      // ISO datetime
  paired_at: z.string(),       // ISO datetime
  last_seen: z.string(),       // ISO datetime
  name: z.string().optional(),
  error_message: z.string().optional(),
});
export type CameraDevice = z.infer<typeof CameraDeviceSchema>;

/**
 * Response from GET /api/v1/espcam/paired
 */
export const PairedCamerasDataSchema = z.object({
  cameras: z.array(CameraDeviceSchema),
  total: z.number().nonnegative(),
  online_count: z.number().nonnegative(),
});
export type PairedCamerasData = z.infer<typeof PairedCamerasDataSchema>;

export const PairedCamerasResponseSchema = z.object({
  success: z.boolean(),
  data: PairedCamerasDataSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
  }).optional(),
  timestamp: z.string(),
});
export type PairedCamerasResponse = z.infer<typeof PairedCamerasResponseSchema>;
