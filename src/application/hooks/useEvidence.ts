/**
 * Evidence Hooks - DEV Observability Panels + Camera Diagnostics
 * Features: 038-dev-observability-panels, 042-diagnostics-integration
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
  limit?: number;
  enabled?: boolean;
  pollingInterval?: number;
}

/**
 * Hook for fetching evidence captures for a session
 *
 * @param sessionId - The session ID to fetch evidence for
 * @param options - Query options
 */
export function useSessionEvidence(
  sessionId: string | null,
  options: UseSessionEvidenceOptions = {}
) {
  const {
    limit = 50,
    enabled = true,
    pollingInterval = EVIDENCE_POLLING_INTERVAL,
  } = options;

  return useQuery({
    queryKey: queryKeys.diagnosticsEvidence(sessionId || ''),
    queryFn: () => (sessionId ? evidenceApi.listSessionEvidence(sessionId, { limit }) : []),
    enabled: enabled && !!sessionId,
    refetchInterval: pollingInterval,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for refreshing presigned URL when expired
 */
export function useRefreshPresignedUrl() {
  return {
    refreshUrl: async (imageKey: string): Promise<string | null> => {
      const result = await evidenceApi.refreshPresignedUrl(imageKey);
      return result?.url ?? null;
    },
    isUrlExpired: (expiresAt: string, thresholdMs?: number) =>
      evidenceApi.isUrlExpired(expiresAt, thresholdMs),
  };
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
 * Hook utilities for evidence download
 */
export function useEvidenceDownload() {
  return {
    /** Convert evidence to blob for download */
    toBlob: evidenceApi.toBlob,
    /** Get formatted filename for evidence */
    getFilename: evidenceApi.getFilename,
    /** Trigger browser download of evidence */
    download: evidenceApi.download,
  };
}
