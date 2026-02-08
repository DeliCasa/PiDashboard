# PiDashboard Integration Requirements

**Updated**: 2026-02-04
**Source**: Agent swarm investigation of `src/infrastructure/api/`

## Purpose

Document UI-to-backend contract expectations for PiDashboard, focused on evidence capture, camera status, and container workflows.

---

## Blocker Statement

> **UI is blocked by backend availability of container and diagnostics endpoints (`/api/v1/containers/*`, `/api/dashboard/diagnostics/*`, `/api/v1/cameras/:id/evidence`); without these, container management and evidence capture are non-functional, while other areas degrade gracefully.**

---

## Base URL + Access

- UI calls same-origin `/api` routes
- Dev proxy routes `/api` to `http://192.168.1.124:8082` (PiOrchestrator)
- V1 client uses `/api/v1` and may require `X-API-Key` header
- Auth bypass available in dev via `VITE_BYPASS_AUTH=true`

---

## PiOrchestrator Requirements

### V1 Cameras API (`/api/v1/cameras/*`)

| Endpoint | Method | Required | Response Shape | Notes |
|----------|--------|----------|----------------|-------|
| `/api/v1/cameras` | GET | Yes | `{ success: true, data: { cameras: Camera[], count: number } }` | List all cameras. Normalizes `device_id` → `id` |
| `/api/v1/cameras/{id}` | GET | Yes | `{ success: true, data: Camera }` | Get single camera by MAC or UUID |
| `/api/v1/cameras/diagnostics` | GET | Yes | `CameraDiagnostics[]` | Extended diagnostics. Falls back to legacy |
| `/api/v1/cameras/{id}/capture` | POST | Yes | Binary JPEG or `{ success: true, data: { image_data: base64 } }` | 30s timeout |
| `/api/v1/cameras/{id}/reboot` | POST | Yes | `{ success: true, message: string }` | Camera goes offline temporarily |
| `/api/v1/espcam/paired` | GET | Yes | `{ success: true, data: { total: number, online: number } }` | Paired device counts |

**Legacy Fallback** (when V1 returns HTML or 404/503):
- `GET /api/dashboard/cameras`
- `GET /api/dashboard/cameras/diagnostics`
- `POST /api/dashboard/cameras/{id}/capture`
- `POST /api/dashboard/cameras/{id}/reboot`

### V1 Containers API (`/api/v1/containers/*`)

| Endpoint | Method | Required | Response Shape | Notes |
|----------|--------|----------|----------------|-------|
| `/api/v1/containers` | GET | Yes | `{ success: true, data: { containers: ContainerDetail[] } }` | List with camera assignments |
| `/api/v1/containers` | POST | Yes | `{ success: true, data: Container }` | Body: `{ label?, description? }` |
| `/api/v1/containers/{id}` | GET | Yes | `{ success: true, data: ContainerDetail }` | Single container detail |
| `/api/v1/containers/{id}` | PATCH | Yes | `{ success: true, data: Container }` | Update label/description |
| `/api/v1/containers/{id}` | DELETE | Yes | `{ success: true }` | Must be empty (no cameras) |
| `/api/v1/containers/{id}/cameras` | POST | Yes | `{ success: true, data: CameraAssignment }` | Body: `{ device_id, position }` |
| `/api/v1/containers/{id}/cameras/{device_id}` | DELETE | Yes | `{ success: true }` | Unassign camera |

### V1 Auto-Onboard API (`/api/v1/onboarding/auto/*`)

| Endpoint | Method | Required | Response Shape |
|----------|--------|----------|----------------|
| `/api/v1/onboarding/auto/status` | GET | Yes | Auto-onboard config and metrics |
| `/api/v1/onboarding/auto/enable` | POST | Yes | Enable auto-onboard (requires DEV mode) |
| `/api/v1/onboarding/auto/disable` | POST | Yes | Kill switch |
| `/api/v1/onboarding/auto/events` | GET | Yes | Paginated audit events |
| `/api/v1/onboarding/auto/metrics/reset` | POST | Yes | Reset counters |

### V1 Provisioning API (`/api/v1/provisioning/*`)

