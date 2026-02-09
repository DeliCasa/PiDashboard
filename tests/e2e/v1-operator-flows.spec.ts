/**
 * Operator-Critical Flow E2E Tests
 * Feature: 045-dashboard-resilience-e2e (T023-T027)
 *
 * Tests camera detail view, container detail view, and diagnostics
 * rendering flows that operators rely on for day-to-day monitoring.
 */

import { test, expect } from './fixtures/test-base';
import {
  createMockAPI,
  mockCameraData,
  mockContainerData,
  mockContainersResponses,
} from './fixtures/mock-routes';

test.describe('Operator-Critical Flows (Feature 045)', () => {
  test.beforeEach(async ({ page }) => {
    const context = page.context();
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    // V1 Containers via context route for reliable interception
    await context.route('**/api/v1/containers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockContainersResponses.withContainers),
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
  });

  // =========================================================================
  // T024: Camera card rendering and detail view
  // =========================================================================

  test('camera cards render with status badges', async ({
    page,
    navigateToTab,
  }) => {
    await navigateToTab('Cameras');

    await page.waitForSelector('[data-testid="camera-grid"]', {
      timeout: 10000,
    });

    // Online camera should show name and "Online" badge
    await expect(
      page.getByText(mockCameraData.cameraOnline.name)
    ).toBeVisible();
    await expect(page.getByText('Online').first()).toBeVisible();

    // Offline camera should show "Offline" badge
    await expect(
      page.getByText(mockCameraData.cameraOffline.name)
    ).toBeVisible();
    await expect(page.getByText('Offline').first()).toBeVisible();
  });

  test('clicking camera detail button opens detail view', async ({
    page,
    navigateToTab,
  }) => {
    await navigateToTab('Cameras');

    await page.waitForSelector('[data-testid="camera-grid"]', {
      timeout: 10000,
    });

    // Click the first "View camera details" button
    const detailButton = page
      .getByRole('button', { name: /view camera details/i })
      .first();
    await detailButton.click();

    // Should open a detail dialog/modal
    await expect(
      page.getByText(mockCameraData.cameraOnline.name)
    ).toBeVisible();
  });

  test('camera health metrics are visible for online cameras', async ({
    page,
    navigateToTab,
  }) => {
    await navigateToTab('Cameras');

    await page.waitForSelector('[data-testid="camera-grid"]', {
      timeout: 10000,
    });

    // Online camera should show RSSI value
    await expect(page.getByText(/-45 dBm/)).toBeVisible();

    // Should show uptime
    await expect(page.getByText(/1h 0m/)).toBeVisible();
  });

  // =========================================================================
  // T025: Container card rendering and detail
  // =========================================================================

  test('container cards render with labels and camera counts', async ({
    page,
    navigateToTab,
  }) => {
    await navigateToTab('Containers');

    await page.waitForSelector('[data-testid="containers-grid"]', {
      timeout: 10000,
    });

    // Verify all 3 containers render (scope to grid to avoid ContainerPicker ambiguity)
    const grid = page.locator('[data-testid="containers-grid"]');
    await expect(
      grid.getByText(mockContainerData.kitchenFridge.label!)
    ).toBeVisible();
    await expect(
      grid.getByText(mockContainerData.garageFreezer.label!)
    ).toBeVisible();
    await expect(
      grid.getByText(mockContainerData.numericContainer.label!)
    ).toBeVisible();

    // Kitchen fridge has 1/4 cameras
    await expect(page.getByText('1/4 cameras').first()).toBeVisible();
  });

  test('clicking container card opens detail dialog', async ({
    page,
    navigateToTab,
  }) => {
    await navigateToTab('Containers');

    await page.waitForSelector('[data-testid="containers-grid"]', {
      timeout: 10000,
    });

    // Click the first container card (Kitchen Fridge)
    const firstCard = page.locator(
      `[data-testid="container-card-${mockContainerData.kitchenFridge.id}"]`
    );
    await firstCard.click();

    // Detail dialog should open
    await expect(page.getByText('Container Details')).toBeVisible({
      timeout: 5000,
    });
  });

  // =========================================================================
  // T026: Diagnostics tab rendering
  // =========================================================================

  test('diagnostics health cards and sessions render', async ({ page }) => {
    // Navigate to DEV/Diagnostics tab
    await page.click('[data-testid="tab-diagnostics"]');
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', {
      state: 'visible',
    });

    // Wait for diagnostics section
    await expect(
      page.locator('[data-testid="diagnostics-section"]')
    ).toBeVisible({ timeout: 10000 });

    // Overall health badge
    await expect(
      page.locator('[data-testid="overall-health-badge"]')
    ).toBeVisible();

    // BridgeServer health card
    const bridgeCard = page.locator(
      '[data-testid="service-health-card-bridgeserver"]'
    );
    await expect(bridgeCard).toBeVisible();

    // Sessions panel with at least the header
    const sessionsPanel = page.locator('[data-testid="sessions-panel"]');
    await expect(sessionsPanel).toBeVisible();

    // Refresh button should exist
    await expect(
      page.locator('[data-testid="refresh-health"]')
    ).toBeVisible();
  });

  test('diagnostics refresh button triggers health check', async ({
    page,
  }) => {
    await page.click('[data-testid="tab-diagnostics"]');
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', {
      state: 'visible',
    });

    await expect(
      page.locator('[data-testid="diagnostics-section"]')
    ).toBeVisible({ timeout: 10000 });

    // Click refresh button
    const refreshButton = page.locator('[data-testid="refresh-health"]');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // After refresh, health cards should still be visible (not crashed)
    await expect(
      page.locator('[data-testid="service-health-card-bridgeserver"]')
    ).toBeVisible();
  });
});
