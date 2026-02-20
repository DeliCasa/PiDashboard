# Data Model: 058-real-evidence-ops

**Date**: 2026-02-19
**Branch**: `058-real-evidence-ops`

## Entities

### EvidenceCapture (existing — no changes)

Already defined in `src/infrastructure/api/diagnostics-schemas.ts`:

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| id | string | yes | Unique evidence capture ID |
| session_id | string | yes | Parent session ID |
| captured_at | string (ISO 8601) | yes | Capture timestamp |
| camera_id | string (espcam-XXXXXX) | yes | Camera identifier |
| thumbnail_url | string (URL) | yes | Presigned URL for thumbnail |
| full_url | string (URL) | yes | Presigned URL for full resolution |
| expires_at | string (ISO 8601) | yes | URL expiration timestamp |
| size_bytes | number | no | File size in bytes |
| content_type | string | no | MIME type (e.g., image/jpeg) |

**Derived fields** (client-side, not from API):
- `object_key`: Extracted from presigned URL via `extractObjectKey()` — the MinIO object path (e.g., `evidence/sess-abc/espcam-001/2026-02-19.jpg`)
- `is_expired`: Computed via `isUrlExpired(expires_at)` with 60-second threshold

### EvidenceImages (existing — no changes)

Already defined in `src/infrastructure/api/inventory-delta-schemas.ts`:

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| before_image_url | string (URL) | no | Presigned URL for before image |
| after_image_url | string (URL) | no | Presigned URL for after image |
| overlays | object | no | ML bounding box overlays |

**Derived fields** (client-side):
- `before_object_key`: Extracted from `before_image_url` via `extractObjectKey()`
- `after_object_key`: Extracted from `after_image_url` via `extractObjectKey()`

### Session (existing — no changes)

Already defined in `src/infrastructure/api/diagnostics-schemas.ts`:

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| id | string | yes | Session ID (opaque) |
| delivery_id | string | no | Linked delivery |
| started_at | string (ISO 8601) | yes | Session start time |
| completed_at | string (ISO 8601) | no | Session end time |
| status | enum | yes | active, completed, cancelled |
| capture_count | number | no | Evidence captures taken |
| cameras | string[] | no | Assigned camera IDs |

### CameraDiagnostics (existing — no changes)

Already defined in `src/domain/types/camera-diagnostics.ts`:

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| camera_id | string | yes | Camera ID (espcam-XXXXXX) |
| name | string | yes | Human-readable name |
| status | CameraStatus | yes | online/offline/error/rebooting/... |
| last_seen | string (ISO 8601) | yes | Last communication timestamp |
| health | CameraHealth | no | Memory, RSSI, uptime |
| diagnostics | DiagnosticsDetail | no | Error count, quality, firmware |

## State Transitions

### Image Load State Machine (new)

Per-image state for auto-refresh behavior:

```
idle → loading → loaded (terminal)
                → error → refreshing → loaded (terminal)
                                      → failed (terminal, show retry)
```

States:
- `idle`: Image not yet attempted
- `loading`: `<img>` src set, waiting for load/error event
- `loaded`: Image successfully rendered
- `error`: `<img>` onError fired, attempting auto-refresh
- `refreshing`: Calling presign endpoint for fresh URL
- `loaded`: Fresh URL successfully loaded image
- `failed`: Refresh failed or refreshed URL also failed — show error placeholder with retry button

Transitions:
- `idle → loading`: Component mounts, `src` assigned
- `loading → loaded`: `<img>` `onLoad` fires
- `loading → error`: `<img>` `onError` fires
- `error → refreshing`: Auto-refresh triggered (max 1 attempt)
- `refreshing → loaded`: New URL loads successfully
- `refreshing → failed`: New URL also fails or refresh endpoint errors
- `failed → loading`: User clicks "Retry" button (resets to loading with fresh URL)

## Schema Changes

**No Zod schema changes required.** All existing schemas are sufficient:
- `EvidenceCaptureSchema` already includes `thumbnail_url`, `full_url`, `expires_at`
- `PresignResponseSchema` already handles refresh responses
- Object keys are derived client-side from URLs

## Relationships

```
Session 1──* EvidenceCapture (via session_id)
Session 1──0..1 InventoryAnalysisRun (via session lookup)
InventoryAnalysisRun 1──0..1 EvidenceImages (via evidence field)
CameraDiagnostics 1──* EvidenceCapture (via camera_id)
```
