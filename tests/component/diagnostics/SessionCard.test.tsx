/**
 * SessionCard Component Tests
 * Feature: 038-dev-observability-panels (T029)
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Tests for individual session card display.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { SessionCard } from '@/presentation/components/diagnostics/SessionCard';
import type { SessionWithStale } from '@/infrastructure/api/diagnostics-schemas';

// Test fixtures (V1 format)
const activeSessionRecent: SessionWithStale = {
  session_id: 'sess-12345',
  container_id: 'ctr-67890',
  started_at: '2026-01-25T14:00:00Z',
  status: 'active',
  total_captures: 5,
  successful_captures: 4,
  failed_captures: 1,
  has_before_open: true,
  has_after_close: false,
  pair_complete: false,
  elapsed_seconds: 60,
  is_stale: false,
};

const activeSessionStale: SessionWithStale = {
  session_id: 'sess-23456',
  container_id: 'ctr-78901',
  started_at: '2026-01-25T13:00:00Z',
  status: 'active',
  total_captures: 3,
  successful_captures: 2,
  failed_captures: 1,
  has_before_open: true,
  has_after_close: false,
  pair_complete: false,
  elapsed_seconds: 600, // > 300 = stale
  is_stale: true,
};

const activeSessionNoCaptures: SessionWithStale = {
  session_id: 'sess-34567',
  container_id: 'ctr-89012',
  started_at: '2026-01-25T15:00:00Z',
  status: 'active',
  total_captures: 0,
  successful_captures: 0,
  failed_captures: 0,
  has_before_open: false,
  has_after_close: false,
  pair_complete: false,
  elapsed_seconds: 30,
  is_stale: false,
};

const completeSession: SessionWithStale = {
  session_id: 'sess-45678',
  container_id: 'ctr-90123',
  started_at: '2026-01-25T10:00:00Z',
  status: 'complete',
  total_captures: 12,
  successful_captures: 12,
  failed_captures: 0,
  has_before_open: true,
  has_after_close: true,
  pair_complete: true,
  elapsed_seconds: 2700,
  is_stale: false,
};

const failedSession: SessionWithStale = {
  session_id: 'sess-56789',
  container_id: 'ctr-01234',
  started_at: '2026-01-25T11:00:00Z',
  status: 'failed',
  total_captures: 2,
  successful_captures: 1,
  failed_captures: 1,
  has_before_open: true,
  has_after_close: false,
  pair_complete: false,
  elapsed_seconds: 300,
  is_stale: false,
};

const sessionNoContainer: SessionWithStale = {
  session_id: 'sess-67890',
  container_id: '',
  started_at: '2026-01-25T15:30:00Z',
  status: 'active',
  total_captures: 1,
  successful_captures: 1,
  failed_captures: 0,
  has_before_open: true,
  has_after_close: false,
  pair_complete: false,
  elapsed_seconds: 30,
  is_stale: false,
};

describe('SessionCard', () => {
  describe('rendering', () => {
    it('should display session ID', () => {
      render(<SessionCard session={activeSessionRecent} />);

      expect(screen.getByTestId('session-id')).toHaveTextContent('sess-12345');
    });

    it('should have data-testid with session ID', () => {
      render(<SessionCard session={activeSessionRecent} />);

      expect(screen.getByTestId('session-card-sess-12345')).toBeInTheDocument();
    });

    it('should display container ID with copy button when present', () => {
      render(<SessionCard session={activeSessionRecent} />);

      expect(screen.getByTestId('session-card-correlation')).toHaveTextContent('ctr-67890');
      expect(screen.getByLabelText('Copy correlation ID')).toBeInTheDocument();
    });

    it('should not display container ID when not present', () => {
      render(<SessionCard session={sessionNoContainer} />);

      expect(screen.queryByTestId('session-card-correlation')).not.toBeInTheDocument();
    });

    it('should display started at time', () => {
      render(<SessionCard session={activeSessionRecent} />);

      const startedAt = screen.getByTestId('started-at');
      expect(startedAt).toBeInTheDocument();
      expect(startedAt.textContent).toContain('Started:');
    });

    it('should display capture count as successful/total', () => {
      render(<SessionCard session={activeSessionRecent} />);

      expect(screen.getByTestId('capture-count')).toHaveTextContent('4/5 captures');
    });

    it('should display singular capture when total is 1', () => {
      render(<SessionCard session={sessionNoContainer} />);

      expect(screen.getByTestId('capture-count')).toHaveTextContent('1/1 capture');
    });

    it('should display zero captures', () => {
      render(<SessionCard session={activeSessionNoCaptures} />);

      expect(screen.getByTestId('capture-count')).toHaveTextContent('0/0 captures');
    });

    it('should display elapsed duration', () => {
      render(<SessionCard session={activeSessionRecent} />);

      expect(screen.getByTestId('elapsed-duration')).toHaveTextContent('1m');
    });

    it('should display elapsed duration in hours for long sessions', () => {
      render(<SessionCard session={completeSession} />);

      expect(screen.getByTestId('elapsed-duration')).toHaveTextContent('45m');
    });
  });

  describe('status badge', () => {
    it('should show Active badge for active session', () => {
      render(<SessionCard session={activeSessionRecent} />);

      expect(screen.getByTestId('session-status')).toHaveTextContent('Active');
    });

    it('should show Stale badge for stale active session', () => {
      render(<SessionCard session={activeSessionStale} />);

      expect(screen.getByTestId('session-status')).toHaveTextContent('Stale');
    });

    it('should show Complete badge for complete session', () => {
      render(<SessionCard session={completeSession} />);

      expect(screen.getByTestId('session-status')).toHaveTextContent('Complete');
    });

    it('should show Failed badge for failed session', () => {
      render(<SessionCard session={failedSession} />);

      expect(screen.getByTestId('session-status')).toHaveTextContent('Failed');
    });
  });

  describe('pair complete badge', () => {
    it('should show Paired badge when pair_complete is true', () => {
      render(<SessionCard session={completeSession} />);

      expect(screen.getByTestId('pair-complete-badge')).toBeInTheDocument();
      expect(screen.getByTestId('pair-complete-badge')).toHaveTextContent('Paired');
    });

    it('should not show Paired badge when pair_complete is false', () => {
      render(<SessionCard session={activeSessionRecent} />);

      expect(screen.queryByTestId('pair-complete-badge')).not.toBeInTheDocument();
    });
  });

  describe('stale warning', () => {
    it('should show stale warning for stale active session', () => {
      render(<SessionCard session={activeSessionStale} />);

      expect(screen.getByTestId('stale-warning')).toBeInTheDocument();
      expect(screen.getByTestId('stale-warning')).toHaveTextContent(
        'No capture in >5 minutes'
      );
    });

    it('should not show stale warning for non-stale session', () => {
      render(<SessionCard session={activeSessionRecent} />);

      expect(screen.queryByTestId('stale-warning')).not.toBeInTheDocument();
    });

    it('should not show stale warning for completed session even if marked stale', () => {
      const oldCompletedSession: SessionWithStale = {
        ...completeSession,
        is_stale: true,
      };
      render(<SessionCard session={oldCompletedSession} />);

      expect(screen.queryByTestId('stale-warning')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have yellow border for stale active session', () => {
      render(<SessionCard session={activeSessionStale} />);

      const card = screen.getByTestId('session-card-sess-23456');
      expect(card).toHaveClass('border-yellow-500/50');
    });

    it('should not have yellow border for non-stale session', () => {
      render(<SessionCard session={activeSessionRecent} />);

      const card = screen.getByTestId('session-card-sess-12345');
      expect(card).not.toHaveClass('border-yellow-500/50');
    });
  });

  describe('click interaction', () => {
    it('should call onSelect when clicked', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<SessionCard session={activeSessionRecent} onSelect={onSelect} />);

      await user.click(screen.getByTestId('session-card-sess-12345'));

      expect(onSelect).toHaveBeenCalledWith('sess-12345');
    });

    it('should have cursor-pointer when onSelect is provided', () => {
      const onSelect = vi.fn();

      render(<SessionCard session={activeSessionRecent} onSelect={onSelect} />);

      const card = screen.getByTestId('session-card-sess-12345');
      expect(card).toHaveClass('cursor-pointer');
    });

    it('should not have cursor-pointer when onSelect is not provided', () => {
      render(<SessionCard session={activeSessionRecent} />);

      const card = screen.getByTestId('session-card-sess-12345');
      expect(card).not.toHaveClass('cursor-pointer');
    });
  });
});
