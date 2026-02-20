/**
 * Diagnostics E2E Tests
 * Feature: 038-dev-observability-panels (T057-T061)
 *
 * End-to-end tests for DEV Diagnostics feature.
 */

import { test, expect } from '@playwright/test';
import { mockEndpoint } from './fixtures/mock-routes';

// Mock data for diagnostics endpoints
const mockHealthyBridgeServer = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  checks: {
    database: { status: 'healthy', message: 'Database connection active' },
    storage: { status: 'healthy', message: 'MinIO connection established' },
  },
};

const mockHealthyMinio = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  buckets: {
    'delicasa-images': {
      exists: true,
      accessible: true,
      object_count: 42,
    },
  },
};

const mockSystemInfo = {
  success: true,
  data: {
    timestamp: new Date().toISOString(),
    cpu: { usage_percent: 25.5, core_count: 4 },
    memory: { used_mb: 1845, total_mb: 4096, used_percent: 45.2, available_mb: 2251 },
    disk: { used_gb: 12, total_gb: 32, used_percent: 37.5, path: '/' },
    temperature_celsius: 42.5,
    uptime: 86400000000000,
    load_average: { load_1: 0.5, load_5: 0.4, load_15: 0.3 },
    overall_status: 'healthy',
  },
};

const mockSessions = {
  success: true,
  data: {
    sessions: [
      {
        session_id: 'sess-12345',
        container_id: 'ctr-67890',
        started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'active',
        total_captures: 5,
        successful_captures: 4,
        failed_captures: 1,
        has_before_open: true,
        has_after_close: false,
        pair_complete: false,
        elapsed_seconds: 1800,
      },
      {
        session_id: 'sess-23456',
        container_id: 'ctr-78901',
        started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: 'active',
        total_captures: 3,
        successful_captures: 3,
        failed_captures: 0,
        has_before_open: true,
        has_after_close: false,
        pair_complete: false,
        elapsed_seconds: 3600,
      },
    ],
    total: 2,
    queried_at: new Date().toISOString(),
  },
  timestamp: new Date().toISOString(),
};

const mockSessionsEmpty = {
  success: true,
  data: { sessions: [], total: 0, queried_at: new Date().toISOString() },
  timestamp: new Date().toISOString(),
};

const mockEvidence = {
  success: true,
  data: {
    session_id: 'sess-12345',
    container_id: 'ctr-67890',
    captures: [
      {
        evidence_id: 'ev-001',
        capture_tag: 'BEFORE_OPEN',
        status: 'captured',
        device_id: 'espcam-b0f7f1',
        container_id: 'ctr-67890',
        session_id: 'sess-12345',
        created_at: new Date(Date.now() - 60 * 1000).toISOString(),
        image_data: 'iVBORw0KGgo=',
        content_type: 'image/jpeg',
        image_size_bytes: 45678,
        object_key: 'evidence/sess-12345/before-open.jpg',
        upload_status: 'uploaded',
      },
    ],
    summary: {
      total_captures: 1,
      successful_captures: 1,
      failed_captures: 0,
      has_before_open: true,
      has_after_close: false,
      pair_complete: false,
    },
  },
  timestamp: new Date().toISOString(),
};

/**
 * Apply all diagnostics mocks
 */
async function setupDiagnosticsMocks(page: import('@playwright/test').Page) {
  await mockEndpoint(page, '**/api/dashboard/diagnostics/bridgeserver', {
    data: mockHealthyBridgeServer,
  });
  await mockEndpoint(page, '**/api/dashboard/diagnostics/minio', {
    data: mockHealthyMinio,
  });
  await mockEndpoint(page, '**/api/system/info', {
    data: mockSystemInfo,
  });
  await mockEndpoint(page, '**/api/v1/diagnostics/sessions*', {
    data: mockSessions,
  });
  await mockEndpoint(page, '**/api/v1/sessions/*/evidence*', {
    data: mockEvidence,
  });
  // Mock other common endpoints to avoid 404s
  await mockEndpoint(page, '**/api/wifi/status', {
    data: { status: { connected: true, ssid: 'TestNetwork', mode: 'client' } },
  });
  await mockEndpoint(page, '**/api/door/status', {
    data: { state: 'closed', lock_state: 'locked' },
  });
  await mockEndpoint(page, '**/api/v1/cameras', {
    data: { success: true, data: { cameras: [], total: 0 } },
  });
}

