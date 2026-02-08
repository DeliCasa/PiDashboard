/**
 * MSW Handlers for V1 Containers API
 * Feature: 043-container-identity-ui
 *
 * Mock Service Worker handlers for container management endpoints.
 */

import { http, HttpResponse, delay } from 'msw';
import type {
  ContainerDetail,
  CameraAssignment,
  CreateContainerRequest,
  UpdateContainerRequest,
  AssignCameraRequest,
} from '@/infrastructure/api/v1-containers-schemas';
import {
  mockContainerList,
  mockContainerResponse,
  mockAssignmentResponse,
  mockErrorResponse,
} from './container-mocks';

// ============================================================================
// Constants
// ============================================================================

const BASE_URL = '/api/v1/containers';

// ============================================================================
// Types
// ============================================================================

export interface ContainerMockState {
  containers: ContainerDetail[];
  defaultDelay?: number;
}

// ============================================================================
// Default State
// ============================================================================

const defaultState: ContainerMockState = {
  containers: [...mockContainerList],
  defaultDelay: 50,
};

// ============================================================================
// Handler Factory
// ============================================================================

/**
 * Create V1 Containers API handlers with optional state overrides.
 */
export function createV1ContainersHandlers(overrides?: Partial<ContainerMockState>) {
  const state = { ...defaultState, ...overrides };

  return [
    // ========================================================================
    // GET /api/v1/containers - List all containers
    // ========================================================================
    http.get(BASE_URL, async () => {
      await delay(state.defaultDelay ?? 50);
      return HttpResponse.json({
        success: true,
        data: {
          containers: state.containers,
          total: state.containers.length,
        },
        timestamp: new Date().toISOString(),
      });
    }),

    // ========================================================================
    // POST /api/v1/containers - Create container
    // ========================================================================
    http.post(BASE_URL, async ({ request }) => {
      await delay(state.defaultDelay ?? 50);
      const body = (await request.json()) as CreateContainerRequest;

      const newContainer: ContainerDetail = {
        id: `container-${Date.now()}`,
        label: body.label,
        description: body.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cameras: [],
        camera_count: 0,
        online_count: 0,
      };

      state.containers.push(newContainer);

      return HttpResponse.json(
        mockContainerResponse(newContainer),
        { status: 201 }
      );
    }),

    // ========================================================================
    // GET /api/v1/containers/:id - Get container by ID
    // ========================================================================
    http.get(`${BASE_URL}/:id`, async ({ params }) => {
      await delay(state.defaultDelay ?? 50);
      const id = decodeURIComponent(params.id as string);
      const container = state.containers.find((c) => c.id === id);

      if (!container) {
        return HttpResponse.json(
          mockErrorResponse('CONTAINER_NOT_FOUND', `Container ${id} not found`),
          { status: 404 }
        );
      }

      return HttpResponse.json(mockContainerResponse(container));
    }),

    // ========================================================================
    // PATCH /api/v1/containers/:id - Update container
    // ========================================================================
    http.patch(`${BASE_URL}/:id`, async ({ params, request }) => {
      await delay(state.defaultDelay ?? 50);
      const id = decodeURIComponent(params.id as string);
      const body = (await request.json()) as UpdateContainerRequest;

      const containerIndex = state.containers.findIndex((c) => c.id === id);
      if (containerIndex === -1) {
        return HttpResponse.json(
          mockErrorResponse('CONTAINER_NOT_FOUND', `Container ${id} not found`),
          { status: 404 }
        );
      }

      const updated: ContainerDetail = {
        ...state.containers[containerIndex],
        label: body.label ?? state.containers[containerIndex].label,
        description: body.description ?? state.containers[containerIndex].description,
        updated_at: new Date().toISOString(),
      };

      state.containers[containerIndex] = updated;

      return HttpResponse.json(mockContainerResponse(updated));
    }),

    // ========================================================================
    // DELETE /api/v1/containers/:id - Delete container
    // ========================================================================
    http.delete(`${BASE_URL}/:id`, async ({ params }) => {
      await delay(state.defaultDelay ?? 50);
      const id = decodeURIComponent(params.id as string);

      const containerIndex = state.containers.findIndex((c) => c.id === id);
      if (containerIndex === -1) {
        return HttpResponse.json(
          mockErrorResponse('CONTAINER_NOT_FOUND', `Container ${id} not found`),
          { status: 404 }
        );
      }

      const container = state.containers[containerIndex];
      if (container.camera_count > 0) {
        return HttpResponse.json(
          mockErrorResponse('CONTAINER_HAS_CAMERAS', 'Remove all cameras before deleting'),
          { status: 400 }
        );
      }

      state.containers.splice(containerIndex, 1);

      return new HttpResponse(null, { status: 204 });
    }),

    // ========================================================================
    // POST /api/v1/containers/:id/cameras - Assign camera
    // ========================================================================
    http.post(`${BASE_URL}/:id/cameras`, async ({ params, request }) => {
      await delay(state.defaultDelay ?? 50);
      const id = decodeURIComponent(params.id as string);
      const body = (await request.json()) as AssignCameraRequest;

      const containerIndex = state.containers.findIndex((c) => c.id === id);
      if (containerIndex === -1) {
        return HttpResponse.json(
          mockErrorResponse('CONTAINER_NOT_FOUND', `Container ${id} not found`),
          { status: 404 }
        );
      }

      const container = state.containers[containerIndex];

      // Check if position is occupied
      const existingAssignment = container.cameras.find((c) => c.position === body.position);
      if (existingAssignment) {
        return HttpResponse.json(
          mockErrorResponse('POSITION_OCCUPIED', `Position ${body.position} is already occupied`),
          { status: 400 }
        );
      }

      // Check if camera is already assigned elsewhere
      for (const c of state.containers) {
        const alreadyAssigned = c.cameras.find((cam) => cam.device_id === body.device_id);
        if (alreadyAssigned) {
          return HttpResponse.json(
            mockErrorResponse('CAMERA_ALREADY_ASSIGNED', 'Camera is already assigned to another container'),
            { status: 400 }
          );
        }
      }

      const newAssignment: CameraAssignment = {
        device_id: body.device_id,
        position: body.position,
        assigned_at: new Date().toISOString(),
        status: 'online',
        name: `Camera ${body.device_id.slice(-5)}`,
      };

      container.cameras.push(newAssignment);
      container.camera_count = container.cameras.length;
      container.online_count = container.cameras.filter((c) => c.status === 'online').length;
      container.updated_at = new Date().toISOString();

      return HttpResponse.json(
        mockAssignmentResponse(newAssignment),
        { status: 201 }
      );
    }),

    // ========================================================================
    // DELETE /api/v1/containers/:id/cameras/:deviceId - Unassign camera
    // ========================================================================
    http.delete(`${BASE_URL}/:id/cameras/:deviceId`, async ({ params }) => {
      await delay(state.defaultDelay ?? 50);
      const id = decodeURIComponent(params.id as string);
      const deviceId = decodeURIComponent(params.deviceId as string);

      const containerIndex = state.containers.findIndex((c) => c.id === id);
      if (containerIndex === -1) {
        return HttpResponse.json(
          mockErrorResponse('CONTAINER_NOT_FOUND', `Container ${id} not found`),
          { status: 404 }
        );
      }

      const container = state.containers[containerIndex];
      const cameraIndex = container.cameras.findIndex((c) => c.device_id === deviceId);

      if (cameraIndex === -1) {
        return HttpResponse.json(
          mockErrorResponse('CAMERA_NOT_FOUND', `Camera ${deviceId} not found in container`),
          { status: 404 }
        );
      }

      container.cameras.splice(cameraIndex, 1);
      container.camera_count = container.cameras.length;
      container.online_count = container.cameras.filter((c) => c.status === 'online').length;
      container.updated_at = new Date().toISOString();

      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

// ============================================================================
// Error Handlers (for error state testing)
// ============================================================================

export const v1ContainersErrorHandlers = {
  /** Returns 500 for all container list requests */
  internalError: http.get(BASE_URL, async () => {
    await delay(50);
    return HttpResponse.json(
      mockErrorResponse('INTERNAL_ERROR', 'Internal server error', true),
      { status: 500 }
    );
  }),

  /** Simulates network error */
  networkError: http.get(BASE_URL, async () => {
    await delay(50);
    return HttpResponse.error();
  }),

  /** Returns empty container list */
  emptyContainers: http.get(BASE_URL, async () => {
    await delay(50);
    return HttpResponse.json({
      success: true,
      data: {
        containers: [],
        total: 0,
      },
      timestamp: new Date().toISOString(),
    });
  }),

  /** Returns 404 for specific container */
  containerNotFound: http.get(`${BASE_URL}/:id`, async () => {
    await delay(50);
    return HttpResponse.json(
      mockErrorResponse('CONTAINER_NOT_FOUND', 'Container not found'),
      { status: 404 }
    );
  }),

  /** Returns position occupied error for assignment */
  positionOccupied: http.post(`${BASE_URL}/:id/cameras`, async () => {
    await delay(50);
    return HttpResponse.json(
      mockErrorResponse('POSITION_OCCUPIED', 'Position is already occupied'),
      { status: 400 }
    );
  }),

  /** Returns camera already assigned error */
  cameraAlreadyAssigned: http.post(`${BASE_URL}/:id/cameras`, async () => {
    await delay(50);
    return HttpResponse.json(
      mockErrorResponse('CAMERA_ALREADY_ASSIGNED', 'Camera is already assigned to another container'),
      { status: 400 }
    );
  }),

  /** Returns container has cameras error for delete */
  containerHasCameras: http.delete(`${BASE_URL}/:id`, async () => {
    await delay(50);
    return HttpResponse.json(
      mockErrorResponse('CONTAINER_HAS_CAMERAS', 'Remove all cameras before deleting'),
      { status: 400 }
    );
  }),
};

// ============================================================================
// Default Handlers Export
// ============================================================================

/** Default handlers with mock data */
export const v1ContainersHandlers = createV1ContainersHandlers();
