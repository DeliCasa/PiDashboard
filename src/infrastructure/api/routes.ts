/**
 * Centralized API Routes
 * Feature: 028-api-compat
 *
 * Single source of truth for all PiOrchestrator API endpoints.
 * This module ensures consistent path handling across the dashboard.
 *
 * Route Structure:
 * - /api/* - Dashboard-specific endpoints (legacy, proxied via Vite)
 * - /api/v1/* - V1 API endpoints (provisioning, allowlist, sessions)
 *
 * The V1 client automatically adds /v1 prefix, so paths here omit it.
 */

// ============================================================================
// API Base Configuration
// ============================================================================

/**
 * API base URL - proxied to PiOrchestrator in development.
 * In production, the dashboard is served from the same origin.
 */
export const API_BASE = '/api';

/**
 * V1 API version prefix.
 * The V1 client handles this automatically, but exposed for reference.
 */
export const V1_PREFIX = '/v1';

// ============================================================================
// Health & System Routes (Dashboard API)
// ============================================================================

export const SYSTEM_ROUTES = {
  /** Health check endpoint */
  health: '/health',

  /** System information (CPU, memory, disk, temperature) */
  info: '/system/info',
} as const;

// ============================================================================
// WiFi Routes (Dashboard API)
// ============================================================================

export const WIFI_ROUTES = {
  /** Get current WiFi connection status */
  status: '/wifi/status',

  /** Scan for available WiFi networks */
  scan: '/wifi/scan',

  /** Connect to a WiFi network */
  connect: '/wifi/connect',
} as const;

// ============================================================================
// Device Routes (Dashboard API)
// ============================================================================

export const DEVICE_ROUTES = {
  /** List discovered BLE devices */
  list: '/devices',

  /** Start BLE device scan */
  scan: '/devices/scan',

  /** Provision a specific device */
  provision: (address: string) =>
    `/devices/${encodeURIComponent(address)}/provision`,

  /** Get provisioning history */
  history: '/devices/history',
} as const;

// ============================================================================
// Dashboard Routes (Dashboard API)
// ============================================================================

export const DASHBOARD_ROUTES = {
  /** List cameras */
  cameras: '/dashboard/cameras',

  /** Door status */
  doorStatus: '/dashboard/door/status',

  /** Bridge connection status */
  bridgeStatus: '/dashboard/bridge/status',

  /** Log stream (SSE) */
  logs: '/dashboard/logs',

  /** Configuration settings */
  config: '/dashboard/config',
} as const;

// ============================================================================
// V1 Provisioning Routes
// NOTE: These paths are WITHOUT /v1 prefix (v1-client adds it automatically)
// ============================================================================

