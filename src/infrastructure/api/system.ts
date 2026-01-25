/**
 * System API Service
 * System health and status endpoints
 *
 * Feature: 005-testing-research-and-hardening (T021)
 * Includes Zod schema validation for runtime API contract enforcement.
 * Updated: Uses V1 client for proper envelope unwrapping.
 */

import { apiClient } from './client';
import { v1Get } from './v1-client';
import {
  SystemInfoDataSchema,
  safeParseWithErrors,
} from './schemas';
import type { RawSystemInfoResponse, SystemInfoData } from './schemas';
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
 */
export function transformSystemInfo(raw: SystemInfoData): SystemStatus {
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
   * Uses V1 client for proper envelope unwrapping.
   * Validates response against Zod schema before transformation.
   */
  getInfo: async (): Promise<SystemStatus> => {
    // Use V1 client which handles envelope unwrapping
    const { data } = await v1Get<SystemInfoData>('/system/info');

    // Validate API response against schema
    const validation = safeParseWithErrors(SystemInfoDataSchema, data);
    if (!validation.success) {
      console.warn('[API Contract] System info validation failed:', validation.errors);
      // Still proceed with transformation - graceful degradation
    }

    return transformSystemInfo(data);
  },

  /**
   * Health check endpoint
   */
  getHealth: () => apiClient.get<HealthCheckResponse>('/health'),
};
