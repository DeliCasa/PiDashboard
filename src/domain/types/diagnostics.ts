/**
 * Domain Entity Type Definitions - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 */

// ============ Enums / Union Types ============

/**
 * Service health status values
 */
export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'timeout' | 'unknown';

/**
 * Session lifecycle status values
 */
export type SessionStatus = 'active' | 'completed' | 'cancelled';

/**
 * Service identifiers for health checks
 */
export type ServiceName = 'bridgeserver' | 'piorchestrator' | 'minio';

// ============ Entity Interfaces ============

/**
 * Individual check result for sub-checks (database, storage, etc.)
 */
export interface CheckResult {
  status: 'healthy' | 'error';
  message?: string;
}

/**
 * Service health status for a single backend service
 */
export interface ServiceHealth {
  service_name: ServiceName;
  status: ServiceStatus;
  last_checked: string;
  response_time_ms?: number;
  error_message?: string;
  checks?: Record<string, CheckResult>;
}

/**
 * Active purchase/evidence session
 */
export interface Session {
  id: string;
  delivery_id?: string;
  started_at: string;
  status: SessionStatus;
  capture_count: number;
  last_capture_at?: string;
  is_stale?: boolean;
}

/**
 * Evidence capture item from a session
 */
export interface EvidenceCapture {
  id: string;
  session_id: string;
  captured_at: string;
  camera_id: string;
  thumbnail_url: string;
  full_url: string;
  expires_at: string;
  size_bytes?: number;
  content_type?: string;
}

/**
 * Aggregate view model for the diagnostics page
 */
export interface DiagnosticsState {
  services: ServiceHealth[];
  sessions: Session[];
  last_refresh: string;
  is_refreshing: boolean;
}
