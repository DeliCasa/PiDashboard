/**
 * OperationsView Component Tests
 * Feature: 057-live-ops-viewer (Phase 5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import userEvent from '@testing-library/user-event';
import { OperationsView } from '@/presentation/components/operations/OperationsView';

let sessionListShouldThrow = false;
let cameraHealthShouldThrow = false;

vi.mock('@/presentation/components/operations/SessionListView', () => ({
  SessionListView: ({ onSessionSelect }: { onSessionSelect: (id: string) => void }) => {
    if (sessionListShouldThrow) throw new Error('SessionListView render error');
    return (
      <div data-testid="session-list-view">
        <button data-testid="select-session" onClick={() => onSessionSelect('sess-test-123')}>
          Select Session
        </button>
      </div>
    );
  },
}));

vi.mock('@/presentation/components/operations/CameraHealthDashboard', () => ({
  CameraHealthDashboard: () => {
    if (cameraHealthShouldThrow) throw new Error('CameraHealthDashboard render error');
    return <div data-testid="camera-health-dashboard">Camera Health</div>;
  },
}));

vi.mock('@/presentation/components/operations/SessionDetailView', () => ({
  SessionDetailView: ({ sessionId, onBack }: { sessionId: string; onBack: () => void }) => (
    <div data-testid="session-detail-view">
      <span data-testid="detail-session-id">{sessionId}</span>
      <button data-testid="back-button" onClick={onBack}>Back</button>
    </div>
  ),
}));

describe('OperationsView', () => {
  beforeEach(() => {
    sessionListShouldThrow = false;
    cameraHealthShouldThrow = false;
  });

  it('should show session list and camera health by default', () => {
    render(<OperationsView />);

    expect(screen.getByTestId('operations-view')).toBeInTheDocument();
    expect(screen.getByTestId('session-list-view')).toBeInTheDocument();
    expect(screen.getByTestId('camera-health-dashboard')).toBeInTheDocument();
  });

  it('should not show session detail view by default', () => {
    render(<OperationsView />);

    expect(screen.queryByTestId('session-detail-view')).not.toBeInTheDocument();
  });

  it('should show session detail when a session is selected', async () => {
    const user = userEvent.setup();
    render(<OperationsView />);

    await user.click(screen.getByTestId('select-session'));

    expect(screen.getByTestId('session-detail-view')).toBeInTheDocument();
    expect(screen.getByTestId('detail-session-id')).toHaveTextContent('sess-test-123');
    expect(screen.queryByTestId('operations-view')).not.toBeInTheDocument();
  });

  it('should return to list+health layout when back is clicked', async () => {
    const user = userEvent.setup();
    render(<OperationsView />);

    // Select a session
    await user.click(screen.getByTestId('select-session'));
    expect(screen.getByTestId('session-detail-view')).toBeInTheDocument();

    // Click back
    await user.click(screen.getByTestId('back-button'));

    // Should be back to list view
    expect(screen.getByTestId('operations-view')).toBeInTheDocument();
    expect(screen.getByTestId('session-list-view')).toBeInTheDocument();
    expect(screen.getByTestId('camera-health-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('session-detail-view')).not.toBeInTheDocument();
  });

  // ==========================================================================
  // Feature 058: Subsystem error isolation (T020)
  // ==========================================================================

  describe('subsystem error isolation (T020)', () => {
    it('CameraHealthDashboard still renders when SessionListView throws', () => {
      sessionListShouldThrow = true;
      // Suppress console.error from the error boundary
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<OperationsView />);

      expect(screen.getByTestId('subsystem-error-sessions')).toBeInTheDocument();
      expect(screen.getByTestId('camera-health-dashboard')).toBeInTheDocument();

      spy.mockRestore();
    });

    it('SessionListView still renders when CameraHealthDashboard throws', () => {
      cameraHealthShouldThrow = true;
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<OperationsView />);

      expect(screen.getByTestId('session-list-view')).toBeInTheDocument();
      expect(screen.getByTestId('subsystem-error-camera-health')).toBeInTheDocument();

      spy.mockRestore();
    });

    it('both subsystems render independently when neither throws', () => {
      render(<OperationsView />);

      expect(screen.getByTestId('session-list-view')).toBeInTheDocument();
      expect(screen.getByTestId('camera-health-dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('subsystem-error-sessions')).not.toBeInTheDocument();
      expect(screen.queryByTestId('subsystem-error-camera-health')).not.toBeInTheDocument();
    });
  });
});
