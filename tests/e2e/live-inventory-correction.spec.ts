/**
 * Live Inventory Correction E2E Tests
 * Feature: 054-live-dashboard-inventory-validation
 *
 * Opt-in live tests that validate the inventory correction workflow against
 * a real BridgeServer deployment. Uses env-var gating and robust preflight
 * checks to produce deterministic SKIP when the backend is unavailable.
 *
 * Usage:
 *   LIVE_E2E=1 LIVE_BASE_URL=https://raspberrypi.tail345cd5.ts.net \
 *     PLAYWRIGHT_WORKERS=1 npx playwright test --project=live-inventory
 *
 * Optional:
 *   LIVE_TEST_CONTAINER_ID=<uuid>  — Target a specific container (data safety)
 */

import { test, expect } from '@playwright/test';
import { checkLiveBackend, type PreflightResult } from './fixtures/live-preflight';

// ============================================================================
// Environment & Preflight (T006)
// ============================================================================

const LIVE_E2E = process.env.LIVE_E2E === '1';
const LIVE_BASE_URL =
  process.env.LIVE_BASE_URL || 'https://raspberrypi.tail345cd5.ts.net';

let preflight: PreflightResult;

// ============================================================================
// Helpers
// ============================================================================

/** Navigate to the Inventory tab, selecting a container first if needed. */
async function navigateToInventory(
  page: import('@playwright/test').Page,
  containerId?: string,
) {
  await page.goto('/');
  await page.waitForSelector('[role="tablist"]', { state: 'visible', timeout: 15000 });

  // Select container if ID provided
  if (containerId) {
    const picker = page.getByTestId('container-picker');
    if (await picker.isVisible({ timeout: 5000 }).catch(() => false)) {
      await picker.click();
      const option = page.getByTestId(`container-option-${containerId}`);
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
      }
    }
  }

  // Click Inventory tab
  await page.click('[role="tab"]:has-text("Inventory")');
  await page.waitForSelector('[data-testid="inventory-section"]', {
    state: 'visible',
    timeout: 15000,
  });
}

// ============================================================================
// T013: Preflight Health Report (diagnostic — always runs when LIVE_E2E=1)
// T006-T010, T019: Live Correction Workflow Tests
// ============================================================================

