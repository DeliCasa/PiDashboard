/**
 * Logs API Service
 * Log fetching and export endpoints (backend returns JSON, not SSE)
 */

import { apiClient, buildUrl } from './client';
import type { LogEntry, DiagnosticReport } from '@/domain/types/entities';

type LogsParams = Record<string, string | number | boolean | undefined>;

// Backend response type
interface LogsApiResponse {
  count: number;
  logs: LogEntry[];
}

/**
 * Logs API endpoints
 */
export const logsApi = {
  /**
   * Get recent log entries
   * Backend returns {count, logs} structure
   */
  getRecent: async (params?: LogsParams): Promise<LogEntry[]> => {
    const response = await apiClient.get<LogsApiResponse>(buildUrl('/dashboard/logs', params));
    // Transform backend response to array
    return response.logs || [];
  },

  /**
   * Export full diagnostics report
   */
  exportDiagnostics: () =>
    apiClient.get<DiagnosticReport>('/dashboard/diagnostics/export'),
};
