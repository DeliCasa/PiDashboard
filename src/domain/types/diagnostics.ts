/**
 * Domain Entity Type Definitions - Diagnostics
 * Feature: 038-dev-observability-panels (original)
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 */

// ============ Enums / Union Types ============

/**
 * Service health status values
 */
export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'timeout' | 'unknown';

/**
 * Session lifecycle status values (PiOrchestrator V1)
 */
export type SessionStatus = 'active' | 'complete' | 'partial' | 'failed';

/**
 * Service identifiers for health checks
 */
export type ServiceName = 'bridgeserver' | 'piorchestrator' | 'minio';

/**
 * Evidence capture tag (phase of operation)
 */
export type CaptureTag = 'BEFORE_OPEN' | 'AFTER_OPEN' | 'BEFORE_CLOSE' | 'AFTER_CLOSE';

/**
 * Evidence capture status
 */
export type CaptureStatus = 'captured' | 'failed' | 'timeout';

/**
 * Evidence pair status
 */
export type PairStatus = 'complete' | 'incomplete' | 'missing';

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
 * Last error from a session (nested object)
 */
export interface LastError {
  phase: string;
  failure_reason: string;
  device_id: string;
  occurred_at: string;
  correlation_id?: string;
}

/**
 * Session diagnostic entry (V1 from PiOrchestrator)
 */
export interface Session {
  session_id: string;
  container_id: string;
  started_at: string;
  status: SessionStatus;
  total_captures: number;
  successful_captures: number;
  failed_captures: number;
  has_before_open: boolean;
  has_after_close: boolean;
  pair_complete: boolean;
  last_error?: LastError;
  elapsed_seconds: number;
}

/**
 * Session with derived is_stale flag (client-side)
 */
export interface SessionWithStale extends Session {
  is_stale?: boolean;
}

/**
 * Evidence capture entry (V1 from PiOrchestrator)
 */
export interface CaptureEntry {
  evidence_id: string;
  capture_tag: CaptureTag;
  status: CaptureStatus;
  failure_reason?: string;
  device_id: string;
  container_id: string;
  session_id: string;
  created_at: string;
  image_data?: string;
  content_type?: string;
  image_size_bytes?: number;
  object_key?: string;
  upload_status?: 'uploaded' | 'failed' | 'unverified';
  upload_error?: string;
}

/**
 * Evidence summary (from session evidence response)
 */
export interface EvidenceSummary {
  total_captures: number;
  successful_captures: number;
  failed_captures: number;
  has_before_open: boolean;
  has_after_close: boolean;
  pair_complete: boolean;
}

/**
 * Evidence pair (structured before/after for a session)
 */
export interface EvidencePair {
  contract_version: 'v1';
  session_id: string;
  container_id: string;
  pair_status: PairStatus;
  before: CaptureEntry | null;
  after: CaptureEntry | null;
  queried_at: string;
  retry_after_seconds?: number;
}

/**
 * Aggregate view model for the diagnostics page
 */
export interface DiagnosticsState {
  services: ServiceHealth[];
  sessions: SessionWithStale[];
  last_refresh: string;
  is_refreshing: boolean;
}
