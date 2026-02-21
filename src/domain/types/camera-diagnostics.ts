/**
 * Domain Types - Camera Diagnostics
 * Feature: 042-diagnostics-integration
 *
 * Pure TypeScript types for camera diagnostics entities.
 * NO external dependencies - domain types only.
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

/**
 * Camera status values - matches PiOrchestrator's CameraStatus
 */
export type CameraStatus =
  | 'online'
  | 'offline'
  | 'error'
  | 'rebooting'
  | 'discovered'
  | 'pairing'
  | 'connecting';

/**
 * Connection quality derived from WiFi RSSI
 */
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Session lifecycle status
 */
export type SessionStatus = 'active' | 'complete' | 'partial' | 'failed';

// ============================================================================
// Camera Health Interfaces
// ============================================================================

/**
 * Real-time health metrics from ESP-CAM device
 */
export interface CameraHealth {
  /** Free heap memory in bytes (typical: 50000-150000) */
  heap: number;
  /** WiFi signal strength in dBm (typical: -30 to -90) */
  wifi_rssi: number;
  /** Uptime in seconds since boot */
  uptime: number;
}

/**
 * Extended diagnostic information for debugging
 */
export interface DiagnosticsDetail {
  /** Connection quality derived from wifi_rssi */
  connection_quality: ConnectionQuality;
  /** Total error count since boot */
  error_count: number;
  /** Most recent error message */
  last_error?: string;
  /** ISO 8601 timestamp of last error */
  last_error_time?: string;
  /** Firmware version string */
  firmware_version?: string;
  /** Resolution e.g., "1280x720" */
  resolution?: string;
  /** Current FPS */
  frame_rate?: number;
  /** Average capture latency in milliseconds */
  avg_capture_time_ms?: number;
}

// ============================================================================
// Camera Diagnostics Interfaces
// ============================================================================

/**
 * Full camera diagnostics data
 */
export interface CameraDiagnostics {
  /** Camera ID in format espcam-XXXXXX */
  camera_id: string;
  /** Legacy compatibility alias for camera_id */
  device_id?: string;
  /** User-friendly camera name */
  name: string;
  /** Current camera status */
  status: CameraStatus;
  /** ISO 8601 timestamp of last communication */
  last_seen: string;
  /** Health metrics (omitted if camera offline) */
  health?: CameraHealth;
  /** Local network IP address */
  ip_address?: string;
  /** Hardware MAC address */
  mac_address?: string;
  /** Extended diagnostics (omitted if unavailable) */
  diagnostics?: DiagnosticsDetail;
}

// ============================================================================
// Evidence Capture Interfaces
// ============================================================================

/**
 * Captured evidence image from a camera
 */
export interface CapturedEvidence {
  /** Unique evidence ID */
  id: string;
  /** Source camera ID */
  camera_id: string;
  /** Parent session ID */
  session_id: string;
  /** ISO 8601 timestamp of capture */
  captured_at: string;
  /** Base64 encoded JPEG image */
  image_base64: string;
  /** MinIO presigned URL for thumbnail */
  thumbnail_url?: string;
  /** URL expiration timestamp */
  expires_at?: string;
  /** Image size in bytes */
  size_bytes?: number;
  /** MIME content type */
  content_type?: string;
}

/**
 * Request body for evidence capture
 */
export interface CaptureEvidenceRequest {
  /** Optional session to associate capture with */
  session_id?: string;
}

// ============================================================================
// Session Interfaces
// ============================================================================

/**
 * Detailed session information with capture history
 */
export interface SessionDetail {
  /** Unique session ID */
  id: string;
  /** Associated delivery ID */
  delivery_id?: string;
  /** ISO 8601 timestamp of session start */
  started_at: string;
  /** ISO 8601 timestamp of session completion */
  completed_at?: string;
  /** Session status */
  status: SessionStatus;
  /** Total captures in session */
  capture_count: number;
  /** List of camera IDs used in session */
  cameras?: string[];
  /** Capture history */
  evidence?: CapturedEvidence[];
}

// ============================================================================
// API Response Wrappers
// ============================================================================

/**
 * Standard API success response wrapper
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Camera diagnostics API response
 */
export type CameraDiagnosticsResponse = ApiSuccessResponse<CameraDiagnostics>;

/**
 * Captured evidence API response
 */
export type CapturedEvidenceResponse = ApiSuccessResponse<CapturedEvidence>;

/**
 * Session detail API response
 */
export type SessionDetailResponse = ApiSuccessResponse<SessionDetail>;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Connection quality threshold configuration
 */
export interface ConnectionQualityThresholds {
  excellent: number; // >= this RSSI
  good: number;      // >= this RSSI
  fair: number;      // >= this RSSI
  // poor: anything below fair threshold
}

/**
 * Default connection quality thresholds (dBm)
 */
export const DEFAULT_CONNECTION_QUALITY_THRESHOLDS: ConnectionQualityThresholds = {
  excellent: -50,
  good: -60,
  fair: -70,
};
