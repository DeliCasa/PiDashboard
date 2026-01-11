/**
 * Cameras API Service
 * Camera management and capture endpoints
 */

import { apiClient } from './client';
import type { Camera, CameraDiagnostics } from '@/domain/types/entities';
import type { CaptureResponse } from '@/domain/types/api';

/**
 * Camera list response from the backend
 */
interface CameraListResponse {
  cameras: Camera[];
  count: number;
  success?: boolean;
}

/**
 * Cameras API endpoints
 */
export const camerasApi = {
  /**
   * List registered cameras
   */
  list: async (): Promise<Camera[]> => {
    const response = await apiClient.get<CameraListResponse>('/dashboard/cameras');
    // Handle both direct array response and wrapped response
    if (Array.isArray(response)) {
      return response;
    }
    return Array.isArray(response.cameras) ? response.cameras : [];
  },

  /**
   * Get camera diagnostics for all cameras
   */
  getDiagnostics: () => apiClient.get<CameraDiagnostics[]>('/dashboard/cameras/diagnostics'),

  /**
   * Trigger test capture from camera
   */
  capture: (cameraId: string) =>
    apiClient.post<CaptureResponse>(`/dashboard/cameras/${encodeURIComponent(cameraId)}/capture`),

  /**
   * Reboot camera
   */
  reboot: (cameraId: string) =>
    apiClient.post<{ success: boolean }>(`/dashboard/cameras/${encodeURIComponent(cameraId)}/reboot`),
};
