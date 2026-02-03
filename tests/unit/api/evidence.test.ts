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
