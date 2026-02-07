# API Contract: V1 Provisioning API

**Feature**: 001-api-compat-integration
**Date**: 2026-01-11
**Source**: `docs/HANDOFF_028_API_COMPAT_COMPLETE.md`

## Base URL

- **Development**: `http://localhost:8082` (proxied via Vite)
- **Production**: Same origin (served from PiOrchestrator binary)

## Authentication

Protected endpoints require `X-API-Key` header.

---

## Endpoints

### Health Check

```
GET /health
```

**Response**: 200 OK
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

### Allowlist

#### List Allowlist Entries

```
GET /api/v1/provisioning/allowlist
```

**Response**: 200 OK
```json
{
  "success": true,
  "data": {
    "entries": [],
    "count": 0
  },
  "correlation_id": "uuid",
  "timestamp": "2026-01-11T22:33:20Z"
}
```

**028 Fix**: `entries` is always `[]`, never `null`.

#### Add Allowlist Entry

```
POST /api/v1/provisioning/allowlist
Content-Type: application/json

{
  "mac": "AA:BB:CC:DD:EE:FF",
  "description": "Camera 1",
  "container_id": "optional-container-id"
}
```

**Response**: 201 Created
```json
{
  "success": true,
  "data": {
    "entry": {
      "mac": "AA:BB:CC:DD:EE:FF",
      "description": "Camera 1",
      "container_id": "optional-container-id",
      "added_at": "2026-01-11T22:33:20Z",
      "used": false
    }
  },
  "correlation_id": "uuid",
  "timestamp": "2026-01-11T22:33:20Z"
}
```

**Error Response**: 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "retryable": false,
    "details": "Invalid MAC address format..."
  },
  "correlation_id": "uuid",
  "timestamp": "2026-01-11T22:33:20Z"
}
```

#### Remove Allowlist Entry

```
DELETE /api/v1/provisioning/allowlist/:mac
```

**Response**: 204 No Content

---

### Batch Provisioning Sessions

#### Start Session

```
POST /api/v1/provisioning/batch
Content-Type: application/json

{
  "network_interface": "wlan0"
}
```

**Response**: 201 Created
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session-uuid",
      "state": "active",
      "network_interface": "wlan0",
      "created_at": "2026-01-11T22:33:20Z",
      "updated_at": "2026-01-11T22:33:20Z",
      "device_count": 0,
      "provisioned_count": 0,
      "failed_count": 0
    }
  },
  "correlation_id": "uuid",
  "timestamp": "2026-01-11T22:33:20Z"
}
```

#### Get Session

```
GET /api/v1/provisioning/batch/:id
```

**Response**: 200 OK (session data)

#### Get Session Devices

```
GET /api/v1/provisioning/batch/:id/devices
```

**Response**: 200 OK
```json
{
  "success": true,
  "data": {
    "devices": [],
    "count": 0
  },
  "correlation_id": "uuid",
  "timestamp": "2026-01-11T22:33:20Z"
}
```

**028 Fix**: `devices` is always `[]`, never `null`.

#### Provision Device

```
POST /api/v1/provisioning/batch/:id/devices/:mac/provision
```

**Response**: 202 Accepted (provisioning started)

#### Provision All Devices

```
POST /api/v1/provisioning/batch/:id/provision-all
```

**Response**: 202 Accepted

#### Close Session

```
POST /api/v1/provisioning/batch/:id/close
```

**Response**: 200 OK

---

### Session Recovery

#### List Recoverable Sessions

```
GET /api/v1/provisioning/sessions/recoverable
```

**Response**: 200 OK
```json
{
  "success": true,
  "data": {
    "sessions": []
  },
  "correlation_id": "uuid",
  "timestamp": "2026-01-11T22:33:20Z"
}
```

**028 Fix**: `sessions` is always `[]`, never `null`.

#### Resume Session

```
POST /api/v1/provisioning/sessions/:id/resume
```

**Response**: 200 OK (session data)

---

### SSE Event Stream

```
GET /api/v1/provisioning/batch/events
GET /api/v1/provisioning/batch/events?session_id=uuid
```

**Content-Type**: `text/event-stream`

**Event Format**:
```
event:connection.established
data:{"version":"1.0","type":"connection.established","timestamp":"2026-01-11T21:45:29Z","payload":{"message":"Connected to batch provisioning events"}}

event:device.discovered
data:{"version":"1.0","type":"device.discovered","timestamp":"...","session_id":"...","payload":{...}}
```

---

### Network Status

```
GET /api/v1/provisioning/batch/network
```

**Response**: 200 OK
```json
{
  "success": true,
  "data": {
    "interface": "wlan0",
    "ssid": "OnboardingNetwork",
    "connected": true
  },
  "correlation_id": "uuid",
  "timestamp": "2026-01-11T22:33:20Z"
}
```

---

## Error Codes

| Code | HTTP Status | Retryable | Description |
|------|-------------|-----------|-------------|
| VALIDATION_FAILED | 400 | No | Invalid request data |
| SESSION_NOT_FOUND | 404 | No | Session does not exist |
| DEVICE_NOT_FOUND | 404 | No | Device not in session |
| DEVICE_NOT_IN_ALLOWLIST | 403 | No | Device not approved |
| RATE_LIMITED | 429 | Yes | Too many requests |
| CIRCUIT_OPEN | 503 | Yes | Service recovering |
| INTERNAL_ERROR | 500 | Yes | Server error |

---

## Frontend Route Mapping

| Endpoint | routes.ts Constant |
|----------|-------------------|
| `/health` | `SYSTEM_ROUTES.health` |
| `/api/v1/provisioning/allowlist` | `PROVISIONING_ROUTES.allowlistList` |
| `/api/v1/provisioning/allowlist/:mac` | `PROVISIONING_ROUTES.allowlistEntry(mac)` |
| `/api/v1/provisioning/batch` | `PROVISIONING_ROUTES.batchStart` |
| `/api/v1/provisioning/batch/:id` | `PROVISIONING_ROUTES.batchSession(id)` |
| `/api/v1/provisioning/batch/:id/devices` | `PROVISIONING_ROUTES.batchDevices(id)` |
| `/api/v1/provisioning/batch/:id/devices/:mac/provision` | `PROVISIONING_ROUTES.batchProvisionDevice(id, mac)` |
| `/api/v1/provisioning/batch/:id/provision-all` | `PROVISIONING_ROUTES.batchProvisionAll(id)` |
| `/api/v1/provisioning/batch/:id/close` | `PROVISIONING_ROUTES.batchClose(id)` |
| `/api/v1/provisioning/batch/events` | `PROVISIONING_ROUTES.batchEvents` |
| `/api/v1/provisioning/batch/network` | `PROVISIONING_ROUTES.batchNetwork` |
| `/api/v1/provisioning/sessions/recoverable` | `PROVISIONING_ROUTES.sessionsRecoverable` |
| `/api/v1/provisioning/sessions/:id/resume` | `PROVISIONING_ROUTES.sessionResume(id)` |
