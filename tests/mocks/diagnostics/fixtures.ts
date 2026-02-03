/**
 * MSW Mock Fixtures - Camera Diagnostics
 * Feature: 042-diagnostics-integration
 *
 * Test fixtures for camera diagnostics, evidence capture, and sessions.
 */

import type {
  CameraDiagnostics,
  CapturedEvidence,
  SessionDetail,
  ConnectionQuality,
  CameraStatus,
} from '@/infrastructure/api/camera-diagnostics-schemas';

// ============================================================================
// Base Camera Diagnostics Fixtures
// ============================================================================

export const mockCameraDiagnostics: CameraDiagnostics = {
  camera_id: 'espcam-b0f7f1',
  name: 'Kitchen Camera',
  status: 'online',
  last_seen: '2026-02-03T12:00:00Z',
  health: {
    heap: 127700,
    wifi_rssi: -47,
    uptime: 3600,
  },
  ip_address: '192.168.1.100',
  mac_address: 'B0:F7:F1:00:00:01',
  diagnostics: {
    connection_quality: 'excellent',
    error_count: 0,
    firmware_version: '1.2.3',
    resolution: '1280x720',
    frame_rate: 25,
    avg_capture_time_ms: 150,
  },
};

/**
 * Camera diagnostics variants for different status scenarios
 */
export const mockCameraDiagnosticsVariants: Record<CameraStatus, CameraDiagnostics> = {
  online: mockCameraDiagnostics,
  offline: {
    ...mockCameraDiagnostics,
    camera_id: 'espcam-c2d3e4',
    name: 'Garage Camera',
    status: 'offline',
    health: undefined,
    diagnostics: undefined,
  },
  error: {
    ...mockCameraDiagnostics,
    camera_id: 'espcam-d3e4f5',
    name: 'Backyard Camera',
    status: 'error',
    diagnostics: {
      connection_quality: 'poor',
      error_count: 5,
      last_error: 'Connection timeout',
      last_error_time: '2026-02-03T11:55:00Z',
      firmware_version: '1.2.3',
    },
  },
  rebooting: {
    ...mockCameraDiagnostics,
    camera_id: 'espcam-e4f5a6',
    name: 'Front Door Camera',
    status: 'rebooting',
  },
  discovered: {
    ...mockCameraDiagnostics,
    camera_id: 'espcam-f5a6b7',
    name: 'New Camera',
    status: 'discovered',
    health: undefined,
    diagnostics: undefined,
  },
  pairing: {
    ...mockCameraDiagnostics,
    camera_id: 'espcam-a6b7c8',
    name: 'Pairing Camera',
    status: 'pairing',
    health: undefined,
    diagnostics: undefined,
  },
  connecting: {
    ...mockCameraDiagnostics,
    camera_id: 'espcam-b7c8d9',
    name: 'Connecting Camera',
    status: 'connecting',
    health: undefined,
    diagnostics: undefined,
  },
};

/**
 * Camera diagnostics variants for different connection qualities
 */
export const mockConnectionQualityVariants: Record<ConnectionQuality, CameraDiagnostics> = {
  excellent: mockCameraDiagnostics,
  good: {
    ...mockCameraDiagnostics,
    camera_id: 'espcam-111111',
    health: { heap: 120000, wifi_rssi: -55, uptime: 7200 },
    diagnostics: { ...mockCameraDiagnostics.diagnostics!, connection_quality: 'good' },
  },
  fair: {
    ...mockCameraDiagnostics,
    camera_id: 'espcam-222222',
    health: { heap: 100000, wifi_rssi: -65, uptime: 1800 },
    diagnostics: { ...mockCameraDiagnostics.diagnostics!, connection_quality: 'fair' },
  },
  poor: {
    ...mockCameraDiagnostics,
    camera_id: 'espcam-333333',
    health: { heap: 80000, wifi_rssi: -80, uptime: 600 },
    diagnostics: { ...mockCameraDiagnostics.diagnostics!, connection_quality: 'poor' },
  },
};

