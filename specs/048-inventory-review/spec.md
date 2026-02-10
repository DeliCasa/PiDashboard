# Feature Specification: Inventory Review — Run History & Enhanced Review Workflow

**Feature Branch**: `048-inventory-review`
**Created**: 2026-02-09
**Status**: Draft
**Input**: User description: "Ship an operator UI for inventory analysis: list analysis runs by containerId and by sessionId, show before/after images + computed delta, enable approve/override review flow with validated inputs, ensure IDs are opaque with friendly labels sourced from metadata/config"

## Context

Feature 047 (Inventory Delta Viewer) delivered the foundational inventory UI: latest-delta display per container, before/after evidence images, inline approve/override review form, and audit trail. This feature extends that foundation with **run history browsing**, **enhanced friendly-label display**, and **hardened error handling** to complete the operator inventory review experience.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Analysis Runs for a Container (Priority: P1)

An operator selects a container and wants to see not just the latest analysis but a chronological list of all analysis runs for that container. Each run in the list shows its status (pending, completed, needs_review, approved, failed), session timestamp, and a brief summary (e.g., "5 items changed"). The operator selects a run from the list to view its full delta, evidence images, and review controls.

**Why this priority**: The 047 feature only shows the latest run. Operators reviewing historical inventory changes need to browse past runs to spot trends, revisit unreviewed sessions, or audit previously approved corrections. Without a run list, operators lose visibility into anything that isn't the most recent analysis.

**Independent Test**: Navigate to Inventory tab for a container with 3+ analysis runs. Verify all runs appear in a list ordered by date. Click a specific run. Verify the detail view shows that run's delta, evidence, and review state.

**Acceptance Scenarios**:

1. **Given** a container with multiple completed analysis runs, **When** the operator navigates to the Inventory tab, **Then** the system displays a list of all runs sorted newest-first, each showing status badge, timestamp, and item-change count.
2. **Given** the run list is displayed, **When** the operator clicks a specific run, **Then** the detail pane shows that run's delta table, evidence images, and review controls (reusing the existing 047 components).
3. **Given** a container with more than 20 runs, **When** the operator scrolls the run list, **Then** additional runs load progressively (pagination or infinite scroll) without blocking the UI.
4. **Given** a container with no analysis runs, **When** the operator views the Inventory tab, **Then** the system displays an empty state explaining no inventory data is available yet.
5. **Given** the operator is viewing the run list, **When** a new run completes in the background, **Then** the list automatically updates to include the new run at the top (via polling or refetch).

---

### User Story 2 - Look Up a Run by Session ID (Priority: P2)

An operator receives a session ID from an external system (e.g., alert, log entry, or another team member) and wants to directly navigate to that session's inventory analysis. The operator enters or pastes the session ID and the system loads the corresponding run detail.

**Why this priority**: Session IDs are the primary cross-system identifier. When investigating incidents or responding to alerts, operators need to jump directly to a specific session without scrolling through a container's run history. This saves time in time-sensitive review scenarios.

**Independent Test**: Given a known session ID for a completed analysis, enter it in the session lookup field. Verify the system navigates to the correct run's detail view showing delta, evidence, and review state. Test with an invalid session ID and verify a clear error message appears.

**Acceptance Scenarios**:

1. **Given** the operator is on the Inventory tab, **When** they enter a valid session ID in the lookup field and submit, **Then** the system navigates to that session's run detail view.
2. **Given** a session ID that has no associated analysis, **When** the operator submits it, **Then** the system displays a clear "No inventory analysis found for this session" message.
3. **Given** a session ID from a different container than the currently selected one, **When** the operator looks it up, **Then** the system still displays the result (session lookup is not scoped to the active container).
4. **Given** the operator pastes a session ID with leading/trailing whitespace, **When** they submit, **Then** the system trims the input and performs the lookup correctly.

---

### User Story 3 - Approve or Override a Review with Validated Inputs (Priority: P3)

