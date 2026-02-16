# Feature Specification: Live E2E Inventory Delta Display

**Feature Branch**: `051-inventory-delta-e2e-verify`
**Created**: 2026-02-12
**Updated**: 2026-02-15
**Status**: Draft
**Input**: User description: "Live E2E Inventory Delta Display (seeded run → visible delta → reviewable outcome)"

## User Scenarios & Testing

### User Story 1 - View Seeded Inventory Run with Full Detail (Priority: P1)

An operator opens the dashboard, selects a container, and sees the latest inventory runs. They open a specific run and see:
- Before/after evidence previews or links
- A delta table with per-item changes
- A summary row with totals
- The detection confidence for each item
- A human-readable reason for each detected change
- A correlation ID for debugging or cross-referencing with backend logs

**Why this priority**: This is the core display loop. If the operator cannot see all relevant fields for a run, the feature has no value.

**Independent Test**: Can be verified by seeding one run via PiOrchestrator, navigating to the run in the dashboard, and confirming every field renders.

**Acceptance Scenarios**:

1. **Given** a completed inventory run exists for the selected container, **When** the operator opens the run detail, **Then** the delta table shows item name, SKU, before count, after count, change, confidence tier, and reason for each item.
2. **Given** a run has associated evidence images, **When** the operator views the run, **Then** before/after image previews are displayed with an overlay toggle.
3. **Given** a run exists, **When** the operator views the run detail, **Then** a correlation ID is displayed for debugging purposes.

---

### User Story 2 - Status Lifecycle Rendering (Priority: P1)

The operator sees correct visual indicators for every possible run status: queued, running, completed, needs_review, failed. Each status has a distinct badge and appropriate behavior (e.g., a spinner for queued/running, actionable prompts for needs_review).

**Why this priority**: Without correct status rendering, the operator cannot understand the current state of any run. This is foundational to all other display.

**Independent Test**: Can be tested by creating runs in each status and verifying the correct badge/indicator renders for each.

**Acceptance Scenarios**:

1. **Given** a run in "queued" status, **When** displayed in the run list, **Then** it shows a "Queued" badge and a waiting indicator.
2. **Given** a run in "running" status, **When** displayed in the run detail, **Then** it shows a spinner and "Analysis In Progress" message.
3. **Given** a run in "needs_review" status with low confidence, **When** displayed, **Then** it shows the reasons why review is needed and highlights low-confidence items.
4. **Given** a run in "completed" status, **When** displayed, **Then** the review form is available.
5. **Given** a run in "failed" status, **When** displayed, **Then** the error message from metadata is shown.

---

### User Story 3 - Review Submission and State Update (Priority: P1)

The operator submits a review decision (approve or override with corrections) for a needs_review run and sees confirmation feedback. After submission, the run status updates to "approved" and the audit trail appears.

**Why this priority**: Review is the terminal operator action. Without it, the inventory flow cannot complete.

**Independent Test**: Can be tested by navigating to a needs_review run, clicking Approve, and confirming the status updates and audit trail appears.

**Acceptance Scenarios**:

1. **Given** a needs_review run, **When** the operator clicks "Approve", **Then** the system submits the review, shows a success message, and the run status updates to "approved".
2. **Given** a needs_review run, **When** the operator clicks "Edit & Correct", modifies item counts, and submits, **Then** corrections are sent, a confirmation dialog is shown, and upon confirm the status updates.
3. **Given** a run that was already reviewed by another operator, **When** the operator submits a review, **Then** a conflict message is displayed with a refresh option.

---

### User Story 4 - Polling, Refresh, and Stale-Cache Prevention (Priority: P2)

The dashboard automatically polls for status updates on non-terminal runs and provides an explicit manual refresh action so the operator can force a data reload at any time. When new data arrives (via poll or manual refresh), the display updates without a full page reload.

**Why this priority**: Important for real-time awareness, but the core display (US1-US3) must work first.

**Independent Test**: Can be tested by observing that a pending run's status updates automatically after the backend completes processing, and that clicking a refresh button forces a data reload.

**Acceptance Scenarios**:

1. **Given** a run in a non-terminal status, **When** the operator stays on the page, **Then** the run list polls at regular intervals and updates when the status changes.
2. **Given** the operator is viewing the run list, **When** they click a "Refresh" action, **Then** the data reloads immediately.
3. **Given** a run transitions from "running" to "completed", **When** the next poll fires, **Then** the run list and detail view reflect the new status without manual action.

---

### User Story 5 - Error UX for Missing or Partial Data (Priority: P2)

The operator sees clear, actionable messages when things go wrong: a missing run returns a "not found" message, missing evidence shows a placeholder, backend unavailable shows a "service unavailable" card, and partial data (e.g., delta present but no evidence) gracefully degrades rather than crashing.