// ============================================================================
// Evidence Capture Fixtures
// ============================================================================

// Minimal base64 1x1 transparent PNG for testing
const MOCK_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export const mockCapturedEvidence: CapturedEvidence = {
  id: 'ev-001',
  camera_id: 'espcam-b0f7f1',
  session_id: 'sess-001',
  captured_at: '2026-02-03T12:00:00Z',
  image_base64: MOCK_IMAGE_BASE64,
  thumbnail_url: 'https://minio.local/thumbnails/ev-001.jpg',
  expires_at: '2026-02-03T13:00:00Z',
  size_bytes: 1024,
  content_type: 'image/jpeg',
};

export const mockCapturedEvidenceList: CapturedEvidence[] = [
  mockCapturedEvidence,
  {
    ...mockCapturedEvidence,
    id: 'ev-002',
    captured_at: '2026-02-03T12:05:00Z',
    thumbnail_url: 'https://minio.local/thumbnails/ev-002.jpg',
  },
  {
    ...mockCapturedEvidence,
    id: 'ev-003',
    camera_id: 'espcam-c2d3e4',
    captured_at: '2026-02-03T12:10:00Z',
    thumbnail_url: 'https://minio.local/thumbnails/ev-003.jpg',
  },
];

// ============================================================================
// Session Detail Fixtures
// ============================================================================

export const mockSessionDetail: SessionDetail = {
  id: 'sess-001',
  delivery_id: 'del-12345',
  started_at: '2026-02-03T11:00:00Z',
  status: 'active',
  capture_count: 3,
  cameras: ['espcam-b0f7f1', 'espcam-c2d3e4'],
  evidence: mockCapturedEvidenceList,
};

export const mockSessionDetailVariants = {
  active: mockSessionDetail,
  completed: {
    ...mockSessionDetail,
    id: 'sess-002',
    status: 'completed' as const,
    completed_at: '2026-02-03T12:30:00Z',
    capture_count: 10,
  },
  cancelled: {
    ...mockSessionDetail,
    id: 'sess-003',
    status: 'cancelled' as const,
    capture_count: 2,
  },
  empty: {
    ...mockSessionDetail,
    id: 'sess-004',
    capture_count: 0,
    evidence: [],
    cameras: [],
  },
};

// ============================================================================
// API Response Wrappers
// ============================================================================

export const mockCameraDiagnosticsResponse = {
  success: true,
  data: mockCameraDiagnostics,
};

export const mockCapturedEvidenceResponse = {
  success: true,
  data: mockCapturedEvidence,
};

export const mockSessionDetailResponse = {
  success: true,
  data: mockSessionDetail,
};

// ============================================================================
// Error Response Fixtures
// ============================================================================

export const mockErrorResponses = {
  notFound: {
    error: 'Camera not found',
    code: 'NOT_FOUND',
  },
  offline: {
    error: 'Camera offline or unavailable',
    code: 'SERVICE_UNAVAILABLE',
  },
  timeout: {
    error: 'Request timed out',
    code: 'TIMEOUT',
  },
  captureError: {
    error: 'Failed to capture evidence',
    code: 'CAPTURE_FAILED',
  },
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a camera diagnostics fixture with custom overrides
 */
export function createMockCameraDiagnostics(
  overrides: Partial<CameraDiagnostics> = {}
): CameraDiagnostics {
  return {
    ...mockCameraDiagnostics,
    ...overrides,
  };
}

/**
 * Create a captured evidence fixture with custom overrides
 */
export function createMockEvidence(
  overrides: Partial<CapturedEvidence> = {}
): CapturedEvidence {
  return {
    ...mockCapturedEvidence,
    ...overrides,
  };
}

/**
 * Create a session detail fixture with custom overrides
 */
export function createMockSession(
  overrides: Partial<SessionDetail> = {}
): SessionDetail {
  return {
    ...mockSessionDetail,
    ...overrides,
  };
}
