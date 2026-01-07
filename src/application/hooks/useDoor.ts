/**
 * Door Hooks
 * React Query hooks for door control
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doorApi } from '@/infrastructure/api/door';
import { queryKeys } from '@/lib/queryClient';
import { useTestingModeStore } from '@/application/stores/testingMode';

/**
 * Hook for fetching door status with polling
 */
export function useDoorStatus(enabled = true, pollingInterval = 2000) {
  return useQuery({
    queryKey: queryKeys.doorStatus(),
    queryFn: doorApi.getStatus,
    enabled,
    refetchInterval: pollingInterval,
    placeholderData: (previousData) => previousData,
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
 */
export function useDoorHistory(limit = 20, enabled = true) {
  return useQuery({
    queryKey: queryKeys.doorHistory(),
    queryFn: () => doorApi.getHistory(limit),
    enabled,
    staleTime: 10000,
  });
}
