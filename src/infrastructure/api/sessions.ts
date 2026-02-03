/**
 * Sessions API Client - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Provides session listing and detail functions for BridgeServer sessions.
 * Sessions represent purchase/evidence capture sessions.
 */

import { apiClient, buildUrl, isFeatureUnavailable } from './client';
import {
  SessionListResponseSchema,
  SessionDetailResponseSchema,
  type Session,
  type SessionWithStale,
} from './diagnostics-schemas';
import { safeParseWithErrors } from './schemas';

/**
 * Stale capture threshold: 5 minutes (per spec FR-009)
 */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Calculate if a capture is stale
 */
function isStaleCapture(lastCaptureAt: string | undefined): boolean {
  if (!lastCaptureAt) return false;
  const lastCapture = new Date(lastCaptureAt).getTime();
  return Date.now() - lastCapture > STALE_THRESHOLD_MS;
}

/**
 * Add is_stale derived field to session
 */
function addStaleFlag(session: Session): SessionWithStale {
  return {
    ...session,
    is_stale: isStaleCapture(session.last_capture_at),
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
  status?: 'active' | 'completed' | 'cancelled' | 'all';
  limit?: number;
}

/**
 * Sessions API client
 */
export const sessionsApi = {
  /**
   * List sessions from BridgeServer
   */
  listSessions: async (options: ListSessionsOptions = {}): Promise<SessionWithStale[]> => {
    try {
      const endpoint = buildUrl('/dashboard/diagnostics/sessions', {
        status: options.status || 'active',
        limit: options.limit || 50,
      });

      const response = await apiClient.get<unknown>(endpoint);

      const parsed = safeParseWithErrors(SessionListResponseSchema, response);

      if (!parsed.success) {
        console.warn('Sessions list response validation failed:', parsed.errors);
        return [];
      }

      if (!parsed.data.success || !parsed.data.data?.sessions) {
        return [];
      }

      const sortedSessions = sortByMostRecent(parsed.data.data.sessions);
      return sortedSessions.map(addStaleFlag);
    } catch (error) {
      // Graceful degradation for unavailable endpoints
      if (isFeatureUnavailable(error)) {
        return [];
      }

      console.error('Failed to fetch sessions:', error);
      throw error;
    }
  },

  /**
   * Get session details by ID
   */
  getSession: async (sessionId: string): Promise<SessionWithStale | null> => {
    try {
      const response = await apiClient.get<unknown>(`/dashboard/diagnostics/sessions/${sessionId}`);

      const parsed = safeParseWithErrors(SessionDetailResponseSchema, response);

      if (!parsed.success) {
        console.warn('Session detail response validation failed:', parsed.errors);
        return null;
      }

      if (!parsed.data.success || !parsed.data.data) {
        return null;
      }

      return addStaleFlag(parsed.data.data);
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
 * Export stale capture utility for use in components
 */
export { isStaleCapture, STALE_THRESHOLD_MS };

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
