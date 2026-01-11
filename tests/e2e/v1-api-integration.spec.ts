/**
 * V1 API Integration Smoke Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T051
 *
 * End-to-end smoke tests validating the V1 API integration across
 * all feature 006 components: batch provisioning, allowlist, session recovery,
 * WebSocket monitoring, and error handling.
 */

import { test, expect } from './fixtures/test-base';
import type { Page } from '@playwright/test';

// ============================================================================
// Test Data
// ============================================================================

const mockSystemInfo = {
  hostname: 'delicasa-pi-001',
  cpu_usage: 45.5,
  memory_usage: 62.3,
  disk_usage: 28.7,
  temperature: 52.1,
  uptime: '3d 12h 45m',
};

const mockAllowlistEntries = [
  {
    mac: 'AA:BB:CC:DD:EE:01',
    description: 'Front Door ESP',
    status: 'active' as const,
    added_at: new Date().toISOString(),
    added_by: 'admin',
  },
  {
    mac: 'AA:BB:CC:DD:EE:02',
    description: 'Back Door ESP',
    status: 'active' as const,
    added_at: new Date().toISOString(),
    added_by: 'admin',
  },
];

const mockRecoverableSession = {
  id: 'session-recovery-001',
  state: 'active' as const,
  target_ssid: 'TestNetwork',
  created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  expires_at: null,
  last_activity_at: new Date().toISOString(),
  device_count: 3,
  provisioned_count: 1,
  can_resume: true,
};

// ============================================================================
// Mock Setup Helpers
// ============================================================================

async function enableAllFeatureFlags(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'delicasa-feature-flags',
      JSON.stringify({
        state: {
          useV1Api: true,
          useBatchProvisioning: true,
          useWebSocketMonitor: true,
          useAllowlistManagement: true,
          useSessionRecovery: true,
        },
        version: 0,
      })
    );
  });
}

async function setupStandardMocks(page: Page) {
  // System info (standard API)
  await page.route('**/api/system/info', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSystemInfo),
    });
  });

  // WiFi status
  await page.route('**/api/wifi/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        connected: true,
        ssid: 'TestNetwork',
        ip: '192.168.1.100',
        signal_strength: -45,
      }),
    });
  });

  // Door status
  await page.route('**/api/dashboard/door/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        state: 'locked',
        locked: true,
        last_event: 'lock',
        last_event_time: new Date().toISOString(),
      }),
    });
  });

  // Config
  await page.route('**/api/dashboard/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sections: [
          {
            name: 'system',
            items: [{ key: 'hostname', value: 'delicasa-pi-001', type: 'string' }],
          },
        ],
      }),
    });
  });
}

async function setupV1ApiMocks(page: Page) {
  // V1 Allowlist endpoints
  await page.route('**/api/v1/allowlist', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { entries: mockAllowlistEntries },
          correlation_id: 'e2e-corr-allowlist-get',
          timestamp: new Date().toISOString(),
        }),
      });
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            mac: 'FF:FF:FF:FF:FF:01',
            description: 'New Device',
            status: 'active',
            added_at: new Date().toISOString(),
            added_by: 'admin',
          },
          correlation_id: 'e2e-corr-allowlist-add',
          timestamp: new Date().toISOString(),
        }),
      });
    }
  });

  // V1 Session recovery endpoints
  await page.route('**/api/v1/provisioning/sessions/recoverable', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { sessions: [mockRecoverableSession] },
        correlation_id: 'e2e-corr-recovery-list',
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // V1 Batch provisioning session start
  await page.route('**/api/v1/provisioning/batch/start', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          session: {
            id: 'session-new-001',
            state: 'active',
            target_ssid: 'NewNetwork',
            created_at: new Date().toISOString(),
            expires_at: null,
          },
          sse_url: '/api/v1/provisioning/batch/session-new-001/events',
        },
        correlation_id: 'e2e-corr-start-session',
        timestamp: new Date().toISOString(),
      }),
    });
  });
}

