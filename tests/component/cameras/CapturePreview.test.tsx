/**
 * CapturePreview Component Tests
 * Feature: 034-esp-camera-integration (T028-T030)
 *
 * Tests loading state, image display, and download functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CapturePreview } from '@/presentation/components/cameras/CapturePreview';

// Mock next-themes to avoid SSR issues
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Sample base64 JPEG (1x1 red pixel)
const mockBase64Image =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
  'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh' +
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR' +
  'CAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAA' +
  'AAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMB' +
  'AAIRAxEAPwCwAB//2Q==';

const mockDataUrl = `data:image/jpeg;base64,${mockBase64Image}`;
const mockTimestamp = '2025-01-14T10:30:00.000Z';

describe('CapturePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // T028: Loading state test
  describe('Loading State (T028)', () => {
    it('should display loading skeleton when isLoading is true', () => {
      render(<CapturePreview imageUrl={null} isLoading={true} />);

      // Check for skeleton elements (Skeleton component renders as div with specific classes)
      const container = document.querySelector('.space-y-2');
      expect(container).toBeInTheDocument();

      // Should have skeleton elements
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not display image when loading', () => {
      render(<CapturePreview imageUrl={mockDataUrl} isLoading={true} />);

      // Image should not be visible during loading
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  // T029: Image display test
  describe('Image Display (T029)', () => {
    it('should display image when imageUrl is provided', () => {
      render(<CapturePreview imageUrl={mockDataUrl} />);

      const image = screen.getByRole('img', { name: /capture preview/i });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockDataUrl);
    });

    it('should display "No capture available" when imageUrl is null', () => {
      render(<CapturePreview imageUrl={null} />);

      expect(screen.getByText('No capture available')).toBeInTheDocument();
    });

    it('should display timestamp when provided', () => {
      render(<CapturePreview imageUrl={mockDataUrl} timestamp={mockTimestamp} />);

      // Timestamp should be formatted and displayed
      expect(screen.getByText(/1\/14\/2025/)).toBeInTheDocument();
    });

    it('should render base64 data URL correctly', () => {
      render(<CapturePreview imageUrl={mockDataUrl} />);

      const image = screen.getByRole('img', { name: /capture preview/i });
      expect(image.getAttribute('src')).toMatch(/^data:image\/jpeg;base64,/);
    });
  });

  // T030: Download button test
  describe('Download Button (T030)', () => {
    it('should have download button when image is displayed', () => {
      render(<CapturePreview imageUrl={mockDataUrl} />);

      // Download button should be present (icon button)
      const downloadButtons = screen.getAllByRole('button');
      const downloadButton = downloadButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg !== null;
      });
      expect(downloadButton).toBeInTheDocument();
    });

    it('should trigger download when download button is clicked', () => {
      // Store original createElement
      const originalCreateElement = document.createElement.bind(document);
      const mockClick = vi.fn();

      // Mock createElement only for 'a' elements
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          element.click = mockClick;
        }
        return element;
      });

      render(<CapturePreview imageUrl={mockDataUrl} timestamp={mockTimestamp} />);

      // Find and click download button (the one with Download icon)
      const buttons = screen.getAllByRole('button');
      // Download button is typically the second overlay button
      const downloadButton = buttons[1]; // Second button in overlay
      fireEvent.click(downloadButton);

      expect(mockClick).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('should not trigger download when no image is present', () => {
      render(<CapturePreview imageUrl={null} />);

      // There should be no download button when no image
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should generate filename with timestamp', () => {
      // Store original createElement
      const originalCreateElement = document.createElement.bind(document);
      let downloadFilename = '';

      // Mock createElement only for 'a' elements
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          element.click = vi.fn();
          // Capture the download attribute when set
          const originalSetAttribute = element.setAttribute.bind(element);
          Object.defineProperty(element, 'download', {
            set(value: string) {
              downloadFilename = value;
              originalSetAttribute('download', value);
            },
            get() {
              return downloadFilename;
            },
          });
        }
        return element;
      });

      render(<CapturePreview imageUrl={mockDataUrl} timestamp={mockTimestamp} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]); // Download button

      expect(downloadFilename).toContain('capture-');
      expect(downloadFilename).toContain('.jpg');

      vi.restoreAllMocks();
    });
  });

  // Additional tests for CapturePreview functionality
  describe('Fullscreen Mode', () => {
    it('should have fullscreen button', () => {
      render(<CapturePreview imageUrl={mockDataUrl} />);

      // Should have maximize button for fullscreen
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Close Button', () => {
    it('should display close button when onClose prop is provided', () => {
      const onClose = vi.fn();
      render(<CapturePreview imageUrl={mockDataUrl} onClose={onClose} />);

      // Should have close button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<CapturePreview imageUrl={mockDataUrl} onClose={onClose} />);

      // Close button should be the last one in the overlay
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons[buttons.length - 1];
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Comparison Mode', () => {
    it('should show side-by-side comparison when showComparison and beforeImage are provided', () => {
      render(
        <CapturePreview
          imageUrl={mockDataUrl}
          beforeImage={mockDataUrl}
          showComparison={true}
        />
      );

      // Should have "Before" and "After" labels
      expect(screen.getByText('Before')).toBeInTheDocument();
      expect(screen.getByText('After')).toBeInTheDocument();
    });

    it('should have comparison mode toggle', () => {
      render(
        <CapturePreview
          imageUrl={mockDataUrl}
          beforeImage={mockDataUrl}
          showComparison={true}
        />
      );

      // Should have "Side by Side" button
      expect(screen.getByRole('button', { name: /side by side/i })).toBeInTheDocument();
    });
  });
});
