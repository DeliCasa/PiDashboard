/**
 * Offline Queue Service
 * IndexedDB-based queue for offline operations with background sync
 */

import { openDB } from 'idb';
import type { OfflineQueueEntry, QueueOperation, QueueStatus } from '@/domain/types/entities';

const DB_NAME = 'delicasa-pi-dashboard';
const DB_VERSION = 1;
const STORE_NAME = 'offline-queue';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbPromise: Promise<any> | null = null;

/**
 * Initialize or get the IndexedDB database
 */
async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-status', 'status');
          store.createIndex('by-created', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Generate a unique ID for queue entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Offline Queue API
 */
export const offlineQueue = {
  /**
   * Add an operation to the offline queue
   */
  async add(
    operation: QueueOperation,
    endpoint: string,
    method: string,
    payload?: Record<string, unknown>
  ): Promise<OfflineQueueEntry> {
    const db = await getDB();
    const entry: OfflineQueueEntry = {
      id: generateId(),
      operation,
      endpoint,
      method,
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };

    await db.put(STORE_NAME, entry);

    // Trigger background sync if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Background sync API may not be available on all browsers
        if ('sync' in registration) {
          await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-queue');
        }
      } catch {
        // Background sync not supported, will sync on reconnect
      }
    }

    return entry;
  },

  /**
   * Get all pending entries in the queue
   */
  async getPending(): Promise<OfflineQueueEntry[]> {
    const db = await getDB();
    return db.getAllFromIndex(STORE_NAME, 'by-status', 'pending');
  },

  /**
   * Get all entries in the queue
   */
  async getAll(): Promise<OfflineQueueEntry[]> {
    const db = await getDB();
    const entries: OfflineQueueEntry[] = await db.getAll(STORE_NAME);
    return entries.sort(
      (a: OfflineQueueEntry, b: OfflineQueueEntry) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
  }> {
    const entries = await this.getAll();
    return {
      total: entries.length,
      pending: entries.filter((e) => e.status === 'pending').length,
      syncing: entries.filter((e) => e.status === 'syncing').length,
      synced: entries.filter((e) => e.status === 'synced').length,
      failed: entries.filter((e) => e.status === 'failed').length,
    };
  },

  /**
   * Update an entry's status
   */
  async updateStatus(
    id: string,
    status: QueueStatus,
    error?: string
  ): Promise<void> {
    const db = await getDB();
    const entry = await db.get(STORE_NAME, id);
    if (entry) {
      entry.status = status;
      if (error) {
        entry.lastError = error;
      }
      if (status === 'syncing') {
        entry.retryCount += 1;
      }
      await db.put(STORE_NAME, entry);
    }
  },

  /**
   * Remove an entry from the queue
   */
  async remove(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  },

  /**
   * Clear all synced entries
   */
  async clearSynced(): Promise<void> {
    const db = await getDB();
    const synced: OfflineQueueEntry[] = await db.getAllFromIndex(STORE_NAME, 'by-status', 'synced');
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await Promise.all([
      ...synced.map((entry: OfflineQueueEntry) => tx.store.delete(entry.id)),
      tx.done,
    ]);
  },

  /**
   * Clear all entries (for debugging)
   */
  async clearAll(): Promise<void> {
    const db = await getDB();
    await db.clear(STORE_NAME);
  },

  /**
   * Retry failed entries
   */
  async retryFailed(): Promise<void> {
    const db = await getDB();
    const failed = await db.getAllFromIndex(STORE_NAME, 'by-status', 'failed');
    const tx = db.transaction(STORE_NAME, 'readwrite');

    for (const entry of failed) {
      if (entry.retryCount < 5) {
        entry.status = 'pending';
        await tx.store.put(entry);
      }
    }

    await tx.done;
  },
};

/**
 * Process the offline queue (called by service worker or on reconnect)
 */
export async function processQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const pending = await offlineQueue.getPending();
  let succeeded = 0;
  let failed = 0;

  for (const entry of pending) {
    try {
      await offlineQueue.updateStatus(entry.id, 'syncing');

      const response = await fetch(entry.endpoint, {
        method: entry.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: entry.payload ? JSON.stringify(entry.payload) : undefined,
      });

      if (response.ok) {
        await offlineQueue.updateStatus(entry.id, 'synced');
        succeeded++;
      } else {
        const errorText = await response.text();
        await offlineQueue.updateStatus(entry.id, 'failed', errorText);
        failed++;
      }
    } catch (error) {
      await offlineQueue.updateStatus(
        entry.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      failed++;
    }
  }

  return { processed: pending.length, succeeded, failed };
}

/**
 * Listen for online status and process queue
 */
export function initOfflineSync(): void {
  if (typeof window === 'undefined') return;

  // Process queue when coming online
  window.addEventListener('online', async () => {
    console.log('[OfflineQueue] Online - processing queue');
    const result = await processQueue();
    console.log('[OfflineQueue] Sync complete:', result);
  });

  // Log when going offline
  window.addEventListener('offline', () => {
    console.log('[OfflineQueue] Offline - operations will be queued');
  });
}
