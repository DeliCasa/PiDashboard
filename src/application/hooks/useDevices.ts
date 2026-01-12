/**
 * Device Hooks
 * React Query hooks for ESP32 device management
 * Feature: 028-api-compat - Added defensive array normalization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '@/infrastructure/api/devices';
import { queryKeys } from '@/lib/queryClient';
import { ensureArray } from '@/lib/normalize';
import type { MQTTConfig, Device } from '@/domain/types/entities';

/**
 * Hook for fetching device list
 * Includes defensive normalization to prevent crashes if API returns null
 */
export function useDevices(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.deviceList(),
    queryFn: async () => {
      const response = await devicesApi.list();
      // Defensive: ensure devices is always an array (028-api-compat)
      return ensureArray<Device>(response?.devices);
    },
    enabled,
    // Devices refresh on demand
    staleTime: 30000,
  });

  return {
    ...query,
    // Guarantee data is always an array for easier consumption
    data: ensureArray<Device>(query.data),
  };
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
 * Includes defensive normalization to prevent crashes if API returns null
 */
export function useProvisioningHistory(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.provisioningHistory(),
    queryFn: async () => {
      const response = await devicesApi.getHistory();
      // Defensive: ensure records is always an array (028-api-compat)
      return ensureArray(response?.records);
    },
    enabled,
  });

  return {
    ...query,
    // Guarantee data is always an array for easier consumption
    data: ensureArray(query.data),
  };
}
