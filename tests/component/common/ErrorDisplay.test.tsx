/**
 * ErrorDisplay Component Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T048
 *
 * Tests for the ErrorDisplay component that shows V1 API errors
 * with retry countdown and correlation ID display.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  ErrorDisplay,
  AuthErrorDisplay,
  NetworkErrorDisplay,
  InlineError,
} from '@/presentation/components/common/ErrorDisplay';
import { V1ApiError } from '@/infrastructure/api/errors';

// ============================================================================
// Test Setup
// ============================================================================

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);

vi.stubGlobal('navigator', {
  ...navigator,
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('ErrorDisplay Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockWriteText.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // Basic Rendering
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render nothing when error is null', () => {
      const { container } = render(<ErrorDisplay error={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should render nothing when error is undefined', () => {
      const { container } = render(<ErrorDisplay error={undefined} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should render error message for string error', () => {
      render(<ErrorDisplay error="Something went wrong" />);

      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Something went wrong');
    });

    it('should render error message for Error instance', () => {
      render(<ErrorDisplay error={new Error('Network failed')} />);

      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Network failed');
    });

    it('should render error message for V1ApiError', () => {
      const v1Error = new V1ApiError(
        'SESSION_NOT_FOUND',
        'Session not found',
        false,
        undefined,
        'corr-123'
      );

      render(<ErrorDisplay error={v1Error} />);

      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'The provisioning session was not found'
      );
    });
  });

  // ============================================================================
  // Error Categories
  // ============================================================================

  describe('Error Categories', () => {
    it('should show auth title for UNAUTHORIZED error', () => {
      const error = new V1ApiError('UNAUTHORIZED', 'Not authorized', false);
      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });

    it('should show session title for SESSION_EXPIRED error', () => {
      const error = new V1ApiError('SESSION_EXPIRED', 'Session expired', false);
      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Session Error')).toBeInTheDocument();
    });

    it('should show device title for DEVICE_NOT_FOUND error', () => {
      const error = new V1ApiError('DEVICE_NOT_FOUND', 'Device not found', false);
      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Device Error')).toBeInTheDocument();
    });

    it('should show network title for NETWORK_ERROR error', () => {
      const error = new V1ApiError('NETWORK_ERROR', 'Network unavailable', true);
      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });

    it('should show validation title for VALIDATION_FAILED error', () => {
      const error = new V1ApiError('VALIDATION_FAILED', 'Invalid input', false);
      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Validation Error')).toBeInTheDocument();
    });

    it('should show infrastructure title for DATABASE_ERROR error', () => {
      const error = new V1ApiError('DATABASE_ERROR', 'DB failed', true);
      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Service Error')).toBeInTheDocument();
    });

    it('should use custom title when provided', () => {
      const error = new V1ApiError('SESSION_NOT_FOUND', 'Not found', false);
      render(<ErrorDisplay error={error} title="Custom Error Title" />);

      expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Error Code Display
  // ============================================================================

  describe('Error Code Display', () => {
    it('should show error code for V1ApiError', () => {
      const error = new V1ApiError('DEVICE_TIMEOUT', 'Device timed out', true);
      render(<ErrorDisplay error={error} />);

      expect(screen.getByTestId('error-code')).toHaveTextContent('DEVICE_TIMEOUT');
    });

    it('should not show error code for string errors', () => {
      render(<ErrorDisplay error="Simple error message" />);

      expect(screen.queryByTestId('error-code')).not.toBeInTheDocument();
    });

    it('should not show error code for Error instances', () => {
      render(<ErrorDisplay error={new Error('Regular error')} />);

      expect(screen.queryByTestId('error-code')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Correlation ID
  // ============================================================================

  describe('Correlation ID', () => {
    it('should show correlation ID when provided', () => {
      const error = new V1ApiError(
        'INTERNAL_ERROR',
        'Internal error',
        true,
        undefined,
        'req-abc-123-xyz'
      );
      render(<ErrorDisplay error={error} showCorrelationId={true} />);

      expect(screen.getByTestId('correlation-id')).toHaveTextContent('req-abc-123-xyz');
    });

    it('should not show correlation ID when showCorrelationId is false', () => {
      const error = new V1ApiError(
        'INTERNAL_ERROR',
        'Internal error',
        true,
        undefined,
        'req-abc-123-xyz'
      );
      render(<ErrorDisplay error={error} showCorrelationId={false} />);

      expect(screen.queryByTestId('correlation-id')).not.toBeInTheDocument();
    });

    it('should copy correlation ID to clipboard on click', async () => {
      const error = new V1ApiError(
        'INTERNAL_ERROR',
        'Internal error',
        true,
        undefined,
        'req-copy-test'
      );
      render(<ErrorDisplay error={error} />);

      const correlationButton = screen.getByTestId('correlation-id');
      fireEvent.click(correlationButton);

      // Wait for async clipboard operation
      await vi.waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('req-copy-test');
      });
    });

    it('should not show correlation ID for non-V1 errors', () => {
      render(<ErrorDisplay error={new Error('Regular error')} />);

      expect(screen.queryByTestId('correlation-id')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Retry Button
  // ============================================================================

  describe('Retry Button', () => {
    it('should show retry button when onRetry provided and error is retryable', () => {
      const error = new V1ApiError('NETWORK_ERROR', 'Network issue', true);
      const onRetry = vi.fn();
      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      expect(screen.getByTestId('error-retry-button')).toBeInTheDocument();
    });

    it('should call onRetry when retry button clicked', () => {
      const error = new V1ApiError('NETWORK_ERROR', 'Network issue', true);
      const onRetry = vi.fn();
      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      fireEvent.click(screen.getByTestId('error-retry-button'));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button when error is not retryable', () => {
      const error = new V1ApiError('SESSION_EXPIRED', 'Expired', false);
      const onRetry = vi.fn();
      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      expect(screen.queryByTestId('error-retry-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('error-retry-section')).not.toBeInTheDocument();
    });

    it('should not show retry button when onRetry is not provided', () => {
      const error = new V1ApiError('NETWORK_ERROR', 'Network issue', true);
      render(<ErrorDisplay error={error} />);

      expect(screen.queryByTestId('error-retry-button')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Retry Countdown
  // ============================================================================

  describe('Retry Countdown', () => {
    it('should show countdown when retryAfterSeconds is provided', () => {
      const error = new V1ApiError('RATE_LIMITED', 'Too many requests', true, 10);
      render(<ErrorDisplay error={error} onRetry={vi.fn()} />);

      expect(screen.getByTestId('error-retry-section')).toHaveTextContent('10');
    });

    it('should decrement countdown every second', () => {
      const error = new V1ApiError('RATE_LIMITED', 'Too many requests', true, 5);
      render(<ErrorDisplay error={error} onRetry={vi.fn()} />);

      expect(screen.getByTestId('error-retry-section')).toHaveTextContent('5');

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('error-retry-section')).toHaveTextContent('4');

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('error-retry-section')).toHaveTextContent('3');
    });

    it('should call onRetry when countdown reaches zero', () => {
      const onRetry = vi.fn();
      const error = new V1ApiError('RATE_LIMITED', 'Too many requests', true, 3);
      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      expect(onRetry).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should show "Retry Now" button during countdown', () => {
      const error = new V1ApiError('RATE_LIMITED', 'Too many requests', true, 10);
      render(<ErrorDisplay error={error} onRetry={vi.fn()} />);

      expect(screen.getByTestId('error-retry-now-button')).toHaveTextContent('Retry Now');
    });

    it('should allow immediate retry with "Retry Now" button', () => {
      const onRetry = vi.fn();
      const error = new V1ApiError('RATE_LIMITED', 'Too many requests', true, 10);
      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      fireEvent.click(screen.getByTestId('error-retry-now-button'));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Dismiss Button
  // ============================================================================

  describe('Dismiss Button', () => {
    it('should show dismiss button when dismissible is true', () => {
      const onDismiss = vi.fn();
      render(
        <ErrorDisplay error="Test error" dismissible={true} onDismiss={onDismiss} />
      );

      expect(screen.getByTestId('error-dismiss-button')).toBeInTheDocument();
    });

    it('should not show dismiss button when dismissible is false', () => {
      render(<ErrorDisplay error="Test error" dismissible={false} />);

      expect(screen.queryByTestId('error-dismiss-button')).not.toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button clicked', () => {
      const onDismiss = vi.fn();
      render(
        <ErrorDisplay error="Test error" dismissible={true} onDismiss={onDismiss} />
      );

      fireEvent.click(screen.getByTestId('error-dismiss-button'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Compact Mode
  // ============================================================================

  describe('Compact Mode', () => {
    it('should render compact display when compact is true', () => {
      render(<ErrorDisplay error="Compact error" compact={true} />);

      const display = screen.getByTestId('error-display');
      // Compact mode uses a div with flex instead of Alert
      expect(display.tagName.toLowerCase()).toBe('div');
    });

    it('should show truncated message in compact mode', () => {
      render(<ErrorDisplay error="Compact error message" compact={true} />);

      expect(screen.getByTestId('error-display')).toHaveTextContent('Compact error message');
    });

    it('should show retry button in compact mode', () => {
      const error = new V1ApiError('NETWORK_ERROR', 'Network issue', true);
      render(<ErrorDisplay error={error} compact={true} onRetry={vi.fn()} />);

      expect(screen.getByTestId('error-retry-button')).toBeInTheDocument();
    });

    it('should show countdown in compact retry button', () => {
      const error = new V1ApiError('RATE_LIMITED', 'Rate limited', true, 5);
      render(<ErrorDisplay error={error} compact={true} onRetry={vi.fn()} />);

      expect(screen.getByTestId('error-retry-button')).toHaveTextContent('5s');
    });
  });

  // ============================================================================
  // User-Friendly Messages
  // ============================================================================

  describe('User-Friendly Messages', () => {
    it('should show user-friendly message for DEVICE_UNREACHABLE', () => {
      const error = new V1ApiError('DEVICE_UNREACHABLE', 'Technical message', false);
      render(<ErrorDisplay error={error} />);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Cannot connect to the device'
      );
    });

    it('should show user-friendly message for CIRCUIT_OPEN', () => {
      const error = new V1ApiError('CIRCUIT_OPEN', 'Circuit breaker open', true);
      render(<ErrorDisplay error={error} />);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Service temporarily unavailable'
      );
    });

    it('should show user-friendly message for TOTP_INVALID', () => {
      const error = new V1ApiError('TOTP_INVALID', 'TOTP validation failed', false);
      render(<ErrorDisplay error={error} />);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'The authentication code is invalid'
      );
    });
  });
});

// ============================================================================
// Specialized Components
// ============================================================================

describe('AuthErrorDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render with Authentication Required title', () => {
    render(<AuthErrorDisplay error="Auth failed" />);

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
  });

  it('should call onConfigureApiKey when retry clicked', () => {
    const onConfigure = vi.fn();
    const error = new V1ApiError('UNAUTHORIZED', 'Not authorized', true);
    render(<AuthErrorDisplay error={error} onConfigureApiKey={onConfigure} />);

    fireEvent.click(screen.getByTestId('error-retry-button'));

    expect(onConfigure).toHaveBeenCalled();
  });
});

describe('NetworkErrorDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render with Connection Error title', () => {
    render(<NetworkErrorDisplay error="Network failed" />);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
  });

  it('should show retry button', () => {
    const onRetry = vi.fn();
    const error = new V1ApiError('NETWORK_ERROR', 'Network issue', true);
    render(<NetworkErrorDisplay error={error} onRetry={onRetry} />);

    expect(screen.getByTestId('error-retry-button')).toBeInTheDocument();
  });
});

describe('InlineError', () => {
  it('should render error message', () => {
    render(<InlineError message="Field is required" />);

    expect(screen.getByTestId('inline-error')).toHaveTextContent('Field is required');
  });

  it('should render nothing when message is null', () => {
    const { container } = render(<InlineError message={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when message is undefined', () => {
    const { container } = render(<InlineError message={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should have destructive text color', () => {
    render(<InlineError message="Error text" />);

    expect(screen.getByTestId('inline-error')).toHaveClass('text-destructive');
  });

  it('should have role="alert"', () => {
    render(<InlineError message="Error" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
