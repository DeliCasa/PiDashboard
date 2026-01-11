/**
 * useRecoverableSessions Hook
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T037
 *
 * React Query hooks for session recovery management.
 * Enables field technicians to discover and resume interrupted provisioning sessions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  BatchProvisioningSession,
  RecoverableSessionsData,
  SessionData,
} from '@/domain/types/provisioning';
import { sessionRecoveryApi } from '@/infrastructure/api/session-recovery';
import { V1ApiError } from '@/infrastructure/api/errors';

// ============================================================================
// Query Keys
// ============================================================================

export const recoveryKeys = {
  all: ['session-recovery'] as const,
  recoverable: () => [...recoveryKeys.all, 'recoverable'] as const,
  history: (limit?: number) => [...recoveryKeys.all, 'history', limit] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface UseRecoverableSessionsOptions {
  /** Whether to enable the query */
  enabled?: boolean;
  /** Refetch interval in milliseconds (0 = disabled) */
  refetchInterval?: number;
  /** Whether to refetch on window focus */
  refetchOnWindowFocus?: boolean;
}

export interface UseRecoverableSessionsResult {
  /** List of recoverable sessions */
  sessions: BatchProvisioningSession[];
  /** Whether there are any recoverable sessions */
  hasRecoverableSessions: boolean;
  /** The most recent recoverable session */
  mostRecentSession: BatchProvisioningSession | null;
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether a background refetch is in progress */
  isFetching: boolean;
  /** Error from the last query */
  error: Error | null;
  /** User-friendly error message */
  errorMessage: string | null;
  /** Refetch the recoverable sessions */
  refetch: () => void;
}

export interface RecoveryMutations {
  /** Resume a recoverable session */
  resumeSession: {
    mutate: (sessionId: string) => void;
    mutateAsync: (sessionId: string) => Promise<SessionData>;
    isPending: boolean;
    error: Error | null;
  };
  /** Discard a recoverable session */
  discardSession: {
    mutate: (sessionId: string) => void;
    mutateAsync: (sessionId: string) => Promise<void>;
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
 * Hook for fetching recoverable sessions.
 *
 * @param options - Query options
 * @returns Recoverable sessions data and query state
 */
export function useRecoverableSessions(
  options: UseRecoverableSessionsOptions = {}
): UseRecoverableSessionsResult {
  const {
    enabled = true,
    refetchInterval = 0,
    refetchOnWindowFocus = true,
  } = options;

  const query = useQuery({
    queryKey: recoveryKeys.recoverable(),
    queryFn: async () => {
      const result = await sessionRecoveryApi.getRecoverableSessions();
      return result.data;
    },
    enabled,
    refetchInterval: refetchInterval > 0 ? refetchInterval : false,
    refetchOnWindowFocus,
    staleTime: 10000, // 10 seconds - sessions can change quickly
  });

  // Defensive: ensure sessions is always an array even if API returns unexpected data
  const rawSessions = query.data?.sessions;
  const sessions = Array.isArray(rawSessions) ? rawSessions : [];

  // Sort by updated_at descending to get most recent first
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  // Extract user-friendly error message
  let errorMessage: string | null = null;
  if (query.error) {
    errorMessage =
      query.error instanceof V1ApiError
        ? query.error.userMessage
        : query.error.message || 'Failed to check for recoverable sessions';
  }

  return {
    sessions: sortedSessions,
    hasRecoverableSessions: sortedSessions.length > 0,
    mostRecentSession: sortedSessions[0] ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    errorMessage,
    refetch: query.refetch,
  };
}

/**
 * Hook for session recovery mutation operations.
 *
 * Provides:
 * - resumeSession: Resume a recoverable session
 * - discardSession: Discard a session (mark as closed)
 */
export function useRecoveryMutations(): RecoveryMutations {
  const queryClient = useQueryClient();

  // Resume session mutation
  const resumeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await sessionRecoveryApi.resumeSession(sessionId);
      return result.data;
    },
    onSuccess: () => {
      // Invalidate recoverable sessions since one was resumed
      queryClient.invalidateQueries({ queryKey: recoveryKeys.recoverable() });
    },
  });

  // Discard session mutation
  const discardMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await sessionRecoveryApi.discardSession(sessionId);
    },
    onMutate: async (sessionId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: recoveryKeys.recoverable() });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<RecoverableSessionsData>(
        recoveryKeys.recoverable()
      );

      // Optimistically remove the session from the list
      queryClient.setQueryData<RecoverableSessionsData>(
        recoveryKeys.recoverable(),
        (old) => {
          if (!old) return { sessions: [] };
          return {
            sessions: old.sessions.filter((s) => s.id !== sessionId),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _sessionId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(recoveryKeys.recoverable(), context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: recoveryKeys.recoverable() });
    },
  });

  return {
    resumeSession: {
      mutate: resumeMutation.mutate,
      mutateAsync: resumeMutation.mutateAsync,
      isPending: resumeMutation.isPending,
      error: resumeMutation.error,
    },
    discardSession: {
      mutate: discardMutation.mutate,
      mutateAsync: discardMutation.mutateAsync,
      isPending: discardMutation.isPending,
      error: discardMutation.error,
    },
    isAnyPending: resumeMutation.isPending || discardMutation.isPending,
  };
}

/**
 * Combined hook for recoverable sessions and mutations.
 *
 * @param options - Query options
 * @returns Recoverable sessions data, mutations, and query state
 */
export function useRecoverableSessionsWithMutations(
  options: UseRecoverableSessionsOptions = {}
) {
  const recoverableSessions = useRecoverableSessions(options);
  const mutations = useRecoveryMutations();

  return {
    ...recoverableSessions,
    ...mutations,
  };
}

// ============================================================================
// Session History Hook
// ============================================================================

export interface UseSessionHistoryOptions {
  /** Maximum number of sessions to return */
  limit?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseSessionHistoryResult {
  /** List of historical sessions */
  sessions: BatchProvisioningSession[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether a background refetch is in progress */
  isFetching: boolean;
  /** Error from the last query */
  error: Error | null;
  /** Refetch the session history */
  refetch: () => void;
}

/**
 * Hook for fetching session history.
 *
 * @param options - Query options
 * @returns Session history data and query state
 */
export function useSessionHistory(
  options: UseSessionHistoryOptions = {}
): UseSessionHistoryResult {
  const { limit = 10, enabled = true } = options;

  const query = useQuery({
    queryKey: recoveryKeys.history(limit),
    queryFn: async () => {
      const result = await sessionRecoveryApi.getSessionHistory(limit);
      return result.data;
    },
    enabled,
    staleTime: 30000, // 30 seconds
  });

  // Defensive: ensure sessions is always an array
  const rawSessions = query.data?.sessions;
  const sessions = Array.isArray(rawSessions) ? rawSessions : [];

  return {
    sessions,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
