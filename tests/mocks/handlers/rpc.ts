/**
 * MSW Handlers for Connect RPC Endpoints
 * Feature: 062-piorch-grpc-client
 *
 * Intercepts Connect protocol POST requests for session, evidence, and camera RPCs.
 * Returns proto3 JSON format (camelCase fields, string enums, ISO timestamps).
 */

import { http, HttpResponse, delay } from 'msw';
import type { Session, CaptureEntry } from '@/infrastructure/api/diagnostics-schemas';
import type { Camera } from '@/infrastructure/api/v1-cameras-schemas';

const RPC_BASE = '/rpc/delicasa.device.v1';

// ============================================================================
// Proto JSON Conversion Helpers
// ============================================================================

const SESSION_STATUS_TO_PROTO: Record<string, string> = {
  active: 'SESSION_STATUS_ACTIVE',
  complete: 'SESSION_STATUS_COMPLETE',
  partial: 'SESSION_STATUS_PARTIAL',
  failed: 'SESSION_STATUS_FAILED',
};

const CAPTURE_TAG_TO_PROTO: Record<string, string> = {
  BEFORE_OPEN: 'CAPTURE_TAG_BEFORE_OPEN',
  AFTER_OPEN: 'CAPTURE_TAG_AFTER_OPEN',
  BEFORE_CLOSE: 'CAPTURE_TAG_BEFORE_CLOSE',
  AFTER_CLOSE: 'CAPTURE_TAG_AFTER_CLOSE',
};

const CAPTURE_STATUS_TO_PROTO: Record<string, string> = {
  captured: 'CAPTURE_STATUS_CAPTURED',
  failed: 'CAPTURE_STATUS_FAILED',
  timeout: 'CAPTURE_STATUS_TIMEOUT',
};

const CAMERA_STATUS_TO_PROTO: Record<string, string> = {
  online: 'CAMERA_STATUS_ONLINE',
  offline: 'CAMERA_STATUS_OFFLINE',
  idle: 'CAMERA_STATUS_IDLE',
  error: 'CAMERA_STATUS_ERROR',
  rebooting: 'CAMERA_STATUS_REBOOTING',
  discovered: 'CAMERA_STATUS_DISCOVERED',
  pairing: 'CAMERA_STATUS_PAIRING',
  connecting: 'CAMERA_STATUS_CONNECTING',
};

function sessionToProto(session: Session) {
  return {
    sessionId: session.session_id,
    containerId: session.container_id,
    startedAt: session.started_at,
    status: SESSION_STATUS_TO_PROTO[session.status] || 'SESSION_STATUS_UNSPECIFIED',
    totalCaptures: session.total_captures,
    successfulCaptures: session.successful_captures,
    failedCaptures: session.failed_captures,
    hasBeforeOpen: session.has_before_open,
    hasAfterClose: session.has_after_close,
    pairComplete: session.pair_complete,
    elapsedSeconds: session.elapsed_seconds,
  };
}

function captureToProto(capture: CaptureEntry) {
  return {
    evidenceId: capture.evidence_id,
    captureTag: CAPTURE_TAG_TO_PROTO[capture.capture_tag] || 'CAPTURE_TAG_UNSPECIFIED',
    status: CAPTURE_STATUS_TO_PROTO[capture.status] || 'CAPTURE_STATUS_UNSPECIFIED',
    cameraId: capture.device_id,
    containerId: capture.container_id,
    sessionId: capture.session_id,
    capturedAt: capture.created_at,
    contentType: capture.content_type || '',
    imageSizeBytes: capture.image_size_bytes ? String(capture.image_size_bytes) : '0',
    objectKey: capture.object_key || '',
    uploadStatus: capture.upload_status || '',
  };
}

function cameraToProto(camera: Camera) {
  return {
    deviceId: camera.id,
    name: camera.name,
    status: CAMERA_STATUS_TO_PROTO[camera.status] || 'CAMERA_STATUS_UNSPECIFIED',
    // Omit Timestamp fields when empty — proto3 JSON rejects empty strings
    ...(camera.lastSeen ? { lastSeen: camera.lastSeen } : {}),
    health: camera.health
      ? {
          wifiRssi: camera.health.wifi_rssi,
          freeHeap: camera.health.free_heap ? String(camera.health.free_heap) : '0',
          uptimeSeconds: camera.health.uptime_seconds
            ? String(camera.health.uptime_seconds)
            : '0',
          firmwareVersion: camera.health.firmware_version || '',
          resolution: camera.health.resolution || '',
          // Omit Timestamp fields when empty — proto3 JSON rejects empty strings
          ...(camera.health.last_capture ? { lastCapture: camera.health.last_capture } : {}),
        }
      : undefined,
    ipAddress: camera.ip_address || '',
    macAddress: camera.mac_address || '',
  };
}

