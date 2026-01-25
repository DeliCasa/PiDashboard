/**
 * WiFi Hooks
 * React Query hooks for WiFi management
 *
 * Feature: 037-api-resilience
 * - Enhanced 404/503 handling for graceful degradation
 * - WiFi endpoints may not exist in all PiOrchestrator versions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wifiApi } from '@/infrastructure/api/wifi';
import { queryKeys } from '@/lib/queryClient';
import { ApiError, isFeatureUnavailable } from '@/infrastructure/api/client';

/**
 * Hook for fetching WiFi status with polling
 * Stops polling on 404/503 errors (WiFi not available)
 *
 * Feature: 037-api-resilience (T024)
 */
export function useWifiStatus(enabled = true, pollingInterval = 10000) {
  return useQuery({
    queryKey: queryKeys.wifiStatus(),
    queryFn: async () => {
      const response = await wifiApi.getStatus();
      return response.status;
    },
    enabled,
    // Stop polling if we get a 404/503 (WiFi not available) or other client errors
    refetchInterval: (query) => {
      if (query.state.error) {
        const err = query.state.error;
        // Stop polling on 404/503 (feature unavailable) or other client errors
        if (isFeatureUnavailable(err) || (ApiError.isApiError(err) && err.status >= 400)) {
          return false;
        }
      }
      return pollingInterval;
    },
    // Don't retry on 404/503 errors (feature unavailable)
    retry: (failureCount, error) => {
      if (isFeatureUnavailable(error)) {
        return false;
      }
      return failureCount < 2;
    },
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for scanning WiFi networks
 */
export function useWifiScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wifiApi.scan,
    onSuccess: (data) => {
      // Update the networks cache
      queryClient.setQueryData(queryKeys.wifiNetworks(), data.networks);
    },
  });
}

/**
 * Hook for getting cached WiFi networks
 * Doesn't auto-fetch on 404/503 errors
 *
 * Feature: 037-api-resilience (T025)
 */
export function useWifiNetworks() {
  return useQuery({
    queryKey: queryKeys.wifiNetworks(),
    queryFn: async () => {
      const response = await wifiApi.scan();
      return response.networks;
    },
    // Networks don't auto-refresh, user triggers scan manually
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Don't retry on 404/503 errors (feature unavailable)
    retry: (failureCount, error) => {
      if (isFeatureUnavailable(error)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook for connecting to WiFi network
 */
export function useWifiConnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ssid, password }: { ssid: string; password?: string }) =>
      wifiApi.connect(ssid, password),
    onSuccess: () => {
      // Invalidate status to refetch connection state
      queryClient.invalidateQueries({ queryKey: queryKeys.wifiStatus() });
    },
  });
}

/**
 * Hook for disconnecting from WiFi
 */
export function useWifiDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wifiApi.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wifiStatus() });
    },
  });
}