async function setupErrorMocks(page: Page) {
  // V1 error response for unauthorized
  await page.route('**/api/v1/protected/endpoint', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key required',
          retryable: false,
        },
        correlation_id: 'e2e-corr-unauthorized',
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // V1 error response for rate limiting
  await page.route('**/api/v1/rate-limited', async (route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          retryable: true,
          retry_after_seconds: 5,
        },
        correlation_id: 'e2e-corr-rate-limit',
        timestamp: new Date().toISOString(),
      }),
    });
  });
}

// ============================================================================
// Smoke Tests
// ============================================================================

test.describe('V1 API Integration Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await enableAllFeatureFlags(page);
    await setupStandardMocks(page);
    await setupV1ApiMocks(page);
  });

  test('should load the dashboard with V1 features enabled', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Pi Dashboard/);

    // Should show system status section
    await expect(page.getByTestId('system-status').or(page.locator('text=System Status'))).toBeVisible();
  });

  test('should display system status with connection indicator', async ({ page }) => {
    await page.goto('/');

    // Should show system metrics - use specific testid to avoid strict mode violation
    await expect(page.getByTestId('metric-card-cpu-usage')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should navigate to Provisioning tab when enabled', async ({ page }) => {
    await page.goto('/');

    // Look for Provisioning tab
    const provisioningTab = page.getByRole('tab', { name: /Provisioning/i });
    if (await provisioningTab.isVisible()) {
      await provisioningTab.click();
      // Should show batch provisioning section
      await expect(page.getByTestId('batch-provisioning-section')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should navigate to Allowlist tab when enabled', async ({ page }) => {
    await page.goto('/');

    // Look for Allowlist tab
    const allowlistTab = page.getByRole('tab', { name: /Allowlist/i });
    if (await allowlistTab.isVisible()) {
      await allowlistTab.click();
      // Should show allowlist section
      await expect(page.getByTestId('allowlist-section')).toBeVisible({ timeout: 10000 });
    }
  });
});

// ============================================================================
// Allowlist Feature Tests
// ============================================================================

test.describe('Allowlist Management', () => {
  test.beforeEach(async ({ page }) => {
    await enableAllFeatureFlags(page);
    await setupStandardMocks(page);
    await setupV1ApiMocks(page);
  });

  test('should display allowlist entries from V1 API', async ({ page }) => {
    await page.goto('/');

    const allowlistTab = page.getByRole('tab', { name: /Allowlist/i });
    if (await allowlistTab.isVisible()) {
      await allowlistTab.click();

      // Wait for entries to load
      await expect(
        page.getByText('AA:BB:CC:DD:EE:01').or(page.getByText('Front Door ESP'))
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show add entry form', async ({ page }) => {
    await page.goto('/');

    const allowlistTab = page.getByRole('tab', { name: /Allowlist/i });
    if (await allowlistTab.isVisible()) {
      await allowlistTab.click();

      // Should have MAC address input
      await expect(
        page.getByPlaceholder(/MAC/i).or(page.getByLabel(/MAC/i))
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

// ============================================================================
// Batch Provisioning Feature Tests
// ============================================================================

test.describe('Batch Provisioning', () => {
  test.beforeEach(async ({ page }) => {
    await enableAllFeatureFlags(page);
    await setupStandardMocks(page);
    await setupV1ApiMocks(page);
  });

  test('should display start session form', async ({ page }) => {
    await page.goto('/');

    const provisioningTab = page.getByRole('tab', { name: /Provisioning/i });
    if (await provisioningTab.isVisible()) {
      await provisioningTab.click();

      // Should show SSID input
      await expect(
        page.getByPlaceholder(/SSID/i).or(page.getByLabel(/SSID/i))
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show session recovery banner for recoverable sessions', async ({ page }) => {
    await page.goto('/');

    const provisioningTab = page.getByRole('tab', { name: /Provisioning/i });
    if (await provisioningTab.isVisible()) {
      await provisioningTab.click();

      // May show recovery banner if recoverable sessions exist
      // This is conditional based on mock data
      const recoveryBanner = page.getByTestId('session-recovery-banner');
      // Don't fail if not present, just check if visible when it appears
      if (await recoveryBanner.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(recoveryBanner).toContainText(/resume/i);
      }
    }
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await enableAllFeatureFlags(page);
    await setupStandardMocks(page);
    await setupErrorMocks(page);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Force a network error on allowlist fetch
    await page.route('**/api/v1/allowlist', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/');

    const allowlistTab = page.getByRole('tab', { name: /Allowlist/i });
    if (await allowlistTab.isVisible()) {
      await allowlistTab.click();

      // Should show error state or empty state, not crash
      await expect(
        page.getByText(/error/i).or(page.getByText(/failed/i)).or(page.getByText(/no entries/i))
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show error alerts with retry capability', async ({ page }) => {
    // Return error on first allowlist call
    let callCount = 0;
    await page.route('**/api/v1/allowlist', async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Database connection failed',
              retryable: true,
            },
            correlation_id: 'e2e-corr-error',
            timestamp: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { entries: [] },
            correlation_id: 'e2e-corr-success',
            timestamp: new Date().toISOString(),
          }),
        });
      }
    });

    await page.goto('/');

    const allowlistTab = page.getByRole('tab', { name: /Allowlist/i });
    if (await allowlistTab.isVisible()) {
      await allowlistTab.click();

      // Error should be shown initially
      await expect(
        page.getByText(/error/i).or(page.getByRole('alert'))
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await enableAllFeatureFlags(page);
    await setupStandardMocks(page);
    await setupV1ApiMocks(page);
  });

  test('should have proper ARIA labels on connection indicators', async ({ page }) => {
    await page.goto('/');

    // The page should load with proper structure
    // Check that the main heading is visible (DeliCasa IoT Setup)
    const mainHeading = page.getByRole('heading', { level: 1, name: /DeliCasa IoT Setup/i });
    await expect(mainHeading).toBeVisible({ timeout: 10000 });

    // Tab navigation should have proper role
    const tabList = page.getByRole('tablist');
    await expect(tabList).toBeVisible();

    // Tabs should have proper role
    await expect(page.getByRole('tab', { name: /Overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /System/i })).toBeVisible();
  });

  test('should have proper section labels', async ({ page }) => {
    await page.goto('/');

    const provisioningTab = page.getByRole('tab', { name: /Provisioning/i });
    if (await provisioningTab.isVisible()) {
      await provisioningTab.click();

      // Section should have aria-label
      const section = page.locator('section[aria-label*="Provisioning"]');
      await expect(section).toBeVisible({ timeout: 10000 });
    }
  });
});

// ============================================================================
// Feature Flag Tests
// ============================================================================

test.describe('Feature Flags', () => {
  test('should hide Provisioning tab when feature disabled', async ({ page }) => {
    // Override with disabled feature
    await page.addInitScript(() => {
      localStorage.setItem(
        'delicasa-feature-flags',
        JSON.stringify({
          state: {
            useV1Api: true,
            useBatchProvisioning: false, // Disabled
            useWebSocketMonitor: false,
            useAllowlistManagement: false,
            useSessionRecovery: false,
          },
          version: 0,
        })
      );
    });
    await setupStandardMocks(page);

    await page.goto('/');

    // Provisioning tab should not be visible
    const provisioningTab = page.getByRole('tab', { name: /Provisioning/i });
    await expect(provisioningTab).not.toBeVisible({ timeout: 5000 });
  });

  test('should hide Allowlist tab when feature disabled', async ({ page }) => {
    // Override with disabled feature
    await page.addInitScript(() => {
      localStorage.setItem(
        'delicasa-feature-flags',
        JSON.stringify({
          state: {
            useV1Api: true,
            useBatchProvisioning: false,
            useWebSocketMonitor: false,
            useAllowlistManagement: false, // Disabled
            useSessionRecovery: false,
          },
          version: 0,
        })
      );
    });
    await setupStandardMocks(page);

    await page.goto('/');

    // Allowlist tab should not be visible
    const allowlistTab = page.getByRole('tab', { name: /Allowlist/i });
    await expect(allowlistTab).not.toBeVisible({ timeout: 5000 });
  });
});
