/**
 * MetricCard Component Tests (T034, T040)
 * Tests for system metric display with status indicators
 *
 * Feature: 005-testing-research-and-hardening (T040)
 * Updated to use data-testid selectors for reliable test targeting.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import { MetricCard } from '@/presentation/components/system/MetricCard';
import { Cpu, HardDrive, Thermometer, MemoryStick } from 'lucide-react';

describe('MetricCard', () => {
  describe('rendering', () => {
    it('should display label and value', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU Usage"
          value={45.5}
        />
      );

      // Use data-testid for reliable selectors
      expect(screen.getByTestId('metric-card-cpu-usage')).toBeInTheDocument();
      expect(screen.getByTestId('metric-label')).toHaveTextContent('CPU Usage');
      expect(screen.getByTestId('metric-value')).toHaveTextContent('45.5%');
    });

    it('should display with custom unit', () => {
      render(
        <MetricCard
          icon={Thermometer}
          label="Temperature"
          value={52.3}
          unit="°C"
        />
      );

      expect(screen.getByTestId('metric-value')).toHaveTextContent('52.3°C');
    });

    it('should render the icon', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={50}
        />
      );

      // Use data-testid to find the card container, then check for SVG
      const card = screen.getByTestId('metric-card-cpu');
      expect(card.querySelector('svg')).toBeInTheDocument();
    });

    it('should show progress bar by default', () => {
      render(
        <MetricCard
          icon={MemoryStick}
          label="Memory"
          value={60}
        />
      );

      // Use data-testid for progress element
      expect(screen.getByTestId('metric-progress')).toBeInTheDocument();
    });

    it('should hide progress bar when showProgress is false', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={50}
          showProgress={false}
        />
      );

      expect(screen.queryByTestId('metric-progress')).not.toBeInTheDocument();
    });
  });

  describe('status colors', () => {
    it('should apply green color for normal status', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={30}
          status="normal"
        />
      );

      // Use data-testid for value element
      const value = screen.getByTestId('metric-value');
      expect(value).toHaveClass('text-green-500');
    });

    it('should apply yellow color for warning status', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={75}
          status="warning"
        />
      );

      const value = screen.getByTestId('metric-value');
      expect(value).toHaveClass('text-yellow-500');
    });

    it('should apply red color for critical status', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={95}
          status="critical"
        />
      );

      const value = screen.getByTestId('metric-value');
      expect(value).toHaveClass('text-red-500');
    });

    it('should default to normal status when not specified', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={40}
        />
      );

      const value = screen.getByTestId('metric-value');
      expect(value).toHaveClass('text-green-500');
    });
  });

  describe('progress bar', () => {
    it('should set progress bar value correctly', () => {
      render(
        <MetricCard
          icon={HardDrive}
          label="Disk"
          value={45}
        />
      );

      // Use data-testid for progress bar
      const progress = screen.getByTestId('metric-progress');
      expect(progress).toBeInTheDocument();
      // The indicator moves based on value
      const indicator = progress.querySelector('[data-slot="progress-indicator"]');
      expect(indicator).toHaveStyle({ transform: 'translateX(-55%)' }); // 100 - 45 = 55
    });

    it('should handle custom maxValue for percentage calculation', () => {
      render(
        <MetricCard
          icon={MemoryStick}
          label="Memory"
          value={1024}
          maxValue={2048}
          unit=" MB"
        />
      );

      // 1024/2048 = 50%
      const progress = screen.getByTestId('metric-progress');
      const indicator = progress.querySelector('[data-slot="progress-indicator"]');
      expect(indicator).toHaveStyle({ transform: 'translateX(-50%)' }); // 100 - 50 = 50
    });

    it('should cap progress at 100%', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={120}
          maxValue={100}
        />
      );

      // Should cap at 100%, so translateX should be 0
      const progress = screen.getByTestId('metric-progress');
      const indicator = progress.querySelector('[data-slot="progress-indicator"]');
      expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' });
    });

    it('should apply status color to progress bar', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={80}
          status="warning"
        />
      );

      // Progress bar with warning color - use data-testid
      const progress = screen.getByTestId('metric-progress');
      expect(progress).toHaveClass('[&>div]:bg-yellow-500');
    });
  });

  describe('value formatting', () => {
    it('should format value to one decimal place', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={45.678}
        />
      );

      expect(screen.getByText('45.7%')).toBeInTheDocument();
    });

    it('should display whole numbers with decimal place', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={50}
        />
      );

      expect(screen.getByText('50.0%')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={50}
          className="custom-class"
        />
      );

      // Use data-testid for root container
      const container = screen.getByTestId('metric-card-cpu');
      expect(container).toHaveClass('custom-class');
    });
  });
});
