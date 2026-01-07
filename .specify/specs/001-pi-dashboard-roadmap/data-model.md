# Data Model: Pi Dashboard

> **Feature**: 001-pi-dashboard-roadmap
> **Created**: 2026-01-06
> **Source**: Feature Specification Key Entities

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│  SystemStatus   │       │   WiFiStatus    │
│─────────────────│       │─────────────────│
│ cpu_usage       │       │ client_status   │
│ memory_usage    │       │ client_ssid     │
│ disk_usage      │       │ client_ip       │
│ temperature     │       │ ap_status       │
│ uptime          │       │ ap_ssid         │
│ hostname        │       │ ap_ip           │
│ pi_model        │       │ connected_devs  │
└─────────────────┘       └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│  WiFiNetwork    │       │    Device       │
│─────────────────│       │─────────────────│
│ ssid            │       │ name            │
│ signal          │       │ address (PK)    │
│ secured         │       │ rssi            │
│ encryption      │       │ status          │
└─────────────────┘       │ provisioned     │
                          │ mqtt_config     │──┐
                          │ last_seen       │  │
                          └─────────────────┘  │
                                               │
┌─────────────────┐       ┌─────────────────┐  │
│     Camera      │       │   MQTTConfig    │◄─┘
│─────────────────│       │─────────────────│
│ id (PK)         │       │ broker          │
│ name            │       │ port            │
│ status          │       │ username        │
│ lastSeen        │       │ password        │
│ health          │──┐    │ client_id       │
└─────────────────┘  │    └─────────────────┘
                     │
┌─────────────────┐  │    ┌─────────────────┐
│  CameraHealth   │◄─┘    │      Door       │
│─────────────────│       │─────────────────│
│ wifi_rssi       │       │ id (PK)         │
│ free_heap       │       │ state           │
│ uptime          │       │ lockState       │
│ resolution      │       │ lastCommand     │
│ firmware_ver    │       │ relayPin        │
└─────────────────┘       │ testing_mode    │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│    LogEntry     │       │  ConfigEntry    │
│─────────────────│       │─────────────────│
│ id (PK)         │       │ key (PK)        │
│ timestamp       │       │ value           │
│ level           │       │ category        │
│ component       │       │ type            │
│ message         │       │ editable        │
│ metadata        │       │ sensitive       │
└─────────────────┘       │ default_value   │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│  TestingMode    │       │ OfflineQueue    │
│─────────────────│       │─────────────────│
│ active          │       │ id (PK)         │
│ activatedAt     │       │ operation       │
│ expiresAt       │       │ endpoint        │
│ operationCount  │       │ payload         │
└─────────────────┘       │ createdAt       │
                          │ status          │
┌─────────────────┐       └─────────────────┘
│AdaptiveThreshold│
│─────────────────│
│ piModel         │
│ cpu_warning     │
│ cpu_critical    │
│ mem_warning     │
│ mem_critical    │
│ temp_warning    │
│ temp_critical   │
│ calibratedAt    │
└─────────────────┘
```

---

## Entity Definitions

### SystemStatus

Real-time system health metrics from Pi hardware.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| cpu_usage | number | Yes | 0-100 | CPU usage percentage |
| memory_usage | number | Yes | 0-100 | Memory usage percentage |
| memory_total | number | Yes | > 0 | Total memory in bytes |
| memory_available | number | Yes | >= 0 | Available memory in bytes |
| disk_usage | number | Yes | 0-100 | Root filesystem usage % |
| disk_total | number | Yes | > 0 | Total disk in bytes |
| disk_available | number | Yes | >= 0 | Available disk in bytes |
| temperature | number | Yes | -40 to 125 | CPU temperature in Celsius |
| uptime | string | Yes | Non-empty | Human-readable uptime |
| uptime_seconds | number | Yes | >= 0 | Uptime in seconds |
| hostname | string | Yes | Non-empty | System hostname |
| pi_model | string | Yes | Enum | Pi model identifier |

**Pi Model Values**: `pi3`, `pi4`, `pi5`, `unknown`

---

### WiFiNetwork

Discovered WiFi network from scan results.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| ssid | string | Yes | 1-32 chars | Network name |
| signal | number | Yes | -100 to 0 | Signal strength in dBm |
| secured | boolean | Yes | - | Whether network requires password |
| encryption | string | No | Enum | Encryption type |
| bssid | string | No | MAC format | Access point MAC address |
| channel | number | No | 1-14 | WiFi channel |

**Encryption Values**: `open`, `wep`, `wpa`, `wpa2`, `wpa3`

---

### WiFiStatus

Current WiFi connection state.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| client_status | string | Yes | Enum | Connection state |
| client_ssid | string | No | - | Connected network SSID |
| client_ip | string | No | IPv4 format | Client IP address |
| client_signal | number | No | -100 to 0 | Current signal strength |
| ap_status | string | Yes | Enum | Access Point state |
| ap_ssid | string | No | - | AP network name |
| ap_ip | string | No | IPv4 format | AP IP address |
| connected_devices | number | No | >= 0 | Devices connected to AP |

**Status Values**: `connected`, `disconnected`, `connecting`, `error`
**AP Status Values**: `active`, `inactive`, `starting`

---

### Device (ESP32)

BLE-discovered ESP32 device for provisioning.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | string | Yes | Non-empty | Device advertised name |
| address | string | Yes | MAC format | BLE/MAC address (primary key) |
| rssi | number | Yes | -100 to 0 | Signal strength in dBm |
| status | string | Yes | Enum | Provisioning lifecycle state |
| provisioned | boolean | Yes | - | Whether device is configured |
| mqtt_configured | boolean | No | - | MQTT credentials set |
| wifi_configured | boolean | No | - | WiFi credentials set |
| last_seen | string | No | ISO 8601 | Last discovery timestamp |
| firmware_version | string | No | - | ESP32 firmware version |

**Status Values**: `discovered`, `connecting`, `provisioning`, `provisioned`, `online`, `offline`, `error`

**State Transitions**:
```
discovered → connecting → provisioning → provisioned → online
                                    ↓                    ↓
                                  error              offline
