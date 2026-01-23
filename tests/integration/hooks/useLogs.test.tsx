/**
 * Logs Hooks Integration Tests (T031)
 * Tests for useRecentLogs, useLogStream with SSE streaming
 */

import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { server } from '../mocks/server';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import { useRecentLogs, useExportDiagnostics } from '@/application/hooks/useLogs';

// ============================================================================
// Mock EventSource for SSE tests
// ============================================================================

class MockEventSource {
  static instances: MockEventSource[] = [];
  static lastUrl: string | null = null;

  url: string;
  readyState: number = 0; // CONNECTING
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.lastUrl = url;
    MockEventSource.instances.push(this);
    // Auto-open connection after construction (simulating successful connection)
    setTimeout(() => {
      if (!this.closed) {
        this.simulateOpen();
      }
    }, 0);
  }

  close() {
    this.closed = true;
    this.readyState = 2; // CLOSED
  }

  // Test helpers
  simulateOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', {
        data: JSON.stringify(data),
      }));
    }
  }

  simulateError() {
    this.readyState = 2; // CLOSED
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  static reset() {
    MockEventSource.instances = [];
    MockEventSource.lastUrl = null;
  }

  static getLatest(): MockEventSource | undefined {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }

  static getAllInstances(): MockEventSource[] {
    return MockEventSource.instances;
  }
}

// Store original EventSource
const originalEventSource = global.EventSource;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // Replace global EventSource with mock
  (global as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;
});

beforeEach(() => {
  MockEventSource.reset();
});

afterEach(() => {
  server.resetHandlers();
  MockEventSource.reset();
});

