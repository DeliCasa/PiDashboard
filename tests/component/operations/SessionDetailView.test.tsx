/**
 * SessionDetailView Component Tests
 * Feature: 057-live-ops-viewer (Phase 4)
 *
 * Tests for the session drill-down view including loading/error/not-found states,
 * correlation IDs, evidence panels, delta table, and debug info.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { SessionDetailView } from '@/presentation/components/operations/SessionDetailView';

// Mock dependencies
vi.mock('@/application/hooks/useSessions', () => ({
  useSession: vi.fn(),
}));
vi.mock('@/application/hooks/useInventoryDelta', () => ({
  useSessionDelta: vi.fn(),
}));
vi.mock('@/infrastructure/api/inventory-delta', () => ({
  getLastRequestId: vi.fn(),
}));
vi.mock('@/presentation/components/diagnostics/EvidencePanel', () => ({
  EvidencePanel: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="evidence-panel">Evidence for {sessionId}</div>
  ),
}));
vi.mock('@/presentation/components/inventory/InventoryEvidencePanel', () => ({
  InventoryEvidencePanel: () => (
    <div data-testid="inventory-evidence-panel">Inventory Evidence</div>
  ),
}));
vi.mock('@/presentation/components/inventory/InventoryDeltaTable', () => ({
  InventoryDeltaTable: () => (
    <div data-testid="inventory-delta-table">Delta Table</div>
  ),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useSession } from '@/application/hooks/useSessions';
import { useSessionDelta } from '@/application/hooks/useInventoryDelta';
import { getLastRequestId } from '@/infrastructure/api/inventory-delta';

const mockUseSession = vi.mocked(useSession);
const mockUseSessionDelta = vi.mocked(useSessionDelta);
const mockGetLastRequestId = vi.mocked(getLastRequestId);

// Test fixtures
const activeSession = {
  id: 'sess-12345',
  delivery_id: 'del-67890',
  started_at: '2026-01-25T14:00:00Z',
  status: 'active' as const,
  capture_count: 5,
  last_capture_at: '2026-01-25T14:30:00Z',
  is_stale: false,
};

const cancelledSession = {
  id: 'sess-cancel',
  delivery_id: 'del-99999',
  started_at: '2026-01-25T10:00:00Z',
  status: 'cancelled' as const,
  capture_count: 0,
  is_stale: false,
};

const mockDeltaWithEvidence = {
  run_id: 'run-abc-123',
  session_id: 'sess-12345',
  status: 'done',
  delta: [
    { name: 'Item A', before: 5, after: 3, change: -2, status: 'removed' },
  ],
  evidence: {
    before_image_url: 'https://example.com/before.jpg',
    after_image_url: 'https://example.com/after.jpg',
  },
  metadata: {},
};

const mockDeltaNoEvidence = {
  run_id: 'run-def-456',
  session_id: 'sess-12345',
  status: 'done',
  delta: [
    { name: 'Item B', before: 2, after: 4, change: 2, status: 'added' },
  ],
  evidence: null,
  metadata: {},
};

describe('SessionDetailView', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSession.mockReturnValue({
      data: activeSession,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useSession>);
    mockUseSessionDelta.mockReturnValue({
      data: null,
      isLoading: false,
    } as ReturnType<typeof useSessionDelta>);
    mockGetLastRequestId.mockReturnValue(undefined);
  });

  // ---------- Loading state ----------

  it('shows loading skeleton when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useSession>);

    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    expect(screen.getByTestId('session-detail-loading')).toBeInTheDocument();
  });

  // ---------- Error state ----------

  it('shows error state with retry and back buttons when error', () => {
    mockUseSession.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network failure'),
      refetch: vi.fn(),
    } as ReturnType<typeof useSession>);

    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    expect(screen.getByTestId('session-detail-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load session details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  // ---------- Not found state ----------

  it('shows not-found state with session ID when session is null', () => {
    mockUseSession.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useSession>);

    render(<SessionDetailView sessionId="sess-missing" onBack={mockOnBack} />);

    expect(screen.getByTestId('session-detail-not-found')).toBeInTheDocument();
    expect(screen.getByText('Session not found')).toBeInTheDocument();
    expect(screen.getByText('sess-missing')).toBeInTheDocument();
  });

  // ---------- Back button ----------

  it('calls onBack when back button clicked in error state', async () => {
    const user = userEvent.setup();

    mockUseSession.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Fail'),
      refetch: vi.fn(),
    } as ReturnType<typeof useSession>);

    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    await user.click(screen.getByRole('button', { name: /Back/i }));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button clicked in success state', async () => {
    const user = userEvent.setup();

    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    await user.click(screen.getByTestId('back-button'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  // ---------- Header / Session ID ----------

  it('shows session ID in header', () => {
    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    expect(screen.getByText('Session Detail')).toBeInTheDocument();
    // Session ID appears in both header and correlation IDs section
    const sessionIdElements = screen.getAllByText('sess-12345');
    expect(sessionIdElements.length).toBeGreaterThanOrEqual(1);
  });

  // ---------- Status badge ----------

  it('shows "Active" status badge for active session', () => {
    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    const badge = screen.getByTestId('session-detail-status');
    expect(badge).toHaveTextContent('Active');
  });

  it('shows "Failed" status badge for cancelled session', () => {
    mockUseSession.mockReturnValue({
      data: cancelledSession,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useSession>);

    render(<SessionDetailView sessionId="sess-cancel" onBack={mockOnBack} />);

    const badge = screen.getByTestId('session-detail-status');
    expect(badge).toHaveTextContent('Failed');
  });

  // ---------- Correlation IDs ----------

  it('shows correlation ID - Session always shown', () => {
    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    expect(screen.getByText('Session:')).toBeInTheDocument();
    // The session ID appears in both the header and the correlation IDs section
    const allSessionIds = screen.getAllByText('sess-12345');
    expect(allSessionIds.length).toBeGreaterThanOrEqual(2);
  });

  it('shows correlation ID - Delivery when delivery_id present', () => {
    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    expect(screen.getByText('Delivery:')).toBeInTheDocument();
    expect(screen.getByText('del-67890')).toBeInTheDocument();
  });

  it('shows correlation ID - Run when delta has run_id', () => {
    mockUseSessionDelta.mockReturnValue({
      data: mockDeltaWithEvidence,
      isLoading: false,
    } as ReturnType<typeof useSessionDelta>);

    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    expect(screen.getByText('Run:')).toBeInTheDocument();
    expect(screen.getByText('run-abc-123')).toBeInTheDocument();
  });

  // ---------- Error section ----------

  it('shows error section for cancelled session', () => {
    mockUseSession.mockReturnValue({
      data: cancelledSession,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useSession>);

    render(<SessionDetailView sessionId="sess-cancel" onBack={mockOnBack} />);

    expect(screen.getByText('Error Information')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This session was cancelled. No additional error details available.'
      )
    ).toBeInTheDocument();
  });

  it('does NOT show error section for active session', () => {
    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    expect(screen.queryByText('Error Information')).not.toBeInTheDocument();
  });

  // ---------- Evidence panels ----------

  it('shows InventoryEvidencePanel when delta has evidence URLs', () => {
    mockUseSessionDelta.mockReturnValue({
      data: mockDeltaWithEvidence,
      isLoading: false,
    } as ReturnType<typeof useSessionDelta>);

    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    expect(screen.getByTestId('inventory-evidence-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('evidence-panel')).not.toBeInTheDocument();
  });

  it('falls back to EvidencePanel when no delta evidence', () => {
    mockUseSessionDelta.mockReturnValue({
      data: mockDeltaNoEvidence,
      isLoading: false,
    } as ReturnType<typeof useSessionDelta>);

    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-panel')).toHaveTextContent(
      'Evidence for sess-12345'
    );
    expect(
      screen.queryByTestId('inventory-evidence-panel')
    ).not.toBeInTheDocument();
  });

  // ---------- Delta table ----------

  it('shows InventoryDeltaTable when delta entries exist', () => {
    mockUseSessionDelta.mockReturnValue({
      data: mockDeltaWithEvidence,
      isLoading: false,
    } as ReturnType<typeof useSessionDelta>);

    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    expect(screen.getByTestId('inventory-delta-table')).toBeInTheDocument();
  });

  // ---------- Debug info ----------

  it('has debug info section present', () => {
    render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

    expect(screen.getByTestId('session-debug-info')).toBeInTheDocument();
  });

  // ==========================================================================
  // Feature 058: Delta error isolation (T021)
  // ==========================================================================

  describe('delta error isolation (T021)', () => {
    it('shows "Delta data unavailable" when session loads but delta fails', () => {
      mockUseSessionDelta.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Delta fetch failed'),
      } as unknown as ReturnType<typeof useSessionDelta>);

      render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

      expect(screen.getByTestId('delta-unavailable')).toBeInTheDocument();
      expect(screen.getByText(/Delta data unavailable/)).toBeInTheDocument();
      // Session metadata should still be visible
      expect(screen.getByTestId('session-detail-view')).toBeInTheDocument();
      expect(screen.getByText('Session Detail')).toBeInTheDocument();
    });

    it('session metadata always visible when session fetch succeeds', () => {
      mockUseSessionDelta.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Delta error'),
      } as unknown as ReturnType<typeof useSessionDelta>);

      render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

      // Session ID, status badge, timestamps, correlation IDs still visible
      expect(screen.getByTestId('session-detail-status')).toBeInTheDocument();
      const sessionIdElements = screen.getAllByText('sess-12345');
      expect(sessionIdElements.length).toBeGreaterThanOrEqual(1);
    });

    it('evidence panel still renders when delta fails', () => {
      mockUseSessionDelta.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Delta error'),
      } as unknown as ReturnType<typeof useSessionDelta>);

      render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

      // Falls back to EvidencePanel since no delta evidence
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    });

    it('does NOT show delta-unavailable when delta loads successfully', () => {
      mockUseSessionDelta.mockReturnValue({
        data: mockDeltaWithEvidence,
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useSessionDelta>);

      render(<SessionDetailView sessionId="sess-12345" onBack={mockOnBack} />);

      expect(screen.queryByTestId('delta-unavailable')).not.toBeInTheDocument();
    });
  });
});
