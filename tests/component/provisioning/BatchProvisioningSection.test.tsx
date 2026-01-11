/**
 * BatchProvisioningSection Component Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T028
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BatchProvisioningSection } from '@/presentation/components/provisioning/BatchProvisioningSection';

// Mock the hooks and API modules
vi.mock('@/application/hooks/useBatchProvisioningEvents', () => ({
  useBatchProvisioningEvents: vi.fn(() => ({
    connectionState: 'disconnected',
    error: null,
    session: null,
    devices: [],
    deviceCounts: {
      discovered: 0,
      provisioning: 0,
      provisioned: 0,
      verifying: 0,
      verified: 0,
      failed: 0,
      total: 0,
    },
    reconnect: vi.fn(),
    updateSession: vi.fn(),
  })),
}));

vi.mock('@/infrastructure/api/batch-provisioning', () => ({
  startSession: vi.fn(),
  stopSession: vi.fn(),
  pauseSession: vi.fn(),
  resumeSession: vi.fn(),
  provisionDevice: vi.fn(),
  provisionAll: vi.fn(),
  retryDevice: vi.fn(),
  skipDevice: vi.fn(),
}));

// Import after mocking
import { useBatchProvisioningEvents } from '@/application/hooks/useBatchProvisioningEvents';
import * as batchApi from '@/infrastructure/api/batch-provisioning';

const mockedUseBatchProvisioningEvents = vi.mocked(useBatchProvisioningEvents);
const mockedStartSession = vi.mocked(batchApi.startSession);

// Test wrapper with QueryClient
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('BatchProvisioningSection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to default state
    mockedUseBatchProvisioningEvents.mockReturnValue({
      connectionState: 'disconnected',
      error: null,
      session: null,
      devices: [],
      deviceCounts: {
        discovered: 0,
        provisioning: 0,
        provisioned: 0,
        verifying: 0,
        verified: 0,
        failed: 0,
        total: 0,
      },
      reconnect: vi.fn(),
      updateSession: vi.fn(),
    });
  });

  describe('Initial State (No Session)', () => {
    it('should render the start session form when no session exists', () => {
      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      expect(screen.getByTestId('start-session-form')).toBeInTheDocument();
      expect(screen.getByTestId('ssid-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('start-session-button')).toBeInTheDocument();
    });

    it('should not show session progress when no session exists', () => {
      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      expect(screen.queryByTestId('session-progress')).not.toBeInTheDocument();
    });
  });

  describe('Start Session Form', () => {
    it('should disable submit button when SSID is empty', () => {
      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      const submitButton = screen.getByTestId('start-session-button');
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when password is less than 8 characters', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      await user.type(screen.getByTestId('ssid-input'), 'MyNetwork');
      await user.type(screen.getByTestId('password-input'), 'short');

      const submitButton = screen.getByTestId('start-session-button');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when form is valid', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      await user.type(screen.getByTestId('ssid-input'), 'MyNetwork');
      await user.type(screen.getByTestId('password-input'), 'validpassword123');

      const submitButton = screen.getByTestId('start-session-button');
      expect(submitButton).not.toBeDisabled();
    });

    it('should call startSession when form is submitted', async () => {
      const user = userEvent.setup();

      mockedStartSession.mockResolvedValueOnce({
        success: true as const,
        data: {
          session: {
            id: 'session-123',
            state: 'discovering',
            target_ssid: 'MyNetwork',
            created_at: new Date().toISOString(),
            expires_at: null,
          },
        },
        meta: { timestamp: new Date().toISOString(), correlation_id: 'test' },
      });

      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      await user.type(screen.getByTestId('ssid-input'), 'MyNetwork');
      await user.type(screen.getByTestId('password-input'), 'validpassword123');
      await user.click(screen.getByTestId('start-session-button'));

      await waitFor(() => {
        expect(mockedStartSession).toHaveBeenCalledWith({
          target_ssid: 'MyNetwork',
          target_password: 'validpassword123',
        });
      });
    });
  });

  describe('Active Session', () => {
    it('should show session progress when session is active', () => {
      mockedUseBatchProvisioningEvents.mockReturnValue({
        connectionState: 'connected',
        error: null,
        session: {
          id: 'session-123',
          state: 'active',
          target_ssid: 'MyNetwork',
          created_at: new Date().toISOString(),
          expires_at: null,
        },
        devices: [],
        deviceCounts: {
          discovered: 2,
          provisioning: 0,
          provisioned: 0,
          verifying: 0,
          verified: 1,
          failed: 0,
          total: 3,
        },
        reconnect: vi.fn(),
        updateSession: vi.fn(),
      });

      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      expect(screen.getByTestId('session-progress')).toBeInTheDocument();
      expect(screen.queryByTestId('start-session-form')).not.toBeInTheDocument();
    });

    it('should show session progress with target network info', () => {
      mockedUseBatchProvisioningEvents.mockReturnValue({
        connectionState: 'connected',
        error: null,
        session: {
          id: 'session-123',
          state: 'active',
          target_ssid: 'MyNetwork',
          created_at: new Date().toISOString(),
          expires_at: null,
        },
        devices: [],
        deviceCounts: {
          discovered: 0,
          provisioning: 0,
          provisioned: 0,
          verifying: 0,
          verified: 0,
          failed: 0,
          total: 0,
        },
        reconnect: vi.fn(),
        updateSession: vi.fn(),
      });

      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      // Check that session progress shows target network
      expect(screen.getByText('MyNetwork')).toBeInTheDocument();
    });

    it('should show waiting message when no devices discovered yet', () => {
      mockedUseBatchProvisioningEvents.mockReturnValue({
        connectionState: 'connected',
        error: null,
        session: {
          id: 'session-123',
          state: 'active',
          target_ssid: 'MyNetwork',
          created_at: new Date().toISOString(),
          expires_at: null,
        },
        devices: [],
        deviceCounts: {
          discovered: 0,
          provisioning: 0,
          provisioned: 0,
          verifying: 0,
          verified: 0,
          failed: 0,
          total: 0,
        },
        reconnect: vi.fn(),
        updateSession: vi.fn(),
      });

      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      expect(screen.getByText(/waiting for devices/i)).toBeInTheDocument();
    });
  });

  describe('Device List', () => {
    it('should render device cards when devices are discovered', () => {
      mockedUseBatchProvisioningEvents.mockReturnValue({
        connectionState: 'connected',
        error: null,
        session: {
          id: 'session-123',
          state: 'active',
          target_ssid: 'MyNetwork',
          created_at: new Date().toISOString(),
          expires_at: null,
        },
        devices: [
          {
            mac: 'AA:BB:CC:DD:EE:01',
            ip: '192.168.1.100',
            rssi: -45,
            firmware_version: '1.0.0',
            state: 'discovered',
            in_allowlist: true,
            retry_count: 0,
            error_message: null,
            container_id: null,
            discovered_at: new Date().toISOString(),
            state_changed_at: new Date().toISOString(),
          },
          {
            mac: 'AA:BB:CC:DD:EE:02',
            ip: '192.168.1.101',
            rssi: -60,
            firmware_version: '1.0.0',
            state: 'verified',
            in_allowlist: true,
            retry_count: 0,
            error_message: null,
            container_id: 'container-1',
            discovered_at: new Date().toISOString(),
            state_changed_at: new Date().toISOString(),
          },
        ],
        deviceCounts: {
          discovered: 1,
          provisioning: 0,
          provisioned: 0,
          verifying: 0,
          verified: 1,
          failed: 0,
          total: 2,
        },
        reconnect: vi.fn(),
        updateSession: vi.fn(),
      });

      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      expect(screen.getByText('Devices (2)')).toBeInTheDocument();
      expect(screen.getAllByTestId('candidate-card')).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should display error alert when there is an error', () => {
      mockedUseBatchProvisioningEvents.mockReturnValue({
        connectionState: 'error',
        error: 'Connection failed',
        session: null,
        devices: [],
        deviceCounts: {
          discovered: 0,
          provisioning: 0,
          provisioned: 0,
          verifying: 0,
          verified: 0,
          failed: 0,
          total: 0,
        },
        reconnect: vi.fn(),
        updateSession: vi.fn(),
      });

      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('should display SSE error when available', () => {
      mockedUseBatchProvisioningEvents.mockReturnValue({
        connectionState: 'error',
        error: 'SSE stream disconnected',
        session: null,
        devices: [],
        deviceCounts: {
          discovered: 0,
          provisioning: 0,
          provisioned: 0,
          verifying: 0,
          verified: 0,
          failed: 0,
          total: 0,
        },
        reconnect: vi.fn(),
        updateSession: vi.fn(),
      });

      render(
        <TestWrapper>
          <BatchProvisioningSection />
        </TestWrapper>
      );

      expect(screen.getByText('SSE stream disconnected')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(
        <TestWrapper>
          <BatchProvisioningSection className="custom-class" />
        </TestWrapper>
      );

      const section = screen.getByTestId('batch-provisioning-section');
      expect(section).toHaveClass('custom-class');
    });
  });
});
