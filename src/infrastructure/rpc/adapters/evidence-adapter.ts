/**
 * Evidence Proto → Domain Adapter
 * Feature: 062-piorch-grpc-client
 *
 * Converts proto EvidencePair/EvidenceCapture to domain types.
 * Handles enum number → string mapping and Timestamp → ISO string.
 */

import type {
  EvidenceCapture,
  EvidencePair as ProtoEvidencePair,
} from '@delicasa/wire/gen/delicasa/device/v1/evidence_pb';
import {
  CaptureTag,
  CaptureStatus,
  EvidencePairStatus,
} from '@delicasa/wire/gen/delicasa/device/v1/evidence_pb';
import type {
  CaptureEntry,
  CaptureSlot,
  EvidencePair,
} from '@/infrastructure/api/diagnostics-schemas';
import type { GetSessionEvidenceResponse } from '@delicasa/wire/gen/delicasa/device/v1/evidence_service_pb';

const CAPTURE_TAG_MAP: Record<number, CaptureEntry['capture_tag']> = {
  [CaptureTag.BEFORE_OPEN]: 'BEFORE_OPEN',
  [CaptureTag.AFTER_OPEN]: 'AFTER_OPEN',
  [CaptureTag.BEFORE_CLOSE]: 'BEFORE_CLOSE',
  [CaptureTag.AFTER_CLOSE]: 'AFTER_CLOSE',
};

const CAPTURE_STATUS_MAP: Record<number, CaptureEntry['status']> = {
  [CaptureStatus.CAPTURED]: 'captured',
  [CaptureStatus.FAILED]: 'failed',
  [CaptureStatus.TIMEOUT]: 'timeout',
};

const PAIR_STATUS_MAP: Record<number, EvidencePair['pair_status']> = {
  [EvidencePairStatus.COMPLETE]: 'complete',
  [EvidencePairStatus.INCOMPLETE]: 'incomplete',
  [EvidencePairStatus.MISSING]: 'missing',
};

function timestampToIso(ts: { seconds: bigint; nanos: number } | undefined): string {
  if (!ts) return new Date(0).toISOString();
  const ms = Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1_000_000);
  return new Date(ms).toISOString();
}

/**
 * Convert proto EvidenceCapture to domain CaptureEntry.
 */
export function adaptCapture(proto: EvidenceCapture): CaptureEntry {
  return {
    evidence_id: proto.evidenceId,
    capture_tag: CAPTURE_TAG_MAP[proto.captureTag] ?? 'BEFORE_OPEN',
    status: CAPTURE_STATUS_MAP[proto.status] ?? 'captured',
    device_id: proto.cameraId,
    container_id: proto.containerId,
    session_id: proto.sessionId,
    created_at: timestampToIso(proto.capturedAt),
    content_type: proto.contentType || undefined,
    image_size_bytes: proto.imageSizeBytes ? Number(proto.imageSizeBytes) : undefined,
    object_key: proto.objectKey || undefined,
    upload_status: (proto.uploadStatus as CaptureEntry['upload_status']) || undefined,
  };
}

/**
 * Convert proto EvidenceCapture to a CaptureSlot (for evidence pairs).
 */
function adaptCaptureSlot(proto: EvidenceCapture | undefined): CaptureSlot | null {
  if (!proto) return null;
  return {
    ...adaptCapture(proto),
    captured_at: timestampToIso(proto.capturedAt),
  };
}

/**
 * Convert proto EvidencePair to domain EvidencePair.
 */
export function adaptEvidencePair(proto: ProtoEvidencePair): EvidencePair {
  return {
    contract_version: 'v1',
    session_id: proto.sessionId,
    container_id: proto.containerId,
    pair_status: PAIR_STATUS_MAP[proto.pairStatus] ?? 'missing',
    before: adaptCaptureSlot(proto.before),
    after: adaptCaptureSlot(proto.after),
    queried_at: timestampToIso(proto.queriedAt),
    retry_after_seconds: proto.retryAfterSeconds || undefined,
  };
}

/**
 * Convert GetSessionEvidenceResponse to domain CaptureEntry[].
 * Sorted by created_at (most recent first).
 */
export function adaptSessionEvidence(resp: GetSessionEvidenceResponse): CaptureEntry[] {
  return resp.captures
    .map(adaptCapture)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
