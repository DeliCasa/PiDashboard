/**
 * AutoOnboardMetricsCard Component Tests
 * Feature: 035-auto-onboard-dashboard
 * Tasks: T028
 *
 * Tests metrics display, reset button, and confirmation dialog.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutoOnboardMetricsCard } from '@/presentation/components/auto-onboard/AutoOnboardMetricsCard';
import type { AutoOnboardMetrics } from '@/infrastructure/api/v1-auto-onboard';

// Mock next-themes to avoid SSR issues
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock metrics data
const mockMetrics: AutoOnboardMetrics = {
  attempts: 20,
  success: 15,
  failed: 3,
  rejected_by_policy: 2,
  already_onboarded: 0,
  last_success_at: new Date().toISOString(),
  last_failure_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
};

const emptyMetrics: AutoOnboardMetrics = {
  attempts: 0,
  success: 0,
  failed: 0,
  rejected_by_policy: 0,
  already_onboarded: 0,
};

describe('AutoOnboardMetricsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Metrics Display (T028)', () => {
    it('should render with data-testid', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      expect(screen.getByTestId('auto-onboard-metrics-card')).toBeInTheDocument();
    });

    it('should display card title', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      expect(screen.getByText('Onboarding Metrics')).toBeInTheDocument();
    });

    it('should display success count', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      expect(screen.getByTestId('metric-success')).toHaveTextContent('15');
    });

    it('should display failed count', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      expect(screen.getByTestId('metric-failed')).toHaveTextContent('3');
    });

    it('should display rejected count', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      expect(screen.getByTestId('metric-rejected')).toHaveTextContent('2');
    });

    it('should calculate and display success rate', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      // 15/20 = 75%
      expect(screen.getByTestId('metric-rate')).toHaveTextContent('75%');
    });

    it('should display 0% rate when no attempts', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={emptyMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      expect(screen.getByTestId('metric-rate')).toHaveTextContent('0%');
    });

    it('should display last success timestamp', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      expect(screen.getByTestId('last-success-time')).toBeInTheDocument();
      expect(screen.getByTestId('last-success-time')).toHaveTextContent(/Last success:/);
    });

    it('should display last failure timestamp', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      expect(screen.getByTestId('last-failure-time')).toBeInTheDocument();
      expect(screen.getByTestId('last-failure-time')).toHaveTextContent(/Last failure:/);
    });

    it('should show "Never" for timestamps when not available', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={emptyMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      expect(screen.getByTestId('last-success-time')).toHaveTextContent('Never');
      expect(screen.getByTestId('last-failure-time')).toHaveTextContent('Never');
    });
  });

  describe('Reset Button', () => {
    it('should have reset button with data-testid', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      expect(screen.getByTestId('reset-metrics-button')).toBeInTheDocument();
    });

    it('should disable reset button when no metrics', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={undefined}
          onReset={vi.fn()}
          isResetting={false}
        />
      );
      expect(screen.getByTestId('reset-metrics-button')).toBeDisabled();
    });

    it('should disable reset button while resetting', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={true}
        />
      );
      expect(screen.getByTestId('reset-metrics-button')).toBeDisabled();
    });

    it('should open confirmation dialog on reset button click', async () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );

      const resetButton = screen.getByTestId('reset-metrics-button');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('Reset Metrics?')).toBeInTheDocument();
      });
    });

    it('should show warning text in confirmation dialog', async () => {
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={vi.fn()}
          isResetting={false}
        />
      );

      fireEvent.click(screen.getByTestId('reset-metrics-button'));

      await waitFor(() => {
        expect(screen.getByText(/reset all onboarding counters to zero/)).toBeInTheDocument();
        expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
      });
    });

    it('should call onReset when confirmed', async () => {
      const onReset = vi.fn();
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={onReset}
          isResetting={false}
        />
      );

      fireEvent.click(screen.getByTestId('reset-metrics-button'));

      await waitFor(() => {
        expect(screen.getByText('Reset')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Reset'));

      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('should close dialog without calling onReset when cancelled', async () => {
      const onReset = vi.fn();
      render(
        <AutoOnboardMetricsCard
          metrics={mockMetrics}
          onReset={onReset}
          isResetting={false}
        />
      );

      fireEvent.click(screen.getByTestId('reset-metrics-button'));

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      expect(onReset).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Values', () => {
    it('should show zero values when metrics is undefined', () => {
      render(
        <AutoOnboardMetricsCard
          metrics={undefined}
          onReset={vi.fn()}
          isResetting={false}
        />
      );

      expect(screen.getByTestId('metric-success')).toHaveTextContent('0');
      expect(screen.getByTestId('metric-failed')).toHaveTextContent('0');
      expect(screen.getByTestId('metric-rejected')).toHaveTextContent('0');
      expect(screen.getByTestId('metric-rate')).toHaveTextContent('0%');
    });
  });
});
