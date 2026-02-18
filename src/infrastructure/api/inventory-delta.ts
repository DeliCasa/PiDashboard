/**
 * Inventory Delta API Client
 * Feature: 047-inventory-delta-viewer
 *
 * API client for inventory analysis endpoints proxied through PiOrchestrator.
 * Uses Zod validation for response parsing with resilient fallbacks.
 */

import { apiClient } from './client';
import { V1ApiError } from './errors';
import {
  InventoryLatestResponseSchema,
  ReviewResponseSchema,
  RunListResponseSchema,
  InventoryAnalysisRunSchema,
  type InventoryAnalysisRun,
  type ReviewResponse,
  type SubmitReviewRequest,
  type RunListFilters,
  type RunListData,
} from './inventory-delta-schemas';

// ============================================================================
// Constants
// ============================================================================

/** Default timeout for inventory operations (10 seconds) */
const DEFAULT_TIMEOUT_MS = 10_000;

// ============================================================================
// Request ID Tracking (055-session-review-drilldown)
// ============================================================================

/** Last request_id from a successful inventory API response envelope */
let _lastRequestId: string | undefined;

/**
 * Get the request_id from the most recent successful inventory API call.
 * Used by RunDebugInfo for correlation ID display.
 */
export function getLastRequestId(): string | undefined {
  return _lastRequestId;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parses an error response from the inventory API.
 * Handles both plain ApiError and V1 envelope format.
 * Falls back to generic error if parsing fails.
 */
function parseErrorResponse(error: unknown): V1ApiError {
  if (error instanceof Error && 'status' in error) {
    const apiError = error as Error & {
      status: number;
      code?: string;
      details?: Record<string, unknown>;
    };

    // Try to extract V1 error envelope from the message or details
    // The base apiClient sets message from `errorBody.error` which for V1 envelopes
    // is the nested error object serialized as [object Object].
    // Check if apiError.code exists (from top-level errorBody.code).
    let errorCode = apiError.code || 'NETWORK_ERROR';
    let errorMessage = apiError.message;
    let retryable = apiError.status >= 500;

    // V1 envelope puts error info under `details` or the message may be an object representation
    // The cleanest path: if status maps to known inventory errors, use those codes
    if (apiError.status === 404) {
      errorCode = 'INVENTORY_NOT_FOUND';
      errorMessage = 'No inventory analysis found.';
      retryable = false;
    } else if (apiError.status === 409) {
      errorCode = 'REVIEW_CONFLICT';
      errorMessage = 'This analysis has already been reviewed.';
      retryable = false;
    } else if (apiError.status === 400) {
      errorCode = 'REVIEW_INVALID';
      errorMessage = 'Review data is invalid.';
      retryable = false;
    }

    const v1Error = new V1ApiError(errorCode, errorMessage, retryable, undefined);
    // Preserve HTTP status for isFeatureUnavailable()
    (v1Error as V1ApiError & { httpStatus: number }).httpStatus = apiError.status;
    return v1Error;
  }

  return new V1ApiError(
    'NETWORK_ERROR',
    error instanceof Error ? error.message : 'Unknown error',
    true
  );
}

// ============================================================================
// API Client
// ============================================================================

/**
 * Inventory Delta API client.
 *
 * Provides typed methods for inventory analysis endpoints with Zod validation.
 */
export const inventoryDeltaApi = {
  /**
   * Get the latest inventory analysis for a container.
   *
   * @param containerId - Container ID (opaque string)
   * @returns The latest analysis run, or null if none found (404)
   * @throws V1ApiError on failure
   */
  getLatest: async (containerId: string): Promise<InventoryAnalysisRun | null> => {
    try {
      const response = await apiClient.get<unknown>(
        `/v1/containers/${encodeURIComponent(containerId)}/inventory/latest`,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      // Validate response envelope
      const parsed = InventoryLatestResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[Inventory] getLatest response validation failed:', parsed.error.issues);
        // Try to extract data for resilience
        const resp = response as { data?: InventoryAnalysisRun; success?: boolean };
        if (resp.data) {
          const directParsed = InventoryAnalysisRunSchema.safeParse(resp.data);
          if (directParsed.success) return directParsed.data;
        }
        throw new V1ApiError('INTERNAL_ERROR', 'Invalid response format', false);
      }

      if (!parsed.data.success) {
        const errCode = parsed.data.error?.code || 'INTERNAL_ERROR';
        if (errCode === 'INVENTORY_NOT_FOUND') {
          return null;
        }
        throw new V1ApiError(
          errCode,
          parsed.data.error?.message || 'Failed to get inventory',
          parsed.data.error?.retryable ?? false,
          parsed.data.error?.retry_after_seconds
        );
      }

      _lastRequestId = parsed.data.request_id;
      return parsed.data.data ?? null;
    } catch (error) {
      if (error instanceof V1ApiError) {
        if (error.code === 'INVENTORY_NOT_FOUND') return null;
        throw error;
      }
      const parsed = parseErrorResponse(error);
      if (parsed.code === 'INVENTORY_NOT_FOUND') return null;
      throw parsed;
    }
  },

  /**
   * Get the inventory delta for a specific session.
   *
   * @param sessionId - Session ID
   * @returns The analysis run for the session, or null if not found
   * @throws V1ApiError on failure
   */
  getBySession: async (sessionId: string): Promise<InventoryAnalysisRun | null> => {
    try {
      const response = await apiClient.get<unknown>(
        `/v1/sessions/${encodeURIComponent(sessionId)}/inventory-delta`,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      const parsed = InventoryLatestResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[Inventory] getBySession response validation failed:', parsed.error.issues);
        const resp = response as { data?: InventoryAnalysisRun; success?: boolean };
        if (resp.data) {
          const directParsed = InventoryAnalysisRunSchema.safeParse(resp.data);
          if (directParsed.success) return directParsed.data;
        }
        throw new V1ApiError('INTERNAL_ERROR', 'Invalid response format', false);
      }

      if (!parsed.data.success) {
        const errCode = parsed.data.error?.code || 'INTERNAL_ERROR';
        if (errCode === 'INVENTORY_NOT_FOUND') {
          return null;
        }
        throw new V1ApiError(
          errCode,
          parsed.data.error?.message || 'Failed to get session inventory',
          parsed.data.error?.retryable ?? false
        );
      }

      _lastRequestId = parsed.data.request_id;
      return parsed.data.data ?? null;
    } catch (error) {
      if (error instanceof V1ApiError) {
        if (error.code === 'INVENTORY_NOT_FOUND') return null;
        throw error;
      }
      const parsedErr = parseErrorResponse(error);
      if (parsedErr.code === 'INVENTORY_NOT_FOUND') return null;
      throw parsedErr;
    }
  },

  /**
   * List inventory analysis runs for a container with pagination.
   *
   * @param containerId - Container ID (opaque string)
   * @param filters - Optional pagination and status filters
   * @returns Paginated run list, or null if container not found (404)
   * @throws V1ApiError on failure
   */
  getRuns: async (containerId: string, filters?: RunListFilters): Promise<RunListData | null> => {
    try {
      const params = new URLSearchParams();
      if (filters?.limit != null) params.set('limit', String(filters.limit));
      if (filters?.offset != null) params.set('offset', String(filters.offset));
      if (filters?.status) params.set('status', filters.status);

      const queryString = params.toString();
      const url = `/v1/containers/${encodeURIComponent(containerId)}/inventory/runs${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<unknown>(url, { timeout: DEFAULT_TIMEOUT_MS });

      const parsed = RunListResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[Inventory] getRuns response validation failed:', parsed.error.issues);
        throw new V1ApiError('INTERNAL_ERROR', 'Invalid response format', false);
      }

      if (!parsed.data.success) {
        const errCode = parsed.data.error?.code || 'INTERNAL_ERROR';
        if (errCode === 'CONTAINER_NOT_FOUND') {
          return null;
        }
        throw new V1ApiError(
          errCode,
          parsed.data.error?.message || 'Failed to list inventory runs',
          parsed.data.error?.retryable ?? false,
          parsed.data.error?.retry_after_seconds
        );
      }

      return parsed.data.data ?? null;
    } catch (error) {
      if (error instanceof V1ApiError) {
        if (error.code === 'CONTAINER_NOT_FOUND' || error.code === 'INVENTORY_NOT_FOUND') return null;
        throw error;
      }
      const parsed = parseErrorResponse(error);
      // parseErrorResponse maps all 404s to INVENTORY_NOT_FOUND;
      // for getRuns, 404 means container not found — treat both as null
      if (parsed.code === 'INVENTORY_NOT_FOUND' || parsed.code === 'CONTAINER_NOT_FOUND') return null;
      throw parsed;
    }
  },

  /**
   * Submit a human review for an analysis run.
   *
   * @param runId - Analysis run ID
   * @param data - Review submission (action + optional corrections)
   * @returns The review response with updated status
   * @throws V1ApiError on failure (REVIEW_CONFLICT for 409, REVIEW_INVALID for 400)
   */
  /**
   * Request a re-run of an analysis that errored.
   * Uses feature detection: returns { supported: false } on 404/501.
   *
   * @param runId - Analysis run ID to re-run
   * @returns { supported, newRunId? } — supported is false if endpoint doesn't exist
   */
  rerunAnalysis: async (
    runId: string
  ): Promise<{ supported: boolean; newRunId?: string }> => {
    try {
      const response = await apiClient.post<unknown>(
        `/v1/inventory/${encodeURIComponent(runId)}/rerun`,
        {},
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      const resp = response as {
        success?: boolean;
        data?: { new_run_id?: string; status?: string };
      };

      return {
        supported: true,
        newRunId: resp.data?.new_run_id,
      };
    } catch (error) {
      // Feature detection: 404/501 means endpoint not implemented
      if (error instanceof Error && 'status' in error) {
        const status = (error as Error & { status: number }).status;
        if (status === 404 || status === 501) {
          return { supported: false };
        }
        if (status === 409) {
          throw new V1ApiError(
            'RERUN_IN_PROGRESS',
            'A re-run is already in progress for this analysis.',
            false
          );
        }
      }
      if (error instanceof V1ApiError) throw error;
      throw parseErrorResponse(error);
    }
  },

  submitReview: async (
    runId: string,
    data: SubmitReviewRequest
  ): Promise<ReviewResponse> => {
    try {
      const response = await apiClient.post<unknown>(
        `/v1/inventory/${encodeURIComponent(runId)}/review`,
        data,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      const parsed = ReviewResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[Inventory] submitReview response validation failed:', parsed.error.issues);
        throw new V1ApiError('INTERNAL_ERROR', 'Invalid response format', false);
      }

      if (!parsed.data.success) {
        throw new V1ApiError(
          parsed.data.error?.code || 'INTERNAL_ERROR',
          parsed.data.error?.message || 'Failed to submit review',
          parsed.data.error?.retryable ?? false
        );
      }

      return parsed.data;
    } catch (error) {
      if (error instanceof V1ApiError) throw error;
      throw parseErrorResponse(error);
    }
  },
};
