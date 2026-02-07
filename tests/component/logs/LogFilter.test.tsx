/**
 * LogFilter Component Tests (T054, T044)
 * Tests for log filtering controls
 *
 * Feature: 005-testing-research-and-hardening (T044)
 * Updated to use data-testid selectors for reliable test targeting.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import { LogFilter } from '@/presentation/components/logs/LogFilter';

describe('LogFilter', () => {
  const defaultProps = {
    level: 'all',
    onLevelChange: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    connected: true,
    onClear: vi.fn(),
  };

  describe('connection status', () => {
    it('should display "Connected" when connected is true', () => {
      render(<LogFilter {...defaultProps} connected={true} />);

      // Use data-testid for connection status badge
      const badge = screen.getByTestId('log-connection-status');
      expect(badge).toHaveTextContent('Connected');
    });

    it('should display "Disconnected" when connected is false', () => {
      render(<LogFilter {...defaultProps} connected={false} />);

      const badge = screen.getByTestId('log-connection-status');
      expect(badge).toHaveTextContent('Disconnected');
    });

    it('should show green indicator when connected', () => {
      render(<LogFilter {...defaultProps} connected={true} />);

      // Use data-testid, then check for green indicator
      const badge = screen.getByTestId('log-connection-status');
      const indicator = badge.querySelector('.fill-green-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should show red indicator when disconnected', () => {
      render(<LogFilter {...defaultProps} connected={false} />);

      const badge = screen.getByTestId('log-connection-status');
      const indicator = badge.querySelector('.fill-red-500');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('level filter', () => {
    it('should display level selector', () => {
      render(<LogFilter {...defaultProps} />);

      // Use data-testid for level select
      const select = screen.getByTestId('log-level-select');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('All Levels')).toBeInTheDocument();
    });

    // Note: Select interaction tests are skipped due to jsdom limitations with
    // Radix UI's hasPointerCapture API. These should be tested in E2E tests.
    it.skip('should call onLevelChange when level is selected', async () => {
      // Skipped: Radix UI Select uses pointer capture API not available in jsdom
      // This interaction is better tested in E2E with Playwright
    });

    it('should render select with combobox role', () => {
      render(<LogFilter {...defaultProps} />);

      // The select trigger has combobox role
      const trigger = screen.getByTestId('log-level-select');
      expect(trigger).toHaveAttribute('role', 'combobox');
    });
  });

  describe('search input', () => {
    it('should display search input', () => {
      render(<LogFilter {...defaultProps} />);

      // Use data-testid for search input
      expect(screen.getByTestId('log-search-input')).toBeInTheDocument();
    });

    it('should show current search value', () => {
      render(<LogFilter {...defaultProps} search="mqtt" />);

      const input = screen.getByTestId('log-search-input');
      expect(input).toHaveValue('mqtt');
    });

    it('should call onSearchChange when typing', async () => {
      const onSearchChange = vi.fn();
      const { user } = render(
        <LogFilter {...defaultProps} onSearchChange={onSearchChange} />
      );

      // Use data-testid for search input
      const input = screen.getByTestId('log-search-input');
      await user.type(input, 'abc');

      // Called for each character typed
      // Note: Since this is a controlled component and onSearchChange mock doesn't
      // update the `search` prop, each character type shows just that character
      expect(onSearchChange).toHaveBeenCalledTimes(3);
      // Each call receives just the typed character since input resets to empty
      // (controlled component behavior with mock that doesn't update state)
      expect(onSearchChange).toHaveBeenNthCalledWith(1, 'a');
      expect(onSearchChange).toHaveBeenNthCalledWith(2, 'b');
      expect(onSearchChange).toHaveBeenNthCalledWith(3, 'c');
    });
  });

  describe('clear button', () => {
    it('should display Clear button', () => {
      render(<LogFilter {...defaultProps} />);

      // Use data-testid for clear button
      expect(screen.getByTestId('log-clear-button')).toBeInTheDocument();
    });

    it('should call onClear when clicked', async () => {
      const onClear = vi.fn();
      const { user } = render(<LogFilter {...defaultProps} onClear={onClear} />);

      await user.click(screen.getByTestId('log-clear-button'));

      expect(onClear).toHaveBeenCalled();
    });
  });

  describe('export button', () => {
    it('should not display Export button when onExport is not provided', () => {
      render(<LogFilter {...defaultProps} />);

      // Use data-testid for export button
      expect(screen.queryByTestId('log-export-button')).not.toBeInTheDocument();
    });

    it('should display Export button when onExport is provided', () => {
      const onExport = vi.fn();
      render(<LogFilter {...defaultProps} onExport={onExport} />);

      expect(screen.getByTestId('log-export-button')).toBeInTheDocument();
    });

    it('should call onExport when clicked', async () => {
      const onExport = vi.fn();
      const { user } = render(<LogFilter {...defaultProps} onExport={onExport} />);

      await user.click(screen.getByTestId('log-export-button'));

      expect(onExport).toHaveBeenCalled();
    });

    it('should show "Exporting..." and be disabled when isExporting is true', () => {
      const onExport = vi.fn();
      render(<LogFilter {...defaultProps} onExport={onExport} isExporting={true} />);

      const button = screen.getByTestId('log-export-button');
      expect(button).toHaveTextContent('Exporting...');
      expect(button).toBeDisabled();
    });
  });

  describe('layout', () => {
    it('should apply custom className', () => {
      render(
        <LogFilter {...defaultProps} className="custom-filter-class" />
      );

      // Use data-testid for log filter container
      const filter = screen.getByTestId('log-filter');
      expect(filter).toHaveClass('custom-filter-class');
    });

    it('should have flexible layout with wrapped items', () => {
      render(<LogFilter {...defaultProps} />);

      // Use data-testid, check for flex-wrap class
      const filter = screen.getByTestId('log-filter');
      expect(filter).toHaveClass('flex-wrap');
    });
  });

  describe('selected level display', () => {
    it('should display selected level in trigger', () => {
      render(<LogFilter {...defaultProps} level="error" />);

      // The select trigger should show the selected level
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    // Note: Select dropdown tests are skipped due to jsdom limitations with
    // Radix UI's hasPointerCapture API. Dropdown interaction tests should be
    // done in E2E with Playwright.
    it.skip('should show colored indicator for each level', async () => {
      // Skipped: Radix UI Select uses pointer capture API not available in jsdom
    });
  });
});
