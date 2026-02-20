/**
 * Real Evidence Ops E2E Tests
 * Feature: 058-real-evidence-ops (T024)
 *
 * Tests for production-grade error handling: graceful degradation on 404/503,
 * image auto-refresh, subsystem error isolation, and debug panel.
 */

import { test, expect } from './fixtures/test-base';
import { mockEndpoint } from './fixtures/mock-routes';

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_SESSIONS = {
  success: true,
  data: {
    sessions: [
      {
        id: 'sess-re-001',
        delivery_id: 'del-re-001',
        started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        status: 'active',
        capture_count: 3,
        last_capture_at: new Date(Date.now() - 30 * 1000).toISOString(),
      },
    ],
  },
};

const MOCK_SESSION_DETAIL = {
  success: true,
  data: {
    id: 'sess-re-001',
    delivery_id: 'del-re-001',
    started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'active',
    capture_count: 3,
    last_capture_at: new Date(Date.now() - 30 * 1000).toISOString(),
  },
};

const MOCK_DELTA_WITH_EVIDENCE = {
  success: true,
  data: {
    run_id: 'run-re-001',
    session_id: 'sess-re-001',
    status: 'done',
    delta: [
      { name: 'Water 500ml', sku: 'W500', before_count: 10, after_count: 8, change: -2, confidence: 0.95 },
    ],
    evidence: {
      before_image_url: 'https://minio.example.com/bucket/sessions/sess-re-001/before.jpg?X-Amz-Signature=abc',
      after_image_url: 'https://minio.example.com/bucket/sessions/sess-re-001/after.jpg?X-Amz-Signature=def',
    },
    metadata: {},
  },
  timestamp: new Date().toISOString(),
};

const MOCK_CAMERAS = [
  {
    camera_id: 'espcam-A1B2C3',
    name: 'Front Camera',
    status: 'online',
    last_seen: new Date(Date.now() - 30_000).toISOString(),
    health: { heap: 95000, wifi_rssi: -45, uptime: 86400 },
    diagnostics: { connection_quality: 'excellent', error_count: 0 },
  },
];

// ============================================================================
// Helpers
// ============================================================================

async function setupFullMocks(page: import('@playwright/test').Page) {
  await page.unroute('**/api/dashboard/diagnostics/sessions*');
  await mockEndpoint(page, '**/api/dashboard/diagnostics/sessions*', {
    data: MOCK_SESSIONS,
  });

  await page.unroute('**/api/dashboard/cameras/*');
  await mockEndpoint(page, '**/api/dashboard/cameras/diagnostics', {
    data: MOCK_CAMERAS,
  });
}

async function goToOperationsTab(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[role="tablist"]', { state: 'visible' });
  await page.click('[data-testid="tab-operations"]');
  await page.waitForSelector('[role="tabpanel"][data-state="active"]', {
    state: 'visible',
  });
}

// ============================================================================
// Tests
// ============================================================================

test.describe('Real Evidence Ops (058)', () => {
  test.describe.configure({ mode: 'serial' });

  test('sessions load from real API endpoint', async ({ mockedPage }) => {
    await setupFullMocks(mockedPage);
    await goToOperationsTab(mockedPage);

    await expect(mockedPage.getByTestId('operations-view')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('session-list-view')).toBeVisible();
    await expect(mockedPage.getByTestId('session-card-sess-re-001')).toBeVisible();
  });

  test('sessions API 404 shows graceful degradation', async ({ mockedPage }) => {
    await mockedPage.unroute('**/api/dashboard/diagnostics/sessions*');
    await mockEndpoint(mockedPage, '**/api/dashboard/diagnostics/sessions*', {
      status: 404,
      error: true,
      errorMessage: 'Not Found',
    });

    await mockedPage.unroute('**/api/dashboard/cameras/*');
    await mockEndpoint(mockedPage, '**/api/dashboard/cameras/diagnostics', {
      data: MOCK_CAMERAS,
    });

    await goToOperationsTab(mockedPage);

    // Should show graceful unavailable message instead of error
    await expect(mockedPage.getByTestId('session-list-unavailable')).toBeVisible({ timeout: 30000 });
  });

  test('camera health loads independently of session errors', async ({ mockedPage }) => {
    // Sessions fail with 500
    await mockedPage.unroute('**/api/dashboard/diagnostics/sessions*');
    await mockEndpoint(mockedPage, '**/api/dashboard/diagnostics/sessions*', {
      status: 500,
      error: true,
      errorMessage: 'Internal Server Error',
    });

    // Camera health succeeds
    await mockedPage.unroute('**/api/dashboard/cameras/*');
    await mockEndpoint(mockedPage, '**/api/dashboard/cameras/diagnostics', {
      data: MOCK_CAMERAS,
    });

    await goToOperationsTab(mockedPage);

    await expect(mockedPage.getByTestId('operations-view')).toBeVisible({ timeout: 10000 });

    // Camera health should still be visible (either dashboard or empty state)
    await expect(
      mockedPage.getByTestId('camera-health-dashboard').or(
        mockedPage.getByTestId('camera-health-empty')
      )
    ).toBeVisible({ timeout: 15000 });
  });

  test('session detail loads evidence and shows debug panel', async ({ mockedPage }) => {
    await setupFullMocks(mockedPage);

    // Setup session detail and delta mocks
    await mockEndpoint(mockedPage, '**/api/dashboard/diagnostics/sessions/sess-re-001', {
      data: MOCK_SESSION_DETAIL,
    });

    await mockedPage.unroute('**/api/v1/sessions/*/inventory-delta');
    await mockEndpoint(mockedPage, '**/api/v1/sessions/*/inventory-delta', {
      data: MOCK_DELTA_WITH_EVIDENCE,
    });

    await goToOperationsTab(mockedPage);

    // Click into session
    await expect(mockedPage.getByTestId('session-card-sess-re-001')).toBeVisible({ timeout: 10000 });
    await mockedPage.getByTestId('session-card-sess-re-001').click();

    // Session detail should load
    await expect(mockedPage.getByTestId('session-detail-view')).toBeVisible({ timeout: 10000 });

    // Evidence panel should be present
    await expect(mockedPage.getByTestId('evidence-panel')).toBeVisible({ timeout: 10000 });

    // Debug info section should be present
    await expect(mockedPage.getByTestId('evidence-debug-info')).toBeVisible();
  });
});
