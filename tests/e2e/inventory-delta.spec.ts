/**
 * Inventory E2E Tests
 * Features: 047-inventory-delta-viewer (T030), 048-inventory-review (T036)
 *
 * Tests the Inventory tab with run list, detail navigation,
 * session lookup, and review flows.
 */

import { test, expect } from './fixtures/test-base';
import {
  mockEndpoint,
  mockInventoryRunList,
  mockInventoryRunListEmpty,
  mockInventory404,
  mockInventoryReviewSubmit,
  mockSessionDelta,
  mockSessionDelta404,
  mockContainersResponses,
  mockInventoryData,
} from './fixtures/mock-routes';

const containersWithInventory = {
  success: true,
  data: {
    containers: [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
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
  correlation_id: 'test-containers',
  timestamp: new Date().toISOString(),
};

async function setupContainers(page: import('@playwright/test').Page) {
  // Unroute default empty containers mock registered in applyDefaultMocks
  await page.unroute('**/api/v1/containers');
  await mockEndpoint(page, '**/api/v1/containers', {
    data: containersWithInventory,
  });
}

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
// Run List Tests (Feature: 048-inventory-review)
// ============================================================================

test.describe('Inventory Run List', () => {
  test('shows Inventory tab in navigation', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockInventory404(mockedPage);
    await mockedPage.goto('/');
    await mockedPage.waitForSelector('[role="tablist"]', { state: 'visible' });

    const inventoryTab = mockedPage.locator('[role="tab"]:has-text("Inventory")');
    await expect(inventoryTab).toBeVisible();
  });

  test('shows "Select a container" when no container selected', async ({ mockedPage }) => {
    await mockEndpoint(mockedPage, '**/api/v1/containers', {
      data: mockContainersResponses.empty,
    });
    await mockInventory404(mockedPage);
    await mockedPage.goto('/');
    await mockedPage.waitForSelector('[role="tablist"]', { state: 'visible' });

    await mockedPage.click('[role="tab"]:has-text("Inventory")');

    await expect(mockedPage.getByTestId('inventory-no-container')).toBeVisible();
  });

  test('shows run list with items when container has runs', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    await expect(mockedPage.getByTestId('run-list')).toBeVisible();
    await expect(mockedPage.getByTestId('run-list-item-0')).toBeVisible();
  });

  test('shows empty state when no runs', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunListEmpty(mockedPage);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    await expect(mockedPage.getByTestId('run-list-empty')).toBeVisible();
    await expect(mockedPage.getByText('No inventory data available')).toBeVisible();
  });

  test('shows status badges for runs', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    await expect(mockedPage.getByTestId('run-list')).toBeVisible();
    await expect(mockedPage.getByText('Needs Review')).toBeVisible();
  });

  test('shows session lookup input', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    await expect(mockedPage.getByTestId('session-lookup')).toBeVisible();
    await expect(mockedPage.getByTestId('session-lookup-input')).toBeVisible();
  });
});

// ============================================================================
// Run Detail Navigation Tests (Feature: 048-inventory-review)
// ============================================================================

test.describe('Inventory Run Detail', () => {
  test('navigates to detail view when a run is clicked', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockSessionDelta(mockedPage, mockInventoryData.needsReview);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    // Wait for list
    await expect(mockedPage.getByTestId('run-list')).toBeVisible();

    // Click the first run's navigation button
    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();

    // Should show detail view
    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });

    // Run list should be gone
    await expect(mockedPage.getByTestId('run-list')).not.toBeVisible();
  });

  test('shows delta table in detail view', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockSessionDelta(mockedPage, mockInventoryData.needsReview);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    // Click first run
    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('inventory-delta-table')).toBeVisible();
    await expect(mockedPage.getByText('Coca-Cola 330ml')).toBeVisible();
  });

  test('shows evidence panel in detail view', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockSessionDelta(mockedPage, mockInventoryData.needsReview);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('evidence-panel')).toBeVisible();
  });

  test('returns to list view when back button is clicked', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockSessionDelta(mockedPage, mockInventoryData.needsReview);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    // Navigate to detail
    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });

    // Click back
    await mockedPage.getByTestId('run-detail-back').click();

    // Should be back to list
    await expect(mockedPage.getByTestId('run-list')).toBeVisible();
    await expect(mockedPage.getByTestId('run-detail')).not.toBeVisible();
  });

  test('shows container label in detail view', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockSessionDelta(mockedPage, mockInventoryData.needsReview);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('container-label')).toBeVisible();
    await expect(mockedPage.getByText('Kitchen Fridge')).toBeVisible();
  });
});

// ============================================================================
// Session Lookup Tests (Feature: 048-inventory-review)
// ============================================================================

test.describe('Inventory Session Lookup', () => {
  test('session lookup shows error for invalid ID', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockSessionDelta404(mockedPage);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    // Enter an invalid session ID
    await mockedPage.getByTestId('session-lookup-input').fill('invalid-session-id');
    await mockedPage.getByTestId('session-lookup-submit').click();

    // Should show error message
    await expect(mockedPage.getByTestId('session-lookup-error')).toBeVisible({ timeout: 10000 });
  });

  test('session lookup navigates to detail on success', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockSessionDelta(mockedPage, mockInventoryData.needsReview);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    // Enter a valid session ID
    await mockedPage.getByTestId('session-lookup-input').fill('sess-e2e-001');
    await mockedPage.getByTestId('session-lookup-submit').click();

    // Should navigate to detail view
    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// Review Flow Tests (Feature: 047 + 048)
// ============================================================================

test.describe('Inventory Review Flow', () => {
  test('approve flow works from detail view', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockSessionDelta(mockedPage, mockInventoryData.needsReview);
    await mockInventoryReviewSubmit(mockedPage);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    // Navigate to detail
    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('review-approve-btn')).toBeVisible();

    // Click Approve
    await mockedPage.getByTestId('review-approve-btn').click();

    // Re-mock as approved for the refetch
    await mockSessionDelta(mockedPage, mockInventoryData.approved);

    // Should eventually show the audit trail
    await expect(mockedPage.getByTestId('audit-trail')).toBeVisible({ timeout: 10000 });
  });

  test('edit mode works in detail view', async ({ mockedPage }) => {
    await setupContainers(mockedPage);
    await mockInventoryRunList(mockedPage);
    await mockSessionDelta(mockedPage, mockInventoryData.needsReview);
    await mockInventory404(mockedPage);
    await goToInventoryTab(mockedPage);

    // Navigate to detail
    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });

    // Click Edit & Correct
    await mockedPage.getByTestId('review-edit-btn').click();

    // Should show edit form
    await expect(mockedPage.getByTestId('review-edit-form')).toBeVisible();
    await expect(mockedPage.getByTestId('edit-row-0')).toBeVisible();

    // Cancel should return to review actions
    await mockedPage.getByTestId('review-cancel-btn').click();
    await expect(mockedPage.getByTestId('review-actions')).toBeVisible();
  });
});
