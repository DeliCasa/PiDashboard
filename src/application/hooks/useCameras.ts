/**
 * Camera Hooks
 * React Query hooks for camera management
 *
 * Feature: 034-esp-camera-integration
 * - Updated to use V1 Cameras API
 * - Added visibility-aware polling (pauses when tab hidden)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v1CamerasApi } from '@/infrastructure/api/v1-cameras';
import { queryKeys } from '@/lib/queryClient';
import { useVisibilityAwareInterval } from './useDocumentVisibility';

/** Default polling interval for camera list (10 seconds per spec) */
const CAMERA_POLLING_INTERVAL = 10_000;

/**
 * Hook for fetching camera list with visibility-aware polling.
 *
 * Polling automatically pauses when the browser tab is hidden
 * to reduce unnecessary network requests.
 *
 * @param enabled - Whether to enable the query
 * @param pollingInterval - Polling interval in ms (default: 10000)
 */
export function useCameras(enabled = true, pollingInterval = CAMERA_POLLING_INTERVAL) {
  // Pause polling when tab is hidden (T012)
  const refetchInterval = useVisibilityAwareInterval({
    interval: pollingInterval,
    enabled,
  });

  return useQuery({
    queryKey: queryKeys.cameraList(),
    queryFn: v1CamerasApi.list,
    enabled,
    refetchInterval,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching camera diagnostics.
 *
 * Returns extended diagnostic information including
 * connection quality and error counts.
 */
export function useCameraDiagnostics(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cameraDiagnostics(),
    queryFn: v1CamerasApi.getDiagnostics,
    enabled,
    staleTime: 30000,
  });
}

/**
 * Hook for triggering image capture.
 *
 * Returns base64-encoded JPEG image data on success.
 * Note: Capture may take up to 30 seconds.
 */
export function useCaptureTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cameraId: string) => v1CamerasApi.capture(cameraId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cameraList() });
    },
  });
}

/**
 * Hook for rebooting a camera.
 *
 * Sends reboot command to the specified camera.
 * Camera will temporarily go offline during reboot.
 */
export function useRebootCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cameraId: string) => v1CamerasApi.reboot(cameraId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cameraList() });
    },
  });
}
