# API Contract: Live E2E Inventory Delta Display

**Feature**: 051-inventory-delta-e2e-verify
**Date**: 2026-02-15 (updated from 2026-02-12)
**Source**: PiDashboard → PiOrchestrator (proxy) → BridgeServer

## Critical Changes from Original Audit

1. **Status enum aligned**: `pending`, `processing`, `done`, `needs_review`, `error` (was: `pending`, `completed`, `needs_review`, `approved`, `failed`)
2. **`correlation_id` removed**: Not in BridgeServer inventory schema
3. **Endpoint #3 not implemented**: `GET /v1/containers/:id/inventory/runs` does not exist in BridgeServer yet

## Endpoint Summary

| # | Method | Path | Purpose | Polling | BridgeServer |
|---|--------|------|---------|---------|---|
| 1 | GET | `/v1/containers/:containerId/inventory/latest` | Latest analysis for a container | 15s (non-terminal) | Implemented |
| 2 | GET | `/v1/sessions/:sessionId/inventory-delta` | Analysis by session ID | No (stale after 10s) | Implemented |
| 3 | GET | `/v1/containers/:containerId/inventory/runs` | Paginated run list | 30s (non-terminal) | **NOT IMPLEMENTED** |
| 4 | POST | `/v1/inventory/:runId/review` | Submit human review | N/A (mutation) | Implemented |

All paths are relative to PiOrchestrator config UI on port 8082 (`/api/v1/...` after proxy prefix).

## Status Enum (REVISED)

```
BridgeServer value → Display label → Badge variant → Terminal?
──────────────────────────────────────────────────────────────
pending           → "Queued"        → secondary    → No
processing        → "Running"       → secondary    → No
done              → "Completed"     → default      → Yes
done + review     → "Approved"      → default      → Yes (derived)
needs_review      → "Needs Review"  → outline      → No
error             → "Failed"        → destructive  → Yes
```

**"Approved" derivation**: When `status === 'done'` AND `review !== null`, display as "Approved". The backend does not have a separate `approved` status.

**Polling stops** when status is terminal: `done` or `error`.

---

## 1. GET /v1/containers/:containerId/inventory/latest

**Purpose**: Fetch the most recent inventory analysis run for a given container.

**Path params**: `containerId` (opaque string, URL-encoded)

**Success response** (200):
```json
{
  "success": true,
  "data": {
    "run_id": "iar_01JMAB1234567890ABCDEF",
    "session_id": "sess-s1s2s3s4-e5f6-7890-abcd-ef1234567890",
    "container_id": "ctr-c1c2c3c4-e5f6-7890-abcd-ef1234567890",
    "status": "needs_review",
    "items_before": [{ "name": "Coca-Cola 330ml", "sku": "CC330", "quantity": 5, "confidence": 0.95, "bounding_box": {"x":10,"y":20,"width":50,"height":80}, "condition": "good" }],
    "items_after": [{ "name": "Coca-Cola 330ml", "sku": "CC330", "quantity": 3, "confidence": 0.92, "bounding_box": {"x":10,"y":20,"width":50,"height":80}, "condition": "good" }],
    "delta": [{ "name": "Coca-Cola 330ml", "sku": "CC330", "before_count": 5, "after_count": 3, "change": -2, "confidence": 0.92, "rationale": "Two cans removed from shelf" }],
    "evidence": {
      "before_image_url": "https://storage.example.com/images/before-abc123.jpg?token=xyz",
      "after_image_url": "https://storage.example.com/images/after-abc123.jpg?token=xyz",
      "overlays": {
        "before": [{ "label": "Coca-Cola 330ml (5)", "bounding_box": {"x":10,"y":20,"width":50,"height":80}, "confidence": 0.95 }],
        "after": [{ "label": "Coca-Cola 330ml (3)", "bounding_box": {"x":10,"y":20,"width":50,"height":80}, "confidence": 0.92 }]
      }
    },
    "review": null,
    "metadata": { "provider": "openai", "processing_time_ms": 4200, "model_version": "gpt-4o-2024-08-06", "created_at": "2026-02-09T11:59:00Z", "completed_at": "2026-02-09T11:59:04Z" }
  },
  "timestamp": "2026-02-09T12:00:00Z",
  "request_id": "req-uuid-123"
}
```

**Error responses**:
| Status | Code | Meaning |
|--------|------|---------|
| 404 | `INVENTORY_NOT_FOUND` | No analysis exists for this container |
| 503 | `SERVICE_UNAVAILABLE` | Backend unreachable (retryable) |

**Client behavior**: Returns `null` on 404. Throws `V1ApiError` on 503. Polls every 15s while status is non-terminal (i.e., not in `{done, error}`).

---

## 2. GET /v1/sessions/:sessionId/inventory-delta

