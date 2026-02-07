/**
 * EditContainerDialog Component Tests
 * Feature: 043-container-identity-ui (T016)
 *
 * Tests for editing container label and description.
 * User Story 5: Edit container label and description
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditContainerDialog } from '@/presentation/components/containers/EditContainerDialog';
import type { ContainerDetail } from '@/infrastructure/api/v1-containers';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock container for testing
const mockContainer: ContainerDetail = {
  id: 'container-abc-123',
  label: 'Kitchen Fridge',
  description: 'Main refrigerator in the kitchen',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  cameras: [],
  camera_count: 0,
  online_count: 0,
};

const mockContainerNoLabel: ContainerDetail = {
  id: 'container-xyz-789',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  cameras: [],
  camera_count: 0,
  online_count: 0,
};

describe('EditContainerDialog', () => {
  const defaultProps = {
    container: mockContainer,
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isUpdating: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // Dialog Visibility
  // ===========================================================================

  describe('Dialog Visibility', () => {
    it('renders dialog when open is true', () => {
      render(<EditContainerDialog {...defaultProps} />);

      expect(screen.getByTestId('edit-container-dialog')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(<EditContainerDialog {...defaultProps} open={false} />);

      expect(screen.queryByTestId('edit-container-dialog')).not.toBeInTheDocument();
    });

    it('does not render when container is null', () => {
      render(<EditContainerDialog {...defaultProps} container={null} />);

      expect(screen.queryByTestId('edit-container-dialog')).not.toBeInTheDocument();
    });

    it('displays "Edit Container" title', () => {
      render(<EditContainerDialog {...defaultProps} />);

      const dialog = screen.getByTestId('edit-container-dialog');
      expect(dialog).toHaveTextContent('Edit Container');
    });

    it('displays container ID in description', () => {
      render(<EditContainerDialog {...defaultProps} />);

      expect(screen.getByText('container-abc-123')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Fields
  // ===========================================================================

  describe('Form Fields', () => {
    it('displays label input field', () => {
      render(<EditContainerDialog {...defaultProps} />);

      expect(screen.getByTestId('edit-container-label-input')).toBeInTheDocument();
    });

    it('populates label with existing value', () => {
      render(<EditContainerDialog {...defaultProps} />);

      expect(screen.getByTestId('edit-container-label-input')).toHaveValue('Kitchen Fridge');
    });

    it('displays description textarea', () => {
      render(<EditContainerDialog {...defaultProps} />);

      expect(screen.getByTestId('edit-container-description-input')).toBeInTheDocument();
    });

    it('populates description with existing value', () => {
      render(<EditContainerDialog {...defaultProps} />);

      expect(screen.getByTestId('edit-container-description-input')).toHaveValue(
        'Main refrigerator in the kitchen'
      );
    });

    it('shows empty fields when container has no label/description', () => {
      render(<EditContainerDialog {...defaultProps} container={mockContainerNoLabel} />);

      expect(screen.getByTestId('edit-container-label-input')).toHaveValue('');
      expect(screen.getByTestId('edit-container-description-input')).toHaveValue('');
    });

    it('marks label as optional', () => {
      render(<EditContainerDialog {...defaultProps} />);

      expect(screen.getAllByText('(optional)').length).toBeGreaterThan(0);
    });

    it('shows character count for description', () => {
      render(<EditContainerDialog {...defaultProps} />);

      // Description is "Main refrigerator in the kitchen" = 32 characters
      expect(screen.getByText('32/500 characters')).toBeInTheDocument();
    });

    it('updates character count as user types', async () => {
      const user = userEvent.setup();
      render(<EditContainerDialog {...defaultProps} container={mockContainerNoLabel} />);

      const textarea = screen.getByTestId('edit-container-description-input');
      await user.type(textarea, 'New description');

      expect(screen.getByText('15/500 characters')).toBeInTheDocument();
    });

    it('has placeholder for label input', () => {
      render(<EditContainerDialog {...defaultProps} container={mockContainerNoLabel} />);

      const input = screen.getByTestId('edit-container-label-input');
      expect(input).toHaveAttribute('placeholder', 'e.g., Main Fridge, Storage Room');
    });

    it('enforces max length of 100 for label', () => {
      render(<EditContainerDialog {...defaultProps} />);

      const input = screen.getByTestId('edit-container-label-input');
      expect(input).toHaveAttribute('maxLength', '100');
    });

    it('enforces max length of 500 for description', () => {
      render(<EditContainerDialog {...defaultProps} />);

      const textarea = screen.getByTestId('edit-container-description-input');
      expect(textarea).toHaveAttribute('maxLength', '500');
    });
  });

  // ===========================================================================
  // Form Submission
  // ===========================================================================

  describe('Form Submission', () => {
    it('calls onSubmit with updated label and description', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EditContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      const labelInput = screen.getByTestId('edit-container-label-input');
      await user.clear(labelInput);
      await user.type(labelInput, 'Updated Label');

      await user.click(screen.getByTestId('edit-container-submit'));

      expect(onSubmit).toHaveBeenCalledWith({
        label: 'Updated Label',
        description: 'Main refrigerator in the kitchen',
      });
    });

    it('trims whitespace from label', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EditContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      const labelInput = screen.getByTestId('edit-container-label-input');
      await user.clear(labelInput);
      await user.type(labelInput, '  Trimmed Label  ');

      await user.click(screen.getByTestId('edit-container-submit'));

      expect(onSubmit).toHaveBeenCalledWith({
        label: 'Trimmed Label',
        description: 'Main refrigerator in the kitchen',
      });
    });

    it('submits undefined for empty label', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EditContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      const labelInput = screen.getByTestId('edit-container-label-input');
      await user.clear(labelInput);

      await user.click(screen.getByTestId('edit-container-submit'));

      expect(onSubmit).toHaveBeenCalledWith({
        label: undefined,
        description: 'Main refrigerator in the kitchen',
      });
    });

    it('submits undefined for both when clearing all fields', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EditContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      const labelInput = screen.getByTestId('edit-container-label-input');
      const descriptionInput = screen.getByTestId('edit-container-description-input');
      await user.clear(labelInput);
      await user.clear(descriptionInput);

      await user.click(screen.getByTestId('edit-container-submit'));

      expect(onSubmit).toHaveBeenCalledWith({
        label: undefined,
        description: undefined,
      });
    });
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe('Loading State', () => {
    it('shows "Saving..." when isUpdating is true', () => {
      render(<EditContainerDialog {...defaultProps} isUpdating={true} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('disables submit button when updating', () => {
      render(<EditContainerDialog {...defaultProps} isUpdating={true} />);

      expect(screen.getByTestId('edit-container-submit')).toBeDisabled();
    });

    it('disables cancel button when updating', () => {
      render(<EditContainerDialog {...defaultProps} isUpdating={true} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('disables input fields when updating', () => {
      render(<EditContainerDialog {...defaultProps} isUpdating={true} />);

      expect(screen.getByTestId('edit-container-label-input')).toBeDisabled();
      expect(screen.getByTestId('edit-container-description-input')).toBeDisabled();
    });
  });

  // ===========================================================================
  // Cancel and Close
  // ===========================================================================

  describe('Cancel and Close', () => {
    it('has a cancel button', () => {
      render(<EditContainerDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onOpenChange(false) when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<EditContainerDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets form to original values when dialog is closed', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <EditContainerDialog {...defaultProps} onOpenChange={onOpenChange} />
      );

      // Change label
      const labelInput = screen.getByTestId('edit-container-label-input');
      await user.clear(labelInput);
      await user.type(labelInput, 'Changed Label');

      // Close and reopen
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      rerender(<EditContainerDialog {...defaultProps} open={false} />);
      rerender(<EditContainerDialog {...defaultProps} open={true} />);

      // Should be back to original value
      expect(screen.getByTestId('edit-container-label-input')).toHaveValue('Kitchen Fridge');
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<EditContainerDialog {...defaultProps} />);

      expect(screen.getByLabelText(/Label/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });

    it('submits form on Enter key in label input', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EditContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByTestId('edit-container-label-input');
      await user.type(input, '{enter}');

      expect(onSubmit).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Container Sync
  // ===========================================================================

  describe('Container Sync', () => {
    it('updates form when container prop changes', () => {
      const { rerender } = render(<EditContainerDialog {...defaultProps} />);

      expect(screen.getByTestId('edit-container-label-input')).toHaveValue('Kitchen Fridge');

      const newContainer: ContainerDetail = {
        ...mockContainer,
        label: 'New Container Label',
        description: 'New description',
      };

      rerender(<EditContainerDialog {...defaultProps} container={newContainer} />);

      expect(screen.getByTestId('edit-container-label-input')).toHaveValue('New Container Label');
      expect(screen.getByTestId('edit-container-description-input')).toHaveValue('New description');
    });
  });
});
