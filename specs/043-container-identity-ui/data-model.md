# Data Model: Container Identity Model UI

**Feature**: 043-container-identity-ui
**Date**: 2026-02-04

## Entity Relationship Diagram

```
┌─────────────────────┐        ┌─────────────────────┐
│     Container       │        │       Camera        │
├─────────────────────┤        ├─────────────────────┤
│ id (PK, opaque)     │        │ id (PK, device_id)  │
│ label? (optional)   │        │ name? (optional)    │
│ description?        │        │ status              │
│ created_at          │◄───────│ mac_address         │
│ updated_at          │   1:N  │ last_seen           │
└─────────────────────┘        └─────────────────────┘
         │
         │ 1:N (max 4)
         ▼
┌─────────────────────┐
│  CameraAssignment   │
├─────────────────────┤
│ device_id (FK)      │
│ position (1-4)      │
│ assigned_at         │
│ status? (denorm)    │
│ name? (denorm)      │
└─────────────────────┘
```

## Entities

### Container

The logical grouping unit for cameras. Each container can hold up to 4 cameras in fixed positions.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | Required, unique, min(1) | Opaque ID - UUID-like, never semantic |
| label | string | Optional, max(100) | Human-readable display name |
| description | string | Optional, max(500) | Admin notes |
| created_at | string | Required, RFC3339 | ISO timestamp |
| updated_at | string | Required, RFC3339 | ISO timestamp |

**Validation Rules**:
- `id` must be non-empty string (no format assumed)
- `label` if provided must not exceed 100 characters
- `description` if provided must not exceed 500 characters

### ContainerDetail

Extended container with denormalized camera information for display optimization.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| ...Container | - | - | All Container fields |
| cameras | CameraAssignment[] | max(4) | Assigned cameras with positions |
| camera_count | number | 0-4 | Total assigned cameras |
| online_count | number | 0-4 | Currently online cameras |

### CameraAssignment

Relationship between a camera and its position within a container.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| device_id | string | Required, min(1) | Camera's unique identifier (MAC address) |
| position | 1 \| 2 \| 3 \| 4 | Required, enum | Fixed position within container |
| assigned_at | string | Required, RFC3339 | When camera was assigned |
| status | CameraStatus | Optional | Denormalized for display |
| name | string | Optional | Denormalized camera name |

**Validation Rules**:
- `position` must be exactly 1, 2, 3, or 4
- A position can only hold one camera at a time
- A camera can only be assigned to one container at a time

### CameraPosition (Enum)

Fixed positions within a 2x2 grid layout.

| Value | Grid Position |
|-------|---------------|
| 1 | Top-left |
| 2 | Top-right |
| 3 | Bottom-left |
| 4 | Bottom-right |

## State Transitions

### Container Lifecycle

```
[Create] → Created (empty, camera_count=0)
    │
    ├──[Assign Camera]─→ Has Cameras (1-4 cameras)
    │                         │
    │                    [Unassign]
    │                         │
    │                         ▼
    │              Empty (camera_count=0)
    │                         │
    └──────────────[Delete]───┘
                         │
                         ▼
                    Deleted
```

**Delete Constraint**: Container must be empty (camera_count=0) before deletion.

### Camera Assignment Lifecycle

```
[Unassigned Camera] ──[Assign to Container]──→ [Assigned Camera]
        ▲                                              │
        │                                              │
        └─────────[Unassign from Container]────────────┘
```

## Error States

| Error Code | Meaning | User Message |
|------------|---------|--------------|
| CONTAINER_NOT_FOUND | Container ID doesn't exist | "Container not found" |
| CONTAINER_HAS_CAMERAS | Trying to delete non-empty container | "Remove all cameras before deleting" |
| POSITION_OCCUPIED | Position already has a camera | "Position is already occupied" |
| CAMERA_ALREADY_ASSIGNED | Camera assigned elsewhere | "Camera is already assigned to another container" |
| INVALID_POSITION | Position not 1-4 | "Invalid position" |
| VALIDATION_FAILED | Request validation error | "Invalid request data" |
| INTERNAL_ERROR | Server error | "Something went wrong" |

## Denormalization Notes

The `CameraAssignment` entity includes denormalized fields (`status`, `name`) from the Camera entity. This allows the UI to display camera information without additional API calls.

**Trade-offs**:
- Pro: Reduces API calls when displaying container details
- Pro: Single source of truth for container view state
- Con: May show stale camera status until next poll
- Mitigation: 30-second polling interval keeps data reasonably fresh

## Type Definitions

See: `src/infrastructure/api/v1-containers-schemas.ts` for Zod schema definitions.
See: `src/domain/types/containers.ts` for TypeScript type definitions.
