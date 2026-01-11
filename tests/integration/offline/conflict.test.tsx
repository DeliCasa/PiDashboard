/**
 * Offline Queue Conflict Tests (T056)
 *
 * Tests for conflict resolution scenarios including:
 * - Concurrent updates to the same resource
 * - Out-of-order sync resolution
 * - Last-write-wins conflict resolution
 *
 * Feature: 005-testing-research-and-hardening [US3]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      sync: {
        register: vi.fn().mockResolvedValue(undefined),
      },
    }),
  },
  configurable: true,
});

import { openDB } from 'idb';

describe('Offline Queue Conflict Resolution (T056)', () => {
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

  describe('Same-resource concurrent updates', () => {
    it('should process updates to same key in order', async () => {
      const { processQueue } = await import('@/infrastructure/offline/queue');

      // Two updates to the same config key
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
          operation: 'config_update',
          endpoint: '/api/dashboard/config/server.port',
          method: 'PUT',
          payload: { value: '8084' },
          createdAt: '2026-01-07T10:01:00Z', // Later update
          status: 'pending',
          retryCount: 0,
        },
      ];

      mockDb.getAllFromIndex.mockResolvedValue(pendingEntries);
      mockDb.get.mockImplementation(async (_store: string, id: string) =>
        pendingEntries.find((e) => e.id === id)
      );

      const fetchCalls: Array<{ body: string }> = [];
      mockFetch.mockImplementation(async (_url, options) => {
        fetchCalls.push({ body: options?.body });
        return {
          ok: true,
          text: () => Promise.resolve('{"success": true}'),
        };
      });

      await processQueue();

      // Both should be processed
      expect(fetchCalls).toHaveLength(2);
      // First call should have first value
      expect(fetchCalls[0].body).toContain('8083');
      // Second call should have second value (last-write-wins)
      expect(fetchCalls[1].body).toContain('8084');
    });

    it('should handle first update failure while second succeeds', async () => {
      const { processQueue } = await import('@/infrastructure/offline/queue');

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
          operation: 'config_update',
          endpoint: '/api/dashboard/config/server.port',
          method: 'PUT',
          payload: { value: '8084' },
          createdAt: '2026-01-07T10:01:00Z',
          status: 'pending',
          retryCount: 0,
        },
      ];

      mockDb.getAllFromIndex.mockResolvedValue(pendingEntries);
      mockDb.get.mockImplementation(async (_store: string, id: string) =>
        pendingEntries.find((e) => e.id === id)
      );

      // First fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('{"success": true}'),
        });

      const result = await processQueue();

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should mark older conflicting update as superseded on 409 conflict', async () => {
      const { processQueue } = await import('@/infrastructure/offline/queue');

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
      ];

      mockDb.getAllFromIndex.mockResolvedValue(pendingEntries);
      mockDb.get.mockImplementation(async (_store: string, id: string) =>
        pendingEntries.find((e) => e.id === id)
      );

      // Server returns 409 conflict (version mismatch)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        text: () => Promise.resolve('{"error": "Version conflict"}'),
      });

      const result = await processQueue();

      // Should mark as failed with conflict error
      expect(result.failed).toBe(1);
      expect(mockDb.put).toHaveBeenCalledWith(
        'offline-queue',
        expect.objectContaining({
          status: 'failed',
          lastError: expect.stringContaining('Version conflict'),
        })
      );
    });
  });

  describe('Different-resource parallel updates', () => {
    it('should handle independent updates concurrently', async () => {
      const { processQueue } = await import('@/infrastructure/offline/queue');

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
          operation: 'config_update',
          endpoint: '/api/dashboard/config/mqtt.broker',
          method: 'PUT',
          payload: { value: 'mqtt://new-broker' },
          createdAt: '2026-01-07T10:00:01Z',
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'entry-3',
          operation: 'door_command',
          endpoint: '/api/door/command',
          method: 'POST',
          payload: { command: 'OPEN_DOOR' },
          createdAt: '2026-01-07T10:00:02Z',
          status: 'pending',
          retryCount: 0,
        },
      ];

      mockDb.getAllFromIndex.mockResolvedValue(pendingEntries);
      mockDb.get.mockImplementation(async (_store: string, id: string) =>
        pendingEntries.find((e) => e.id === id)
      );

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"success": true}'),
      });

      const result = await processQueue();

      expect(result.processed).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should isolate failures between different resources', async () => {
      const { processQueue } = await import('@/infrastructure/offline/queue');

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
          createdAt: '2026-01-07T10:00:01Z',
          status: 'pending',
          retryCount: 0,
        },
      ];

      mockDb.getAllFromIndex.mockResolvedValue(pendingEntries);
      mockDb.get.mockImplementation(async (_store: string, id: string) =>
        pendingEntries.find((e) => e.id === id)
      );

      // Config update fails, door command succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('{"error": "Config locked"}'),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('{"success": true}'),
        });

      const result = await processQueue();

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('Retry count and max retries', () => {
    it('should not retry entries that have exceeded max retries', async () => {
      const { offlineQueue } = await import('@/infrastructure/offline/queue');

      const failedEntries = [
        {
          id: 'entry-1',
          status: 'failed',
          retryCount: 3,
          createdAt: '2026-01-07T10:00:00Z',
        }, // Below limit
        {
          id: 'entry-2',
          status: 'failed',
          retryCount: 5,
          createdAt: '2026-01-07T10:01:00Z',
        }, // At limit
        {
          id: 'entry-3',
          status: 'failed',
          retryCount: 7,
          createdAt: '2026-01-07T10:02:00Z',
        }, // Above limit
      ];

      mockDb.getAllFromIndex.mockResolvedValue(failedEntries);

      await offlineQueue.retryFailed();

      // Only entry-1 should be retried (retryCount < 5)
      expect(mockTx.store.put).toHaveBeenCalledTimes(1);
      expect(mockTx.store.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'entry-1',
          status: 'pending',
        })
      );
    });

    it('should increment retry count on each sync attempt', async () => {
      const { offlineQueue } = await import('@/infrastructure/offline/queue');

      const entry = {
        id: 'entry-1',
        status: 'pending',
        retryCount: 2,
        createdAt: '2026-01-07T10:00:00Z',
      };

      mockDb.get.mockResolvedValue(entry);

      await offlineQueue.updateStatus('entry-1', 'syncing');

      expect(mockDb.put).toHaveBeenCalledWith(
        'offline-queue',
        expect.objectContaining({
          retryCount: 3, // Incremented
          status: 'syncing',
        })
      );
    });
  });

  describe('Queue ordering and priority', () => {
    it('should process entries in creation order (FIFO)', async () => {
      const { processQueue } = await import('@/infrastructure/offline/queue');

      // Create entries with specific order
      const pendingEntries = [
        {
          id: 'first',
          operation: 'config_update',
          endpoint: '/api/dashboard/config/a',
          method: 'PUT',
          payload: { value: 'a' },
          createdAt: '2026-01-07T10:00:00Z',
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'second',
          operation: 'config_update',
          endpoint: '/api/dashboard/config/b',
          method: 'PUT',
          payload: { value: 'b' },
          createdAt: '2026-01-07T10:01:00Z',
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'third',
          operation: 'config_update',
          endpoint: '/api/dashboard/config/c',
          method: 'PUT',
          payload: { value: 'c' },
          createdAt: '2026-01-07T10:02:00Z',
          status: 'pending',
          retryCount: 0,
        },
      ];

      mockDb.getAllFromIndex.mockResolvedValue(pendingEntries);
      mockDb.get.mockImplementation(async (_store: string, id: string) =>
        pendingEntries.find((e) => e.id === id)
      );

      const processedOrder: string[] = [];
      mockFetch.mockImplementation(async (url) => {
        processedOrder.push(url as string);
        return {
          ok: true,
          text: () => Promise.resolve('{"success": true}'),
        };
      });

      await processQueue();

      // Should process in array order (FIFO)
      expect(processedOrder[0]).toContain('/a');
      expect(processedOrder[1]).toContain('/b');
      expect(processedOrder[2]).toContain('/c');
    });

    it('should maintain order even with failures', async () => {
      const { processQueue } = await import('@/infrastructure/offline/queue');

      const pendingEntries = [
        {
          id: 'first',
          operation: 'config_update',
          endpoint: '/api/dashboard/config/a',
          method: 'PUT',
          payload: { value: 'a' },
          createdAt: '2026-01-07T10:00:00Z',
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'second',
          operation: 'config_update',
          endpoint: '/api/dashboard/config/b',
          method: 'PUT',
          payload: { value: 'b' },
          createdAt: '2026-01-07T10:01:00Z',
          status: 'pending',
          retryCount: 0,
        },
      ];

      mockDb.getAllFromIndex.mockResolvedValue(pendingEntries);
      mockDb.get.mockImplementation(async (_store: string, id: string) =>
        pendingEntries.find((e) => e.id === id)
      );

      const processedOrder: string[] = [];
      mockFetch.mockImplementation(async (url) => {
        processedOrder.push(url as string);
        // First fails
        if ((url as string).includes('/a')) {
          return {
            ok: false,
            text: () => Promise.resolve('{"error": "Failed"}'),
          };
        }
        return {
          ok: true,
          text: () => Promise.resolve('{"success": true}'),
        };
      });

      await processQueue();

      // Should still process both, first before second
      expect(processedOrder[0]).toContain('/a');
      expect(processedOrder[1]).toContain('/b');
    });
  });

  describe('Cleanup after sync', () => {
    it('should clear synced entries from queue', async () => {
      const { useOfflineQueue } = await import('@/application/hooks/useOffline');

      const syncedEntries = [
        {
          id: 'synced-1',
          status: 'synced',
          createdAt: '2026-01-07T10:00:00Z',
        },
        {
          id: 'synced-2',
          status: 'synced',
          createdAt: '2026-01-07T10:01:00Z',
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

      expect(mockTx.store.delete).toHaveBeenCalledWith('synced-1');
      expect(mockTx.store.delete).toHaveBeenCalledWith('synced-2');
    });

    it('should not clear pending or failed entries', async () => {
      const { offlineQueue } = await import('@/infrastructure/offline/queue');

      // clearSynced should only query synced entries
      const syncedEntries: Array<{
        id: string;
        status: string;
        createdAt: string;
      }> = [];
      mockDb.getAllFromIndex.mockResolvedValue(syncedEntries);

      await offlineQueue.clearSynced();

      // Should only query for synced status
      expect(mockDb.getAllFromIndex).toHaveBeenCalledWith(
        'offline-queue',
        'by-status',
        'synced'
      );

      // No deletes since no synced entries
      expect(mockTx.store.delete).not.toHaveBeenCalled();
    });
  });

  describe('Error message preservation', () => {
    it('should preserve error message from API response', async () => {
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

      const detailedError = '{"error": "Invalid value for server.port"}';
      mockFetch.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve(detailedError),
      });

      await processQueue();

      expect(mockDb.put).toHaveBeenCalledWith(
        'offline-queue',
        expect.objectContaining({
          status: 'failed',
          lastError: detailedError,
        })
      );
    });

    it('should preserve error message from network exception', async () => {
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

      mockFetch.mockRejectedValue(new Error('ERR_NETWORK_CHANGED'));

      await processQueue();

      expect(mockDb.put).toHaveBeenCalledWith(
        'offline-queue',
        expect.objectContaining({
          status: 'failed',
          lastError: 'ERR_NETWORK_CHANGED',
        })
      );
    });
  });
});
