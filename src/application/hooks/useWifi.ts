/**
 * WiFi Hooks
 * React Query hooks for WiFi management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wifiApi } from '@/infrastructure/api/wifi';
import { queryKeys } from '@/lib/queryClient';

/**
 * Hook for fetching WiFi status with polling
 */
export function useWifiStatus(enabled = true, pollingInterval = 10000) {
  return useQuery({
    queryKey: queryKeys.wifiStatus(),
    queryFn: async () => {
      const response = await wifiApi.getStatus();
      return response.status;
    },
    enabled,
    refetchInterval: pollingInterval,
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
