/**
 * Sessions API Client - Real Ops Drilldown
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Provides session listing from PiOrchestrator V1 diagnostics endpoint.
 * Sessions represent vending machine operation cycles.
 */

import { apiClient, isFeatureUnavailable } from './client';
import {
  SessionListResponseSchema,
  type Session,
  type SessionWithStale,
} from './diagnostics-schemas';
import { safeParseWithErrors } from './schemas';

/**
 * Stale threshold: 300 seconds (5 minutes) per spec FR-009
 */
const STALE_THRESHOLD_SECONDS = 300;

/**
 * Derive is_stale flag from elapsed_seconds for active sessions.
 * Only active sessions can be stale — completed/failed/partial are not.
 */
function addStaleFlag(session: Session): SessionWithStale {
  return {
    ...session,
    is_stale: session.status === 'active' && session.elapsed_seconds > STALE_THRESHOLD_SECONDS,
  };
}

/**
 * Sort sessions by started_at (most recent first)
 */
function sortByMostRecent(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    const dateA = new Date(a.started_at).getTime();
    const dateB = new Date(b.started_at).getTime();
    return dateB - dateA;
  });
}

interface ListSessionsOptions {
  status?: 'active' | 'complete' | 'partial' | 'failed' | 'all';
  limit?: number;
}

/**
 * Sessions API client
 */
export const sessionsApi = {
  /**
   * List sessions from PiOrchestrator V1 endpoint.
   * V1 endpoint does not support server-side status filtering — filter client-side.
   */
  listSessions: async (options: ListSessionsOptions = {}): Promise<SessionWithStale[]> => {
    try {
      // Spec 084: Port 8082 read-only endpoint is /v1/sessions
      // Falls back to /v1/diagnostics/sessions (port 8081) if first fails
      let response: unknown;
      try {
        response = await apiClient.get<unknown>('/v1/sessions');
      } catch {
        response = await apiClient.get<unknown>('/v1/diagnostics/sessions');
      }

      const parsed = safeParseWithErrors(SessionListResponseSchema, response);

      if (!parsed.success) {
        console.warn('Sessions list response validation failed:', parsed.errors);
        return [];
      }

      if (!parsed.data.success || !parsed.data.data?.sessions) {
        return [];
      }

      let sessions = parsed.data.data.sessions;

      // Client-side status filtering (V1 endpoint returns all sessions)
      if (options.status && options.status !== 'all') {
        sessions = sessions.filter((s) => s.status === options.status);
      }

      // Apply limit
      if (options.limit) {
        sessions = sessions.slice(0, options.limit);
      }

      const sortedSessions = sortByMostRecent(sessions);
      return sortedSessions.map(addStaleFlag);
    } catch (error) {
      if (isFeatureUnavailable(error)) {
        return [];
      }

      console.error('Failed to fetch sessions:', error);
      throw error;
    }
  },

  /**
   * Get session details by ID.
   * No dedicated detail endpoint exists — filters from list by session_id.
   */
  getSession: async (sessionId: string): Promise<SessionWithStale | null> => {
    try {
      let response: unknown;
      try {
        response = await apiClient.get<unknown>('/v1/sessions');
      } catch {
        response = await apiClient.get<unknown>('/v1/diagnostics/sessions');
      }

      const parsed = safeParseWithErrors(SessionListResponseSchema, response);

      if (!parsed.success) {
        console.warn('Session detail response validation failed:', parsed.errors);
        return null;
      }

      if (!parsed.data.success || !parsed.data.data?.sessions) {
        return null;
      }

      const session = parsed.data.data.sessions.find((s) => s.session_id === sessionId);
      if (!session) {
        return null;
      }

      return addStaleFlag(session);
    } catch (error) {
      if (isFeatureUnavailable(error)) {
        return null;
      }

      console.error('Failed to fetch session:', error);
      throw error;
    }
  },
};

/**
 * Export stale threshold for use in components and tests
 */
export { STALE_THRESHOLD_SECONDS };

// ============================================================================
// Session Recovery API (Provisioning)
// Consolidated from deleted session-recovery.ts
// Feature: 006-piorchestrator-v1-api-sync
// ============================================================================

import type {
  BatchProvisioningSession,
  RecoverableSessionsData,
  SessionData,
} from '@/domain/types/provisioning';
import type { V1Result } from '@/domain/types/v1-api';
import { v1Get, v1Post, v1Delete } from './v1-client';
import {
  RecoverableSessionsDataSchema,
  SessionDataSchema,
} from './schemas';

async function getRecoverableSessions(): Promise<V1Result<RecoverableSessionsData>> {
  return v1Get<RecoverableSessionsData>('/provisioning/sessions/recoverable', {
    requiresAuth: true,
    schema: RecoverableSessionsDataSchema,
  });
}

async function resumeSession(sessionId: string): Promise<V1Result<SessionData>> {
  return v1Post<SessionData>(
    `/provisioning/sessions/${sessionId}/resume`,
    undefined,
    {
      requiresAuth: true,
      schema: SessionDataSchema,
    }
  );
}

async function discardSession(sessionId: string): Promise<V1Result<{ message: string }>> {
  return v1Delete<{ message: string }>(
    `/provisioning/sessions/${sessionId}`,
    {
      requiresAuth: true,
    }
  );
}

async function getSessionHistory(
  limit = 10
): Promise<V1Result<{ sessions: BatchProvisioningSession[] }>> {
  return v1Get<{ sessions: BatchProvisioningSession[] }>(
    `/provisioning/sessions/history?limit=${limit}`,
    {
      requiresAuth: true,
    }
  );
}

async function clearOldSessions(
  olderThanDays = 7
): Promise<V1Result<{ cleared: number; message: string }>> {
  return v1Delete<{ cleared: number; message: string }>(
    `/provisioning/sessions/history?older_than_days=${olderThanDays}`,
    {
      requiresAuth: true,
    }
  );
}

async function hasRecoverableSessions(): Promise<boolean> {
  try {
    const result = await getRecoverableSessions();
    return (result.data.sessions ?? []).length > 0;
  } catch {
    return false;
  }
}

async function getMostRecentRecoverable(): Promise<BatchProvisioningSession | null> {
  try {
    const result = await getRecoverableSessions();
    const sessions = result.data.sessions ?? [];
    if (sessions.length === 0) {
      return null;
    }
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    return sorted[0];
  } catch {
    return null;
  }
}

/**
 * Session recovery API service.
 * Provides all session recovery and history operations.
 */
export const sessionRecoveryApi = {
  getRecoverableSessions,
  resumeSession,
  discardSession,
  getSessionHistory,
  clearOldSessions,
  hasRecoverableSessions,
  getMostRecentRecoverable,
} as const;
