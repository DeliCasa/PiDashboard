/**
 * useSSE Reconnection Integration Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T029
 *
 * Tests SSE reconnection behavior including:
 * - Exponential backoff timing
 * - Connection state transitions during reconnection
 * - Message continuity after reconnection
 * - Max retry exhaustion
 * - Manual reconnection after error state
 * - Network recovery scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE } from '@/application/hooks/useSSE';

// ============================================================================
// Enhanced Mock EventSource
// ============================================================================

interface MockEventSourceInstance {
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  closed: boolean;
  close: () => void;
  simulateOpen: () => void;
  simulateMessage: (data: unknown) => void;
  simulateError: () => void;
}

class MockEventSource implements MockEventSourceInstance {
  static instances: MockEventSource[] = [];
  static lastUrl: string | null = null;
  static connectionAttempts: number[] = []; // Timestamps of connection attempts

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
    MockEventSource.connectionAttempts.push(Date.now());
  }

  close() {
    this.closed = true;
    this.readyState = 2; // CLOSED
  }

  simulateOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(
        new MessageEvent('message', {
          data: JSON.stringify(data),
        })
      );
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
    MockEventSource.connectionAttempts = [];
  }

  static getLatest(): MockEventSource | undefined {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }

  static getByIndex(index: number): MockEventSource | undefined {
    return MockEventSource.instances[index];
  }

  static getConnectionCount(): number {
    return MockEventSource.instances.length;
  }
}

// Replace global EventSource
const originalEventSource = global.EventSource;

// ============================================================================
// Test Suite
// ============================================================================

describe('useSSE Reconnection Integration Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.reset();
    (global as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;
  });

  afterEach(() => {
    vi.useRealTimers();
    (global as unknown as { EventSource: typeof EventSource }).EventSource = originalEventSource;
  });

  describe('Exponential Backoff Timing', () => {
    it('should increase delay exponentially on consecutive failures', async () => {
      const onMessage = vi.fn();
      const baseDelay = 1000;

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 5,
          retryDelay: baseDelay,
        })
      );

      const initialCount = MockEventSource.getConnectionCount();
      expect(initialCount).toBe(1);

      // First error - should schedule retry after ~1000ms (base delay)
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      // Advance less than base delay - no reconnection yet
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(MockEventSource.getConnectionCount()).toBe(initialCount);

      // Advance past first retry delay (~1000ms + jitter up to 1000ms max)
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(MockEventSource.getConnectionCount()).toBe(2);

      // Second error - delay should be ~2000ms (2^1 * base)
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(MockEventSource.getConnectionCount()).toBe(2); // Still 2

      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(MockEventSource.getConnectionCount()).toBe(3);

      // Third error - delay should be ~4000ms (2^2 * base)
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      act(() => {
        vi.advanceTimersByTime(3500);
      });
      expect(MockEventSource.getConnectionCount()).toBe(3); // Still 3

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(MockEventSource.getConnectionCount()).toBe(4);
    });

    it('should cap delay at MAX_RETRY_DELAY (30 seconds)', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 10,
          retryDelay: 10000, // 10 second base
        })
      );

      // After several retries, delay should be capped at 30s
      // Retry 1: 10s, Retry 2: 20s, Retry 3: 40s -> capped at 30s
      for (let i = 0; i < 4; i++) {
        act(() => {
          MockEventSource.getLatest()?.simulateError();
        });
        act(() => {
          vi.advanceTimersByTime(35000); // 35s should be enough for any retry
        });
      }

      // Should have made 5 connection attempts (initial + 4 retries)
      expect(MockEventSource.getConnectionCount()).toBe(5);
    });
  });

  describe('Connection State Transitions', () => {
    it('should transition through states: connected -> reconnecting -> connected', () => {
      const onMessage = vi.fn();
      const stateHistory: string[] = [];

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 3,
          retryDelay: 100,
        })
      );

      // Initial connecting state
      stateHistory.push(result.current.connectionState);
      expect(result.current.connectionState).toBe('connecting');

      // Open connection
      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });
      stateHistory.push(result.current.connectionState);
      expect(result.current.connectionState).toBe('connected');

      // Error occurs
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      stateHistory.push(result.current.connectionState);
      expect(result.current.connectionState).toBe('reconnecting');

      // Advance timer for retry
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Reconnection succeeds
      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });
      stateHistory.push(result.current.connectionState);
      expect(result.current.connectionState).toBe('connected');

      // Verify state history
      expect(stateHistory).toEqual(['connecting', 'connected', 'reconnecting', 'connected']);
    });

    it('should transition to error state after max retries exhausted', () => {
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

      // First error - retry 1
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(result.current.connectionState).toBe('reconnecting');

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Second error - retry 2
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(result.current.connectionState).toBe('reconnecting');

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Third error - max retries exceeded
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(result.current.connectionState).toBe('error');
      expect(result.current.error).toBe('SSE connection error');
    });

    it('should clear error state when reconnection succeeds', () => {
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

      // Error occurs
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(result.current.error).toBe('SSE connection error');

      // Advance timer for retry
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Reconnection succeeds
      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');
      expect(result.current.error).toBeNull();
    });
  });

  describe('Message Continuity After Reconnection', () => {
    it('should receive messages after successful reconnection', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 3,
          retryDelay: 100,
        })
      );

      // Initial connection and message
      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
        MockEventSource.getLatest()?.simulateMessage({ id: 1, data: 'first' });
      });
      expect(onMessage).toHaveBeenCalledWith({ id: 1, data: 'first' });

      // Disconnect
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      // Advance timer for retry
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Reconnect and receive new messages
      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
        MockEventSource.getLatest()?.simulateMessage({ id: 2, data: 'second' });
      });

      expect(onMessage).toHaveBeenCalledWith({ id: 2, data: 'second' });
      expect(onMessage).toHaveBeenCalledTimes(2);
    });

    it('should create new EventSource instance during reconnection', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 3,
          retryDelay: 100,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      // Get the old EventSource before error
      const oldEventSource = MockEventSource.getLatest();
      const instanceCountBefore = MockEventSource.getConnectionCount();

      // Trigger error - schedules reconnection
      act(() => {
        oldEventSource?.simulateError();
      });

      // Wait for reconnection (100ms base + up to 1000ms jitter = need 1100ms+)
      act(() => {
        vi.advanceTimersByTime(1200);
      });

      // New EventSource should be created via connect() which calls cleanup()
      expect(MockEventSource.getConnectionCount()).toBe(instanceCountBefore + 1);
      expect(MockEventSource.getLatest()).not.toBe(oldEventSource);

      // Old EventSource should be closed by cleanup() in connect()
      expect(oldEventSource?.closed).toBe(true);

      // Messages on new EventSource should work
      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
        MockEventSource.getLatest()?.simulateMessage({ fresh: true });
      });

      expect(onMessage).toHaveBeenCalledWith({ fresh: true });
    });
  });

  describe('Manual Reconnection After Error State', () => {
    it('should allow manual reconnect() after max retries exhausted', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 1,
          retryDelay: 100,
        })
      );

      // First error - uses 1 retry
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Second error - max retries exceeded
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(result.current.connectionState).toBe('error');

      const instancesBeforeManualReconnect = MockEventSource.getConnectionCount();

      // Manual reconnect
      act(() => {
        result.current.reconnect();
      });

      expect(MockEventSource.getConnectionCount()).toBe(instancesBeforeManualReconnect + 1);
      expect(result.current.connectionState).toBe('connecting');

      // New connection succeeds
      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });
      expect(result.current.connectionState).toBe('connected');
    });

    it('should reset retry count after manual reconnect()', () => {
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

      // Exhaust retries
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(result.current.connectionState).toBe('error');

      // Manual reconnect resets retry count
      act(() => {
        result.current.reconnect();
      });

      // Should be able to retry again
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(result.current.connectionState).toBe('reconnecting'); // Not 'error'

      act(() => {
        vi.advanceTimersByTime(200);
      });

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });
      expect(result.current.connectionState).toBe('connected');
    });
  });

  describe('Network Recovery Scenarios', () => {
    it('should handle intermittent failures gracefully', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 5,
          retryDelay: 100,
        })
      );

      // Success -> Error -> Success -> Error -> Success
      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });
      expect(result.current.connectionState).toBe('connected');

      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(result.current.connectionState).toBe('reconnecting');

      act(() => {
        vi.advanceTimersByTime(200);
      });

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });
      expect(result.current.connectionState).toBe('connected');

      // Another disconnection
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(result.current.connectionState).toBe('reconnecting');

      act(() => {
        vi.advanceTimersByTime(200);
      });

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });
      expect(result.current.connectionState).toBe('connected');
    });

    it('should handle rapid successive errors', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
          maxRetries: 3,
          retryDelay: 500, // Longer delay to test timing
        })
      );

      const initialCount = MockEventSource.getConnectionCount();
      expect(initialCount).toBe(1);

      // First error - should schedule retry
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      // Not enough time for retry yet
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Count should remain same since retry hasn't fired yet
      expect(MockEventSource.getConnectionCount()).toBe(initialCount);

      // Advance past the retry delay (500ms base + up to 1000ms jitter)
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Now retry should have occurred
      expect(MockEventSource.getConnectionCount()).toBe(initialCount + 1);
    });

    it('should not reconnect when disabled during reconnection', () => {
      const onMessage = vi.fn();

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useSSE({
            url: '/api/events',
            onMessage,
            enabled,
            maxRetries: 3,
            retryDelay: 100,
          }),
        { initialProps: { enabled: true } }
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      // Trigger error to start reconnection
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(result.current.connectionState).toBe('reconnecting');

      const countBeforeDisable = MockEventSource.getConnectionCount();

      // Disable during reconnection
      rerender({ enabled: false });

      expect(result.current.connectionState).toBe('disconnected');

      // Advance timer - should not create new connection
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(MockEventSource.getConnectionCount()).toBe(countBeforeDisable);
    });
  });

  describe('Callback Stability During Reconnection', () => {
    it('should use updated onMessage callback after reconnection', () => {
      const onMessage1 = vi.fn();
      const onMessage2 = vi.fn();

      const { rerender } = renderHook(
        ({ onMessage }) =>
          useSSE({
            url: '/api/events',
            onMessage,
            enabled: true,
            maxRetries: 3,
            retryDelay: 100,
          }),
        { initialProps: { onMessage: onMessage1 } }
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
        MockEventSource.getLatest()?.simulateMessage({ first: true });
      });
      expect(onMessage1).toHaveBeenCalledWith({ first: true });

      // Change callback
      rerender({ onMessage: onMessage2 });

      // Trigger reconnection
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
        MockEventSource.getLatest()?.simulateMessage({ second: true });
      });

      // New callback should receive the message
      expect(onMessage2).toHaveBeenCalledWith({ second: true });
    });

    it('should call onOpen callback on each successful reconnection', () => {
      const onMessage = vi.fn();
      const onOpen = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          onOpen,
          enabled: true,
          maxRetries: 3,
          retryDelay: 100,
        })
      );

      // First connection
      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });
      expect(onOpen).toHaveBeenCalledTimes(1);

      // Disconnect and reconnect
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });
      expect(onOpen).toHaveBeenCalledTimes(2);

      // Another cycle
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });
      expect(onOpen).toHaveBeenCalledTimes(3);
    });

    it('should call onError callback on each error event', () => {
      const onMessage = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          onError,
          enabled: true,
          maxRetries: 3,
          retryDelay: 100,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      // Multiple errors
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(onError).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(onError).toHaveBeenCalledTimes(2);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(onError).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cleanup During Reconnection', () => {
    it('should cleanup pending retry timeout on unmount', () => {
      const onMessage = vi.fn();

      const { result, unmount } = renderHook(() =>
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

      // Trigger error to schedule retry
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });
      expect(result.current.connectionState).toBe('reconnecting');

      const countBeforeUnmount = MockEventSource.getConnectionCount();

      // Unmount while retry is pending
      unmount();

      // Advance timer past retry delay
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should not have created new connection after unmount
      expect(MockEventSource.getConnectionCount()).toBe(countBeforeUnmount);
    });

    it('should close EventSource on unmount during connected state', () => {
      const onMessage = vi.fn();

      const { unmount } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: true,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      const eventSource = MockEventSource.getLatest();
      expect(eventSource?.closed).toBe(false);

      unmount();

      expect(eventSource?.closed).toBe(true);
    });
  });

  describe('URL Change During Reconnection', () => {
    it('should use new URL when changed during reconnection', () => {
      const onMessage = vi.fn();

      const { rerender } = renderHook(
        ({ url }) =>
          useSSE({
            url,
            onMessage,
            enabled: true,
            maxRetries: 3,
            retryDelay: 100,
          }),
        { initialProps: { url: '/api/events/v1' } }
      );

      expect(MockEventSource.lastUrl).toBe('/api/events/v1');

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      // Trigger reconnection
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      // Change URL during reconnection
      rerender({ url: '/api/events/v2' });

      // Should immediately connect to new URL
      expect(MockEventSource.lastUrl).toBe('/api/events/v2');
    });

    it('should cancel pending retry when URL changes', () => {
      const onMessage = vi.fn();

      const { rerender } = renderHook(
        ({ url }) =>
          useSSE({
            url,
            onMessage,
            enabled: true,
            maxRetries: 3,
            retryDelay: 1000,
          }),
        { initialProps: { url: '/api/events/v1' } }
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      // Trigger error to schedule retry
      act(() => {
        MockEventSource.getLatest()?.simulateError();
      });

      const countAfterError = MockEventSource.getConnectionCount();

      // Change URL before retry fires
      rerender({ url: '/api/events/v2' });

      // New connection should be made immediately to new URL
      expect(MockEventSource.lastUrl).toBe('/api/events/v2');
      expect(MockEventSource.getConnectionCount()).toBe(countAfterError + 1);

      // Advance timer past old retry delay
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should not have made additional connection from old retry
      expect(MockEventSource.getConnectionCount()).toBe(countAfterError + 1);
    });
  });
});
