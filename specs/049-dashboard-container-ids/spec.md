# Feature Specification: Dashboard Container IDs

**Feature Branch**: `049-dashboard-container-ids`
**Created**: 2026-02-09
**Status**: Complete (verified — no implementation needed)
**Input**: User description: "Remove any hardcoded 'fridge-1' usage. UI should fetch container list (UUID + label) and operate by UUID. Inventory review screens should show label, store UUID, and query results by UUID."

## Context

Features 043 (Container Identity UI), 046 (Opaque Container Identity), 047 (Inventory Delta Viewer), and 048 (Inventory Review) collectively addressed all aspects of this request prior to this feature being specified. This spec documents the verification and any remaining cosmetic cleanup.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - No Hardcoded Container IDs in Production Code (Priority: P1)

A developer searches the entire `src/` directory for "fridge-1" or any other hardcoded container ID and confirms zero results. All container references use opaque IDs fetched from the API at runtime.

**Why this priority**: Hardcoded IDs break the system when deployed against real PiOrchestrator backends that use UUIDs.

**Independent Test**: `grep -r "fridge-1" src/` returns zero matches.

**Acceptance Scenarios**:
- **Given** the production codebase, **when** searched for literal "fridge-1", **then** zero matches are found
- **Given** the production codebase, **when** searched for any hardcoded container ID pattern, **then** all container IDs come from API responses or user state

### User Story 2 - Container Picker Driven by API (Priority: P1)

An operator opens the dashboard and sees a container picker in the header populated with containers from `/api/v1/containers`. Each option shows the container label as primary text and a truncated UUID as secondary text.

**Why this priority**: Operators must select containers dynamically, not from a hardcoded list.

**Independent Test**: Load the dashboard with the container API returning 2+ containers and verify the picker shows all of them with correct labels.

**Acceptance Scenarios**:
- **Given** the API returns 3 containers, **when** the picker loads, **then** all 3 appear with labels
- **Given** no container is selected, **when** the container list loads, **then** the first container is auto-selected
- **Given** the previously selected container was deleted, **when** the picker loads, **then** it falls back to the first available container

### User Story 3 - UUID Used in All API Calls (Priority: P1)

When an operator selects a container, all subsequent API calls (inventory runs, latest analysis, camera data) use the container's UUID, not a hardcoded value.

**Why this priority**: Querying by the wrong ID returns wrong data or errors.

**Independent Test**: Select a container and verify network requests to `/v1/containers/{uuid}/inventory/runs` use the selected UUID.

**Acceptance Scenarios**:
- **Given** container "abc-123" is selected, **when** inventory runs are fetched, **then** the URL contains `containers/abc-123`
- **Given** the operator switches containers, **when** new data loads, **then** URLs reflect the new UUID

### User Story 4 - Labels Displayed, UUIDs in Debug Views Only (Priority: P2)

Throughout the UI, containers are identified by their human-readable label. The raw UUID appears only in a subdued monospace style suitable for debugging.

**Why this priority**: Operators should never need to read or memorize UUIDs during normal operation.

**Independent Test**: View any inventory screen and confirm the container label is prominent while the UUID (if shown) is in small monospace text.

## Requirements

### Functional Requirements

- **FR-001**: No production code (`src/`) contains hardcoded container IDs — **VERIFIED COMPLETE**
- **FR-002**: Container picker fetches from `/api/v1/containers` — **VERIFIED COMPLETE** (Feature 046)
- **FR-003**: Selected container UUID stored in Zustand with localStorage persistence — **VERIFIED COMPLETE** (Feature 046)
- **FR-004**: All inventory API calls parameterized by active container UUID — **VERIFIED COMPLETE** (Feature 047)
- **FR-005**: Container labels displayed as primary text in all views — **VERIFIED COMPLETE** (Features 046, 048)
- **FR-006**: UUIDs shown only in `font-mono text-xs text-muted-foreground` style — **VERIFIED COMPLETE** (Feature 046)

### Assumptions
- PiOrchestrator `/api/v1/containers` endpoint returns `{id, label}` for each container
- Container IDs are opaque strings (may be UUIDs or other formats)

### Dependencies
- Feature 043: Container Identity UI (merged)
- Feature 046: Opaque Container Identity (merged)
- Feature 047: Inventory Delta Viewer (merged)
- Feature 048: Inventory Review (in progress on current branch)

### Out of Scope
- Backend container ID migration (PiOrchestrator concern)
- Creating new containers from the dashboard (covered by Feature 043)
- Container deletion or editing (covered by Feature 043)

## Success Criteria

- **SC-001**: `grep -r "fridge-1" src/` returns zero results — **PASSING**
- **SC-002**: Container picker renders containers from API with labels — **PASSING**
- **SC-003**: Active container UUID persists across page reloads — **PASSING**
- **SC-004**: Inventory screens scoped by active container UUID — **PASSING**
- **SC-005**: All tests pass: unit, component, integration, E2E — **PASSING**
