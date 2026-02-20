/**
 * EvidenceThumbnail Component Tests
 * Feature: 038-dev-observability-panels (T046)
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Tests for evidence thumbnail display using V1 CaptureEntry format.
 * - Base64 image src via getImageSrc()
 * - S3-only placeholder state
 * - Image not available state
 * - capture_tag badge rendering
 * - device_id and created_at metadata
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../setup/test-utils';
import { EvidenceThumbnail } from '@/presentation/components/diagnostics/EvidenceThumbnail';
import type { CaptureEntry } from '@/infrastructure/api/diagnostics-schemas';

// Mock evidence API helpers (used internally by the component)
vi.mock('@/infrastructure/api/evidence', () => ({
  getImageSrc: (capture: CaptureEntry) => {
    if (capture.image_data) {
      return `data:${capture.content_type || 'image/jpeg'};base64,${capture.image_data}`;
    }
    return '';
  },
  hasImageData: (capture: CaptureEntry) => !!capture.image_data,
  isS3Only: (capture: CaptureEntry) => !capture.image_data && !!capture.object_key,
}));

// Small base64 stub for tests
const STUB_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof';

// Test fixtures (V1 CaptureEntry format)
const captureWithImage: CaptureEntry = {
  evidence_id: 'ev-001',
  capture_tag: 'BEFORE_OPEN',
  status: 'captured',
  device_id: 'espcam-b0f7f1',
  container_id: 'ctr-abc-003',
  session_id: 'sess-completed-001',
  created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  image_data: STUB_BASE64,
  content_type: 'image/jpeg',
  image_size_bytes: 245760,
  object_key: 'evidence/sess-completed-001/before-open.jpg',
  upload_status: 'uploaded',
};

const captureS3Only: CaptureEntry = {
  evidence_id: 'ev-003',
  capture_tag: 'AFTER_CLOSE',
  status: 'captured',
  device_id: 'espcam-d4e5f6',
  container_id: 'ctr-abc-003',
  session_id: 'sess-completed-001',
  created_at: new Date(Date.now() - 200 * 60_000).toISOString(),
  content_type: 'image/jpeg',
  image_size_bytes: 312000,
  object_key: 'evidence/sess-completed-001/after-close-cam2.jpg',
  upload_status: 'uploaded',
};

const captureNoImage: CaptureEntry = {
  evidence_id: 'ev-004',
  capture_tag: 'BEFORE_CLOSE',
  status: 'captured',
  device_id: 'espcam-a1b2c3',
  container_id: 'ctr-abc-005',
  session_id: 'sess-failed-001',
  created_at: new Date(Date.now() - 44 * 60_000).toISOString(),
};

describe('EvidenceThumbnail', () => {
  describe('base64 image rendering', () => {
    it('should have correct data-testid', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} />);

      expect(screen.getByTestId('evidence-thumbnail-ev-001')).toBeInTheDocument();
    });

    it('should render image with base64 data URI src', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute(
        'src',
        `data:image/jpeg;base64,${STUB_BASE64}`
      );
    });

    it('should render image with alt text using evidence_id', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Evidence ev-001');
    });

    it('should use lazy loading attribute', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('capture_tag badge', () => {
    it('should render capture_tag badge for image captures', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} />);

      const badge = screen.getByTestId('capture-tag-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Before Open');
    });

    it('should render capture_tag badge for S3-only captures', () => {
      render(<EvidenceThumbnail evidence={captureS3Only} />);

      const badge = screen.getByTestId('capture-tag-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('After Close');
    });

    it('should render capture_tag badge for no-image captures', () => {
      render(<EvidenceThumbnail evidence={captureNoImage} />);

      const badge = screen.getByTestId('capture-tag-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Before Close');
    });
  });

  describe('S3-only placeholder state', () => {
    it('should show "Stored in S3" placeholder when only object_key exists', () => {
      render(<EvidenceThumbnail evidence={captureS3Only} />);

      expect(screen.getByTestId('thumbnail-s3-only')).toBeInTheDocument();
      expect(screen.getByText('Stored in S3')).toBeInTheDocument();
    });

    it('should display the object_key in the S3 placeholder', () => {
      render(<EvidenceThumbnail evidence={captureS3Only} />);

      expect(
        screen.getByText('evidence/sess-completed-001/after-close-cam2.jpg')
      ).toBeInTheDocument();
    });

    it('should not render an img element for S3-only captures', () => {
      render(<EvidenceThumbnail evidence={captureS3Only} />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('image not available state', () => {
    it('should show "Image not available" when no image_data and no object_key', () => {
      render(<EvidenceThumbnail evidence={captureNoImage} />);

      expect(screen.getByTestId('thumbnail-no-image')).toBeInTheDocument();
      expect(screen.getByText('Image not available')).toBeInTheDocument();
    });

    it('should not render an img element for no-image captures', () => {
      render(<EvidenceThumbnail evidence={captureNoImage} />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading skeleton initially for image captures', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} />);

      const card = screen.getByTestId('evidence-thumbnail-ev-001');
      expect(card.querySelector('.animate-pulse, [data-slot="skeleton"]')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('should show error state when image fails to load', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} />);

      const img = screen.getByRole('img');
      fireEvent.error(img);

      expect(screen.getByTestId('thumbnail-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} />);

      const img = screen.getByRole('img');
      fireEvent.error(img);

      expect(screen.getByTestId('thumbnail-retry-button')).toBeInTheDocument();
    });

    it('should reset to loading state when retry is clicked', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} />);

      const img = screen.getByRole('img');
      fireEvent.error(img);

      fireEvent.click(screen.getByTestId('thumbnail-retry-button'));

      // After retry, error state should be gone (back to loading)
      expect(screen.queryByTestId('thumbnail-error')).not.toBeInTheDocument();
    });
  });

  describe('loaded state', () => {
    it('should hide skeleton when image loads', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} />);

      const img = screen.getByRole('img');
      fireEvent.load(img);

      expect(img).not.toHaveClass('invisible');
    });

    it('should show metadata overlay with device_id when loaded', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} />);

      const img = screen.getByRole('img');
      fireEvent.load(img);

      expect(screen.getByText('espcam-b0f7f1')).toBeInTheDocument();
    });
  });

  describe('click interaction', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn();

      render(<EvidenceThumbnail evidence={captureWithImage} onClick={onClick} />);

      const card = screen.getByTestId('evidence-thumbnail-ev-001');
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalled();
    });

    it('should have cursor-pointer class', () => {
      render(<EvidenceThumbnail evidence={captureWithImage} onClick={() => {}} />);

      const card = screen.getByTestId('evidence-thumbnail-ev-001');
      expect(card).toHaveClass('cursor-pointer');
    });
  });
});
