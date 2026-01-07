/**
 * Offline Hooks
 * React hooks for offline status and queue management
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offlineQueue, processQueue, initOfflineSync } from '@/infrastructure/offline/queue';
import { queryKeys } from '@/lib/queryClient';

/**
 * Hook for monitoring online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize offline sync handler
    initOfflineSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for accessing the offline queue
 */
export function useOfflineQueue() {
  const queryClient = useQueryClient();

  const { data: entries = [], refetch } = useQuery({
    queryKey: queryKeys.offlineQueue(),
    queryFn: () => offlineQueue.getAll(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: stats } = useQuery({
    queryKey: [...queryKeys.offlineQueue(), 'stats'],
    queryFn: () => offlineQueue.getStats(),
    refetchInterval: 5000,
  });

  const syncMutation = useMutation({
    mutationFn: processQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offlineQueue() });
    },
  });

  const clearSyncedMutation = useMutation({
    mutationFn: () => offlineQueue.clearSynced(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offlineQueue() });
    },
  });

  const retryFailedMutation = useMutation({
    mutationFn: () => offlineQueue.retryFailed(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offlineQueue() });
    },
  });

  const removeEntryMutation = useMutation({
    mutationFn: (id: string) => offlineQueue.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offlineQueue() });
    },
  });

  return {
    entries,
    stats: stats ?? { total: 0, pending: 0, syncing: 0, synced: 0, failed: 0 },
    refetch,
    sync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    clearSynced: clearSyncedMutation.mutateAsync,
    retryFailed: retryFailedMutation.mutateAsync,
    removeEntry: removeEntryMutation.mutateAsync,
  };
}

/**
 * Hook for queueing operations when offline
 */
export function useOfflineOperation() {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  const queueOperation = useCallback(
    async (
      operation: 'door_command' | 'config_update' | 'device_provision',
      endpoint: string,
      method: string,
      payload?: Record<string, unknown>
    ) => {
      if (!isOnline) {
        const entry = await offlineQueue.add(operation, endpoint, method, payload);
        queryClient.invalidateQueries({ queryKey: queryKeys.offlineQueue() });
        return { queued: true, entry };
      }

      // If online, execute immediately
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      return { queued: false, data: await response.json() };
    },
    [isOnline, queryClient]
  );

  return {
    isOnline,
    queueOperation,
  };
}
