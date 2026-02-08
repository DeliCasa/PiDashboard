/**
 * CreateContainerDialog Component Tests
 * Feature: 043-container-identity-ui (T009)
 *
 * Tests container creation dialog with optional label and description.
 * User Story 2: Create container with optional label
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateContainerDialog } from '@/presentation/components/containers/CreateContainerDialog';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('CreateContainerDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isCreating: false,
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
      render(<CreateContainerDialog {...defaultProps} />);

      expect(screen.getByTestId('create-container-dialog')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(<CreateContainerDialog {...defaultProps} open={false} />);

      expect(screen.queryByTestId('create-container-dialog')).not.toBeInTheDocument();
    });

    it('displays "Create Container" title', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      // Title is in DialogTitle
      const dialog = screen.getByTestId('create-container-dialog');
      expect(dialog).toHaveTextContent('Create Container');
    });

    it('shows description about auto-generated ID', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      expect(
        screen.getByText(/unique ID will be generated automatically/i)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Fields
  // ===========================================================================

  describe('Form Fields', () => {
    it('displays label input field', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      expect(screen.getByTestId('container-label-input')).toBeInTheDocument();
    });

    it('marks label as optional', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      expect(screen.getByText(/Label/)).toBeInTheDocument();
      expect(screen.getAllByText('(optional)').length).toBeGreaterThan(0);
    });

    it('displays description textarea', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      expect(screen.getByTestId('container-description-input')).toBeInTheDocument();
    });

    it('marks description as optional', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      expect(screen.getByText(/Description/)).toBeInTheDocument();
    });

    it('shows character count for description', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      expect(screen.getByText('0/500 characters')).toBeInTheDocument();
    });

    it('updates character count as user types', async () => {
      const user = userEvent.setup();
      render(<CreateContainerDialog {...defaultProps} />);

      const textarea = screen.getByTestId('container-description-input');
      await user.type(textarea, 'Hello World');

      expect(screen.getByText('11/500 characters')).toBeInTheDocument();
    });

    it('has placeholder text for label', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      const input = screen.getByTestId('container-label-input');
      expect(input).toHaveAttribute('placeholder', 'e.g., Main Fridge, Storage Room');
    });

    it('has placeholder text for description', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      const textarea = screen.getByTestId('container-description-input');
      expect(textarea).toHaveAttribute(
        'placeholder',
        'Additional notes about this container...'
      );
    });

    it('enforces max length of 100 for label', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      const input = screen.getByTestId('container-label-input');
      expect(input).toHaveAttribute('maxLength', '100');
    });

    it('enforces max length of 500 for description', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      const textarea = screen.getByTestId('container-description-input');
      expect(textarea).toHaveAttribute('maxLength', '500');
    });
  });

  // ===========================================================================
  // Form Submission
  // ===========================================================================

  describe('Form Submission', () => {
    it('calls onSubmit with label and description when form is submitted', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<CreateContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      await user.type(screen.getByTestId('container-label-input'), 'Kitchen Fridge');
      await user.type(screen.getByTestId('container-description-input'), 'Main fridge');
      await user.click(screen.getByTestId('create-container-submit'));

      expect(onSubmit).toHaveBeenCalledWith({
        label: 'Kitchen Fridge',
        description: 'Main fridge',
      });
    });

    it('submits undefined for empty label', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<CreateContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      // Only fill description
      await user.type(screen.getByTestId('container-description-input'), 'Some notes');
      await user.click(screen.getByTestId('create-container-submit'));

      expect(onSubmit).toHaveBeenCalledWith({
        label: undefined,
        description: 'Some notes',
      });
    });

    it('submits undefined for empty description', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<CreateContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      // Only fill label
      await user.type(screen.getByTestId('container-label-input'), 'My Container');
      await user.click(screen.getByTestId('create-container-submit'));

      expect(onSubmit).toHaveBeenCalledWith({
        label: 'My Container',
        description: undefined,
      });
    });

    it('submits undefined for both when creating with no input', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<CreateContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      // Submit without filling anything
      await user.click(screen.getByTestId('create-container-submit'));

      expect(onSubmit).toHaveBeenCalledWith({
        label: undefined,
        description: undefined,
      });
    });

    it('trims whitespace from label', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<CreateContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      await user.type(screen.getByTestId('container-label-input'), '  Trimmed Label  ');
      await user.click(screen.getByTestId('create-container-submit'));

      expect(onSubmit).toHaveBeenCalledWith({
        label: 'Trimmed Label',
        description: undefined,
      });
    });

    it('treats whitespace-only label as undefined', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<CreateContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      await user.type(screen.getByTestId('container-label-input'), '   ');
      await user.click(screen.getByTestId('create-container-submit'));

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
    it('shows "Creating..." when isCreating is true', () => {
      render(<CreateContainerDialog {...defaultProps} isCreating={true} />);

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    it('disables submit button when creating', () => {
      render(<CreateContainerDialog {...defaultProps} isCreating={true} />);

      expect(screen.getByTestId('create-container-submit')).toBeDisabled();
    });

    it('disables cancel button when creating', () => {
      render(<CreateContainerDialog {...defaultProps} isCreating={true} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('disables input fields when creating', () => {
      render(<CreateContainerDialog {...defaultProps} isCreating={true} />);

      expect(screen.getByTestId('container-label-input')).toBeDisabled();
      expect(screen.getByTestId('container-description-input')).toBeDisabled();
    });

    it('shows spinner icon when creating', () => {
      render(<CreateContainerDialog {...defaultProps} isCreating={true} />);

      // Button should contain "Creating..." text with spinner
      const submitButton = screen.getByTestId('create-container-submit');
      expect(submitButton).toHaveTextContent('Creating...');
    });
  });

  // ===========================================================================
  // Cancel and Close
  // ===========================================================================

  describe('Cancel and Close', () => {
    it('has a cancel button', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onOpenChange(false) when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CreateContainerDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets form when dialog is closed', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <CreateContainerDialog {...defaultProps} onOpenChange={onOpenChange} />
      );

      // Type some values
      await user.type(screen.getByTestId('container-label-input'), 'Test Label');
      await user.type(screen.getByTestId('container-description-input'), 'Test Desc');

      // Close and reopen
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // onOpenChange was called, simulate reopening
      rerender(
        <CreateContainerDialog {...defaultProps} open={false} />
      );
      rerender(
        <CreateContainerDialog {...defaultProps} open={true} />
      );

      // Fields should be empty
      expect(screen.getByTestId('container-label-input')).toHaveValue('');
      expect(screen.getByTestId('container-description-input')).toHaveValue('');
    });

    it('does not reset form while creating', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CreateContainerDialog {...defaultProps} />);

      // Type values
      await user.type(screen.getByTestId('container-label-input'), 'Test Label');

      // Start creating
      rerender(<CreateContainerDialog {...defaultProps} isCreating={true} />);

      // Verify value is still there
      expect(screen.getByTestId('container-label-input')).toHaveValue('Test Label');
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<CreateContainerDialog {...defaultProps} />);

      expect(screen.getByLabelText(/Label/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });

    it('submits form on Enter key in label input', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<CreateContainerDialog {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByTestId('container-label-input');
      await user.type(input, 'Test{enter}');

      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
