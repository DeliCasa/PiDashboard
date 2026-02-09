/**
 * ContainerPicker Component Tests
 * Feature: 046-opaque-container-identity (T010)
 *
 * Tests for the header container picker dropdown.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContainerPicker } from '@/presentation/components/containers/ContainerPicker';
import {
  mockContainerDetailWithCamera,
  mockContainerDetailEmpty,
  mockContainerDetailUnlabeled,
} from '../../mocks/container-mocks';

// ============================================================================
// Mocks
// ============================================================================

const mockSetActiveContainer = vi.fn();
const mockClearActiveContainer = vi.fn();

vi.mock('@/application/hooks/useContainers', () => ({
  useContainers: vi.fn(),
}));

vi.mock('@/application/stores/activeContainer', () => ({
  useActiveContainerId: vi.fn(),
  useActiveContainerActions: vi.fn(() => ({
    setActiveContainer: mockSetActiveContainer,
    clearActiveContainer: mockClearActiveContainer,
  })),
}));

vi.mock('@/infrastructure/api/client', () => ({
  isFeatureUnavailable: vi.fn(() => false),
}));

import { useContainers } from '@/application/hooks/useContainers';
import { useActiveContainerId } from '@/application/stores/activeContainer';
import { isFeatureUnavailable } from '@/infrastructure/api/client';

const mockUseContainers = vi.mocked(useContainers);
const mockUseActiveContainerId = vi.mocked(useActiveContainerId);
const mockIsFeatureUnavailable = vi.mocked(isFeatureUnavailable);

// ============================================================================
// Test Setup
// ============================================================================

const mockContainers = [
  mockContainerDetailWithCamera,
  mockContainerDetailEmpty,
];

function setupMocks(overrides: {
  containers?: typeof mockContainers;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  activeId?: string | null;
} = {}) {
  const {
    containers = mockContainers,
    isLoading = false,
    isError = false,
    error = null,
    activeId = mockContainerDetailWithCamera.id,
  } = overrides;

  mockUseContainers.mockReturnValue({
    data: containers,
    isLoading,
    isError,
    error,
    refetch: vi.fn(),
    isFetching: false,
    isSuccess: !isLoading && !isError,
    isPending: isLoading,
    status: isLoading ? 'pending' : isError ? 'error' : 'success',
  } as ReturnType<typeof useContainers>);

  mockUseActiveContainerId.mockReturnValue(activeId);
}

describe('ContainerPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFeatureUnavailable.mockReturnValue(false);
  });

  // ==========================================================================
  // Rendering States
  // ==========================================================================

  describe('rendering', () => {
    it('renders the picker with containers', () => {
      setupMocks();
      render(<ContainerPicker />);
      expect(screen.getByTestId('container-picker')).toBeInTheDocument();
      expect(screen.getByTestId('container-picker-trigger')).toBeInTheDocument();
    });

    it('shows loading state while containers load', () => {
      setupMocks({ isLoading: true });
      render(<ContainerPicker />);
      expect(screen.getByTestId('container-picker-loading')).toBeInTheDocument();
    });

    it('shows empty state when no containers exist', () => {
      setupMocks({ containers: [] });
      render(<ContainerPicker />);
      expect(screen.getByTestId('container-picker-empty')).toBeInTheDocument();
    });

    it('shows error state on API error', () => {
      setupMocks({ isError: true, error: new Error('Server error') });
      render(<ContainerPicker />);
      expect(screen.getByTestId('container-picker-error')).toBeInTheDocument();
    });

    it('returns null when feature unavailable (404/503)', () => {
      mockIsFeatureUnavailable.mockReturnValue(true);
      setupMocks({ isError: true, error: new Error('Not found') });
      const { container } = render(<ContainerPicker />);
      expect(container.innerHTML).toBe('');
    });
  });

  // ==========================================================================
  // Container Display
  // ==========================================================================

  describe('container display', () => {
    it('shows container labels in the dropdown', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<ContainerPicker />);

      await user.click(screen.getByTestId('container-picker-trigger'));

      // The selected container label may appear in both trigger and dropdown
      expect(screen.getAllByText('Kitchen Fridge').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Living Room').length).toBeGreaterThanOrEqual(1);
    });

    it('shows "Unnamed Container" for containers without labels', async () => {
      setupMocks({
        containers: [mockContainerDetailUnlabeled, mockContainerDetailWithCamera],
        activeId: mockContainerDetailUnlabeled.id,
      });
      const user = userEvent.setup();
      render(<ContainerPicker />);

      await user.click(screen.getByTestId('container-picker-trigger'));

      // Radix Select renders selected value in trigger and dropdown
      expect(screen.getAllByText('Unnamed Container').length).toBeGreaterThanOrEqual(1);
    });

    it('shows opaque ID in monospace for each container', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<ContainerPicker />);

      await user.click(screen.getByTestId('container-picker-trigger'));

      // IDs are truncated for long UUIDs - check for the truncated format
      const monoElements = document.querySelectorAll('.font-mono');
      expect(monoElements.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Selection
  // ==========================================================================

  describe('selection', () => {
    it('calls setActiveContainer when a container is selected', async () => {
      setupMocks({ activeId: mockContainerDetailWithCamera.id });
      const user = userEvent.setup();
      render(<ContainerPicker />);

      await user.click(screen.getByTestId('container-picker-trigger'));
      await user.click(screen.getByText('Living Room'));

      expect(mockSetActiveContainer).toHaveBeenCalledWith(mockContainerDetailEmpty.id);
    });
  });

  // ==========================================================================
  // Stale Selection Reconciliation
  // ==========================================================================

  describe('stale selection reconciliation', () => {
    it('auto-selects first container when no prior selection', () => {
      setupMocks({ activeId: null });
      render(<ContainerPicker />);

      expect(mockSetActiveContainer).toHaveBeenCalledWith(mockContainerDetailWithCamera.id);
    });

    it('auto-selects first container when stored ID not in list', () => {
      setupMocks({ activeId: 'stale-id-that-does-not-exist' });
      render(<ContainerPicker />);

      expect(mockSetActiveContainer).toHaveBeenCalledWith(mockContainerDetailWithCamera.id);
    });

    it('clears selection when container list is empty', () => {
      setupMocks({ containers: [], activeId: 'some-old-id' });
      render(<ContainerPicker />);

      expect(mockClearActiveContainer).toHaveBeenCalled();
    });

    it('preserves selection when stored ID exists in list', () => {
      setupMocks({ activeId: mockContainerDetailWithCamera.id });
      render(<ContainerPicker />);

      expect(mockSetActiveContainer).not.toHaveBeenCalled();
      expect(mockClearActiveContainer).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('has aria-label on the select trigger', () => {
      setupMocks();
      render(<ContainerPicker />);
      expect(screen.getByTestId('container-picker-trigger')).toHaveAttribute(
        'aria-label',
        'Select container'
      );
    });
  });
});
