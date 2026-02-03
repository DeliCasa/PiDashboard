/**
 * SessionCard Component Tests
 * Feature: 038-dev-observability-panels (T029)
 *
 * Tests for individual session card display.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { SessionCard } from '@/presentation/components/diagnostics/SessionCard';
import type { SessionWithStale } from '@/infrastructure/api/diagnostics-schemas';

// Test fixtures
const activeSessionRecent: SessionWithStale = {
  id: 'sess-12345',
  delivery_id: 'del-67890',
  started_at: '2026-01-25T14:00:00Z',
  status: 'active',
  capture_count: 5,
  last_capture_at: new Date(Date.now() - 60_000).toISOString(), // 1 minute ago
  is_stale: false,
};

const activeSessionStale: SessionWithStale = {
  id: 'sess-23456',
  delivery_id: 'del-78901',
  started_at: '2026-01-25T13:00:00Z',
  status: 'active',
  capture_count: 3,
  last_capture_at: new Date(Date.now() - 10 * 60_000).toISOString(), // 10 minutes ago
  is_stale: true,
};

const activeSessionNoCaptures: SessionWithStale = {
  id: 'sess-34567',
  delivery_id: 'del-89012',
  started_at: '2026-01-25T15:00:00Z',
  status: 'active',
  capture_count: 0,
  is_stale: false,
};

const completedSession: SessionWithStale = {
  id: 'sess-45678',
  delivery_id: 'del-90123',
  started_at: '2026-01-25T10:00:00Z',
  status: 'completed',
  capture_count: 12,
  last_capture_at: '2026-01-25T10:45:00Z',
  is_stale: false,
};

const cancelledSession: SessionWithStale = {
  id: 'sess-56789',
  delivery_id: 'del-01234',
  started_at: '2026-01-25T11:00:00Z',
  status: 'cancelled',
  capture_count: 2,
  last_capture_at: '2026-01-25T11:05:00Z',
  is_stale: false,
};

const sessionNoDelivery: SessionWithStale = {
  id: 'sess-67890',
  started_at: '2026-01-25T15:30:00Z',
  status: 'active',
  capture_count: 1,
  last_capture_at: new Date(Date.now() - 30_000).toISOString(),
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

    it('should display delivery ID when present', () => {
      render(<SessionCard session={activeSessionRecent} />);

      expect(screen.getByTestId('delivery-id')).toHaveTextContent('del-67890');
    });

    it('should not display delivery ID when not present', () => {
      render(<SessionCard session={sessionNoDelivery} />);

      expect(screen.queryByTestId('delivery-id')).not.toBeInTheDocument();
    });

    it('should display started at time', () => {
      render(<SessionCard session={activeSessionRecent} />);

      const startedAt = screen.getByTestId('started-at');
      expect(startedAt).toBeInTheDocument();
      expect(startedAt.textContent).toContain('Started:');
    });

    it('should display capture count', () => {
      render(<SessionCard session={activeSessionRecent} />);

      expect(screen.getByTestId('capture-count')).toHaveTextContent('5 captures');
    });

    it('should display singular capture when count is 1', () => {
      render(<SessionCard session={sessionNoDelivery} />);

      expect(screen.getByTestId('capture-count')).toHaveTextContent('1 capture');
    });

    it('should display zero captures', () => {
      render(<SessionCard session={activeSessionNoCaptures} />);

      expect(screen.getByTestId('capture-count')).toHaveTextContent('0 captures');
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

    it('should show Completed badge for completed session', () => {
      render(<SessionCard session={completedSession} />);

      expect(screen.getByTestId('session-status')).toHaveTextContent('Completed');
    });

    it('should show Cancelled badge for cancelled session', () => {
      render(<SessionCard session={cancelledSession} />);

      expect(screen.getByTestId('session-status')).toHaveTextContent('Cancelled');
    });
  });

  describe('last capture time', () => {
    it('should display last capture time when available', () => {
      render(<SessionCard session={activeSessionRecent} />);

      expect(screen.getByTestId('last-capture')).toBeInTheDocument();
    });

    it('should not display last capture time when no captures', () => {
      render(<SessionCard session={activeSessionNoCaptures} />);

      expect(screen.queryByTestId('last-capture')).not.toBeInTheDocument();
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

    it('should not show stale warning for completed session even if old', () => {
      const oldCompletedSession: SessionWithStale = {
        ...completedSession,
        is_stale: true, // Even if marked stale
      };
      render(<SessionCard session={oldCompletedSession} />);

      // Should not show stale warning for non-active sessions
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
