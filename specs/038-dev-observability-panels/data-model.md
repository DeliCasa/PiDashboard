# Data Model: DEV Observability Panels

**Feature**: 038-dev-observability-panels
**Date**: 2026-01-25
**Status**: Complete

## Entity Definitions

### ServiceHealth

Represents the health status of a backend service.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service_name` | string | Yes | Service identifier: `bridgeserver`, `piorchestrator`, `minio` |
| `status` | ServiceStatus | Yes | Current health status |
| `last_checked` | string (ISO 8601) | Yes | Timestamp of last health check |
| `response_time_ms` | number | No | Response time in milliseconds |
| `error_message` | string | No | Error details if status is not healthy |
| `checks` | Record<string, CheckResult> | No | Detailed sub-checks (database, storage, etc.) |

**ServiceStatus Enum**:
- `healthy` - Service is fully operational
- `degraded` - Service is operational but with issues
- `unhealthy` - Service is not operational
- `timeout` - Health check timed out
- `unknown` - Unable to determine status

**CheckResult**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | Yes | `healthy` or `error` |
| `message` | string | No | Additional details |

### Session

Represents an active purchase/evidence session.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique session identifier |
| `delivery_id` | string | No | Associated delivery ID |
| `started_at` | string (ISO 8601) | Yes | Session start timestamp |
| `status` | SessionStatus | Yes | Current session state |
| `capture_count` | number | Yes | Number of evidence captures |
| `last_capture_at` | string (ISO 8601) | No | Last capture timestamp |
| `is_stale` | boolean | No | True if last capture >5 minutes ago |

**SessionStatus Enum**:
- `active` - Session in progress
- `completed` - Session finished successfully
- `cancelled` - Session cancelled

### EvidenceCapture

Represents a captured evidence item.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique capture identifier |
| `session_id` | string | Yes | Parent session ID |
| `captured_at` | string (ISO 8601) | Yes | Capture timestamp |
| `camera_id` | string | Yes | Camera that captured (espcam-XXXXXX) |
| `thumbnail_url` | string | Yes | Presigned URL for thumbnail |
| `full_url` | string | Yes | Presigned URL for full image |
| `expires_at` | string (ISO 8601) | Yes | URL expiration timestamp |
| `size_bytes` | number | No | Image file size |
| `content_type` | string | No | MIME type (image/jpeg) |

### DiagnosticsState

Aggregate view model for the diagnostics page.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `services` | ServiceHealth[] | Yes | Health status of all services |
| `sessions` | Session[] | Yes | Active sessions list |
| `last_refresh` | string (ISO 8601) | Yes | Last data refresh timestamp |
| `is_refreshing` | boolean | Yes | Refresh in progress flag |

## Validation Rules

### ServiceHealth

1. `service_name` must be one of: `bridgeserver`, `piorchestrator`, `minio`
2. `status` must be valid ServiceStatus enum value
3. `last_checked` must be valid ISO 8601 timestamp
4. `response_time_ms` must be non-negative if present

### Session

1. `id` must be non-empty string
2. `started_at` must be valid ISO 8601 timestamp
3. `status` must be valid SessionStatus enum value
4. `capture_count` must be non-negative integer
5. `last_capture_at` must be valid ISO 8601 timestamp if present
6. `is_stale` is derived: `true` if `last_capture_at` is >5 minutes ago

### EvidenceCapture

1. `id` must be non-empty string
2. `session_id` must reference valid session
3. `captured_at` must be valid ISO 8601 timestamp
4. `camera_id` must match pattern `espcam-[0-9a-f]{6}`
5. `thumbnail_url` and `full_url` must be valid URLs
6. `expires_at` must be valid ISO 8601 timestamp
7. `size_bytes` must be positive if present

## State Transitions

### ServiceHealth State Machine

```
UNKNOWN → HEALTHY (successful health check)
UNKNOWN → UNHEALTHY (failed health check)
UNKNOWN → TIMEOUT (health check timeout)

HEALTHY → DEGRADED (partial failure in checks)
HEALTHY → UNHEALTHY (complete failure)
HEALTHY → TIMEOUT (health check timeout)

DEGRADED → HEALTHY (all checks pass)
DEGRADED → UNHEALTHY (additional failures)
DEGRADED → TIMEOUT (health check timeout)

UNHEALTHY → HEALTHY (recovery)
UNHEALTHY → DEGRADED (partial recovery)
UNHEALTHY → TIMEOUT (health check timeout)

TIMEOUT → HEALTHY (successful retry)
TIMEOUT → UNHEALTHY (failed retry)
```

### Session State Machine

```
(none) → ACTIVE (session created)

ACTIVE → COMPLETED (session finished)
ACTIVE → CANCELLED (session cancelled)

COMPLETED → (terminal)
CANCELLED → (terminal)
```

## Relationships

```
DiagnosticsState
    ├── ServiceHealth[] (1:N - contains multiple service health records)
    └── Session[] (1:N - contains multiple session records)
           └── EvidenceCapture[] (1:N - each session has multiple captures)
```

## Derived Fields

| Entity | Field | Derivation |
|--------|-------|------------|
| Session | `is_stale` | `now() - last_capture_at > 5 minutes` |
| DiagnosticsState | `overall_health` | `all services healthy ? 'healthy' : any unhealthy ? 'unhealthy' : 'degraded'` |

## API Response Mapping

### BridgeServer Health Response → ServiceHealth

```typescript
// BridgeServer response
{
  "status": "healthy",
  "timestamp": "2026-01-25T15:30:00Z",
  "checks": {
    "database": { "status": "healthy" },
    "storage": { "status": "healthy" }
  }
}

// Maps to ServiceHealth
{
  service_name: "bridgeserver",
  status: "healthy",
  last_checked: "2026-01-25T15:30:00Z",
  checks: {
    database: { status: "healthy" },
    storage: { status: "healthy" }
  }
}
```

### PiOrchestrator System Info → ServiceHealth

```typescript
// PiOrchestrator response (existing)
{
  "cpu_percent": 45.2,
  "memory_percent": 68.1,
  "disk_percent": 35.4,
  "temperature_celsius": 52.3,
  "uptime_seconds": 86400
}

// Maps to ServiceHealth
{
  service_name: "piorchestrator",
  status: "healthy", // derived from successful response
  last_checked: new Date().toISOString(),
  response_time_ms: 150
}
```

### Session List Response → Session[]

```typescript
// BridgeServer response (assumed)
{
  "sessions": [
    {
      "id": "sess-12345",
      "deliveryId": "del-67890",
      "startedAt": "2026-01-25T14:00:00Z",
      "status": "active",
      "captureCount": 5,
      "lastCaptureAt": "2026-01-25T14:45:00Z"
    }
  ]
}

// Maps to Session[]
[
  {
    id: "sess-12345",
    delivery_id: "del-67890",
    started_at: "2026-01-25T14:00:00Z",
    status: "active",
    capture_count: 5,
    last_capture_at: "2026-01-25T14:45:00Z",
    is_stale: false // derived
  }
]
```