export const PROVISIONING_ROUTES = {
  // --- Allowlist ---
  /** List all allowlist entries */
  allowlistList: '/provisioning/allowlist',

  /** Get a specific allowlist entry */
  allowlistEntry: (mac: string) =>
    `/provisioning/allowlist/${encodeURIComponent(mac)}`,

  /** Bulk add to allowlist */
  allowlistBulkAdd: '/provisioning/allowlist/bulk',

  /** Bulk remove from allowlist */
  allowlistBulkRemove: '/provisioning/allowlist/bulk-remove',

  /** Clear all allowlist entries */
  allowlistClearAll: '/provisioning/allowlist/all',

  /** Allowlist statistics */
  allowlistStats: '/provisioning/allowlist/stats',

  // --- Batch Provisioning Sessions ---
  /** Start a new batch provisioning session */
  batchStart: '/provisioning/batch/start',

  /** Get session details */
  batchSession: (sessionId: string) =>
    `/provisioning/batch/${encodeURIComponent(sessionId)}`,

  /** Stop/close a session */
  batchStop: (sessionId: string) =>
    `/provisioning/batch/${encodeURIComponent(sessionId)}/stop`,

  /** Pause a session */
  batchPause: (sessionId: string) =>
    `/provisioning/batch/${encodeURIComponent(sessionId)}/pause`,

  /** Resume a paused session */
  batchResume: (sessionId: string) =>
    `/provisioning/batch/${encodeURIComponent(sessionId)}/resume`,

  /** Get devices in a session */
  batchDevices: (sessionId: string) =>
    `/provisioning/batch/${encodeURIComponent(sessionId)}/devices`,

  /** Provision a specific device */
  batchProvisionDevice: (sessionId: string, mac: string) =>
    `/provisioning/batch/${encodeURIComponent(sessionId)}/devices/${encodeURIComponent(mac)}/provision`,

  /** Provision all eligible devices */
  batchProvisionAll: (sessionId: string) =>
    `/provisioning/batch/${encodeURIComponent(sessionId)}/provision-all`,

  /** Retry a failed device */
  batchRetryDevice: (sessionId: string, mac: string) =>
    `/provisioning/batch/${encodeURIComponent(sessionId)}/devices/${encodeURIComponent(mac)}/retry`,

  /** Skip a device */
  batchSkipDevice: (sessionId: string, mac: string) =>
    `/provisioning/batch/${encodeURIComponent(sessionId)}/devices/${encodeURIComponent(mac)}/skip`,

  /** Close/end a batch session (use batchStop instead - /close is deprecated) */
  batchClose: (sessionId: string) =>
    `/provisioning/batch/${encodeURIComponent(sessionId)}/stop`,

  // --- Batch SSE Events ---
  /** SSE event stream for batch provisioning */
  batchEvents: '/provisioning/batch/events',

  /** Network status for batch provisioning */
  batchNetwork: '/provisioning/batch/network',

  // --- Session Recovery ---
  /** Get recoverable sessions */
  sessionsRecoverable: '/provisioning/sessions/recoverable',

  /** Resume a specific session */
  sessionResume: (sessionId: string) =>
    `/provisioning/sessions/${encodeURIComponent(sessionId)}/resume`,

  /** Discard a session */
  sessionDiscard: (sessionId: string) =>
    `/provisioning/sessions/${encodeURIComponent(sessionId)}`,

  /** Get session history */
  sessionsHistory: '/provisioning/sessions/history',

  // --- Network ---
  /** Onboarding network status */
  networkStatus: '/provisioning/network/status',
} as const;

// ============================================================================
// SSE Endpoint Helper
// ============================================================================

/**
 * Build the full SSE endpoint URL for batch provisioning events.
 *
 * @param sessionId - Optional session ID to filter events
 * @returns Full URL path for EventSource connection
 *
 * @example
 * getSSEEndpoint() // => '/api/v1/provisioning/batch/events'
 * getSSEEndpoint('abc123') // => '/api/v1/provisioning/batch/events?session_id=abc123'
 */
export function getSSEEndpoint(sessionId?: string): string {
  const base = `${API_BASE}${V1_PREFIX}${PROVISIONING_ROUTES.batchEvents}`;
  if (sessionId) {
    return `${base}?session_id=${encodeURIComponent(sessionId)}`;
  }
  return base;
}

// ============================================================================
// Route Validation Helper
// ============================================================================

/**
 * Validates that a route is defined and returns the full API path.
 * Useful for debugging 404 errors.
 *
 * @param route - Route path or function result
 * @param isV1 - Whether this is a V1 route
 * @returns Full API path
 */
export function getFullPath(route: string, isV1 = false): string {
  return isV1 ? `${API_BASE}${V1_PREFIX}${route}` : `${API_BASE}${route}`;
}

// ============================================================================
// Type Exports
// ============================================================================

export type SystemRoute = keyof typeof SYSTEM_ROUTES;
export type WifiRoute = keyof typeof WIFI_ROUTES;
export type DeviceRoute = keyof typeof DEVICE_ROUTES;
export type DashboardRoute = keyof typeof DASHBOARD_ROUTES;
export type ProvisioningRoute = keyof typeof PROVISIONING_ROUTES;
