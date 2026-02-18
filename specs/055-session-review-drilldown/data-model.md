# Data Model: 055-session-review-drilldown

**Date**: 2026-02-18
**Status**: Complete

## Overview

This feature introduces **no new domain entities**. All data structures already exist from Features 047/048/053. The new work is a client-side presentation concept (timeline steps) and a small API extension (conditional re-run).

## Existing Entities (No Changes)

### InventoryAnalysisRun (primary entity)

**Source**: `src/infrastructure/api/inventory-delta-schemas.ts` → re-exported via `src/domain/types/inventory.ts`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `run_id` | `string` | Unique analysis run identifier |
| `session_id` | `string` | Associated purchase session |
| `container_id` | `string` | Container (opaque ID) |
| `status` | `AnalysisStatus` | `'pending' \| 'processing' \| 'done' \| 'needs_review' \| 'error'` |
| `items_before` | `InventoryItem[] \| null` | Pre-session inventory snapshot |
| `items_after` | `InventoryItem[] \| null` | Post-session inventory snapshot |
| `delta` | `DeltaEntry[] \| CategorizedDelta \| null` | AI-detected changes |
| `evidence` | `EvidenceImages \| null` | Before/after image URLs + overlays |
| `review` | `Review \| null` | Operator review (null = unreviewed) |
| `metadata` | `AnalysisMetadata` | Provider, timing, errors |

### DeltaEntry

| Field | Type | Description |
| ----- | ---- | ----------- |
| `name` | `string` | Item name |
| `sku` | `string?` | Optional SKU |
| `before_count` | `number` | Pre-session count |
| `after_count` | `number` | Post-session count |
| `change` | `number` | `after_count - before_count` |
| `confidence` | `number` | 0–1, AI confidence score |
| `rationale` | `string?` | AI reasoning text |

### Review

| Field | Type | Description |
| ----- | ---- | ----------- |
| `reviewer_id` | `string` | Server-assigned reviewer identifier |
| `action` | `'approve' \| 'override'` | Review action taken |
| `corrections` | `ReviewCorrection[]?` | Item-level corrections (override only) |
| `notes` | `string?` | Free-text review notes |
| `reviewed_at` | `string` | ISO 8601 timestamp |

### EvidenceImages

| Field | Type | Description |
| ----- | ---- | ----------- |
| `before_image_url` | `string?` | Presigned URL to before image |
| `after_image_url` | `string?` | Presigned URL to after image |
| `overlays` | `OverlayData?` | ML bounding boxes |

### AnalysisMetadata

| Field | Type | Description |
| ----- | ---- | ----------- |
| `provider` | `string` | Analysis provider name |
| `processing_time_ms` | `number?` | Time taken (ms) |
| `model_version` | `string?` | ML model version |
| `error_message` | `string?` | Error details (when status=error) |
| `created_at` | `string` | ISO 8601 run creation time |
| `completed_at` | `string?` | ISO 8601 completion time |

## New Client-Side Concepts

### TimelineStep (presentation-only type)

This type is used exclusively by the `SessionStatusTimeline` component. It is NOT a domain entity — it's a UI derivation.

```typescript
interface TimelineStep {
  label: string;           // Display name: 'Created', 'Capture', etc.
  status: 'completed' | 'active' | 'error' | 'upcoming';
}
```

**Derivation logic** (from `InventoryAnalysisRun`):

```typescript
function deriveTimelineSteps(run: InventoryAnalysisRun): TimelineStep[] {
  const hasReview = run.review !== null && run.review !== undefined;

  switch (run.status) {
    case 'pending':
      return [
        { label: 'Created',     status: 'completed' },
        { label: 'Capture',     status: 'active' },
        { label: 'Analysis',    status: 'upcoming' },
        { label: 'Delta Ready', status: 'upcoming' },
        { label: 'Finalized',   status: 'upcoming' },
      ];
    case 'processing':
      return [
        { label: 'Created',     status: 'completed' },
        { label: 'Capture',     status: 'completed' },
        { label: 'Analysis',    status: 'active' },
        { label: 'Delta Ready', status: 'upcoming' },
        { label: 'Finalized',   status: 'upcoming' },
      ];
    case 'done':
    case 'needs_review':
      return [
        { label: 'Created',     status: 'completed' },
        { label: 'Capture',     status: 'completed' },
        { label: 'Analysis',    status: 'completed' },
        { label: 'Delta Ready', status: hasReview ? 'completed' : 'active' },
        { label: 'Finalized',   status: hasReview ? 'completed' : 'upcoming' },
      ];
    case 'error':
      return [
        { label: 'Created',     status: 'completed' },
        { label: 'Capture',     status: 'completed' },
        { label: 'Analysis',    status: 'error' },
        { label: 'Delta Ready', status: 'upcoming' },
        { label: 'Finalized',   status: 'upcoming' },
      ];
  }
}
```

### RerunResult (conditional API response)

Only relevant if the backend supports `POST /v1/inventory/:runId/rerun`. The expected response shape (unvalidated, since the endpoint may not exist):

```typescript
interface RerunResult {
  new_run_id: string;   // The new analysis run ID
  status: string;       // Expected: 'pending'
}
```

If the endpoint doesn't exist (404/501), this type is never used. No Zod schema is created until the endpoint contract is confirmed.

## State Transitions

```
                ┌──────────┐
                │  pending  │
                └─────┬─────┘
                      │
                ┌─────▼─────┐
                │ processing │──────┐
                └─────┬─────┘      │
                      │            │ (failure)
              ┌───────▼───────┐  ┌─▼────┐
              │ done /        │  │error │
              │ needs_review  │  └──────┘
              └───────┬───────┘
                      │ (operator submits review)
              ┌───────▼───────┐
              │ done + review │  ← "Finalized" in timeline
              └───────────────┘
```

Note: "Finalized" is not a new backend status. It's `done` with `review !== null`. The backend status enum is unchanged.
