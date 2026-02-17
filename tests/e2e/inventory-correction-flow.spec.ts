/**
 * Inventory Correction Flow E2E Tests
 * Feature: 053-delta-correction-flow (T031-T038)
 *
 * Comprehensive E2E tests covering the complete correction workflow:
 * - Full correction flow: view → edit → submit → verify audit trail (T032)
 * - Approve as-is flow (T033)
 * - Conflict (409) handling (T034)
 * - Zero-delta display (T035)
 * - Low-confidence banner (T036)
 * - Service unavailable (503) (T037)
 * - Pending state with polling indicator (T038)
 */

import { test, expect } from './fixtures/test-base';
import {
  mockEndpoint,
  mockInventory404,
  mockInventoryReviewSubmit,
  mockSessionDelta,
} from './fixtures/mock-routes';

// ============================================================================
// Test Fixtures & Setup Helpers (T031)
// ============================================================================

const CONTAINER_ID = '550e8400-e29b-41d4-a716-446655440001';

const containersWithInventory = {
  success: true,
  data: {
    containers: [
      {
        id: CONTAINER_ID,
        label: 'Kitchen Fridge',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cameras: [],
        camera_count: 0,
        online_count: 0,
      },
    ],
    total: 1,
  },
  correlation_id: 'test-correction-flow',
  timestamp: new Date().toISOString(),
};

/** Needs-review run with 2 delta items for correction testing */
const needsReviewRun = {
  run_id: 'run-correction-001',
  session_id: 'sess-correction-001',
  container_id: CONTAINER_ID,
  status: 'needs_review' as const,
  items_before: [
    { name: 'Coca-Cola 330ml', sku: 'CC330', quantity: 5, confidence: 0.95 },
    { name: 'Sprite 330ml', sku: 'SP330', quantity: 3, confidence: 0.88 },
  ],
  items_after: [
    { name: 'Coca-Cola 330ml', sku: 'CC330', quantity: 3, confidence: 0.92 },
    { name: 'Sprite 330ml', sku: 'SP330', quantity: 3, confidence: 0.90 },
  ],
  delta: [
    { name: 'Coca-Cola 330ml', sku: 'CC330', before_count: 5, after_count: 3, change: -2, confidence: 0.92, rationale: 'Two cans removed' },
    { name: 'Sprite 330ml', sku: 'SP330', before_count: 3, after_count: 3, change: 0, confidence: 0.90, rationale: 'No change' },
  ],
  evidence: {
    before_image_url: 'data:image/png;base64,iVBORw0KGgo=',
    after_image_url: 'data:image/png;base64,iVBORw0KGgo=',
  },
  review: null,
  metadata: { provider: 'openai', processing_time_ms: 4200, model_version: 'gpt-4o', created_at: '2026-02-09T11:59:00Z', completed_at: '2026-02-09T11:59:04Z' },
};

/** Corrected run (after review with corrections) */
const correctedRun = {
  ...needsReviewRun,
  run_id: 'run-correction-001',
  status: 'done' as const,
  review: {
    reviewer_id: 'operator-1',
    action: 'override' as const,
    corrections: [
      { name: 'Coca-Cola 330ml', sku: 'CC330', original_count: 3, corrected_count: 4 },
      { name: 'Fanta 330ml', sku: null, original_count: 0, corrected_count: 2, added: true },
      { name: 'Sprite 330ml', sku: 'SP330', original_count: 3, corrected_count: 0, removed: true },
    ],
    notes: 'Adjusted Coca-Cola count, added Fanta, removed Sprite',
    reviewed_at: '2026-02-09T12:05:00Z',
  },
};

/** Approved as-is run (after approve with no corrections) */
const approvedAsIsRun = {
  ...needsReviewRun,
  status: 'done' as const,
  review: {
    reviewer_id: 'operator-1',
    action: 'approve' as const,
    corrections: [],
    notes: '',
    reviewed_at: '2026-02-09T12:05:00Z',
  },
};

