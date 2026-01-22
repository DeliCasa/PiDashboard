/**
 * MSW Handlers for V1 Auto-Onboard API
 * Feature: 035-auto-onboard-dashboard
 *
 * Mock Service Worker handlers for auto-onboard endpoints.
 */

import { http, HttpResponse, delay } from 'msw';
import type {
  AutoOnboardStatus,
  AutoOnboardConfig,
  AutoOnboardMetrics,
  OnboardingAuditEntry,
  StatusResponse,
  EnableDisableResponse,
  AuditEventsResponse,
  ResetMetricsResponse,
  CleanupEventsResponse,
  AuditEventStage,
} from '@/infrastructure/api/v1-auto-onboard-schemas';

// ============================================================================
// Constants
// ============================================================================

const BASE_URL = '/api/v1/onboarding/auto';

// ============================================================================
// Mock Data
// ============================================================================

export const mockConfig: AutoOnboardConfig = {
  max_per_minute: 10,
  burst_size: 5,
  subnet_allowlist: ['192.168.10.0/24'],
  verification_timeout_sec: 5,
};

export const mockMetrics: AutoOnboardMetrics = {
  attempts: 15,
  success: 12,
  failed: 2,
  rejected_by_policy: 1,
  already_onboarded: 0,
  last_success_at: new Date(Date.now() - 3600000).toISOString(),
  last_failure_at: new Date(Date.now() - 7200000).toISOString(),
};

export const mockEvents: OnboardingAuditEntry[] = [
  {
    id: 1,
    mac_address: 'AA:BB:CC:DD:EE:01',
    stage: 'paired',
    outcome: 'success',
    device_id: 'device-001',
    ip_address: '192.168.10.101',
    firmware_version: '1.0.0',
    container_id: 'container-abc',
    duration_ms: 1500,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    mac_address: 'AA:BB:CC:DD:EE:02',
    stage: 'verified',
    outcome: 'success',
    device_id: 'device-002',
    ip_address: '192.168.10.102',
    firmware_version: '1.0.1',
    duration_ms: 800,
    timestamp: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: 3,
    mac_address: 'AA:BB:CC:DD:EE:03',
    stage: 'failed',
    outcome: 'failure',
    error_code: 'VERIFICATION_TIMEOUT',
    error_message: 'Device did not respond within timeout',
    ip_address: '192.168.10.103',
    duration_ms: 5000,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 4,
    mac_address: 'AA:BB:CC:DD:EE:04',
    stage: 'rejected_by_policy',
    outcome: 'failure',
    error_code: 'RATE_LIMITED',
    error_message: 'Rate limit exceeded',
    ip_address: '192.168.10.104',
    timestamp: new Date(Date.now() - 9000000).toISOString(),
  },
];

// ============================================================================
// State
// ============================================================================

export interface AutoOnboardMockState {
  enabled: boolean;
  running: boolean;
  mode: 'off' | 'dev';
  config: AutoOnboardConfig;
  metrics: AutoOnboardMetrics;
  events: OnboardingAuditEntry[];
  responseDelay?: number;
}

const defaultState: AutoOnboardMockState = {
  enabled: false,
  running: false,
  mode: 'dev',
  config: { ...mockConfig },
  metrics: { ...mockMetrics },
  events: [...mockEvents],
  responseDelay: 100,
};

// Mutable state for testing
let mockState = { ...defaultState };

/** Reset mock state to defaults */
export function resetAutoOnboardMockState(): void {
  mockState = { ...defaultState, events: [...mockEvents] };
}

/** Get current mock state for assertions */
export function getAutoOnboardMockState(): AutoOnboardMockState {
  return { ...mockState };
}

/** Update mock state for test scenarios */
export function setAutoOnboardMockState(updates: Partial<AutoOnboardMockState>): void {
  mockState = { ...mockState, ...updates };
}

// ============================================================================
// Response Helpers
// ============================================================================

function timestamp(): string {
  return new Date().toISOString();
}

function successResponse<T>(data: T): { success: true; data: T; timestamp: string } {
  return { success: true, data, timestamp: timestamp() };
}

function errorResponse(code: string, message: string, retryable = false) {
  return {
    success: false,
    error: { code, message, retryable },
    timestamp: timestamp(),
  };
}

// ============================================================================
// Handlers
// ============================================================================

