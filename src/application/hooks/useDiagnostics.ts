/**
 * Diagnostics Hooks - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * React Query hooks for health check polling.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { diagnosticsApi } from '@/infrastructure/api/diagnostics';
import { queryKeys } from '@/lib/queryClient';
import type { ServiceHealth } from '@/infrastructure/api/diagnostics-schemas';

/**
 * Default polling interval for health checks (5 seconds per research.md ADR-003)
 */
const HEALTH_POLLING_INTERVAL = 5000;

/**
 * Hook for fetching all service health checks with automatic polling
 *
 * @param enabled - Whether to enable the query (default: true)
 * @param pollingInterval - Polling interval in ms (default: 5000)
 */
export function useHealthChecks(
  enabled = true,
  pollingInterval = HEALTH_POLLING_INTERVAL
) {
  return useQuery({
    queryKey: queryKeys.diagnosticsHealth(),
    queryFn: diagnosticsApi.getAllHealthChecks,
    enabled,
    refetchInterval: pollingInterval,
    // Keep previous data while refetching for smooth UX
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching individual service health
 *
 * @param serviceName - The service to check ('bridgeserver' | 'piorchestrator' | 'minio')
 * @param enabled - Whether to enable the query (default: true)
 */
export function useServiceHealth(
  serviceName: 'bridgeserver' | 'piorchestrator' | 'minio',
  enabled = true
) {
  const queryFn = async (): Promise<ServiceHealth> => {
    switch (serviceName) {
      case 'bridgeserver':
        return diagnosticsApi.getBridgeServerHealth();
      case 'piorchestrator':
        return diagnosticsApi.getPiOrchestratorHealth();
      case 'minio':
        return diagnosticsApi.getMinioHealth();
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  };

  return useQuery({
    queryKey: queryKeys.diagnosticsServiceHealth(serviceName),
    queryFn,
    enabled,
    refetchInterval: HEALTH_POLLING_INTERVAL,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for manually triggering a health check refresh
 */
export function useRefreshHealthChecks() {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      return queryClient.invalidateQueries({
        queryKey: queryKeys.diagnosticsHealth(),
      });
    },
    isRefreshing:
      queryClient.isFetching({ queryKey: queryKeys.diagnosticsHealth() }) > 0,
  };
}

/**
 * Get overall health status from all services
 */
export function getOverallHealthStatus(
  services: ServiceHealth[]
): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
  if (services.length === 0) {
    return 'unknown';
  }

  const hasUnhealthy = services.some(
    (s) => s.status === 'unhealthy' || s.status === 'timeout'
  );
  const hasDegraded = services.some((s) => s.status === 'degraded');
  const hasUnknown = services.some((s) => s.status === 'unknown');
  const allHealthy = services.every((s) => s.status === 'healthy');

  if (hasUnhealthy) return 'unhealthy';
  if (hasDegraded) return 'degraded';
  if (hasUnknown) return 'unknown';
  if (allHealthy) return 'healthy';

  return 'degraded';
}
