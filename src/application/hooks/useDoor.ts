/**
 * Door Hooks
 * React Query hooks for door control
 *
 * Door API may not be available on all PiOrchestrator builds.
 * Graceful degradation: stops polling/retries on 404/503.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doorApi } from '@/infrastructure/api/door';
import { queryKeys } from '@/lib/queryClient';
import { useTestingModeStore } from '@/application/stores/testingMode';
import { isFeatureUnavailable } from '@/infrastructure/api/client';

/**
 * Hook for fetching door status with polling
 * Stops polling and retries on 404/503 (endpoint not available)
 */
export function useDoorStatus(enabled = true, pollingInterval = 2000) {
  return useQuery({
    queryKey: queryKeys.doorStatus(),
    queryFn: doorApi.getStatus,
    enabled,
    refetchInterval: (query) => {
      if (query.state.error && isFeatureUnavailable(query.state.error)) {
        return false;
      }
      return pollingInterval;
    },
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error) => {
      if (isFeatureUnavailable(error)) return false;
      return failureCount < 1;
    },
    retryDelay: 1000,
  });
}

/**
 * Hook for opening door
 */
export function useOpenDoor() {
  const queryClient = useQueryClient();
  const { active, incrementOperations } = useTestingModeStore();

  return useMutation({
    mutationFn: (duration?: number) => doorApi.open(duration, active),
    onSuccess: () => {
      if (active) {
        incrementOperations();
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.doorStatus() });
      queryClient.invalidateQueries({ queryKey: queryKeys.doorHistory() });
    },
  });
}

/**
 * Hook for closing door
 */
export function useCloseDoor() {
  const queryClient = useQueryClient();
  const { active, incrementOperations } = useTestingModeStore();

  return useMutation({
    mutationFn: () => doorApi.close(),
    onSuccess: () => {
      if (active) {
        incrementOperations();
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.doorStatus() });
      queryClient.invalidateQueries({ queryKey: queryKeys.doorHistory() });
    },
  });
}

/**
 * Hook for fetching door operation history
 * Stops retries on 404/503 (endpoint not available)
 */
export function useDoorHistory(limit = 20, enabled = true) {
  return useQuery({
    queryKey: queryKeys.doorHistory(),
    queryFn: () => doorApi.getHistory(limit),
    enabled,
    staleTime: 10000,
    retry: (failureCount, error) => {
      if (isFeatureUnavailable(error)) return false;
      return failureCount < 1;
    },
  });
}
