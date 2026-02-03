/**
 * ServiceHealthCard Component Tests
 * Feature: 038-dev-observability-panels (T014)
 *
 * Tests for individual service health card display.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { ServiceHealthCard } from '@/presentation/components/diagnostics/ServiceHealthCard';
import {
  healthyBridgeServerHealth,
  degradedBridgeServerHealth,
  unhealthyBridgeServerHealth,
  healthyPiOrchestratorHealth,
  healthyMinioHealth,
  unknownPiOrchestratorHealth,
} from '../../mocks/diagnostics/health-fixtures';

describe('ServiceHealthCard', () => {
  describe('rendering', () => {
    it('should display service name', () => {
      render(<ServiceHealthCard health={healthyBridgeServerHealth} />);

      expect(screen.getByText('BridgeServer')).toBeInTheDocument();
    });

    it('should display service name for PiOrchestrator', () => {
      render(<ServiceHealthCard health={healthyPiOrchestratorHealth} />);

      expect(screen.getByText('PiOrchestrator')).toBeInTheDocument();
    });

    it('should display service name for MinIO', () => {
      render(<ServiceHealthCard health={healthyMinioHealth} />);

      expect(screen.getByText('MinIO Storage')).toBeInTheDocument();
    });

    it('should have data-testid with service name', () => {
      render(<ServiceHealthCard health={healthyBridgeServerHealth} />);

      expect(screen.getByTestId('service-health-card-bridgeserver')).toBeInTheDocument();
    });
  });

  describe('status badge', () => {
    it('should show healthy badge for healthy status', () => {
      render(<ServiceHealthCard health={healthyBridgeServerHealth} />);

      const badge = screen.getByTestId('service-status-badge');
      expect(badge).toHaveTextContent('Healthy');
    });

    it('should show degraded badge for degraded status', () => {
      render(<ServiceHealthCard health={degradedBridgeServerHealth} />);

      const badge = screen.getByTestId('service-status-badge');
      expect(badge).toHaveTextContent('Degraded');
    });

    it('should show unhealthy badge for unhealthy status', () => {
      render(<ServiceHealthCard health={unhealthyBridgeServerHealth} />);

      const badge = screen.getByTestId('service-status-badge');
      expect(badge).toHaveTextContent('Unhealthy');
    });

    it('should show unknown badge for unknown status', () => {
      render(<ServiceHealthCard health={unknownPiOrchestratorHealth} />);

      const badge = screen.getByTestId('service-status-badge');
      expect(badge).toHaveTextContent('Unknown');
    });
  });

  describe('response time', () => {
    it('should display response time in milliseconds', () => {
      render(<ServiceHealthCard health={healthyBridgeServerHealth} />);

      const responseTime = screen.getByTestId('response-time');
      expect(responseTime).toHaveTextContent('45ms');
    });

    it('should display response time in seconds for slow responses', () => {
      const slowHealth = {
        ...unhealthyBridgeServerHealth,
        response_time_ms: 5000,
      };
      render(<ServiceHealthCard health={slowHealth} />);

      const responseTime = screen.getByTestId('response-time');
      expect(responseTime).toHaveTextContent('5.0s');
    });

    it('should display N/A when response time is undefined', () => {
      const noResponseTime = {
        ...healthyPiOrchestratorHealth,
        response_time_ms: undefined,
      };
      render(<ServiceHealthCard health={noResponseTime} />);

      const responseTime = screen.getByTestId('response-time');
      expect(responseTime).toHaveTextContent('N/A');
    });
  });

  describe('last checked timestamp', () => {
    it('should display last checked time', () => {
      render(<ServiceHealthCard health={healthyBridgeServerHealth} />);

      const lastChecked = screen.getByTestId('last-checked');
      // Should contain a time format (varies by locale)
      expect(lastChecked.textContent).not.toBe('');
    });
  });

  describe('error message', () => {
    it('should display error message when present', () => {
      render(<ServiceHealthCard health={unhealthyBridgeServerHealth} />);

      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveTextContent('Database connection failed');
    });

    it('should not display error message when not present', () => {
      render(<ServiceHealthCard health={healthyBridgeServerHealth} />);

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });

  describe('sub-checks collapsible', () => {
    it('should show toggle button when checks are present', () => {
      render(<ServiceHealthCard health={healthyBridgeServerHealth} />);

      expect(screen.getByTestId('toggle-checks')).toBeInTheDocument();
    });

    it('should not show toggle button when no checks', () => {
      render(<ServiceHealthCard health={healthyPiOrchestratorHealth} />);

      expect(screen.queryByTestId('toggle-checks')).not.toBeInTheDocument();
    });

    it('should expand checks when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<ServiceHealthCard health={healthyBridgeServerHealth} />);

      // Initially collapsed
      expect(screen.queryByTestId('check-database')).not.toBeInTheDocument();

      // Click to expand
      await user.click(screen.getByTestId('toggle-checks'));

      // Should show checks
      expect(screen.getByTestId('check-database')).toBeInTheDocument();
      expect(screen.getByTestId('check-storage')).toBeInTheDocument();
    });

    it('should collapse checks when toggle is clicked again', async () => {
      const user = userEvent.setup();
      render(<ServiceHealthCard health={healthyBridgeServerHealth} />);

      // Expand
      await user.click(screen.getByTestId('toggle-checks'));
      expect(screen.getByTestId('check-database')).toBeInTheDocument();

      // Collapse
      await user.click(screen.getByTestId('toggle-checks'));

      // Checks should be hidden
      expect(screen.queryByTestId('check-database')).not.toBeInTheDocument();
    });

    it('should show healthy check status indicator', async () => {
      const user = userEvent.setup();
      render(<ServiceHealthCard health={healthyBridgeServerHealth} />);

      await user.click(screen.getByTestId('toggle-checks'));

      const databaseCheck = screen.getByTestId('check-database');
      expect(databaseCheck).toBeInTheDocument();
      // Check for SVG icon presence
      expect(databaseCheck.querySelector('svg')).toBeInTheDocument();
    });

    it('should show error check status indicator', async () => {
      const user = userEvent.setup();
      render(<ServiceHealthCard health={degradedBridgeServerHealth} />);

      await user.click(screen.getByTestId('toggle-checks'));

      const storageCheck = screen.getByTestId('check-storage');
      expect(storageCheck).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have destructive border for unhealthy service', () => {
      render(<ServiceHealthCard health={unhealthyBridgeServerHealth} />);

      const card = screen.getByTestId('service-health-card-bridgeserver');
      expect(card).toHaveClass('border-destructive/50');
    });

    it('should have yellow border for degraded service', () => {
      render(<ServiceHealthCard health={degradedBridgeServerHealth} />);

      const card = screen.getByTestId('service-health-card-bridgeserver');
      expect(card).toHaveClass('border-yellow-500/50');
    });

    it('should not have special border for healthy service', () => {
      render(<ServiceHealthCard health={healthyBridgeServerHealth} />);

      const card = screen.getByTestId('service-health-card-bridgeserver');
      expect(card).not.toHaveClass('border-destructive/50');
      expect(card).not.toHaveClass('border-yellow-500/50');
    });
  });
});
