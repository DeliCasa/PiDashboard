/**
 * Logs Hooks
 * React Query hooks for log fetching via polling (backend returns JSON, not SSE)
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef } from 'react';
import { logsApi } from '@/infrastructure/api/logs';
import { queryKeys } from '@/lib/queryClient';
import type { LogEntry } from '@/domain/types/entities';

/**
 * Hook for fetching recent logs (alias for useRecentLogs)
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
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

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
 * Hook for log polling (replacement for SSE streaming)
 * Backend returns JSON {count, logs} instead of SSE stream
 */
export function useLogStream(level?: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxLogs = 500; // Keep last 500 entries per spec

  const fetchLogs = useCallback(async () => {
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        limit: 100,
      };
      if (level && level !== 'all') {
        params.level = level;
      }
      const newLogs = await logsApi.getRecent(params);

      setLogs((prevLogs) => {
        // If no new logs, just mark as connected
        if (!newLogs || newLogs.length === 0) {
          return prevLogs;
        }
        // Merge new logs, avoiding duplicates by timestamp+message
        const existing = new Set(prevLogs.map(l => `${l.timestamp}-${l.message}`));
        const uniqueNew = newLogs.filter(l => !existing.has(`${l.timestamp}-${l.message}`));
        const merged = [...prevLogs, ...uniqueNew];
        // Keep only the last maxLogs entries
        return merged.slice(-maxLogs);
      });

      setConnected(true);
      setError(null);
    } catch (e) {
      setConnected(false);
      setError(e instanceof Error ? e.message : 'Failed to fetch logs');
    }
  }, [level]);

  const startPolling = useCallback(() => {
    // Initial fetch
    fetchLogs();

    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 3 seconds
    pollingIntervalRef.current = setInterval(fetchLogs, 3000);
    setConnected(true);
  }, [fetchLogs]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setConnected(false);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Start polling on mount, stop on unmount
  useEffect(() => {
    startPolling();

    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  return {
    logs,
    connected,
    error,
    clearLogs,
    reconnect: startPolling,
    disconnect: stopPolling,
  };
}
