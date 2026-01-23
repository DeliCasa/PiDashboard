/**
 * useSSE Hook
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Generic Server-Sent Events hook with automatic reconnection,
 * exponential backoff, and connection state management.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { SSEConnectionState, UseSSEOptions, UseSSEReturn } from '@/domain/types/sse';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Generic SSE hook for connecting to Server-Sent Events streams.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection state tracking
 * - Configurable retry limits
 * - Clean disconnect on unmount
 *
 * @param options - SSE connection options
 * @returns SSE connection state and controls
 */
export function useSSE<T = unknown>(options: UseSSEOptions<T>): UseSSEReturn {
  const {
    url,
    onMessage,
    onError,
    onOpen,
    enabled = true,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = options;

  // State
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Refs for mutable state
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manuallyClosedRef = useRef(false);
  // Ref to hold the connect function for use in callbacks
  const connectRef = useRef<(() => void) | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Connect function - uses ref to avoid circular dependency
  const connect = useCallback(() => {
    if (!url || !enabled) return;

    // Cleanup any existing connection
    cleanup();

    // Reset state
    manuallyClosedRef.current = false;
    setError(null);
    setConnectionState('connecting');

    // Create EventSource
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // Handle successful connection
    eventSource.onopen = () => {
      retryCountRef.current = 0;
      setConnectionState('connected');
      setError(null);
      onOpen?.();
    };

    // Handle messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T;
        onMessage(data);
      } catch (parseError) {
        console.error('[SSE] Failed to parse message:', parseError);
      }
    };

    // Handle errors
    eventSource.onerror = (event) => {
      // Don't reconnect if manually closed
      if (manuallyClosedRef.current) {
        return;
      }

      const errorMessage = 'SSE connection error';
      setError(errorMessage);
      onError?.(event);

      // Check if we should retry
      if (retryCountRef.current < maxRetries) {
        setConnectionState('reconnecting');
        retryCountRef.current++;

        // Exponential backoff with jitter
        const delay = Math.min(
          retryDelay * Math.pow(2, retryCountRef.current - 1) + Math.random() * 1000,
          MAX_RETRY_DELAY
        );

        console.log(
          `[SSE] Reconnecting in ${Math.round(delay)}ms (attempt ${retryCountRef.current}/${maxRetries})`
        );

        retryTimeoutRef.current = setTimeout(() => {
          // Use ref to call connect to avoid stale closure
          connectRef.current?.();
        }, delay);
      } else {
        setConnectionState('error');
        console.error('[SSE] Max retries exceeded, giving up');
      }
    };
  }, [url, enabled, maxRetries, retryDelay, onMessage, onError, onOpen, cleanup]);

  // Keep connectRef in sync with connect function
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Close function
  const close = useCallback(() => {
    manuallyClosedRef.current = true;
    cleanup();
    setConnectionState('disconnected');
    setError(null);
  }, [cleanup]);

  // Reconnect function
  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount/URL change, cleanup on unmount
  // SSE connection setup requires calling connect() in effect - this is intentional
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
    close,
    reconnect,
  };
}

// ============================================================================
// Specialized SSE Hooks
// ============================================================================

/**
 * SSE hook specifically for typed events with event name routing.
 * Parses the event envelope and routes to appropriate handlers.
 */
export function useTypedSSE<TEvent extends { type: string }>(options: {
  url: string | null;
  onEvent: (event: TEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  enabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}): UseSSEReturn {
  return useSSE<TEvent>({
    url: options.url,
    onMessage: options.onEvent,
    onError: options.onError,
    onOpen: options.onOpen,
    enabled: options.enabled,
    maxRetries: options.maxRetries,
    retryDelay: options.retryDelay,
  });
}

// ============================================================================
// Type Exports
// ============================================================================

export type { SSEConnectionState, UseSSEOptions, UseSSEReturn };
