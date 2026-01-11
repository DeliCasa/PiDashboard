# API Contract Documentation

This document defines the API contracts between the Pi Dashboard frontend and the PiOrchestrator backend.

## Overview

All API endpoints are validated at runtime using Zod schemas. This prevents silent API contract drift and provides early detection of breaking changes.

### Validation Strategy

- **Graceful Degradation**: Validation failures log warnings but don't break functionality
- **Console Warnings**: Failures appear as `[API Contract] <endpoint> validation failed: <errors>`
- **Contract Tests**: Located in `tests/integration/contracts/` to verify mock data matches schemas

## Endpoints

### System API (`/api/system/*`)

#### GET `/api/system/info`

Returns system health metrics including CPU, memory, disk, and temperature.

**Response Schema**: `SystemInfoResponseSchema`

```typescript
{
  success: boolean;
  data: {
    timestamp: string;           // ISO 8601 timestamp
    cpu: {
      usage_percent: number;     // 0-100
      core_count: number;        // Positive integer
      per_core?: number[];       // Optional per-core percentages
    };
    memory: {
      used_mb: number;           // Non-negative
      total_mb: number;          // Positive
      used_percent: number;      // 0-100
      available_mb: number;      // Non-negative
    };
    disk: {
      used_gb: number;           // Non-negative
      total_gb: number;          // Positive
      used_percent: number;      // 0-100
      path: string;              // Mount path (e.g., "/")
    };
    temperature_celsius: number;
    uptime: number;              // Nanoseconds since boot
    load_average: {
      load_1: number;            // Non-negative
      load_5: number;            // Non-negative
      load_15: number;           // Non-negative
    };
    overall_status: string;      // "healthy", "warning", "critical"
  };
}
```

---

### WiFi API (`/api/wifi/*`)

#### GET `/api/wifi/scan`

Scans for available WiFi networks.

**Response Schema**: `WifiScanResponseSchema`

```typescript
{
  count: number;                 // Non-negative integer
  networks: Array<{
    ssid: string;
    bssid?: string;              // MAC address
    frequency?: number;          // MHz
    signal: number;              // dBm (negative values)
    security: string;            // "WPA2", "WPA3", "Open", etc.
    channel?: number;
    quality?: number;            // 0-100
  }>;
  success: boolean;
}
```

#### GET `/api/wifi/status`

Returns current WiFi connection status.

**Response Schema**: `WifiStatusResponseSchema`

```typescript
{
  status: {
    connected: boolean;
    ssid?: string;
    ip_address?: string;
    signal_strength?: number;     // dBm
    mode?: "client" | "ap" | "disconnected";
  };
}
```

#### POST `/api/wifi/connect`

Connects to a WiFi network.

**Request Schema**: `WifiConnectRequestSchema`

```typescript
{
  ssid: string;                  // Non-empty
  password?: string;             // Optional for open networks
}
```

**Response Schema**: `WifiConnectResponseSchema`

```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### Config API (`/api/dashboard/config`)

#### GET `/api/dashboard/config`

Returns all configuration entries grouped by section.

**Response Schema**: `ConfigResponseSchema`

```typescript
{
  sections: Array<{
    name: string;
    description?: string;
    items: Array<{
      key: string;
      value: string;
      default_value?: string;
      type: string;              // "string", "number", "boolean", "secret"
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
  success: boolean;
}
```

#### PUT `/api/dashboard/config/:key`

Updates a configuration value.

**Response Schema**: `ConfigUpdateResponseSchema`

```typescript
{
  success: boolean;
  error?: string;
}
```

#### POST `/api/dashboard/config/:key/reset`

Resets a configuration value to its default.

**Response Schema**: `ConfigResetResponseSchema`

```typescript
{
  success: boolean;
  value?: string;                // New (default) value
}
```

---

### Door API (`/api/door/*`)

#### GET `/api/door/status`

Returns current door state.

**Response Schema**: `DoorStatusSchema`

```typescript
{
  state: "open" | "closed" | "unknown" | "error";
  lock_state?: "locked" | "unlocked" | "unknown" | "error";
  last_command?: string;
  last_command_time?: string;    // ISO 8601 timestamp
  error?: string;
}
```

#### POST `/api/door/open`

Opens the door for a specified duration.

**Request Schema**: `DoorOpenRequestSchema`

```typescript
{
  duration?: number;             // Milliseconds
  testing_mode?: boolean;
}
```

**Response Schema**: `DoorCommandResponseSchema`

```typescript
{
  success: boolean;
  state?: "open" | "closed" | "unknown" | "error";
  message?: string;
  error?: string;
}
```

#### POST `/api/door/close`

Closes/locks the door.

**Response Schema**: `DoorCommandResponseSchema` (same as above)

#### GET `/api/door/history`

Returns door operation history.

**Query Parameters**:
- `limit` (optional): Number of entries to return (default: 20)

**Response**: Array of `DoorOperationSchema`

```typescript
Array<{
  id?: string;
  timestamp: string;             // ISO 8601 timestamp
  command: string;               // "open", "close", etc.
  result: string;                // "success", "failure", etc.
  duration_ms?: number;
}>
```

---

### Logs API (`/api/dashboard/logs`)

#### GET `/api/dashboard/logs`

Returns recent log entries.

**Query Parameters**:
- `level` (optional): Filter by log level
- `source` (optional): Filter by source
- `limit` (optional): Number of entries to return

**Response Schema**: `LogsResponseSchema`

```typescript
{
  count: number;                 // Non-negative integer
  logs: Array<{
    timestamp: string;           // ISO 8601 timestamp
    level: "debug" | "info" | "warn" | "error";
    message: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }>;
}
```

#### GET `/api/dashboard/diagnostics/export`

Exports a full diagnostics report.

**Response Schema**: `DiagnosticReportSchema`

```typescript
{
  generated_at: string;          // ISO 8601 timestamp
  system?: Record<string, unknown>;
  logs?: Array<LogEntry>;
  config?: Record<string, unknown>;
}
```

---

## Schema Locations

All Zod schemas are defined in:
- `src/infrastructure/api/schemas.ts`

Contract tests are located in:
- `tests/integration/contracts/system.contract.test.ts`
- `tests/integration/contracts/wifi.contract.test.ts`
- `tests/integration/contracts/config.contract.test.ts`
- `tests/integration/contracts/door.contract.test.ts`
- `tests/integration/contracts/logs.contract.test.ts`

## Running Contract Tests

```bash
# Run only contract tests
npm run test -- tests/integration/contracts

# Run with verbose output
npm run test -- tests/integration/contracts --reporter=verbose
```

## Handling Contract Violations

When the frontend detects a contract violation:

1. A warning is logged to the console with details
2. The application continues to function (graceful degradation)
3. The warning helps developers identify API drift early

To investigate violations:
1. Check the console for `[API Contract]` messages
2. Compare the received data against the expected schema
3. Update either the mock data or the schema as appropriate
4. Run contract tests to verify the fix

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-07 | Initial contract documentation |
