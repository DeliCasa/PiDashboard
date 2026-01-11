/**
 * WiFi API Service
 * WiFi configuration, scanning, and connection management
 *
 * Feature: 005-testing-research-and-hardening (T022)
 * Includes Zod schema validation for runtime API contract enforcement.
 */

import { apiClient } from './client';
import {
  WifiScanResponseSchema,
  WifiStatusResponseSchema,
  WifiConnectResponseSchema,
  safeParseWithErrors,
} from './schemas';
import type { WiFiNetwork, WiFiStatus, WifiEncryption } from '@/domain/types/entities';
import type { WiFiConnectResponse } from '@/domain/types/api';

// Backend response types (kept for backward compatibility)
interface WiFiNetworkApiResponse {
  ssid: string;
  bssid?: string;
  frequency?: number;
  signal: number;
  security: string; // "WPA2", "WPA3", "Open", etc.
  channel?: number;
  quality?: number;
}

// NOTE: V1 envelope is unwrapped by proxy
interface WiFiScanApiResponse {
  count: number;
  networks: WiFiNetworkApiResponse[];
}

/**
 * Transform backend security string to frontend encryption type
 * @exported for unit testing (T012)
 */
export function mapSecurityToEncryption(security: string): WifiEncryption {
  const securityLower = security.toLowerCase();
  if (securityLower === 'open' || securityLower === 'none') return 'open';
  if (securityLower.includes('wpa3')) return 'wpa3';
  if (securityLower.includes('wpa2')) return 'wpa2';
  if (securityLower.includes('wpa')) return 'wpa';
  if (securityLower.includes('wep')) return 'wep';
  return 'open';
}

// Export the backend response type for testing
export type { WiFiNetworkApiResponse };

/**
 * Transform backend network to frontend format
 * @exported for unit testing (T013)
 */
export function transformNetwork(network: WiFiNetworkApiResponse): WiFiNetwork {
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
   * Validates response and transforms to frontend WiFiNetwork format.
   */
  scan: async (): Promise<{ networks: WiFiNetwork[] }> => {
    const response = await apiClient.get<WiFiScanApiResponse>('/wifi/scan');

    // Validate API response against schema
    const validation = safeParseWithErrors(WifiScanResponseSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] WiFi scan validation failed:', validation.errors);
    }

    return {
      networks: Array.isArray(response.networks)
        ? response.networks.map(transformNetwork)
        : [],
    };
  },

  /**
   * Connect to a WiFi network
   * Validates response against schema.
   */
  connect: async (ssid: string, password?: string): Promise<WiFiConnectResponse> => {
    const response = await apiClient.post<WiFiConnectResponse>('/wifi/connect', { ssid, password });

    // Validate API response against schema
    const validation = safeParseWithErrors(WifiConnectResponseSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] WiFi connect validation failed:', validation.errors);
    }

    return response;
  },

  /**
   * Disconnect from current WiFi network
   */
  disconnect: () =>
    apiClient.post<{ success: boolean }>('/wifi/disconnect'),

  /**
   * Get current WiFi status
   * Validates response against schema.
   */
  getStatus: async (): Promise<{ status: WiFiStatus }> => {
    const response = await apiClient.get<{ status: WiFiStatus }>('/wifi/status');

    // Validate API response against schema
    const validation = safeParseWithErrors(WifiStatusResponseSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] WiFi status validation failed:', validation.errors);
    }

    return response;
  },
};
