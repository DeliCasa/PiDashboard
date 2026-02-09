# Feature Specification: Opaque Container Identity & Container-Scoped Views

**Feature Branch**: `046-opaque-container-identity`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "Align UI with opaque container identity (UUID container_id + friendly name), remove any semantic defaults like 'fridge-1', and validate against Dokku DEV."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select Active Container from Picker (Priority: P1)

An operator opens the PiDashboard and sees a container picker (dropdown or selector) prominently displayed in the header or navigation area. The picker shows a list of containers fetched from the backend, displaying each container's friendly name (label). The operator selects a container, and this selection becomes the "active container" that scopes what they see on camera and evidence tabs. If the operator has visited before, their last-selected container is automatically restored.

**Why this priority**: Without a container picker, the dashboard shows all cameras/evidence globally with no way to focus on a specific deployment unit. This is the foundational change that enables all other scoped views.

**Independent Test**: Can be fully tested by loading the dashboard, seeing the picker populate with containers from the API, selecting one, refreshing the page, and confirming the selection persists. Delivers immediate value by establishing the container context for all subsequent workflows.

**Acceptance Scenarios**:

1. **Given** the dashboard loads and the backend returns multiple containers, **When** the operator views the header/navigation area, **Then** a container picker is visible showing all available containers by their friendly name (label), with opaque IDs shown secondarily.
2. **Given** a container has no label set, **When** it appears in the picker, **Then** a placeholder like "Unnamed Container" is shown alongside the ID in monospace.
3. **Given** the operator selects "Kitchen Unit" from the picker, **When** they close and reopen the dashboard, **Then** "Kitchen Unit" is still selected (restored from local storage).
4. **Given** the previously-selected container no longer exists in the API response, **When** the dashboard loads, **Then** the picker defaults to the first available container and the stale selection is cleared.
5. **Given** the container list API is unavailable (404/503), **When** the dashboard loads, **Then** the picker shows a graceful degradation state (e.g., "No containers available") without errors.

---

### User Story 2 - View Cameras Scoped to Active Container (Priority: P1)

After selecting a container, the operator navigates to the Cameras tab. Instead of seeing all cameras globally, they see only the cameras assigned to the active container, displayed in their assigned positions. This gives the operator a focused view of the cameras that matter for the selected deployment unit.

**Why this priority**: Scoping cameras to a container is the primary use case — operators manage one physical unit at a time and need to see only the relevant cameras.

**Independent Test**: Can be tested by selecting a container with 2 assigned cameras, switching to the Cameras tab, and verifying only those 2 cameras appear (not all cameras in the system). Delivers targeted monitoring capability.

**Acceptance Scenarios**:

1. **Given** "Kitchen Unit" is the active container with cameras at positions 1 and 3, **When** the operator views the Cameras tab, **Then** only those 2 cameras are shown.
2. **Given** a container has no cameras assigned, **When** the operator views the Cameras tab, **Then** an empty state is shown indicating no cameras are assigned to this container, with guidance to assign cameras from the Containers tab.
3. **Given** no container is selected (e.g., no containers exist), **When** the operator views the Cameras tab, **Then** all cameras are shown globally (fallback behavior preserving current functionality).
4. **Given** the operator switches the active container from "Kitchen Unit" to "Warehouse Unit", **When** the Cameras tab is visible, **Then** the camera list updates to show only cameras belonging to "Warehouse Unit".

---

### User Story 3 - View Evidence Scoped to Active Container (Priority: P2)

When an operator has an active container selected, the evidence/diagnostics views filter to show only evidence captured by cameras belonging to that container. This ensures the operator sees only relevant evidence for the deployment unit they are managing.

**Why this priority**: Evidence scoping follows naturally from camera scoping. Slightly lower priority because evidence is viewed less frequently than live camera feeds, and the client-side filtering approach can be implemented incrementally.

**Independent Test**: Can be tested by selecting a container, navigating to the Diagnostics tab, and verifying that evidence entries are filtered to cameras in the active container. Delivers focused evidence review.

**Acceptance Scenarios**:

1. **Given** "Kitchen Unit" is active with cameras cam-A and cam-B, **When** the operator views evidence for a session, **Then** only evidence from cam-A and cam-B is shown.
2. **Given** no container is selected, **When** the operator views evidence, **Then** all evidence is shown (global fallback).
3. **Given** the operator switches containers while viewing evidence, **Then** the evidence list refreshes to show only evidence from cameras in the newly selected container.

---

### User Story 4 - Codebase Free of Semantic Container ID Assumptions (Priority: P1)

A developer reviews the codebase and confirms that no production code or test fixture assumes a specific container ID format (e.g., "fridge-1"). All container IDs are treated as opaque strings — displayed in monospace, never parsed, never used as display labels. Test fixtures use realistic UUIDs or clearly-synthetic IDs (e.g., "container-abc-123") rather than semantic names that could be confused for labels.

**Why this priority**: This is a data integrity and correctness concern. If any codepath assumes "fridge-1" or similar semantic defaults, the system will break when deployed with UUID-based container IDs from PiOrchestrator.

