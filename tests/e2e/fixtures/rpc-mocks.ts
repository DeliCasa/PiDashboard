/**
 * RPC Mocking Utilities for Playwright E2E Tests
 * Feature: 064-post-deploy-validation
 *
 * Provides helpers for mocking Connect RPC endpoints (HTTP POST to /rpc/...).
 *
 * Factory functions are inlined here (mirroring @delicasa/wire/testing) because
 * the wire package ships TypeScript-only sources — Playwright's Node.js runtime
 * cannot import .ts files directly. Vitest can (it transpiles on the fly), but
 * Playwright E2E tests run in plain Node.js.
 */

import type { Page } from '@playwright/test';

// ============================================================================
// Helpers (from @delicasa/wire/testing/helpers)
// ============================================================================

let counter = 0;

function makeCorrelationId(): string {
  counter++;
  return `corr-test-${String(counter).padStart(3, '0')}`;
}

function makeTimestamp(date?: Date): string {
  return (date ?? new Date('2026-03-06T10:00:00Z')).toISOString();
}

function mergeDefaults<T extends Record<string, unknown>>(
  defaults: T,
  overrides?: Partial<T>,
): T {
  if (!overrides) return { ...defaults };
  const result = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete (result as Record<string, unknown>)[key];
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/** Reset the correlation ID counter between test runs. */
export function resetCorrelationCounter(): void {
  counter = 0;
}

// ============================================================================
// Session factories (from @delicasa/wire/testing/factories/session)
// ============================================================================

const OPERATION_SESSION_DEFAULTS = {
  sessionId: 'sess-test-001',
  containerId: 'ctn-test-001',
  status: 'SESSION_STATUS_COMPLETE',
  startedAt: makeTimestamp(),
  elapsedSeconds: 60.0,
  totalCaptures: 2,
  successfulCaptures: 2,
  failedCaptures: 0,
  hasBeforeOpen: true,
  hasAfterClose: true,
  pairComplete: true,
} as const;

type OperationSessionOverrides = Partial<
  Record<keyof typeof OPERATION_SESSION_DEFAULTS, unknown>
>;

export function makeOperationSession(overrides?: OperationSessionOverrides) {
  return mergeDefaults(
    { ...OPERATION_SESSION_DEFAULTS, startedAt: makeTimestamp() },
    overrides,
  );
}

export function makeListSessionsResponse(
  overrides?: Partial<{
    correlationId: string;
    sessions: ReturnType<typeof makeOperationSession>[];
    totalCount: number;
  }>,
) {
  const sessions = overrides?.sessions ?? [makeOperationSession()];
  return mergeDefaults(
    {
      correlationId: makeCorrelationId(),
      sessions,
      totalCount: sessions.length,
    },
    overrides,
  );
}

export function makeGetSessionResponse(
  overrides?: Partial<{
    correlationId: string;
    session: ReturnType<typeof makeOperationSession>;
  }>,
) {
  return mergeDefaults(
    {
      correlationId: makeCorrelationId(),
      session: makeOperationSession(),
    },
    overrides,
  );
}

// ============================================================================
// Camera factories (from @delicasa/wire/testing/factories/camera)
// ============================================================================

const CAMERA_HEALTH_DEFAULTS = {
  wifiRssi: -42,
  freeHeap: '245760',
  uptimeSeconds: '3600',
  firmwareVersion: '2.1.0',
  resolution: '1600x1200',
  lastCapture: makeTimestamp(),
} as const;

type CameraHealthOverrides = Partial<
  Record<keyof typeof CAMERA_HEALTH_DEFAULTS, unknown>
>;

export function makeCameraHealth(overrides?: CameraHealthOverrides) {
  return mergeDefaults(
    { ...CAMERA_HEALTH_DEFAULTS, lastCapture: makeTimestamp() },
    overrides,
  );
}

const CAMERA_DEFAULTS = {
  deviceId: 'cam-test-001',
  name: 'Test Camera 1',
  status: 'CAMERA_STATUS_ONLINE',
  containerId: 'ctn-test-001',
  position: 1,
  lastSeen: makeTimestamp(),
  health: makeCameraHealth(),
  ipAddress: '192.168.10.101',
  macAddress: 'AA:BB:CC:DD:EE:01',
} as const;

type CameraOverrides = Partial<Record<keyof typeof CAMERA_DEFAULTS, unknown>>;

export function makeCamera(overrides?: CameraOverrides) {
  return mergeDefaults(
    {
      ...CAMERA_DEFAULTS,
      lastSeen: makeTimestamp(),
      health: makeCameraHealth(),
    },
    overrides,
  );
}

export function makeListCamerasResponse(
  overrides?: Partial<{
    correlationId: string;
    cameras: ReturnType<typeof makeCamera>[];
    totalCount: number;
  }>,
) {
  const cameras = overrides?.cameras ?? [makeCamera()];
  return mergeDefaults(
    {
      correlationId: makeCorrelationId(),
      cameras,
      totalCount: cameras.length,
    },
    overrides,
  );
}

export function makeGetCameraResponse(
  overrides?: Partial<{
    correlationId: string;
    camera: ReturnType<typeof makeCamera>;
  }>,
) {
  return mergeDefaults(
    {
      correlationId: makeCorrelationId(),
      camera: makeCamera(),
    },
    overrides,
  );
}

// ============================================================================
// Evidence factories (from @delicasa/wire/testing/factories/evidence)
// ============================================================================

const EVIDENCE_CAPTURE_DEFAULTS = {
  evidenceId: 'ev-test-001',
  captureTag: 'CAPTURE_TAG_BEFORE_OPEN',
  status: 'CAPTURE_STATUS_CAPTURED',
  cameraId: 'cam-test-001',
  capturedAt: makeTimestamp(),
  contentType: 'image/jpeg',
  imageSizeBytes: '245760',
  objectKey: 'captures/ev-test-001.jpg',
  uploadStatus: 'uploaded',
  sessionId: 'sess-test-001',
  containerId: 'ctn-test-001',
} as const;

type EvidenceCaptureOverrides = Partial<
  Record<keyof typeof EVIDENCE_CAPTURE_DEFAULTS, unknown>
>;

export function makeEvidenceCapture(overrides?: EvidenceCaptureOverrides) {
  return mergeDefaults(
    { ...EVIDENCE_CAPTURE_DEFAULTS, capturedAt: makeTimestamp() },
    overrides,
  );
}

export function makeEvidencePair(
  overrides?: Partial<{
    contractVersion: string;
    sessionId: string;
    containerId: string;
    pairStatus: string;
    before: ReturnType<typeof makeEvidenceCapture> | undefined;
    after: ReturnType<typeof makeEvidenceCapture> | undefined;
    queriedAt: string;
    retryAfterSeconds: number;
  }>,
) {
  const defaults: Record<string, unknown> = {
    contractVersion: 'v1',
    sessionId: 'sess-test-001',
    containerId: 'ctn-test-001',
    pairStatus: 'EVIDENCE_PAIR_STATUS_COMPLETE',
    before: makeEvidenceCapture(),
    after: makeEvidenceCapture({
      captureTag: 'CAPTURE_TAG_AFTER_CLOSE',
      evidenceId: 'ev-test-002',
    }),
    queriedAt: makeTimestamp(),
    retryAfterSeconds: 0,
  };

  if (!overrides) return { ...defaults };

  const result = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function makeGetEvidencePairResponse(
  overrides?: Partial<{
    correlationId: string;
    pair: ReturnType<typeof makeEvidencePair>;
  }>,
) {
  return mergeDefaults(
    {
      correlationId: makeCorrelationId(),
      pair: makeEvidencePair(),
    },
    overrides,
  );
}

export function makeGetSessionEvidenceResponse(
  overrides?: Partial<{
    correlationId: string;
    sessionId: string;
    containerId: string;
    captures: ReturnType<typeof makeEvidenceCapture>[];
    totalCaptures: number;
    successfulCaptures: number;
    failedCaptures: number;
  }>,
) {
  const captures = overrides?.captures ?? [
    makeEvidenceCapture(),
    makeEvidenceCapture({
      captureTag: 'CAPTURE_TAG_AFTER_CLOSE',
      evidenceId: 'ev-test-002',
    }),
  ];
  return mergeDefaults(
    {
      correlationId: makeCorrelationId(),
      sessionId: 'sess-test-001',
      containerId: 'ctn-test-001',
      captures,
      totalCaptures: captures.length,
      successfulCaptures: captures.length,
      failedCaptures: 0,
    },
    overrides,
  );
}

// ============================================================================
// Capture factories (from @delicasa/wire/testing/factories/capture)
// ============================================================================

export function makeCaptureImageResponse(
  overrides?: Partial<{
    correlationId: string;
    evidenceId: string;
    cameraId: string;
    capturedAt: string;
    contentType: string;
    imageSizeBytes: string;
    objectKey: string;
    uploadStatus: string;
    cached: boolean;
  }>,
) {
  return mergeDefaults(
    {
      correlationId: makeCorrelationId(),
      evidenceId: 'ev-test-001',
      cameraId: 'cam-test-001',
      capturedAt: makeTimestamp(),
      contentType: 'image/jpeg',
      imageSizeBytes: '245760',
      objectKey: 'captures/ev-test-001.jpg',
      uploadStatus: 'UPLOAD_STATUS_UPLOADED',
      cached: false,
    },
    overrides,
  );
}

// ============================================================================
// RPC Mocking Helpers
// ============================================================================

const RPC_BASE = '**/rpc/delicasa.device.v1';

/**
 * Mock a Connect RPC endpoint with a factory-generated response.
 *
 * Connect protocol: HTTP POST with JSON body, Content-Type: application/json.
 */
export async function mockRpcEndpoint<T>(
  page: Page,
  service: string,
  method: string,
  factory: (overrides?: Partial<T>) => T,
  overrides?: Partial<T>,
): Promise<void> {
  await page.route(`${RPC_BASE}.${service}/${method}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(factory(overrides)),
    });
  });
}

/**
 * Mock a Connect RPC endpoint with an error response.
 *
 * Connect protocol errors: { code: string, message: string } with HTTP status.
 */
export async function mockRpcError(
  page: Page,
  service: string,
  method: string,
  code: string,
  message: string,
  status = 503,
): Promise<void> {
  await page.route(`${RPC_BASE}.${service}/${method}`, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ code, message }),
    });
  });
}

/**
 * Remove a previously registered RPC mock so it can be overridden.
 */
export async function unrouteRpc(
  page: Page,
  service: string,
  method: string,
): Promise<void> {
  await page.unroute(`${RPC_BASE}.${service}/${method}`);
}

/**
 * Apply safe default RPC mocks for all Connect RPC endpoints.
 *
 * Defaults mirror the graceful degradation behavior (empty lists, 404s)
 * so existing tests are unaffected.
 *
 * Call this from applyDefaultMocks() in test-base.ts.
 */
export async function applyDefaultRpcMocks(page: Page): Promise<void> {
  // SessionService — empty session list
  await mockRpcEndpoint(page, 'SessionService', 'ListSessions',
    makeListSessionsResponse, { sessions: [], totalCount: 0 });

  // CameraService — empty camera list
  await mockRpcEndpoint(page, 'CameraService', 'ListCameras',
    makeListCamerasResponse, { cameras: [], totalCount: 0 });

  // GetSession — 404 not found (no specific session selected by default)
  await mockRpcError(page, 'SessionService', 'GetSession',
    'not_found', 'Session not found', 404);

  // GetSessionEvidence — 404
  await mockRpcError(page, 'EvidenceService', 'GetSessionEvidence',
    'not_found', 'Evidence not found', 404);

  // GetEvidencePair — 404
  await mockRpcError(page, 'EvidenceService', 'GetEvidencePair',
    'not_found', 'Evidence pair not found', 404);

  // GetCamera — 404
  await mockRpcError(page, 'CameraService', 'GetCamera',
    'not_found', 'Camera not found', 404);

  // CaptureImage — 404
  await mockRpcError(page, 'CaptureService', 'CaptureImage',
    'not_found', 'Capture service not available', 404);
}
