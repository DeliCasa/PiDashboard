/**
 * EvidenceThumbnail Component Tests
 * Feature: 038-dev-observability-panels (T046)
 *
 * Tests for evidence thumbnail display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../setup/test-utils';
import { EvidenceThumbnail } from '@/presentation/components/diagnostics/EvidenceThumbnail';
import { evidenceApi } from '@/infrastructure/api/evidence';
import type { EvidenceCapture } from '@/infrastructure/api/diagnostics-schemas';

// Mock evidence API for auto-refresh tests
vi.mock('@/infrastructure/api/evidence', () => ({
  evidenceApi: {
    refreshPresignedUrl: vi.fn(),
  },
}));

// Test fixtures
const mockEvidence: EvidenceCapture = {
  id: 'img-001',
  session_id: 'sess-12345',
  captured_at: new Date(Date.now() - 5 * 60_000).toISOString(), // 5 minutes ago
  camera_id: 'espcam-b0f7f1',
  thumbnail_url: 'https://example.com/thumb.jpg',
  full_url: 'https://example.com/full.jpg',
  expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  size_bytes: 45678,
  content_type: 'image/jpeg',
};

describe('EvidenceThumbnail', () => {
  describe('rendering', () => {
    it('should have correct data-testid', () => {
      render(<EvidenceThumbnail evidence={mockEvidence} />);

      expect(screen.getByTestId('evidence-thumbnail-img-001')).toBeInTheDocument();
    });

    it('should render image with correct src', () => {
      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    });

    it('should render image with alt text', () => {
      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Evidence img-001');
    });
  });

  describe('loading state', () => {
    it('should show loading skeleton initially', () => {
      render(<EvidenceThumbnail evidence={mockEvidence} />);

      // Image starts loading, skeleton should be visible
      const card = screen.getByTestId('evidence-thumbnail-img-001');
      expect(card.querySelector('.animate-pulse, [data-slot="skeleton"]')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('should show error state when image fails to load', async () => {
      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');
      fireEvent.error(img);

      // After auto-refresh attempt (mock returns undefined → fails), shows permanent error
      await waitFor(() => {
        expect(screen.getByTestId('thumbnail-error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
      });
    });
  });

  describe('loaded state', () => {
    it('should hide skeleton when image loads', () => {
      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');
      fireEvent.load(img);

      // Image should be visible (not have invisible class)
      expect(img).not.toHaveClass('invisible');
    });

    it('should show metadata overlay when loaded', () => {
      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');
      fireEvent.load(img);

      // Should show camera ID
      expect(screen.getByText('espcam-b0f7f1')).toBeInTheDocument();
    });
  });

  describe('click interaction', () => {
    it('should call onClick when clicked', async () => {
      const onClick = vi.fn();

      render(<EvidenceThumbnail evidence={mockEvidence} onClick={onClick} />);

      const card = screen.getByTestId('evidence-thumbnail-img-001');
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalled();
    });

    it('should have cursor-pointer class', () => {
      render(<EvidenceThumbnail evidence={mockEvidence} onClick={() => {}} />);

      const card = screen.getByTestId('evidence-thumbnail-img-001');
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  describe('lazy loading', () => {
    it('should use lazy loading attribute', () => {
      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('auto-refresh on error (T012)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should call refreshPresignedUrl when image fails to load', async () => {
      const freshUrl = 'https://example.com/fresh-thumb.jpg';
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce({
        url: freshUrl,
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      });

      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');
      fireEvent.error(img);

      await waitFor(() => {
        expect(evidenceApi.refreshPresignedUrl).toHaveBeenCalledTimes(1);
      });
    });

    it('should update image src after successful refresh', async () => {
      const freshUrl = 'https://example.com/fresh-thumb.jpg';
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce({
        url: freshUrl,
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      });

      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');
      fireEvent.error(img);

      await waitFor(() => {
        expect(img).toHaveAttribute('src', freshUrl);
      });
    });

    it('should show failed state when refresh returns null', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce(null);

      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByTestId('thumbnail-retry-button')).toBeInTheDocument();
      });
    });

    it('should show failed state when refresh throws', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockRejectedValueOnce(new Error('Network'));

      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByTestId('thumbnail-retry-button')).toBeInTheDocument();
      });
    });

    it('should not retry more than once (max 1 auto-retry)', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValue({
        url: 'https://example.com/fresh.jpg',
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      });

      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');

      // First error triggers auto-refresh
      fireEvent.error(img);

      await waitFor(() => {
        expect(img).toHaveAttribute('src', 'https://example.com/fresh.jpg');
      });

      // Second error (from refreshed URL also failing) should go to failed state
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByTestId('thumbnail-retry-button')).toBeInTheDocument();
      });

      // Should only have called refresh once
      expect(evidenceApi.refreshPresignedUrl).toHaveBeenCalledTimes(1);
    });

    it('retry button resets state and allows re-loading', async () => {
      vi.mocked(evidenceApi.refreshPresignedUrl).mockResolvedValueOnce(null);

      render(<EvidenceThumbnail evidence={mockEvidence} onClick={() => {}} />);

      const img = screen.getByRole('img');
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByTestId('thumbnail-retry-button')).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByTestId('thumbnail-retry-button'));

      // Should reset to loading state with original URL
      expect(img).toHaveAttribute('src', mockEvidence.thumbnail_url);
    });
  });
});
