# Research: 046 Opaque Container Identity

**Branch**: `046-opaque-container-identity` | **Date**: 2026-02-08

## Research Topics

### R1: Active Container State Management Pattern

**Decision**: Use a **Zustand store** with `persist` middleware for active container selection.

**Rationale**:
- Consistent with existing patterns: `features.ts` uses Zustand + `persist` for feature flags with `localStorage`
- Single source of truth accessible from any component or hook via `useActiveContainer()` selector
- Zustand `getState()` allows non-React access if needed (e.g., in API interceptors)
- `persist` middleware handles localStorage serialization/deserialization automatically
- Minimal boilerplate — store is ~30 lines

**Alternatives considered**:
- **React Context**: Would require wrapping `<Dashboard />` in a provider. Viable but adds unnecessary nesting. Zustand is already used for global client state and doesn't require provider wrapping.
- **React Query + localStorage manually**: Anti-pattern — selected container is client state, not server state. Would pollute the server-state cache.
- **URL search params**: Would add complexity (URL synchronization) for minimal benefit. Dashboard is a single-page app without deep linking requirements.

**Storage key**: `delicasa-pi-active-container` (follows existing `delicasa-pi-*` naming pattern)

---

### R2: Container Picker Placement & Component Design

**Decision**: Place container picker in the **header bar**, between the branding and theme toggle. Use a shadcn/ui `Select` component.

**Rationale**:
- Header is always visible across all tabs — picker context is always clear
- Existing header has space between branding (`<div>` with logo + title) and `<ThemeToggle />`
- `Select` from shadcn/ui is the standard dropdown pattern in this project (used in AssignCameraDialog, ConfigSection)
- On mobile (sm breakpoint), picker collapses cleanly with the existing responsive layout

**Alternatives considered**:
- **Sidebar or drawer**: Over-engineered for a simple selection. No sidebar exists in the current design.
- **Below tabs**: Would be confused with tab-specific content. Container context is global.
- **Floating action button**: Non-standard for selection UIs. Better for creation actions.

**Component**: `ContainerPicker.tsx` in `src/presentation/components/containers/`

---

### R3: Camera Scoping Strategy (Client-Side Filtering)

**Decision**: Use **client-side filtering** by cross-referencing the active container's `cameras` array (from `useContainers()` data) with the global camera list from `useCameras()`.

**Rationale**:
- No backend changes needed — PiOrchestrator's `/api/v1/containers` already returns `ContainerDetail` with `cameras: CameraAssignment[]`
- Each `CameraAssignment` has a `device_id` that matches `Camera.id` from `/api/v1/cameras`
- Performance is negligible — max 4 cameras per container × ~20 total cameras = trivial filter
- Follows Feature 044 pattern: "Client-side filtering preferred when API doesn't support server-side params"

**Implementation approach**:
1. New derived hook: `useContainerCameras(containerId)` that:
   - Reads active container detail from `useContainers()` cache
   - Filters `useCameras()` results to only cameras with matching `device_id`
   - Falls back to all cameras when no container is selected
2. `CameraSection` receives an optional `containerCameraIds` prop or uses the new hook directly

**Alternatives considered**:
- **Backend query param `?container_id=xyz`**: Would require PiOrchestrator changes. YAGNI — client-side join is trivial for this scale.
- **New dedicated endpoint**: Over-engineered. Container detail already includes camera assignments.

---

### R4: Evidence Scoping Strategy

**Decision**: **Client-side filtering** of evidence entries using the active container's camera IDs as a filter set.

**Rationale**:
- Evidence entries have a `camera_id` field
- Active container provides a set of assigned `device_id` values
- Filter: `evidence.filter(e => containerCameraIds.has(e.camera_id))`
- Consistent with camera scoping approach (R3)

**Implementation**: Modify `EvidencePanel`'s existing `filterCameraId` mechanism or add a container-level filter upstream.

---

### R5: Stale Selection Handling

**Decision**: **Validate on data load** — when container list arrives, check if stored `activeContainerId` exists in the list. If not, auto-select the first container.

**Rationale**:
- Simple and reliable — runs every time container data refreshes
- Handles deletion, backend wipe, or ID format changes transparently
- No separate "validation" API call needed

**Implementation**: In the Zustand store or a `useEffect` in the picker component that watches `containers` data and `activeContainerId`.

---

### R6: Codebase Audit Findings

**Audit result**: Production code is **clean** — zero hardcoded semantic container defaults in `src/`.

**One minor fix needed**:
- `src/presentation/components/allowlist/AllowlistEntryForm.tsx:162` — placeholder text `"e.g., container-001"` should become `"e.g., 550e8400-e29b-..."` to reinforce opaque ID model.

**Test fixtures**: All test container IDs are either:
- UUID-format (`550e8400-e29b-41d4-a716-446655440000`) — already good
- Synthetic opaque (`container-abc-123`, `container-001`) — acceptable for tests, not semantic defaults
- No instances of `"fridge-1"`, `"fridge"`, or any real-world semantic names in any file

**No action needed for test fixtures** — they already treat IDs as opaque strings.

---

### R7: Existing Infrastructure Available from Feature 043

Feature 043 (merged via PR #7) provides:

| Asset | Status | Reuse in 046 |
|-------|--------|--------------|
| `v1ContainersApi` (API client) | Complete | Reuse for container list fetching |
| `useContainers()` hook | Complete | Reuse for picker data source |
| `ContainerDetail` type | Complete | Reuse for camera assignment cross-reference |
| `ContainerSection` component | Complete | Unchanged — still manages CRUD |
| Query keys (`containers`) | Complete | Reuse for cache invalidation |
| Zod schemas | Complete | No changes needed |
| `isFeatureUnavailable()` resilience | Complete | Reuse for graceful degradation |

**New artifacts needed**:
- Zustand store: `src/application/stores/activeContainer.ts`
- Picker component: `src/presentation/components/containers/ContainerPicker.tsx`
- Derived hook: `useContainerCameras()` in `useContainers.ts`
- Tests for the above
