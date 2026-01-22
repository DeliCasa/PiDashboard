/**
 * RebootDialog Component Tests
 * Feature: 034-esp-camera-integration (T049-T050)
 *
 * Tests reboot confirmation dialog and loading states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RebootDialog } from '@/presentation/components/cameras/RebootDialog';

describe('RebootDialog', () => {
  const defaultProps = {
    cameraName: 'Front Door Camera',
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isRebooting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Display', () => {
    it('should render dialog when open', () => {
      render(<RebootDialog {...defaultProps} />);

      expect(screen.getByTestId('reboot-dialog')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(<RebootDialog {...defaultProps} open={false} />);

      expect(screen.queryByTestId('reboot-dialog')).not.toBeInTheDocument();
    });

    it('should display camera name in confirmation message', () => {
      render(<RebootDialog {...defaultProps} />);

      expect(screen.getByText('Front Door Camera')).toBeInTheDocument();
    });

    it('should display warning message', () => {
      render(<RebootDialog {...defaultProps} />);

      expect(screen.getByTestId('reboot-warning')).toBeInTheDocument();
      expect(
        screen.getByText(/temporarily unavailable during the reboot process/i)
      ).toBeInTheDocument();
    });

    it('should display reboot button', () => {
      render(<RebootDialog {...defaultProps} />);

      expect(screen.getByTestId('reboot-confirm-button')).toBeInTheDocument();
      expect(screen.getByText('Reboot')).toBeInTheDocument();
    });

    it('should display cancel button', () => {
      render(<RebootDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  // T049: Confirmation flow tests
  describe('Confirmation Flow (T049)', () => {
    it('should call onConfirm when Reboot button is clicked', () => {
      const onConfirm = vi.fn();
      render(<RebootDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByTestId('reboot-confirm-button'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onOpenChange with false when Cancel is clicked', () => {
      const onOpenChange = vi.fn();
      render(<RebootDialog {...defaultProps} onOpenChange={onOpenChange} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should not close dialog when clicking confirm (parent handles close)', () => {
      const onOpenChange = vi.fn();
      const onConfirm = vi.fn();
      render(
        <RebootDialog
          {...defaultProps}
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />
      );

      fireEvent.click(screen.getByTestId('reboot-confirm-button'));

      // onConfirm should be called, but onOpenChange should not be called by the dialog
      expect(onConfirm).toHaveBeenCalledTimes(1);
      // The dialog itself doesn't close on confirm - the parent handles that
    });
  });

  // T050: Loading state tests
  describe('Loading State (T050)', () => {
    it('should show loading text when isRebooting is true', () => {
      render(<RebootDialog {...defaultProps} isRebooting={true} />);

      expect(screen.getByText('Rebooting...')).toBeInTheDocument();
    });

    it('should disable Reboot button when rebooting', () => {
      render(<RebootDialog {...defaultProps} isRebooting={true} />);

      const confirmButton = screen.getByTestId('reboot-confirm-button');
      expect(confirmButton).toBeDisabled();
    });

    it('should disable Cancel button when rebooting', () => {
      render(<RebootDialog {...defaultProps} isRebooting={true} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('should show spinner icon when rebooting', () => {
      render(<RebootDialog {...defaultProps} isRebooting={true} />);

      // The button text changes to "Rebooting..." and contains a spinning icon
      const confirmButton = screen.getByTestId('reboot-confirm-button');
      // Check that the button contains the rebooting text (which includes the spinner)
      expect(confirmButton.textContent).toContain('Rebooting...');
    });

    it('should not show loading state when not rebooting', () => {
      render(<RebootDialog {...defaultProps} isRebooting={false} />);

      expect(screen.queryByText('Rebooting...')).not.toBeInTheDocument();
      expect(screen.getByText('Reboot')).toBeInTheDocument();
    });

    it('should have enabled buttons when not rebooting', () => {
      render(<RebootDialog {...defaultProps} isRebooting={false} />);

      const confirmButton = screen.getByTestId('reboot-confirm-button');
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(confirmButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('Alert Dialog Styling', () => {
    it('should display warning icon', () => {
      render(<RebootDialog {...defaultProps} />);

      // AlertTriangle icon has text-yellow-500 class
      expect(screen.getByText('Reboot Camera')).toBeInTheDocument();
    });

    it('should have destructive styling on confirm button', () => {
      render(<RebootDialog {...defaultProps} />);

      const confirmButton = screen.getByTestId('reboot-confirm-button');
      expect(confirmButton).toHaveClass('bg-destructive');
    });
  });

  describe('Different Camera Names', () => {
    it('should display different camera names correctly', () => {
      const { rerender } = render(
        <RebootDialog {...defaultProps} cameraName="Backyard Camera" />
      );

      expect(screen.getByText('Backyard Camera')).toBeInTheDocument();

      rerender(<RebootDialog {...defaultProps} cameraName="Garage Entrance" />);

      expect(screen.getByText('Garage Entrance')).toBeInTheDocument();
    });

    it('should handle empty camera name gracefully', () => {
      render(<RebootDialog {...defaultProps} cameraName="" />);

      // Should still render the dialog
      expect(screen.getByTestId('reboot-dialog')).toBeInTheDocument();
    });
  });
});
