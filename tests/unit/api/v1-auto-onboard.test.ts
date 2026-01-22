/**
 * V1 Auto-Onboard API Client Tests
 * Feature: 035-auto-onboard-dashboard
 * Tasks: T009, T010, T018, T027, T036, T037, T056
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { autoOnboardApi } from '@/infrastructure/api/v1-auto-onboard';
import { V1ApiError } from '@/infrastructure/api/errors';
import {
  AutoOnboardStatusSchema,
  EnableDisableResponseSchema,
  AuditEventsResponseSchema,
  ResetMetricsResponseSchema,
  CleanupEventsResponseSchema,
} from '@/infrastructure/api/v1-auto-onboard-schemas';
import {
  createAutoOnboardHandlers,
  mockConfig,
  mockMetrics,
  mockEvents,
  resetAutoOnboardMockState,
  setAutoOnboardMockState,
  autoOnboardErrorHandlers,
} from '../../mocks/v1-auto-onboard-handlers';

// ============================================================================
// Test Server Setup
// ============================================================================

const server = setupServer(...createAutoOnboardHandlers());

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetAutoOnboardMockState();
});
afterAll(() => server.close());

// ============================================================================
// Schema Validation Tests (T009)
// ============================================================================

describe('AutoOnboard Schema Validation', () => {
  it('should validate AutoOnboardStatus schema', () => {
    const validStatus = {
      enabled: true,
      mode: 'dev',
      running: true,
      config: mockConfig,
      metrics: mockMetrics,
    };

    const result = AutoOnboardStatusSchema.safeParse(validStatus);
    expect(result.success).toBe(true);
  });

  it('should reject invalid mode value', () => {
    const invalidStatus = {
      enabled: true,
      mode: 'production', // Invalid
      config: mockConfig,
    };

    const result = AutoOnboardStatusSchema.safeParse(invalidStatus);
    expect(result.success).toBe(false);
  });

  it('should allow optional metrics', () => {
    const statusWithoutMetrics = {
      enabled: false,
      mode: 'off',
      config: mockConfig,
    };

    const result = AutoOnboardStatusSchema.safeParse(statusWithoutMetrics);
    expect(result.success).toBe(true);
  });

  it('should validate EnableDisableResponse schema', () => {
    const response = {
      success: true,
      data: {
        enabled: true,
        running: true,
        message: 'Auto-onboard enabled',
      },
      timestamp: new Date().toISOString(),
    };

    const result = EnableDisableResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should validate AuditEventsResponse schema', () => {
    const response = {
      success: true,
      data: {
        events: mockEvents,
        pagination: {
          total: mockEvents.length,
          limit: 50,
          offset: 0,
          has_more: false,
        },
      },
      timestamp: new Date().toISOString(),
    };

    const result = AuditEventsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should validate ResetMetricsResponse schema', () => {
    const response = {
      success: true,
      data: { message: 'Metrics reset' },
      timestamp: new Date().toISOString(),
    };

    const result = ResetMetricsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should validate CleanupEventsResponse schema', () => {
    const response = {
      success: true,
      data: { deleted_count: 10, message: 'Deleted 10 events' },
      timestamp: new Date().toISOString(),
    };

    const result = CleanupEventsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// getStatus Tests (T010)
// ============================================================================

describe('autoOnboardApi.getStatus', () => {
  it('should return auto-onboard status', async () => {
    const status = await autoOnboardApi.getStatus();

    expect(status).toBeDefined();
    expect(status).toHaveProperty('enabled');
    expect(status).toHaveProperty('mode');
    expect(status).toHaveProperty('config');
  });

  it('should include config properties', async () => {
    const status = await autoOnboardApi.getStatus();

    expect(status.config).toHaveProperty('max_per_minute');
    expect(status.config).toHaveProperty('burst_size');
    expect(status.config).toHaveProperty('subnet_allowlist');
    expect(status.config).toHaveProperty('verification_timeout_sec');
  });

  it('should include metrics when available', async () => {
    setAutoOnboardMockState({ enabled: true, running: true });
    const status = await autoOnboardApi.getStatus();

    expect(status.metrics).toBeDefined();
    expect(status.metrics?.attempts).toBeTypeOf('number');
    expect(status.metrics?.success).toBeTypeOf('number');
    expect(status.metrics?.failed).toBeTypeOf('number');
  });

  it('should throw V1ApiError on server error', async () => {
    server.use(autoOnboardErrorHandlers.internalError);

    await expect(autoOnboardApi.getStatus()).rejects.toThrow(V1ApiError);
  });

  it('should throw V1ApiError on network error', async () => {
    server.use(autoOnboardErrorHandlers.networkError);

    await expect(autoOnboardApi.getStatus()).rejects.toThrow();
  });
});

// ============================================================================
// enable/disable Tests (T018)
// ============================================================================

describe('autoOnboardApi.enable', () => {
  it('should enable auto-onboard when mode is dev', async () => {
    setAutoOnboardMockState({ mode: 'dev', enabled: false });
    const result = await autoOnboardApi.enable();

    expect(result.enabled).toBe(true);
    expect(result.running).toBe(true);
    expect(result.message).toBeDefined();
  });

  it('should throw ONBOARD_ENABLE_FAILED when mode is off', async () => {
    server.use(autoOnboardErrorHandlers.enableFailed);

    try {
      await autoOnboardApi.enable();
      expect.fail('Should have thrown');
    } catch (error) {
      expect(V1ApiError.isV1ApiError(error)).toBe(true);
      expect((error as V1ApiError).code).toBe('ONBOARD_ENABLE_FAILED');
    }
  });
});

describe('autoOnboardApi.disable', () => {
  it('should disable auto-onboard', async () => {
    setAutoOnboardMockState({ enabled: true, running: true });
    const result = await autoOnboardApi.disable();

    expect(result.enabled).toBe(false);
    expect(result.running).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('should work even when already disabled', async () => {
    setAutoOnboardMockState({ enabled: false, running: false });
    const result = await autoOnboardApi.disable();

    expect(result.enabled).toBe(false);
  });
});

// ============================================================================
// resetMetrics Tests (T027)
// ============================================================================

describe('autoOnboardApi.resetMetrics', () => {
  it('should reset metrics successfully', async () => {
    const result = await autoOnboardApi.resetMetrics();

    expect(result.message).toBeDefined();
    expect(result.message).toContain('reset');
  });

  it('should throw V1ApiError on failure', async () => {
    server.use(
      http.post('/api/v1/onboarding/auto/metrics/reset', () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: 'ONBOARD_INTERNAL_ERROR', message: 'Reset failed' },
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        )
      )
    );

    await expect(autoOnboardApi.resetMetrics()).rejects.toThrow(V1ApiError);
  });
});

// ============================================================================
// getEvents Tests (T036)
// ============================================================================

describe('autoOnboardApi.getEvents', () => {
  it('should return paginated events', async () => {
    const result = await autoOnboardApi.getEvents();

    expect(result.events).toBeInstanceOf(Array);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.total).toBeTypeOf('number');
    expect(result.pagination.limit).toBeTypeOf('number');
  });

  it('should include event properties', async () => {
    const result = await autoOnboardApi.getEvents();
    const event = result.events[0];

    expect(event).toHaveProperty('id');
    expect(event).toHaveProperty('mac_address');
    expect(event).toHaveProperty('stage');
    expect(event).toHaveProperty('outcome');
    expect(event).toHaveProperty('timestamp');
  });

  it('should filter by MAC address', async () => {
    const mac = 'AA:BB:CC:DD:EE:01';
    const result = await autoOnboardApi.getEvents({ mac });

    expect(result.events.every((e) => e.mac_address === mac)).toBe(true);
  });

  it('should filter by stage', async () => {
    const result = await autoOnboardApi.getEvents({ stage: 'paired' });

    expect(result.events.every((e) => e.stage === 'paired')).toBe(true);
  });

  it('should respect pagination limit', async () => {
    const limit = 2;
    const result = await autoOnboardApi.getEvents({ limit });

    expect(result.events.length).toBeLessThanOrEqual(limit);
    expect(result.pagination.limit).toBe(limit);
  });

  it('should support pagination offset', async () => {
    const result1 = await autoOnboardApi.getEvents({ limit: 2, offset: 0 });
    const result2 = await autoOnboardApi.getEvents({ limit: 2, offset: 2 });

    expect(result1.pagination.offset).toBe(0);
    expect(result2.pagination.offset).toBe(2);
  });
});

// ============================================================================
// getEventsByMac Tests (T037)
// ============================================================================

describe('autoOnboardApi.getEventsByMac', () => {
  it('should return events for specific MAC', async () => {
    const mac = 'AA:BB:CC:DD:EE:01';
    const result = await autoOnboardApi.getEventsByMac(mac);

    expect(result.events).toBeInstanceOf(Array);
    expect(result.events.every((e) => e.mac_address === mac)).toBe(true);
  });

  it('should return empty array for unknown MAC', async () => {
    const result = await autoOnboardApi.getEventsByMac('ZZ:ZZ:ZZ:ZZ:ZZ:ZZ');

    expect(result.events).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it('should support pagination', async () => {
    const mac = 'AA:BB:CC:DD:EE:01';
    const result = await autoOnboardApi.getEventsByMac(mac, 1, 0);

    expect(result.pagination.limit).toBe(1);
    expect(result.pagination.offset).toBe(0);
  });
});

// ============================================================================
// cleanupEvents Tests (T056)
// ============================================================================

describe('autoOnboardApi.cleanupEvents', () => {
  it('should cleanup events with default retention', async () => {
    const result = await autoOnboardApi.cleanupEvents();

    expect(result.deleted_count).toBeTypeOf('number');
    expect(result.message).toBeDefined();
  });

  it('should accept custom retention days', async () => {
    const result = await autoOnboardApi.cleanupEvents({ days: 7 });

    expect(result.deleted_count).toBeTypeOf('number');
    expect(result.message).toContain('7 days');
  });

  it('should throw V1ApiError on failure', async () => {
    server.use(
      http.post('/api/v1/onboarding/auto/events/cleanup', () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: 'ONBOARD_INTERNAL_ERROR', message: 'Cleanup failed' },
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        )
      )
    );

    await expect(autoOnboardApi.cleanupEvents()).rejects.toThrow(V1ApiError);
  });
});
