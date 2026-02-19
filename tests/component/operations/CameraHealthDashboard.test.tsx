import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import { CameraHealthDashboard } from '@/presentation/components/operations/CameraHealthDashboard';
import type { CameraDiagnostics } from '@/domain/types/camera-diagnostics';

vi.mock('@/application/hooks/useCameraDiagnostics', () => ({
  useCameraDiagnosticsList: vi.fn(),
}));

vi.mock('@/infrastructure/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/infrastructure/api/client')>();
  return {
    ...actual,
    isFeatureUnavailable: vi.fn(() => false),
  };
});

import { useCameraDiagnosticsList } from '@/application/hooks/useCameraDiagnostics';
import { isFeatureUnavailable } from '@/infrastructure/api/client';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const onlineCamera: CameraDiagnostics = {
  camera_id: 'espcam-A1B2C3',
  name: 'Front Door Camera',
  status: 'online',
  last_seen: new Date(Date.now() - 60_000).toISOString(),
  health: {
    heap: 95000,
    wifi_rssi: -45,
    uptime: 86400,
  },
  diagnostics: {
    connection_quality: 'excellent',
    error_count: 0,
    firmware_version: '2.1.0',
    resolution: '1280x720',
    avg_capture_time_ms: 150,
  },
};

const offlineCamera: CameraDiagnostics = {
  camera_id: 'espcam-D4E5F6',
  name: 'Side Window Camera',
  status: 'offline',
  last_seen: new Date(Date.now() - 3_600_000).toISOString(),
  diagnostics: {
    connection_quality: 'poor',
    error_count: 0,
  },
};

const secondOnlineCamera: CameraDiagnostics = {
  camera_id: 'espcam-X9Y8Z7',
  name: 'Back Entrance Camera',
  status: 'online',
  last_seen: new Date(Date.now() - 30_000).toISOString(),
  health: {
    heap: 78000,
    wifi_rssi: -55,
    uptime: 43200,
  },
  diagnostics: {
    connection_quality: 'good',
    error_count: 0,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockHookReturn(overrides: Partial<ReturnType<typeof useCameraDiagnosticsList>>) {
  (useCameraDiagnosticsList as ReturnType<typeof vi.fn>).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CameraHealthDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isFeatureUnavailable as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  describe('loading state', () => {
    it('should show skeleton cards while loading', () => {
      mockHookReturn({ isLoading: true });

      render(<CameraHealthDashboard />);

      expect(screen.getByTestId('camera-health-loading')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show retry button on generic error', () => {
      const error = new Error('Network failure');
      mockHookReturn({ error });

      render(<CameraHealthDashboard />);

      const errorContainer = screen.getByTestId('camera-health-error');
      expect(errorContainer).toBeInTheDocument();
      expect(screen.getByText('Failed to load camera health data.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', async () => {
      const refetch = vi.fn();
      const error = new Error('Network failure');
      mockHookReturn({ error, refetch });

      const { user } = render(<CameraHealthDashboard />);

      await user.click(screen.getByRole('button', { name: /retry/i }));
      expect(refetch).toHaveBeenCalledOnce();
    });

    it('should show graceful degradation message for 404/503 errors', () => {
      const error = Object.assign(new Error('Not Found'), { status: 404 });
      (isFeatureUnavailable as ReturnType<typeof vi.fn>).mockReturnValue(true);
      mockHookReturn({ error });

      render(<CameraHealthDashboard />);

      const errorContainer = screen.getByTestId('camera-health-error');
      expect(errorContainer).toBeInTheDocument();
      expect(
        screen.getByText(/camera health data is not available/i)
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show "No cameras registered" when data is empty', () => {
      mockHookReturn({ data: [] });

      render(<CameraHealthDashboard />);

      expect(screen.getByTestId('camera-health-empty')).toBeInTheDocument();
      expect(screen.getByText('No cameras registered')).toBeInTheDocument();
    });
  });

  describe('data state', () => {
    it('should render camera cards for each camera', () => {
      mockHookReturn({
        data: [onlineCamera, offlineCamera, secondOnlineCamera],
      });

      render(<CameraHealthDashboard />);

      expect(screen.getByText('Front Door Camera')).toBeInTheDocument();
      expect(screen.getByText('Side Window Camera')).toBeInTheDocument();
      expect(screen.getByText('Back Entrance Camera')).toBeInTheDocument();
    });

    it('should show summary with total camera count', () => {
      mockHookReturn({
        data: [onlineCamera, offlineCamera, secondOnlineCamera],
      });

      render(<CameraHealthDashboard />);

      const summary = screen.getByTestId('camera-summary');
      expect(summary).toBeInTheDocument();
      expect(summary).toHaveTextContent('3 cameras');
    });

    it('should show online count in summary', () => {
      mockHookReturn({
        data: [onlineCamera, offlineCamera, secondOnlineCamera],
      });

      render(<CameraHealthDashboard />);

      const summary = screen.getByTestId('camera-summary');
      expect(summary).toHaveTextContent('2 online');
    });

    it('should show offline count in summary when cameras are offline', () => {
      mockHookReturn({
        data: [onlineCamera, offlineCamera, secondOnlineCamera],
      });

      render(<CameraHealthDashboard />);

      const summary = screen.getByTestId('camera-summary');
      expect(summary).toHaveTextContent('1 offline');
    });

    it('should not show offline badge when all cameras are online', () => {
      mockHookReturn({
        data: [onlineCamera, secondOnlineCamera],
      });

      render(<CameraHealthDashboard />);

      const summary = screen.getByTestId('camera-summary');
      expect(summary).not.toHaveTextContent('offline');
    });

    it('should use singular "camera" for single camera', () => {
      mockHookReturn({ data: [onlineCamera] });

      render(<CameraHealthDashboard />);

      const summary = screen.getByTestId('camera-summary');
      expect(summary).toHaveTextContent('1 camera');
      expect(summary).not.toHaveTextContent('1 cameras');
    });
  });
});
