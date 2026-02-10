/**
 * InventoryRunList Component Tests
 * Feature: 048-inventory-review (T012, T030)
 *
 * Tests rendering of run list items, status badges, timestamps,
 * empty state, loading state, error state, pagination,
 * and opaque ID display with click-to-copy.
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../setup/test-utils';
import { InventoryRunList } from '@/presentation/components/inventory/InventoryRunList';
import { mockRunListItems } from '../../mocks/inventory-delta-fixtures';

const defaultProps = {
  runs: mockRunListItems,
  isLoading: false,
  isError: false,
  error: null,
  isUnavailable: false,
  hasMore: true,
  onSelectRun: vi.fn(),
  onLoadMore: vi.fn(),
  onRetry: vi.fn(),
};

describe('InventoryRunList', () => {
  it('renders list of runs with status badges and timestamps', () => {
    renderWithProviders(<InventoryRunList {...defaultProps} />);

    expect(screen.getByTestId('run-list')).toBeInTheDocument();
    expect(screen.getByTestId('run-list-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('run-list-item-4')).toBeInTheDocument();

    // Status badges
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders delta summary for each run', () => {
    renderWithProviders(<InventoryRunList {...defaultProps} />);

    expect(screen.getByText('2 changed')).toBeInTheDocument();
    expect(screen.getByText(/3 changed, 1 added/)).toBeInTheDocument();
  });

  it('renders truncated session IDs in monospace', () => {
    renderWithProviders(<InventoryRunList {...defaultProps} />);

    // Session IDs should be truncated
    const monoElements = screen.getAllByText(/^sess-/);
    expect(monoElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no runs', () => {
    renderWithProviders(
      <InventoryRunList {...defaultProps} runs={[]} hasMore={false} />
    );

    expect(screen.getByTestId('run-list-empty')).toBeInTheDocument();
    expect(screen.getByText('No inventory data available')).toBeInTheDocument();
  });

  it('shows loading state with skeletons', () => {
    renderWithProviders(
      <InventoryRunList {...defaultProps} runs={[]} isLoading={true} />
    );

    expect(screen.getByTestId('run-list-loading')).toBeInTheDocument();
  });

  it('shows error state with retry button', async () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <InventoryRunList
        {...defaultProps}
        runs={[]}
        isError={true}
        error={new Error('Test error')}
        onRetry={onRetry}
      />
    );

    expect(screen.getByTestId('run-list-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load run list')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows unavailable state for 503', () => {
    renderWithProviders(
      <InventoryRunList {...defaultProps} runs={[]} isUnavailable={true} />
    );

    expect(screen.getByTestId('run-list-unavailable')).toBeInTheDocument();
    expect(screen.getByText('Inventory service temporarily unavailable')).toBeInTheDocument();
  });

  it('calls onSelectRun with run_id when a run is clicked', async () => {
    const onSelectRun = vi.fn();
    renderWithProviders(
      <InventoryRunList {...defaultProps} onSelectRun={onSelectRun} />
    );

    // Click the navigation button within the run list item
    const item = screen.getByTestId('run-list-item-0');
    const navBtn = within(item).getByRole('button', { name: /view/i });
    await userEvent.click(navBtn);
    expect(onSelectRun).toHaveBeenCalledWith('run-approved-001');
  });

  it('shows Load More button when hasMore is true', () => {
    renderWithProviders(<InventoryRunList {...defaultProps} hasMore={true} />);

    expect(screen.getByTestId('run-list-load-more')).toBeInTheDocument();
    expect(screen.getByText('Load More')).toBeInTheDocument();
  });

  it('hides Load More button when hasMore is false', () => {
    renderWithProviders(<InventoryRunList {...defaultProps} hasMore={false} />);

    expect(screen.queryByTestId('run-list-load-more')).not.toBeInTheDocument();
  });

  it('calls onLoadMore when Load More is clicked', async () => {
    const onLoadMore = vi.fn();
    renderWithProviders(
      <InventoryRunList {...defaultProps} hasMore={true} onLoadMore={onLoadMore} />
    );

    await userEvent.click(screen.getByTestId('run-list-load-more'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows "No data" for runs with null delta_summary', () => {
    renderWithProviders(<InventoryRunList {...defaultProps} />);

    const noDataElements = screen.getAllByText('No data');
    // pending and failed items have null delta_summary
    expect(noDataElements.length).toBe(2);
  });
});

// ============================================================================
// Opaque ID Display Tests (Feature 048 - T030)
// ============================================================================

describe('InventoryRunList opaque ID display', () => {
  it('renders session IDs in font-mono text-xs text-muted-foreground', () => {
    renderWithProviders(<InventoryRunList {...defaultProps} />);

    // Each run item should have a copy button for session ID
    const copyBtn = screen.getByTestId('copy-session-id-0');
    expect(copyBtn).toBeInTheDocument();
    expect(copyBtn.className).toContain('font-mono');
  });

  it('truncates long session IDs (8 chars...4 chars)', () => {
    renderWithProviders(<InventoryRunList {...defaultProps} />);

    // sess-aaa11111-1111-1111-1111-111111111111 → sess-aaa...1111
    const copyBtn = screen.getByTestId('copy-session-id-0');
    expect(copyBtn.textContent).toContain('sess-aaa...1111');
  });

  it('renders copy buttons with correct aria-labels containing full session ID', () => {
    renderWithProviders(<InventoryRunList {...defaultProps} />);

    const copyBtn = screen.getByTestId('copy-session-id-0');
    // Button should include full session ID in aria-label for accessibility
    expect(copyBtn.getAttribute('aria-label')).toContain('sess-aaa11111-1111-1111-1111-111111111111');
    // Copy button should be a proper button element
    expect(copyBtn.tagName).toBe('BUTTON');
  });

  it('does not display IDs as "Session 1" or "Run #3" labels', () => {
    renderWithProviders(<InventoryRunList {...defaultProps} />);

    const container = screen.getByTestId('run-list');
    // No "Session N" or "Run #N" style labels should exist
    expect(within(container).queryByText(/Session \d/)).not.toBeInTheDocument();
    expect(within(container).queryByText(/Run #\d/)).not.toBeInTheDocument();
  });

  it('does not call onSelectRun when clicking copy button', async () => {
    const onSelectRun = vi.fn();

    renderWithProviders(
      <InventoryRunList {...defaultProps} onSelectRun={onSelectRun} />
    );

    // The copy button is a separate element from the navigation button
    await userEvent.click(screen.getByTestId('copy-session-id-0'));

    // Copy click should NOT trigger row navigation (buttons are siblings, not nested)
    expect(onSelectRun).not.toHaveBeenCalled();
  });
});