| Endpoint | Method | Required | Notes |
|----------|--------|----------|-------|
| `/api/v1/provisioning/batch/start` | POST | Yes | Start batch session |
| `/api/v1/provisioning/batch/{sessionId}` | GET | Yes | Session details |
| `/api/v1/provisioning/batch/{sessionId}/stop` | POST | Yes | Stop session |
| `/api/v1/provisioning/batch/{sessionId}/pause` | POST | Yes | Pause scanning |
| `/api/v1/provisioning/batch/{sessionId}/resume` | POST | Yes | Resume scanning |
| `/api/v1/provisioning/batch/{sessionId}/devices` | GET | Yes | Devices in session |
| `/api/v1/provisioning/batch/{sessionId}/devices/{mac}/provision` | POST | Yes | Provision device |
| `/api/v1/provisioning/batch/{sessionId}/provision-all` | POST | Yes | Provision all eligible |
| `/api/v1/provisioning/allowlist` | GET/POST | Yes | Allowlist CRUD |
| `/api/v1/provisioning/allowlist/{mac}` | GET/PATCH/DELETE | Yes | Entry operations |
| `/api/v1/provisioning/sessions/recoverable` | GET | Yes | Resumable sessions (auth) |
| `/api/v1/provisioning/batch/events` | GET (SSE) | Yes | Real-time events stream |

### Core Platform Endpoints

| Endpoint | Method | Required | Response Shape |
|----------|--------|----------|----------------|
| `/api/system/info` | GET | Yes | `{ cpu, memory, disk, temperature_celsius, uptime }` |
| `/api/health` | GET | Yes | `{ status: "ok" }` |
| `/api/v1/system/logs/stream` | GET (SSE) | Yes | Real-time log stream |

### Dashboard API (`/api/dashboard/*`)

| Endpoint | Method | Required | Notes |
|----------|--------|----------|-------|
| `/api/dashboard/config` | GET | Yes | Configuration sections |
| `/api/dashboard/config/{key}` | PUT | Yes | Update config value |
| `/api/dashboard/config/{key}/reset` | POST | Yes | Reset to default |
| `/api/dashboard/door/status` | GET | Yes | Door state |
| `/api/dashboard/door/open` | POST | Yes | Open door |
| `/api/dashboard/door/close` | POST | Yes | Close/lock door |
| `/api/dashboard/door/history` | GET | Yes | Operation history |
| `/api/dashboard/tailscale/status` | GET | Yes | VPN status |
| `/api/dashboard/bridge/status` | GET | Yes | BridgeServer connection |
| `/api/dashboard/mqtt/status` | GET | No | Returns default on 404/503 |
| `/api/dashboard/logs` | GET | No | Legacy polling (deprecated) |

### WiFi API (`/api/wifi/*`)

| Endpoint | Method | Required | Graceful Degradation |
|----------|--------|----------|---------------------|
| `/api/wifi/scan` | GET | No | Returns `{ networks: [] }` on 404/503 |
| `/api/wifi/connect` | POST | No | - |
| `/api/wifi/disconnect` | POST | No | - |
| `/api/wifi/status` | GET | No | Returns default on 404/503 |

### Devices API (`/api/devices/*`)

| Endpoint | Method | Required | Notes |
|----------|--------|----------|-------|
| `/api/devices` | GET | Yes | List BLE devices |
| `/api/devices/scan` | POST | Yes | Start BLE scan |
| `/api/devices/{address}/provision` | POST | Yes | Provision with MQTT/WiFi |
| `/api/devices/history` | GET | Yes | Provisioning records |

---

## BridgeServer Requirements (via PiOrchestrator proxy)

PiOrchestrator proxies these requests to BridgeServer for diagnostics and evidence:

| Endpoint | Method | Required | Response Shape | Notes |
|----------|--------|----------|----------------|-------|
| `/api/dashboard/diagnostics/bridgeserver` | GET | Yes | `{ status: "healthy"\|"unhealthy" }` | Health check |
| `/api/dashboard/diagnostics/minio` | GET | Yes | `{ status, buckets[] }` | Storage health |
| `/api/dashboard/diagnostics/sessions` | GET | Yes | `{ sessions: Session[] }` | Query: `status`, `limit` |
| `/api/dashboard/diagnostics/sessions/{id}` | GET | Yes | Session detail | Capture stats |
| `/api/dashboard/diagnostics/sessions/{id}/evidence` | GET | Yes | `{ evidence: EvidenceCapture[] }` | Query: `limit=50` |
| `/api/dashboard/diagnostics/images/presign` | GET | Yes | `{ url, expires_at }` | Refresh presigned URLs |
| `/api/v1/cameras/{id}/evidence` | POST | Yes | `{ image_base64, camera_id, captured_at }` | Capture evidence |

---

## Configuration Inputs

