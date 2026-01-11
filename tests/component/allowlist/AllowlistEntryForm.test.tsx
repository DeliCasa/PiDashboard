/**
 * AllowlistEntryForm Component Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T035
 *
 * Tests for the allowlist entry form component including:
 * - MAC address validation
 * - Form submission
 * - Error handling
 * - Loading states
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AllowlistEntryForm,
  isValidMac,
  normalizeMac,
} from '@/presentation/components/allowlist/AllowlistEntryForm';

// ============================================================================
// Test Setup
// ============================================================================

describe('AllowlistEntryForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('renders the form with all fields', () => {
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('allowlist-entry-form')).toBeInTheDocument();
      expect(screen.getByTestId('mac-input')).toBeInTheDocument();
      expect(screen.getByTestId('description-input')).toBeInTheDocument();
      expect(screen.getByTestId('container-id-input')).toBeInTheDocument();
      expect(screen.getByTestId('add-entry-button')).toBeInTheDocument();
    });

    it('renders with proper labels and placeholders', () => {
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/mac address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/container id/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('AA:BB:CC:DD:EE:FF')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} className="custom-class" />);

      const form = screen.getByTestId('allowlist-entry-form');
      expect(form).toHaveClass('custom-class');
    });

    it('shows required indicator on MAC address field', () => {
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      // Check the required indicator exists near the MAC address field
      const requiredIndicator = screen.getByText('*');
      expect(requiredIndicator).toBeInTheDocument();
      expect(requiredIndicator).toHaveClass('text-destructive');
    });
  });

  // ============================================================================
  // MAC Address Validation Tests
  // ============================================================================

  describe('MAC Address Validation', () => {
    it('accepts valid MAC with colons', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mac-input');
      await user.type(input, 'AA:BB:CC:DD:EE:FF');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('accepts valid MAC with hyphens', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mac-input');
      await user.type(input, 'AA-BB-CC-DD-EE-FF');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('accepts valid MAC without separators', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mac-input');
      await user.type(input, 'AABBCCDDEEFF');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows error for invalid MAC format', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mac-input');
      await user.type(input, 'invalid-mac');

      expect(screen.getByRole('alert')).toHaveTextContent(/invalid mac address/i);
    });

    it('shows error for too short MAC', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mac-input');
      await user.type(input, 'AA:BB:CC');

      expect(screen.getByRole('alert')).toHaveTextContent(/invalid mac address/i);
    });

    it('shows error for MAC with invalid characters', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mac-input');
      await user.type(input, 'GG:HH:II:JJ:KK:LL');

      expect(screen.getByRole('alert')).toHaveTextContent(/invalid mac address/i);
    });

    it('converts lowercase to uppercase on input', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mac-input');
      await user.type(input, 'aa:bb:cc:dd:ee:ff');

      expect(input).toHaveValue('AA:BB:CC:DD:EE:FF');
    });

    it('clears error when MAC becomes valid', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mac-input');
      await user.type(input, 'invalid');
      expect(screen.getByRole('alert')).toBeInTheDocument();

      await user.clear(input);
      await user.type(input, 'AA:BB:CC:DD:EE:FF');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Form Submission Tests
  // ============================================================================

  describe('Form Submission', () => {
    it('calls onSubmit with normalized MAC and optional fields', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByTestId('mac-input'), 'aabbccddeeff');
      await user.type(screen.getByTestId('description-input'), 'Test Device');
      await user.type(screen.getByTestId('container-id-input'), 'container-001');
      await user.click(screen.getByTestId('add-entry-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          'AA:BB:CC:DD:EE:FF',
          'Test Device',
          'container-001'
        );
      });
    });

    it('calls onSubmit with MAC only when optional fields empty', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByTestId('mac-input'), 'AA:BB:CC:DD:EE:FF');
      await user.click(screen.getByTestId('add-entry-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF', undefined, undefined);
      });
    });

    it('trims whitespace from optional fields', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByTestId('mac-input'), 'AA:BB:CC:DD:EE:FF');
      await user.type(screen.getByTestId('description-input'), '  Test Device  ');
      await user.type(screen.getByTestId('container-id-input'), '  container-001  ');
      await user.click(screen.getByTestId('add-entry-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          'AA:BB:CC:DD:EE:FF',
          'Test Device',
          'container-001'
        );
      });
    });

    it('clears form after successful submission', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByTestId('mac-input'), 'AA:BB:CC:DD:EE:FF');
      await user.type(screen.getByTestId('description-input'), 'Test Device');
      await user.click(screen.getByTestId('add-entry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mac-input')).toHaveValue('');
        expect(screen.getByTestId('description-input')).toHaveValue('');
        expect(screen.getByTestId('container-id-input')).toHaveValue('');
      });
    });

    it('does not submit when MAC is empty', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      await user.click(screen.getByTestId('add-entry-button'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('does not submit when MAC is invalid', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      await user.type(screen.getByTestId('mac-input'), 'invalid');
      await user.click(screen.getByTestId('add-entry-button'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Loading and Disabled States
  // ============================================================================

  describe('Loading and Disabled States', () => {
    it('shows loading state when isLoading is true', () => {
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} isLoading />);

      const button = screen.getByTestId('add-entry-button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent(/adding/i);
    });

    it('disables all inputs when isLoading is true', () => {
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} isLoading />);

      expect(screen.getByTestId('mac-input')).toBeDisabled();
      expect(screen.getByTestId('description-input')).toBeDisabled();
      expect(screen.getByTestId('container-id-input')).toBeDisabled();
    });

    it('disables all inputs when disabled is true', () => {
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} disabled />);

      expect(screen.getByTestId('mac-input')).toBeDisabled();
      expect(screen.getByTestId('description-input')).toBeDisabled();
      expect(screen.getByTestId('container-id-input')).toBeDisabled();
      expect(screen.getByTestId('add-entry-button')).toBeDisabled();
    });

    it('does not submit when loading', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} isLoading />);

      // Try to submit via form submit (button is disabled)
      const form = screen.getByTestId('allowlist-entry-form').querySelector('form');
      if (form) {
        await user.type(screen.getByTestId('mac-input'), 'AA:BB:CC:DD:EE:FF', {
          skipClick: true,
        });
      }

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('has proper aria attributes on MAC input', () => {
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mac-input');
      expect(input).toHaveAttribute('aria-describedby', 'mac-help');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('sets aria-invalid on MAC input when error', async () => {
      const user = userEvent.setup();
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('mac-input');
      await user.type(input, 'invalid');

      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('has proper aria-describedby on optional fields', () => {
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('description-input')).toHaveAttribute(
        'aria-describedby',
        'description-help'
      );
      expect(screen.getByTestId('container-id-input')).toHaveAttribute(
        'aria-describedby',
        'container-help'
      );
    });

    it('displays help text for each field', () => {
      render(<AllowlistEntryForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/device hardware address/i)).toBeInTheDocument();
      expect(screen.getByText(/optional label to identify/i)).toBeInTheDocument();
      expect(screen.getByText(/optional pre-assigned container/i)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('isValidMac', () => {
  it('validates MAC with colons', () => {
    expect(isValidMac('AA:BB:CC:DD:EE:FF')).toBe(true);
    expect(isValidMac('00:11:22:33:44:55')).toBe(true);
  });

  it('validates MAC with hyphens', () => {
    expect(isValidMac('AA-BB-CC-DD-EE-FF')).toBe(true);
    expect(isValidMac('00-11-22-33-44-55')).toBe(true);
  });

  it('validates MAC without separators', () => {
    expect(isValidMac('AABBCCDDEEFF')).toBe(true);
    expect(isValidMac('001122334455')).toBe(true);
  });

  it('validates lowercase MAC', () => {
    expect(isValidMac('aa:bb:cc:dd:ee:ff')).toBe(true);
    expect(isValidMac('aabbccddeeff')).toBe(true);
  });

  it('validates mixed case MAC', () => {
    expect(isValidMac('Aa:Bb:Cc:Dd:Ee:Ff')).toBe(true);
  });

  it('rejects invalid MAC formats', () => {
    expect(isValidMac('')).toBe(false);
    expect(isValidMac('invalid')).toBe(false);
    expect(isValidMac('AA:BB:CC')).toBe(false);
    expect(isValidMac('AA:BB:CC:DD:EE:FF:GG')).toBe(false);
    expect(isValidMac('GG:HH:II:JJ:KK:LL')).toBe(false);
    expect(isValidMac('AA:BB:CC:DD:EE')).toBe(false);
    expect(isValidMac('AA:BB:CC:DD:EE:FFF')).toBe(false);
  });
});

describe('normalizeMac', () => {
  it('normalizes MAC with colons', () => {
    expect(normalizeMac('aa:bb:cc:dd:ee:ff')).toBe('AA:BB:CC:DD:EE:FF');
  });

  it('normalizes MAC with hyphens', () => {
    expect(normalizeMac('aa-bb-cc-dd-ee-ff')).toBe('AA:BB:CC:DD:EE:FF');
  });

  it('normalizes MAC without separators', () => {
    expect(normalizeMac('aabbccddeeff')).toBe('AA:BB:CC:DD:EE:FF');
  });

  it('normalizes mixed case MAC', () => {
    expect(normalizeMac('Aa:Bb:Cc:Dd:Ee:Ff')).toBe('AA:BB:CC:DD:EE:FF');
  });

  it('normalizes already uppercase MAC', () => {
    expect(normalizeMac('AA:BB:CC:DD:EE:FF')).toBe('AA:BB:CC:DD:EE:FF');
  });
});
