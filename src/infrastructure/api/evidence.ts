/**
 * Evidence API Client - DEV Observability Panels + Camera Diagnostics
 * Feature: 038-dev-observability-panels, 042-diagnostics-integration
 *
 * Provides evidence capture listing, presigned URL functions, and camera evidence capture.
 * Evidence captures are images from ESP32-CAM devices during sessions.
 */

import { apiClient, ApiError, buildUrl, isFeatureUnavailable } from './client';
import {
  EvidenceListResponseSchema,
  PresignResponseSchema,
  type EvidenceCapture,
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

interface ListEvidenceOptions {
  limit?: number;
}

interface PresignedUrlResult {
  url: string;
  expires_at: string;
}

/**
 * Evidence API client
 */
export const evidenceApi = {
  /**
   * List evidence captures for a session
   */
  listSessionEvidence: async (
    sessionId: string,
    options: ListEvidenceOptions = {}
  ): Promise<EvidenceCapture[]> => {
    try {
      const endpoint = buildUrl(`/dashboard/diagnostics/sessions/${sessionId}/evidence`, {
        limit: options.limit || 50,
      });

      const response = await apiClient.get<unknown>(endpoint);

      const parsed = safeParseWithErrors(EvidenceListResponseSchema, response);

      if (!parsed.success) {
        console.warn('Evidence list response validation failed:', parsed.errors);
        return [];
      }

      if (!parsed.data.success || !parsed.data.data?.evidence) {
        return [];
      }

      // Sort by captured_at (most recent first)
      return [...parsed.data.data.evidence].sort((a, b) => {
        const dateA = new Date(a.captured_at).getTime();
        const dateB = new Date(b.captured_at).getTime();
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
   * Refresh a presigned URL for an evidence item
   * Used when the original URL has expired
   */
  refreshPresignedUrl: async (
    imageKey: string,
    expiresIn: number = 900 // 15 minutes default
  ): Promise<PresignedUrlResult | null> => {
    try {
      const endpoint = buildUrl('/dashboard/diagnostics/images/presign', {
        key: imageKey,
        expiresIn,
      });

      const response = await apiClient.get<unknown>(endpoint);

      const parsed = safeParseWithErrors(PresignResponseSchema, response);

      if (!parsed.success) {
        console.warn('Presign response validation failed:', parsed.errors);
        return null;
      }

      if (!parsed.data.success || !parsed.data.data) {
        return null;
      }

      return {
        url: parsed.data.data.url,
        expires_at: parsed.data.data.expires_at,
      };
    } catch (error) {
      if (isFeatureUnavailable(error)) {
        return null;
      }

      console.error('Failed to refresh presigned URL:', error);
      throw error;
    }
  },

  /**
   * Check if a presigned URL is expired or about to expire
   * Returns true if URL expires within the threshold (default 1 minute)
   */
  isUrlExpired: (expiresAt: string, thresholdMs: number = 60_000): boolean => {
    const expirationTime = new Date(expiresAt).getTime();
    return Date.now() + thresholdMs >= expirationTime;
  },

  /**
   * Get a fresh URL, refreshing if necessary.
   * Extracts the object key from the presigned URL and calls refreshPresignedUrl()
   * when the URL is expired or about to expire.
   */
  getFreshUrl: async (
    evidence: EvidenceCapture,
    urlType: 'thumbnail' | 'full' = 'thumbnail'
  ): Promise<string> => {
    const url = urlType === 'thumbnail' ? evidence.thumbnail_url : evidence.full_url;

    // Check if URL is still valid
    if (!evidenceApi.isUrlExpired(evidence.expires_at)) {
      return url;
    }

    // URL expired — extract object key and refresh
    try {
      const parsedUrl = new URL(url);
      const objectKey = decodeURIComponent(parsedUrl.pathname.slice(1));
      const result = await evidenceApi.refreshPresignedUrl(objectKey);
      if (result) {
        return result.url;
      }
    } catch {
      // URL parsing or refresh failed — fall through to return original
    }

    return url;
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
        // Add context for common error codes
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
   * Convert captured evidence to a blob for download.
   *
   * @param evidence - Evidence object with image_base64
   * @returns Blob suitable for download
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
   * Generate a download filename for evidence.
   *
   * @param evidence - Evidence object
   * @returns Formatted filename
   */
  getFilename: (evidence: CapturedEvidence): string => {
    const timestamp = new Date(evidence.captured_at).toISOString().replace(/[:.]/g, '-');
    return `evidence-${evidence.camera_id}-${timestamp}.jpg`;
  },

  /**
   * Trigger browser download of evidence image.
   *
   * @param evidence - Evidence object with image_base64
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
