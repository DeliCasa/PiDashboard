/**
 * Container Hooks
 * React Query hooks for container management
 *
 * Feature: 043-container-management
 * - CRUD operations for containers
 * - Camera assignment/unassignment
 * - Derived hook for unassigned cameras
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v1ContainersApi } from '@/infrastructure/api/v1-containers';
import { v1CamerasApi } from '@/infrastructure/api/v1-cameras';
import { queryKeys } from '@/lib/queryClient';
import { isFeatureUnavailable } from '@/infrastructure/api/client';
import type {
  ContainerDetail,
  CreateContainerRequest,
  UpdateContainerRequest,
  AssignCameraRequest,
} from '@/infrastructure/api/v1-containers';
import type { Camera } from '@/infrastructure/api/v1-cameras';

/** Default polling interval for container list (30 seconds) */
const CONTAINER_POLLING_INTERVAL = 30_000;

/**
 * Hook for fetching all containers with camera assignments.
 *
 * @param enabled - Whether to enable the query
 * @param pollingInterval - Polling interval in ms (default: 30000)
 */
export function useContainers(enabled = true, pollingInterval = CONTAINER_POLLING_INTERVAL) {
  return useQuery({
    queryKey: queryKeys.containerList(),
    queryFn: v1ContainersApi.list,
    enabled,
    refetchInterval: (query) => {
      if (query.state.error && isFeatureUnavailable(query.state.error)) {
        return false;
      }
      return pollingInterval;
    },
    retry: (failureCount, error) => {
      if (isFeatureUnavailable(error)) return false;
      return failureCount < 2;
    },
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching a single container by ID.
 *
 * @param id - Container ID (null to disable)
 * @param enabled - Whether to enable the query
 */
export function useContainer(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.containerById(id ?? ''),
    queryFn: () => v1ContainersApi.getById(id!),
    enabled: enabled && id !== null,
    staleTime: 10_000,
  });
}

/**
 * Hook for creating a new container.
 *
 * Automatically invalidates the container list on success.
 */
export function useCreateContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContainerRequest) => v1ContainersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.containers });
    },
  });
}

/**
 * Hook for updating an existing container.
 *
 * Automatically invalidates the container queries on success.
 */
export function useUpdateContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContainerRequest }) =>
      v1ContainersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.containerById(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.containerList() });
    },
  });
}

/**
 * Hook for deleting a container.
 *
 * Note: Container must be empty (no cameras assigned) to delete.
 * Automatically invalidates the container list on success.
 */
export function useDeleteContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => v1ContainersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.containers });
    },
  });
}

/**
 * Hook for assigning a camera to a container position.
 *
 * Automatically invalidates container and camera queries on success.
 */
export function useAssignCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      containerId,
      data,
    }: {
      containerId: string;
      data: AssignCameraRequest;
    }) => v1ContainersApi.assignCamera(containerId, data),
    onSuccess: (_, variables) => {
      // Invalidate container queries
      queryClient.invalidateQueries({ queryKey: queryKeys.containerById(variables.containerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.containerList() });
      // Invalidate camera queries since assignment affects camera state
      queryClient.invalidateQueries({ queryKey: queryKeys.cameras });
    },
  });
}

/**
 * Hook for unassigning a camera from a container.
 *
 * Automatically invalidates container and camera queries on success.
 */
export function useUnassignCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      containerId,
      deviceId,
    }: {
      containerId: string;
      deviceId: string;
    }) => v1ContainersApi.unassignCamera(containerId, deviceId),
    onSuccess: (_, variables) => {
      // Invalidate container queries
      queryClient.invalidateQueries({ queryKey: queryKeys.containerById(variables.containerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.containerList() });
      // Invalidate camera queries since unassignment affects camera state
      queryClient.invalidateQueries({ queryKey: queryKeys.cameras });
    },
  });
}

/**
 * Hook for getting cameras that are not assigned to any container.
 *
 * Combines container and camera data to derive unassigned cameras.
 *
 * @param enabled - Whether to enable the query
 */
export function useUnassignedCameras(enabled = true) {
  const { data: containers = [], isLoading: containersLoading } = useContainers(enabled);
  const camerasQuery = useQuery({
    queryKey: queryKeys.cameraList(),
    queryFn: v1CamerasApi.list,
    enabled,
    staleTime: 10_000,
  });

  // Get set of all assigned camera device IDs
  const assignedDeviceIds = new Set<string>();
  for (const container of containers) {
    for (const camera of container.cameras) {
      assignedDeviceIds.add(camera.device_id);
    }
  }

  // Filter cameras that are not assigned
  const unassignedCameras: Camera[] = (camerasQuery.data ?? []).filter(
    (camera) => !assignedDeviceIds.has(camera.id)
  );

  return {
    data: unassignedCameras,
    isLoading: containersLoading || camerasQuery.isLoading,
    isError: camerasQuery.isError,
    error: camerasQuery.error,
  };
}

/**
 * Helper to get available positions for a container.
 * Returns positions 1-4 that don't have a camera assigned.
 */
export function getAvailablePositions(container: ContainerDetail): (1 | 2 | 3 | 4)[] {
  const occupiedPositions = new Set(container.cameras.map((c) => c.position));
  return ([1, 2, 3, 4] as const).filter((pos) => !occupiedPositions.has(pos));
}

/**
 * Helper to check if a container can be deleted.
 * Returns true if the container has no cameras assigned.
 */
export function canDeleteContainer(container: ContainerDetail): boolean {
  return container.camera_count === 0;
}
