/**
 * EmptyState Component Tests
 * Feature: 043-container-identity-ui (T006)
 *
 * Tests empty state display and create container action.
 * User Story 1: View containers with label-first display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/presentation/components/containers/EmptyState';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('EmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // Visual Elements
  // ===========================================================================

  describe('Visual Elements', () => {
    it('displays package icon', () => {
      const { container } = render(<EmptyState onCreateClick={vi.fn()} />);

      // Package icon should be present (lucide-react icon)
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('displays "No containers yet" heading', () => {
      render(<EmptyState onCreateClick={vi.fn()} />);

      expect(screen.getByText('No containers yet')).toBeInTheDocument();
    });

    it('displays helpful description text', () => {
      render(<EmptyState onCreateClick={vi.fn()} />);

      expect(
        screen.getByText(/Containers organize your cameras into logical groups/)
      ).toBeInTheDocument();
    });

    it('has data-testid for empty state container', () => {
      render(<EmptyState onCreateClick={vi.fn()} />);

      expect(screen.getByTestId('containers-empty')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Create Button
  // ===========================================================================

  describe('Create Button', () => {
    it('displays "Create Container" button', () => {
      render(<EmptyState onCreateClick={vi.fn()} />);

      expect(
        screen.getByRole('button', { name: /create container/i })
      ).toBeInTheDocument();
    });

    it('calls onCreateClick when button is clicked', () => {
      const onCreateClick = vi.fn();
      render(<EmptyState onCreateClick={onCreateClick} />);

      const createButton = screen.getByRole('button', { name: /create container/i });
      fireEvent.click(createButton);

      expect(onCreateClick).toHaveBeenCalledTimes(1);
    });

    it('button has plus icon', () => {
      render(<EmptyState onCreateClick={vi.fn()} />);

      // The button contains a Plus icon from lucide-react
      const button = screen.getByRole('button', { name: /create container/i });
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Styling
  // ===========================================================================

  describe('Styling', () => {
    it('centers content in container', () => {
      render(<EmptyState onCreateClick={vi.fn()} />);

      const container = screen.getByTestId('containers-empty');
      expect(container).toHaveClass('text-center');
    });

    it('has appropriate padding', () => {
      render(<EmptyState onCreateClick={vi.fn()} />);

      const container = screen.getByTestId('containers-empty');
      expect(container).toHaveClass('py-12');
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe('Accessibility', () => {
    it('heading is semantically marked', () => {
      render(<EmptyState onCreateClick={vi.fn()} />);

      // "No containers yet" should be in an h3
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('No containers yet');
    });

    it('button is focusable', () => {
      render(<EmptyState onCreateClick={vi.fn()} />);

      const button = screen.getByRole('button', { name: /create container/i });
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });
});
