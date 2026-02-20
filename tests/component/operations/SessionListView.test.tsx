/**
 * SessionListView Component Tests
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Tests for the operations session list view with status filter tabs,
 * refresh functionality, and session selection.
 * V1 status values: active, complete, partial, failed (no "completed"/"cancelled").
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { SessionListView } from '@/presentation/components/operations/SessionListView';
import { ApiError } from '@/infrastructure/api/client';
import type { SessionWithStale } from '@/infrastructure/api/diagnostics-schemas';

// Mock the hooks
vi.mock('@/application/hooks/useSessions', () => ({
  useSessions: vi.fn(),
  useRefreshSessions: vi.fn(),
}));

// Mock SessionCard to isolate SessionListView behavior
vi.mock('@/presentation/components/diagnostics/SessionCard', () => ({
  SessionCard: ({
    session,
    onSelect,
  }: {
    session: { session_id: string };
    onSelect?: (id: string) => void;
  }) => (
    <div
      data-testid={`session-card-${session.session_id}`}
      onClick={() => onSelect?.(session.session_id)}
    >
      {session.session_id}
    </div>
  ),
}));

import {
  useSessions,
  useRefreshSessions,
} from '@/application/hooks/useSessions';

// Test fixtures (V1 format)
const mockSessions: SessionWithStale[] = [
  {
    session_id: 'sess-001',
    container_id: 'ctr-001',
    started_at: '2026-02-18T10:00:00Z',
    status: 'active',
    total_captures: 5,
    successful_captures: 5,
    failed_captures: 0,
    has_before_open: true,
    has_after_close: false,
    pair_complete: false,
    elapsed_seconds: 120,
    is_stale: false,
  },
  {
    session_id: 'sess-002',
    container_id: 'ctr-002',
    started_at: '2026-02-18T09:00:00Z',
    status: 'complete',
    total_captures: 12,
    successful_captures: 12,
    failed_captures: 0,
    has_before_open: true,
    has_after_close: true,
    pair_complete: true,
    elapsed_seconds: 1800,
    is_stale: false,
  },
  {
    session_id: 'sess-003',
    container_id: 'ctr-003',
    started_at: '2026-02-18T08:00:00Z',
    status: 'failed',
    total_captures: 2,
    successful_captures: 1,
    failed_captures: 1,
    has_before_open: true,
    has_after_close: false,
    pair_complete: false,
    elapsed_seconds: 300,
    is_stale: false,
  },
];

describe('SessionListView', () => {
  const mockOnSessionSelect = vi.fn();
  const mockRefetch = vi.fn();
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: successful state with sessions
    (useSessions as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockSessions,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: mockRefetch,
    });

    (useRefreshSessions as ReturnType<typeof vi.fn>).mockReturnValue({
      refresh: mockRefresh,
      isRefreshing: false,
    });
  });

  describe('loading state', () => {
    it('should show skeleton loaders when loading', () => {
      (useSessions as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        isFetching: true,
        refetch: mockRefetch,
      });

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(screen.getByTestId('session-list-loading')).toBeInTheDocument();
    });

    it('should not render session cards while loading', () => {
      (useSessions as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        isFetching: true,
        refetch: mockRefetch,
      });

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(
        screen.queryByTestId('session-card-sess-001')
      ).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error UI with retry button', () => {
      (useSessions as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
        refetch: mockRefetch,
      });

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(screen.getByTestId('session-list-error')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', async () => {
      const user = userEvent.setup();

      (useSessions as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
        refetch: mockRefetch,
      });

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should show graceful degradation UI on 404 error', () => {
      (useSessions as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new ApiError(404, 'Not found'),
        isFetching: false,
        refetch: mockRefetch,
      });

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(screen.getByTestId('session-list-unavailable')).toBeInTheDocument();
      expect(
        screen.getByText(/not available on this PiOrchestrator version/i)
      ).toBeInTheDocument();
      // Should NOT show the retry button for feature-unavailable errors
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should show graceful degradation UI on 503 error', () => {
      (useSessions as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new ApiError(503, 'Service unavailable'),
        isFetching: false,
        refetch: mockRefetch,
      });

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(screen.getByTestId('session-list-unavailable')).toBeInTheDocument();
    });

    it('should show actionable error with retry on 500 error', () => {
      (useSessions as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new ApiError(500, 'Internal server error'),
        isFetching: false,
        refetch: mockRefetch,
      });

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(screen.getByTestId('session-list-error')).toBeInTheDocument();
      expect(
        screen.getByText(/unable to load sessions/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty message when no sessions exist', () => {
      (useSessions as ReturnType<typeof vi.fn>).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(screen.getByTestId('session-list-empty')).toBeInTheDocument();
      expect(
        screen.getByText(/no sessions recorded yet/i)
      ).toBeInTheDocument();
    });
  });

  describe('successful render with sessions', () => {
    it('should render a SessionCard for each session', () => {
      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(screen.getByTestId('session-card-sess-001')).toBeInTheDocument();
      expect(screen.getByTestId('session-card-sess-002')).toBeInTheDocument();
      expect(screen.getByTestId('session-card-sess-003')).toBeInTheDocument();
    });

    it('should call useSessions with default status and limit', () => {
      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(useSessions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'all', limit: 20 })
      );
    });
  });

  describe('status filter tabs', () => {
    it('should render All, Active, Complete, Partial, and Failed tabs', () => {
      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /active/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /complete/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /partial/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /failed/i })
      ).toBeInTheDocument();
    });

    it('should call useSessions with status "failed" when Failed tab is clicked', async () => {
      const user = userEvent.setup();

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      await user.click(screen.getByRole('tab', { name: /failed/i }));

      // After clicking Failed tab, useSessions should be called with status: 'failed'
      expect(useSessions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', limit: 20 })
      );
    });

    it('should call useSessions with status "active" when Active tab is clicked', async () => {
      const user = userEvent.setup();

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      await user.click(screen.getByRole('tab', { name: /active/i }));

      expect(useSessions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active', limit: 20 })
      );
    });

    it('should call useSessions with status "complete" when Complete tab is clicked', async () => {
      const user = userEvent.setup();

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      await user.click(screen.getByRole('tab', { name: /complete/i }));

      expect(useSessions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'complete', limit: 20 })
      );
    });

    it('should call useSessions with status "partial" when Partial tab is clicked', async () => {
      const user = userEvent.setup();

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      await user.click(screen.getByRole('tab', { name: /partial/i }));

      expect(useSessions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'partial', limit: 20 })
      );
    });
  });

  describe('session selection', () => {
    it('should call onSessionSelect when a session card is clicked', async () => {
      const user = userEvent.setup();

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      await user.click(screen.getByTestId('session-card-sess-001'));

      expect(mockOnSessionSelect).toHaveBeenCalledWith('sess-001');
    });

    it('should call onSessionSelect with correct id for different sessions', async () => {
      const user = userEvent.setup();

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      await user.click(screen.getByTestId('session-card-sess-003'));

      expect(mockOnSessionSelect).toHaveBeenCalledWith('sess-003');
    });
  });

  describe('refresh functionality', () => {
    it('should call refresh when refresh button is clicked', async () => {
      const user = userEvent.setup();

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      await user.click(screen.getByTestId('session-refresh-btn'));

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should disable refresh button when refreshing', () => {
      (useRefreshSessions as ReturnType<typeof vi.fn>).mockReturnValue({
        refresh: mockRefresh,
        isRefreshing: true,
      });

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(screen.getByTestId('session-refresh-btn')).toBeDisabled();
    });

    it('should show spinning icon when refreshing', () => {
      (useRefreshSessions as ReturnType<typeof vi.fn>).mockReturnValue({
        refresh: mockRefresh,
        isRefreshing: true,
      });

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      const refreshBtn = screen.getByTestId('session-refresh-btn');
      const svg = refreshBtn.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });

    it('should show spinning icon when isFetching is true', () => {
      (useSessions as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockSessions,
        isLoading: false,
        isError: false,
        isFetching: true,
        refetch: mockRefetch,
      });

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      const refreshBtn = screen.getByTestId('session-refresh-btn');
      const svg = refreshBtn.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });
  });
});
