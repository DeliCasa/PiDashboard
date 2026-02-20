# API Contract: Session Evidence

**Source**: PiOrchestrator `SessionEvidenceHandler` + `EvidencePairHandler`
**Dashboard Port**: 8082 (config UI, no API key)

## GET /api/v1/sessions/:sessionId/evidence

List all evidence captures for a session.

### Request

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | path | Session identifier |

### Response (200 OK)

```json
{
  "success": true,
  "status": "success",
  "data": {
    "session_id": "sess-abc123",
    "container_id": "ctr-001",
    "captures": [
      {
        "evidence_id": "01234567-89ab-7cde-f012-3456789abcdef",
        "capture_tag": "BEFORE_OPEN",
        "status": "captured",
        "device_id": "espcam-a1b2c3",
        "container_id": "ctr-001",
        "session_id": "sess-abc123",
        "created_at": "2026-02-20T10:00:05Z",
        "image_data": "/9j/4AAQSkZJRg...",
        "content_type": "image/jpeg",
        "image_size_bytes": 245760,
        "object_key": "evidence/ctr-001/sess-abc123/BEFORE_OPEN_20260220T100005_01234567.jpg",
        "upload_status": "uploaded"
      },
      {
        "evidence_id": "fedcba98-7654-7321-0fed-cba987654321",
        "capture_tag": "AFTER_CLOSE",
        "status": "captured",
        "device_id": "espcam-a1b2c3",
        "container_id": "ctr-001",
        "session_id": "sess-abc123",
        "created_at": "2026-02-20T10:01:45Z",
        "content_type": "image/jpeg",
        "image_size_bytes": 251904,
        "object_key": "evidence/ctr-001/sess-abc123/AFTER_CLOSE_20260220T100145_fedcba98.jpg",
        "upload_status": "uploaded"
      }
    ],
    "summary": {
      "total_captures": 2,
      "successful_captures": 2,
      "failed_captures": 0,
      "has_before_open": true,
      "has_after_close": true,
      "pair_complete": true
    }
  },
  "timestamp": "2026-02-20T10:10:00Z"
}
```

### Notes on `image_data` Field

- **Present** when image is still in PiOrchestrator's in-memory store (<24h TTL)
- **Absent** (empty string or omitted) when image has been uploaded to S3 and cleared from memory
- When absent, use `object_key` + image proxy endpoint to fetch the image
- Base64-encoded JPEG, max ~6.7MB string (5MB decoded image)

### Error Responses

| Status | Condition | Dashboard Behavior |
|--------|-----------|-------------------|
| 404 | Session not found OR endpoint not registered | Graceful degradation (empty captures) |
| 503 | Service unavailable | Graceful degradation (empty captures) |
| 500 | Internal error | Show error with Retry button |

---

## GET /api/v1/sessions/:sessionId/evidence/pair

Get structured before/after evidence pair for a session.

### Request

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | path | Session identifier |

### Response (200 OK)

```json
{
  "success": true,
  "status": "success",
  "data": {
    "contract_version": "v1",
    "session_id": "sess-abc123",
    "container_id": "ctr-001",
    "pair_status": "complete",
    "before": {
      "evidence_id": "01234567-89ab-7cde-f012-3456789abcdef",
      "capture_tag": "BEFORE_OPEN",
      "status": "captured",
      "device_id": "espcam-a1b2c3",
      "container_id": "ctr-001",
      "session_id": "sess-abc123",
      "captured_at": "2026-02-20T10:00:05Z",
      "content_type": "image/jpeg",
      "image_size_bytes": 245760,
      "image_data": "/9j/4AAQSkZJRg...",
      "object_key": "evidence/ctr-001/sess-abc123/BEFORE_OPEN_20260220T100005_01234567.jpg",
      "upload_status": "uploaded"
    },
    "after": {
      "evidence_id": "fedcba98-7654-7321-0fed-cba987654321",
      "capture_tag": "AFTER_CLOSE",
      "status": "captured",
      "device_id": "espcam-a1b2c3",
      "container_id": "ctr-001",
      "session_id": "sess-abc123",
      "captured_at": "2026-02-20T10:01:45Z",
      "content_type": "image/jpeg",
      "image_size_bytes": 251904,
      "object_key": "evidence/ctr-001/sess-abc123/AFTER_CLOSE_20260220T100145_fedcba98.jpg",
      "upload_status": "uploaded"
    },
    "queried_at": "2026-02-20T10:10:00Z"
  },
  "timestamp": "2026-02-20T10:10:00Z"
}
```

### Incomplete Pair Example

```json
{
  "success": true,
  "status": "success",
  "data": {
    "contract_version": "v1",
    "session_id": "sess-def456",
    "container_id": "ctr-002",
    "pair_status": "incomplete",
    "before": null,
    "after": {
      "evidence_id": "...",
      "capture_tag": "AFTER_CLOSE",
      "status": "captured",
      "missing_reason": "SESSION_IN_PROGRESS"
    },
    "queried_at": "2026-02-20T10:10:00Z",
    "retry_after_seconds": 30
  },
  "timestamp": "2026-02-20T10:10:00Z"
}
```

---

## Image Serving Strategy

### Phase 1: Base64 Inline (No Additional Endpoint Needed)

When `image_data` is present in evidence responses, render directly:
```
<img src="data:image/jpeg;base64,{image_data}" />
```

### Phase 2: Image Proxy (Requires PiOrchestrator Enhancement)

When `image_data` is absent but `object_key` is present:
```
GET /api/v1/evidence/image?key={object_key}
→ PiOrchestrator fetches from MinIO and returns image bytes
→ Content-Type: image/jpeg
```

This ensures the browser never makes direct MinIO LAN requests.

### Dashboard URL Mapping

**Current dashboard paths**:
- `/dashboard/diagnostics/sessions/{id}/evidence`
- `/dashboard/diagnostics/images/presign`

**Required updates**:
- `/v1/sessions/{id}/evidence`
- `/v1/sessions/{id}/evidence/pair` (new, use for before/after view)
- `/v1/evidence/image?key={key}` (new, for S3-stored images — requires PiOrchestrator handoff)
