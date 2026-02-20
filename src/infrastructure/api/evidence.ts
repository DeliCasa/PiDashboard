/**
 * Evidence API Client - Real Ops Drilldown + Camera Diagnostics
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 * Feature: 042-diagnostics-integration (camera evidence capture)
 *
 * Provides evidence listing, base64 image helpers, and camera evidence capture.
 * Evidence captures are images from ESP32-CAM devices during sessions.
 */

import { apiClient, ApiError, isFeatureUnavailable } from './client';
import {
  SessionEvidenceResponseSchema,
  EvidencePairResponseSchema,
  type CaptureEntry,
  type EvidencePair,
} from './diagnostics-schemas';
import {
  CapturedEvidenceResponseSchema,
  isValidCameraId,
} from './camera-diagnostics-schemas';
import type {
  CapturedEvidence,
  CaptureEvidenceRequest,
} from '@/domain/types/camera-diagnostics';
import { safeParseWithErrors } from './schemas';

/**
 * Get a displayable image source from a capture entry.
 * Returns base64 data URI when image_data is present, empty string otherwise.
 */
export function getImageSrc(capture: CaptureEntry): string {
  if (capture.image_data) {
    const contentType = capture.content_type || 'image/jpeg';
    return `data:${contentType};base64,${capture.image_data}`;
  }
  return '';
}

/**
 * Check if a capture has displayable image data
 */
export function hasImageData(capture: CaptureEntry): boolean {
  return !!capture.image_data;
}

/**
 * Check if a capture has only S3 storage (no inline image)
 */
export function isS3Only(capture: CaptureEntry): boolean {
  return !capture.image_data && !!capture.object_key;
}

/**
 * Evidence API client
 */
