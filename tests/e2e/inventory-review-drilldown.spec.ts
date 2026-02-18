/**
 * Inventory Review Drill-down E2E Tests
 * Feature: 055-session-review-drilldown (T025)
 *
 * Validates the operator review walkthrough: navigate to Inventory tab,
 * drill into a needs_review run, verify timeline + evidence + delta,
 * approve, and confirm finalized state.
 */

import { test, expect } from './fixtures/test-base';
import {
  setupReviewDrilldownMocks,
  switchToApprovedDelta,
  switchToErrorDelta,
} from './fixtures/inventory-review-mocks';
import { mockEndpoint } from './fixtures/mock-routes';

async function goToInventoryTab(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[role="tablist"]', { state: 'visible' });

  // Select the container in the picker
  const picker = page.getByTestId('container-picker');
  if (await picker.isVisible()) {
    await picker.click();
    await page.getByTestId('container-option-550e8400-e29b-41d4-a716-446655440001').click();
  }

  // Click the Inventory tab
  await page.click('[role="tab"]:has-text("Inventory")');
  await page.waitForSelector('[data-testid="inventory-section"]', { state: 'visible' });
}

// ============================================================================
// Happy Path: Full Operator Review Walkthrough
// ============================================================================

test.describe('Inventory Review Drill-down', () => {
  test('operator can drill into a needs_review run and see timeline', async ({ mockedPage }) => {
    await setupReviewDrilldownMocks(mockedPage);
    await goToInventoryTab(mockedPage);

    // Step 1: Run list visible
    await expect(mockedPage.getByTestId('run-list')).toBeVisible();

    // Step 2: Click first run to open detail
    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();

    // Step 3: Verify drill-down loads
    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });

    // Step 4: Timeline is visible
    await expect(mockedPage.getByTestId('session-timeline')).toBeVisible();
  });

  test('detail view shows evidence panel and delta table', async ({ mockedPage }) => {
    await setupReviewDrilldownMocks(mockedPage);
    await goToInventoryTab(mockedPage);

    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();
    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });

    // Evidence panel
    await expect(mockedPage.getByTestId('evidence-panel')).toBeVisible();

    // Delta table with item count badge
    await expect(mockedPage.getByTestId('inventory-delta-table')).toBeVisible();
    await expect(mockedPage.getByTestId('delta-item-count')).toBeVisible();
    await expect(mockedPage.getByText('Coca-Cola 330ml')).toBeVisible();
  });

  test('operator can approve a run and see finalized state', async ({ mockedPage }) => {
    await setupReviewDrilldownMocks(mockedPage);
    await goToInventoryTab(mockedPage);

    // Navigate to detail
    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();
    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });

    // Approve button visible
    await expect(mockedPage.getByTestId('review-approve-btn')).toBeVisible();

    // Switch mock to approved state BEFORE clicking approve (refetch fires immediately)
    await switchToApprovedDelta(mockedPage);

    // Click Approve
    await mockedPage.getByTestId('review-approve-btn').click();

    // Should show audit trail after approval
    await expect(mockedPage.getByTestId('audit-trail')).toBeVisible({ timeout: 10000 });
  });

  test('debug info section is present and expandable', async ({ mockedPage }) => {
    await setupReviewDrilldownMocks(mockedPage);
    await goToInventoryTab(mockedPage);

    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();
    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });

    // Debug Info toggle should be visible
    await expect(mockedPage.getByTestId('debug-info')).toBeVisible();
    await expect(mockedPage.getByTestId('debug-info-toggle')).toBeVisible();

    // Click to expand
    await mockedPage.getByTestId('debug-info-toggle').click();

    // Verify metadata fields appear
    await expect(mockedPage.getByTestId('debug-copy-run-id')).toBeVisible();
    await expect(mockedPage.getByTestId('debug-copy-session-id')).toBeVisible();
    await expect(mockedPage.getByTestId('debug-copy-container-id')).toBeVisible();
  });

  test('session lookup navigates to detail with timeline', async ({ mockedPage }) => {
    await setupReviewDrilldownMocks(mockedPage);
    await goToInventoryTab(mockedPage);

    // Use session lookup
    await mockedPage.getByTestId('session-lookup-input').fill('sess-e2e-001');
    await mockedPage.getByTestId('session-lookup-submit').click();

    // Should show detail view with timeline
    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('session-timeline')).toBeVisible();
  });
});

// ============================================================================
// Failure UX
// ============================================================================

test.describe('Inventory Error States', () => {
  test('error run shows copy error button and re-run button', async ({ mockedPage }) => {
    await setupReviewDrilldownMocks(mockedPage);
    // Switch to error delta for session lookup
    await switchToErrorDelta(mockedPage);
    await goToInventoryTab(mockedPage);

    // Look up an error session
    await mockedPage.getByTestId('session-lookup-input').fill('sess-e2e-err');
    await mockedPage.getByTestId('session-lookup-submit').click();

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });

    // Error state actions
    await expect(mockedPage.getByTestId('copy-error-details')).toBeVisible();
    await expect(mockedPage.getByTestId('rerun-btn')).toBeVisible();

    // Timeline present in error state too
    await expect(mockedPage.getByTestId('session-timeline')).toBeVisible();
  });

  test('re-run button hides when endpoint returns 404', async ({ mockedPage }) => {
    await setupReviewDrilldownMocks(mockedPage);
    await switchToErrorDelta(mockedPage);

    // Override re-run to 404
    await mockedPage.unroute('**/api/v1/inventory/*/rerun');
    await mockEndpoint(mockedPage, '**/api/v1/inventory/*/rerun', {
      status: 404,
      error: true,
      errorMessage: 'Not found',
    });

    await goToInventoryTab(mockedPage);

    await mockedPage.getByTestId('session-lookup-input').fill('sess-e2e-err');
    await mockedPage.getByTestId('session-lookup-submit').click();

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('rerun-btn')).toBeVisible();

    // Click re-run — should hide the button and show unsupported message
    await mockedPage.getByTestId('rerun-btn').click();
    await expect(mockedPage.getByTestId('rerun-unsupported')).toBeVisible({ timeout: 10000 });
  });
});