export function createAutoOnboardHandlers(overrides?: Partial<AutoOnboardMockState>) {
  if (overrides) {
    mockState = { ...mockState, ...overrides };
  }

  return [
    // GET /status - Get auto-onboard status
    http.get(`${BASE_URL}/status`, async () => {
      await delay(mockState.responseDelay ?? 100);

      const status: AutoOnboardStatus = {
        enabled: mockState.enabled,
        mode: mockState.mode,
        running: mockState.running,
        config: mockState.config,
        metrics: mockState.metrics,
      };

      return HttpResponse.json<StatusResponse>(successResponse(status));
    }),

    // POST /enable - Enable auto-onboard
    http.post(`${BASE_URL}/enable`, async () => {
      await delay(mockState.responseDelay ?? 100);

      if (mockState.mode !== 'dev') {
        return HttpResponse.json(
          errorResponse('ONBOARD_ENABLE_FAILED', "auto-onboard mode must be 'dev' to enable"),
          { status: 400 }
        );
      }

      mockState.enabled = true;
      mockState.running = true;

      return HttpResponse.json<EnableDisableResponse>(
        successResponse({
          enabled: true,
          running: true,
          message: 'Auto-onboard enabled successfully',
        })
      );
    }),

    // POST /disable - Disable auto-onboard (kill switch)
    http.post(`${BASE_URL}/disable`, async () => {
      await delay(mockState.responseDelay ?? 100);

      mockState.enabled = false;
      mockState.running = false;

      return HttpResponse.json<EnableDisableResponse>(
        successResponse({
          enabled: false,
          running: false,
          message: 'Auto-onboard disabled successfully',
        })
      );
    }),

    // GET /events - Get paginated audit events
    http.get(`${BASE_URL}/events`, async ({ request }) => {
      await delay(mockState.responseDelay ?? 100);

      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const mac = url.searchParams.get('mac');
      const stage = url.searchParams.get('stage') as AuditEventStage | null;
      const since = url.searchParams.get('since');

      let filteredEvents = [...mockState.events];

      // Apply filters
      if (mac) {
        filteredEvents = filteredEvents.filter((e) => e.mac_address === mac);
      }
      if (stage) {
        filteredEvents = filteredEvents.filter((e) => e.stage === stage);
      }
      if (since) {
        const sinceDate = new Date(since);
        filteredEvents = filteredEvents.filter((e) => new Date(e.timestamp) >= sinceDate);
      }

      const total = filteredEvents.length;
      const paginatedEvents = filteredEvents.slice(offset, offset + limit);

      return HttpResponse.json<AuditEventsResponse>(
        successResponse({
          events: paginatedEvents,
          pagination: {
            total,
            limit,
            offset,
            has_more: offset + limit < total,
          },
        })
      );
    }),

    // GET /events/:mac - Get events for specific device
    http.get(`${BASE_URL}/events/:mac`, async ({ params, request }) => {
      await delay(mockState.responseDelay ?? 100);

      const mac = decodeURIComponent(params.mac as string);
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      const filteredEvents = mockState.events.filter((e) => e.mac_address === mac);
      const total = filteredEvents.length;
      const paginatedEvents = filteredEvents.slice(offset, offset + limit);

      return HttpResponse.json<AuditEventsResponse>(
        successResponse({
          events: paginatedEvents,
          pagination: {
            total,
            limit,
            offset,
            has_more: offset + limit < total,
          },
        })
      );
    }),

    // POST /metrics/reset - Reset metrics counters
    http.post(`${BASE_URL}/metrics/reset`, async () => {
      await delay(mockState.responseDelay ?? 100);

      mockState.metrics = {
        attempts: 0,
        success: 0,
        failed: 0,
        rejected_by_policy: 0,
        already_onboarded: 0,
        last_success_at: undefined,
        last_failure_at: undefined,
      };

      return HttpResponse.json<ResetMetricsResponse>(
        successResponse({
          message: 'Metrics reset successfully',
        })
      );
    }),

    // POST /events/cleanup - Cleanup old events
    http.post(`${BASE_URL}/events/cleanup`, async ({ request }) => {
      await delay(mockState.responseDelay ?? 100);

      const url = new URL(request.url);
      const days = parseInt(url.searchParams.get('days') || '90', 10);

      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const originalCount = mockState.events.length;
      mockState.events = mockState.events.filter((e) => new Date(e.timestamp) >= cutoffDate);
      const deletedCount = originalCount - mockState.events.length;

      return HttpResponse.json<CleanupEventsResponse>(
        successResponse({
          deleted_count: deletedCount,
          message: `Deleted ${deletedCount} events older than ${days} days`,
        })
      );
    }),
  ];
}

// ============================================================================
// Error Handlers
// ============================================================================

export const autoOnboardErrorHandlers = {
  /** Mode is "off" - cannot enable */
  modeOff: http.get(`${BASE_URL}/status`, async () => {
    await delay(50);
    return HttpResponse.json<StatusResponse>(
      successResponse({
        enabled: false,
        mode: 'off',
        config: mockConfig,
      })
    );
  }),

  /** Returns 500 for status */
  internalError: http.get(`${BASE_URL}/status`, async () => {
    await delay(50);
    return HttpResponse.json(
      errorResponse('ONBOARD_INTERNAL_ERROR', 'Internal server error', true),
      { status: 500 }
    );
  }),

  /** Network error for status */
  networkError: http.get(`${BASE_URL}/status`, async () => {
    await delay(50);
    return HttpResponse.error();
  }),

  /** Enable fails when mode is off */
  enableFailed: http.post(`${BASE_URL}/enable`, async () => {
    await delay(50);
    return HttpResponse.json(
      errorResponse('ONBOARD_ENABLE_FAILED', "auto-onboard mode must be 'dev' to enable"),
      { status: 400 }
    );
  }),

  /** Rate limited */
  rateLimited: http.post(`${BASE_URL}/enable`, async () => {
    await delay(50);
    return HttpResponse.json(
      errorResponse('ONBOARD_RATE_LIMITED', 'Too many requests', true),
      { status: 429 }
    );
  }),
};

// ============================================================================
// Exports
// ============================================================================

/** Default handlers with mock data */
export const autoOnboardHandlers = createAutoOnboardHandlers();
