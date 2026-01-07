/**
 * API Request/Response Type Definitions
 * Pi Dashboard - DeliCasa IoT System
 */

import type {
  SystemStatus,
  WiFiNetwork,
  WiFiStatus,
  Device,
  Camera,
  CameraDiagnostics,
  Door,
  DoorOperation,
  LogEntry,
  ConfigEntry,
  TailscaleStatus,
  DiagnosticReport,
  MQTTConfig,
  ProvisioningRecord,
} from './entities';

// ============ Generic API Response Types ============

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Standard success response with optional data
 */
export interface ApiSuccessResponse<T = void> {
  success: boolean;
  data?: T;
}

// ============ System API ============

export type SystemInfoResponse = SystemStatus;

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
}

// ============ WiFi API ============

export interface WiFiScanResponse {
  networks: WiFiNetwork[];
}

export interface WiFiConnectRequest {
  ssid: string;
  password?: string;
}

export interface WiFiConnectResponse {
  success: boolean;
  ip_address?: string;
}

export interface WiFiStatusResponse {
  status: WiFiStatus;
}

// ============ Devices API ============

export interface DeviceListResponse {
  devices: Device[];
}

export interface DeviceScanRequest {
  duration?: number;
}

export interface DeviceScanResponse {
  scanning: boolean;
  duration: number;
}

export interface ProvisionDeviceRequest {
  mqtt: MQTTConfig;
  wifi?: {
    ssid: string;
    password?: string;
  };
}

export interface ProvisionDeviceResponse {
  success: boolean;
  device?: Device;
  error?: string;
}

export interface ProvisioningHistoryResponse {
  records: ProvisioningRecord[];
}

// ============ Cameras API ============

export type CameraListResponse = Camera[];

export type CameraDiagnosticsResponse = CameraDiagnostics[];

export interface CaptureRequest {
  camera_id: string;
}

export interface CaptureResponse {
  success: boolean;
  image_url?: string;
  timestamp?: string;
  error?: string;
}

export interface RebootCameraResponse {
  success: boolean;
}

// ============ Door API ============

export type DoorStatusResponse = Door;

export interface OpenDoorRequest {
  duration?: number;
  testing_mode?: boolean;
}

export interface DoorCommandResponse {
  success: boolean;
  state?: string;
  error?: string;
}

export type DoorHistoryResponse = DoorOperation[];

// ============ Logs API ============

export interface LogsRequest {
  level?: string;
  component?: string;
  search?: string;
  limit?: number;
}

export type LogsResponse = LogEntry[];

export type ExportDiagnosticsResponse = DiagnosticReport;

// ============ Config API ============

export type ConfigResponse = ConfigEntry[];

export interface UpdateConfigRequest {
  value: string;
}

export interface UpdateConfigResponse {
  success: boolean;
}

export interface ResetConfigResponse {
  success: boolean;
  value?: string;
}

// ============ Network API ============

export type TailscaleStatusResponse = TailscaleStatus;

export interface PingRequest {
  host: string;
  count?: number;
}

export interface PingResponse {
  success: boolean;
  avg_ms?: number;
  min_ms?: number;
  max_ms?: number;
  packet_loss?: number;
  error?: string;
}

// ============ SSE Event Types ============

export interface SSELogEvent {
  type: 'log';
  data: LogEntry;
}

export interface SSEHealthEvent {
  type: 'health';
  data: SystemStatus;
}

export type SSEEvent = SSELogEvent | SSEHealthEvent;
