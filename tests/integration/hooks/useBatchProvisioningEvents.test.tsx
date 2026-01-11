/**
 * useBatchProvisioningEvents Hook Integration Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T026
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBatchProvisioningEvents } from '@/application/hooks/useBatchProvisioningEvents';
import type { SSEEvent } from '@/domain/types/sse';

// ============================================================================
// Mocks
// ============================================================================

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  static lastUrl: string | null = null;

  url: string;
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.lastUrl = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
    this.readyState = 2;
  }

  simulateOpen() {
    this.readyState = 1;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', {
        data: JSON.stringify(data),
      }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  static reset() {
    MockEventSource.instances = [];
    MockEventSource.lastUrl = null;
  }

  static getLatest(): MockEventSource | undefined {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }
}

const originalEventSource = global.EventSource;

// ============================================================================
// Test Fixtures
// ============================================================================

const mockTimestamp = '2026-01-11T12:00:00.000Z';

const createConnectionEstablishedEvent = (): SSEEvent => ({
  version: '1.0',
  type: 'connection.established',
  payload: { message: 'Connected to session session-123' },
  timestamp: mockTimestamp,
});

const createSessionStatusEvent = (state: 'discovering' | 'active' | 'paused' | 'closing' | 'closed' = 'active'): SSEEvent => ({
  version: '1.0',
  type: 'session.status',
  payload: {
    session: {
      id: 'session-123',
      state,
      target_ssid: 'MyNetwork',
      created_at: mockTimestamp,
      expires_at: null,
    },
  },
  timestamp: mockTimestamp,
});

const createDeviceDiscoveredEvent = (mac: string, inAllowlist = true): SSEEvent => ({
  version: '1.0',
  type: 'device.discovered',
  payload: {
    mac,
    ip: '192.168.1.100',
    rssi: -45,
    firmware_version: '1.0.0',
    in_allowlist: inAllowlist,
  },
  timestamp: mockTimestamp,
});

const createDeviceStateChangedEvent = (
  mac: string,
  previousState: string,
  newState: string,
  error?: string
): SSEEvent => ({
  version: '1.0',
  type: 'device.state_changed',
  payload: {
    mac,
    previous_state: previousState,
    new_state: newState,
    error,
  },
  timestamp: mockTimestamp,
} as SSEEvent);

const createHeartbeatEvent = (): SSEEvent => ({
  version: '1.0',
  type: 'connection.heartbeat',
  payload: null,
  timestamp: mockTimestamp,
});

const createNetworkStatusChangedEvent = (): SSEEvent => ({
  version: '1.0',
  type: 'network.status_changed',
  payload: {
    ssid: 'OnboardingNetwork',
    is_active: true,
    connected_devices: 5,
  },
  timestamp: mockTimestamp,
});

const createSSEErrorEvent = (code: string, message: string): SSEEvent => ({
  version: '1.0',
  type: 'error',
  payload: { code, message, retryable: false },
  timestamp: mockTimestamp,
});

// ============================================================================
// Test Suite
// ============================================================================

describe('useBatchProvisioningEvents Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.reset();
    (global as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;
  });

  afterEach(() => {
    vi.useRealTimers();
    (global as unknown as { EventSource: typeof EventSource }).EventSource = originalEventSource;
  });

  describe('Connection Management', () => {
    it('should connect when sessionId is provided', () => {
      renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      expect(MockEventSource.lastUrl).toBe('/api/v1/provisioning/batch/events?session_id=session-123');
      expect(MockEventSource.instances).toHaveLength(1);
    });

    it('should not connect when sessionId is null', () => {
      renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: null,
        })
      );

      expect(MockEventSource.instances).toHaveLength(0);
    });

    it('should not connect when disabled', () => {
      renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
          enabled: false,
        })
      );

      expect(MockEventSource.instances).toHaveLength(0);
    });

    it('should update connection state to connected on open', () => {
      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      expect(result.current.connectionState).toBe('connected');
    });

    it('should close connection on unmount', () => {
      const { unmount } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      const es = MockEventSource.getLatest();
      unmount();

      expect(es?.closed).toBe(true);
    });
  });

  describe('Session Events', () => {
    it('should update session state on session_status event', () => {
      const onSessionUpdate = vi.fn();

      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
          onSessionUpdate,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(createSessionStatusEvent('active'));
      });

      expect(result.current.session).not.toBeNull();
      expect(result.current.session?.state).toBe('active');
      expect(onSessionUpdate).toHaveBeenCalled();
    });

    it('should handle connection_established event', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(createConnectionEstablishedEvent());
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SSE] Connection established:',
        'Connected to session session-123'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Device Discovery', () => {
    it('should add device on device_discovered event', () => {
      const onDeviceDiscovered = vi.fn();

      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
          onDeviceDiscovered,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      expect(result.current.devices).toHaveLength(0);

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(createDeviceDiscoveredEvent('AA:BB:CC:DD:EE:01'));
      });

      expect(result.current.devices).toHaveLength(1);
      expect(result.current.devices[0].mac).toBe('AA:BB:CC:DD:EE:01');
      expect(result.current.devices[0].state).toBe('discovered');
      expect(onDeviceDiscovered).toHaveBeenCalled();
    });

    it('should not duplicate devices with same MAC', () => {
      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(createDeviceDiscoveredEvent('AA:BB:CC:DD:EE:01'));
        MockEventSource.getLatest()?.simulateMessage(createDeviceDiscoveredEvent('AA:BB:CC:DD:EE:01'));
      });

      expect(result.current.devices).toHaveLength(1);
    });

    it('should handle multiple device discoveries', () => {
      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(createDeviceDiscoveredEvent('AA:BB:CC:DD:EE:01'));
        MockEventSource.getLatest()?.simulateMessage(createDeviceDiscoveredEvent('AA:BB:CC:DD:EE:02'));
        MockEventSource.getLatest()?.simulateMessage(createDeviceDiscoveredEvent('AA:BB:CC:DD:EE:03'));
      });

      expect(result.current.devices).toHaveLength(3);
      expect(result.current.deviceCounts.discovered).toBe(3);
      expect(result.current.deviceCounts.total).toBe(3);
    });
  });

  describe('Device State Changes', () => {
    it('should update device state on device_state_changed event', () => {
      const onDeviceStateChanged = vi.fn();

      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
          onDeviceStateChanged,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      // First discover a device
      act(() => {
        MockEventSource.getLatest()?.simulateMessage(createDeviceDiscoveredEvent('AA:BB:CC:DD:EE:01'));
      });

      expect(result.current.devices[0].state).toBe('discovered');

      // Then change its state
      act(() => {
        MockEventSource.getLatest()?.simulateMessage(
          createDeviceStateChangedEvent('AA:BB:CC:DD:EE:01', 'discovered', 'provisioning')
        );
      });

      expect(result.current.devices[0].state).toBe('provisioning');
      expect(onDeviceStateChanged).toHaveBeenCalled();
    });

    it('should add error message on failed state', () => {
      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(createDeviceDiscoveredEvent('AA:BB:CC:DD:EE:01'));
      });

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(
          createDeviceStateChangedEvent('AA:BB:CC:DD:EE:01', 'provisioning', 'failed', 'Connection timeout')
        );
      });

      expect(result.current.devices[0].state).toBe('failed');
      expect(result.current.devices[0].error_message).toBe('Connection timeout');
    });

    it('should track device state transitions correctly', () => {
      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      // Discover 3 devices
      act(() => {
        MockEventSource.getLatest()?.simulateMessage(createDeviceDiscoveredEvent('AA:BB:CC:DD:EE:01'));
        MockEventSource.getLatest()?.simulateMessage(createDeviceDiscoveredEvent('AA:BB:CC:DD:EE:02'));
        MockEventSource.getLatest()?.simulateMessage(createDeviceDiscoveredEvent('AA:BB:CC:DD:EE:03'));
      });

      expect(result.current.deviceCounts.discovered).toBe(3);

      // Transition device 1 through full lifecycle
      act(() => {
        MockEventSource.getLatest()?.simulateMessage(
          createDeviceStateChangedEvent('AA:BB:CC:DD:EE:01', 'discovered', 'provisioning')
        );
      });

      expect(result.current.deviceCounts.discovered).toBe(2);
      expect(result.current.deviceCounts.provisioning).toBe(1);

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(
          createDeviceStateChangedEvent('AA:BB:CC:DD:EE:01', 'provisioning', 'provisioned')
        );
      });

      expect(result.current.deviceCounts.provisioning).toBe(0);
      expect(result.current.deviceCounts.provisioned).toBe(1);

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(
          createDeviceStateChangedEvent('AA:BB:CC:DD:EE:01', 'provisioned', 'verifying')
        );
      });

      expect(result.current.deviceCounts.provisioned).toBe(0);
      expect(result.current.deviceCounts.verifying).toBe(1);

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(
          createDeviceStateChangedEvent('AA:BB:CC:DD:EE:01', 'verifying', 'verified')
        );
      });

      expect(result.current.deviceCounts.verifying).toBe(0);
      expect(result.current.deviceCounts.verified).toBe(1);

      // Device 2 fails
      act(() => {
        MockEventSource.getLatest()?.simulateMessage(
          createDeviceStateChangedEvent('AA:BB:CC:DD:EE:02', 'discovered', 'failed', 'Network error')
        );
      });

      expect(result.current.deviceCounts.discovered).toBe(1);
      expect(result.current.deviceCounts.failed).toBe(1);
    });
  });

  describe('Network Status', () => {
    it('should update network status on network_status_changed event', () => {
      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      expect(result.current.networkStatus).toBeNull();

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(createNetworkStatusChangedEvent());
      });

      expect(result.current.networkStatus).not.toBeNull();
      expect(result.current.networkStatus?.ssid).toBe('OnboardingNetwork');
      expect(result.current.networkStatus?.is_active).toBe(true);
      expect(result.current.networkStatus?.connected_devices).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should call onError callback on SSE error event', () => {
      const onError = vi.fn();

      renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
          onError,
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(
          createSSEErrorEvent('SESSION_NOT_FOUND', 'Session not found')
        );
      });

      expect(onError).toHaveBeenCalledWith('SESSION_NOT_FOUND', 'Session not found');
    });
  });

  describe('Heartbeat Handling', () => {
    it('should ignore heartbeat events', () => {
      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      const initialDevices = result.current.devices;
      const initialSession = result.current.session;

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      act(() => {
        MockEventSource.getLatest()?.simulateMessage(createHeartbeatEvent());
      });

      // State should not change
      expect(result.current.devices).toEqual(initialDevices);
      expect(result.current.session).toEqual(initialSession);
    });
  });

  describe('Manual State Updates', () => {
    it('should allow manual session updates via updateSession', () => {
      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      const newSession = {
        id: 'session-123',
        state: 'paused' as const,
        target_ssid: 'MyNetwork',
        created_at: mockTimestamp,
        expires_at: null,
      };

      act(() => {
        result.current.updateSession(newSession);
      });

      expect(result.current.session?.state).toBe('paused');
    });

    it('should allow manual device updates via updateDevices', () => {
      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      const newDevices = [
        {
          mac: 'AA:BB:CC:DD:EE:01',
          ip: '192.168.1.100',
          state: 'verified' as const,
          rssi: -45,
          firmware_version: '1.0.0',
          discovered_at: mockTimestamp,
          retry_count: 0,
          in_allowlist: true,
        },
      ];

      act(() => {
        result.current.updateDevices(newDevices);
      });

      expect(result.current.devices).toHaveLength(1);
      expect(result.current.devices[0].state).toBe('verified');
      expect(result.current.deviceCounts.verified).toBe(1);
    });
  });

  describe('Initial State', () => {
    it('should use initialSession if provided', () => {
      const initialSession = {
        id: 'session-123',
        state: 'active' as const,
        target_ssid: 'InitialNetwork',
        created_at: mockTimestamp,
        expires_at: null,
      };

      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
          initialSession,
        })
      );

      expect(result.current.session).toEqual(initialSession);
    });

    it('should use initialDevices if provided', () => {
      const initialDevices = [
        {
          mac: 'AA:BB:CC:DD:EE:01',
          ip: '192.168.1.100',
          state: 'discovered' as const,
          rssi: -45,
          firmware_version: '1.0.0',
          discovered_at: mockTimestamp,
          retry_count: 0,
          in_allowlist: true,
        },
      ];

      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
          initialDevices,
        })
      );

      expect(result.current.devices).toHaveLength(1);
      expect(result.current.deviceCounts.discovered).toBe(1);
    });

    it('should use initialNetworkStatus if provided', () => {
      const initialNetworkStatus = {
        ssid: 'InitialNetwork',
        is_active: true,
        connected_devices: 3,
      };

      const { result } = renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
          initialNetworkStatus,
        })
      );

      expect(result.current.networkStatus).toEqual(initialNetworkStatus);
    });
  });

  describe('Unknown Events', () => {
    it('should log warning for unknown event types', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderHook(() =>
        useBatchProvisioningEvents({
          sessionId: 'session-123',
        })
      );

      act(() => {
        MockEventSource.getLatest()?.simulateOpen();
      });

      act(() => {
        MockEventSource.getLatest()?.simulateMessage({
          type: 'unknown_event_type',
          payload: {},
          timestamp: mockTimestamp,
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith('[SSE] Unknown event type:', 'unknown_event_type');

      consoleSpy.mockRestore();
    });
  });
});
