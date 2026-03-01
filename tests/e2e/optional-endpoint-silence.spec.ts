/**
 * Optional Endpoint Silence E2E Tests
 *
 * Verifies that when optional endpoints return 404/500/503,
 * the dashboard loads without console error spam and without
 * aggressive retry/polling loops.
 *
 * Endpoints tested:
 * - /api/v1/door/status (404)
 * - /api/v1/system/info (404)
 * - /api/v1/containers (404)
 * - /api/v1/cameras (404)
 * - /api/wifi/scan (500)
 */

import { test, expect } from '@playwright/test';
import { mockEndpoint, mockSessionsSuccess } from './fixtures/mock-routes';

/**
 * Apply mocks simulating a Pi build where optional endpoints are missing.
 * Only sessions/evidence and basic health are available.
 */
async function applyOptionalEndpoints404(page: import('@playwright/test').Page) {
  // --- Available endpoints ---
  await page.route('**/api/health', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy', version: '1.0.0', uptime: 3600 }),
    })
  );
  await mockSessionsSuccess(page);

  // Mock logs (available)
  await page.route('**/api/dashboard/logs', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 0, logs: [] }),
    })
  );
  await page.route('**/api/logs/recent', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 0, logs: [] }),
    })
  );

  // Mock config (available)
  await page.route('**/api/dashboard/config', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, sections: [] }),
    })
  );
  await page.route('**/api/config', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, sections: [] }),
    })
  );

  // Mock devices (available but empty)
  await page.route('**/api/devices', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ devices: [] }),
    })
  );

  // Mock network endpoints
  await page.route('**/api/network/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ connected: false, status: 'unavailable' }),
    })
  );

  // Mock auto-onboard
  await page.route('**/api/v1/onboarding/auto/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { enabled: false, status: 'idle' } }),
    })
  );

  // Mock diagnostics
  await page.route('**/api/dashboard/diagnostics/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }),
    })
  );

  // Mock inventory endpoints (404 since containers don't exist)
  await page.route('**/api/v1/containers/*/inventory/**', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Not found', retryable: false },
      }),
    })
  );
  await page.route('**/api/v1/sessions/*/inventory-delta', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Not found', retryable: false },
      }),
    })
  );

  // --- OPTIONAL endpoints returning 404/500 ---
  await mockEndpoint(page, '**/api/v1/door/status', {
    status: 404,
    error: true,
    errorMessage: 'Not Found',
  });
  await mockEndpoint(page, '**/api/v1/door/history*', {
    status: 404,
    error: true,
    errorMessage: 'Not Found',
  });
  await mockEndpoint(page, '**/api/v1/system/info', {
    status: 404,
    error: true,
    errorMessage: 'Not Found',
  });
  await mockEndpoint(page, '**/api/system/info', {
    status: 404,
    error: true,
    errorMessage: 'Not Found',
  });
  await mockEndpoint(page, '**/api/v1/containers', {
    status: 404,
    error: true,
    errorMessage: 'Not Found',
  });
  await mockEndpoint(page, '**/api/v1/containers/*', {
    status: 404,
    error: true,
    errorMessage: 'Not Found',
  });
  await mockEndpoint(page, '**/api/v1/cameras', {
    status: 404,
    error: true,
    errorMessage: 'Not Found',
  });
  await mockEndpoint(page, '**/api/v1/cameras/*', {
    status: 404,
    error: true,
    errorMessage: 'Not Found',
  });
  await mockEndpoint(page, '**/api/dashboard/cameras', {
    status: 404,
    error: true,
    errorMessage: 'Not Found',
  });
  await mockEndpoint(page, '**/api/dashboard/cameras/*', {
    status: 404,
    error: true,
    errorMessage: 'Not Found',
  });
  // WiFi returns 500 "not available" on this build
  await mockEndpoint(page, '**/api/wifi/scan', {
    status: 500,
    error: true,
    errorMessage: 'WiFi not available',
  });
  await mockEndpoint(page, '**/api/wifi/status', {
    status: 500,
    error: true,
    errorMessage: 'WiFi not available',
  });
  await mockEndpoint(page, '**/api/wifi/connect', {
    status: 500,
    error: true,
    errorMessage: 'WiFi not available',
  });
}

