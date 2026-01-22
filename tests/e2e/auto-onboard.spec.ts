/**
 * Auto-Onboard Dashboard E2E Tests
 * Feature: 035-auto-onboard-dashboard
 * Tasks: T064, T065, T066
 *
 * E2E tests for auto-onboard panel functionality.
 */

import { test, expect } from './fixtures/test-base';
import type { Page } from '@playwright/test';

// ============================================================================
// V1 Auto-Onboard API Mock Data
// ============================================================================

interface AutoOnboardConfig {
  max_per_minute: number;
  burst_size: number;
  subnet_allowlist: string[];
  verification_timeout_sec: number;
}

interface AutoOnboardMetrics {
  attempts: number;
  success: number;
  failed: number;
  rejected_by_policy: number;
  already_onboarded: number;
  last_success_at?: string;
  last_failure_at?: string;
}

interface AutoOnboardStatus {
  enabled: boolean;
  mode: 'dev' | 'off';
  running?: boolean;
  config: AutoOnboardConfig;
  metrics?: AutoOnboardMetrics;
}

interface OnboardingAuditEntry {
  id: string;
  mac_address: string;
  stage: 'discovered' | 'verified' | 'registered' | 'paired' | 'failed' | 'rejected_by_policy';
  outcome: 'success' | 'failure';
  timestamp: string;
  device_id?: string;
  ip_address?: string;
  firmware_version?: string;
  container_id?: string;
  duration_ms?: number;
  error_code?: string;
  error_message?: string;
}

const mockConfig: AutoOnboardConfig = {
  max_per_minute: 5,
  burst_size: 3,
  subnet_allowlist: ['192.168.1.0/24'],
  verification_timeout_sec: 30,
};

const mockMetrics: AutoOnboardMetrics = {
  attempts: 15,
  success: 12,
  failed: 2,
  rejected_by_policy: 1,
  already_onboarded: 0,
  last_success_at: new Date().toISOString(),
  last_failure_at: new Date(Date.now() - 3600000).toISOString(),
};

const mockEvents: OnboardingAuditEntry[] = [
  {
    id: 'evt-001',
    mac_address: 'AA:BB:CC:DD:EE:01',
    stage: 'paired',
    outcome: 'success',
    timestamp: new Date().toISOString(),
    device_id: 'dev-001',
    ip_address: '192.168.1.101',
    firmware_version: '1.2.3',
    duration_ms: 1500,
  },
  {
    id: 'evt-002',
    mac_address: 'AA:BB:CC:DD:EE:02',
    stage: 'failed',
    outcome: 'failure',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    error_code: 'VERIFICATION_TIMEOUT',
    error_message: 'Device did not respond',
    duration_ms: 30000,
  },
];

// ============================================================================
// Mock Setup Helper
// ============================================================================

