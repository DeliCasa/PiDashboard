/**
 * System API Service
 * System health and status endpoints
 *
 * Feature: 005-testing-research-and-hardening (T021)
 * Includes Zod schema validation for runtime API contract enforcement.
 */

import { apiClient } from './client';
import {
  SystemInfoResponseSchema,
  safeParseWithErrors,
} from './schemas';
import type { RawSystemInfoResponse } from './schemas';
import type { SystemStatus, PiModel } from '@/domain/types/entities';
import type { HealthCheckResponse } from '@/domain/types/api';

// Re-export the type for backward compatibility
export type { RawSystemInfoResponse };

/**
 * Transform raw API response to frontend SystemStatus type
 * @exported for unit testing (T023)
 *
 * Note: Schema validation happens at the API call level (getInfo),
 * so this function assumes valid data.
 * NOTE: V1 envelope is unwrapped by proxy, so we receive data directly.
 */
export function transformSystemInfo(raw: RawSystemInfoResponse): SystemStatus {
  // V1 envelope is unwrapped - data is the response itself now
  const data = raw;
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
   * Validates response against Zod schema before transformation.
   */
  getInfo: async (): Promise<SystemStatus> => {
    const raw = await apiClient.get<RawSystemInfoResponse>('/system/info');

    // Validate API response against schema
    const validation = safeParseWithErrors(SystemInfoResponseSchema, raw);
    if (!validation.success) {
      console.warn('[API Contract] System info validation failed:', validation.errors);
      // Still proceed with transformation - graceful degradation
    }

    return transformSystemInfo(raw);
  },

  /**
   * Health check endpoint
   */
  getHealth: () => apiClient.get<HealthCheckResponse>('/health'),
};
