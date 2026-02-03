/**
 * Diagnostics API Contract Tests
 * Feature: 038-dev-observability-panels (T012)
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
  EvidenceCaptureSchema,
  SessionListResponseSchema,
  EvidenceListResponseSchema,
  PresignResponseSchema,
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
// Session Mock Data
// ============================================================================

const validSession = {
  id: 'sess-12345',
  delivery_id: 'del-67890',
  started_at: '2026-01-25T14:00:00Z',
  status: 'active',
  capture_count: 5,
  last_capture_at: '2026-01-25T14:45:00Z',
};

const minimalSession = {
  id: 'sess-00001',
  started_at: '2026-01-25T14:00:00Z',
  status: 'active',
  capture_count: 0,
};

const completedSession = {
  id: 'sess-99999',
  delivery_id: 'del-00000',
  started_at: '2026-01-25T10:00:00Z',
  status: 'completed',
  capture_count: 12,
  last_capture_at: '2026-01-25T10:45:00Z',
};

const sessionListResponse = {
  success: true,
  data: {
    sessions: [validSession, completedSession],
  },
};

// ============================================================================
// Evidence Mock Data
// ============================================================================

const validEvidenceCapture = {
  id: 'img-550e8400-e29b-41d4-a716-446655440000',
  session_id: 'sess-12345',
  captured_at: '2026-01-25T14:30:00Z',
  camera_id: 'espcam-b0f7f1',
  thumbnail_url: 'https://minio.example.com/thumb.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256',
  full_url: 'https://minio.example.com/full.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256',
  expires_at: '2026-01-25T14:45:00Z',
  size_bytes: 45678,
  content_type: 'image/jpeg',
};

const minimalEvidenceCapture = {
  id: 'img-00000000-0000-0000-0000-000000000001',
  session_id: 'sess-12345',
  captured_at: '2026-01-25T14:30:00Z',
  camera_id: 'espcam-a1b2c3',
  thumbnail_url: 'https://minio.example.com/thumb.jpg',
  full_url: 'https://minio.example.com/full.jpg',
  expires_at: '2026-01-25T14:45:00Z',
};

const evidenceListResponse = {
  success: true,
  data: {
    evidence: [validEvidenceCapture, minimalEvidenceCapture],
  },
};

const presignResponse = {
  success: true,
  data: {
    url: 'https://minio.example.com/refreshed.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256',
    expires_at: '2026-01-25T15:00:00Z',
  },
};

// ============================================================================
// Contract Tests
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

    it('validates service health with error message', () => {
      const withError = {
        service_name: 'minio',
        status: 'unhealthy',
        last_checked: '2026-01-25T15:30:00Z',
        error_message: 'Connection refused',
      };
      const result = ServiceHealthSchema.safeParse(withError);
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

  describe('SessionStatusSchema', () => {
    it('accepts all valid session statuses', () => {
      const validStatuses = ['active', 'completed', 'cancelled'];
      validStatuses.forEach((status) => {
        const result = SessionStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('SessionSchema', () => {
    it('validates complete session', () => {
      const result = SessionSchema.safeParse(validSession);
      expect(result.success).toBe(true);
    });

    it('validates minimal session', () => {
      const result = SessionSchema.safeParse(minimalSession);
      expect(result.success).toBe(true);
    });

    it('validates completed session', () => {
      const result = SessionSchema.safeParse(completedSession);
      expect(result.success).toBe(true);
    });

    it('rejects empty session id', () => {
      const invalid = { ...validSession, id: '' };
      const result = SessionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects negative capture count', () => {
      const invalid = { ...validSession, capture_count: -1 };
      const result = SessionSchema.safeParse(invalid);
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
    it('validates session list response', () => {
      const result = SessionListResponseSchema.safeParse(sessionListResponse);
      expect(result.success).toBe(true);
    });

    it('validates empty session list', () => {
      const emptyResponse = { success: true, data: { sessions: [] } };
      const result = SessionListResponseSchema.safeParse(emptyResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('EvidenceCaptureSchema', () => {
    it('validates complete evidence capture', () => {
      const result = EvidenceCaptureSchema.safeParse(validEvidenceCapture);
      expect(result.success).toBe(true);
    });

    it('validates minimal evidence capture', () => {
      const result = EvidenceCaptureSchema.safeParse(minimalEvidenceCapture);
      expect(result.success).toBe(true);
    });

    it('validates camera_id format', () => {
      const validIds = ['espcam-000000', 'espcam-abcdef', 'espcam-ABCDEF'];
      validIds.forEach((id) => {
        const evidence = { ...minimalEvidenceCapture, camera_id: id };
        const result = EvidenceCaptureSchema.safeParse(evidence);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid camera_id format', () => {
      const invalidIds = ['esp-cam', 'espcam', 'espcam-1234567', 'camera-b0f7f1'];
      invalidIds.forEach((id) => {
        const evidence = { ...minimalEvidenceCapture, camera_id: id };
        const result = EvidenceCaptureSchema.safeParse(evidence);
        expect(result.success).toBe(false);
      });
    });

    it('rejects invalid URL', () => {
      const invalid = { ...validEvidenceCapture, thumbnail_url: 'not-a-url' };
      const result = EvidenceCaptureSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects zero or negative size_bytes', () => {
      const invalid = { ...validEvidenceCapture, size_bytes: 0 };
      const result = EvidenceCaptureSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('EvidenceListResponseSchema', () => {
    it('validates evidence list response', () => {
      const result = EvidenceListResponseSchema.safeParse(evidenceListResponse);
      expect(result.success).toBe(true);
    });

    it('validates empty evidence list', () => {
      const emptyResponse = { success: true, data: { evidence: [] } };
      const result = EvidenceListResponseSchema.safeParse(emptyResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('PresignResponseSchema', () => {
    it('validates presign response', () => {
      const result = PresignResponseSchema.safeParse(presignResponse);
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

  it('session fixtures match SessionSchema', async () => {
    const { activeSessionRecent, activeSessionStale, completedSession } = await import(
      '../../mocks/diagnostics/session-fixtures'
    );

    expect(SessionSchema.safeParse(activeSessionRecent).success).toBe(true);
    expect(SessionSchema.safeParse(activeSessionStale).success).toBe(true);
    expect(SessionSchema.safeParse(completedSession).success).toBe(true);
  });

  it('session list fixture matches SessionListResponseSchema', async () => {
    const { sessionListApiResponse } = await import('../../mocks/diagnostics/session-fixtures');

    expect(SessionListResponseSchema.safeParse(sessionListApiResponse).success).toBe(true);
  });

  it('evidence fixtures match EvidenceCaptureSchema', async () => {
    const { validEvidenceCapture, minimalEvidenceCapture } = await import(
      '../../mocks/diagnostics/session-fixtures'
    );

    expect(EvidenceCaptureSchema.safeParse(validEvidenceCapture).success).toBe(true);
    expect(EvidenceCaptureSchema.safeParse(minimalEvidenceCapture).success).toBe(true);
  });

  it('evidence list fixture matches EvidenceListResponseSchema', async () => {
    const { evidenceListApiResponse } = await import('../../mocks/diagnostics/session-fixtures');

    expect(EvidenceListResponseSchema.safeParse(evidenceListApiResponse).success).toBe(true);
  });
});
