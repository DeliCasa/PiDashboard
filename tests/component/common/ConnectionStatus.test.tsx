/**
 * ConnectionStatus Component Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T027
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionStatus, ConnectionDot } from '@/presentation/components/common/ConnectionStatus';
import type { SSEConnectionState } from '@/domain/types/sse';

describe('ConnectionStatus Component', () => {
  describe('State Display', () => {
    const states: SSEConnectionState[] = [
      'disconnected',
      'connecting',
      'connected',
      'reconnecting',
      'error',
    ];

    it.each(states)('should render %s state correctly', (state) => {
      render(<ConnectionStatus state={state} />);

      const element = screen.getByTestId('connection-status');
      expect(element).toBeInTheDocument();
      expect(element).toHaveAttribute('data-state', state);
    });

    it('should show "Disconnected" label for disconnected state', () => {
      render(<ConnectionStatus state="disconnected" />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should show "Connecting..." label for connecting state', () => {
      render(<ConnectionStatus state="connecting" />);
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should show "Connected" label for connected state', () => {
      render(<ConnectionStatus state="connected" />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should show "Reconnecting..." label for reconnecting state', () => {
      render(<ConnectionStatus state="reconnecting" />);
      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    });

    it('should show "Connection Error" label for error state', () => {
      render(<ConnectionStatus state="error" />);
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when in error state', () => {
      render(
        <ConnectionStatus
          state="error"
          error="Network timeout"
        />
      );

      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });

    it('should not display error message when not in error state', () => {
      render(
        <ConnectionStatus
          state="connected"
          error="Some error"
        />
      );

      expect(screen.queryByText('Some error')).not.toBeInTheDocument();
    });

    it('should show reconnect button when in error state with handler', () => {
      const onReconnect = vi.fn();

      render(
        <ConnectionStatus
          state="error"
          onReconnect={onReconnect}
        />
      );

      expect(screen.getByTestId('reconnect-button')).toBeInTheDocument();
    });

    it('should not show reconnect button when not in error state', () => {
      const onReconnect = vi.fn();

      render(
        <ConnectionStatus
          state="connected"
          onReconnect={onReconnect}
        />
      );

      expect(screen.queryByTestId('reconnect-button')).not.toBeInTheDocument();
    });

    it('should call onReconnect when reconnect button is clicked', () => {
      const onReconnect = vi.fn();

      render(
        <ConnectionStatus
          state="error"
          onReconnect={onReconnect}
        />
      );

      fireEvent.click(screen.getByTestId('reconnect-button'));
      expect(onReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Compact Mode', () => {
    it('should render compact version when compact=true', () => {
      render(<ConnectionStatus state="connected" compact />);

      const element = screen.getByTestId('connection-status');
      expect(element).toBeInTheDocument();
      expect(element).toHaveClass('flex', 'items-center', 'gap-1.5');
    });

    it('should show label in compact mode', () => {
      render(<ConnectionStatus state="connected" compact />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should not show reconnect button in compact mode even when in error state', () => {
      const onReconnect = vi.fn();

      render(
        <ConnectionStatus
          state="error"
          onReconnect={onReconnect}
          compact
        />
      );

      expect(screen.queryByTestId('reconnect-button')).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(
        <ConnectionStatus
          state="connected"
          className="custom-class"
        />
      );

      const element = screen.getByTestId('connection-status');
      expect(element).toHaveClass('custom-class');
    });
  });
});

describe('ConnectionDot Component', () => {
  describe('State Display', () => {
    it('should render with correct data-state attribute', () => {
      render(<ConnectionDot state="connected" />);

      const element = screen.getByTestId('connection-dot');
      expect(element).toHaveAttribute('data-state', 'connected');
    });

    it('should render green dot for connected state', () => {
      render(<ConnectionDot state="connected" />);

      const element = screen.getByTestId('connection-dot');
      expect(element).toHaveClass('bg-green-500');
    });

    it('should render blue pulsing dot for connecting state', () => {
      render(<ConnectionDot state="connecting" />);

      const element = screen.getByTestId('connection-dot');
      expect(element).toHaveClass('bg-blue-500', 'animate-pulse');
    });

    it('should render yellow pulsing dot for reconnecting state', () => {
      render(<ConnectionDot state="reconnecting" />);

      const element = screen.getByTestId('connection-dot');
      expect(element).toHaveClass('bg-yellow-500', 'animate-pulse');
    });

    it('should render red dot for error state', () => {
      render(<ConnectionDot state="error" />);

      const element = screen.getByTestId('connection-dot');
      expect(element).toHaveClass('bg-red-500');
    });

    it('should render muted dot for disconnected state', () => {
      render(<ConnectionDot state="disconnected" />);

      const element = screen.getByTestId('connection-dot');
      expect(element).toHaveClass('bg-muted-foreground');
    });
  });

  describe('Title Attribute', () => {
    it('should have correct title for connected state', () => {
      render(<ConnectionDot state="connected" />);

      const element = screen.getByTestId('connection-dot');
      expect(element).toHaveAttribute('title', 'Connected');
    });

    it('should have correct title for error state', () => {
      render(<ConnectionDot state="error" />);

      const element = screen.getByTestId('connection-dot');
      expect(element).toHaveAttribute('title', 'Connection Error');
    });
  });
});
