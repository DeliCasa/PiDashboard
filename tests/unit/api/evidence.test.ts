/**
 * Evidence API Client Unit Tests
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Tests for evidence API client functions.
 * V1 changes: CaptureEntry (not EvidenceCapture), device_id (not camera_id),
 * created_at (not captured_at), image_data/object_key (not thumbnail_url/full_url),
 * no presigned URL refresh, no isUrlExpired/getFreshUrl/extractObjectKey.
 * New helpers: getImageSrc, hasImageData, isS3Only, captureEntryToBlob, getCaptureFilename.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  evidenceApi,
  getImageSrc,
  hasImageData,
  isS3Only,
} from '@/infrastructure/api/evidence';
import { apiClient } from '@/infrastructure/api/client';
import {
  evidenceListApiResponse,
  evidenceListEmptyApiResponse,
  captureBeforeOpen,
  captureS3Only,
  captureFailed,
} from '../../mocks/diagnostics/session-fixtures';

// Mock the apiClient
vi.mock('@/infrastructure/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, message: string, code: string) {
      super(message);
      this.status = status;
      this.code = code;
      this.name = 'ApiError';
    }
  },
  buildUrl: vi.fn((path, params) => {
    const url = new URL(`http://localhost${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }
    return url.pathname + url.search;
  }),
  isFeatureUnavailable: vi.fn((error) => {
    return error?.status === 404 || error?.status === 503;
  }),
}));

describe('Evidence API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listSessionEvidence', () => {
    it('should call V1 endpoint and return CaptureEntry array', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(evidenceListApiResponse);

      const result = await evidenceApi.listSessionEvidence('sess-completed-001');

      expect(apiClient.get).toHaveBeenCalledWith('/v1/sessions/sess-completed-001/evidence');
      expect(result).toHaveLength(3);
    });

    it('should sort captures by created_at (most recent first)', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(evidenceListApiResponse);

      const result = await evidenceApi.listSessionEvidence('sess-completed-001');

      // Check sorting - most recent first
      for (let i = 1; i < result.length; i++) {
        const prevDate = new Date(result[i - 1].created_at).getTime();
        const currDate = new Date(result[i].created_at).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });

    it('should return empty array on empty response', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(evidenceListEmptyApiResponse);

      const result = await evidenceApi.listSessionEvidence('sess-12345');

      expect(result).toEqual([]);
    });

    it('should return empty array on 503 error (graceful degradation)', async () => {
      const error = { status: 503, message: 'Service unavailable' };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      const result = await evidenceApi.listSessionEvidence('sess-12345');

      expect(result).toEqual([]);
    });

    it('should throw on non-feature errors', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(evidenceApi.listSessionEvidence('sess-12345')).rejects.toThrow('Network error');
    });

    it('should return empty array on invalid response schema', async () => {
      const invalidResponse = { invalid: 'data' };
      vi.mocked(apiClient.get).mockResolvedValueOnce(invalidResponse);

      const result = await evidenceApi.listSessionEvidence('sess-12345');

      expect(result).toEqual([]);
    });

    it('should return captures with V1 field names', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(evidenceListApiResponse);

      const result = await evidenceApi.listSessionEvidence('sess-completed-001');

      // V1 field names
      expect(result[0]).toHaveProperty('evidence_id');
      expect(result[0]).toHaveProperty('device_id');
      expect(result[0]).toHaveProperty('created_at');
      expect(result[0]).toHaveProperty('capture_tag');
      expect(result[0]).toHaveProperty('session_id');
      expect(result[0]).toHaveProperty('container_id');
    });
  });

  describe('getImageSrc', () => {
    it('should return base64 data URI when image_data is present', () => {
      const result = getImageSrc(captureBeforeOpen);

      expect(result).toMatch(/^data:image\/jpeg;base64,/);
      expect(result).toContain(captureBeforeOpen.image_data);
    });

    it('should return empty string when image_data is absent', () => {
      const result = getImageSrc(captureS3Only);

      expect(result).toBe('');
    });

    it('should use content_type from capture entry', () => {
      const pngCapture = { ...captureBeforeOpen, content_type: 'image/png' };
      const result = getImageSrc(pngCapture);

      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should default to image/jpeg when content_type is missing', () => {
      const noContentType = { ...captureBeforeOpen, content_type: undefined };
      const result = getImageSrc(noContentType);

      expect(result).toMatch(/^data:image\/jpeg;base64,/);
    });
  });

  describe('hasImageData', () => {
    it('should return true when capture has image_data', () => {
      expect(hasImageData(captureBeforeOpen)).toBe(true);
    });

    it('should return false when capture has no image_data', () => {
      expect(hasImageData(captureS3Only)).toBe(false);
    });

    it('should return false for failed captures without image_data', () => {
      expect(hasImageData(captureFailed)).toBe(false);
    });
  });

  describe('isS3Only', () => {
    it('should return true when capture has object_key but no image_data', () => {
      expect(isS3Only(captureS3Only)).toBe(true);
    });

    it('should return false when capture has image_data', () => {
      expect(isS3Only(captureBeforeOpen)).toBe(false);
    });

    it('should return false when capture has neither image_data nor object_key', () => {
      expect(isS3Only(captureFailed)).toBe(false);
    });
  });

  describe('captureEntryToBlob', () => {
    it('should return Blob when capture has image_data', () => {
      const blob = evidenceApi.captureEntryToBlob(captureBeforeOpen);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob?.type).toBe('image/jpeg');
    });

    it('should return null when capture has no image_data', () => {
      const blob = evidenceApi.captureEntryToBlob(captureS3Only);

      expect(blob).toBeNull();
    });

    it('should return null for failed capture without image_data', () => {
      const blob = evidenceApi.captureEntryToBlob(captureFailed);

      expect(blob).toBeNull();
    });
  });

  describe('getCaptureFilename', () => {
    it('should generate filename with device_id, capture_tag, and timestamp', () => {
      const filename = evidenceApi.getCaptureFilename(captureBeforeOpen);

      expect(filename).toContain('evidence-');
      expect(filename).toContain(captureBeforeOpen.device_id);
      expect(filename).toContain(captureBeforeOpen.capture_tag);
      expect(filename.endsWith('.jpg')).toBe(true);
    });

    it('should sanitize timestamp colons and periods', () => {
      const filename = evidenceApi.getCaptureFilename(captureBeforeOpen);

      // Should not contain : or . except in the .jpg extension
      const withoutExtension = filename.replace('.jpg', '');
      expect(withoutExtension).not.toContain(':');
      expect(withoutExtension).not.toContain('.');
    });
  });
});
