# API Contract: Session Diagnostics

**Source**: PiOrchestrator `SessionDiagnosticsHandler`
**Dashboard Port**: 8082 (config UI, no API key)

## GET /api/v1/diagnostics/sessions

List all sessions with optional filtering.

### Request

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | query, int | 50 | Max sessions to return (max 100) |

### Response (200 OK)

```json
{
  "success": true,
  "status": "success",
  "data": {
    "sessions": [
      {
        "session_id": "sess-abc123",
        "container_id": "ctr-001",
        "started_at": "2026-02-20T10:00:00Z",
        "status": "complete",
        "total_captures": 4,
        "successful_captures": 4,
        "failed_captures": 0,
        "has_before_open": true,
        "has_after_close": true,
        "pair_complete": true,
        "elapsed_seconds": 120
      },
      {
        "session_id": "sess-def456",
        "container_id": "ctr-002",
        "started_at": "2026-02-20T10:05:00Z",
        "status": "failed",
        "total_captures": 2,
        "successful_captures": 0,
        "failed_captures": 2,
        "has_before_open": false,
        "has_after_close": false,
        "pair_complete": false,
        "last_error": {
          "phase": "BEFORE_OPEN",
          "failure_reason": "Camera timeout after 30s",
          "device_id": "espcam-a1b2c3",
          "occurred_at": "2026-02-20T10:05:15Z",
          "correlation_id": "corr-789xyz"
        },
        "elapsed_seconds": 300
      }
    ],
    "total": 2,
    "queried_at": "2026-02-20T10:10:00Z"
  },
  "timestamp": "2026-02-20T10:10:00Z"
}
```

### Error Responses

| Status | Condition | Dashboard Behavior |
|--------|-----------|-------------------|
| 404 | Endpoint not registered | Graceful degradation (empty list) |
| 503 | Service unavailable | Graceful degradation (empty list) |
| 500 | Internal error | Show error with Retry button |

---

## Dashboard URL Mapping

The dashboard API client uses `BASE_URL = '/api'`. Requests flow:

```
Dashboard: GET /api/v1/diagnostics/sessions
  ↓ (Vite proxy in dev OR same-origin in prod)
PiOrchestrator port 8082: /api/v1/diagnostics/sessions
```

**Current dashboard path**: `/dashboard/diagnostics/sessions`
**Required update**: `/v1/diagnostics/sessions`

This requires PiOrchestrator to register V1 diagnostics routes on the config UI server (port 8082) without API key authentication, matching the pattern already used by `/api/v1/dashboard/diagnostics/system` and `/api/v1/dashboard/diagnostics/cameras`.
