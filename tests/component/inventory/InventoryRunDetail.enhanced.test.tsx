/**
 * InventoryRunDetail Enhanced Tests
 * Feature: 055-session-review-drilldown (T021)
 *
 * Tests for timeline integration, copy error, re-run button,
 * stale analysis warning, and auth error banner.
 */

import { describe, it, expect, vi, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, createTestQueryClient } from '../../setup/test-utils';
import { InventoryRunDetail } from '@/presentation/components/inventory/InventoryRunDetail';
import {
  mockInventoryRunNeedsReview,
  mockInventoryRunFailed,
  mockInventoryRunProcessing,
  mockInventoryRunApproved,
} from '../../mocks/inventory-delta-fixtures';
import type { InventoryAnalysisRun } from '@/domain/types/inventory';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);

const BASE_URL = '/api';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  mockWriteText.mockClear();
});
afterAll(() => server.close());

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText },
    writable: true,
    configurable: true,
  });
});

function setupSessionDeltaHandler(run: InventoryAnalysisRun) {
  server.use(
    http.get(`${BASE_URL}/v1/sessions/:sessionId/inventory-delta`, () => {
      return HttpResponse.json({
        success: true,
        data: run,
        timestamp: new Date().toISOString(),
        request_id: 'req-test-123',
      });
    }),
    http.get(`${BASE_URL}/v1/containers`, () => {
      return HttpResponse.json({
        success: true,
        data: {
          containers: [
            { id: run.container_id, label: 'Test Container' },
          ],
        },
      });
    })
  );
}

function setupRerunHandler(status: number) {
  server.use(
    http.post(`${BASE_URL}/v1/inventory/:runId/rerun`, () => {
      if (status === 404) {
        return new HttpResponse(null, { status: 404 });
      }
      return HttpResponse.json(
        {
          success: true,
          data: { new_run_id: 'run-new-001', status: 'pending' },
        },
        { status }
      );
    })
  );
}

describe('InventoryRunDetail - Timeline Integration', () => {
  it('shows timeline for needs_review status', async () => {
    setupSessionDeltaHandler(mockInventoryRunNeedsReview);
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <InventoryRunDetail sessionId={mockInventoryRunNeedsReview.session_id} onBack={vi.fn()} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-timeline')).toBeInTheDocument();
    });
  });

  it('shows timeline for error status', async () => {
    setupSessionDeltaHandler(mockInventoryRunFailed);
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <InventoryRunDetail sessionId={mockInventoryRunFailed.session_id} onBack={vi.fn()} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-timeline')).toBeInTheDocument();
    });
  });

  it('shows timeline for processing status', async () => {
    setupSessionDeltaHandler(mockInventoryRunProcessing);
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <InventoryRunDetail sessionId={mockInventoryRunProcessing.session_id} onBack={vi.fn()} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-timeline')).toBeInTheDocument();
    });
  });
});

describe('InventoryRunDetail - Copy Error Details', () => {
  it('shows copy error button for error runs', async () => {
    setupSessionDeltaHandler(mockInventoryRunFailed);
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <InventoryRunDetail sessionId={mockInventoryRunFailed.session_id} onBack={vi.fn()} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('copy-error-details')).toBeInTheDocument();
    });
  });
});

describe('InventoryRunDetail - Re-run Button', () => {
  it('shows re-run button for error runs', async () => {
    setupSessionDeltaHandler(mockInventoryRunFailed);
    setupRerunHandler(200);
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <InventoryRunDetail sessionId={mockInventoryRunFailed.session_id} onBack={vi.fn()} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('rerun-btn')).toBeInTheDocument();
    });
  });
});

describe('InventoryRunDetail - Stale Analysis Warning', () => {
  it('shows stale warning for processing runs older than 5 minutes', async () => {
    const staleProcessingRun: InventoryAnalysisRun = {
      ...mockInventoryRunProcessing,
      metadata: {
        ...mockInventoryRunProcessing.metadata,
        created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      },
    };
    setupSessionDeltaHandler(staleProcessingRun);
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <InventoryRunDetail sessionId={staleProcessingRun.session_id} onBack={vi.fn()} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('stale-analysis-warning')).toBeInTheDocument();
    });
  });

  it('does not show stale warning for recent processing runs', async () => {
    const recentRun: InventoryAnalysisRun = {
      ...mockInventoryRunProcessing,
      metadata: {
        ...mockInventoryRunProcessing.metadata,
        created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      },
    };
    setupSessionDeltaHandler(recentRun);
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <InventoryRunDetail sessionId={recentRun.session_id} onBack={vi.fn()} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-timeline')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('stale-analysis-warning')).not.toBeInTheDocument();
  });
});

describe('InventoryRunDetail - Debug Info', () => {
  it('shows debug info for done runs', async () => {
    setupSessionDeltaHandler(mockInventoryRunNeedsReview);
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <InventoryRunDetail sessionId={mockInventoryRunNeedsReview.session_id} onBack={vi.fn()} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('debug-info')).toBeInTheDocument();
    });
  });

  it('shows debug info for error runs', async () => {
    setupSessionDeltaHandler(mockInventoryRunFailed);
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <InventoryRunDetail sessionId={mockInventoryRunFailed.session_id} onBack={vi.fn()} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('debug-info')).toBeInTheDocument();
    });
  });

  it('shows debug info for reviewed runs', async () => {
    setupSessionDeltaHandler(mockInventoryRunApproved);
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <InventoryRunDetail sessionId={mockInventoryRunApproved.session_id} onBack={vi.fn()} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('debug-info')).toBeInTheDocument();
    });
  });
});

describe('InventoryRunDetail - Empty Delta', () => {
  it('shows "No inventory changes detected" for reviewable empty delta', async () => {
    const emptyDeltaRun: InventoryAnalysisRun = {
      ...mockInventoryRunNeedsReview,
      delta: null,
    };
    setupSessionDeltaHandler(emptyDeltaRun);
    const queryClient = createTestQueryClient();
    renderWithProviders(
      <InventoryRunDetail sessionId={emptyDeltaRun.session_id} onBack={vi.fn()} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByTestId('delta-empty-reviewable')).toBeInTheDocument();
    });
    expect(screen.getByText('No inventory changes detected')).toBeInTheDocument();
  });
});
