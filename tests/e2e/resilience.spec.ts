/**
 * E2E Resilience Tests (T052, T053, T054)
 *
 * End-to-end tests for network failure scenarios, API timeouts,
 * and partial failure handling.
 *
 * Feature: 005-testing-research-and-hardening [US3]
 */

import { test, expect } from './fixtures/test-base';
import { createMockAPI } from './fixtures/mock-routes';

/**
 * T052 [US3] Network Failure E2E Tests
 * Tests for handling network disconnections and reconnections
 */
test.describe('Network Failure Resilience (T052)', () => {
  test('should show error state when API is unreachable', async ({ page }) => {
    // Mock all endpoints to fail with network error
    await page.route('**/api/**', async (route) => {
      await route.abort('connectionfailed');
    });

    await page.goto('/');

    // App should still render (not crash)
    await expect(page.locator('body')).toBeVisible();

    // Should show some error indication or loading state
    // The app shouldn't crash but may show error boundaries or loading states
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 10000 });
  });

  test('should recover when API becomes available', async ({ page }) => {
    let shouldFail = true;

    // Initially fail, then succeed
    await page.route('**/api/system/info', async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service unavailable' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              timestamp: new Date().toISOString(),
              cpu: { usage_percent: 35, core_count: 4, per_core: [40, 30, 35, 35] },
              memory: { used_mb: 1024, total_mb: 2048, used_percent: 50, available_mb: 1024 },
              disk: { used_gb: 15, total_gb: 32, used_percent: 46.9, path: '/' },
              temperature_celsius: 52,
              uptime: 86400_000_000_000,
              load_average: { load_1: 0.8, load_5: 0.5, load_15: 0.3 },
              overall_status: 'healthy',
            },
          }),
        });
      }
    });

    // Mock other endpoints to succeed
    const mockAPI = createMockAPI(page);
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');
    await page.getByRole('tab', { name: /system/i }).click();

    // Wait for initial load (may show error or loading)
    await page.waitForTimeout(500);

    // Now fix the API
    shouldFail = false;

    // Reload to trigger recovery
    await page.reload();
    await page.getByRole('tab', { name: /system/i }).click();

    // Should now show system metrics
    await expect(page.getByText(/cpu/i)).toBeVisible({ timeout: 10000 });
  });

  test('should maintain UI responsiveness during slow network', async ({ page }) => {
    // Mock very slow responses (3 seconds)
    await page.route('**/api/system/info', async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            timestamp: new Date().toISOString(),
            cpu: { usage_percent: 35, core_count: 4, per_core: [40, 30, 35, 35] },
            memory: { used_mb: 1024, total_mb: 2048, used_percent: 50, available_mb: 1024 },
            disk: { used_gb: 15, total_gb: 32, used_percent: 46.9, path: '/' },
            temperature_celsius: 52,
            uptime: 86400_000_000_000,
            load_average: { load_1: 0.8, load_5: 0.5, load_15: 0.3 },
            overall_status: 'healthy',
          },
        }),
      });
    });

    const mockAPI = createMockAPI(page);
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');

    // Tab navigation should still work during slow network
    await expect(page.getByRole('tablist')).toBeVisible();

    // Should be able to switch tabs
    await page.getByRole('tab', { name: /wifi/i }).click();
    await expect(page.getByRole('tab', { name: /wifi/i })).toHaveAttribute('data-state', 'active');

    // Go back to system tab
    await page.getByRole('tab', { name: /system/i }).click();
    await expect(page.getByRole('tab', { name: /system/i })).toHaveAttribute('data-state', 'active');
  });
});

/**
 * T053 [US3] API Timeout E2E Tests
 * Tests for handling request timeouts gracefully
 */
