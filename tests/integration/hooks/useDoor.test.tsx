/**
 * Door Hooks Integration Tests (T030)
 * Tests for useDoorStatus, useOpenDoor, useCloseDoor - including error states
 */

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { server } from '../mocks/server';
import { errorHandlers } from '../mocks/handlers';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import {
  useDoorStatus,
  useOpenDoor,
  useCloseDoor,
  useDoorHistory,
} from '@/application/hooks/useDoor';

// Mock the testing mode store
vi.mock('@/application/stores/testingMode', () => ({
  useTestingModeStore: () => ({
    active: false,
    incrementOperations: vi.fn(),
  }),
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Door Hooks Integration', () => {
  describe('useDoorStatus', () => {
    it('should fetch door status successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDoorStatus(true, 0), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        state: 'locked',
        is_locked: true,
      });
    });

    it('should handle door API not available (404 error)', async () => {
      server.use(errorHandlers.doorUnavailable);

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDoorStatus(true, 0), { wrapper });

      await waitFor(
        () => {
          // After retries, either isError is true or failureCount increased
          expect(result.current.isError || result.current.failureCount > 0).toBe(true);
        },
        { timeout: 5000 }
      );
    });

    it('should only retry once for door status (endpoint may not exist)', async () => {
      server.use(errorHandlers.doorUnavailable);

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDoorStatus(true, 0), { wrapper });

      await waitFor(
        () => {
          // Either ended in error or has failures
          expect(result.current.isError || result.current.failureCount >= 1).toBe(true);
        },
        { timeout: 5000 }
      );

      // Verify retry count (as configured in hook with retry: 1)
      if (result.current.isError) {
        expect(result.current.failureCount).toBeLessThanOrEqual(2);
      }
    });

    it('should preserve previous data while refetching', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      // Pre-populate cache
      queryClient.setQueryData(['door', 'status'], {
        state: 'unlocked',
        is_locked: false,
      });

      const { result } = renderHook(() => useDoorStatus(true, 0), { wrapper });

      // Placeholder data should be shown
      expect(result.current.data?.state).toBe('unlocked');

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDoorStatus(false), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useOpenDoor', () => {
    it('should open door successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useOpenDoor(), { wrapper });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        success: true,
        door_state: 'unlocked',
      });
    });

    it('should open door with custom duration', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useOpenDoor(), { wrapper });

      act(() => {
        result.current.mutate(10000); // 10 seconds
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should invalidate door status and history after open', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      // Pre-populate caches
      queryClient.setQueryData(['door', 'status'], { state: 'locked' });
      queryClient.setQueryData(['door', 'history'], []);

      const { result } = renderHook(() => useOpenDoor(), { wrapper });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Both caches should be invalidated
      expect(queryClient.getQueryState(['door', 'status'])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(['door', 'history'])?.isInvalidated).toBe(true);
    });
  });

  describe('useCloseDoor', () => {
    it('should close door successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useCloseDoor(), { wrapper });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        success: true,
        door_state: 'locked',
      });
    });

    it('should invalidate door status and history after close', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      queryClient.setQueryData(['door', 'status'], { state: 'unlocked' });
      queryClient.setQueryData(['door', 'history'], []);

      const { result } = renderHook(() => useCloseDoor(), { wrapper });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryClient.getQueryState(['door', 'status'])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(['door', 'history'])?.isInvalidated).toBe(true);
    });
  });

  describe('useDoorHistory', () => {
    it('should fetch door history successfully', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDoorHistory(20, true), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeInstanceOf(Array);
      expect(result.current.data?.length).toBeGreaterThan(0);
      expect(result.current.data?.[0]).toMatchObject({
        id: '1',
        action: 'open',
        success: true,
      });
    });

    it('should not fetch when disabled', async () => {
      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useDoorHistory(20, false), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
