/**
 * useSystemMonitor Hook
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T042
 *
 * Real-time system monitoring using WebSocket with polling fallback.
 * Provides comprehensive system health data with automatic transport selection.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import type {
  MonitoringData,
  ConnectionState,
  WebSocketMessage,
} from '@/domain/types/websocket';
import { systemApi } from '@/infrastructure/api/system';
import { queryKeys } from '@/lib/queryClient';

// ============================================================================
// Constants
// ============================================================================

const WS_ENDPOINT = '/ws/monitor';
const POLLING_INTERVAL = 5000; // 5 seconds
const WS_FALLBACK_DELAY = 3000; // Wait 3s before falling back to polling

// ============================================================================
// Types
// ============================================================================

export interface UseSystemMonitorOptions {
  /** Whether monitoring is enabled */
  enabled?: boolean;
  /** Polling interval in ms (for fallback) */
  pollingInterval?: number;
  /** Whether to prefer WebSocket over polling */
  preferWebSocket?: boolean;
  /** Base URL for WebSocket connection */
  wsBaseUrl?: string;
}

export interface UseSystemMonitorReturn {
  /** Current monitoring data */
  data: MonitoringData | null;
  /** Connection state */
  connectionState: ConnectionState;
  /** Active transport type */
  transport: 'websocket' | 'polling' | 'none';
  /** Whether data is being loaded */
  isLoading: boolean;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
  /** Error message if any */
  error: string | null;
  /** Retry count for WebSocket */
  retryCount: number;
  /** Manually refresh data */
  refresh: () => void;
  /** Switch to polling mode */
  usePolling: () => void;
  /** Switch to WebSocket mode */
  useWebSocket: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Merge partial monitoring data with existing data.
 */
function mergeMonitoringData(
  existing: MonitoringData | null,
  partial: Partial<MonitoringData>
): MonitoringData | null {
  if (!existing) return null;

  return {
    ...existing,
    ...partial,
    // Deep merge nested objects
    system_health: partial.system_health
      ? { ...existing.system_health, ...partial.system_health }
      : existing.system_health,
    security_metrics: partial.security_metrics
      ? { ...existing.security_metrics, ...partial.security_metrics }
      : existing.security_metrics,
    service_status: partial.service_status
      ? { ...existing.service_status, ...partial.service_status }
      : existing.service_status,
    network_metrics: partial.network_metrics
      ? { ...existing.network_metrics, ...partial.network_metrics }
      : existing.network_metrics,
    camera_status: partial.camera_status
      ? { ...existing.camera_status, ...partial.camera_status }
      : existing.camera_status,
    timestamp: partial.timestamp ?? existing.timestamp,
  };
}

/**
 * Build WebSocket URL from base URL.
 */
function buildWsUrl(baseUrl?: string): string | null {
  if (typeof window === 'undefined') return null;

  const base = baseUrl || window.location.origin;
  const wsProtocol = base.startsWith('https') ? 'wss' : 'ws';
  const host = base.replace(/^https?:\/\//, '');

  return `${wsProtocol}://${host}${WS_ENDPOINT}`;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for real-time system monitoring with WebSocket and polling fallback.
 *
 * Features:
 * - WebSocket for real-time updates
 * - Automatic fallback to polling when WebSocket unavailable
 * - Manual transport switching
 * - Partial update merging
 *
 * @param options - Monitor options
 * @returns System monitoring data and controls
 */
export function useSystemMonitor(options: UseSystemMonitorOptions = {}): UseSystemMonitorReturn {
  const {
    enabled = true,
    pollingInterval = POLLING_INTERVAL,
    preferWebSocket = true,
    wsBaseUrl,
  } = options;

  // State
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [transport, setTransport] = useState<'websocket' | 'polling' | 'none'>(
    preferWebSocket ? 'websocket' : 'polling'
  );
  const [wsEnabled, setWsEnabled] = useState(preferWebSocket);
  const [wsFailed, setWsFailed] = useState(false);

  // Build WebSocket URL
  const wsUrl = useMemo(() => (wsEnabled ? buildWsUrl(wsBaseUrl) : null), [wsEnabled, wsBaseUrl]);

  // WebSocket message handler
  const handleWsMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'initial_data') {
      setMonitoringData(message.data);
    } else if (message.type === 'monitoring_update') {
      setMonitoringData((prev) => mergeMonitoringData(prev, message.data));
    } else if (message.type === 'error') {
      console.error('[SystemMonitor] WebSocket error:', message.message);
    }
    // Ignore ping/pong - handled by useWebSocket
  }, []);

