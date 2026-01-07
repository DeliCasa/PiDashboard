/**
 * Logs Hooks
 * React Query hooks and SSE streaming for logs
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import { logsApi } from '@/infrastructure/api/logs';
import { queryKeys } from '@/lib/queryClient';
import type { LogEntry } from '@/domain/types/entities';

/**
 * Hook for fetching recent logs
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
 * Hook for SSE log streaming
 */
export function useLogStream(level?: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const maxLogs = 500; // Keep last 500 entries per spec

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = logsApi.getStreamUrl(level);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const entry: LogEntry = JSON.parse(event.data);
        setLogs((prev) => {
          const newLogs = [...prev, entry];
          // Keep only the last maxLogs entries
          return newLogs.slice(-maxLogs);
        });
      } catch (e) {
        console.error('Failed to parse log entry:', e);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      setError('Connection lost');
      eventSource.close();
    };
  }, [level]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Connect on mount, disconnect on unmount, reconnect on level change
  useEffect(() => {
    connect();

    // Auto-reconnect on error after 5 seconds
    const retryId = setInterval(() => {
      if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
        connect();
      }
    }, 5000);

    return () => {
      clearInterval(retryId);
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    logs,
    connected,
    error,
    clearLogs,
    reconnect: connect,
    disconnect,
  };
}
