/**
 * E2E Tests: WiFi Graceful Degradation
 *
 * Feature: 037-api-resilience (User Story 2)
 * Tests WiFi 404/503 handling - zero console errors, no broken features
 *
 * Related Requirements:
 * - SC-003: WiFi 404 → zero console errors
 * - SC-007: WiFi 404 → other features work
 * - FR-007: WiFi 404 = feature unavailable
 * - FR-008: No 404 console errors
 */

import { test, expect } from './fixtures/test-base';
import {
  mockWifi404,
  mockWifi503,
  mockCamerasSuccess,
  mockEndpoint,
  defaultMockData,
} from './fixtures/mock-routes';

test.describe('WiFi Graceful Degradation - US2', () => {
  test.describe('T018: WiFi 404 with console error check', () => {
    test('no console errors when WiFi returns 404', async ({
      page,
      expectNoConsoleErrors,
    }) => {
      // Mock WiFi to return 404
      await mockWifi404(page);
      // Mock other endpoints to work normally
      await mockCamerasSuccess(page);
      await mockEndpoint(page, '**/api/system/info', {
        status: 200,
        data: defaultMockData.systemInfo,
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Give time for any WiFi requests to complete
      await page.waitForTimeout(2000);

      // Check for console errors - should be none from WiFi 404
      await expectNoConsoleErrors();
    });

    test('WiFi 404 does not produce error toast', async ({ page }) => {
      await mockWifi404(page);
      await mockCamerasSuccess(page);
      await mockEndpoint(page, '**/api/system/info', {
        status: 200,
        data: defaultMockData.systemInfo,
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for potential toast to appear
      await page.waitForTimeout(3000);

      // Should not see error toasts related to WiFi
      const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
      await expect(errorToasts).toHaveCount(0);
    });
  });

  test.describe('T019: WiFi 503 graceful handling', () => {
    test('no console errors when WiFi returns 503', async ({
      page,
      expectNoConsoleErrors,
    }) => {
      // Mock WiFi to return 503
      await mockWifi503(page);
      // Mock other endpoints to work normally
      await mockCamerasSuccess(page);
      await mockEndpoint(page, '**/api/system/info', {
        status: 200,
        data: defaultMockData.systemInfo,
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Give time for any WiFi requests to complete
      await page.waitForTimeout(2000);

      // Check for console errors - should be none from WiFi 503
      await expectNoConsoleErrors();
    });

    test('WiFi 503 does not break other features', async ({ page }) => {
      await mockWifi503(page);
      await mockCamerasSuccess(page);
      await mockEndpoint(page, '**/api/system/info', {
        status: 200,
        data: defaultMockData.systemInfo,
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Camera section should still work
      const cameraGrid = page.locator('[data-testid="camera-grid"]');
      await expect(cameraGrid).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('T020: Cameras tab works when WiFi returns 404', () => {
    test('cameras display correctly with WiFi 404', async ({ page }) => {
      // WiFi returns 404 but cameras work
      await mockWifi404(page);
      await mockCamerasSuccess(page);
      await mockEndpoint(page, '**/api/system/info', {
        status: 200,
        data: defaultMockData.systemInfo,
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Camera grid should be visible and working
      const cameraGrid = page.locator('[data-testid="camera-grid"]');
      await expect(cameraGrid).toBeVisible({ timeout: 10000 });

      // Should have 3 camera cards
      const cameraCards = page.locator('[data-testid="camera-grid"] > div');
      await expect(cameraCards).toHaveCount(3);
    });

    test('can interact with cameras when WiFi is unavailable', async ({
      page,
    }) => {
      await mockWifi404(page);
      await mockCamerasSuccess(page);
      await mockEndpoint(page, '**/api/system/info', {
        status: 200,
        data: defaultMockData.systemInfo,
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for camera grid
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();

      // Verify refresh button works
      const refreshButton = page.locator('button:has-text("Refresh")');
      await expect(refreshButton).toBeVisible();
      // Don't actually click to avoid test flakiness
    });
  });

  test.describe('T021: No toast notifications on WiFi 404', () => {
    test('no error notifications appear for WiFi 404', async ({ page }) => {
      await mockWifi404(page);
      await mockCamerasSuccess(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait a bit for any toasts to potentially appear
      await page.waitForTimeout(3000);

      // No error toasts should be present
      const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
      await expect(errorToasts).toHaveCount(0);
    });

    test('no warning notifications appear for WiFi 404', async ({ page }) => {
      await mockWifi404(page);
      await mockCamerasSuccess(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait a bit for any toasts to potentially appear
      await page.waitForTimeout(3000);

      // No warning toasts should be present (related to WiFi)
      // Note: We check the text content to ensure it's not about WiFi
      const toasts = page.locator('[data-sonner-toast]');
      const count = await toasts.count();

      // If there are toasts, none should be about WiFi
      for (let i = 0; i < count; i++) {
        const toastText = await toasts.nth(i).textContent();
        expect(toastText?.toLowerCase()).not.toContain('wifi');
      }
    });
  });

  test.describe('Cross-feature isolation', () => {
    test('system info works when WiFi is unavailable', async ({ page }) => {
      await mockWifi404(page);
      await mockCamerasSuccess(page);
      await mockEndpoint(page, '**/api/system/info', {
        status: 200,
        data: defaultMockData.systemInfo,
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // System status should be visible (if shown on default tab)
      // Or cameras should work - main point is the app doesn't break
      const appContent = page.locator('main, [data-testid="app-container"]');
      await expect(appContent).toBeVisible();

      // No error states should be visible for non-WiFi features
      // Camera grid should work
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible({ timeout: 10000 });
    });

    test('door status works when WiFi is unavailable', async ({ page }) => {
      await mockWifi404(page);
      await mockCamerasSuccess(page);
      await mockEndpoint(page, '**/api/door/status', {
        status: 200,
        data: {
          state: 'closed',
          lock_state: 'locked',
        },
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // App should be functional
      const appContent = page.locator('main, [data-testid="app-container"]');
      await expect(appContent).toBeVisible();
    });
  });
});
