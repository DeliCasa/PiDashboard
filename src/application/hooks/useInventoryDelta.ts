/**
 * Inventory Delta Hooks
 * Feature: 047-inventory-delta-viewer
 *
 * React Query hooks for inventory analysis endpoints.
 * Container-scoped with visibility-aware polling.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { inventoryDeltaApi } from '@/infrastructure/api/inventory-delta';
import { queryKeys } from '@/lib/queryClient';
import { isFeatureUnavailable } from '@/infrastructure/api/client';
import { getUserMessage } from '@/infrastructure/api/errors';
import { V1ApiError } from '@/infrastructure/api/errors';
import type { SubmitReviewRequest, RunListFilters, InventoryAnalysisRun } from '@/domain/types/inventory';
import type { AnalysisStatus } from '@/infrastructure/api/inventory-delta-schemas';

// ============================================================================
// Constants
// ============================================================================

/** Polling interval for pending analysis (15 seconds) */
const PENDING_POLL_INTERVAL = 15_000;

/** Polling interval for run list (30 seconds) */
const RUN_LIST_POLL_INTERVAL = 30_000;

/** Terminal statuses that should stop polling */
const TERMINAL_STATUSES: AnalysisStatus[] = ['completed', 'approved', 'failed'];

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for fetching the latest inventory analysis for a container.
 *
 * Polls every 15 seconds while status is 'pending' or 'needs_review'.
 * Stops polling for terminal statuses (completed, approved, failed)
 * and when the feature is unavailable (404/503).
 *
 * @param containerId - Container ID to scope the query (null disables)
 * @param enabled - Whether to enable the query
 */
export function useLatestInventory(containerId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventoryLatest(containerId ?? ''),
    queryFn: () => inventoryDeltaApi.getLatest(containerId!),
    enabled: enabled && containerId !== null,
    refetchInterval: (query) => {
      // Stop polling on error or feature unavailable
      if (query.state.error && isFeatureUnavailable(query.state.error)) {
        return false;
      }
      // Stop polling for terminal statuses
      const status = query.state.data?.status;
      if (status && TERMINAL_STATUSES.includes(status)) {
        return false;
      }
      return PENDING_POLL_INTERVAL;
    },
    retry: (failureCount, error) => {
      if (isFeatureUnavailable(error)) return false;
      return failureCount < 2;
    },
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching the inventory delta for a specific session.
 *
 * @param sessionId - Session ID (null disables)
 * @param enabled - Whether to enable the query
 */
export function useSessionDelta(sessionId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventoryBySession(sessionId ?? ''),
    queryFn: () => inventoryDeltaApi.getBySession(sessionId!),
    enabled: enabled && sessionId !== null,
    staleTime: 10_000,
  });
}

/**
 * Hook for submitting a human review for an analysis run.
 *
 * Invalidates inventory queries on success and shows toast feedback.
 *
 * @param runId - Analysis run ID to review
 */
export function useSubmitReview(runId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitReviewRequest) =>
      inventoryDeltaApi.submitReview(runId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
      toast.success('Review submitted successfully');
    },
    onError: (error: Error) => {
      if (V1ApiError.isV1ApiError(error)) {
        toast.error(getUserMessage(error.code));
      } else {
        toast.error('Failed to submit review. Please try again.');
      }
    },
  });
}

/**
 * Hook for fetching paginated inventory analysis runs for a container.
 *
 * Polls every 30 seconds while any visible run has a non-terminal status.
 * Stops polling when all runs have terminal statuses or the feature is unavailable.
 *
 * @param containerId - Container ID to scope the query (null disables)
 * @param filters - Optional pagination and status filters
 * @param enabled - Whether to enable the query
 */
export function useInventoryRuns(
  containerId: string | null,
  filters?: RunListFilters,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.inventoryRuns(containerId ?? '', filters),
    queryFn: () => inventoryDeltaApi.getRuns(containerId!, filters),
    enabled: enabled && containerId !== null,
    refetchInterval: (query) => {
      if (query.state.error && isFeatureUnavailable(query.state.error)) {
        return false;
      }
      // Stop polling if all runs have terminal statuses
      const runs = query.state.data?.runs;
      if (runs && runs.length > 0) {
        const allTerminal = runs.every((r) => TERMINAL_STATUSES.includes(r.status));
        if (allTerminal) return false;
      }
      return RUN_LIST_POLL_INTERVAL;
    },
    retry: (failureCount, error) => {
      if (isFeatureUnavailable(error)) return false;
      return failureCount < 2;
    },
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for imperative session ID lookup.
 *
 * Returns a lookup function that trims the input, validates non-empty,
 * fetches the run by session ID, and returns the result.
 *
 * @returns { lookup, data, isLoading, isError, error, reset }
 */
export function useSessionLookup() {
  const [data, setData] = useState<InventoryAnalysisRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const lookup = useCallback(async (rawSessionId: string): Promise<InventoryAnalysisRun | null> => {
    const sessionId = rawSessionId.trim();
    if (!sessionId) {
      setIsError(true);
      setError(new Error('Please enter a session ID'));
      setData(null);
      return null;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);
    setData(null);

    try {
      const result = await inventoryDeltaApi.getBySession(sessionId);
      if (result === null) {
        setIsError(true);
        setError(new Error('No inventory analysis found for this session'));
        setData(null);
        return null;
      }
      setData(result);
      return result;
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Lookup failed'));
      setData(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setIsLoading(false);
    setIsError(false);
    setError(null);
  }, []);

  return { lookup, data, isLoading, isError, error, reset };
}
