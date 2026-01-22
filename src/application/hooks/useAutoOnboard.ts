/**
 * Auto-Onboard Hooks
 * React Query hooks for auto-onboard management
 *
 * Feature: 035-auto-onboard-dashboard
 * - Status polling with visibility-aware intervals
 * - Optimistic updates for toggle operations
 * - Paginated events with filtering
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { autoOnboardApi } from '@/infrastructure/api/v1-auto-onboard';
import type {
  AutoOnboardStatus,
  AuditEventFilters,
  CleanupOptions,
} from '@/infrastructure/api/v1-auto-onboard';
import { queryKeys } from '@/lib/queryClient';
import { useVisibilityAwareInterval } from './useDocumentVisibility';

// ============================================================================
// Constants
// ============================================================================

/** Polling interval for auto-onboard status (15 seconds per spec) */
const AUTO_ONBOARD_POLLING_INTERVAL = 15_000;

// ============================================================================
// Status Hook
// ============================================================================

/**
 * Hook for fetching auto-onboard status with visibility-aware polling.
 *
 * Polling automatically pauses when the browser tab is hidden.
 *
 * @param enabled - Whether to enable the query (default: true)
 * @param pollingInterval - Polling interval in ms (default: 15000)
 */
export function useAutoOnboardStatus(
  enabled = true,
  pollingInterval = AUTO_ONBOARD_POLLING_INTERVAL
) {
  // Pause polling when tab is hidden (FR-006)
  const refetchInterval = useVisibilityAwareInterval({
    interval: pollingInterval,
    enabled,
  });

  return useQuery({
    queryKey: queryKeys.autoOnboardStatus(),
    queryFn: autoOnboardApi.getStatus,
    enabled,
    refetchInterval,
    placeholderData: (previousData) => previousData,
    // Don't show error immediately - auto-onboard might not be available
    retry: 1,
  });
}

// ============================================================================
// Toggle Mutation Hook
// ============================================================================

/**
 * Hook for enabling/disabling auto-onboard.
 *
 * Uses optimistic updates with rollback on error.
 */
export function useAutoOnboardToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: 'enable' | 'disable') =>
      action === 'enable' ? autoOnboardApi.enable() : autoOnboardApi.disable(),

    // Optimistic update (FR-011)
    onMutate: async (action) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.autoOnboardStatus() });

      // Snapshot current value for rollback
      const previousStatus = queryClient.getQueryData<AutoOnboardStatus>(
        queryKeys.autoOnboardStatus()
      );

      // Optimistically update
      if (previousStatus) {
        queryClient.setQueryData<AutoOnboardStatus>(queryKeys.autoOnboardStatus(), {
          ...previousStatus,
          enabled: action === 'enable',
          running: action === 'enable',
        });
      }

      return { previousStatus };
    },

    // Rollback on error
    onError: (_error, _action, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(queryKeys.autoOnboardStatus(), context.previousStatus);
      }
    },

    // Refetch on success to get accurate state
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.autoOnboardStatus() });
    },
  });
}

// ============================================================================
// Events Hook
// ============================================================================

/**
 * Hook for fetching paginated audit events with optional filters.
 *
 * @param filters - Filter options (mac, stage, since, limit, offset)
 * @param enabled - Whether to enable the query
 */
export function useAutoOnboardEvents(filters?: AuditEventFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.autoOnboardEvents(filters),
    queryFn: () => autoOnboardApi.getEvents(filters),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching events for a specific device.
 *
 * @param mac - Device MAC address
 * @param limit - Max results
 * @param offset - Pagination offset
 * @param enabled - Whether to enable the query
 */
export function useAutoOnboardEventsByMac(
  mac: string,
  limit?: number,
  offset?: number,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.autoOnboardEvents({ mac, limit, offset }),
    queryFn: () => autoOnboardApi.getEventsByMac(mac, limit, offset),
    enabled: enabled && !!mac,
    placeholderData: (previousData) => previousData,
  });
}

// ============================================================================
// Metrics Reset Mutation
// ============================================================================

/**
 * Hook for resetting metrics counters.
 */
export function useResetMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: autoOnboardApi.resetMetrics,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.autoOnboardStatus() });
    },
  });
}

// ============================================================================
// Cleanup Events Mutation
// ============================================================================

/**
 * Hook for cleaning up old audit events.
 */
export function useCleanupEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: CleanupOptions) => autoOnboardApi.cleanupEvents(options),
    onSuccess: () => {
      // Invalidate both status (for metrics) and events
      queryClient.invalidateQueries({ queryKey: queryKeys.autoOnboard });
    },
  });
}
