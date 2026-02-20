/**
 * MSW Handlers for Diagnostics API - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 * Feature: 059-real-ops-drilldown - V1 endpoint URLs
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
  evidenceListEmptyApiResponse,
  captureBeforeOpen,
  captureAfterClose,
  captureS3Only,
} from '../diagnostics/session-fixtures';
import type { CaptureEntry, Session } from '@/infrastructure/api/diagnostics-schemas';

const BASE_URL = '/api';

// ============================================================================
// Diagnostics Mock Data State
// ============================================================================

export const diagnosticsMockData = {
  bridgeServerHealth: { ...bridgeServerHealthyApiResponse },
  storageHealth: { ...storageHealthyApiResponse },
  piOrchestratorHealthy: true,
  sessions: [...sessionListApiResponse.data.sessions],
  captures: [captureBeforeOpen, captureAfterClose, captureS3Only] as CaptureEntry[],
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

    // V1 Sessions list
    http.get(`${BASE_URL}/v1/diagnostics/sessions`, async () => {
      await delay(75);

      return HttpResponse.json({
        success: true,
        data: {
          sessions: data.sessions,
          total: data.sessions.length,
          queried_at: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    }),

    // V1 Session evidence
    http.get(
      `${BASE_URL}/v1/sessions/:sessionId/evidence`,
      async ({ params }) => {
        await delay(75);

        const sessionId = params.sessionId as string;
        const sessionCaptures = data.captures
          .filter((c) => c.session_id === sessionId);

        const successful = sessionCaptures.filter((c) => c.status === 'captured').length;
        const failed = sessionCaptures.filter((c) => c.status !== 'captured').length;

        return HttpResponse.json({
          success: true,
          data: {
            session_id: sessionId,
            container_id: data.sessions.find((s) => s.session_id === sessionId)?.container_id ?? '',
            captures: sessionCaptures,
            summary: {
              total_captures: sessionCaptures.length,
              successful_captures: successful,
              failed_captures: failed,
              has_before_open: sessionCaptures.some((c) => c.capture_tag === 'BEFORE_OPEN'),
              has_after_close: sessionCaptures.some((c) => c.capture_tag === 'AFTER_CLOSE'),
              pair_complete: sessionCaptures.some((c) => c.capture_tag === 'BEFORE_OPEN') &&
                sessionCaptures.some((c) => c.capture_tag === 'AFTER_CLOSE'),
            },
          },
          timestamp: new Date().toISOString(),
        });
      }
    ),

    // V1 Evidence pair
    http.get(
      `${BASE_URL}/v1/sessions/:sessionId/evidence/pair`,
      async ({ params }) => {
        await delay(50);

        const sessionId = params.sessionId as string;
        const sessionCaptures = data.captures
          .filter((c) => c.session_id === sessionId);

        const before = sessionCaptures.find((c) => c.capture_tag === 'BEFORE_OPEN') ?? null;
        const after = sessionCaptures.find((c) => c.capture_tag === 'AFTER_CLOSE') ?? null;

        const pairStatus = before && after ? 'complete' :
          before || after ? 'incomplete' : 'missing';

        return HttpResponse.json({
          success: true,
          data: {
            contract_version: 'v1',
            session_id: sessionId,
            container_id: data.sessions.find((s) => s.session_id === sessionId)?.container_id ?? '',
            pair_status: pairStatus,
            before: before ? { ...before, captured_at: before.created_at } : null,
            after: after ? { ...after, captured_at: after.created_at } : null,
            queried_at: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      }
    ),
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

  sessionsUnavailable: http.get(`${BASE_URL}/v1/diagnostics/sessions`, async () => {
    await delay(50);
    return HttpResponse.json(
      { error: 'Sessions endpoint not available' },
      { status: 503 }
    );
  }),

  sessionsEmpty: http.get(`${BASE_URL}/v1/diagnostics/sessions`, async () => {
    await delay(50);
    return HttpResponse.json(sessionListEmptyApiResponse);
  }),

  sessionNotFound: http.get(
    `${BASE_URL}/v1/diagnostics/sessions`,
    async () => {
      await delay(50);
      return HttpResponse.json({
        success: true,
        data: {
          sessions: [] as Session[],
          total: 0,
          queried_at: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    }
  ),

  evidenceEmpty: http.get(
    `${BASE_URL}/v1/sessions/:sessionId/evidence`,
    async () => {
      await delay(50);
      return HttpResponse.json(evidenceListEmptyApiResponse);
    }
  ),

  networkError: http.get(`${BASE_URL}/v1/diagnostics/*`, async () => {
    await delay(100);
    return HttpResponse.error();
  }),
};

// Default diagnostics handlers export
export const diagnosticsHandlers = createDiagnosticsHandlers();
