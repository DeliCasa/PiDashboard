/**
 * Inventory Delta Golden E2E Test
 * Feature: 052-delta-viewer-e2e (T023)
 *
 * Deterministic E2E test proving the full delta viewer flow renders correctly
 * against a golden fixture with categorized delta format.
 * Mock API with golden fixture, navigate to Inventory tab, select run,
 * verify delta table renders with exact item names + counts + change values + confidence badges.
 */

import { test, expect } from './fixtures/test-base';
import {
  mockEndpoint,
  mockInventory404,
} from './fixtures/mock-routes';

// Golden fixture: categorized delta (BridgeServer v2.0 format)
const goldenCategorizedRun = {
  run_id: 'run-golden-e2e-001',
  session_id: 'sess-golden-e2e-001',
  container_id: '550e8400-e29b-41d4-a716-446655440001',
  status: 'done' as const,
  items_before: [
    { name: 'Coca-Cola 330ml', sku: 'CC330', quantity: 5, confidence: 0.95 },
    { name: 'Sprite 330ml', sku: 'SP330', quantity: 3, confidence: 0.88 },
  ],
  items_after: [
    { name: 'Sprite 330ml', sku: 'SP330', quantity: 1, confidence: 0.90 },
    { name: 'Fanta 330ml', sku: 'FT330', quantity: 2, confidence: 0.88 },
  ],
  delta: {
    added: [
      { name: 'Fanta 330ml', qty: 2, confidence: 0.88, bbox: null },
    ],
    removed: [
      { name: 'Coca-Cola 330ml', qty: 2, confidence: 0.95, bbox: null },
    ],
    changed_qty: [
      { name: 'Sprite 330ml', from_qty: 3, to_qty: 1, confidence: 0.85 },
    ],
    unknown: [
      { note: 'Unidentified item near bottom shelf', confidence: 0.35 },
    ],
  },
  evidence: {
    before_image_url: 'data:image/png;base64,iVBORw0KGgo=',
    after_image_url: 'data:image/png;base64,iVBORw0KGgo=',
  },
  review: null,
  metadata: {
    provider: 'openai',
    processing_time_ms: 3800,
    model_version: 'gpt-4o-2024-08-06',
    created_at: '2026-02-09T12:00:00Z',
    completed_at: '2026-02-09T12:00:04Z',
  },
};

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
  correlation_id: 'test-golden',
  timestamp: new Date().toISOString(),
};

async function setupGoldenMocks(page: import('@playwright/test').Page) {
  // Containers
  await page.unroute('**/api/v1/containers');
  await mockEndpoint(page, '**/api/v1/containers', {
    data: containersWithInventory,
  });

  // Run list — golden fixture with single run
  await page.unroute('**/api/v1/containers/*/inventory/runs*');
  await mockEndpoint(page, '**/api/v1/containers/*/inventory/runs*', {
    data: {
      success: true,
      data: {
        runs: [
          {
            run_id: 'run-golden-e2e-001',
            session_id: 'sess-golden-e2e-001',
            container_id: '550e8400-e29b-41d4-a716-446655440001',
            status: 'done' as const,
            delta_summary: { total_items: 4, items_changed: 1, items_added: 1, items_removed: 1 },
            metadata: { provider: 'openai', processing_time_ms: 3800, model_version: 'gpt-4o-2024-08-06', created_at: '2026-02-09T12:00:00Z', completed_at: '2026-02-09T12:00:04Z' },
          },
        ],
        pagination: { total: 1, limit: 20, offset: 0, has_more: false },
      },
      timestamp: new Date().toISOString(),
    },
  });

  // Session delta returns golden categorized fixture
  await page.unroute('**/api/v1/sessions/*/inventory-delta');
  await mockEndpoint(page, '**/api/v1/sessions/*/inventory-delta', {
    data: {
      success: true,
      data: goldenCategorizedRun,
      timestamp: new Date().toISOString(),
    },
  });

  // Latest inventory 404 (not needed for this flow)
  await mockInventory404(page);
}

async function goToInventoryTab(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[role="tablist"]', { state: 'visible' });

  // Select container
  const picker = page.getByTestId('container-picker');
  if (await picker.isVisible()) {
    await picker.click();
    await page.getByTestId('container-option-550e8400-e29b-41d4-a716-446655440001').click();
  }

  // Click Inventory tab
  await page.click('[role="tab"]:has-text("Inventory")');
  await page.waitForSelector('[data-testid="inventory-section"]', { state: 'visible' });
}

// ============================================================================
// Golden E2E Test
// ============================================================================

test.describe('Inventory Delta Golden E2E', () => {
  test('categorized delta renders correctly through full flow', async ({ mockedPage }) => {
    await setupGoldenMocks(mockedPage);
    await goToInventoryTab(mockedPage);

    // Run list should be visible
    await expect(mockedPage.getByTestId('run-list')).toBeVisible();

    // Click first run to navigate to detail
    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();

    // Detail view should appear with delta table
    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('inventory-delta-table')).toBeVisible();

    // Verify all 4 categorized delta items are rendered (normalized to flat)
    // Added: Fanta 330ml
    await expect(mockedPage.getByText('Fanta 330ml')).toBeVisible();
    // Removed: Coca-Cola 330ml
    await expect(mockedPage.getByText('Coca-Cola 330ml')).toBeVisible();
    // Changed: Sprite 330ml
    await expect(mockedPage.getByText('Sprite 330ml')).toBeVisible();
    // Unknown: uses note as name
    await expect(mockedPage.getByText('Unidentified item near bottom shelf')).toBeVisible();

    // Verify confidence badges exist (4 items = 4 badges)
    const badges = mockedPage.locator('[data-testid^="confidence-badge-"]');
    await expect(badges).toHaveCount(4);

    // Verify correct number of delta rows
    const rows = mockedPage.locator('[data-testid^="delta-row-"]');
    await expect(rows).toHaveCount(4);
  });

  test('container label shows in detail view', async ({ mockedPage }) => {
    await setupGoldenMocks(mockedPage);
    await goToInventoryTab(mockedPage);

    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('container-label')).toHaveText('Kitchen Fridge');
  });

  test('back button returns to run list', async ({ mockedPage }) => {
    await setupGoldenMocks(mockedPage);
    await goToInventoryTab(mockedPage);

    const firstItem = mockedPage.getByTestId('run-list-item-0');
    await firstItem.locator('button').first().click();

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });

    // Click back
    await mockedPage.getByTestId('run-detail-back').click();

    // Should return to run list
    await expect(mockedPage.getByTestId('run-list')).toBeVisible();
  });
});
