/**
 * Diagnostics API Contract Tests
 * Feature: 038-dev-observability-panels (T012)
 * Feature: 059-real-ops-drilldown (T027) - V1 schema reconciliation
 *
 * Validates that mock data matches the Zod schemas defined for diagnostics API.
 * Prevents silent drift between MSW handlers and actual API contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  ServiceHealthSchema,
  ServiceStatusSchema,
  ServiceNameSchema,
  CheckResultSchema,
  BridgeServerHealthResponseSchema,
  StorageHealthResponseSchema,
  SessionSchema,
  SessionStatusSchema,
  SessionWithStaleSchema,
  SessionListResponseSchema,
  CaptureEntrySchema,
  CaptureTagSchema,
  CaptureStatusSchema,
  UploadStatusSchema,
  EvidenceSummarySchema,
  SessionEvidenceResponseSchema,
  EvidencePairSchema,
  EvidencePairResponseSchema,
  LastErrorSchema,
  PairStatusSchema,
  AllHealthChecksSchema,
} from '@/infrastructure/api/diagnostics-schemas';

// ============================================================================
// Health Check Mock Data
// ============================================================================

const validBridgeServerHealthResponse = {
  status: 'healthy',
  timestamp: '2026-01-25T15:30:00Z',
  checks: {
    database: { status: 'healthy' },
    storage: { status: 'healthy' },
  },
};

const notReadyBridgeServerHealthResponse = {
  status: 'not_ready',
  timestamp: '2026-01-25T15:30:00Z',
  checks: {
    database: { status: 'healthy' },
    storage: { status: 'error', message: 'MinIO connection timeout' },
  },
};

const validStorageHealthResponse = {
  status: 'healthy',
  timestamp: '2026-01-25T15:30:00Z',
  buckets: [{ name: 'delicasa-images', accessible: true }],
};

const unhealthyStorageResponse = {
  status: 'unhealthy',
  timestamp: '2026-01-25T15:30:00Z',
  error: 'Connection refused',
};

const validServiceHealth = {
  service_name: 'bridgeserver',
  status: 'healthy',
  last_checked: '2026-01-25T15:30:00Z',
  response_time_ms: 45,
  checks: {
    database: { status: 'healthy' },
    storage: { status: 'healthy' },
  },
};

// ============================================================================
// V1 Session Mock Data
// ============================================================================

const validSession = {
  session_id: 'sess-12345',
  container_id: 'ctr-abc-001',
  started_at: '2026-01-25T14:00:00Z',
  status: 'active',
  total_captures: 5,
  successful_captures: 4,
  failed_captures: 1,
  has_before_open: true,
  has_after_close: false,
  pair_complete: false,
  elapsed_seconds: 240,
};

const completedSession = {
  session_id: 'sess-99999',
  container_id: 'ctr-abc-003',
  started_at: '2026-01-25T10:00:00Z',
  status: 'complete',
  total_captures: 4,
  successful_captures: 4,
  failed_captures: 0,
  has_before_open: true,
  has_after_close: true,
  pair_complete: true,
  elapsed_seconds: 1800,
};

const failedSession = {
  session_id: 'sess-fail-001',
  container_id: 'ctr-abc-005',
  started_at: '2026-01-25T12:00:00Z',
  status: 'failed',
  total_captures: 2,
  successful_captures: 1,
  failed_captures: 1,
  has_before_open: true,
  has_after_close: false,
  pair_complete: false,
  last_error: {
    phase: 'AFTER_CLOSE',
    failure_reason: 'Camera timeout',
    device_id: 'espcam-a1b2c3',
    occurred_at: '2026-01-25T12:30:00Z',
    correlation_id: 'corr-001',
  },
  elapsed_seconds: 600,
};

const sessionListResponse = {
  success: true,
  data: {
    sessions: [validSession, completedSession, failedSession],
    total: 3,
    queried_at: '2026-01-25T15:30:00Z',
  },
  timestamp: '2026-01-25T15:30:00Z',
};

// ============================================================================
// V1 Evidence Mock Data
// ============================================================================

const validCaptureEntry = {
  evidence_id: 'ev-001',
  capture_tag: 'BEFORE_OPEN',
  status: 'captured',
  device_id: 'espcam-a1b2c3',
  container_id: 'ctr-abc-003',
  session_id: 'sess-12345',
  created_at: '2026-01-25T14:30:00Z',
  image_data: 'base64encodeddata',
  content_type: 'image/jpeg',
  image_size_bytes: 45678,
  object_key: 'evidence/sess-12345/before-open.jpg',
  upload_status: 'uploaded',
};

const minimalCaptureEntry = {
  evidence_id: 'ev-002',
  capture_tag: 'AFTER_CLOSE',
  status: 'captured',
  device_id: 'espcam-d4e5f6',
  container_id: 'ctr-abc-003',
  session_id: 'sess-12345',
  created_at: '2026-01-25T14:35:00Z',
};

const failedCaptureEntry = {
  evidence_id: 'ev-003',
  capture_tag: 'AFTER_CLOSE',
  status: 'failed',
  failure_reason: 'Camera timeout',
  device_id: 'espcam-a1b2c3',
  container_id: 'ctr-abc-005',
  session_id: 'sess-fail-001',
  created_at: '2026-01-25T12:30:00Z',
};

const timeoutCaptureEntry = {
  evidence_id: 'ev-004',
  capture_tag: 'BEFORE_CLOSE',
  status: 'timeout',
  failure_reason: 'Capture timed out after 60s',
  device_id: 'espcam-d4e5f6',
  container_id: 'ctr-abc-004',
  session_id: 'sess-partial-001',
  created_at: '2026-01-25T13:00:00Z',
};

const s3OnlyCaptureEntry = {
  evidence_id: 'ev-005',
  capture_tag: 'BEFORE_OPEN',
  status: 'captured',
  device_id: 'espcam-d4e5f6',
  container_id: 'ctr-abc-003',
  session_id: 'sess-12345',
  created_at: '2026-01-25T10:00:00Z',
  object_key: 'evidence/sess-12345/before-open-cam2.jpg',
  upload_status: 'uploaded',
};

const evidenceResponse = {
  success: true,
  data: {
    session_id: 'sess-12345',
    container_id: 'ctr-abc-003',
    captures: [validCaptureEntry, minimalCaptureEntry, s3OnlyCaptureEntry],
    summary: {
      total_captures: 3,
      successful_captures: 3,
      failed_captures: 0,
      has_before_open: true,
      has_after_close: true,
      pair_complete: true,
    },
  },
  timestamp: '2026-01-25T15:30:00Z',
};

const evidencePairResponse = {
  success: true,
  data: {
    contract_version: 'v1',
    session_id: 'sess-12345',
    container_id: 'ctr-abc-003',
    pair_status: 'complete',
    before: { ...validCaptureEntry, captured_at: '2026-01-25T14:30:00Z' },
    after: { ...minimalCaptureEntry, captured_at: '2026-01-25T14:35:00Z' },
    queried_at: '2026-01-25T15:30:00Z',
  },
  timestamp: '2026-01-25T15:30:00Z',
};

// ============================================================================
// Contract Tests - Health Schemas
// ============================================================================

describe('Diagnostics API Contract Tests', () => {
  describe('ServiceStatusSchema', () => {
    it('accepts all valid status values', () => {
      const validStatuses = ['healthy', 'degraded', 'unhealthy', 'timeout', 'unknown'];
      validStatuses.forEach((status) => {
        const result = ServiceStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid status values', () => {
      const result = ServiceStatusSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('ServiceNameSchema', () => {
    it('accepts all valid service names', () => {
      const validNames = ['bridgeserver', 'piorchestrator', 'minio'];
      validNames.forEach((name) => {
        const result = ServiceNameSchema.safeParse(name);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid service names', () => {
      const result = ServiceNameSchema.safeParse('unknown-service');
      expect(result.success).toBe(false);
    });
  });

  describe('CheckResultSchema', () => {
    it('validates healthy check result', () => {
      const result = CheckResultSchema.safeParse({ status: 'healthy' });
      expect(result.success).toBe(true);
    });

    it('validates error check result with message', () => {
      const result = CheckResultSchema.safeParse({
        status: 'error',
        message: 'Connection refused',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = CheckResultSchema.safeParse({ status: 'warning' });
      expect(result.success).toBe(false);
    });
  });

  describe('BridgeServerHealthResponseSchema', () => {
    it('validates healthy response', () => {
      const result = BridgeServerHealthResponseSchema.safeParse(validBridgeServerHealthResponse);
      expect(result.success).toBe(true);
    });

    it('validates not_ready response', () => {
      const result = BridgeServerHealthResponseSchema.safeParse(notReadyBridgeServerHealthResponse);
      expect(result.success).toBe(true);
    });

    it('validates response without checks', () => {
      const result = BridgeServerHealthResponseSchema.safeParse({
        status: 'healthy',
        timestamp: '2026-01-25T15:30:00Z',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('StorageHealthResponseSchema', () => {
    it('validates healthy storage response', () => {
      const result = StorageHealthResponseSchema.safeParse(validStorageHealthResponse);
      expect(result.success).toBe(true);
    });

    it('validates unhealthy storage response', () => {
      const result = StorageHealthResponseSchema.safeParse(unhealthyStorageResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('ServiceHealthSchema', () => {
    it('validates complete service health', () => {
      const result = ServiceHealthSchema.safeParse(validServiceHealth);
      expect(result.success).toBe(true);
    });

    it('validates minimal service health', () => {
      const minimal = {
        service_name: 'piorchestrator',
        status: 'healthy',
        last_checked: '2026-01-25T15:30:00Z',
      };
      const result = ServiceHealthSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('rejects negative response time', () => {
      const invalid = {
        ...validServiceHealth,
        response_time_ms: -1,
      };
      const result = ServiceHealthSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // V1 Session Schema Tests
  // ============================================================================

  describe('SessionStatusSchema', () => {
    it('accepts all valid V1 session statuses', () => {
      const validStatuses = ['active', 'complete', 'partial', 'failed'];
      validStatuses.forEach((status) => {
        const result = SessionStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('rejects old status values', () => {
      expect(SessionStatusSchema.safeParse('completed').success).toBe(false);
      expect(SessionStatusSchema.safeParse('cancelled').success).toBe(false);
    });
  });

  describe('LastErrorSchema', () => {
    it('validates complete last_error', () => {
      const result = LastErrorSchema.safeParse(failedSession.last_error);
      expect(result.success).toBe(true);
    });

    it('validates last_error without optional fields', () => {
      const minimal = {
        phase: 'BEFORE_OPEN',
        failure_reason: 'Timeout',
        device_id: 'espcam-a1b2c3',
        occurred_at: '2026-01-25T12:00:00Z',
      };
      const result = LastErrorSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });

  describe('SessionSchema', () => {
    it('validates active session', () => {
      const result = SessionSchema.safeParse(validSession);
      expect(result.success).toBe(true);
    });

    it('validates completed session', () => {
      const result = SessionSchema.safeParse(completedSession);
      expect(result.success).toBe(true);
    });

    it('validates failed session with last_error', () => {
      const result = SessionSchema.safeParse(failedSession);
      expect(result.success).toBe(true);
    });

    it('rejects empty session_id', () => {
      const invalid = { ...validSession, session_id: '' };
      const result = SessionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects negative total_captures', () => {
      const invalid = { ...validSession, total_captures: -1 };
      const result = SessionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects old field names', () => {
      const oldFormat = {
        id: 'sess-12345',
        delivery_id: 'del-67890',
        started_at: '2026-01-25T14:00:00Z',
        status: 'active',
        capture_count: 5,
      };
      const result = SessionSchema.safeParse(oldFormat);
      expect(result.success).toBe(false);
    });
  });

  describe('SessionWithStaleSchema', () => {
    it('validates session with is_stale flag', () => {
      const withStale = { ...validSession, is_stale: true };
      const result = SessionWithStaleSchema.safeParse(withStale);
      expect(result.success).toBe(true);
    });
  });

  describe('SessionListResponseSchema', () => {
    it('validates V1 session list response', () => {
      const result = SessionListResponseSchema.safeParse(sessionListResponse);
      expect(result.success).toBe(true);
    });

    it('validates empty session list', () => {
      const emptyResponse = {
        success: true,
        data: {
          sessions: [],
          total: 0,
          queried_at: '2026-01-25T15:30:00Z',
        },
        timestamp: '2026-01-25T15:30:00Z',
      };
      const result = SessionListResponseSchema.safeParse(emptyResponse);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // V1 Evidence Schema Tests
  // ============================================================================

  describe('CaptureTagSchema', () => {
    it('accepts all valid capture tags', () => {
      const tags = ['BEFORE_OPEN', 'AFTER_OPEN', 'BEFORE_CLOSE', 'AFTER_CLOSE'];
      tags.forEach((tag) => {
        expect(CaptureTagSchema.safeParse(tag).success).toBe(true);
      });
    });
  });

  describe('CaptureStatusSchema', () => {
    it('accepts all valid capture statuses', () => {
      const statuses = ['captured', 'failed', 'timeout'];
      statuses.forEach((status) => {
        expect(CaptureStatusSchema.safeParse(status).success).toBe(true);
      });
    });
  });

  describe('UploadStatusSchema', () => {
    it('accepts all valid upload statuses', () => {
      const statuses = ['uploaded', 'failed', 'unverified'];
      statuses.forEach((status) => {
        expect(UploadStatusSchema.safeParse(status).success).toBe(true);
      });
    });
  });

  describe('CaptureEntrySchema', () => {
    it('validates complete capture entry with image_data', () => {
      const result = CaptureEntrySchema.safeParse(validCaptureEntry);
      expect(result.success).toBe(true);
    });

    it('validates minimal capture entry', () => {
      const result = CaptureEntrySchema.safeParse(minimalCaptureEntry);
      expect(result.success).toBe(true);
    });

    it('validates failed capture entry', () => {
      const result = CaptureEntrySchema.safeParse(failedCaptureEntry);
      expect(result.success).toBe(true);
    });

    it('validates timeout capture entry', () => {
      const result = CaptureEntrySchema.safeParse(timeoutCaptureEntry);
      expect(result.success).toBe(true);
    });

    it('validates S3-only capture entry (no image_data)', () => {
      const result = CaptureEntrySchema.safeParse(s3OnlyCaptureEntry);
      expect(result.success).toBe(true);
    });

    it('rejects old field names (camera_id, thumbnail_url)', () => {
      const oldFormat = {
        id: 'img-001',
        session_id: 'sess-12345',
        captured_at: '2026-01-25T14:30:00Z',
        camera_id: 'espcam-a1b2c3',
        thumbnail_url: 'https://example.com/thumb.jpg',
        full_url: 'https://example.com/full.jpg',
        expires_at: '2026-01-25T14:45:00Z',
      };
      const result = CaptureEntrySchema.safeParse(oldFormat);
      expect(result.success).toBe(false);
    });
  });

  describe('EvidenceSummarySchema', () => {
    it('validates complete summary', () => {
      const summary = {
        total_captures: 4,
        successful_captures: 4,
        failed_captures: 0,
        has_before_open: true,
        has_after_close: true,
        pair_complete: true,
      };
      const result = EvidenceSummarySchema.safeParse(summary);
      expect(result.success).toBe(true);
    });
  });

  describe('SessionEvidenceResponseSchema', () => {
    it('validates V1 evidence list response', () => {
      const result = SessionEvidenceResponseSchema.safeParse(evidenceResponse);
      expect(result.success).toBe(true);
    });

    it('validates empty evidence list', () => {
      const emptyResponse = {
        success: true,
        data: {
          session_id: 'sess-12345',
          container_id: 'ctr-abc-001',
          captures: [],
          summary: {
            total_captures: 0,
            successful_captures: 0,
            failed_captures: 0,
            has_before_open: false,
            has_after_close: false,
            pair_complete: false,
          },
        },
        timestamp: '2026-01-25T15:30:00Z',
      };
      const result = SessionEvidenceResponseSchema.safeParse(emptyResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('PairStatusSchema', () => {
    it('accepts all valid pair statuses', () => {
      const statuses = ['complete', 'incomplete', 'missing'];
      statuses.forEach((status) => {
        expect(PairStatusSchema.safeParse(status).success).toBe(true);
      });
    });
  });

  describe('EvidencePairSchema', () => {
    it('validates complete evidence pair', () => {
      const result = EvidencePairSchema.safeParse(evidencePairResponse.data);
      expect(result.success).toBe(true);
    });

    it('validates incomplete pair (after is null)', () => {
      const incomplete = {
        contract_version: 'v1',
        session_id: 'sess-12345',
        container_id: 'ctr-abc-003',
        pair_status: 'incomplete',
        before: { ...validCaptureEntry, captured_at: '2026-01-25T14:30:00Z' },
        after: null,
        queried_at: '2026-01-25T15:30:00Z',
        retry_after_seconds: 30,
      };
      const result = EvidencePairSchema.safeParse(incomplete);
      expect(result.success).toBe(true);
    });

    it('validates missing pair (both null)', () => {
      const missing = {
        contract_version: 'v1',
        session_id: 'sess-fail-001',
        container_id: 'ctr-abc-005',
        pair_status: 'missing',
        before: null,
        after: null,
        queried_at: '2026-01-25T15:30:00Z',
      };
      const result = EvidencePairSchema.safeParse(missing);
      expect(result.success).toBe(true);
    });
  });

  describe('EvidencePairResponseSchema', () => {
    it('validates V1 evidence pair response envelope', () => {
      const result = EvidencePairResponseSchema.safeParse(evidencePairResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('AllHealthChecksSchema', () => {
    it('validates all health checks aggregation', () => {
      const allChecks = {
        services: [
          { service_name: 'bridgeserver', status: 'healthy', last_checked: '2026-01-25T15:30:00Z' },
          { service_name: 'piorchestrator', status: 'healthy', last_checked: '2026-01-25T15:30:00Z' },
          { service_name: 'minio', status: 'healthy', last_checked: '2026-01-25T15:30:00Z' },
        ],
        last_refresh: '2026-01-25T15:30:00Z',
      };
      const result = AllHealthChecksSchema.safeParse(allChecks);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Contract Consistency with Mock Fixtures
// ============================================================================

describe('Contract Consistency with Mock Fixtures', () => {
  it('health fixtures match BridgeServerHealthResponseSchema', async () => {
    const { bridgeServerHealthyApiResponse, bridgeServerNotReadyApiResponse } = await import(
      '../../mocks/diagnostics/health-fixtures'
    );

    expect(BridgeServerHealthResponseSchema.safeParse(bridgeServerHealthyApiResponse).success).toBe(true);
    expect(BridgeServerHealthResponseSchema.safeParse(bridgeServerNotReadyApiResponse).success).toBe(true);
  });

  it('health fixtures match StorageHealthResponseSchema', async () => {
    const { storageHealthyApiResponse, storageUnhealthyApiResponse } = await import(
      '../../mocks/diagnostics/health-fixtures'
    );

    expect(StorageHealthResponseSchema.safeParse(storageHealthyApiResponse).success).toBe(true);
    expect(StorageHealthResponseSchema.safeParse(storageUnhealthyApiResponse).success).toBe(true);
  });

  it('V1 session fixtures match SessionSchema', async () => {
    const {
      activeSessionRecent,
      activeSessionStale,
      completedSession,
      partialSession,
      failedSession,
    } = await import('../../mocks/diagnostics/session-fixtures');

    expect(SessionSchema.safeParse(activeSessionRecent).success).toBe(true);
    expect(SessionSchema.safeParse(activeSessionStale).success).toBe(true);
    expect(SessionSchema.safeParse(completedSession).success).toBe(true);
    expect(SessionSchema.safeParse(partialSession).success).toBe(true);
    expect(SessionSchema.safeParse(failedSession).success).toBe(true);
  });

  it('V1 session list fixture matches SessionListResponseSchema', async () => {
    const { sessionListApiResponse } = await import('../../mocks/diagnostics/session-fixtures');
    expect(SessionListResponseSchema.safeParse(sessionListApiResponse).success).toBe(true);
  });

  it('V1 capture entry fixtures match CaptureEntrySchema', async () => {
    const {
      captureBeforeOpen,
      captureAfterClose,
      captureS3Only,
      captureFailed,
      captureTimeout,
    } = await import('../../mocks/diagnostics/session-fixtures');

    expect(CaptureEntrySchema.safeParse(captureBeforeOpen).success).toBe(true);
    expect(CaptureEntrySchema.safeParse(captureAfterClose).success).toBe(true);
    expect(CaptureEntrySchema.safeParse(captureS3Only).success).toBe(true);
    expect(CaptureEntrySchema.safeParse(captureFailed).success).toBe(true);
    expect(CaptureEntrySchema.safeParse(captureTimeout).success).toBe(true);
  });

  it('V1 evidence list fixture matches SessionEvidenceResponseSchema', async () => {
    const { evidenceListApiResponse } = await import('../../mocks/diagnostics/session-fixtures');
    expect(SessionEvidenceResponseSchema.safeParse(evidenceListApiResponse).success).toBe(true);
  });

  it('V1 evidence pair fixtures match EvidencePairSchema', async () => {
    const { completePair, incompletePair, missingPair } = await import(
      '../../mocks/diagnostics/session-fixtures'
    );

    expect(EvidencePairSchema.safeParse(completePair).success).toBe(true);
    expect(EvidencePairSchema.safeParse(incompletePair).success).toBe(true);
    expect(EvidencePairSchema.safeParse(missingPair).success).toBe(true);
  });

  it('V1 evidence pair response fixture matches EvidencePairResponseSchema', async () => {
    const { evidencePairApiResponse } = await import('../../mocks/diagnostics/session-fixtures');
    expect(EvidencePairResponseSchema.safeParse(evidencePairApiResponse).success).toBe(true);
  });
});
