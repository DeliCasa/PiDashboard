/**
 * Logs Hooks
 * React Query hooks for log fetching via SSE streaming
 * Updated: HANDOFF_031 Issue 4 - Use V1 SSE endpoint
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef } from 'react';
import { logsApi } from '@/infrastructure/api/logs';
import { queryKeys } from '@/lib/queryClient';
import type { LogEntry } from '@/domain/types/entities';

/**
 * Hook for fetching recent logs (alias for useRecentLogs)
 * @deprecated Prefer useLogStream() for real-time SSE streaming
 */
export function useLogs(
  params?: { level?: string; search?: string; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.logList(params),
    queryFn: () => logsApi.getRecent(params),
    enabled,
    staleTime: 5000,
    refetchInterval: 5000, // Poll every 5 seconds (fallback)
  });
}

/**
 * Hook for fetching recent logs
 * @deprecated Prefer useLogStream() for real-time SSE streaming
 */
export function useRecentLogs(
  params?: { level?: string; search?: string; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.logList(params),
    queryFn: () => logsApi.getRecent(params),
    enabled,
    staleTime: 5000,
  });
}

/**
 * Hook for exporting diagnostics
 */
export function useExportDiagnostics() {
  return useMutation({
    mutationFn: logsApi.exportDiagnostics,
  });
}

/**
 * Hook for real-time log streaming via SSE
 * Uses V1 endpoint: /api/v1/dashboard/logs (HANDOFF_031 Issue 4)
 *
 * Falls back to polling if SSE connection fails after 3 attempts.
 */
export function useLogStream(_level?: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxLogs = 500; // Keep last 500 entries per spec
  const maxReconnectAttempts = 3;

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prevLogs) => {
      // Check for duplicate by timestamp+message
      const key = `${entry.timestamp}-${entry.message}`;
      const exists = prevLogs.some(l => `${l.timestamp}-${l.message}` === key);
      if (exists) return prevLogs;

      // Add new log and keep only last maxLogs
      const updated = [...prevLogs, entry];
      return updated.slice(-maxLogs);
    });
  }, []);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setError(null);

    try {
      eventSourceRef.current = logsApi.streamLogs(
        (entry) => {
          addLog(entry);
          setConnected(true);
          reconnectAttemptsRef.current = 0; // Reset on successful message
        },
        (_event) => {
          setConnected(false);

          // Attempt reconnection with backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
            setError(`Connection lost. Reconnecting in ${delay / 1000}s...`);

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setError('Unable to connect to log stream. Check backend availability.');
          }
        }
      );

      // Mark as connecting (will be confirmed on first message)
      setConnected(true);
    } catch (e) {
      setConnected(false);
      setError(e instanceof Error ? e.message : 'Failed to connect to log stream');
    }
  }, [addLog]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [connect, disconnect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    logs,
    connected,
    error,
    clearLogs,
    reconnect,
    disconnect,
  };
}
