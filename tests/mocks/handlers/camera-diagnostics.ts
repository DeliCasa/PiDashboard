/**
 * MSW Handlers - Camera Diagnostics
 * Feature: 042-diagnostics-integration
 *
 * Mock Service Worker handlers for camera diagnostics API endpoints.
 */

import { http, HttpResponse, delay } from 'msw';
import {
  mockCameraDiagnosticsResponse,
  mockCameraDiagnosticsVariants,
  mockSessionDetailVariants,
  mockErrorResponses,
  createMockCameraDiagnostics,
  createMockEvidence,
} from '../diagnostics/fixtures';

// ============================================================================
// Camera Diagnostics Handlers
// ============================================================================

/**
 * GET /api/v1/cameras/:camera_id/diagnostics
 * Returns detailed diagnostics for a specific camera
 */
export const getCameraDiagnosticsHandler = http.get(
  '/api/v1/cameras/:camera_id/diagnostics',
  async ({ params }) => {
    const cameraId = params.camera_id as string;

    // Validate camera ID format
    if (!/^espcam-[0-9a-f]{6}$/i.test(cameraId)) {
      return HttpResponse.json(mockErrorResponses.notFound, { status: 404 });
    }

    // Check for specific test camera IDs
    const variant = Object.values(mockCameraDiagnosticsVariants).find(
      (v) => v.camera_id === cameraId
    );

    if (variant) {
      // Simulate offline camera returning 503
      if (variant.status === 'offline') {
        return HttpResponse.json(mockErrorResponses.offline, { status: 503 });
      }

      return HttpResponse.json({
        success: true,
        data: variant,
      });
    }

    // Default response for unknown but valid camera IDs
    return HttpResponse.json({
      success: true,
      data: createMockCameraDiagnostics({ camera_id: cameraId }),
    });
  }
);

/**
 * GET /api/dashboard/cameras/diagnostics (legacy)
 * Returns diagnostics list for all cameras
 */
export const listCameraDiagnosticsLegacyHandler = http.get(
  '/api/dashboard/cameras/diagnostics',
  async () => {
    return HttpResponse.json(Object.values(mockCameraDiagnosticsVariants));
  }
);

// ============================================================================
// Evidence Capture Handlers
// ============================================================================

/**
 * POST /api/v1/cameras/:camera_id/evidence
 * Captures evidence from a specific camera
 */
export const captureEvidenceHandler = http.post(
  '/api/v1/cameras/:camera_id/evidence',
  async ({ params, request }) => {
    const cameraId = params.camera_id as string;

    // Validate camera ID format
    if (!/^espcam-[0-9a-f]{6}$/i.test(cameraId)) {
      return HttpResponse.json(mockErrorResponses.notFound, { status: 404 });
    }

    // Check if camera is offline
    const variant = Object.values(mockCameraDiagnosticsVariants).find(
      (v) => v.camera_id === cameraId
    );
    if (variant?.status === 'offline') {
      return HttpResponse.json(mockErrorResponses.offline, { status: 503 });
    }

    // Parse optional session_id from request body
    let sessionId = 'sess-default';
    try {
      const body = await request.json() as { session_id?: string };
      if (body?.session_id) {
        sessionId = body.session_id;
      }
    } catch {
      // No body or invalid JSON - use default
    }

    // Simulate capture delay
    await delay(100);

    return HttpResponse.json({
      success: true,
      data: createMockEvidence({
        id: `ev-${Date.now()}`,
        camera_id: cameraId,
        session_id: sessionId,
        captured_at: new Date().toISOString(),
      }),
    });
  }
);

// ============================================================================
// Session Detail Handlers
// ============================================================================

/**
 * GET /api/v1/sessions/:session_id
 * Returns detailed session information
 */
export const getSessionDetailHandler = http.get(
  '/api/v1/sessions/:session_id',
  async ({ params }) => {
    const sessionId = params.session_id as string;

    // Check for specific test session IDs
    const variant = Object.values(mockSessionDetailVariants).find(
      (v) => v.id === sessionId
    );

    if (variant) {
      return HttpResponse.json({
        success: true,
        data: variant,
      });
    }

    // Unknown session ID
    return HttpResponse.json(
      { error: 'Session not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }
);

// ============================================================================
// Error Simulation Handlers
// ============================================================================

/**
 * Handlers for testing error scenarios
 * Use specific camera IDs to trigger different error responses
 */
export const errorSimulationHandlers = [
  // Camera ID that always returns 404
  http.get('/api/v1/cameras/espcam-404404/diagnostics', () => {
    return HttpResponse.json(mockErrorResponses.notFound, { status: 404 });
  }),

  // Camera ID that always returns 503
  http.get('/api/v1/cameras/espcam-503503/diagnostics', () => {
    return HttpResponse.json(mockErrorResponses.offline, { status: 503 });
  }),

  // Camera ID that times out
  http.get('/api/v1/cameras/espcam-timeout/diagnostics', async () => {
    await delay(30000); // 30 second delay to trigger timeout
    return HttpResponse.json(mockCameraDiagnosticsResponse);
  }),

  // Evidence capture that fails
  http.post('/api/v1/cameras/espcam-capfail/evidence', () => {
    return HttpResponse.json(mockErrorResponses.captureError, { status: 500 });
  }),
];

// ============================================================================
// Handler Collections
// ============================================================================

/**
 * All camera diagnostics handlers for standard testing
 */
export const cameraDiagnosticsHandlers = [
  getCameraDiagnosticsHandler,
  listCameraDiagnosticsLegacyHandler,
  captureEvidenceHandler,
  getSessionDetailHandler,
];

/**
 * All handlers including error simulations
 */
export const allCameraDiagnosticsHandlers = [
  ...cameraDiagnosticsHandlers,
  ...errorSimulationHandlers,
];

export default cameraDiagnosticsHandlers;
