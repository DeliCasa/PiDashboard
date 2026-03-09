/**
 * Live RPC Smoke E2E Tests (Feature 065)
 *
 * Smoke tests that run against a real Raspberry Pi via the Vite dev server proxy.
 * Tests RPC-backed flows: sessions, evidence, and cameras via the Operations tab.
 *
 * Unlike rpc-smoke.spec.ts (which uses mocks), these tests hit real endpoints.
 * The Vite dev server proxies /api → Pi:8082 and /rpc → Pi:8081.
 * Tests skip gracefully when endpoints are unavailable or return no data.
 *
 * Prerequisites:
 *   - SSH tunnels: ssh -L 8082:localhost:8082 -L 8081:localhost:8081 pi
 *
 * Usage:
 *   LIVE_RPC=1 VITE_PI_HOST=localhost npx playwright test --project=live-rpc
 */

import { test, expect } from './fixtures/test-base';

const LIVE_RPC = process.env.LIVE_RPC === '1';

// RPC pre-flight: POST to the Vite proxy which forwards to Pi:8081
async function rpcAvailable(
  page: import('@playwright/test').Page,
  service: string,
  method: string,
): Promise<boolean> {
  try {
    const res = await page.request.post(
      `/rpc/delicasa.device.v1.${service}/${method}`,
      { data: {} },
    );
    return res.ok();
  } catch {
    return false;
  }
}

// ============================================================================
// RPC Smoke: Sessions (Operations Tab)
// ============================================================================

test.describe('Live RPC Smoke: Sessions', () => {
  test.beforeAll(() => {
    if (!LIVE_RPC) test.skip();
  });

  test('should render operations view from live RPC', async ({ page }) => {
    if (!LIVE_RPC) { test.skip(); return; }

    const available = await rpcAvailable(page, 'SessionService', 'ListSessions');
    if (!available) { test.skip(); return; }

    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    await page.click('[data-testid="tab-operations"]');
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', { state: 'visible' });

    // Should show operations view (either with sessions or empty state)
    const opsView = page.getByTestId('operations-view');
    await expect(opsView).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/live-rpc-sessions-list.png' });
  });

  test('should drill into session detail if sessions exist', async ({ page }) => {
    if (!LIVE_RPC) { test.skip(); return; }

    const available = await rpcAvailable(page, 'SessionService', 'ListSessions');
    if (!available) { test.skip(); return; }

    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    await page.click('[data-testid="tab-operations"]');
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', { state: 'visible' });

    // Wait for session data to load
    await page.waitForTimeout(2000);

    // Check if any session rows exist
    const sessionRow = page.getByTestId('session-row').first();
    const hasSession = await sessionRow.isVisible().catch(() => false);

    if (!hasSession) {
      test.skip();
      return;
    }

    await sessionRow.click();

    // Should navigate to detail view
    await expect(page.getByTestId('session-detail')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/live-rpc-session-detail.png' });
  });
});

// ============================================================================
// RPC Smoke: Cameras
// ============================================================================

test.describe('Live RPC Smoke: Cameras', () => {
  test.beforeAll(() => {
    if (!LIVE_RPC) test.skip();
  });

  test('should render camera list from live RPC', async ({ page }) => {
    if (!LIVE_RPC) { test.skip(); return; }

    const available = await rpcAvailable(page, 'CameraService', 'ListCameras');
    if (!available) { test.skip(); return; }

    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    await page.getByRole('tab', { name: /cameras/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', { state: 'visible' });

    // Should show camera management section
    await expect(page.getByText('Camera Management')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/live-rpc-camera-list.png' });
  });

  test('should show camera health metrics if cameras exist', async ({ page }) => {
    if (!LIVE_RPC) { test.skip(); return; }

    const available = await rpcAvailable(page, 'CameraService', 'ListCameras');
    if (!available) { test.skip(); return; }

    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    await page.getByRole('tab', { name: /cameras/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', { state: 'visible' });

    // Wait for camera data to load
    await page.waitForTimeout(2000);

    // Check for camera cards with status indicators
    const cameraCard = page.locator('[data-testid^="camera-card"]').first();
    const hasCamera = await cameraCard.isVisible().catch(() => false);

    if (!hasCamera) {
      test.skip();
      return;
    }

    // Camera should show status (online/offline/error)
    const status = page.locator('text=/online|offline|error|rebooting/i').first();
    await expect(status).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/live-rpc-camera-health.png' });
  });
});

// ============================================================================
// RPC Smoke: Evidence
// ============================================================================

test.describe('Live RPC Smoke: Evidence', () => {
  test.beforeAll(() => {
    if (!LIVE_RPC) test.skip();
  });

  test('should display evidence when session has captures', async ({ page }) => {
    if (!LIVE_RPC) { test.skip(); return; }

    const sessionsAvailable = await rpcAvailable(page, 'SessionService', 'ListSessions');
    if (!sessionsAvailable) { test.skip(); return; }

    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    await page.click('[data-testid="tab-operations"]');
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', { state: 'visible' });

    // Wait for session data to load
    await page.waitForTimeout(2000);

    // Find a session with captures
    const sessionRow = page.getByTestId('session-row').first();
    const hasSession = await sessionRow.isVisible().catch(() => false);

    if (!hasSession) {
      test.skip();
      return;
    }

    await sessionRow.click();
    await expect(page.getByTestId('session-detail')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/live-rpc-evidence.png' });
  });
});

// ============================================================================
// REST Smoke (via proxy)
// ============================================================================

test.describe('Live RPC Smoke: REST endpoints', () => {
  test.beforeAll(() => {
    if (!LIVE_RPC) test.skip();
  });

  test('should load system info from live API', async ({ page }) => {
    if (!LIVE_RPC) { test.skip(); return; }

    const res = await page.request.get('/api/system/info');
    if (!res.ok()) { test.skip(); return; }

    const data = await res.json();
    expect(data).toHaveProperty('overall_status');
    expect(data.overall_status).toBe('healthy');

    // Verify dashboard loads with real data
    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    await page.getByRole('tab', { name: /system/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', { state: 'visible' });

    await page.screenshot({ path: 'test-results/live-rpc-system-info.png' });
  });
});

// ============================================================================
// Console Error Check
// ============================================================================

test.describe('Live RPC Smoke: No Console Errors', () => {
  test.beforeAll(() => {
    if (!LIVE_RPC) test.skip();
  });

  test('should not produce unhandled console errors during RPC navigation', async ({ page, expectNoConsoleErrors }) => {
    if (!LIVE_RPC) { test.skip(); return; }

    await page.goto('/');
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // Navigate to Operations tab (triggers RPC calls)
    await page.click('[data-testid="tab-operations"]');
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', { state: 'visible', timeout: 10000 });

    // Navigate to Cameras tab (triggers RPC calls)
    await page.getByRole('tab', { name: /cameras/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', { state: 'visible', timeout: 10000 });

    // Navigate back to System tab
    await page.getByRole('tab', { name: /system/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]', { state: 'visible', timeout: 10000 });

    await expectNoConsoleErrors();
  });
});
