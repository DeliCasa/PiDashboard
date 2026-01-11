/**
 * System Status Hooks Integration Tests (T028)
 * Tests for useSystemStatus, useHealthCheck
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { server } from '../mocks/server';
import { errorHandlers } from '../mocks/handlers';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import { useSystemStatus, useHealthCheck } from '@/application/hooks/useSystemStatus';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * T049 [US3] Partial API Failure Tests
 * Tests for handling partial API failures gracefully
 */
describe('Partial API Failures (T049)', () => {
  it('should handle system info failure while health check succeeds', async () => {
    const { http, HttpResponse } = await import('msw');

    // System info fails, health check succeeds
    server.use(
      http.get('/api/system/info', async () => {
        return HttpResponse.json({ error: 'System unavailable' }, { status: 503 });
      }),
      http.get('/api/health', async () => {
        return HttpResponse.json({ status: 'healthy', version: '1.2.0', uptime: 86400 });
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Both hooks should be independent
    const { result: systemResult } = renderHook(() => useSystemStatus(true, 0), { wrapper });
    const { result: healthResult } = renderHook(() => useHealthCheck(true), { wrapper });

    // Health should still succeed even when system fails
    await waitFor(() => {
      expect(healthResult.current.isSuccess).toBe(true);
    });

    expect(healthResult.current.data).toMatchObject({
      status: 'healthy',
      version: '1.2.0',
    });

    // System info should eventually error (after retries)
    await waitFor(
      () => {
        expect(systemResult.current.isError || systemResult.current.failureCount > 0).toBe(true);
      },
      { timeout: 10000 }
    );
  });

  it('should allow independent retries for system status', async () => {
    const { http, HttpResponse } = await import('msw');
    let requestCount = 0;

    // Fail first 2 requests, then succeed
    // NOTE: V1 envelope is unwrapped by proxy, so return data directly
    server.use(
      http.get('/api/system/info', async () => {
        requestCount++;
        if (requestCount < 3) {
          return HttpResponse.json({ error: 'Temporary error' }, { status: 503 });
        }
        return HttpResponse.json({
          timestamp: new Date().toISOString(),
          cpu: { usage_percent: 35, core_count: 4, per_core: [40, 30, 35, 35] },
          memory: { used_mb: 1024, total_mb: 2048, used_percent: 50, available_mb: 1024 },
          disk: { used_gb: 15, total_gb: 32, used_percent: 46.9, path: '/' },
          temperature_celsius: 52,
          uptime: 86400_000_000_000,
          load_average: { load_1: 0.8, load_5: 0.5, load_15: 0.3 },
          overall_status: 'healthy',
        });
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSystemStatus(true, 0), { wrapper });

    // Wait for eventual success (retries should eventually succeed)
    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 15000 }
    );

    expect(requestCount).toBeGreaterThanOrEqual(3);
  });

  it('should preserve stale data during refetch failures', async () => {
    const { http, HttpResponse } = await import('msw');
    let shouldFail = false;

    // NOTE: V1 envelope is unwrapped by proxy, so return data directly
    server.use(
      http.get('/api/system/info', async () => {
        if (shouldFail) {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        }
        return HttpResponse.json({
          timestamp: new Date().toISOString(),
          cpu: { usage_percent: 35, core_count: 4, per_core: [40, 30, 35, 35] },
          memory: { used_mb: 1024, total_mb: 2048, used_percent: 50, available_mb: 1024 },
          disk: { used_gb: 15, total_gb: 32, used_percent: 46.9, path: '/' },
          temperature_celsius: 52,
          uptime: 86400_000_000_000,
          load_average: { load_1: 0.8, load_5: 0.5, load_15: 0.3 },
          overall_status: 'healthy',
        });
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSystemStatus(true, 0), { wrapper });

    // Wait for initial success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const initialData = result.current.data;
    expect(initialData?.cpu_usage).toBe(35);

    // Now make subsequent requests fail
    shouldFail = true;

    // Trigger refetch
    await act(async () => {
      result.current.refetch();
    });

    // Data should be preserved even if refetch fails
    await waitFor(
      () => {
        expect(result.current.isFetching).toBe(false);
      },
      { timeout: 10000 }
    );

    // Stale data should still be available
    expect(result.current.data?.cpu_usage).toBe(35);
  });
});

describe('System Status Hooks Integration', () => {
  describe('useSystemStatus', () => {
    it('should fetch system status successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useSystemStatus(true, 0), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify transformed data
      expect(result.current.data).toMatchObject({
        cpu_usage: 35,
        memory_usage: 50,
        memory_total: 2048,
        memory_available: 1024,
        disk_usage: 46.9,
        disk_total: 32,
        temperature: 52,
        pi_model: 'pi4',
      });
    });

    it('should transform nanoseconds uptime to human-readable string', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useSystemStatus(true, 0), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 86400_000_000_000 ns = 1 day
      expect(result.current.data?.uptime).toBe('1d 0h 0m');
      expect(result.current.data?.uptime_seconds).toBe(86400);
    });

    it('should detect Pi model from core count', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useSystemStatus(true, 0), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 4 cores = pi4
      expect(result.current.data?.pi_model).toBe('pi4');
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useSystemStatus(false), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle API errors gracefully', async () => {
      server.use(errorHandlers.systemError);

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useSystemStatus(true, 0), { wrapper });

      await waitFor(
        () => {
          // After retries exhausted, isError should be true
          expect(result.current.isError || result.current.failureCount > 0).toBe(true);
        },
        { timeout: 5000 }
      );

      // Error should be defined after failed attempts
      if (result.current.isError) {
        expect(result.current.error).toBeDefined();
      }
    });

    it('should preserve previous data while refetching', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      // Pre-populate with previous data
      queryClient.setQueryData(['system', 'status'], {
        cpu_usage: 50,
        memory_usage: 60,
      });

      const { result } = renderHook(() => useSystemStatus(true, 0), { wrapper });

      // Should show placeholder while fetching
      expect(result.current.data).toMatchObject({
        cpu_usage: 50,
        memory_usage: 60,
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });
    });
  });

  describe('useHealthCheck', () => {
    it('should fetch health status successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useHealthCheck(true), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        status: 'healthy',
        version: '1.2.0',
        uptime: 86400,
      });
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useHealthCheck(false), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
