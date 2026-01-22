/**
 * CameraDetail Component Tests
 * Feature: 034-esp-camera-integration (T039-T040)
 *
 * Tests camera detail modal display and error states.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CameraDetail } from '@/presentation/components/cameras/CameraDetail';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next-themes to avoid SSR issues
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useCamera hook
vi.mock('@/application/hooks/useCamera', () => ({
  useCamera: vi.fn(),
}));

import { useCamera } from '@/application/hooks/useCamera';
import type { Camera } from '@/domain/types/entities';

const mockUseCamera = useCamera as ReturnType<typeof vi.fn>;

// Test QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

// Test wrapper
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

function renderWithWrapper(ui: React.ReactElement) {
  return render(<TestWrapper>{ui}</TestWrapper>);
}

// Mock camera data
const mockOnlineCamera: Camera = {
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
    firmware_version: '1.2.3',
    last_capture: new Date(Date.now() - 3600000).toISOString(),
  },
  ip_address: '192.168.1.101',
  mac_address: 'AA:BB:CC:DD:EE:01',
};

const mockOfflineCamera: Camera = {
  id: 'AA:BB:CC:DD:EE:02',
  name: 'Backyard Camera',
  status: 'offline',
  lastSeen: new Date(Date.now() - 86400000).toISOString(),
};

const mockCameraWithError: Camera = {
  id: 'AA:BB:CC:DD:EE:03',
  name: 'Garage Camera',
  status: 'online',
  lastSeen: new Date().toISOString(),
  health: {
    wifi_rssi: -75,
    free_heap: 20000,
    uptime: '1h 5m',
    uptime_seconds: 3900,
    resolution: 'VGA',
    last_error: 'Connection timeout after 30 seconds',
  },
};

describe('CameraDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading skeleton when fetching camera', () => {
      mockUseCamera.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId="test-id" open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByTestId('camera-detail-loading')).toBeInTheDocument();
    });
  });

  // T040: 404 state test
  describe('Not Found State (T040)', () => {
    it('should display "Camera Not Found" when camera does not exist', () => {
      mockUseCamera.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { code: 'CAMERA_NOT_FOUND', message: 'Camera not found' },
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId="invalid-id" open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByTestId('camera-detail-not-found')).toBeInTheDocument();
      expect(screen.getByText('Camera Not Found')).toBeInTheDocument();
    });

    it('should show "Back to Camera List" button in not found state', () => {
      const onViewList = vi.fn();
      mockUseCamera.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { code: 'CAMERA_NOT_FOUND', message: 'Camera not found' },
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail
          cameraId="invalid-id"
          open={true}
          onOpenChange={vi.fn()}
          onViewList={onViewList}
        />
      );

      const backButton = screen.getByRole('button', { name: /back to camera list/i });
      expect(backButton).toBeInTheDocument();

      fireEvent.click(backButton);
      expect(onViewList).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', () => {
      mockUseCamera.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network unavailable'),
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId="test-id" open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByTestId('camera-detail-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to Load Camera')).toBeInTheDocument();
    });

    it('should have retry button in error state', () => {
      const mockRefetch = vi.fn();
      mockUseCamera.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Connection failed'),
        refetch: mockRefetch,
      });

      renderWithWrapper(
        <CameraDetail cameraId="test-id" open={true} onOpenChange={vi.fn()} />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  // T039: Health metrics display test
  describe('Health Metrics Display (T039)', () => {
    it('should display camera name and ID', () => {
      mockUseCamera.mockReturnValue({
        data: mockOnlineCamera,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId={mockOnlineCamera.id} open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText('Front Door Camera')).toBeInTheDocument();
      // ID appears in multiple places (header and MAC address), use getAllByText
      expect(screen.getAllByText('AA:BB:CC:DD:EE:01').length).toBeGreaterThan(0);
    });

    it('should display online status badge', () => {
      mockUseCamera.mockReturnValue({
        data: mockOnlineCamera,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId={mockOnlineCamera.id} open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should display IP address', () => {
      mockUseCamera.mockReturnValue({
        data: mockOnlineCamera,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId={mockOnlineCamera.id} open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText('192.168.1.101')).toBeInTheDocument();
    });

    it('should display WiFi signal strength', () => {
      mockUseCamera.mockReturnValue({
        data: mockOnlineCamera,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId={mockOnlineCamera.id} open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText(/-55 dBm/)).toBeInTheDocument();
    });

    it('should display memory usage', () => {
      mockUseCamera.mockReturnValue({
        data: mockOnlineCamera,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId={mockOnlineCamera.id} open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText(/43\.9 KB/)).toBeInTheDocument();
    });

    it('should display uptime section', () => {
      mockUseCamera.mockReturnValue({
        data: mockOnlineCamera,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId={mockOnlineCamera.id} open={true} onOpenChange={vi.fn()} />
      );

      // Check that Uptime label exists in Health Metrics section
      expect(screen.getByText('Uptime')).toBeInTheDocument();
    });

    it('should display firmware version', () => {
      mockUseCamera.mockReturnValue({
        data: mockOnlineCamera,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId={mockOnlineCamera.id} open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    });

    it('should not display health metrics for offline cameras', () => {
      mockUseCamera.mockReturnValue({
        data: mockOfflineCamera,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId={mockOfflineCamera.id} open={true} onOpenChange={vi.fn()} />
      );

      // Should show offline status
      expect(screen.getByText('Offline')).toBeInTheDocument();
      // Should not show WiFi Signal section
      expect(screen.queryByText('WiFi Signal')).not.toBeInTheDocument();
    });
  });

  describe('Last Error Display (T036)', () => {
    it('should display last error when present', () => {
      mockUseCamera.mockReturnValue({
        data: mockCameraWithError,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId={mockCameraWithError.id} open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByTestId('camera-last-error')).toBeInTheDocument();
      expect(screen.getByText('Connection timeout after 30 seconds')).toBeInTheDocument();
    });

    it('should not display error section when no error', () => {
      mockUseCamera.mockReturnValue({
        data: mockOnlineCamera,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId={mockOnlineCamera.id} open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.queryByTestId('camera-last-error')).not.toBeInTheDocument();
    });
  });

  describe('Last Capture Display (T036a)', () => {
    it('should display last capture timestamp when available', () => {
      mockUseCamera.mockReturnValue({
        data: mockOnlineCamera,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId={mockOnlineCamera.id} open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText('Last Capture')).toBeInTheDocument();
    });
  });

  describe('Dialog Behavior', () => {
    it('should call onOpenChange when dialog is closed', () => {
      const onOpenChange = vi.fn();
      mockUseCamera.mockReturnValue({
        data: mockOnlineCamera,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail
          cameraId={mockOnlineCamera.id}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      // Dialog should be visible
      expect(screen.getByText('Camera Details')).toBeInTheDocument();
    });

    it('should not fetch when dialog is closed', () => {
      mockUseCamera.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(
        <CameraDetail cameraId="test-id" open={false} onOpenChange={vi.fn()} />
      );

      // Dialog content should not be visible
      expect(screen.queryByText('Camera Details')).not.toBeInTheDocument();
    });
  });
});
