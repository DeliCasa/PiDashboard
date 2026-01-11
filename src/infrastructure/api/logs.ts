/**
 * Logs API Service
 * Log fetching and export endpoints (backend returns JSON, not SSE)
 *
 * Feature: 005-testing-research-and-hardening (T025)
 * Includes Zod schema validation for runtime API contract enforcement.
 */

import { apiClient, buildUrl } from './client';
import {
  LogsResponseSchema,
  DiagnosticReportSchema,
  safeParseWithErrors,
} from './schemas';
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
   * Validates response and returns logs array.
   */
  getRecent: async (params?: LogsParams): Promise<LogEntry[]> => {
    const response = await apiClient.get<LogsApiResponse>(buildUrl('/dashboard/logs', params));

    // Validate API response against schema
    const validation = safeParseWithErrors(LogsResponseSchema, response);
    if (!validation.success) {
      console.warn('[API Contract] Logs validation failed:', validation.errors);
    }

    // Transform backend response to array
    return response.logs || [];
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