An operator viewing a run's delta wants to approve it as-is or submit corrections. When overriding, the system requires at least one correction (changed count, added item, or removed item) and validates all inputs before submission. Invalid inputs (negative counts, empty item names) are blocked with inline error messages. The corrected delta is clearly summarized before final submission.

**Why this priority**: The 047 review form exists but this story adds explicit input validation, mandatory corrected_delta for overrides, and a pre-submission summary showing the full corrected inventory picture. This prevents bad data from entering the system and gives operators confidence in what they're submitting.

**Independent Test**: Open a needs_review session. Attempt to submit an override with no corrections — verify it's blocked. Enter a negative count — verify inline error. Add a valid correction, submit, and verify the confirmation dialog shows a clear summary of all corrections. Approve a different session and verify one-click approval works.

**Acceptance Scenarios**:

1. **Given** a run with status "needs_review", **When** the operator clicks "Override" without making any corrections, **Then** the submit button is disabled and a message indicates at least one correction is required.
2. **Given** the operator edits an item count to a negative number, **When** the field loses focus, **Then** an inline error "Count must be 0 or greater" appears and the submit button remains disabled.
3. **Given** the operator adds a new item with an empty name, **When** the field loses focus, **Then** an inline error "Item name is required" appears.
4. **Given** the operator has made valid corrections, **When** they click "Submit Review", **Then** a confirmation dialog shows: number of corrections, list of changes (item name, original vs. corrected count), and any added/removed items.
5. **Given** the operator confirms the override submission, **When** the review is accepted by the server, **Then** the run status changes to "approved", the form closes, and a success notification appears.
6. **Given** the operator confirms but the server returns a conflict (already reviewed), **When** the error is received, **Then** the form preserves all edits, displays a conflict message, and offers a "Refresh & Re-review" option.

---

### User Story 4 - Friendly Labels for Opaque IDs (Priority: P4)

Throughout the inventory UI, all identifiers (container IDs, session IDs, run IDs) are displayed with friendly, human-readable labels sourced from metadata or configuration. Raw opaque IDs are shown only as secondary information in a subdued style. Operators never see semantically misleading identifiers like "fridge-1" unless that is the actual configured label.

**Why this priority**: Opaque ID handling was established in feature 046 for containers, but the inventory UI surfaces additional IDs (session, run) that need consistent treatment. Friendly labels reduce cognitive load and prevent operators from misidentifying containers based on internal system names.

**Independent Test**: View the run list and detail view. Verify container names show the configured label (e.g., "Kitchen Fridge") with the opaque ID in small monospace text. Verify session IDs and run IDs are displayed as truncated monospace strings, never parsed or given semantic meaning.

**Acceptance Scenarios**:

1. **Given** a container with a configured label "Kitchen Fridge", **When** the operator views a run's detail, **Then** the container is identified by "Kitchen Fridge" with the opaque ID shown below in muted monospace.
2. **Given** a container with no configured label, **When** the operator views a run, **Then** the container shows "Unnamed Container" with the truncated opaque ID.
3. **Given** any run in the list, **When** the session ID and run ID are displayed, **Then** they appear as truncated monospace strings (e.g., "a1b2c3d4...") and are never given human-readable labels like "Session 1" or "Run #3".
4. **Given** a session ID column in the run list, **When** the operator hovers or clicks a truncated ID, **Then** a tooltip or copy action reveals the full ID value.

---

### Edge Cases

