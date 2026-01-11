/**
 * AllowlistSection Component Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T036
 *
 * Tests for the main allowlist section component including:
 * - Loading states
 * - Empty states
 * - Entry list rendering
 * - Add/delete operations
 * - Error handling
 * - Stats display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AllowlistSection } from '@/presentation/components/allowlist/AllowlistSection';
import * as allowlistApi from '@/infrastructure/api/allowlist';
import type { DeviceAllowlistEntry } from '@/domain/types/provisioning';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/infrastructure/api/allowlist', () => ({
  allowlistApi: {
    list: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ============================================================================
// Test Setup
// ============================================================================

const mockEntries: DeviceAllowlistEntry[] = [
  {
    mac: 'AA:BB:CC:DD:EE:01',
    description: 'Kitchen Camera #1',
    container_id: 'container-001',
    added_at: '2026-01-10T10:00:00Z',
    used: true,
    used_at: '2026-01-10T12:00:00Z',
  },
  {
    mac: 'AA:BB:CC:DD:EE:02',
    description: 'Living Room Sensor',
    added_at: '2026-01-10T11:00:00Z',
    used: false,
  },
  {
    mac: 'AA:BB:CC:DD:EE:03',
    added_at: '2026-01-10T12:00:00Z',
    used: false,
  },
];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderWithProvider(component: React.ReactElement) {
  const queryClient = createQueryClient();
  return {
    ...render(
      <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
    ),
    queryClient,
  };
}

describe('AllowlistSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading State', () => {
    it('shows loading skeleton while fetching', async () => {
      // Make the API never resolve to keep loading state
      vi.mocked(allowlistApi.allowlistApi.list).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithProvider(<AllowlistSection />);

      expect(screen.getByTestId('allowlist-loading')).toBeInTheDocument();
    });

    it('shows skeleton cards in loading state', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithProvider(<AllowlistSection />);

      const skeleton = screen.getByTestId('allowlist-loading');
      // Verify skeleton is rendered - it contains multiple skeleton placeholders
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.children.length).toBe(3); // 3 skeleton cards
    });
  });

  // ============================================================================
  // Empty State Tests
  // ============================================================================

  describe('Empty State', () => {
    it('shows empty state when no entries', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: [] },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByTestId('allowlist-empty')).toBeInTheDocument();
      });
    });

    it('displays helpful message in empty state', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: [] },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByText(/no devices in allowlist/i)).toBeInTheDocument();
        expect(screen.getByText(/add device mac addresses/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Entry List Tests
  // ============================================================================

  describe('Entry List', () => {
    it('renders all entries when loaded', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: mockEntries },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByTestId('allowlist-entries')).toBeInTheDocument();
      });

      // Check all MAC addresses are rendered
      expect(screen.getByText('AA:BB:CC:DD:EE:01')).toBeInTheDocument();
      expect(screen.getByText('AA:BB:CC:DD:EE:02')).toBeInTheDocument();
      expect(screen.getByText('AA:BB:CC:DD:EE:03')).toBeInTheDocument();
    });

    it('renders entry descriptions', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: mockEntries },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByText('Kitchen Camera #1')).toBeInTheDocument();
        expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
      });
    });

    it('renders container IDs when present', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: mockEntries },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByText('container-001')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Stats Display Tests
  // ============================================================================

  describe('Stats Display', () => {
    it('displays stats when entries exist', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: mockEntries },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        const stats = screen.getByTestId('allowlist-stats');
        expect(stats).toBeInTheDocument();
        expect(within(stats).getByText(/3 total/i)).toBeInTheDocument();
        expect(within(stats).getByText(/1 used/i)).toBeInTheDocument();
        expect(within(stats).getByText(/2 available/i)).toBeInTheDocument();
      });
    });

    it('does not display stats when empty', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: [] },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.queryByTestId('allowlist-stats')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Add Entry Tests
  // ============================================================================

  describe('Add Entry', () => {
    it('renders add entry form', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: [] },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByTestId('allowlist-entry-form')).toBeInTheDocument();
      });
    });

    it('adds new entry when form submitted', async () => {
      const user = userEvent.setup();
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: [] },
        status: 200,
        correlationId: 'test-123',
      });
      vi.mocked(allowlistApi.allowlistApi.add).mockResolvedValue({
        data: {
          entry: {
            mac: 'AA:BB:CC:DD:EE:FF',
            description: 'New Device',
            added_at: '2026-01-11T10:00:00Z',
            used: false,
          },
        },
        status: 200,
        correlationId: 'test-456',
      });

      renderWithProvider(<AllowlistSection />);

      // Wait for query to load and form to be enabled
      await waitFor(() => {
        expect(screen.getByTestId('allowlist-empty')).toBeInTheDocument();
      });

      // Ensure input is not disabled
      const macInput = screen.getByTestId('mac-input');
      expect(macInput).not.toBeDisabled();

      await user.type(macInput, 'AA:BB:CC:DD:EE:FF');
      await user.type(screen.getByTestId('description-input'), 'New Device');

      // Ensure button is enabled before clicking
      const addButton = screen.getByTestId('add-entry-button');
      expect(addButton).not.toBeDisabled();

      await user.click(addButton);

      await waitFor(() => {
        expect(allowlistApi.allowlistApi.add).toHaveBeenCalledWith({
          mac: 'AA:BB:CC:DD:EE:FF',
          description: 'New Device',
          container_id: undefined,
        });
      });
    });
  });

  // ============================================================================
  // Delete Entry Tests
  // ============================================================================

  describe('Delete Entry', () => {
    it('opens delete confirmation when delete clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: [mockEntries[0]] },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByTestId('allowlist-entries')).toBeInTheDocument();
      });

      // Open dropdown and click delete
      await user.click(screen.getByTestId('entry-actions-button'));
      await user.click(screen.getByTestId('delete-entry-action'));

      // Check confirmation dialog appears
      expect(screen.getByText(/remove from allowlist/i)).toBeInTheDocument();
    });

    it('deletes entry when confirmed', async () => {
      const user = userEvent.setup();
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: [mockEntries[0]] },
        status: 200,
        correlationId: 'test-123',
      });
      vi.mocked(allowlistApi.allowlistApi.remove).mockResolvedValue({
        data: { success: true, message: 'Deleted' },
        status: 200,
        correlationId: 'test-456',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByTestId('allowlist-entries')).toBeInTheDocument();
      });

      // Open dropdown and click delete
      await user.click(screen.getByTestId('entry-actions-button'));
      await user.click(screen.getByTestId('delete-entry-action'));

      // Confirm deletion
      await user.click(screen.getByTestId('confirm-delete-button'));

      await waitFor(() => {
        expect(allowlistApi.allowlistApi.remove).toHaveBeenCalledWith('AA:BB:CC:DD:EE:01');
      });
    });

    it('cancels deletion when cancel clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: [mockEntries[0]] },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByTestId('allowlist-entries')).toBeInTheDocument();
      });

      // Open dropdown and click delete
      await user.click(screen.getByTestId('entry-actions-button'));
      await user.click(screen.getByTestId('delete-entry-action'));

      // Cancel deletion
      await user.click(screen.getByTestId('cancel-delete-button'));

      expect(allowlistApi.allowlistApi.remove).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('shows error alert when fetch fails', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockRejectedValue(
        new Error('Network error')
      );

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByTestId('allowlist-error')).toBeInTheDocument();
      });
    });

    it('displays error message', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockRejectedValue(
        new Error('Failed to connect')
      );

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByText(/failed to connect/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Refresh Tests
  // ============================================================================

  describe('Refresh', () => {
    it('renders refresh button', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: mockEntries },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByTestId('refresh-allowlist-button')).toBeInTheDocument();
      });
    });

    it('refetches when refresh clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: mockEntries },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByTestId('refresh-allowlist-button')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('refresh-allowlist-button'));

      // Should have called list at least twice (initial + refresh)
      await waitFor(() => {
        expect(allowlistApi.allowlistApi.list).toHaveBeenCalledTimes(2);
      });
    });

    it('has proper aria-label on refresh button', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: mockEntries },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        const button = screen.getByTestId('refresh-allowlist-button');
        expect(button).toHaveAttribute('aria-label', 'Refresh allowlist');
      });
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('has proper section structure', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: mockEntries },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection />);

      await waitFor(() => {
        expect(screen.getByTestId('allowlist-section')).toBeInTheDocument();
        expect(screen.getByTestId('allowlist-entries-card')).toBeInTheDocument();
      });
    });

    it('renders with custom className', async () => {
      vi.mocked(allowlistApi.allowlistApi.list).mockResolvedValue({
        data: { entries: [] },
        status: 200,
        correlationId: 'test-123',
      });

      renderWithProvider(<AllowlistSection className="custom-class" />);

      await waitFor(() => {
        expect(screen.getByTestId('allowlist-section')).toHaveClass('custom-class');
      });
    });
  });
});
