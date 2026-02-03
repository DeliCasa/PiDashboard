/**
 * Sessions Hooks - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * React Query hooks for session data polling.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '@/infrastructure/api/sessions';
import { queryKeys } from '@/lib/queryClient';

/**
 * Default polling interval for sessions (10 seconds per research.md ADR-003)
 */
const SESSIONS_POLLING_INTERVAL = 10000;

interface UseSessionsOptions {
  status?: 'active' | 'completed' | 'cancelled' | 'all';
  limit?: number;
  enabled?: boolean;
  pollingInterval?: number;
}

/**
 * Hook for fetching sessions with automatic polling
 *
 * @param options - Query options
 */
export function useSessions(options: UseSessionsOptions = {}) {
  const {
    status = 'active',
    limit = 50,
    enabled = true,
    pollingInterval = SESSIONS_POLLING_INTERVAL,
  } = options;

  return useQuery({
    queryKey: queryKeys.diagnosticsSessions({ status }),
    queryFn: () => sessionsApi.listSessions({ status, limit }),
    enabled,
    refetchInterval: pollingInterval,
    // Keep previous data while refetching for smooth UX
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching a single session by ID
 *
 * @param sessionId - The session ID to fetch
 * @param enabled - Whether to enable the query
 */
export function useSession(sessionId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.diagnosticsSessionById(sessionId || ''),
    queryFn: () => (sessionId ? sessionsApi.getSession(sessionId) : null),
    enabled: enabled && !!sessionId,
    refetchInterval: SESSIONS_POLLING_INTERVAL,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for manually refreshing sessions
 */
export function useRefreshSessions() {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      return queryClient.invalidateQueries({
        queryKey: queryKeys.diagnosticsSessions(),
      });
    },
    isRefreshing:
      queryClient.isFetching({ queryKey: queryKeys.diagnosticsSessions() }) > 0,
  };
}
