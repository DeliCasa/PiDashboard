# API Contract Snapshot: Inventory Delta

**Feature**: 052-delta-viewer-e2e
**Date**: 2026-02-16
**Purpose**: Single-page reference documenting the BridgeServer inventory delta contract as consumed by PiDashboard, including known transformation gaps.

---

## Endpoints

| Endpoint | Method | Description | PiDashboard Client |
|----------|--------|-------------|-------------------|
| `/api/v1/containers/{containerId}/inventory/latest` | GET | Latest analysis for a container | `inventoryDeltaApi.getLatest()` |
| `/api/v1/sessions/{sessionId}/inventory-delta` | GET | Analysis by session ID | `inventoryDeltaApi.getBySession()` |
| `/api/v1/containers/{containerId}/inventory/runs` | GET | Paginated run list | `inventoryDeltaApi.getRuns()` |
| `/api/v1/inventory/{runId}/review` | POST | Submit review | `inventoryDeltaApi.submitReview()` |

## Success Response Envelope

```
{
  "success": true,
  "data": { <InventoryAnalysisRun> },
  "timestamp": "2026-02-16T10:30:00Z",   // optional
  "request_id": "req_xxx"                 // optional
}
```

## Error Response Envelope

```
{
  "success": false,
  "error": {
    "code": "<ERROR_CODE>",
    "message": "Human-readable message",
    "retryable": true|false,              // optional
    "retry_after_seconds": 30             // optional
  },
  "timestamp": "2026-02-16T10:30:00Z"    // optional
}
```

## Error Codes

| HTTP | Code | Meaning | Retryable |
|------|------|---------|-----------|
| 404 | `INVENTORY_NOT_FOUND` | No analysis exists for this session/container | No |
| 404 | `CONTAINER_NOT_FOUND` | Container ID not recognized | No |
| 409 | `REVIEW_CONFLICT` | Run already reviewed | No |
| 400 | `REVIEW_INVALID` | Invalid review data | No |
| 503 | `SERVICE_UNAVAILABLE` | Feature not configured/available | Yes (with retry_after) |
| 500 | `INTERNAL_ERROR` | Server error | Yes |

## Analysis Status Enum

| Value | Terminal | PiDashboard Behavior |
|-------|----------|---------------------|
| `pending` | No | Show loading skeleton, poll every 15s |
| `processing` | No | Show spinner with "Analysis in progress", poll |
| `done` | Yes | Show full delta table + evidence |
| `needs_review` | No | Show delta table + review form, poll |
| `error` | Yes | Show error message + retry button |

## Delta Field — Dual Format

The `delta` field in `InventoryAnalysisRun.data` is a **union type**:

### Format A: Flat DeltaItem[] (BridgeServer v1.0)

```json
[
  {
    "name": "Coca-Cola",
    "change": -2,
    "before_count": 5,
    "after_count": 3,
    "confidence": 0.92,
    "reason": "Items removed during session",
    "sku": "SKU-001"
  }
]
```

### Format B: CategorizedDelta (BridgeServer v2.0+)

```json
{
  "added": [
    { "name": "Fanta", "qty": 2, "confidence": 0.88, "bbox": null }
  ],
  "removed": [
    { "name": "Coca-Cola", "qty": 2, "confidence": 0.95, "bbox": null }
  ],
  "changed_qty": [
    { "name": "Sprite", "from_qty": 3, "to_qty": 1, "confidence": 0.85 }
  ],
  "unknown": [
    { "note": "Unidentified item near bottom shelf", "confidence": 0.35 }
  ]
}
```

### Format Detection

- If `delta` is an **array** → Format A (flat)
- If `delta` is an **object with `added` key** → Format B (categorized)
- If `delta` is `null` → no delta available (pending/error states)

## Field Mapping: BridgeServer → PiOrchestrator → PiDashboard

PiOrchestrator normalizes BridgeServer camelCase responses to snake_case Go JSON tags.

| BridgeServer Field | Expected PiOrchestrator Output | PiDashboard Schema Field |
|-------------------|-------------------------------|-------------------------|
| `id` | `run_id` | `run_id` |
| `sessionId` | `session_id` | `session_id` |
| `status` | `status` | `status` (enum) |
| `items_before[].count` | `items_before[].quantity` | `quantity` |
| `items_before[].bounding_boxes` | `items_before[].bounding_box` | `bounding_box` (single) |
| `delta[].reason` | `delta[].rationale` | `rationale` |
| `overall_confidence` | `overall_confidence` | (not in schema — passthrough OK) |
| `error_code` | `error_code` | (not in schema — passthrough OK) |
| `cv_diff_metadata` | `cv_diff_metadata` | (not in schema — passthrough OK) |
| `review.reviewerId` | `review.reviewer_id` | `reviewer_id` |
| `review.createdAt` | `review.reviewed_at` | `reviewed_at` |
| `createdAt` | `metadata.created_at` | `created_at` |
| `completedAt` | `metadata.completed_at` | `completed_at` |
| `provider` | `metadata.provider` | `provider` |
| `processing_time_ms` | `metadata.processing_time_ms` | `processing_time_ms` |
| `error_message` | `metadata.error_message` | `error_message` |

## Run List Response (GET /runs)

```
{
  "success": true,
  "data": {
    "runs": [ <RunListItem>, ... ],
    "pagination": {
      "total": 42,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
  }
}
```

### RunListItem

| Field | Type | Description |
|-------|------|-------------|
| `run_id` | string | Analysis run ID |
| `session_id` | string | Session ID |
| `container_id` | string | Container ID |
| `status` | AnalysisStatus | Run status |
| `delta_summary` | DeltaSummary \| null | Aggregate counts (null for non-terminal) |
| `metadata` | AnalysisMetadata | Provider, timing info |

### DeltaSummary

| Field | Type | Description |
|-------|------|-------------|
| `total_items` | int >= 0 | Total items observed |
| `items_changed` | int >= 0 | Items with quantity change |
| `items_added` | int >= 0 | New items |
| `items_removed` | int >= 0 | Fully removed items |

## Review Request (POST /review)

```json
{
  "action": "approve" | "override",
  "corrections": [
    {
      "name": "Coca-Cola",
      "sku": null,
      "original_count": 5,
      "corrected_count": 4,
      "added": false,
      "removed": false
    }
  ],
  "notes": "Adjusted Coca-Cola count"
}
```

## Review Response

```json
{
  "success": true,
  "data": {
    "run_id": "iar_xxx",
    "status": "done",
    "review": {
      "reviewer_id": "reviewer-1",
      "action": "override",
      "corrections": [...],
      "notes": "...",
      "reviewed_at": "2026-02-16T12:00:00Z"
    }
  }
}
```
