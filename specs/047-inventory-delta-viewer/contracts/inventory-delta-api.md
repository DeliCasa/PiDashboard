# API Contract: Inventory Delta Viewer

**Feature**: 047-inventory-delta-viewer
**Date**: 2026-02-09
**Backend**: BridgeServer (proxied through PiOrchestrator)

## Base Path

All endpoints are prefixed with `/api/v1` (PiOrchestrator proxy prepends `/api`).

---

## GET /v1/containers/:containerId/inventory/latest

Retrieve the most recent inventory analysis for a container.

### Request

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `containerId` | path | string (UUID) | Yes | Opaque container ID |

### Response: 200 OK (completed analysis)

```json
{
  "success": true,
  "data": {
    "run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "session_id": "s1s2s3s4-e5f6-7890-abcd-ef1234567890",
    "container_id": "c1c2c3c4-e5f6-7890-abcd-ef1234567890",
    "status": "needs_review",
    "items_before": [
      {
        "name": "Coca-Cola 330ml",
        "sku": "CC330",
        "quantity": 5,
        "confidence": 0.95,
        "bounding_box": { "x": 10, "y": 20, "width": 50, "height": 80 },
        "condition": "good"
      },
      {
        "name": "Sprite 330ml",
        "sku": "SP330",
        "quantity": 3,
        "confidence": 0.88
      }
    ],
    "items_after": [
      {
        "name": "Coca-Cola 330ml",
        "sku": "CC330",
        "quantity": 3,
        "confidence": 0.92,
        "bounding_box": { "x": 10, "y": 20, "width": 50, "height": 80 },
        "condition": "good"
      },
      {
        "name": "Sprite 330ml",
        "sku": "SP330",
        "quantity": 3,
        "confidence": 0.90
      }
    ],
    "delta": [
      {
        "name": "Coca-Cola 330ml",
        "sku": "CC330",
        "before_count": 5,
        "after_count": 3,
        "change": -2,
        "confidence": 0.92,
        "rationale": "Two cans removed from shelf"
      },
      {
        "name": "Sprite 330ml",
        "sku": "SP330",
        "before_count": 3,
        "after_count": 3,
        "change": 0,
        "confidence": 0.90,
        "rationale": "No change detected"
      }
    ],
    "evidence": {
      "before_image_url": "https://storage.example.com/images/before-abc123.jpg?token=xyz",
      "after_image_url": "https://storage.example.com/images/after-abc123.jpg?token=xyz",
      "overlays": {
        "before": [
          { "label": "Coca-Cola 330ml (5)", "bounding_box": { "x": 10, "y": 20, "width": 50, "height": 80 }, "confidence": 0.95 }
        ],
        "after": [
          { "label": "Coca-Cola 330ml (3)", "bounding_box": { "x": 10, "y": 20, "width": 50, "height": 80 }, "confidence": 0.92 }
        ]
      }
    },
    "review": null,
    "metadata": {
      "provider": "openai",
      "processing_time_ms": 4200,
      "model_version": "gpt-4o-2024-08-06",
      "created_at": "2026-02-09T11:59:00Z",
      "completed_at": "2026-02-09T11:59:04Z"
    }
  },
  "timestamp": "2026-02-09T12:00:00Z",
  "request_id": "req-uuid-123"
}
```

### Response: 200 OK (pending analysis)

```json
{
  "success": true,
  "data": {
    "run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "session_id": "s1s2s3s4-e5f6-7890-abcd-ef1234567890",
    "container_id": "c1c2c3c4-e5f6-7890-abcd-ef1234567890",
    "status": "pending",
    "items_before": null,
    "items_after": null,
    "delta": null,
    "evidence": null,
    "review": null,
    "metadata": {
      "provider": "openai",
      "created_at": "2026-02-09T11:59:00Z"
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
    "code": "INVENTORY_NOT_FOUND",
    "message": "No inventory analysis found for this container.",
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

## GET /v1/sessions/:sessionId/inventory-delta

Retrieve the inventory delta for a specific session.

### Request

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `sessionId` | path | string (UUID) | Yes | Session identifier |

### Response: 200 OK

Same shape as `GET /v1/containers/:id/inventory/latest` `data` payload.

### Response: 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "INVENTORY_NOT_FOUND",
    "message": "No inventory analysis found for this session.",
    "retryable": false
  }
}
```

---

## POST /v1/inventory/:runId/review

Submit a human review for an analysis run.

### Request

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `runId` | path | string (UUID) | Yes | Analysis run ID |

### Request Body

```json
{
  "action": "override",
  "corrections": [
    {
      "name": "Coca-Cola 330ml",
      "sku": "CC330",
      "original_count": 3,
      "corrected_count": 4
    },
    {
      "name": "Water 500ml",
      "sku": null,
      "original_count": 0,
      "corrected_count": 2,
      "added": true
    },
    {
      "name": "False Positive Item",
      "sku": null,
      "original_count": 1,
      "corrected_count": 0,
      "removed": true
    }
  ],
  "notes": "Adjusted Coca-Cola count, added missed Water bottles, removed false detection."
}
```

### Request Body (approve only)

```json
{
  "action": "approve",
  "corrections": [],
  "notes": ""
}
```

### Response: 200 OK

```json
{
  "success": true,
  "data": {
    "run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "approved",
    "review": {
      "reviewer_id": "operator-1",
      "action": "override",
      "corrections": [ /* ... same as request */ ],
      "notes": "Adjusted Coca-Cola count...",
      "reviewed_at": "2026-02-09T12:05:00Z"
    }
  },
  "timestamp": "2026-02-09T12:05:00Z"
}
```

