# Data Model: Session Drill-Down E2E Operational Validation

**Feature**: 056-session-drilldown-e2e
**Date**: 2026-02-18

## Overview

No new entities or data model changes are required. This feature validates and polishes the existing data model established in Feature 055. The following documents the current model for reference.

## Existing Entities (No Changes)

### Inventory Analysis Run

The central entity for session drill-down. Already defined in `InventoryAnalysisRunSchema`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| run_id | string | Yes | Unique run identifier (opaque) |
| session_id | string | Yes | Parent session identifier (opaque) |
| container_id | string | Yes | Container this run belongs to (opaque) |
| status | enum | Yes | `pending`, `processing`, `done`, `needs_review`, `error` |
| items_before | InventoryItem[] | No | Pre-session inventory snapshot |
| items_after | InventoryItem[] | No | Post-session inventory snapshot |
| delta | DeltaEntry[] or CategorizedDelta | No | Computed differences (v1 flat or v2 categorized) |
| evidence | EvidenceImages | No | Before/after image references |
| review | Review | No | Operator review if submitted |
| metadata | AnalysisMetadata | Yes | Processing metadata (provider, timing, errors) |

### Evidence Images

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| before_image_url | string | No | URL to pre-session image |
| after_image_url | string | No | URL to post-session image |
| overlays | object | No | Bounding box overlays for detected items |

### Delta Entry (v1 flat)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Item name |
| sku | string | No | Item SKU |
| before_count | integer | Yes | Count before session |
| after_count | integer | Yes | Count after session |
| change | integer | Yes | Difference (must equal after - before) |
| confidence | float | Yes | AI confidence score (0.0 - 1.0) |
| rationale | string | No | AI explanation for the change |

### Review

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reviewer_id | string | Yes | Operator who reviewed |
| action | enum | Yes | `approve` or `override` |
| corrections | ReviewCorrection[] | No | Operator corrections if overriding |
| notes | string | No | Operator notes |
| reviewed_at | string | Yes | ISO 8601 timestamp |

## State Transitions (No Changes)

```
pending → processing → done → needs_review → (reviewed)
                    ↘ error
```

## UI State Model (Changes in This Feature)

### New: Image Load Error State

The evidence panel needs to track per-image error state (not just loading state):

| State | Before | After (This Feature) |
|-------|--------|---------------------|
| Image loading | Skeleton visible | Skeleton visible (unchanged) |
| Image loaded | Image visible | Image visible (unchanged) |
| Image failed | Broken icon (browser default) | "Image unavailable" placeholder |

### Changed: Null Data Differentiation

The drill-down detail view needs to differentiate between:

| Condition | Current Behavior | Target Behavior |
|-----------|-----------------|-----------------|
| API error (500, network) | "Failed to load run details" + Retry | Same (unchanged) |
| Session not found (null) | "Failed to load run details" + Retry | "Session not found" (no retry) |
| Auth error (401/403) | Auth-specific message | Same (unchanged) |
