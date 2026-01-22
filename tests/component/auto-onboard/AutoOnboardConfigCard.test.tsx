/**
 * AutoOnboardConfigCard Component Tests
 * Feature: 035-auto-onboard-dashboard
 * Tasks: T049
 *
 * Tests config display, collapsible behavior, and read-only badge.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutoOnboardConfigCard } from '@/presentation/components/auto-onboard/AutoOnboardConfigCard';
import type { AutoOnboardConfig } from '@/infrastructure/api/v1-auto-onboard';

// Mock next-themes to avoid SSR issues
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock config data
const mockConfig: AutoOnboardConfig = {
  max_per_minute: 5,
  burst_size: 3,
  subnet_allowlist: ['192.168.1.0/24', '10.0.0.0/8'],
  verification_timeout_sec: 30,
};

const emptySubnetConfig: AutoOnboardConfig = {
  max_per_minute: 10,
  burst_size: 5,
  subnet_allowlist: [],
  verification_timeout_sec: 60,
};

describe('AutoOnboardConfigCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Card Display (T049)', () => {
    it('should render with data-testid', () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);
      expect(screen.getByTestId('auto-onboard-config-card')).toBeInTheDocument();
    });

    it('should display card title', () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    it('should display description', () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);
      expect(screen.getByText('Read-only settings from PiOrchestrator')).toBeInTheDocument();
    });

    it('should display read-only badge', () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);
      expect(screen.getByTestId('read-only-badge')).toBeInTheDocument();
      expect(screen.getByText('Read-only')).toBeInTheDocument();
    });
  });

  describe('Collapsible Behavior', () => {
    it('should be collapsed by default', () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);
      expect(screen.queryByTestId('config-details')).not.toBeInTheDocument();
    });

    it('should expand when header is clicked', async () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);

      const trigger = screen.getByText('Configuration').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('config-details')).toBeInTheDocument();
      });
    });

    it('should collapse when clicked again', async () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);

      const trigger = screen.getByText('Configuration').closest('button');

      // Expand
      fireEvent.click(trigger!);
      await waitFor(() => {
        expect(screen.getByTestId('config-details')).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(trigger!);
      await waitFor(() => {
        expect(screen.queryByTestId('config-details')).not.toBeInTheDocument();
      });
    });
  });

  describe('Config Values Display', () => {
    it('should display max per minute', async () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);

      const trigger = screen.getByText('Configuration').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('config-max-per-minute')).toHaveTextContent('5');
      });
    });

    it('should display burst size', async () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);

      const trigger = screen.getByText('Configuration').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('config-burst-size')).toHaveTextContent('3');
      });
    });

    it('should display verification timeout', async () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);

      const trigger = screen.getByText('Configuration').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('config-timeout')).toHaveTextContent('30s');
      });
    });

    it('should display subnet allowlist', async () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);

      const trigger = screen.getByText('Configuration').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        const subnets = screen.getByTestId('config-subnets');
        expect(subnets).toHaveTextContent('192.168.1.0/24');
        expect(subnets).toHaveTextContent('10.0.0.0/8');
      });
    });

    it('should show empty message when no subnets configured', async () => {
      render(<AutoOnboardConfigCard config={emptySubnetConfig} />);

      const trigger = screen.getByText('Configuration').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByText('No subnets configured')).toBeInTheDocument();
      });
    });
  });

  describe('Different Config Values', () => {
    it('should display different config values correctly', async () => {
      render(<AutoOnboardConfigCard config={emptySubnetConfig} />);

      const trigger = screen.getByText('Configuration').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('config-max-per-minute')).toHaveTextContent('10');
        expect(screen.getByTestId('config-burst-size')).toHaveTextContent('5');
        expect(screen.getByTestId('config-timeout')).toHaveTextContent('60s');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have lock icon in read-only badge', () => {
      render(<AutoOnboardConfigCard config={mockConfig} />);
      const badge = screen.getByTestId('read-only-badge');
      // Badge contains svg with Lock icon
      expect(badge.querySelector('svg')).toBeInTheDocument();
    });
  });
});
