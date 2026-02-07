/**
 * PositionSlot Component Tests
 * Feature: 043-container-identity-ui (T012, T014, T020)
 *
 * Tests for camera position slot component showing empty/occupied states,
 * unassign action (US4), and status indicators (US7).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PositionSlot } from '@/presentation/components/containers/PositionSlot';
import type { CameraAssignment } from '@/infrastructure/api/v1-containers';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Wrapper with TooltipProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

// Mock camera assignments
const mockOnlineAssignment: CameraAssignment = {
  device_id: 'AA:BB:CC:DD:EE:01',
  position: 1,
  status: 'online',
  name: 'Camera 01',
  assigned_at: new Date().toISOString(),
};

const mockOfflineAssignment: CameraAssignment = {
  device_id: 'AA:BB:CC:DD:EE:02',
  position: 2,
  status: 'offline',
  name: 'Camera 02',
  assigned_at: new Date().toISOString(),
};

const mockErrorAssignment: CameraAssignment = {
  device_id: 'AA:BB:CC:DD:EE:03',
  position: 3,
  status: 'error',
  name: 'Camera 03',
  assigned_at: new Date().toISOString(),
};

const mockIdleAssignment: CameraAssignment = {
  device_id: 'AA:BB:CC:DD:EE:04',
  position: 4,
  status: 'idle',
  name: 'Camera 04',
  assigned_at: new Date().toISOString(),
};

const mockRebootingAssignment: CameraAssignment = {
  device_id: 'AA:BB:CC:DD:EE:05',
  position: 1,
  status: 'rebooting',
  name: 'Camera 05',
  assigned_at: new Date().toISOString(),
};

const mockNoNameAssignment: CameraAssignment = {
  device_id: 'AA:BB:CC:DD:EE:06',
  position: 1,
  status: 'online',
  assigned_at: new Date().toISOString(),
};

describe('PositionSlot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // Empty Slot State (US3)
  // ===========================================================================

  describe('Empty Slot State', () => {
    it('renders empty slot when no assignment', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} />
        </TestWrapper>
      );

      expect(screen.getByTestId('position-slot-1-empty')).toBeInTheDocument();
    });

    it('displays position number in empty slot', () => {
      render(
        <TestWrapper>
          <PositionSlot position={2} />
        </TestWrapper>
      );

      expect(screen.getByText('Position 2')).toBeInTheDocument();
    });

    it('shows assign button when onAssign provided', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} onAssign={vi.fn()} />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /assign/i })).toBeInTheDocument();
    });

    it('does not show assign button when onAssign not provided', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} />
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: /assign/i })).not.toBeInTheDocument();
    });

    it('calls onAssign when assign button clicked', () => {
      const onAssign = vi.fn();
      render(
        <TestWrapper>
          <PositionSlot position={1} onAssign={onAssign} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByRole('button', { name: /assign/i }));
      expect(onAssign).toHaveBeenCalledTimes(1);
    });

    it('disables assign button when disabled prop is true', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} onAssign={vi.fn()} disabled={true} />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /assign/i })).toBeDisabled();
    });

    it('has dashed border styling for empty slot', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} />
        </TestWrapper>
      );

      const slot = screen.getByTestId('position-slot-1-empty');
      expect(slot).toHaveClass('border-dashed');
    });
  });

  // ===========================================================================
  // Occupied Slot State (US3)
  // ===========================================================================

  describe('Occupied Slot State', () => {
    it('renders occupied slot when assignment provided', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOnlineAssignment} />
        </TestWrapper>
      );

      expect(screen.getByTestId('position-slot-1-occupied')).toBeInTheDocument();
    });

    it('displays camera name', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOnlineAssignment} />
        </TestWrapper>
      );

      expect(screen.getByText('Camera 01')).toBeInTheDocument();
    });

    it('displays "Camera" as fallback when no name', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockNoNameAssignment} />
        </TestWrapper>
      );

      expect(screen.getByText('Camera')).toBeInTheDocument();
    });

    it('displays device ID in monospace', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOnlineAssignment} />
        </TestWrapper>
      );

      const deviceId = screen.getByText('AA:BB:CC:DD:EE:01');
      expect(deviceId).toHaveClass('font-mono');
    });

    it('displays position badge on occupied slot', () => {
      render(
        <TestWrapper>
          <PositionSlot position={3} assignment={{ ...mockOnlineAssignment, position: 3 }} />
        </TestWrapper>
      );

      // Position badge shows the position number
      const badge = screen.getByText('3');
      expect(badge).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Unassign Action (T014 - US4)
  // ===========================================================================

  describe('Unassign Action', () => {
    it('shows unassign button when onUnassign provided', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOnlineAssignment} onUnassign={vi.fn()} />
        </TestWrapper>
      );

      // The unassign button should be present (X icon button)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('does not show unassign button when onUnassign not provided', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOnlineAssignment} />
        </TestWrapper>
      );

      // No buttons should be present
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('calls onUnassign when unassign button clicked', () => {
      const onUnassign = vi.fn();
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOnlineAssignment} onUnassign={onUnassign} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onUnassign).toHaveBeenCalledTimes(1);
    });

    it('disables unassign button when isUnassigning is true', () => {
      render(
        <TestWrapper>
          <PositionSlot
            position={1}
            assignment={mockOnlineAssignment}
            onUnassign={vi.fn()}
            isUnassigning={true}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disables unassign button when disabled prop is true', () => {
      render(
        <TestWrapper>
          <PositionSlot
            position={1}
            assignment={mockOnlineAssignment}
            onUnassign={vi.fn()}
            disabled={true}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  // ===========================================================================
  // Status Indicators (T020 - US7)
  // ===========================================================================

  describe('Status Indicators', () => {
    it('shows "Online" status for online camera', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOnlineAssignment} />
        </TestWrapper>
      );

      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('shows "Offline" status for offline camera', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOfflineAssignment} />
        </TestWrapper>
      );

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('shows "Error" status for error camera', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockErrorAssignment} />
        </TestWrapper>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('shows "Idle" status for idle camera', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockIdleAssignment} />
        </TestWrapper>
      );

      expect(screen.getByText('Idle')).toBeInTheDocument();
    });

    it('shows "Rebooting" status for rebooting camera', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockRebootingAssignment} />
        </TestWrapper>
      );

      expect(screen.getByText('Rebooting')).toBeInTheDocument();
    });

    it('applies warning styling for offline camera', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOfflineAssignment} />
        </TestWrapper>
      );

      const slot = screen.getByTestId('position-slot-1-occupied');
      expect(slot).toHaveClass('border-yellow-500/50');
      expect(slot).toHaveClass('bg-yellow-500/5');
    });

    it('applies warning styling for error camera', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockErrorAssignment} />
        </TestWrapper>
      );

      const slot = screen.getByTestId('position-slot-1-occupied');
      expect(slot).toHaveClass('border-yellow-500/50');
    });

    it('does not apply warning styling for online camera', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOnlineAssignment} />
        </TestWrapper>
      );

      const slot = screen.getByTestId('position-slot-1-occupied');
      expect(slot).not.toHaveClass('border-yellow-500/50');
    });

    it('shows green color for online status', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOnlineAssignment} />
        </TestWrapper>
      );

      const statusText = screen.getByText('Online');
      expect(statusText).toHaveClass('text-green-500');
    });

    it('shows red color for offline status', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOfflineAssignment} />
        </TestWrapper>
      );

      const statusText = screen.getByText('Offline');
      expect(statusText).toHaveClass('text-red-500');
    });

    it('shows red color for error status', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockErrorAssignment} />
        </TestWrapper>
      );

      const statusText = screen.getByText('Error');
      expect(statusText).toHaveClass('text-red-500');
    });

    it('shows yellow color for idle status', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockIdleAssignment} />
        </TestWrapper>
      );

      const statusText = screen.getByText('Idle');
      expect(statusText).toHaveClass('text-yellow-500');
    });
  });

  // ===========================================================================
  // Custom Styling
  // ===========================================================================

  describe('Custom Styling', () => {
    it('applies custom className to empty slot', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} className="custom-class" />
        </TestWrapper>
      );

      const slot = screen.getByTestId('position-slot-1-empty');
      expect(slot).toHaveClass('custom-class');
    });

    it('applies custom className to occupied slot', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} assignment={mockOnlineAssignment} className="custom-class" />
        </TestWrapper>
      );

      const slot = screen.getByTestId('position-slot-1-occupied');
      expect(slot).toHaveClass('custom-class');
    });
  });

  // ===========================================================================
  // Position Values
  // ===========================================================================

  describe('Position Values', () => {
    it('renders correctly for position 1', () => {
      render(
        <TestWrapper>
          <PositionSlot position={1} />
        </TestWrapper>
      );

      expect(screen.getByTestId('position-slot-1-empty')).toBeInTheDocument();
      expect(screen.getByText('Position 1')).toBeInTheDocument();
    });

    it('renders correctly for position 2', () => {
      render(
        <TestWrapper>
          <PositionSlot position={2} />
        </TestWrapper>
      );

      expect(screen.getByTestId('position-slot-2-empty')).toBeInTheDocument();
      expect(screen.getByText('Position 2')).toBeInTheDocument();
    });

    it('renders correctly for position 3', () => {
      render(
        <TestWrapper>
          <PositionSlot position={3} />
        </TestWrapper>
      );

      expect(screen.getByTestId('position-slot-3-empty')).toBeInTheDocument();
      expect(screen.getByText('Position 3')).toBeInTheDocument();
    });

    it('renders correctly for position 4', () => {
      render(
        <TestWrapper>
          <PositionSlot position={4} />
        </TestWrapper>
      );

      expect(screen.getByTestId('position-slot-4-empty')).toBeInTheDocument();
      expect(screen.getByText('Position 4')).toBeInTheDocument();
    });
  });
});
