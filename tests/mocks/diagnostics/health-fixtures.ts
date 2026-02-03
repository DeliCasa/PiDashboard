/**
 * Mock Health Check Fixtures - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Test fixtures for service health checks.
 */

import type { ServiceHealth } from '@/domain/types/diagnostics';

/**
 * Healthy BridgeServer response
 */
export const healthyBridgeServerHealth: ServiceHealth = {
  service_name: 'bridgeserver',
  status: 'healthy',
  last_checked: '2026-01-25T15:30:00Z',
  response_time_ms: 45,
  checks: {
    database: { status: 'healthy' },
    storage: { status: 'healthy' },
  },
};

/**
 * Degraded BridgeServer response (storage issue)
 */
export const degradedBridgeServerHealth: ServiceHealth = {
  service_name: 'bridgeserver',
  status: 'degraded',
  last_checked: '2026-01-25T15:30:00Z',
  response_time_ms: 120,
  checks: {
    database: { status: 'healthy' },
    storage: { status: 'error', message: 'High latency detected' },
  },
};

/**
 * Unhealthy BridgeServer response
 */
export const unhealthyBridgeServerHealth: ServiceHealth = {
  service_name: 'bridgeserver',
  status: 'unhealthy',
  last_checked: '2026-01-25T15:30:00Z',
  response_time_ms: 5000,
  error_message: 'Database connection failed',
  checks: {
    database: { status: 'error', message: 'Connection refused' },
    storage: { status: 'error', message: 'Unable to connect' },
  },
};

/**
 * Healthy PiOrchestrator response
 */
export const healthyPiOrchestratorHealth: ServiceHealth = {
  service_name: 'piorchestrator',
  status: 'healthy',
  last_checked: '2026-01-25T15:30:00Z',
  response_time_ms: 15,
};

/**
 * Unhealthy PiOrchestrator response
 */
export const unhealthyPiOrchestratorHealth: ServiceHealth = {
  service_name: 'piorchestrator',
  status: 'unhealthy',
  last_checked: '2026-01-25T15:30:00Z',
  response_time_ms: 30000,
  error_message: 'Request timeout',
};

/**
 * Unknown PiOrchestrator response (endpoint unavailable)
 */
export const unknownPiOrchestratorHealth: ServiceHealth = {
  service_name: 'piorchestrator',
  status: 'unknown',
  last_checked: '2026-01-25T15:30:00Z',
  error_message: 'System info endpoint not available',
};

/**
 * Healthy MinIO response
 */
export const healthyMinioHealth: ServiceHealth = {
  service_name: 'minio',
  status: 'healthy',
  last_checked: '2026-01-25T15:30:00Z',
  response_time_ms: 25,
  checks: {
    'delicasa-images': { status: 'healthy' },
  },
};

/**
 * Unhealthy MinIO response
 */
export const unhealthyMinioHealth: ServiceHealth = {
  service_name: 'minio',
  status: 'unhealthy',
  last_checked: '2026-01-25T15:30:00Z',
  response_time_ms: 10000,
  error_message: 'Connection refused',
};

/**
 * All services healthy
 */
export const allServicesHealthy: ServiceHealth[] = [
  healthyBridgeServerHealth,
  healthyPiOrchestratorHealth,
  healthyMinioHealth,
];

/**
 * Mixed health states
 */
export const mixedServicesHealth: ServiceHealth[] = [
  healthyBridgeServerHealth,
  healthyPiOrchestratorHealth,
  unhealthyMinioHealth,
];

/**
 * All services unhealthy
 */
export const allServicesUnhealthy: ServiceHealth[] = [
  unhealthyBridgeServerHealth,
  unhealthyPiOrchestratorHealth,
  unhealthyMinioHealth,
];

/**
 * BridgeServer API response mock (from /health/ready)
 */
export const bridgeServerHealthyApiResponse = {
  status: 'healthy',
  timestamp: '2026-01-25T15:30:00Z',
  checks: {
    database: { status: 'healthy' },
    storage: { status: 'healthy' },
  },
};

/**
 * BridgeServer not ready API response
 */
export const bridgeServerNotReadyApiResponse = {
  status: 'not_ready',
  timestamp: '2026-01-25T15:30:00Z',
  checks: {
    database: { status: 'healthy' },
    storage: { status: 'error', message: 'MinIO connection timeout' },
  },
};

/**
 * Storage healthy API response (from /health/storage)
 */
export const storageHealthyApiResponse = {
  status: 'healthy',
  timestamp: '2026-01-25T15:30:00Z',
  buckets: [
    { name: 'delicasa-images', accessible: true },
  ],
};

/**
 * Storage unhealthy API response
 */
export const storageUnhealthyApiResponse = {
  status: 'unhealthy',
  timestamp: '2026-01-25T15:30:00Z',
  error: 'Connection refused',
};
