/**
 * DiagnosticsSection Component Tests
 * Feature: 038-dev-observability-panels (T015)
 *
 * Tests for main diagnostics section with health cards.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { DiagnosticsSection } from '@/presentation/components/diagnostics/DiagnosticsSection';
import * as useDiagnosticsModule from '@/application/hooks/useDiagnostics';
import {
  allServicesHealthy,
  mixedServicesHealth,
} from '../../mocks/diagnostics/health-fixtures';

// Mock the hooks
vi.mock('@/application/hooks/useDiagnostics', async () => {
  const actual = await vi.importActual('@/application/hooks/useDiagnostics');
  return {
    ...actual,
    useHealthChecks: vi.fn(),
    useRefreshHealthChecks: vi.fn(() => ({
      refresh: vi.fn(),
      isRefreshing: false,
    })),
  };
});

describe('DiagnosticsSection', () => {
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDiagnosticsModule.useRefreshHealthChecks).mockReturnValue({
      refresh: mockRefresh,
      isRefreshing: false,
    });
  });

  describe('loading state', () => {
    it('should show skeleton loaders when loading', () => {
      vi.mocked(useDiagnosticsModule.useHealthChecks).mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: 0,
      } as unknown as ReturnType<typeof useDiagnosticsModule.useHealthChecks>);

      render(<DiagnosticsSection />);

      // Should have the diagnostics section container
      expect(screen.getByTestId('diagnostics-section')).toBeInTheDocument();

      // Should show title
      expect(screen.getByText('DEV Diagnostics')).toBeInTheDocument();
    });
  });

  describe('successful data', () => {
    it('should display all three service health cards', () => {
      vi.mocked(useDiagnosticsModule.useHealthChecks).mockReturnValue({
        data: {
          services: allServicesHealthy,
          last_refresh: new Date().toISOString(),
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useDiagnosticsModule.useHealthChecks>);

      render(<DiagnosticsSection />);

      expect(screen.getByTestId('service-health-card-bridgeserver')).toBeInTheDocument();
      expect(screen.getByTestId('service-health-card-piorchestrator')).toBeInTheDocument();
      expect(screen.getByTestId('service-health-card-minio')).toBeInTheDocument();
    });

    it('should show overall healthy badge when all services healthy', () => {
      vi.mocked(useDiagnosticsModule.useHealthChecks).mockReturnValue({
        data: {
          services: allServicesHealthy,
          last_refresh: new Date().toISOString(),
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useDiagnosticsModule.useHealthChecks>);

      render(<DiagnosticsSection />);

      const overallBadge = screen.getByTestId('overall-health-badge');
      expect(overallBadge).toHaveTextContent('All Systems Healthy');
    });

    it('should show issues detected badge when services unhealthy', () => {
      vi.mocked(useDiagnosticsModule.useHealthChecks).mockReturnValue({
        data: {
          services: mixedServicesHealth,
          last_refresh: new Date().toISOString(),
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useDiagnosticsModule.useHealthChecks>);

      render(<DiagnosticsSection />);

      const overallBadge = screen.getByTestId('overall-health-badge');
      expect(overallBadge).toHaveTextContent('Issues Detected');
    });
  });

  describe('refresh functionality', () => {
    it('should call refresh when refresh button clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(useDiagnosticsModule.useHealthChecks).mockReturnValue({
        data: {
          services: allServicesHealthy,
          last_refresh: new Date().toISOString(),
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useDiagnosticsModule.useHealthChecks>);

      render(<DiagnosticsSection />);

      const refreshButton = screen.getByTestId('refresh-health');
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should disable refresh button when fetching', () => {
      vi.mocked(useDiagnosticsModule.useHealthChecks).mockReturnValue({
        data: {
          services: allServicesHealthy,
          last_refresh: new Date().toISOString(),
        },
        isLoading: false,
        isFetching: true,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useDiagnosticsModule.useHealthChecks>);

      render(<DiagnosticsSection />);

      const refreshButton = screen.getByTestId('refresh-health');
      expect(refreshButton).toBeDisabled();
    });

    it('should show last updated timestamp', () => {
      vi.mocked(useDiagnosticsModule.useHealthChecks).mockReturnValue({
        data: {
          services: allServicesHealthy,
          last_refresh: new Date().toISOString(),
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useDiagnosticsModule.useHealthChecks>);

      render(<DiagnosticsSection />);

      expect(screen.getByTestId('last-updated')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error state for non-feature errors', () => {
      const mockRefetch = vi.fn();
      vi.mocked(useDiagnosticsModule.useHealthChecks).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: new Error('Connection failed'),
        refetch: mockRefetch,
        dataUpdatedAt: 0,
      } as unknown as ReturnType<typeof useDiagnosticsModule.useHealthChecks>);

      render(<DiagnosticsSection />);

      expect(screen.getByText(/Failed to fetch health status/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('should call refetch when retry clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      vi.mocked(useDiagnosticsModule.useHealthChecks).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: new Error('Connection failed'),
        refetch: mockRefetch,
        dataUpdatedAt: 0,
      } as unknown as ReturnType<typeof useDiagnosticsModule.useHealthChecks>);

      render(<DiagnosticsSection />);

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('polling indicator', () => {
    it('should show auto-refresh indicator', () => {
      vi.mocked(useDiagnosticsModule.useHealthChecks).mockReturnValue({
        data: {
          services: allServicesHealthy,
          last_refresh: new Date().toISOString(),
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      } as unknown as ReturnType<typeof useDiagnosticsModule.useHealthChecks>);

      render(<DiagnosticsSection />);

      expect(screen.getByText(/Auto-refresh every 5 seconds/)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show message when no health data', () => {
      vi.mocked(useDiagnosticsModule.useHealthChecks).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: 0,
      } as unknown as ReturnType<typeof useDiagnosticsModule.useHealthChecks>);

      render(<DiagnosticsSection />);

      expect(screen.getByText(/No health data available/)).toBeInTheDocument();
    });
  });
});