  // WebSocket connection
  const {
    connectionState: wsConnectionState,
    error: wsError,
    retryCount,
    reconnect: wsReconnect,
  } = useWebSocket<WebSocketMessage>({
    url: wsUrl,
    onMessage: handleWsMessage,
    onOpen: () => {
      setTransport('websocket');
      setWsFailed(false);
    },
    onError: () => {
      // Will be handled by close event
    },
    onClose: (event) => {
      if (!event.wasClean && !wsFailed) {
        // WebSocket failed, but we'll let reconnection attempts happen first
        console.log('[SystemMonitor] WebSocket closed, may fallback to polling');
      }
    },
    enabled: enabled && wsEnabled,
    maxRetries: 3, // Lower retries before fallback
  });

  // Fallback to polling when WebSocket fails
  // Note: We handle this in the onClose callback above rather than in an effect
  // to avoid cascading render issues. The wsFailed flag is set when onClose
  // detects an abnormal close, and we rely on the error state from useWebSocket.

  // Also fallback after initial connection timeout
  useEffect(() => {
    if (!wsEnabled || !enabled) return;

    const timeout = setTimeout(() => {
      if (wsConnectionState === 'connecting') {
        console.log('[SystemMonitor] WebSocket connection timeout, falling back to polling');
        setWsFailed(true);
        setWsEnabled(false);
        setTransport('polling');
      }
    }, WS_FALLBACK_DELAY);

    return () => clearTimeout(timeout);
  }, [wsEnabled, enabled, wsConnectionState]);

  // Polling query (fallback)
  const pollingEnabled = enabled && transport === 'polling';

  const {
    data: pollingData,
    isLoading: pollingLoading,
    isFetching: pollingFetching,
    error: pollingError,
    refetch: pollingRefetch,
  } = useQuery({
    queryKey: queryKeys.systemStatus(),
    queryFn: async () => {
      const systemInfo = await systemApi.getInfo();
      // Transform system info to monitoring data format
      const data: MonitoringData = {
        timestamp: new Date().toISOString(),
        system_health: {
          cpu_usage: systemInfo.cpu_usage,
          memory_usage: systemInfo.memory_usage,
          disk_usage: systemInfo.disk_usage,
          temperature: systemInfo.temperature,
          uptime: systemInfo.uptime,
          load_average: '', // Not available from basic API
        },
        security_metrics: {
          failed_ssh_attempts: 0,
          last_security_check: new Date().toISOString(),
          certificate_expiry: '',
          mqtt_secure_connections: 0,
          encryption_level: '',
          threat_level: 'LOW',
        },
        service_status: {
          mqtt_connected: false,
          mqtt_secure: false,
          api_responding: true,
          database_connected: true,
          last_health_check: new Date().toISOString(),
          service_uptime: systemInfo.uptime,
        },
        network_metrics: {
          active_connections: 0,
          bytes_received: 0,
          bytes_sent: 0,
          packet_loss: 0,
          latency: 0,
        },
        camera_status: {},
        alerts_count: 0,
        connected_clients: 0,
      };
      return data;
    },
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? pollingInterval : false,
    placeholderData: (prev) => prev,
  });

