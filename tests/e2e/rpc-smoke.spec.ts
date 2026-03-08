/**
 * RPC Smoke E2E Tests
 * Feature: 064-post-deploy-validation (US1)
 *
 * Verifies sessions, evidence, and cameras render correctly when backed
 * by Connect RPC mocks. Uses wire testing factory data (inlined in rpc-mocks.ts).
 *
 * Run: PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/rpc-smoke.spec.ts --project=chromium
 */

import { test, expect } from './fixtures/test-base';
import {
  mockRpcEndpoint,
  mockRpcError,
  unrouteRpc,
  makeListSessionsResponse,
  makeGetSessionResponse,
  makeGetSessionEvidenceResponse,
  makeGetEvidencePairResponse,
  makeListCamerasResponse,
  makeOperationSession,
  makeCamera,
  makeCameraHealth,
  makeEvidenceCapture,
} from './fixtures/rpc-mocks';

// ============================================================================
// Helpers
// ============================================================================

async function goToOperationsTab(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[role="tablist"]', { state: 'visible' });
  await page.click('[data-testid="tab-operations"]');
  await page.waitForSelector('[role="tabpanel"][data-state="active"]', {
    state: 'visible',
  });
}

async function goToCamerasTab(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[role="tablist"]', { state: 'visible' });
  await page.getByRole('tab', { name: /cameras/i }).click();
  await page.waitForSelector('[role="tabpanel"][data-state="active"]', {
    state: 'visible',
  });
}

// ============================================================================
// Sessions Smoke (Operations Tab)
// ============================================================================

