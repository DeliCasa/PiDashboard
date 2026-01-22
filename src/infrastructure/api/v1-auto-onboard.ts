/**
 * V1 Auto-Onboard API Client
 * Feature: 035-auto-onboard-dashboard
 *
 * ESP-CAM auto-onboard management via PiOrchestrator V1 API.
 * Based on OpenAPI spec: specs/035-auto-onboard-dashboard/contracts/v1-auto-onboard-api.yaml
 */

import { apiClient } from './client';
import { V1ApiError } from './errors';
import {
  StatusResponseSchema,
  EnableDisableResponseSchema,
  AuditEventsResponseSchema,
  ResetMetricsResponseSchema,
  CleanupEventsResponseSchema,
  type AutoOnboardStatus,
  type EnableDisableData,
  type AuditEventsData,
  type ResetMetricsData,
  type CleanupEventsData,
  type AuditEventFilters,
  type CleanupOptions,
} from './v1-auto-onboard-schemas';

// ============================================================================
// Constants
// ============================================================================

const V1_AUTO_ONBOARD_BASE = '/v1/onboarding/auto';

/** Default timeout for auto-onboard operations (10 seconds) */
const DEFAULT_TIMEOUT_MS = 10_000;

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parses an error response from the auto-onboard API.
 */
function parseErrorResponse(error: unknown, defaultCode: string): V1ApiError {
  // Check if error has response body with our error format
  if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>;

    // Handle response body format
    if ('body' in errObj && typeof errObj.body === 'object' && errObj.body) {
      const body = errObj.body as Record<string, unknown>;
      if (body.error && typeof body.error === 'object') {
        const apiError = body.error as Record<string, unknown>;
        return new V1ApiError(
          (apiError.code as string) || defaultCode,
          (apiError.message as string) || 'Unknown error',
          (apiError.retryable as boolean) ?? false
        );
      }
    }
  }

  // Handle ApiError with status code
  if (error instanceof Error && 'status' in error) {
    const apiError = error as Error & { status: number; code?: string };
    return new V1ApiError(
      apiError.code || defaultCode,
      apiError.message,
      apiError.status >= 500
    );
  }

  // Fallback for unknown errors
  return new V1ApiError(
    defaultCode,
    error instanceof Error ? error.message : 'Unknown error',
    true
  );
}

// ============================================================================
// API Client
// ============================================================================

/**
 * V1 Auto-Onboard API client.
 *
 * Provides typed methods for all auto-onboard operations with Zod validation.
 */
