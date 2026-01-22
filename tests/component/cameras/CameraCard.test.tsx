/**
 * CameraCard Component Tests
 * Feature: 034-esp-camera-integration
 *
 * Tests camera card display, status indicators, and action buttons.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CameraCard } from '@/presentation/components/cameras/CameraCard';
import type { Camera } from '@/domain/types/entities';

// Mock next-themes to avoid SSR issues
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock camera data
const onlineCamera: Camera = {
  id: 'AA:BB:CC:DD:EE:01',
  name: 'Front Door Camera',
  status: 'online',
  lastSeen: new Date().toISOString(),
  health: {
    wifi_rssi: -55,
    free_heap: 45000,
    uptime: '2d 5h 30m',
    uptime_seconds: 193800,
    resolution: 'VGA',
  },
  ip_address: '192.168.1.101',
};

const offlineCamera: Camera = {
  id: 'AA:BB:CC:DD:EE:02',
  name: 'Backyard Camera',
  status: 'offline',
  lastSeen: new Date(Date.now() - 86400000).toISOString(),
};

const errorCamera: Camera = {
  id: 'AA:BB:CC:DD:EE:03',
  name: 'Garage Camera',
  status: 'error',
  lastSeen: new Date().toISOString(),
};

const rebootingCamera: Camera = {
  id: 'AA:BB:CC:DD:EE:04',
  name: 'Side Door Camera',
  status: 'rebooting',
  lastSeen: new Date().toISOString(),
};

describe('CameraCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Camera Display', () => {
    it('should display camera name', () => {
      render(<CameraCard camera={onlineCamera} />);
      expect(screen.getByText('Front Door Camera')).toBeInTheDocument();
    });

    it('should display camera ID', () => {
      render(<CameraCard camera={onlineCamera} />);
      expect(screen.getByText(/AA:BB:CC:DD:EE:01/)).toBeInTheDocument();
    });

    it('should display IP address for online cameras', () => {
      render(<CameraCard camera={onlineCamera} />);
      expect(screen.getByText(/192.168.1.101/)).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display "Online" badge for online camera', () => {
      render(<CameraCard camera={onlineCamera} />);
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should display "Offline" badge for offline camera', () => {
      render(<CameraCard camera={offlineCamera} />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should display "Error" badge for error camera', () => {
      render(<CameraCard camera={errorCamera} />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should display "Rebooting" badge for rebooting camera', () => {
      render(<CameraCard camera={rebootingCamera} />);
      expect(screen.getByText('Rebooting')).toBeInTheDocument();
    });

    it('should display last seen for offline cameras', () => {
      render(<CameraCard camera={offlineCamera} />);
      expect(screen.getByText(/Last seen:/)).toBeInTheDocument();
    });
  });

  describe('Health Metrics', () => {
    it('should display WiFi signal strength', () => {
      render(<CameraCard camera={onlineCamera} />);
      expect(screen.getByText('-55 dBm')).toBeInTheDocument();
    });

    it('should display free heap memory', () => {
      render(<CameraCard camera={onlineCamera} />);
      expect(screen.getByText(/43\.9 KB/)).toBeInTheDocument();
    });

    it('should display resolution', () => {
      render(<CameraCard camera={onlineCamera} />);
      expect(screen.getByText('VGA')).toBeInTheDocument();
    });

    it('should not display health metrics for offline cameras', () => {
      render(<CameraCard camera={offlineCamera} />);
      expect(screen.queryByText('dBm')).not.toBeInTheDocument();
    });
  });

  describe('Capture Button', () => {
    it('should have capture button for online camera', () => {
      render(<CameraCard camera={onlineCamera} onCapture={vi.fn()} />);
      expect(screen.getByRole('button', { name: /test capture/i })).toBeInTheDocument();
    });

    it('should call onCapture when capture button is clicked', () => {
      const onCapture = vi.fn();
      render(<CameraCard camera={onlineCamera} onCapture={onCapture} />);

      const captureButton = screen.getByRole('button', { name: /test capture/i });
      fireEvent.click(captureButton);

      expect(onCapture).toHaveBeenCalledTimes(1);
    });

    it('should disable capture button for offline cameras', () => {
      render(<CameraCard camera={offlineCamera} onCapture={vi.fn()} />);

      const captureButton = screen.getByRole('button', { name: /capture unavailable/i });
      expect(captureButton).toBeDisabled();
    });

    it('should show "Capturing..." when isCapturing is true', () => {
      render(<CameraCard camera={onlineCamera} onCapture={vi.fn()} isCapturing={true} />);
      expect(screen.getByText('Capturing...')).toBeInTheDocument();
    });

    it('should disable capture button while capturing', () => {
      render(<CameraCard camera={onlineCamera} onCapture={vi.fn()} isCapturing={true} />);

      // Button shows "Capturing..." text but aria-label is "Test Capture"
      const captureButton = screen.getByRole('button', { name: /test capture/i });
      expect(captureButton).toBeDisabled();
      expect(screen.getByText('Capturing...')).toBeInTheDocument();
    });

    // T027: Tooltip test for offline cameras
    it('should have aria-label indicating capture unavailable for offline cameras', () => {
      render(<CameraCard camera={offlineCamera} onCapture={vi.fn()} />);

      const captureButton = screen.getByRole('button', { name: /capture unavailable - camera offline/i });
      expect(captureButton).toBeInTheDocument();
    });
  });

  describe('Reboot Button', () => {
    it('should have reboot button for online camera', () => {
      render(<CameraCard camera={onlineCamera} onReboot={vi.fn()} />);

      // Reboot button has power icon
      const buttons = screen.getAllByRole('button');
      const rebootButton = buttons.find(btn => btn.getAttribute('aria-label')?.includes('Reboot'));
      expect(rebootButton).toBeInTheDocument();
    });

    it('should call onReboot when reboot button is clicked', () => {
      const onReboot = vi.fn();
      render(<CameraCard camera={onlineCamera} onReboot={onReboot} />);

      const rebootButton = screen.getByRole('button', { name: /reboot camera/i });
      fireEvent.click(rebootButton);

      expect(onReboot).toHaveBeenCalledTimes(1);
    });

    it('should disable reboot button for offline cameras', () => {
      render(<CameraCard camera={offlineCamera} onReboot={vi.fn()} />);

      const rebootButton = screen.getByRole('button', { name: /reboot unavailable/i });
      expect(rebootButton).toBeDisabled();
    });

    it('should disable reboot button while rebooting', () => {
      render(<CameraCard camera={onlineCamera} onReboot={vi.fn()} isRebooting={true} />);

      const rebootButton = screen.getByRole('button', { name: /reboot/i });
      expect(rebootButton).toBeDisabled();
    });

    // T027: Tooltip test for offline cameras
    it('should have aria-label indicating reboot unavailable for offline cameras', () => {
      render(<CameraCard camera={offlineCamera} onReboot={vi.fn()} />);

      const rebootButton = screen.getByRole('button', { name: /reboot unavailable - camera offline/i });
      expect(rebootButton).toBeInTheDocument();
    });
  });

  describe('Status Indicator Strip', () => {
    it('should have green indicator for online camera', () => {
      const { container } = render(<CameraCard camera={onlineCamera} />);
      const indicator = container.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should have red indicator for offline camera', () => {
      const { container } = render(<CameraCard camera={offlineCamera} />);
      const indicator = container.querySelector('.bg-red-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should have yellow indicator for rebooting camera', () => {
      const { container } = render(<CameraCard camera={rebootingCamera} />);
      const indicator = container.querySelector('.bg-yellow-500');
      expect(indicator).toBeInTheDocument();
    });
  });
});