/** Low-confidence run — all items below 0.5 confidence */
const lowConfidenceRun = {
  ...needsReviewRun,
  run_id: 'run-lowconf-001',
  session_id: 'sess-lowconf-001',
  delta: [
    { name: 'Unknown Item A', before_count: 2, after_count: 1, change: -1, confidence: 0.3, rationale: 'Low confidence detection' },
    { name: 'Unknown Item B', before_count: 0, after_count: 1, change: 1, confidence: 0.2, rationale: 'Very low confidence' },
  ],
};

/** Zero-delta run — items exist but all changes are zero */
const zeroDeltaRun = {
  ...needsReviewRun,
  run_id: 'run-zerodelta-001',
  session_id: 'sess-zerodelta-001',
  status: 'done' as const,
  delta: [
    { name: 'Coca-Cola 330ml', sku: 'CC330', before_count: 5, after_count: 5, change: 0, confidence: 0.95 },
    { name: 'Sprite 330ml', sku: 'SP330', before_count: 3, after_count: 3, change: 0, confidence: 0.90 },
  ],
};

/** Pending run — analysis in progress */
const pendingRun = {
  run_id: 'run-pending-001',
  session_id: 'sess-pending-001',
  container_id: CONTAINER_ID,
  status: 'pending' as const,
  items_before: null,
  items_after: null,
  delta: null,
  evidence: null,
  review: null,
  metadata: { provider: 'openai', created_at: '2026-02-09T11:59:00Z' },
};

/** Run list with a single needs-review run */
function makeRunList(run: { run_id: string; session_id: string; container_id: string; status: string; metadata: Record<string, unknown> }) {
  return {
    success: true,
    data: {
      runs: [
        {
          run_id: run.run_id,
          session_id: run.session_id,
          container_id: run.container_id,
          status: run.status,
          delta_summary: { total_items: 2, items_changed: 1, items_added: 0, items_removed: 0 },
          metadata: run.metadata,
        },
      ],
      pagination: { total: 1, limit: 20, offset: 0, has_more: false },
    },
    timestamp: new Date().toISOString(),
  };
}

async function setupContainers(page: import('@playwright/test').Page) {
  await page.unroute('**/api/v1/containers');
  await mockEndpoint(page, '**/api/v1/containers', {
    data: containersWithInventory,
  });
}

async function setupRunList(page: import('@playwright/test').Page, run: Parameters<typeof makeRunList>[0]) {
  await page.unroute('**/api/v1/containers/*/inventory/runs*');
  await mockEndpoint(page, '**/api/v1/containers/*/inventory/runs*', {
    data: makeRunList(run),
  });
}

async function goToInventoryTab(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[role="tablist"]', { state: 'visible' });

  // Select container
  const picker = page.getByTestId('container-picker');
  if (await picker.isVisible()) {
    await picker.click();
    await page.getByTestId(`container-option-${CONTAINER_ID}`).click();
  }

  // Click Inventory tab
  await page.click('[role="tab"]:has-text("Inventory")');
  await page.waitForSelector('[data-testid="inventory-section"]', { state: 'visible' });
}

async function navigateToFirstRun(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('run-list')).toBeVisible();
  const firstItem = page.getByTestId('run-list-item-0');
  await firstItem.locator('button').first().click();
  await expect(page.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
}

// ============================================================================
// T032: Full Correction Workflow E2E
// ============================================================================

