/**
 * Network API Service
 * Network diagnostics and connectivity endpoints
 */

import { apiClient } from './client';
import type { TailscaleStatus } from '@/domain/types/entities';
import type { PingResponse } from '@/domain/types/api';

/**
 * Network API endpoints
 */
export const networkApi = {
  /**
   * Get Tailscale VPN status
   */
  getTailscaleStatus: () =>
    apiClient.get<TailscaleStatus>('/dashboard/tailscale/status'),

  /**
   * Ping a host to test connectivity
   */
  ping: (host: string, count = 3) =>
    apiClient.post<PingResponse>('/dashboard/network/ping', { host, count }),

  /**
   * Get MQTT broker status
   */
  getMqttStatus: () =>
    apiClient.get<{
      connected: boolean;
      broker?: string;
      port?: number;
      clientId?: string;
      latency_ms?: number;
    }>('/dashboard/mqtt/status'),

  /**
   * Get BridgeServer connection status
   */
  getBridgeServerStatus: () =>
    apiClient.get<{
      connected: boolean;
      url?: string;
      latency_ms?: number;
      version?: string;
    }>('/dashboard/bridgeserver/status'),
};
