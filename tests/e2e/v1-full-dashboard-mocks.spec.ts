/**
 * Full Dashboard E2E Test — All Tabs with Mocked APIs
 * Feature: 045-dashboard-resilience-e2e (T014-T017)
 *
 * Verifies every tab renders correctly with full mock coverage.
 * Tests container cards with opaque IDs, diagnostics health cards,
 * and camera section rendering.
 */

import { test, expect } from './fixtures/test-base';
import {
  createMockAPI,
  mockContainerData,
  mockContainersResponses,
  mockCameraData,
} from './fixtures/mock-routes';

/** Pre-built containers response for context-level routing */
const mockContainersResponse = mockContainersResponses.withContainers;

test.describe('Full Dashboard with Mocked APIs (Feature 045)', () => {
  test.beforeEach(async ({ page }) => {
    // Use context-level routes for reliable interception
    // (page.route() doesn't work reliably for all endpoints — see containers.spec.ts)
    const context = page.context();
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    // V1 Containers via context route (page.route is unreliable for this endpoint)
    await context.route('**/api/v1/containers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockContainersResponse),
      });
    });

    // Also mock bridge status and SSE endpoints that the app may hit
    await page.route('**/api/dashboard/bridge/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: false, status: 'unavailable' }),
      });
    });

    // SSE endpoint for logs — return empty to avoid SSE errors
    await page.route('**/api/dashboard/logs/stream', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: '',
      });
    });

    // Mock door command endpoint
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

  // =========================================================================
  // T014: Tab rendering — each tab loads to a meaningful state
  // =========================================================================

  test('should render Overview tab with sections', async ({ page }) => {
    // Overview is the default tab
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    await expect(overviewTab).toHaveAttribute('data-state', 'active');

    // Should render system status section header
    await expect(page.getByText('System Status')).toBeVisible();

    // Should render camera section
    await expect(page.getByText('Camera Management')).toBeVisible();
  });

  test('should render System tab', async ({ page, navigateToTab }) => {
    await navigateToTab('System');

    // System tab shows the system status component
    await expect(page.getByText('System Status')).toBeVisible();
  });

  test('should render WiFi tab with networks', async ({
    page,
    navigateToTab,
  }) => {
    await navigateToTab('WiFi');

    // WiFi section should show network list
    await expect(page.getByText('WiFi Configuration')).toBeVisible();
    await expect(page.getByText('TestNetwork-5G')).toBeVisible();
  });

  test('should render Devices tab', async ({ page, navigateToTab }) => {
    await navigateToTab('Devices');

    // Devices tab should render its panel
    const panel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(panel).toBeVisible();
  });

  test('should render Cameras tab with camera cards', async ({
    page,
    navigateToTab,
  }) => {
    await navigateToTab('Cameras');

    // Wait for cameras to load
    await page.waitForSelector(
      '[data-testid="camera-grid"], [data-testid="camera-empty"]',
      { timeout: 10000 }
    );

    // Mock API provides 3 cameras — verify at least one renders
    const grid = page.locator('[data-testid="camera-grid"]');
    if (await grid.isVisible()) {
      await expect(
        page.getByText(mockCameraData.cameraOnline.name)
      ).toBeVisible();
      await expect(
        page.getByText(mockCameraData.cameraOffline.name)
      ).toBeVisible();
    }
  });

  // =========================================================================
  // T015: Container cards with opaque IDs in monospace
  // =========================================================================

  test('should render Containers tab with opaque ID container cards', async ({
    page,
    navigateToTab,
  }) => {
    await navigateToTab('Containers');

    // Wait for containers to load
    await page.waitForSelector(
      '[data-testid="containers-grid"], [data-testid="containers-empty"]',
      { timeout: 10000 }
    );

    const grid = page.locator('[data-testid="containers-grid"]');
    if (await grid.isVisible()) {
      // Verify container labels render
      await expect(
        page.getByText(mockContainerData.kitchenFridge.label!)
      ).toBeVisible();
      await expect(
        page.getByText(mockContainerData.garageFreezer.label!)
      ).toBeVisible();
      await expect(
        page.getByText(mockContainerData.numericContainer.label!)
      ).toBeVisible();

      // Verify opaque IDs render — semantic, UUID, and numeric
      const semanticCard = page.locator(
        `[data-testid="container-card-${mockContainerData.kitchenFridge.id}"]`
      );
      await expect(semanticCard).toBeVisible();

      const uuidCard = page.locator(
        `[data-testid="container-card-${mockContainerData.garageFreezer.id}"]`
      );
      await expect(uuidCard).toBeVisible();

      const numericCard = page.locator(
        `[data-testid="container-card-${mockContainerData.numericContainer.id}"]`
      );
      await expect(numericCard).toBeVisible();

      // Verify IDs display in monospace font
      const idText = page.locator('.font-mono').first();
      await expect(idText).toBeVisible();
    }
  });

  test('should render Door tab', async ({ page, navigateToTab }) => {
    await navigateToTab('Door');

    // Door section renders control panel
    await expect(page.getByText('Door Control')).toBeVisible();
  });

  test('should render Logs tab', async ({ page, navigateToTab }) => {
    await navigateToTab('Logs');

    const panel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(panel).toBeVisible();
  });

  test('should render Network tab', async ({ page, navigateToTab }) => {
    await navigateToTab('Network');

    const panel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(panel).toBeVisible();
  });

  test('should render Config tab', async ({
    page,
    navigateToTab,
  }) => {
    await navigateToTab('Config');

    // Config tab should show its panel
    const panel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(panel).toBeVisible();

    // Should render config content (section headers or config items)
    await expect(page.getByText(/config|settings|server/i).first()).toBeVisible();
  });

  // =========================================================================
  // T016: Diagnostics tab with health cards and sessions
  // =========================================================================

  test('should render Diagnostics tab with health cards and sessions', async ({
    page,
  }) => {
    // Navigate to DEV/Diagnostics tab
    await page.click('[data-testid="tab-diagnostics"]');
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', {
      state: 'visible',
    });

    // Wait for diagnostics section
    await expect(
      page.locator('[data-testid="diagnostics-section"]')
    ).toBeVisible({ timeout: 10000 });

    // Should show overall health badge
    await expect(
      page.locator('[data-testid="overall-health-badge"]')
    ).toBeVisible();

    // Should show BridgeServer health card
    await expect(
      page.locator('[data-testid="service-health-card-bridgeserver"]')
    ).toBeVisible();

    // Should show sessions panel
    await expect(
      page.locator('[data-testid="sessions-panel"]')
    ).toBeVisible();
  });

  // =========================================================================
  // T017: Full tab navigation stability test
  // =========================================================================

  test('should navigate through all core tabs without crashing', async ({
    page,
    navigateToTab,
  }) => {
    // Navigate through all core tabs
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
      // Verify active panel is visible after navigation
      await expect(
        page.locator('[role="tabpanel"][data-state="active"]')
      ).toBeVisible();
    }

    // Navigate to Diagnostics via data-testid
    await page.click('[data-testid="tab-diagnostics"]');
    await expect(
      page.locator('[role="tabpanel"][data-state="active"]')
    ).toBeVisible();

    // Return to Overview
    await navigateToTab('Overview');
    await expect(
      page.getByRole('tab', { name: /overview/i })
    ).toHaveAttribute('data-state', 'active');
  });
});