**Purpose**: Fetch the full analysis run by session ID (cross-container lookup).

**Path params**: `sessionId` (opaque string, URL-encoded)

**Success response**: Same `InventoryAnalysisRun` shape as endpoint 1.

**Error responses**: Same as endpoint 1 (404 → null, 503 → throw).

**Client behavior**: One-shot fetch, stale after 10s, no polling.

---

## 3. GET /v1/containers/:containerId/inventory/runs

> **WARNING: NOT IMPLEMENTED in BridgeServer.** PiDashboard has UI and hooks for this endpoint but BridgeServer only implements `findLatestByContainerId` (singular). The run list will show "service temporarily unavailable" when used against a real backend.

**Purpose**: Paginated list of all analysis runs for a container.

**Path params**: `containerId` (opaque string)

**Query params**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 20 | Page size |
| `offset` | number | 0 | Pagination offset |
| `status` | enum | (none) | Filter: `pending\|processing\|done\|needs_review\|error` |

**Success response** (200):
```json
{
  "success": true,
  "data": {
    "runs": [
      {
        "run_id": "iar_01JMAB1234567890ABCDEF",
        "session_id": "sess-aaa11111-1111-1111-1111-111111111111",
        "container_id": "ctr-c1c2c3c4-e5f6-7890-abcd-ef1234567890",
        "status": "done",
        "delta_summary": { "total_items": 5, "items_changed": 2, "items_added": 0, "items_removed": 0 },
        "metadata": { "provider": "openai", "processing_time_ms": 4200, "created_at": "2026-02-09T11:59:00Z", "completed_at": "2026-02-09T11:59:04Z" }
      }
    ],
    "pagination": { "total": 42, "limit": 20, "offset": 0, "has_more": true }
  },
  "timestamp": "2026-02-09T12:00:00Z"
}
```

**Client behavior**: Returns `null` on 404. Polls every 30s while any run has non-terminal status.

---

## 4. POST /v1/inventory/:runId/review

**Purpose**: Submit human review (approve or override with corrections).

**Path params**: `runId` (opaque string)

**Request body (approve)**:
```json
{ "action": "approve", "corrections": [], "notes": "" }
```

**Request body (override)**:
```json
{
  "action": "override",
  "corrections": [
    { "name": "Coca-Cola 330ml", "sku": "CC330", "original_count": 3, "corrected_count": 4 },
    { "name": "Water 500ml", "sku": null, "original_count": 0, "corrected_count": 2, "added": true },
    { "name": "False Positive", "sku": null, "original_count": 1, "corrected_count": 0, "removed": true }
  ],
  "notes": "Adjusted counts and removed false detection."
}
```

**Success response** (200):
```json
{
  "success": true,
  "data": { "run_id": "...", "status": "done", "review": { "reviewer_id": "operator-1", "action": "override", "corrections": [...], "notes": "...", "reviewed_at": "2026-02-09T12:05:00Z" } }
}
```

Note: The `status` in the review response is `done` (not `approved`). "Approved" is a client-side display derivation.

**Error responses**:
| Status | Code | Meaning |
|--------|------|---------|
| 409 | `REVIEW_CONFLICT` | Already reviewed by another operator |
| 400 | `REVIEW_INVALID` | Bad corrections payload |

**Client behavior**: On success, invalidates all inventory query keys. On 409, shows conflict UI with refresh option.

---

## Zod Validation

All responses are validated client-side via Zod schemas in `src/infrastructure/api/inventory-delta-schemas.ts`. Resilient fallback: if envelope validation fails but `data` field parses correctly, data is extracted directly.

## Polling Rules Summary

| Endpoint | Interval | Stops When |
|---|---|---|
| Latest analysis | 15s | Status is `done` or `error`, or feature unavailable (404/503) |
| Run list | 30s | All visible runs are `done` or `error`, or feature unavailable |
| Session delta | No polling | One-shot fetch, stale after 10s |
| Review | N/A | Mutation, no polling |

## Test IDs Used in Fixtures

| Fixture ID | Entity |
|------------|--------|
| `run-a1b2c3d4-e5f6-7890-abcd-ef1234567890` | Primary run ID |
| `sess-s1s2s3s4-e5f6-7890-abcd-ef1234567890` | Primary session ID |
| `ctr-c1c2c3c4-e5f6-7890-abcd-ef1234567890` | Primary container ID |
| `run-done-001` through `run-error-005` | Run list items (updated from old naming) |
| `sess-aaa11111-...` through `sess-fff66666-...` | Session IDs for run list |

## Fields NOT in Contract

| Field | Reason | Alternative |
|---|---|---|
| `correlation_id` | Not in BridgeServer `inventoryAnalysisRuns` schema | Use `run_id` for tracing |
| `approved` status | Not a BridgeServer status value | Derive from `done` + non-null `review` |
