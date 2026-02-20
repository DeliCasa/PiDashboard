import { describe, it, expect } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { CameraHealthCard } from '@/presentation/components/operations/CameraHealthCard';
import type { CameraDiagnostics } from '@/domain/types/camera-diagnostics';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const onlineCameraFull: CameraDiagnostics = {
  camera_id: 'espcam-A1B2C3',
  name: 'Front Door Camera',
  status: 'online',
  last_seen: new Date(Date.now() - 120_000).toISOString(), // 2 minutes ago
  ip_address: '192.168.10.50',
  mac_address: 'AA:BB:CC:DD:EE:FF',
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
  last_seen: new Date(Date.now() - 3_600_000).toISOString(), // 1 hour ago
  diagnostics: {
    connection_quality: 'poor',
    error_count: 0,
  },
};

const cameraWithErrors: CameraDiagnostics = {
  camera_id: 'espcam-G7H8I9',
  name: 'Back Entrance Camera',
  status: 'online',
  last_seen: new Date(Date.now() - 30_000).toISOString(), // 30 seconds ago
  health: {
    heap: 42000,
    wifi_rssi: -72,
    uptime: 3600,
  },
  diagnostics: {
    connection_quality: 'fair',
    error_count: 3,
    last_error: 'Connection timeout',
    last_error_time: new Date(Date.now() - 60_000).toISOString(),
    firmware_version: '2.0.1',
    resolution: '640x480',
    avg_capture_time_ms: 320,
  },
};

