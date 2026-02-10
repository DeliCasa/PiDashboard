# API Contract: Inventory Runs List

**Feature**: 048-inventory-review
**Date**: 2026-02-09
**Backend**: BridgeServer (proxied through PiOrchestrator)
**Dependency**: Extends 047-inventory-delta-viewer API contract

## Base Path

All endpoints are prefixed with `/api/v1` (PiOrchestrator proxy prepends `/api`).

---

## GET /v1/containers/:containerId/inventory/runs

List all inventory analysis runs for a container, ordered newest-first, with pagination.

### Request

| Parameter | In | Type | Required | Default | Description |
|-----------|----|----|----------|---------|-------------|
| `containerId` | path | string (UUID) | Yes | — | Opaque container ID |
| `limit` | query | integer | No | 20 | Page size (1-100) |
| `offset` | query | integer | No | 0 | Pagination offset |
| `status` | query | string | No | (all) | Filter by status: pending, completed, needs_review, approved, failed |

### Response: 200 OK (with results)

```json
{
  "success": true,
  "data": {
    "runs": [
      {
        "run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "session_id": "s1s2s3s4-e5f6-7890-abcd-ef1234567890",
        "container_id": "c1c2c3c4-e5f6-7890-abcd-ef1234567890",
        "status": "approved",
        "delta_summary": {
          "total_items": 5,
          "items_changed": 2,
          "items_added": 0,
          "items_removed": 0
        },
        "metadata": {
          "provider": "openai",
          "processing_time_ms": 4200,
          "model_version": "gpt-4o-2024-08-06",
          "created_at": "2026-02-09T11:59:00Z",
          "completed_at": "2026-02-09T11:59:04Z"
        }
      },
      {
        "run_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "session_id": "t2t3t4t5-f6a7-8901-bcde-f12345678901",
        "container_id": "c1c2c3c4-e5f6-7890-abcd-ef1234567890",
        "status": "needs_review",
        "delta_summary": {
          "total_items": 8,
          "items_changed": 3,
          "items_added": 1,
          "items_removed": 0
        },
        "metadata": {
          "provider": "openai",
          "processing_time_ms": 5100,
          "model_version": "gpt-4o-2024-08-06",
          "created_at": "2026-02-09T10:30:00Z",
          "completed_at": "2026-02-09T10:30:05Z"
        }
      }
    ],
    "pagination": {
      "total": 42,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
  },
  "timestamp": "2026-02-09T12:00:00Z",
  "request_id": "req-uuid-456"
}
```

### Response: 200 OK (empty - no runs for this container)

```json
{
  "success": true,
  "data": {
    "runs": [],
    "pagination": {
      "total": 0,
      "limit": 20,
      "offset": 0,
      "has_more": false
    }
  },
  "timestamp": "2026-02-09T12:00:00Z"
}
```

### Response: 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "CONTAINER_NOT_FOUND",
    "message": "Container not found.",
    "retryable": false
  },
  "timestamp": "2026-02-09T12:00:00Z"
}
```

### Response: 503 Service Unavailable

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Inventory analysis service is temporarily unavailable.",
    "retryable": true,
    "retry_after_seconds": 30
  },
  "timestamp": "2026-02-09T12:00:00Z"
}
```

---

## Existing Endpoints (from 047, unchanged)

These endpoints continue to serve individual run detail and review submission:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/containers/:containerId/inventory/latest` | GET | Latest single run (used when no run selected) |
| `/v1/sessions/:sessionId/inventory-delta` | GET | Single run by session ID (used for session lookup) |
| `/v1/inventory/:runId/review` | POST | Submit review for a run |

---

## New Zod Schemas (PiDashboard)

```typescript
// Added to src/infrastructure/api/inventory-delta-schemas.ts

// --- Run List Summary ---

export const DeltaSummarySchema = z.object({
  total_items: z.number().nonnegative(),
  items_changed: z.number().nonnegative(),
  items_added: z.number().nonnegative(),
  items_removed: z.number().nonnegative(),
});
export type DeltaSummary = z.infer<typeof DeltaSummarySchema>;

export const RunListItemSchema = z.object({
  run_id: z.string().min(1),
  session_id: z.string().min(1),
  container_id: z.string().min(1),
  status: AnalysisStatusSchema,
  delta_summary: DeltaSummarySchema.nullable().optional(),
  metadata: AnalysisMetadataSchema,
});
export type RunListItem = z.infer<typeof RunListItemSchema>;

// --- Pagination ---

export const InventoryPaginationSchema = z.object({
  total: z.number().nonnegative(),
  limit: z.number().positive(),
  offset: z.number().nonnegative(),
  has_more: z.boolean(),
});
export type InventoryPagination = z.infer<typeof InventoryPaginationSchema>;

// --- Run List Response ---

export const RunListDataSchema = z.object({
  runs: z.array(RunListItemSchema),
  pagination: InventoryPaginationSchema,
});
export type RunListData = z.infer<typeof RunListDataSchema>;

export const RunListResponseSchema = z.object({
  success: z.boolean(),
  data: RunListDataSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
    retry_after_seconds: z.number().optional(),
  }).optional(),
  timestamp: z.string().optional(),
  request_id: z.string().optional(),
});
export type RunListResponse = z.infer<typeof RunListResponseSchema>;

// --- Query Filters (frontend-only) ---

export interface RunListFilters {
  limit?: number;
  offset?: number;
  status?: AnalysisStatus;
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `CONTAINER_NOT_FOUND` | 404 | Container ID does not exist |
| `SERVICE_UNAVAILABLE` | 503 | Inventory analysis backend unreachable |

All other error codes from the 047 contract remain unchanged.
