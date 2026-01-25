/**
 * Door API Service
 * Door control and status endpoints
 *
 * Feature: 005-testing-research-and-hardening (T024)
 * Includes Zod schema validation for runtime API contract enforcement.
 * Updated: Uses V1 client for proper envelope unwrapping.
 */

import { v1Get, v1Post } from './v1-client';
import {
  DoorStatusSchema,
  DoorCommandResponseSchema,
  DoorOperationSchema,
  safeParseWithErrors,
} from './schemas';
import type { Door, DoorOperation } from '@/domain/types/entities';
import type { DoorCommandResponse } from '@/domain/types/api';

/**
 * Raw door status from API (may have extra fields)
 */
interface RawDoorStatus {
  id?: string;
  state: string;
  lock_state?: string;
  relay_pin?: number;
  hardware_available?: boolean;
  dev_mode?: boolean;
  last_command?: string;
  last_command_time?: string;
  error?: string;
}

/**
 * Transform raw API response to Door type
 * Converts snake_case API fields to camelCase frontend fields
 */
function transformDoorStatus(raw: RawDoorStatus): Door {
  return {
    id: raw.id || 'door-1',
    state: raw.state as Door['state'],
    lockState: (raw.lock_state || 'unknown') as Door['lockState'],
    lastCommand: raw.last_command,
    relayPin: raw.relay_pin || 17,
  };
}

/**
 * Door API endpoints
 */
export const doorApi = {
  /**
   * Get current door status
   * Uses V1 client for proper envelope unwrapping.
   * Validates response against schema.
   */
  getStatus: async (): Promise<Door> => {
    const { data } = await v1Get<RawDoorStatus>('/door/status');

    // Transform to expected Door type
    const door = transformDoorStatus(data);

    // Validate transformed response against schema
    const validation = safeParseWithErrors(DoorStatusSchema, door);
    if (!validation.success) {
      console.warn('[API Contract] Door status validation failed:', validation.errors);
    }

    return door;
  },

  /**
   * Open door for specified duration
   * Uses V1 client for proper envelope unwrapping.
   * Validates response against schema.
   */
  open: async (duration?: number, testingMode?: boolean): Promise<DoorCommandResponse> => {
    const { data } = await v1Post<DoorCommandResponse>('/door/open', {
      duration,
      testing_mode: testingMode,
    });

    // Validate API response against schema
    const validation = safeParseWithErrors(DoorCommandResponseSchema, data);
    if (!validation.success) {
      console.warn('[API Contract] Door open validation failed:', validation.errors);
    }

    return data;
  },

  /**
   * Close/lock door
   * Uses V1 client for proper envelope unwrapping.
   * Validates response against schema.
   */
  close: async (): Promise<DoorCommandResponse> => {
    const { data } = await v1Post<DoorCommandResponse>('/door/close');

    // Validate API response against schema
    const validation = safeParseWithErrors(DoorCommandResponseSchema, data);
    if (!validation.success) {
      console.warn('[API Contract] Door close validation failed:', validation.errors);
    }

    return data;
  },

  /**
   * Get door operation history
   * Uses V1 client for proper envelope unwrapping.
   * Validates each operation against schema.
   */
  getHistory: async (limit = 20): Promise<DoorOperation[]> => {
    const { data } = await v1Get<{ history: DoorOperation[] }>(`/door/history?limit=${limit}`);

    const operations = data.history || [];

    // Validate each operation in the array
    for (let i = 0; i < operations.length; i++) {
      const validation = safeParseWithErrors(DoorOperationSchema, operations[i]);
      if (!validation.success) {
        console.warn(`[API Contract] Door history[${i}] validation failed:`, validation.errors);
      }
    }

    return operations;
  },
};