const cameraWithoutDiagnostics: CameraDiagnostics = {
  camera_id: 'espcam-J0K1L2',
  name: 'New Camera',
  status: 'discovered',
  last_seen: new Date(Date.now() - 5_000).toISOString(), // 5 seconds ago
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CameraHealthCard', () => {
  describe('rendering', () => {
    it('should render camera name and ID', () => {
      render(<CameraHealthCard camera={onlineCameraFull} />);

      expect(screen.getByText('Front Door Camera')).toBeInTheDocument();

      const idElement = screen.getByText('espcam-A1B2C3');
      expect(idElement).toBeInTheDocument();
      expect(idElement).toHaveClass('font-mono');
    });

    it('should show correct status badge for online camera', () => {
      render(<CameraHealthCard camera={onlineCameraFull} />);

      const badge = screen.getByTestId('camera-status-badge');
      expect(badge).toHaveTextContent('online');
    });

    it('should show destructive variant badge for offline camera', () => {
      render(<CameraHealthCard camera={offlineCamera} />);

      const badge = screen.getByTestId('camera-status-badge');
      expect(badge).toHaveTextContent('offline');
    });

    it('should show last-seen relative time', () => {
      render(<CameraHealthCard camera={onlineCameraFull} />);

      const lastSeen = screen.getByTestId('camera-last-seen');
      expect(lastSeen).toBeInTheDocument();
      expect(lastSeen.textContent).toContain('Last seen:');
      expect(lastSeen.textContent).not.toBe('');
    });
  });

  describe('connection quality', () => {
    it('should show ConnectionQualityBadge when diagnostics.connection_quality is present', () => {
      render(<CameraHealthCard camera={onlineCameraFull} />);

      const qualityBadge = screen.getByTestId('connection-quality-badge');
      expect(qualityBadge).toBeInTheDocument();
      expect(qualityBadge).toHaveAttribute('data-quality', 'excellent');
    });

    it('should not show connection quality badge when no diagnostics or RSSI', () => {
      render(<CameraHealthCard camera={cameraWithoutDiagnostics} />);

      expect(screen.queryByTestId('connection-quality-badge')).not.toBeInTheDocument();
    });
  });

  describe('error info', () => {
    it('should show error info when diagnostics.error_count > 0', () => {
      render(<CameraHealthCard camera={cameraWithErrors} />);

      const errorInfo = screen.getByTestId('camera-error-info');
      expect(errorInfo).toBeInTheDocument();
      expect(errorInfo).toHaveTextContent('3 errors');
      expect(errorInfo).toHaveTextContent('Connection timeout');
    });

    it('should not show error info when error_count is 0', () => {
      render(<CameraHealthCard camera={onlineCameraFull} />);

      expect(screen.queryByTestId('camera-error-info')).not.toBeInTheDocument();
    });

    it('should not show error info when diagnostics are absent', () => {
      render(<CameraHealthCard camera={cameraWithoutDiagnostics} />);

      expect(screen.queryByTestId('camera-error-info')).not.toBeInTheDocument();
    });
  });

  describe('diagnostics availability', () => {
    it('should show "Diagnostics not available" when no diagnostics object', () => {
      render(<CameraHealthCard camera={cameraWithoutDiagnostics} />);

      expect(screen.getByText('Diagnostics not available')).toBeInTheDocument();
    });

    it('should show diagnostics toggle when diagnostics are present', () => {
      render(<CameraHealthCard camera={onlineCameraFull} />);

      expect(screen.getByTestId('camera-diagnostics-toggle')).toBeInTheDocument();
      expect(screen.queryByText('Diagnostics not available')).not.toBeInTheDocument();
    });
  });

  describe('expandable diagnostics section', () => {
    it('should expand diagnostics on toggle click', async () => {
      const user = userEvent.setup();
      render(<CameraHealthCard camera={onlineCameraFull} />);

      expect(screen.queryByText('2.1.0')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('camera-diagnostics-toggle'));

      expect(screen.getByText('2.1.0')).toBeInTheDocument();
      expect(screen.getByText('1280x720')).toBeInTheDocument();
      expect(screen.getByText('150ms')).toBeInTheDocument();
    });

    it('should show IP and MAC in expanded diagnostics', async () => {
      const user = userEvent.setup();
      render(<CameraHealthCard camera={onlineCameraFull} />);

      await user.click(screen.getByTestId('camera-diagnostics-toggle'));

      expect(screen.getByText('192.168.10.50')).toBeVisible();
      expect(screen.getByText('AA:BB:CC:DD:EE:FF')).toBeVisible();
    });

    it('should collapse diagnostics on second toggle click', async () => {
      const user = userEvent.setup();
      render(<CameraHealthCard camera={onlineCameraFull} />);

      await user.click(screen.getByTestId('camera-diagnostics-toggle'));
      expect(screen.getByText('2.1.0')).toBeInTheDocument();

      await user.click(screen.getByTestId('camera-diagnostics-toggle'));
      expect(screen.queryByText('2.1.0')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have yellow border for offline camera', () => {
      render(<CameraHealthCard camera={offlineCamera} />);

      const card = screen.getByTestId('camera-health-card');
      expect(card).toHaveClass('border-yellow-500/50');
    });

    it('should not have yellow border for online camera', () => {
      render(<CameraHealthCard camera={onlineCameraFull} />);

      const card = screen.getByTestId('camera-health-card');
      expect(card).not.toHaveClass('border-yellow-500/50');
    });

    it('should have dashed border for discovered camera', () => {
      render(<CameraHealthCard camera={cameraWithoutDiagnostics} />);

      const card = screen.getByTestId('camera-health-card');
      expect(card).toHaveClass('border-dashed');
    });
  });

  // ==========================================================================
  // Feature 058: Staleness badge (T015/T016)
  // ==========================================================================

  describe('staleness badge', () => {
    it('should show Stale badge when online camera not seen for >5 minutes', () => {
      const staleCamera: CameraDiagnostics = {
        ...onlineCameraFull,
        last_seen: new Date(Date.now() - 6 * 60_000).toISOString(), // 6 minutes ago
      };

      render(<CameraHealthCard camera={staleCamera} />);

      expect(screen.getByTestId('camera-stale-badge')).toBeInTheDocument();
      expect(screen.getByTestId('camera-stale-badge')).toHaveTextContent('Stale');
    });

    it('should NOT show Stale badge when camera seen recently (<5 minutes)', () => {
      render(<CameraHealthCard camera={onlineCameraFull} />);

      expect(screen.queryByTestId('camera-stale-badge')).not.toBeInTheDocument();
    });

    it('should NOT show Stale badge for offline camera even if stale', () => {
      render(<CameraHealthCard camera={offlineCamera} />);

      expect(screen.queryByTestId('camera-stale-badge')).not.toBeInTheDocument();
    });

    it('offline camera is visually distinct from discovered camera', () => {
      const { unmount } = render(<CameraHealthCard camera={offlineCamera} />);

      const offlineCard = screen.getByTestId('camera-health-card');
      expect(offlineCard).toHaveClass('border-yellow-500/50');
      expect(offlineCard).not.toHaveClass('border-dashed');

      unmount();

      render(<CameraHealthCard camera={cameraWithoutDiagnostics} />);

      const discoveredCard = screen.getByTestId('camera-health-card');
      expect(discoveredCard).toHaveClass('border-dashed');
      expect(discoveredCard).not.toHaveClass('border-yellow-500/50');
    });
  });
});
