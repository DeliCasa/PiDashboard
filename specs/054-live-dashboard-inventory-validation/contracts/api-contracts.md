# API Contracts: Live Dashboard Inventory Validation

**Feature**: 054-live-dashboard-inventory-validation
**Date**: 2026-02-17

## Overview

This feature consumes existing API endpoints — no new endpoints are introduced. This document specifies the exact requests the preflight and live tests make against the real backend, and the expected response shapes.

All endpoints are routed through PiOrchestrator (`/api/...`) which proxies to BridgeServer for inventory data.

## Preflight Endpoints

### GET /api/v1/containers

**Purpose**: Verify backend reachability and discover available containers.

**Request**:
```
GET /api/v1/containers
Accept: application/json
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "containers": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "label": "Kitchen Fridge",
        "created_at": "2026-02-01T00:00:00Z",
        "updated_at": "2026-02-17T12:00:00Z",
        "cameras": [],
        "camera_count": 0,
        "online_count": 0
      }
    ],
    "total": 1
  },
  "correlation_id": "...",
  "timestamp": "2026-02-17T12:00:00Z"
}
```

**Preflight interpretation**:
- 200 + `data.containers.length > 0` → proceed
- 200 + `data.containers.length === 0` → SKIP "No containers found"
- 404 → SKIP "Containers API not available (404)"
- 503 → SKIP "Backend returned 503 — service unavailable"
- Connection refused → SKIP "Backend unreachable at [URL]"

### GET /api/v1/containers/{containerId}/inventory/latest

**Purpose**: Verify inventory data exists for a container.

**Request**:
```
GET /api/v1/containers/550e8400-e29b-41d4-a716-446655440001/inventory/latest
Accept: application/json
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "run_id": "run-001",
    "session_id": "sess-001",
    "container_id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "needs_review",
    "items_before": [...],
    "items_after": [...],
    "delta": [...],
    "delta_summary": {
      "total_items": 5,
      "items_changed": 2,
      "items_added": 1,
      "items_removed": 0
    },
    "analysis_metadata": {...},
    "evidence_images": {...},
    "review": null,
    "created_at": "2026-02-17T11:00:00Z",
    "updated_at": "2026-02-17T11:30:00Z"
  },
  "correlation_id": "...",
  "timestamp": "2026-02-17T12:00:00Z"
}
```

**Preflight interpretation**:
- 200 + valid run → proceed (record `containerId` and `status`)
- 200 + `status` in `['needs_review', 'done']` and `review === null` → reviewable
- 404 → SKIP "No inventory data for container [ID]"

## Live Test Endpoints

### POST /api/v1/inventory/{runId}/review

**Purpose**: Submit a correction or approve-as-is.

**Request (correction)**:
```json
{
  "action": "override",
  "corrections": [
    {
      "item_name": "Coca-Cola 330ml",
      "original_count": 3,
      "corrected_count": 5,
      "added": false,
      "removed": false
    }
  ],
  "notes": "Live validation test correction"
}
```

**Request (approve)**:
```json
{
  "action": "approve",
  "corrections": [],
  "notes": ""
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "run_id": "run-001",
    "review": {
      "action": "override",
      "corrections": [...],
      "notes": "Live validation test correction",
      "reviewed_at": "2026-02-17T12:05:00Z"
    }
  },
  "correlation_id": "...",
  "timestamp": "2026-02-17T12:05:00Z"
}
```

**Conflict Response** (409):
```json
{
  "success": false,
  "error": {
    "code": "REVIEW_CONFLICT",
    "message": "Run has already been reviewed"
  },
  "correlation_id": "...",
  "timestamp": "2026-02-17T12:05:00Z"
}
```

**Live test handling**:
- 200 → verify audit trail renders with correction details
- 409 → SKIP "Delta already reviewed — re-run with fresh data"

## Zod Schemas (Existing)

All response schemas are defined in `src/infrastructure/api/inventory-delta-schemas.ts`:

| Schema | Validates |
|--------|-----------|
| `InventoryLatestResponseSchema` | GET /inventory/latest envelope |
| `InventoryAnalysisRunSchema` | Single analysis run |
| `AnalysisStatusSchema` | Status enum |
| `DeltaEntrySchema` | v1.0 delta entry |
| `CategorizedDeltaSchema` | v2.0 categorized delta |
| `ReviewSchema` | Review with corrections |
| `SubmitReviewRequestSchema` | POST review request body |
| `ReviewResponseSchema` | POST review response envelope |

No new schemas needed — live tests exercise the UI which internally validates via these schemas.
