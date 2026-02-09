# Data Model: 046 Opaque Container Identity

**Branch**: `046-opaque-container-identity` | **Date**: 2026-02-08

## Entities

### Active Container Selection (NEW)

Client-side state tracking the operator's currently-selected container context.

| Field | Type | Description |
|-------|------|-------------|
| `activeContainerId` | `string \| null` | Opaque container ID currently selected. `null` means "no selection" (global view). |

**Storage**: Zustand store with `persist` middleware → `localStorage` key `delicasa-pi-active-container`

**Lifecycle**:
- Set when operator selects from picker
- Restored on page load from localStorage
- Cleared when selected container is not found in API response
- Falls back to first container when stale

---

### Container (EXISTING — no changes)

From Feature 043 (`src/domain/types/containers.ts`):

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Opaque container ID (UUID from PiOrchestrator) |
| `label` | `string?` | Human-friendly name (max 100 chars) |
| `description` | `string?` | Optional description (max 500 chars) |
| `created_at` | `string` | RFC3339 timestamp |
| `updated_at` | `string` | RFC3339 timestamp |

---

### ContainerDetail (EXISTING — no changes)

Extends Container with camera assignment data:

| Field | Type | Description |
|-------|------|-------------|
| (all Container fields) | | |
| `cameras` | `CameraAssignment[]` | Cameras assigned to positions 1-4 |
| `camera_count` | `number` | Total assigned cameras (0-4) |
| `online_count` | `number` | Currently online cameras |

---

### CameraAssignment (EXISTING — no changes)

| Field | Type | Description |
|-------|------|-------------|
| `device_id` | `string` | Camera's opaque device ID |
| `position` | `1 \| 2 \| 3 \| 4` | Container position slot |
| `assigned_at` | `string` | RFC3339 timestamp |
| `status` | `CameraStatus?` | Denormalized camera status |
| `name` | `string?` | Denormalized camera name |

## Relationships

```
ActiveContainerSelection --selects--> Container (by id)
Container --has many--> CameraAssignment (via cameras array)
CameraAssignment --references--> Camera (via device_id = Camera.id)
```

## Derived Data

### Container-Scoped Camera List

Derived client-side by filtering the global camera list:

```
containerCameras = allCameras.filter(camera =>
  activeContainer.cameras.some(assignment => assignment.device_id === camera.id)
)
```

- When `activeContainerId === null`: returns all cameras (global fallback)
- When active container has no cameras: returns empty array

### Container-Scoped Evidence

Derived client-side from evidence entries:

```
containerCameraIds = Set(activeContainer.cameras.map(a => a.device_id))
containerEvidence = allEvidence.filter(e => containerCameraIds.has(e.camera_id))
```

- When `activeContainerId === null`: returns all evidence (global fallback)

## State Transitions

### Active Container Selection State Machine

```
[No Containers] --containers load--> [Auto-Select First]
[Auto-Select First] --store set--> [Container Selected]
[Container Selected] --operator picks--> [Container Selected]
[Container Selected] --container deleted--> [Validate Selection]
[Validate Selection] --found in list--> [Container Selected]
[Validate Selection] --not found--> [Auto-Select First]
[Container Selected] --API unavailable--> [Container Selected] (keep stale, degrade gracefully)
```
