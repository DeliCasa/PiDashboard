/**
 * DoorControls Component Tests (T033, T042)
 * Tests for door control buttons and unavailable state
 *
 * Feature: 005-testing-research-and-hardening (T042)
 * Updated to use data-testid selectors for reliable test targeting.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import { DoorControls } from '@/presentation/components/door/DoorControls';
import type { Door } from '@/domain/types/entities';

const mockDoor: Door = {
  state: 'closed',
  lockState: 'locked',
  lastCommand: 'close',
  lastCommandType: 'close',
  lastCommandResult: 'success',
  lastCommandTimestamp: new Date().toISOString(),
};

describe('DoorControls', () => {
  describe('error state (door API unavailable)', () => {
    it('should display unavailable message when isError is true', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      render(
        <DoorControls
          door={undefined}
          isError={true}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      // Use data-testid for error state container
      expect(screen.getByTestId('door-controls-error')).toBeInTheDocument();
      expect(screen.getByText('Door Control Unavailable')).toBeInTheDocument();
      expect(
        screen.getByText(/Door API is not available/)
      ).toBeInTheDocument();
    });

    it('should not show control buttons when unavailable', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      render(
        <DoorControls
          door={undefined}
          isError={true}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      expect(screen.queryByTestId('door-open-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('door-close-button')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should display loading spinner when isLoading is true', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      render(
        <DoorControls
          door={undefined}
          isLoading={true}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      // Use data-testid for loading state
      expect(screen.getByTestId('door-controls-loading')).toBeInTheDocument();
    });

    it('should display loading when door data is undefined', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      render(
        <DoorControls
          door={undefined}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      expect(screen.getByTestId('door-controls-loading')).toBeInTheDocument();
    });
  });

  describe('door state display', () => {
    it('should display closed door state', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      render(
        <DoorControls
          door={mockDoor}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      // Use data-testid for door controls and state display
      expect(screen.getByTestId('door-controls')).toBeInTheDocument();
      expect(screen.getByTestId('door-state')).toHaveTextContent('closed');
      expect(screen.getByTestId('door-lock-state')).toHaveTextContent('locked');
    });

    it('should display open door state', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const openDoor: Door = { ...mockDoor, state: 'open', lockState: 'unlocked' };

      render(
        <DoorControls
          door={openDoor}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      expect(screen.getByTestId('door-state')).toHaveTextContent('open');
      expect(screen.getByTestId('door-lock-state')).toHaveTextContent('unlocked');
    });
  });

  describe('control buttons', () => {
    it('should render Open Door and Close Door buttons', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      render(
        <DoorControls
          door={mockDoor}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      // Use data-testid for buttons
      expect(screen.getByTestId('door-open-button')).toBeInTheDocument();
      expect(screen.getByTestId('door-close-button')).toBeInTheDocument();
    });

    it('should disable buttons while opening', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      render(
        <DoorControls
          door={mockDoor}
          onOpen={onOpen}
          onClose={onClose}
          isOpening={true}
        />
      );

      const openButton = screen.getByTestId('door-open-button');
      const closeButton = screen.getByTestId('door-close-button');
      expect(openButton).toHaveTextContent('Opening...');
      expect(openButton).toBeDisabled();
      expect(closeButton).toBeDisabled();
    });

    it('should disable buttons while closing', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      render(
        <DoorControls
          door={mockDoor}
          onOpen={onOpen}
          onClose={onClose}
          isClosing={true}
        />
      );

      const openButton = screen.getByTestId('door-open-button');
      const closeButton = screen.getByTestId('door-close-button');
      expect(closeButton).toHaveTextContent('Closing...');
      expect(openButton).toBeDisabled();
      expect(closeButton).toBeDisabled();
    });
  });

  describe('duration selector', () => {
    it('should display duration selector', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      render(
        <DoorControls
          door={mockDoor}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      expect(screen.getByText('Duration:')).toBeInTheDocument();
    });

    it('should have default duration of 5 seconds', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      render(
        <DoorControls
          door={mockDoor}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      expect(screen.getByText('5 seconds')).toBeInTheDocument();
    });
  });

  describe('testing mode', () => {
    it('should skip confirmation dialog in testing mode', async () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      const { user } = render(
        <DoorControls
          door={mockDoor}
          testingModeActive={true}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      // Use data-testid for open button
      await user.click(screen.getByTestId('door-open-button'));

      // In testing mode, onOpen should be called immediately
      expect(onOpen).toHaveBeenCalledWith(5);
    });

    it('should show confirmation dialog when not in testing mode', async () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      const { user } = render(
        <DoorControls
          door={mockDoor}
          testingModeActive={false}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      await user.click(screen.getByTestId('door-open-button'));

      // Dialog should be shown
      expect(screen.getByText('Confirm Door Open')).toBeInTheDocument();
      expect(onOpen).not.toHaveBeenCalled();
    });
  });

  describe('confirmation dialogs', () => {
    it('should show open confirmation dialog', async () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      const { user } = render(
        <DoorControls
          door={mockDoor}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      await user.click(screen.getByTestId('door-open-button'));

      expect(screen.getByText('Confirm Door Open')).toBeInTheDocument();
      expect(
        screen.getByText(/This will unlock the door for 5 seconds/)
      ).toBeInTheDocument();
    });

    it('should call onOpen when confirmed', async () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      const { user } = render(
        <DoorControls
          door={mockDoor}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      await user.click(screen.getByTestId('door-open-button'));
      await user.click(screen.getByRole('button', { name: /^open door$/i }));

      expect(onOpen).toHaveBeenCalledWith(5);
    });

    it('should cancel without calling onOpen', async () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      const { user } = render(
        <DoorControls
          door={mockDoor}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      await user.click(screen.getByTestId('door-open-button'));
      await user.click(screen.getByText('Cancel'));

      expect(onOpen).not.toHaveBeenCalled();
    });
  });

  describe('last command result', () => {
    it('should display last command result', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();

      render(
        <DoorControls
          door={mockDoor}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      expect(screen.getByText(/Last command:/)).toBeInTheDocument();
      expect(screen.getByText('success')).toBeInTheDocument();
    });

    it('should not display last command if not available', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const doorNoLastCommand: Door = {
        state: 'closed',
        lockState: 'locked',
      };

      render(
        <DoorControls
          door={doorNoLastCommand}
          onOpen={onOpen}
          onClose={onClose}
        />
      );

      expect(screen.queryByText(/Last command:/)).not.toBeInTheDocument();
    });
  });
});
