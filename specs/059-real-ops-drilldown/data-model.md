# Data Model: 059 Real Ops Drilldown

**Date**: 2026-02-20
**Branch**: `059-real-ops-drilldown`
**Source of Truth**: PiOrchestrator Go structs (Go → TypeScript mapping per Constitution II.A)

## Entities

### Session (SessionDiagnosticEntry)

Represents a vending machine operation cycle as returned by PiOrchestrator.

| Field | Go Type | Zod Type | Required | Notes |
|-------|---------|----------|----------|-------|
| `session_id` | `string` | `z.string().min(1)` | Yes | Unique session identifier |
| `container_id` | `string` | `z.string().min(1)` | Yes | Container where session occurred |
| `started_at` | `time.Time` | `z.string()` | Yes | RFC3339 timestamp |
| `status` | `string` | `z.enum([...])` | Yes | See Status Enum below |
| `total_captures` | `int` | `z.number().int().min(0)` | Yes | Total capture attempts |
| `successful_captures` | `int` | `z.number().int().min(0)` | Yes | Captures that succeeded |
| `failed_captures` | `int` | `z.number().int().min(0)` | Yes | Captures that failed |
| `has_before_open` | `bool` | `z.boolean()` | Yes | Whether BEFORE_OPEN exists |
| `has_after_close` | `bool` | `z.boolean()` | Yes | Whether AFTER_CLOSE exists |
| `pair_complete` | `bool` | `z.boolean()` | Yes | Both before/after captured |
| `last_error` | `*LastError` | `LastErrorSchema.optional()` | No | Most recent error, omitempty |
| `elapsed_seconds` | `int` | `z.number().int().min(0)` | Yes | Seconds since session start |

#### Session Status Enum

| Value | Meaning | UI Badge Color |
|-------|---------|---------------|
| `active` | Session in progress | Blue |
| `complete` | Both captures done successfully | Green |
| `partial` | Some captures done, pair incomplete | Yellow/Amber |
| `failed` | All captures failed | Red |

#### LastError (nested object)

| Field | Go Type | Zod Type | Required | Notes |
|-------|---------|----------|----------|-------|
| `phase` | `string` | `z.string()` | Yes | BEFORE_OPEN or AFTER_CLOSE |
| `failure_reason` | `string` | `z.string()` | Yes | Human-readable error |
| `device_id` | `string` | `z.string()` | Yes | Camera that failed |
| `occurred_at` | `time.Time` | `z.string()` | Yes | RFC3339 timestamp |
| `correlation_id` | `string` | `z.string().optional()` | No | For log correlation |

### Derived: SessionWithStale

Extended client-side model adding staleness detection.

| Field | Source | Notes |
|-------|--------|-------|
| `is_stale` | Derived | `true` if `status === 'active'` and `elapsed_seconds > 300` |

---

### Evidence Capture (CaptureEntry)

A single image capture from a session, as returned by PiOrchestrator.

| Field | Go Type | Zod Type | Required | Notes |
|-------|---------|----------|----------|-------|
| `evidence_id` | `string` | `z.string().min(1)` | Yes | UUIDv7 identifier |
| `capture_tag` | `string` | `z.enum([...])` | Yes | BEFORE_OPEN, AFTER_OPEN, BEFORE_CLOSE, AFTER_CLOSE |
| `status` | `string` | `z.enum([...])` | Yes | captured, failed, timeout |
| `failure_reason` | `string` | `z.string().optional()` | No | Error detail, omitempty |
| `device_id` | `string` | `z.string()` | Yes | Camera device ID |
| `container_id` | `string` | `z.string()` | Yes | Container ID |
| `session_id` | `string` | `z.string()` | Yes | Parent session |
| `created_at` | `time.Time` | `z.string()` | Yes | RFC3339 timestamp |
| `image_data` | `string` | `z.string().optional()` | No | Base64 JPEG, omitempty (cleared after S3 upload) |
| `content_type` | `string` | `z.string().optional()` | No | MIME type, default image/jpeg |
| `image_size_bytes` | `int` | `z.number().int().optional()` | No | Decoded image size |
| `object_key` | `string` | `z.string().optional()` | No | S3 object key (Spec 081) |
| `upload_status` | `string` | `z.enum([...]).optional()` | No | uploaded, failed, unverified |
| `upload_error` | `string` | `z.string().optional()` | No | Upload error message |

#### Capture Tag Enum

| Value | Meaning |
|-------|---------|
| `BEFORE_OPEN` | Image taken before door opens |
| `AFTER_OPEN` | Image taken after door opens |
| `BEFORE_CLOSE` | Image taken before door closes |
| `AFTER_CLOSE` | Image taken after door closes |

#### Capture Status Enum

| Value | Meaning | UI Display |
|-------|---------|-----------|
| `captured` | Successfully captured | Green check |
| `failed` | Capture failed | Red X with reason |
| `timeout` | Capture timed out | Amber clock |

#### Upload Status Enum

| Value | Meaning |
|-------|---------|
| `uploaded` | Successfully stored in S3 |
| `failed` | S3 upload failed |
| `unverified` | Upload completed but HEAD check failed |

