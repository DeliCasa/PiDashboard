/**
 * Network Hooks
 * React Query hooks for network diagnostics
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { networkApi } from '@/infrastructure/api/network';
import { queryKeys } from '@/lib/queryClient';

/**
 * Hook for fetching Tailscale status
 */
export function useTailscaleStatus(enabled = true, pollingInterval = 30000) {
  return useQuery({
    queryKey: queryKeys.tailscale(),
    queryFn: networkApi.getTailscaleStatus,
    enabled,
    refetchInterval: pollingInterval,
  });
}

/**
 * Hook for ping test
 */
export function usePing() {
  return useMutation({
    mutationFn: ({ host, count }: { host: string; count?: number }) =>
      networkApi.ping(host, count),
  });
}

/**
 * Hook for MQTT status
 */
export function useMqttStatus(enabled = true, pollingInterval = 10000) {
  return useQuery({
    queryKey: queryKeys.mqtt(),
    queryFn: networkApi.getMqttStatus,
    enabled,
    refetchInterval: pollingInterval,
  });
}

/**
 * Hook for BridgeServer status
 */
export function useBridgeServerStatus(enabled = true, pollingInterval = 10000) {
  return useQuery({
    queryKey: queryKeys.bridgeServer(),
    queryFn: networkApi.getBridgeServerStatus,
    enabled,
    refetchInterval: pollingInterval,
  });
}