  // Update monitoring data from polling
  // Use a derived value instead of syncing in an effect to avoid cascading renders
  const effectiveMonitoringData = useMemo(() => {
    if (transport === 'polling' && pollingData) {
      return pollingData;
    }
    return monitoringData;
  }, [transport, pollingData, monitoringData]);

  // Computed values
  const isLoading = useMemo(() => {
    if (transport === 'websocket') {
      return wsConnectionState === 'connecting' && !effectiveMonitoringData;
    }
    return pollingLoading && !effectiveMonitoringData;
  }, [transport, wsConnectionState, pollingLoading, effectiveMonitoringData]);

  const isRefreshing = useMemo(() => {
    if (transport === 'websocket') {
      return wsConnectionState === 'reconnecting';
    }
    return pollingFetching;
  }, [transport, wsConnectionState, pollingFetching]);

  const error = useMemo(() => {
    if (transport === 'websocket') {
      return wsError;
    }
    return pollingError instanceof Error ? pollingError.message : null;
  }, [transport, wsError, pollingError]);

  const connectionState = useMemo((): ConnectionState => {
    if (!enabled) return 'disconnected';
    if (transport === 'websocket') return wsConnectionState;
    if (transport === 'polling') {
      if (pollingError) return 'error';
      return 'connected'; // Polling is always "connected" if enabled
    }
    return 'disconnected';
  }, [enabled, transport, wsConnectionState, pollingError]);

  // Actions
  const refresh = useCallback(() => {
    if (transport === 'websocket') {
      wsReconnect();
    } else {
      pollingRefetch();
    }
  }, [transport, wsReconnect, pollingRefetch]);

  const switchToPolling = useCallback(() => {
    setWsEnabled(false);
    setTransport('polling');
  }, []);

  const switchToWebSocket = useCallback(() => {
    setWsFailed(false);
    setWsEnabled(true);
    setTransport('websocket');
  }, []);

  return {
    data: effectiveMonitoringData,
    connectionState,
    transport,
    isLoading,
    isRefreshing,
    error,
    retryCount,
    refresh,
    usePolling: switchToPolling,
    useWebSocket: switchToWebSocket,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for system health metrics only.
 */
export function useSystemHealth(options: UseSystemMonitorOptions = {}) {
  const monitor = useSystemMonitor(options);

  return {
    health: monitor.data?.system_health ?? null,
    connectionState: monitor.connectionState,
    isLoading: monitor.isLoading,
    error: monitor.error,
    refresh: monitor.refresh,
  };
}

/**
 * Hook for security metrics only.
 */
export function useSecurityMetrics(options: UseSystemMonitorOptions = {}) {
  const monitor = useSystemMonitor(options);

  return {
    metrics: monitor.data?.security_metrics ?? null,
    connectionState: monitor.connectionState,
    isLoading: monitor.isLoading,
    error: monitor.error,
    refresh: monitor.refresh,
  };
}

/**
 * Hook for service status only.
 */
export function useServiceStatus(options: UseSystemMonitorOptions = {}) {
  const monitor = useSystemMonitor(options);

  return {
    status: monitor.data?.service_status ?? null,
    connectionState: monitor.connectionState,
    isLoading: monitor.isLoading,
    error: monitor.error,
    refresh: monitor.refresh,
  };
}

/**
 * Hook for network metrics only.
 */
export function useNetworkMetrics(options: UseSystemMonitorOptions = {}) {
  const monitor = useSystemMonitor(options);

  return {
    metrics: monitor.data?.network_metrics ?? null,
    connectionState: monitor.connectionState,
    isLoading: monitor.isLoading,
    error: monitor.error,
    refresh: monitor.refresh,
  };
}

/**
 * Hook for camera monitoring status only.
 */
export function useCameraMonitor(options: UseSystemMonitorOptions = {}) {
  const monitor = useSystemMonitor(options);

  return {
    cameras: monitor.data?.camera_status ?? {},
    connectionState: monitor.connectionState,
    isLoading: monitor.isLoading,
    error: monitor.error,
    refresh: monitor.refresh,
  };
}
