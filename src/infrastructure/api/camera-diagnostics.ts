/**
 * Camera Diagnostics API Client
 * Feature: 042-diagnostics-integration
 *
 * API client for camera diagnostics endpoints.
 * Follows Feature 034/037 patterns for V1 API with fallback.
 */

import { apiClient, ApiError } from './client';
import {
  CameraDiagnosticsResponseSchema,
  CameraDiagnosticsListSchema,
  isValidCameraId,
} from './camera-diagnostics-schemas';
import type { CameraDiagnostics } from '@/domain/types/camera-diagnostics';

// ============================================================================
// Constants
// ============================================================================

const V1_BASE = '/v1/cameras';
const LEGACY_BASE = '/dashboard/cameras';

// ============================================================================
// Camera Diagnostics API
// ============================================================================

/**
 * Get diagnostics for a specific camera.
 *
 * Tries V1 endpoint first, falls back to legacy if unavailable.
 *
 * @param cameraId - Camera ID in format espcam-XXXXXX
 * @throws ApiError if camera not found or request fails
 */
export async function getCameraDiagnostics(cameraId: string): Promise<CameraDiagnostics> {
  // Validate camera ID format
  if (!isValidCameraId(cameraId)) {
    throw new ApiError(
      400,
      `Invalid camera ID format: ${cameraId}. Expected: espcam-XXXXXX`,
      'VALIDATION_ERROR'
    );
  }

  try {
    // Try V1 endpoint
    const response = await apiClient.get<{ success: boolean; data: CameraDiagnostics }>(
      `${V1_BASE}/${cameraId}/diagnostics`
    );

    // Validate response
    const parsed = CameraDiagnosticsResponseSchema.safeParse(response);
    if (!parsed.success) {
      console.warn('[Camera Diagnostics] V1 response validation failed:', parsed.error.format());
    }

    return response.data;
  } catch (error) {
    // Check if this is a feature unavailable error (404/503)
    if (error instanceof ApiError && (error.status === 404 || error.status === 503)) {
      console.debug(
        `[Camera Diagnostics] V1 endpoint unavailable (${error.status}), camera may be offline`
      );
      throw error;
    }

    // For other errors, attempt legacy fallback
    console.warn('[Camera Diagnostics] V1 failed, attempting legacy fallback:', error);
    return getCameraDiagnosticsLegacy(cameraId);
  }
}

/**
 * Get diagnostics using legacy endpoint.
 *
 * @param cameraId - Camera ID to find in legacy response
 * @throws ApiError if camera not found
 */
async function getCameraDiagnosticsLegacy(cameraId: string): Promise<CameraDiagnostics> {
  try {
    const response = await apiClient.get<CameraDiagnostics[]>(`${LEGACY_BASE}/diagnostics`);

    // Validate response as array
    const parsed = CameraDiagnosticsListSchema.safeParse(response);
    if (!parsed.success) {
      console.warn('[Camera Diagnostics] Legacy response validation failed:', parsed.error.format());
    }

    // Find specific camera in list
    const camera = response.find(
      (c: CameraDiagnostics) => c.camera_id === cameraId || c.device_id === cameraId
    );

    if (!camera) {
      throw new ApiError(404, `Camera not found: ${cameraId}`, 'NOT_FOUND');
    }

    return camera;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      500,
      'Failed to fetch camera diagnostics',
      'INTERNAL_ERROR'
    );
  }
}

/**
 * Get diagnostics for all cameras.
 *
 * Uses legacy endpoint which returns full list.
 *
 * @returns Array of camera diagnostics
 */
export async function listCameraDiagnostics(): Promise<CameraDiagnostics[]> {
  try {
    const response = await apiClient.get<CameraDiagnostics[]>(`${LEGACY_BASE}/diagnostics`);

    // Validate response
    const parsed = CameraDiagnosticsListSchema.safeParse(response);
    if (!parsed.success) {
      console.warn('[Camera Diagnostics] List validation failed:', parsed.error.format());
    }

    return response;
  } catch (error) {
    // Return empty array for graceful degradation on 404/503
    if (error instanceof ApiError && (error.status === 404 || error.status === 503)) {
      console.debug('[Camera Diagnostics] Diagnostics endpoint unavailable, returning empty list');
      return [];
    }
    throw error;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const cameraDiagnosticsApi = {
  get: getCameraDiagnostics,
  list: listCameraDiagnostics,
};

export default cameraDiagnosticsApi;
