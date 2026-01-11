/**
 * useWebSocket Hook
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T041
 *
 * Generic WebSocket hook with automatic reconnection,
 * exponential backoff, and connection state management.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { ConnectionState } from '@/domain/types/websocket';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const PING_INTERVAL = 30000; // Send ping every 30 seconds
const PONG_TIMEOUT = 5000; // Expect pong within 5 seconds

// ============================================================================
// Types
// ============================================================================

export interface UseWebSocketOptions<T = unknown> {
  /** WebSocket URL (ws:// or wss://) */
  url: string | null;
  /** Callback when a message is received */
  onMessage: (data: T) => void;
  /** Callback when an error occurs */
  onError?: (error: Event) => void;
  /** Callback when connection opens */
  onOpen?: () => void;
  /** Callback when connection closes */
  onClose?: (event: CloseEvent) => void;
  /** Whether the connection is enabled */
  enabled?: boolean;
  /** Maximum number of reconnection attempts */
  maxRetries?: number;
  /** Initial retry delay in ms */
  retryDelay?: number;
  /** Whether to send ping/pong messages */
  enablePingPong?: boolean;
  /** Protocols to use for WebSocket */
  protocols?: string | string[];
}

export interface UseWebSocketReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Error message if any */
  error: string | null;
  /** Number of reconnection attempts */
  retryCount: number;
  /** Send a message through the WebSocket */
  send: (data: unknown) => boolean;
  /** Manually close the connection */
  close: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Generic WebSocket hook for real-time communication.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection state tracking
 * - Configurable retry limits
 * - Optional ping/pong keepalive
 * - Clean disconnect on unmount
 *
 * @param options - WebSocket connection options
 * @returns WebSocket connection state and controls
 */
export function useWebSocket<T = unknown>(options: UseWebSocketOptions<T>): UseWebSocketReturn {
  const {
    url,
    onMessage,
    onError,
    onOpen,
    onClose,
    enabled = true,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    enablePingPong = true,
    protocols,
  } = options;

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refs for mutable state
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manuallyClosedRef = useRef(false);
  const connectRef = useRef<(() => void) | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear timers
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
    // Close socket
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  // Setup ping/pong keepalive
  const setupPingPong = useCallback(() => {
    if (!enablePingPong || !socketRef.current) return;

    // Clear existing interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        // Send ping
        socketRef.current.send(JSON.stringify({ type: 'ping' }));

        // Set pong timeout
        pongTimeoutRef.current = setTimeout(() => {
          console.warn('[WebSocket] Pong timeout, reconnecting...');
          // Force reconnect on pong timeout
          if (socketRef.current) {
            socketRef.current.close();
          }
        }, PONG_TIMEOUT);
      }
    }, PING_INTERVAL);
  }, [enablePingPong]);

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as T;

        // Handle pong response
        if (
          typeof data === 'object' &&
          data !== null &&
          'type' in data &&
          (data as { type: string }).type === 'pong'
        ) {
          // Clear pong timeout
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
            pongTimeoutRef.current = null;
          }
          return; // Don't forward pong to consumer
        }

        onMessage(data);
      } catch (parseError) {
        console.error('[WebSocket] Failed to parse message:', parseError);
      }
    },
    [onMessage]
  );

  // Connect function
  const connect = useCallback(() => {
    if (!url || !enabled) return;

    // Cleanup any existing connection
    cleanup();

    // Reset state
    manuallyClosedRef.current = false;
    setError(null);
    setConnectionState('connecting');

    try {
      // Create WebSocket
      const socket = protocols ? new WebSocket(url, protocols) : new WebSocket(url);
      socketRef.current = socket;

      // Handle successful connection
      socket.onopen = () => {
        retryCountRef.current = 0;
        setRetryCount(0);
        setConnectionState('connected');
        setError(null);
        setupPingPong();
        onOpen?.();
      };

      // Handle messages
      socket.onmessage = handleMessage;

      // Handle errors
      socket.onerror = (event) => {
        const errorMessage = 'WebSocket connection error';
        setError(errorMessage);
        onError?.(event);
      };

      // Handle close
      socket.onclose = (event) => {
        // Clear ping/pong
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        if (pongTimeoutRef.current) {
          clearTimeout(pongTimeoutRef.current);
          pongTimeoutRef.current = null;
        }

        onClose?.(event);

        // Don't reconnect if manually closed or clean close
        if (manuallyClosedRef.current) {
          setConnectionState('disconnected');
          return;
        }

        // Abnormal closure - attempt reconnect
        if (!event.wasClean && retryCountRef.current < maxRetries) {
          setConnectionState('reconnecting');
          retryCountRef.current++;
          setRetryCount(retryCountRef.current);

          // Exponential backoff with jitter
          const delay = Math.min(
            retryDelay * Math.pow(2, retryCountRef.current - 1) + Math.random() * 1000,
            MAX_RETRY_DELAY
          );

          console.log(
            `[WebSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${retryCountRef.current}/${maxRetries})`
          );

          retryTimeoutRef.current = setTimeout(() => {
            connectRef.current?.();
          }, delay);
        } else if (retryCountRef.current >= maxRetries) {
          setConnectionState('error');
          setError('Max reconnection attempts exceeded');
          console.error('[WebSocket] Max retries exceeded, giving up');
        } else {
          // Clean close
          setConnectionState('disconnected');
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create WebSocket');
      setConnectionState('error');
    }
  }, [
    url,
    enabled,
    maxRetries,
    retryDelay,
    protocols,
    handleMessage,
    onOpen,
    onError,
    onClose,
    cleanup,
    setupPingPong,
  ]);

  // Keep connectRef in sync
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Send function
  const send = useCallback((data: unknown): boolean => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  // Close function
  const close = useCallback(() => {
    manuallyClosedRef.current = true;
    cleanup();
    setConnectionState('disconnected');
    setError(null);
    setRetryCount(0);
  }, [cleanup]);

  // Reconnect function
  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    setRetryCount(0);
    connect();
  }, [connect]);

  // Connect on mount/URL change, cleanup on unmount
  useEffect(() => {
    if (enabled && url) {
      connect();
    } else {
      cleanup();
      setConnectionState('disconnected');
    }

    return cleanup;
  }, [url, enabled, connect, cleanup]);

  return {
    connectionState,
    error,
    retryCount,
    send,
    close,
    reconnect,
  };
}

// ============================================================================
// Specialized WebSocket Hooks
// ============================================================================

/**
 * WebSocket hook for typed messages with automatic message routing.
 */
export function useTypedWebSocket<TMessage extends { type: string }>(options: {
  url: string | null;
  onMessage: (message: TMessage) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  enabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}): UseWebSocketReturn {
  return useWebSocket<TMessage>({
    url: options.url,
    onMessage: options.onMessage,
    onError: options.onError,
    onOpen: options.onOpen,
    onClose: options.onClose,
    enabled: options.enabled,
    maxRetries: options.maxRetries,
    retryDelay: options.retryDelay,
    enablePingPong: true,
  });
}

// ============================================================================
// Type Exports
// ============================================================================

export type { ConnectionState };
