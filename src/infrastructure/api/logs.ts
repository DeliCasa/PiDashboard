/**
 * Logs API Service
 * Log streaming and export endpoints
 */

import { apiClient, buildUrl } from './client';
import type { LogEntry, DiagnosticReport } from '@/domain/types/entities';

type LogsParams = Record<string, string | number | boolean | undefined>;

/**
 * Logs API endpoints
 */
export const logsApi = {
  /**
   * Get recent log entries
   */
  getRecent: (params?: LogsParams) =>
    apiClient.get<LogEntry[]>(buildUrl('/dashboard/logs', params)),

  /**
   * Export full diagnostics report
   */
  exportDiagnostics: () =>
    apiClient.get<DiagnosticReport>('/dashboard/diagnostics/export'),

  /**
   * Get SSE stream URL for log streaming
   */
  getStreamUrl: (level?: string) => {
    const baseUrl = '/api/dashboard/logs/stream';
    return level ? `${baseUrl}?level=${level}` : baseUrl;
  },
};
