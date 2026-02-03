/**
 * MSW Handlers for Diagnostics API - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Mock Service Worker handlers for diagnostics endpoints.
 */

import { http, HttpResponse, delay } from 'msw';
import {
  bridgeServerHealthyApiResponse,
  bridgeServerNotReadyApiResponse,
  storageHealthyApiResponse,
  storageUnhealthyApiResponse,
} from '../diagnostics/health-fixtures';
import {
  sessionListApiResponse,
  sessionListEmptyApiResponse,
  evidenceListApiResponse,
  evidenceListEmptyApiResponse,
} from '../diagnostics/session-fixtures';

const BASE_URL = '/api';

// ============================================================================
// Diagnostics Mock Data State
// ============================================================================

export const diagnosticsMockData = {
  bridgeServerHealth: { ...bridgeServerHealthyApiResponse },
  storageHealth: { ...storageHealthyApiResponse },
  piOrchestratorHealthy: true,
  sessions: [...sessionListApiResponse.data.sessions],
  evidence: [...evidenceListApiResponse.data.evidence],
};

// ============================================================================
// Diagnostics Handlers Factory
// ============================================================================

/**
 * Create diagnostics handlers with optional overrides.
 */
export function createDiagnosticsHandlers(overrides?: Partial<typeof diagnosticsMockData>) {
  const data = { ...diagnosticsMockData, ...overrides };

  return [
    // BridgeServer health check
    http.get(`${BASE_URL}/dashboard/diagnostics/bridgeserver`, async () => {
      await delay(50);
      return HttpResponse.json(data.bridgeServerHealth);
    }),

    // PiOrchestrator health check (via system/info endpoint)
    http.get(`${BASE_URL}/system/info`, async () => {
      await delay(50);
      if (data.piOrchestratorHealthy) {
        return HttpResponse.json({
          cpu_percent: 45.5,
          memory_percent: 62.3,
          uptime_seconds: 86400,
          hostname: 'delicasa-pi-001',
        });
      }
      return HttpResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }),

    // MinIO storage health check
    http.get(`${BASE_URL}/dashboard/diagnostics/minio`, async () => {
      await delay(50);
      return HttpResponse.json(data.storageHealth);
    }),

    // Sessions list
    http.get(`${BASE_URL}/dashboard/diagnostics/sessions`, async ({ request }) => {
      await delay(75);

      const url = new URL(request.url);
      const statusFilter = url.searchParams.get('status') || 'active';
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);

      let filteredSessions = data.sessions;

      if (statusFilter !== 'all') {
        filteredSessions = filteredSessions.filter((s) => s.status === statusFilter);
      }

      filteredSessions = filteredSessions.slice(0, limit);

      return HttpResponse.json({
        success: true,
        data: {
          sessions: filteredSessions,
        },
      });
    }),

    // Session detail
    http.get(`${BASE_URL}/dashboard/diagnostics/sessions/:sessionId`, async ({ params }) => {
      await delay(50);

      const sessionId = params.sessionId as string;
      const session = data.sessions.find((s) => s.id === sessionId);

      if (!session) {
        return HttpResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }

      return HttpResponse.json({
        success: true,
        data: session,
      });
    }),

    // Session evidence
    http.get(
      `${BASE_URL}/dashboard/diagnostics/sessions/:sessionId/evidence`,
      async ({ params, request }) => {
        await delay(75);

        const sessionId = params.sessionId as string;
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);

        const sessionEvidence = data.evidence
          .filter((e) => e.session_id === sessionId)
          .slice(0, limit);

        return HttpResponse.json({
          success: true,
          data: {
            evidence: sessionEvidence,
          },
        });
      }
    ),

    // Presign URL
    http.get(`${BASE_URL}/dashboard/diagnostics/images/presign`, async ({ request }) => {
      await delay(50);

      const url = new URL(request.url);
      const key = url.searchParams.get('key');

      if (!key) {
        return HttpResponse.json(
          { success: false, error: 'Missing key parameter' },
          { status: 400 }
        );
      }

      return HttpResponse.json({
        success: true,
        data: {
          url: `https://minio.example.com/refreshed/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900`,
          expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        },
      });
    }),
  ];
}

// ============================================================================
// Diagnostics Error Handlers
// ============================================================================

export const diagnosticsErrorHandlers = {
  bridgeServerUnavailable: http.get(
    `${BASE_URL}/dashboard/diagnostics/bridgeserver`,
    async () => {
      await delay(50);
      return HttpResponse.json(
        { error: 'BridgeServer health endpoint not available' },
        { status: 503 }
      );
    }
  ),

  bridgeServerNotReady: http.get(
    `${BASE_URL}/dashboard/diagnostics/bridgeserver`,
    async () => {
      await delay(50);
      return HttpResponse.json(bridgeServerNotReadyApiResponse);
    }
  ),

  minioUnavailable: http.get(`${BASE_URL}/dashboard/diagnostics/minio`, async () => {
    await delay(50);
    return HttpResponse.json(
      { error: 'MinIO health endpoint not available' },
      { status: 503 }
    );
  }),

  minioUnhealthy: http.get(`${BASE_URL}/dashboard/diagnostics/minio`, async () => {
    await delay(50);
    return HttpResponse.json(storageUnhealthyApiResponse);
  }),

  sessionsUnavailable: http.get(`${BASE_URL}/dashboard/diagnostics/sessions`, async () => {
    await delay(50);
    return HttpResponse.json(
      { error: 'Sessions endpoint not available' },
      { status: 503 }
    );
  }),

  sessionsEmpty: http.get(`${BASE_URL}/dashboard/diagnostics/sessions`, async () => {
    await delay(50);
    return HttpResponse.json(sessionListEmptyApiResponse);
  }),

  sessionNotFound: http.get(
    `${BASE_URL}/dashboard/diagnostics/sessions/:sessionId`,
    async () => {
      await delay(50);
      return HttpResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }
  ),

  evidenceEmpty: http.get(
    `${BASE_URL}/dashboard/diagnostics/sessions/:sessionId/evidence`,
    async () => {
      await delay(50);
      return HttpResponse.json(evidenceListEmptyApiResponse);
    }
  ),

  presignFailed: http.get(`${BASE_URL}/dashboard/diagnostics/images/presign`, async () => {
    await delay(50);
    return HttpResponse.json(
      { success: false, error: 'Image not found' },
      { status: 404 }
    );
  }),

  networkError: http.get(`${BASE_URL}/dashboard/diagnostics/*`, async () => {
    await delay(100);
    return HttpResponse.error();
  }),
};

// Default diagnostics handlers export
export const diagnosticsHandlers = createDiagnosticsHandlers();