**Independent Test**: Can be verified by searching the codebase for any hardcoded container ID patterns and confirming zero matches in production code. Test fixtures should use opaque-looking IDs.

**Acceptance Scenarios**:

1. **Given** a code audit of `src/` production files, **When** searching for hardcoded container IDs or semantic defaults, **Then** zero matches are found.
2. **Given** a UI component displaying a container, **When** rendering the container ID, **Then** it is always shown in monospace font as a secondary element, never as the primary label.
3. **Given** the AllowlistEntryForm placeholder text currently says "e.g., container-001", **When** this audit is complete, **Then** the placeholder uses a UUID example (e.g., "e.g., 550e8400-...") to reinforce the opaque model.

---

### User Story 5 - DEV Environment Validation (Priority: P2)

A developer connects the dashboard to the live Dokku DEV environment (PiOrchestrator on the Raspberry Pi) and validates that: containers load in the picker, selecting a container scopes camera views correctly, and the full flow works with real UUID container IDs from the backend.

**Why this priority**: End-to-end validation against real data ensures the opaque identity model works in practice, not just in mocks.

**Independent Test**: Can be tested by running the dashboard with `ssh -L 8082:localhost:8082 pi`, loading the Containers picker, and visually confirming containers with UUID IDs appear with friendly names.

**Acceptance Scenarios**:

1. **Given** the dev server is connected to PiOrchestrator via SSH tunnel, **When** the dashboard loads, **Then** the container picker shows containers returned by the live API with their labels.
2. **Given** a container is selected in the picker, **When** the operator switches to the Cameras tab, **Then** only cameras assigned to that container in PiOrchestrator are displayed.
3. **Given** evidence of successful DEV validation, **When** the feature is submitted for review, **Then** screenshots or logs are included as verification artifacts.

---

### Edge Cases

- What happens when the container list is empty (no containers created yet)? The picker shows an empty state with guidance to create a container from the Containers tab.
- What happens when a container is deleted while it is the active selection? The active selection is cleared, and the picker falls back to the first available container or shows empty state.
- What happens when the local storage contains a container ID that no longer exists? The stale selection is cleared on next load and the picker defaults to the first available container.
- What happens during a network error while fetching the container list? The picker shows a loading/error state using existing resilience patterns (graceful degradation for 404/503).
- What happens when there is only one container? It is auto-selected and the picker shows it as selected. The picker is still visible so the operator knows which container is active.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a container picker component that lists all containers from the backend, displaying friendly names prominently and opaque IDs secondarily in monospace.
- **FR-002**: System MUST persist the selected container ID in local storage so it survives page refreshes and browser restarts.
- **FR-003**: System MUST restore the last-selected container on dashboard load, falling back to the first available container if the stored selection is stale or invalid.
- **FR-004**: System MUST scope the Cameras tab to show only cameras assigned to the active container, using the container's camera assignment data.
- **FR-005**: System MUST scope the Evidence/Diagnostics views to show only evidence from cameras belonging to the active container (client-side filtering).
- **FR-006**: System MUST show all data globally (current behavior) when no container is selected or no containers exist, preserving backward compatibility.
- **FR-007**: System MUST treat all container IDs as opaque strings — never parsing, splitting, or inferring meaning from their format.
- **FR-008**: System MUST display container IDs in monospace font as secondary information, with friendly names (labels) as the primary display.
- **FR-009**: System MUST handle graceful degradation when the container list API is unavailable (404/503), following existing resilience patterns.
- **FR-010**: System MUST update the AllowlistEntryForm placeholder to use a UUID example instead of "container-001".
- **FR-011**: System MUST update camera and evidence views reactively when the operator switches the active container — no page reload required.

### Key Entities

- **Active Container Selection**: The currently-selected container context that scopes views across tabs. Stored locally. Contains the container's opaque ID.
- **Container**: An existing entity (Feature 043) with opaque ID, optional label, optional description, and camera assignments. Fetched from `/api/v1/containers`.
- **Camera Assignment**: Links a camera device to a container position (1-4). Used to determine which cameras belong to the active container.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can select a container and see only its cameras within 2 seconds of selection, without a full page reload.
- **SC-002**: 100% of production code paths treat container IDs as opaque strings — zero hardcoded semantic defaults found in audit.
- **SC-003**: Container selection persists across browser sessions — operator sees the same container selected after closing and reopening the dashboard.
- **SC-004**: Dashboard degrades gracefully when no containers are available — all existing functionality (global camera view, evidence view) continues to work.
- **SC-005**: DEV validation confirms container list loads from live PiOrchestrator and camera scoping works with real UUID container IDs.

## Assumptions

- The PiOrchestrator `/api/v1/containers` endpoint returns container data with camera assignments (confirmed by Feature 043 implementation).
- Container-scoped camera filtering will be done client-side by cross-referencing the active container's `cameras` array with the global camera list. No new backend endpoint is needed.
- Evidence filtering is client-side: filter evidence entries whose `camera_id` appears in the active container's camera assignments.
- The container picker will be placed in the app header/navigation area, visible across all tabs.
- Local storage key for selected container: follows existing pattern (e.g., `delicasa-pi-selected-container`).
