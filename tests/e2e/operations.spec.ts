/**
 * Operations E2E Tests
 * Feature: 057-live-ops-viewer (T019)
 *
 * Smoke tests for the Operations tab including session list,
 * session drill-down, camera health, and error states.
 */

import { test, expect } from './fixtures/test-base';
import { mockEndpoint, mockEvidenceData } from './fixtures/mock-routes';

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_SESSIONS = {
  success: true,
  data: {
    sessions: [
      {
        session_id: 'sess-op-001',
        container_id: 'ctr-op-001',
        started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        status: 'active',
        total_captures: 4,
        successful_captures: 3,
        failed_captures: 1,
        has_before_open: true,
        has_after_close: false,
        pair_complete: false,
        elapsed_seconds: 900,
      },
      {
        session_id: 'sess-op-002',
        container_id: 'ctr-op-002',
        started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        status: 'completed',
        total_captures: 8,
        successful_captures: 8,
        failed_captures: 0,
        has_before_open: true,
        has_after_close: true,
        pair_complete: true,
        elapsed_seconds: 2700,
      },
      {
        session_id: 'sess-op-003',
        container_id: 'ctr-op-003',
        started_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        status: 'cancelled',
        total_captures: 1,
        successful_captures: 1,
        failed_captures: 0,
        has_before_open: true,
        has_after_close: false,
        pair_complete: false,
        elapsed_seconds: 5400,
      },
    ],
    total: 3,
    queried_at: new Date().toISOString(),
  },
  timestamp: new Date().toISOString(),
};

const MOCK_SESSION_DELTA = {
  success: true,
  data: {
    run_id: 'run-op-001',
    session_id: 'sess-op-001',
    status: 'needs_review',
    delta: [
      {
        name: 'Cola 330ml',
        sku: 'COLA330',
        before_count: 5,
        after_count: 3,
        change: -2,
        confidence: 0.93,
        rationale: 'Two cans removed',
      },
    ],
    evidence: {
      before_image_url: 'data:image/png;base64,iVBORw0KGgo=',
      after_image_url: 'data:image/png;base64,iVBORw0KGgo=',
    },
    metadata: {
      provider: 'openai',
      processing_time_ms: 3200,
      model_version: 'gpt-4o',
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 10 * 60 * 1000 + 3200).toISOString(),
    },
  },
  timestamp: new Date().toISOString(),
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Override the default empty sessions mock with test data,
 * and ensure camera diagnostics returns an empty array (not an object).
 */
async function setupSessionsMock(page: import('@playwright/test').Page) {
  // Remove the default empty sessions mock registered by applyDefaultMocks
  await page.unroute('**/api/v1/diagnostics/sessions*');

  // Mock the sessions list endpoint with our test data
  await mockEndpoint(page, '**/api/v1/diagnostics/sessions*', {
    data: MOCK_SESSIONS,
  });

}

/**
 * Set up session detail and evidence mocks.
 * In V1, getSession() filters from the list endpoint (/v1/diagnostics/sessions),
 * so no individual session detail mock is needed.
 */
async function setupSessionDetailMock(page: import('@playwright/test').Page) {
  // The sessions list mock already includes sess-op-001 via setupSessionsMock().

  // Mock session delta endpoint
  await page.unroute('**/api/v1/sessions/*/inventory-delta');
  await mockEndpoint(page, '**/api/v1/sessions/*/inventory-delta', {
    data: MOCK_SESSION_DELTA,
  });

  // Mock evidence endpoint (V1)
  await mockEndpoint(page, '**/api/v1/sessions/*/evidence*', {
    data: mockEvidenceData.withEvidence,
  });
}

/**
 * Ensure the camera diagnostics endpoint returns a valid array.
 * The default mock at /api/dashboard/cameras/* returns {} (object),
 * but listCameraDiagnostics() expects CameraDiagnostics[] (array).
 */
async function setupCameraDiagnosticsMock(page: import('@playwright/test').Page) {
  await page.unroute('**/api/dashboard/cameras/*');
  await mockEndpoint(page, '**/api/dashboard/cameras/diagnostics', {
    data: [],
  });
}

/**
 * Navigate to the Operations tab and wait for it to be visible.
 */
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

