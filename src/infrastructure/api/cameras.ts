/**
 * Cameras API Service
 * Camera management and capture endpoints
 */

import { apiClient } from './client';
import type { Camera, CameraDiagnostics } from '@/domain/types/entities';
import type { CaptureResponse } from '@/domain/types/api';

/**
 * Cameras API endpoints
 */
export const camerasApi = {
  /**
   * List registered cameras
   */
  list: () => apiClient.get<Camera[]>('/cameras'),

  /**
   * Get camera diagnostics for all cameras
   */
  getDiagnostics: () => apiClient.get<CameraDiagnostics[]>('/cameras/diagnostics'),

  /**
   * Trigger test capture from camera
   */
  capture: (cameraId: string) =>
    apiClient.post<CaptureResponse>(`/cameras/${encodeURIComponent(cameraId)}/capture`),

  /**
   * Reboot camera
   */
  reboot: (cameraId: string) =>
    apiClient.post<{ success: boolean }>(`/cameras/${encodeURIComponent(cameraId)}/reboot`),
};
