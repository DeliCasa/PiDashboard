/**
 * Sessions API Client Unit Tests
 * Feature: 038-dev-observability-panels (T027)
 *
 * Tests for sessions API client functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sessionsApi, isStaleCapture, STALE_THRESHOLD_MS } from '@/infrastructure/api/sessions';
import { apiClient } from '@/infrastructure/api/client';
import {
  sessionListApiResponse,
  sessionListEmptyApiResponse,
  sessionDetailApiResponse,
  activeSessionRecent,
  activeSessionStale,
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

describe('Sessions API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Date.now for consistent stale detection
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-25T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('listSessions', () => {
    it('should return sessions with stale flag', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionListApiResponse);

      const result = await sessionsApi.listSessions();

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('is_stale');
    });

    it('should filter by status when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionListApiResponse);

      await sessionsApi.listSessions({ status: 'active' });

      const callArg = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(callArg).toContain('status=active');
    });

    it('should respect limit parameter', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionListApiResponse);

      await sessionsApi.listSessions({ limit: 10 });

      const callArg = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(callArg).toContain('limit=10');
    });

    it('should sort sessions by most recent first', async () => {
      const unsortedResponse = {
        success: true,
        data: {
          sessions: [
            { ...activeSessionRecent, started_at: '2026-01-25T10:00:00Z' },
            { ...activeSessionStale, started_at: '2026-01-25T14:00:00Z' },
          ],
        },
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce(unsortedResponse);

      const result = await sessionsApi.listSessions();

      // More recent should be first
      expect(new Date(result[0].started_at).getTime()).toBeGreaterThan(
        new Date(result[1].started_at).getTime()
      );
    });

    it('should return empty array on empty response', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionListEmptyApiResponse);

      const result = await sessionsApi.listSessions();

      expect(result).toEqual([]);
    });

    it('should return empty array on 503 error (graceful degradation)', async () => {
      const error = { status: 503, message: 'Service unavailable' };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      const result = await sessionsApi.listSessions();

      expect(result).toEqual([]);
    });

    it('should throw on non-feature errors', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(sessionsApi.listSessions()).rejects.toThrow('Network error');
    });

    it('should return empty array on invalid response schema', async () => {
      const invalidResponse = { invalid: 'data' };
      vi.mocked(apiClient.get).mockResolvedValueOnce(invalidResponse);

      const result = await sessionsApi.listSessions();

      expect(result).toEqual([]);
    });
  });

  describe('getSession', () => {
    it('should return session with stale flag', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionDetailApiResponse);

      const result = await sessionsApi.getSession(activeSessionRecent.id);

      expect(apiClient.get).toHaveBeenCalledWith(`/dashboard/diagnostics/sessions/${activeSessionRecent.id}`);
      expect(result).toHaveProperty('is_stale');
      expect(result?.id).toBe(activeSessionRecent.id);
    });

    it('should return null on 404 error', async () => {
      const error = { status: 404, message: 'Not found' };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      const result = await sessionsApi.getSession('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on invalid response', async () => {
      const invalidResponse = { success: false };
      vi.mocked(apiClient.get).mockResolvedValueOnce(invalidResponse);

      const result = await sessionsApi.getSession('sess-12345');

      expect(result).toBeNull();
    });

    it('should throw on non-feature errors', async () => {
      const error = new Error('Connection refused');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(sessionsApi.getSession('sess-12345')).rejects.toThrow('Connection refused');
    });
  });
});

describe('isStaleCapture utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-25T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false for undefined last_capture_at', () => {
    expect(isStaleCapture(undefined)).toBe(false);
  });

  it('should return false for recent capture (< 5 min)', () => {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    expect(isStaleCapture(oneMinuteAgo)).toBe(false);
  });

  it('should return false for capture exactly at threshold', () => {
    const exactlyAtThreshold = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
    expect(isStaleCapture(exactlyAtThreshold)).toBe(false);
  });

  it('should return true for stale capture (> 5 min)', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(isStaleCapture(tenMinutesAgo)).toBe(true);
  });

  it('should handle invalid date strings', () => {
    expect(isStaleCapture('invalid-date')).toBe(false);
  });
});
