# Feature Specification: Container Identity Model UI

**Feature Branch**: `043-container-identity-ui`
**Created**: 2026-02-04
**Status**: Draft
**Input**: User description: "Update the UI to reflect the new identity model: show container_label prominently, container_id secondarily, provide admin flow for container/camera management, ensure no semantic ID assumptions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Containers with Label-First Display (Priority: P1)

An admin navigates to the Containers tab to see all configured containers. The display shows human-readable labels prominently, with opaque IDs shown in a smaller, secondary font. Containers without labels show "Unnamed Container" as a placeholder, ensuring the UI never relies on ID semantics for identification.

**Why this priority**: This is the foundational display pattern that all other interactions build upon. Without correct label-first display, the identity model abstraction fails.

**Independent Test**: Can be fully tested by loading the container list and verifying that labels appear prominently while IDs appear in monospace secondary text. Delivers immediate value by making container identification intuitive.

**Acceptance Scenarios**:

1. **Given** a container exists with label "Kitchen Fridge", **When** the user views the container list, **Then** "Kitchen Fridge" is displayed prominently and the opaque ID appears below in smaller monospace text.
2. **Given** a container exists without a label, **When** the user views the container list, **Then** "Unnamed Container" is displayed in italicized muted text with the opaque ID below.
3. **Given** multiple containers exist, **When** the user views the container list, **Then** containers are displayed in a grid with consistent label/ID formatting regardless of label presence.

---

### User Story 2 - Create Container with Optional Label (Priority: P1)

An admin creates a new container by clicking the "Create Container" button. They can optionally provide a human-readable label and description. The system generates an opaque ID automatically. The container is immediately usable for camera assignments.

**Why this priority**: Container creation is required before any camera assignment workflow can function. Critical for initial system setup.

**Independent Test**: Can be fully tested by clicking Create, optionally entering a label, submitting, and verifying the new container appears in the list with a system-generated ID.

**Acceptance Scenarios**:

1. **Given** the user clicks "Create Container", **When** they enter label "Garage Fridge" and submit, **Then** a new container appears with that label and a system-generated opaque ID.
2. **Given** the user clicks "Create Container", **When** they submit without entering a label, **Then** a new container appears as "Unnamed Container" with a system-generated opaque ID.
3. **Given** container creation fails, **When** the API returns an error, **Then** an error toast appears and the dialog remains open for retry.

---

### User Story 3 - Assign Camera to Container Position (Priority: P1)

An admin views a container's details and assigns an unassigned camera to one of the four available positions. The camera is identified by its device_id (MAC address or similar), and the user selects both the camera and target position from available options.

**Why this priority**: Camera assignment is the core value proposition of container management. Without this, containers serve no functional purpose.

**Independent Test**: Can be fully tested by opening a container detail view, clicking an empty position slot, selecting an unassigned camera, and verifying it appears in that position.

**Acceptance Scenarios**:

1. **Given** a container has empty positions and unassigned cameras exist, **When** the user clicks an empty position slot and selects a camera, **Then** the camera is assigned to that position and the slot updates to show the camera.
2. **Given** no unassigned cameras exist, **When** the user tries to assign a camera, **Then** the dialog shows "No unassigned cameras available" and disables the submit button.
3. **Given** camera assignment fails, **When** the API returns an error (e.g., position already occupied), **Then** an error toast appears with a user-friendly message.

---

### User Story 4 - Unassign Camera from Container (Priority: P2)

An admin removes a camera from a container position, returning it to the unassigned pool. This allows cameras to be reassigned to different containers or positions.

**Why this priority**: Camera reassignment is essential for maintenance and reconfiguration but less common than initial assignment.

**Independent Test**: Can be fully tested by viewing a container with assigned cameras, clicking the unassign action on a camera slot, and verifying the camera returns to the unassigned pool.

**Acceptance Scenarios**:

1. **Given** a container has a camera assigned to position 2, **When** the user clicks the unassign button for that position, **Then** the camera is removed and the position becomes empty.
2. **Given** camera unassignment fails, **When** the API returns an error, **Then** an error toast appears and the camera remains in its position.

---

### User Story 5 - Edit Container Label and Description (Priority: P2)

An admin updates a container's label or description to improve organization or correct mistakes. The opaque ID remains unchanged.

**Why this priority**: Label editing is important for organization but not critical for core functionality.

**Independent Test**: Can be fully tested by opening a container detail, clicking Edit, changing the label, and verifying the update persists.

**Acceptance Scenarios**:

