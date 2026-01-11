/**
 * SSE Event Type Definitions
 * Pi Dashboard - DeliCasa IoT System
 *
 * Defines types for Server-Sent Events from the batch provisioning endpoint.
 * SSE endpoint: /api/v1/provisioning/batch/events
 */

import type {
  BatchProvisioningSession,
  CandidateState,
} from './provisioning';

// ============ Event Types ============

/**
 * All SSE event types for batch provisioning.
 */
export type SSEEventType =
  | 'connection.established'
  | 'connection.heartbeat'
  | 'session.status'
  | 'device.state_changed'
  | 'device.discovered'
  | 'network.status_changed'
  | 'error';

// ============ Event Envelope ============

/**
 * Versioned wrapper for all SSE events.
 * @template T - The payload type for this event
 */
export interface SSEEventEnvelope<T> {
  /** Event format version */
  version: '1.0';
  /** Event type identifier */
  type: SSEEventType;
  /** ISO8601 timestamp when event was generated */
  timestamp: string;
  /** Session ID this event belongs to (if applicable) */
  session_id?: string;
  /** Event-specific payload */
  payload: T;
}

// ============ Event Payloads ============

/**
 * Payload for connection.established event.
 */
export interface ConnectionEstablishedPayload {
  message: string;
  session_id?: string;
}

/**
 * Payload for connection.heartbeat event (no data).
 */
export type HeartbeatPayload = null;

/**
 * Payload for session.status event.
 */
export interface SessionStatusPayload {
  session: BatchProvisioningSession;
}

/**
 * Payload for device.state_changed event.
 */
export interface DeviceStateChangedPayload {
  /** Device MAC address */
  mac: string;
  /** Previous device state */
  previous_state: CandidateState;
  /** New device state */
  new_state: CandidateState;
  /** Progress percentage (0-100) for provisioning/verifying states */
  progress?: number;
  /** Error message if transitioning to failed state */
  error?: string;
}

/**
 * Payload for device.discovered event.
 */
export interface DeviceDiscoveredPayload {
  /** Device MAC address */
  mac: string;
  /** Device IP on onboarding network */
  ip: string;
  /** Signal strength (dBm) */
  rssi: number;
  /** Firmware version */
  firmware_version: string;
  /** Whether device is in allowlist */
  in_allowlist: boolean;
}

/**
 * Payload for network.status_changed event.
 */
export interface NetworkStatusChangedPayload {
  /** Onboarding network SSID */
  ssid: string;
  /** Whether network is active */
  is_active: boolean;
  /** Number of connected devices */
  connected_devices: number;
}

/**
 * Payload for error event.
 */
export interface SSEErrorPayload {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Whether to retry connection */
  retryable: boolean;
}

// ============ Typed Event Envelopes ============

export type ConnectionEstablishedEvent = SSEEventEnvelope<ConnectionEstablishedPayload>;
export type HeartbeatEvent = SSEEventEnvelope<HeartbeatPayload>;
export type SessionStatusEvent = SSEEventEnvelope<SessionStatusPayload>;
export type DeviceStateChangedEvent = SSEEventEnvelope<DeviceStateChangedPayload>;
export type DeviceDiscoveredEvent = SSEEventEnvelope<DeviceDiscoveredPayload>;
export type NetworkStatusChangedEvent = SSEEventEnvelope<NetworkStatusChangedPayload>;
export type SSEErrorEvent = SSEEventEnvelope<SSEErrorPayload>;

/**
 * Union of all SSE events.
 */
export type SSEEvent =
  | ConnectionEstablishedEvent
  | HeartbeatEvent
  | SessionStatusEvent
  | DeviceStateChangedEvent
  | DeviceDiscoveredEvent
  | NetworkStatusChangedEvent
  | SSEErrorEvent;

// ============ Type Guards ============

/**
 * Type guard for connection.established event.
 */
export function isConnectionEstablished(event: SSEEvent): event is ConnectionEstablishedEvent {
  return event.type === 'connection.established';
}

/**
 * Type guard for session.status event.
 */
export function isSessionStatus(event: SSEEvent): event is SessionStatusEvent {
  return event.type === 'session.status';
}

/**
 * Type guard for device.state_changed event.
 */
export function isDeviceStateChanged(event: SSEEvent): event is DeviceStateChangedEvent {
  return event.type === 'device.state_changed';
}

/**
 * Type guard for device.discovered event.
 */
export function isDeviceDiscovered(event: SSEEvent): event is DeviceDiscoveredEvent {
  return event.type === 'device.discovered';
}

/**
 * Type guard for network.status_changed event.
 */
export function isNetworkStatusChanged(event: SSEEvent): event is NetworkStatusChangedEvent {
  return event.type === 'network.status_changed';
}

/**
 * Type guard for error event.
 */
export function isSSEError(event: SSEEvent): event is SSEErrorEvent {
  return event.type === 'error';
}

/**
 * Type guard for heartbeat event.
 */
export function isHeartbeat(event: SSEEvent): event is HeartbeatEvent {
  return event.type === 'connection.heartbeat';
}

// ============ SSE Connection State ============

/**
 * SSE connection state for UI display (same as WebSocket).
 */
export type SSEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// ============ Hook Options ============

/**
 * Options for SSE hook configuration.
 */
export interface UseSSEOptions<T> {
  /** SSE endpoint URL */
  url: string | null;
  /** Callback for each message */
  onMessage: (event: T) => void;
  /** Callback for errors */
  onError?: (error: Event) => void;
  /** Callback when connection established */
  onOpen?: () => void;
  /** Whether SSE is enabled */
  enabled?: boolean;
  /** Max reconnection attempts (default: 5) */
  maxRetries?: number;
  /** Initial retry delay in ms (default: 1000) */
  retryDelay?: number;
}

/**
 * Return type for SSE hook.
 */
export interface UseSSEReturn {
  /** Current connection state */
  connectionState: SSEConnectionState;
  /** Error message if in error state */
  error: string | null;
  /** Close the SSE connection */
  close: () => void;
  /** Reconnect after manual close */
  reconnect: () => void;
}
