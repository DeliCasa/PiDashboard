/**
 * Evidence API Client Unit Tests
 * Feature: 038-dev-observability-panels (T044)
 *
 * Tests for evidence API client functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evidenceApi } from '@/infrastructure/api/evidence';
import { apiClient } from '@/infrastructure/api/client';
import {
  evidenceListApiResponse,
  evidenceListEmptyApiResponse,
  presignApiResponse,
  validEvidenceCapture,
} from '../../mocks/diagnostics/session-fixtures';

// Mock the apiClient
vi.mock('@/infrastructure/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-25T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('listSessionEvidence', () => {
    it('should return evidence captures for a session', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(evidenceListApiResponse);

      const result = await evidenceApi.listSessionEvidence('sess-12345');

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toHaveLength(3);
    });

    it('should sort evidence by captured_at (most recent first)', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(evidenceListApiResponse);

      const result = await evidenceApi.listSessionEvidence('sess-12345');

      // Check sorting - most recent first
      for (let i = 1; i < result.length; i++) {
        const prevDate = new Date(result[i - 1].captured_at).getTime();
        const currDate = new Date(result[i].captured_at).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });

    it('should respect limit parameter', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(evidenceListApiResponse);

      await evidenceApi.listSessionEvidence('sess-12345', { limit: 10 });

      const callArg = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(callArg).toContain('limit=10');
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
  });

  describe('refreshPresignedUrl', () => {
    it('should return new URL on successful refresh', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(presignApiResponse);

      const result = await evidenceApi.refreshPresignedUrl('images/evidence/test.jpg');

      expect(result).toBeDefined();
      expect(result?.url).toContain('https://');
      expect(result?.expires_at).toBeDefined();
    });

    it('should include key and expiresIn parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(presignApiResponse);

      await evidenceApi.refreshPresignedUrl('images/test.jpg', 1800);

      const callArg = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(callArg).toContain('key=images%2Ftest.jpg');
      expect(callArg).toContain('expiresIn=1800');
    });

    it('should return null on 404 error', async () => {
      const error = { status: 404, message: 'Not found' };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      const result = await evidenceApi.refreshPresignedUrl('nonexistent.jpg');

      expect(result).toBeNull();
    });

    it('should return null on invalid response', async () => {
      const invalidResponse = { success: false };
      vi.mocked(apiClient.get).mockResolvedValueOnce(invalidResponse);

      const result = await evidenceApi.refreshPresignedUrl('test.jpg');

      expect(result).toBeNull();
    });

    it('should throw on non-feature errors', async () => {
      const error = new Error('Connection refused');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(evidenceApi.refreshPresignedUrl('test.jpg')).rejects.toThrow('Connection refused');
    });
  });

  describe('getFreshUrl', () => {
    // Fake time is 2026-01-25T15:00:00Z — build dates relative to it
    const FAKE_NOW = new Date('2026-01-25T15:00:00Z').getTime();

    function makeExpiredEvidence() {
      return {
        ...validEvidenceCapture,
        thumbnail_url: 'https://minio.example.com/thumbs/ev-001.jpg?X-Amz-Expires=900',
        full_url: 'https://minio.example.com/full/ev-001.jpg?X-Amz-Expires=900',
        expires_at: new Date(FAKE_NOW - 5 * 60_000).toISOString(), // expired 5 min ago
      };
    }

    function makeFreshEvidence() {
      return {
        ...validEvidenceCapture,
        expires_at: new Date(FAKE_NOW + 15 * 60_000).toISOString(), // valid for 15 min
      };
    }

    it('should return original URL when not expired', async () => {
      const fresh = makeFreshEvidence();
      const result = await evidenceApi.getFreshUrl(fresh);
      expect(result).toBe(fresh.thumbnail_url);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should call refreshPresignedUrl when expired and return fresh URL', async () => {
      const expired = makeExpiredEvidence();
      const freshUrl = 'https://minio.example.com/presigned/fresh-ev-001.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256';
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        success: true,
        data: {
          url: freshUrl,
          expires_at: new Date(FAKE_NOW + 15 * 60_000).toISOString(),
        },
      });

      const result = await evidenceApi.getFreshUrl(expired);

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toBe(freshUrl);
    });

    it('should return original URL when refresh fails', async () => {
      const expired = makeExpiredEvidence();
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        success: false,
      });

      const result = await evidenceApi.getFreshUrl(expired);

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toBe(expired.thumbnail_url);
    });

    it('should return original URL when refresh throws', async () => {
      const expired = makeExpiredEvidence();
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      const result = await evidenceApi.getFreshUrl(expired);

      expect(result).toBe(expired.thumbnail_url);
    });

    it('should use full_url when urlType is full', async () => {
      const fresh = makeFreshEvidence();
      const result = await evidenceApi.getFreshUrl(fresh, 'full');
      expect(result).toBe(fresh.full_url);
    });

    it('should extract correct object key from expired URL for refresh', async () => {
      const expired = makeExpiredEvidence();
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        success: true,
        data: {
          url: 'https://minio.example.com/presigned/fresh.jpg',
          expires_at: new Date(FAKE_NOW + 15 * 60_000).toISOString(),
        },
      });

      await evidenceApi.getFreshUrl(expired);

      const callArg = vi.mocked(apiClient.get).mock.calls[0][0];
      // Object key should be extracted from thumbnail URL pathname (without leading slash)
      expect(callArg).toContain('key=thumbs%2Fev-001.jpg');
    });
  });

  describe('isUrlExpired', () => {
    it('should return false for future expiration', () => {
      const futureDate = new Date(Date.now() + 10 * 60_000).toISOString(); // 10 min from now
      expect(evidenceApi.isUrlExpired(futureDate)).toBe(false);
    });

    it('should return true for past expiration', () => {
      const pastDate = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
      expect(evidenceApi.isUrlExpired(pastDate)).toBe(true);
    });

    it('should return true when within threshold', () => {
      const soonToExpire = new Date(Date.now() + 30_000).toISOString(); // 30 sec from now
      // Default threshold is 60 seconds, so this should be considered expired
      expect(evidenceApi.isUrlExpired(soonToExpire)).toBe(true);
    });

    it('should respect custom threshold', () => {
      const soonToExpire = new Date(Date.now() + 30_000).toISOString(); // 30 sec from now
      // With 10 second threshold, this should NOT be expired
      expect(evidenceApi.isUrlExpired(soonToExpire, 10_000)).toBe(false);
    });
  });
});
