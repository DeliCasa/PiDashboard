# Data Model: ESP Camera Integration

**Feature**: 034-esp-camera-integration
**Date**: 2026-01-14

## Entities

### Camera

Represents an ESP32-CAM device registered with PiOrchestrator.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique camera identifier (MAC address or UUID) |
| `name` | string | Yes | User-friendly camera name |
| `status` | CameraStatus | Yes | Current operational status |
| `lastSeen` | string (ISO 8601) | Yes | Timestamp of last successful communication |
| `health` | CameraHealth | No | Embedded health metrics |
| `ip_address` | string | No | Current IP address on local network |
| `mac_address` | string | No | Hardware MAC address |

**Validation Rules**:
- `id` must be non-empty string
- `name` must be non-empty string, max 64 characters
- `lastSeen` must be valid ISO 8601 timestamp
- `status` must be one of: `online`, `offline`, `error`, `rebooting`

---

### CameraStatus (Enum)

```typescript
type CameraStatus = 'online' | 'offline' | 'error' | 'rebooting';
```

**State Transitions**:
```
        ┌─────────────┐
        │   offline   │◄─────────────────────┐
        └─────┬───────┘                      │
              │ heartbeat                    │ timeout
              ▼                              │
        ┌─────────────┐    error      ┌─────┴───────┐
        │   online    │──────────────►│    error    │
        └─────┬───────┘               └─────────────┘
              │ reboot                       ▲
              ▼                              │
        ┌─────────────┐                      │
        │  rebooting  │──────────────────────┘
        └─────────────┘    timeout/error
              │
              │ heartbeat
              ▼
        ┌─────────────┐
        │   online    │
        └─────────────┘
```

---

### CameraHealth

Embedded health metrics for a camera.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `wifi_rssi` | number | Yes | WiFi signal strength in dBm (typically -30 to -90) |
| `free_heap` | number | Yes | Available heap memory in bytes |
| `uptime` | string | Yes | Human-readable uptime (e.g., "2d 5h 30m") |
| `uptime_seconds` | number | No | Uptime in seconds for calculations |
| `resolution` | CameraResolution | Yes | Current capture resolution |
| `firmware_version` | string | No | ESP32 firmware version |
| `last_capture` | string (ISO 8601) | No | Timestamp of last successful capture |

**Validation Rules**:
- `wifi_rssi` typically between -100 and 0 dBm
- `free_heap` must be non-negative integer
- `resolution` must be valid CameraResolution enum value

---

### CameraResolution (Enum)

```typescript
type CameraResolution = 'QQVGA' | 'QVGA' | 'VGA' | 'SVGA' | 'XGA' | 'SXGA' | 'UXGA';
```

| Value | Dimensions | Typical Use |
|-------|------------|-------------|
| QQVGA | 160x120 | Thumbnails |
| QVGA | 320x240 | Low bandwidth |
| VGA | 640x480 | Standard |
| SVGA | 800x600 | High quality |
| XGA | 1024x768 | High quality |
| SXGA | 1280x1024 | Detailed capture |
| UXGA | 1600x1200 | Maximum resolution |

---

### CameraDiagnostics

Extended camera information for debugging. Extends Camera.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| *...Camera fields* | | | All fields from Camera entity |
| `diagnostics` | DiagnosticsInfo | No | Extended diagnostic data |

