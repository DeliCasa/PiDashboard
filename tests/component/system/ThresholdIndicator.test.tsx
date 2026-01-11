/**
 * ThresholdIndicator Component Tests (T055, T041)
 * Tests for threshold status indicator with color coding
 *
 * Feature: 005-testing-research-and-hardening (T041)
 * Updated to use data-testid selectors for reliable test targeting.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import { ThresholdIndicator } from '@/presentation/components/system/ThresholdIndicator';

describe('ThresholdIndicator', () => {
  describe('status labels', () => {
    it('should display "Normal" for normal status', () => {
      render(<ThresholdIndicator status="normal" />);
      // Use data-testid for badge
      expect(screen.getByTestId('threshold-badge-normal')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
    });

    it('should display "Warning" for warning status', () => {
      render(<ThresholdIndicator status="warning" />);
      expect(screen.getByTestId('threshold-badge-warning')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should display "Critical" for critical status', () => {
      render(<ThresholdIndicator status="critical" />);
      expect(screen.getByTestId('threshold-badge-critical')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });
  });

  describe('color coding', () => {
    it('should apply green colors for normal status', () => {
      render(<ThresholdIndicator status="normal" />);

      // Use data-testid for badge, check classes
      const badge = screen.getByTestId('threshold-badge-normal');
      expect(badge.className).toMatch(/bg-green/);
    });

    it('should apply yellow colors for warning status', () => {
      render(<ThresholdIndicator status="warning" />);

      const badge = screen.getByTestId('threshold-badge-warning');
      expect(badge.className).toMatch(/bg-yellow/);
    });

    it('should apply red colors for critical status', () => {
      render(<ThresholdIndicator status="critical" />);

      const badge = screen.getByTestId('threshold-badge-critical');
      expect(badge.className).toMatch(/bg-red/);
    });
  });

  describe('dot indicator', () => {
    it('should render dot indicator inside badge', () => {
      render(<ThresholdIndicator status="normal" />);

      // Use data-testid to find badge, then check for dot
      const badge = screen.getByTestId('threshold-badge-normal');
      const dot = badge.querySelector('span.bg-green-500');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveClass('rounded-full');
    });

    it('should render only dot when showLabel is false', () => {
      render(<ThresholdIndicator status="normal" showLabel={false} />);

      expect(screen.queryByText('Normal')).not.toBeInTheDocument();
      // Use data-testid for dot-only mode
      const dot = screen.getByTestId('threshold-dot-normal');
      expect(dot).toBeInTheDocument();
    });

    it('should animate dot (pulse) when label is hidden', () => {
      render(<ThresholdIndicator status="warning" showLabel={false} />);

      const dot = screen.getByTestId('threshold-dot-warning');
      expect(dot).toHaveClass('animate-pulse');
    });
  });

  describe('size variants', () => {
    it('should apply small size for dot-only mode', () => {
      render(<ThresholdIndicator status="normal" showLabel={false} size="sm" />);

      const dot = screen.getByTestId('threshold-dot-normal');
      expect(dot).toHaveClass('h-2', 'w-2');
    });

    it('should apply medium size by default', () => {
      render(<ThresholdIndicator status="normal" showLabel={false} size="md" />);

      const dot = screen.getByTestId('threshold-dot-normal');
      expect(dot).toHaveClass('h-3', 'w-3');
    });

    it('should apply large size', () => {
      render(<ThresholdIndicator status="normal" showLabel={false} size="lg" />);

      const dot = screen.getByTestId('threshold-dot-normal');
      expect(dot).toHaveClass('h-4', 'w-4');
    });
  });

  describe('badge styling', () => {
    it('should render as Badge component with outline variant', () => {
      render(<ThresholdIndicator status="normal" />);

      // Use data-testid for badge, check border class
      const badge = screen.getByTestId('threshold-badge-normal');
      expect(badge.className).toMatch(/border/);
    });

    it('should include border color matching status', () => {
      render(<ThresholdIndicator status="warning" />);

      const badge = screen.getByTestId('threshold-badge-warning');
      expect(badge.className).toMatch(/border-yellow/);
    });
  });

  describe('custom className', () => {
    it('should apply custom className to badge mode', () => {
      render(
        <ThresholdIndicator
          status="normal"
          className="my-custom-class"
        />
      );

      // Use data-testid for badge
      const badge = screen.getByTestId('threshold-badge-normal');
      expect(badge).toHaveClass('my-custom-class');
    });

    it('should apply custom className to dot-only mode', () => {
      render(
        <ThresholdIndicator
          status="normal"
          showLabel={false}
          className="my-dot-class"
        />
      );

      const dot = screen.getByTestId('threshold-dot-normal');
      expect(dot).toHaveClass('my-dot-class');
    });
  });

  describe('all statuses render correctly', () => {
    const statuses = ['normal', 'warning', 'critical'] as const;

    it.each(statuses)('should render %s status without errors', (status) => {
      const { container } = render(<ThresholdIndicator status={status} />);
      expect(container).toBeInTheDocument();
    });

    it.each(statuses)('should render %s status in dot-only mode', (status) => {
      const { container } = render(
        <ThresholdIndicator status={status} showLabel={false} />
      );
      expect(container).toBeInTheDocument();
    });
  });
});
