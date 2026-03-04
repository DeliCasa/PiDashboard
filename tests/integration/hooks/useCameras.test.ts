/**
 * Camera Hooks Graceful Degradation Tests
 * Feature: 045-dashboard-resilience-e2e (T012)
 * Updated: 062-piorch-grpc-client — hooks now use Connect RPC
 *
 * Tests that useCameras() gracefully handles unavailable camera service.
 * With RPC migration, the hook returns [] on unavailable errors and
 * stops polling (no retry on feature-unavailable).
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import { useCameras } from '@/application/hooks/useCameras';
import { createV1CamerasHandlers } from '../../mocks/v1-cameras-handlers';

const RPC_BASE = '/rpc/delicasa.device.v1';

// Setup MSW server with default success handlers
const server = setupServer(...createV1CamerasHandlers());

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useCameras Graceful Degradation (Feature 045)', () => {
  it('should return empty array on 503 (service unavailable)', async () => {
    server.use(
      // RPC endpoint returns Connect unavailable error
      http.post(`${RPC_BASE}.CameraService/ListCameras`, () => {
        return HttpResponse.json(
          { code: 'unavailable', message: 'Camera service unavailable' },
          { status: 503 }
        );
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useCameras(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // camerasRpcApi.list() catches unavailable errors and returns []
    expect(result.current.data).toEqual([]);
  });

  it('should return empty array on 404 (feature unavailable)', async () => {
    server.use(
      // RPC endpoint returns Connect not-found error
      http.post(`${RPC_BASE}.CameraService/ListCameras`, () => {
        return HttpResponse.json(
          { code: 'not_found', message: 'Camera service not found' },
          { status: 404 }
        );
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useCameras(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should fetch cameras successfully with default handler', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useCameras(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeInstanceOf(Array);
    expect(result.current.data!.length).toBeGreaterThan(0);
  });
});
