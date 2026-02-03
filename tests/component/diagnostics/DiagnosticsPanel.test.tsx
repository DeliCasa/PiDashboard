/**
 * DiagnosticsPanel Component Tests
 * Feature: 042-diagnostics-integration (T014)
 *
 * Tests for camera diagnostics panel display.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import { DiagnosticsPanel } from '@/presentation/components/diagnostics/DiagnosticsPanel';
import {
  mockCameraDiagnostics,
  mockCameraDiagnosticsVariants,
  mockConnectionQualityVariants,
} from '../../mocks/diagnostics/fixtures';

describe('DiagnosticsPanel', () => {
  describe('loading state', () => {
    it('should display skeleton when loading', () => {
      render(
        <DiagnosticsPanel
          diagnostics={undefined}
          isLoading={true}
          error={null}
        />
      );

      expect(screen.getByTestId('diagnostics-panel-skeleton')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should display error message when error occurs', () => {
      const error = new Error('Failed to fetch diagnostics');
      render(
        <DiagnosticsPanel
          diagnostics={undefined}
          isLoading={false}
          error={error}
        />
      );

      expect(screen.getByTestId('diagnostics-panel-error')).toBeInTheDocument();
      expect(screen.getByTestId('diagnostics-error-message')).toHaveTextContent(
        'Failed to fetch diagnostics'
      );
    });

    it('should display default error message when error has no message', () => {
      const error = new Error();
      render(
        <DiagnosticsPanel
          diagnostics={undefined}
          isLoading={false}
          error={error}
        />
      );

      expect(screen.getByTestId('diagnostics-error-message')).toHaveTextContent(
        'Failed to load diagnostics'
      );
    });
  });

  describe('empty state', () => {
    it('should display empty message when no diagnostics', () => {
      render(
        <DiagnosticsPanel
          diagnostics={undefined}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('diagnostics-panel-empty')).toBeInTheDocument();
      expect(screen.getByText('No diagnostics data available')).toBeInTheDocument();
    });
  });

  describe('online camera with full diagnostics', () => {
    it('should display camera status badge', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      const badge = screen.getByTestId('camera-status-badge');
      expect(badge).toHaveTextContent('Online');
    });

    it('should display health metrics section', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('health-metrics')).toBeInTheDocument();
    });

    it('should display signal strength with connection quality badge', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('metric-signal')).toBeInTheDocument();
      expect(screen.getByTestId('connection-quality-badge')).toBeInTheDocument();
    });

    it('should display heap memory', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('metric-heap')).toBeInTheDocument();
      // 127700 bytes = ~127.7 KB
      expect(screen.getByTestId('metric-heap')).toHaveTextContent('128 KB');
    });

    it('should display uptime', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('metric-uptime')).toBeInTheDocument();
      // 3600 seconds = 1h
      expect(screen.getByTestId('metric-uptime')).toHaveTextContent('1h');
    });

    it('should display frame rate when available', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('metric-framerate')).toBeInTheDocument();
      expect(screen.getByTestId('metric-framerate')).toHaveTextContent('25 fps');
    });

    it('should display extended diagnostics section', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('extended-diagnostics')).toBeInTheDocument();
    });

    it('should display firmware version', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('firmware-version')).toHaveTextContent('1.2.3');
    });

    it('should display resolution', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('resolution')).toHaveTextContent('1280x720');
    });

    it('should display average capture time', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('capture-time')).toHaveTextContent('150ms');
    });

    it('should display IP address', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('ip-address')).toHaveTextContent('192.168.1.100');
    });
  });

  describe('offline camera', () => {
    it('should display offline status badge', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnosticsVariants.offline}
          isLoading={false}
          error={null}
        />
      );

      const badge = screen.getByTestId('camera-status-badge');
      expect(badge).toHaveTextContent('Offline');
    });

    it('should display no health data message', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnosticsVariants.offline}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('no-health-data')).toBeInTheDocument();
      expect(screen.getByText(/Health metrics unavailable/)).toBeInTheDocument();
    });

    it('should not display health metrics section', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnosticsVariants.offline}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.queryByTestId('health-metrics')).not.toBeInTheDocument();
    });
  });

  describe('camera with errors', () => {
    it('should display error status badge', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnosticsVariants.error}
          isLoading={false}
          error={null}
        />
      );

      const badge = screen.getByTestId('camera-status-badge');
      expect(badge).toHaveTextContent('Error');
    });

    it('should display error count', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnosticsVariants.error}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('error-count')).toHaveTextContent('5');
    });

    it('should display last error message', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnosticsVariants.error}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('last-error')).toHaveTextContent('Connection timeout');
    });
  });

  describe('connection quality variants', () => {
    it('should display excellent quality badge', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockConnectionQualityVariants.excellent}
          isLoading={false}
          error={null}
        />
      );

      const badge = screen.getByTestId('connection-quality-badge');
      expect(badge).toHaveAttribute('data-quality', 'excellent');
    });

    it('should display good quality badge', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockConnectionQualityVariants.good}
          isLoading={false}
          error={null}
        />
      );

      const badge = screen.getByTestId('connection-quality-badge');
      expect(badge).toHaveAttribute('data-quality', 'good');
    });

    it('should display fair quality badge', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockConnectionQualityVariants.fair}
          isLoading={false}
          error={null}
        />
      );

      const badge = screen.getByTestId('connection-quality-badge');
      expect(badge).toHaveAttribute('data-quality', 'fair');
    });

    it('should display poor quality badge', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockConnectionQualityVariants.poor}
          isLoading={false}
          error={null}
        />
      );

      const badge = screen.getByTestId('connection-quality-badge');
      expect(badge).toHaveAttribute('data-quality', 'poor');
    });
  });

  describe('camera status variants', () => {
    it.each([
      ['rebooting', 'Rebooting'],
      ['discovered', 'Discovered'],
      ['pairing', 'Pairing'],
      ['connecting', 'Connecting'],
    ] as const)('should display %s status badge', (status, label) => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnosticsVariants[status]}
          isLoading={false}
          error={null}
        />
      );

      const badge = screen.getByTestId('camera-status-badge');
      expect(badge).toHaveTextContent(label);
    });
  });

  describe('accessibility', () => {
    it('should have data-testid on main panel', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByTestId('diagnostics-panel')).toBeInTheDocument();
    });

    it('should have icons with aria-hidden', () => {
      render(
        <DiagnosticsPanel
          diagnostics={mockCameraDiagnostics}
          isLoading={false}
          error={null}
        />
      );

      // Icons should be aria-hidden since they're decorative
      const icons = screen.getByTestId('diagnostics-panel').querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
