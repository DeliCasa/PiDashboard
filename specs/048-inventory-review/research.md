# Research: Inventory Review — Run History & Enhanced Review Workflow

**Feature**: 048-inventory-review
**Date**: 2026-02-09

## Research Questions & Findings

### RQ-1: What new API endpoint is needed for listing analysis runs by container?

**Decision**: Add `GET /api/v1/containers/:containerId/inventory/runs` with offset/limit pagination, reusing the same `InventoryAnalysisRun` shape in a paginated wrapper.

**Rationale**: Feature 047 defined two read endpoints: `GET /v1/containers/:id/inventory/latest` (single newest run) and `GET /v1/sessions/:id/inventory-delta` (single run by session). Neither supports listing multiple runs. The offset/limit pagination pattern is already established in this project by the V1 Auto-Onboard API (`PaginationSchema` in `v1-auto-onboard-schemas.ts` lines 91-97) with `total`, `limit`, `offset`, `has_more` fields.

The response payload reuses the existing `InventoryAnalysisRun` schema items — each run in the list has the same shape returned by the single-run endpoints. This means the frontend can reuse all existing components (InventoryDeltaTable, InventoryEvidencePanel, InventoryReviewForm, InventoryAuditTrail) when a run is selected from the list.

**Alternatives considered**:
- Cursor-based pagination (rejected: offset/limit is simpler, consistent with existing pattern, and inventory runs for a single container won't reach volumes where cursor-based is necessary)
- Client-side fetching of all runs at once (rejected: unbounded response size as history grows)
- New endpoint returning only summary fields (rejected: adds another endpoint; instead, the full shape is returned but evidence image URLs can be omitted server-side for list responses if performance becomes a concern)

**Backend dependency**: Requires a handoff to PiOrchestrator/BridgeServer to implement this endpoint. The existing BridgeServer 031-vision-inventory-delta spec should be extended. A handoff document should be generated.

### RQ-2: How should the InventorySection layout change to accommodate run history?

**Decision**: Refactor InventorySection into a list-detail layout: a `RunList` sidebar/panel on the left showing chronological run summaries, and the existing detail view (delta table + evidence + review + audit) on the right for the selected run. On mobile, the list and detail are stacked vertically with a back button.

**Rationale**: The current InventorySection (`src/presentation/components/inventory/InventorySection.tsx`) is single-run focused — it fetches `useLatestInventory(containerId)` and renders the result directly. The refactored version needs a two-level navigation: (1) select which run to view, (2) view the full run detail.

The list-detail pattern is well-established in operator dashboards and matches the tab-content area width available in the PiDashboard layout. The detail view reuses all existing 047 components without modification.

**Alternatives considered**:
- Modal overlay for run detail (rejected: too constraining for the evidence images and review form)
- Accordion/expandable rows (rejected: each run's detail content is too large; only one run should be visible at a time)
- Replace InventorySection entirely with a new page (rejected: breaks tab navigation pattern; Inventory tab should contain everything)

### RQ-3: What validation is missing from the existing review form?

**Decision**: Add inline validation for item counts (non-negative integers), item names (non-empty), and override guard (at least one correction required). Implement using component-local validation state, not a form library.

**Rationale**: The existing InventoryReviewForm (`src/presentation/components/inventory/InventoryReviewForm.tsx`) relies on HTML5 `min={0}` on number inputs and the confirmation dialog for review. It does not: (1) show inline error messages when a field is invalid, (2) disable the submit button when empty overrides are attempted, or (3) validate item names when added/renamed.

Component-local validation (tracking per-field error state in React state) is preferred over React Hook Form because: the form is dynamic (rows can be added/removed), the validation rules are simple, and adding a form library for one component violates YAGNI (constitution IV).

**Alternatives considered**:
- React Hook Form with Zod resolver (rejected: heavy dependency for a single form; dynamic rows add complexity)
- Schema validation on the client using SubmitReviewRequestSchema (rejected: Zod validation is binary pass/fail; doesn't provide per-field error messages for the UI)
- Server-side validation only (rejected: doesn't meet FR-007/FR-008 requiring client-side validation before any request)

### RQ-4: How should opaque IDs be displayed consistently?

**Decision**: Establish a reusable `OpaqueId` display pattern: truncated monospace text with click-to-copy (tooltip showing "Copied!") using the existing clipboard pattern from DiagnosticsView.

**Rationale**: Two ID display patterns exist in the codebase:
1. **ContainerPicker** (`src/presentation/components/containers/ContainerPicker.tsx` lines 134-138): `font-mono text-xs text-muted-foreground` with `slice(0,8)...slice(-4)` truncation
2. **DiagnosticsView** (`src/presentation/components/cameras/DiagnosticsView.tsx` lines 81-92): `navigator.clipboard.writeText()` with toast feedback

Session IDs and run IDs don't have friendly labels (unlike containers with configured names), so they're always shown as truncated opaque strings. Container labels come from the existing `useContainerList` hook and Zustand store from feature 046.

The consistent pattern: friendly label (if available) as primary text, opaque ID in `font-mono text-xs text-muted-foreground` as secondary, click-to-copy on the ID.

**Alternatives considered**:
- Tooltip showing full ID on hover (rejected as primary mechanism: mobile devices don't have hover; click-to-copy is more universally useful)
- Auto-generated sequential labels like "Run #1, Run #2" (rejected: violates FR-013 — no semantically misleading identifiers)
- Showing full IDs always (rejected: UUIDs are too long for table cells)

### RQ-5: What pagination Zod schemas are needed?

**Decision**: Reuse the `PaginationSchema` pattern from `v1-auto-onboard-schemas.ts` and add a `RunListResponseSchema` to `inventory-delta-schemas.ts`.

**Rationale**: The existing `PaginationSchema` (`{ total, limit, offset, has_more }`) is the project standard. Rather than importing it cross-feature (which creates coupling), define an identical schema in the inventory schemas file. The run list response wraps `runs: InventoryAnalysisRunSchema[]` with pagination metadata.

A `RunListSummarySchema` (lightweight per-run entry with only run_id, session_id, container_id, status, metadata) is preferred for the list endpoint to minimize response size. The detail view uses the full `InventoryAnalysisRunSchema` when a run is selected.

**Alternatives considered**:
- Importing PaginationSchema from v1-auto-onboard-schemas (rejected: cross-feature import creates coupling; duplicating a 4-field schema is trivial)
- No separate summary schema, full run objects in list (rejected: evidence image URLs and full delta arrays make list responses unnecessarily large)

### RQ-6: What polling strategy for the run list?

**Decision**: 30-second polling on the run list when any run in the list has a "pending" status. No polling when all runs are terminal. Consistent with 047's visibility-aware pattern.

**Rationale**: The existing `useLatestInventory` hook polls at 15 seconds for a single run. The run list is a larger payload, so 30 seconds is more appropriate. The polling trigger is the presence of any non-terminal status run in the current page of results. When a new pending run appears and completes, the list automatically updates.

Visibility-aware polling (pause when tab hidden) follows the established pattern from camera hooks and useLatestInventory.

**Alternatives considered**:
- No polling, manual refresh only (rejected: spec SC-005 requires auto-refresh within 15 seconds; 30-second polling with manual refresh button meets this)
- WebSocket for real-time updates (rejected: no WebSocket infrastructure exists; over-engineered for current scale)
- Polling at 15 seconds like single-run (rejected: larger payload doesn't need as frequent updates)

## Dependencies

| Dependency | Status | Impact |
|------------|--------|--------|
| Feature 047 (Inventory Delta Viewer) | In progress (branch) | Must be merged first; provides all foundational components, schemas, and hooks |
| BridgeServer run list endpoint | Not started | New endpoint `GET /v1/containers/:id/inventory/runs` with pagination; requires handoff |
| PiOrchestrator proxy for run list | Not started | Must proxy the new endpoint through to BridgeServer |
| Container identity (046) | Merged | Provides container labels via `useContainerList` and `useActiveContainerId` |
| Tooltip component (shadcn/ui) | Available | `src/components/ui/tooltip.tsx` already exists |
