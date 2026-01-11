# API Contract Handoff: PiOrchestrator v1 API

**Feature**: 021-dashboard-device-integration
**Date**: 2026-01-08
**Source**: PiOrchestrator `specs/021-dashboard-device-integration/`

---

## Overview

PiOrchestrator has implemented a new versioned API (`/api/v1/`) with standardized response envelopes. This document details the changes required in PiDashboard to integrate with the updated API.

## Breaking Changes

### 1. API Versioning
All endpoints now use the `/api/v1/` prefix. Legacy endpoints are deprecated with `Sunset` headers.

| Legacy Endpoint | New Endpoint |
|-----------------|--------------|
| `/api/dashboard/health` | `/api/v1/health` |
| `/api/dashboard/logs` | `/api/v1/system/logs` |
| `/api/dashboard/logs/stream` | `/api/v1/system/logs/stream` |
| `/api/dashboard/tailscale/status` | `/api/v1/network/tailscale` |
| `/api/dashboard/config` | `/api/v1/config` |
| `/api/wifi/scan` | `/api/v1/wifi/scan` |
| `/api/wifi/status` | `/api/v1/wifi/status` |
| `/api/wifi/connect` | `/api/v1/wifi/connect` |

### 2. Response Envelope Format
All responses now use a standard envelope:

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: string;  // ISO8601
  request_id?: string;
}

interface APIError {
  code: string;  // BAD_REQUEST, NOT_FOUND, CONFLICT, etc.
  message: string;
  details?: string;
}
```

### 3. WiFi Security Field
WiFi networks now return `security` as a string enum instead of a boolean:

```typescript
// OLD
interface WiFiNetwork {
  ssid: string;
  signal: number;
  secured: boolean;  // DEPRECATED
}

// NEW
interface WiFiNetwork {
  ssid: string;
  signal: number;
  security: "Open" | "WEP" | "WPA" | "WPA2" | "WPA3";
}
```

### 4. Tailscale Status
Tailscale status now includes a computed `connected` boolean:

```typescript
interface TailscaleStatus {
  backend_state: "Running" | "Starting" | "Stopped" | "NeedsLogin";
  tailscale_ip: string;
  hostname: string;
  connected: boolean;  // NEW: derived from backend_state === "Running"
  tailnet?: string;
  peers?: Peer[];
}
```

### 5. Configuration Response
Configuration uses nested sections format:

```typescript
interface ConfigResponse {
  sections: ConfigSection[];
}

interface ConfigSection {
  name: string;
  description?: string;
  items: ConfigItem[];
}

interface ConfigItem {
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "select" | "secret";
  editable: boolean;
  validation?: ConfigValidation;
}
```

---

## New Endpoints

### System
- `GET /api/v1/system/info` - System metrics (CPU, memory, disk, temperature)
- `GET /api/v1/health` - Health status
- `GET /api/v1/system/logs` - Paginated logs with filtering
- `GET /api/v1/system/logs/stream` - SSE log stream with heartbeat

### WiFi
- `GET /api/v1/wifi/scan` - Network scan (rate limited: 1/10s)
- `GET /api/v1/wifi/status` - Connection status
- `POST /api/v1/wifi/connect` - Connect to network
- `POST /api/v1/wifi/disconnect` - Disconnect

### Network Diagnostics
- `GET /api/v1/network/tailscale` - VPN status with `connected` field
- `POST /api/v1/network/ping` - ICMP ping (requires `type: "icmp"`)
- `GET /api/v1/network/mqtt` - MQTT broker status
- `GET /api/v1/network/bridge` - BridgeServer status

### Configuration
- `GET /api/v1/config` - All configuration sections
- `GET /api/v1/config/:key` - Specific config item
- `PUT /api/v1/config/:key` - Update config value
- `POST /api/v1/config/:key/reset` - Reset to default

### ESP-CAM Discovery
- `POST /api/v1/espcam/scan` - Start mDNS discovery
- `GET /api/v1/espcam/discovered` - List discovered devices
- `POST /api/v1/espcam/pair` - Pair device with TOTP
- `GET /api/v1/espcam/paired` - List paired cameras

### Cameras
- `GET /api/v1/cameras` - List cameras with health
- `GET /api/v1/cameras/diagnostics` - Detailed diagnostics
- `POST /api/v1/cameras/:id/capture` - Test capture
- `POST /api/v1/cameras/:id/reboot` - Remote reboot

### Door (Optional)
- `GET /api/v1/door/status` - Door state
- `POST /api/v1/door/open` - Open door
- `POST /api/v1/door/close` - Close door
- `GET /api/v1/door/available` - Check hardware availability (returns 503 if unavailable)

---

## SSE Log Streaming

### Connection
```typescript
const eventSource = new EventSource('/api/v1/system/logs/stream');

eventSource.addEventListener('log', (event) => {
  const logEntry = JSON.parse(event.data);
  // Handle log entry
});

eventSource.addEventListener('keepalive', () => {
  // Heartbeat received (every 15s)
});
```

### Reconnection Support
Use `Last-Event-ID` header to resume from last received event:

```typescript
const lastEventId = localStorage.getItem('lastLogEventId');
const eventSource = new EventSource('/api/v1/system/logs/stream', {
  headers: { 'Last-Event-ID': lastEventId }
});
```

### Event Format
```
id: 12345
event: log
data: {"id":"abc123","timestamp":"2026-01-08T12:00:00Z","level":"info","component":"mqtt","message":"Connected"}
```

---

## Error Handling

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., already paired) |
| `RATE_LIMITED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 422 | Validation failed |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service not available |
| `TIMEOUT` | 504 | Operation timed out |

### Example Error Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "WiFi scan rate limit exceeded. Try again in 10 seconds.",
    "details": "retry_after: 10"
  },
  "timestamp": "2026-01-08T12:00:00Z",
  "request_id": "abc123"
}
```

---

## Migration Checklist

- [ ] Update API client to use `/api/v1/` prefix
- [ ] Update response parsing for envelope format
- [ ] Handle `success: false` responses with error codes
- [ ] Update WiFi network display for string `security` field
- [ ] Update Tailscale status to use `connected` boolean
- [ ] Update configuration display for nested sections
- [ ] Implement SSE reconnection with `Last-Event-ID`
- [ ] Handle 503 responses for optional endpoints (Door, MQTT, Bridge)
- [ ] Update rate limit handling for WiFi scan (429 with Retry-After)
- [ ] Test all endpoints with new response format

---

## TypeScript Types

The complete TypeScript types are available in the OpenAPI specification:
- **Local**: `http://localhost:8082/api/v1/openapi.json`
- **Contract file**: `PiOrchestrator/specs/021-dashboard-device-integration/contracts/dashboard-api.yaml`

You can generate TypeScript types using:
```bash
npx openapi-typescript http://localhost:8082/api/v1/openapi.json -o src/types/api.ts
```

---

## Contact

For questions about the API contract, refer to:
- `PiOrchestrator/specs/021-dashboard-device-integration/spec.md`
- `PiOrchestrator/specs/021-dashboard-device-integration/data-model.md`
- `PiOrchestrator/specs/021-dashboard-device-integration/research.md`
