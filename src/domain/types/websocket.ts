/**
 * WebSocket Monitoring Type Definitions
 * Pi Dashboard - DeliCasa IoT System
 *
 * Defines types for real-time system monitoring via WebSocket at /ws/monitor.
 */

// ============ System Health Metrics ============

/**
 * System hardware health metrics.
 */
export interface SystemHealth {
  /** CPU usage percentage (0-100) */
  cpu_usage: number;
  /** Memory usage percentage (0-100) */
  memory_usage: number;
  /** Disk usage percentage (0-100) */
  disk_usage: number;
  /** CPU temperature in Celsius */
  temperature: number;
  /** Human-readable uptime string */
  uptime: string;
  /** Load average string (e.g., "0.5 0.3 0.2") */
  load_average: string;
}

// ============ Security Metrics ============

/**
 * Security-related monitoring data.
 */
export interface SecurityMetrics {
  /** Count of failed SSH login attempts */
  failed_ssh_attempts: number;
  /** ISO8601 timestamp of last security scan */
  last_security_check: string;
  /** ISO8601 timestamp of TLS certificate expiry */
  certificate_expiry: string;
  /** Number of secure MQTT connections */
  mqtt_secure_connections: number;
  /** Encryption level description */
  encryption_level: string;
  /** Current threat assessment level */
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============ Service Status ============

/**
 * Backend service health status.
 */
export interface ServiceStatus {
  /** MQTT broker connection state */
  mqtt_connected: boolean;
  /** Whether MQTT uses TLS */
  mqtt_secure: boolean;
  /** API server responding to health checks */
  api_responding: boolean;
  /** Database connection state */
  database_connected: boolean;
  /** ISO8601 timestamp of last health check */
  last_health_check: string;
  /** Human-readable service uptime */
  service_uptime: string;
}

// ============ Network Metrics ============

/**
 * Network traffic and connectivity metrics.
 */
export interface NetworkMetrics {
  /** Number of active client connections */
  active_connections: number;
  /** Total bytes received since startup */
  bytes_received: number;
  /** Total bytes sent since startup */
  bytes_sent: number;
  /** Packet loss percentage (0-100) */
  packet_loss: number;
  /** Average network latency in ms */
  latency: number;
}

// ============ Camera Status ============

/**
 * Individual camera monitoring status.
 */
export interface CameraMonitorStatus {
  /** Camera online/offline state */
  online: boolean;
  /** WiFi signal strength (dBm) */
  rssi: number;
  /** Free heap memory in bytes */
  free_heap: number;
  /** ISO8601 timestamp of last seen */
  last_seen: string;
  /** Current frame rate if streaming */
  fps?: number;
}

// ============ Aggregated Monitoring Data ============

/**
 * Complete monitoring data snapshot from WebSocket.
 */
export interface MonitoringData {
  /** ISO8601 timestamp of this snapshot */
  timestamp: string;
  /** System hardware health */
  system_health: SystemHealth;
  /** Security metrics */
  security_metrics: SecurityMetrics;
  /** Backend service status */
  service_status: ServiceStatus;
  /** Network traffic metrics */
  network_metrics: NetworkMetrics;
  /** Camera status keyed by camera ID */
  camera_status: Record<string, CameraMonitorStatus>;
  /** Number of active alerts */
  alerts_count: number;
  /** Number of connected WebSocket clients */
  connected_clients: number;
}

// ============ WebSocket Messages ============

/**
 * Initial data message sent on WebSocket connection.
 */
export interface WsInitialDataMessage {
  type: 'initial_data';
  data: MonitoringData;
}

/**
 * Incremental update message with partial data.
 */
export interface WsMonitoringUpdateMessage {
  type: 'monitoring_update';
  data: Partial<MonitoringData>;
}

/**
 * Ping message for keepalive.
 */
export interface WsPingMessage {
  type: 'ping';
}

/**
 * Pong response to ping.
 */
export interface WsPongMessage {
  type: 'pong';
}

/**
 * Error message from server.
 */
export interface WsErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

/**
 * Union of all WebSocket message types.
 */
export type WebSocketMessage =
  | WsInitialDataMessage
  | WsMonitoringUpdateMessage
  | WsPingMessage
  | WsPongMessage
  | WsErrorMessage;

// ============ Connection State ============

/**
 * WebSocket connection state for UI display.
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// ============ Type Guards ============

/**
 * Type guard for initial data message.
 */
export function isInitialDataMessage(msg: WebSocketMessage): msg is WsInitialDataMessage {
  return msg.type === 'initial_data';
}

/**
 * Type guard for monitoring update message.
 */
export function isMonitoringUpdateMessage(msg: WebSocketMessage): msg is WsMonitoringUpdateMessage {
  return msg.type === 'monitoring_update';
}

/**
 * Type guard for ping message.
 */
export function isPingMessage(msg: WebSocketMessage): msg is WsPingMessage {
  return msg.type === 'ping';
}
