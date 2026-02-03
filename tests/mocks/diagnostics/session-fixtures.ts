/**
 * Mock Session & Evidence Fixtures - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Test fixtures for session and evidence capture data.
 * All fixtures validated by diagnostics.contract.test.ts against Zod schemas.
 */

// ============================================================================
// Timestamp Helpers (relative to module load time — design decision D1)
// ============================================================================

const now = Date.now();
const ONE_MINUTE = 60 * 1000;

// ============================================================================
// Session Fixtures
// ============================================================================

/**
 * Active session with recent capture (< 5 min ago)
 */
export const activeSessionRecent = {
  id: 'sess-recent-001',
  delivery_id: 'del-abc-001',
  started_at: new Date(now - 30 * ONE_MINUTE).toISOString(),
  status: 'active' as const,
  capture_count: 5,
  last_capture_at: new Date(now - 1 * ONE_MINUTE).toISOString(),
};

/**
 * Active session with stale capture (> 5 min ago)
 */
export const activeSessionStale = {
  id: 'sess-stale-001',
  delivery_id: 'del-abc-002',
  started_at: new Date(now - 60 * ONE_MINUTE).toISOString(),
  status: 'active' as const,
  capture_count: 12,
  last_capture_at: new Date(now - 10 * ONE_MINUTE).toISOString(),
};

/**
 * Completed session
 */
export const completedSession = {
  id: 'sess-completed-001',
  delivery_id: 'del-abc-003',
  started_at: new Date(now - 120 * ONE_MINUTE).toISOString(),
  status: 'completed' as const,
  capture_count: 24,
  last_capture_at: new Date(now - 90 * ONE_MINUTE).toISOString(),
};

// ============================================================================
// Session API Response Fixtures
// ============================================================================

/**
 * Session list with 3 sessions (V1 envelope)
 */
export const sessionListApiResponse = {
  success: true as const,
  data: {
    sessions: [activeSessionRecent, activeSessionStale, completedSession],
  },
  correlation_id: 'corr-sess-list-001',
  timestamp: new Date(now).toISOString(),
};

/**
 * Empty session list (V1 envelope)
 */
export const sessionListEmptyApiResponse = {
  success: true as const,
  data: {
    sessions: [] as typeof activeSessionRecent[],
  },
  correlation_id: 'corr-sess-empty-001',
  timestamp: new Date(now).toISOString(),
};

/**
 * Session detail for activeSessionRecent (V1 envelope)
 */
export const sessionDetailApiResponse = {
  success: true as const,
  data: activeSessionRecent,
  correlation_id: 'corr-sess-detail-001',
  timestamp: new Date(now).toISOString(),
};

// ============================================================================
// Evidence Capture Fixtures
// ============================================================================

/**
 * Full evidence capture with all optional fields
 */
export const validEvidenceCapture = {
  id: 'ev-001',
  session_id: 'sess-recent-001',
  captured_at: new Date(now - 2 * ONE_MINUTE).toISOString(),
  camera_id: 'espcam-a1b2c3',
  thumbnail_url: 'https://minio.example.com/thumbs/ev-001.jpg',
  full_url: 'https://minio.example.com/full/ev-001.jpg',
  expires_at: new Date(now + 15 * ONE_MINUTE).toISOString(),
  size_bytes: 245760,
  content_type: 'image/jpeg',
};

/**
 * Minimal evidence capture (required fields only)
 */
export const minimalEvidenceCapture = {
  id: 'ev-002',
  session_id: 'sess-recent-001',
  captured_at: new Date(now - 3 * ONE_MINUTE).toISOString(),
  camera_id: 'espcam-d4e5f6',
  thumbnail_url: 'https://minio.example.com/thumbs/ev-002.jpg',
  full_url: 'https://minio.example.com/full/ev-002.jpg',
  expires_at: new Date(now + 15 * ONE_MINUTE).toISOString(),
};

/**
 * Third evidence capture (for list responses)
 */
const thirdEvidenceCapture = {
  id: 'ev-003',
  session_id: 'sess-stale-001',
  captured_at: new Date(now - 12 * ONE_MINUTE).toISOString(),
  camera_id: 'espcam-f6e5d4',
  thumbnail_url: 'https://minio.example.com/thumbs/ev-003.jpg',
  full_url: 'https://minio.example.com/full/ev-003.jpg',
  expires_at: new Date(now + 10 * ONE_MINUTE).toISOString(),
  size_bytes: 198432,
  content_type: 'image/jpeg',
};

// ============================================================================
// Evidence API Response Fixtures
// ============================================================================

/**
 * Evidence list with 3 items (V1 envelope)
 */
export const evidenceListApiResponse = {
  success: true as const,
  data: {
    evidence: [validEvidenceCapture, minimalEvidenceCapture, thirdEvidenceCapture],
  },
  correlation_id: 'corr-ev-list-001',
  timestamp: new Date(now).toISOString(),
};

/**
 * Empty evidence list (V1 envelope)
 */
export const evidenceListEmptyApiResponse = {
  success: true as const,
  data: {
    evidence: [] as typeof validEvidenceCapture[],
  },
  correlation_id: 'corr-ev-empty-001',
  timestamp: new Date(now).toISOString(),
};

/**
 * Presign URL response (V1 envelope)
 */
export const presignApiResponse = {
  success: true as const,
  data: {
    url: 'https://minio.example.com/presigned/ev-001.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900',
    expires_at: new Date(now + 15 * ONE_MINUTE).toISOString(),
  },
  correlation_id: 'corr-presign-001',
  timestamp: new Date(now).toISOString(),
};
