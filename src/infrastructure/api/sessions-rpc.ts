/**
 * Sessions RPC API Client
 * Feature: 062-piorch-grpc-client
 *
 * Replaces REST session fetching with Connect RPC calls.
 * Uses SessionService from PiOrchestrator via @delicasa/wire.
 */

import { sessionClient } from '@/infrastructure/rpc/clients';
import { adaptSessionList, adaptSessionWithStale } from '@/infrastructure/rpc/adapters/session-adapter';
import { isRpcFeatureUnavailable, mapConnectError } from '@/infrastructure/rpc/error-mapper';
import type { SessionWithStale } from './diagnostics-schemas';

const STALE_THRESHOLD_SECONDS = 300;

interface ListSessionsOptions {
  status?: 'active' | 'complete' | 'partial' | 'failed' | 'all';
  limit?: number;
}

export const sessionsRpcApi = {
  /**
   * List sessions via SessionService/ListSessions RPC.
   * Client-side filtering applied (same behavior as REST version).
   */
  listSessions: async (options: ListSessionsOptions = {}): Promise<SessionWithStale[]> => {
    try {
      const response = await sessionClient.listSessions({
        limit: options.limit ?? 50,
      });

      let sessions = adaptSessionList(response.sessions);

      // Client-side status filtering
      if (options.status && options.status !== 'all') {
        sessions = sessions.filter((s) => s.status === options.status);
      }

      // Apply limit
      if (options.limit) {
        sessions = sessions.slice(0, options.limit);
      }

      return sessions;
    } catch (error) {
      if (isRpcFeatureUnavailable(error)) {
        return [];
      }
      throw mapConnectError(error);
    }
  },

  /**
   * Get session by ID via SessionService/GetSession RPC.
   */
  getSession: async (sessionId: string): Promise<SessionWithStale | null> => {
    try {
      const response = await sessionClient.getSession({
        sessionId,
      });

      if (!response.session) {
        return null;
      }

      return adaptSessionWithStale(response.session);
    } catch (error) {
      if (isRpcFeatureUnavailable(error)) {
        return null;
      }
      throw mapConnectError(error);
    }
  },
};

export { STALE_THRESHOLD_SECONDS };
