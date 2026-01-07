/**
 * WiFi API Service
 * WiFi configuration, scanning, and connection management
 */

import { apiClient } from './client';
import type { WiFiNetwork, WiFiStatus, WifiEncryption } from '@/domain/types/entities';
import type { WiFiConnectResponse } from '@/domain/types/api';

// Backend response types
interface WiFiNetworkApiResponse {
  ssid: string;
  bssid?: string;
  frequency?: number;
  signal: number;
  security: string; // "WPA2", "WPA3", "Open", etc.
  channel?: number;
  quality?: number;
}

interface WiFiScanApiResponse {
  count: number;
  networks: WiFiNetworkApiResponse[];
  success: boolean;
}

/**
 * Transform backend security string to frontend encryption type
 */
function mapSecurityToEncryption(security: string): WifiEncryption {
  const securityLower = security.toLowerCase();
  if (securityLower === 'open' || securityLower === 'none') return 'open';
  if (securityLower.includes('wpa3')) return 'wpa3';
  if (securityLower.includes('wpa2')) return 'wpa2';
  if (securityLower.includes('wpa')) return 'wpa';
  if (securityLower.includes('wep')) return 'wep';
  return 'open';
}

/**
 * Transform backend network to frontend format
 */
function transformNetwork(network: WiFiNetworkApiResponse): WiFiNetwork {
  const encryption = mapSecurityToEncryption(network.security);
  return {
    ssid: network.ssid,
    signal: network.signal,
    secured: encryption !== 'open',
    encryption,
    bssid: network.bssid,
    channel: network.channel,
  };
}

/**
 * WiFi API endpoints
 */
export const wifiApi = {
  /**
   * Scan for available WiFi networks
   * Transforms backend response to frontend WiFiNetwork format
   */
  scan: async (): Promise<{ networks: WiFiNetwork[] }> => {
    const response = await apiClient.get<WiFiScanApiResponse>('/wifi/scan');
    return {
      networks: (response.networks || []).map(transformNetwork),
    };
  },

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