export const evidenceApi = {
  /**
   * List evidence captures for a session (V1 endpoint)
   */
  listSessionEvidence: async (sessionId: string): Promise<CaptureEntry[]> => {
    try {
      const response = await apiClient.get<unknown>(
        `/v1/sessions/${sessionId}/evidence`
      );

      const parsed = safeParseWithErrors(SessionEvidenceResponseSchema, response);

      if (!parsed.success) {
        console.warn('Evidence list response validation failed:', parsed.errors);
        return [];
      }

      if (!parsed.data.success || !parsed.data.data?.captures) {
        return [];
      }

      // Sort by created_at (most recent first)
      return [...parsed.data.data.captures].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
    } catch (error) {
      if (isFeatureUnavailable(error)) {
        return [];
      }

      console.error('Failed to fetch session evidence:', error);
      throw error;
    }
  },

  /**
   * Get structured evidence pair for a session (V1 endpoint)
   */
  getEvidencePair: async (sessionId: string): Promise<EvidencePair | null> => {
    try {
      const response = await apiClient.get<unknown>(
        `/v1/sessions/${sessionId}/evidence/pair`
      );

      const parsed = safeParseWithErrors(EvidencePairResponseSchema, response);

      if (!parsed.success) {
        console.warn('Evidence pair response validation failed:', parsed.errors);
        return null;
      }

      if (!parsed.data.success || !parsed.data.data) {
        return null;
      }

      return parsed.data.data;
    } catch (error) {
      if (isFeatureUnavailable(error)) {
        return null;
      }

      console.error('Failed to fetch evidence pair:', error);
      throw error;
    }
  },

  /**
   * Get image source URL for a capture entry
   */
  getImageSrc,

  // ==========================================================================
  // Legacy Presigned URL Support (for InventoryEvidencePanel)
  // ==========================================================================

  /**
   * Refresh a presigned URL for an evidence item.
   * Preserved for backward compatibility with InventoryEvidencePanel (Feature 047/058).
   * Not used by diagnostics evidence flow (Feature 059 uses base64 inline).
   */
  refreshPresignedUrl: async (
    imageKey: string,
    expiresIn: number = 900
  ): Promise<{ url: string; expires_at: string } | null> => {
    try {
      const endpoint = `/dashboard/diagnostics/images/presign?key=${encodeURIComponent(imageKey)}&expiresIn=${expiresIn}`;
      const response = await apiClient.get<unknown>(endpoint);

      // Best-effort parse — endpoint may not exist on newer PiOrchestrator
      if (response && typeof response === 'object' && 'data' in (response as Record<string, unknown>)) {
        const data = (response as { data?: { url?: string; expires_at?: string } }).data;
        if (data?.url && data?.expires_at) {
          return { url: data.url, expires_at: data.expires_at };
        }
      }
      return null;
    } catch (error) {
      if (isFeatureUnavailable(error)) {
        return null;
      }
      console.error('Failed to refresh presigned URL:', error);
      return null;
    }
  },

  // ==========================================================================
  // Camera Evidence Capture (Feature 042)
  // ==========================================================================

  /**
   * Capture evidence from a specific camera.
   *
   * @param cameraId - Camera ID in format espcam-XXXXXX
   * @param options - Optional capture options
   * @throws ApiError if camera not found, offline, or capture fails
   */
  captureFromCamera: async (
    cameraId: string,
    options?: CaptureEvidenceRequest
  ): Promise<CapturedEvidence> => {
    // Validate camera ID format
    if (!isValidCameraId(cameraId)) {
      throw new ApiError(
        400,
        `Invalid camera ID format: ${cameraId}. Expected: espcam-XXXXXX`,
        'VALIDATION_ERROR'
      );
    }

    try {
      const response = await apiClient.post<{ success: boolean; data: CapturedEvidence }>(
        `/v1/cameras/${cameraId}/evidence`,
        options
      );

      // Validate response
      const parsed = safeParseWithErrors(CapturedEvidenceResponseSchema, response);
      if (!parsed.success) {
        console.warn('[Evidence] Capture response validation failed:', parsed.errors);
      }

      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 503) {
          throw new ApiError(
            503,
            `Camera offline or unavailable: ${cameraId}`,
            'CAMERA_OFFLINE'
          );
        }
        if (error.status === 404) {
          throw new ApiError(
            404,
            `Camera not found: ${cameraId}`,
            'NOT_FOUND'
          );
        }
        throw error;
      }

      throw new ApiError(
        500,
        'Failed to capture evidence',
        'CAPTURE_FAILED'
      );
    }
  },

  /**
   * Convert a CaptureEntry with image_data to a Blob for download.
   */
  captureEntryToBlob: (capture: CaptureEntry): Blob | null => {
    if (!capture.image_data) return null;
    const byteCharacters = atob(capture.image_data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: capture.content_type ?? 'image/jpeg' });
  },

  /**
   * Generate a download filename for a capture entry.
   */
  getCaptureFilename: (capture: CaptureEntry): string => {
    const timestamp = new Date(capture.created_at).toISOString().replace(/[:.]/g, '-');
    return `evidence-${capture.device_id}-${capture.capture_tag}-${timestamp}.jpg`;
  },

  /**
   * Trigger browser download of a capture entry's image.
   */
  downloadCapture: (capture: CaptureEntry): void => {
    const blob = evidenceApi.captureEntryToBlob(capture);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const filename = evidenceApi.getCaptureFilename(capture);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Convert CapturedEvidence (camera capture) to a blob for download.
   * Preserved from Feature 042 for camera evidence capture workflow.
   */
  toBlob: (evidence: CapturedEvidence): Blob => {
    const byteCharacters = atob(evidence.image_base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: evidence.content_type ?? 'image/jpeg' });
  },

  /**
   * Generate a download filename for CapturedEvidence.
   * Preserved from Feature 042.
   */
  getFilename: (evidence: CapturedEvidence): string => {
    const timestamp = new Date(evidence.captured_at).toISOString().replace(/[:.]/g, '-');
    return `evidence-${evidence.camera_id}-${timestamp}.jpg`;
  },

  /**
   * Trigger browser download of CapturedEvidence image.
   * Preserved from Feature 042.
   */
  download: (evidence: CapturedEvidence): void => {
    const blob = evidenceApi.toBlob(evidence);
    const url = URL.createObjectURL(blob);
    const filename = evidenceApi.getFilename(evidence);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
