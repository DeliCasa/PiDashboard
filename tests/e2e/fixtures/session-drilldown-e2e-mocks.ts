/**
 * Session Drill-Down E2E Mock Fixtures
 * Feature: 056-session-drilldown-e2e (T001)
 *
 * Mock data for operational edge case E2E tests:
 * processing state, pending state, empty evidence, broken images, session not found.
 */

import type { Page } from '@playwright/test';
import { mockEndpoint, mockInventoryData, mockRunListData } from './mock-routes';
import { reviewContainerData } from './inventory-review-mocks';

// ============================================================================
// Mock Data Variants
// ============================================================================

/** Processing run with stale created_at (>6 min ago) to trigger stale warning */
const processingRun = {
  run_id: 'run-e2e-proc',
  session_id: 'sess-e2e-proc',
  container_id: '550e8400-e29b-41d4-a716-446655440001',
  status: 'processing' as const,
  items_before: null,
  items_after: null,
  delta: null,
  evidence: null,
  review: null,
  metadata: {
    provider: 'openai',
    created_at: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
  },
};

/** Pending run (freshly created) */
const pendingRun = {
  run_id: 'run-e2e-pend',
  session_id: 'sess-e2e-pend',
  container_id: '550e8400-e29b-41d4-a716-446655440001',
  status: 'pending' as const,
  items_before: null,
  items_after: null,
  delta: null,
  evidence: null,
  review: null,
  metadata: {
    provider: 'openai',
    created_at: new Date().toISOString(),
  },
};

/** Completed run with evidence object but no image URLs */
const emptyEvidenceRun = {
  ...mockInventoryData.needsReview,
  run_id: 'run-e2e-noev',
  session_id: 'sess-e2e-noev',
  evidence: {},
};

/** Completed run with broken image URLs */
const brokenImageRun = {
  ...mockInventoryData.needsReview,
  run_id: 'run-e2e-brk',
  session_id: 'sess-e2e-brk',
  evidence: {
    before_image_url: '/api/v1/evidence/broken-before.jpg',
    after_image_url: '/api/v1/evidence/broken-after.jpg',
  },
};

// ============================================================================
// Shared Setup Helpers
// ============================================================================

async function setupBaseContainerMocks(page: Page): Promise<void> {
  await page.unroute('**/api/v1/containers');
  await mockEndpoint(page, '**/api/v1/containers', {
    data: reviewContainerData,
  });

  await page.unroute('**/api/v1/containers/*/inventory/runs*');
  await mockEndpoint(page, '**/api/v1/containers/*/inventory/runs*', {
    data: {
      success: true,
      data: {
        runs: mockRunListData.runs,
        pagination: {
          total: mockRunListData.runs.length,
          limit: 20,
          offset: 0,
          has_more: false,
        },
      },
      timestamp: new Date().toISOString(),
      request_id: 'req-e2e-056-runs',
    },
  });
}

async function setupSessionDeltaMock(page: Page, data: unknown): Promise<void> {
  await page.unroute('**/api/v1/sessions/*/inventory-delta');
  await mockEndpoint(page, '**/api/v1/sessions/*/inventory-delta', {
    data: {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      request_id: 'req-e2e-056-delta',
    },
  });
}

// ============================================================================
// Per-Scenario Setup Functions
// ============================================================================

/**
 * Setup mocks for processing state with stale warning (>5 min old).
 */
export async function setupProcessingStateMocks(page: Page): Promise<void> {
  await setupBaseContainerMocks(page);
  await setupSessionDeltaMock(page, processingRun);
}

/**
 * Setup mocks for pending state (freshly created).
 */
export async function setupPendingStateMocks(page: Page): Promise<void> {
  await setupBaseContainerMocks(page);
  await setupSessionDeltaMock(page, pendingRun);
}

/**
 * Setup mocks for completed run with no evidence images.
 */
export async function setupEmptyEvidenceMocks(page: Page): Promise<void> {
  await setupBaseContainerMocks(page);
  await setupSessionDeltaMock(page, emptyEvidenceRun);
}

/**
 * Setup mocks for completed run with broken image URLs.
 * Also intercepts the broken image requests to return 404.
 */
export async function setupBrokenImageMocks(page: Page): Promise<void> {
  await setupBaseContainerMocks(page);
  await setupSessionDeltaMock(page, brokenImageRun);

  // Intercept the broken image URLs so they return 404
  await mockEndpoint(page, '**/api/v1/evidence/broken-*.jpg', {
    status: 404,
    error: true,
    errorMessage: 'Image not found',
  });
}

/**
 * Setup mocks for session-not-found (404 on session delta endpoint).
 */
export async function setupSessionNotFoundMocks(page: Page): Promise<void> {
  await setupBaseContainerMocks(page);

  await page.unroute('**/api/v1/sessions/*/inventory-delta');
  await mockEndpoint(page, '**/api/v1/sessions/*/inventory-delta', {
    status: 404,
    data: {
      success: false,
      error: { code: 'INVENTORY_NOT_FOUND', message: 'Not found' },
    },
  });
}
