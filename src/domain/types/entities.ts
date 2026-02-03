/**
 * Domain Entity Type Definitions
 * Pi Dashboard - DeliCasa IoT System
 */

// ============ Enums / Union Types ============

export type PiModel = 'pi3' | 'pi4' | 'pi5' | 'unknown';
export type WifiClientStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
export type WifiApStatus = 'active' | 'inactive' | 'starting';
export type WifiEncryption = 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3';
export type DeviceStatus = 'discovered' | 'connecting' | 'provisioning' | 'provisioned' | 'online' | 'offline' | 'error';
// CRITICAL: This type MUST match PiOrchestrator's CameraStatus values
// See: PiOrchestrator/internal/domain/entities/camera.go
// See: PiOrchestrator/internal/domain/entities/camera_device.go
export type CameraStatus = 'online' | 'offline' | 'idle' | 'error' | 'rebooting' | 'discovered' | 'pairing' | 'connecting';
export type CameraResolution = 'QQVGA' | 'QVGA' | 'VGA' | 'SVGA' | 'XGA' | 'SXGA' | 'UXGA';
export type DoorState = 'open' | 'closed' | 'unknown';
export type LockState = 'locked' | 'unlocked' | 'unknown';
export type DoorCommand = 'open' | 'close' | 'lock' | 'unlock';
export type CommandResult = 'success' | 'failure' | 'timeout';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type ConfigCategory = 'system' | 'mqtt' | 'wifi' | 'hardware' | 'monitoring';
export type ConfigType = 'string' | 'number' | 'boolean' | 'select';
export type QueueOperation = 'door_command' | 'config_update' | 'device_provision';
export type QueueStatus = 'pending' | 'syncing' | 'synced' | 'failed';

// ============ Entity Interfaces ============

/**
 * Real-time system health metrics from Pi hardware
 */
export interface SystemStatus {
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  memory_available: number;
  disk_usage: number;
  disk_total: number;
  disk_available: number;
  temperature: number;
  uptime: string;
  uptime_seconds: number;
  hostname: string;
  pi_model: PiModel;
}

/**
 * Discovered WiFi network from scan results
 */
export interface WiFiNetwork {
  ssid: string;
  signal: number;
  secured: boolean;
  encryption?: WifiEncryption;
  bssid?: string;
  channel?: number;
}

/**
 * Current WiFi connection state
 */
export interface WiFiStatus {
  client_status: WifiClientStatus;
  client_ssid?: string;
  client_ip?: string;
  client_signal?: number;
  ap_status: WifiApStatus;
  ap_ssid?: string;
  ap_ip?: string;
  connected_devices?: number;
}

/**
 * BLE-discovered ESP32 device for provisioning
 */
export interface Device {
  name: string;
  address: string;
  rssi: number;
  status: DeviceStatus;
  provisioned: boolean;
  mqtt_configured?: boolean;
  wifi_configured?: boolean;
  last_seen?: string;
  firmware_version?: string;
}

/**
 * Camera health metrics (embedded in Camera)
 * Note: All fields optional - backend may return partial data
 */
export interface CameraHealth {
  wifi_rssi?: number;
  free_heap?: number;
  heap?: number; // Alternative name for free_heap from some backends
  uptime?: string | number;
  uptime_seconds?: number;
  resolution?: CameraResolution;
  firmware_version?: string;
  last_capture?: string;
  last_error?: string;
}

/**
 * Registered ESP32-CAM device
 */
export interface Camera {
  id: string;
  name: string;
  status: CameraStatus;
  lastSeen: string;
  health?: CameraHealth;
  ip_address?: string;
  mac_address?: string;
}

/**
 * Door testing mode state (client-side)
 */
export interface TestingMode {
  active: boolean;
  activatedAt: string;
  expiresAt: string;
  operationCount: number;
}

/**
 * Door/lock hardware state
 */
export interface Door {
  id: string;
  state: DoorState;
  lockState: LockState;
  lastCommand?: string;
  lastCommandType?: DoorCommand;
  lastCommandResult?: CommandResult;
  relayPin: number;
  testing_mode?: TestingMode;
}

/**
 * Door operation history entry
 */
export interface DoorOperation {
  id: string;
  timestamp: string;
  command: DoorCommand;
  result: CommandResult;
  testing_mode: boolean;
}

/**
 * MQTT broker configuration for device provisioning
 */
export interface MQTTConfig {
  broker: string;
  port: number;
  username?: string;
  password?: string;
  client_id?: string;
  use_tls?: boolean;
}

/**
 * System log entry for display and export
 */
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * System configuration value
 */
export interface ConfigEntry {
  key: string;
  value: string;
  category: ConfigCategory;
  type: ConfigType;
  editable: boolean;
  sensitive: boolean;
  default_value?: string;
  description?: string;
}

/**
 * Auto-calibrated health monitoring thresholds (stored in localStorage)
 */
export interface AdaptiveThresholds {
  piModel: PiModel;
  cpu_warning: number;
  cpu_critical: number;
  memory_warning: number;
  memory_critical: number;
  temp_warning: number;
  temp_critical: number;
  calibratedAt: string;
  baseline_cpu?: number;
  baseline_memory?: number;
}

/**
 * Queued operation for offline sync (stored in IndexedDB)
 */
export interface OfflineQueueEntry {
  id: string;
  operation: QueueOperation;
  endpoint: string;
  method: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  status: QueueStatus;
  retryCount: number;
  lastError?: string;
}

/**
 * Tailscale VPN connection status
 */
export interface TailscaleStatus {
  connected: boolean;
  ip?: string;
  hostname?: string;
  peers?: Array<{
    name: string;
    ip: string;
    online: boolean;
  }>;
}

/**
 * Camera diagnostics with extended health info
 */
export interface CameraDiagnostics extends Camera {
  diagnostics?: {
    connection_quality: 'excellent' | 'good' | 'fair' | 'poor';
    error_count: number;
    last_error?: string;
  };
}

/**
 * Comprehensive diagnostic report for export
 */
export interface DiagnosticReport {
  generated_at: string;
  system: SystemStatus;
  wifi: WiFiStatus;
  cameras: CameraDiagnostics[];
  door: Door;
  logs: LogEntry[];
  config: ConfigEntry[];
}

/**
 * Provisioning record for history panel
 */
export interface ProvisioningRecord {
  id: string;
  device_address: string;
  device_name: string;
  timestamp: string;
  success: boolean;
  error?: string;
  mqtt_config?: Partial<MQTTConfig>;
}
