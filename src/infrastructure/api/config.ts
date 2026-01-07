/**
 * Config API Service
 * Configuration management endpoints
 */

import { apiClient } from './client';
import type { ConfigEntry, ConfigCategory } from '@/domain/types/entities';

// Backend response types
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
  success: boolean;
}

// Map section names to ConfigCategory
function mapSectionToCategory(sectionName: string): ConfigCategory {
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
   * Transforms backend nested sections to flat ConfigEntry array
   */
  get: async (): Promise<ConfigEntry[]> => {
    const response = await apiClient.get<ConfigApiResponse>('/dashboard/config');

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
