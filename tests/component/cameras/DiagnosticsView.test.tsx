/**
 * DiagnosticsView Component Tests
 * Feature: 034-esp-camera-integration (T060-T062)
 *
 * Tests diagnostics JSON display, search filter, and copy button.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiagnosticsView } from '@/presentation/components/cameras/DiagnosticsView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useCameraDiagnostics hook
vi.mock('@/application/hooks/useCameras', () => ({
  useCameraDiagnostics: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useCameraDiagnostics } from '@/application/hooks/useCameras';
import { toast } from 'sonner';

const mockUseCameraDiagnostics = useCameraDiagnostics as ReturnType<typeof vi.fn>;

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

// Mock diagnostics data
const mockDiagnostics = [
  {
    id: 'AA:BB:CC:DD:EE:01',
    name: 'Front Door Camera',
    status: 'online',
    lastSeen: '2026-01-14T12:00:00Z',
    health: {
      wifi_rssi: -55,
      free_heap: 45000,
      uptime: '2d 5h 30m',
      resolution: 'VGA',
    },
    diagnostics: {
      connection_quality: 'good',
      error_count: 0,
    },
  },
  {
    id: 'AA:BB:CC:DD:EE:02',
    name: 'Backyard Camera',
    status: 'offline',
    lastSeen: '2026-01-13T12:00:00Z',
    diagnostics: {
      connection_quality: 'poor',
      error_count: 5,
      last_error: 'Connection timeout',
    },
  },
];

describe('DiagnosticsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset clipboard mock
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe('Collapsible Behavior', () => {
    it('should render collapsed by default', () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);

      expect(screen.getByTestId('diagnostics-trigger')).toBeInTheDocument();
      // JSON container should not be visible when collapsed
      expect(screen.queryByTestId('diagnostics-json-container')).not.toBeInTheDocument();
    });

    it('should expand when trigger is clicked', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);

      // Click to expand
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      // Now the JSON container should be visible
      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-json-container')).toBeInTheDocument();
      });
    });
  });

  describe('Warning Banner (T054)', () => {
    it('should display warning banner when expanded', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-warning')).toBeInTheDocument();
      });
      expect(screen.getByText(/for debugging purposes only/i)).toBeInTheDocument();
    });
  });

  // T060: JSON rendering tests
  describe('JSON Rendering (T060)', () => {
    it('should display formatted JSON when data is available', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-json')).toBeInTheDocument();
      });

      // Check for JSON content
      expect(screen.getByText(/"Front Door Camera"/)).toBeInTheDocument();
    });

    it('should display loading state when fetching', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-loading')).toBeInTheDocument();
      });
      expect(screen.getByText(/loading diagnostics/i)).toBeInTheDocument();
    });

    it('should display error state when fetch fails', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-error')).toBeInTheDocument();
      });
      expect(screen.getByText(/failed to load diagnostics/i)).toBeInTheDocument();
    });

    it('should show retry button in error state', async () => {
      const mockRefetch = vi.fn();
      mockUseCameraDiagnostics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should display no data message when data is empty', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-json')).toBeInTheDocument();
      });
      expect(screen.getByText(/no diagnostics data available/i)).toBeInTheDocument();
    });
  });

  // T061: Search filter tests
  describe('Search Filter (T061)', () => {
    it('should display search input', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-search')).toBeInTheDocument();
      });
    });

    it('should filter JSON based on search query', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-search')).toBeInTheDocument();
      });

      // Type search query
      fireEvent.change(screen.getByTestId('diagnostics-search'), {
        target: { value: 'Front Door' },
      });

      // Should show match indicator
      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-match-count')).toBeInTheDocument();
      });
    });

    it('should show "No matches found" for non-matching query', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-search')).toBeInTheDocument();
      });

      // Type non-matching query
      fireEvent.change(screen.getByTestId('diagnostics-search'), {
        target: { value: 'nonexistent_camera_xyz' },
      });

      await waitFor(() => {
        // Check that the JSON area shows "No matches found"
        const jsonContainer = screen.getByTestId('diagnostics-json');
        expect(jsonContainer.textContent).toContain('No matches found');
      });
    });

    it('should support regex search', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-search')).toBeInTheDocument();
      });

      // Type regex pattern
      fireEvent.change(screen.getByTestId('diagnostics-search'), {
        target: { value: 'AA:BB:.*:01' },
      });

      // Should filter based on regex
      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-match-count')).toBeInTheDocument();
      });
    });

    it('should handle invalid regex gracefully', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-search')).toBeInTheDocument();
      });

      // Type invalid regex (unclosed bracket)
      fireEvent.change(screen.getByTestId('diagnostics-search'), {
        target: { value: '[invalid' },
      });

      // Should not crash, falls back to string search
      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-json')).toBeInTheDocument();
      });
    });
  });

  // T062: Copy button tests
  describe('Copy Button (T062)', () => {
    it('should display copy button', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-copy')).toBeInTheDocument();
      });
    });

    it('should copy JSON to clipboard when clicked', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-copy')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('diagnostics-copy'));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it('should show success toast after copying', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-copy')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('diagnostics-copy'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Diagnostics copied to clipboard');
      });
    });

    it('should show "Copied!" state temporarily', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-copy')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('diagnostics-copy'));

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('should show error toast when clipboard fails', async () => {
      // Make clipboard fail
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard error')),
        },
      });

      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-copy')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('diagnostics-copy'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to copy to clipboard');
      });
    });

    it('should disable copy button when no data', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-copy')).toBeInTheDocument();
      });

      // Button should be disabled
      expect(screen.getByTestId('diagnostics-copy')).toBeDisabled();
    });

    it('should disable copy button when loading', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-copy')).toBeInTheDocument();
      });

      expect(screen.getByTestId('diagnostics-copy')).toBeDisabled();
    });
  });

  describe('Refresh Button', () => {
    it('should display refresh button', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-refresh')).toBeInTheDocument();
      });
    });

    it('should call refetch when refresh is clicked', async () => {
      const mockRefetch = vi.fn();
      mockUseCameraDiagnostics.mockReturnValue({
        data: mockDiagnostics,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-refresh')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('diagnostics-refresh'));
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should disable refresh button when loading', async () => {
      mockUseCameraDiagnostics.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      });

      renderWithWrapper(<DiagnosticsView />);
      fireEvent.click(screen.getByTestId('diagnostics-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('diagnostics-refresh')).toBeInTheDocument();
      });

      expect(screen.getByTestId('diagnostics-refresh')).toBeDisabled();
    });
  });
});
