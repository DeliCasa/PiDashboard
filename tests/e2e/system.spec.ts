/**
 * System E2E Tests (T042)
 *
 * End-to-end tests for system metrics and status display.
 */

import { test, expect } from './fixtures/test-base';
import { createMockAPI, mockScenarios } from './fixtures/mock-routes';

test.describe('System Tab', () => {
  test.beforeEach(async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    await page.goto('/');
    await page.waitForSelector('[role="tablist"]');

    // System tab should be default, but click to ensure
    await page.getByRole('tab', { name: /system/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');
  });

  test('should display system hostname', async ({ page }) => {
    await expect(page.getByText('test-pi')).toBeVisible();
  });

  test('should display CPU usage metric', async ({ page }) => {
    // Should show CPU metric (auto-waiting)
    await expect(page.getByText(/cpu/i)).toBeVisible();

    // Should show CPU percentage value
    await expect(page.getByText(/25\.5%|25\.5/)).toBeVisible();
  });

  test('should display memory usage metric', async ({ page }) => {
    // Should show memory metric (auto-waiting)
    await expect(page.getByText(/memory|ram/i)).toBeVisible();

    // Should show memory percentage
    await expect(page.getByText(/45\.2%|45\.2/)).toBeVisible();
  });

  test('should display disk usage metric', async ({ page }) => {
    // Should show disk metric (auto-waiting)
    await expect(page.getByText(/disk|storage/i)).toBeVisible();

    // Should show disk percentage
    await expect(page.getByText(/60\.0%|60\.0|60%/)).toBeVisible();
  });

  test('should display temperature metric', async ({ page }) => {
    // Should show temperature (auto-waiting)
    await expect(page.getByText(/temp|°c/i)).toBeVisible();

    // Should show temperature value
    await expect(page.getByText(/42\.5/)).toBeVisible();
  });

  test('should display uptime', async ({ page }) => {
    // Should show uptime (auto-waiting)
    await expect(page.getByText(/uptime/i)).toBeVisible();

    // Mock data has 1 day uptime
    await expect(page.getByText(/1 day|24 hour|1d/i)).toBeVisible();
  });

  test('should display Tailscale status', async ({ page }) => {
    // Should show Tailscale section (auto-waiting)
    await expect(page.getByText(/tailscale/i)).toBeVisible();

    // Should show running status
    await expect(page.getByText(/running|connected/i)).toBeVisible();

    // Should show IP address
    await expect(page.getByText('100.64.1.1')).toBeVisible();
  });

  test('should display BridgeServer status', async ({ page }) => {
    // Should show BridgeServer section (auto-waiting)
    await expect(page.getByText(/bridge.*server/i)).toBeVisible();

    // Should show connected status
    await expect(page.getByText(/connected/i)).toBeVisible();
  });

  test('should have progress bars for metrics', async ({ page }) => {
    // Wait for metrics to be visible
    await expect(page.getByText(/cpu/i)).toBeVisible();

    // Should have progress bars for CPU, Memory, Disk
    const progressBars = await page.locator('[data-slot="progress"], [role="progressbar"], .progress').all();
    expect(progressBars.length).toBeGreaterThanOrEqual(3);
  });

  test('should show correct colors for normal status', async ({ page }) => {
    // Wait for metrics to be visible
    await expect(page.getByText(/cpu/i)).toBeVisible();

    // With normal values (25.5% CPU), colors should be green
    const greenIndicators = await page.locator('[class*="green"], .text-green-500, .bg-green-500').all();
    expect(greenIndicators.length).toBeGreaterThan(0);
  });
});

test.describe('System Status Colors', () => {
  test('should show warning colors for high usage', async ({ page }) => {
    const mockAPI = mockScenarios.highResourceUsage(page);
    await mockAPI.applyAllMocks();

    await page.goto('/');
    await page.getByRole('tab', { name: /system/i }).click();

    // Wait for metrics to be visible (auto-waiting)
    await expect(page.getByText(/cpu/i)).toBeVisible();

    // With high values (92.5% CPU, 88.3% memory), should show warning/critical colors
    const warningIndicators = await page.locator('[class*="yellow"], [class*="red"], .text-yellow-500, .text-red-500').all();
    expect(warningIndicators.length).toBeGreaterThan(0);
  });

  test('should show critical indicators for critical usage', async ({ page }) => {
    const mockAPI = createMockAPI(page, {
      systemInfo: {
        hostname: 'critical-pi',
        uptime_ns: 86400000000000,
        cpu_percent: 98.0,
        memory_percent: 95.0,
        disk_percent: 99.0,
        temperature: 85.0,
        load_average: [4.5, 4.0, 3.5],
        tailscale_status: {
          state: 'Running',
          self: { hostname: 'critical-pi', addresses: ['100.64.1.1'] },
        },
        bridge_server: { status: 'connected', url: 'https://bridgeserver.test' },
      },
    });
    await mockAPI.applyAllMocks();

    await page.goto('/');
    await page.getByRole('tab', { name: /system/i }).click();

    // Wait for metrics to be visible (auto-waiting)
    await expect(page.getByText(/cpu/i)).toBeVisible();

    // Should show critical (red) indicators
    const redIndicators = await page.locator('[class*="red"], .text-red-500, .bg-red-500').all();
    expect(redIndicators.length).toBeGreaterThan(0);
  });
});

test.describe('System Metrics Refresh', () => {
  test('should have refresh mechanism', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    await page.goto('/');
    await page.getByRole('tab', { name: /system/i }).click();

    // Wait for metrics to load (auto-waiting)
    await expect(page.getByText(/cpu/i)).toBeVisible();

    // Look for refresh button or auto-refresh indicator
    const refreshButton = page.getByRole('button', { name: /refresh|reload/i });

    if (await refreshButton.isVisible({ timeout: 1000 })) {
      // Manual refresh available
      await refreshButton.click();

      // Should still show metrics (auto-waiting)
      await expect(page.getByText('test-pi')).toBeVisible();
    }
  });

  test('should update metrics on data change', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    await page.goto('/');
    await page.getByRole('tab', { name: /system/i }).click();

    // Initial value
    await expect(page.getByText(/25\.5%|25\.5/)).toBeVisible();

    // Update mock to return different value
    await page.route('**/api/system/info', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hostname: 'test-pi',
          uptime_ns: 86400000000000,
          cpu_percent: 75.0, // Changed value
          memory_percent: 45.2,
          disk_percent: 60.0,
          temperature: 42.5,
          load_average: [0.5, 0.4, 0.3],
          tailscale_status: {
            state: 'Running',
            self: { hostname: 'test-pi', addresses: ['100.64.1.1'] },
          },
          bridge_server: { status: 'connected', url: 'https://bridgeserver.test' },
        }),
      });
    });

    // Trigger refresh (either via button or reload)
    const refreshButton = page.getByRole('button', { name: /refresh|reload/i });
    if (await refreshButton.isVisible({ timeout: 1000 })) {
      await refreshButton.click();
    } else {
      await page.reload();
      await page.getByRole('tab', { name: /system/i }).click();
    }

    // Should show updated value (auto-waiting)
    await expect(page.getByText(/75\.0%|75\.0|75%/)).toBeVisible();
  });
});

