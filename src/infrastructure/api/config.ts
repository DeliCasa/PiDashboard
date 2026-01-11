/**
 * Config API Service
 * Configuration management endpoints
 *
 * Feature: 005-testing-research-and-hardening (T023)
 * Includes Zod schema validation for runtime API contract enforcement.
 */

import { apiClient } from './client';
import {
  ConfigResponseSchema,
  ConfigUpdateResponseSchema,
  ConfigResetResponseSchema,
  safeParseWithErrors,
} from './schemas';
import type { ConfigEntry, ConfigCategory } from '@/domain/types/entities';

// Backend response types
// NOTE: V1 envelope is unwrapped by proxy, so success is not at top level
interface ConfigApiResponse {
  sections: Array<{
    name: string;
    description?: string;
    items: Array<{
      key: string;
      value: string;
      default_value?: string;
      type: string;
      description?: string;
      required?: boolean;
      editable?: boolean;
      validation?: {
        options?: string[];
        min?: number;
        max?: number;
        pattern?: string;
      };
    }>;
  }>;
}

/**
 * Map section names to ConfigCategory
 * @exported for unit testing (T017)
 */
export function mapSectionToCategory(sectionName: string): ConfigCategory {
  const map: Record<string, ConfigCategory> = {
    'Server': 'system',
    'System': 'system',
    'Bridge': 'system',
    'MQTT': 'mqtt',
    'WiFi': 'wifi',
    'Hardware': 'hardware',
    'Heartbeat': 'monitoring',
    'Logging': 'monitoring',
    'Monitoring': 'monitoring',
  };
  return map[sectionName] || 'system';
}

/**
 * Config API endpoints
 */
export const configApi = {
  /**
   * Get all configuration entries
   * Validates response and transforms backend nested sections to flat ConfigEntry array.
   */
  get: async (): Promise<ConfigEntry[]> => {
    const response = await apiClient.get<ConfigApiResponse>('/dashboard/config');

    // Validate API response against schema
    const validation = safeParseWithErrors(ConfigResponseSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] Config get validation failed:', validation.errors);
    }

    // Transform nested sections to flat array
    const entries: ConfigEntry[] = [];

    for (const section of response.sections || []) {
      const category = mapSectionToCategory(section.name);

      for (const item of section.items || []) {
        entries.push({
          key: item.key,
          value: item.value,
          default_value: item.default_value,
          type: item.type as ConfigEntry['type'],
          description: item.description,
          category,
          editable: item.editable ?? true,
          sensitive: item.type === 'secret',
        });
      }
    }

    return entries;
  },

  /**
   * Update a configuration value
   * Validates response against schema.
   */
  update: async (key: string, value: string): Promise<{ success: boolean }> => {
    const response = await apiClient.put<{ success: boolean }>(
      `/dashboard/config/${encodeURIComponent(key)}`,
      { value }
    );

    // Validate API response against schema
    const validation = safeParseWithErrors(ConfigUpdateResponseSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] Config update validation failed:', validation.errors);
    }

    return response;
  },

  /**
   * Reset a configuration value to default
   * Validates response against schema.
   */
  reset: async (key: string): Promise<{ success: boolean; value?: string }> => {
    const response = await apiClient.post<{ success: boolean; value?: string }>(
      `/dashboard/config/${encodeURIComponent(key)}/reset`
    );

    // Validate API response against schema
    const validation = safeParseWithErrors(ConfigResetResponseSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] Config reset validation failed:', validation.errors);
    }

    return response;
  },
};
