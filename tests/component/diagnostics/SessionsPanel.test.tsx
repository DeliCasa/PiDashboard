/**
 * SessionsPanel Component Tests
 * Feature: 038-dev-observability-panels (T028)
 *
 * Tests for sessions panel with session listing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { SessionsPanel } from '@/presentation/components/diagnostics/SessionsPanel';
import * as useSessionsModule from '@/application/hooks/useSessions';
import type { SessionWithStale } from '@/infrastructure/api/diagnostics-schemas';

// Mock the hooks
vi.mock('@/application/hooks/useSessions', async () => {
  const actual = await vi.importActual('@/application/hooks/useSessions');
  return {
    ...actual,
    useSessions: vi.fn(),
    useRefreshSessions: vi.fn(() => ({
      refresh: vi.fn(),
      isRefreshing: false,
    })),
  };
});

// Test fixtures
const activeSessions: SessionWithStale[] = [
  {
    id: 'sess-12345',
    delivery_id: 'del-67890',
    started_at: '2026-01-25T14:00:00Z',
    status: 'active',
    capture_count: 5,
    last_capture_at: new Date(Date.now() - 60_000).toISOString(),
    is_stale: false,
  },
  {
    id: 'sess-23456',
    delivery_id: 'del-78901',
    started_at: '2026-01-25T13:00:00Z',
    status: 'active',
    capture_count: 3,
    last_capture_at: new Date(Date.now() - 10 * 60_000).toISOString(),
    is_stale: true,
  },
];

const mixedSessions: SessionWithStale[] = [
  ...activeSessions,
  {
    id: 'sess-stale-2',
    delivery_id: 'del-stale',
    started_at: '2026-01-25T12:00:00Z',
    status: 'active',
    capture_count: 1,
    last_capture_at: new Date(Date.now() - 15 * 60_000).toISOString(),
    is_stale: true,
  },
];

describe('SessionsPanel', () => {
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSessionsModule.useRefreshSessions).mockReturnValue({
      refresh: mockRefresh,
      isRefreshing: false,
    });
  });

  describe('loading state', () => {
    it('should show skeleton loaders when loading', () => {
      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: 0,
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      expect(screen.getByTestId('sessions-panel')).toBeInTheDocument();
      expect(screen.getByTestId('sessions-loading')).toBeInTheDocument();
    });
  });

  describe('successful data', () => {
    it('should display session cards', () => {
      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: activeSessions,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      expect(screen.getByTestId('session-card-sess-12345')).toBeInTheDocument();
      expect(screen.getByTestId('session-card-sess-23456')).toBeInTheDocument();
    });

    it('should show sessions count badge', () => {
      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: activeSessions,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      expect(screen.getByTestId('sessions-count')).toHaveTextContent('2');
    });

    it('should show stale sessions count badge when stale sessions exist', () => {
      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: mixedSessions,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      expect(screen.getByTestId('stale-sessions-count')).toHaveTextContent('2 stale');
    });

    it('should not show stale count badge when no stale sessions', () => {
      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: [activeSessions[0]], // Only non-stale session
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      expect(screen.queryByTestId('stale-sessions-count')).not.toBeInTheDocument();
    });

    it('should show last updated timestamp', () => {
      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: activeSessions,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      expect(screen.getByTestId('sessions-last-updated')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no sessions', () => {
      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      expect(screen.getByTestId('sessions-empty')).toBeInTheDocument();
      expect(screen.getByText('No active sessions')).toBeInTheDocument();
    });

    it('should show empty state when data is undefined (graceful degradation)', () => {
      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      expect(screen.getByTestId('sessions-empty')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error state on fetch error', () => {
      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: new Error('Failed to fetch'),
        refetch: vi.fn(),
        dataUpdatedAt: 0,
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      expect(screen.getByTestId('sessions-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch sessions')).toBeInTheDocument();
    });

    it('should call refetch when retry clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch,
        dataUpdatedAt: 0,
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      await user.click(screen.getByRole('button', { name: /Retry/i }));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('refresh functionality', () => {
    it('should call refresh when refresh button clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: activeSessions,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      await user.click(screen.getByTestId('refresh-sessions'));

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should disable refresh button when fetching', () => {
      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: activeSessions,
        isLoading: false,
        isFetching: true,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      expect(screen.getByTestId('refresh-sessions')).toBeDisabled();
    });
  });

  describe('session selection', () => {
    it('should call onSessionSelect when session card clicked', async () => {
      const user = userEvent.setup();
      const onSessionSelect = vi.fn();

      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: activeSessions,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel onSessionSelect={onSessionSelect} />);

      await user.click(screen.getByTestId('session-card-sess-12345'));

      expect(onSessionSelect).toHaveBeenCalledWith('sess-12345');
    });
  });

  describe('auto-refresh indicator', () => {
    it('should show auto-refresh message', () => {
      vi.mocked(useSessionsModule.useSessions).mockReturnValue({
        data: activeSessions,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useSessionsModule.useSessions>);

      render(<SessionsPanel />);

      expect(screen.getByText('Auto-refresh every 10 seconds')).toBeInTheDocument();
    });
  });
});