// ============================================================================
// Session RPC Handlers
// ============================================================================

export function createRpcSessionHandlers(sessions: Session[]) {
  return [
    http.post(`${RPC_BASE}.SessionService/ListSessions`, async () => {
      await delay(75);
      return HttpResponse.json({
        sessions: sessions.map(sessionToProto),
      });
    }),

    http.post(`${RPC_BASE}.SessionService/GetSession`, async ({ request }) => {
      await delay(50);
      const body = (await request.json()) as { sessionId?: string };
      const session = sessions.find((s) => s.session_id === body.sessionId);

      return HttpResponse.json({
        session: session ? sessionToProto(session) : undefined,
      });
    }),
  ];
}

// ============================================================================
// Evidence RPC Handlers
// ============================================================================

export function createRpcEvidenceHandlers(
  captures: CaptureEntry[],
  sessions: Session[]
) {
  return [
    http.post(
      `${RPC_BASE}.EvidenceService/GetSessionEvidence`,
      async ({ request }) => {
        await delay(75);
        const body = (await request.json()) as { sessionId?: string };
        const sessionCaptures = captures.filter(
          (c) => c.session_id === body.sessionId
        );

        return HttpResponse.json({
          captures: sessionCaptures.map(captureToProto),
        });
      }
    ),

    http.post(
      `${RPC_BASE}.EvidenceService/GetEvidencePair`,
      async ({ request }) => {
        await delay(50);
        const body = (await request.json()) as { sessionId?: string };
        const sessionCaptures = captures.filter(
          (c) => c.session_id === body.sessionId
        );

        const before = sessionCaptures.find(
          (c) => c.capture_tag === 'BEFORE_OPEN'
        );
        const after = sessionCaptures.find(
          (c) => c.capture_tag === 'AFTER_CLOSE'
        );

        const pairStatus =
          before && after
            ? 'EVIDENCE_PAIR_STATUS_COMPLETE'
            : before || after
              ? 'EVIDENCE_PAIR_STATUS_INCOMPLETE'
              : 'EVIDENCE_PAIR_STATUS_MISSING';

        const session = sessions.find(
          (s) => s.session_id === body.sessionId
        );

        return HttpResponse.json({
          pair: {
            sessionId: body.sessionId,
            containerId: session?.container_id || '',
            pairStatus,
            before: before ? captureToProto(before) : undefined,
            after: after ? captureToProto(after) : undefined,
            queriedAt: new Date().toISOString(),
          },
        });
      }
    ),
  ];
}

// ============================================================================
// Camera RPC Handlers
// ============================================================================

export function createRpcCameraHandlers(cameras: Camera[]) {
  return [
    http.post(`${RPC_BASE}.CameraService/ListCameras`, async () => {
      await delay(100);
      return HttpResponse.json({
        cameras: cameras.map(cameraToProto),
      });
    }),

    http.post(
      `${RPC_BASE}.CameraService/GetCamera`,
      async ({ request }) => {
        await delay(75);
        const body = (await request.json()) as { deviceId?: string };
        const camera = cameras.find((c) => c.id === body.deviceId);

        return HttpResponse.json({
          camera: camera ? cameraToProto(camera) : undefined,
        });
      }
    ),
  ];
}

// ============================================================================
// RPC Error Helpers
// ============================================================================

function connectError(code: string, message: string, httpStatus: number) {
  return HttpResponse.json({ code, message }, { status: httpStatus });
}

export const rpcErrorHandlers = {
  sessionsUnavailable: [
    http.post(`${RPC_BASE}.SessionService/ListSessions`, async () => {
      await delay(50);
      return connectError('unavailable', 'Sessions endpoint not available', 503);
    }),
    http.post(`${RPC_BASE}.SessionService/GetSession`, async () => {
      await delay(50);
      return connectError('unavailable', 'Sessions endpoint not available', 503);
    }),
  ],

  sessionsEmpty: [
    http.post(`${RPC_BASE}.SessionService/ListSessions`, async () => {
      await delay(50);
      return HttpResponse.json({ sessions: [] });
    }),
  ],

  sessionNotFound: [
    http.post(`${RPC_BASE}.SessionService/GetSession`, async () => {
      await delay(50);
      return HttpResponse.json({});
    }),
    // Also handle ListSessions for tests that might call it
    http.post(`${RPC_BASE}.SessionService/ListSessions`, async () => {
      await delay(50);
      return HttpResponse.json({ sessions: [] });
    }),
  ],

  evidenceEmpty: [
    http.post(`${RPC_BASE}.EvidenceService/GetSessionEvidence`, async () => {
      await delay(50);
      return HttpResponse.json({ captures: [] });
    }),
  ],
};
