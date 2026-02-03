---
handoff_id: "027-piorchestrator-integration"
direction: "incoming"
from_repo: "PiOrchestrator"
to_repo: "PiDashboard"
created_at: "2026-01-11T00:00:00Z"
status: "acknowledged"
related_prs: []
related_commits: []
requires: []
acceptance: []
verification: []
risks: []
notes: ""
---

# PiOrchestrator to PiDashboard Integration Handoff

**Copy this document into PiDashboard repository**

**Generated:** 2026-01-11  
**Baseline:** v0.1.0 (tag: v0.1.0, SHA: 8814cf2)  
**Current:** 024-multi-device-onboarding-hub (SHA: d0093b0)  
**Commits Since Baseline:** 18

---

## Table of Contents

1. [Change Window Summary](#1-change-window-summary)
2. [Breaking Changes](#2-breaking-changes)
3. [New/Changed Endpoints](#3-newchanged-endpoints)
4. [Response Envelope Specification](#4-response-envelope-specification)
5. [Error Code Registry](#5-error-code-registry)
6. [Authentication](#6-authentication)
7. [Real-Time Updates (WebSocket/SSE)](#7-real-time-updates-websocketsse)
8. [UI Integration Notes](#8-ui-integration-notes)
9. [Data Model Changes](#9-data-model-changes)
10. [Testing Checklist](#10-testing-checklist)
11. [Rollback Plan](#11-rollback-plan)
12. [Open Questions](#12-open-questions)

---

## 1. Change Window Summary

### Baseline Comparison

| Baseline | SHA | Date | Reason |
|----------|-----|------|--------|
| v0.1.0 | `8814cf2` | 2026-01-07 | Last stable release tag |
| 024-multi-device-onboarding-hub | `d0093b0` | 2026-01-11 | Current feature branch |

### Key Commits Since v0.1.0

```
d0093b0 docs: add ESP-CAM first provisioning TOTP skip handoff
14cb7e8 docs(024): Add Pi setup script and troubleshooting guide
0ad528c docs(024): update verification checklist to 84% complete
be1d0f2 feat(024): Add batch provisioning routes to hexagonal binary
7fde116 test(024): Add MQTT integration tests
9a53647 feat(025): Complete Phase 2 reliability improvements
09e1255 feat(025): Complete Phase 1 security and stability fixes
a3751d8 feat(024): Complete Phase 3 observability
57e560a feat(023): Implement Phase 4 API layer for batch provisioning
```

### High-Level Changes

- **New:** Batch provisioning API for multi-device onboarding (`/api/v1/provisioning/batch/*`)
- **New:** Device allowlist management (`/api/v1/provisioning/allowlist/*`)
- **New:** Session recovery endpoints (`/api/v1/provisioning/sessions/*`)
- **New:** Structured error response envelope with correlation IDs
- **New:** API Key authentication middleware for protected routes
- **New:** SSE event streaming for provisioning with versioned envelopes
- **Enhanced:** Correlation ID middleware for request tracing
- **Enhanced:** Circuit breaker pattern for device communication

---

## 2. Breaking Changes

### Summary: **No breaking changes to existing Dashboard functionality**

The changes are **additive**. Existing endpoints continue to work as before.

### Potential Impact Points

| Change | Impact | Action Required |
|--------|--------|-----------------|
| Protected routes now require API key | **HIGH** if accessing batch provisioning | Set `X-API-Key` header |
| New response envelope format | **MEDIUM** | Update API clients for new endpoints |
| SSE events have versioned envelope | **LOW** | Parse `version`, `type`, `payload` fields |
| Correlation IDs in responses | **NONE** | Informational, use for debugging |

### Authentication Now Required For

These endpoints now require `X-API-Key` header:

| Endpoint Group | Reason |
|----------------|--------|
| `/api/v1/provisioning/batch/*` | Security for device provisioning |
| `/api/v1/provisioning/allowlist/*` | Security for device allowlist |
| `/api/v1/provisioning/sessions/*` | Security for session recovery |
| `/api/v1/door/*` | Security for physical access control |
| `PUT /api/v1/config/:key` | Security for config changes |
| `POST /api/system/reset` | Security for system reset |

---

## 3. New/Changed Endpoints

### 3.1 Batch Provisioning Endpoints (NEW)

All endpoints require `X-API-Key` header.

| Method | Path | Purpose | Request | Response |
|--------|------|---------|---------|----------|
| POST | `/api/v1/provisioning/batch/start` | Start batch session | `StartSessionRequest` | `StartSessionData` |
| GET | `/api/v1/provisioning/batch/:id` | Get session status | `?include_devices=true` | `SessionData` |
| POST | `/api/v1/provisioning/batch/:id/stop` | Stop session | - | `StopSessionData` |
| POST | `/api/v1/provisioning/batch/:id/provision-all` | Provision all devices | - | `ProvisionAllData` |
| GET | `/api/v1/provisioning/batch/:id/devices` | List devices | `?state=discovered` | `DevicesData` |
| POST | `/api/v1/provisioning/batch/:id/devices/:mac/provision` | Provision single | - | `DeviceActionData` |
| POST | `/api/v1/provisioning/batch/:id/devices/:mac/retry` | Retry failed | - | `DeviceActionData` |
| GET | `/api/v1/provisioning/batch/events` | SSE stream | `?session_id=xxx` | SSE events |
| GET | `/api/v1/provisioning/batch/network` | Network status | - | `NetworkStatusData` |

#### StartSessionRequest

```typescript
interface StartSessionRequest {
  target_ssid: string;      // Required - WiFi network to provision to
  target_password: string;  // Required - WiFi password
  config?: SessionConfig;   // Optional - custom timeouts
}

interface SessionConfig {
  discovery_timeout_seconds?: number;  // Default: 60
  provisioning_timeout_seconds?: number; // Default: 120
  verification_timeout_seconds?: number; // Default: 90
}
```

#### Response Examples

**Start Session (201 Created):**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "sess_abc123",
      "state": "discovering",
      "created_at": "2026-01-11T12:00:00Z",
      "target_ssid": "MyNetwork",
      "device_count": 0,
      "provisioned_count": 0,
      "verified_count": 0,
      "failed_count": 0
    },
    "message": "Batch provisioning session started successfully"
  },
  "correlation_id": "uuid-here",
  "timestamp": "2026-01-11T12:00:00Z"
}
```

**Session Status (with devices):**
```json
{
  "success": true,
  "data": {
    "session": { /* session object */ },
    "devices": [
      {
        "mac": "AA:BB:CC:DD:EE:FF",
        "ip": "192.168.4.100",
        "state": "discovered",
        "rssi": -45,
        "firmware_version": "1.2.3",
        "discovered_at": "2026-01-11T12:00:05Z"
      }
    ],
    "timeout_remaining": "45s",
    "network_status": {
      "ssid": "DelicasaOnboard",
      "is_active": true,
      "connected_devices": 5
    }
  },
  "correlation_id": "uuid-here",
  "timestamp": "2026-01-11T12:00:10Z"
}
```

### 3.2 Allowlist Endpoints (NEW)

| Method | Path | Purpose | Request | Response |
|--------|------|---------|---------|----------|
| GET | `/api/v1/provisioning/allowlist` | List allowlist | `?available=true` | `AllowlistData` |
| POST | `/api/v1/provisioning/allowlist` | Add device | `AllowlistEntryRequest` | `AllowlistEntryData` |
| DELETE | `/api/v1/provisioning/allowlist/:mac` | Remove device | - | 204 No Content |

#### AllowlistEntryRequest

```typescript
interface AllowlistEntryRequest {
  mac: string;          // Required - format: AA:BB:CC:DD:EE:FF
  description?: string; // Optional - human label
  container_id?: string; // Optional - assigned container
}
```

### 3.3 Session Recovery Endpoints (NEW)

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | `/api/v1/provisioning/sessions/recoverable` | List recoverable | `RecoverableSessionsData` |
| POST | `/api/v1/provisioning/sessions/:id/resume` | Resume session | `ResumeSessionData` |

### 3.4 Existing Endpoints (Unchanged)

These continue to work exactly as before:

- `/api/v1/system/*` - System info, health, logs
- `/api/v1/wifi/*` - WiFi scanning, connection
- `/api/v1/cameras/*` - Camera management
- `/api/v1/espcam/*` - ESP-CAM discovery and pairing
- `/api/v1/config` (GET) - Read config (unprotected)
- `/api/v1/network/*` - Network diagnostics

---

## 4. Response Envelope Specification

### V1 Response Envelope (Preferred)

All V1 endpoints (`/api/v1/*`) use this envelope:

```typescript
// Success Response
interface SuccessResponse<T> {
  success: true;
  data: T;
  correlation_id: string;  // UUID for request tracing
  timestamp: string;       // RFC3339 format
}

// Error Response
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable (see Error Code Registry)
    message: string;        // Human-readable
    retryable: boolean;     // Should client retry?
    retry_after_seconds?: number; // If retryable, wait this long
    details?: string;       // Additional context
  };
  correlation_id: string;
  timestamp: string;
}
```

### Source Files

- `internal/api/response/envelope.go:10-17` - Simple envelope
- `internal/api/response/errors.go:20-38` - Extended envelope with correlation IDs
- `internal/domain/entities/error_codes.go:1-133` - Error code registry

### Retry Constants

| Constant | Value | Usage |
|----------|-------|-------|
| `DefaultRetryAfterSeconds` | 5 | Default retry delay |
| `RateLimitRetryAfterSeconds` | 30 | Rate limit retry delay (429) |

---

## 5. Error Code Registry

### Error Codes and HTTP Status Mapping

Use these codes for error handling in the dashboard.

#### Session Errors (4xx)

| Code | HTTP | Message | Retryable |
|------|------|---------|-----------|
| `SESSION_NOT_FOUND` | 404 | Session not found | false |
| `SESSION_EXPIRED` | 410 | Session has expired | false |
| `SESSION_ALREADY_ACTIVE` | 409 | Another session is already active | false |
| `SESSION_ALREADY_CLOSED` | 409 | Session is already closed | false |
| `SESSION_NOT_RECOVERABLE` | 409 | Session cannot be recovered | false |

#### Device Errors (4xx)

| Code | HTTP | Message | Retryable |
|------|------|---------|-----------|
| `DEVICE_NOT_FOUND` | 404 | Device not found in session | false |
| `DEVICE_NOT_IN_ALLOWLIST` | 403 | Device not in allowlist | false |
| `DEVICE_ALREADY_PROVISIONING` | 409 | Device is currently being provisioned | false |
| `DEVICE_INVALID_STATE` | 409 | Device is in an invalid state | false |
| `MAX_RETRIES_EXCEEDED` | 409 | Maximum retry attempts exceeded | false |

#### Authentication Errors (4xx)

| Code | HTTP | Message | Retryable |
|------|------|---------|-----------|
| `TOTP_INVALID` | 401 | Authentication token is invalid | true |
| `TOTP_EXPIRED` | 401 | Authentication token has expired | true |
| `RATE_LIMITED` | 429 | Too many attempts. Please wait. | true |
| `UNAUTHORIZED` | 401 | Unauthorized access | false |

#### Device Communication Errors (5xx)

| Code | HTTP | Message | Retryable |
|------|------|---------|-----------|
| `DEVICE_UNREACHABLE` | 502 | Cannot connect to device | true |
| `DEVICE_REJECTED` | 502 | Device rejected credentials | true |
| `DEVICE_TIMEOUT` | 504 | Device did not respond in time | true |
| `CIRCUIT_OPEN` | 503 | Device temporarily unavailable | true |
| `VERIFICATION_TIMEOUT` | 504 | Device verification timed out | true |

#### Infrastructure Errors (5xx)

| Code | HTTP | Message | Retryable |
|------|------|---------|-----------|
| `NETWORK_ERROR` | 503 | Onboarding network error | true |
| `MQTT_UNAVAILABLE` | 503 | MQTT broker not connected | true |
| `DATABASE_ERROR` | 500 | Database error occurred | false |
| `INTERNAL_ERROR` | 500 | An internal error occurred | false |

#### Validation Errors (4xx)

| Code | HTTP | Message | Retryable |
|------|------|---------|-----------|
| `VALIDATION_FAILED` | 400 | Validation failed | false |
| `INVALID_REQUEST` | 400 | Invalid request format | false |
| `MISSING_PARAMETER` | 400 | Required parameter is missing | false |

### Source File

- `internal/domain/entities/error_codes.go:60-98`

---

## 6. Authentication

### Method: API Key Header

```http
X-API-Key: your-api-key-here
```

### Alternative: Query Parameter

```
?api_key=your-api-key-here
```

### Configuration

Environment variables on Pi:

| Variable | Purpose | Default |
|----------|---------|---------|
| `API_AUTH_ENABLED` | Enable/disable auth | `true` |
| `API_KEY` | The API key value | (none) |
| `PIORCHESTRATOR_DEV_MODE` | Bypass auth in dev | `false` |

### Unauthorized Response (401)

```json
{
  "success": false,
  "error": "API key required",
  "code": "UNAUTHORIZED",
  "retryable": false,
  "correlation_id": "uuid",
  "timestamp": "2026-01-11T12:00:00Z"
}
```

### Source Files

- `internal/api/middleware/auth.go:50-112` - Auth middleware
- `internal/config/config.go` - Config parsing

---

## 7. Real-Time Updates (WebSocket/SSE)

### 7.1 WebSocket: `/ws/monitor`

For general system monitoring (unchanged from v0.1.0).

**Connection:**
```javascript
const ws = new WebSocket('ws://pi-host:8080/ws/monitor');
```

**Message Types:**

| Type | Direction | Data |
|------|-----------|------|
| `initial_data` | Server -> Client | Full `MonitoringData` |
| `monitoring_update` | Server -> Client | Partial `MonitoringData` |
| `ping` | Client -> Server | Keepalive |
| `pong` | Server -> Client | Keepalive response |

**MonitoringData Structure:**
```typescript
interface MonitoringData {
  timestamp: string;
  system_health: {
    cpu_usage: number;      // 0-100%
    memory_usage: number;   // 0-100%
    disk_usage: number;     // 0-100%
    temperature: number;    // Celsius
    uptime: string;
    load_average: string;
  };
  security_metrics: {
    failed_ssh_attempts: number;
    last_security_check: string;
    certificate_expiry: string;
    mqtt_secure_connections: number;
    encryption_level: string;
    threat_level: "LOW" | "MEDIUM" | "HIGH";
  };
  service_status: {
    mqtt_connected: boolean;
    mqtt_secure: boolean;
    api_responding: boolean;
    database_connected: boolean;
    last_health_check: string;
    service_uptime: string;
  };
  network_metrics: {
    active_connections: number;
    bytes_received: number;
    bytes_sent: number;
    packet_loss: number;
    latency: number;
  };
  camera_status: Record<string, CameraStatus>;
  alerts_count: number;
  connected_clients: number;
}
```

**Update Interval:** 5 seconds

**Source:** `internal/websocket/hub.go:63-123`

### 7.2 SSE: `/api/v1/provisioning/batch/events` (NEW)

For batch provisioning real-time updates.

**Connection:**
```javascript
const evtSource = new EventSource('/api/v1/provisioning/batch/events?session_id=sess_abc123');
```

**Headers Set by Server:**
```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Event Envelope (v1.0):**
```typescript
interface SSEEventEnvelope<T> {
  version: "1.0";
  type: string;
  timestamp: string;  // RFC3339
  session_id?: string;
  payload: T;
}
```

**Event Types (v1.0):**

| Event Type | Description | Payload |
|------------|-------------|---------|
| `session.started` | New session created | `{ session: BatchProvisioningSession }` |
| `session.state_changed` | Session state updated | `{ session: BatchProvisioningSession }` |
| `session.closed` | Session ended | `{ session: BatchProvisioningSession }` |
| `session.timeout_warning` | Session approaching timeout | `{ session: BatchProvisioningSession }` |
| `device.discovered` | New device found | `{ device: ProvisioningCandidate }` |
| `device.state_changed` | Device state updated | `{ device: ProvisioningCandidate }` |
| `device.provisioning_started` | Credential delivery began | `{ device: ProvisioningCandidate }` |
| `device.provisioning_completed` | Credentials accepted | `{ device: ProvisioningCandidate }` |
| `device.provisioning_failed` | Provisioning failed | `{ device: ProvisioningCandidate }` |
| `device.verified` | MQTT confirmation received | `{ device: ProvisioningCandidate }` |
| `network.started` | Onboarding network up | `{ status: OnboardingNetworkStatus }` |
| `network.stopped` | Onboarding network down | `{ status: OnboardingNetworkStatus }` |
| `error.occurred` | Error event | `{ code: string, message: string }` |

**Device State Transitions:**
```
discovered → provisioning_started → provisioning_completed → verified
                ↓                        ↓
           provisioning_failed      provisioning_failed
```

**ProvisioningCandidate Payload:**
```typescript
interface ProvisioningCandidate {
  mac: string;
  ip: string;
  state: CandidateState;
  rssi: number;
  firmware_version: string;
  discovered_at: string;
  provisioned_at?: string;
  verified_at?: string;
  error_message?: string;
  retry_count: number;
  session_id: string;
}
```

**Device States:**
```
discovered -> provisioning -> provisioned -> verifying -> verified
                                          -> failed
                           -> failed
```

**Source:** `internal/api/handlers/batch_provisioning.go:368-440`

### 7.3 SSE: `/api/v1/system/logs/stream`

For log streaming (from Spec 021).

**Event Format:**
```
id: 12345
event: log
data: {"timestamp":"...","level":"info","component":"mqtt","message":"Connected"}

id: 12346
event: keepalive
data: {}
```

**Reconnection:** Use `Last-Event-ID` header to resume from last event.

---

## 8. UI Integration Notes

### 8.1 API Client Configuration

```typescript
// Recommended API client setup
const apiClient = {
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.REACT_APP_API_KEY  // For protected routes
  },
  retry: {
    maxAttempts: 3,
    backoff: [1000, 2000, 4000],  // ms
    retryOn: (error) => error.response?.data?.error?.retryable === true
  }
};
```

### 8.2 Polling Intervals

| Endpoint | Recommended Interval | Notes |
|----------|---------------------|-------|
| `/api/v1/system/info` | 5s | System metrics |
| `/api/v1/health` | 30s | Health check |
| `/api/v1/wifi/status` | 10s | WiFi status |
| `/api/v1/provisioning/batch/:id` | SSE preferred | Use SSE instead |
| `/api/v1/config` | 60s | Config rarely changes |

### 8.3 Error Handling Pattern

```typescript
async function callApi(endpoint: string) {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    
    if (!data.success) {
      // Handle structured error
      const { error } = data;
      
      if (error.retryable && error.retry_after_seconds) {
        // Wait and retry
        await delay(error.retry_after_seconds * 1000);
        return callApi(endpoint);
      }
      
      // Map error code to user message
      throw new ApiError(error.code, error.message, data.correlation_id);
    }
    
    return data.data;
  } catch (e) {
    // Log correlation_id for debugging
    console.error('API Error', e.correlationId);
    throw e;
  }
}
```

### 8.4 SSE Connection with Reconnection

```typescript
function connectToProvisioningEvents(sessionId: string) {
  const url = `/api/v1/provisioning/batch/events?session_id=${sessionId}`;
  const evtSource = new EventSource(url);

  evtSource.onmessage = (event) => {
    const envelope = JSON.parse(event.data);

    // Handle versioned envelope
    if (envelope.version !== "1.0") {
      console.warn('Unknown SSE version:', envelope.version);
      return;
    }

    switch (envelope.type) {
      // Session events
      case 'session.started':
      case 'session.state_changed':
      case 'session.closed':
        updateSessionStatus(envelope.payload.session);
        break;
      case 'session.timeout_warning':
        showTimeoutWarning(envelope.payload.session);
        break;

      // Device events
      case 'device.discovered':
        addNewDevice(envelope.payload.device);
        break;
      case 'device.state_changed':
      case 'device.provisioning_started':
      case 'device.provisioning_completed':
      case 'device.provisioning_failed':
      case 'device.verified':
        updateDeviceState(envelope.payload.device);
        break;

      // Network events
      case 'network.started':
      case 'network.stopped':
        updateNetworkStatus(envelope.payload.status);
        break;

      // Error events
      case 'error.occurred':
        handleError(envelope.payload);
        break;

      default:
        console.warn('Unknown event type:', envelope.type);
    }
  };

  evtSource.onerror = () => {
    // EventSource auto-reconnects
    console.log('SSE connection error, reconnecting...');
  };

  return evtSource;
}
```

### 8.5 Caching Guidance

| Endpoint Type | Cache Strategy |
|---------------|----------------|
| System info | No cache (real-time) |
| Config (read) | Cache 60s |
| Allowlist | Cache 30s, invalidate on mutation |
| WiFi scan | No cache |
| Static assets | Immutable (hashed filenames) |

---

## 9. Data Model Changes

### 9.1 New Entities

#### BatchProvisioningSession

```typescript
interface BatchProvisioningSession {
  id: string;
  state: "discovering" | "active" | "paused" | "closing" | "closed";
  target_ssid: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  device_count: number;
  provisioned_count: number;
  verified_count: number;
  failed_count: number;
  config?: SessionConfig;
}
```

#### ProvisioningCandidate

```typescript
interface ProvisioningCandidate {
  mac: string;                    // Primary key
  ip: string;
  state: CandidateState;
  rssi: number;
  firmware_version: string;
  discovered_at: string;
  provisioned_at?: string;
  verified_at?: string;
  error_message?: string;
  retry_count: number;
  container_id?: string;
  in_allowlist: boolean;
}

type CandidateState = 
  | "discovered"
  | "provisioning"
  | "provisioned"
  | "verifying"
  | "verified"
  | "failed";
```

#### DeviceAllowlistEntry

```typescript
interface DeviceAllowlistEntry {
  mac: string;
  description?: string;
  container_id?: string;
  added_at: string;
  used: boolean;
  used_at?: string;
}
```

### 9.2 Unchanged Entities

These remain the same as v0.1.0:

- Camera, CameraDevice
- WiFiNetwork, WiFiStatus
- ConfigSection, ConfigItem
- SystemInfo, HealthStatus
- Door, DoorStatus

---

## 10. Testing Checklist

### 10.1 Smoke Tests (Manual)

| Test | Steps | Expected |
|------|-------|----------|
| Dashboard loads | Navigate to `http://pi:8080/` | Dashboard renders without errors |
| System info | View System section | CPU, memory, temp display |
| WiFi scan | Click "Scan Networks" | Networks list populates |
| Config display | View Config section | Sections display correctly |
| Logs display | View Logs section | Logs appear within 5s |
| WebSocket | Open dashboard | Real-time updates every 5s |

### 10.2 Protected Endpoints (Auth Required)

| Test | Steps | Expected |
|------|-------|----------|
| No API key | Call `/api/v1/provisioning/batch/start` | 401 Unauthorized |
| Invalid API key | Set `X-API-Key: invalid` | 401 Unauthorized |
| Valid API key | Set correct `X-API-Key` | 201 Created |
| Door control | Call `POST /api/v1/door/open` | 401 without key, 200 with key |

### 10.3 Batch Provisioning Flow

```
1. Start session:       POST /api/v1/provisioning/batch/start
2. Connect SSE:         GET /api/v1/provisioning/batch/events?session_id=xxx
3. Wait for discovery:  Watch device.state_changed events
4. Provision all:       POST /api/v1/provisioning/batch/:id/provision-all
5. Monitor progress:    Watch SSE for state transitions
6. Verify completion:   GET /api/v1/provisioning/batch/:id
7. Stop session:        POST /api/v1/provisioning/batch/:id/stop
```

### 10.4 Error Handling Tests

| Scenario | Endpoint | Expected Error Code |
|----------|----------|---------------------|
| Session not found | GET `/api/v1/provisioning/batch/invalid` | `SESSION_NOT_FOUND` |
| Double start | POST start twice | `SESSION_ALREADY_ACTIVE` |
| Invalid MAC | POST allowlist with bad MAC | `VALIDATION_FAILED` |
| No API key | POST to protected | `UNAUTHORIZED` |

### 10.5 Golden Flows

#### Flow 1: Device Discovery to Online

```
1. ESP-CAM powers on in factory state
2. Connects to DelicasaOnboard SSID
3. Discovered via mDNS (appears in discovered list)
4. Operator clicks "Provision All"
5. Device receives WiFi credentials
6. Device connects to target WiFi
7. Device publishes MQTT status
8. Pi marks device as "verified"
9. Device appears in camera list
```

#### Flow 2: Session Recovery

```
1. Start batch session
2. Discover 3 devices
3. Provision 2 devices
4. Pi restarts (simulated)
5. GET /api/v1/provisioning/sessions/recoverable
6. POST /api/v1/provisioning/sessions/:id/resume
7. Session resumes with 2 devices already provisioned
```

---

## 11. Rollback Plan

### If Integration Fails

1. **Revert PiDashboard to previous version**
   ```bash
   git checkout <previous-sha>
   npm install && npm run build
   ```

2. **Keep using PiOrchestrator v0.1.0**
   - All existing endpoints still work
   - New features disabled

3. **Detection of Regressions**
   - Dashboard shows 5xx errors
   - API responses missing `success` field
   - SSE events fail to parse

### Rollback Checklist

- [ ] Verify `/api/v1/system/info` returns expected format
- [ ] Verify `/api/v1/wifi/scan` works
- [ ] Verify `/api/v1/cameras` works
- [ ] Verify WebSocket connects and updates
- [ ] Verify all dashboard sections render

---

## 12. Open Questions

### Q1: Should SSE replace polling entirely?

**Current Decision:** Both are supported.
- SSE for provisioning events (`/api/v1/provisioning/batch/events`)
- SSE for logs (`/api/v1/system/logs/stream`)
- Polling for other endpoints as fallback

**Dashboard Default:** Use SSE where available, fall back to polling.

### Q2: What API key value should dashboard use?

**Current Decision:** Set via environment variable.
- Pi: `API_KEY` environment variable
- Dashboard: `REACT_APP_API_KEY` or fetch from config endpoint

**Suggestion:** Create a read-only endpoint to check if auth is required:
```
GET /api/v1/auth/status -> { required: boolean }
```

### Q3: How to handle correlation_id in logs?

**Current Decision:** Include in all API client logs.
- Store `correlation_id` from response
- Include in error reports
- Display in debug UI if available

---

## Quick Reference Card

### Headers for Protected Routes

```http
X-API-Key: your-key-here
Content-Type: application/json
```

### Response Format Check

```typescript
// All responses have this shape
interface Response<T> {
  success: boolean;
  data?: T;
  error?: ErrorDetail;
  correlation_id: string;
  timestamp: string;
}
```

### Key Endpoints

| Purpose | Endpoint | Auth |
|---------|----------|------|
| System info | GET `/api/v1/system/info` | No |
| WiFi scan | GET `/api/v1/wifi/scan` | No |
| Start provisioning | POST `/api/v1/provisioning/batch/start` | Yes |
| Get session | GET `/api/v1/provisioning/batch/:id` | Yes |
| SSE events | GET `/api/v1/provisioning/batch/events` | Yes |
| Door control | POST `/api/v1/door/open` | Yes |

### State Machine: Device Provisioning

```
              +-> provisioning -> provisioned -> verifying -> verified
              |                            |             |
discovered --+                            +-> failed    +-> failed
              |
              +-> failed (skipped/blocked)
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-11  
**Author:** PiOrchestrator Team  
**Review Status:** Ready for PiDashboard team review