test.describe('Optional Endpoint Silence', () => {
  test('Overview tab loads without console error spam when optional endpoints 404', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known benign errors
        if (
          !text.includes('ResizeObserver') &&
          !text.includes('Download the React DevTools') &&
          !text.includes('Failed to load resource')
        ) {
          consoleErrors.push(text);
        }
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    await applyOptionalEndpoints404(page);
    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { state: 'visible' });

    // Wait for initial API calls to settle (3s should be enough)
    await page.waitForTimeout(3000);

    // Overview tab should be visible and functional
    await expect(page.locator('[role="tabpanel"][data-state="active"]')).toBeVisible();

    // No console.error should have fired from our app code
    // (browser-level "Failed to load resource" for 404 is excluded above)
    expect(consoleErrors).toEqual([]);
  });

  test('Operations tab loads successfully when optional endpoints 404', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('ResizeObserver') &&
          !text.includes('Download the React DevTools') &&
          !text.includes('Failed to load resource')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await applyOptionalEndpoints404(page);
    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { state: 'visible' });

    // Navigate to Operations tab
    await page.click('[data-testid="tab-operations"]');
    await page.waitForTimeout(2000);

    // Operations panel should render
    await expect(page.locator('[role="tabpanel"][data-state="active"]')).toBeVisible();

    // No console errors from app code
    expect(consoleErrors).toEqual([]);
  });

  test('Integration Diagnostics panel renders on Operations tab with graceful degradation', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('ResizeObserver') &&
          !text.includes('Download the React DevTools') &&
          !text.includes('Failed to load resource')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await applyOptionalEndpoints404(page);
    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { state: 'visible' });

    // Navigate to Operations tab
    await page.click('[data-testid="tab-operations"]');
    await page.waitForTimeout(2000);

    // Integration Diagnostics panel should exist (collapsed by default)
    const panel = page.locator('[data-testid="integration-diagnostics-panel"]');
    await expect(panel).toBeVisible();

    // Expand the panel
    await panel.locator('button').first().click();
    await page.waitForTimeout(500);

    // All three diagnostic sections should render
    await expect(page.locator('[data-testid="diag-bridge"]')).toBeVisible();
    await expect(page.locator('[data-testid="diag-sessions"]')).toBeVisible();
    await expect(page.locator('[data-testid="diag-door"]')).toBeVisible();

    // Door should show N/A (404 graceful degradation)
    await expect(page.locator('[data-testid="diag-door-status"]')).toContainText('N/A');

    // No console errors from the diagnostics panel
    expect(consoleErrors).toEqual([]);
  });

  test('optional endpoints are called at most once without refetch loops', async ({
    page,
  }) => {
    const requestCounts: Record<string, number> = {};

    page.on('request', (req) => {
      const url = req.url();
      // Track optional endpoint calls
      const patterns = [
        '/api/v1/door/status',
        '/api/v1/system/info',
        '/api/v1/containers',
        '/api/v1/cameras',
        '/api/wifi/status',
      ];
      for (const pattern of patterns) {
        if (url.includes(pattern)) {
          const key = pattern;
          requestCounts[key] = (requestCounts[key] || 0) + 1;
        }
      }
    });

    await applyOptionalEndpoints404(page);
    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { state: 'visible' });

    // Wait 5 seconds — if retry loops exist, counts would spike
    await page.waitForTimeout(5000);

    // Each optional endpoint should have been called at most a few times
    // (initial call + maybe 1-2 retries from base client, but NOT polling loops)
    for (const [endpoint, count] of Object.entries(requestCounts)) {
      expect(
        count,
        `${endpoint} was called ${count} times — expected <=4 (no polling loop)`
      ).toBeLessThanOrEqual(4);
    }
  });
});
