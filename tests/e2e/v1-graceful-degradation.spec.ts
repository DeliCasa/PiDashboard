/**
 * Graceful Degradation E2E Tests — V1 Endpoints Returning 404/503
 * Feature: 045-dashboard-resilience-e2e (T018-T022)
 *
 * Verifies that when V1 API endpoints (cameras, containers) return
 * 404 or 503, the core dashboard tabs remain functional and no
 * unhandled errors appear.
 */

import { test, expect } from './fixtures/test-base';
import {
  createMockAPI,
  mockContainers404,
  mockCameras404,
  mockCameras503,
} from './fixtures/mock-routes';

test.describe('Graceful Degradation — V1 Endpoints Unavailable (Feature 045)', () => {
  // =========================================================================
  // T018: Core tabs still work when all V1 endpoints return 404
  // =========================================================================

  test.describe('V1 endpoints return 404', () => {
    test.beforeEach(async ({ page }) => {
      const context = page.context();

      // Set up base mocks for non-V1 endpoints
      const mockAPI = createMockAPI(page);
      await mockAPI.mockSystemInfo();
      await mockAPI.mockWifiScan();
      await mockAPI.mockWifiStatus();
      await mockAPI.mockDoorStatus();
      await mockAPI.mockConfig();
      await mockAPI.mockLogs();
      await mockAPI.mockCameras();
      await mockAPI.mockDevices();
      await mockAPI.mockNetwork();
      await mockAPI.mockDiagnosticsHealth();
      await mockAPI.mockSessions();

      // Mock V1 endpoints as 404 via page.route
      await mockCameras404(page);
      await mockContainers404(page);

      // V1 containers via context route for reliable interception
      await context.route('**/api/v1/containers', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Endpoint not found' }),
        });
      });

      // Legacy cameras fallback also returns 404
      await page.route('**/api/dashboard/cameras', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Endpoint not found' }),
        });
      });
      await page.route('**/api/dashboard/cameras/*', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Endpoint not found' }),
        });
      });

      // Extra endpoints the app may hit
      await page.route('**/api/dashboard/bridge/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ connected: false }),
        });
      });
      await page.route('**/api/dashboard/logs/stream', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: '',
        });
      });
      await page.route('**/api/door/command', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });
    });

    test('System tab renders normally when V1 is 404', async ({
      page,
      navigateToTab,
    }) => {
      await navigateToTab('System');
      await expect(page.getByText('System Status')).toBeVisible();
    });

    test('WiFi tab renders normally when V1 is 404', async ({
      page,
      navigateToTab,
    }) => {
      await navigateToTab('WiFi');
      await expect(page.getByText('WiFi Configuration')).toBeVisible();
      await expect(page.getByText('TestNetwork-5G')).toBeVisible();
    });

    test('Door tab renders normally when V1 is 404', async ({
      page,
      navigateToTab,
    }) => {
      await navigateToTab('Door');
      await expect(page.getByText('Door Control')).toBeVisible();
    });

    test('Config tab renders normally when V1 is 404', async ({
      page,
      navigateToTab,
    }) => {
      await navigateToTab('Config');
      const panel = page.locator('[role="tabpanel"][data-state="active"]');
      await expect(panel).toBeVisible();
    });

    test('Logs tab renders normally when V1 is 404', async ({
      page,
      navigateToTab,
    }) => {
      await navigateToTab('Logs');
      const panel = page.locator('[role="tabpanel"][data-state="active"]');
      await expect(panel).toBeVisible();
    });

    // T019: Containers tab shows graceful state on 404
    test('Containers tab shows error/unavailable state on 404 (not crash)', async ({
      page,
      navigateToTab,
    }) => {
      await navigateToTab('Containers');

      // Wait for the containers section to render some state
      await page.waitForSelector(
        '[data-testid="containers-error"], [data-testid="containers-empty"], [data-testid="containers-loading"]',
        { timeout: 10000 }
      );

      // Should show error or empty — not a crash/white screen
      const panel = page.locator('[role="tabpanel"][data-state="active"]');
      await expect(panel).toBeVisible();

      // Should show Container Management header (section renders even on error)
      await expect(page.getByText('Container Management')).toBeVisible();
    });

    // T020: Cameras tab shows graceful state on 404
    test('Cameras tab shows error/unavailable state on 404 (not crash)', async ({
      page,
      navigateToTab,
    }) => {
      await navigateToTab('Cameras');

      // Wait for camera section to render a state
      await page.waitForSelector(
        '[data-testid="camera-error"], [data-testid="camera-empty"], [data-testid="camera-loading"]',
        { timeout: 10000 }
      );

      // Should show Camera Management header
      await expect(page.getByText('Camera Management')).toBeVisible();
    });
  });

  // =========================================================================
  // T020 (extended): Cameras tab with 503
  // =========================================================================

  test('Cameras tab shows graceful state on 503', async ({ page }) => {
    // Set up base mocks
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    // Override with 503 for cameras
    await mockCameras503(page);

    // Legacy fallback also returns 503
    await page.route('**/api/dashboard/cameras', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' }),
      });
    });
    await page.route('**/api/dashboard/cameras/*', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' }),
      });
    });

    // Extra mocks
    await page.route('**/api/dashboard/bridge/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: false }),
      });
    });
    await page.route('**/api/dashboard/logs/stream', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: '',
      });
    });

    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { state: 'visible' });

    // Navigate to Cameras tab
    const camerasTab = page.getByRole('tab', { name: /cameras/i });
    await camerasTab.click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', {
      state: 'visible',
    });

    // Should not crash — camera section renders with error or empty state
    await page.waitForSelector(
      '[data-testid="camera-error"], [data-testid="camera-empty"], [data-testid="camera-loading"]',
      { timeout: 10000 }
    );

    await expect(page.getByText('Camera Management')).toBeVisible();
  });

  // =========================================================================
  // T021: Navigate all tabs with V1 404 — no crashes
  // =========================================================================

  test('navigating all tabs with V1 endpoints returning 404 does not crash', async ({
    page,
    navigateToTab,
  }) => {
    const context = page.context();

    // Base mocks for non-V1 endpoints
    const mockAPI = createMockAPI(page);
    await mockAPI.mockSystemInfo();
    await mockAPI.mockWifiScan();
    await mockAPI.mockWifiStatus();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();
    await mockAPI.mockCameras();
    await mockAPI.mockDevices();
    await mockAPI.mockNetwork();
    await mockAPI.mockDiagnosticsHealth();
    await mockAPI.mockSessions();

    // V1 endpoints as 404
    await mockCameras404(page);
    await mockContainers404(page);
    await context.route('**/api/v1/containers', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found' }),
      });
    });

    // Legacy cameras fallback also 404
    await page.route('**/api/dashboard/cameras', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found' }),
      });
    });
    await page.route('**/api/dashboard/cameras/*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found' }),
      });
    });

    // Extra mocks
    await page.route('**/api/dashboard/bridge/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: false }),
      });
    });
    await page.route('**/api/dashboard/logs/stream', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: '',
      });
    });
    await page.route('**/api/door/command', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { state: 'visible' });

    // Navigate through ALL tabs — none should crash
    const tabs = [
      'System',
      'WiFi',
      'Devices',
      'Cameras',
      'Containers',
      'Door',
      'Logs',
      'Network',
      'Config',
    ];

    for (const tab of tabs) {
      await navigateToTab(tab);
      await expect(
        page.locator('[role="tabpanel"][data-state="active"]')
      ).toBeVisible();
    }

    // Diagnostics tab
    await page.click('[data-testid="tab-diagnostics"]');
    await expect(
      page.locator('[role="tabpanel"][data-state="active"]')
    ).toBeVisible();
  });
});
