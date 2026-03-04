/**
 * System Status Hook
 * Real-time system health monitoring with 5s polling
 *
 * System API may not be available on all PiOrchestrator builds.
 * Graceful degradation: stops polling/retries on 404/503.
 */

import { useQuery } from '@tanstack/react-query';
import { systemApi } from '@/infrastructure/api/system';
import { queryKeys } from '@/lib/queryClient';
import { isFeatureUnavailable } from '@/infrastructure/api/client';

/**
 * Hook for fetching system status with automatic polling
 * Stops polling and retries on 404/503 (endpoint not available)
 *
 * @param enabled - Whether to enable the query (default: true)
 * @param pollingInterval - Polling interval in ms (default: 5000)
 */
export function useSystemStatus(
  enabled = true,
  pollingInterval = 5000
) {
  return useQuery({
    queryKey: queryKeys.systemStatus(),
    queryFn: systemApi.getInfo,
    enabled,
    refetchInterval: (query) => {
      if (query.state.error && isFeatureUnavailable(query.state.error)) {
        return false;
      }
      return pollingInterval;
    },
    // Keep previous data while refetching for smooth UX
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error) => {
      if (isFeatureUnavailable(error)) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Hook for health check endpoint
 */
export function useHealthCheck(enabled = true) {
  return useQuery({
    queryKey: queryKeys.systemHealth(),
    queryFn: systemApi.getHealth,
    enabled,
    refetchInterval: 30000, // Check every 30s
  });
}
