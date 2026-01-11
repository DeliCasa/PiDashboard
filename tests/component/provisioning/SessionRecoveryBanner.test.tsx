/**
 * SessionRecoveryBanner Component Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T040
 *
 * Tests for the session recovery banner component including:
 * - Rendering with different session states
 * - Resume and discard actions
 * - Loading states
 * - Dismiss functionality
 * - Multiple sessions indicator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionRecoveryBanner } from '@/presentation/components/provisioning/SessionRecoveryBanner';
import type { BatchProvisioningSession } from '@/domain/types/provisioning';

// ============================================================================
// Test Setup
// ============================================================================

const mockSession1: BatchProvisioningSession = {
  id: 'sess_001',
  state: 'active',
  target_ssid: 'TargetNetwork1',
  created_at: '2026-01-10T10:00:00Z',
  updated_at: '2026-01-11T14:30:00Z', // Recent
  device_count: 5,
  provisioned_count: 3,
  verified_count: 2,
  failed_count: 0,
};

const mockSession2: BatchProvisioningSession = {
  id: 'sess_002',
  state: 'paused',
  target_ssid: 'TargetNetwork2',
  created_at: '2026-01-10T09:00:00Z',
  updated_at: '2026-01-10T11:00:00Z',
  device_count: 3,
  provisioned_count: 1,
  verified_count: 0,
  failed_count: 1,
};

const mockOnResume = vi.fn();
const mockOnDiscard = vi.fn();
const mockOnDismiss = vi.fn();

describe('SessionRecoveryBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnResume.mockResolvedValue({ session: mockSession1, devices: [] });
    mockOnDiscard.mockResolvedValue(undefined);
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('renders nothing when no sessions', () => {
      const { container } = render(<SessionRecoveryBanner sessions={[]} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders banner when sessions exist', () => {
      render(<SessionRecoveryBanner sessions={[mockSession1]} />);

      expect(screen.getByTestId('session-recovery-banner')).toBeInTheDocument();
      expect(screen.getByText(/resume previous session/i)).toBeInTheDocument();
    });

    it('displays session target SSID', () => {
      render(<SessionRecoveryBanner sessions={[mockSession1]} />);

      expect(screen.getByTestId('session-target-ssid')).toHaveTextContent('TargetNetwork1');
    });

    it('displays session state badge', () => {
      render(<SessionRecoveryBanner sessions={[mockSession1]} />);

      const badge = screen.getByTestId('session-state-badge');
      expect(badge).toHaveTextContent('active');
    });

    it('displays device counts', () => {
      render(<SessionRecoveryBanner sessions={[mockSession1]} />);

      expect(screen.getByTestId('device-count-discovered')).toHaveTextContent('5 discovered');
      expect(screen.getByTestId('device-count-provisioned')).toHaveTextContent('3 provisioned');
      expect(screen.getByTestId('device-count-verified')).toHaveTextContent('2 verified');
    });

    it('displays failed count when present', () => {
      render(<SessionRecoveryBanner sessions={[mockSession2]} />);

      expect(screen.getByTestId('device-count-failed')).toHaveTextContent('1 failed');
    });

    it('does not display failed count when zero', () => {
      render(<SessionRecoveryBanner sessions={[mockSession1]} />);

      expect(screen.queryByTestId('device-count-failed')).not.toBeInTheDocument();
    });

    it('displays loading state', () => {
      render(<SessionRecoveryBanner sessions={[]} isLoading />);

      expect(screen.getByTestId('recovery-banner-loading')).toBeInTheDocument();
      expect(screen.getByText(/checking for recoverable sessions/i)).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<SessionRecoveryBanner sessions={[mockSession1]} className="custom-class" />);

      expect(screen.getByTestId('session-recovery-banner')).toHaveClass('custom-class');
    });
  });

  // ============================================================================
  // Multiple Sessions Tests
  // ============================================================================

  describe('Multiple Sessions', () => {
    it('displays note when multiple sessions exist', () => {
      render(<SessionRecoveryBanner sessions={[mockSession1, mockSession2]} />);

      expect(screen.getByTestId('multiple-sessions-note')).toHaveTextContent(
        '1 more recoverable session available'
      );
    });

    it('uses plural for 2+ additional sessions', () => {
      const mockSession3: BatchProvisioningSession = {
        ...mockSession2,
        id: 'sess_003',
      };
      render(
        <SessionRecoveryBanner sessions={[mockSession1, mockSession2, mockSession3]} />
      );

      expect(screen.getByTestId('multiple-sessions-note')).toHaveTextContent(
        '2 more recoverable sessions available'
      );
    });

    it('does not show note for single session', () => {
      render(<SessionRecoveryBanner sessions={[mockSession1]} />);

      expect(screen.queryByTestId('multiple-sessions-note')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Resume Action Tests
  // ============================================================================

  describe('Resume Action', () => {
    it('renders resume button', () => {
      render(<SessionRecoveryBanner sessions={[mockSession1]} onResume={mockOnResume} />);

      expect(screen.getByTestId('resume-session-button')).toBeInTheDocument();
    });

    it('calls onResume when resume button clicked', async () => {
      const user = userEvent.setup();
      render(<SessionRecoveryBanner sessions={[mockSession1]} onResume={mockOnResume} />);

      await user.click(screen.getByTestId('resume-session-button'));

      await waitFor(() => {
        expect(mockOnResume).toHaveBeenCalledWith('sess_001');
      });
    });

    it('shows loading state while resuming', async () => {
      const user = userEvent.setup();
      mockOnResume.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<SessionRecoveryBanner sessions={[mockSession1]} onResume={mockOnResume} />);

      await user.click(screen.getByTestId('resume-session-button'));

      expect(screen.getByText(/resuming/i)).toBeInTheDocument();
    });

    it('disables buttons while resuming', async () => {
      const user = userEvent.setup();
      mockOnResume.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );
      render(
        <SessionRecoveryBanner
          sessions={[mockSession1]}
          onResume={mockOnResume}
          onDiscard={mockOnDiscard}
        />
      );

      await user.click(screen.getByTestId('resume-session-button'));

      expect(screen.getByTestId('resume-session-button')).toBeDisabled();
      expect(screen.getByTestId('discard-session-button')).toBeDisabled();
    });
  });

  // ============================================================================
  // Discard Action Tests
  // ============================================================================

  describe('Discard Action', () => {
    it('renders discard button', () => {
      render(
        <SessionRecoveryBanner sessions={[mockSession1]} onDiscard={mockOnDiscard} />
      );

      expect(screen.getByTestId('discard-session-button')).toBeInTheDocument();
    });

    it('opens confirmation dialog when discard clicked', async () => {
      const user = userEvent.setup();
      render(
        <SessionRecoveryBanner sessions={[mockSession1]} onDiscard={mockOnDiscard} />
      );

      await user.click(screen.getByTestId('discard-session-button'));

      expect(screen.getByText(/discard session\?/i)).toBeInTheDocument();
    });

    it('calls onDiscard when confirmed', async () => {
      const user = userEvent.setup();
      render(
        <SessionRecoveryBanner sessions={[mockSession1]} onDiscard={mockOnDiscard} />
      );

      await user.click(screen.getByTestId('discard-session-button'));
      await user.click(screen.getByTestId('confirm-discard-button'));

      await waitFor(() => {
        expect(mockOnDiscard).toHaveBeenCalledWith('sess_001');
      });
    });

    it('does not call onDiscard when cancelled', async () => {
      const user = userEvent.setup();
      render(
        <SessionRecoveryBanner sessions={[mockSession1]} onDiscard={mockOnDiscard} />
      );

      await user.click(screen.getByTestId('discard-session-button'));
      await user.click(screen.getByTestId('cancel-discard-button'));

      expect(mockOnDiscard).not.toHaveBeenCalled();
    });

    it('shows provisioned devices warning in dialog', async () => {
      const user = userEvent.setup();
      render(
        <SessionRecoveryBanner sessions={[mockSession1]} onDiscard={mockOnDiscard} />
      );

      await user.click(screen.getByTestId('discard-session-button'));

      expect(screen.getByText(/3 devices already provisioned/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Dismiss Tests
  // ============================================================================

  describe('Dismiss', () => {
    it('renders dismiss button', () => {
      render(<SessionRecoveryBanner sessions={[mockSession1]} onDismiss={mockOnDismiss} />);

      expect(screen.getByTestId('dismiss-banner-button')).toBeInTheDocument();
    });

    it('hides banner when dismiss clicked', async () => {
      const user = userEvent.setup();
      render(<SessionRecoveryBanner sessions={[mockSession1]} onDismiss={mockOnDismiss} />);

      await user.click(screen.getByTestId('dismiss-banner-button'));

      expect(screen.queryByTestId('session-recovery-banner')).not.toBeInTheDocument();
    });

    it('calls onDismiss callback', async () => {
      const user = userEvent.setup();
      render(<SessionRecoveryBanner sessions={[mockSession1]} onDismiss={mockOnDismiss} />);

      await user.click(screen.getByTestId('dismiss-banner-button'));

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Disabled State Tests
  // ============================================================================

  describe('Disabled State', () => {
    it('disables resume button when disabled', () => {
      render(
        <SessionRecoveryBanner
          sessions={[mockSession1]}
          onResume={mockOnResume}
          disabled
        />
      );

      expect(screen.getByTestId('resume-session-button')).toBeDisabled();
    });

    it('disables discard button when disabled', () => {
      render(
        <SessionRecoveryBanner
          sessions={[mockSession1]}
          onDiscard={mockOnDiscard}
          disabled
        />
      );

      expect(screen.getByTestId('discard-session-button')).toBeDisabled();
    });

    it('does not call onResume when disabled', async () => {
      const user = userEvent.setup();
      render(
        <SessionRecoveryBanner
          sessions={[mockSession1]}
          onResume={mockOnResume}
          disabled
        />
      );

      // Try to click - should be blocked by disabled attribute
      await user.click(screen.getByTestId('resume-session-button'));

      expect(mockOnResume).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Session State Variations
  // ============================================================================

  describe('Session State Variations', () => {
    it('displays paused state correctly', () => {
      render(<SessionRecoveryBanner sessions={[mockSession2]} />);

      const badge = screen.getByTestId('session-state-badge');
      expect(badge).toHaveTextContent('paused');
    });

    it('shows session with all counts', () => {
      const sessionWithAllCounts: BatchProvisioningSession = {
        ...mockSession1,
        device_count: 10,
        provisioned_count: 8,
        verified_count: 6,
        failed_count: 2,
      };

      render(<SessionRecoveryBanner sessions={[sessionWithAllCounts]} />);

      expect(screen.getByTestId('device-count-discovered')).toHaveTextContent('10 discovered');
      expect(screen.getByTestId('device-count-provisioned')).toHaveTextContent('8 provisioned');
      expect(screen.getByTestId('device-count-verified')).toHaveTextContent('6 verified');
      expect(screen.getByTestId('device-count-failed')).toHaveTextContent('2 failed');
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('has proper aria-label on dismiss button', () => {
      render(<SessionRecoveryBanner sessions={[mockSession1]} />);

      expect(screen.getByTestId('dismiss-banner-button')).toHaveAttribute(
        'aria-label',
        'Dismiss recovery banner'
      );
    });
  });
});