export const autoOnboardApi = {
  /**
   * Get current auto-onboard status including config and metrics.
   *
   * @returns Promise with auto-onboard status
   * @throws V1ApiError on failure
   */
  getStatus: async (): Promise<AutoOnboardStatus> => {
    try {
      const response = await apiClient.get<unknown>(
        `${V1_AUTO_ONBOARD_BASE}/status`,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      // Validate response
      const parsed = StatusResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[Auto-Onboard] getStatus validation failed:', parsed.error.issues);
        throw new V1ApiError('ONBOARD_INTERNAL_ERROR', 'Invalid response format', true);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw V1ApiError.fromV1Error(
          {
            code: parsed.data.error?.code || 'ONBOARD_NOT_AVAILABLE',
            message: parsed.data.error?.message || 'Auto-onboard not available',
            retryable: parsed.data.error?.retryable ?? false,
          }
        );
      }

      return parsed.data.data;
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) throw error;
      throw parseErrorResponse(error, 'ONBOARD_NOT_AVAILABLE');
    }
  },

  /**
   * Enable auto-onboard.
   * Requires DEV mode to be configured on the Pi.
   *
   * @returns Promise with enable result
   * @throws V1ApiError on failure (ONBOARD_ENABLE_FAILED if mode is not "dev")
   */
  enable: async (): Promise<EnableDisableData> => {
    try {
      const response = await apiClient.post<unknown>(
        `${V1_AUTO_ONBOARD_BASE}/enable`,
        undefined,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      const parsed = EnableDisableResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[Auto-Onboard] enable validation failed:', parsed.error.issues);
        throw new V1ApiError('ONBOARD_INTERNAL_ERROR', 'Invalid response format', true);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw V1ApiError.fromV1Error(
          {
            code: parsed.data.error?.code || 'ONBOARD_ENABLE_FAILED',
            message: parsed.data.error?.message || 'Failed to enable auto-onboard',
            retryable: parsed.data.error?.retryable ?? false,
          }
        );
      }

      return parsed.data.data;
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) throw error;
      throw parseErrorResponse(error, 'ONBOARD_ENABLE_FAILED');
    }
  },

  /**
   * Disable auto-onboard (kill switch).
   * Immediately stops all auto-onboarding.
   *
   * @returns Promise with disable result
   * @throws V1ApiError on failure
   */
  disable: async (): Promise<EnableDisableData> => {
    try {
      const response = await apiClient.post<unknown>(
        `${V1_AUTO_ONBOARD_BASE}/disable`,
        undefined,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      const parsed = EnableDisableResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[Auto-Onboard] disable validation failed:', parsed.error.issues);
        throw new V1ApiError('ONBOARD_INTERNAL_ERROR', 'Invalid response format', true);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw V1ApiError.fromV1Error(
          {
            code: parsed.data.error?.code || 'ONBOARD_DISABLE_FAILED',
            message: parsed.data.error?.message || 'Failed to disable auto-onboard',
            retryable: parsed.data.error?.retryable ?? false,
          }
        );
      }

      return parsed.data.data;
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) throw error;
      throw parseErrorResponse(error, 'ONBOARD_DISABLE_FAILED');
    }
  },

  /**
   * Get paginated audit events with optional filters.
   *
   * @param filters - Optional filters (mac, stage, since, limit, offset)
   * @returns Promise with events and pagination info
   * @throws V1ApiError on failure
   */
  getEvents: async (filters?: AuditEventFilters): Promise<AuditEventsData> => {
    try {
      const params = new URLSearchParams();
      if (filters?.mac) params.append('mac', filters.mac);
      if (filters?.stage) params.append('stage', filters.stage);
      if (filters?.since) params.append('since', filters.since);
      if (filters?.limit !== undefined) params.append('limit', String(filters.limit));
      if (filters?.offset !== undefined) params.append('offset', String(filters.offset));

      const queryString = params.toString();
      const url = queryString
        ? `${V1_AUTO_ONBOARD_BASE}/events?${queryString}`
        : `${V1_AUTO_ONBOARD_BASE}/events`;

      const response = await apiClient.get<unknown>(url, { timeout: DEFAULT_TIMEOUT_MS });

      const parsed = AuditEventsResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[Auto-Onboard] getEvents validation failed:', parsed.error.issues);
        throw new V1ApiError('ONBOARD_INTERNAL_ERROR', 'Invalid response format', true);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw V1ApiError.fromV1Error(
          {
            code: parsed.data.error?.code || 'ONBOARD_INTERNAL_ERROR',
            message: parsed.data.error?.message || 'Failed to get events',
            retryable: parsed.data.error?.retryable ?? false,
          }
        );
      }

      return parsed.data.data;
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) throw error;
      throw parseErrorResponse(error, 'ONBOARD_INTERNAL_ERROR');
    }
  },

  /**
   * Get events for a specific device by MAC address.
   *
   * @param mac - Device MAC address
   * @param limit - Max results
   * @param offset - Pagination offset
   * @returns Promise with events for the device
   * @throws V1ApiError on failure
   */
  getEventsByMac: async (
    mac: string,
    limit?: number,
    offset?: number
  ): Promise<AuditEventsData> => {
    try {
      const params = new URLSearchParams();
      if (limit !== undefined) params.append('limit', String(limit));
      if (offset !== undefined) params.append('offset', String(offset));

      const queryString = params.toString();
      const encodedMac = encodeURIComponent(mac);
      const url = queryString
        ? `${V1_AUTO_ONBOARD_BASE}/events/${encodedMac}?${queryString}`
        : `${V1_AUTO_ONBOARD_BASE}/events/${encodedMac}`;

      const response = await apiClient.get<unknown>(url, { timeout: DEFAULT_TIMEOUT_MS });

      const parsed = AuditEventsResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[Auto-Onboard] getEventsByMac validation failed:', parsed.error.issues);
        throw new V1ApiError('ONBOARD_INTERNAL_ERROR', 'Invalid response format', true);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw V1ApiError.fromV1Error(
          {
            code: parsed.data.error?.code || 'ONBOARD_INTERNAL_ERROR',
            message: parsed.data.error?.message || 'Failed to get events',
            retryable: parsed.data.error?.retryable ?? false,
          }
        );
      }

      return parsed.data.data;
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) throw error;
      throw parseErrorResponse(error, 'ONBOARD_INTERNAL_ERROR');
    }
  },

  /**
   * Reset all metrics counters to zero.
   *
   * @returns Promise with reset confirmation
   * @throws V1ApiError on failure
   */
  resetMetrics: async (): Promise<ResetMetricsData> => {
    try {
      const response = await apiClient.post<unknown>(
        `${V1_AUTO_ONBOARD_BASE}/metrics/reset`,
        undefined,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      const parsed = ResetMetricsResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[Auto-Onboard] resetMetrics validation failed:', parsed.error.issues);
        throw new V1ApiError('ONBOARD_INTERNAL_ERROR', 'Invalid response format', true);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw V1ApiError.fromV1Error(
          {
            code: parsed.data.error?.code || 'ONBOARD_INTERNAL_ERROR',
            message: parsed.data.error?.message || 'Failed to reset metrics',
            retryable: parsed.data.error?.retryable ?? false,
          }
        );
      }

      return parsed.data.data;
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) throw error;
      throw parseErrorResponse(error, 'ONBOARD_INTERNAL_ERROR');
    }
  },

  /**
   * Cleanup old audit events.
   *
   * @param options - Cleanup options (days retention period)
   * @returns Promise with cleanup result including deleted count
   * @throws V1ApiError on failure
   */
  cleanupEvents: async (options?: CleanupOptions): Promise<CleanupEventsData> => {
    try {
      const days = options?.days ?? 90;
      const response = await apiClient.post<unknown>(
        `${V1_AUTO_ONBOARD_BASE}/events/cleanup?days=${days}`,
        undefined,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      const parsed = CleanupEventsResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[Auto-Onboard] cleanupEvents validation failed:', parsed.error.issues);
        throw new V1ApiError('ONBOARD_INTERNAL_ERROR', 'Invalid response format', true);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw V1ApiError.fromV1Error(
          {
            code: parsed.data.error?.code || 'ONBOARD_INTERNAL_ERROR',
            message: parsed.data.error?.message || 'Failed to cleanup events',
            retryable: parsed.data.error?.retryable ?? false,
          }
        );
      }

      return parsed.data.data;
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) throw error;
      throw parseErrorResponse(error, 'ONBOARD_INTERNAL_ERROR');
    }
  },
};

// ============================================================================
// Type Exports
// ============================================================================

export type {
  AutoOnboardStatus,
  AutoOnboardConfig,
  AutoOnboardMetrics,
  AutoOnboardMode,
  OnboardingAuditEntry,
  AuditEventStage,
  AuditEventOutcome,
  AuditEventsData,
  AuditEventFilters,
  CleanupOptions,
  EnableDisableData,
  ResetMetricsData,
  CleanupEventsData,
  Pagination,
} from './v1-auto-onboard-schemas';
