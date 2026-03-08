/**
 * Operations E2E Tests
 * Feature: 057-live-ops-viewer (T019)
 * Updated: 064-post-deploy-validation — migrated from REST to RPC mocks
 *
 * Smoke tests for the Operations tab including session list,
 * session drill-down, camera health, and error states.
 */

import { test, expect } from './fixtures/test-base';
import { mockEndpoint, mockEvidenceData } from './fixtures/mock-routes';
import {
  mockRpcEndpoint,
  mockRpcError,
  unrouteRpc,
  makeListSessionsResponse,
  makeGetSessionResponse,
  makeGetSessionEvidenceResponse,
  makeOperationSession,
  makeEvidenceCapture,
} from './fixtures/rpc-mocks';

// ============================================================================
// Mock Data (inventory delta — still REST)
// ============================================================================

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
 * Override the default empty sessions RPC mock with test data.
 */
async function setupSessionsMock(page: import('@playwright/test').Page) {
  await unrouteRpc(page, 'SessionService', 'ListSessions');
  await mockRpcEndpoint(page, 'SessionService', 'ListSessions',
    makeListSessionsResponse, {
      sessions: [
        makeOperationSession({
          sessionId: 'sess-op-001',
          containerId: 'ctr-op-001',
          status: 'SESSION_STATUS_ACTIVE',
          totalCaptures: 4,
          successfulCaptures: 3,
          failedCaptures: 1,
          hasBeforeOpen: true,
          hasAfterClose: false,
          pairComplete: false,
          elapsedSeconds: 900,
        }),
        makeOperationSession({
          sessionId: 'sess-op-002',
          containerId: 'ctr-op-002',
          status: 'SESSION_STATUS_COMPLETE',
          totalCaptures: 8,
          successfulCaptures: 8,
          failedCaptures: 0,
          hasBeforeOpen: true,
          hasAfterClose: true,
          pairComplete: true,
          elapsedSeconds: 2700,
        }),
        makeOperationSession({
          sessionId: 'sess-op-003',
          containerId: 'ctr-op-003',
          status: 'SESSION_STATUS_FAILED',
          totalCaptures: 1,
          successfulCaptures: 1,
          failedCaptures: 0,
          hasBeforeOpen: true,
          hasAfterClose: false,
          pairComplete: false,
          elapsedSeconds: 5400,
        }),
      ],
      totalCount: 3,
    });
}

/**
 * Set up session detail and evidence mocks.
 */
async function setupSessionDetailMock(page: import('@playwright/test').Page) {
  // GetSession RPC mock
  await unrouteRpc(page, 'SessionService', 'GetSession');
  await mockRpcEndpoint(page, 'SessionService', 'GetSession',
    makeGetSessionResponse, {
      session: makeOperationSession({
        sessionId: 'sess-op-001',
        containerId: 'ctr-op-001',
        status: 'SESSION_STATUS_ACTIVE',
        totalCaptures: 4,
        successfulCaptures: 3,
        failedCaptures: 1,
      }),
    });

  // GetSessionEvidence RPC mock
  await unrouteRpc(page, 'EvidenceService', 'GetSessionEvidence');
  await mockRpcEndpoint(page, 'EvidenceService', 'GetSessionEvidence',
    makeGetSessionEvidenceResponse, {
      sessionId: 'sess-op-001',
      containerId: 'ctr-op-001',
      captures: [
        makeEvidenceCapture({
          evidenceId: 'ev-op-before',
          captureTag: 'CAPTURE_TAG_BEFORE_OPEN',
          sessionId: 'sess-op-001',
        }),
        makeEvidenceCapture({
          evidenceId: 'ev-op-after',
          captureTag: 'CAPTURE_TAG_AFTER_CLOSE',
          sessionId: 'sess-op-001',
        }),
      ],
    });

  // Mock session delta endpoint (still REST)
  await page.unroute('**/api/v1/sessions/*/inventory-delta');
  await mockEndpoint(page, '**/api/v1/sessions/*/inventory-delta', {
    data: MOCK_SESSION_DELTA,
  });

  // Mock evidence endpoint (V1 REST — used by some legacy components)
  await mockEndpoint(page, '**/api/v1/sessions/*/evidence*', {
    data: mockEvidenceData.withEvidence,
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

  test('error state displays actionable message when sessions RPC returns 500', async ({ mockedPage }) => {
    // Override sessions RPC with 500 error
    await unrouteRpc(mockedPage, 'SessionService', 'ListSessions');
    await mockRpcError(mockedPage, 'SessionService', 'ListSessions',
      'internal', 'Internal Server Error', 500);

    await goToOperationsTab(mockedPage);

    // Error state should be visible with retry action.
    // React Query retries 3 times with exponential backoff (~7s total) before showing error.
    await expect(mockedPage.getByTestId('session-list-error')).toBeVisible({ timeout: 30000 });
    await expect(mockedPage.getByText('Unable to load sessions')).toBeVisible();

    // Retry button should be present and actionable
    const retryButton = mockedPage.getByRole('button', { name: /retry/i });
    await expect(retryButton).toBeVisible();
  });

  test('empty state displays when no sessions exist', async ({ mockedPage }) => {
    // The default RPC mock in test-base returns empty sessions,
    // so we do not need to override anything.
    await goToOperationsTab(mockedPage);

    // Empty state should be shown
    await expect(mockedPage.getByTestId('session-list-empty')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByText('No sessions recorded yet')).toBeVisible();
  });
});