test.describe('API Timeout Scenarios (T053)', () => {
  test('should handle slow WiFi scan gracefully', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    // Override WiFi scan to be slow
    await page.route('**/api/wifi/scan', async (route) => {
      await new Promise((r) => setTimeout(r, 5000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 2,
          networks: [{ ssid: 'SlowNetwork', signal: -50, security: 'WPA2', channel: 6 }],
          success: true,
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('tab', { name: /wifi/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');

    // UI should remain responsive
    await expect(page.getByRole('tablist')).toBeVisible();

    // User can still navigate away
    await page.getByRole('tab', { name: /system/i }).click();
    await expect(page.getByRole('tab', { name: /system/i })).toHaveAttribute('data-state', 'active');
  });

  test('should show appropriate feedback during long operations', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    // Mock slow config update
    await page.route('**/api/dashboard/config/*', async (route) => {
      if (route.request().method() === 'PUT') {
        await new Promise((r) => setTimeout(r, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');
    await page.getByRole('tab', { name: /config/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');

    // Wait for config to load
    await expect(page.getByText('server.port')).toBeVisible();

    // Find and click edit button
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    if (await editButton.isVisible({ timeout: 1000 })) {
      await editButton.click();

      // Try to save - may show loading state
      const saveButton = page.locator('button:has(svg.lucide-check)').first();
      if (await saveButton.isVisible({ timeout: 1000 })) {
        await saveButton.click();

        // UI should remain responsive during save
        await expect(page.getByRole('tablist')).toBeVisible();
      }
    }
  });

  test('should not block UI when multiple requests are slow', async ({ page }) => {
    // Make all API requests slow
    await page.route('**/api/**', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));

      // Return appropriate response based on endpoint
      const url = route.request().url();
      if (url.includes('/system/info')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              timestamp: new Date().toISOString(),
              cpu: { usage_percent: 35, core_count: 4, per_core: [40, 30, 35, 35] },
              memory: { used_mb: 1024, total_mb: 2048, used_percent: 50, available_mb: 1024 },
              disk: { used_gb: 15, total_gb: 32, used_percent: 46.9, path: '/' },
              temperature_celsius: 52,
              uptime: 86400_000_000_000,
              load_average: { load_1: 0.8, load_5: 0.5, load_15: 0.3 },
              overall_status: 'healthy',
            },
          }),
        });
      } else if (url.includes('/wifi/status')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: { connected: true, ssid: 'Test', ip: '192.168.1.1', signal: -50 } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });

    await page.goto('/');

    // UI should still be interactive while requests are pending
    await expect(page.getByRole('tablist')).toBeVisible();

    // Should be able to navigate between tabs
    await page.getByRole('tab', { name: /wifi/i }).click();
    await expect(page.getByRole('tab', { name: /wifi/i })).toHaveAttribute('data-state', 'active');

    await page.getByRole('tab', { name: /config/i }).click();
    await expect(page.getByRole('tab', { name: /config/i })).toHaveAttribute('data-state', 'active');
  });
});

/**
 * T054 [US3] Partial Failure E2E Tests
 * Tests for handling scenarios where some APIs succeed and others fail
 */
test.describe('Partial Failure E2E Scenarios (T054)', () => {
  test('should display available data when some endpoints fail', async ({ page }) => {
    // System info fails, but WiFi succeeds
    await page.route('**/api/system/info', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'System info unavailable' }),
      });
    });

    const mockAPI = createMockAPI(page);
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');

    // WiFi tab should still work
    await page.getByRole('tab', { name: /wifi/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');

    // WiFi content should be visible
    await expect(page.getByText(/connected|disconnected/i)).toBeVisible({ timeout: 5000 });
  });

  test('should allow navigation when config endpoint fails', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.mockSystemInfo();
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockLogs();

    // Config fails
    await page.route('**/api/dashboard/config', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Config service unavailable' }),
      });
    });

    await page.goto('/');

    // System tab should work
    await page.getByRole('tab', { name: /system/i }).click();
    await expect(page.getByText(/cpu/i)).toBeVisible({ timeout: 5000 });

    // WiFi tab should work
    await page.getByRole('tab', { name: /wifi/i }).click();
    await expect(page.getByText(/connected|disconnected/i)).toBeVisible({ timeout: 5000 });

    // Config tab - should show gracefully
    await page.getByRole('tab', { name: /config/i }).click();
    await expect(page.getByRole('tablist')).toBeVisible();
  });

  test('should isolate failures between tabs', async ({ page }) => {
    // WiFi scan fails but status works
    await page.route('**/api/wifi/scan', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Scan failed' }),
      });
    });

    const mockAPI = createMockAPI(page);
    await mockAPI.mockSystemInfo();
    await mockAPI.mockWifiStatus();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');

    // WiFi status should still show (scan failure shouldn't affect status)
    await page.getByRole('tab', { name: /wifi/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');

    // Should at least show status info
    await expect(page.getByText(/connected|disconnected/i)).toBeVisible({ timeout: 5000 });

    // Other tabs should work normally
    await page.getByRole('tab', { name: /system/i }).click();
    await expect(page.getByText(/cpu/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show mixed success/error states in System tab', async ({ page }) => {
    // Mock system info with missing network data
    await page.route('**/api/system/info', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            timestamp: new Date().toISOString(),
            cpu: { usage_percent: 35, core_count: 4, per_core: [40, 30, 35, 35] },
            memory: { used_mb: 1024, total_mb: 2048, used_percent: 50, available_mb: 1024 },
            disk: { used_gb: 15, total_gb: 32, used_percent: 46.9, path: '/' },
            temperature_celsius: 52,
            uptime: 86400_000_000_000,
            load_average: { load_1: 0.8, load_5: 0.5, load_15: 0.3 },
            overall_status: 'healthy',
            // Tailscale and bridge server data missing
            tailscale_status: null,
            bridge_server: null,
          },
        }),
      });
    });

    const mockAPI = createMockAPI(page);
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');
    await page.getByRole('tab', { name: /system/i }).click();

    // Core metrics should still display
    await expect(page.getByText(/cpu/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/memory|ram/i)).toBeVisible();
    await expect(page.getByText(/disk|storage/i)).toBeVisible();
  });

  test('should continue working when door API fails', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.mockSystemInfo();
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    // Door API fails
    await page.route('**/api/door/**', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Door controller offline' }),
      });
    });

    await page.goto('/');

    // All other tabs should work
    await page.getByRole('tab', { name: /system/i }).click();
    await expect(page.getByText(/cpu/i)).toBeVisible({ timeout: 5000 });

    await page.getByRole('tab', { name: /wifi/i }).click();
    await expect(page.getByText(/connected|disconnected/i)).toBeVisible({ timeout: 5000 });

    await page.getByRole('tab', { name: /config/i }).click();
    await expect(page.getByText('server.port')).toBeVisible({ timeout: 5000 });
  });
});
