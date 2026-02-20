/**
 * Mock Session & Evidence Fixtures - V1 PiOrchestrator Format
 * Feature: 059-real-ops-drilldown
 *
 * Test fixtures for session and evidence capture data.
 * All fixtures match PiOrchestrator V1 response shapes.
 * Validated by diagnostics.contract.test.ts against Zod schemas.
 */

import type {
  Session,
  SessionWithStale,
  CaptureEntry,
  EvidenceSummary,
  EvidencePair,
} from '@/infrastructure/api/diagnostics-schemas';

// ============================================================================
// Timestamp Helpers (relative to module load time)
// ============================================================================

const now = Date.now();
const ONE_MINUTE = 60 * 1000;

// ============================================================================
// Session Fixtures (V1 PiOrchestrator format)
// ============================================================================

/**
 * Active session with recent captures (not stale: elapsed_seconds < 300)
 */
export const activeSessionRecent: Session = {
  session_id: 'sess-recent-001',
  container_id: 'ctr-abc-001',
  started_at: new Date(now - 4 * ONE_MINUTE).toISOString(),
  status: 'active',
  total_captures: 2,
  successful_captures: 2,
  failed_captures: 0,
  has_before_open: true,
  has_after_close: false,
  pair_complete: false,
  elapsed_seconds: 240,
};

/**
 * Active session that is stale (elapsed_seconds > 300)
 */
export const activeSessionStale: Session = {
  session_id: 'sess-stale-001',
  container_id: 'ctr-abc-002',
  started_at: new Date(now - 60 * ONE_MINUTE).toISOString(),
  status: 'active',
  total_captures: 1,
  successful_captures: 1,
  failed_captures: 0,
  has_before_open: true,
  has_after_close: false,
  pair_complete: false,
  elapsed_seconds: 3600,
};

/**
 * Completed session with full evidence pair
 */
export const completedSession: Session = {
  session_id: 'sess-completed-001',
  container_id: 'ctr-abc-003',
  started_at: new Date(now - 120 * ONE_MINUTE).toISOString(),
  status: 'complete',
  total_captures: 4,
  successful_captures: 4,
  failed_captures: 0,
  has_before_open: true,
  has_after_close: true,
  pair_complete: true,
  elapsed_seconds: 1800,
};

/**
 * Partial session (some captures missing)
 */
export const partialSession: Session = {
  session_id: 'sess-partial-001',
  container_id: 'ctr-abc-004',
  started_at: new Date(now - 90 * ONE_MINUTE).toISOString(),
  status: 'partial',
  total_captures: 3,
  successful_captures: 2,
  failed_captures: 1,
  has_before_open: true,
  has_after_close: false,
  pair_complete: false,
  elapsed_seconds: 900,
};

/**
 * Failed session with last_error
 */
export const failedSession: Session = {
  session_id: 'sess-failed-001',
  container_id: 'ctr-abc-005',
  started_at: new Date(now - 45 * ONE_MINUTE).toISOString(),
  status: 'failed',
  total_captures: 2,
  successful_captures: 1,
  failed_captures: 1,
  has_before_open: true,
  has_after_close: false,
  pair_complete: false,
  last_error: {
    phase: 'AFTER_CLOSE',
    failure_reason: 'Camera timeout: device did not respond within 30s',
    device_id: 'espcam-a1b2c3',
    occurred_at: new Date(now - 44 * ONE_MINUTE).toISOString(),
    correlation_id: 'corr-fail-001',
  },
  elapsed_seconds: 600,
};

/**
 * All sessions array for list responses
 */
export const allSessions: Session[] = [
  activeSessionRecent,
  activeSessionStale,
  completedSession,
  partialSession,
  failedSession,
];

// ============================================================================
// Session with Stale Flag (client-side derived)
// ============================================================================

export const activeSessionRecentWithStale: SessionWithStale = {
  ...activeSessionRecent,
  is_stale: false,
};

export const activeSessionStaleWithStale: SessionWithStale = {
  ...activeSessionStale,
  is_stale: true,
};

// ============================================================================
// Capture Entry Fixtures (V1 PiOrchestrator format)
// ============================================================================

/** Small base64 JPEG stub for tests (1x1 red pixel) */
const STUB_BASE64_IMAGE =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFRABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJgA//9k=';

/**
 * Captured evidence with base64 image data (BEFORE_OPEN)
 */
export const captureBeforeOpen: CaptureEntry = {
  evidence_id: 'ev-001',
  capture_tag: 'BEFORE_OPEN',
  status: 'captured',
  device_id: 'espcam-a1b2c3',
  container_id: 'ctr-abc-003',
  session_id: 'sess-completed-001',
  created_at: new Date(now - 115 * ONE_MINUTE).toISOString(),
  image_data: STUB_BASE64_IMAGE,
  content_type: 'image/jpeg',
  image_size_bytes: 245760,
  object_key: 'evidence/sess-completed-001/before-open.jpg',
  upload_status: 'uploaded',
};

/**
 * Captured evidence with base64 image data (AFTER_CLOSE)
 */
export const captureAfterClose: CaptureEntry = {
  evidence_id: 'ev-002',
  capture_tag: 'AFTER_CLOSE',
  status: 'captured',
  device_id: 'espcam-a1b2c3',
  container_id: 'ctr-abc-003',
  session_id: 'sess-completed-001',
  created_at: new Date(now - 95 * ONE_MINUTE).toISOString(),
  image_data: STUB_BASE64_IMAGE,
  content_type: 'image/jpeg',
  image_size_bytes: 198432,
  object_key: 'evidence/sess-completed-001/after-close.jpg',
  upload_status: 'uploaded',
};

/**
 * Captured evidence with only object_key (no base64 — older than 24h)
 */
