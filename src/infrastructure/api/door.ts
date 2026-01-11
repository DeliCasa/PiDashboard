/**
 * Door API Service
 * Door control and status endpoints
 *
 * Feature: 005-testing-research-and-hardening (T024)
 * Includes Zod schema validation for runtime API contract enforcement.
 */

import { apiClient } from './client';
import {
  DoorStatusSchema,
  DoorCommandResponseSchema,
  DoorOperationSchema,
  safeParseWithErrors,
} from './schemas';
import type { Door, DoorOperation } from '@/domain/types/entities';
import type { DoorCommandResponse } from '@/domain/types/api';

/**
 * Door API endpoints
 */
export const doorApi = {
  /**
   * Get current door status
   * Validates response against schema.
   */
  getStatus: async (): Promise<Door> => {
    const response = await apiClient.get<Door>('/door/status');

    // Validate API response against schema
    const validation = safeParseWithErrors(DoorStatusSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] Door status validation failed:', validation.errors);
    }

    return response;
  },

  /**
   * Open door for specified duration
   * Validates response against schema.
   */
  open: async (duration?: number, testingMode?: boolean): Promise<DoorCommandResponse> => {
    const response = await apiClient.post<DoorCommandResponse>('/door/open', {
      duration,
      testing_mode: testingMode,
    });

    // Validate API response against schema
    const validation = safeParseWithErrors(DoorCommandResponseSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] Door open validation failed:', validation.errors);
    }

    return response;
  },

  /**
   * Close/lock door
   * Validates response against schema.
   */
  close: async (): Promise<DoorCommandResponse> => {
    const response = await apiClient.post<DoorCommandResponse>('/door/close');

    // Validate API response against schema
    const validation = safeParseWithErrors(DoorCommandResponseSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] Door close validation failed:', validation.errors);
    }

    return response;
  },

  /**
   * Get door operation history
   * Validates each operation against schema.
   */
  getHistory: async (limit = 20): Promise<DoorOperation[]> => {
    const response = await apiClient.get<DoorOperation[]>(`/door/history?limit=${limit}`);

    // Validate each operation in the array
    for (let i = 0; i < response.length; i++) {
      const validation = safeParseWithErrors(DoorOperationSchema, response[i]);
      if (!validation.success) {
        console.warn(`[API Contract] Door history[${i}] validation failed:`, validation.errors);
      }
    }

    return response;
  },
};