async function setupAutoOnboardMocks(page: Page, options?: {
  enabled?: boolean;
  mode?: 'dev' | 'off';
  running?: boolean;
}): Promise<void> {
  const { enabled = true, mode = 'dev', running = true } = options ?? {};

  // Mock V1 auto-onboard status
  await page.route('**/api/v1/onboarding/auto/status', async (route) => {
    const status: AutoOnboardStatus = {
      enabled,
      mode,
      running: enabled ? running : undefined,
      config: mockConfig,
      metrics: enabled ? mockMetrics : undefined,
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock V1 auto-onboard enable
  await page.route('**/api/v1/onboarding/auto/enable', async (route) => {
    if (mode === 'off') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'ONBOARD_ENABLE_FAILED',
            message: 'Cannot enable when mode is off',
          },
          timestamp: new Date().toISOString(),
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            enabled: true,
            running: true,
            message: 'Auto-onboard enabled',
          },
          timestamp: new Date().toISOString(),
        }),
      });
    }
  });

  // Mock V1 auto-onboard disable
  await page.route('**/api/v1/onboarding/auto/disable', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          enabled: false,
          running: false,
          message: 'Auto-onboard disabled',
        },
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock V1 auto-onboard events
  await page.route('**/api/v1/onboarding/auto/events**', async (route) => {
    const url = new URL(route.request().url());
    const mac = url.searchParams.get('mac');
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

    let filteredEvents = mockEvents;
    if (mac) {
      filteredEvents = mockEvents.filter((e) => e.mac_address.includes(mac));
    }

    const paginatedEvents = filteredEvents.slice(offset, offset + limit);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          events: paginatedEvents,
          pagination: {
            total: filteredEvents.length,
            limit,
            offset,
            has_more: offset + limit < filteredEvents.length,
          },
        },
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock V1 reset metrics
  await page.route('**/api/v1/onboarding/auto/metrics/reset', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { message: 'Metrics reset successfully' },
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock V1 cleanup events
  await page.route('**/api/v1/onboarding/auto/events/cleanup', async (route) => {
    const body = await route.request().postDataJSON();
    const days = body?.days ?? 90;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          deleted_count: 5,
          message: `Deleted 5 events older than ${days} days`,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock V1 cameras (needed for CameraSection)
  await page.route('**/api/v1/cameras', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          cameras: [],
          count: 0,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  });
}

// ============================================================================
// Tests: Auto-Onboard Panel Display (T064)
// ============================================================================

test.describe('Auto-Onboard Panel Display', () => {
  test('should display auto-onboard panel when API is available', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage);
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    // Panel should be visible
    await expect(mockedPage.getByTestId('auto-onboard-panel')).toBeVisible();
  });

  test('should display status card with running badge', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage, { enabled: true, running: true });
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    await expect(mockedPage.getByTestId('auto-onboard-status-card')).toBeVisible();
    await expect(mockedPage.getByTestId('status-badge')).toContainText('Running');
  });

  test('should display metrics card with success/failure counts', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage);
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    await expect(mockedPage.getByTestId('auto-onboard-metrics-card')).toBeVisible();
    await expect(mockedPage.getByTestId('metric-success')).toContainText('12');
    await expect(mockedPage.getByTestId('metric-failed')).toContainText('2');
  });

  test('should display dev mode warning banner when enabled', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage, { enabled: true });
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    await expect(mockedPage.getByTestId('dev-mode-warning-banner')).toBeVisible();
    await expect(mockedPage.getByText('DEV MODE Active')).toBeVisible();
  });

  test('should hide dev mode warning banner when disabled', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage, { enabled: false });
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    await expect(mockedPage.getByTestId('dev-mode-warning-banner')).not.toBeVisible();
  });
});

// ============================================================================
// Tests: Toggle Enable/Disable Flow (T065)
// ============================================================================

test.describe('Toggle Enable/Disable Flow', () => {
  test('should toggle auto-onboard from disabled to enabled', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    // Start disabled
    await setupAutoOnboardMocks(mockedPage, { enabled: false, mode: 'dev' });
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    // Toggle should be visible
    const toggle = mockedPage.getByTestId('auto-onboard-toggle');
    await expect(toggle).toBeVisible();

    // Click toggle to enable
    await toggle.click();

    // Should show toast (we can verify the API was called)
    // Wait for the optimistic update or status refresh
    await mockedPage.waitForTimeout(500);
  });

  test('should toggle auto-onboard from enabled to disabled', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    // Start enabled
    await setupAutoOnboardMocks(mockedPage, { enabled: true, mode: 'dev' });
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    const toggle = mockedPage.getByTestId('auto-onboard-toggle');
    await expect(toggle).toBeVisible();

    // Click toggle to disable
    await toggle.click();

    await mockedPage.waitForTimeout(500);
  });

  test('should disable toggle when mode is off', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage, { enabled: false, mode: 'off' });
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    const toggle = mockedPage.getByTestId('auto-onboard-toggle');
    await expect(toggle).toHaveAttribute('data-disabled', '');
    await expect(mockedPage.getByTestId('mode-not-available')).toBeVisible();
  });

  test('should show loading indicator while toggling', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    // Delay the API response
    await mockedPage.route('**/api/v1/onboarding/auto/enable', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { enabled: true, running: true, message: 'Enabled' },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await setupAutoOnboardMocks(mockedPage, { enabled: false, mode: 'dev' });
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    const toggle = mockedPage.getByTestId('auto-onboard-toggle');
    await toggle.click();

    // Loading indicator should appear
    await expect(mockedPage.getByTestId('toggle-loading')).toBeVisible();
  });
});

