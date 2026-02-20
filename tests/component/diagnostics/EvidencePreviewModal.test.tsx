/**
 * EvidencePreviewModal Component Tests
 * Feature: 057-live-ops-viewer (Phase 4) - Debug Info section
 * Feature: 059-real-ops-drilldown - V1 CaptureEntry schema reconciliation
 *
 * Tests for the full-screen evidence image preview modal with metadata,
 * download, and debug info (object key, capture tag, status).
 * No auto-refresh tests (presigned URL refresh removed in V1).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { EvidencePreviewModal } from '@/presentation/components/diagnostics/EvidencePreviewModal';
import type { CaptureEntry } from '@/infrastructure/api/diagnostics-schemas';

// Mock sonner toast
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Small base64 stub for tests
const STUB_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof';

// Mock evidence API
vi.mock('@/infrastructure/api/evidence', () => ({
  getImageSrc: (capture: { image_data?: string; content_type?: string }) => {
    if (capture.image_data) {
      return `data:${capture.content_type || 'image/jpeg'};base64,${capture.image_data}`;
    }
    return '';
  },
  evidenceApi: {
    captureEntryToBlob: vi.fn(() => new Blob(['test'], { type: 'image/jpeg' })),
    getCaptureFilename: vi.fn(() => 'evidence-test.jpg'),
  },
}));

// Test fixture (V1 CaptureEntry format)
const mockEvidence: CaptureEntry = {
  evidence_id: 'ev-001',
  capture_tag: 'BEFORE_OPEN',
  status: 'captured',
  device_id: 'espcam-b0f7f1',
  container_id: 'ctr-abc-003',
  session_id: 'sess-completed-001',
  created_at: '2026-01-25T14:30:00Z',
  image_data: STUB_BASE64,
  content_type: 'image/jpeg',
  image_size_bytes: 45678,
  object_key: 'evidence/sess-completed-001/before-open.jpg',
  upload_status: 'uploaded',
};

describe('EvidencePreviewModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders null when evidence is null', () => {
    render(
      <EvidencePreviewModal evidence={null} open={true} onClose={mockOnClose} />
    );

    expect(screen.queryByTestId('evidence-preview-modal')).not.toBeInTheDocument();
  });

  it('shows evidence_id in dialog title when open with evidence', () => {
    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/Evidence: ev-001/)).toBeInTheDocument();
  });

  it('shows device_id metadata', () => {
    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    const cameraEl = screen.getByTestId('preview-camera');
    expect(cameraEl).toBeInTheDocument();
    expect(cameraEl).toHaveTextContent('espcam-b0f7f1');
  });

  it('shows created_at timestamp metadata', () => {
    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    const timestampEl = screen.getByTestId('preview-timestamp');
    expect(timestampEl).toBeInTheDocument();
    expect(timestampEl.textContent).toBeTruthy();
  });

  it('shows image_size_bytes in KB', () => {
    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    const sizeEl = screen.getByTestId('preview-size');
    expect(sizeEl).toBeInTheDocument();
    // 45678 / 1024 = 44.6 KB
    expect(sizeEl).toHaveTextContent('44.6 KB');
  });

  it('has download button', () => {
    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    const downloadBtn = screen.getByTestId('download-button');
    expect(downloadBtn).toBeInTheDocument();
    expect(downloadBtn).toHaveTextContent('Download');
  });

  it('has debug info section', () => {
    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('evidence-debug-info')).toBeInTheDocument();
  });

  it('shows object_key when debug info is expanded', async () => {
    const user = userEvent.setup();

    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    // Debug content is hidden (Collapsible removes from DOM when closed)
    expect(
      screen.queryByText('evidence/sess-completed-001/before-open.jpg')
    ).not.toBeInTheDocument();

    // Expand debug section
    await user.click(screen.getByRole('button', { name: /Debug Info/i }));

    // Object key should now be visible
    expect(
      screen.getByText('evidence/sess-completed-001/before-open.jpg')
    ).toBeInTheDocument();
  });

  it('shows capture_tag and status in debug info when expanded', async () => {
    const user = userEvent.setup();

    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /Debug Info/i }));

    expect(screen.getByText(/Status: captured/)).toBeInTheDocument();
    expect(screen.getByText(/Tag: BEFORE_OPEN/)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    // Use the Radix close button
    const radixCloseBtn = screen.getByRole('button', { name: /close/i });
    await user.click(radixCloseBtn);

    expect(mockOnClose).toHaveBeenCalled();
  });

  describe('error and retry', () => {
    it('should show error state when image fails to load', () => {
      render(
        <EvidencePreviewModal evidence={mockEvidence} open={true} onClose={mockOnClose} />
      );

      const img = screen.getByRole('img');
      fireEvent.error(img);

      expect(screen.getByTestId('preview-error')).toBeInTheDocument();
      expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      render(
        <EvidencePreviewModal evidence={mockEvidence} open={true} onClose={mockOnClose} />
      );

      const img = screen.getByRole('img');
      fireEvent.error(img);

      expect(screen.getByTestId('preview-retry-button')).toBeInTheDocument();
    });

    it('retry button resets and allows re-loading', async () => {
      render(
        <EvidencePreviewModal evidence={mockEvidence} open={true} onClose={mockOnClose} />
      );

      const img = screen.getByRole('img');
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByTestId('preview-retry-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('preview-retry-button'));

      // After retry, should be back in loading/attempting state
      await waitFor(() => {
        expect(screen.queryByTestId('preview-retry-button')).not.toBeInTheDocument();
      });
    });
  });
});
