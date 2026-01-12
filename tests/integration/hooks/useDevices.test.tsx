/**
 * Device Hooks Integration Tests (T067-T068)
 *
 * Tests for useDevices, useDeviceScan, useProvisionDevice, useProvisioningHistory
 *
 * Feature: 005-testing-research-and-hardening [US4]
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { server } from '../mocks/server';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import {
  useDevices,
  useDeviceScan,
  useProvisionDevice,
  useProvisioningHistory,
} from '@/application/hooks/useDevices';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * T067 [US4] useDevices Hook Tests
 */
describe('Device Hooks Integration (T067)', () => {
  describe('useDevices', () => {
    it('should fetch devices list successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDevices(true), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.[0]).toMatchObject({
        address: 'AA:BB:CC:DD:EE:F1',
        name: 'DeliCasa-ESP32-001',
        status: 'discovered',
      });
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDevices(false), { wrapper });

      expect(result.current.isFetching).toBe(false);
      // 028-api-compat: data is always an array for safer consumption
      expect(result.current.data).toEqual([]);
    });

    it('should return devices with correct structure', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDevices(true), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify device structure
      const device = result.current.data?.[0];
      expect(device).toHaveProperty('address');
      expect(device).toHaveProperty('name');
      expect(device).toHaveProperty('rssi');
      expect(device).toHaveProperty('status');
      expect(device).toHaveProperty('provisioned');
    });

    it('should handle API errors gracefully', async () => {
      const { http, HttpResponse } = await import('msw');

      server.use(
        http.get('/api/devices', async () => {
          return HttpResponse.json({ error: 'Device service unavailable' }, { status: 503 });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDevices(true), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isError || result.current.failureCount > 0).toBe(true);
        },
        { timeout: 10000 }
      );
    });
  });

  describe('useDeviceScan', () => {
    it('should trigger scan mutation', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDeviceScan(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        success: true,
        devices_found: expect.any(Number),
      });
    });

    it('should invalidate device list after scan', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      // Pre-populate device list
      queryClient.setQueryData(['devices', 'list'], []);

      const { result } = renderHook(() => useDeviceScan(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const state = queryClient.getQueryState(['devices', 'list']);
      expect(state?.isInvalidated).toBe(true);
    });

    it('should accept optional duration parameter', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDeviceScan(), { wrapper });

      await act(async () => {
        result.current.mutate(10000); // 10 seconds
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle scan errors', async () => {
      const { http, HttpResponse } = await import('msw');

      server.use(
        http.post('/api/devices/scan', async () => {
          return HttpResponse.json({ error: 'Scan failed - Bluetooth unavailable' }, { status: 400 });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDeviceScan(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});

/**
 * T068 [US4] useProvisionDevice Hook Tests
 */
describe('Provisioning Hooks Integration (T068)', () => {
  describe('useProvisionDevice', () => {
    it('should provision device successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useProvisionDevice(), { wrapper });

      await act(async () => {
        result.current.mutate({
          address: 'AA:BB:CC:DD:EE:F1',
          mqtt: {
            broker: 'mqtt://test.local',
            port: 1883,
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        success: true,
        message: expect.stringContaining('provisioned'),
      });
    });

    it('should provision with WiFi credentials', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useProvisionDevice(), { wrapper });

      await act(async () => {
        result.current.mutate({
          address: 'AA:BB:CC:DD:EE:F1',
          mqtt: {
            broker: 'mqtt://test.local',
            port: 1883,
          },
          wifi: {
            ssid: 'TestNetwork',
            password: 'testpass123',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should invalidate device list after provisioning', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      queryClient.setQueryData(['devices', 'list'], []);

      const { result } = renderHook(() => useProvisionDevice(), { wrapper });

      await act(async () => {
        result.current.mutate({
          address: 'AA:BB:CC:DD:EE:F1',
          mqtt: { broker: 'mqtt://test.local', port: 1883 },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const state = queryClient.getQueryState(['devices', 'list']);
      expect(state?.isInvalidated).toBe(true);
    });

    it('should invalidate provisioning history after provisioning', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      // The actual query key is ['devices', 'history'] based on queryKeys.provisioningHistory()
      queryClient.setQueryData(['devices', 'history'], []);

      const { result } = renderHook(() => useProvisionDevice(), { wrapper });

      await act(async () => {
        result.current.mutate({
          address: 'AA:BB:CC:DD:EE:F1',
          mqtt: { broker: 'mqtt://test.local', port: 1883 },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const state = queryClient.getQueryState(['devices', 'history']);
      expect(state?.isInvalidated).toBe(true);
    });

    it('should handle provisioning failure', async () => {
      const { http, HttpResponse } = await import('msw');

      server.use(
        http.post('/api/devices/:address/provision', async () => {
          return HttpResponse.json(
            { success: false, error: 'Device not reachable' },
            { status: 400 }
          );
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useProvisionDevice(), { wrapper });

      await act(async () => {
        result.current.mutate({
          address: 'AA:BB:CC:DD:EE:F1',
          mqtt: { broker: 'mqtt://test.local', port: 1883 },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useProvisioningHistory', () => {
    it('should fetch provisioning history', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useProvisioningHistory(true), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]).toMatchObject({
        device_address: 'AA:BB:CC:DD:EE:F2',
        success: true,
      });
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useProvisioningHistory(false), { wrapper });

      expect(result.current.isFetching).toBe(false);
      // 028-api-compat: data is always an array for safer consumption
      expect(result.current.data).toEqual([]);
    });

    it('should handle history fetch error', async () => {
      const { http, HttpResponse } = await import('msw');

      server.use(
        http.get('/api/devices/history', async () => {
          return HttpResponse.json({ error: 'History unavailable' }, { status: 500 });
        })
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useProvisioningHistory(true), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isError || result.current.failureCount > 0).toBe(true);
        },
        { timeout: 10000 }
      );
    });
  });
});
