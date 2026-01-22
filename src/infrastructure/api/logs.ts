/**
 * Logs API Service
 * Log fetching via SSE streaming and export endpoints
 *
 * Feature: 005-testing-research-and-hardening (T025)
 * Updated: HANDOFF_031 Issue 4 - Use V1 SSE endpoint
 * Includes Zod schema validation for runtime API contract enforcement.
 */

import { apiClient, buildUrl, getApiBaseUrl } from './client';
import {
  LogsResponseSchema,
  DiagnosticReportSchema,
  safeParseWithErrors,
} from './schemas';
import type { LogEntry, DiagnosticReport } from '@/domain/types/entities';

type LogsParams = Record<string, string | number | boolean | undefined>;

// Backend response type (for legacy polling fallback)
interface LogsApiResponse {
  count: number;
  logs: LogEntry[];
}

/**
 * Logs API endpoints
 */
export const logsApi = {
  /**
   * Get recent log entries (legacy polling - fallback)
   * @deprecated Use streamLogs() for real-time updates via SSE
   */
  getRecent: async (params?: LogsParams): Promise<LogEntry[]> => {
    const response = await apiClient.get<LogsApiResponse>(buildUrl('/dashboard/logs', params));

    // Validate API response against schema
    const validation = safeParseWithErrors(LogsResponseSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] Logs validation failed:', validation.errors);
    }

    // Transform backend response to array
    return response.logs ?? [];
  },

  /**
   * Stream logs via Server-Sent Events (SSE)
   * Uses V1 endpoint: /api/v1/system/logs/stream
   * Per HANDOFF_PIORCH_DASHBOARD_INTEGRATION Section 7.3
   *
   * @param onLog - Callback for each log entry received
   * @param onError - Callback for connection errors
   * @returns EventSource instance for cleanup
   */
  streamLogs: (
    onLog: (entry: LogEntry) => void,
    onError?: (error: Event) => void
  ): EventSource => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/v1/system/logs/stream`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data) as LogEntry;
        onLog(entry);
      } catch (e) {
        console.warn('[SSE] Failed to parse log entry:', e);
      }
    };

    eventSource.onerror = (event) => {
      console.error('[SSE] Log stream error:', event);
      onError?.(event);
    };

    return eventSource;
  },

  /**
   * Export full diagnostics report
   * Validates response against schema.
   */
  exportDiagnostics: async (): Promise<DiagnosticReport> => {
    const response = await apiClient.get<DiagnosticReport>('/dashboard/diagnostics/export');

    // Validate API response against schema
    const validation = safeParseWithErrors(DiagnosticReportSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] Diagnostics export validation failed:', validation.errors);
    }

    return response;
  },
};