### Response: 409 Conflict

```json
{
  "success": false,
  "error": {
    "code": "REVIEW_CONFLICT",
    "message": "This analysis run has already been reviewed.",
    "retryable": false
  }
}
```

### Response: 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "REVIEW_INVALID",
    "message": "Review data is invalid. Check corrections.",
    "retryable": false
  }
}
```

---

## Zod Schema Design (PiDashboard)

```typescript
// src/infrastructure/api/inventory-delta-schemas.ts

import { z } from 'zod';

// --- Enums ---

export const AnalysisStatusSchema = z.enum([
  'pending',
  'completed',
  'needs_review',
  'approved',
  'failed',
]);
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

export const ItemConditionSchema = z.enum([
  'excellent', 'good', 'fair', 'poor', 'expired', 'unknown',
]);
export type ItemCondition = z.infer<typeof ItemConditionSchema>;

export const ReviewActionSchema = z.enum(['approve', 'override']);
export type ReviewAction = z.infer<typeof ReviewActionSchema>;

// --- Value Objects ---

export const BoundingBoxSchema = z.object({
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

// --- Entities ---

export const InventoryItemSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  quantity: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  bounding_box: BoundingBoxSchema.optional(),
  condition: ItemConditionSchema.optional(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const DeltaEntrySchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  before_count: z.number().int().nonnegative(),
  after_count: z.number().int().nonnegative(),
  change: z.number().int(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().optional(),
});
export type DeltaEntry = z.infer<typeof DeltaEntrySchema>;

export const OverlayItemSchema = z.object({
  label: z.string(),
  bounding_box: BoundingBoxSchema,
  confidence: z.number().min(0).max(1).optional(),
});
export type OverlayItem = z.infer<typeof OverlayItemSchema>;

export const OverlayDataSchema = z.object({
  before: z.array(OverlayItemSchema).optional(),
  after: z.array(OverlayItemSchema).optional(),
});
export type OverlayData = z.infer<typeof OverlayDataSchema>;

export const EvidenceImagesSchema = z.object({
  before_image_url: z.string().optional(),
  after_image_url: z.string().optional(),
  overlays: OverlayDataSchema.optional(),
});
export type EvidenceImages = z.infer<typeof EvidenceImagesSchema>;

export const ReviewCorrectionSchema = z.object({
  name: z.string().min(1),
  sku: z.string().nullable().optional(),
  original_count: z.number().int().nonnegative(),
  corrected_count: z.number().int().nonnegative(),
  added: z.boolean().optional(),
  removed: z.boolean().optional(),
});
export type ReviewCorrection = z.infer<typeof ReviewCorrectionSchema>;

export const ReviewSchema = z.object({
  reviewer_id: z.string(),
  action: ReviewActionSchema,
  corrections: z.array(ReviewCorrectionSchema).optional(),
  notes: z.string().optional(),
  reviewed_at: z.string(),
});
export type Review = z.infer<typeof ReviewSchema>;

export const AnalysisMetadataSchema = z.object({
  provider: z.string(),
  processing_time_ms: z.number().optional(),
  model_version: z.string().optional(),
  error_message: z.string().optional(),
  created_at: z.string(),
  completed_at: z.string().optional(),
});
export type AnalysisMetadata = z.infer<typeof AnalysisMetadataSchema>;

// --- Main Entity ---

export const InventoryAnalysisRunSchema = z.object({
  run_id: z.string().min(1),
  session_id: z.string().min(1),
  container_id: z.string().min(1),
  status: AnalysisStatusSchema,
  items_before: z.array(InventoryItemSchema).nullable().optional(),
  items_after: z.array(InventoryItemSchema).nullable().optional(),
  delta: z.array(DeltaEntrySchema).nullable().optional(),
  evidence: EvidenceImagesSchema.nullable().optional(),
  review: ReviewSchema.nullable().optional(),
  metadata: AnalysisMetadataSchema,
});
export type InventoryAnalysisRun = z.infer<typeof InventoryAnalysisRunSchema>;

// --- Response Envelopes ---

export const InventoryLatestResponseSchema = z.object({
  success: z.boolean(),
  data: InventoryAnalysisRunSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
    retry_after_seconds: z.number().optional(),
  }).optional(),
  timestamp: z.string().optional(),
  request_id: z.string().optional(),
});
export type InventoryLatestResponse = z.infer<typeof InventoryLatestResponseSchema>;

// --- Request Schemas ---

export const SubmitReviewRequestSchema = z.object({
  action: ReviewActionSchema,
  corrections: z.array(ReviewCorrectionSchema).optional(),
  notes: z.string().optional(),
});
export type SubmitReviewRequest = z.infer<typeof SubmitReviewRequestSchema>;

export const ReviewResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    run_id: z.string(),
    status: AnalysisStatusSchema,
    review: ReviewSchema,
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
  }).optional(),
  timestamp: z.string().optional(),
});
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVENTORY_NOT_FOUND` | 404 | No analysis exists for this container/session |
| `INVENTORY_PENDING` | 200 | Analysis in progress (not an error, status field) |
| `INVENTORY_FAILED` | 200 | Analysis failed (not an error, status field) |
| `REVIEW_CONFLICT` | 409 | Session already reviewed |
| `REVIEW_INVALID` | 400 | Invalid review payload |
| `SERVICE_UNAVAILABLE` | 503 | Inventory analysis backend unreachable |
| `CONTAINER_NOT_FOUND` | 404 | Container ID does not exist |
