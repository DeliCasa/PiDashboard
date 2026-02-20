/**
 * EvidencePanel Component Tests
 * Feature: 038-dev-observability-panels (T045)
 * Feature: 044-evidence-ci-remediation (T038) - Camera filter tests
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Tests for evidence panel with thumbnail grid and camera filtering.
 * Uses CaptureEntry format with device_id, evidence_id fields.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { EvidencePanel } from '@/presentation/components/diagnostics/EvidencePanel';
import { ApiError } from '@/infrastructure/api/client';
import * as useEvidenceModule from '@/application/hooks/useEvidence';
import type { CaptureEntry } from '@/infrastructure/api/diagnostics-schemas';

// Mock the hooks
vi.mock('@/application/hooks/useEvidence', async () => {
  const actual = await vi.importActual('@/application/hooks/useEvidence');
  return {
    ...actual,
    useSessionEvidence: vi.fn(),
    useInvalidateEvidence: vi.fn(() => ({
      invalidate: vi.fn(),
    })),
  };
});

// Small base64 stub
const STUB_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof';

// Test fixtures (V1 CaptureEntry format)
const mockEvidence: CaptureEntry[] = [
  {
    evidence_id: 'ev-001',
    capture_tag: 'BEFORE_OPEN',
    status: 'captured',
    device_id: 'espcam-b0f7f1',
    container_id: 'ctr-abc-003',
    session_id: 'sess-12345',
    created_at: '2026-01-25T14:30:00Z',
    image_data: STUB_BASE64,
    content_type: 'image/jpeg',
    image_size_bytes: 45678,
    object_key: 'evidence/sess-12345/before-open.jpg',
    upload_status: 'uploaded',
  },
  {
    evidence_id: 'ev-002',
    capture_tag: 'AFTER_CLOSE',
    status: 'captured',
    device_id: 'espcam-a1b2c3',
    container_id: 'ctr-abc-003',
    session_id: 'sess-12345',
    created_at: '2026-01-25T14:25:00Z',
    image_data: STUB_BASE64,
    content_type: 'image/jpeg',
    image_size_bytes: 52340,
    object_key: 'evidence/sess-12345/after-close.jpg',
    upload_status: 'uploaded',
  },
];

describe('EvidencePanel', () => {
  const mockInvalidate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEvidenceModule.useInvalidateEvidence).mockReturnValue({
      invalidate: mockInvalidate,
    });
  });

  describe('loading state', () => {
    it('should show skeleton loaders when loading', () => {
      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-loading')).toBeInTheDocument();
    });
  });

  describe('successful data', () => {
    it('should display evidence thumbnails', () => {
      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: mockEvidence,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      expect(screen.getByTestId('evidence-grid')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-thumbnail-ev-001')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-thumbnail-ev-002')).toBeInTheDocument();
    });

    it('should show evidence count', () => {
      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: mockEvidence,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      expect(screen.getByTestId('evidence-count')).toHaveTextContent('(2)');
    });
  });

  describe('empty state', () => {
    it('should show empty state when no evidence', () => {
      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      expect(screen.getByTestId('evidence-empty')).toBeInTheDocument();
      expect(screen.getByText('No evidence captures yet')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error state on fetch error', () => {
      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: new Error('Failed to fetch'),
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      expect(screen.getByTestId('evidence-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load evidence')).toBeInTheDocument();
    });

    it('should show graceful degradation UI on 404 error', () => {
      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: new ApiError(404, 'Not found'),
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      expect(screen.getByTestId('evidence-unavailable')).toBeInTheDocument();
      expect(
        screen.getByText(/not available on this PiOrchestrator version/i)
      ).toBeInTheDocument();
    });

    it('should show graceful degradation UI on 503 error', () => {
      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: new ApiError(503, 'Service unavailable'),
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      expect(screen.getByTestId('evidence-unavailable')).toBeInTheDocument();
    });

    it('should call refetch when retry clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch,
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      await user.click(screen.getByRole('button', { name: /Retry/i }));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('refresh functionality', () => {
    it('should call invalidate when refresh clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: mockEvidence,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      await user.click(screen.getByTestId('refresh-evidence'));

      expect(mockInvalidate).toHaveBeenCalledWith('sess-12345');
    });

    it('should disable refresh button when fetching', () => {
      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: mockEvidence,
        isLoading: false,
        isFetching: true,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      expect(screen.getByTestId('refresh-evidence')).toBeDisabled();
    });
  });

  describe('camera filter (T038)', () => {
    it('should show camera filter dropdown when multiple cameras exist', () => {
      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: mockEvidence,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      expect(screen.getByTestId('evidence-camera-filter')).toBeInTheDocument();
    });

    it('should hide camera filter when only one camera (device_id) exists', () => {
      const singleCameraEvidence: CaptureEntry[] = [
        mockEvidence[0],
        {
          ...mockEvidence[0],
          evidence_id: 'ev-003',
          created_at: '2026-01-25T14:35:00Z',
        },
      ];

      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: singleCameraEvidence,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      expect(screen.queryByTestId('evidence-camera-filter')).not.toBeInTheDocument();
    });

    it('should filter evidence by selected device_id', async () => {
      const user = userEvent.setup();

      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: mockEvidence,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      // Initially both thumbnails visible
      expect(screen.getByTestId('evidence-thumbnail-ev-001')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-thumbnail-ev-002')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-count')).toHaveTextContent('(2)');

      // Click filter dropdown and select a specific camera
      await user.click(screen.getByTestId('evidence-camera-filter'));
      // Select the first camera option (espcam-a1b2c3 comes first alphabetically)
      const option = await screen.findByRole('option', { name: 'espcam-a1b2c3' });
      await user.click(option);

      // Only the filtered camera's evidence should show
      expect(screen.queryByTestId('evidence-thumbnail-ev-001')).not.toBeInTheDocument();
      expect(screen.getByTestId('evidence-thumbnail-ev-002')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-count')).toHaveTextContent('(1)');
    });

    it('should show filtered empty state when no evidence matches', async () => {
      const user = userEvent.setup();

      // Evidence from camera A only
      const singleSourceEvidence: CaptureEntry[] = [
        mockEvidence[0],
        { ...mockEvidence[0], evidence_id: 'ev-003', created_at: '2026-01-25T14:35:00Z' },
        { ...mockEvidence[1], evidence_id: 'ev-004' },
      ];

      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: singleSourceEvidence,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      // Click filter and select camera that exists
      await user.click(screen.getByTestId('evidence-camera-filter'));
      const option = await screen.findByRole('option', { name: 'espcam-a1b2c3' });
      await user.click(option);

      // Should show only 1 evidence item for espcam-a1b2c3
      expect(screen.getByTestId('evidence-count')).toHaveTextContent('(1)');
    });

    it('should reset filter when "All cameras" selected', async () => {
      const user = userEvent.setup();

      vi.mocked(useEvidenceModule.useSessionEvidence).mockReturnValue({
        data: mockEvidence,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useEvidenceModule.useSessionEvidence>);

      render(<EvidencePanel sessionId="sess-12345" />);

      // Select a camera filter
      await user.click(screen.getByTestId('evidence-camera-filter'));
      const cameraOption = await screen.findByRole('option', { name: 'espcam-a1b2c3' });
      await user.click(cameraOption);

      expect(screen.getByTestId('evidence-count')).toHaveTextContent('(1)');

      // Reset to all cameras
      await user.click(screen.getByTestId('evidence-camera-filter'));
      const allOption = await screen.findByRole('option', { name: 'All cameras' });
      await user.click(allOption);

      expect(screen.getByTestId('evidence-count')).toHaveTextContent('(2)');
    });
  });
});