test.describe('Live Inventory Correction Workflow', () => {
  // Gate 1: Skip entire suite if LIVE_E2E is not enabled (FR-005)
  test.beforeAll(() => {
    if (!LIVE_E2E) {
      test.skip();
    }
  });

  // Gate 2: Preflight check — skip with reason if backend is unavailable (FR-003, FR-004)
  test.beforeAll(async () => {
    if (!LIVE_E2E) return;
    preflight = await checkLiveBackend(LIVE_BASE_URL);
    if (!preflight.canRun) {
      test.skip();
    }
  });

  // T013: Preflight health diagnostic
  test('preflight: health report', async () => {
    test.skip(!LIVE_E2E, 'LIVE_E2E not enabled');

    const result = await checkLiveBackend(LIVE_BASE_URL);

    await test.step('Log preflight diagnostics', async () => {
      console.log('[Live Preflight] Base URL:', result.baseUrl);
      console.log('[Live Preflight] Can run:', result.canRun);
      console.log('[Live Preflight] Container count:', result.containerIds.length);
      console.log('[Live Preflight] Container IDs:', result.containerIds.join(', '));
      console.log('[Live Preflight] Reviewable container:', result.reviewableContainerId ?? 'none');
      if (result.skipReason) {
        console.log('[Live Preflight] Skip reason:', result.skipReason);
      }
    });

    test.skip(!result.canRun, result.skipReason ?? 'Preflight failed');

    expect(result.containerIds.length).toBeGreaterThan(0);
  });

  // T010: Inventory tab connectivity smoke (no mutation — always runs when preflight passes)
  test('live: inventory tab connectivity', async ({ page }) => {
    test.skip(!LIVE_E2E, 'LIVE_E2E not enabled');
    test.skip(!preflight?.canRun, preflight?.skipReason ?? 'Preflight failed');

    const containerId =
      process.env.LIVE_TEST_CONTAINER_ID ?? preflight.containerIds[0];

    await test.step('Navigate to Inventory tab', async () => {
      await navigateToInventory(page, containerId);
    });

    await test.step('Verify no error banners', async () => {
      // Check that no error alert is displayed
      const errorBanner = page.locator('[role="alert"]:has-text("error")');
      const hasError = await errorBanner.isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasError).toBe(false);
    });

    await test.step('Verify content loaded (not stuck spinner)', async () => {
      // Either run list, delta table, or empty state should be visible
      const content = page.locator(
        '[data-testid="run-list"], [data-testid="inventory-delta-table"], [data-testid="run-list-empty"]',
      );
      await expect(content.first()).toBeVisible({ timeout: 15000 });
    });

    await page.screenshot({ path: 'test-results/live-inventory-tab.png' });
  });

  // T007: View latest delta
  test('live: view latest delta', async ({ page }) => {
    test.skip(!LIVE_E2E, 'LIVE_E2E not enabled');
    test.skip(!preflight?.canRun, preflight?.skipReason ?? 'Preflight failed');

    const containerId =
      process.env.LIVE_TEST_CONTAINER_ID ?? preflight.containerIds[0];

    await test.step('Navigate to Inventory tab', async () => {
      await navigateToInventory(page, containerId);
    });

    await test.step('Open first run', async () => {
      const runList = page.getByTestId('run-list');
      await expect(runList).toBeVisible({ timeout: 15000 });

      const firstItem = page.getByTestId('run-list-item-0');
      await expect(firstItem).toBeVisible({ timeout: 10000 });
      await firstItem.locator('button').first().click();
      await expect(page.getByTestId('run-detail')).toBeVisible({ timeout: 15000 });
    });

    await test.step('Verify delta table renders', async () => {
      // Delta table OR pending/done state indicator should be visible
      const deltaTable = page.getByTestId('inventory-delta-table');
      const pendingText = page.getByText('Inventory analysis is being processed');
      const visible =
        (await deltaTable.isVisible({ timeout: 10000 }).catch(() => false)) ||
        (await pendingText.isVisible({ timeout: 2000 }).catch(() => false));
      expect(visible).toBe(true);
    });

    await test.step('Capture delta view screenshot', async () => {
      await page.screenshot({ path: 'test-results/live-delta-view.png' });
    });
  });

  // T008: Submit correction
  test('live: submit correction', async ({ page }) => {
    test.skip(!LIVE_E2E, 'LIVE_E2E not enabled');
    test.skip(!preflight?.canRun, preflight?.skipReason ?? 'Preflight failed');
    test.skip(
      !preflight?.reviewableContainerId,
      'No reviewable delta available — need a run with status needs_review and no existing review',
    );

    const containerId = preflight.reviewableContainerId!;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    await test.step('Navigate to reviewable delta', async () => {
      await navigateToInventory(page, containerId);

      // Open first run (which preflight confirmed is reviewable)
      const firstItem = page.getByTestId('run-list-item-0');
      await expect(firstItem).toBeVisible({ timeout: 15000 });
      await firstItem.locator('button').first().click();
      await expect(page.getByTestId('run-detail')).toBeVisible({ timeout: 15000 });
    });

    await test.step('Enter edit mode', async () => {
      const editBtn = page.getByTestId('review-edit-btn');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      await expect(page.getByTestId('review-edit-form')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Modify first item count', async () => {
      const countInput = page.getByTestId('edit-count-0');
      await expect(countInput).toBeVisible({ timeout: 5000 });
      const currentValue = await countInput.inputValue();
      const newValue = String(Number(currentValue || '0') + 1);
      await countInput.clear();
      await countInput.fill(newValue);
    });

    await test.step('Add validation note', async () => {
      const notes = page.getByTestId('review-notes');
      await notes.fill(`Live validation test correction — ${timestamp}`);
    });

    await page.screenshot({ path: 'test-results/live-correction-edit.png' });

    await test.step('Submit via confirmation dialog', async () => {
      await page.getByTestId('review-submit-btn').click();

      // Wait for confirmation dialog
      const confirmDialog = page.getByTestId('review-confirm-dialog');
      await expect(confirmDialog).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/live-correction-submit.png' });

      // Confirm
      await page.getByTestId('review-confirm-btn').click();
    });

    await test.step('Verify result (audit trail or conflict)', async () => {
      // Wait for either audit trail (success) or conflict UI (409)
      const auditTrail = page.getByTestId('audit-trail');
      const conflictUI = page.getByTestId('review-conflict');

      // Wait for either to appear
      await expect(
        page.locator('[data-testid="audit-trail"], [data-testid="review-conflict"]').first(),
      ).toBeVisible({ timeout: 20000 });

      if (await conflictUI.isVisible().catch(() => false)) {
        // 409 conflict — delta was already reviewed. Skip gracefully.
        await page.screenshot({ path: 'test-results/live-correction-conflict.png' });
        test.skip(true, 'Delta already reviewed — re-run with fresh data');
        return;
      }

      // Success path — verify audit trail
      await expect(auditTrail).toBeVisible();
      await expect(page.getByTestId('audit-action')).toBeVisible();

      await page.screenshot({ path: 'test-results/live-correction-audit.png' });
    });
  });

  // T009: Approve as-is
  test('live: approve as-is', async ({ page }) => {
    test.skip(!LIVE_E2E, 'LIVE_E2E not enabled');
    test.skip(!preflight?.canRun, preflight?.skipReason ?? 'Preflight failed');
    test.skip(
      !preflight?.reviewableContainerId,
      'No reviewable delta available — need a run with status needs_review and no existing review',
    );

    const containerId = preflight.reviewableContainerId!;

    await test.step('Navigate to reviewable delta', async () => {
      await navigateToInventory(page, containerId);

      const firstItem = page.getByTestId('run-list-item-0');
      await expect(firstItem).toBeVisible({ timeout: 15000 });
      await firstItem.locator('button').first().click();
      await expect(page.getByTestId('run-detail')).toBeVisible({ timeout: 15000 });
    });

    await test.step('Click Approve', async () => {
      const approveBtn = page.getByTestId('review-approve-btn');
      await expect(approveBtn).toBeVisible({ timeout: 10000 });
      await approveBtn.click();
    });

    await test.step('Verify result (audit trail or conflict)', async () => {
      const auditTrail = page.getByTestId('audit-trail');
      const conflictUI = page.getByTestId('review-conflict');

      await expect(
        page.locator('[data-testid="audit-trail"], [data-testid="review-conflict"]').first(),
      ).toBeVisible({ timeout: 20000 });

      if (await conflictUI.isVisible().catch(() => false)) {
        await page.screenshot({ path: 'test-results/live-approve-conflict.png' });
        test.skip(true, 'Delta already reviewed — re-run with fresh data');
        return;
      }

      await expect(auditTrail).toBeVisible();
      await expect(page.getByTestId('audit-action')).toBeVisible();

      await page.screenshot({ path: 'test-results/live-approve-audit.png' });
    });
  });

  // T019: No hidden errors (happy path clean check)
  test('live: no hidden errors', async ({ page }) => {
    test.skip(!LIVE_E2E, 'LIVE_E2E not enabled');
    test.skip(!preflight?.canRun, preflight?.skipReason ?? 'Preflight failed');

    const consoleErrors: string[] = [];

    // Known non-critical patterns to ignore
    const ignoredPatterns = [
      'ResizeObserver',
      'Download the React DevTools',
      'Failed to load resource',
      '[API Contract]',
      'Service Worker registration failed',
      'favicon.ico',
    ];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const isIgnored = ignoredPatterns.some((p) => text.includes(p));
        if (!isIgnored) {
          consoleErrors.push(text);
        }
      }
    });

    const containerId =
      process.env.LIVE_TEST_CONTAINER_ID ?? preflight.containerIds[0];

    await test.step('Navigate to Inventory tab', async () => {
      await navigateToInventory(page, containerId);
    });

    await test.step('Wait for content to load', async () => {
      // Verify loading state transitions to content (not stuck spinner)
      const content = page.locator(
        '[data-testid="run-list"], [data-testid="inventory-delta-table"], [data-testid="run-list-empty"]',
      );
      await expect(content.first()).toBeVisible({ timeout: 15000 });
    });

    await test.step('Verify no error banners', async () => {
      const errorBanner = page.locator('[role="alert"]:has-text("error")');
      const hasError = await errorBanner.isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasError).toBe(false);
    });

    await test.step('Check console for unexpected errors', async () => {
      // Small wait for any async errors to surface
      await page.waitForTimeout(2000);
      if (consoleErrors.length > 0) {
        console.log('[Live Error Check] Unexpected console errors:', consoleErrors);
      }
      expect(
        consoleErrors,
        `Unexpected console errors: ${consoleErrors.join('; ')}`,
      ).toHaveLength(0);
    });

    await page.screenshot({ path: 'test-results/live-no-errors.png' });
  });
});
