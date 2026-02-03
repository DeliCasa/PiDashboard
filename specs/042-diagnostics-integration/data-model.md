# Data Model: PiOrchestrator Diagnostics Integration

**Feature**: 042-diagnostics-integration
**Date**: 2026-02-03

## Entity Relationship Diagram

```text
┌─────────────────────┐
│    CameraDevice     │       (from Feature 034)
│─────────────────────│
│ device_id: string   │───┐
│ name: string        │   │
│ status: CameraStatus│   │
│ last_seen: string   │   │ 1:1
│ health?: Health     │   │
│ ip_address?: string │   │
│ mac_address?: string│   │
└─────────────────────┘   │
                          │
                          ▼
┌─────────────────────────────────────┐
│        CameraDiagnostics            │  (NEW - Feature 042)
│─────────────────────────────────────│
│ camera_id: string                   │
│ name: string                        │
│ status: CameraStatus                │
│ last_seen: string                   │
│ health?: CameraHealth               │
│ ip_address?: string                 │
│ mac_address?: string                │
│ diagnostics?: DiagnosticsDetail     │◄─── Extended metrics
└─────────────────────────────────────┘
                          │
                          │ 1:N
                          ▼
┌─────────────────────────────────────┐
│        CapturedEvidence             │  (NEW - Feature 042)
│─────────────────────────────────────│
│ id: string                          │
│ camera_id: string                   │
│ session_id: string                  │
│ captured_at: string                 │
│ image_base64: string                │
│ thumbnail_url?: string              │
│ expires_at?: string                 │
└─────────────────────────────────────┘
```

## Entity Definitions

### CameraDiagnostics

Extended camera information including health metrics and diagnostics.

| Field | Type | Required | Source | Notes |
|-------|------|----------|--------|-------|
| camera_id | string | Yes | PiOrchestrator | Format: `espcam-XXXXXX` |
| name | string | Yes | PiOrchestrator | User-friendly camera name |
| status | CameraStatus | Yes | PiOrchestrator | Enum: online, offline, error, rebooting |
| last_seen | string | Yes | PiOrchestrator | ISO 8601 timestamp |
| health | CameraHealth | No | PiOrchestrator | Omitted if camera offline |
| ip_address | string | No | PiOrchestrator | Local network IP |
| mac_address | string | No | PiOrchestrator | Hardware address |
| diagnostics | DiagnosticsDetail | No | PiOrchestrator | Extended debug info |

### CameraHealth

Real-time health metrics from ESP-CAM device.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| heap | number | Yes | Free heap in bytes (typical: 50000-150000) |
| wifi_rssi | number | Yes | Signal strength in dBm (typical: -30 to -90) |
| uptime | number | Yes | Uptime in seconds since boot |

### DiagnosticsDetail

Extended diagnostic information for debugging.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| connection_quality | ConnectionQuality | Yes | Derived from wifi_rssi |
| error_count | number | Yes | Total errors since boot |
| last_error | string | No | Most recent error message |
| last_error_time | string | No | ISO 8601 timestamp |
| firmware_version | string | No | Firmware version string |
| resolution | string | No | e.g., "1280x720" |
| frame_rate | number | No | Current FPS |
| avg_capture_time_ms | number | No | Average capture latency |

### CapturedEvidence

Evidence image captured from a camera.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | Yes | Unique evidence ID |
| camera_id | string | Yes | Source camera ID |
| session_id | string | Yes | Parent session ID |
| captured_at | string | Yes | ISO 8601 timestamp |
| image_base64 | string | Yes | Base64 encoded JPEG |
| thumbnail_url | string | No | MinIO presigned URL |
| expires_at | string | No | URL expiration timestamp |

### SessionDetail

Detailed session information including capture history.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | Yes | Unique session ID |
| delivery_id | string | No | Associated delivery |
| started_at | string | Yes | ISO 8601 timestamp |
| completed_at | string | No | Completion timestamp |
| status | SessionStatus | Yes | Enum: active, completed, cancelled |
| capture_count | number | Yes | Total captures in session |
| cameras | string[] | No | List of camera IDs used |
| evidence | CapturedEvidence[] | No | Capture history |

## Enumerations

### CameraStatus

Matches PiOrchestrator's `CameraStatus` enum.

```typescript
type CameraStatus = 'online' | 'offline' | 'error' | 'rebooting' | 'discovered' | 'pairing' | 'connecting';
```

### ConnectionQuality

Derived from wifi_rssi values.

```typescript
type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor';
```

| Value | RSSI Range | Description |
|-------|------------|-------------|
| excellent | ≥ -50 dBm | Full signal, optimal performance |
| good | -50 to -60 dBm | Strong signal, reliable |
| fair | -60 to -70 dBm | Moderate signal, may have latency |
| poor | < -70 dBm | Weak signal, expect timeouts |

### SessionStatus

Matches existing Feature 038 schema.

```typescript
type SessionStatus = 'active' | 'completed' | 'cancelled';
```

## Validation Rules

### CameraDiagnostics

1. `camera_id` MUST match pattern `^espcam-[0-9a-f]{6}$` (case-insensitive)
2. `status` MUST be one of the CameraStatus enum values
3. `last_seen` MUST be a valid ISO 8601 timestamp
4. If `health` is present, all three fields (heap, wifi_rssi, uptime) MUST be present

### CameraHealth

1. `heap` MUST be non-negative
2. `wifi_rssi` MUST be between -100 and 0 (dBm range)
3. `uptime` MUST be non-negative

### CapturedEvidence

1. `id` MUST be non-empty
2. `camera_id` MUST match camera ID pattern
3. `image_base64` MUST be valid base64 (or empty for error state)
4. If `thumbnail_url` present, MUST be valid URL

## State Transitions

### Camera Status Transitions

```text
                    ┌─────────────────────┐
                    │     discovered      │
                    └─────────┬───────────┘
                              │ pair request
                              ▼
                    ┌─────────────────────┐
     ┌──────────────│      pairing        │
     │              └─────────┬───────────┘
     │                        │ success
     │ timeout                ▼
     │              ┌─────────────────────┐
     │              │     connecting      │
     │              └─────────┬───────────┘
     │                        │ joined wifi
     ▼                        ▼
┌─────────┐         ┌─────────────────────┐
│  error  │◄────────│       online        │◄─────┐
└─────────┘         └──────────┬──────────┘      │
     │                         │                  │
     │ reboot                  │ reboot           │ boot complete
     │                         ▼                  │
     │              ┌─────────────────────┐       │
     └─────────────►│     rebooting       │───────┘
                    └─────────────────────┘
```

### Session Status Transitions

```text
┌─────────────┐     complete     ┌─────────────┐
│   active    │─────────────────►│  completed  │
└─────────────┘                  └─────────────┘
       │
       │ cancel
       ▼
┌─────────────┐
│  cancelled  │
└─────────────┘
```

## Zod Schema Mapping

| Entity | Zod Schema File | Schema Name |
|--------|-----------------|-------------|
| CameraDiagnostics | `camera-diagnostics-schemas.ts` | `CameraDiagnosticsSchema` |
| CameraHealth | `camera-diagnostics-schemas.ts` | `CameraHealthSchema` |
| DiagnosticsDetail | `camera-diagnostics-schemas.ts` | `DiagnosticsDetailSchema` |
| CapturedEvidence | `camera-diagnostics-schemas.ts` | `CapturedEvidenceSchema` |
| SessionDetail | `camera-diagnostics-schemas.ts` | `SessionDetailSchema` |
| ConnectionQuality | `camera-diagnostics-schemas.ts` | `ConnectionQualitySchema` |
