/**
 * Config API Service
 * Configuration management endpoints
 */

import { apiClient } from './client';
import type { ConfigEntry } from '@/domain/types/entities';

/**
 * Config API endpoints
 */
export const configApi = {
  /**
   * Get all configuration entries
   */
  get: () => apiClient.get<ConfigEntry[]>('/dashboard/config'),

  /**
   * Update a configuration value
   */
  update: (key: string, value: string) =>
    apiClient.put<{ success: boolean }>(
      `/dashboard/config/${encodeURIComponent(key)}`,
      { value }
    ),

  /**
   * Reset a configuration value to default
   */
  reset: (key: string) =>
    apiClient.post<{ success: boolean; value?: string }>(
      `/dashboard/config/${encodeURIComponent(key)}/reset`
    ),
};