```

---

### Camera

Registered ESP32-CAM device.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | string | Yes | Non-empty | Unique camera identifier |
| name | string | Yes | Non-empty | Display name |
| status | string | Yes | Enum | Online state |
| lastSeen | string | Yes | ISO 8601 | Last communication time |
| health | CameraHealth | No | - | Health metrics object |
| ip_address | string | No | IPv4 format | Camera IP |
| mac_address | string | No | MAC format | Camera MAC |

**Status Values**: `online`, `offline`, `error`, `rebooting`

---

### CameraHealth

Camera health metrics (embedded in Camera).

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| wifi_rssi | number | Yes | -100 to 0 | WiFi signal strength |
| free_heap | number | Yes | >= 0 | Free heap memory in bytes |
| uptime | string | Yes | Non-empty | Camera uptime |
| uptime_seconds | number | No | >= 0 | Uptime in seconds |
| resolution | string | Yes | Enum | Current capture resolution |
| firmware_version | string | No | - | Firmware version |
| last_capture | string | No | ISO 8601 | Last successful capture |

**Resolution Values**: `QQVGA`, `QVGA`, `VGA`, `SVGA`, `XGA`, `SXGA`, `UXGA`

---

### Door

Door/lock hardware state.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | string | Yes | Non-empty | Door identifier |
| state | string | Yes | Enum | Physical door state |
| lockState | string | Yes | Enum | Lock mechanism state |
| lastCommand | string | No | ISO 8601 | Last command timestamp |
| lastCommandType | string | No | Enum | Last command type |
| lastCommandResult | string | No | Enum | Last command outcome |
| relayPin | number | Yes | 0-40 | GPIO pin number |
| testing_mode | TestingMode | No | - | Testing mode state |

**State Values**: `open`, `closed`, `unknown`
**Lock State Values**: `locked`, `unlocked`, `unknown`
**Command Types**: `open`, `close`, `lock`, `unlock`
**Command Results**: `success`, `failure`, `timeout`

---

### MQTTConfig

MQTT broker configuration for device provisioning.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| broker | string | Yes | Host or IP | Broker address |
| port | number | Yes | 1-65535 | Broker port |
| username | string | No | - | Auth username |
| password | string | No | - | Auth password (masked in UI) |
| client_id | string | No | - | Client identifier prefix |
| use_tls | boolean | No | - | Enable TLS connection |

---

### LogEntry

System log entry for display and export.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | string | Yes | UUID | Unique entry ID |
| timestamp | string | Yes | ISO 8601 | Log timestamp |
| level | string | Yes | Enum | Severity level |
| component | string | Yes | Non-empty | Source component |
| message | string | Yes | Non-empty | Log message |
| metadata | object | No | - | Additional context |

**Level Values**: `debug`, `info`, `warn`, `error`

---

### ConfigEntry

System configuration value.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| key | string | Yes | Non-empty | Config key (primary key) |
| value | string | Yes | - | Current value |
| category | string | Yes | Enum | Config category |
| type | string | Yes | Enum | Value type |
| editable | boolean | Yes | - | Can be modified via dashboard |
| sensitive | boolean | Yes | - | Should be masked |
| default_value | string | No | - | Factory default |
| description | string | No | - | Human-readable description |

**Category Values**: `system`, `mqtt`, `wifi`, `hardware`, `monitoring`
**Type Values**: `string`, `number`, `boolean`, `select`

---

### TestingMode

Door testing mode state (client-side).

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| active | boolean | Yes | - | Testing mode enabled |
| activatedAt | string | Yes | ISO 8601 | Activation timestamp |
| expiresAt | string | Yes | ISO 8601 | Expiration timestamp |
| operationCount | number | Yes | >= 0 | Operations performed |

---

### AdaptiveThresholds

Auto-calibrated health monitoring thresholds (stored in localStorage).

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| piModel | string | Yes | Enum | Detected Pi model |
| cpu_warning | number | Yes | 0-100 | CPU warning threshold |
| cpu_critical | number | Yes | 0-100 | CPU critical threshold |
| memory_warning | number | Yes | 0-100 | Memory warning threshold |
| memory_critical | number | Yes | 0-100 | Memory critical threshold |
| temp_warning | number | Yes | 0-100 | Temperature warning (°C) |
| temp_critical | number | Yes | 0-100 | Temperature critical (°C) |
| calibratedAt | string | Yes | ISO 8601 | Calibration timestamp |
| baseline_cpu | number | No | 0-100 | Baseline CPU at rest |
| baseline_memory | number | No | 0-100 | Baseline memory usage |

---

### OfflineQueueEntry

Queued operation for offline sync (stored in IndexedDB).

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | string | Yes | UUID | Unique entry ID |
| operation | string | Yes | Enum | Operation type |
| endpoint | string | Yes | URL path | API endpoint |
| method | string | Yes | HTTP method | Request method |
| payload | object | No | - | Request body |
| createdAt | string | Yes | ISO 8601 | Queue timestamp |
| status | string | Yes | Enum | Sync status |
| retryCount | number | Yes | >= 0 | Retry attempts |
| lastError | string | No | - | Last sync error |

**Operation Values**: `door_command`, `config_update`, `device_provision`
**Status Values**: `pending`, `syncing`, `synced`, `failed`

---

## TypeScript Type Definitions

```typescript
// src/domain/types/entities.ts

