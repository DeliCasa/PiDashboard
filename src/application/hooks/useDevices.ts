/**
 * Device Hooks
 * React Query hooks for ESP32 device management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '@/infrastructure/api/devices';
import { queryKeys } from '@/lib/queryClient';
import type { MQTTConfig } from '@/domain/types/entities';

/**
 * Hook for fetching device list
 */
export function useDevices(enabled = true) {
  return useQuery({
    queryKey: queryKeys.deviceList(),
    queryFn: async () => {
      const response = await devicesApi.list();
      return response.devices;
    },
    enabled,
    // Devices refresh on demand
    staleTime: 30000,
  });
}

/**
 * Hook for scanning BLE devices
 */
export function useDeviceScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (duration?: number) => devicesApi.scan(duration),
    onSuccess: () => {
      // Invalidate device list to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceList() });
    },
  });
}

/**
 * Hook for provisioning a device
 */
export function useProvisionDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      address,
      mqtt,
      wifi,
    }: {
      address: string;
      mqtt: MQTTConfig;
      wifi?: { ssid: string; password?: string };
    }) => devicesApi.provision(address, { mqtt, wifi }),
    onSuccess: () => {
      // Invalidate both device list and provisioning history
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.provisioningHistory() });
    },
  });
}

/**
 * Hook for fetching provisioning history
 */
export function useProvisioningHistory(enabled = true) {
  return useQuery({
    queryKey: queryKeys.provisioningHistory(),
    queryFn: async () => {
      const response = await devicesApi.getHistory();
      return response.records;
    },
    enabled,
  });
}
