/**
 * V1 Cameras API Client
 * Feature: 034-esp-camera-integration
 *
 * ESP camera management via PiOrchestrator V1 API.
 * Based on OpenAPI spec: specs/034-esp-camera-integration/contracts/v1-cameras-api.yaml
 *
 * Note: Falls back to legacy /api/dashboard/cameras endpoint when V1 API
 * is not available (returns HTML from SPA fallback).
 */

import { apiClient } from './client';
import { V1ApiError } from './errors';
import {
  CameraListResponseSchema,
  CameraSchema,
  DiagnosticsListResponseSchema,
  RebootResultSchema,
  CameraErrorResponseSchema,
  type Camera,
  type CameraDiagnostics,
  type CaptureResult,
  type RebootResult,
  type CameraListResponse,
} from './v1-cameras-schemas';

// ============================================================================
// Constants
// ============================================================================

// Note: apiClient already prepends '/api', so we use '/v1/cameras'
const V1_CAMERAS_BASE = '/v1/cameras';

// Legacy endpoint for fallback when V1 is not available
const LEGACY_CAMERAS_BASE = '/dashboard/cameras';

/** Default timeout for camera capture (30 seconds) */
const CAPTURE_TIMEOUT_MS = 30_000;

/** Default timeout for other camera operations (10 seconds) */
const DEFAULT_TIMEOUT_MS = 10_000;

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Raw camera data from the API (may use device_id, last_seen, etc.)
 */
interface RawCamera {
  device_id?: string;
  id?: string;
  name?: string;
  status?: string;
  last_seen?: string;
  lastSeen?: string;
  health?: Camera['health'];
  ip_address?: string;
  mac_address?: string;
}

/**
 * Normalizes a camera object from API response to match frontend schema.
 * Maps backend field names to frontend expected names:
 * - device_id → id
 * - last_seen → lastSeen
 */
function normalizeCamera(raw: RawCamera): Camera {
  const id = raw.id || raw.device_id || '';
  const lastSeen = raw.lastSeen || raw.last_seen || new Date().toISOString();

  return {
    id,
    name: raw.name || id,
    status: (raw.status as Camera['status']) || 'offline',
    lastSeen,
    health: raw.health,
    ip_address: raw.ip_address,
    mac_address: raw.mac_address,
  };
}

/**
 * Normalizes an array of cameras from API response.
 */