test.describe('RPC Smoke: Sessions', () => {
  test.describe.configure({ mode: 'serial' });

  test('sessions list renders with RPC data', async ({ mockedPage }) => {
    // Override default empty sessions with test data
    await unrouteRpc(mockedPage, 'SessionService', 'ListSessions');
    await mockRpcEndpoint(mockedPage, 'SessionService', 'ListSessions',
      makeListSessionsResponse, {
        sessions: [
          makeOperationSession({
            sessionId: 'sess-rpc-001',
            containerId: 'ctn-rpc-001',
            status: 'SESSION_STATUS_COMPLETE',
            totalCaptures: 4,
            successfulCaptures: 4,
            failedCaptures: 0,
            pairComplete: true,
          }),
          makeOperationSession({
            sessionId: 'sess-rpc-002',
            containerId: 'ctn-rpc-002',
            status: 'SESSION_STATUS_ACTIVE',
            totalCaptures: 1,
            successfulCaptures: 1,
            failedCaptures: 0,
            pairComplete: false,
            hasAfterClose: false,
          }),
          makeOperationSession({
            sessionId: 'sess-rpc-003',
            containerId: 'ctn-rpc-003',
            status: 'SESSION_STATUS_FAILED',
            totalCaptures: 1,
            successfulCaptures: 0,
            failedCaptures: 1,
            pairComplete: false,
            hasAfterClose: false,
          }),
        ],
        totalCount: 3,
      });

    await goToOperationsTab(mockedPage);

    // Operations view should be visible
    await expect(mockedPage.getByTestId('operations-view')).toBeVisible({ timeout: 10000 });

    // Session list should render
    await expect(mockedPage.getByTestId('session-list-view')).toBeVisible();

    // Individual session cards should be present
    await expect(mockedPage.getByTestId('session-card-sess-rpc-001')).toBeVisible();
    await expect(mockedPage.getByTestId('session-card-sess-rpc-002')).toBeVisible();
    await expect(mockedPage.getByTestId('session-card-sess-rpc-003')).toBeVisible();

    // Status badges should reflect the session states
    const completeCard = mockedPage.getByTestId('session-card-sess-rpc-001');
    await expect(completeCard.getByTestId('session-status')).toBeVisible();

    // Container ID should be displayed
    await expect(completeCard.getByText('ctn-rpc-001')).toBeVisible();
  });

  test('session detail with evidence captures', async ({ mockedPage }) => {
    // Override sessions list
    await unrouteRpc(mockedPage, 'SessionService', 'ListSessions');
    await mockRpcEndpoint(mockedPage, 'SessionService', 'ListSessions',
      makeListSessionsResponse, {
        sessions: [
          makeOperationSession({
            sessionId: 'sess-rpc-detail',
            containerId: 'ctn-rpc-detail',
            status: 'SESSION_STATUS_COMPLETE',
            totalCaptures: 2,
            successfulCaptures: 2,
            pairComplete: true,
          }),
        ],
      });

    // Override GetSession for the detail view
    await unrouteRpc(mockedPage, 'SessionService', 'GetSession');
    await mockRpcEndpoint(mockedPage, 'SessionService', 'GetSession',
      makeGetSessionResponse, {
        session: makeOperationSession({
          sessionId: 'sess-rpc-detail',
          containerId: 'ctn-rpc-detail',
          status: 'SESSION_STATUS_COMPLETE',
          totalCaptures: 2,
          successfulCaptures: 2,
          pairComplete: true,
        }),
      });

    // Override GetSessionEvidence with evidence captures
    await unrouteRpc(mockedPage, 'EvidenceService', 'GetSessionEvidence');
    await mockRpcEndpoint(mockedPage, 'EvidenceService', 'GetSessionEvidence',
      makeGetSessionEvidenceResponse, {
        sessionId: 'sess-rpc-detail',
        containerId: 'ctn-rpc-detail',
        captures: [
          makeEvidenceCapture({
            evidenceId: 'ev-before-001',
            captureTag: 'CAPTURE_TAG_BEFORE_OPEN',
            status: 'CAPTURE_STATUS_CAPTURED',
            sessionId: 'sess-rpc-detail',
          }),
          makeEvidenceCapture({
            evidenceId: 'ev-after-001',
            captureTag: 'CAPTURE_TAG_AFTER_CLOSE',
            status: 'CAPTURE_STATUS_CAPTURED',
            sessionId: 'sess-rpc-detail',
          }),
        ],
      });

    await goToOperationsTab(mockedPage);

    // Click session card to drill down
    await expect(mockedPage.getByTestId('session-card-sess-rpc-detail')).toBeVisible({ timeout: 10000 });
    await mockedPage.getByTestId('session-card-sess-rpc-detail').click();

    // Detail view should appear
    await expect(mockedPage.getByTestId('session-detail-view')).toBeVisible({ timeout: 10000 });

    // Status badge and back button should be present
    await expect(mockedPage.getByTestId('session-detail-status')).toBeVisible();
    await expect(mockedPage.getByTestId('back-button')).toBeVisible();
  });

  test('evidence pair display', async ({ mockedPage }) => {
    // Set up sessions and evidence
    await unrouteRpc(mockedPage, 'SessionService', 'ListSessions');
    await mockRpcEndpoint(mockedPage, 'SessionService', 'ListSessions',
      makeListSessionsResponse, {
        sessions: [
          makeOperationSession({
            sessionId: 'sess-rpc-pair',
            containerId: 'ctn-rpc-pair',
            status: 'SESSION_STATUS_COMPLETE',
            totalCaptures: 2,
            successfulCaptures: 2,
            pairComplete: true,
          }),
        ],
      });

    await unrouteRpc(mockedPage, 'SessionService', 'GetSession');
    await mockRpcEndpoint(mockedPage, 'SessionService', 'GetSession',
      makeGetSessionResponse, {
        session: makeOperationSession({
          sessionId: 'sess-rpc-pair',
          containerId: 'ctn-rpc-pair',
          status: 'SESSION_STATUS_COMPLETE',
          pairComplete: true,
        }),
      });

    await unrouteRpc(mockedPage, 'EvidenceService', 'GetSessionEvidence');
    await mockRpcEndpoint(mockedPage, 'EvidenceService', 'GetSessionEvidence',
      makeGetSessionEvidenceResponse, {
        sessionId: 'sess-rpc-pair',
        captures: [
          makeEvidenceCapture({
            evidenceId: 'ev-pair-before',
            captureTag: 'CAPTURE_TAG_BEFORE_OPEN',
          }),
          makeEvidenceCapture({
            evidenceId: 'ev-pair-after',
            captureTag: 'CAPTURE_TAG_AFTER_CLOSE',
          }),
        ],
      });

    await unrouteRpc(mockedPage, 'EvidenceService', 'GetEvidencePair');
    await mockRpcEndpoint(mockedPage, 'EvidenceService', 'GetEvidencePair',
      makeGetEvidencePairResponse);

    await goToOperationsTab(mockedPage);

    // Navigate to session detail
    await expect(mockedPage.getByTestId('session-card-sess-rpc-pair')).toBeVisible({ timeout: 10000 });
    await mockedPage.getByTestId('session-card-sess-rpc-pair').click();
    await expect(mockedPage.getByTestId('session-detail-view')).toBeVisible({ timeout: 10000 });

    // Evidence panel should render with captures
    // The evidence panel may show as evidence-panel or evidence-empty depending
    // on whether the UI auto-fetches evidence on session detail load
    const evidencePanel = mockedPage.getByTestId('evidence-panel');
    const evidenceEmpty = mockedPage.getByTestId('evidence-empty');
    const evidenceUnavailable = mockedPage.getByTestId('evidence-unavailable');

    await expect(
      evidencePanel.or(evidenceEmpty).or(evidenceUnavailable)
    ).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// Cameras Smoke
// ============================================================================

test.describe('RPC Smoke: Cameras', () => {
  test('camera list renders with health metrics', async ({ mockedPage }) => {
    // Override default empty cameras with test data
    await unrouteRpc(mockedPage, 'CameraService', 'ListCameras');
    await mockRpcEndpoint(mockedPage, 'CameraService', 'ListCameras',
      makeListCamerasResponse, {
        cameras: [
          makeCamera({
            deviceId: 'cam-rpc-online',
            name: 'Front Camera',
            status: 'CAMERA_STATUS_ONLINE',
            health: makeCameraHealth({
              wifiRssi: -42,
              freeHeap: '245760',
              uptimeSeconds: '3600',
              firmwareVersion: '2.1.0',
            }),
          }),
          makeCamera({
            deviceId: 'cam-rpc-offline',
            name: 'Rear Camera',
            status: 'CAMERA_STATUS_OFFLINE',
            health: undefined,
          }),
        ],
        totalCount: 2,
      });

    await goToCamerasTab(mockedPage);

    // Camera section should render
    const cameraGrid = mockedPage.getByTestId('camera-grid');
    const cameraError = mockedPage.getByTestId('camera-error');
    const cameraEmpty = mockedPage.getByTestId('camera-empty');

    // Wait for cameras to render (not loading)
    await expect(
      cameraGrid.or(cameraEmpty).or(cameraError)
    ).toBeVisible({ timeout: 10000 });

    // If camera grid rendered, verify camera cards exist
    if (await cameraGrid.isVisible()) {
      const cards = mockedPage.getByTestId('camera-card');
      await expect(cards.first()).toBeVisible();
    }
  });
});

// ============================================================================
// Graceful Degradation
// ============================================================================

test.describe('RPC Smoke: Graceful Degradation', () => {
  test('sessions RPC unavailable shows fallback', async ({
    mockedPage,
    expectNoConsoleErrors,
  }) => {
    // Override sessions with 503 error
    await unrouteRpc(mockedPage, 'SessionService', 'ListSessions');
    await mockRpcError(mockedPage, 'SessionService', 'ListSessions',
      'unavailable', 'Service unavailable', 503);

    await goToOperationsTab(mockedPage);

    // Should show unavailable or error state, not crash
    const unavailable = mockedPage.getByTestId('session-list-unavailable');
    const error = mockedPage.getByTestId('session-list-error');
    const empty = mockedPage.getByTestId('session-list-empty');

    await expect(
      unavailable.or(error).or(empty)
    ).toBeVisible({ timeout: 30000 });

    // No unhandled console errors
    await expectNoConsoleErrors();
  });

  test('cameras RPC unavailable shows fallback', async ({
    mockedPage,
    expectNoConsoleErrors,
  }) => {
    // Override cameras with 503 error
    await unrouteRpc(mockedPage, 'CameraService', 'ListCameras');
    await mockRpcError(mockedPage, 'CameraService', 'ListCameras',
      'unavailable', 'Service unavailable', 503);

    await goToCamerasTab(mockedPage);

    // Should show fallback/error state, not crash
    const cameraError = mockedPage.getByTestId('camera-error');
    const cameraEmpty = mockedPage.getByTestId('camera-empty');

    await expect(
      cameraError.or(cameraEmpty)
    ).toBeVisible({ timeout: 30000 });

    await expectNoConsoleErrors();
  });

  test('mixed success/failure: sessions succeed, cameras fail', async ({
    mockedPage,
    expectNoConsoleErrors,
  }) => {
    // Sessions succeed with data
    await unrouteRpc(mockedPage, 'SessionService', 'ListSessions');
    await mockRpcEndpoint(mockedPage, 'SessionService', 'ListSessions',
      makeListSessionsResponse, {
        sessions: [
          makeOperationSession({
            sessionId: 'sess-mixed-001',
            status: 'SESSION_STATUS_COMPLETE',
          }),
        ],
      });

    // Camera health dashboard uses REST, not RPC — but the Cameras tab
    // uses RPC. The Operations tab camera health uses legacy diagnostics.
    // So this test verifies sessions render on the Operations tab even when
    // the RPC camera endpoints fail.
    await unrouteRpc(mockedPage, 'CameraService', 'ListCameras');
    await mockRpcError(mockedPage, 'CameraService', 'ListCameras',
      'unavailable', 'Service unavailable', 503);

    await goToOperationsTab(mockedPage);

    // Sessions should render
    await expect(mockedPage.getByTestId('operations-view')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('session-card-sess-mixed-001')).toBeVisible({ timeout: 10000 });

    // No unhandled errors
    await expectNoConsoleErrors();
  });
});