### Environment Variables

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `VITE_API_KEY` | V1 API auth (`X-API-Key` header) | - | Conditional |
| `VITE_BYPASS_AUTH` | Dev-only auth bypass | `false` | No |
| `VITE_USE_V1_API` | Enable V1 API client | `false` | No |
| `VITE_BATCH_PROVISIONING` | Batch provisioning UI | `false` | No |
| `VITE_WS_MONITOR` | WebSocket monitoring | `false` | No |
| `VITE_ALLOWLIST_MANAGEMENT` | Allowlist management UI | `false` | No |
| `VITE_SESSION_RECOVERY` | Session recovery features | `false` | No |
| `VITE_BASE_URL` | Playwright base URL override | - | No |

### Feature Flags

Flags stored in Zustand with localStorage persistence (dev mode):

| Flag | Controls | Default |
|------|----------|---------|
| `useV1Api` | V1 API envelope handling | `false` |
| `useBatchProvisioning` | Batch provisioning tab | `false` |
| `useWebSocketMonitor` | WebSocket system monitor | `false` |
| `useAllowlistManagement` | Device allowlist screens | `false` |
| `useSessionRecovery` | Session recovery on reconnect | `false` |

---

## API Client Architecture

### Error Handling

- **V1ApiError**: Custom error with `code`, `message`, `retryable`
- **Error Codes**: `NOT_FOUND`, `CAMERA_OFFLINE`, `CAPTURE_TIMEOUT`, etc.
- **isFeatureUnavailable()**: Graceful degradation for 404/503
- **getUserMessage()**: User-friendly error messages

### Timeouts & Retries

- Default timeout: 10s
- Camera capture timeout: 30s
- Retries: 3 attempts with exponential backoff (1s, 2s, 4s) for 5xx only

### Authentication

- Protected endpoints require `X-API-Key: {VITE_API_KEY}`
- Auth priority: in-memory > env var > sessionStorage
- Dev bypass: `VITE_BYPASS_AUTH=true`

### Response Normalization

- Camera: `device_id` → `id`, `last_seen` → `lastSeen`
- Door: `lock_state` → `lockState`, `last_command` → `lastCommand`
- WiFi: `security` → `WifiEncryption` enum

---

## Graceful Degradation Matrix

| Feature | Required Endpoint | On 404/503 |
|---------|------------------|------------|
| Camera list | `/api/v1/cameras` | Falls back to `/api/dashboard/cameras` |
| Camera capture | `/api/v1/cameras/{id}/capture` | Falls back to legacy |
| Container CRUD | `/api/v1/containers/*` | **Non-functional** (blocker) |
| Evidence capture | `/api/v1/cameras/{id}/evidence` | **Non-functional** (blocker) |
| Session list | `/api/dashboard/diagnostics/sessions` | **Non-functional** (blocker) |
| WiFi scan | `/api/wifi/scan` | Returns empty list |
| MQTT status | `/api/dashboard/mqtt/status` | Returns `{ connected: false }` |
| Tailscale ping | `/api/dashboard/tailscale/ping` | Silent failure |

---

## Schema Validation

All responses validated against Zod schemas in `src/infrastructure/api/*-schemas.ts`:

- `v1-cameras-schemas.ts`: V1CameraSchema, V1CaptureResponseSchema, etc.
- `v1-containers-schemas.ts`: ContainerSchema, CameraAssignmentSchema
- `schemas.ts`: SystemInfoSchema, WifiSchemas, DoorSchemas, ConfigSchemas
- `diagnostics-schemas.ts`: DiagnosticsHealthSchema, SessionSchema, EvidenceSchema

Validation errors are logged as warnings but don't block responses (resilience pattern).

---

## Real-time Features

| Feature | Endpoint | Type |
|---------|----------|------|
| Log streaming | `/api/v1/system/logs/stream` | SSE |
| Provisioning events | `/api/v1/provisioning/batch/events` | SSE |
| Camera polling | `v1CamerasApi.list()` | Polling (visibility-aware) |

---

## Summary

**Ready Features** (graceful degradation):
- Camera list, capture, reboot, diagnostics
- WiFi scanning and connection
- Door status and control
- System info and health
- Tailscale VPN status

**Blocked Features** (require backend implementation):
- Container management (`/api/v1/containers/*`)
- Session evidence (`/api/dashboard/diagnostics/sessions/*`)
- Evidence capture (`/api/v1/cameras/:id/evidence`)
- Presigned URL refresh (`/api/dashboard/diagnostics/images/presign`)
