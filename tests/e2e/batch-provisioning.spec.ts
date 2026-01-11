/**
 * Batch Provisioning E2E Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T030
 *
 * End-to-end tests for the batch device provisioning workflow.
 * Tests the full user journey from starting a session to provisioning devices.
 */

import { test, expect } from './fixtures/test-base';
import type { Page } from '@playwright/test';

// ============================================================================
// Mock Data
// ============================================================================

const mockSession = {
  id: 'session-e2e-001',
  state: 'active' as const,
  target_ssid: 'TestNetwork-5G',
  created_at: new Date().toISOString(),
  expires_at: null,
};

const mockDevice1 = {
  mac: 'AA:BB:CC:DD:EE:01',
  ip: '192.168.1.100',
  rssi: -45,
  firmware_version: '1.0.0',
  state: 'discovered' as const,
  in_allowlist: true,
  retry_count: 0,
  error_message: null,
  container_id: null,
  discovered_at: new Date().toISOString(),
  state_changed_at: new Date().toISOString(),
};

const mockDevice2 = {
  mac: 'AA:BB:CC:DD:EE:02',
  ip: '192.168.1.101',
  rssi: -60,
  firmware_version: '1.0.0',
  state: 'discovered' as const,
  in_allowlist: true,
  retry_count: 0,
  error_message: null,
  container_id: null,
  discovered_at: new Date().toISOString(),
  state_changed_at: new Date().toISOString(),
};

// ============================================================================
// Mock Setup Helper
// ============================================================================