export type PiModel = 'pi3' | 'pi4' | 'pi5' | 'unknown';
export type WifiClientStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
export type WifiApStatus = 'active' | 'inactive' | 'starting';
export type WifiEncryption = 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3';
export type DeviceStatus = 'discovered' | 'connecting' | 'provisioning' | 'provisioned' | 'online' | 'offline' | 'error';
export type CameraStatus = 'online' | 'offline' | 'error' | 'rebooting';
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

export interface WiFiNetwork {
  ssid: string;
  signal: number;
  secured: boolean;
  encryption?: WifiEncryption;
  bssid?: string;
  channel?: number;
}

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

export interface CameraHealth {
  wifi_rssi: number;
  free_heap: number;
  uptime: string;
  uptime_seconds?: number;
  resolution: CameraResolution;
  firmware_version?: string;
  last_capture?: string;
}

export interface Camera {
  id: string;
  name: string;
  status: CameraStatus;
  lastSeen: string;
  health?: CameraHealth;
  ip_address?: string;
  mac_address?: string;
}

export interface TestingMode {
  active: boolean;
  activatedAt: string;
  expiresAt: string;
  operationCount: number;
}

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

export interface MQTTConfig {
  broker: string;
  port: number;
  username?: string;
  password?: string;
  client_id?: string;
  use_tls?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

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
```

---

## Storage Strategy

| Entity | Storage | Persistence | Sync |
|--------|---------|-------------|------|
| SystemStatus | Memory (React Query) | No | Real-time API |
| WiFiStatus | Memory (React Query) | No | Real-time API |
| WiFiNetwork[] | Memory (React Query) | No | On-demand scan |
| Device[] | Memory (React Query) | No | Real-time API |
| Camera[] | Memory (React Query) | No | Real-time API |
| Door | Memory (React Query) | No | Real-time API |
| LogEntry[] | Memory (ring buffer) | No | SSE stream |
| ConfigEntry[] | Memory (React Query) | No | On-demand API |
| MQTTConfig | Memory (Zustand) | No | Form state |
| TestingMode | localStorage | Yes | Client-only |
| AdaptiveThresholds | localStorage | Yes | Client-only |
| OfflineQueueEntry[] | IndexedDB | Yes | Sync on reconnect |
