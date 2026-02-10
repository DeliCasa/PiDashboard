# Data Model: Inventory Delta Viewer & Human Review Workflow

**Feature**: 047-inventory-delta-viewer
**Date**: 2026-02-09

## Entities

### InventoryAnalysisRun

Represents a single vision-based inventory analysis for a container session.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `run_id` | string (UUID) | Yes | Unique analysis run identifier |
| `session_id` | string (UUID) | Yes | Reference to the container session |
| `container_id` | string (UUID) | Yes | Reference to the container (opaque ID) |
| `status` | enum | Yes | Analysis lifecycle status |
| `items_before` | InventoryItem[] | No | Items detected in "before" snapshot |
| `items_after` | InventoryItem[] | No | Items detected in "after" snapshot |
| `delta` | DeltaEntry[] | No | Computed line-by-line changes |
| `evidence` | EvidenceImages | No | Before/after image references |
| `review` | Review | No | Human review data (null if unreviewed) |
| `metadata` | AnalysisMetadata | Yes | Processing metadata |

**Status values**: `pending` | `completed` | `needs_review` | `approved` | `failed`

**State transitions**:
```
pending ──→ completed ──→ approved (via review)
   │              │
   │              └──→ needs_review ──→ approved (via review)
   │
   └──→ failed
```

### InventoryItem

A single detected item in a snapshot (before or after).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable item name |
| `sku` | string | No | SKU/product identifier (if known) |
| `quantity` | number (int, >= 0) | Yes | Count of this item |
| `confidence` | number (0-1) | Yes | Detection confidence score |
| `bounding_box` | BoundingBox | No | Position in image (for overlay) |
| `condition` | enum | No | Item condition if detectable |

**Condition values**: `excellent` | `good` | `fair` | `poor` | `expired` | `unknown`

### DeltaEntry

A single line in the inventory delta (change for one item).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Item name |
| `sku` | string | No | SKU/product identifier |
| `before_count` | number (int, >= 0) | Yes | Quantity before session |
| `after_count` | number (int, >= 0) | Yes | Quantity after session |
| `change` | number (int) | Yes | Net change (after - before) |
| `confidence` | number (0-1) | Yes | Confidence in this delta line |
| `rationale` | string | No | Provider's explanation of the change |

### BoundingBox

Position/size of a detected item within an image.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `x` | number | Yes | Left position (pixels) |
| `y` | number | Yes | Top position (pixels) |
| `width` | number | Yes | Box width (pixels) |
| `height` | number | Yes | Box height (pixels) |

### EvidenceImages

References to before/after images for a session.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `before_image_url` | string (URL) | No | Presigned URL for "before" image |
| `after_image_url` | string (URL) | No | Presigned URL for "after" image |
| `overlays` | OverlayData | No | Bounding box overlay metadata |

### OverlayData

Overlay annotations for images.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `before` | OverlayItem[] | No | Overlay items for before image |
| `after` | OverlayItem[] | No | Overlay items for after image |

### OverlayItem

A single bounding box annotation on an image.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | Yes | Item name to display |
| `bounding_box` | BoundingBox | Yes | Position in the image |
| `confidence` | number (0-1) | No | Detection confidence |

### Review

Human review/override of an analysis run.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reviewer_id` | string | Yes | Identity of the reviewer |
| `action` | enum | Yes | Review action taken |
| `corrections` | ReviewCorrection[] | No | List of corrections (for override) |
| `notes` | string | No | Free-text review notes |
| `reviewed_at` | string (ISO 8601) | Yes | Timestamp of review |

**Action values**: `approve` | `override`

### ReviewCorrection

A single correction made during review.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Item name |
| `sku` | string | No | SKU if applicable |
| `original_count` | number (int, >= 0) | Yes | Machine-detected count |
| `corrected_count` | number (int, >= 0) | Yes | Operator-corrected count |
| `added` | boolean | No | True if manually added item |
| `removed` | boolean | No | True if false positive removed |

### AnalysisMetadata

Processing metadata for an analysis run.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | Yes | Vision provider name |
| `processing_time_ms` | number | No | Time taken to process |
| `model_version` | string | No | Provider model version |
| `error_message` | string | No | Error reason (if failed) |
| `created_at` | string (ISO 8601) | Yes | When analysis was initiated |
| `completed_at` | string (ISO 8601) | No | When analysis completed |

## Relationships

```
Container (1) ←──── (many) InventoryAnalysisRun
                              │
                              ├── (many) InventoryItem (before)
                              ├── (many) InventoryItem (after)
                              ├── (many) DeltaEntry
                              ├── (1) EvidenceImages
                              │        ├── (many) OverlayItem (before)
                              │        └── (many) OverlayItem (after)
                              ├── (0..1) Review
                              │           └── (many) ReviewCorrection
                              └── (1) AnalysisMetadata
```

## Validation Rules

| Entity | Rule | Source |
|--------|------|--------|
| InventoryItem.confidence | Must be 0-1 inclusive | BridgeServer spec |
| InventoryItem.quantity | Must be >= 0 integer | Business rule |
| DeltaEntry.change | Must equal `after_count - before_count` | Derived field |
| Review.action | Must be `approve` or `override` | BridgeServer FR-007 |
| Review | Only one per run (immutable) | BridgeServer FR-019 |
| ReviewCorrection.corrected_count | Must be >= 0 integer | Business rule |
| BoundingBox coordinates | Must be non-negative | Image constraint |
| Status transitions | See state diagram above | BridgeServer FR-016 |
