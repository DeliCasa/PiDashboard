/**
 * Unit tests for API Client
 * Feature: 030-dashboard-recovery
 * Tasks: T011a, T012a
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from '@/infrastructure/api/client';
import { HTMLFallbackError } from '@/infrastructure/api/errors';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('API Client (030-dashboard-recovery)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Accept Header (T010)', () => {
    it('should include Accept: application/json header in all requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Accept']).toBe('application/json');
    });

    it('should include Accept header in POST requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: () => Promise.resolve({ success: true }),
      });

      await apiClient.post('/test', { data: 'test' });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Accept']).toBe('application/json');
    });
  });

  describe('HTML Fallback Detection (T011a)', () => {
    it('should throw HTMLFallbackError when response is HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        text: () => Promise.resolve('<!DOCTYPE html><html><body>Dashboard</body></html>'),
      });

      await expect(apiClient.get('/api/nonexistent')).rejects.toThrow(HTMLFallbackError);
    });

    it('should include endpoint in HTMLFallbackError', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html',
        }),
      });

      try {
        await apiClient.get('/devices');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(HTMLFallbackError.isHTMLFallbackError(error)).toBe(true);
        if (HTMLFallbackError.isHTMLFallbackError(error)) {
          expect(error.endpoint).toBe('/devices');
          expect(error.actualContentType).toBe('text/html');
        }
      }
    });

    it('should not throw HTMLFallbackError for JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: () => Promise.resolve({ devices: [] }),
      });

      const result = await apiClient.get<{ devices: unknown[] }>('/devices');
      expect(result.devices).toEqual([]);
    });

    it('should not retry on HTMLFallbackError', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html',
        }),
      });

      await expect(apiClient.get('/test')).rejects.toThrow(HTMLFallbackError);

      // Should only have called once (no retries)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Request ID Extraction (T012a)', () => {
    it('should extract X-Request-Id from response headers on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({
          'content-type': 'application/json',
          'X-Request-Id': 'req-abc-123',
        }),
        json: () => Promise.resolve({ error: 'Not found', code: 'NOT_FOUND' }),
      });

      try {
        await apiClient.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(ApiError.isApiError(error)).toBe(true);
        if (ApiError.isApiError(error)) {
          expect(error.requestId).toBe('req-abc-123');
        }
      }
    });

    it('should handle missing X-Request-Id header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      try {
        await apiClient.get('/test', { retries: 1 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(ApiError.isApiError(error)).toBe(true);
        if (ApiError.isApiError(error)) {
          expect(error.requestId).toBeUndefined();
        }
      }
    });
  });

  describe('Endpoint Tracking (T013)', () => {
    it('should include endpoint in ApiError', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: () => Promise.resolve({ error: 'Bad request', code: 'BAD_REQUEST' }),
      });

      try {
        await apiClient.post('/wifi/connect', { ssid: 'test' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(ApiError.isApiError(error)).toBe(true);
        if (ApiError.isApiError(error)) {
          expect(error.endpoint).toBe('/wifi/connect');
        }
      }
    });

    it('should include timestamp in ApiError', async () => {
      const beforeTime = new Date();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      try {
        await apiClient.get('/test', { retries: 1 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(ApiError.isApiError(error)).toBe(true);
        if (ApiError.isApiError(error)) {
          expect(error.timestamp).toBeInstanceOf(Date);
          expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        }
      }
    });
  });

  describe('ApiError.fromResponse', () => {
    it('should create ApiError with endpoint and requestId', () => {
      const error = ApiError.fromResponse(
        404,
        { error: 'Not found', code: 'NOT_FOUND' },
        '/api/devices',
        'req-123'
      );

      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.endpoint).toBe('/api/devices');
      expect(error.requestId).toBe('req-123');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should handle missing optional parameters', () => {
      const error = ApiError.fromResponse(500, { error: 'Server error' });

      expect(error.endpoint).toBeUndefined();
      expect(error.requestId).toBeUndefined();
    });
  });
});
