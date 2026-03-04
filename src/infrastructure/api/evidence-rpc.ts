/**
 * Evidence RPC API Client
 * Feature: 062-piorch-grpc-client
 *
 * Replaces REST evidence fetching with Connect RPC calls.
 * Uses EvidenceService from PiOrchestrator via @delicasa/wire.
 */

import { evidenceClient } from '@/infrastructure/rpc/clients';
import { adaptEvidencePair, adaptSessionEvidence } from '@/infrastructure/rpc/adapters/evidence-adapter';
import { isRpcFeatureUnavailable, mapConnectError } from '@/infrastructure/rpc/error-mapper';
import type { CaptureEntry, EvidencePair } from './diagnostics-schemas';

export const evidenceRpcApi = {
  /**
   * Get all evidence captures for a session via EvidenceService/GetSessionEvidence.
   * Returns CaptureEntry[] sorted by created_at (most recent first).
   */
  listSessionEvidence: async (sessionId: string): Promise<CaptureEntry[]> => {
    try {
      const response = await evidenceClient.getSessionEvidence({
        sessionId,
      });

      return adaptSessionEvidence(response);
    } catch (error) {
      if (isRpcFeatureUnavailable(error)) {
        return [];
      }
      throw mapConnectError(error);
    }
  },

  /**
   * Get structured evidence pair for a session via EvidenceService/GetEvidencePair.
   */
  getEvidencePair: async (sessionId: string): Promise<EvidencePair | null> => {
    try {
      const response = await evidenceClient.getEvidencePair({
        sessionId,
      });

      if (!response.pair) {
        return null;
      }

      return adaptEvidencePair(response.pair);
    } catch (error) {
      if (isRpcFeatureUnavailable(error)) {
        return null;
      }
      throw mapConnectError(error);
    }
  },
};
