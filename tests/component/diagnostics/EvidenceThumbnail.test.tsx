/**
 * EvidenceThumbnail Component Tests
 * Feature: 038-dev-observability-panels (T046)
 *
 * Tests for evidence thumbnail display.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../setup/test-utils';
import { EvidenceThumbnail } from '@/presentation/components/diagnostics/EvidenceThumbnail';
import type { EvidenceCapture } from '@/infrastructure/api/diagnostics-schemas';

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
    it('should show error state when image fails to load', () => {
      render(<EvidenceThumbnail evidence={mockEvidence} />);

      const img = screen.getByRole('img');
      fireEvent.error(img);

      expect(screen.getByTestId('thumbnail-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
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
});
