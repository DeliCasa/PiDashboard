/**
 * InventoryEvidencePanel Component Tests
 * Feature: 047-inventory-delta-viewer (T018)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryEvidencePanel } from '@/presentation/components/inventory/InventoryEvidencePanel';
import { evidenceApi } from '@/infrastructure/api/evidence';
import type { EvidenceImages } from '@/domain/types/inventory';

// Mock evidence API for auto-refresh tests
vi.mock('@/infrastructure/api/evidence', () => ({
  evidenceApi: {
    refreshPresignedUrl: vi.fn(),
  },
}));

const fullEvidence: EvidenceImages = {
  before_image_url: 'https://example.com/before.jpg',
  after_image_url: 'https://example.com/after.jpg',
  overlays: {
    before: [
      {
        label: 'Coca-Cola (5)',
        bounding_box: { x: 10, y: 20, width: 50, height: 80 },
        confidence: 0.95,
      },
    ],
    after: [
      {
        label: 'Coca-Cola (3)',
        bounding_box: { x: 10, y: 20, width: 50, height: 80 },
        confidence: 0.92,
      },
    ],
  },
};

const afterOnlyEvidence: EvidenceImages = {
  after_image_url: 'https://example.com/after.jpg',
};

const noOverlayEvidence: EvidenceImages = {
  before_image_url: 'https://example.com/before.jpg',
  after_image_url: 'https://example.com/after.jpg',
};

describe('InventoryEvidencePanel', () => {
  it('renders both images side-by-side with labels', () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-before')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-after')).toBeInTheDocument();
  });

  it('renders single image with placeholder for missing before', () => {
    render(<InventoryEvidencePanel evidence={afterOnlyEvidence} />);

    expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-after')).toBeInTheDocument();
    // Before image should not be present, placeholder shown instead
    expect(screen.queryByTestId('evidence-before')).not.toBeInTheDocument();
  });

  it('shows "No evidence images" when evidence is null', () => {
    render(<InventoryEvidencePanel evidence={null} />);

    expect(screen.getByTestId('evidence-no-images')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-no-images')).toHaveTextContent('No evidence images available for this session');
  });

  it('shows "No evidence images" when no URLs present', () => {
    render(<InventoryEvidencePanel evidence={{}} />);

    expect(screen.getByTestId('evidence-no-images')).toBeInTheDocument();
  });

  it('shows overlay toggle when overlays data present', () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    expect(screen.getByTestId('overlay-toggle')).toBeInTheDocument();
    expect(screen.getByText('Show overlays')).toBeInTheDocument();
  });

  it('does not show overlay toggle when no overlays data', () => {
    render(<InventoryEvidencePanel evidence={noOverlayEvidence} />);

    expect(screen.queryByTestId('overlay-toggle')).not.toBeInTheDocument();
  });

  it('shows bounding box divs when overlay toggled on', () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    // Initially no overlays visible
    expect(screen.queryByTestId('overlay-before-0')).not.toBeInTheDocument();

    // Toggle overlays on
    fireEvent.click(screen.getByTestId('overlay-toggle'));

    expect(screen.getByTestId('overlay-before-0')).toBeInTheDocument();
    expect(screen.getByTestId('overlay-after-0')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola (5)')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola (3)')).toBeInTheDocument();
  });

  it('opens fullscreen dialog on image click', () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    // Simulate load to show images
    fireEvent.load(screen.getByTestId('evidence-before'));
    fireEvent.load(screen.getByTestId('evidence-after'));

    fireEvent.click(screen.getByTestId('evidence-before'));

    expect(screen.getByTestId('evidence-modal')).toBeInTheDocument();
  });

  it('shows loading skeletons before images load', () => {
    const { container } = render(<InventoryEvidencePanel evidence={fullEvidence} />);

    // Skeleton should be present for images that haven't loaded
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it('hides skeletons after images load', () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    // Fire load events
    fireEvent.load(screen.getByTestId('evidence-before'));
    fireEvent.load(screen.getByTestId('evidence-after'));

    // Images should be visible (not hidden)
    expect(screen.getByTestId('evidence-before')).not.toHaveClass('hidden');
    expect(screen.getByTestId('evidence-after')).not.toHaveClass('hidden');
  });

  // ==========================================================================
  // Feature 056: Image Load Failure & Empty State Next Action (T004)
  // ==========================================================================

  it('shows error placeholder when before image fails to load', async () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    fireEvent.error(screen.getByTestId('evidence-before'));

    // After auto-refresh attempt (mock returns undefined → fails), shows error
    await waitFor(() => {
      expect(screen.getByTestId('evidence-before-error')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-before-error')).toHaveTextContent('Image unavailable');
    });
  });

  it('shows error placeholder when after image fails to load', async () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    fireEvent.error(screen.getByTestId('evidence-after'));

    await waitFor(() => {
      expect(screen.getByTestId('evidence-after-error')).toBeInTheDocument();
      expect(screen.getByTestId('evidence-after-error')).toHaveTextContent('Image unavailable');
    });
  });

  it('shows both error placeholders when both images fail', async () => {
    render(<InventoryEvidencePanel evidence={fullEvidence} />);

    fireEvent.error(screen.getByTestId('evidence-before'));

    // Wait for before error to settle before triggering after error
    await waitFor(() => {
      expect(screen.getByTestId('evidence-before-error')).toBeInTheDocument();
    });

    fireEvent.error(screen.getByTestId('evidence-after'));

    await waitFor(() => {
      expect(screen.getByTestId('evidence-after-error')).toBeInTheDocument();
    });
  });

  it('evidence empty state includes suggested next action', () => {
    render(<InventoryEvidencePanel evidence={null} />);

    expect(screen.getByTestId('evidence-no-images')).toHaveTextContent(
      'Check if the camera was online during this session'
    );
  });

  // ==========================================================================
  // Feature 058: Image Auto-Refresh (T014)
  // ==========================================================================

  describe('auto-refresh on image error (T014)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('before image error triggers refresh call', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce({
        url: 'https://example.com/fresh-before.jpg',
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      });

      render(<InventoryEvidencePanel evidence={fullEvidence} />);

      fireEvent.error(screen.getByTestId('evidence-before'));

      await waitFor(() => {
        expect(evidenceApi.refreshPresignedUrl).toHaveBeenCalledTimes(1);
      });
    });

    it('after image error triggers refresh independently', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce({
        url: 'https://example.com/fresh-after.jpg',
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      });

      render(<InventoryEvidencePanel evidence={fullEvidence} />);

      fireEvent.error(screen.getByTestId('evidence-after'));

      await waitFor(() => {
        expect(evidenceApi.refreshPresignedUrl).toHaveBeenCalledTimes(1);
      });
    });

    it('shows retry button when before image refresh fails', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce(null);

      render(<InventoryEvidencePanel evidence={fullEvidence} />);

      fireEvent.error(screen.getByTestId('evidence-before'));

      await waitFor(() => {
        expect(screen.getByTestId('evidence-before-retry')).toBeInTheDocument();
      });
    });

    it('shows retry button when after image refresh fails', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce(null);

      render(<InventoryEvidencePanel evidence={fullEvidence} />);

      fireEvent.error(screen.getByTestId('evidence-after'));

      await waitFor(() => {
        expect(screen.getByTestId('evidence-after-retry')).toBeInTheDocument();
      });
    });

    it('one failed image does not break the other', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce(null);

      render(<InventoryEvidencePanel evidence={fullEvidence} />);

      // Before image fails
      fireEvent.error(screen.getByTestId('evidence-before'));

      await waitFor(() => {
        expect(screen.getByTestId('evidence-before-error')).toBeInTheDocument();
      });

      // After image should still be present (not errored)
      expect(screen.getByTestId('evidence-after')).toBeInTheDocument();
    });

    it('retry button resets and allows re-loading per image', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce(null);

      render(<InventoryEvidencePanel evidence={fullEvidence} />);

      fireEvent.error(screen.getByTestId('evidence-before'));

      await waitFor(() => {
        expect(screen.getByTestId('evidence-before-retry')).toBeInTheDocument();
      });

      // Click retry on the before image
      fireEvent.click(screen.getByTestId('evidence-before-retry'));

      // Should restore the before image (back to loading/visible state)
      await waitFor(() => {
        expect(screen.getByTestId('evidence-before')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Feature 058: Debug panel (T023)
  // ==========================================================================

  describe('debug panel (T023)', () => {
    it('has debug info section when URLs are present', () => {
      render(<InventoryEvidencePanel evidence={fullEvidence} />);

      expect(screen.getByTestId('evidence-debug-info')).toBeInTheDocument();
    });

    it('does not show debug section when no URLs (empty evidence)', () => {
      render(<InventoryEvidencePanel evidence={null} />);

      expect(screen.queryByTestId('evidence-debug-info')).not.toBeInTheDocument();
    });

    it('shows extracted object keys when debug section is expanded', async () => {
      const user = userEvent.setup();
      const evidenceWithPaths: EvidenceImages = {
        before_image_url: 'https://minio.example.com/bucket/sessions/sess-1/before.jpg?X-Amz-Signature=abc',
        after_image_url: 'https://minio.example.com/bucket/sessions/sess-1/after.jpg?X-Amz-Signature=def',
      };

      render(<InventoryEvidencePanel evidence={evidenceWithPaths} />);

      // Debug content should be hidden initially
      expect(screen.queryByTestId('debug-key-before-object-key')).not.toBeInTheDocument();

      // Expand debug section
      await user.click(screen.getByRole('button', { name: /Debug Info/i }));

      // Object keys should now be visible
      expect(screen.getByTestId('debug-key-before-object-key')).toHaveTextContent(
        'bucket/sessions/sess-1/before.jpg'
      );
      expect(screen.getByTestId('debug-key-after-object-key')).toHaveTextContent(
        'bucket/sessions/sess-1/after.jpg'
      );
    });

    it('copy button calls navigator.clipboard with correct key', async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      });

      const evidenceWithPaths: EvidenceImages = {
        before_image_url: 'https://minio.example.com/bucket/before.jpg?sig=abc',
        after_image_url: 'https://minio.example.com/bucket/after.jpg?sig=def',
      };

      render(<InventoryEvidencePanel evidence={evidenceWithPaths} />);

      // Expand debug section
      await user.click(screen.getByRole('button', { name: /Debug Info/i }));

      // Click copy for the before key
      await user.click(screen.getByTestId('debug-copy-before-object-key'));

      expect(writeText).toHaveBeenCalledWith('bucket/before.jpg');
    });

    it('collapsible toggle works', async () => {
      const user = userEvent.setup();

      render(<InventoryEvidencePanel evidence={fullEvidence} />);

      // Expand
      await user.click(screen.getByRole('button', { name: /Debug Info/i }));
      expect(screen.getByTestId('debug-key-before-object-key')).toBeInTheDocument();

      // Collapse
      await user.click(screen.getByRole('button', { name: /Debug Info/i }));
      expect(screen.queryByTestId('debug-key-before-object-key')).not.toBeInTheDocument();
    });
  });
});