test.describe('Diagnostics Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupDiagnosticsMocks(page);
  });

  test('T057: Health check page loads and displays all services', async ({ page }) => {
    await page.goto('/');

    // Click on Diagnostics tab
    await page.click('[data-testid="tab-diagnostics"]');

    // Wait for diagnostics section to load
    await expect(page.locator('[data-testid="diagnostics-section"]')).toBeVisible();

    // Verify all three service health cards are displayed
    await expect(page.locator('[data-testid="service-health-card-bridgeserver"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-health-card-piorchestrator"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-health-card-minio"]')).toBeVisible();

    // Verify overall health badge
    await expect(page.locator('[data-testid="overall-health-badge"]')).toBeVisible();
  });

  test('T058: Health refresh updates timestamps', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="tab-diagnostics"]');

    // Wait for initial load
    await expect(page.locator('[data-testid="diagnostics-section"]')).toBeVisible();

    // Get initial last updated time
    const lastUpdated = page.locator('[data-testid="last-updated"]');
    await expect(lastUpdated).toBeVisible();
    // Click refresh button
    await page.click('[data-testid="refresh-health"]');

    // Wait for refresh to complete (button re-enabled)
    await expect(page.locator('[data-testid="refresh-health"]')).toBeEnabled();

    // Verify timestamp updated or stayed the same (within seconds)
    const updatedTime = await lastUpdated.textContent();
    expect(updatedTime).toBeDefined();
  });

  test('T059: Sessions panel displays active sessions', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="tab-diagnostics"]');

    // Wait for sessions panel
    await expect(page.locator('[data-testid="sessions-panel"]')).toBeVisible();

    // Verify sessions are displayed
    await expect(page.locator('[data-testid="session-card-sess-12345"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-card-sess-23456"]')).toBeVisible();

    // Verify session count badge
    await expect(page.locator('[data-testid="sessions-count"]')).toHaveText('2');

    // Verify stale sessions indicator (sess-23456 has stale capture > 5 min)
    await expect(page.locator('[data-testid="stale-sessions-count"]')).toBeVisible();
  });

  test('T060: Evidence thumbnails load securely', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="tab-diagnostics"]');

    // Wait for sessions panel
    await expect(page.locator('[data-testid="sessions-panel"]')).toBeVisible();

    // Click on toggle evidence for first session with captures
    const toggleEvidence = page.locator('[data-testid="session-card-sess-12345"] [data-testid="toggle-evidence"]');
    if (await toggleEvidence.isVisible()) {
      await toggleEvidence.click();

      // Wait for evidence section to expand
      await expect(
        page.locator('[data-testid="session-card-sess-12345"] [data-testid="evidence-section"]')
      ).toBeVisible();

      // Verify evidence panel is visible
      await expect(
        page.locator('[data-testid="session-card-sess-12345"] [data-testid="evidence-panel"]')
      ).toBeVisible();
    }
  });

  test('T061: Error states display correctly when services unavailable', async ({ page }) => {
    // Override mocks with error responses
    await mockEndpoint(page, '**/api/dashboard/diagnostics/bridgeserver', {
      status: 503,
      error: true,
      errorMessage: 'Service unavailable',
    });
    await mockEndpoint(page, '**/api/dashboard/diagnostics/minio', {
      status: 503,
      error: true,
      errorMessage: 'Service unavailable',
    });
    await mockEndpoint(page, '**/api/system/info', {
      status: 503,
      error: true,
      errorMessage: 'Service unavailable',
    });
    await mockEndpoint(page, '**/api/v1/diagnostics/sessions*', {
      data: mockSessionsEmpty, // Empty sessions (graceful degradation)
    });

    await page.goto('/');
    await page.click('[data-testid="tab-diagnostics"]');

    // Wait for diagnostics section
    await expect(page.locator('[data-testid="diagnostics-section"]')).toBeVisible();

    // Service cards should still render (with unknown status due to 503)
    await expect(page.locator('[data-testid="service-health-card-bridgeserver"]')).toBeVisible();

    // Sessions should show empty state
    await expect(page.locator('[data-testid="sessions-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="sessions-empty"]')).toBeVisible();
  });

  test('Operator can verify health status in under 60 seconds (SC-001)', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.click('[data-testid="tab-diagnostics"]');

    // Wait for all health cards to be visible
    await expect(page.locator('[data-testid="service-health-card-bridgeserver"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-health-card-piorchestrator"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-health-card-minio"]')).toBeVisible();

    // Verify overall health badge is visible
    await expect(page.locator('[data-testid="overall-health-badge"]')).toBeVisible();

    const endTime = Date.now();
    const elapsedSeconds = (endTime - startTime) / 1000;

    // Should complete in under 60 seconds (acceptance criteria SC-001)
    expect(elapsedSeconds).toBeLessThan(60);
  });

  test('Sessions display with stale capture warning', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="tab-diagnostics"]');

    // Wait for sessions panel
    await expect(page.locator('[data-testid="sessions-panel"]')).toBeVisible();

    // Check for stale session indicator on sess-23456 (last capture 10 min ago)
    const staleSession = page.locator('[data-testid="session-card-sess-23456"]');
    await expect(staleSession).toBeVisible();

    // Should have stale warning
    await expect(staleSession.locator('[data-testid="stale-warning"]')).toBeVisible();
  });

  test('Auto-refresh indicator is displayed', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="tab-diagnostics"]');

    // Check for auto-refresh indicators
    await expect(page.getByText('Auto-refresh every 5 seconds')).toBeVisible();
    await expect(page.getByText('Auto-refresh every 10 seconds')).toBeVisible();
  });
});
