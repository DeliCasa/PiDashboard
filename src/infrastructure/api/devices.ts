/**
 * Devices API Service
 * ESP32 device discovery and provisioning
 */

import { apiClient } from './client';
import type { Device, MQTTConfig, ProvisioningRecord } from '@/domain/types/entities';
import type { ProvisionDeviceResponse, DeviceScanResponse } from '@/domain/types/api';

/**
 * Devices API endpoints
 */
export const devicesApi = {
  /**
   * List discovered BLE devices
   */
  list: () =>
    apiClient.get<{ devices: Device[] }>('/devices'),

  /**
   * Start BLE device scan
   */
  scan: (duration?: number) =>
    apiClient.post<DeviceScanResponse>('/devices/scan', { duration }),

  /**
   * Provision device with MQTT and WiFi credentials
   */
  provision: (address: string, config: { mqtt: MQTTConfig; wifi?: { ssid: string; password?: string } }) =>
    apiClient.post<ProvisionDeviceResponse>(`/devices/${encodeURIComponent(address)}/provision`, config),

  /**
   * Get provisioning history
   */
  getHistory: () =>
    apiClient.get<{ records: ProvisioningRecord[] }>('/devices/history'),
};
