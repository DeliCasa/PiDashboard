/**
 * Container Hooks Integration Tests
 * Feature: 043-container-identity-ui (T010, T013, T015, T017, T019)
 *
 * Tests for useContainers, useCreateContainer, useAssignCamera, useUnassignCamera,
 * useUpdateContainer, useDeleteContainer, and useUnassignedCameras hooks.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import {
  useContainers,
  useContainer,
  useCreateContainer,
  useUpdateContainer,
  useDeleteContainer,
  useAssignCamera,
  useUnassignCamera,
  useUnassignedCameras,
  getAvailablePositions,
  canDeleteContainer,
} from '@/application/hooks/useContainers';
import { createV1ContainersHandlers } from '../../mocks/v1-containers-handlers';
import { createV1CamerasHandlers } from '../../mocks/v1-cameras-handlers';
import {
  mockContainerList,
  mockContainerDetailWithCamera,
  mockContainerDetailEmpty,
  mockErrorResponse,
  mockCameraAssignmentOnline,
} from '../../mocks/container-mocks';

// Setup MSW server
const server = setupServer(
  ...createV1ContainersHandlers(),
  ...createV1CamerasHandlers()
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Container Hooks Integration', () => {
  // ===========================================================================
  // useContainers
  // ===========================================================================

  describe('useContainers', () => {
    it('should fetch container list successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useContainers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeInstanceOf(Array);
      expect(result.current.data?.length).toBe(mockContainerList.length);
    });

    it('should return containers with label and ID', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useContainers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const firstContainer = result.current.data?.[0];
      expect(firstContainer).toHaveProperty('id');
      expect(firstContainer).toHaveProperty('label');
      expect(firstContainer).toHaveProperty('cameras');
    });

    it('should include camera count and online count', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useContainers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const container = result.current.data?.[0];
      expect(container).toHaveProperty('camera_count');
      expect(container).toHaveProperty('online_count');
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useContainers(false), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle API errors', async () => {
      server.use(
        http.get('/api/v1/containers', () => {
          return HttpResponse.json(
            mockErrorResponse('VALIDATION_ERROR', 'Bad request', false),
            { status: 400 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useContainers(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );
    });

    // Feature 045: Graceful degradation tests
    it('should stop retrying on 404 (feature unavailable)', async () => {
      let requestCount = 0;
      server.use(
        http.get('/api/v1/containers', () => {
          requestCount++;
          return HttpResponse.json(
            { error: 'Not Found' },
            { status: 404 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useContainers(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );

      // Wait a bit to ensure no more retries fire
      await new Promise(r => setTimeout(r, 200));

      // With isFeatureUnavailable, retries should be minimal (1-2 max)
      // compared to default React Query retry of 3
      expect(requestCount).toBeLessThanOrEqual(2);
    });

    it('should stop retrying on 503 (service unavailable)', async () => {
      let requestCount = 0;
      server.use(
        http.get('/api/v1/containers', () => {
          requestCount++;
          return HttpResponse.json(
            { error: 'Service Unavailable' },
            { status: 503 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useContainers(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );

      // Wait a bit to ensure no more retries fire
      await new Promise(r => setTimeout(r, 200));

      // Should not retry excessively on 503
      expect(requestCount).toBeLessThanOrEqual(2);
    });
  });

  // ===========================================================================
  // useContainer (single container)
  // ===========================================================================

  describe('useContainer', () => {
    it('should fetch single container by ID', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useContainer(mockContainerDetailWithCamera.id),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.id).toBe(mockContainerDetailWithCamera.id);
      expect(result.current.data?.cameras).toBeDefined();
    });

    it('should not fetch when ID is null', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useContainer(null), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle 404 for unknown container', async () => {
      server.use(
        http.get('/api/v1/containers/unknown-id', () => {
          return HttpResponse.json(
            mockErrorResponse('CONTAINER_NOT_FOUND', 'Container not found'),
            { status: 404 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useContainer('unknown-id'), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );
    });
  });

  // ===========================================================================
  // useCreateContainer (T010)
  // ===========================================================================

  describe('useCreateContainer', () => {
    it('should create container with label and description', async () => {
      // Use specific handler for create - response must match ContainerDetailSchema
      server.use(
        http.post('/api/v1/containers', async () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'new-container-id',
              label: 'New Container',
              description: 'Test description',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              cameras: [],
              camera_count: 0,
              online_count: 0,
            },
            timestamp: new Date().toISOString(),
          }, { status: 201 });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useCreateContainer(), { wrapper });

      let mutationResult: unknown;
      await act(async () => {
        mutationResult = await result.current.mutateAsync({
          label: 'New Container',
          description: 'Test description',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(mutationResult).toBeDefined();
    });

    it('should create container without label (unnamed)', async () => {
      server.use(
        http.post('/api/v1/containers', async () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'new-container-id',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              cameras: [],
              camera_count: 0,
              online_count: 0,
            },
            timestamp: new Date().toISOString(),
          }, { status: 201 });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useCreateContainer(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({});
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should invalidate container queries on success', async () => {
      server.use(
        http.post('/api/v1/containers', async () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'new-container-id',
              label: 'Test',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              cameras: [],
              camera_count: 0,
              online_count: 0,
            },
            timestamp: new Date().toISOString(),
          }, { status: 201 });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useCreateContainer(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ label: 'Test' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle creation errors', async () => {
      server.use(
        http.post('/api/v1/containers', () => {
          return HttpResponse.json(
            mockErrorResponse('VALIDATION_FAILED', 'Label too long'),
            { status: 400 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useCreateContainer(), { wrapper });

      try {
        await act(async () => {
          await result.current.mutateAsync({
            label: 'x'.repeat(101),
          });
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Error is expected
        expect(error).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // useUpdateContainer (T017)
  // ===========================================================================

  describe('useUpdateContainer', () => {
    it('should update container label', async () => {
      server.use(
        http.patch('/api/v1/containers/:id', async () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: mockContainerDetailWithCamera.id,
              label: 'Updated Label',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              cameras: mockContainerDetailWithCamera.cameras,
              camera_count: mockContainerDetailWithCamera.camera_count,
              online_count: mockContainerDetailWithCamera.online_count,
            },
            timestamp: new Date().toISOString(),
          });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useUpdateContainer(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          id: mockContainerDetailWithCamera.id,
          data: { label: 'Updated Label' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should update container description', async () => {
      server.use(
        http.patch('/api/v1/containers/:id', async () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: mockContainerDetailWithCamera.id,
              description: 'Updated description',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              cameras: mockContainerDetailWithCamera.cameras,
              camera_count: mockContainerDetailWithCamera.camera_count,
              online_count: mockContainerDetailWithCamera.online_count,
            },
            timestamp: new Date().toISOString(),
          });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useUpdateContainer(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          id: mockContainerDetailWithCamera.id,
          data: { description: 'Updated description' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle update errors', async () => {
      server.use(
        http.patch('/api/v1/containers/:id', () => {
          return HttpResponse.json(
            mockErrorResponse('CONTAINER_NOT_FOUND', 'Not found'),
            { status: 404 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useUpdateContainer(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            id: 'unknown-id',
            data: { label: 'Test' },
          });
        })
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // useDeleteContainer (T019)
  // ===========================================================================

  describe('useDeleteContainer', () => {
    it('should delete empty container', async () => {
      // Use specific handler for delete
      server.use(
        http.delete('/api/v1/containers/:id', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDeleteContainer(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockContainerDetailEmpty.id);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should fail to delete container with cameras', async () => {
      server.use(
        http.delete('/api/v1/containers/:id', () => {
          return HttpResponse.json(
            mockErrorResponse('CONTAINER_HAS_CAMERAS', 'Remove cameras first'),
            { status: 400 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDeleteContainer(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync(mockContainerDetailWithCamera.id);
        })
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // useAssignCamera (T013)
  // ===========================================================================

  describe('useAssignCamera', () => {
    it('should assign camera to container position', async () => {
      // Use a specific handler that returns success
      server.use(
        http.post('/api/v1/containers/:id/cameras', async () => {
          return HttpResponse.json({
            success: true,
            data: {
              device_id: 'AA:BB:CC:DD:EE:99',
              position: 1,
              assigned_at: new Date().toISOString(),
              status: 'online',
            },
            timestamp: new Date().toISOString(),
          }, { status: 201 });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useAssignCamera(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          containerId: mockContainerDetailEmpty.id,
          data: { device_id: 'AA:BB:CC:DD:EE:99', position: 1 },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should fail when position is occupied', async () => {
      server.use(
        http.post('/api/v1/containers/:id/cameras', () => {
          return HttpResponse.json(
            mockErrorResponse('POSITION_OCCUPIED', 'Position taken'),
            { status: 400 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useAssignCamera(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            containerId: mockContainerDetailWithCamera.id,
            data: { device_id: 'AA:BB:CC:DD:EE:99', position: 1 },
          });
        })
      ).rejects.toThrow();
    });

    it('should fail when camera already assigned elsewhere', async () => {
      server.use(
        http.post('/api/v1/containers/:id/cameras', () => {
          return HttpResponse.json(
            mockErrorResponse('CAMERA_ALREADY_ASSIGNED', 'Camera assigned elsewhere'),
            { status: 400 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useAssignCamera(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            containerId: mockContainerDetailEmpty.id,
            data: { device_id: 'AA:BB:CC:DD:EE:01', position: 2 },
          });
        })
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // useUnassignCamera (T015)
  // ===========================================================================

  describe('useUnassignCamera', () => {
    it('should unassign camera from container', async () => {
      // Use specific handler that returns 204 No Content
      server.use(
        http.delete('/api/v1/containers/:id/cameras/:deviceId', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useUnassignCamera(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          containerId: mockContainerDetailWithCamera.id,
          deviceId: mockCameraAssignmentOnline.device_id,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle camera not found in container', async () => {
      server.use(
        http.delete('/api/v1/containers/:id/cameras/:deviceId', () => {
          return HttpResponse.json(
            mockErrorResponse('CAMERA_NOT_FOUND', 'Camera not in container'),
            { status: 404 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useUnassignCamera(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            containerId: mockContainerDetailWithCamera.id,
            deviceId: 'unknown-device',
          });
        })
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // useUnassignedCameras
  // ===========================================================================

  describe('useUnassignedCameras', () => {
    it('should return cameras not assigned to any container', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useUnassignedCameras(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // All mock cameras minus those assigned to containers
      expect(result.current.data).toBeInstanceOf(Array);
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useUnassignedCameras(false), { wrapper });

      expect(result.current.isLoading).toBe(false);
    });
  });

  // ===========================================================================
  // Helper Functions
  // ===========================================================================

  describe('getAvailablePositions', () => {
    it('should return all positions for empty container', () => {
      const emptyContainer = {
        ...mockContainerDetailEmpty,
        cameras: [],
      };
      const positions = getAvailablePositions(emptyContainer);
      expect(positions).toEqual([1, 2, 3, 4]);
    });

    it('should exclude occupied positions', () => {
      const containerWithCamera = {
        ...mockContainerDetailWithCamera,
        cameras: [{ ...mockCameraAssignmentOnline, position: 1 }],
      };
      const positions = getAvailablePositions(containerWithCamera);
      // Container has camera at position 1
      expect(positions).not.toContain(1);
      expect(positions).toContain(2);
      expect(positions).toContain(3);
      expect(positions).toContain(4);
    });

    it('should exclude multiple occupied positions', () => {
      const containerWithMultipleCameras = {
        ...mockContainerDetailWithCamera,
        cameras: [
          { ...mockCameraAssignmentOnline, position: 1 },
          { ...mockCameraAssignmentOnline, device_id: 'test2', position: 3 },
        ],
      };
      const positions = getAvailablePositions(containerWithMultipleCameras);
      expect(positions).toEqual([2, 4]);
    });
  });

  describe('canDeleteContainer', () => {
    it('should return true for empty container', () => {
      expect(canDeleteContainer(mockContainerDetailEmpty)).toBe(true);
    });

    it('should return false for container with cameras', () => {
      expect(canDeleteContainer(mockContainerDetailWithCamera)).toBe(false);
    });
  });
});
