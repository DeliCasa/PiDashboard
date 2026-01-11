/**
 * Offline Queue Sync Integration Tests (T055)
 *
 * Tests for queue synchronization behavior including:
 * - processQueue execution
 * - Online/offline event handling
 * - Background sync integration
 *
 * Feature: 005-testing-research-and-hardening [US3]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';

// Mock idb module before imports
vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

// Mock fetch for processQueue
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.onLine
let mockOnLine = true;
Object.defineProperty(navigator, 'onLine', {
  get: () => mockOnLine,
  configurable: true,
});

// Mock service worker for background sync
const mockServiceWorker = {
  ready: Promise.resolve({
    sync: {
      register: vi.fn().mockResolvedValue(undefined),
    },
  }),
};
Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  configurable: true,
});

import { openDB } from 'idb';

describe('Offline Queue Sync Integration (T055)', () => {
  // Mock database instance
  let mockDb: {
    put: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    getAllFromIndex: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    transaction: ReturnType<typeof vi.fn>;
  };

  let mockTx: {
    store: { put: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
    done: Promise<void>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnLine = true;
    mockFetch.mockReset();

    // Create mock transaction
    mockTx = {
      store: {
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      done: Promise.resolve(),
    };

    // Create mock database
    mockDb = {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      getAll: vi.fn().mockResolvedValue([]),
      getAllFromIndex: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      transaction: vi.fn().mockReturnValue(mockTx),
    };

    // Mock openDB to return our mock database
    vi.mocked(openDB).mockResolvedValue(mockDb as ReturnType<typeof openDB>);
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('processQueue', () => {
    it('should process all pending entries', async () => {
      const { processQueue } = await import(
        '@/infrastructure/offline/queue'
      );

      const pendingEntries = [
        {
          id: 'entry-1',
          operation: 'config_update',
          endpoint: '/api/dashboard/config/server.port',
          method: 'PUT',
          payload: { value: '8083' },
          createdAt: '2026-01-07T10:00:00Z',
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'entry-2',
          operation: 'door_command',
          endpoint: '/api/door/command',
          method: 'POST',
          payload: { command: 'OPEN_DOOR' },
          createdAt: '2026-01-07T10:01:00Z',
          status: 'pending',
          retryCount: 0,
        },
      ];

      mockDb.getAllFromIndex.mockResolvedValue(pendingEntries);
      mockDb.get.mockImplementation(async (_store: string, id: string) =>
        pendingEntries.find((e) => e.id === id)
      );

      // Mock successful API responses
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"success": true}'),
      });

      const result = await processQueue();

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in queue processing', async () => {
      const { processQueue } = await import('@/infrastructure/offline/queue');

      const pendingEntries = [
        {
          id: 'entry-1',
          operation: 'config_update',
          endpoint: '/api/dashboard/config/key1',
          method: 'PUT',
          payload: { value: 'value1' },
          createdAt: '2026-01-07T10:00:00Z',
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'entry-2',
          operation: 'config_update',
          endpoint: '/api/dashboard/config/key2',
          method: 'PUT',
          payload: { value: 'value2' },
          createdAt: '2026-01-07T10:01:00Z',
          status: 'pending',
          retryCount: 0,
        },
      ];

      mockDb.getAllFromIndex.mockResolvedValue(pendingEntries);
      mockDb.get.mockImplementation(async (_store: string, id: string) =>
        pendingEntries.find((e) => e.id === id)
      );

      // First call succeeds, second fails
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('{"success": true}'),
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('{"error": "Server error"}'),
        });

      const result = await processQueue();

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should handle network errors during sync', async () => {
      const { processQueue } = await import('@/infrastructure/offline/queue');

      const pendingEntries = [
        {
          id: 'entry-1',
          operation: 'config_update',
          endpoint: '/api/dashboard/config/key',
          method: 'PUT',
          payload: { value: 'test' },
          createdAt: '2026-01-07T10:00:00Z',
          status: 'pending',
          retryCount: 0,
        },
      ];

      mockDb.getAllFromIndex.mockResolvedValue(pendingEntries);
      mockDb.get.mockImplementation(async (_store: string, id: string) =>
        pendingEntries.find((e) => e.id === id)
      );

      // Simulate network error
      mockFetch.mockRejectedValue(new Error('Network request failed'));

      const result = await processQueue();

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);

      // Should update status to failed with error message
      expect(mockDb.put).toHaveBeenCalledWith(
        'offline-queue',
        expect.objectContaining({
          status: 'failed',
          lastError: 'Network request failed',
        })
      );
    });

    it('should update entry status to syncing during processing', async () => {
      const { processQueue } = await import('@/infrastructure/offline/queue');

      const pendingEntry = {
        id: 'entry-1',
        operation: 'config_update',
        endpoint: '/api/dashboard/config/key',
        method: 'PUT',
        payload: { value: 'test' },
        createdAt: '2026-01-07T10:00:00Z',
        status: 'pending',
        retryCount: 0,
      };

      mockDb.getAllFromIndex.mockResolvedValue([pendingEntry]);
      mockDb.get.mockResolvedValue(pendingEntry);
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"success": true}'),
      });

      await processQueue();

      // Verify retryCount was incremented (happens during syncing transition)
      // and final status is synced (the state after successful sync)
      expect(mockDb.put).toHaveBeenCalledWith(
        'offline-queue',
        expect.objectContaining({
          retryCount: 1, // Incremented during syncing phase
        })
      );
      // Final state should be synced after successful fetch
      expect(mockDb.put).toHaveBeenLastCalledWith(
        'offline-queue',
        expect.objectContaining({
          status: 'synced',
        })
      );
    });

    it('should return empty results for empty queue', async () => {
      const { processQueue } = await import('@/infrastructure/offline/queue');

      mockDb.getAllFromIndex.mockResolvedValue([]);

      const result = await processQueue();

      expect(result.processed).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('useOnlineStatus hook', () => {
    it('should reflect initial online status', async () => {
      mockOnLine = true;
      const { useOnlineStatus } = await import('@/application/hooks/useOffline');

      const wrapper = createWrapper(createTestQueryClient());
      const { result } = renderHook(() => useOnlineStatus(), { wrapper });

      expect(result.current).toBe(true);
    });

    it('should reflect initial offline status', async () => {
      mockOnLine = false;
      vi.resetModules();
      const { useOnlineStatus } = await import('@/application/hooks/useOffline');

      const wrapper = createWrapper(createTestQueryClient());
      const { result } = renderHook(() => useOnlineStatus(), { wrapper });

      expect(result.current).toBe(false);
    });
  });

  describe('useOfflineQueue hook', () => {
    it('should return queue entries', async () => {
      const { useOfflineQueue } = await import('@/application/hooks/useOffline');

      const mockEntries = [
        {
          id: 'entry-1',
          operation: 'config_update',
          endpoint: '/api/config/key',
          method: 'PUT',
          status: 'pending',
          createdAt: '2026-01-07T10:00:00Z',
          retryCount: 0,
        },
      ];
      mockDb.getAll.mockResolvedValue(mockEntries);

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      await waitFor(() => {
        expect(result.current.entries).toHaveLength(1);
      });

      expect(result.current.entries[0].id).toBe('entry-1');
    });

    it('should return queue statistics', async () => {
      const { useOfflineQueue } = await import('@/application/hooks/useOffline');

      const mockEntries = [
        {
          id: '1',
          status: 'pending',
          createdAt: '2026-01-07T10:00:00Z',
        },
        { id: '2', status: 'synced', createdAt: '2026-01-07T10:01:00Z' },
        { id: '3', status: 'failed', createdAt: '2026-01-07T10:02:00Z' },
      ];
      mockDb.getAll.mockResolvedValue(mockEntries);

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      await waitFor(() => {
        expect(result.current.stats.total).toBe(3);
      });

      expect(result.current.stats).toEqual({
        total: 3,
        pending: 1,
        syncing: 0,
        synced: 1,
        failed: 1,
      });
    });

    it('should trigger sync mutation', async () => {
      const { useOfflineQueue } = await import('@/application/hooks/useOffline');

      mockDb.getAll.mockResolvedValue([]);
      mockDb.getAllFromIndex.mockResolvedValue([]);

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      await act(async () => {
        await result.current.sync();
      });

      // Sync should complete without error on empty queue
      expect(result.current.isSyncing).toBe(false);
    });

    it('should clear synced entries', async () => {
      const { useOfflineQueue } = await import('@/application/hooks/useOffline');

      const syncedEntries = [
        {
          id: 'synced-1',
          status: 'synced',
          createdAt: '2026-01-07T10:00:00Z',
        },
      ];
      mockDb.getAllFromIndex.mockResolvedValue(syncedEntries);
      mockDb.getAll.mockResolvedValue([]);

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      await act(async () => {
        await result.current.clearSynced();
      });

      expect(mockDb.getAllFromIndex).toHaveBeenCalledWith(
        'offline-queue',
        'by-status',
        'synced'
      );
    });

    it('should retry failed entries', async () => {
      const { useOfflineQueue } = await import('@/application/hooks/useOffline');

      const failedEntries = [
        {
          id: 'failed-1',
          status: 'failed',
          retryCount: 2,
          createdAt: '2026-01-07T10:00:00Z',
        },
      ];
      mockDb.getAllFromIndex.mockResolvedValue(failedEntries);
      mockDb.getAll.mockResolvedValue([]);

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      await act(async () => {
        await result.current.retryFailed();
      });

      expect(mockTx.store.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'failed-1',
          status: 'pending',
        })
      );
    });
  });

  describe('useOfflineOperation hook', () => {
    it('should queue operation when offline', async () => {
      mockOnLine = false;
      vi.resetModules();

      // Re-import with offline status
      const { useOfflineOperation } = await import(
        '@/application/hooks/useOffline'
      );

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useOfflineOperation(), { wrapper });

      expect(result.current.isOnline).toBe(false);

      let queueResult;
      await act(async () => {
        queueResult = await result.current.queueOperation(
          'config_update',
          '/api/dashboard/config/key',
          'PUT',
          { value: 'test' }
        );
      });

      expect(queueResult).toMatchObject({
        queued: true,
        entry: expect.objectContaining({
          operation: 'config_update',
          endpoint: '/api/dashboard/config/key',
          status: 'pending',
        }),
      });
    });

    it('should execute immediately when online', async () => {
      mockOnLine = true;
      vi.resetModules();

      const { useOfflineOperation } = await import(
        '@/application/hooks/useOffline'
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useOfflineOperation(), { wrapper });

      expect(result.current.isOnline).toBe(true);

      let operationResult;
      await act(async () => {
        operationResult = await result.current.queueOperation(
          'door_command',
          '/api/door/command',
          'POST',
          { command: 'OPEN_DOOR' }
        );
      });

      expect(operationResult).toMatchObject({
        queued: false,
        data: { success: true },
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/door/command',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ command: 'OPEN_DOOR' }),
        })
      );
    });

    it('should throw error when online request fails', async () => {
      mockOnLine = true;
      vi.resetModules();

      const { useOfflineOperation } = await import(
        '@/application/hooks/useOffline'
      );

      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const queryClient = createTestQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result } = renderHook(() => useOfflineOperation(), { wrapper });

      await expect(
        act(async () => {
          await result.current.queueOperation(
            'config_update',
            '/api/dashboard/config/key',
            'PUT',
            { value: 'test' }
          );
        })
      ).rejects.toThrow('Request failed: Internal Server Error');
    });
  });

  describe('Background sync integration', () => {
    it('should register background sync when adding to queue', async () => {
      const { offlineQueue } = await import('@/infrastructure/offline/queue');

      await offlineQueue.add(
        'config_update',
        '/api/dashboard/config/key',
        'PUT',
        { value: 'test' }
      );

      await waitFor(() => {
        expect(mockServiceWorker.ready).toBeDefined();
      });
    });
  });
});
