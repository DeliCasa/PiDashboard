/**
 * Smoke Tests (T040, T056)
 *
 * Basic smoke tests to verify the application loads correctly.
 * Includes layout centering assertion for v1.1.1 regression check.
 */

import { test, expect } from './fixtures/test-base';
import { createMockAPI } from './fixtures/mock-routes';

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();
  });

  test('should load the application without errors', async ({
    page,
    expectNoConsoleErrors,
  }) => {
    await page.goto('/');

    // Wait for app to be ready
    await page.waitForSelector('#root');
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });

    // Should have page title
    await expect(page).toHaveTitle(/Pi Dashboard/i);

    // Check for console errors
    await expectNoConsoleErrors();
  });

  test('should display main navigation tabs', async ({ page }) => {
    await page.goto('/');

    // Wait for tabs to load
    await page.waitForSelector('[role="tablist"]');

    // Should have all main tabs
    await expect(page.getByRole('tab', { name: /system/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /wifi/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /door/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /config/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /logs/i })).toBeVisible();
  });

  test('should have default tab selected', async ({ page }) => {
    await page.goto('/');

    // Wait for tabs
    await page.waitForSelector('[role="tablist"]');

    // First tab (Overview) should be selected by default
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    await expect(overviewTab).toHaveAttribute('data-state', 'active');
  });

  test('should navigate between tabs', async ({ page, navigateToTab }) => {
    await page.goto('/');
    await page.waitForSelector('[role="tablist"]');

    // Navigate to WiFi tab
    await navigateToTab('WiFi');
    await expect(page.getByRole('tab', { name: /wifi/i })).toHaveAttribute(
      'data-state',
      'active'
    );

    // Navigate to Door tab
    await navigateToTab('Door');
    await expect(page.getByRole('tab', { name: /door/i })).toHaveAttribute(
      'data-state',
      'active'
    );

    // Navigate back to System
    await navigateToTab('System');
    await expect(page.getByRole('tab', { name: /system/i })).toHaveAttribute(
      'data-state',
      'active'
    );
  });

  /**
   * T056: Layout centering assertion
   * Verifies the v1.1.1 regression fix for centered content
   */
  test('should have centered layout (v1.1.1 regression check)', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for main content
    await page.waitForSelector('main, [role="main"], .container');

    // Get the main content container
    const mainContent = await page.locator('main, [role="main"]').first();

    // Check that content is centered
    const boundingBox = await mainContent.boundingBox();
    const viewport = page.viewportSize();

    if (boundingBox && viewport) {
      // Content should be approximately centered (within 50px tolerance)
      const contentCenter = boundingBox.x + boundingBox.width / 2;
      const viewportCenter = viewport.width / 2;
      const offset = Math.abs(contentCenter - viewportCenter);

      // Allow some offset for padding/margins
      expect(offset).toBeLessThan(50);
    }

    // Also check that container has max-width constraint
    const containerStyles = await mainContent.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        maxWidth: styles.maxWidth,
        marginLeft: styles.marginLeft,
        marginRight: styles.marginRight,
      };
    });

    // Container should have auto margins or be within a flex container
    const hasAutoMargins =
      containerStyles.marginLeft === 'auto' ||
      containerStyles.marginRight === 'auto';
    const hasMaxWidth =
      containerStyles.maxWidth !== 'none' &&
      containerStyles.maxWidth !== '100%';

    // Either max-width constraint or auto margins indicates centered layout
    expect(hasAutoMargins || hasMaxWidth).toBeTruthy();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Wait for app to load
    await page.waitForSelector('[role="tablist"]');

    // Tabs should still be visible
    await expect(page.getByRole('tablist')).toBeVisible();

    // Content should not overflow
    const body = page.locator('body');
    const scrollWidth = await body.evaluate((el) => el.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });

  test('should display theme toggle', async ({ page }) => {
    await page.goto('/');

    // Theme toggle should be accessible
    const themeToggle = page.getByRole('button', { name: /theme|mode/i });
    await expect(themeToggle).toBeVisible();
  });

  test('should toggle between light and dark themes', async ({ page }) => {
    await page.goto('/');

    // Find theme toggle
    const themeToggle = page.getByRole('button', { name: /theme|mode/i });

    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light';
    });

    // Click toggle
    await themeToggle.click();

    // Theme should change
    const newTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light';
    });

    expect(newTheme).not.toBe(initialTheme);
  });

  test('should not have horizontal scroll on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // Wait for content
    await page.waitForSelector('[role="tablist"]');

    // Check for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe('Error Handling', () => {
  test('should display error state when API fails', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.mockError('**/api/system/info', 500, 'Server Error');
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');

    // Should still show the app shell (graceful degradation)
    // Using auto-waiting assertion instead of hardcoded timeout
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 5000 });
  });

  test('should handle slow API responses', async ({ page }) => {
    const mockAPI = createMockAPI(page);

    // Mock slow response (3 seconds) with proper PiOrchestrator format
    await mockAPI.mockSlow('**/api/system/info', 3000, {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        cpu: {
          usage_percent: 88.5,
          core_count: 4,
          per_core: [85, 90, 88, 91],
        },
        memory: {
          used_mb: 1845,
          total_mb: 4096,
          used_percent: 45.2,
          available_mb: 2251,
        },
        disk: {
          used_gb: 12,
          total_gb: 32,
          used_percent: 37.5,
          path: '/',
        },
        temperature_celsius: 42.5,
        uptime: 86400000000000,
        load_average: {
          load_1: 0.5,
          load_5: 0.4,
          load_15: 0.3,
        },
        overall_status: 'healthy',
      },
    });

    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');

    // Should show loading state initially and wait for slow response
    // Using auto-waiting assertion with extended timeout for slow API
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 5000 });

    // Wait for the CPU usage to appear (indicates slow response completed)
    // Using a unique value (88.5%) that distinguishes from default mock (25.5%)
    await expect(page.getByText('88.5%')).toBeVisible({ timeout: 5000 });
  });
});
