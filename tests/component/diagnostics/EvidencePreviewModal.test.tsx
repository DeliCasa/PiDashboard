/**
 * EvidencePreviewModal Component Tests
 * Feature: 057-live-ops-viewer (Phase 4) - Debug Info section
 *
 * Tests for the full-screen evidence image preview modal with metadata,
 * download, and debug info (object key, copy, open raw).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { EvidencePreviewModal } from '@/presentation/components/diagnostics/EvidencePreviewModal';
import { evidenceApi } from '@/infrastructure/api/evidence';
import type { EvidenceCapture } from '@/infrastructure/api/diagnostics-schemas';

// Mock sonner toast
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock evidence API for auto-refresh tests
vi.mock('@/infrastructure/api/evidence', () => ({
  evidenceApi: {
    refreshPresignedUrl: vi.fn(),
  },
}));

// Test fixture
const mockEvidence: EvidenceCapture = {
  id: 'img-001',
  session_id: 'sess-12345',
  captured_at: '2026-01-25T14:30:00Z',
  camera_id: 'espcam-b0f7f1',
  thumbnail_url: 'https://example.com/thumb1.jpg',
  full_url:
    'https://s3.example.com/bucket/sessions/sess-123/evidence/img-001.jpg?X-Amz-Signature=abc',
  expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  size_bytes: 45678,
  content_type: 'image/jpeg',
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

    // Component returns null, so no dialog content is rendered
    expect(screen.queryByTestId('evidence-preview-modal')).not.toBeInTheDocument();
  });

  it('shows evidence ID in dialog title when open with evidence', () => {
    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/Evidence: img-001/)).toBeInTheDocument();
  });

  it('shows camera_id metadata', () => {
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

  it('shows timestamp metadata', () => {
    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    const timestampEl = screen.getByTestId('preview-timestamp');
    expect(timestampEl).toBeInTheDocument();
    // formatTime produces a locale time string; just verify the element exists with content
    expect(timestampEl.textContent).toBeTruthy();
  });

  it('shows size in KB', () => {
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

  it('shows object key when debug info is expanded', async () => {
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
      screen.queryByText('bucket/sessions/sess-123/evidence/img-001.jpg')
    ).not.toBeInTheDocument();

    // Expand debug section
    await user.click(screen.getByRole('button', { name: /Debug Info/i }));

    // Object key should now be visible
    expect(
      screen.getByText('bucket/sessions/sess-123/evidence/img-001.jpg')
    ).toBeInTheDocument();
  });

  it('shows "Open raw" button when debug section is expanded', async () => {
    const user = userEvent.setup();

    render(
      <EvidencePreviewModal
        evidence={mockEvidence}
        open={true}
        onClose={mockOnClose}
      />
    );

    // Not present when collapsed
    expect(screen.queryByTestId('evidence-open-raw')).not.toBeInTheDocument();

    // Expand debug section
    await user.click(screen.getByRole('button', { name: /Debug Info/i }));

    // "Open raw" button should now be present
    const openRawBtn = screen.getByTestId('evidence-open-raw');
    expect(openRawBtn).toBeInTheDocument();
    expect(openRawBtn).toHaveTextContent('Open raw');
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

    // The DialogContent renders a Radix close button with an X icon.
    // The component also has its own ghost close button in the header.
    // Use the Radix "Close" button (rendered by DialogContent).
    const closeButtons = screen.getAllByRole('button');
    // Find the close button - look for the X icon button in the header
    const headerCloseBtn = closeButtons.find(
      (btn) => btn.getAttribute('aria-label') === undefined && btn.closest('.flex.flex-row')
    );
    // Fallback: click the first X close button rendered by Radix DialogContent
    const radixCloseBtn = screen.getByRole('button', { name: /close/i });
    await user.click(radixCloseBtn ?? headerCloseBtn);

    expect(mockOnClose).toHaveBeenCalled();
  });

  describe('auto-refresh on error (T013)', () => {
    it('should call refreshPresignedUrl when full image fails to load', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce({
        url: 'https://example.com/fresh-full.jpg',
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      });

      render(
        <EvidencePreviewModal evidence={mockEvidence} open={true} onClose={mockOnClose} />
      );

      const img = screen.getByRole('img');
      fireEvent.error(img);

      await waitFor(() => {
        expect(evidenceApi.refreshPresignedUrl).toHaveBeenCalledTimes(1);
      });
    });

    it('should show retry button when refresh fails permanently', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce(null);

      render(
        <EvidencePreviewModal evidence={mockEvidence} open={true} onClose={mockOnClose} />
      );

      const img = screen.getByRole('img');
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByTestId('preview-retry-button')).toBeInTheDocument();
      });
    });

    it('should show "Image unavailable" text on permanent failure', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce(null);

      render(
        <EvidencePreviewModal evidence={mockEvidence} open={true} onClose={mockOnClose} />
      );

      const img = screen.getByRole('img');
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByText('Image unavailable')).toBeInTheDocument();
      });
    });

    it('retry button resets and allows re-loading', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce(null);

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
      // The image src should be reset to original
      await waitFor(() => {
        expect(screen.queryByTestId('preview-retry-button')).not.toBeInTheDocument();
      });
    });
  });
});