1. **Given** a container exists with label "Old Name", **When** the user edits the label to "New Name" and saves, **Then** the container displays "New Name" everywhere.
2. **Given** a container has no label, **When** the user adds a label via edit, **Then** the container switches from "Unnamed Container" to the new label.

---

### User Story 6 - Delete Empty Container (Priority: P3)

An admin deletes a container that has no cameras assigned. Containers with cameras cannot be deleted until all cameras are unassigned.

**Why this priority**: Deletion is a cleanup operation, less common than creation or modification.

**Independent Test**: Can be fully tested by creating an empty container, deleting it, and verifying it no longer appears in the list.

**Acceptance Scenarios**:

1. **Given** an empty container exists, **When** the user clicks Delete and confirms, **Then** the container is removed from the system.
2. **Given** a container has assigned cameras, **When** the user tries to delete, **Then** the delete button is disabled with a tooltip "Remove all cameras before deleting".

---

### User Story 7 - Monitor Camera Status in Containers (Priority: P2)

An admin views container details and sees which cameras are online vs offline. Offline cameras are visually distinct, allowing quick identification of connectivity issues.

**Why this priority**: Status monitoring enables proactive maintenance but doesn't affect basic CRUD operations.

**Independent Test**: Can be fully tested by viewing a container with a mix of online/offline cameras and verifying visual differentiation.

**Acceptance Scenarios**:

1. **Given** a container has 2 online and 1 offline camera, **When** the user views the detail, **Then** online cameras show green status indicators and offline cameras show yellow/amber indicators.
2. **Given** container summary stats, **When** the user views the container card, **Then** it shows "X/4 cameras" with separate counts for online/offline.

---

### Edge Cases

- What happens when a camera goes offline after being assigned? The UI updates status indicators without removing the assignment.
- How does the system handle duplicate camera assignment attempts? The API returns CAMERA_ALREADY_ASSIGNED error and UI shows toast.
- What if the containers API endpoint is unavailable? Loading state followed by error state with retry button.
- What if a container is deleted while another user is viewing it? The detail view shows "Container Not Found" state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display container labels prominently as the primary identifier, with opaque IDs shown secondarily in monospace text.
- **FR-002**: System MUST allow container creation with an optional label and description, auto-generating an opaque ID.
- **FR-003**: System MUST provide a 2x2 position grid visualization for camera slots (positions 1-4) within each container.
- **FR-004**: System MUST allow assigning unassigned cameras to empty container positions by selecting device_id and position.
- **FR-005**: System MUST allow unassigning cameras from containers, returning them to the unassigned pool.
- **FR-006**: System MUST prevent deletion of containers that have assigned cameras.
- **FR-007**: System MUST show camera online/offline status within container views using visual indicators.
- **FR-008**: System MUST display unassigned camera count in the container section header as a warning indicator.
- **FR-009**: System MUST provide loading, error, and empty states for all container-related views.
- **FR-010**: System MUST treat all IDs (container_id, device_id) as opaque strings with no semantic interpretation.

### Key Entities

- **Container**: A logical grouping unit with an opaque `id`, optional `label`, optional `description`, and up to 4 camera positions. Contains `created_at` and `updated_at` timestamps.
- **CameraAssignment**: A relationship linking a camera (`device_id`) to a container position (1-4). Includes assignment timestamp and denormalized camera info (status, name) for display without extra API calls.
- **Camera**: An ESP32-CAM device identified by opaque `device_id` (typically MAC address). Has `status` (online/offline) and optional `name`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new container and assign a camera in under 60 seconds.
- **SC-002**: Container list loads and displays within 2 seconds under normal conditions.
- **SC-003**: 100% of UI displays show labels prominently and IDs secondarily - no instances of ID-first display.
- **SC-004**: All error scenarios display user-friendly messages rather than technical codes.
- **SC-005**: The UI correctly handles all edge cases (offline cameras, missing labels, API failures) without crashes.
- **SC-006**: All interactive elements have appropriate data-testid attributes for E2E testing.
- **SC-007**: Admin documentation exists covering container creation, camera assignment, and troubleshooting.

## Assumptions

- The PiOrchestrator backend provides a V1 Containers API at `/api/v1/containers` with CRUD operations and camera assignment endpoints.
- Container IDs are UUID-like strings generated by the backend, not user-provided.
- Each container supports exactly 4 camera positions (fixed, not configurable).
- Camera device IDs are stable identifiers (e.g., MAC addresses) that persist across reboots.
- The V1 Cameras API (`/api/v1/cameras`) provides the list of all cameras for determining unassigned cameras.
