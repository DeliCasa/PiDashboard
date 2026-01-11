/**
 * useWebSocket Hook Unit Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T043
 *
 * Tests for the WebSocket hook including:
 * - Connection lifecycle
 * - Message handling
 * - Reconnection logic
 * - Ping/pong keepalive
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '@/application/hooks/useWebSocket';

// ============================================================================
// Mock WebSocket
// ============================================================================

interface MockWebSocketInstance {
  url: string;
  protocols?: string | string[];
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  simulateOpen: () => void;
  simulateMessage: (data: unknown) => void;
  simulateError: () => void;
  simulateClose: (wasClean?: boolean, code?: number) => void;
}

let mockWebSocketInstances: MockWebSocketInstance[] = [];

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  protocols?: string | string[];
  readyState: number = MockWebSocket.CONNECTING;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ wasClean: true, code: 1000 } as CloseEvent);
    }
  });

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    mockWebSocketInstances.push(this as unknown as MockWebSocketInstance);
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(wasClean = false, code = 1006) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ wasClean, code } as CloseEvent);
    }
  }
}

// ============================================================================
// Test Setup
// ============================================================================

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockWebSocketInstances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // Helper to get latest WebSocket instance
  const getLatestWs = (): MockWebSocketInstance | undefined => {
    return mockWebSocketInstances[mockWebSocketInstances.length - 1];
  };

  // ============================================================================
  // Connection Tests
  // ============================================================================

  describe('Connection', () => {
    it('should start in disconnected state when not enabled', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          enabled: false,
        })
      );

      expect(result.current.connectionState).toBe('disconnected');
      expect(mockWebSocketInstances).toHaveLength(0);
    });

    it('should connect when enabled with valid URL', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          enabled: true,
        })
      );

      expect(result.current.connectionState).toBe('connecting');
      expect(mockWebSocketInstances).toHaveLength(1);
      expect(getLatestWs()?.url).toBe('ws://localhost:8082/ws');
    });

    it('should not connect when URL is null', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: null,
          onMessage,
          enabled: true,
        })
      );

      expect(result.current.connectionState).toBe('disconnected');
      expect(mockWebSocketInstances).toHaveLength(0);
    });

    it('should transition to connected state on open', async () => {
      const onMessage = vi.fn();
      const onOpen = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          onOpen,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');
      expect(onOpen).toHaveBeenCalled();
    });

    it('should pass protocols to WebSocket constructor', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          protocols: ['v1', 'v2'],
        })
      );

      expect(getLatestWs()?.protocols).toEqual(['v1', 'v2']);
    });
  });

  // ============================================================================
  // Message Handling Tests
  // ============================================================================

  describe('Message Handling', () => {
    it('should call onMessage with parsed JSON', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
        getLatestWs()?.simulateMessage({ type: 'test', value: 42 });
      });

      expect(onMessage).toHaveBeenCalledWith({ type: 'test', value: 42 });
    });

    it('should handle multiple messages', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
        getLatestWs()?.simulateMessage({ id: 1 });
        getLatestWs()?.simulateMessage({ id: 2 });
        getLatestWs()?.simulateMessage({ id: 3 });
      });

      expect(onMessage).toHaveBeenCalledTimes(3);
    });

    it('should not forward pong messages to onMessage', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          enablePingPong: true,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
        getLatestWs()?.simulateMessage({ type: 'pong' });
        getLatestWs()?.simulateMessage({ type: 'data', value: 1 });
      });

      expect(onMessage).toHaveBeenCalledTimes(1);
      expect(onMessage).toHaveBeenCalledWith({ type: 'data', value: 1 });
    });

    it('should handle invalid JSON gracefully', () => {
      const onMessage = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
        // Simulate raw invalid JSON message
        if (getLatestWs()?.onmessage) {
          getLatestWs()!.onmessage!({ data: 'not json' } as MessageEvent);
        }
      });

      expect(onMessage).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Send Tests
  // ============================================================================

  describe('Send', () => {
    it('should send JSON-stringified data', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
      });

      const sent = result.current.send({ action: 'test' });

      expect(sent).toBe(true);
      expect(getLatestWs()?.send).toHaveBeenCalledWith('{"action":"test"}');
    });

    it('should return false when not connected', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
        })
      );

      // Still connecting, not open
      const sent = result.current.send({ action: 'test' });

      expect(sent).toBe(false);
      expect(getLatestWs()?.send).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Close Tests
  // ============================================================================

  describe('Close', () => {
    it('should close connection and update state', () => {
      const onMessage = vi.fn();
      const onClose = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          onClose,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');

      act(() => {
        result.current.close();
      });

      expect(result.current.connectionState).toBe('disconnected');
      expect(getLatestWs()?.close).toHaveBeenCalled();
    });

    it('should not reconnect after manual close', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          maxRetries: 3,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
        result.current.close();
      });

      // Advance timers - should not trigger reconnection
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.connectionState).toBe('disconnected');
      expect(mockWebSocketInstances).toHaveLength(1);
    });
  });

  // ============================================================================
  // Reconnection Tests
  // ============================================================================

  describe('Reconnection', () => {
    it('should reconnect on abnormal close', async () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          maxRetries: 3,
          retryDelay: 1000,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');

      // Simulate abnormal close
      act(() => {
        getLatestWs()?.simulateClose(false, 1006);
      });

      expect(result.current.connectionState).toBe('reconnecting');
      expect(result.current.retryCount).toBe(1);

      // Advance timer past retry delay
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockWebSocketInstances).toHaveLength(2);
    });

    it('should use exponential backoff', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          maxRetries: 5,
          retryDelay: 1000,
        })
      );

      // First connection
      act(() => {
        getLatestWs()?.simulateClose(false, 1006);
      });

      // First retry after ~1s
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(mockWebSocketInstances).toHaveLength(2);

      // Second close
      act(() => {
        getLatestWs()?.simulateClose(false, 1006);
      });

      // Second retry after ~2s (exponential)
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(mockWebSocketInstances).toHaveLength(3);
    });

    it('should stop after max retries', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          maxRetries: 2,
          retryDelay: 100,
        })
      );

      // Exhaust retries
      for (let i = 0; i < 3; i++) {
        act(() => {
          getLatestWs()?.simulateClose(false, 1006);
          vi.advanceTimersByTime(5000);
        });
      }

      expect(result.current.connectionState).toBe('error');
      expect(result.current.error).toBe('Max reconnection attempts exceeded');
    });

    it('should reset retry count on successful connection', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          maxRetries: 5,
          retryDelay: 100,
        })
      );

      // Trigger retry
      act(() => {
        getLatestWs()?.simulateClose(false, 1006);
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.retryCount).toBe(1);

      // Successfully reconnect
      act(() => {
        getLatestWs()?.simulateOpen();
      });

      expect(result.current.retryCount).toBe(0);
      expect(result.current.connectionState).toBe('connected');
    });

    it('should not reconnect on clean close', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          maxRetries: 3,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
        getLatestWs()?.simulateClose(true, 1000); // Clean close
      });

      expect(result.current.connectionState).toBe('disconnected');
      expect(mockWebSocketInstances).toHaveLength(1);
    });

    it('should allow manual reconnect', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
        result.current.close();
      });

      expect(mockWebSocketInstances).toHaveLength(1);

      act(() => {
        result.current.reconnect();
      });

      expect(mockWebSocketInstances).toHaveLength(2);
      expect(result.current.connectionState).toBe('connecting');
    });
  });

  // ============================================================================
  // Ping/Pong Tests
  // ============================================================================

  describe('Ping/Pong', () => {
    it('should send ping messages at interval', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          enablePingPong: true,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
      });

      // Advance to first ping (30s)
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(getLatestWs()?.send).toHaveBeenCalledWith('{"type":"ping"}');
    });

    it('should not send pings when disabled', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          enablePingPong: false,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
        vi.advanceTimersByTime(60000);
      });

      // send may be called for other reasons, but not with ping
      const pingCalls = getLatestWs()
        ?.send.mock.calls.filter((call: unknown[]) => call[0] === '{"type":"ping"}')
        .length;
      expect(pingCalls).toBe(0);
    });

    it('should reconnect on pong timeout', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          enablePingPong: true,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
      });

      // Send ping
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // No pong received, wait for timeout (5s)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should have triggered close
      expect(getLatestWs()?.close).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should set error state on error event', () => {
      const onMessage = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          onError,
        })
      );

      act(() => {
        getLatestWs()?.simulateError();
      });

      expect(result.current.error).toBe('WebSocket connection error');
      expect(onError).toHaveBeenCalled();
    });

    it('should call onClose callback', () => {
      const onMessage = vi.fn();
      const onClose = vi.fn();

      renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
          onClose,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
        getLatestWs()?.simulateClose(true, 1000);
      });

      expect(onClose).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Cleanup Tests
  // ============================================================================

  describe('Cleanup', () => {
    it('should close connection on unmount', () => {
      const onMessage = vi.fn();

      const { unmount } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8082/ws',
          onMessage,
        })
      );

      act(() => {
        getLatestWs()?.simulateOpen();
      });

      unmount();

      expect(getLatestWs()?.close).toHaveBeenCalled();
    });

    it('should close connection when disabled', () => {
      const onMessage = vi.fn();

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useWebSocket({
            url: 'ws://localhost:8082/ws',
            onMessage,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      act(() => {
        getLatestWs()?.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');

      rerender({ enabled: false });

      expect(result.current.connectionState).toBe('disconnected');
    });

    it('should reconnect when URL changes', () => {
      const onMessage = vi.fn();

      const { rerender } = renderHook(
        ({ url }) =>
          useWebSocket({
            url,
            onMessage,
          }),
        { initialProps: { url: 'ws://localhost:8082/ws1' } }
      );

      expect(getLatestWs()?.url).toBe('ws://localhost:8082/ws1');

      rerender({ url: 'ws://localhost:8082/ws2' });

      expect(mockWebSocketInstances).toHaveLength(2);
      expect(getLatestWs()?.url).toBe('ws://localhost:8082/ws2');
    });
  });
});
