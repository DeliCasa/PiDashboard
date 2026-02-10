# Data Model: 050 ID Taxonomy Consistency

**Date**: 2026-02-10

## Entities

This feature does not introduce new entities or modify existing domain types. The existing entity model already correctly separates opaque IDs from display labels:

### Container (existing — no changes)

| Field | Type | Role |
|-------|------|------|
| `id` | `string` | Opaque identifier (UUID). Never parsed semantically. |
| `label` | `string?` | Human-assigned display name. Optional; falls back to "Unnamed Container". |
| `description` | `string?` | Admin-provided description. |

### Camera (existing — no changes)

| Field | Type | Role |
|-------|------|------|
| `id` | `string` | Opaque identifier (MAC address format). |
| `name` | `string` | Human-assigned display name. |

### InventoryRun (existing — no changes)

| Field | Type | Role |
|-------|------|------|
| `run_id` | `string` | Opaque run identifier (UUID). |
| `session_id` | `string` | Opaque session identifier (UUID). |
| `container_id` | `string` | Opaque container reference (UUID). |

## ID Taxonomy

| Concept | Examples | Display Convention |
|---------|----------|-------------------|
| Opaque Identifier | `550e8400-e29b-41d4-a716-446655440000` | `font-mono text-xs text-muted-foreground`, prefixed with type label ("Container ID:") |
| Display Label | "Kitchen Fridge", "Garage Freezer" | Standard typography, primary visual weight |
| Fallback Label | "Unnamed Container" | Italic, muted styling |

## State Transitions

N/A — this feature does not introduce state changes.
