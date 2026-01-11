/**
 * useAllowlist Hook
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T034
 *
 * React Query hooks for device allowlist management.
 * Provides CRUD operations with optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  DeviceAllowlistEntry,
  AllowlistEntryRequest,
  AllowlistData,
} from '@/domain/types/provisioning';
import { allowlistApi } from '@/infrastructure/api/allowlist';
import { V1ApiError } from '@/infrastructure/api/errors';

// ============================================================================
// Query Keys
// ============================================================================

export const allowlistKeys = {
  all: ['allowlist'] as const,
  list: () => [...allowlistKeys.all, 'list'] as const,
  entry: (mac: string) => [...allowlistKeys.all, 'entry', mac] as const,
  stats: () => [...allowlistKeys.all, 'stats'] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface UseAllowlistOptions {
  /** Whether to enable the query */
  enabled?: boolean;
  /** Refetch interval in milliseconds (0 = disabled) */
  refetchInterval?: number;
}

export interface UseAllowlistResult {
  /** List of allowlist entries */
  entries: DeviceAllowlistEntry[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether a background refetch is in progress */
  isFetching: boolean;
  /** Error from the last query */
  error: Error | null;
  /** User-friendly error message */
  errorMessage: string | null;
  /** Refetch the allowlist */
  refetch: () => void;
  /** Stats from entries */
  stats: {
    total: number;
    used: number;
    available: number;
  };
}

export interface AllowlistMutations {
  /** Add a new entry to the allowlist */
  addEntry: {
    mutate: (request: AllowlistEntryRequest) => void;
    mutateAsync: (request: AllowlistEntryRequest) => Promise<DeviceAllowlistEntry>;
    isPending: boolean;
    error: Error | null;
  };
  /** Update an existing entry */
  updateEntry: {
    mutate: (args: { mac: string; updates: Partial<AllowlistEntryRequest> }) => void;
    mutateAsync: (args: {
      mac: string;
      updates: Partial<AllowlistEntryRequest>;
    }) => Promise<DeviceAllowlistEntry>;
    isPending: boolean;
    error: Error | null;
  };
  /** Remove an entry from the allowlist */
  removeEntry: {
    mutate: (mac: string) => void;
    mutateAsync: (mac: string) => Promise<void>;
    isPending: boolean;
    error: Error | null;
  };
  /** Check if any mutation is in progress */
  isAnyPending: boolean;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for fetching and managing the device allowlist.
 *
 * @param options - Query options
 * @returns Allowlist data and query state
 */
export function useAllowlist(options: UseAllowlistOptions = {}): UseAllowlistResult {
  const { enabled = true, refetchInterval = 0 } = options;

  const query = useQuery({
    queryKey: allowlistKeys.list(),
    queryFn: async () => {
      const result = await allowlistApi.list();
      return result.data;
    },
    enabled,
    refetchInterval: refetchInterval > 0 ? refetchInterval : false,
    staleTime: 30000, // 30 seconds
  });

  // Defensive: ensure entries is always an array even if API returns unexpected data
  const rawEntries = query.data?.entries;
  const entries = Array.isArray(rawEntries) ? rawEntries : [];

  // Calculate stats from entries
  const stats = {
    total: entries.length,
    used: entries.filter((e) => e.used).length,
    available: entries.filter((e) => !e.used).length,
  };

  // Extract user-friendly error message
  let errorMessage: string | null = null;
  if (query.error) {
    errorMessage =
      query.error instanceof V1ApiError
        ? query.error.userMessage
        : query.error.message || 'Failed to load allowlist';
  }

  return {
    entries,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    errorMessage,
    refetch: query.refetch,
    stats,
  };
}

/**
 * Hook for allowlist mutation operations.
 *
 * Provides:
 * - addEntry: Add a new device to the allowlist
 * - updateEntry: Update an existing entry
 * - removeEntry: Remove a device from the allowlist
 *
 * All mutations use optimistic updates and automatic cache invalidation.
 */
export function useAllowlistMutations(): AllowlistMutations {
  const queryClient = useQueryClient();

  // Add entry mutation
  const addMutation = useMutation({
    mutationFn: async (request: AllowlistEntryRequest) => {
      const result = await allowlistApi.add(request);
      return result.data.entry;
    },
    onMutate: async (newEntry) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: allowlistKeys.list() });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AllowlistData>(allowlistKeys.list());

      // Optimistically update cache
      queryClient.setQueryData<AllowlistData>(allowlistKeys.list(), (old) => {
        if (!old) return { entries: [] };
        const optimisticEntry: DeviceAllowlistEntry = {
          mac: newEntry.mac,
          description: newEntry.description,
          container_id: newEntry.container_id,
          added_at: new Date().toISOString(),
          used: false,
        };
        return {
          entries: [...old.entries, optimisticEntry],
        };
      });

      return { previousData };
    },
    onError: (_err, _newEntry, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(allowlistKeys.list(), context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: allowlistKeys.list() });
    },
  });

  // Update entry mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      mac,
      updates,
    }: {
      mac: string;
      updates: Partial<AllowlistEntryRequest>;
    }) => {
      const result = await allowlistApi.update(mac, updates);
      return result.data.entry;
    },
    onMutate: async ({ mac, updates }) => {
      await queryClient.cancelQueries({ queryKey: allowlistKeys.list() });

      const previousData = queryClient.getQueryData<AllowlistData>(allowlistKeys.list());

      queryClient.setQueryData<AllowlistData>(allowlistKeys.list(), (old) => {
        if (!old) return { entries: [] };
        return {
          entries: old.entries.map((entry) =>
            entry.mac === mac ? { ...entry, ...updates } : entry
          ),
        };
      });

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(allowlistKeys.list(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: allowlistKeys.list() });
    },
  });

  // Remove entry mutation
  const removeMutation = useMutation({
    mutationFn: async (mac: string) => {
      await allowlistApi.remove(mac);
    },
    onMutate: async (mac) => {
      await queryClient.cancelQueries({ queryKey: allowlistKeys.list() });

      const previousData = queryClient.getQueryData<AllowlistData>(allowlistKeys.list());

      queryClient.setQueryData<AllowlistData>(allowlistKeys.list(), (old) => {
        if (!old) return { entries: [] };
        return {
          entries: old.entries.filter((entry) => entry.mac !== mac),
        };
      });

      return { previousData };
    },
    onError: (_err, _mac, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(allowlistKeys.list(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: allowlistKeys.list() });
    },
  });

  return {
    addEntry: {
      mutate: addMutation.mutate,
      mutateAsync: addMutation.mutateAsync,
      isPending: addMutation.isPending,
      error: addMutation.error,
    },
    updateEntry: {
      mutate: updateMutation.mutate,
      mutateAsync: updateMutation.mutateAsync,
      isPending: updateMutation.isPending,
      error: updateMutation.error,
    },
    removeEntry: {
      mutate: removeMutation.mutate,
      mutateAsync: removeMutation.mutateAsync,
      isPending: removeMutation.isPending,
      error: removeMutation.error,
    },
    isAnyPending:
      addMutation.isPending || updateMutation.isPending || removeMutation.isPending,
  };
}

/**
 * Combined hook for allowlist data and mutations.
 *
 * @param options - Query options
 * @returns Allowlist data, mutations, and query state
 */
export function useAllowlistWithMutations(options: UseAllowlistOptions = {}) {
  const allowlist = useAllowlist(options);
  const mutations = useAllowlistMutations();

  return {
    ...allowlist,
    ...mutations,
  };
}