test.describe('Operations Tab', () => {
  test.describe.configure({ mode: 'serial' });

  test('loads and shows session list with session cards', async ({ mockedPage }) => {
    await setupCameraDiagnosticsMock(mockedPage);
    await setupSessionsMock(mockedPage);
    await goToOperationsTab(mockedPage);

    // The operations view wrapper should be visible
    await expect(mockedPage.getByTestId('operations-view')).toBeVisible({ timeout: 10000 });

    // Session list view should be present
    await expect(mockedPage.getByTestId('session-list-view')).toBeVisible();

    // Individual session cards should be rendered
    await expect(mockedPage.getByTestId('session-card-sess-op-001')).toBeVisible();
    await expect(mockedPage.getByTestId('session-card-sess-op-002')).toBeVisible();
    await expect(mockedPage.getByTestId('session-card-sess-op-003')).toBeVisible();

    // Refresh button should be present
    await expect(mockedPage.getByTestId('session-refresh-btn')).toBeVisible();
  });

  test('camera health dashboard is visible alongside session list', async ({ mockedPage }) => {
    await setupCameraDiagnosticsMock(mockedPage);
    await setupSessionsMock(mockedPage);
    await goToOperationsTab(mockedPage);

    await expect(mockedPage.getByTestId('operations-view')).toBeVisible({ timeout: 10000 });

    // Camera health dashboard should render in the right panel.
    // With default mocks returning empty cameras, it shows the empty state.
    await expect(
      mockedPage.getByTestId('camera-health-empty').or(
        mockedPage.getByTestId('camera-health-dashboard')
      ).or(
        mockedPage.getByTestId('camera-health-error')
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test('clicking a session card drills down to detail view', async ({ mockedPage }) => {
    await setupCameraDiagnosticsMock(mockedPage);
    await setupSessionsMock(mockedPage);
    await setupSessionDetailMock(mockedPage);
    await goToOperationsTab(mockedPage);

    await expect(mockedPage.getByTestId('operations-view')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('session-card-sess-op-001')).toBeVisible();

    // Click the first session card to drill down
    await mockedPage.getByTestId('session-card-sess-op-001').click();

    // The detail view should appear (replacing the list + camera layout)
    await expect(mockedPage.getByTestId('session-detail-view')).toBeVisible({ timeout: 10000 });

    // Status badge should be visible in the detail view
    await expect(mockedPage.getByTestId('session-detail-status')).toBeVisible();

    // Back button should be available
    await expect(mockedPage.getByTestId('back-button')).toBeVisible();

    // Debug info collapsible should be present
    await expect(mockedPage.getByTestId('session-debug-info')).toBeVisible();
  });

  test('back button returns to session list and camera health', async ({ mockedPage }) => {
    await setupCameraDiagnosticsMock(mockedPage);
    await setupSessionsMock(mockedPage);
    await setupSessionDetailMock(mockedPage);
    await goToOperationsTab(mockedPage);

    // Drill into detail
    await expect(mockedPage.getByTestId('session-card-sess-op-001')).toBeVisible({ timeout: 10000 });
    await mockedPage.getByTestId('session-card-sess-op-001').click();
    await expect(mockedPage.getByTestId('session-detail-view')).toBeVisible({ timeout: 10000 });

    // Click back
    await mockedPage.getByTestId('back-button').click();

    // List view should reappear with sessions and camera health
    await expect(mockedPage.getByTestId('operations-view')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('session-list-view')).toBeVisible();
    await expect(mockedPage.getByTestId('session-card-sess-op-001')).toBeVisible();
  });

  test('error state displays actionable message when sessions API returns 500', async ({ mockedPage }) => {
    await setupCameraDiagnosticsMock(mockedPage);
    // Override the default sessions mock with a 500 error
    await mockedPage.unroute('**/api/v1/diagnostics/sessions*');
    await mockEndpoint(mockedPage, '**/api/v1/diagnostics/sessions*', {
      status: 500,
      error: true,
      errorMessage: 'Internal Server Error',
    });

    await goToOperationsTab(mockedPage);

    // Error state should be visible with retry action.
    // React Query retries 3 times with exponential backoff (~7s total) before showing error.
    await expect(mockedPage.getByTestId('session-list-error')).toBeVisible({ timeout: 30000 });
    await expect(mockedPage.getByText('Failed to load sessions')).toBeVisible();

    // Retry button should be present and actionable
    const retryButton = mockedPage.getByRole('button', { name: /retry/i });
    await expect(retryButton).toBeVisible();
  });

  test('empty state displays when no sessions exist', async ({ mockedPage }) => {
    await setupCameraDiagnosticsMock(mockedPage);
    // The default mock in test-base already returns empty sessions,
    // so we do not need to override anything.
    await goToOperationsTab(mockedPage);

    // Empty state should be shown
    await expect(mockedPage.getByTestId('session-list-empty')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByText('No sessions recorded yet')).toBeVisible();
  });
});
