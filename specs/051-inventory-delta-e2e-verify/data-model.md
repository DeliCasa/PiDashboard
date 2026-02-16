# Data Model: 051 — Live E2E Inventory Delta Display

**Date**: 2026-02-15
**Source**: BridgeServer `drizzle/schema.ts` + `inventory-analysis.entity.ts`

## Entity Summary

No new entities are introduced. This feature **aligns existing PiDashboard types with actual BridgeServer contracts** and adds display capabilities for fields already in the schema.

## Status Enum (REVISED)

Previous PiDashboard values → Aligned BridgeServer values:

| Old Value | New Value | Display Label | Terminal | Notes |
|-----------|-----------|---------------|----------|-------|
| `pending` | `pending` | Queued | No | Unchanged |
| — | `processing` | Running | No | **Added** |
| `completed` | `done` | Completed | Yes | **Renamed** |
| `needs_review` | `needs_review` | Needs Review | No | Unchanged |
| `approved` | — | Approved | — | **Removed** (derived from `done` + review) |
| `failed` | `error` | Failed | Yes | **Renamed** |

### Derived Display State: "Approved"

"Approved" is NOT a backend status. It is a client-side display derivation:
- Backend status = `done` AND `review` field is non-null → display as "Approved"
- Backend status = `done` AND `review` is null → display as "Completed"

## Entities

### InventoryAnalysisRun (root aggregate — REVISED)

| Field | Type | Required | Change | Description |
|-------|------|----------|--------|-------------|
| `run_id` | string | Yes | — | Opaque analysis run identifier (BridgeServer prefix: `iar_`) |
| `session_id` | string | Yes | — | Session during which analysis was triggered |
| `container_id` | string | Yes | — | Opaque container identifier |
| `status` | AnalysisStatus | Yes | **REVISED** | Now: `pending \| processing \| done \| needs_review \| error` |
| `items_before` | InventoryItem[] | No | — | Inventory snapshot before session |
| `items_after` | InventoryItem[] | No | — | Inventory snapshot after session |
| `delta` | DeltaEntry[] | No | — | Per-item changes |
| `evidence` | EvidenceImages | No | — | Before/after photos with overlays |
| `review` | Review | No | — | Human review audit trail |
| `metadata` | AnalysisMetadata | Yes | — | Processing info (provider, timing, errors) |

### DeltaEntry (value object — display field added)

| Field | Type | Required | Change | Description |
|-------|------|----------|--------|-------------|
| `name` | string | Yes | — | Item display name |
| `sku` | string | No | — | SKU code |
| `before_count` | int | Yes | — | Count before session |
| `after_count` | int | Yes | — | Count after session |
| `change` | int | Yes | — | Computed delta (after - before) |
| `confidence` | float [0,1] | Yes | — | Detection confidence score |
| `rationale` | string | No | **NOW DISPLAYED** | Explanation of detected change |

### RunListItem (projection — status aligned)

| Field | Type | Required | Change | Description |
|-------|------|----------|--------|-------------|
| `run_id` | string | Yes | — | Run identifier |
| `session_id` | string | Yes | — | Session identifier |
| `container_id` | string | Yes | — | Container identifier |
| `status` | AnalysisStatus | Yes | **REVISED** | Aligned with BridgeServer enum |
| `delta_summary` | DeltaSummary | No | — | Aggregate change counts |
| `metadata` | AnalysisMetadata | Yes | — | Processing info |

## State Transitions (REVISED)

```
pending → processing      (analysis begins)
processing → done         (analysis finishes normally)
processing → needs_review (analysis finishes with low confidence)
processing → error        (analysis errors out)
needs_review → done       (human approves or overrides)
```

Terminal states: `done`, `error`

## Removed: `correlation_id`

Research (Finding #2) confirmed `correlation_id` is NOT in BridgeServer's `inventoryAnalysisRuns` schema. The `run_id` field serves as the primary tracing identifier. The spec's FR-003 is revised to use `run_id` instead.

## Relationships (Unchanged)

```
Container (1) ──── (*) InventoryAnalysisRun
Session (1)   ──── (1) InventoryAnalysisRun
Run (1)       ──── (*) DeltaEntry
Run (1)       ──── (0..1) EvidenceImages
Run (1)       ──── (0..1) Review
Review (1)    ──── (*) ReviewCorrection
```
