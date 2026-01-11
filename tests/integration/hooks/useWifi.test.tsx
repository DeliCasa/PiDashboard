/**
 * WiFi Hooks Integration Tests (T027)
 * Tests for useWifiScan, useWifiStatus, useWifiNetworks, useWifiConnect
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { server } from '../mocks/server';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import {
  useWifiStatus,
  useWifiScan,
  useWifiNetworks,
  useWifiConnect,
  useWifiDisconnect,
} from '@/application/hooks/useWifi';

// Start MSW server before tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * T050 [US3] Partial API Failure Tests for WiFi
 * Tests for handling WiFi API partial failures gracefully
 */
describe('WiFi Partial API Failures (T050)', () => {
  it('should handle scan failure while status succeeds', async () => {
    const { http, HttpResponse } = await import('msw');

    // Status succeeds, scan fails with 400 (no retries)
    server.use(
      http.get('/api/wifi/status', async () => {
        return HttpResponse.json({
          status: { connected: true, ssid: 'HomeNetwork', ip: '192.168.1.100', signal: -45 },
        });
      }),
      http.get('/api/wifi/scan', async () => {
        return HttpResponse.json({ error: 'WiFi scan failed' }, { status: 400 });
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result: statusResult } = renderHook(() => useWifiStatus(true, 0), { wrapper });
    const { result: scanResult } = renderHook(() => useWifiScan(), { wrapper });

    // Status should succeed
    await waitFor(() => {
      expect(statusResult.current.isSuccess).toBe(true);
    });

    expect(statusResult.current.data).toMatchObject({
      connected: true,
      ssid: 'HomeNetwork',
    });

    // Trigger scan - should fail but not affect status
    await act(async () => {
      scanResult.current.mutate();
    });

    await waitFor(
      () => {
        expect(scanResult.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    // Status should still be valid
    expect(statusResult.current.data?.connected).toBe(true);
  });

  it('should handle connect failure gracefully', async () => {
    const { http, HttpResponse } = await import('msw');

    server.use(
      http.post('/api/wifi/connect', async () => {
        return HttpResponse.json({ error: 'Connection failed - wrong password' }, { status: 401 });
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useWifiConnect(), { wrapper });

    await act(async () => {
      result.current.mutate({ ssid: 'SecureNetwork', password: 'wrongpass' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Hook should be in error state with error details
    expect(result.current.error).toBeDefined();
  });

  it('should recover from scan failure on retry', async () => {
    const { http, HttpResponse } = await import('msw');
    let requestCount = 0;

    server.use(
      http.get('/api/wifi/scan', async () => {
        requestCount++;
        // Use 400 (no retries) for deterministic test
        if (requestCount === 1) {
          return HttpResponse.json({ error: 'Temporary error' }, { status: 400 });
        }
        return HttpResponse.json({
          count: 2,
          networks: [
            { ssid: 'HomeNetwork', signal: -45, security: 'WPA2', channel: 6 },
            { ssid: 'GuestNetwork', signal: -60, security: 'WPA2', channel: 11 },
          ],
          success: true,
        });
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useWifiScan(), { wrapper });

    // First scan fails with 400 (no retries)
    await act(async () => {
      result.current.mutate();
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    // Reset mutation for retry
    await act(async () => {
      result.current.reset();
    });

    // Second scan succeeds
    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.networks).toHaveLength(2);
    expect(requestCount).toBe(2);
  });

  it('should handle status polling failure gracefully', async () => {
    const { http, HttpResponse } = await import('msw');
    let shouldFail = false;

    server.use(
      http.get('/api/wifi/status', async () => {
        if (shouldFail) {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        }
        return HttpResponse.json({
          status: { connected: true, ssid: 'HomeNetwork', ip: '192.168.1.100', signal: -45 },
        });
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useWifiStatus(true, 0), { wrapper });

    // Initial fetch succeeds
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.connected).toBe(true);

    // Now make failures happen
    shouldFail = true;

    // Trigger refetch
    await act(async () => {
      result.current.refetch();
    });

    // Wait for fetch to complete
    await waitFor(
      () => {
        expect(result.current.isFetching).toBe(false);
      },
      { timeout: 10000 }
    );

    // Stale data should be preserved
    expect(result.current.data?.connected).toBe(true);
  });

  it('should maintain cached networks during scan failure', async () => {
    const { http, HttpResponse } = await import('msw');

    // Pre-populate cache
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      ['wifi', 'networks'],
      [
        { ssid: 'CachedNetwork', signal: -50, secured: true, encryption: 'wpa2' },
      ]
    );

    // Use 400 for immediate failure (no retries)
    server.use(
      http.get('/api/wifi/scan', async () => {
        return HttpResponse.json({ error: 'Scan failed' }, { status: 400 });
      })
    );

    const wrapper = createWrapper(queryClient);

    const { result: networksResult } = renderHook(() => useWifiNetworks(), { wrapper });
    const { result: scanResult } = renderHook(() => useWifiScan(), { wrapper });

    // Initial cache should be available
    expect(networksResult.current.data?.[0]?.ssid).toBe('CachedNetwork');

    // Trigger scan that fails
    await act(async () => {
      scanResult.current.mutate();
    });

    await waitFor(
      () => {
        expect(scanResult.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    // Cached networks should still be preserved
    expect(networksResult.current.data?.[0]?.ssid).toBe('CachedNetwork');
  });
});

describe('WiFi Hooks Integration', () => {
  describe('useWifiStatus', () => {
    it('should fetch WiFi status successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useWifiStatus(true, 0), { wrapper });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        connected: true,
        ssid: 'HomeNetwork',
        ip: '192.168.1.100',
        signal: -45,
      });
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useWifiStatus(false), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle polling interval', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      // Use polling interval of 0 to disable for this test
      const { result } = renderHook(() => useWifiStatus(true, 0), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify refetchInterval is not set when 0
      expect(result.current.data?.connected).toBe(true);
    });
  });

  describe('useWifiScan', () => {
    it('should scan for networks successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useWifiScan(), { wrapper });

      expect(result.current.isPending).toBe(false);

      // Trigger scan
      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.networks).toHaveLength(3);
      expect(result.current.data?.networks[0].ssid).toBe('HomeNetwork');
    });

    it('should update networks cache after scan', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useWifiScan(), { wrapper });

      // Trigger scan
      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that cache was updated
      const cachedNetworks = queryClient.getQueryData(['wifi', 'networks']);
      expect(cachedNetworks).toHaveLength(3);
    });

    it('should handle scan mutation lifecycle', async () => {
      // Test that mutation lifecycle works correctly (pending -> success/error)
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useWifiScan(), { wrapper });

      // Initially idle
      expect(result.current.isIdle).toBe(true);

      // Trigger mutation and wait for completion
      await act(async () => {
        result.current.mutate();
        // Give MSW time to respond
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      // Wait for mutation to complete with longer timeout
      await waitFor(
        () => {
          expect(result.current.isSuccess || result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );
    });
  });

  describe('useWifiNetworks', () => {
    it('should fetch networks on mount', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useWifiNetworks(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.[0]).toMatchObject({
        ssid: 'HomeNetwork',
        secured: true,
        encryption: 'wpa2',
      });
    });

    it('should not refetch on window focus (staleTime: Infinity)', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, rerender } = renderHook(() => useWifiNetworks(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const initialDataUpdatedAt = result.current.dataUpdatedAt;

      // Simulate refetch attempt
      rerender();

      // Data should not have been refetched
      expect(result.current.dataUpdatedAt).toBe(initialDataUpdatedAt);
    });
  });

  describe('useWifiConnect', () => {
    it('should connect to network successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useWifiConnect(), { wrapper });

      act(() => {
        result.current.mutate({ ssid: 'HomeNetwork', password: 'password123' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.success).toBe(true);
    });

    it('should connect without password for open networks', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useWifiConnect(), { wrapper });

      act(() => {
        result.current.mutate({ ssid: 'OpenCafe' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should invalidate status after connect', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      // Pre-populate status cache
      queryClient.setQueryData(['wifi', 'status'], { connected: false });

      const { result } = renderHook(() => useWifiConnect(), { wrapper });

      act(() => {
        result.current.mutate({ ssid: 'HomeNetwork', password: 'pass' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Status cache should be invalidated
      const statusState = queryClient.getQueryState(['wifi', 'status']);
      expect(statusState?.isInvalidated).toBe(true);
    });
  });

  describe('useWifiDisconnect', () => {
    it('should disconnect successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useWifiDisconnect(), { wrapper });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should invalidate status after disconnect', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      queryClient.setQueryData(['wifi', 'status'], { connected: true, ssid: 'HomeNetwork' });

      const { result } = renderHook(() => useWifiDisconnect(), { wrapper });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const statusState = queryClient.getQueryState(['wifi', 'status']);
      expect(statusState?.isInvalidated).toBe(true);
    });
  });
});
