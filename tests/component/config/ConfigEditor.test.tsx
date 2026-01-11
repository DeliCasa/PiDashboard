/**
 * ConfigEditor Component Tests (T035, T043)
 * Tests for inline configuration editor
 *
 * Feature: 005-testing-research-and-hardening (T043)
 * Updated to use data-testid selectors for reliable test targeting.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import { ConfigEditor } from '@/presentation/components/config/ConfigEditor';
import type { ConfigEntry } from '@/domain/types/entities';

const createMockEntry = (overrides?: Partial<ConfigEntry>): ConfigEntry => ({
  key: 'server.port',
  value: '8082',
  default_value: '8082',
  type: 'number',
  description: 'HTTP server port',
  category: 'system',
  editable: true,
  sensitive: false,
  ...overrides,
});

describe('ConfigEditor', () => {
  describe('display mode', () => {
    it('should display config key and value', () => {
      const entry = createMockEntry();
      const onSave = vi.fn();
      const onReset = vi.fn();

      render(<ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />);

      // Use data-testid for config editor container
      expect(screen.getByTestId('config-editor-server-port')).toBeInTheDocument();
      expect(screen.getByTestId('config-key')).toHaveTextContent('server.port');
      expect(screen.getByText('8082')).toBeInTheDocument();
    });

    it('should display category badge', () => {
      const entry = createMockEntry();
      const onSave = vi.fn();
      const onReset = vi.fn();

      render(<ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />);

      expect(screen.getByText('system')).toBeInTheDocument();
    });

    it('should display description', () => {
      const entry = createMockEntry();
      const onSave = vi.fn();
      const onReset = vi.fn();

      render(<ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />);

      expect(screen.getByText('HTTP server port')).toBeInTheDocument();
    });

    it('should show Edit button for editable entries', () => {
      const entry = createMockEntry({ editable: true });
      const onSave = vi.fn();
      const onReset = vi.fn();

      render(<ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />);

      // Use data-testid for edit button
      expect(screen.getByTestId('config-edit-button')).toBeInTheDocument();
    });

    it('should not show Edit button for non-editable entries', () => {
      const entry = createMockEntry({ editable: false });
      const onSave = vi.fn();
      const onReset = vi.fn();

      render(<ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />);

      expect(screen.queryByTestId('config-edit-button')).not.toBeInTheDocument();
    });

    it('should show lock icon for non-editable entries', () => {
      const entry = createMockEntry({ editable: false });
      const onSave = vi.fn();
      const onReset = vi.fn();

      render(<ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />);

      // Use data-testid for container, check for lock icon via aria-label
      const container = screen.getByTestId('config-editor-server-port');
      expect(container.querySelector('[aria-label="Read-only"]')).toBeInTheDocument();
    });
  });

  describe('sensitive values', () => {
    it('should mask sensitive values by default', () => {
      const entry = createMockEntry({
        key: 'mqtt.password',
        value: 'secret123',
        sensitive: true,
      });
      const onSave = vi.fn();
      const onReset = vi.fn();

      render(<ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />);

      // Value should be masked with dots
      expect(screen.getByText('•••••••••')).toBeInTheDocument();
      expect(screen.queryByText('secret123')).not.toBeInTheDocument();
    });

    it('should show eye toggle for sensitive values', () => {
      const entry = createMockEntry({ sensitive: true });
      const onSave = vi.fn();
      const onReset = vi.fn();

      render(<ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />);

      // Eye icon for toggling visibility
      const eyeButton = screen.getByRole('button', { name: '' });
      expect(eyeButton.querySelector('svg.lucide-eye')).toBeInTheDocument();
    });

    it('should reveal sensitive value when eye is clicked', async () => {
      const entry = createMockEntry({
        key: 'mqtt.password',
        value: 'secret123',
        sensitive: true,
      });
      const onSave = vi.fn();
      const onReset = vi.fn();

      const { user } = render(
        <ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />
      );

      // Find and click eye button
      const buttons = screen.getAllByRole('button');
      const eyeButton = buttons.find((btn) =>
        btn.querySelector('svg.lucide-eye')
      );
      if (eyeButton) {
        await user.click(eyeButton);
      }

      expect(screen.getByText('secret123')).toBeInTheDocument();
    });
  });

  describe('editing mode', () => {
    it('should enter edit mode when Edit is clicked', async () => {
      const entry = createMockEntry();
      const onSave = vi.fn();
      const onReset = vi.fn();

      const { user } = render(
        <ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />
      );

      // Use data-testid for edit button
      await user.click(screen.getByTestId('config-edit-button'));

      // Input should be visible
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });

    it('should show save and cancel buttons in edit mode', async () => {
      const entry = createMockEntry();
      const onSave = vi.fn();
      const onReset = vi.fn();

      const { user } = render(
        <ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />
      );

      await user.click(screen.getByTestId('config-edit-button'));

      // Check for save/cancel buttons via aria-label (best practice)
      const container = screen.getByTestId('config-editor-server-port');
      expect(container.querySelector('[aria-label="Save"]')).toBeInTheDocument();
      expect(container.querySelector('[aria-label="Cancel"]')).toBeInTheDocument();
    });

    it('should call onSave when saved', async () => {
      const entry = createMockEntry();
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onReset = vi.fn();

      const { user } = render(
        <ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />
      );

      await user.click(screen.getByTestId('config-edit-button'));
      await user.clear(screen.getByRole('spinbutton'));
      await user.type(screen.getByRole('spinbutton'), '8083');

      // Find and click save button via aria-label
      const container = screen.getByTestId('config-editor-server-port');
      const saveButton = container.querySelector('[aria-label="Save"]');
      if (saveButton) {
        await user.click(saveButton as HTMLElement);
      }

      expect(onSave).toHaveBeenCalledWith('server.port', '8083');
    });

    it('should cancel without saving when X is clicked', async () => {
      const entry = createMockEntry();
      const onSave = vi.fn();
      const onReset = vi.fn();

      const { user } = render(
        <ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />
      );

      await user.click(screen.getByTestId('config-edit-button'));
      await user.clear(screen.getByRole('spinbutton'));
      await user.type(screen.getByRole('spinbutton'), '9999');

      // Find and click cancel button via aria-label
      const container = screen.getByTestId('config-editor-server-port');
      const cancelButton = container.querySelector('[aria-label="Cancel"]');
      if (cancelButton) {
        await user.click(cancelButton as HTMLElement);
      }

      expect(onSave).not.toHaveBeenCalled();
      // Should exit edit mode
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });
  });

  describe('input types', () => {
    it('should render number input for number type', async () => {
      const entry = createMockEntry({ type: 'number' });
      const onSave = vi.fn();
      const onReset = vi.fn();

      const { user } = render(
        <ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />
      );

      // Use data-testid for edit button
      await user.click(screen.getByTestId('config-edit-button'));

      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });

    it('should render text input for string type', async () => {
      const entry = createMockEntry({ type: 'string', value: 'localhost' });
      const onSave = vi.fn();
      const onReset = vi.fn();

      const { user } = render(
        <ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />
      );

      await user.click(screen.getByTestId('config-edit-button'));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render switch for boolean type', async () => {
      const entry = createMockEntry({ type: 'boolean', value: 'true' });
      const onSave = vi.fn();
      const onReset = vi.fn();

      const { user } = render(
        <ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />
      );

      await user.click(screen.getByTestId('config-edit-button'));

      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should display boolean value as badge', () => {
      const entry = createMockEntry({ type: 'boolean', value: 'true' });
      const onSave = vi.fn();
      const onReset = vi.fn();

      render(<ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />);

      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });
  });

  describe('reset functionality', () => {
    it('should show reset button when value differs from default', () => {
      const entry = createMockEntry({
        value: '8083',
        default_value: '8082',
      });
      const onSave = vi.fn();
      const onReset = vi.fn();

      render(<ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />);

      // Reset button via aria-label
      const container = screen.getByTestId('config-editor-server-port');
      const resetButton = container.querySelector('[aria-label="Reset to default"]');
      expect(resetButton).toBeInTheDocument();
    });

    it('should not show reset button when value equals default', () => {
      const entry = createMockEntry({
        value: '8082',
        default_value: '8082',
      });
      const onSave = vi.fn();
      const onReset = vi.fn();

      render(<ConfigEditor entry={entry} onSave={onSave} onReset={onReset} />);

      // No reset button should be visible
      const container = screen.getByTestId('config-editor-server-port');
      const resetButton = container.querySelector('[aria-label="Reset to default"]');
      expect(resetButton).not.toBeInTheDocument();
    });
  });
});
