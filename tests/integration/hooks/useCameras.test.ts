/**
 * Camera Hooks Graceful Degradation Tests
 * Feature: 045-dashboard-resilience-e2e (T012)
 *
 * Tests that useCameras() stops retrying and polling when both V1 and
 * legacy camera endpoints return 404 or 503 (feature unavailable).
 *
 * Note: v1CamerasApi.list() falls back from /v1/cameras to /dashboard/cameras
 * on failure, so both endpoints must return errors for graceful degradation.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import { useCameras } from '@/application/hooks/useCameras';
import { createV1CamerasHandlers } from '../../mocks/v1-cameras-handlers';

// Setup MSW server with default success handlers
const server = setupServer(...createV1CamerasHandlers());

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useCameras Graceful Degradation (Feature 045)', () => {
  it('should stop retrying on 404 (feature unavailable)', async () => {
    let v1RequestCount = 0;
    server.use(
      // V1 endpoint returns 404
      http.get('/api/v1/cameras', () => {
        v1RequestCount++;
        return HttpResponse.json(
          { error: 'Not Found' },
          { status: 404 }
        );
      }),
      // Legacy fallback also returns 404
      http.get('/api/dashboard/cameras', () => {
        return HttpResponse.json(
          { error: 'Not Found' },
          { status: 404 }
        );
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useCameras(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    // Wait a bit to ensure no more retries fire
    await new Promise(r => setTimeout(r, 200));

    // With isFeatureUnavailable, retries should be minimal (1-2 max)
    expect(v1RequestCount).toBeLessThanOrEqual(2);
  });

  it('should stop retrying on 503 (service unavailable)', async () => {
    let v1RequestCount = 0;
    server.use(
      // V1 endpoint returns 503
      http.get('/api/v1/cameras', () => {
        v1RequestCount++;
        return HttpResponse.json(
          { error: 'Service Unavailable' },
          { status: 503 }
        );
      }),
      // Legacy fallback also returns 503
      http.get('/api/dashboard/cameras', () => {
        return HttpResponse.json(
          { error: 'Service Unavailable' },
          { status: 503 }
        );
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useCameras(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    // Wait a bit to ensure no more retries fire
    await new Promise(r => setTimeout(r, 200));

    // Should not retry excessively on 503
    expect(v1RequestCount).toBeLessThanOrEqual(2);
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
