/**
 * Evidence Hooks - Real Ops Drilldown + Camera Diagnostics
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 * Feature: 042-diagnostics-integration (camera evidence capture)
 *
 * React Query hooks for evidence capture data and camera evidence capture.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evidenceApi } from '@/infrastructure/api/evidence';
import { queryKeys } from '@/lib/queryClient';

/**
 * Default polling interval for evidence (10 seconds)
 */
const EVIDENCE_POLLING_INTERVAL = 10000;

interface UseSessionEvidenceOptions {
  enabled?: boolean;
  pollingInterval?: number;
}

/**
 * Hook for fetching evidence captures for a session (V1 format).
 * Returns CaptureEntry[] sorted by created_at.
 *
 * @param sessionId - The session ID to fetch evidence for
 * @param options - Query options
 */
export function useSessionEvidence(
  sessionId: string | null,
  options: UseSessionEvidenceOptions = {}
) {
  const {
    enabled = true,
    pollingInterval = EVIDENCE_POLLING_INTERVAL,
  } = options;

  return useQuery({
    queryKey: queryKeys.diagnosticsEvidence(sessionId || ''),
    queryFn: () => (sessionId ? evidenceApi.listSessionEvidence(sessionId) : []),
    enabled: enabled && !!sessionId,
    refetchInterval: pollingInterval,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching evidence pair (structured before/after) for a session.
 * Polls every 10 seconds for active sessions awaiting pair completion.
 *
 * @param sessionId - The session ID
 * @param options - Query options
 */
export function useEvidencePair(
  sessionId: string | null,
  options: UseSessionEvidenceOptions = {}
) {
  const {
    enabled = true,
    pollingInterval = EVIDENCE_POLLING_INTERVAL,
  } = options;

  return useQuery({
    queryKey: [...queryKeys.diagnosticsEvidence(sessionId || ''), 'pair'],
    queryFn: () => (sessionId ? evidenceApi.getEvidencePair(sessionId) : null),
    enabled: enabled && !!sessionId,
    refetchInterval: pollingInterval,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for invalidating evidence cache
 */
export function useInvalidateEvidence() {
  const queryClient = useQueryClient();

  return {
    invalidate: (sessionId?: string) => {
      if (sessionId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.diagnosticsEvidence(sessionId),
        });
      }
      return queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'diagnostics' && query.queryKey[1] === 'evidence',
      });
    },
  };
}

// ============================================================================
// Feature 042: Camera Evidence Capture
// ============================================================================

import type { CapturedEvidence, CaptureEvidenceRequest } from '@/domain/types/camera-diagnostics';

interface UseEvidenceCaptureOptions {
  /** Callback on successful capture */
  onSuccess?: (evidence: CapturedEvidence) => void;
  /** Callback on capture error */
  onError?: (error: Error) => void;
  /** Session ID to invalidate after capture */
  sessionId?: string;
}

/**
 * Hook for capturing evidence from a camera
 *
 * @param cameraId - Camera ID in format espcam-XXXXXX
 * @param options - Mutation options
 */
export function useEvidenceCapture(
  cameraId: string,
  options: UseEvidenceCaptureOptions = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, sessionId } = options;

  return useMutation<CapturedEvidence, Error, CaptureEvidenceRequest | undefined>({
    mutationFn: (request) => evidenceApi.captureFromCamera(cameraId, request),
    onSuccess: (data) => {
      // Invalidate evidence cache for the session
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.diagnosticsEvidence(sessionId),
        });
      }
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error);
    },
  });
}

/**
 * Hook utilities for evidence download.
 * Supports both CapturedEvidence (camera capture) and CaptureEntry (session evidence).
 */
export function useEvidenceDownload() {
  return {
    /** Convert CapturedEvidence to blob for download */
    toBlob: evidenceApi.toBlob,
    /** Get formatted filename for CapturedEvidence */
    getFilename: evidenceApi.getFilename,
    /** Trigger browser download of CapturedEvidence */
    download: evidenceApi.download,
    /** Trigger browser download of CaptureEntry (session evidence) */
    downloadCapture: evidenceApi.downloadCapture,
  };
}