test.describe('Full Correction Workflow', () => {
  test('view → edit → change count → add item → remove item → notes → submit → verify audit trail', async ({ mockedPage }) => {
    // Setup mocks
    await setupContainers(mockedPage);
    await setupRunList(mockedPage, needsReviewRun);
    await mockSessionDelta(mockedPage, needsReviewRun);
    await mockInventory404(mockedPage);

    // Mock the POST review endpoint to return success
    await mockInventoryReviewSubmit(mockedPage, 200);

    await goToInventoryTab(mockedPage);
    await navigateToFirstRun(mockedPage);

    // Should see delta table with items
    await expect(mockedPage.getByTestId('inventory-delta-table')).toBeVisible();
    await expect(mockedPage.getByText('Coca-Cola 330ml')).toBeVisible();

    // Should see review actions (not yet in edit mode)
    await expect(mockedPage.getByTestId('review-actions')).toBeVisible();

    // Enter edit mode
    await mockedPage.getByTestId('review-edit-btn').click();
    await expect(mockedPage.getByTestId('review-edit-form')).toBeVisible();

    // Change count on first item (Coca-Cola)
    const countInput = mockedPage.getByTestId('edit-count-0');
    await countInput.clear();
    await countInput.fill('4');

    // Add a new item
    await mockedPage.getByTestId('review-add-item-btn').click();
    const newItemNameInput = mockedPage.getByTestId('edit-name-2');
    await expect(newItemNameInput).toBeVisible();
    await newItemNameInput.fill('Fanta 330ml');
    const newItemCountInput = mockedPage.getByTestId('edit-count-2');
    await newItemCountInput.clear();
    await newItemCountInput.fill('2');

    // Remove second item (Sprite)
    await mockedPage.getByTestId('edit-remove-1').click();

    // Add notes
    await mockedPage.getByTestId('review-notes').fill('Adjusted Coca-Cola count, added Fanta, removed Sprite');

    // Click submit
    await mockedPage.getByTestId('review-submit-btn').click();

    // Confirmation dialog should appear
    await expect(mockedPage.getByTestId('review-confirm-dialog')).toBeVisible();
    await expect(mockedPage.getByTestId('review-correction-summary')).toBeVisible();
    await expect(mockedPage.getByTestId('review-notes-preview')).toBeVisible();

    // Re-mock session delta to return corrected run after confirmation
    await mockSessionDelta(mockedPage, correctedRun);

    // Confirm the review
    await mockedPage.getByTestId('review-confirm-btn').click();

    // Should show audit trail after successful submission
    await expect(mockedPage.getByTestId('audit-trail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('audit-action')).toHaveText('Corrected');
    await expect(mockedPage.getByTestId('audit-corrections')).toBeVisible();
    await expect(mockedPage.getByTestId('audit-notes')).toBeVisible();
  });
});

// ============================================================================
// T033: Approve As-Is E2E
// ============================================================================

test.describe('Approve As-Is Flow', () => {
  test('view done delta → click approve → verify audit trail shows approval', async ({ mockedPage }) => {
    // Setup with needs-review run
    await setupContainers(mockedPage);
    await setupRunList(mockedPage, needsReviewRun);
    await mockSessionDelta(mockedPage, needsReviewRun);
    await mockInventoryReviewSubmit(mockedPage, 200);
    await mockInventory404(mockedPage);

    await goToInventoryTab(mockedPage);
    await navigateToFirstRun(mockedPage);

    // Should see review actions
    await expect(mockedPage.getByTestId('review-approve-btn')).toBeVisible();

    // Re-mock session delta BEFORE clicking approve to avoid race condition.
    // Approve fires POST immediately (no dialog), so the query invalidation
    // refetch must find the approved mock already in place.
    await mockSessionDelta(mockedPage, approvedAsIsRun);

    // Click Approve
    await mockedPage.getByTestId('review-approve-btn').click();

    // Should show audit trail with approval
    await expect(mockedPage.getByTestId('audit-trail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('audit-action')).toHaveText('Approved');
    await expect(mockedPage.getByTestId('audit-approved-note')).toBeVisible();
  });
});

// ============================================================================
// T034: Conflict (409) Handling E2E
// ============================================================================

test.describe('Conflict (409) Handling', () => {
  test('submit correction → 409 conflict → conflict UI → refresh re-enables review', async ({ mockedPage }) => {
    // Setup with needs-review run
    await setupContainers(mockedPage);
    await setupRunList(mockedPage, needsReviewRun);
    await mockSessionDelta(mockedPage, needsReviewRun);
    await mockInventory404(mockedPage);

    // Mock POST to return 409 conflict
    await mockInventoryReviewSubmit(mockedPage, 409);

    await goToInventoryTab(mockedPage);
    await navigateToFirstRun(mockedPage);

    // Enter edit mode
    await mockedPage.getByTestId('review-edit-btn').click();
    await expect(mockedPage.getByTestId('review-edit-form')).toBeVisible();

    // Change a count to create a correction
    const countInput = mockedPage.getByTestId('edit-count-0');
    await countInput.clear();
    await countInput.fill('10');

    // Submit
    await mockedPage.getByTestId('review-submit-btn').click();

    // Confirm dialog
    await expect(mockedPage.getByTestId('review-confirm-dialog')).toBeVisible();
    await mockedPage.getByTestId('review-confirm-btn').click();

    // Should show conflict UI
    await expect(mockedPage.getByTestId('review-conflict')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('review-refresh-btn')).toBeVisible();

    // Click refresh - re-mock for fresh data
    await mockSessionDelta(mockedPage, needsReviewRun);
    await mockedPage.getByTestId('review-refresh-btn').click();

    // Should show review actions again (re-review available)
    await expect(mockedPage.getByTestId('review-actions')).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// T035: Zero-Delta Display E2E
// ============================================================================

test.describe('Zero-Delta Display', () => {
  test('mock zero-delta run → navigate to detail → verify "No change" text visible', async ({ mockedPage }) => {
    // Setup with zero-delta run
    await setupContainers(mockedPage);
    await setupRunList(mockedPage, zeroDeltaRun);
    await mockSessionDelta(mockedPage, zeroDeltaRun);
    await mockInventory404(mockedPage);

    await goToInventoryTab(mockedPage);
    await navigateToFirstRun(mockedPage);

    // Should show delta table (not empty state — items exist with zero change)
    await expect(mockedPage.getByTestId('inventory-delta-table')).toBeVisible();

    // All rows should show "No change" text
    const noChangeTexts = mockedPage.getByText('No change');
    await expect(noChangeTexts).toHaveCount(2);
  });
});

// ============================================================================
// T036: Low-Confidence Banner E2E
// ============================================================================

test.describe('Low-Confidence Banner', () => {
  test('mock low-confidence run → navigate to detail → verify banner visible', async ({ mockedPage }) => {
    // Setup with low-confidence run
    await setupContainers(mockedPage);
    await setupRunList(mockedPage, lowConfidenceRun);
    await mockSessionDelta(mockedPage, lowConfidenceRun);
    await mockInventory404(mockedPage);

    await goToInventoryTab(mockedPage);
    await navigateToFirstRun(mockedPage);

    // Should show low-confidence banner
    await expect(mockedPage.getByTestId('low-confidence-banner')).toBeVisible();
    await expect(mockedPage.getByText('Low confidence in detection results')).toBeVisible();

    // Should still show the delta table with items
    await expect(mockedPage.getByTestId('inventory-delta-table')).toBeVisible();
  });
});

// ============================================================================
// T037: Service Unavailable (503) E2E
// ============================================================================

test.describe('Service Unavailable (503)', () => {
  test('mock 503 → navigate → verify unavailable message', async ({ mockedPage }) => {
    await setupContainers(mockedPage);

    // Mock inventory runs endpoint with 503
    await mockedPage.unroute('**/api/v1/containers/*/inventory/runs*');
    await mockEndpoint(mockedPage, '**/api/v1/containers/*/inventory/runs*', {
      status: 503,
      data: {
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable', retryable: true },
        timestamp: new Date().toISOString(),
      },
    });
    await mockInventory404(mockedPage);

    await goToInventoryTab(mockedPage);

    // Should show unavailable state
    await expect(mockedPage.getByTestId('run-list-unavailable')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByText('Inventory service temporarily unavailable')).toBeVisible();
  });
});

// ============================================================================
// T038: Pending State with Polling Indicator E2E
// ============================================================================

test.describe('Pending State Display', () => {
  test('mock pending run → navigate to detail → verify pending indicator visible', async ({ mockedPage }) => {
    // Setup with pending run
    await setupContainers(mockedPage);
    await setupRunList(mockedPage, pendingRun);
    await mockSessionDelta(mockedPage, pendingRun);
    await mockInventory404(mockedPage);

    await goToInventoryTab(mockedPage);
    await navigateToFirstRun(mockedPage);

    // Should show pending/processing state with spinner text
    await expect(mockedPage.getByText('Inventory analysis is being processed')).toBeVisible();

    // Should NOT show delta table or review form
    await expect(mockedPage.getByTestId('inventory-delta-table')).not.toBeVisible();
    await expect(mockedPage.getByTestId('review-actions')).not.toBeVisible();
  });
});
