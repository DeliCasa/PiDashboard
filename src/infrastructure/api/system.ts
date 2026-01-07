/**
 * System API Service
 * System health and status endpoints
 */

import { apiClient } from './client';
import type { SystemStatus, PiModel } from '@/domain/types/entities';
import type { HealthCheckResponse } from '@/domain/types/api';

/**
 * Raw API response from PiOrchestrator /api/system/info
 */
interface RawSystemInfoResponse {
  success: boolean;
  data: {
    timestamp: string;
    cpu: {
      usage_percent: number;
      core_count: number;
      per_core: number[];
    };
    memory: {
      used_mb: number;
      total_mb: number;
      used_percent: number;
      available_mb: number;
    };
    disk: {
      used_gb: number;
      total_gb: number;
      used_percent: number;
      path: string;
    };
    temperature_celsius: number;
    uptime: number; // nanoseconds
    load_average: {
      load_1: number;
      load_5: number;
      load_15: number;
    };
    overall_status: string;
  };
}

/**
 * Transform raw API response to frontend SystemStatus type
 */
function transformSystemInfo(raw: RawSystemInfoResponse): SystemStatus {
  const { data } = raw;
  const uptimeSeconds = Math.floor(data.uptime / 1_000_000_000);

  // Format uptime as human-readable string
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeStr = days > 0
    ? `${days}d ${hours}h ${minutes}m`
    : hours > 0
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;

  // Detect Pi model based on core count (simple heuristic)
  const piModel: PiModel = data.cpu.core_count >= 4 ? 'pi4' : 'pi3';

  return {
    cpu_usage: data.cpu.usage_percent,
    memory_usage: data.memory.used_percent,
    memory_total: data.memory.total_mb,
    memory_available: data.memory.available_mb,
    disk_usage: data.disk.used_percent,
    disk_total: data.disk.total_gb,
    disk_available: data.disk.total_gb - data.disk.used_gb,
    temperature: data.temperature_celsius,
    uptime: uptimeStr,
    uptime_seconds: uptimeSeconds,
    hostname: 'raspberrypi', // Not in API response, use default
    pi_model: piModel,
  };
}

/**
 * System API endpoints
 */
export const systemApi = {
  /**
   * Get current system status (CPU, memory, disk, temperature)
   */
  getInfo: async (): Promise<SystemStatus> => {
    const raw = await apiClient.get<RawSystemInfoResponse>('/system/info');
    return transformSystemInfo(raw);
  },

  /**
   * Health check endpoint
   */
  getHealth: () => apiClient.get<HealthCheckResponse>('/health'),
};
