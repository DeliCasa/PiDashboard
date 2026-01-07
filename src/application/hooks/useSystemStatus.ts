/**
 * System Status Hook
 * Real-time system health monitoring with 5s polling
 */

import { useQuery } from '@tanstack/react-query';
import { systemApi } from '@/infrastructure/api/system';
import { queryKeys } from '@/lib/queryClient';

/**
 * Hook for fetching system status with automatic polling
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
    refetchInterval: pollingInterval,
    // Keep previous data while refetching for smooth UX
    placeholderData: (previousData) => previousData,
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
