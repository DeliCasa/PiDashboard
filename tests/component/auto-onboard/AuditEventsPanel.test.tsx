/**
 * AuditEventsPanel Component Tests
 * Feature: 035-auto-onboard-dashboard
 * Tasks: T038, T057
 *
 * Tests event list display, filtering, pagination, and cleanup dialog.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditEventsPanel } from '@/presentation/components/auto-onboard/AuditEventsPanel';
import type { AuditEventsData, OnboardingAuditEntry } from '@/infrastructure/api/v1-auto-onboard';

// Mock next-themes to avoid SSR issues
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock events data
const mockEvents: OnboardingAuditEntry[] = [
  {
    id: 'evt-001',
    mac_address: 'AA:BB:CC:DD:EE:01',
    stage: 'paired',
    outcome: 'success',
    timestamp: new Date().toISOString(),
    device_id: 'dev-001',
    ip_address: '192.168.1.101',
    firmware_version: '1.2.3',
    duration_ms: 1500,
  },
  {
    id: 'evt-002',
    mac_address: 'AA:BB:CC:DD:EE:02',
    stage: 'failed',
    outcome: 'failure',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    error_code: 'VERIFICATION_TIMEOUT',
    error_message: 'Device did not respond',
    duration_ms: 30000,
  },
  {
    id: 'evt-003',
    mac_address: 'AA:BB:CC:DD:EE:03',
    stage: 'rejected_by_policy',
    outcome: 'failure',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    ip_address: '10.0.0.50',
  },
];

const mockEventsData: AuditEventsData = {
  events: mockEvents,
  pagination: {
    total: 25,
    limit: 10,
    offset: 0,
    has_more: true,
  },
};

const emptyEventsData: AuditEventsData = {
  events: [],
  pagination: {
    total: 0,
    limit: 10,
    offset: 0,
    has_more: false,
  },
};

describe('AuditEventsPanel', () => {
  const defaultProps = {
    events: mockEventsData,
    isLoading: false,
    macFilter: '',
    onMacFilterChange: vi.fn(),
    sinceFilter: undefined,
    onSinceFilterChange: vi.fn(),
    onPageChange: vi.fn(),
    onCleanup: vi.fn(),
    isCleaningUp: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Panel Display (T038)', () => {
    it('should render with data-testid', () => {
      render(<AuditEventsPanel {...defaultProps} />);
      expect(screen.getByTestId('audit-events-panel')).toBeInTheDocument();
    });

    it('should display card title', () => {
      render(<AuditEventsPanel {...defaultProps} />);
      expect(screen.getByText('Audit Events')).toBeInTheDocument();
    });

    it('should display total events count', () => {
      render(<AuditEventsPanel {...defaultProps} />);
      expect(screen.getByText('25 total events')).toBeInTheDocument();
    });

    it('should be collapsible', () => {
      render(<AuditEventsPanel {...defaultProps} />);
      // Initially collapsed - events list not visible
      expect(screen.queryByTestId('events-list')).not.toBeInTheDocument();
    });

    it('should expand when header is clicked', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('events-list')).toBeInTheDocument();
      });
    });
  });

  describe('Event List Display', () => {
    it('should display events when expanded', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      // Expand panel
      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('event-row-evt-001')).toBeInTheDocument();
        expect(screen.getByTestId('event-row-evt-002')).toBeInTheDocument();
        expect(screen.getByTestId('event-row-evt-003')).toBeInTheDocument();
      });
    });

    it('should display MAC address for each event', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByText('AA:BB:CC:DD:EE:01')).toBeInTheDocument();
        expect(screen.getByText('AA:BB:CC:DD:EE:02')).toBeInTheDocument();
      });
    });

    it('should display stage badges', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByText('Paired')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText('Rejected')).toBeInTheDocument();
      });
    });

    it('should display outcome badges', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getAllByText('success').length).toBeGreaterThan(0);
        expect(screen.getAllByText('failure').length).toBeGreaterThan(0);
      });
    });

    it('should show empty state when no events', async () => {
      render(<AuditEventsPanel {...defaultProps} events={emptyEventsData} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('no-events')).toBeInTheDocument();
        expect(screen.getByText('No events found')).toBeInTheDocument();
      });
    });

    it('should show loading state', async () => {
      render(<AuditEventsPanel {...defaultProps} isLoading={true} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        // Loader should be visible
        const loader = screen.getByTestId('events-list').querySelector('.animate-spin');
        expect(loader).toBeInTheDocument();
      });
    });
  });

  describe('Event Details Expansion', () => {
    it('should expand event row to show details', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      // Expand panel
      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('event-row-evt-001')).toBeInTheDocument();
      });

      // Click event row to expand
      const eventRow = screen.getByTestId('event-row-evt-001');
      fireEvent.click(eventRow);

      await waitFor(() => {
        expect(screen.getByTestId('event-details-evt-001')).toBeInTheDocument();
      });
    });

    it('should show device details when expanded', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('event-row-evt-001')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('event-row-evt-001'));

      await waitFor(() => {
        expect(screen.getByText('Device ID')).toBeInTheDocument();
        expect(screen.getByText('dev-001')).toBeInTheDocument();
        expect(screen.getByText('IP Address')).toBeInTheDocument();
        expect(screen.getByText('192.168.1.101')).toBeInTheDocument();
        expect(screen.getByText('Firmware')).toBeInTheDocument();
        expect(screen.getByText('1.2.3')).toBeInTheDocument();
      });
    });

    it('should show error details for failed events', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('event-row-evt-002')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('event-row-evt-002'));

      await waitFor(() => {
        expect(screen.getByText('Error Code')).toBeInTheDocument();
        expect(screen.getByText('VERIFICATION_TIMEOUT')).toBeInTheDocument();
        expect(screen.getByText('Error Message')).toBeInTheDocument();
        expect(screen.getByText('Device did not respond')).toBeInTheDocument();
      });
    });
  });

  describe('MAC Filter', () => {
    it('should have MAC filter input', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('mac-filter-input')).toBeInTheDocument();
      });
    });

    it('should call onMacFilterChange when filter changes', async () => {
      const onMacFilterChange = vi.fn();
      render(<AuditEventsPanel {...defaultProps} onMacFilterChange={onMacFilterChange} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('mac-filter-input')).toBeInTheDocument();
      });

      const input = screen.getByTestId('mac-filter-input');
      fireEvent.change(input, { target: { value: 'AA:BB' } });

      expect(onMacFilterChange).toHaveBeenCalledWith('AA:BB');
    });

    it('should display current filter value', async () => {
      render(<AuditEventsPanel {...defaultProps} macFilter="AA:BB:CC" />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        const input = screen.getByTestId('mac-filter-input') as HTMLInputElement;
        expect(input.value).toBe('AA:BB:CC');
      });
    });
  });

  describe('Time Range Filter', () => {
    it('should have since filter input', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('since-filter-input')).toBeInTheDocument();
      });
    });

    it('should call onSinceFilterChange when filter changes', async () => {
      const onSinceFilterChange = vi.fn();
      render(<AuditEventsPanel {...defaultProps} onSinceFilterChange={onSinceFilterChange} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('since-filter-input')).toBeInTheDocument();
      });

      const input = screen.getByTestId('since-filter-input');
      fireEvent.change(input, { target: { value: '2026-01-22T10:00' } });

      expect(onSinceFilterChange).toHaveBeenCalledWith('2026-01-22T10:00');
    });
  });

  describe('Pagination', () => {
    it('should display page info', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
      });
    });

    it('should have previous and next page buttons', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('prev-page-button')).toBeInTheDocument();
        expect(screen.getByTestId('next-page-button')).toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('prev-page-button')).toBeDisabled();
      });
    });

    it('should call onPageChange when next is clicked', async () => {
      const onPageChange = vi.fn();
      render(<AuditEventsPanel {...defaultProps} onPageChange={onPageChange} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('next-page-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('next-page-button'));

      expect(onPageChange).toHaveBeenCalledWith(10); // offset + limit
    });

    it('should disable next button when no more pages', async () => {
      const lastPageData: AuditEventsData = {
        events: mockEvents,
        pagination: {
          total: 25,
          limit: 10,
          offset: 20,
          has_more: false,
        },
      };

      render(<AuditEventsPanel {...defaultProps} events={lastPageData} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('next-page-button')).toBeDisabled();
      });
    });
  });

  describe('Cleanup Dialog (T057)', () => {
    it('should have cleanup button', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('cleanup-button')).toBeInTheDocument();
      });
    });

    it('should open cleanup dialog when button is clicked', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('cleanup-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cleanup-button'));

      await waitFor(() => {
        expect(screen.getByText('Cleanup Old Events')).toBeInTheDocument();
      });
    });

    it('should have days input in cleanup dialog', async () => {
      render(<AuditEventsPanel {...defaultProps} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('cleanup-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cleanup-button'));

      await waitFor(() => {
        expect(screen.getByTestId('cleanup-days-input')).toBeInTheDocument();
      });
    });

    it('should call onCleanup with days when confirmed', async () => {
      const onCleanup = vi.fn();
      render(<AuditEventsPanel {...defaultProps} onCleanup={onCleanup} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('cleanup-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cleanup-button'));

      await waitFor(() => {
        expect(screen.getByTestId('cleanup-days-input')).toBeInTheDocument();
      });

      // Change days to 30
      const daysInput = screen.getByTestId('cleanup-days-input');
      fireEvent.change(daysInput, { target: { value: '30' } });

      // Confirm
      fireEvent.click(screen.getByText('Delete Old Events'));

      expect(onCleanup).toHaveBeenCalledWith(30);
    });

    it('should disable cleanup button while cleaning up', async () => {
      render(<AuditEventsPanel {...defaultProps} isCleaningUp={true} />);

      const trigger = screen.getByText('Audit Events').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByTestId('cleanup-button')).toBeDisabled();
      });
    });
  });
});