### DiagnosticsInfo

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connection_quality` | ConnectionQuality | Yes | Overall connection quality rating |
| `error_count` | number | Yes | Number of errors since last reset |
| `last_error` | string | No | Most recent error message |

```typescript
type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor';
```

---

### CaptureResult

Result of a capture operation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | Yes | Whether capture succeeded |
| `image` | string (base64) | No | Base64-encoded JPEG image data |
| `timestamp` | string (ISO 8601) | No | Capture timestamp |
| `camera_id` | string | No | ID of camera that captured |
| `file_size` | number | No | Image size in bytes |
| `error` | string | No | Error message if capture failed |

**Validation Rules**:
- If `success` is true, `image` and `timestamp` must be present
- If `success` is false, `error` should be present
- `image` must be valid base64 string (JPEG)

---

### RebootResult

Result of a reboot operation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | Yes | Whether reboot command was accepted |
| `message` | string | No | Status message |
| `error` | string | No | Error message if reboot failed |

---

### CameraError

Normalized camera-specific error.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | CameraErrorCode | Yes | Machine-readable error code |
| `message` | string | Yes | Human-readable error description |
| `retryable` | boolean | Yes | Whether operation can be retried |
| `camera_id` | string | No | Associated camera ID |

```typescript
type CameraErrorCode =
  | 'CAMERA_OFFLINE'      // Camera not responding
  | 'CAMERA_NOT_FOUND'    // Camera ID doesn't exist
  | 'CAPTURE_FAILED'      // Capture operation failed
  | 'CAPTURE_TIMEOUT'     // Capture took too long
  | 'REBOOT_FAILED'       // Reboot command failed
  | 'NETWORK_ERROR'       // Network connectivity issue
  | 'UNKNOWN';            // Unexpected error
```

**Retryable Matrix**:
| Code | Retryable |
|------|-----------|
| CAMERA_OFFLINE | Yes (after delay) |
| CAMERA_NOT_FOUND | No |
| CAPTURE_FAILED | Yes |
| CAPTURE_TIMEOUT | Yes |
| REBOOT_FAILED | Yes |
| NETWORK_ERROR | Yes |
| UNKNOWN | Yes |

---

## Relationships

```
┌─────────────────┐
│     Camera      │
├─────────────────┤
│ id              │
│ name            │
│ status          │
│ lastSeen        │
│ ip_address      │
│ mac_address     │
│                 │
│ ┌─────────────┐ │
│ │CameraHealth │ │ 1:1 embedded
│ │ wifi_rssi   │ │
│ │ free_heap   │ │
│ │ uptime      │ │
│ │ resolution  │ │
│ └─────────────┘ │
└─────────────────┘
         │
         │ extends
         ▼
┌─────────────────────┐
│ CameraDiagnostics   │
├─────────────────────┤
│ ...Camera fields    │
│                     │
│ ┌─────────────────┐ │
│ │DiagnosticsInfo  │ │ 1:1 embedded
│ │connection_quality│
│ │error_count       │
│ │last_error        │
│ └─────────────────┘ │
└─────────────────────┘
```

---

## Zod Schemas

```typescript
// src/infrastructure/api/v1-cameras-schemas.ts

import { z } from 'zod';

export const CameraStatusSchema = z.enum(['online', 'offline', 'error', 'rebooting']);

export const CameraResolutionSchema = z.enum(['QQVGA', 'QVGA', 'VGA', 'SVGA', 'XGA', 'SXGA', 'UXGA']);

export const CameraHealthSchema = z.object({
  wifi_rssi: z.number(),
  free_heap: z.number().nonnegative(),
  uptime: z.string(),
  uptime_seconds: z.number().nonnegative().optional(),
  resolution: CameraResolutionSchema,
  firmware_version: z.string().optional(),
  last_capture: z.string().datetime().optional(),
});

export const CameraSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(64),
  status: CameraStatusSchema,
  lastSeen: z.string().datetime(),
  health: CameraHealthSchema.optional(),
  ip_address: z.string().optional(),
  mac_address: z.string().optional(),
});

export const ConnectionQualitySchema = z.enum(['excellent', 'good', 'fair', 'poor']);

export const DiagnosticsInfoSchema = z.object({
  connection_quality: ConnectionQualitySchema,
  error_count: z.number().nonnegative(),
  last_error: z.string().optional(),
});

export const CameraDiagnosticsSchema = CameraSchema.extend({
  diagnostics: DiagnosticsInfoSchema.optional(),
});

export const CaptureResultSchema = z.object({
  success: z.boolean(),
  image: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  camera_id: z.string().optional(),
  file_size: z.number().nonnegative().optional(),
  error: z.string().optional(),
});

export const RebootResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Response envelopes
export const CameraListResponseSchema = z.object({
  cameras: z.array(CameraSchema),
  count: z.number().nonnegative(),
});

export const DiagnosticsListResponseSchema = z.array(CameraDiagnosticsSchema);
```
