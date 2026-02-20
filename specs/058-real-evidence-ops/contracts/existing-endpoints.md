# API Contracts: 058-real-evidence-ops

**Date**: 2026-02-19

## Overview

This feature does **not introduce new API endpoints** on the PiDashboard side. It hardens the frontend's consumption of existing endpoints. A backend handoff is required for one new endpoint (image proxy) on PiOrchestrator.

## Existing Endpoints Consumed (no changes)

### GET /dashboard/diagnostics/sessions

List sessions with optional status filter.

**Query params**: `?status=active|completed|cancelled&limit=20`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "sess-abc123",
      "delivery_id": "del-xyz",
      "started_at": "2026-02-19T10:00:00Z",
      "completed_at": null,
      "status": "active",
      "capture_count": 3,
      "cameras": ["espcam-001122", "espcam-334455"]
    }
  ]
}
```

**Error responses**: 404 (feature unavailable), 503 (service down), 500 (internal error)

**Frontend handling changes** (this feature):
- Add `isFeatureUnavailable()` check (currently missing in SessionListView)
- Replace generic error message with actionable text

---

### GET /dashboard/diagnostics/sessions/:sessionId

Fetch single session detail.

**Response** (200): Same shape as list item with full detail.

**Error responses**: 404 (session not found or feature unavailable), 500.

**Frontend handling changes**: None (already handled in SessionDetailView).

---

### GET /dashboard/diagnostics/sessions/:sessionId/evidence

List evidence captures for a session.

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "ev-001",
      "session_id": "sess-abc123",
      "captured_at": "2026-02-19T10:05:00Z",
      "camera_id": "espcam-001122",
      "thumbnail_url": "http://192.168.1.124:9000/evidence/sess-abc123/espcam-001122/thumb.jpg?X-Amz-...",
      "full_url": "http://192.168.1.124:9000/evidence/sess-abc123/espcam-001122/full.jpg?X-Amz-...",
      "expires_at": "2026-02-19T10:20:00Z",
      "size_bytes": 45321,
      "content_type": "image/jpeg"
    }
  ]
}
```

**Frontend handling changes** (this feature):
- Wire auto-refresh on image load failure (extract object key → call presign → retry)
- Add per-image loading/error/retry states

---

### GET /dashboard/diagnostics/images/presign

Refresh a presigned URL for a MinIO object.

**Query params**: `?key=evidence/sess-abc123/espcam-001122/thumb.jpg&expiresIn=900`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "url": "http://192.168.1.124:9000/evidence/...?X-Amz-Credential=...&X-Amz-Expires=900&X-Amz-Signature=...",
    "expires_at": "2026-02-19T10:35:00Z"
  }
}
```

**Error responses**: 404 (object not found or feature unavailable), 500.

**Frontend handling changes** (this feature):
- Called automatically on image load failure (auto-refresh flow)
- Called on manual "Retry" button click

---

### GET /v1/cameras/:cameraId/diagnostics

Camera health and diagnostics.

**Response** (200):
```json
{
  "success": true,
  "data": {
    "camera_id": "espcam-001122",
    "name": "Camera 1",
    "status": "online",
    "last_seen": "2026-02-19T10:12:00Z",
    "health": { "heap": 150000, "wifi_rssi": -55, "uptime": 86400 },
    "diagnostics": {
      "connection_quality": "good",
      "error_count": 0,
      "firmware_version": "2.1.0"
    }
  }
}
```

**Frontend handling changes**: None (CameraHealthDashboard already uses `isFeatureUnavailable()`).

---

## Backend Handoff: Image Proxy Endpoint (NEW — PiOrchestrator)

### GET /api/dashboard/diagnostics/images/:objectKey

Proxy endpoint that fetches an object from MinIO and streams bytes to the client. Required for Tailscale Funnel access where MinIO is not directly reachable.

**Path param**: `objectKey` — URL-encoded MinIO object path (e.g., `evidence%2Fsess-abc%2Fthumbnail.jpg`)

**Response** (200):
- `Content-Type`: from MinIO object metadata (e.g., `image/jpeg`)
- `Content-Length`: from MinIO object metadata
- `Cache-Control`: `public, max-age=300` (5 minutes)
- Body: raw image bytes streamed from MinIO

**Error responses**:
- 404: Object not found in MinIO
- 502: MinIO unreachable
- 500: Internal error

**Alternative approach**: Instead of a separate proxy endpoint, PiOrchestrator could detect Funnel requests (via `X-Forwarded-For` or Tailscale headers) and return proxy-routed presigned URLs in the evidence list response. Either approach satisfies the spec.

**Handoff status**: Pending — must be created via `/handoff-generate`.
