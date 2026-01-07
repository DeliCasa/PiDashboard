/**
 * WiFi API Service
 * WiFi configuration, scanning, and connection management
 */

import { apiClient } from './client';
import type { WiFiNetwork, WiFiStatus } from '@/domain/types/entities';
import type { WiFiConnectResponse } from '@/domain/types/api';

/**
 * WiFi API endpoints
 */
export const wifiApi = {
  /**
   * Scan for available WiFi networks
   */
  scan: () =>
    apiClient.get<{ networks: WiFiNetwork[] }>('/wifi/scan'),

  /**
   * Connect to a WiFi network
   */
  connect: (ssid: string, password?: string) =>
    apiClient.post<WiFiConnectResponse>('/wifi/connect', { ssid, password }),

  /**
   * Disconnect from current WiFi network
   */
  disconnect: () =>
    apiClient.post<{ success: boolean }>('/wifi/disconnect'),

  /**
   * Get current WiFi status
   */
  getStatus: () =>
    apiClient.get<{ status: WiFiStatus }>('/wifi/status'),
};