function normalizeCameras(rawCameras: RawCamera[]): Camera[] {
  return rawCameras.map(normalizeCamera);
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parses an error response from the cameras API.
 * Falls back to generic error if parsing fails.
 */
function parseErrorResponse(error: unknown): V1ApiError {
  // Check if error has response body
  if (error && typeof error === 'object' && 'body' in error) {
    const parsed = CameraErrorResponseSchema.safeParse((error as { body: unknown }).body);
    if (parsed.success) {
      return new V1ApiError(
        parsed.data.code,
        parsed.data.error,
        parsed.data.retryable ?? false,
        parsed.data.retry_after_seconds
      );
    }
  }

  // Handle ApiError with status code
  if (error instanceof Error && 'status' in error) {
    const apiError = error as Error & { status: number; code?: string };
    return new V1ApiError(
      apiError.code || 'NETWORK_ERROR',
      apiError.message,
      apiError.status >= 500,
      undefined
    );
  }

  // Fallback for unknown errors
  return new V1ApiError(
    'NETWORK_ERROR',
    error instanceof Error ? error.message : 'Unknown error',
    true
  );
}

// ============================================================================
// API Client
// ============================================================================

/**
 * V1 Cameras API client.
 *
 * Provides typed methods for all camera operations with Zod validation.
 */
export const v1CamerasApi = {
  /**
   * List all registered cameras with status and health metrics.
   *
   * Falls back to legacy /dashboard/cameras endpoint if V1 API is not available.
   *
   * @returns Promise with array of cameras
   * @throws V1ApiError on failure
   */
  list: async (): Promise<Camera[]> => {
    try {
      const response = await apiClient.get<CameraListResponse | string>(
        V1_CAMERAS_BASE,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      // Check if we got HTML (SPA fallback) instead of JSON
      if (typeof response === 'string' && response.includes('<!doctype html>')) {
        console.warn('[V1 Cameras] V1 API returned HTML, falling back to legacy endpoint');
        return v1CamerasApi._listLegacy();
      }

      // Normalize camera data from API response
      const resp = response as { cameras?: RawCamera[]; count?: number };
      const rawCameras = Array.isArray(resp.cameras) ? resp.cameras : [];
      const cameras = normalizeCameras(rawCameras);

      // Validate normalized response
      const parsed = CameraListResponseSchema.safeParse({ cameras, count: cameras.length });
      if (!parsed.success) {
        console.warn('[V1 Cameras] list response validation failed after normalization:', parsed.error.issues);
        // Return normalized data anyway for resilience
        return cameras;
      }

      return parsed.data.cameras;
    } catch (error) {
      // If V1 fails, try legacy endpoint
      console.warn('[V1 Cameras] V1 API failed, falling back to legacy endpoint:', error);
      try {
        return await v1CamerasApi._listLegacy();
      } catch {
        // If legacy also fails, throw original error
        throw parseErrorResponse(error);
      }
    }
  },

  /**
   * Legacy list implementation using /dashboard/cameras endpoint.
   * @internal
   */
  _listLegacy: async (): Promise<Camera[]> => {
    interface LegacyCameraResponse {
      cameras: RawCamera[];
      count: number;
      success?: boolean;
    }

    const response = await apiClient.get<LegacyCameraResponse | RawCamera[]>(
      LEGACY_CAMERAS_BASE,
      { timeout: DEFAULT_TIMEOUT_MS }
    );

    // Handle both direct array and wrapped response
    if (Array.isArray(response)) {
      return normalizeCameras(response);
    }
    const rawCameras = Array.isArray(response.cameras) ? response.cameras : [];
    return normalizeCameras(rawCameras);
  },

  /**
   * Get a single camera by ID.
   *
   * @param id - Camera ID (MAC address or UUID)
   * @returns Promise with camera details
   * @throws V1ApiError on failure (CAMERA_NOT_FOUND for 404)
   */
  getById: async (id: string): Promise<Camera> => {
    try {
      const response = await apiClient.get<RawCamera>(
        `${V1_CAMERAS_BASE}/${encodeURIComponent(id)}`,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      // Normalize camera data
      const camera = normalizeCamera(response);

      // Validate normalized response
      const parsed = CameraSchema.safeParse(camera);
      if (!parsed.success) {
        console.warn('[V1 Cameras] getById response validation failed after normalization:', parsed.error.issues);
        return camera;
      }

      return parsed.data;
    } catch (error) {
      throw parseErrorResponse(error);
    }
  },

  /**
   * Get diagnostics for all cameras.
   *
   * Returns extended information for debugging including
   * connection quality and error counts.
   * Falls back to legacy endpoint if V1 API is not available.
   *
   * @returns Promise with array of camera diagnostics
   * @throws V1ApiError on failure
   */
  getDiagnostics: async (): Promise<CameraDiagnostics[]> => {
    try {
      const response = await apiClient.get<CameraDiagnostics[] | string>(
        `${V1_CAMERAS_BASE}/diagnostics`,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      // Check if we got HTML (SPA fallback) instead of JSON
      if (typeof response === 'string' && response.includes('<!doctype html>')) {
        console.warn('[V1 Cameras] V1 diagnostics returned HTML, falling back to legacy endpoint');
        return v1CamerasApi._getDiagnosticsLegacy();
      }

      // Normalize diagnostics data (which includes camera data)
      const rawDiagnostics = Array.isArray(response) ? response : [];
      const diagnostics = rawDiagnostics.map((raw: RawCamera & { diagnostics?: CameraDiagnostics['diagnostics'] }) => ({
        ...normalizeCamera(raw),
        diagnostics: raw.diagnostics,
      }));

      // Validate normalized response
      const parsed = DiagnosticsListResponseSchema.safeParse(diagnostics);
      if (!parsed.success) {
        console.warn('[V1 Cameras] getDiagnostics response validation failed after normalization:', parsed.error.issues);
        return diagnostics;
      }

      return parsed.data;
    } catch (error) {
      // If V1 fails, try legacy endpoint
      console.warn('[V1 Cameras] V1 diagnostics failed, falling back to legacy endpoint:', error);
      try {
        return await v1CamerasApi._getDiagnosticsLegacy();
      } catch {
        throw parseErrorResponse(error);
      }
    }
  },

  /**
   * Legacy diagnostics implementation using /dashboard/cameras/diagnostics endpoint.
   * @internal
   */
  _getDiagnosticsLegacy: async (): Promise<CameraDiagnostics[]> => {
    const response = await apiClient.get<(RawCamera & { diagnostics?: CameraDiagnostics['diagnostics'] })[]>(
      `${LEGACY_CAMERAS_BASE}/diagnostics`,
      { timeout: DEFAULT_TIMEOUT_MS }
    );
    const rawDiagnostics = Array.isArray(response) ? response : [];
    return rawDiagnostics.map((raw) => ({
      ...normalizeCamera(raw),
      diagnostics: raw.diagnostics,
    }));
  },

  /**
   * Capture a still image from a camera.
   *
   * Returns base64-encoded JPEG image data on success.
   * This operation may take up to 30 seconds depending on
   * camera resolution and network conditions.
   * Falls back to legacy endpoint if V1 API is not available.
   *
   * @param id - Camera ID
   * @returns Promise with capture result including base64 image
   * @throws V1ApiError on failure (CAMERA_OFFLINE, CAPTURE_TIMEOUT, etc.)
   */
  capture: async (id: string): Promise<CaptureResult> => {
    try {
      // Note: V1 API returns raw JPEG binary, not JSON
      // Use direct fetch to handle binary response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);

      const response = await fetch(
        `/api${V1_CAMERAS_BASE}/${encodeURIComponent(id)}/snapshot`,
        {
          method: 'POST',
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      // Check if we got HTML (SPA fallback)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        console.warn('[V1 Cameras] V1 snapshot returned HTML, falling back to legacy endpoint');
        return v1CamerasApi._captureLegacy(id);
      }

      // Handle error responses
      if (!response.ok) {
        // Try to parse as JSON error
        try {
          const errorData = await response.json();
          throw new V1ApiError(
            errorData.code || 'CAPTURE_FAILED',
            errorData.error || 'Capture failed',
            false
          );
        } catch {
          throw new V1ApiError('CAPTURE_FAILED', `Capture failed: ${response.status}`, false);
        }
      }

      // Handle raw JPEG binary response
      if (contentType.includes('image/')) {
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        return {
          success: true,
          image: base64,
          timestamp: new Date().toISOString(),
          camera_id: id,
          file_size: arrayBuffer.byteLength,
        };
      }

      // Handle JSON response (legacy format)
      const jsonResponse = await response.json();
      return {
        success: jsonResponse.success ?? true,
        image: jsonResponse.image,
        timestamp: jsonResponse.timestamp || new Date().toISOString(),
        camera_id: jsonResponse.camera_id || id,
        file_size: jsonResponse.file_size,
        error: jsonResponse.error,
      };
    } catch (error) {
      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new V1ApiError('CAPTURE_TIMEOUT', 'Capture timed out', true);
      }

      // If V1 fails, try legacy endpoint
      console.warn('[V1 Cameras] V1 capture failed, falling back to legacy endpoint:', error);
      try {
        return await v1CamerasApi._captureLegacy(id);
      } catch {
        throw parseErrorResponse(error);
      }
    }
  },

  /**
   * Legacy capture implementation using /dashboard/cameras/:id/capture endpoint.
   * @internal
   */
  _captureLegacy: async (id: string): Promise<CaptureResult> => {
    const response = await apiClient.post<CaptureResult>(
      `${LEGACY_CAMERAS_BASE}/${encodeURIComponent(id)}/capture`,
      undefined,
      { timeout: CAPTURE_TIMEOUT_MS }
    );

    // Legacy endpoint returns same format, just add camera_id if missing
    return {
      success: response.success,
      image: response.image,
      timestamp: response.timestamp,
      camera_id: response.camera_id || id,
      file_size: response.file_size,
      error: response.error,
    };
  },

  /**
   * Reboot a camera.
   *
   * Sends a reboot command to the specified camera.
   * The camera will temporarily go offline during reboot.
   * Falls back to legacy endpoint if V1 API is not available.
   *
   * @param id - Camera ID
   * @returns Promise with reboot result
   * @throws V1ApiError on failure (CAMERA_OFFLINE, REBOOT_FAILED, etc.)
   */
  reboot: async (id: string): Promise<RebootResult> => {
    try {
      const response = await apiClient.post<RebootResult | string>(
        `${V1_CAMERAS_BASE}/${encodeURIComponent(id)}/reboot`,
        undefined,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      // Check if we got HTML (SPA fallback) instead of JSON
      if (typeof response === 'string' && response.includes('<!doctype html>')) {
        console.warn('[V1 Cameras] V1 reboot returned HTML, falling back to legacy endpoint');
        return v1CamerasApi._rebootLegacy(id);
      }

      // Validate response
      const parsed = RebootResultSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[V1 Cameras] reboot response validation failed:', parsed.error.issues);
        return response as RebootResult;
      }

      return parsed.data;
    } catch (error) {
      // If V1 fails, try legacy endpoint
      console.warn('[V1 Cameras] V1 reboot failed, falling back to legacy endpoint:', error);
      try {
        return await v1CamerasApi._rebootLegacy(id);
      } catch {
        throw parseErrorResponse(error);
      }
    }
  },

  /**
   * Legacy reboot implementation using /dashboard/cameras/:id/reboot endpoint.
   * @internal
   */
  _rebootLegacy: async (id: string): Promise<RebootResult> => {
    const response = await apiClient.post<RebootResult>(
      `${LEGACY_CAMERAS_BASE}/${encodeURIComponent(id)}/reboot`,
      undefined,
      { timeout: DEFAULT_TIMEOUT_MS }
    );

    return {
      success: response.success,
      message: response.message || (response.success ? 'Reboot command sent' : response.error || 'Reboot failed'),
      error: response.error,
    };
  },
};

// ============================================================================
// Type Exports
// ============================================================================

export type {
  Camera,
  CameraDiagnostics,
  CaptureResult,
  RebootResult,
  CameraListResponse,
} from './v1-cameras-schemas';

export {
  CameraStatusSchema,
  CameraResolutionSchema,
  ConnectionQualitySchema,
  type CameraStatus,
  type CameraResolution,
  type ConnectionQuality,
} from './v1-cameras-schemas';
