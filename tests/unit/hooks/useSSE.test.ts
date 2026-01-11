/**
 * useSSE Hook Unit Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T025
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE, useTypedSSE } from '@/application/hooks/useSSE';

// ============================================================================
// Mocks
// ============================================================================

// Mock EventSource
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
}

// Replace global EventSource with mock
const originalEventSource = global.EventSource;

// ============================================================================
// Test Suite
// ============================================================================

describe('useSSE Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.reset();
    (global as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;
  });

  afterEach(() => {
    vi.useRealTimers();
    (global as unknown as { EventSource: typeof EventSource }).EventSource = originalEventSource;
  });

  describe('Basic Connection', () => {
    it('should connect when enabled and url is provided', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
        })
      );

      expect(MockEventSource.lastUrl).toBe('/api/events');
      expect(MockEventSource.instances).toHaveLength(1);
    });

    it('should not connect when disabled', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: false,
        })
      );

      expect(MockEventSource.instances).toHaveLength(0);
    });

    it('should not connect when url is null', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: null as unknown as string,
          onMessage,
          enabled: true,
        })
      );

      expect(MockEventSource.instances).toHaveLength(0);
    });

    it('should start with connecting state', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
        })
      );

      expect(result.current.connectionState).toBe('connecting');
    });

    it('should transition to connected state on open', () => {
      const onMessage = vi.fn();
      const onOpen = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          onOpen,
          enabled: true,
        })
      );

      // Simulate connection open
      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('should close connection on unmount', () => {
      const onMessage = vi.fn();

      const { unmount } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
        })
      );

      const eventSource = MockEventSource.getLatest();
      expect(eventSource?.closed).toBe(false);

      unmount();

      expect(eventSource?.closed).toBe(true);
    });
  });

  describe('Message Handling', () => {
    it('should call onMessage with parsed data', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      const testData = { type: 'test', value: 42 };

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(testData);
      });

      expect(onMessage).toHaveBeenCalledWith(testData);
    });

    it('should handle multiple messages', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      act(() => {
        MockEventSource.getLatest()?.simulateMessage({ id: 1 });
        MockEventSource.getLatest()?.simulateMessage({ id: 2 });
        MockEventSource.getLatest()?.simulateMessage({ id: 3 });
      });

      expect(onMessage).toHaveBeenCalledTimes(3);
    });

    it('should handle JSON parse errors gracefully', () => {
      const onMessage = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      // Send invalid JSON by directly calling onmessage with invalid data
      act(() => {
        const es = MockEventSource.getLatest();
        if (es?.onmessage) {
          es.onmessage(new MessageEvent('message', { data: 'invalid json' }));
        }
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(onMessage).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling and Reconnection', () => {
    it('should call onError when error occurs', () => {
      const onMessage = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          onError,
          enabled: true,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.error).toBe('SSE connection error');
    });

    it('should set reconnecting state on error', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 3,
          retryDelay: 1000,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      // Error - should trigger reconnection
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      expect(result.current.connectionState).toBe('reconnecting');
    });

    it('should attempt reconnection after delay', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 3,
          retryDelay: 1000,
        })
      );

      const initialCount = MockEventSource.instances.length;

      // Error - should trigger reconnection
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      // Advance timer for reconnection
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should have created a new EventSource
      expect(MockEventSource.instances.length).toBeGreaterThan(initialCount);
    });

    it('should stop retrying after max retries', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 2,
          retryDelay: 100,
        })
      );

      // First error (uses 1 retry)
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      // Advance timer and trigger retry
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Second error (uses 2nd retry)
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Third error - max retries exceeded
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      expect(result.current.connectionState).toBe('error');
    });

    it('should reset retry count on successful connection', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 3,
          retryDelay: 100,
        })
      );

      // First error
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Successful reconnection
      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');

      // Another error - should start fresh retry count
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      expect(result.current.connectionState).toBe('reconnecting');
    });
  });

  describe('Manual Controls', () => {
    it('should close connection when close() is called', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');

      act(() => {
        result.current.close();
      });

      expect(result.current.connectionState).toBe('disconnected');
      expect(MockEventSource.getLatest()?.closed).toBe(true);
    });

    it('should reconnect when reconnect() is called', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      const initialInstance = MockEventSource.getLatest();

      act(() => {
        result.current.reconnect();
      });

      expect(MockEventSource.getLatest()).not.toBe(initialInstance);
      expect(result.current.connectionState).toBe('connecting');
    });

    it('should not reconnect after close() until reconnect() is called', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 3,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      // Close manually
      act(() => {
        result.current.close();
      });

      expect(result.current.connectionState).toBe('disconnected');

      const instanceCount = MockEventSource.instances.length;

      // Advance timers - should not create new connections
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(MockEventSource.instances.length).toBe(instanceCount);
    });
  });

  describe('URL Changes', () => {
    it('should reconnect when URL changes', () => {
      const onMessage = vi.fn();

      const { rerender } = renderHook(
        ({ url }) =>
          useSSE({
            url,
            onMessage,
            enabled: true,
          }),
        { initialProps: { url: '/api/events/1' } }
      );

      expect(MockEventSource.lastUrl).toBe('/api/events/1');

      rerender({ url: '/api/events/2' });

      expect(MockEventSource.lastUrl).toBe('/api/events/2');
    });

    it('should close connection when enabled changes to false', () => {
      const onMessage = vi.fn();

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useSSE({
            url: '/api/events',
            onMessage,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');

      rerender({ enabled: false });

      expect(result.current.connectionState).toBe('disconnected');
      expect(MockEventSource.getLatest()?.closed).toBe(true);
    });
  });
});

describe('useTypedSSE Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.reset();
    (global as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;
  });

  afterEach(() => {
    vi.useRealTimers();
    (global as unknown as { EventSource: typeof EventSource }).EventSource = originalEventSource;
  });

  it('should pass events to onEvent callback', () => {
    const onEvent = vi.fn();

    renderHook(() =>
      useTypedSSE<{ type: string; data: number }>({
        url: '/api/events',
        onEvent,
        enabled: true,
      })
    );

    act(() => {
      MockEventSource.getLatest()?.simulateOpen();
    });

    const testEvent = { type: 'update', data: 123 };

    act(() => {
      MockEventSource.getLatest()?.simulateMessage(testEvent);
    });

    expect(onEvent).toHaveBeenCalledWith(testEvent);
  });
});
