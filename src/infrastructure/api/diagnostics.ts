/**
 * Diagnostics API Client - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Provides health check functions for BridgeServer, PiOrchestrator, and MinIO.
 * Follows existing API client patterns with error handling and schema validation.
 */

import { apiClient, isFeatureUnavailable } from './client';
import {
  BridgeServerHealthResponseSchema,
  StorageHealthResponseSchema,
  type ServiceHealth,
  type ServiceStatus,
  type AllHealthChecks,
} from './diagnostics-schemas';
import { safeParseWithErrors } from './schemas';

/**
 * Map BridgeServer health status to ServiceStatus
 */
function mapBridgeServerStatus(status: string): ServiceStatus {
  switch (status) {
    case 'healthy':
      return 'healthy';
    case 'not_ready':
      return 'degraded';
    case 'unhealthy':
      return 'unhealthy';
    default:
      return 'unknown';
  }
}

/**
 * Map storage health status to ServiceStatus
 */
function mapStorageStatus(status: string): ServiceStatus {
  switch (status) {
    case 'healthy':
      return 'healthy';
    case 'unhealthy':
      return 'unhealthy';
    default:
      return 'unknown';
  }
}

/**
 * Diagnostics API client for health checks
 */
export const diagnosticsApi = {
  /**
   * Get BridgeServer health status via PiOrchestrator proxy
   */
  getBridgeServerHealth: async (): Promise<ServiceHealth> => {
    const startTime = performance.now();

    try {
      const response = await apiClient.get<unknown>('/dashboard/diagnostics/bridgeserver');
      const responseTime = Math.round(performance.now() - startTime);

      const parsed = safeParseWithErrors(BridgeServerHealthResponseSchema, response);

      if (!parsed.success) {
        console.warn('BridgeServer health response validation failed:', parsed.errors);
        return {
          service_name: 'bridgeserver',
          status: 'unknown',
          last_checked: new Date().toISOString(),
          response_time_ms: responseTime,
          error_message: `Invalid response: ${parsed.errors.join(', ')}`,
        };
      }

      return {
        service_name: 'bridgeserver',
        status: mapBridgeServerStatus(parsed.data.status),
        last_checked: parsed.data.timestamp || new Date().toISOString(),
        response_time_ms: responseTime,
        checks: parsed.data.checks,
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);

      // Graceful degradation for unavailable endpoints
      if (isFeatureUnavailable(error)) {
        return {
          service_name: 'bridgeserver',
          status: 'unknown',
          last_checked: new Date().toISOString(),
          response_time_ms: responseTime,
          error_message: 'Health endpoint not available',
        };
      }

      return {
        service_name: 'bridgeserver',
        status: 'unhealthy',
        last_checked: new Date().toISOString(),
        response_time_ms: responseTime,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get PiOrchestrator health status via existing /api/system/info endpoint
   */
  getPiOrchestratorHealth: async (): Promise<ServiceHealth> => {
    const startTime = performance.now();

    try {
      // Use existing system info endpoint - if it responds, service is healthy
      await apiClient.get<unknown>('/system/info');
      const responseTime = Math.round(performance.now() - startTime);

      return {
        service_name: 'piorchestrator',
        status: 'healthy',
        last_checked: new Date().toISOString(),
        response_time_ms: responseTime,
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);

      if (isFeatureUnavailable(error)) {
        return {
          service_name: 'piorchestrator',
          status: 'unknown',
          last_checked: new Date().toISOString(),
          response_time_ms: responseTime,
          error_message: 'System info endpoint not available',
        };
      }

      return {
        service_name: 'piorchestrator',
        status: 'unhealthy',
        last_checked: new Date().toISOString(),
        response_time_ms: responseTime,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get MinIO storage health status via BridgeServer proxy
   */
  getMinioHealth: async (): Promise<ServiceHealth> => {
    const startTime = performance.now();

    try {
      const response = await apiClient.get<unknown>('/dashboard/diagnostics/minio');
      const responseTime = Math.round(performance.now() - startTime);

      const parsed = safeParseWithErrors(StorageHealthResponseSchema, response);

      if (!parsed.success) {
        console.warn('MinIO health response validation failed:', parsed.errors);
        return {
          service_name: 'minio',
          status: 'unknown',
          last_checked: new Date().toISOString(),
          response_time_ms: responseTime,
          error_message: `Invalid response: ${parsed.errors.join(', ')}`,
        };
      }

      return {
        service_name: 'minio',
        status: mapStorageStatus(parsed.data.status),
        last_checked: parsed.data.timestamp || new Date().toISOString(),
        response_time_ms: responseTime,
        error_message: parsed.data.error,
        checks: parsed.data.buckets
          ? Object.fromEntries(
              parsed.data.buckets.map((b) => [
                b.name,
                { status: b.accessible ? 'healthy' : 'error' as const },
              ])
            )
          : undefined,
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);

      if (isFeatureUnavailable(error)) {
        return {
          service_name: 'minio',
          status: 'unknown',
          last_checked: new Date().toISOString(),
          response_time_ms: responseTime,
          error_message: 'Storage health endpoint not available',
        };
      }

      return {
        service_name: 'minio',
        status: 'unhealthy',
        last_checked: new Date().toISOString(),
        response_time_ms: responseTime,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get all health checks in parallel
   */
  getAllHealthChecks: async (): Promise<AllHealthChecks> => {
    const [bridgeServer, piOrchestrator, minio] = await Promise.all([
      diagnosticsApi.getBridgeServerHealth(),
      diagnosticsApi.getPiOrchestratorHealth(),
      diagnosticsApi.getMinioHealth(),
    ]);

    return {
      services: [bridgeServer, piOrchestrator, minio],
      last_refresh: new Date().toISOString(),
    };
  },
};