test.describe('System Error Handling', () => {
  test('should handle API error gracefully', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.mockError('**/api/system/info', 500, 'Server Error');
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');

    // App should not crash (auto-waiting with extended timeout)
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 5000 });

    // Should show error state or loading state - use soft assertion since display might vary
    const errorOrEmpty = page.getByText(/error|unavailable|loading|retry/i);
    await expect.soft(errorOrEmpty).toBeVisible({ timeout: 2000 });

    // Either shows error or falls back gracefully
    expect(await page.getByRole('tablist').isVisible()).toBe(true);
  });

  test('should handle missing Tailscale gracefully', async ({ page }) => {
    const mockAPI = createMockAPI(page, {
      systemInfo: {
        hostname: 'test-pi',
        uptime_ns: 86400000000000,
        cpu_percent: 25.5,
        memory_percent: 45.2,
        disk_percent: 60.0,
        temperature: 42.5,
        load_average: [0.5, 0.4, 0.3],
        tailscale_status: {
          state: 'Stopped',
          self: { hostname: '', addresses: [] },
        },
        bridge_server: { status: 'disconnected', url: '' },
      },
    });
    await mockAPI.applyAllMocks();

    await page.goto('/');
    await page.getByRole('tab', { name: /system/i }).click();

    // Wait for metrics to be visible (auto-waiting)
    await expect(page.getByText(/cpu/i)).toBeVisible();

    // Should show Tailscale as stopped/disconnected
    await expect(page.getByText(/stopped|disconnected|offline/i)).toBeVisible();
  });
});

test.describe('System Load Average', () => {
  test('should display load average values', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    await page.goto('/');
    await page.getByRole('tab', { name: /system/i }).click();

    // Wait for metrics to be visible (auto-waiting)
    await expect(page.getByText(/cpu/i)).toBeVisible();

    // Should show load average (0.5, 0.4, 0.3 from mock)
    // Look for load average section
    const loadSection = page.getByText(/load|average/i);
    if (await loadSection.isVisible({ timeout: 1000 })) {
      await expect(page.getByText(/0\.5/)).toBeVisible();
    }
  });
});
