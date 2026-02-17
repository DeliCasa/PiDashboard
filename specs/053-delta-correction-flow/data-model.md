# Data Model: Delta Correction Flow

**Feature**: 053-delta-correction-flow
**Date**: 2026-02-16

## Entities

All entities are already defined in `src/infrastructure/api/inventory-delta-schemas.ts` and re-exported from `src/domain/types/inventory.ts`. This feature adds no new entities — it hardens test coverage for existing ones.

### InventoryAnalysisRun (existing)

The central entity representing a single analysis of a container's contents.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| run_id | string | no | Unique identifier for this analysis run |
| session_id | string | no | Session that triggered this analysis |
| container_id | string | no | Container being analyzed |
| status | AnalysisStatus | no | Current analysis state |
| items_before | InventoryItem[] | yes | Items detected before changes |
| items_after | InventoryItem[] | yes | Items detected after changes |
| delta | DeltaEntry[] or CategorizedDelta | yes | Changes detected (dual format) |
| evidence | EvidenceImages | yes | Before/after photos with overlays |
| review | Review | yes | Operator review (null if unreviewed) |
| metadata | AnalysisMetadata | no | Processing metadata |

### AnalysisStatus (enum, existing)

```
pending → processing → done | needs_review | error
```

| Value | Terminal? | UI Treatment | Polling? |
|-------|----------|--------------|----------|
| pending | No | "Analysis queued" + spinner | Yes (15s) |
| processing | No | "Analysis in progress" + spinner | Yes (15s) |
| done | Yes | Full delta view + review options | No |
| needs_review | No | Full delta view + "Review" CTA | Yes (15s) |
| error | Yes | Error message + refresh button | No |

### DeltaEntry (existing, flat format)

| Field | Type | Description |
|-------|------|-------------|
| name | string | Item name |
| sku | string (optional) | Stock keeping unit |
| before_count | number (≥0) | Count before changes |
| after_count | number (≥0) | Count after changes |
| change | integer | Net change (after - before) |
| confidence | number [0, 1] | Detection confidence |
| rationale | string (optional) | Explanation for change |

### CategorizedDelta (existing, structured format)

| Field | Type | Description |
|-------|------|-------------|
| added | AddedItem[] | Newly detected items |
| removed | RemovedItem[] | Items no longer detected |
| changed_qty | ChangedQtyItem[] | Items with count changes |
| unknown | UnknownItem[] | Unclassifiable changes |

Both formats are normalized to flat DeltaEntry[] via `normalizeDelta()` adapter before display.

### Review (existing)

| Field | Type | Description |
|-------|------|-------------|
| reviewer_id | string | Who submitted the review |
| action | 'approve' or 'override' | Review action taken |
| corrections | ReviewCorrection[] | List of corrections (empty for approve) |
| notes | string (optional) | Free-text notes (max 500 chars) |
| reviewed_at | string (RFC3339) | When the review was submitted |

### ReviewCorrection (existing)

| Field | Type | Description |
|-------|------|-------------|
| name | string (non-empty) | Item name |
| sku | string (nullable) | Stock keeping unit |
| original_count | number (≥0) | Original system count |
| corrected_count | number (≥0) | Operator-corrected count |
| added | boolean (optional) | True if operator added this item |
| removed | boolean (optional) | True if operator removed this item |

### EvidenceImages (existing)

| Field | Type | Description |
|-------|------|-------------|
| before_image_url | string (optional) | URL of before photo |
| after_image_url | string (optional) | URL of after photo |
| overlays | OverlayData (optional) | Bounding box overlay data |

## State Transitions

```
[No Data] ──(analysis triggered)──→ [Pending]
[Pending] ──(processing starts)──→ [Processing]
[Processing] ──(success, high confidence)──→ [Done]
[Processing] ──(success, low confidence)──→ [Needs Review]
[Processing] ──(failure)──→ [Error]
[Done] ──(operator approves)──→ [Done + Review(approve)]
[Done] ──(operator corrects)──→ [Done + Review(override)]
[Needs Review] ──(operator approves)──→ [Done + Review(approve)]
[Needs Review] ──(operator corrects)──→ [Done + Review(override)]
```

## Response Envelopes

### Success Envelope

```
{ success: true, data: InventoryAnalysisRun }
```

### Error Envelope

```
{
  success: false,
  error: {
    code: string,       // e.g., "INVENTORY_NOT_FOUND", "REVIEW_CONFLICT"
    message: string,
    retryable: boolean,
    retry_after_seconds?: number
  }
}
```

### Error Codes

| Code | HTTP Status | Retryable | Scenario |
|------|------------|-----------|----------|
| INVENTORY_NOT_FOUND | 404 | No | Container has no analysis data |
| REVIEW_CONFLICT | 409 | No | Delta already reviewed by another operator |
| REVIEW_INVALID | 400 | No | Correction data fails validation |
| SERVICE_UNAVAILABLE | 503 | Yes | Backend temporarily down |
| NETWORK_ERROR | — | Yes | Client-side connectivity failure |

## Fixture Coverage Matrix

| Fixture | Status | Delta | Review | Purpose |
|---------|--------|-------|--------|---------|
| mockInventoryRunNeedsReview | needs_review | flat | null | Primary correction target |
| mockInventoryRunCompleted | done | flat | null | Completed, awaiting optional review |
| mockInventoryRunPending | pending | null | null | In-progress state |
| mockInventoryRunProcessing | processing | null | null | Actively analyzing |
| mockInventoryRunFailed | error | null | null | Analysis failure |
| mockInventoryRunApproved | done | flat | override | Reviewed with corrections |
| mockInventoryRunApprovedAsIs | done | flat | approve | Reviewed without corrections |
| mockInventoryRunLowConfidence | needs_review | flat (low) | null | All items < 0.5 confidence |
| mockInventoryRunZeroDelta | done | flat (zero) | null | No changes detected |
| mockInventoryRunCategorized | done | categorized | null | V2 categorized format |
