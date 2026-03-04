/**
 * Session Proto → Domain Adapter
 * Feature: 062-piorch-grpc-client
 *
 * Converts proto OperationSession (camelCase, enum numbers, Timestamp)
 * to domain Session type (snake_case, string enums, ISO strings).
 */

import type { OperationSession } from '@delicasa/wire/gen/delicasa/device/v1/session_pb';
import { SessionStatus } from '@delicasa/wire/gen/delicasa/device/v1/session_pb';
import type { Session, SessionWithStale } from '@/infrastructure/api/diagnostics-schemas';

const STALE_THRESHOLD_SECONDS = 300;

const SESSION_STATUS_MAP: Record<number, Session['status']> = {
  [SessionStatus.ACTIVE]: 'active',
  [SessionStatus.COMPLETE]: 'complete',
  [SessionStatus.PARTIAL]: 'partial',
  [SessionStatus.FAILED]: 'failed',
};

/**
 * Convert proto Timestamp to ISO string.
 * protobuf-es v2 Timestamps have { seconds: bigint, nanos: number }.
 */
function timestampToIso(ts: { seconds: bigint; nanos: number } | undefined): string {
  if (!ts) return new Date(0).toISOString();
  const ms = Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1_000_000);
  return new Date(ms).toISOString();
}

/**
 * Convert a single proto OperationSession to domain Session type.
 */
export function adaptSession(proto: OperationSession): Session {
  return {
    session_id: proto.sessionId,
    container_id: proto.containerId,
    started_at: timestampToIso(proto.startedAt),
    status: SESSION_STATUS_MAP[proto.status] ?? 'active',
    total_captures: proto.totalCaptures,
    successful_captures: proto.successfulCaptures,
    failed_captures: proto.failedCaptures,
    has_before_open: proto.hasBeforeOpen,
    has_after_close: proto.hasAfterClose,
    pair_complete: proto.pairComplete,
    elapsed_seconds: Math.floor(proto.elapsedSeconds),
  };
}

/**
 * Convert proto OperationSession to domain SessionWithStale.
 * Adds client-derived is_stale flag for active sessions.
 */
export function adaptSessionWithStale(proto: OperationSession): SessionWithStale {
  const session = adaptSession(proto);
  return {
    ...session,
    is_stale: session.status === 'active' && session.elapsed_seconds > STALE_THRESHOLD_SECONDS,
  };
}

/**
 * Convert and sort a list of proto sessions (most recent first).
 */
export function adaptSessionList(protos: OperationSession[]): SessionWithStale[] {
  return protos
    .map(adaptSessionWithStale)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}
