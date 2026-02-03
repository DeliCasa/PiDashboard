/**
 * Diagnostics Hooks Integration Tests
 * Feature: 038-dev-observability-panels (T016)
 *
 * Tests for useHealthChecks, useServiceHealth hooks with MSW.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '../mocks/server';
import {
  createDiagnosticsHandlers,
} from '../../mocks/handlers/diagnostics';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import {
  useHealthChecks,
  useServiceHealth,
  getOverallHealthStatus,
} from '@/application/hooks/useDiagnostics';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useHealthChecks Hook', () => {
  it('should fetch all service health checks', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useHealthChecks(true, 0), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have all three services
    expect(result.current.data?.services).toHaveLength(3);
    expect(result.current.data?.services.map((s) => s.service_name)).toEqual(
      expect.arrayContaining(['bridgeserver', 'piorchestrator', 'minio'])
    );
  });

  it('should not fetch when disabled', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useHealthChecks(false), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should handle partial service failures gracefully', async () => {
    const { http, HttpResponse } = await import('msw');

    // BridgeServer succeeds, others fail
    server.use(
      http.get('/api/dashboard/diagnostics/bridgeserver', async () => {
        return HttpResponse.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          checks: { database: { status: 'healthy' } },
        });
      }),
      http.get('/api/system/info', async () => {
        return HttpResponse.json({ error: 'Unavailable' }, { status: 503 });
      }),
      http.get('/api/dashboard/diagnostics/minio', async () => {
        return HttpResponse.json({ error: 'Connection refused' }, { status: 503 });
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useHealthChecks(true, 0), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should still return all services, some with error states
    expect(result.current.data?.services).toHaveLength(3);

    const bridgeServer = result.current.data?.services.find(
      (s) => s.service_name === 'bridgeserver'
    );
    expect(bridgeServer?.status).toBe('healthy');

    const piOrchestrator = result.current.data?.services.find(
      (s) => s.service_name === 'piorchestrator'
    );
    expect(piOrchestrator?.status).toBe('unknown'); // 503 returns unknown

    const minio = result.current.data?.services.find((s) => s.service_name === 'minio');
    expect(minio?.status).toBe('unknown'); // 503 returns unknown
  });

  it('should keep previous data while refetching', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useHealthChecks(true, 0), { wrapper });

    // Wait for initial data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Trigger refetch
    result.current.refetch();

    // Should keep previous data as placeholder
    expect(result.current.data).toBeDefined();
  });
});

describe('useServiceHealth Hook', () => {
  it('should fetch individual BridgeServer health', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useServiceHealth('bridgeserver', true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.service_name).toBe('bridgeserver');
    expect(result.current.data?.status).toBe('healthy');
  });

  it('should fetch individual PiOrchestrator health', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useServiceHealth('piorchestrator', true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.service_name).toBe('piorchestrator');
    // PiOrchestrator health is derived from /system/info
    expect(['healthy', 'unhealthy', 'unknown']).toContain(result.current.data?.status);
  });

  it('should fetch individual MinIO health', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useServiceHealth('minio', true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.service_name).toBe('minio');
    expect(result.current.data?.status).toBe('healthy');
  });
});

describe('getOverallHealthStatus', () => {
  it('should return healthy when all services are healthy', () => {
    const services = [
      { service_name: 'bridgeserver', status: 'healthy', last_checked: '' },
      { service_name: 'piorchestrator', status: 'healthy', last_checked: '' },
      { service_name: 'minio', status: 'healthy', last_checked: '' },
    ] as const;

    expect(getOverallHealthStatus([...services])).toBe('healthy');
  });

  it('should return unhealthy when any service is unhealthy', () => {
    const services = [
      { service_name: 'bridgeserver', status: 'healthy', last_checked: '' },
      { service_name: 'piorchestrator', status: 'unhealthy', last_checked: '' },
      { service_name: 'minio', status: 'healthy', last_checked: '' },
    ] as const;

    expect(getOverallHealthStatus([...services])).toBe('unhealthy');
  });

  it('should return unhealthy when any service has timeout', () => {
    const services = [
      { service_name: 'bridgeserver', status: 'timeout', last_checked: '' },
      { service_name: 'piorchestrator', status: 'healthy', last_checked: '' },
      { service_name: 'minio', status: 'healthy', last_checked: '' },
    ] as const;

    expect(getOverallHealthStatus([...services])).toBe('unhealthy');
  });

  it('should return degraded when any service is degraded', () => {
    const services = [
      { service_name: 'bridgeserver', status: 'healthy', last_checked: '' },
      { service_name: 'piorchestrator', status: 'degraded', last_checked: '' },
      { service_name: 'minio', status: 'healthy', last_checked: '' },
    ] as const;

    expect(getOverallHealthStatus([...services])).toBe('degraded');
  });

  it('should return unknown when any service is unknown (and none unhealthy)', () => {
    const services = [
      { service_name: 'bridgeserver', status: 'healthy', last_checked: '' },
      { service_name: 'piorchestrator', status: 'unknown', last_checked: '' },
      { service_name: 'minio', status: 'healthy', last_checked: '' },
    ] as const;

    expect(getOverallHealthStatus([...services])).toBe('unknown');
  });

  it('should return unknown for empty services array', () => {
    expect(getOverallHealthStatus([])).toBe('unknown');
  });

  it('should prioritize unhealthy over degraded', () => {
    const services = [
      { service_name: 'bridgeserver', status: 'degraded', last_checked: '' },
      { service_name: 'piorchestrator', status: 'unhealthy', last_checked: '' },
      { service_name: 'minio', status: 'degraded', last_checked: '' },
    ] as const;

    expect(getOverallHealthStatus([...services])).toBe('unhealthy');
  });
});