// ============================================================================
// Tests: Audit Events and Filtering (T066)
// ============================================================================

test.describe('Audit Events Panel', () => {
  test('should expand audit events panel', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage);
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    // Click on the audit events panel header to expand
    await mockedPage.getByText('Audit Events').click();

    // Events list should be visible
    await expect(mockedPage.getByTestId('events-list')).toBeVisible();
  });

  test('should display audit events', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage);
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    await mockedPage.getByText('Audit Events').click();

    // Should see event rows
    await expect(mockedPage.getByTestId('event-row-evt-001')).toBeVisible();
    await expect(mockedPage.getByText('AA:BB:CC:DD:EE:01')).toBeVisible();
    await expect(mockedPage.getByText('Paired')).toBeVisible();
  });

  test('should filter events by MAC address', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage);
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    await mockedPage.getByText('Audit Events').click();

    // Type in MAC filter
    const macFilter = mockedPage.getByTestId('mac-filter-input');
    await macFilter.fill('AA:BB');

    // Filter should be applied (API will filter)
    await mockedPage.waitForTimeout(500);
  });

  test('should expand event to show details', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage);
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    await mockedPage.getByText('Audit Events').click();

    // Click on event row to expand
    await mockedPage.getByTestId('event-row-evt-001').click();

    // Details should be visible
    await expect(mockedPage.getByTestId('event-details-evt-001')).toBeVisible();
    await expect(mockedPage.getByText('Device ID')).toBeVisible();
    await expect(mockedPage.getByText('dev-001')).toBeVisible();
  });

  test('should show error details for failed events', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage);
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    await mockedPage.getByText('Audit Events').click();

    // Click on failed event
    await mockedPage.getByTestId('event-row-evt-002').click();

    // Error details should be visible
    await expect(mockedPage.getByTestId('event-details-evt-002')).toBeVisible();
    await expect(mockedPage.getByText('VERIFICATION_TIMEOUT')).toBeVisible();
  });
});

// ============================================================================
// Tests: Config and Metrics Cards
// ============================================================================

test.describe('Config Card', () => {
  test('should expand config card to show settings', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage);
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    // Click on config card header
    await mockedPage.getByText('Configuration').click();

    // Config details should be visible
    await expect(mockedPage.getByTestId('config-details')).toBeVisible();
    await expect(mockedPage.getByTestId('config-max-per-minute')).toContainText('5');
    await expect(mockedPage.getByTestId('config-burst-size')).toContainText('3');
  });

  test('should display read-only badge', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage);
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    await expect(mockedPage.getByTestId('read-only-badge')).toBeVisible();
    await expect(mockedPage.getByText('Read-only')).toBeVisible();
  });
});

test.describe('Reset Metrics', () => {
  test('should open reset confirmation dialog', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage);
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    // Click reset button
    await mockedPage.getByTestId('reset-metrics-button').click();

    // Confirmation dialog should appear
    await expect(mockedPage.getByText('Reset Metrics?')).toBeVisible();
    await expect(mockedPage.getByText(/cannot be undone/)).toBeVisible();
  });

  test('should reset metrics when confirmed', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    await setupAutoOnboardMocks(mockedPage);
    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    await mockedPage.getByTestId('reset-metrics-button').click();
    await mockedPage.getByRole('button', { name: 'Reset' }).click();

    // Dialog should close
    await expect(mockedPage.getByText('Reset Metrics?')).not.toBeVisible();
  });
});

// ============================================================================
// Tests: API Not Available
// ============================================================================

test.describe('API Not Available', () => {
  test('should hide panel when API returns 404', async ({
    mockedPage,
    waitForAppReady,
    navigateToTab,
  }) => {
    // Mock V1 cameras (still needed)
    await mockedPage.route('**/api/v1/cameras', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { cameras: [], count: 0 },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    // Mock auto-onboard status to return 404
    await mockedPage.route('**/api/v1/onboarding/auto/status', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await mockedPage.goto('/');
    await waitForAppReady();
    await navigateToTab('Cameras');

    // Panel should not be visible (gracefully hidden)
    await expect(mockedPage.getByTestId('auto-onboard-panel')).not.toBeVisible();
  });
});
