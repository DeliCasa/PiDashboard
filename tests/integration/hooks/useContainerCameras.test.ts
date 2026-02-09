/**
 * useContainerCameras Integration Tests
 * Feature: 046-opaque-container-identity (T015)
 *
 * Tests the derived hook that filters cameras by active container.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useContainerCameras, useContainerCameraIds } from '@/application/hooks/useContainers';
import { useActiveContainerStore } from '@/application/stores/activeContainer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock API clients
vi.mock('@/infrastructure/api/v1-containers', () => ({
  v1ContainersApi: {
    list: vi.fn(),
  },
}));

vi.mock('@/infrastructure/api/v1-cameras', () => ({
  v1CamerasApi: {
    list: vi.fn(),
  },
}));

vi.mock('@/infrastructure/api/client', () => ({
  isFeatureUnavailable: vi.fn(() => false),
  ApiError: class ApiError extends Error {
    constructor(public code: string, public status: number, message: string) {
      super(message);
    }
  },
  NetworkError: class NetworkError extends Error {},
  TimeoutError: class TimeoutError extends Error {},
}));

import { v1ContainersApi } from '@/infrastructure/api/v1-containers';
import { v1CamerasApi } from '@/infrastructure/api/v1-cameras';

const mockContainers = [
  {
    id: 'container-aaa',
    label: 'Kitchen',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    cameras: [
      { device_id: 'cam-1', position: 1, assigned_at: '2026-01-01T00:00:00Z', status: 'online' },
      { device_id: 'cam-2', position: 2, assigned_at: '2026-01-01T00:00:00Z', status: 'offline' },
    ],
    camera_count: 2,
    online_count: 1,
  },
  {
    id: 'container-bbb',
    label: 'Garage',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    cameras: [
      { device_id: 'cam-3', position: 1, assigned_at: '2026-01-01T00:00:00Z', status: 'online' },
    ],
    camera_count: 1,
    online_count: 1,
  },
];

const mockCameras = [
  { id: 'cam-1', name: 'Front Door', status: 'online', mac_address: 'AA:BB:CC:DD:EE:01', last_seen: '2026-01-01T00:00:00Z' },
  { id: 'cam-2', name: 'Back Yard', status: 'offline', mac_address: 'AA:BB:CC:DD:EE:02', last_seen: '2026-01-01T00:00:00Z' },
  { id: 'cam-3', name: 'Garage', status: 'online', mac_address: 'AA:BB:CC:DD:EE:03', last_seen: '2026-01-01T00:00:00Z' },
  { id: 'cam-4', name: 'Unassigned', status: 'online', mac_address: 'AA:BB:CC:DD:EE:04', last_seen: '2026-01-01T00:00:00Z' },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useContainerCameras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useActiveContainerStore.setState({ activeContainerId: null });
    });
    vi.mocked(v1ContainersApi.list).mockResolvedValue(mockContainers);
    vi.mocked(v1CamerasApi.list).mockResolvedValue(mockCameras);
  });

  it('returns all cameras when no container is selected', async () => {
    const { result } = renderHook(() => useContainerCameras(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(4);
    expect(result.current.isScoped).toBe(false);
  });

  it('returns only container cameras when container is selected', async () => {
    act(() => {
      useActiveContainerStore.getState().setActiveContainer('container-aaa');
    });

    const { result } = renderHook(() => useContainerCameras(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data.length).toBeGreaterThan(0);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data.map((c) => c.id)).toEqual(['cam-1', 'cam-2']);
    expect(result.current.isScoped).toBe(true);
  });

  it('returns cameras for a different container', async () => {
    act(() => {
      useActiveContainerStore.getState().setActiveContainer('container-bbb');
    });

    const { result } = renderHook(() => useContainerCameras(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data.length).toBeGreaterThan(0);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].id).toBe('cam-3');
    expect(result.current.isScoped).toBe(true);
  });
});

describe('useContainerCameraIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useActiveContainerStore.setState({ activeContainerId: null });
    });
    vi.mocked(v1ContainersApi.list).mockResolvedValue(mockContainers);
  });

  it('returns null when no container selected', async () => {
    const { result } = renderHook(() => useContainerCameraIds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('returns Set of device IDs for selected container', async () => {
    act(() => {
      useActiveContainerStore.getState().setActiveContainer('container-aaa');
    });

    const { result } = renderHook(() => useContainerCameraIds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current!.has('cam-1')).toBe(true);
    expect(result.current!.has('cam-2')).toBe(true);
    expect(result.current!.has('cam-3')).toBe(false);
  });
});
