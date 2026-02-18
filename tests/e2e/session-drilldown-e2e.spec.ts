/**
 * Session Drill-Down E2E — Operational Edge Cases
 * Feature: 056-session-drilldown-e2e (T006)
 *
 * Validates edge-case UX paths that operators encounter:
 * broken images, empty evidence, processing stale, pending state, session not found.
 */

import { test, expect } from './fixtures/test-base';
import {
  setupBrokenImageMocks,
  setupEmptyEvidenceMocks,
  setupProcessingStateMocks,
  setupPendingStateMocks,
  setupSessionNotFoundMocks,
} from './fixtures/session-drilldown-e2e-mocks';

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

async function drillIntoFirstRun(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('run-list')).toBeVisible();
  const firstItem = page.getByTestId('run-list-item-0');
  await firstItem.locator('button').first().click();
}

// ============================================================================
// Image Load Failure
// ============================================================================

test.describe('Session Drill-Down Edge Cases', () => {
  test('broken evidence images show error placeholders', async ({ mockedPage }) => {
    await setupBrokenImageMocks(mockedPage);
    await goToInventoryTab(mockedPage);
    await drillIntoFirstRun(mockedPage);

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('evidence-panel')).toBeVisible();

    // Images fail to load → error placeholders appear
    await expect(mockedPage.getByTestId('evidence-before-error')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('evidence-after-error')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('evidence-before-error')).toContainText('Image unavailable');
  });

  // ============================================================================
  // Empty Evidence State
  // ============================================================================

  test('empty evidence shows next-action guidance', async ({ mockedPage }) => {
    await setupEmptyEvidenceMocks(mockedPage);
    await goToInventoryTab(mockedPage);
    await drillIntoFirstRun(mockedPage);

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('evidence-no-images')).toBeVisible();
    await expect(mockedPage.getByTestId('evidence-no-images')).toContainText(
      'Check if the camera was online during this session'
    );
  });

  // ============================================================================
  // Processing State — Stale Warning
  // ============================================================================

  test('processing state shows stale analysis warning', async ({ mockedPage }) => {
    await setupProcessingStateMocks(mockedPage);
    await goToInventoryTab(mockedPage);
    await drillIntoFirstRun(mockedPage);

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });

    // Stale warning appears (processing started > 5 min ago)
    await expect(mockedPage.getByTestId('stale-analysis-warning')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('stale-analysis-warning')).toContainText(
      'Analysis may be stuck'
    );
  });

  // ============================================================================
  // Pending State
  // ============================================================================

  test('pending state shows processing indicator', async ({ mockedPage }) => {
    await setupPendingStateMocks(mockedPage);
    await goToInventoryTab(mockedPage);
    await drillIntoFirstRun(mockedPage);

    await expect(mockedPage.getByTestId('run-detail')).toBeVisible({ timeout: 10000 });

    // Pending runs show analysis-in-progress content
    await expect(mockedPage.getByText('Analysis In Progress')).toBeVisible();
    await expect(mockedPage.getByTestId('session-timeline')).toBeVisible();
  });

  // ============================================================================
  // Session Not Found
  // ============================================================================

  test('session not found shows distinct not-found view', async ({ mockedPage }) => {
    await setupSessionNotFoundMocks(mockedPage);
    await goToInventoryTab(mockedPage);
    await drillIntoFirstRun(mockedPage);

    // Session delta returns 404 → API client returns null → not-found view
    await expect(mockedPage.getByTestId('run-detail-not-found')).toBeVisible({ timeout: 10000 });
    await expect(mockedPage.getByTestId('run-detail-not-found')).toContainText(
      'No analysis found for this session'
    );
  });
});
