/**
 * V1 Containers API Client
 * Feature: 043-container-management
 *
 * Container management via PiOrchestrator V1 API.
 * Handles CRUD operations for containers and camera assignments.
 */

import { apiClient } from './client';
import { V1ApiError } from './errors';
import {
  ContainerListResponseSchema,
  ContainerResponseSchema,
  AssignmentResponseSchema,
  ContainerDetailSchema,
  type ContainerDetail,
  type Container,
  type CameraAssignment,
  type CreateContainerRequest,
  type UpdateContainerRequest,
  type AssignCameraRequest,
} from './v1-containers-schemas';

// ============================================================================
// Constants
// ============================================================================

// Note: apiClient already prepends '/api', so we use '/v1/containers'
const V1_CONTAINERS_BASE = '/v1/containers';

/** Default timeout for container operations (10 seconds) */
const DEFAULT_TIMEOUT_MS = 10_000;

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parses an error response from the containers API.
 * Falls back to generic error if parsing fails.
 */
function parseErrorResponse(error: unknown): V1ApiError {
  // Handle ApiError with status code
  if (error instanceof Error && 'status' in error) {
    const apiError = error as Error & { status: number; code?: string };
    const v1Error = new V1ApiError(
      apiError.code || 'NETWORK_ERROR',
      apiError.message,
      apiError.status >= 500,
      undefined
    );
    // Preserve HTTP status for isFeatureUnavailable() (045-dashboard-resilience-e2e)
    (v1Error as V1ApiError & { httpStatus: number }).httpStatus = apiError.status;
    return v1Error;
  }

  // Fallback for unknown errors
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
 * V1 Containers API client.
 *
 * Provides typed methods for all container operations with Zod validation.
 */
export const v1ContainersApi = {
  /**
   * List all containers with their camera assignments.
   *
   * @returns Promise with array of container details
   * @throws V1ApiError on failure
   */
  list: async (): Promise<ContainerDetail[]> => {
    try {
      const response = await apiClient.get<unknown>(
        V1_CONTAINERS_BASE,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      // Check if we got HTML (SPA fallback) instead of JSON
      if (typeof response === 'string' && response.includes('<!doctype html>')) {
        console.warn('[V1 Containers] V1 API returned HTML');
        throw new V1ApiError('NOT_FOUND', 'Containers endpoint not available', false);
      }

      // Validate response against schema
      const parsed = ContainerListResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[V1 Containers] list response validation failed:', parsed.error.issues);
        // Try to extract data anyway for resilience
        const resp = response as { data?: { containers?: ContainerDetail[] } };
        if (resp.data?.containers) {
          return resp.data.containers;
        }
        throw new V1ApiError('INTERNAL_ERROR', 'Invalid response format', false);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw new V1ApiError(
          parsed.data.error?.code || 'INTERNAL_ERROR',
          parsed.data.error?.message || 'Failed to get containers',
          parsed.data.error?.retryable ?? false
        );
      }

      return parsed.data.data.containers;
    } catch (error) {
      if (error instanceof V1ApiError) {
        throw error;
      }
      throw parseErrorResponse(error);
    }
  },

  /**
   * Get a single container by ID.
   *
   * @param id - Container ID
   * @returns Promise with container details
   * @throws V1ApiError on failure (CONTAINER_NOT_FOUND for 404)
   */
  getById: async (id: string): Promise<ContainerDetail> => {
    try {
      const response = await apiClient.get<unknown>(
        `${V1_CONTAINERS_BASE}/${encodeURIComponent(id)}`,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      // Validate response
      const parsed = ContainerResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[V1 Containers] getById response validation failed:', parsed.error.issues);
        // Try direct parse for resilience
        const directParsed = ContainerDetailSchema.safeParse(response);
        if (directParsed.success) {
          return directParsed.data;
        }
        throw new V1ApiError('INTERNAL_ERROR', 'Invalid response format', false);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw new V1ApiError(
          parsed.data.error?.code || 'CONTAINER_NOT_FOUND',
          parsed.data.error?.message || 'Container not found',
          false
        );
      }

      return parsed.data.data;
    } catch (error) {
      if (error instanceof V1ApiError) {
        throw error;
      }
      throw parseErrorResponse(error);
    }
  },

  /**
   * Create a new container.
   *
   * @param data - Container creation data (label and description optional)
   * @returns Promise with created container
   * @throws V1ApiError on failure
   */
  create: async (data: CreateContainerRequest): Promise<Container> => {
    try {
      const response = await apiClient.post<unknown>(
        V1_CONTAINERS_BASE,
        data,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      // Validate response
      const parsed = ContainerResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[V1 Containers] create response validation failed:', parsed.error.issues);
        // Try to extract data anyway
        const resp = response as { data?: Container; success?: boolean };
        if (resp.data) {
          return resp.data;
        }
        throw new V1ApiError('INTERNAL_ERROR', 'Invalid response format', false);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw new V1ApiError(
          parsed.data.error?.code || 'INTERNAL_ERROR',
          parsed.data.error?.message || 'Failed to create container',
          false
        );
      }

      return parsed.data.data;
    } catch (error) {
      if (error instanceof V1ApiError) {
        throw error;
      }
      throw parseErrorResponse(error);
    }
  },

  /**
   * Update an existing container.
   *
   * @param id - Container ID
   * @param data - Update data (label and/or description)
   * @returns Promise with updated container
   * @throws V1ApiError on failure
   */
  update: async (id: string, data: UpdateContainerRequest): Promise<Container> => {
    try {
      const response = await apiClient.patch<unknown>(
        `${V1_CONTAINERS_BASE}/${encodeURIComponent(id)}`,
        data,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      // Validate response
      const parsed = ContainerResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[V1 Containers] update response validation failed:', parsed.error.issues);
        const resp = response as { data?: Container; success?: boolean };
        if (resp.data) {
          return resp.data;
        }
        throw new V1ApiError('INTERNAL_ERROR', 'Invalid response format', false);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw new V1ApiError(
          parsed.data.error?.code || 'INTERNAL_ERROR',
          parsed.data.error?.message || 'Failed to update container',
          false
        );
      }

      return parsed.data.data;
    } catch (error) {
      if (error instanceof V1ApiError) {
        throw error;
      }
      throw parseErrorResponse(error);
    }
  },

  /**
   * Delete a container.
   *
   * Note: Container must be empty (no cameras assigned) to delete.
   *
   * @param id - Container ID
   * @throws V1ApiError on failure (CONTAINER_HAS_CAMERAS if not empty)
   */
  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete<unknown>(
        `${V1_CONTAINERS_BASE}/${encodeURIComponent(id)}`,
        { timeout: DEFAULT_TIMEOUT_MS }
      );
    } catch (error) {
      if (error instanceof V1ApiError) {
        throw error;
      }
      throw parseErrorResponse(error);
    }
  },

  /**
   * Assign a camera to a container position.
   *
   * @param containerId - Target container ID
   * @param data - Assignment data (device_id and position)
   * @returns Promise with assignment details
   * @throws V1ApiError on failure (POSITION_OCCUPIED, CAMERA_ALREADY_ASSIGNED, etc.)
   */
  assignCamera: async (containerId: string, data: AssignCameraRequest): Promise<CameraAssignment> => {
    try {
      const response = await apiClient.post<unknown>(
        `${V1_CONTAINERS_BASE}/${encodeURIComponent(containerId)}/cameras`,
        data,
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      // Validate response
      const parsed = AssignmentResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[V1 Containers] assignCamera response validation failed:', parsed.error.issues);
        const resp = response as { data?: CameraAssignment; success?: boolean };
        if (resp.data) {
          return resp.data;
        }
        throw new V1ApiError('INTERNAL_ERROR', 'Invalid response format', false);
      }

      if (!parsed.data.success || !parsed.data.data) {
        throw new V1ApiError(
          parsed.data.error?.code || 'INTERNAL_ERROR',
          parsed.data.error?.message || 'Failed to assign camera',
          false
        );
      }

      return parsed.data.data;
    } catch (error) {
      if (error instanceof V1ApiError) {
        throw error;
      }
      throw parseErrorResponse(error);
    }
  },

  /**
   * Unassign a camera from a container.
   *
   * @param containerId - Container ID
   * @param deviceId - Camera device ID to unassign
   * @throws V1ApiError on failure
   */
  unassignCamera: async (containerId: string, deviceId: string): Promise<void> => {
    try {
      await apiClient.delete<unknown>(
        `${V1_CONTAINERS_BASE}/${encodeURIComponent(containerId)}/cameras/${encodeURIComponent(deviceId)}`,
        { timeout: DEFAULT_TIMEOUT_MS }
      );
    } catch (error) {
      if (error instanceof V1ApiError) {
        throw error;
      }
      throw parseErrorResponse(error);
    }
  },
};

// ============================================================================
// Type Exports
// ============================================================================

export type {
  Container,
  ContainerDetail,
  CameraAssignment,
  CreateContainerRequest,
  UpdateContainerRequest,
  AssignCameraRequest,
  CameraPosition,
} from './v1-containers-schemas';

export {
  ContainerSchema,
  ContainerDetailSchema,
  CameraAssignmentSchema,
  CameraPositionSchema,
  CreateContainerRequestSchema,
  UpdateContainerRequestSchema,
  AssignCameraRequestSchema,
  ContainerErrorCodeSchema,
} from './v1-containers-schemas';
