/**
 * Cameras API Service (DEPRECATED)
 * Camera management and capture endpoints
 *
 * @deprecated Use `v1CamerasApi` from `./v1-cameras.ts` instead.
 * This module uses the deprecated `/dashboard/cameras` endpoints.
 * The V1 API (`/api/v1/cameras/*`) provides better error handling,
 * typed responses, and base64 image capture.
 *
 * Migration Guide:
 * - `camerasApi.list()` → `v1CamerasApi.list()`
 * - `camerasApi.getDiagnostics()` → `v1CamerasApi.getDiagnostics()`
 * - `camerasApi.capture(id)` → `v1CamerasApi.capture(id)`
 * - `camerasApi.reboot(id)` → `v1CamerasApi.reboot(id)`
 *
 * See: Feature 034-esp-camera-integration
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
 * @deprecated Use `v1CamerasApi` from `./v1-cameras.ts` instead.
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
