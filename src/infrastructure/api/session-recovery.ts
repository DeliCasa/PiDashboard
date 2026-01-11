/**
 * Session Recovery API Service
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * API client for session recovery endpoints.
 * Enables field technicians to resume interrupted provisioning sessions.
 */

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

// Note: Response schemas for validation are defined in schemas.ts
// This service uses the SessionDataSchema for session responses

// ============================================================================
// Recovery Operations
// ============================================================================

/**
 * Get all recoverable (interrupted) sessions.
 *
 * A session is recoverable if:
 * - It is in 'active' or 'paused' state
 * - It has not expired
 * - It was interrupted (e.g., browser closed, network error)
 *
 * @returns List of recoverable sessions
 */
export async function getRecoverableSessions(): Promise<
  V1Result<RecoverableSessionsData>
> {
  return v1Get<RecoverableSessionsData>('/provisioning/sessions/recoverable', {
    requiresAuth: true,
    schema: RecoverableSessionsDataSchema,
  });
}

/**
 * Resume a recoverable session.
 *
 * This reconnects to the session and restores the device list and state.
 *
 * @param sessionId - The session ID to resume
 * @returns Recovered session with devices
 */
export async function resumeSession(
  sessionId: string
): Promise<V1Result<SessionData>> {
  return v1Post<SessionData>(
    `/provisioning/sessions/${sessionId}/resume`,
    undefined,
    {
      requiresAuth: true,
      schema: SessionDataSchema,
    }
  );
}

/**
 * Discard a recoverable session.
 *
 * This marks the session as closed and prevents further recovery.
 * Use when the session is no longer needed.
 *
 * @param sessionId - The session ID to discard
 * @returns Confirmation message
 */
export async function discardSession(
  sessionId: string
): Promise<V1Result<{ message: string }>> {
  return v1Delete<{ message: string }>(
    `/provisioning/sessions/${sessionId}`,
    {
      requiresAuth: true,
    }
  );
}

/**
 * Get session history (recent sessions, both active and closed).
 *
 * @param limit - Maximum number of sessions to return (default: 10)
 * @returns List of recent sessions
 */
export async function getSessionHistory(
  limit = 10
): Promise<V1Result<{ sessions: BatchProvisioningSession[] }>> {
  return v1Get<{ sessions: BatchProvisioningSession[] }>(
    `/provisioning/sessions/history?limit=${limit}`,
    {
      requiresAuth: true,
    }
  );
}

/**
 * Clear old session history.
 *
 * Removes closed sessions older than the specified number of days.
 *
 * @param olderThanDays - Remove sessions older than this many days (default: 7)
 * @returns Number of sessions cleared
 */
export async function clearOldSessions(
  olderThanDays = 7
): Promise<V1Result<{ cleared: number; message: string }>> {
  return v1Delete<{ cleared: number; message: string }>(
    `/provisioning/sessions/history?older_than_days=${olderThanDays}`,
    {
      requiresAuth: true,
    }
  );
}

// ============================================================================
// Session State Helpers
// ============================================================================

/**
 * Check if there are any recoverable sessions.
 *
 * @returns true if there are sessions that can be recovered
 */
export async function hasRecoverableSessions(): Promise<boolean> {
  try {
    const result = await getRecoverableSessions();
    return result.data.sessions.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the most recent recoverable session.
 *
 * @returns The most recent recoverable session, or null if none
 */
export async function getMostRecentRecoverable(): Promise<BatchProvisioningSession | null> {
  try {
    const result = await getRecoverableSessions();
    if (result.data.sessions.length === 0) {
      return null;
    }
    // Sort by updated_at descending and return the first
    const sorted = [...result.data.sessions].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    return sorted[0];
  } catch {
    return null;
  }
}

// ============================================================================
// Bundled API Object
// ============================================================================

/**
 * Session recovery API service.
 * Provides all session recovery and history operations.
 */
export const sessionRecoveryApi = {
  // Recovery operations
  getRecoverableSessions,
  resumeSession,
  discardSession,

  // History operations
  getSessionHistory,
  clearOldSessions,

  // Helpers
  hasRecoverableSessions,
  getMostRecentRecoverable,
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type { BatchProvisioningSession, RecoverableSessionsData, SessionData };
