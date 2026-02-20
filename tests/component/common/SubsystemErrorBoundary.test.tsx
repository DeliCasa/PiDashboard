/**
 * SubsystemErrorBoundary Component Tests
 * Feature: 058-real-evidence-ops (T004)
 *
 * Tests that the error boundary isolates render errors within a named subsystem.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import { SubsystemErrorBoundary } from '@/presentation/components/common/SubsystemErrorBoundary';

// A component that throws on render
function ThrowingChild({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test render error');
  }
  return <div data-testid="child-content">Child rendered successfully</div>;
}

// Suppress console.error for expected error boundary logs
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('SubsystemErrorBoundary', () => {
  it('renders children normally when no error occurs', () => {
    render(
      <SubsystemErrorBoundary subsystemName="Sessions">
        <div data-testid="child-content">Hello</div>
      </SubsystemErrorBoundary>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows fallback with subsystem name when child throws', () => {
    render(
      <SubsystemErrorBoundary subsystemName="Sessions">
        <ThrowingChild />
      </SubsystemErrorBoundary>
    );

    expect(screen.getByTestId('subsystem-error-sessions')).toBeInTheDocument();
    expect(screen.getByText('Sessions unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/An error occurred loading this section/)
    ).toBeInTheDocument();
  });

  it('shows retry button in fallback UI', () => {
    render(
      <SubsystemErrorBoundary subsystemName="Camera Health">
        <ThrowingChild />
      </SubsystemErrorBoundary>
    );

    expect(screen.getByTestId('subsystem-retry-button')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('retry button resets boundary and re-renders children', async () => {
    // Use a mutable ref to control whether the child throws
    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div data-testid="child-content">Recovered</div>;
    }

    const { user } = render(
      <SubsystemErrorBoundary subsystemName="Sessions">
        <ConditionalThrower />
      </SubsystemErrorBoundary>
    );

    // Error boundary should show fallback
    expect(screen.getByTestId('subsystem-error-sessions')).toBeInTheDocument();

    // Fix the child so it won't throw on retry
    shouldThrow = false;

    // Click retry
    await user.click(screen.getByTestId('subsystem-retry-button'));

    // Should re-render children successfully
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('calls onError callback when error is caught', () => {
    const onError = vi.fn();

    render(
      <SubsystemErrorBoundary subsystemName="Evidence" onError={onError}>
        <ThrowingChild />
      </SubsystemErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('generates correct data-testid from multi-word subsystem name', () => {
    render(
      <SubsystemErrorBoundary subsystemName="Evidence & Analysis">
        <ThrowingChild />
      </SubsystemErrorBoundary>
    );

    expect(
      screen.getByTestId('subsystem-error-evidence-&-analysis')
    ).toBeInTheDocument();
  });

  it('does not affect sibling components when one subsystem errors', () => {
    render(
      <div>
        <SubsystemErrorBoundary subsystemName="Broken">
          <ThrowingChild />
        </SubsystemErrorBoundary>
        <SubsystemErrorBoundary subsystemName="Working">
          <div data-testid="working-child">I am fine</div>
        </SubsystemErrorBoundary>
      </div>
    );

    // Broken subsystem shows error
    expect(screen.getByTestId('subsystem-error-broken')).toBeInTheDocument();
    // Working subsystem renders normally
    expect(screen.getByTestId('working-child')).toBeInTheDocument();
    expect(screen.getByText('I am fine')).toBeInTheDocument();
  });
});
