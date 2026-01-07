/**
 * Camera Hooks
 * React Query hooks for camera management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { camerasApi } from '@/infrastructure/api/cameras';
import { queryKeys } from '@/lib/queryClient';

/**
 * Hook for fetching camera list with polling
 */
export function useCameras(enabled = true, pollingInterval = 10000) {
  return useQuery({
    queryKey: queryKeys.cameraList(),
    queryFn: camerasApi.list,
    enabled,
    refetchInterval: pollingInterval,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching camera diagnostics
 */
export function useCameraDiagnostics(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cameraDiagnostics(),
    queryFn: camerasApi.getDiagnostics,
    enabled,
    staleTime: 30000,
  });
}

/**
 * Hook for triggering test capture
 */
export function useCaptureTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cameraId: string) => camerasApi.capture(cameraId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cameraList() });
    },
  });
}

/**
 * Hook for rebooting a camera
 */
export function useRebootCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cameraId: string) => camerasApi.reboot(cameraId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cameraList() });
    },
  });
}
