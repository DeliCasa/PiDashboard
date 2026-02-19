/**
 * SessionListView Component Tests
 *
 * Tests for the operations session list view with status filter tabs,
 * refresh functionality, and session selection.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { SessionListView } from '@/presentation/components/operations/SessionListView';
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
    session: { id: string };
    onSelect?: (id: string) => void;
  }) => (
    <div
      data-testid={`session-card-${session.id}`}
      onClick={() => onSelect?.(session.id)}
    >
      {session.id}
    </div>
  ),
}));

import {
  useSessions,
  useRefreshSessions,
} from '@/application/hooks/useSessions';

// Test fixtures
const mockSessions: SessionWithStale[] = [
  {
    id: 'sess-001',
    started_at: '2026-02-18T10:00:00Z',
    status: 'active',
    capture_count: 5,
    is_stale: false,
  },
  {
    id: 'sess-002',
    delivery_id: 'del-002',
    started_at: '2026-02-18T09:00:00Z',
    status: 'completed',
    capture_count: 12,
    is_stale: false,
  },
  {
    id: 'sess-003',
    started_at: '2026-02-18T08:00:00Z',
    status: 'cancelled',
    capture_count: 2,
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
    it('should render All, Active, Completed, and Failed tabs', () => {
      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /active/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /completed/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /failed/i })
      ).toBeInTheDocument();
    });

    it('should call useSessions with status "cancelled" when Failed tab is clicked', async () => {
      const user = userEvent.setup();

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      await user.click(screen.getByRole('tab', { name: /failed/i }));

      // After clicking Failed tab, useSessions should be called with status: 'cancelled'
      expect(useSessions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled', limit: 20 })
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

    it('should call useSessions with status "completed" when Completed tab is clicked', async () => {
      const user = userEvent.setup();

      render(<SessionListView onSessionSelect={mockOnSessionSelect} />);

      await user.click(screen.getByRole('tab', { name: /completed/i }));

      expect(useSessions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed', limit: 20 })
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
