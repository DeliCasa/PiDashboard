/**
 * AutoOnboardStatusCard Component Tests
 * Feature: 035-auto-onboard-dashboard
 * Tasks: T011, T019
 *
 * Tests status display, toggle interaction, and disabled states.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutoOnboardStatusCard } from '@/presentation/components/auto-onboard/AutoOnboardStatusCard';
import type { AutoOnboardStatus } from '@/infrastructure/api/v1-auto-onboard';

// Mock next-themes to avoid SSR issues
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock status data
const enabledDevModeStatus: AutoOnboardStatus = {
  enabled: true,
  mode: 'dev',
  running: true,
  config: {
    max_per_minute: 5,
    burst_size: 3,
    subnet_allowlist: ['192.168.1.0/24'],
    verification_timeout_sec: 30,
  },
  metrics: {
    attempts: 10,
    success: 8,
    failed: 1,
    rejected_by_policy: 1,
    already_onboarded: 0,
  },
};

const disabledDevModeStatus: AutoOnboardStatus = {
  enabled: false,
  mode: 'dev',
  config: {
    max_per_minute: 5,
    burst_size: 3,
    subnet_allowlist: ['192.168.1.0/24'],
    verification_timeout_sec: 30,
  },
};

const offModeStatus: AutoOnboardStatus = {
  enabled: false,
  mode: 'off',
  config: {
    max_per_minute: 5,
    burst_size: 3,
    subnet_allowlist: [],
    verification_timeout_sec: 30,
  },
};

describe('AutoOnboardStatusCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Status Display (T011)', () => {
    it('should render with data-testid', () => {
      render(
        <AutoOnboardStatusCard
          status={enabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      expect(screen.getByTestId('auto-onboard-status-card')).toBeInTheDocument();
    });

    it('should display card title', () => {
      render(
        <AutoOnboardStatusCard
          status={enabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      expect(screen.getByText('Auto-Onboard')).toBeInTheDocument();
    });

    it('should display description', () => {
      render(
        <AutoOnboardStatusCard
          status={enabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      expect(screen.getByText('Automatic ESP-CAM device discovery')).toBeInTheDocument();
    });

    it('should show "Running" badge when enabled and running', () => {
      render(
        <AutoOnboardStatusCard
          status={enabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      expect(screen.getByTestId('status-badge')).toHaveTextContent('Running');
    });

    it('should show "Enabled" badge when enabled but not running', () => {
      const status = { ...enabledDevModeStatus, running: false };
      render(
        <AutoOnboardStatusCard
          status={status}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      expect(screen.getByTestId('status-badge')).toHaveTextContent('Enabled');
    });

    it('should show "Disabled" badge when disabled', () => {
      render(
        <AutoOnboardStatusCard
          status={disabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      expect(screen.getByTestId('status-badge')).toHaveTextContent('Disabled');
    });
  });

  describe('Toggle Interaction (T019)', () => {
    it('should have toggle switch with data-testid', () => {
      render(
        <AutoOnboardStatusCard
          status={enabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      expect(screen.getByTestId('auto-onboard-toggle')).toBeInTheDocument();
    });

    it('should call onToggle when switch is clicked', () => {
      const onToggle = vi.fn();
      render(
        <AutoOnboardStatusCard
          status={disabledDevModeStatus}
          onToggle={onToggle}
          isToggling={false}
        />
      );

      const toggle = screen.getByTestId('auto-onboard-toggle');
      fireEvent.click(toggle);

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('should call onToggle with false when disabling', () => {
      const onToggle = vi.fn();
      render(
        <AutoOnboardStatusCard
          status={enabledDevModeStatus}
          onToggle={onToggle}
          isToggling={false}
        />
      );

      const toggle = screen.getByTestId('auto-onboard-toggle');
      fireEvent.click(toggle);

      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('should show loading indicator when toggling', () => {
      render(
        <AutoOnboardStatusCard
          status={enabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={true}
        />
      );
      expect(screen.getByTestId('toggle-loading')).toBeInTheDocument();
    });

    it('should disable switch while toggling', () => {
      render(
        <AutoOnboardStatusCard
          status={enabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={true}
        />
      );
      const toggle = screen.getByTestId('auto-onboard-toggle');
      expect(toggle).toHaveAttribute('data-disabled', '');
    });
  });

  describe('Mode Restrictions', () => {
    it('should disable toggle when mode is off', () => {
      render(
        <AutoOnboardStatusCard
          status={offModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      const toggle = screen.getByTestId('auto-onboard-toggle');
      expect(toggle).toHaveAttribute('data-disabled', '');
    });

    it('should show mode not available message when mode is off', () => {
      render(
        <AutoOnboardStatusCard
          status={offModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      expect(screen.getByTestId('mode-not-available')).toBeInTheDocument();
      expect(screen.getByText(/requires DEV mode/)).toBeInTheDocument();
    });

    it('should not show mode restriction message in dev mode', () => {
      render(
        <AutoOnboardStatusCard
          status={enabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      expect(screen.queryByTestId('mode-not-available')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on toggle', () => {
      render(
        <AutoOnboardStatusCard
          status={disabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      const toggle = screen.getByTestId('auto-onboard-toggle');
      expect(toggle).toHaveAttribute('aria-label', 'Enable auto-onboard');
    });

    it('should have proper aria-label when enabled', () => {
      render(
        <AutoOnboardStatusCard
          status={enabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      const toggle = screen.getByTestId('auto-onboard-toggle');
      expect(toggle).toHaveAttribute('aria-label', 'Disable auto-onboard');
    });

    it('should have label for toggle', () => {
      render(
        <AutoOnboardStatusCard
          status={disabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      expect(screen.getByText('Enable Auto-Onboard')).toBeInTheDocument();
    });

    it('should show disable label when enabled', () => {
      render(
        <AutoOnboardStatusCard
          status={enabledDevModeStatus}
          onToggle={vi.fn()}
          isToggling={false}
        />
      );
      expect(screen.getByText('Disable Auto-Onboard')).toBeInTheDocument();
    });
  });
});
