/**
 * Door API Service
 * Door control and status endpoints
 */

import { apiClient } from './client';
import type { Door, DoorOperation } from '@/domain/types/entities';
import type { DoorCommandResponse } from '@/domain/types/api';

/**
 * Door API endpoints
 */
export const doorApi = {
  /**
   * Get current door status
   */
  getStatus: () => apiClient.get<Door>('/door/status'),

  /**
   * Open door for specified duration
   */
  open: (duration?: number, testingMode?: boolean) =>
    apiClient.post<DoorCommandResponse>('/door/open', {
      duration,
      testing_mode: testingMode,
    }),

  /**
   * Close/lock door
   */
  close: () => apiClient.post<DoorCommandResponse>('/door/close'),

  /**
   * Get door operation history
   */
  getHistory: (limit = 20) =>
    apiClient.get<DoorOperation[]>(`/door/history?limit=${limit}`),
};
