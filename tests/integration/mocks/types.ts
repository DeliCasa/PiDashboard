/**
 * Backend Response Types for MSW Handlers (T026)
 * These types represent the raw backend API response format
 * before transformation by frontend API services
 */

// WiFi API responses
export interface WiFiNetworkApiResponse {
  ssid: string;
  bssid?: string;
  frequency?: number;
  signal: number;
  security: string;
  channel?: number;
  quality?: number;
}

// NOTE: V1 envelope is unwrapped by proxy
export interface WiFiScanApiResponse {
  count: number;
  networks: WiFiNetworkApiResponse[];
}

export interface WiFiStatusApiResponse {
  status: {
    connected: boolean;
    ssid?: string;
    ip?: string;
    signal?: number;
  };
}

export interface WiFiConnectApiResponse {
  success: boolean;
  message?: string;
}

// System API responses
// NOTE: V1 envelope is unwrapped by proxy, so this is the direct data
export interface RawSystemInfoResponse {
  timestamp: string;
  cpu: {
    usage_percent: number;
    core_count: number;
    per_core: number[];
  };
  memory: {
    used_mb: number;
    total_mb: number;
    used_percent: number;
    available_mb: number;
  };
  disk: {
    used_gb: number;
    total_gb: number;
    used_percent: number;
    path: string;
  };
  temperature_celsius: number;
  uptime: number; // nanoseconds
  load_average: {
    load_1: number;
    load_5: number;
    load_15: number;
  };
  overall_status: string;
}

export interface HealthCheckApiResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
}

// Config API responses
// NOTE: V1 envelope is unwrapped by proxy
export interface ConfigApiResponse {
  sections: Array<{
    name: string;
    description?: string;
    items: Array<{
      key: string;
      value: string;
      default_value?: string;
      type: string;
      description?: string;
      required?: boolean;
      editable?: boolean;
      validation?: {
        options?: string[];
        min?: number;
        max?: number;
        pattern?: string;
      };
    }>;
  }>;
}

// Door API responses
export interface DoorStatusApiResponse {
  state: 'locked' | 'unlocked' | 'unknown';
  is_locked: boolean;
  last_operation?: {
    action: string;
    timestamp: string;
    success: boolean;
  };
}

export interface DoorCommandApiResponse {
  success: boolean;
  message?: string;
  door_state?: 'locked' | 'unlocked';
}

export interface DoorOperationApiResponse {
  id: string;
  action: 'open' | 'close' | 'lock' | 'unlock';
  timestamp: string;
  duration_ms?: number;
  success: boolean;
  testing_mode?: boolean;
}

// Logs API responses
export interface LogsApiResponse {
  count: number;
  logs: Array<{
    id: string;
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    source: string;
    details?: Record<string, unknown>;
  }>;
}

// Network API responses
export interface TailscaleApiResponse {
  backend_state: string;
  tailscale_ip: string;
  hostname: string;
  tailnet?: string;
  peers?: Array<{
    id: string;
    hostname: string;
    tailscale_ip: string;
    online: boolean;
    is_bridge_server?: boolean;
  }>;
  funnel_status?: {
    enabled: boolean;
    exposed_ports?: Record<string, string>;
  };
  needs_login?: boolean;
}

export interface BridgeApiResponse {
  status?: {
    configured: boolean;
    connected: boolean;
    url?: string;
  };
  success: boolean;
}

// Device API responses (T067)
export interface DeviceApiResponse {
  address: string;
  name: string;
  rssi: number;
  status: 'discovered' | 'connecting' | 'provisioning' | 'provisioned' | 'online' | 'offline' | 'error';
  provisioned: boolean;
  last_seen: string;
  firmware_version?: string;
}

export interface DeviceListApiResponse {
  devices: DeviceApiResponse[];
}

export interface DeviceScanApiResponse {
  success: boolean;
  devices_found: number;
  duration_ms: number;
}

export interface ProvisionDeviceApiResponse {
  success: boolean;
  message?: string;
  device?: DeviceApiResponse;
}

export interface ProvisioningRecordApiResponse {
  id: string;
  device_address: string;
  device_name: string;
  timestamp: string;
  success: boolean;
  mqtt_configured: boolean;
  wifi_configured: boolean;
  error?: string;
}
