/**
 * InventorySection Component Tests
 * Feature: 048-inventory-review (T014)
 *
 * Tests the list-detail layout: initially shows run list,
 * selecting a run shows detail view, back button returns to list.
 * Tests no container selected, container switch resets selection.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, createTestQueryClient } from '../../setup/test-utils';
import { InventorySection } from '@/presentation/components/inventory/InventorySection';
import {
  mockRunListItems,
  mockInventoryRunNeedsReview,
} from '../../mocks/inventory-delta-fixtures';

const BASE_URL = '/api';

// Mock the active container store
const mockActiveContainerId = vi.fn<() => string | null>(() => 'test-container-id');
vi.mock('@/application/stores/activeContainer', () => ({
  useActiveContainerId: () => mockActiveContainerId(),
}));

// MSW server
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  mockActiveContainerId.mockReturnValue('test-container-id');
});
afterAll(() => server.close());

function setupRunListHandler(runs = mockRunListItems, hasMore = true) {
  server.use(
    http.get(`${BASE_URL}/v1/containers/:containerId/inventory/runs`, () => {
      return HttpResponse.json({
        success: true,
        data: {
          runs,
          pagination: {
            total: runs.length,
            limit: 20,
            offset: 0,
            has_more: hasMore,
          },
        },
        timestamp: new Date().toISOString(),
      });
    })
  );
}

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

describe('InventorySection', () => {
  it('shows "Select a container" when no container selected', () => {
    mockActiveContainerId.mockReturnValue(null);

    renderWithProviders(<InventorySection />);

    expect(screen.getByTestId('inventory-no-container')).toBeInTheDocument();
    expect(screen.getByText(/Select a container/)).toBeInTheDocument();
  });

  it('has data-testid="inventory-section"', () => {
    mockActiveContainerId.mockReturnValue(null);

    renderWithProviders(<InventorySection />);

    expect(screen.getByTestId('inventory-section')).toBeInTheDocument();
  });

  it('shows run list when container is selected', async () => {
    setupRunListHandler();

    const queryClient = createTestQueryClient();
    renderWithProviders(<InventorySection />, { queryClient });

    await waitFor(() => {
      expect(screen.getByTestId('run-list')).toBeInTheDocument();
    });

    // Verify run list items are rendered
    expect(screen.getByTestId('run-list-item-0')).toBeInTheDocument();
  });

  it('shows loading state while fetching runs', () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/runs`, async () => {
        await new Promise(() => {}); // Never resolves
      })
    );

    const queryClient = createTestQueryClient();
    renderWithProviders(<InventorySection />, { queryClient });

    expect(screen.getByTestId('run-list-loading')).toBeInTheDocument();
  });

  it('shows empty state when no runs', async () => {
    setupRunListHandler([], false);

    const queryClient = createTestQueryClient();
    renderWithProviders(<InventorySection />, { queryClient });

    await waitFor(() => {
      expect(screen.getByTestId('run-list-empty')).toBeInTheDocument();
    });

    expect(screen.getByText('No inventory data available')).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/runs`, () => {
        return HttpResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
          { status: 500 }
        );
      })
    );

    const queryClient = createTestQueryClient();
    renderWithProviders(<InventorySection />, { queryClient });

    await waitFor(() => {
      expect(screen.getByTestId('run-list-error')).toBeInTheDocument();
    }, { timeout: 15_000 });

    expect(screen.getByText('Failed to load run list')).toBeInTheDocument();
  }, 20_000);

  it('shows unavailable state for 503', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/runs`, () => {
        return HttpResponse.json(
          { error: 'Service Unavailable' },
          { status: 503 }
        );
      })
    );

    const queryClient = createTestQueryClient();
    renderWithProviders(<InventorySection />, { queryClient });

    await waitFor(
      () => {
        expect(screen.getByTestId('run-list-unavailable')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('navigates to detail view when a run is selected', async () => {
    setupRunListHandler();
    // Set up session detail handler for when the detail view fetches
    setupSessionHandler(mockInventoryRunNeedsReview);

    const queryClient = createTestQueryClient();
    renderWithProviders(<InventorySection />, { queryClient });

    // Wait for list to load
    await waitFor(() => {
      expect(screen.getByTestId('run-list')).toBeInTheDocument();
    });

    // Click the navigation button inside the first run item
    const firstItem = screen.getByTestId('run-list-item-0');
    await userEvent.click(within(firstItem).getByRole('button', { name: /view/i }));

    // Should now show detail view
    await waitFor(() => {
      expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    });

    // Run list should no longer be visible
    expect(screen.queryByTestId('run-list')).not.toBeInTheDocument();
  });

  it('returns to list view when back button is clicked', async () => {
    setupRunListHandler();
    setupSessionHandler(mockInventoryRunNeedsReview);

    const queryClient = createTestQueryClient();
    renderWithProviders(<InventorySection />, { queryClient });

    // Wait for list to load
    await waitFor(() => {
      expect(screen.getByTestId('run-list')).toBeInTheDocument();
    });

    // Click the navigation button inside a run to go to detail view
    const item = screen.getByTestId('run-list-item-0');
    await userEvent.click(within(item).getByRole('button', { name: /view/i }));

    await waitFor(() => {
      expect(screen.getByTestId('run-detail')).toBeInTheDocument();
    });

    // Click back button
    await userEvent.click(screen.getByTestId('run-detail-back'));

    // Should be back to list view
    await waitFor(() => {
      expect(screen.getByTestId('run-list')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('run-detail')).not.toBeInTheDocument();
  });
});
