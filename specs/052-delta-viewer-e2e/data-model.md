# Data Model: 052-delta-viewer-e2e

**Phase**: 1 — Design & Contracts
**Date**: 2026-02-16

## Entities

### InventoryAnalysisRun (existing, extended)

The core entity representing a single inventory analysis for a session. Existing in Feature 047; this feature extends the `delta` field to accept the categorized format.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| run_id | string | no | Unique analysis run identifier (e.g., `iar_xxx`) |
| session_id | string | no | Session this analysis belongs to |
| container_id | string | no | Container (opaque ID) |
| status | AnalysisStatus | no | Lifecycle status |
| items_before | InventoryItem[] | yes | Snapshot of items before session |
| items_after | InventoryItem[] | yes | Snapshot of items after session |
| delta | DeltaEntry[] \| CategorizedDelta | yes | Computed changes (NEW: union type) |
| evidence | EvidenceImages | yes | Before/after photos + overlays |
| review | Review | yes | Human review if completed |
| metadata | AnalysisMetadata | no | Provider, timing, errors |

### DeltaEntry (existing, unchanged)

Flat per-item change record. Used by BridgeServer v1.0 responses.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| name | string | no | Product name |
| sku | string | yes | Optional SKU code |
| before_count | int >= 0 | no | Count before session |
| after_count | int >= 0 | no | Count after session |
| change | int | no | Net change (after - before) |
| confidence | float 0-1 | no | Detection confidence |
| rationale | string | yes | Why this change was detected |

### CategorizedDelta (NEW)

Grouped delta format from BridgeServer v2.0 (Feature 065). Items are pre-categorized by change type.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| added | AddedItem[] | no | Newly appearing items |
| removed | RemovedItem[] | no | Fully removed items |
| changed_qty | ChangedQtyItem[] | no | Items with quantity changes |
| unknown | UnknownItem[] | no | Low-confidence / uncertain items |

### AddedItem / RemovedItem (NEW)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| name | string | no | Product name |
| qty | int >= 1 | no | Quantity added/removed |
| confidence | float 0-1 | no | Detection confidence |
| bbox | BoundingBox | yes | Normalized image coordinates |

### ChangedQtyItem (NEW)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| name | string | no | Product name |
| from_qty | int >= 0 | no | Previous quantity |
| to_qty | int >= 0 | no | New quantity |
| confidence | float 0-1 | no | Detection confidence |

### UnknownItem (NEW)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| note | string | no | Description of the uncertain detection |
| confidence | float 0-1 | no | Detection confidence |

## Enums

### AnalysisStatus (existing, unchanged)

| Value | Meaning | Terminal? |
|-------|---------|-----------|
| `pending` | Awaiting processing | No |
| `processing` | Vision analysis in progress | No |
| `done` | Complete (approved or no review needed) | Yes |
| `needs_review` | Complete but flagged for human review | No (becomes done after review) |
| `error` | Failed (can be retried) | Yes |

### ReviewAction (existing, unchanged)

| Value | Meaning |
|-------|---------|
| `approve` | Accept delta as-is |
| `override` | Submit corrected delta |

## State Transitions

```
pending ──► processing ──► done
                │
                ├──► needs_review ──► done (after review)
                │
                └──► error
```

## New Function: normalizeDelta

Converts a `CategorizedDelta` into `DeltaEntry[]` for display by the existing `InventoryDeltaTable` component.

**Input**: `CategorizedDelta`
**Output**: `DeltaEntry[]`

**Mapping rules**:
- `added[i]` → `{ name, before_count: 0, after_count: qty, change: +qty, confidence }`
- `removed[i]` → `{ name, before_count: qty, after_count: 0, change: -qty, confidence }`
- `changed_qty[i]` → `{ name, before_count: from_qty, after_count: to_qty, change: to_qty - from_qty, confidence }`
- `unknown[i]` → `{ name: note, before_count: 0, after_count: 0, change: 0, confidence }`

## Relationships

```
Container (1) ──► (*) AnalysisRun ──► (0..1) Review
                                   ──► (0..*) DeltaEntry | CategorizedDelta
                                   ──► (0..1) EvidenceImages
```

## Golden Fixture Shapes

Two fixture categories exist for testing:

1. **PiDashboard fixtures** (`tests/mocks/inventory-delta-fixtures.ts`): Represent the expected shape PiDashboard receives from PiOrchestrator. Use snake_case field names. Validated against PiDashboard Zod schemas.

2. **Golden BridgeServer fixtures** (NEW: `tests/mocks/inventory-delta-golden.ts`): Represent canonical BridgeServer responses including both flat and categorized delta formats. Used to prove PiDashboard schemas can parse upstream responses.
