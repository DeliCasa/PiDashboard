/**
 * WiFi API Service
 * WiFi configuration, scanning, and connection management
 *
 * Feature: 005-testing-research-and-hardening (T022)
 * Note: WiFi endpoints may not be available in all PiOrchestrator versions.
 * Graceful fallbacks are provided when endpoints return 404.
 * Includes Zod schema validation for runtime API contract enforcement.
 */

import { apiClient, ApiError } from './client';
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
 * Default WiFi status when endpoint is unavailable
 */
const DEFAULT_WIFI_STATUS: WiFiStatus = {
  client_status: 'disconnected',
  ap_status: 'inactive',
};

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
 * Check if error indicates endpoint is unavailable (404 or 503)
 */
function isEndpointUnavailable(error: unknown): boolean {
  if (!ApiError.isApiError(error)) return false;
  // 404 = Not Found, 503 = Service Unavailable (nginx proxy can't reach backend route)
  return error.status === 404 || error.status === 503;
}

/**
 * WiFi API endpoints
 * Note: These endpoints may not exist in all PiOrchestrator versions.
 * Graceful fallbacks are provided.
 */
export const wifiApi = {
  /**
   * Scan for available WiFi networks
   * Returns empty array if endpoint doesn't exist.
   */
  scan: async (): Promise<{ networks: WiFiNetwork[] }> => {
    try {
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
    } catch (error) {
      if (isEndpointUnavailable(error)) {
        console.info('[WiFi API] Scan endpoint not available');
        return { networks: [] };
      }
      throw error;
    }
  },

  /**
   * Connect to a WiFi network
   * Throws if endpoint doesn't exist.
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
   * Returns default status if endpoint doesn't exist.
   */
  getStatus: async (): Promise<{ status: WiFiStatus }> => {
    try {
      const response = await apiClient.get<{ status: WiFiStatus }>('/wifi/status');

      // Validate API response against schema
      const validation = safeParseWithErrors(WifiStatusResponseSchema, response);
      if (!validation.success) {
        console.warn('[API Contract] WiFi status validation failed:', validation.errors);
      }

      return response;
    } catch (error) {
      if (isEndpointUnavailable(error)) {
        console.info('[WiFi API] Status endpoint not available');
        return { status: DEFAULT_WIFI_STATUS };
      }
      throw error;
    }
  },
};