async function setupBatchProvisioningMocks(page: Page) {
  // Enable batch provisioning feature flag via localStorage
  await page.addInitScript(() => {
    localStorage.setItem(
      'delicasa-feature-flags',
      JSON.stringify({
        state: {
          useV1Api: true,
          useBatchProvisioning: true,
          useWebSocketMonitor: false,
          useAllowlistManagement: false,
          useSessionRecovery: false,
        },
        version: 0,
      })
    );
  });

  // Mock standard API endpoints
  await page.route('**/api/system/info', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          cpu: { usage_percent: 25, core_count: 4 },
          memory: { used_mb: 1000, total_mb: 4096, used_percent: 25, available_mb: 3000 },
          disk: { used_gb: 10, total_gb: 32, used_percent: 30, path: '/' },
          temperature_celsius: 40,
          uptime: 86400000000000,
          load_average: { load_1: 0.5, load_5: 0.4, load_15: 0.3 },
          overall_status: 'healthy',
        },
      }),
    });
  });

  await page.route('**/api/wifi/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: { connected: true, ssid: 'TestNetwork-5G', mode: 'client' },
      }),
    });
  });

  await page.route('**/api/door/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ state: 'closed', lock_state: 'locked' }),
    });
  });

  await page.route('**/api/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, sections: [] }),
    });
  });

  await page.route('**/api/dashboard/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 0, logs: [] }),
    });
  });

  await page.route('**/api/cameras', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ cameras: [] }),
    });
  });

  await page.route('**/api/devices', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ devices: [] }),
    });
  });

  await page.route('**/api/network/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ connected: false }),
    });
  });

  await page.route('**/api/logs/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 0, logs: [] }),
    });
  });

  return {
    mockSession,
    mockDevice1,
    mockDevice2,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe('Batch Provisioning', () => {
  test.describe('Feature Flag Access', () => {
    test('should show Provisioning tab when feature is enabled', async ({ page }) => {
      await setupBatchProvisioningMocks(page);
      await page.goto('/');

      // Wait for app to load
      await page.waitForSelector('[role="tablist"]');

      // Provisioning tab should be visible
      const provisioningTab = page.getByRole('tab', { name: /provisioning/i });
      await expect(provisioningTab).toBeVisible();
    });

    test('should not show Provisioning tab when feature is disabled', async ({ page }) => {
      // Override with disabled feature flag
      await page.addInitScript(() => {
        localStorage.setItem(
          'delicasa-feature-flags',
          JSON.stringify({
            state: {
              useV1Api: false,
              useBatchProvisioning: false,
              useWebSocketMonitor: false,
              useAllowlistManagement: false,
              useSessionRecovery: false,
            },
            version: 0,
          })
        );
      });

      // Apply standard mocks
      await page.route('**/api/system/info', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              timestamp: new Date().toISOString(),
              cpu: { usage_percent: 25, core_count: 4 },
              memory: { used_mb: 1000, total_mb: 4096, used_percent: 25, available_mb: 3000 },
              disk: { used_gb: 10, total_gb: 32, used_percent: 30, path: '/' },
              temperature_celsius: 40,
              uptime: 86400000000000,
              load_average: { load_1: 0.5, load_5: 0.4, load_15: 0.3 },
              overall_status: 'healthy',
            },
          }),
        });
      });

      await page.route('**/api/wifi/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: { connected: true } }),
        });
      });

      await page.route('**/api/door/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ state: 'closed' }),
        });
      });

      await page.route('**/api/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });

      await page.goto('/');
      await page.waitForSelector('[role="tablist"]');

      // Provisioning tab should NOT be visible
      const provisioningTab = page.getByRole('tab', { name: /provisioning/i });
      await expect(provisioningTab).not.toBeVisible();
    });
  });

  test.describe('Start Session Form', () => {
    test('should display start session form when no session exists', async ({ page }) => {
      await setupBatchProvisioningMocks(page);
      await page.goto('/');

      // Navigate to Provisioning tab
      await page.getByRole('tab', { name: /provisioning/i }).click();

      // Form elements should be visible
      await expect(page.getByTestId('start-session-form')).toBeVisible();
      await expect(page.getByTestId('ssid-input')).toBeVisible();
      await expect(page.getByTestId('password-input')).toBeVisible();
      await expect(page.getByTestId('start-session-button')).toBeVisible();
    });

    test('should disable submit button when SSID is empty', async ({ page }) => {
      await setupBatchProvisioningMocks(page);
      await page.goto('/');

      await page.getByRole('tab', { name: /provisioning/i }).click();

      const submitButton = page.getByTestId('start-session-button');
      await expect(submitButton).toBeDisabled();
    });

    test('should disable submit button when password is too short', async ({ page }) => {
      await setupBatchProvisioningMocks(page);
      await page.goto('/');

      await page.getByRole('tab', { name: /provisioning/i }).click();

      // Fill in SSID but short password
      await page.getByTestId('ssid-input').fill('TestNetwork');
      await page.getByTestId('password-input').fill('short');

      const submitButton = page.getByTestId('start-session-button');
      await expect(submitButton).toBeDisabled();
    });

    test('should enable submit button with valid inputs', async ({ page }) => {
      await setupBatchProvisioningMocks(page);
      await page.goto('/');

      await page.getByRole('tab', { name: /provisioning/i }).click();

      // Fill in valid data
      await page.getByTestId('ssid-input').fill('TestNetwork');
      await page.getByTestId('password-input').fill('validpassword123');

      const submitButton = page.getByTestId('start-session-button');
      await expect(submitButton).not.toBeDisabled();
    });
  });

  test.describe('Session Management', () => {
    test('should start a session and show progress', async ({ page }) => {
      const { mockSession } = await setupBatchProvisioningMocks(page);

      // Mock start session endpoint
      await page.route('**/api/v1/provisioning/sessions', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { session: mockSession },
              meta: {
                timestamp: new Date().toISOString(),
                correlation_id: 'test-corr-id',
              },
            }),
          });
        } else {
          await route.fulfill({ status: 200, body: '{}' });
        }
      });

      // Mock SSE endpoint - return empty EventSource (no events)
      await page.route('**/api/v1/provisioning/sessions/*/events', async (route) => {
        // For SSE, we need to handle it differently - for this test we'll just
        // verify the form submission works
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"version":"1.0","type":"connection.established","payload":{},"timestamp":"' + new Date().toISOString() + '"}\n\n',
        });
      });

      await page.goto('/');
      await page.getByRole('tab', { name: /provisioning/i }).click();

      // Fill and submit form
      await page.getByTestId('ssid-input').fill('TestNetwork-5G');
      await page.getByTestId('password-input').fill('validpassword123');
      await page.getByTestId('start-session-button').click();

      // Session progress should appear
      await expect(page.getByTestId('session-progress')).toBeVisible({ timeout: 10000 });
    });

    test('should show waiting message when no devices discovered', async ({ page }) => {
      const { mockSession } = await setupBatchProvisioningMocks(page);

      await page.route('**/api/v1/provisioning/sessions', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { session: mockSession },
              meta: { timestamp: new Date().toISOString(), correlation_id: 'test' },
            }),
          });
        }
      });

      await page.route('**/api/v1/provisioning/sessions/*/events', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"version":"1.0","type":"connection.established","payload":{},"timestamp":"' + new Date().toISOString() + '"}\n\n',
        });
      });

      await page.goto('/');
      await page.getByRole('tab', { name: /provisioning/i }).click();

      await page.getByTestId('ssid-input').fill('TestNetwork-5G');
      await page.getByTestId('password-input').fill('validpassword123');
      await page.getByTestId('start-session-button').click();

      // Wait for session progress
      await expect(page.getByTestId('session-progress')).toBeVisible({ timeout: 10000 });

      // Should show waiting message
      await expect(page.getByText(/waiting for devices/i)).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should display error when session start fails', async ({ page }) => {
      await setupBatchProvisioningMocks(page);

      // Mock failed start session
      await page.route('**/api/v1/provisioning/sessions', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: {
                code: 'PROV_001',
                message: 'Session already exists',
              },
              meta: { timestamp: new Date().toISOString(), correlation_id: 'err' },
            }),
          });
        }
      });

      await page.goto('/');
      await page.getByRole('tab', { name: /provisioning/i }).click();

      await page.getByTestId('ssid-input').fill('TestNetwork-5G');
      await page.getByTestId('password-input').fill('validpassword123');
      await page.getByTestId('start-session-button').click();

      // Error should be displayed
      await expect(page.getByText(/error/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should keep form visible after session start error', async ({ page }) => {
      await setupBatchProvisioningMocks(page);

      await page.route('**/api/v1/provisioning/sessions', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { code: 'SRV_001', message: 'Internal error' },
              meta: { timestamp: new Date().toISOString(), correlation_id: 'err' },
            }),
          });
        }
      });

      await page.goto('/');
      await page.getByRole('tab', { name: /provisioning/i }).click();

      await page.getByTestId('ssid-input').fill('TestNetwork-5G');
      await page.getByTestId('password-input').fill('validpassword123');
      await page.getByTestId('start-session-button').click();

      // Wait for error to appear
      await expect(page.getByText(/error/i).first()).toBeVisible({ timeout: 10000 });

      // Form should still be visible for retry
      await expect(page.getByTestId('start-session-form')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      await setupBatchProvisioningMocks(page);
      await page.goto('/');

      await page.getByRole('tab', { name: /provisioning/i }).click();

      // SSID input should have associated label
      const ssidInput = page.getByTestId('ssid-input');
      const ssidLabel = await ssidInput.evaluate(
        (el) => document.querySelector(`label[for="${el.id}"]`)?.textContent
      );
      expect(ssidLabel).toBeTruthy();

      // Password input should have associated label
      const passwordInput = page.getByTestId('password-input');
      const passwordLabel = await passwordInput.evaluate(
        (el) => document.querySelector(`label[for="${el.id}"]`)?.textContent
      );
      expect(passwordLabel).toBeTruthy();
    });

    test('should be keyboard navigable', async ({ page }) => {
      await setupBatchProvisioningMocks(page);
      await page.goto('/');

      // Tab to Provisioning tab and activate
      await page.keyboard.press('Tab');
      const tablist = page.getByRole('tablist');
      await expect(tablist).toBeFocused();

      // Find and click provisioning tab
      await page.getByRole('tab', { name: /provisioning/i }).click();

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('ssid-input')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByTestId('password-input')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByTestId('start-session-button')).toBeFocused();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await setupBatchProvisioningMocks(page);

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/');
      await page.getByRole('tab', { name: /provisioning/i }).click();

      // Form should be visible and not overflow
      await expect(page.getByTestId('start-session-form')).toBeVisible();

      // Check no horizontal overflow
      const body = page.locator('body');
      const scrollWidth = await body.evaluate((el) => el.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(375);
    });
  });
});
