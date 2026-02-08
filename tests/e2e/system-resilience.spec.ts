/**
 * E2E Tests: System Info Resilience
 *
 * Feature: 037-api-resilience (User Story 4)
 * Tests system info UI state transitions: loading, success, error with retry
 *
 * Related Requirements:
 * - FR-005: Distinct loading/empty/error states
 * - System info displays reliably with proper error handling
 */

import { test, expect } from './fixtures/test-base';
import {
  mockSystemSuccess,
  mockSystemError,
  mockCamerasSuccess,
  mockEndpoint,
  defaultMockData,
  wrapV1Envelope,
  mockContainersResponses,
} from './fixtures/mock-routes';

test.describe('System Info Resilience - US4', () => {
  // Helper to set up common mocks
  async function setupSystemTest(page: import('@playwright/test').Page) {
    await mockCamerasSuccess(page);
    await mockEndpoint(page, '**/api/wifi/status', {
      status: 200,
      data: defaultMockData.wifiStatus,
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
  }

  test.describe('T033: System info success', () => {
    test('displays system metrics when API returns data', async ({ page }) => {
      await setupSystemTest(page);
      await mockSystemSuccess(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to System tab if needed (might be on Overview by default)
      const systemTab = page.locator('[role="tab"]:has-text("System")');
      if (await systemTab.isVisible()) {
        await systemTab.click();
        await page.waitForTimeout(500);
      }

      // Verify system status component is visible (not error/loading)
      const systemStatus = page.locator('[data-testid="system-status"]');
      await expect(systemStatus).toBeVisible({ timeout: 10000 });

      // Verify some metric content is present
      await expect(systemStatus.getByText(/CPU/i)).toBeVisible();
      await expect(systemStatus.getByText(/Memory/i)).toBeVisible();
    });

    test('displays CPU, memory, and disk metrics', async ({ page }) => {
      await setupSystemTest(page);
      await mockSystemSuccess(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const systemTab = page.locator('[role="tab"]:has-text("System")');
      if (await systemTab.isVisible()) {
        await systemTab.click();
        await page.waitForTimeout(500);
      }

      // Wait for system status to load
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible();

      // Should show CPU usage
      await expect(page.getByText(/CPU.*Usage/i)).toBeVisible();
      // Should show Memory usage
      await expect(page.getByText(/Memory.*Usage/i)).toBeVisible();
      // Should show Disk usage
      await expect(page.getByText(/Disk.*Usage/i)).toBeVisible();
    });
  });

  test.describe('T034: System info error with retry', () => {
    test('displays error state when system API returns 500', async ({
      page,
    }) => {
      await setupSystemTest(page);
      await mockSystemError(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to System tab if needed
      const systemTab = page.locator('[role="tab"]:has-text("System")');
      if (await systemTab.isVisible()) {
        await systemTab.click();
        await page.waitForTimeout(500);
      }

      // Verify error state is shown
      const errorState = page.locator('[data-testid="system-error"]');
      await expect(errorState).toBeVisible({ timeout: 15000 });

      // Verify error message is present
      await expect(errorState).toContainText(/failed|error|unavailable/i);
    });

    test('shows retry button on error', async ({ page }) => {
      await setupSystemTest(page);
      await mockSystemError(page);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const systemTab = page.locator('[role="tab"]:has-text("System")');
      if (await systemTab.isVisible()) {
        await systemTab.click();
        await page.waitForTimeout(500);
      }

      // Wait for error state
      await expect(page.locator('[data-testid="system-error"]')).toBeVisible({ timeout: 15000 });

      // Verify retry button is present
      const retryButton = page.locator('[data-testid="system-retry-button"]');
      await expect(retryButton).toBeVisible();
    });

    test('retry button is clickable and does not crash the app', async ({ page }) => {
      await setupSystemTest(page);

      await mockEndpoint(page, '**/api/v1/system/info', {
        status: 500,
        error: true,
        errorMessage: 'Server error',
      });
      await mockEndpoint(page, '**/api/system/info', {
        status: 500,
        error: true,
        errorMessage: 'Server error',
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const systemTab = page.locator('[role="tab"]:has-text("System")');
      if (await systemTab.isVisible()) {
        await systemTab.click();
        await page.waitForTimeout(500);
      }

      // Wait for error state
      const errorState = page.locator('[data-testid="system-error"]');
      await expect(errorState).toBeVisible({ timeout: 15000 });

      // Verify retry button is present and clickable
      const retryButton = page.locator('[data-testid="system-retry-button"]');
      await expect(retryButton).toBeVisible();
      await retryButton.click();

      // App should not crash - tablist still visible
      await expect(page.locator('[role="tablist"]')).toBeVisible();
    });
  });

  test.describe('Loading state', () => {
    test('displays loading state during slow response', async ({ page }) => {
      await setupSystemTest(page);

      // Mock slow system info response (legacy + V1)
      await mockEndpoint(page, '**/api/system/info', {
        status: 200,
        delay: 3000,
        data: defaultMockData.systemInfo,
      });
      await mockEndpoint(page, '**/api/v1/system/info', {
        status: 200,
        delay: 3000,
        data: defaultMockData.systemInfo,
      });

      await page.goto('/');

      const systemTab = page.locator('[role="tab"]:has-text("System")');
      if (await systemTab.isVisible()) {
        await systemTab.click();
      }

      // Should see loading state
      const loadingState = page.locator('[data-testid="system-loading"]');
      await expect(loadingState).toBeVisible({ timeout: 2000 });

      // Wait for data to load
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible({ timeout: 10000 });

      // Loading state should be gone
      await expect(loadingState).not.toBeVisible();
    });
  });

  test.describe('State transition validation', () => {
    test('transitions correctly: loading → success', async ({ page }) => {
      await setupSystemTest(page);

      await mockEndpoint(page, '**/api/system/info', {
        status: 200,
        delay: 1500,
        data: defaultMockData.systemInfo,
      });
      await mockEndpoint(page, '**/api/v1/system/info', {
        status: 200,
        delay: 1500,
        data: defaultMockData.systemInfo,
      });

      await page.goto('/');

      const systemTab = page.locator('[role="tab"]:has-text("System")');
      if (await systemTab.isVisible()) {
        await systemTab.click();
      }

      // First: loading state
      await expect(page.locator('[data-testid="system-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-status"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="system-error"]')).not.toBeVisible();

      // Then: success state
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="system-loading"]')).not.toBeVisible();
    });

    test('transitions correctly: loading → error', async ({ page }) => {
      await setupSystemTest(page);

      await mockEndpoint(page, '**/api/system/info', {
        status: 500,
        delay: 1000,
        error: true,
        errorMessage: 'Server error',
      });
      await mockEndpoint(page, '**/api/v1/system/info', {
        status: 500,
        delay: 1000,
        error: true,
        errorMessage: 'Server error',
      });

      await page.goto('/');

      const systemTab = page.locator('[role="tab"]:has-text("System")');
      if (await systemTab.isVisible()) {
        await systemTab.click();
      }

      // First: loading state
      await expect(page.locator('[data-testid="system-loading"]')).toBeVisible();

      // Then: error state
      await expect(page.locator('[data-testid="system-error"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="system-loading"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="system-status"]')).not.toBeVisible();
    });
  });
});
