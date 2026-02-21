/**
 * Sessions API Client Unit Tests
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Tests for sessions API client functions.
 * V1 changes: session_id (not id), container_id (not delivery_id),
 * total_captures (not capture_count), elapsed_seconds-based stale detection,
 * client-side status filtering, getSession filters from list endpoint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sessionsApi, STALE_THRESHOLD_SECONDS } from '@/infrastructure/api/sessions';
import { apiClient } from '@/infrastructure/api/client';
import {
  sessionListApiResponse,
  sessionListEmptyApiResponse,
  activeSessionRecent,
  activeSessionStale,
  completedSession,
  allSessions,
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listSessions', () => {
    it('should call V1 endpoint and return sessions with stale flag', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionListApiResponse);

      const result = await sessionsApi.listSessions();

      expect(apiClient.get).toHaveBeenCalledWith('/v1/sessions');
      expect(result).toHaveLength(allSessions.length);
      expect(result[0]).toHaveProperty('is_stale');
    });

    it('should filter by status client-side (no status query param sent to API)', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionListApiResponse);

      const result = await sessionsApi.listSessions({ status: 'active' });

      // V1: no status param sent to API — always calls bare endpoint
      expect(apiClient.get).toHaveBeenCalledWith('/v1/sessions');

      // Client-side filter: only active sessions returned
      result.forEach((session) => {
        expect(session.status).toBe('active');
      });
    });

    it('should respect limit parameter (client-side slicing)', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionListApiResponse);

      const result = await sessionsApi.listSessions({ limit: 2 });

      // V1: no limit param sent to API — always calls bare endpoint
      expect(apiClient.get).toHaveBeenCalledWith('/v1/sessions');

      // Client-side limit applied
      expect(result.length).toBeLessThanOrEqual(2);
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
      // Both endpoints must fail — first call tries /v1/sessions, fallback tries /v1/diagnostics/sessions
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);

      await expect(sessionsApi.listSessions()).rejects.toThrow('Network error');
    });

    it('should return empty array on invalid response schema', async () => {
      const invalidResponse = { invalid: 'data' };
      vi.mocked(apiClient.get).mockResolvedValueOnce(invalidResponse);

      const result = await sessionsApi.listSessions();

      expect(result).toEqual([]);
    });

    it('should mark active sessions with elapsed_seconds > 300 as stale', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionListApiResponse);

      const result = await sessionsApi.listSessions();

      const recentActive = result.find((s) => s.session_id === activeSessionRecent.session_id);
      const staleActive = result.find((s) => s.session_id === activeSessionStale.session_id);

      // Recent active (elapsed_seconds: 240) should NOT be stale
      expect(recentActive?.is_stale).toBe(false);
      // Stale active (elapsed_seconds: 3600) should be stale
      expect(staleActive?.is_stale).toBe(true);
    });

    it('should not mark non-active sessions as stale regardless of elapsed_seconds', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionListApiResponse);

      const result = await sessionsApi.listSessions();

      const completed = result.find((s) => s.session_id === completedSession.session_id);

      // Completed sessions are never stale (even with high elapsed_seconds)
      expect(completed?.is_stale).toBe(false);
    });
  });

  describe('getSession', () => {
    it('should call list endpoint and filter by session_id', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionListApiResponse);

      const result = await sessionsApi.getSession(activeSessionRecent.session_id);

      // V1: getSession calls the list endpoint (no dedicated detail endpoint)
      expect(apiClient.get).toHaveBeenCalledWith('/v1/sessions');
      expect(result).toHaveProperty('is_stale');
      expect(result?.session_id).toBe(activeSessionRecent.session_id);
    });

    it('should return null when session_id not found in list', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(sessionListApiResponse);

      const result = await sessionsApi.getSession('nonexistent');

      expect(result).toBeNull();
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
      // Both endpoints must fail — first call tries /v1/sessions, fallback tries /v1/diagnostics/sessions
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);

      await expect(sessionsApi.getSession('sess-12345')).rejects.toThrow('Connection refused');
    });
  });

  describe('STALE_THRESHOLD_SECONDS constant', () => {
    it('should be 300 seconds (5 minutes)', () => {
      expect(STALE_THRESHOLD_SECONDS).toBe(300);
    });
  });
});
