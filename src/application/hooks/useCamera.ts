/**
 * Single Camera Hook
 * React Query hook for fetching individual camera details
 *
 * Feature: 034-esp-camera-integration (T032)
 */

import { useQuery } from '@tanstack/react-query';
import { v1CamerasApi } from '@/infrastructure/api/v1-cameras';
import { queryKeys } from '@/lib/queryClient';

/** Default stale time for camera details (30 seconds) */
const CAMERA_STALE_TIME = 30_000;

/**
 * Hook for fetching a single camera by ID.
 *
 * @param cameraId - Camera ID (MAC address or UUID)
 * @param enabled - Whether to enable the query
 */
export function useCamera(cameraId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cameraById(cameraId ?? ''),
    queryFn: () => v1CamerasApi.getById(cameraId!),
    enabled: enabled && !!cameraId,
    staleTime: CAMERA_STALE_TIME,
    retry: (failureCount, error) => {
      // Don't retry on 404 (camera not found)
      if (error && 'code' in error && error.code === 'CAMERA_NOT_FOUND') {
        return false;
      }
      return failureCount < 2;
    },
  });
}
