/**
 * Logs Hooks Integration Tests (T031)
 * Tests for useRecentLogs, useLogStream with polling
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { server } from '../mocks/server';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import { useRecentLogs, useExportDiagnostics } from '@/application/hooks/useLogs';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Logs Hooks Integration', () => {
  describe('useRecentLogs', () => {
    it('should fetch recent logs successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useRecentLogs(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeInstanceOf(Array);
      expect(result.current.data?.length).toBeGreaterThan(0);
    });

    it('should transform backend logs response to array', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useRecentLogs(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Backend returns {count, logs} but hook transforms to array
      expect(result.current.data?.[0]).toMatchObject({
        id: expect.any(String),
        timestamp: expect.any(String),
        level: expect.stringMatching(/^(debug|info|warn|error)$/),
        message: expect.any(String),
        source: expect.any(String),
      });
    });

    it('should fetch with level filter', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useRecentLogs({ level: 'error', limit: 50 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Query key should include filters
      expect(queryClient.getQueryData(['logs', { level: 'error', limit: 50 }])).toBeDefined();
    });

    it('should fetch with search filter', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useRecentLogs({ search: 'wifi' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useRecentLogs(undefined, false), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should use different query keys for different filters', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      // Render two hooks with different filters
      const { result: result1 } = renderHook(
        () => useRecentLogs({ level: 'info' }),
        { wrapper }
      );
      const { result: result2 } = renderHook(
        () => useRecentLogs({ level: 'error' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      // Both should have separate cache entries
      expect(queryClient.getQueryData(['logs', { level: 'info' }])).toBeDefined();
      expect(queryClient.getQueryData(['logs', { level: 'error' }])).toBeDefined();
    });
  });

  describe('useExportDiagnostics', () => {
    it('should export diagnostics successfully', async () => {
      // Add mock handler for diagnostics
      server.use(
        (await import('msw')).http.get('/api/dashboard/diagnostics/export', async () => {
          return (await import('msw')).HttpResponse.json({
            generated_at: new Date().toISOString(),
            system: { hostname: 'raspberrypi' },
            logs: [],
            config: [],
          });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useExportDiagnostics(), { wrapper });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        generated_at: expect.any(String),
        system: expect.any(Object),
      });
    });
  });

  describe('useLogStream polling behavior', () => {
    // Note: useLogStream uses internal state and intervals,
    // so we test the underlying behavior indirectly
    it('should be importable and have correct return type', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');

      expect(useLogStream).toBeDefined();
      expect(typeof useLogStream).toBe('function');
    });

    it('should expose expected interface', async () => {
      // We can't easily test the polling behavior in unit tests
      // but we can verify the hook shape
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream('info'), { wrapper });

      // Verify return shape - error can be null or string
      expect(result.current.logs).toBeInstanceOf(Array);
      expect(typeof result.current.connected).toBe('boolean');
      expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
      expect(typeof result.current.clearLogs).toBe('function');
      expect(typeof result.current.reconnect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');

      // Clean up to stop polling
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });

    it('should clear logs when clearLogs is called', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Clear logs
      act(() => {
        result.current.clearLogs();
      });

      expect(result.current.logs).toHaveLength(0);

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });

    it('should stop polling when disconnect is called', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.connected).toBe(false);

      unmount();
    });
  });

  /**
   * T047 [US3] SSE Reconnection Tests
   * Tests for log stream reconnection behavior after disconnect
   */
  describe('useLogStream reconnection behavior (T047)', () => {
    it('should reconnect after disconnect when reconnect is called', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for initial connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.connected).toBe(false);

      // Reconnect
      act(() => {
        result.current.reconnect();
      });

      // Should reconnect successfully
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });

    it('should preserve logs after reconnection', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for initial logs to be fetched
      await waitFor(() => {
        expect(result.current.logs.length).toBeGreaterThan(0);
      });

      const initialLogCount = result.current.logs.length;

      // Disconnect and reconnect
      act(() => {
        result.current.disconnect();
      });

      act(() => {
        result.current.reconnect();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Logs should be preserved or merged with new ones
      expect(result.current.logs.length).toBeGreaterThanOrEqual(initialLogCount);

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });

    it('should resume fetching new logs after reconnection', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      let fetchCount = 0;
      // Add a counting handler
      server.use(
        (await import('msw')).http.get('/api/dashboard/logs', async () => {
          fetchCount++;
          return (await import('msw')).HttpResponse.json({
            count: 2,
            logs: [
              { id: `${fetchCount}-1`, timestamp: new Date().toISOString(), level: 'info', message: `Log ${fetchCount}-1`, source: 'test' },
              { id: `${fetchCount}-2`, timestamp: new Date().toISOString(), level: 'debug', message: `Log ${fetchCount}-2`, source: 'test' },
            ],
          });
        })
      );

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const initialFetchCount = fetchCount;

      // Disconnect
      act(() => {
        result.current.disconnect();
      });

      // Reconnect
      act(() => {
        result.current.reconnect();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Should have made additional fetches after reconnection
      expect(fetchCount).toBeGreaterThan(initialFetchCount);

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });

    it('should handle multiple disconnect/reconnect cycles', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Perform multiple cycles
      for (let i = 0; i < 3; i++) {
        await waitFor(() => {
          expect(result.current.connected).toBe(true);
        });

        act(() => {
          result.current.disconnect();
        });

        expect(result.current.connected).toBe(false);

        act(() => {
          result.current.reconnect();
        });
      }

      // Final state should be connected
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });
  });

  /**
   * T048 [US3] SSE Error Recovery Tests
   * Tests for log stream error handling and recovery
   *
   * Note: The apiClient has retry logic (3 retries with exponential backoff),
   * so we use 400-level errors which don't retry for faster, deterministic tests.
   */
  describe('useLogStream error recovery (T048)', () => {
    it('should set error state when fetch fails with client error', async () => {
      // Mock a failing endpoint with 400 error (no retries)
      server.use(
        (await import('msw')).http.get('/api/dashboard/logs', async () => {
          return (await import('msw')).HttpResponse.json(
            { error: 'Bad Request' },
            { status: 400 }
          );
        })
      );

      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for error state (400 errors don't retry)
      await waitFor(
        () => {
          expect(result.current.connected).toBe(false);
          expect(result.current.error).not.toBeNull();
        },
        { timeout: 2000 }
      );

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });

    it('should recover from client error when reconnect is called', async () => {
      const { http, HttpResponse } = await import('msw');
      let shouldFail = true;

      // Mock an endpoint that fails initially (400), then succeeds
      server.use(
        http.get('/api/dashboard/logs', async () => {
          if (shouldFail) {
            return HttpResponse.json({ error: 'Bad Request' }, { status: 400 });
          }
          return HttpResponse.json({
            count: 1,
            logs: [{ id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Recovered', source: 'test' }],
          });
        })
      );

      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for error state
      await waitFor(
        () => {
          expect(result.current.connected).toBe(false);
        },
        { timeout: 2000 }
      );

      // Now fix the endpoint
      shouldFail = false;

      // Reconnect
      act(() => {
        result.current.reconnect();
      });

      // Should recover
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
        expect(result.current.error).toBeNull();
      });

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });

    it('should clear error state on successful reconnection', async () => {
      const { http, HttpResponse } = await import('msw');
      let requestCount = 0;

      server.use(
        http.get('/api/dashboard/logs', async () => {
          requestCount++;
          // Fail first request with 400 (no retries), succeed on subsequent
          if (requestCount === 1) {
            return HttpResponse.json({ error: 'Bad Request' }, { status: 400 });
          }
          return HttpResponse.json({
            count: 1,
            logs: [{ id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Success', source: 'test' }],
          });
        })
      );

      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for initial error
      await waitFor(
        () => {
          expect(result.current.connected).toBe(false);
        },
        { timeout: 2000 }
      );

      // Reconnect (which will succeed because requestCount > 1)
      act(() => {
        result.current.reconnect();
      });

      // Wait for connection AND error to be cleared (both happen on success)
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
        expect(result.current.error).toBeNull();
      });

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });

    it('should handle timeout errors gracefully', async () => {
      const { http, HttpResponse, delay } = await import('msw');

      // Mock a slow endpoint that causes timeout-like behavior
      server.use(
        http.get('/api/dashboard/logs', async () => {
          await delay(5000); // Longer than typical timeout
          return HttpResponse.json({ count: 0, logs: [] });
        })
      );

      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Should not crash - may be loading or error state
      // Wait a bit to ensure hook is stable
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });

      // Hook should still be functional
      expect(result.current.clearLogs).toBeDefined();
      expect(result.current.reconnect).toBeDefined();
      expect(result.current.disconnect).toBeDefined();

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });

    it('should not lose existing logs on transient error', async () => {
      const { http, HttpResponse } = await import('msw');
      let shouldFail = false;

      server.use(
        http.get('/api/dashboard/logs', async () => {
          if (shouldFail) {
            return HttpResponse.json({ error: 'Transient error' }, { status: 503 });
          }
          return HttpResponse.json({
            count: 2,
            logs: [
              { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Log 1', source: 'test' },
              { id: '2', timestamp: new Date().toISOString(), level: 'debug', message: 'Log 2', source: 'test' },
            ],
          });
        })
      );

      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for initial logs
      await waitFor(() => {
        expect(result.current.logs.length).toBeGreaterThan(0);
      });

      const logsBeforeError = result.current.logs.length;

      // Simulate transient failure
      shouldFail = true;

      // Trigger a reconnect which will fail
      act(() => {
        result.current.disconnect();
      });

      act(() => {
        result.current.reconnect();
      });

      // Wait a bit for the error to be processed
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });

      // Logs from before the error should still be present
      expect(result.current.logs.length).toBeGreaterThanOrEqual(logsBeforeError);

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });
  });
});
