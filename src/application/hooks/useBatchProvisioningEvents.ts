/**
 * useBatchProvisioningEvents Hook
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Specialized SSE hook for batch provisioning events.
 * Manages device list state based on SSE event stream.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTypedSSE, type SSEConnectionState } from './useSSE';
import type {
  SSEEvent,
  DeviceDiscoveredPayload,
  DeviceStateChangedPayload,
  SessionStatusPayload,
  NetworkStatusChangedPayload,
} from '@/domain/types/sse';
import type {
  BatchProvisioningSession,
  ProvisioningCandidate,
  NetworkStatus,
} from '@/domain/types/provisioning';
import {
  isConnectionEstablished,
  isSessionStatus,
  isDeviceStateChanged,
  isDeviceDiscovered,
  isNetworkStatusChanged,
  isSSEError,
  isHeartbeat,
} from '@/domain/types/sse';
import { getSSEEndpoint } from '@/infrastructure/api/routes';
import { ensureArray } from '@/lib/normalize';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for batch provisioning events hook.
 */
export interface UseBatchProvisioningEventsOptions {
  /** Session ID to connect to (null to disconnect) */
  sessionId: string | null;
  /** Initial session data (from API response) */
  initialSession?: BatchProvisioningSession;
  /** Initial device list (from API response) */
  initialDevices?: ProvisioningCandidate[];
  /** Initial network status */
  initialNetworkStatus?: NetworkStatus;
  /** Whether SSE is enabled */
  enabled?: boolean;
  /** Callback when session status changes */
  onSessionUpdate?: (session: BatchProvisioningSession) => void;
  /** Callback when a device is discovered */
  onDeviceDiscovered?: (payload: DeviceDiscoveredPayload) => void;
  /** Callback when device state changes */
  onDeviceStateChanged?: (payload: DeviceStateChangedPayload) => void;
  /** Callback on SSE error */
  onError?: (code: string, message: string) => void;
}

/**
 * Return type for batch provisioning events hook.
 */
