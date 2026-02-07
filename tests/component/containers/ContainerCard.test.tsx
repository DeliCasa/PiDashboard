/**
 * ContainerCard Component Tests
 * Feature: 043-container-identity-ui (T004)
 *
 * Tests label-first display pattern, ID display, and camera status counts.
 * User Story 1: View containers with label-first display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContainerCard } from '@/presentation/components/containers/ContainerCard';
import {
  mockContainerDetailWithCamera,
  mockContainerDetailEmpty,
  mockContainerDetailUnlabeled,
  mockContainerDetailMixedCameras,
  mockContainerDetailFull,
  mockContainerDetailAllOffline,
} from '../../mocks/container-mocks';

// Mock next-themes to avoid SSR issues
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ContainerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // US1: Label-First Display Pattern
  // ===========================================================================

  describe('Label-First Display (US1)', () => {
    it('displays label prominently when present', () => {
      render(<ContainerCard container={mockContainerDetailWithCamera} />);

      const label = screen.getByText('Kitchen Fridge');
      expect(label).toBeInTheDocument();
      // Label should not be styled as muted/italic
      expect(label).not.toHaveClass('text-muted-foreground');
      expect(label).not.toHaveClass('italic');
    });

    it('shows "Unnamed Container" placeholder when no label', () => {
      render(<ContainerCard container={mockContainerDetailUnlabeled} />);

      const placeholder = screen.getByText('Unnamed Container');
      expect(placeholder).toBeInTheDocument();
      // Placeholder should be styled differently
      expect(placeholder).toHaveClass('text-muted-foreground');
      expect(placeholder).toHaveClass('italic');
    });

    it('treats empty string label as missing label', () => {
      const emptyLabelContainer = {
        ...mockContainerDetailWithCamera,
        label: '',
      };
      render(<ContainerCard container={emptyLabelContainer} />);

      expect(screen.getByText('Unnamed Container')).toBeInTheDocument();
    });

    it('treats whitespace-only label as missing label', () => {
      const whitespaceContainer = {
        ...mockContainerDetailWithCamera,
        label: '   ',
      };
      render(<ContainerCard container={whitespaceContainer} />);

      expect(screen.getByText('Unnamed Container')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Opaque ID Display
  // ===========================================================================

  describe('Opaque ID Display', () => {
    it('displays container ID in monospace font', () => {
      render(<ContainerCard container={mockContainerDetailWithCamera} />);

      const idElement = screen.getByText(mockContainerDetailWithCamera.id);
      expect(idElement).toBeInTheDocument();
      expect(idElement).toHaveClass('font-mono');
    });

    it('displays ID secondary to label (in CardDescription)', () => {
      render(<ContainerCard container={mockContainerDetailWithCamera} />);

      // ID should be in the CardDescription element with text-xs
      const idElement = screen.getByText(mockContainerDetailWithCamera.id);
      expect(idElement).toHaveClass('text-xs');
    });

    it('always displays ID regardless of label presence', () => {
      render(<ContainerCard container={mockContainerDetailUnlabeled} />);

      expect(screen.getByText(mockContainerDetailUnlabeled.id)).toBeInTheDocument();
    });

    it('does not interpret or parse ID semantically', () => {
      // The ID should be displayed as-is, never parsed
      const opaqueIdContainer = {
        ...mockContainerDetailWithCamera,
        id: 'some-opaque-uuid-that-means-nothing',
      };
      render(<ContainerCard container={opaqueIdContainer} />);

      expect(screen.getByText('some-opaque-uuid-that-means-nothing')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Camera Count Display
  // ===========================================================================

  describe('Camera Count Display', () => {
    it('displays camera count with total capacity', () => {
      render(<ContainerCard container={mockContainerDetailWithCamera} />);

      expect(screen.getByText(/1\/4 cameras/)).toBeInTheDocument();
    });

    it('shows online count for containers with cameras', () => {
      render(<ContainerCard container={mockContainerDetailMixedCameras} />);

      // Should show online count (1 online out of 3)
      const onlineIndicator = screen.getByText('1');
      expect(onlineIndicator).toBeInTheDocument();
    });

    it('shows offline count when some cameras are offline', () => {
      render(<ContainerCard container={mockContainerDetailMixedCameras} />);

      // MixedCameras: 3 cameras, 1 online, 2 offline
      const offlineIndicator = screen.getByText('2');
      expect(offlineIndicator).toBeInTheDocument();
    });

    it('does not show status counts for empty containers', () => {
      const { container } = render(<ContainerCard container={mockContainerDetailEmpty} />);

      // Empty container should show 0/4 cameras but no online/offline indicators
      expect(screen.getByText(/0\/4 cameras/)).toBeInTheDocument();
      // Should not have CheckCircle or AlertCircle icons with numbers
      const statusIcons = container.querySelectorAll('.text-green-600, .text-yellow-600');
      expect(statusIcons.length).toBe(0);
    });

    it('shows only offline count when all cameras are offline', () => {
      render(<ContainerCard container={mockContainerDetailAllOffline} />);

      // AllOffline: 2 cameras, 0 online, 2 offline
      expect(screen.getByText('2')).toBeInTheDocument();
      // Should not show a 0 for online count
      expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Full Container Badge
  // ===========================================================================

  describe('Full Container Badge', () => {
    it('displays "Full" badge when container has 4 cameras', () => {
      render(<ContainerCard container={mockContainerDetailFull} />);

      expect(screen.getByText('Full')).toBeInTheDocument();
    });

    it('does not display "Full" badge for containers with fewer than 4 cameras', () => {
      render(<ContainerCard container={mockContainerDetailMixedCameras} />);

      expect(screen.queryByText('Full')).not.toBeInTheDocument();
    });

    it('does not display "Full" badge for empty containers', () => {
      render(<ContainerCard container={mockContainerDetailEmpty} />);

      expect(screen.queryByText('Full')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Description Display
  // ===========================================================================

  describe('Description Display', () => {
    it('displays description when present', () => {
      render(<ContainerCard container={mockContainerDetailWithCamera} />);

      expect(screen.getByText('Main refrigerator in kitchen')).toBeInTheDocument();
    });

    it('does not render description element when description is missing', () => {
      const noDescContainer = {
        ...mockContainerDetailWithCamera,
        description: undefined,
      };
      render(<ContainerCard container={noDescContainer} />);

      // Description should not be rendered
      expect(screen.queryByText('Main refrigerator in kitchen')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction
  // ===========================================================================

  describe('Interaction', () => {
    it('calls onClick when card is clicked', () => {
      const onClick = vi.fn();
      render(<ContainerCard container={mockContainerDetailWithCamera} onClick={onClick} />);

      const card = screen.getByTestId(`container-card-${mockContainerDetailWithCamera.id}`);
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('has cursor-pointer class for clickable cards', () => {
      render(<ContainerCard container={mockContainerDetailWithCamera} onClick={vi.fn()} />);

      const card = screen.getByTestId(`container-card-${mockContainerDetailWithCamera.id}`);
      expect(card).toHaveClass('cursor-pointer');
    });

    it('applies custom className when provided', () => {
      render(
        <ContainerCard
          container={mockContainerDetailWithCamera}
          className="custom-test-class"
        />
      );

      const card = screen.getByTestId(`container-card-${mockContainerDetailWithCamera.id}`);
      expect(card).toHaveClass('custom-test-class');
    });
  });

  // ===========================================================================
  // Data Test IDs
  // ===========================================================================

  describe('Test IDs', () => {
    it('has data-testid with container ID', () => {
      render(<ContainerCard container={mockContainerDetailWithCamera} />);

      expect(
        screen.getByTestId(`container-card-${mockContainerDetailWithCamera.id}`)
      ).toBeInTheDocument();
    });
  });
});
