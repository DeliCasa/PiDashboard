/**
 * useContainerCameraIds Integration Tests
 * Feature: 046-opaque-container-identity (T019)
 *
 * Tests the utility hook that returns camera device IDs for the active container.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useContainerCameraIds } from '@/application/hooks/useContainers';
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
  {
    id: 'container-ccc',
    label: 'Empty Room',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    cameras: [],
    camera_count: 0,
    online_count: 0,
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useContainerCameraIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useActiveContainerStore.setState({ activeContainerId: null });
    });
    vi.mocked(v1ContainersApi.list).mockResolvedValue(mockContainers);
  });

  it('returns null when no container is selected', async () => {
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

    expect(result.current).toBeInstanceOf(Set);
    expect(result.current!.size).toBe(2);
    expect(result.current!.has('cam-1')).toBe(true);
    expect(result.current!.has('cam-2')).toBe(true);
    expect(result.current!.has('cam-3')).toBe(false);
  });

  it('returns correct IDs for a different container', async () => {
    act(() => {
      useActiveContainerStore.getState().setActiveContainer('container-bbb');
    });

    const { result } = renderHook(() => useContainerCameraIds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current!.size).toBe(1);
    expect(result.current!.has('cam-3')).toBe(true);
  });

  it('returns empty Set for container with no cameras', async () => {
    act(() => {
      useActiveContainerStore.getState().setActiveContainer('container-ccc');
    });

    const { result } = renderHook(() => useContainerCameraIds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current).toBeInstanceOf(Set);
    expect(result.current!.size).toBe(0);
  });

  it('returns null when selected container ID is not in the list', async () => {
    act(() => {
      useActiveContainerStore.getState().setActiveContainer('container-nonexistent');
    });

    const { result } = renderHook(() => useContainerCameraIds(), {
      wrapper: createWrapper(),
    });

    // Wait for container data to load
    await waitFor(() => {
      // Container not found → returns null
      expect(result.current).toBeNull();
    });
  });
});
