/**
 * Live Pi Smoke Tests (T044)
 *
 * Smoke tests that run against a real Raspberry Pi when LIVE_PI_URL is set.
 * These tests verify the dashboard works with actual hardware.
 *
 * Usage:
 *   LIVE_PI_URL=http://192.168.1.100:8082 npm run test:e2e:live
 */

import { test, expect, annotations } from './fixtures/test-base';

// Skip all tests if LIVE_PI_URL is not set
const LIVE_PI_URL = process.env.LIVE_PI_URL;

test.describe('Live Pi Smoke Tests', () => {
  test.beforeAll(() => {
    if (!LIVE_PI_URL) {
      test.skip();
    }
  });

  test.beforeEach(async ({ page }) => {
    // Use LIVE_PI_URL if available
    if (!LIVE_PI_URL) {
      annotations.requiresLivePi();
      return;
    }

    // No mocks - use real API
    await page.goto(LIVE_PI_URL);
  });

  test('should connect to live Pi dashboard', async ({ page }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    // Wait for page to load
    await page.waitForSelector('#root', { timeout: 10000 });

    // Should have title
    await expect(page).toHaveTitle(/Pi Dashboard/i);
  });

  test('should display real system metrics', async ({ page }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // System tab should be default
    await page.getByRole('tab', { name: /system/i }).click();

    // Should show real hostname (auto-waiting with extended timeout for real Pi)
    const hostname = await page.locator('text=/\\w+-pi|raspberry|pi/i').first();
    await expect(hostname).toBeVisible({ timeout: 5000 });

    // Should show CPU usage (any percentage)
    await expect(page.getByText(/%/)).toBeVisible();
  });

  test('should display real WiFi status', async ({ page }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // Navigate to WiFi tab
    await page.getByRole('tab', { name: /wifi/i }).click();

    // Should show connected/disconnected status (auto-waiting)
    const wifiStatus = await page.locator('text=/connected|disconnected/i').first();
    await expect(wifiStatus).toBeVisible({ timeout: 5000 });
  });

  test('should display real door status', async ({ page }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // Navigate to Door tab
    await page.getByRole('tab', { name: /door/i }).click();

    // Should show door state (auto-waiting)
    const doorStatus = await page.locator('text=/open|closed|unknown|unavailable|locked|unlocked/i').first();
    await expect(doorStatus).toBeVisible({ timeout: 5000 });
  });

  test('should display real config entries', async ({ page }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // Navigate to Config tab
    await page.getByRole('tab', { name: /config/i }).click();

    // Should show some config entries (auto-waiting)
    const configEntry = await page.locator('text=/\\.port|\\.host|\\.url/i').first();
    await expect(configEntry).toBeVisible({ timeout: 5000 });
  });

  test('should display real log entries', async ({ page }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // Navigate to Logs tab
    await page.getByRole('tab', { name: /logs/i }).click();

    // Should show log level indicators or log entries (auto-waiting)
    const logIndicator = await page.locator('text=/info|debug|warn|error|log/i').first();
    await expect(logIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should handle tab navigation smoothly', async ({ page }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // Navigate through all tabs
    const tabs = ['System', 'WiFi', 'Door', 'Config', 'Logs'];

    for (const tabName of tabs) {
      const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
      await tab.click();

      // Tab should be active (auto-waiting)
      await expect(tab).toHaveAttribute('data-state', 'active');
    }
  });

  test('should not have console errors', async ({ page, expectNoConsoleErrors }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // Navigate through tabs to trigger any errors
    await page.getByRole('tab', { name: /wifi/i }).click();
    await expect(page.getByRole('tab', { name: /wifi/i })).toHaveAttribute('data-state', 'active');

    await page.getByRole('tab', { name: /system/i }).click();
    await expect(page.getByRole('tab', { name: /system/i })).toHaveAttribute('data-state', 'active');

    // Check for console errors
    await expectNoConsoleErrors();
  });
});

test.describe('Live Pi Performance', () => {
  test.beforeAll(() => {
    if (!LIVE_PI_URL) {
      test.skip();
    }
  });

  test('should load dashboard within 5 seconds', async ({ page }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    const startTime = Date.now();

    await page.goto(LIVE_PI_URL);
    await page.waitForSelector('[role="tablist"]', { timeout: 5000 });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });

  test('should respond to tab clicks within 1 second', async ({ page }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    await page.goto(LIVE_PI_URL);
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    const startTime = Date.now();

    await page.getByRole('tab', { name: /wifi/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', {
      timeout: 1000,
    });

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(1000);
  });
});

test.describe('Live Pi Network', () => {
  test.beforeAll(() => {
    if (!LIVE_PI_URL) {
      test.skip();
    }
  });

  test('should be reachable on local network', async ({ page }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    // Try to reach the Pi
    const response = await page.request.get(`${LIVE_PI_URL}/api/system/info`);

    expect(response.ok()).toBe(true);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('hostname');
  });

  test('should return valid JSON from API endpoints', async ({ page }) => {
    if (!LIVE_PI_URL) {
      test.skip();
      return;
    }

    const endpoints = [
      '/api/system/info',
      '/api/wifi/status',
      '/api/wifi/scan',
      '/api/door/status',
      '/api/config',
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.get(`${LIVE_PI_URL}${endpoint}`);

      // Should return JSON
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');

      // Should be valid JSON
      const data = await response.json();
      expect(data).toBeDefined();
    }
  });
});
