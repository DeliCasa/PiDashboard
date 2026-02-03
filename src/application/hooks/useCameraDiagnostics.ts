/**
 * Camera Diagnostics Hooks
 * Feature: 042-diagnostics-integration (T015)
 *
 * React Query hooks for camera diagnostics data.
 */

import { useQuery } from '@tanstack/react-query';
import { getCameraDiagnostics, listCameraDiagnostics } from '@/infrastructure/api/camera-diagnostics';
import type { CameraDiagnostics } from '@/domain/types/camera-diagnostics';

/**
 * Query key factory for camera diagnostics
 */
export const cameraDiagnosticsKeys = {
  all: ['camera-diagnostics'] as const,
  lists: () => [...cameraDiagnosticsKeys.all, 'list'] as const,
  list: () => [...cameraDiagnosticsKeys.lists()] as const,
  details: () => [...cameraDiagnosticsKeys.all, 'detail'] as const,
  detail: (cameraId: string) => [...cameraDiagnosticsKeys.details(), cameraId] as const,
};

/**
 * Hook to fetch diagnostics for a specific camera
 *
 * @param cameraId - Camera ID in format espcam-XXXXXX
 * @param enabled - Whether to enable the query
 * @param refetchInterval - Polling interval in ms (0 to disable)
 */
export function useCameraDiagnostics(
  cameraId: string,
  enabled: boolean = true,
  refetchInterval: number = 0
) {
  return useQuery<CameraDiagnostics, Error>({
    queryKey: cameraDiagnosticsKeys.detail(cameraId),
    queryFn: () => getCameraDiagnostics(cameraId),
    enabled: enabled && !!cameraId,
    refetchInterval: refetchInterval > 0 ? refetchInterval : undefined,
    staleTime: 30_000, // 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on 404 (camera not found) or validation errors
      if (error.message?.includes('not found') || error.message?.includes('Invalid')) {
        return false;
      }
      // Retry once on other errors
      return failureCount < 1;
    },
  });
}

/**
 * Hook to fetch diagnostics for all cameras
 *
 * @param enabled - Whether to enable the query
 * @param refetchInterval - Polling interval in ms (0 to disable)
 */
export function useCameraDiagnosticsList(
  enabled: boolean = true,
  refetchInterval: number = 0
) {
  return useQuery<CameraDiagnostics[], Error>({
    queryKey: cameraDiagnosticsKeys.list(),
    queryFn: listCameraDiagnostics,
    enabled,
    refetchInterval: refetchInterval > 0 ? refetchInterval : undefined,
    staleTime: 30_000, // 30 seconds
    retry: 1,
  });
}
