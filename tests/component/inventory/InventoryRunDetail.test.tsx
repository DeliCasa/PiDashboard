/**
 * InventoryRunDetail Component Tests
 * Feature: 048-inventory-review (T013, T031)
 *
 * Tests loading state, error state, content rendering,
 * back button behavior, and container label display.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../../setup/test-utils';
import { InventoryRunDetail } from '@/presentation/components/inventory/InventoryRunDetail';
import {
  mockInventoryRunNeedsReview,
  mockInventoryRunPending,
  mockInventoryRunFailed,
  mockInventoryRunApproved,
} from '../../mocks/inventory-delta-fixtures';

// Mock the container hook
vi.mock('@/application/hooks/useContainers', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    useContainers: vi.fn(() => ({
      data: [
        {
          id: 'ctr-c1c2c3c4-e5f6-7890-abcd-ef1234567890',
          label: 'Kitchen Fridge',
          description: 'Main kitchen fridge',
          camera_count: 2,
          cameras: [],
        },
      ],
      isLoading: false,
    })),
  };
});

const BASE_URL = '/api';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function setupSessionHandler(data: unknown) {
  server.use(
    http.get(`${BASE_URL}/v1/sessions/:sessionId/inventory-delta`, () => {
      return HttpResponse.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    })
  );
}

describe('InventoryRunDetail', () => {
  it('shows loading skeleton initially', () => {
    // No handler = pending indefinitely
    server.use(
      http.get(`${BASE_URL}/v1/sessions/:sessionId/inventory-delta`, async () => {
        await new Promise(() => {}); // Never resolves
      })
    );

    renderWithProviders(
      <InventoryRunDetail sessionId="test-session-id" onBack={vi.fn()} />
    );

    expect(screen.getByTestId('run-detail-loading')).toBeInTheDocument();
    expect(screen.getByTestId('run-detail-back')).toBeInTheDocument();
  });

  it('renders delta table when run has delta', async () => {
    setupSessionHandler(mockInventoryRunNeedsReview);

    renderWithProviders(
      <InventoryRunDetail sessionId="test-session-id" onBack={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    });

    // Delta table should be rendered (from InventoryDeltaTable)
    expect(screen.getByText('Coca-Cola 330ml')).toBeInTheDocument();
  });

  it('renders review form when status is needs_review', async () => {
    setupSessionHandler(mockInventoryRunNeedsReview);

    renderWithProviders(
      <InventoryRunDetail sessionId="test-session-id" onBack={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    });

    // Should show review controls
    expect(screen.getByText(/Needs Review/)).toBeInTheDocument();
  });

  it('renders audit trail when run has review', async () => {
    setupSessionHandler(mockInventoryRunApproved);

    renderWithProviders(
      <InventoryRunDetail sessionId="test-session-id" onBack={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    });

    // Both CardDescription ("— Reviewed") and AuditTrail ("Reviewed:") match
    const reviewedElements = screen.getAllByText(/Reviewed/);
    expect(reviewedElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows pending state with spinner', async () => {
    setupSessionHandler(mockInventoryRunPending);

    renderWithProviders(
      <InventoryRunDetail sessionId="test-session-id" onBack={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    });

    expect(screen.getByText(/analysis is being processed/i)).toBeInTheDocument();
  });

  it('shows failed state with error message', async () => {
    setupSessionHandler(mockInventoryRunFailed);

    renderWithProviders(
      <InventoryRunDetail sessionId="test-session-id" onBack={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    });

    expect(screen.getByText('Inventory analysis failed')).toBeInTheDocument();
    expect(screen.getByText('Vision API timeout after 30s')).toBeInTheDocument();
  });

  it('shows error state with retry and back buttons on fetch failure', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/sessions/:sessionId/inventory-delta`, () => {
        return HttpResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
          { status: 500 }
        );
      })
    );

    renderWithProviders(
      <InventoryRunDetail sessionId="test-session-id" onBack={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('run-detail-error')).toBeInTheDocument();
    }, { timeout: 15_000 });

    expect(screen.getByText('Failed to load run details')).toBeInTheDocument();
    expect(screen.getByTestId('run-detail-back')).toBeInTheDocument();
  }, 20_000);

  it('calls onBack when back button is clicked', async () => {
    setupSessionHandler(mockInventoryRunNeedsReview);
    const onBack = vi.fn();

    renderWithProviders(
      <InventoryRunDetail sessionId="test-session-id" onBack={onBack} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('run-detail-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Container Label Display Tests (Feature 048 - T031)
// ============================================================================

describe('InventoryRunDetail container label', () => {
  it('shows container label as primary text with opaque ID as secondary', async () => {
    setupSessionHandler(mockInventoryRunNeedsReview);

    renderWithProviders(
      <InventoryRunDetail sessionId="test-session-id" onBack={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    });

    // Container label should be displayed
    expect(screen.getByTestId('container-label')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Fridge')).toBeInTheDocument();

    // Opaque container ID should be shown as secondary muted monospace
    const containerIdEl = screen.getByTestId('container-id');
    expect(containerIdEl).toBeInTheDocument();
    expect(containerIdEl.className).toContain('font-mono');
    expect(containerIdEl.className).toContain('text-muted-foreground');
  });

  it('shows "Unnamed Container" when container has no label', async () => {
    // Override the mock to return container without label
    const { useContainers } = await import('@/application/hooks/useContainers');
    vi.mocked(useContainers).mockReturnValue({
      data: [
        {
          id: 'ctr-c1c2c3c4-e5f6-7890-abcd-ef1234567890',
          description: '',
          camera_count: 0,
          cameras: [],
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useContainers>);

    setupSessionHandler(mockInventoryRunNeedsReview);

    renderWithProviders(
      <InventoryRunDetail sessionId="test-session-id" onBack={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    });

    expect(screen.getByText('Unnamed Container')).toBeInTheDocument();
  });

  it('truncates container ID in secondary display', async () => {
    setupSessionHandler(mockInventoryRunNeedsReview);

    renderWithProviders(
      <InventoryRunDetail sessionId="test-session-id" onBack={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    });

    // Container ID should be truncated (not showing full UUID)
    const containerIdEl = screen.getByTestId('container-id');
    expect(containerIdEl.textContent?.length).toBeLessThan(
      'ctr-c1c2c3c4-e5f6-7890-abcd-ef1234567890'.length
    );
  });
});
