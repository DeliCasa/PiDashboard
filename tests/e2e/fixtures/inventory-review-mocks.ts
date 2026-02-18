/**
 * Inventory Review Drill-down E2E Mock Fixtures
 * Feature: 055-session-review-drilldown (T026)
 *
 * Mock data for the operator review walkthrough E2E test.
 */

import type { Page } from '@playwright/test';
import { mockEndpoint, mockInventoryData, mockRunListData } from './mock-routes';

/** Container data matching the inventory run's container_id */
export const reviewContainerData = {
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

/** Approved run returned after review submission */
export const approvedRun = {
  ...mockInventoryData.needsReview,
  status: 'done' as const,
  review: {
    reviewer_id: 'operator-1',
    action: 'approve' as const,
    corrections: [],
    notes: '',
    reviewed_at: new Date().toISOString(),
  },
};

/** Error run for failure UX testing */
export const errorRun = {
  run_id: 'run-e2e-err',
  session_id: 'sess-e2e-err',
  container_id: '550e8400-e29b-41d4-a716-446655440001',
  status: 'error' as const,
  items_before: null,
  items_after: null,
  delta: null,
  evidence: null,
  review: null,
  metadata: {
    provider: 'openai',
    error_message: 'Vision API timeout after 30s',
    created_at: '2026-02-18T10:00:00Z',
  },
};

/**
 * Set up all required mocks for the review drill-down E2E test.
 */
export async function setupReviewDrilldownMocks(page: Page): Promise<void> {
  // Override containers
  await page.unroute('**/api/v1/containers');
  await mockEndpoint(page, '**/api/v1/containers', {
    data: reviewContainerData,
  });

  // Override run list
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
      request_id: 'req-e2e-review-runs',
    },
  });

  // Override session delta → needs_review run
  await page.unroute('**/api/v1/sessions/*/inventory-delta');
  await mockEndpoint(page, '**/api/v1/sessions/*/inventory-delta', {
    data: {
      success: true,
      data: mockInventoryData.needsReview,
      timestamp: new Date().toISOString(),
      request_id: 'req-e2e-review-delta',
    },
  });

  // Mock inventory review submit → success
  await mockEndpoint(page, '**/api/v1/inventory/*/review', {
    data: {
      success: true,
      data: approvedRun,
      timestamp: new Date().toISOString(),
    },
  });

  // Mock re-run endpoint → success
  await mockEndpoint(page, '**/api/v1/inventory/*/rerun', {
    data: {
      success: true,
      data: { new_run_id: 'run-new-001', status: 'pending' },
    },
  });
}

/**
 * Switch the session delta mock to return approved data (post-review).
 */
export async function switchToApprovedDelta(page: Page): Promise<void> {
  await page.unroute('**/api/v1/sessions/*/inventory-delta');
  await mockEndpoint(page, '**/api/v1/sessions/*/inventory-delta', {
    data: {
      success: true,
      data: approvedRun,
      timestamp: new Date().toISOString(),
      request_id: 'req-e2e-approved',
    },
  });
}

/**
 * Switch the session delta mock to return error data.
 */
export async function switchToErrorDelta(page: Page): Promise<void> {
  await page.unroute('**/api/v1/sessions/*/inventory-delta');
  await mockEndpoint(page, '**/api/v1/sessions/*/inventory-delta', {
    data: {
      success: true,
      data: errorRun,
      timestamp: new Date().toISOString(),
      request_id: 'req-e2e-error',
    },
  });
}