---

### Evidence Pair (EvidencePair)

Structured before/after pair for a session.

| Field | Go Type | Zod Type | Required | Notes |
|-------|---------|----------|----------|-------|
| `contract_version` | `string` | `z.literal('v1')` | Yes | Always "v1" |
| `session_id` | `string` | `z.string()` | Yes | Parent session |
| `container_id` | `string` | `z.string()` | Yes | Container ID |
| `pair_status` | `string` | `z.enum([...])` | Yes | complete, incomplete, missing |
| `before` | `*CaptureSlot` | `CaptureSlotSchema.nullable()` | Yes | BEFORE_OPEN capture or null |
| `after` | `*CaptureSlot` | `CaptureSlotSchema.nullable()` | Yes | AFTER_CLOSE capture or null |
| `queried_at` | `time.Time` | `z.string()` | Yes | RFC3339 |
| `retry_after_seconds` | `int` | `z.number().optional()` | No | Hint for polling incomplete pairs |

#### Pair Status Enum

| Value | Meaning |
|-------|---------|
| `complete` | Both before and after captured |
| `incomplete` | One or both missing |
| `missing` | Neither capture exists |

---

### Camera Diagnostics (CameraDiagnosticsDetailV1)

Camera health as returned by PiOrchestrator V1 diagnostics.

| Field | Go Type | Zod Type | Required | Notes |
|-------|---------|----------|----------|-------|
| `device_id` | `string` | `z.string()` | Yes | Camera device ID |
| `container_id` | `string` | `z.string()` | Yes | Assigned container |
| `status` | `string` | `z.enum([...])` | Yes | online, offline, error, rebooting |
| `last_seen` | `time.Time` | `z.string()` | Yes | RFC3339 |
| `rssi` | `int` | `z.number()` | Yes | WiFi signal strength |
| `capture_success_rate` | `float64` | `z.number()` | Yes | 0.0 to 1.0 |
| `total_captures` | `int` | `z.number().int()` | Yes | Lifetime total |
| `failed_captures` | `int` | `z.number().int()` | Yes | Lifetime failures |
| `average_capture_ms` | `int` | `z.number().int()` | Yes | Average capture latency |
| `ip_address` | `string` | `z.string()` | Yes | Camera IP on AP network |

---

## API Response Envelopes

All PiOrchestrator V1 responses use a standard envelope:

```typescript
{
  success: boolean;
  status: string;      // "success" or "error"
  data: T;             // Payload
  timestamp: string;   // RFC3339
}
```

### Session List Response

```typescript
{
  success: true,
  status: "success",
  data: {
    sessions: SessionDiagnosticEntry[],
    total: number,
    queried_at: string
  },
  timestamp: string
}
```

### Session Evidence Response

```typescript
{
  success: true,
  status: "success",
  data: {
    session_id: string,
    container_id: string,
    captures: CaptureEntry[],
    summary: {
      total_captures: number,
      successful_captures: number,
      failed_captures: number,
      has_before_open: boolean,
      has_after_close: boolean,
      pair_complete: boolean
    }
  },
  timestamp: string
}
```

### Evidence Pair Response

```typescript
{
  success: true,
  status: "success",
  data: EvidencePair,
  timestamp: string
}
```

---

## State Transitions

### Session Lifecycle

```
active ──(both captures succeed)──→ complete
active ──(partial captures, >5min)──→ partial
active ──(all captures fail)──→ failed
partial ──(remaining captures succeed)──→ complete
partial ──(remaining captures fail)──→ failed
```

### Evidence Image Availability

```
Capture succeeds
  ├── image_data present (in memory, <24h TTL)
  │     └── Render as data:image/jpeg;base64,...
  └── object_key present (S3 upload succeeded)
        └── Fetch through PiOrchestrator image proxy
              └── If proxy unavailable: show "stored in S3" placeholder

Capture fails
  └── status: 'failed' or 'timeout'
        └── Show failure reason, no image
```

## Field Mapping: Old → New

For migration reference, mapping old dashboard field names to real PiOrchestrator fields:

| Old Dashboard Field | New PiOrchestrator Field | Notes |
|-------------------|-------------------------|-------|
| `Session.id` | `session_id` | Rename |
| `Session.delivery_id` | `container_id` | Semantic change |
| `Session.status: 'completed'` | `status: 'complete'` | Enum value change |
| `Session.status: 'cancelled'` | `status: 'failed'` | Enum value change |
| `Session.capture_count` | `total_captures` | Rename |
| `Session.last_capture_at` | *(derive from captures)* | Not in session response |
| `EvidenceCapture.id` | `evidence_id` | Rename |
| `EvidenceCapture.camera_id` | `device_id` | Rename |
| `EvidenceCapture.thumbnail_url` | `image_data` (base64) | Fundamental change |
| `EvidenceCapture.full_url` | `object_key` (S3 key) | Fundamental change |
| `EvidenceCapture.expires_at` | *(not applicable)* | No presigned URLs |
| `EvidenceCapture.captured_at` | `created_at` | Rename |
