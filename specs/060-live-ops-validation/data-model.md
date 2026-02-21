# Data Model: Live Ops Validation

**Feature**: 060-live-ops-validation
**Date**: 2026-02-21
**Note**: This feature does not introduce new entities. It validates and fixes existing data models from Feature 059 against live PiOrchestrator responses.

## Existing Entities (from Feature 059 — no changes)

### Session

Represents a vending machine operation cycle.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| session_id | string (UUID v7) | yes | Primary identifier |
| container_id | string (UUID v7) | yes | Correlation ID for the vending container |
| started_at | string (RFC3339) | yes | Session start timestamp |
| status | enum | yes | `active \| complete \| partial \| failed` |
| total_captures | number | yes | Total evidence capture attempts |
| successful_captures | number | yes | Successfully captured images |
| failed_captures | number | yes | Failed capture attempts |
| has_before_open | boolean | yes | Whether a before-open capture exists |
| has_after_close | boolean | yes | Whether an after-close capture exists |
| pair_complete | boolean | yes | Whether before/after pair is complete |
| elapsed_seconds | number | yes | Duration since session start |
| last_error | LastError? | no | Present on failed sessions |

**Derived (client-side)**:
- `is_stale`: boolean — `true` when `status === 'active' && elapsed_seconds > 300`

### LastError

Error details for failed sessions.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| phase | string | yes | e.g., `BEFORE_OPEN`, `AFTER_CLOSE` |
| failure_reason | string | yes | Human-readable failure description |
| device_id | string | yes | ESP32 camera device that failed |
| occurred_at | string (RFC3339) | yes | When the error occurred |
| correlation_id | string? | no | For cross-referencing PiOrchestrator logs |

### CaptureEntry

A timestamped evidence image from an ESP32 camera.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| evidence_id | string (UUID v7) | yes | Primary identifier |
| capture_tag | enum | yes | `BEFORE_OPEN \| AFTER_OPEN \| BEFORE_CLOSE \| AFTER_CLOSE` |
| status | enum | yes | `captured \| failed \| timeout` |
| failure_reason | string? | no | Present when status is failed/timeout |
| device_id | string | yes | ESP32 camera identifier |
| container_id | string | yes | Container correlation ID |
| session_id | string | yes | Parent session ID |
| created_at | string (RFC3339) | yes | Capture timestamp |
| image_data | string? | no | Base64-encoded JPEG (present for recent captures) |
| content_type | string? | no | MIME type (e.g., `image/jpeg`) |
| image_size_bytes | number? | no | Image file size |
| object_key | string? | no | S3/MinIO storage path |
| upload_status | enum? | no | `uploaded \| failed \| unverified` |
| upload_error | string? | no | Upload error message |

### EvidencePair

Structured before/after evidence for a session.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| contract_version | string | yes | Always `'v1'` |
| session_id | string | yes | Parent session ID |
| container_id | string | yes | Container correlation ID |
| pair_status | enum | yes | `complete \| incomplete \| missing` |
| before | CaptureSlot? | nullable | Before-capture slot |
| after | CaptureSlot? | nullable | After-capture slot |
| queried_at | string (RFC3339) | yes | Query timestamp |
| retry_after_seconds | number? | no | Retry guidance for incomplete pairs |

### Camera (diagnostics)

ESP32 camera health information.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| device_id | string | yes | Camera identifier (e.g., `espcam-XXXXXX`) |
| status | enum | yes | `online \| offline \| error \| rebooting \| discovered \| pairing \| connecting` |
| rssi | number? | no | WiFi signal strength (dBm) |
| capture_success_rate | number? | no | Success percentage |
| total_captures | number? | no | Total capture count |
| failed_captures | number? | no | Failed capture count |
| last_seen | string (RFC3339)? | no | Last communication timestamp |
| last_error | string? | no | Most recent error message |

## State Transitions

### Session Status
```
active → complete    (normal completion)
active → partial     (partial evidence captured)
active → failed      (capture or processing failure)
```
Note: No `cancelled` or `completed` status exists in V1 schema.

### Capture Status
```
(initiated) → captured   (image captured successfully)
(initiated) → failed     (capture error)
(initiated) → timeout    (camera didn't respond in time)
```

## Schema Conflict Resolution

### Issue: Two `SessionStatusSchema` Definitions

| Schema File | Values | Usage |
|-------------|--------|-------|
| `diagnostics-schemas.ts` (V1) | `active \| complete \| partial \| failed` | Sessions API, hooks, operations UI |
| `camera-diagnostics-schemas.ts` (legacy) | `active \| completed \| cancelled` | Legacy mock fixtures only |

**Resolution**: The legacy schema must be updated to match V1 or removed if no longer used by active code. Test fixtures referencing legacy values must be corrected.

## Validation Rules

- All IDs are opaque strings — never parsed semantically
- Timestamps are RFC3339 strings, not Date objects
- `image_data` is a base64-encoded string (no `data:` URI prefix — dashboard adds it)
- `elapsed_seconds` is always non-negative
- `total_captures >= successful_captures + failed_captures`
