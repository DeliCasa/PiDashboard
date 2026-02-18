/**
 * InventoryReviewForm Enhanced Tests
 * Feature: 055-session-review-drilldown (T014)
 *
 * Tests for empty delta approval path.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, createTestQueryClient } from '../../setup/test-utils';
import { InventoryReviewForm } from '@/presentation/components/inventory/InventoryReviewForm';
import type { InventoryAnalysisRun } from '@/domain/types/inventory';

const BASE_URL = '/api';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeNullDeltaRun(): InventoryAnalysisRun {
  return {
    run_id: 'run-null-delta-001',
    session_id: 'sess-null-delta-001',
    container_id: 'ctr-001',
    status: 'needs_review',
    items_before: null,
    items_after: null,
    delta: null,
    evidence: null,
    review: null,
    metadata: {
      provider: 'openai',
      created_at: '2026-02-18T10:00:00Z',
      completed_at: '2026-02-18T10:01:00Z',
    },
  };
}

function makeEmptyDeltaRun(): InventoryAnalysisRun {
  return {
    ...makeNullDeltaRun(),
    run_id: 'run-empty-delta-001',
    delta: [],
  };
}

function setupReviewHandler(status = 200) {
  server.use(
    http.post(`${BASE_URL}/v1/inventory/:runId/review`, () => {
      return HttpResponse.json(
        {
          success: true,
          data: {
            run_id: 'run-null-delta-001',
            status: 'done',
            review: {
              reviewer_id: 'operator-1',
              action: 'approve',
              corrections: [],
              notes: '',
              reviewed_at: '2026-02-18T12:05:00Z',
            },
          },
          timestamp: new Date().toISOString(),
        },
        { status }
      );
    })
  );
}

describe('InventoryReviewForm - Empty Delta', () => {
  it('renders review form when delta is null and status is needs_review', () => {
    const queryClient = createTestQueryClient();
    renderWithProviders(<InventoryReviewForm run={makeNullDeltaRun()} />, { queryClient });

    expect(screen.getByTestId('review-actions')).toBeInTheDocument();
    expect(screen.getByTestId('review-approve-btn')).toBeInTheDocument();
  });

  it('renders review form when delta is empty array and status is needs_review', () => {
    const queryClient = createTestQueryClient();
    renderWithProviders(<InventoryReviewForm run={makeEmptyDeltaRun()} />, { queryClient });

    expect(screen.getByTestId('review-actions')).toBeInTheDocument();
    expect(screen.getByTestId('review-approve-btn')).toBeInTheDocument();
  });

  it('approve button is clickable with null delta', async () => {
    setupReviewHandler();
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    renderWithProviders(<InventoryReviewForm run={makeNullDeltaRun()} />, { queryClient });

    const approveBtn = screen.getByTestId('review-approve-btn');
    expect(approveBtn).not.toBeDisabled();
    // Click approve — it calls the API directly (no confirm dialog for approve)
    await user.click(approveBtn);
  });
});