**Why this priority**: Error resilience is critical for production use but can be iterated on after the happy path works.

**Independent Test**: Can be tested by simulating each error scenario and confirming the corresponding UI state renders.

**Acceptance Scenarios**:

1. **Given** the operator searches for a non-existent session ID, **When** the lookup completes, **Then** a "not found" message is displayed.
2. **Given** the backend is unreachable, **When** the operator opens the inventory tab, **Then** a "service temporarily unavailable" message appears.
3. **Given** a run has delta data but no evidence images, **When** the operator views the run detail, **Then** the delta table renders normally and the evidence section shows a "no images available" placeholder.
4. **Given** a network error occurs during data fetch, **When** the operator sees the error, **Then** a retry button is available.

---

### Edge Cases

- What happens when a run has zero delta entries (no changes detected)?
- How does the system handle a run with all items at low confidence (avg < 0.5)?
- What if the backend returns an unknown status value not in the expected set?
- What if evidence image URLs are expired or return 404?
- What happens when the operator submits a review with invalid correction data?

## Requirements

### Functional Requirements

- **FR-001**: The system MUST display the full status lifecycle for inventory runs: queued, running, completed, needs_review, and failed.
- **FR-002**: Each item in the delta table MUST show: name, SKU (if available), before count, after count, change, confidence tier, and reason for the change (if available).
- **FR-003**: Every displayed run MUST surface a correlation ID for debugging and cross-referencing with backend systems.
- **FR-004**: The system MUST provide an explicit manual refresh action for the run list, in addition to automatic polling.
- **FR-005**: The system MUST handle missing or partial data gracefully: delta without evidence, evidence without overlays, and runs without delta data MUST render without errors.
- **FR-006**: Review submission (approve or override) MUST update the run status and display confirmation feedback.
- **FR-007**: A review conflict (another operator reviewed simultaneously) MUST show a conflict message with a refresh option.
- **FR-008**: The system MUST stop polling for runs in terminal statuses (approved, failed).
- **FR-009**: The system MUST provide a repeatable E2E verification playbook artifact documenting how to seed a run and confirm it displays correctly.

### Key Entities

- **InventoryAnalysisRun**: Represents one inventory analysis computation for a container. Key attributes: run ID, session ID, container ID, status, correlation ID, delta entries, evidence images, review, metadata.
- **DeltaEntry**: A per-item change record. Key attributes: item name, SKU, before/after counts, change, confidence score, reason/rationale.
- **EvidenceImages**: Before/after photographs with optional detection overlay annotations.
- **Review**: An operator's review decision (approve or override with corrections).

## Success Criteria

### Measurable Outcomes

- **SC-001**: With a real seeded run, the operator can navigate from the dashboard home to a visible delta table in under 4 clicks (container select, inventory tab, run click, scroll).
- **SC-002**: All 5 run statuses (queued, running, completed, needs_review, failed) render with distinct visual indicators and no missing states.
- **SC-003**: The correlation ID, confidence scores, and change reasons are visible on every run that contains them, without requiring the operator to expand or toggle any hidden UI.
- **SC-004**: Review submission succeeds and the UI reflects the new state within 2 seconds of the backend response.
- **SC-005**: A documented E2E verification playbook exists that any team member can follow to reproduce the seeded-run-to-visible-delta flow.
- **SC-006**: All existing inventory tests pass (unit + contract + E2E) with zero regressions after any patches.

## Assumptions

- The backend (PiOrchestrator/BridgeServer) supports or will support the `queued` and `running` status values. If not yet available, the dashboard treats them as equivalent to "pending" until the backend ships them.
- The `correlation_id` field will be present in the backend response for `InventoryAnalysisRun`. If absent, the dashboard displays "N/A" gracefully.
- The `rationale` field on `DeltaEntry` serves as the "reason" for the detected change. No separate `reasons` field is needed at the run level.
- Polling intervals (15s for detail, 30s for run list) are appropriate for the current deployment scale.

## Dependencies

- Depends on features 047 (inventory delta viewer) and 048 (inventory review), both completed.
- Backend dependency: PiOrchestrator must proxy the 4 V1 inventory endpoints to BridgeServer.

## Non-Requirements

- No redesign of the inventory UI layout or navigation.
- No new analytics or reporting beyond what BridgeServer returns.
- No new backend endpoints (only consuming existing ones with potentially new fields).

## Deliverables

- Updated `spec.md` (this file)
- `artifacts/e2e-verify.md` — step-by-step E2E verification playbook with real IDs and expected outputs
- `artifacts/api-contract.md` — exact endpoints and fields used, including polling rules
- `HANDOFF_051.md` — handoff packet with "delta visible: yes/no" verdict and root-cause if no
