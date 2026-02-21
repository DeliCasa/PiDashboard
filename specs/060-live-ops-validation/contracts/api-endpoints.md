# API Contracts: Live Ops Validation

**Feature**: 060-live-ops-validation
**Date**: 2026-02-21
**Note**: No new endpoints are introduced. This documents the existing endpoints that must be validated against live PiOrchestrator.

## Endpoint Inventory

### Currently Working (Port 8082)

| Method | Path | Handler | Response |
|--------|------|---------|----------|
| GET | `/api/dashboard/diagnostics/system` | DiagnosticsV1Handler | System info |
| GET | `/api/dashboard/diagnostics/cameras` | DiagnosticsV1Handler | Camera list with health |
| GET | `/api/dashboard/diagnostics/images/proxy?key={key}` | EvidenceImageHandler | Streams image bytes |
| GET | `/api/dashboard/diagnostics/images/presign?key={key}` | EvidenceImageHandler | Presigned URL JSON |

### Required on Port 8082 (PiOrchestrator Handoff)

These endpoints exist on port 8081 but must be added to port 8082 for PiDashboard access:

| Method | Path | Handler | Response |
|--------|------|---------|----------|
| GET | `/api/v1/diagnostics/sessions` | SessionDiagHandler | Session list envelope |
| GET | `/api/v1/sessions/:sessionId` | SessionHandler | Session detail |
| GET | `/api/v1/sessions/:sessionId/evidence` | SessionEvidenceHandler | Evidence capture list |
| GET | `/api/v1/sessions/:sessionId/evidence/pair` | EvidencePairHandler | Evidence pair |

**Key difference**: Port 8082 routes must NOT require API key authentication.

## Response Contracts

### GET `/api/v1/diagnostics/sessions`

```json
{
  "data": {
    "sessions": [
      {
        "session_id": "string (UUID v7)",
        "container_id": "string (UUID v7)",
        "started_at": "string (RFC3339)",
        "status": "active | complete | partial | failed",
        "total_captures": "number",
        "successful_captures": "number",
        "failed_captures": "number",
        "has_before_open": "boolean",
        "has_after_close": "boolean",
        "pair_complete": "boolean",
        "elapsed_seconds": "number",
        "last_error": {
          "phase": "string",
          "failure_reason": "string",
          "device_id": "string",
          "occurred_at": "string (RFC3339)",
          "correlation_id": "string (optional)"
        }
      }
    ],
    "total": "number",
    "queried_at": "string (RFC3339)"
  }
}
```

### GET `/api/v1/sessions/:sessionId/evidence`

```json
{
  "data": {
    "captures": [
      {
        "evidence_id": "string (UUID v7)",
        "capture_tag": "BEFORE_OPEN | AFTER_OPEN | BEFORE_CLOSE | AFTER_CLOSE",
        "status": "captured | failed | timeout",
        "failure_reason": "string (optional)",
        "device_id": "string",
        "container_id": "string",
        "session_id": "string",
        "created_at": "string (RFC3339)",
        "image_data": "string (base64, optional)",
        "content_type": "string (optional)",
        "image_size_bytes": "number (optional)",
        "object_key": "string (optional)",
        "upload_status": "uploaded | failed | unverified (optional)",
        "upload_error": "string (optional)"
      }
    ],
    "summary": {
      "total_captures": "number",
      "successful_captures": "number",
      "failed_captures": "number",
      "has_before_open": "boolean",
      "has_after_close": "boolean",
      "pair_complete": "boolean"
    }
  }
}
```

### GET `/api/v1/sessions/:sessionId/evidence/pair`

```json
{
  "data": {
    "contract_version": "v1",
    "session_id": "string",
    "container_id": "string",
    "pair_status": "complete | incomplete | missing",
    "before": {
      "evidence_id": "string",
      "capture_tag": "BEFORE_OPEN",
      "status": "captured | failed | timeout | pending",
      "device_id": "string",
      "container_id": "string",
      "captured_at": "string (RFC3339, optional)",
      "content_type": "string (optional)",
      "image_size_bytes": "number (optional)",
      "image_data": "string (base64, optional)",
      "object_key": "string (optional)",
      "upload_status": "string (optional)",
      "missing_reason": "string (optional)",
      "failure_detail": "string (optional)"
    },
    "after": "(same structure as before, nullable)",
    "queried_at": "string (RFC3339)",
    "retry_after_seconds": "number (optional)"
  }
}
```

### GET `/api/dashboard/diagnostics/cameras`

```json
{
  "cameras": [
    {
      "device_id": "string",
      "status": "online | offline | error | rebooting | discovered | pairing | connecting",
      "rssi": "number (optional)",
      "capture_success_rate": "number (optional)",
      "total_captures": "number (optional)",
      "failed_captures": "number (optional)",
      "last_seen": "string (RFC3339, optional)",
      "last_error": "string (optional)"
    }
  ]
}
```

### GET `/api/dashboard/diagnostics/images/proxy?key={object_key}`

- Returns: raw image bytes with `Content-Type: image/jpeg`
- Falls back to presigned URL redirect if direct streaming fails
- Used for evidence images that lack base64 inline data

### GET `/api/dashboard/diagnostics/images/presign?key={object_key}&expiresIn={seconds}`

```json
{
  "url": "string (presigned S3 URL)",
  "object_key": "string",
  "expires_at": "string (RFC3339)",
  "expires_in": "number (seconds)"
}
```

## Validation Strategy

All responses are validated against Zod schemas in `src/infrastructure/api/diagnostics-schemas.ts`:
- `SessionListResponseSchema` — session list envelope
- `SessionEvidenceResponseSchema` — evidence list envelope
- `EvidencePairResponseSchema` — evidence pair envelope
- `CameraDiagnosticsSchema` — camera health (in `camera-diagnostics-schemas.ts`)

Validation failures are logged as warnings and trigger graceful degradation (empty data) rather than crashes.
