/**
 * Offline Queue Tests (T053)
 * Tests for IndexedDB queue logic
 * Note: These tests mock IndexedDB as jsdom doesn't fully support it
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb module before imports
vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

// Import after mock
import { openDB } from 'idb';

describe('Offline Queue Logic (T053)', () => {
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

  describe('Database initialization', () => {
    it('should call openDB with correct parameters', async () => {
      // Dynamic import to get fresh module with mocks
      const { offlineQueue } = await import('@/infrastructure/offline/queue');

      await offlineQueue.getAll();

      expect(openDB).toHaveBeenCalledWith(
        'delicasa-pi-dashboard',
        1,
        expect.objectContaining({
          upgrade: expect.any(Function),
        })
      );
    });
  });

  describe('Queue operations', () => {
    describe('add()', () => {
      it('should create entry with correct structure', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        const result = await offlineQueue.add(
          'config_update',
          '/api/config/server.port',
          'PUT',
          { value: '8083' }
        );

        expect(result).toMatchObject({
          operation: 'config_update',
          endpoint: '/api/config/server.port',
          method: 'PUT',
          payload: { value: '8083' },
          status: 'pending',
          retryCount: 0,
        });
        expect(result.id).toBeDefined();
        expect(result.createdAt).toBeDefined();
      });

      it('should generate unique IDs for each entry', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        const entry1 = await offlineQueue.add('wifi_connect', '/api/wifi/connect', 'POST');
        const entry2 = await offlineQueue.add('wifi_connect', '/api/wifi/connect', 'POST');

        expect(entry1.id).not.toBe(entry2.id);
      });

      it('should store entry in IndexedDB', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        await offlineQueue.add('config_update', '/api/config/key', 'PUT');

        expect(mockDb.put).toHaveBeenCalledWith(
          'offline-queue',
          expect.objectContaining({
            operation: 'config_update',
            status: 'pending',
          })
        );
      });
    });

    describe('getPending()', () => {
      it('should query by-status index for pending entries', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        const mockPendingEntries = [
          { id: '1', status: 'pending', operation: 'wifi_connect' },
          { id: '2', status: 'pending', operation: 'config_update' },
        ];
        mockDb.getAllFromIndex.mockResolvedValue(mockPendingEntries);

        const result = await offlineQueue.getPending();

        expect(mockDb.getAllFromIndex).toHaveBeenCalledWith(
          'offline-queue',
          'by-status',
          'pending'
        );
        expect(result).toEqual(mockPendingEntries);
      });
    });

    describe('getAll()', () => {
      it('should return all entries sorted by createdAt descending', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        const mockEntries = [
          { id: '1', createdAt: '2026-01-07T10:00:00Z' },
          { id: '2', createdAt: '2026-01-07T12:00:00Z' },
          { id: '3', createdAt: '2026-01-07T11:00:00Z' },
        ];
        mockDb.getAll.mockResolvedValue(mockEntries);

        const result = await offlineQueue.getAll();

        // Should be sorted newest first
        expect(result[0].id).toBe('2');
        expect(result[1].id).toBe('3');
        expect(result[2].id).toBe('1');
      });
    });

    describe('getStats()', () => {
      it('should calculate queue statistics correctly', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        const mockEntries = [
          { id: '1', status: 'pending', createdAt: '2026-01-07T10:00:00Z' },
          { id: '2', status: 'pending', createdAt: '2026-01-07T10:01:00Z' },
          { id: '3', status: 'syncing', createdAt: '2026-01-07T10:02:00Z' },
          { id: '4', status: 'synced', createdAt: '2026-01-07T10:03:00Z' },
          { id: '5', status: 'failed', createdAt: '2026-01-07T10:04:00Z' },
        ];
        mockDb.getAll.mockResolvedValue(mockEntries);

        const stats = await offlineQueue.getStats();

        expect(stats).toEqual({
          total: 5,
          pending: 2,
          syncing: 1,
          synced: 1,
          failed: 1,
        });
      });

      it('should handle empty queue', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        mockDb.getAll.mockResolvedValue([]);

        const stats = await offlineQueue.getStats();

        expect(stats).toEqual({
          total: 0,
          pending: 0,
          syncing: 0,
          synced: 0,
          failed: 0,
        });
      });
    });

    describe('updateStatus()', () => {
      it('should update entry status in database', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        const mockEntry = {
          id: 'test-id',
          status: 'pending',
          retryCount: 0,
        };
        mockDb.get.mockResolvedValue(mockEntry);

        await offlineQueue.updateStatus('test-id', 'synced');

        expect(mockDb.get).toHaveBeenCalledWith('offline-queue', 'test-id');
        expect(mockDb.put).toHaveBeenCalledWith('offline-queue', {
          ...mockEntry,
          status: 'synced',
        });
      });

      it('should increment retryCount when status is syncing', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        const mockEntry = {
          id: 'test-id',
          status: 'pending',
          retryCount: 2,
        };
        mockDb.get.mockResolvedValue(mockEntry);

        await offlineQueue.updateStatus('test-id', 'syncing');

        expect(mockDb.put).toHaveBeenCalledWith(
          'offline-queue',
          expect.objectContaining({
            status: 'syncing',
            retryCount: 3,
          })
        );
      });

      it('should set lastError when error is provided', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        const mockEntry = {
          id: 'test-id',
          status: 'syncing',
          retryCount: 1,
        };
        mockDb.get.mockResolvedValue(mockEntry);

        await offlineQueue.updateStatus('test-id', 'failed', 'Connection refused');

        expect(mockDb.put).toHaveBeenCalledWith(
          'offline-queue',
          expect.objectContaining({
            status: 'failed',
            lastError: 'Connection refused',
          })
        );
      });

      it('should not update non-existent entry', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        mockDb.get.mockResolvedValue(undefined);

        await offlineQueue.updateStatus('non-existent', 'synced');

        // Put should only be called if entry exists
        expect(mockDb.put).not.toHaveBeenCalled();
      });
    });

    describe('remove()', () => {
      it('should delete entry from database', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        await offlineQueue.remove('test-id');

        expect(mockDb.delete).toHaveBeenCalledWith('offline-queue', 'test-id');
      });
    });

    describe('clearSynced()', () => {
      it('should remove all synced entries', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        const syncedEntries = [
          { id: 'synced-1', status: 'synced' },
          { id: 'synced-2', status: 'synced' },
        ];
        mockDb.getAllFromIndex.mockResolvedValue(syncedEntries);

        await offlineQueue.clearSynced();

        expect(mockDb.getAllFromIndex).toHaveBeenCalledWith(
          'offline-queue',
          'by-status',
          'synced'
        );
        expect(mockTx.store.delete).toHaveBeenCalledWith('synced-1');
        expect(mockTx.store.delete).toHaveBeenCalledWith('synced-2');
      });
    });

    describe('clearAll()', () => {
      it('should clear the entire store', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        await offlineQueue.clearAll();

        expect(mockDb.clear).toHaveBeenCalledWith('offline-queue');
      });
    });

    describe('retryFailed()', () => {
      it('should reset failed entries with retryCount < 5 to pending', async () => {
        const { offlineQueue } = await import('@/infrastructure/offline/queue');

        const failedEntries = [
          { id: 'failed-1', status: 'failed', retryCount: 2 },
          { id: 'failed-2', status: 'failed', retryCount: 4 },
          { id: 'failed-3', status: 'failed', retryCount: 5 }, // Should not retry
        ];
        mockDb.getAllFromIndex.mockResolvedValue(failedEntries);

        await offlineQueue.retryFailed();

        // Only entries with retryCount < 5 should be put back
        expect(mockTx.store.put).toHaveBeenCalledTimes(2);
        expect(mockTx.store.put).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'failed-1', status: 'pending' })
        );
        expect(mockTx.store.put).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'failed-2', status: 'pending' })
        );
      });
    });
  });
});
