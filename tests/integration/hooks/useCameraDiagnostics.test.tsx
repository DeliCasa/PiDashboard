/**
 * Camera Diagnostics Hooks Integration Tests
 * Feature: 042-diagnostics-integration (T013)
 *
 * Tests for useCameraDiagnostics and useCameraDiagnosticsList hooks.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '../mocks/server';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import {
  useCameraDiagnostics,
  useCameraDiagnosticsList,
  cameraDiagnosticsKeys,
} from '@/application/hooks/useCameraDiagnostics';
import { cameraDiagnosticsHandlers, errorSimulationHandlers } from '../../mocks/handlers/camera-diagnostics';
import { http, HttpResponse } from 'msw';

beforeAll(() => {
  server.use(...cameraDiagnosticsHandlers);
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Camera Diagnostics Hooks Integration', () => {
  describe('useCameraDiagnostics', () => {
    it('should fetch camera diagnostics successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnostics('espcam-b0f7f1'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        camera_id: 'espcam-b0f7f1',
        name: 'Kitchen Camera',
        status: 'online',
      });
      expect(result.current.data?.health).toBeDefined();
      expect(result.current.data?.diagnostics).toBeDefined();
    });

    it('should return health metrics for online camera', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnostics('espcam-b0f7f1'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.health).toMatchObject({
        heap: expect.any(Number),
        wifi_rssi: expect.any(Number),
        uptime: expect.any(Number),
      });
    });

    it('should handle 503 error for offline camera', async () => {
      server.use(...errorSimulationHandlers);

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnostics('espcam-c2d3e4'), // offline variant
        { wrapper }
      );

      await waitFor(
        () => {
          expect(result.current.isError || result.current.failureCount > 0).toBe(true);
        },
        { timeout: 5000 }
      );
    });

    it('should handle 404 error for camera not found', async () => {
      server.use(
        http.get('/api/v1/cameras/espcam-ffffff/diagnostics', () => {
          return HttpResponse.json(
            { error: 'Camera not found', code: 'NOT_FOUND' },
            { status: 404 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnostics('espcam-ffffff'),
        { wrapper }
      );

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );
    });

    it('should not retry on validation errors', async () => {
      // Invalid camera ID format won't even make a request
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnostics('invalid-id'),
        { wrapper }
      );

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );

      // Should fail immediately without retries
      expect(result.current.failureCount).toBeLessThanOrEqual(1);
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnostics('espcam-b0f7f1', false),
        { wrapper }
      );

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should not fetch with empty camera ID', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnostics(''),
        { wrapper }
      );

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should support polling interval', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnostics('espcam-b0f7f1', true, 1000),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Data should be available
      expect(result.current.data).toBeDefined();
    });
  });

  describe('useCameraDiagnosticsList', () => {
    it('should fetch list of camera diagnostics', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnosticsList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeInstanceOf(Array);
      expect(result.current.data?.length).toBeGreaterThan(0);
    });

    it('should include cameras with various statuses', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnosticsList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const statuses = result.current.data?.map((c) => c.status);
      expect(statuses).toContain('online');
      expect(statuses).toContain('offline');
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnosticsList(false),
        { wrapper }
      );

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should return empty array on 404 error', async () => {
      server.use(
        http.get('/api/dashboard/cameras/diagnostics', () => {
          return HttpResponse.json(
            { error: 'Not found' },
            { status: 404 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(
        () => useCameraDiagnosticsList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Graceful degradation should return empty array
      expect(result.current.data).toEqual([]);
    });
  });

  describe('cameraDiagnosticsKeys', () => {
    it('should generate correct query keys', () => {
      expect(cameraDiagnosticsKeys.all).toEqual(['camera-diagnostics']);
      expect(cameraDiagnosticsKeys.lists()).toEqual(['camera-diagnostics', 'list']);
      expect(cameraDiagnosticsKeys.detail('espcam-123456')).toEqual([
        'camera-diagnostics',
        'detail',
        'espcam-123456',
      ]);
    });
  });
});