afterAll(() => {
  server.close();
  // Restore original EventSource
  (global as unknown as { EventSource: typeof EventSource }).EventSource = originalEventSource;
});

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
    // Note: useLogStream uses SSE (EventSource), not HTTP polling
    // We mock EventSource to test the behavior
    it('should be importable and have correct return type', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');

      expect(useLogStream).toBeDefined();
      expect(typeof useLogStream).toBe('function');
    });

    it('should expose expected interface', async () => {
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

      // Wait for EventSource to be created and simulate a message
      await waitFor(() => {
        expect(MockEventSource.getLatest()).toBeDefined();
      });

      // Simulate receiving a log message (this sets connected=true)
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Test log',
          source: 'test',
        });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
        expect(result.current.logs.length).toBeGreaterThan(0);
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

      // Wait for EventSource to be created
      await waitFor(() => {
        expect(MockEventSource.getLatest()).toBeDefined();
      });

      // Simulate receiving a message to set connected=true
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Test log',
          source: 'test',
        });
      });

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

      // Wait for EventSource to be created
      await waitFor(() => {
        expect(MockEventSource.getLatest()).toBeDefined();
      });

      // Simulate receiving a message to establish connection
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Initial log',
          source: 'test',
        });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const initialInstanceCount = MockEventSource.getAllInstances().length;

      // Disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.connected).toBe(false);

      // Reconnect
      act(() => {
        result.current.reconnect();
      });

      // Wait for new EventSource to be created
      await waitFor(() => {
        expect(MockEventSource.getAllInstances().length).toBeGreaterThan(initialInstanceCount);
      });

      // Simulate message on new connection
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '2',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Reconnected log',
          source: 'test',
        });
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

      // Wait for EventSource
      await waitFor(() => {
        expect(MockEventSource.getLatest()).toBeDefined();
      });

      // Simulate receiving initial logs
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Log 1',
          source: 'test',
        });
        MockEventSource.getLatest()?.simulateMessage({
          id: '2',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Log 2',
          source: 'test',
        });
      });

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

      // Wait for new connection
      await waitFor(() => {
        expect(MockEventSource.getLatest()?.closed).toBe(false);
      });

      // Simulate message on new connection
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '3',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Log after reconnect',
          source: 'test',
        });
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

    it('should create new EventSource after reconnection', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for initial EventSource
      await waitFor(() => {
        expect(MockEventSource.getLatest()).toBeDefined();
      });

      const initialInstanceCount = MockEventSource.getAllInstances().length;

      // Simulate connection
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Initial',
          source: 'test',
        });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Disconnect
      act(() => {
        result.current.disconnect();
      });

      // Reconnect
      act(() => {
        result.current.reconnect();
      });

      // Should have created a new EventSource instance
      await waitFor(() => {
        expect(MockEventSource.getAllInstances().length).toBeGreaterThan(initialInstanceCount);
      });

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
        // Wait for EventSource
        await waitFor(() => {
          expect(MockEventSource.getLatest()?.closed).not.toBe(true);
        });

        // Simulate message to establish connection
        act(() => {
          MockEventSource.getLatest()?.simulateMessage({
            id: `${i}`,
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Log ${i}`,
            source: 'test',
          });
        });

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

      // Final connection
      await waitFor(() => {
        expect(MockEventSource.getLatest()?.closed).not.toBe(true);
      });

      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: 'final',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Final log',
          source: 'test',
        });
      });

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
   * Note: useLogStream uses SSE (EventSource), so we test SSE error scenarios.
   */
  describe('useLogStream error recovery (T048)', () => {
    it('should set error state when SSE connection fails', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for EventSource to be created
      await waitFor(() => {
        expect(MockEventSource.getLatest()).toBeDefined();
      });

      // Simulate SSE error (connection fails)
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      // Should be disconnected after error
      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });

    it('should recover from SSE error when reconnect is called', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for EventSource
      await waitFor(() => {
        expect(MockEventSource.getLatest()).toBeDefined();
      });

      // Simulate initial connection
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Initial',
          source: 'test',
        });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Simulate error
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Reconnect
      act(() => {
        result.current.reconnect();
      });

      // Wait for new EventSource
      await waitFor(() => {
        const latest = MockEventSource.getLatest();
        expect(latest?.closed).toBe(false);
      });

      // Simulate successful reconnection
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '2',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Recovered',
          source: 'test',
        });
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
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for EventSource
      await waitFor(() => {
        expect(MockEventSource.getLatest()).toBeDefined();
      });

      // Simulate error (this sets error state)
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      // Wait for error to propagate
      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Reconnect
      act(() => {
        result.current.reconnect();
      });

      // Wait for new EventSource
      await waitFor(() => {
        const latest = MockEventSource.getLatest();
        expect(latest?.closed).toBe(false);
      });

      // Simulate successful message
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Success',
          source: 'test',
        });
      });

      // Wait for connection AND error to be cleared
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

    it('should handle disconnect gracefully', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for EventSource
      await waitFor(() => {
        expect(MockEventSource.getLatest()).toBeDefined();
      });

      // Simulate connection
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Test',
          source: 'test',
        });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Disconnect
      act(() => {
        result.current.disconnect();
      });

      // Hook should still be functional
      expect(result.current.clearLogs).toBeDefined();
      expect(result.current.reconnect).toBeDefined();
      expect(result.current.disconnect).toBeDefined();
      expect(result.current.connected).toBe(false);

      unmount();
    });

    it('should not lose existing logs on transient error', async () => {
      const { useLogStream } = await import('@/application/hooks/useLogs');
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, unmount } = renderHook(() => useLogStream(), { wrapper });

      // Wait for EventSource
      await waitFor(() => {
        expect(MockEventSource.getLatest()).toBeDefined();
      });

      // Simulate receiving logs
      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Log 1',
          source: 'test',
        });
        MockEventSource.getLatest()?.simulateMessage({
          id: '2',
          timestamp: new Date().toISOString(),
          level: 'debug',
          message: 'Log 2',
          source: 'test',
        });
      });

      await waitFor(() => {
        expect(result.current.logs.length).toBeGreaterThan(0);
      });

      const logsBeforeError = result.current.logs.length;

      // Simulate transient failure (SSE error)
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      // Wait for disconnection
      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Logs from before the error should still be present
      expect(result.current.logs.length).toBe(logsBeforeError);

      // Cleanup
      act(() => {
        result.current.disconnect();
      });
      unmount();
    });
  });
});
