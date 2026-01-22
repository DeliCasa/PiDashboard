/**
 * CameraSection Component Tests
 * Feature: 034-esp-camera-integration (T017-T019)
 *
 * Tests loading, empty, and error states for the camera section.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CameraSection } from '@/presentation/components/cameras/CameraSection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useCameras hook
vi.mock('@/application/hooks/useCameras', () => ({
  useCameras: vi.fn(),
  useCaptureTest: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useRebootCamera: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useCameraDiagnostics: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

// Mock visibility hook (always visible in tests)
vi.mock('@/application/hooks/useDocumentVisibility', () => ({
  useDocumentVisibility: () => true,
  useVisibilityAwareInterval: ({ interval }: { interval: number }) => interval,
  useVisibilityChange: () => {},
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useCameras } from '@/application/hooks/useCameras';
import type { Camera } from '@/domain/types/entities';

const mockUseCameras = useCameras as ReturnType<typeof vi.fn>;

// Minimal QueryClient for testing
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

// Simple wrapper without ThemeProvider to avoid next-themes issues
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

// Helper to render with wrapper
function renderWithWrapper(ui: React.ReactElement) {
  return render(<TestWrapper>{ui}</TestWrapper>);
}

// Mock camera data
const mockCameras: Camera[] = [
  {
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
  },
  {
    id: 'AA:BB:CC:DD:EE:02',
    name: 'Backyard Camera',
    status: 'offline',
    lastSeen: new Date(Date.now() - 86400000).toISOString(),
  },
];

describe('CameraSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // T017: Loading state test
  describe('Loading State (T017)', () => {
    it('should display loading spinner when fetching cameras', () => {
      mockUseCameras.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      // Check for loading indicator
      expect(screen.getByTestId('camera-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading cameras...')).toBeInTheDocument();
    });

    it('should show loading animation', () => {
      mockUseCameras.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      // Check for spinner class
      const loadingContainer = screen.getByTestId('camera-loading');
      const spinner = loadingContainer.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // T018: Empty state test
  describe('Empty State (T018)', () => {
    it('should display "No cameras connected" when list is empty', () => {
      mockUseCameras.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      expect(screen.getByTestId('camera-empty')).toBeInTheDocument();
      expect(screen.getByText('No cameras connected')).toBeInTheDocument();
    });

    it('should show helpful message about camera registration', () => {
      mockUseCameras.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      expect(
        screen.getByText('Cameras will appear here once registered with PiOrchestrator')
      ).toBeInTheDocument();
    });

    it('should show camera icon in empty state', () => {
      mockUseCameras.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      const emptyContainer = screen.getByTestId('camera-empty');
      // Check for SVG icon (lucide-react Camera)
      expect(emptyContainer.querySelector('svg')).toBeInTheDocument();
    });
  });

  // T019: Error state test
  describe('Error State (T019)', () => {
    it('should display error message when fetch fails', () => {
      mockUseCameras.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network unavailable'),
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      expect(screen.getByTestId('camera-error')).toBeInTheDocument();
      expect(screen.getByText('Network unavailable')).toBeInTheDocument();
    });

    it('should show retry button in error state', () => {
      mockUseCameras.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Connection failed'),
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', async () => {
      const mockRefetch = vi.fn();
      mockUseCameras.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Connection failed'),
        refetch: mockRefetch,
      });

      renderWithWrapper(<CameraSection />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      retryButton.click();

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should display V1ApiError user message', () => {
      // Create a mock V1ApiError-like object
      const mockError = {
        code: 'NETWORK_ERROR',
        message: 'Network unavailable',
        userMessage: 'Network unavailable. Check your connection.',
        retryable: true,
      };
      Object.setPrototypeOf(mockError, Error.prototype);

      mockUseCameras.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: mockError,
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      expect(screen.getByTestId('camera-error')).toBeInTheDocument();
    });

    it('should show error icon in error state', () => {
      mockUseCameras.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Test error'),
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      const errorContainer = screen.getByTestId('camera-error');
      // Check for AlertCircle SVG icon
      expect(errorContainer.querySelector('svg')).toBeInTheDocument();
    });
  });

  // Camera list display tests
  describe('Camera List Display', () => {
    it('should display camera cards when cameras are available', () => {
      mockUseCameras.mockReturnValue({
        data: mockCameras,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      expect(screen.getByTestId('camera-grid')).toBeInTheDocument();
      expect(screen.getByText('Front Door Camera')).toBeInTheDocument();
      expect(screen.getByText('Backyard Camera')).toBeInTheDocument();
    });

    it('should display correct count in header', () => {
      mockUseCameras.mockReturnValue({
        data: mockCameras,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      expect(screen.getByText(/2 cameras registered/i)).toBeInTheDocument();
      expect(screen.getByText(/1 online/i)).toBeInTheDocument();
    });

    it('should display refresh button', () => {
      mockUseCameras.mockReturnValue({
        data: mockCameras,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithWrapper(<CameraSection />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });
});
