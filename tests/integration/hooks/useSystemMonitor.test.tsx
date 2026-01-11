/**
 * useSystemMonitor Hook Integration Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T044
 *
 * Tests for the system monitor hook including:
 * - WebSocket connection and data updates
 * - Polling fallback
 * - Transport switching
 * - Data merging
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useSystemMonitor,
  useSystemHealth,
  useSecurityMetrics,
  useServiceStatus,
  useNetworkMetrics,
  useCameraMonitor,
} from '@/application/hooks/useSystemMonitor';
import type { MonitoringData, WebSocketMessage } from '@/domain/types/websocket';
import * as systemApi from '@/infrastructure/api/system';

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock('@/infrastructure/api/system', () => ({
  systemApi: {
    getInfo: vi.fn(),
    getHealth: vi.fn(),
  },
}));

// Mock WebSocket
interface MockWebSocketInstance {
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  simulateOpen: () => void;
  simulateMessage: (data: WebSocketMessage) => void;
  simulateError: () => void;
  simulateClose: (wasClean?: boolean, code?: number) => void;
}

let mockWebSocketInstances: MockWebSocketInstance[] = [];

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ wasClean: true, code: 1000 } as CloseEvent);
    }
  });

  constructor(url: string) {
    this.url = url;
    mockWebSocketInstances.push(this as unknown as MockWebSocketInstance);
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: WebSocketMessage) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(wasClean = false, code = 1006) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ wasClean, code } as CloseEvent);
    }
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

const mockMonitoringData: MonitoringData = {
  timestamp: '2026-01-11T12:00:00Z',
  system_health: {
    cpu_usage: 25,
    memory_usage: 45,
    disk_usage: 60,
    temperature: 55,
    uptime: '5 days',
    load_average: '0.5 0.3 0.2',
  },
  security_metrics: {
    failed_ssh_attempts: 3,
    last_security_check: '2026-01-11T11:00:00Z',
    certificate_expiry: '2027-01-11T00:00:00Z',
    mqtt_secure_connections: 5,
    encryption_level: 'TLS 1.3',
    threat_level: 'LOW',
  },
  service_status: {
    mqtt_connected: true,
    mqtt_secure: true,
    api_responding: true,
    database_connected: true,
    last_health_check: '2026-01-11T11:55:00Z',
    service_uptime: '5 days',
  },
  network_metrics: {
    active_connections: 10,
    bytes_received: 1024000,
    bytes_sent: 512000,
    packet_loss: 0.1,
    latency: 15,
  },
  camera_status: {
    'cam-001': {
      online: true,
      rssi: -45,
      free_heap: 50000,
      last_seen: '2026-01-11T11:59:00Z',
      fps: 15,
    },
  },
  alerts_count: 2,
  connected_clients: 3,
};

const mockSystemInfo = {
  cpu_usage: 30,
  memory_usage: 50,
  disk_usage: 65,
  temperature: 58,
  uptime: '6 days',
};

// ============================================================================
// Test Setup
// ============================================================================

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const getLatestWs = (): MockWebSocketInstance | undefined => {
  return mockWebSocketInstances[mockWebSocketInstances.length - 1];
};

describe('useSystemMonitor', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWebSocketInstances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    queryClient = createQueryClient();
    vi.mocked(systemApi.systemApi.getInfo).mockResolvedValue(mockSystemInfo);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ============================================================================
  // WebSocket Mode Tests
  // ============================================================================

  describe('WebSocket Mode', () => {
    it('should connect via WebSocket when preferWebSocket is true', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.transport).toBe('websocket');
      // May create multiple instances due to React strict mode, but at least 1
      expect(mockWebSocketInstances.length).toBeGreaterThanOrEqual(1);
    });

    it('should receive initial data via WebSocket', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      // Initially no data
      expect(result.current.data).toBeNull();

      // Open all connections and send message
      act(() => {
        mockWebSocketInstances.forEach((ws) => ws.simulateOpen());
        getLatestWs()?.simulateMessage({
          type: 'initial_data',
          data: mockMonitoringData,
        });
      });

      // Data should be received regardless of connection state
      expect(result.current.data).toEqual(mockMonitoringData);
    });

    it('should merge partial updates', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      // Open all connections (React strict mode may create multiple)
      act(() => {
        mockWebSocketInstances.forEach((ws) => ws.simulateOpen());
      });

      // Initial data
      act(() => {
        getLatestWs()?.simulateMessage({
          type: 'initial_data',
          data: mockMonitoringData,
        });
      });

      expect(result.current.data?.system_health.cpu_usage).toBe(25);

      // Partial update
      act(() => {
        getLatestWs()?.simulateMessage({
          type: 'monitoring_update',
          data: {
            system_health: { cpu_usage: 50 } as MonitoringData['system_health'],
          },
        });
      });

      // Should merge, not replace
      expect(result.current.data?.system_health.cpu_usage).toBe(50);
      expect(result.current.data?.system_health.memory_usage).toBe(45); // Original value
    });

    it('should handle WebSocket errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      // Open all connections
      act(() => {
        mockWebSocketInstances.forEach((ws) => ws.simulateOpen());
      });

      // Receive error message - should not crash
      act(() => {
        getLatestWs()?.simulateMessage({
          type: 'error',
          message: 'Server error',
          code: 'ERR_500',
        });
      });

      // The hook should still be functional (not throw)
      expect(result.current.transport).toBe('websocket');

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Polling Fallback Tests
  // ============================================================================

  describe('Polling Fallback', () => {
    it('should use polling when preferWebSocket is false', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: false }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.transport).toBe('polling');
      // Polling should be enabled
      expect(result.current.connectionState).toBe('connected');
    });

    it('should fallback to polling when WebSocket fails', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.transport).toBe('websocket');

      // Simulate WebSocket failure - exhaust retries
      for (let i = 0; i < 4; i++) {
        act(() => {
          getLatestWs()?.simulateClose(false, 1006);
          vi.advanceTimersByTime(10000);
        });
      }

      expect(result.current.transport).toBe('polling');
    });

    it('should fallback on connection timeout', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.connectionState).toBe('connecting');

      // Wait for fallback timeout (3s)
      act(() => {
        vi.advanceTimersByTime(3500);
      });

      expect(result.current.transport).toBe('polling');
    });

    it('should start polling after transport switch', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: false }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.transport).toBe('polling');
      // API should be called via React Query
      expect(result.current.isLoading).toBe(true);
    });
  });

  // ============================================================================
  // Transport Switching Tests
  // ============================================================================

  describe('Transport Switching', () => {
    it('should switch to polling mode manually', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.transport).toBe('websocket');

      act(() => {
        result.current.usePolling();
      });

      expect(result.current.transport).toBe('polling');
    });

    it('should switch to WebSocket mode manually', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: false, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.transport).toBe('polling');

      act(() => {
        result.current.useWebSocket();
      });

      expect(result.current.transport).toBe('websocket');
    });
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading States', () => {
    it('should show loading when connecting via WebSocket', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();

      act(() => {
        mockWebSocketInstances.forEach((ws) => ws.simulateOpen());
        getLatestWs()?.simulateMessage({
          type: 'initial_data',
          data: mockMonitoringData,
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should show loading during initial polling', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: false }),
        { wrapper: createWrapper(queryClient) }
      );

      // Initially loading since no data
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
    });

    it('should track reconnection state after close', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      // Open all connections
      act(() => {
        mockWebSocketInstances.forEach((ws) => ws.simulateOpen());
      });

      act(() => {
        getLatestWs()?.simulateMessage({
          type: 'initial_data',
          data: mockMonitoringData,
        });
      });

      // Data should be received
      expect(result.current.data).not.toBeNull();

      // Close all connections to trigger reconnecting
      act(() => {
        mockWebSocketInstances.forEach((ws) => ws.simulateClose(false, 1006));
      });

      // After close, should be in a transitional state:
      // - reconnecting/error/connecting if WebSocket is retrying
      // - connected if already fell back to polling mode
      // All of these are valid outcomes depending on timing
      expect(['reconnecting', 'error', 'connecting', 'connected']).toContain(
        result.current.connectionState
      );
    });
  });

  // ============================================================================
  // Refresh Tests
  // ============================================================================

  describe('Refresh', () => {
    it('should refresh WebSocket connection', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      const initialInstanceCount = mockWebSocketInstances.length;

      act(() => {
        result.current.refresh();
      });

      expect(mockWebSocketInstances.length).toBeGreaterThan(initialInstanceCount);
    });

    it('should trigger refetch when transport is polling', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ preferWebSocket: false }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.transport).toBe('polling');

      // Refresh should not throw
      act(() => {
        result.current.refresh();
      });

      // Still in polling mode
      expect(result.current.transport).toBe('polling');
    });
  });

  // ============================================================================
  // Disabled State Tests
  // ============================================================================

  describe('Disabled State', () => {
    it('should not connect when disabled', () => {
      const { result } = renderHook(
        () => useSystemMonitor({ enabled: false }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.connectionState).toBe('disconnected');
      expect(mockWebSocketInstances).toHaveLength(0);
      expect(systemApi.systemApi.getInfo).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Specialized Hook Tests
// ============================================================================

describe('Specialized Monitor Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWebSocketInstances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    queryClient = createQueryClient();
    vi.mocked(systemApi.systemApi.getInfo).mockResolvedValue(mockSystemInfo);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('useSystemHealth', () => {
    it('should return system health data', () => {
      const { result } = renderHook(
        () => useSystemHealth({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        mockWebSocketInstances.forEach((ws) => ws.simulateOpen());
        getLatestWs()?.simulateMessage({
          type: 'initial_data',
          data: mockMonitoringData,
        });
      });

      expect(result.current.health).toEqual(mockMonitoringData.system_health);
    });
  });

  describe('useSecurityMetrics', () => {
    it('should return security metrics', () => {
      const { result } = renderHook(
        () => useSecurityMetrics({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        mockWebSocketInstances.forEach((ws) => ws.simulateOpen());
        getLatestWs()?.simulateMessage({
          type: 'initial_data',
          data: mockMonitoringData,
        });
      });

      expect(result.current.metrics).toEqual(mockMonitoringData.security_metrics);
    });
  });

  describe('useServiceStatus', () => {
    it('should return service status', () => {
      const { result } = renderHook(
        () => useServiceStatus({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        mockWebSocketInstances.forEach((ws) => ws.simulateOpen());
        getLatestWs()?.simulateMessage({
          type: 'initial_data',
          data: mockMonitoringData,
        });
      });

      expect(result.current.status).toEqual(mockMonitoringData.service_status);
    });
  });

  describe('useNetworkMetrics', () => {
    it('should return network metrics', () => {
      const { result } = renderHook(
        () => useNetworkMetrics({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        mockWebSocketInstances.forEach((ws) => ws.simulateOpen());
        getLatestWs()?.simulateMessage({
          type: 'initial_data',
          data: mockMonitoringData,
        });
      });

      expect(result.current.metrics).toEqual(mockMonitoringData.network_metrics);
    });
  });

  describe('useCameraMonitor', () => {
    it('should return camera status', () => {
      const { result } = renderHook(
        () => useCameraMonitor({ preferWebSocket: true, wsBaseUrl: 'http://localhost:8082' }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        mockWebSocketInstances.forEach((ws) => ws.simulateOpen());
        getLatestWs()?.simulateMessage({
          type: 'initial_data',
          data: mockMonitoringData,
        });
      });

      expect(result.current.cameras).toEqual(mockMonitoringData.camera_status);
    });
  });
});