export interface UseBatchProvisioningEventsReturn {
  /** Current connection state */
  connectionState: SSEConnectionState;
  /** Connection error message if any */
  error: string | null;
  /** Current session state */
  session: BatchProvisioningSession | null;
  /** Current device list (updated via SSE) */
  devices: ProvisioningCandidate[];
  /** Current network status */
  networkStatus: NetworkStatus | null;
  /** Number of devices by state */
  deviceCounts: {
    discovered: number;
    provisioning: number;
    provisioned: number;
    verifying: number;
    verified: number;
    failed: number;
    total: number;
  };
  /** Close SSE connection */
  close: () => void;
  /** Reconnect SSE */
  reconnect: () => void;
  /** Update session state manually (after API call) */
  updateSession: (session: BatchProvisioningSession) => void;
  /** Update devices manually (after API call) */
  updateDevices: (devices: ProvisioningCandidate[]) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing batch provisioning SSE events and state.
 *
 * Connects to the SSE endpoint for a session and maintains:
 * - Session state
 * - Device list (updated in real-time via SSE)
 * - Network status
 * - Connection state
 */
export function useBatchProvisioningEvents(
  options: UseBatchProvisioningEventsOptions
): UseBatchProvisioningEventsReturn {
  const {
    sessionId,
    initialSession,
    initialDevices = [],
    initialNetworkStatus,
    enabled = true,
    onSessionUpdate,
    onDeviceDiscovered,
    onDeviceStateChanged,
    onError,
  } = options;

  // State
  // Defensive: ensure initialDevices is always an array (028-api-compat)
  const [session, setSession] = useState<BatchProvisioningSession | null>(initialSession ?? null);
  const [devices, setDevices] = useState<ProvisioningCandidate[]>(
    ensureArray(initialDevices)
  );
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(
    initialNetworkStatus ?? null
  );

  // Build SSE URL using centralized routes (028-api-compat)
  const sseUrl = useMemo(() => {
    if (!sessionId) return null;
    return getSSEEndpoint(sessionId);
  }, [sessionId]);

  // Handle SSE events
  const handleEvent = useCallback(
    (event: SSEEvent) => {
      // Handle heartbeat (no action needed)
      if (isHeartbeat(event)) {
        return;
      }

      // Connection established
      if (isConnectionEstablished(event)) {
        console.log('[SSE] Connection established:', event.payload.message);
        return;
      }

      // Session status update
      if (isSessionStatus(event)) {
        const payload = event.payload as SessionStatusPayload;
        setSession(payload.session);
        onSessionUpdate?.(payload.session);
        return;
      }

      // Device discovered
      if (isDeviceDiscovered(event)) {
        const payload = event.payload as DeviceDiscoveredPayload;

        // Add to device list if not already present
        setDevices((prev) => {
          const exists = prev.some((d) => d.mac === payload.mac);
          if (exists) return prev;

          const newDevice: ProvisioningCandidate = {
            mac: payload.mac,
            ip: payload.ip,
            state: 'discovered',
            rssi: payload.rssi,
            firmware_version: payload.firmware_version,
            discovered_at: event.timestamp,
            retry_count: 0,
            in_allowlist: payload.in_allowlist,
          };

          return [...prev, newDevice];
        });

        onDeviceDiscovered?.(payload);
        return;
      }

      // Device state changed
      if (isDeviceStateChanged(event)) {
        const payload = event.payload as DeviceStateChangedPayload;

        // Update device in list
        setDevices((prev) =>
          prev.map((device) => {
            if (device.mac !== payload.mac) return device;

            const updates: Partial<ProvisioningCandidate> = {
              state: payload.new_state,
            };

            // Add timestamps based on state
            if (payload.new_state === 'provisioned') {
              updates.provisioned_at = event.timestamp;
            } else if (payload.new_state === 'verified') {
              updates.verified_at = event.timestamp;
            } else if (payload.new_state === 'failed' && payload.error) {
              updates.error_message = payload.error;
            }

            return { ...device, ...updates };
          })
        );

        onDeviceStateChanged?.(payload);
        return;
      }

      // Network status changed
      if (isNetworkStatusChanged(event)) {
        const payload = event.payload as NetworkStatusChangedPayload;
        setNetworkStatus({
          ssid: payload.ssid,
          is_active: payload.is_active,
          connected_devices: payload.connected_devices,
        });
        return;
      }

      // SSE error
      if (isSSEError(event)) {
        onError?.(event.payload.code, event.payload.message);
        return;
      }

      // Unknown event type - should never happen with proper type guards
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.warn('[SSE] Unknown event type:', (event as any).type);
    },
    [onSessionUpdate, onDeviceDiscovered, onDeviceStateChanged, onError]
  );

  // Connect to SSE
  const { connectionState, error, close, reconnect } = useTypedSSE<SSEEvent>({
    url: sseUrl,
    onEvent: handleEvent,
    enabled: enabled && !!sessionId,
  });

  // Calculate device counts
  const deviceCounts = useMemo(() => {
    const counts = {
      discovered: 0,
      provisioning: 0,
      provisioned: 0,
      verifying: 0,
      verified: 0,
      failed: 0,
      total: devices.length,
    };

    for (const device of devices) {
      switch (device.state) {
        case 'discovered':
          counts.discovered++;
          break;
        case 'provisioning':
          counts.provisioning++;
          break;
        case 'provisioned':
          counts.provisioned++;
          break;
        case 'verifying':
          counts.verifying++;
          break;
        case 'verified':
          counts.verified++;
          break;
        case 'failed':
          counts.failed++;
          break;
      }
    }

    return counts;
  }, [devices]);

  // Manual state updates (for API response synchronization)
  const updateSession = useCallback((newSession: BatchProvisioningSession) => {
    setSession(newSession);
  }, []);

  const updateDevices = useCallback((newDevices: ProvisioningCandidate[]) => {
    // Defensive: ensure newDevices is always an array (028-api-compat)
    setDevices(ensureArray(newDevices));
  }, []);

  return {
    connectionState,
    error,
    session,
    devices,
    networkStatus,
    deviceCounts,
    close,
    reconnect,
    updateSession,
    updateDevices,
  };
}

