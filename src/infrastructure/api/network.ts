/**
 * Network API Service
 * Network diagnostics and connectivity endpoints
 */

import { apiClient } from './client';
import type { TailscaleStatus } from '@/domain/types/entities';
import type { PingResponse } from '@/domain/types/api';

// Backend response types (different from frontend types)
interface TailscaleApiResponse {
  backend_state: string;
  tailscale_ip: string;
  hostname: string;
  tailnet?: string;
  peers?: Array<{
    id: string;
    hostname: string;
    tailscale_ip: string;
    online: boolean;
    is_bridge_server?: boolean;
  }>;
  funnel_status?: {
    enabled: boolean;
    exposed_ports?: Record<string, string>;
  };
  needs_login?: boolean;
}

interface BridgeApiResponse {
  status?: {
    configured: boolean;
    connected: boolean;
    url?: string;
  };
  success: boolean;
}

/**
 * Network API endpoints
 */
export const networkApi = {
  /**
   * Get Tailscale VPN status
   * Transforms backend response to frontend TailscaleStatus type
   */
  getTailscaleStatus: async (): Promise<TailscaleStatus> => {
    const response = await apiClient.get<TailscaleApiResponse>('/dashboard/tailscale/status');

    // Transform backend response to frontend format
    return {
      connected: response.backend_state === 'Running',
      ip: response.tailscale_ip || undefined,
      hostname: response.hostname,
      peers: response.peers?.map(p => ({
        name: p.hostname,
        ip: p.tailscale_ip,
        online: p.online,
      })),
    };
  },

  /**
   * Ping a host to test connectivity
   * Note: Ping endpoint may not exist on all PiOrchestrator versions
   */
  ping: async (host: string, count = 3): Promise<PingResponse> => {
    try {
      return await apiClient.post<PingResponse>('/dashboard/tailscale/ping', {
        type: 'icmp',
        host,
        count,
      });
    } catch (error) {
      // Ping endpoint may not exist - return error response
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ping not available on this system',
      };
    }
  },

  /**
   * Get MQTT broker status
   * Note: MQTT status endpoint may not exist - returns disconnected state on error
   */
  getMqttStatus: async (): Promise<{
    connected: boolean;
    broker?: string;
    port?: number;
    clientId?: string;
    latency_ms?: number;
  }> => {
    try {
      return await apiClient.get('/dashboard/mqtt/status');
    } catch {
      // MQTT endpoint may not exist
      return { connected: false };
    }
  },

  /**
   * Get BridgeServer connection status
   * Transforms backend response to frontend format
   */
  getBridgeServerStatus: async (): Promise<{
    connected: boolean;
    url?: string;
    latency_ms?: number;
    version?: string;
  }> => {
    try {
      const response = await apiClient.get<BridgeApiResponse>('/dashboard/bridge/status');

      // Transform nested response to flat format
      return {
        connected: response.status?.connected ?? false,
        url: response.status?.url,
      };
    } catch {
      return { connected: false };
    }
  },
};