export const captureS3Only: CaptureEntry = {
  evidence_id: 'ev-003',
  capture_tag: 'BEFORE_OPEN',
  status: 'captured',
  device_id: 'espcam-d4e5f6',
  container_id: 'ctr-abc-003',
  session_id: 'sess-completed-001',
  created_at: new Date(now - 200 * ONE_MINUTE).toISOString(),
  content_type: 'image/jpeg',
  image_size_bytes: 312000,
  object_key: 'evidence/sess-completed-001/before-open-cam2.jpg',
  upload_status: 'uploaded',
};

/**
 * Failed capture with failure_reason
 */
export const captureFailed: CaptureEntry = {
  evidence_id: 'ev-004',
  capture_tag: 'AFTER_CLOSE',
  status: 'failed',
  failure_reason: 'Camera timeout: device did not respond within 30s',
  device_id: 'espcam-a1b2c3',
  container_id: 'ctr-abc-005',
  session_id: 'sess-failed-001',
  created_at: new Date(now - 44 * ONE_MINUTE).toISOString(),
};

/**
 * Timeout capture
 */
export const captureTimeout: CaptureEntry = {
  evidence_id: 'ev-005',
  capture_tag: 'BEFORE_CLOSE',
  status: 'timeout',
  failure_reason: 'Capture operation timed out after 60s',
  device_id: 'espcam-d4e5f6',
  container_id: 'ctr-abc-004',
  session_id: 'sess-partial-001',
  created_at: new Date(now - 85 * ONE_MINUTE).toISOString(),
};

// ============================================================================
// Evidence Summary Fixtures
// ============================================================================

export const completeSummary: EvidenceSummary = {
  total_captures: 4,
  successful_captures: 4,
  failed_captures: 0,
  has_before_open: true,
  has_after_close: true,
  pair_complete: true,
};

export const incompleteSummary: EvidenceSummary = {
  total_captures: 2,
  successful_captures: 1,
  failed_captures: 1,
  has_before_open: true,
  has_after_close: false,
  pair_complete: false,
};

// ============================================================================
// Evidence Pair Fixtures
// ============================================================================

export const completePair: EvidencePair = {
  contract_version: 'v1',
  session_id: 'sess-completed-001',
  container_id: 'ctr-abc-003',
  pair_status: 'complete',
  before: {
    ...captureBeforeOpen,
    captured_at: captureBeforeOpen.created_at,
  },
  after: {
    ...captureAfterClose,
    captured_at: captureAfterClose.created_at,
  },
  queried_at: new Date(now).toISOString(),
};

export const incompletePair: EvidencePair = {
  contract_version: 'v1',
  session_id: 'sess-partial-001',
  container_id: 'ctr-abc-004',
  pair_status: 'incomplete',
  before: {
    ...captureBeforeOpen,
    session_id: 'sess-partial-001',
    container_id: 'ctr-abc-004',
    captured_at: captureBeforeOpen.created_at,
  },
  after: null,
  queried_at: new Date(now).toISOString(),
  retry_after_seconds: 30,
};

export const missingPair: EvidencePair = {
  contract_version: 'v1',
  session_id: 'sess-failed-001',
  container_id: 'ctr-abc-005',
  pair_status: 'missing',
  before: null,
  after: null,
  queried_at: new Date(now).toISOString(),
};

// ============================================================================
// Session API Response Fixtures (V1 envelopes)
// ============================================================================

/**
 * Session list with all status variants (V1 envelope)
 */
export const sessionListApiResponse = {
  success: true as const,
  data: {
    sessions: allSessions,
    total: allSessions.length,
    queried_at: new Date(now).toISOString(),
  },
  timestamp: new Date(now).toISOString(),
};

/**
 * Empty session list (V1 envelope)
 */
export const sessionListEmptyApiResponse = {
  success: true as const,
  data: {
    sessions: [] as Session[],
    total: 0,
    queried_at: new Date(now).toISOString(),
  },
  timestamp: new Date(now).toISOString(),
};

// ============================================================================
// Evidence API Response Fixtures (V1 envelopes)
// ============================================================================

/**
 * Evidence list for completed session (V1 envelope)
 */
export const evidenceListApiResponse = {
  success: true as const,
  data: {
    session_id: 'sess-completed-001',
    container_id: 'ctr-abc-003',
    captures: [captureBeforeOpen, captureAfterClose, captureS3Only],
    summary: completeSummary,
  },
  timestamp: new Date(now).toISOString(),
};

/**
 * Evidence list with failures (V1 envelope)
 */
export const evidenceListWithFailuresApiResponse = {
  success: true as const,
  data: {
    session_id: 'sess-failed-001',
    container_id: 'ctr-abc-005',
    captures: [captureBeforeOpen, captureFailed],
    summary: incompleteSummary,
  },
  timestamp: new Date(now).toISOString(),
};

/**
 * Empty evidence list (V1 envelope)
 */
export const evidenceListEmptyApiResponse = {
  success: true as const,
  data: {
    session_id: 'sess-recent-001',
    container_id: 'ctr-abc-001',
    captures: [] as CaptureEntry[],
    summary: {
      total_captures: 0,
      successful_captures: 0,
      failed_captures: 0,
      has_before_open: false,
      has_after_close: false,
      pair_complete: false,
    },
  },
  timestamp: new Date(now).toISOString(),
};

/**
 * Evidence pair response (V1 envelope)
 */
export const evidencePairApiResponse = {
  success: true as const,
  data: completePair,
  timestamp: new Date(now).toISOString(),
};

/**
 * Incomplete evidence pair response (V1 envelope)
 */
export const evidencePairIncompleteApiResponse = {
  success: true as const,
  data: incompletePair,
  timestamp: new Date(now).toISOString(),
};
