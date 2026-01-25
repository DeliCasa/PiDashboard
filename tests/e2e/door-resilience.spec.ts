/**
 * E2E Tests: Door Status Resilience
 *
 * Feature: 037-api-resilience (User Story 3)
 * Tests door status UI state transitions: loading, success (open/closed/locked), error
 *
 * Related Requirements:
 * - FR-005: Distinct loading/empty/error states
 * - Door status displays reliably with proper error handling
 */

import { test, expect } from './fixtures/test-base';
import {
  mockDoorSuccess,
  mockDoorError,
  mockCamerasSuccess,
  mockEndpoint,
  defaultMockData,
} from './fixtures/mock-routes';

test.describe('Door Status Resilience - US3', () => {
  // Helper to navigate to door section (assuming door is in its own tab or section)
  async function setupDoorTest(page: import('@playwright/test').Page) {
    await mockCamerasSuccess(page);
    await mockEndpoint(page, '**/api/system/info', {
      status: 200,
      data: defaultMockData.systemInfo,
    });
    await mockEndpoint(page, '**/api/wifi/status', {
      status: 200,
      data: defaultMockData.wifiStatus,
    });
  }

  test.describe('T027: Door status success (open/closed/locked)', () => {
    test('displays closed door state correctly', async ({ page }) => {
      await setupDoorTest(page);
      await mockDoorSuccess(page, 'closed');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to Door tab if needed
      const doorTab = page.locator('[role="tab"]:has-text("Door")');
      if (await doorTab.isVisible()) {
        await doorTab.click();
        await page.waitForTimeout(500);
      }

      // Verify door controls are visible (not error/loading state)
      const doorControls = page.locator('[data-testid="door-controls"]');
      await expect(doorControls).toBeVisible({ timeout: 10000 });

      // Verify door state shows "closed"
      const doorState = page.locator('[data-testid="door-state"]');
      await expect(doorState).toContainText(/closed/i);
    });

    test('displays open door state correctly', async ({ page }) => {
      await setupDoorTest(page);
      await mockDoorSuccess(page, 'open');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to Door tab if needed
      const doorTab = page.locator('[role="tab"]:has-text("Door")');
      if (await doorTab.isVisible()) {
        await doorTab.click();
        await page.waitForTimeout(500);
      }

      // Verify door controls are visible
      const doorControls = page.locator('[data-testid="door-controls"]');
      await expect(doorControls).toBeVisible({ timeout: 10000 });

      // Verify door state shows "open"
      const doorState = page.locator('[data-testid="door-state"]');
      await expect(doorState).toContainText(/open/i);
    });

    test('displays locked door state correctly', async ({ page }) => {
      await setupDoorTest(page);
      await mockDoorSuccess(page, 'locked');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to Door tab if needed
      const doorTab = page.locator('[role="tab"]:has-text("Door")');
      if (await doorTab.isVisible()) {
        await doorTab.click();
        await page.waitForTimeout(500);
      }

      // Verify door controls are visible
      const doorControls = page.locator('[data-testid="door-controls"]');
      await expect(doorControls).toBeVisible({ timeout: 10000 });

      // Verify lock state shows "locked"
      const lockState = page.locator('[data-testid="door-lock-state"]');
      await expect(lockState).toContainText(/locked/i);
    });
  });

  test.describe('T028: Door status error with retry', () => {
    test('displays error state when door API returns 500', async ({ page }) => {
      await setupDoorTest(page);
      await mockDoorError(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to Door tab if needed
      const doorTab = page.locator('[role="tab"]:has-text("Door")');
      if (await doorTab.isVisible()) {
        await doorTab.click();
        await page.waitForTimeout(500);
      }

      // Verify error state is shown
      const errorState = page.locator('[data-testid="door-controls-error"]');
      await expect(errorState).toBeVisible({ timeout: 10000 });

      // Verify error message mentions unavailability
      await expect(errorState).toContainText(/unavailable/i);
    });

    test('error state does not show door controls', async ({ page }) => {
      await setupDoorTest(page);
      await mockDoorError(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to Door tab if needed
      const doorTab = page.locator('[role="tab"]:has-text("Door")');
      if (await doorTab.isVisible()) {
        await doorTab.click();
        await page.waitForTimeout(500);
      }

      // Verify error state is shown
      await expect(page.locator('[data-testid="door-controls-error"]')).toBeVisible();

      // Door controls (normal state) should not be visible
      await expect(page.locator('[data-testid="door-controls"]')).not.toBeVisible();
    });
  });

  test.describe('T029: Door status loading state', () => {
    test('displays loading state during slow response', async ({ page }) => {
      await setupDoorTest(page);

      // Mock slow door status response
      await mockEndpoint(page, '**/api/door/status', {
        status: 200,
        delay: 3000,
        data: {
          state: 'closed',
          lock_state: 'locked',
        },
      });

      await page.goto('/');

      // Navigate to Door tab if needed
      const doorTab = page.locator('[role="tab"]:has-text("Door")');
      if (await doorTab.isVisible()) {
        await doorTab.click();
      }

      // Should see loading state
      const loadingState = page.locator('[data-testid="door-controls-loading"]');
      await expect(loadingState).toBeVisible({ timeout: 2000 });

      // Wait for data to load
      await expect(page.locator('[data-testid="door-controls"]')).toBeVisible({ timeout: 10000 });

      // Loading state should be gone
      await expect(loadingState).not.toBeVisible();
    });

    test('loading state shows spinner', async ({ page }) => {
      await setupDoorTest(page);

      await mockEndpoint(page, '**/api/door/status', {
        status: 200,
        delay: 5000,
        data: {
          state: 'closed',
          lock_state: 'locked',
        },
      });

      await page.goto('/');

      // Navigate to Door tab if needed
      const doorTab = page.locator('[role="tab"]:has-text("Door")');
      if (await doorTab.isVisible()) {
        await doorTab.click();
      }

      const loadingState = page.locator('[data-testid="door-controls-loading"]');
      await expect(loadingState).toBeVisible();

      // Should have an animated spinner
      const spinner = loadingState.locator('.animate-spin');
      await expect(spinner).toBeVisible();
    });
  });

  test.describe('State transition validation', () => {
    test('transitions correctly: loading → success', async ({ page }) => {
      await setupDoorTest(page);

      await mockEndpoint(page, '**/api/door/status', {
        status: 200,
        delay: 1500,
        data: {
          state: 'closed',
          lock_state: 'locked',
        },
      });

      await page.goto('/');

      // Navigate to Door tab if needed
      const doorTab = page.locator('[role="tab"]:has-text("Door")');
      if (await doorTab.isVisible()) {
        await doorTab.click();
      }

      // First: loading state
      await expect(page.locator('[data-testid="door-controls-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="door-controls"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="door-controls-error"]')).not.toBeVisible();

      // Then: success state
      await expect(page.locator('[data-testid="door-controls"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="door-controls-loading"]')).not.toBeVisible();
    });

    test('transitions correctly: loading → error', async ({ page }) => {
      await setupDoorTest(page);

      await mockEndpoint(page, '**/api/door/status', {
        status: 500,
        delay: 1000,
        error: true,
        errorMessage: 'Server error',
      });

      await page.goto('/');

      // Navigate to Door tab if needed
      const doorTab = page.locator('[role="tab"]:has-text("Door")');
      if (await doorTab.isVisible()) {
        await doorTab.click();
      }

      // First: loading state
      await expect(page.locator('[data-testid="door-controls-loading"]')).toBeVisible();

      // Then: error state
      await expect(page.locator('[data-testid="door-controls-error"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="door-controls-loading"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="door-controls"]')).not.toBeVisible();
    });
  });
});
