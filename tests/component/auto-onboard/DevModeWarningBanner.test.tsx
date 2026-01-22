/**
 * DevModeWarningBanner Component Tests
 * Feature: 035-auto-onboard-dashboard
 * Tasks: T011
 *
 * Tests warning banner display and accessibility.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DevModeWarningBanner } from '@/presentation/components/auto-onboard/DevModeWarningBanner';

// Mock next-themes to avoid SSR issues
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('DevModeWarningBanner', () => {
  describe('Banner Display', () => {
    it('should render with data-testid', () => {
      render(<DevModeWarningBanner />);
      expect(screen.getByTestId('dev-mode-warning-banner')).toBeInTheDocument();
    });

    it('should display DEV MODE Active title', () => {
      render(<DevModeWarningBanner />);
      expect(screen.getByText('DEV MODE Active')).toBeInTheDocument();
    });

    it('should display warning description', () => {
      render(<DevModeWarningBanner />);
      expect(
        screen.getByText(/Auto-onboard is enabled/)
      ).toBeInTheDocument();
    });

    it('should mention development context', () => {
      render(<DevModeWarningBanner />);
      expect(
        screen.getByText(/should only be used during development/)
      ).toBeInTheDocument();
    });

    it('should mention ESP-CAM devices', () => {
      render(<DevModeWarningBanner />);
      expect(
        screen.getByText(/ESP-CAM devices/)
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert"', () => {
      render(<DevModeWarningBanner />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should be accessible via alert role', () => {
      render(<DevModeWarningBanner />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('data-testid', 'dev-mode-warning-banner');
    });
  });

  describe('Styling', () => {
    it('should have warning-style classes', () => {
      render(<DevModeWarningBanner />);
      const banner = screen.getByTestId('dev-mode-warning-banner');
      // Check for amber/warning color classes
      expect(banner.className).toContain('amber');
    });

    it('should accept custom className', () => {
      render(<DevModeWarningBanner className="my-custom-class" />);
      const banner = screen.getByTestId('dev-mode-warning-banner');
      expect(banner.className).toContain('my-custom-class');
    });
  });
});