- What happens when the operator navigates to the Inventory tab with no container selected? The system shows a prompt asking the operator to select a container first (consistent with 047 behavior).
- What happens when the run list API endpoint returns 503 (service unavailable)? The run list shows a graceful degradation message ("Inventory service temporarily unavailable") with a retry button. The tab remains visible.
- What happens when an operator tries to review a run that was just reviewed by someone else? The server returns 409 Conflict. The UI preserves the operator's edits, shows a conflict toast, and offers "Refresh & Re-review".
- What happens when the session lookup returns a run from a container the operator hasn't viewed before? The system displays the run detail without switching the active container. A note indicates which container the run belongs to.
- What happens when the operator rapidly switches containers while the run list is loading? The previous request is cancelled and the new container's runs are fetched. No stale data is displayed.
- What happens when a run has zero items in the delta (before and after identical)? The detail view shows "No changes detected" with the before/after counts still visible (consistent with 047 behavior).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a chronological list of all analysis runs for the currently selected container, ordered newest-first.
- **FR-002**: Each run in the list MUST show: status badge, session timestamp, item-change summary count, and a truncated session ID.
- **FR-003**: System MUST support paginated or progressively-loaded run lists for containers with large numbers of analyses.
- **FR-004**: System MUST allow operators to select a run from the list to view its full detail (delta table, evidence images, review controls).
- **FR-005**: System MUST provide a session ID lookup field that accepts a session ID and navigates to the corresponding run detail, independent of the active container.
- **FR-006**: Session ID lookup MUST trim whitespace from input and display a clear error for invalid or not-found sessions.
- **FR-007**: System MUST validate all review form inputs before enabling submission: counts must be non-negative integers, item names must be non-empty, at least one correction is required for override actions.
- **FR-008**: System MUST display inline validation errors on individual form fields when inputs are invalid.
- **FR-009**: System MUST show a confirmation summary before submitting an override review, listing all corrections with original and corrected values.
- **FR-010**: System MUST preserve operator edits in the review form when a submission fails (network error or server conflict), allowing retry without re-entering data.
- **FR-011**: System MUST display container labels from metadata/configuration as the primary identifier, with opaque IDs shown as secondary information in muted monospace style.
- **FR-012**: System MUST display session IDs and run IDs as truncated monospace strings, with full ID available via tooltip or copy action.
- **FR-013**: System MUST never display semantically misleading identifiers; labels come only from configured metadata, not from parsing opaque IDs.
- **FR-014**: System MUST auto-refresh the run list when a new analysis completes while the operator is viewing the list.
- **FR-015**: System MUST cancel in-flight run list requests when the operator switches containers to prevent stale data display.
- **FR-016**: System MUST handle service unavailability (404/503) for the run list endpoint with graceful degradation, showing a stable message without broken layouts.

### Key Entities

- **Analysis Run**: A single inventory analysis execution for a container. Has a unique run ID, session ID, container ID, status, timestamps, delta entries, evidence images, and optional review. The run is the primary navigational unit in the run list.
- **Run List**: A paginated collection of analysis runs for a container, ordered by creation timestamp descending. Supports progressive loading for containers with extensive history.
- **Session Lookup**: A cross-container lookup mechanism that resolves a session ID to its corresponding analysis run, regardless of which container is currently active.

## Assumptions

- Feature 047 (Inventory Delta Viewer) is merged and provides the foundational components: InventoryDeltaTable, InventoryEvidencePanel, InventoryReviewForm, InventoryAuditTrail, and supporting hooks/schemas.
- A new BridgeServer endpoint will be available (or will be requested via handoff) to list analysis runs by container ID with pagination support. The existing "latest" endpoint returns only one run.
- Container labels are available via the existing container API and Zustand store from feature 046. No new container metadata endpoint is needed.
- The session lookup uses the existing `getBySession(sessionId)` API client method from feature 047. No new endpoint is needed for this.
- The run list endpoint will return the same `InventoryAnalysisRun` shape as the existing single-run endpoints, wrapped in a paginated response envelope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can view the full run history for any container within 3 seconds of selecting the Inventory tab.
- **SC-002**: Operators can look up a specific session by ID and see its analysis detail within 2 seconds of submitting the lookup.
- **SC-003**: 100% of invalid review inputs (negative counts, empty names, no corrections on override) are caught by client-side validation before any server request is made.
- **SC-004**: The system handles all display of IDs consistently: container labels as primary, opaque IDs as secondary muted monospace text, session/run IDs as truncated monospace with copy/tooltip.
- **SC-005**: The run list updates within 15 seconds when a new analysis completes, without the operator manually refreshing.
- **SC-006**: The UI remains responsive and stable when the run list API is unavailable, with no error modals, console noise, or broken layouts.
