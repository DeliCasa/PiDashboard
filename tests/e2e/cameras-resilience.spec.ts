/**
 * E2E Tests: Camera List Resilience
 *
 * Feature: 037-api-resilience (User Story 1)
 * Tests camera list UI state transitions: loading, success, empty, error, network failure
 *
 * Related Requirements:
 * - SC-001: Mocked API with cameras → all cameras displayed
 * - SC-002: Mocked API with empty list → "No cameras connected"
 * - FR-005: Distinct loading/empty/error states
 * - FR-006: Never show "No cameras" on error
 */

import { test, expect } from './fixtures/test-base';
import {
  mockCamerasSuccess,
  mockCamerasEmpty,
  mockCamerasError,
  mockCamerasLoading,
  mockCamerasNetworkFailure,
  mockCamerasResponses,
  mockEndpoint,
  defaultMockData,
  wrapV1Envelope,
  mockContainersResponses,
} from './fixtures/mock-routes';

test.describe('Camera List Resilience - US1', () => {
  /** Apply background V1 mocks for non-camera endpoints */
  async function applyBackgroundMocks(page: import('@playwright/test').Page) {
    await mockEndpoint(page, '**/api/system/info', {
      status: 200,
      data: defaultMockData.systemInfo,
    });
    await mockEndpoint(page, '**/api/v1/system/info', {
      status: 200,
      data: defaultMockData.systemInfo,
    });
    await mockEndpoint(page, '**/api/wifi/status', {
      status: 200,
      data: defaultMockData.wifiStatus,
    });
    await mockEndpoint(page, '**/api/wifi/scan', {
      status: 200,
      data: defaultMockData.wifiScan,
    });
    await mockEndpoint(page, '**/api/door/status', {
      status: 200,
      data: defaultMockData.doorStatus,
    });
    await mockEndpoint(page, '**/api/v1/door/status', {
      status: 200,
      data: wrapV1Envelope(defaultMockData.doorStatus, 'test-door-status'),
    });
    await mockEndpoint(page, '**/api/v1/door/history*', {
      status: 200,
      data: wrapV1Envelope({ history: [] }, 'test-door-history'),
    });
    await mockEndpoint(page, '**/api/v1/containers', {
      status: 200,
      data: mockContainersResponses.empty,
    });
    await mockEndpoint(page, '**/api/v1/onboarding/auto/status', {
      status: 200,
      data: wrapV1Envelope({ enabled: false, status: 'idle' }, 'test-auto-onboard'),
    });
    await mockEndpoint(page, '**/api/dashboard/config', {
      status: 200,
      data: defaultMockData.config,
    });
    await mockEndpoint(page, '**/api/dashboard/logs', {
      status: 200,
      data: defaultMockData.logs,
    });
  }

  test.describe('T009: Success with data scenario', () => {
    test('displays all cameras when API returns camera data', async ({ page }) => {
      // Mock cameras endpoint with data
      await mockCamerasSuccess(page);
      await applyBackgroundMocks(page);

      // Navigate to cameras section (tab is usually the default or needs clicking)
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Verify camera grid is visible
      const cameraGrid = page.locator('[data-testid="camera-grid"]');
      await expect(cameraGrid).toBeVisible({ timeout: 10000 });

      // Verify at least one camera card is shown
      const cameraCards = page.locator('[data-testid="camera-grid"] > div');
      await expect(cameraCards).toHaveCount(3); // We mocked 3 cameras

      // Verify no error state is shown
      await expect(page.locator('[data-testid="camera-error"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="camera-empty"]')).not.toBeVisible();
    });

    test('displays camera names and status from API response', async ({ page }) => {
      await mockCamerasSuccess(page);
      await applyBackgroundMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for camera grid to appear
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();

      // Verify camera names are displayed
      await expect(page.getByText('Front Door Camera')).toBeVisible();
      // Other cameras from mock data
    });
  });

  test.describe('T010: Empty list scenario', () => {
    test('displays "No cameras connected" when API returns empty array', async ({
      page,
    }) => {
      // Mock cameras endpoint with empty list
      await mockCamerasEmpty(page);
      await applyBackgroundMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Verify empty state is shown
      const emptyState = page.locator('[data-testid="camera-empty"]');
      await expect(emptyState).toBeVisible({ timeout: 10000 });
      await expect(emptyState).toContainText('No cameras connected');

      // Verify no error state is shown
      await expect(page.locator('[data-testid="camera-error"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="camera-grid"]')).not.toBeVisible();
    });

    test('shows helpful message for empty state', async ({ page }) => {
      await mockCamerasEmpty(page);
      await applyBackgroundMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const emptyState = page.locator('[data-testid="camera-empty"]');
      await expect(emptyState).toBeVisible();
      // Should contain guidance text
      await expect(emptyState).toContainText('PiOrchestrator');
    });
  });

  test.describe('T011: Server error (500) scenario', () => {
    test('displays error state with retry button on 500 error', async ({
      page,
    }) => {
      // Mock cameras endpoint with server error
      await mockCamerasError(page);
      await applyBackgroundMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Verify error state is shown
      const errorState = page.locator('[data-testid="camera-error"]');
      await expect(errorState).toBeVisible({ timeout: 10000 });

      // Verify retry button is present
      const retryButton = errorState.locator('button:has-text("Retry")');
      await expect(retryButton).toBeVisible();

      // CRITICAL: Verify "No cameras connected" is NOT shown
      await expect(page.locator('[data-testid="camera-empty"]')).not.toBeVisible();
    });

    test('does not show "No cameras connected" on server error (FR-006)', async ({
      page,
    }) => {
      await mockCamerasError(page);
      await applyBackgroundMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for error state
      await expect(page.locator('[data-testid="camera-error"]')).toBeVisible();

      // CRITICAL CHECK: Empty state must not be visible
      await expect(page.locator('[data-testid="camera-empty"]')).not.toBeVisible();

      // Also ensure "No cameras connected" text is not on page
      await expect(page.getByText('No cameras connected')).not.toBeVisible();
    });

    test('retry button is clickable and does not crash the app', async ({ page }) => {
      // Mock cameras endpoint with server error
      await mockCamerasError(page);
      await applyBackgroundMocks(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for error state
      const errorState = page.locator('[data-testid="camera-error"]');
      await expect(errorState).toBeVisible({ timeout: 30000 });

      // Verify retry button is present and clickable
      const retryButton = errorState.locator('button:has-text("Retry")');
      await expect(retryButton).toBeVisible();
      await retryButton.click();

      // App should not crash - tablist still visible
      await expect(page.locator('[role="tablist"]')).toBeVisible();
    });
  });

  test.describe('T012: Network failure scenario', () => {
    test('displays error state on network failure', async ({ page }) => {
      // Mock network failure
      await mockCamerasNetworkFailure(page);
      await applyBackgroundMocks(page);

      await page.goto('/');

      // Wait for error state (may take time due to retries)
      const errorState = page.locator('[data-testid="camera-error"]');
      await expect(errorState).toBeVisible({ timeout: 30000 }); // Longer timeout for retries

      // Verify retry button is present
      await expect(errorState.locator('button:has-text("Retry")')).toBeVisible();

      // CRITICAL: Verify "No cameras connected" is NOT shown
      await expect(page.locator('[data-testid="camera-empty"]')).not.toBeVisible();
    });

    test('does not show "No cameras connected" on network failure', async ({
      page,
    }) => {
      await mockCamerasNetworkFailure(page);
      await applyBackgroundMocks(page);

      await page.goto('/');

      // Wait for error state
      await expect(page.locator('[data-testid="camera-error"]')).toBeVisible({ timeout: 30000 });

      // Empty state must not be visible
      await expect(page.locator('[data-testid="camera-empty"]')).not.toBeVisible();
    });
  });

  test.describe('T013: Loading state (slow response) scenario', () => {
    test('displays loading state during slow response', async ({ page }) => {
      // Mock slow cameras endpoint (3 second delay)
      await mockCamerasLoading(page, 3000);
      await applyBackgroundMocks(page);

      await page.goto('/');

      // Should see loading state immediately
      const loadingState = page.locator('[data-testid="camera-loading"]');
      await expect(loadingState).toBeVisible({ timeout: 2000 });
      await expect(loadingState).toContainText('Loading');

      // Wait for data to load
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible({ timeout: 10000 });

      // Loading state should be gone
      await expect(loadingState).not.toBeVisible();
    });

    test('loading state shows spinner', async ({ page }) => {
      await mockCamerasLoading(page, 5000);
      await applyBackgroundMocks(page);

      await page.goto('/');

      const loadingState = page.locator('[data-testid="camera-loading"]');
      await expect(loadingState).toBeVisible();

      // Should have an animated spinner (animate-spin class)
      const spinner = loadingState.locator('.animate-spin');
      await expect(spinner).toBeVisible();
    });
  });

  test.describe('State transition validation', () => {
    test('transitions correctly: loading → success with data', async ({
      page,
    }) => {
      await mockCamerasLoading(page, 1500);
      await applyBackgroundMocks(page);

      await page.goto('/');

      // First: loading state
      await expect(page.locator('[data-testid="camera-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="camera-grid"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="camera-error"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="camera-empty"]')).not.toBeVisible();

      // Then: success state with data
      await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="camera-loading"]')).not.toBeVisible();
    });

    test('transitions correctly: loading → empty', async ({ page }) => {
      // Mock slow empty response
      await mockEndpoint(page, '**/api/v1/cameras', {
        status: 200,
        delay: 1500,
        data: mockCamerasResponses.empty,
      });
      await applyBackgroundMocks(page);

      await page.goto('/');

      // First: loading state
      await expect(page.locator('[data-testid="camera-loading"]')).toBeVisible();

      // Then: empty state
      await expect(page.locator('[data-testid="camera-empty"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="camera-loading"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="camera-grid"]')).not.toBeVisible();
    });

    test('transitions correctly: loading → error', async ({ page }) => {
      // Mock slow error response
      await mockEndpoint(page, '**/api/v1/cameras', {
        status: 500,
        delay: 1000,
        error: true,
        errorMessage: 'Server error',
      });
      await applyBackgroundMocks(page);

      await page.goto('/');

      // First: loading state
      await expect(page.locator('[data-testid="camera-loading"]')).toBeVisible();

      // Then: error state
      await expect(page.locator('[data-testid="camera-error"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="camera-loading"]')).not.toBeVisible();
      // CRITICAL: empty state must not appear
      await expect(page.locator('[data-testid="camera-empty"]')).not.toBeVisible();
    });
  });
});
