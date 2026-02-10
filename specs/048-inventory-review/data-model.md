# Data Model: Inventory Review — Run History & Enhanced Review Workflow

**Feature**: 048-inventory-review
**Date**: 2026-02-09

## Entities

### Run List Summary (new)

A lightweight projection of `InventoryAnalysisRun` for list display. Contains only the fields needed to render a row in the run list. The full run entity is fetched on selection.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `run_id` | string (UUID) | Yes | Unique analysis run identifier |
| `session_id` | string (UUID) | Yes | Session that triggered the analysis |
| `container_id` | string (UUID) | Yes | Container being analyzed |
| `status` | AnalysisStatus enum | Yes | pending, completed, needs_review, approved, failed |
| `delta_summary` | object | No | Summary counts for list display |
| `delta_summary.total_items` | number | Yes | Total items in delta |
| `delta_summary.items_changed` | number | Yes | Items with non-zero change |
| `delta_summary.items_added` | number | Yes | Items not in "before" |
| `delta_summary.items_removed` | number | Yes | Items not in "after" |
| `metadata` | AnalysisMetadata | Yes | Same shape as existing; `created_at` used for list ordering |

### Run List Response (new)

Paginated collection of run summaries.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `runs` | RunListSummary[] | Yes | Array of run summaries for current page |
| `pagination` | Pagination | Yes | Pagination metadata |
| `pagination.total` | number | Yes | Total number of runs for this container |
| `pagination.limit` | number | Yes | Page size (items per page) |
| `pagination.offset` | number | Yes | Current page offset |
| `pagination.has_more` | boolean | Yes | Whether more pages exist |

### Run List Filters (frontend-only)

Query parameters for the run list endpoint.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `limit` | number | No | 20 | Page size |
| `offset` | number | No | 0 | Pagination offset |
| `status` | AnalysisStatus | No | (all) | Filter by run status |

### Existing Entities (from 047, unchanged)

- **InventoryAnalysisRun**: Full run entity with items_before, items_after, delta, evidence, review, metadata
- **DeltaEntry**: Per-item comparison line with before_count, after_count, change, confidence
- **InventoryItem**: Single item with name, sku, quantity, confidence, bounding_box, condition
- **EvidenceImages**: Before/after image URLs with optional overlay data
- **Review**: Operator review with reviewer_id, action, corrections, notes, reviewed_at
- **ReviewCorrection**: Single correction entry with name, sku, original_count, corrected_count, added, removed

## State Transitions

### Analysis Run Status (existing, unchanged)

```
┌─────────┐
│ pending  │
└────┬─────┘
     │ (analysis completes)
     ▼
┌───────────────┐     ┌────────┐
│  completed    │────▶│ failed │
└───────┬───────┘     └────────┘
        │ (confidence check)
        ▼
┌──────────────┐
│ needs_review │
└──────┬───────┘
       │ (operator reviews)
       ▼
┌──────────┐
│ approved │
└──────────┘
```

### Run List View State (new, frontend)

```
┌─────────────────┐
│ no_container     │  (no active container selected)
└────────┬────────┘
         │ (container selected)
         ▼
┌─────────────────┐
│ loading          │  (fetching run list)
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌──────────┐
│ empty  │  │ loaded   │  (runs displayed)
└────────┘  └────┬─────┘
                 │ (run selected)
                 ▼
            ┌─────────────┐
            │ detail_view │  (full run detail shown)
            └─────────────┘
```

Side branch from any state:
- **error**: API returned non-404/503 error → error message with retry
- **unavailable**: API returned 404/503 → graceful degradation message

### Session Lookup State (new, frontend)

```
┌──────────┐
│ idle     │  (empty lookup field)
└────┬─────┘
     │ (submit session ID)
     ▼
┌───────────┐
│ searching │  (fetching by session ID)
└─────┬─────┘
      │
  ┌───┴───┐
  ▼       ▼
┌───────┐ ┌───────────┐
│ found │ │ not_found │  (session has no analysis)
└───────┘ └───────────┘
```

## Validation Rules (FR-007, FR-008)

### Review Form Input Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| Item count | Must be non-negative integer (>= 0) | "Count must be 0 or greater" |
| Item name | Must be non-empty string | "Item name is required" |
| Override corrections | At least one correction required | "At least one correction is required to override" |
| Notes | Optional, max 500 characters | "Notes must be 500 characters or fewer" |

### Session ID Lookup Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| Session ID | Non-empty after trim | "Please enter a session ID" |
| Session ID | Valid UUID format (optional client-side hint) | "Invalid session ID format" |
