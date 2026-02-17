# Feature Specification: Inventory Delta Viewer E2E Verification

**Feature Branch**: `052-delta-viewer-e2e`
**Created**: 2026-02-16
**Status**: Draft
**Input**: End-to-end Inventory Delta Viewer flow with contract validation, robust states, and schema drift prevention

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load and View Delta by Identifiers (Priority: P1)

As a warehouse operator, I can enter or select a specific combination of container ID, session ID, and run ID to load and view the inventory delta for that analysis run, so I can inspect exactly what changed during a specific vending session.

**Why this priority**: This is the core interaction — without the ability to load a delta by its identifiers, no other verification is possible. It proves the end-to-end data path from BridgeServer through PiOrchestrator to the dashboard UI.

**Independent Test**: Can be fully tested by providing known IDs (from a golden fixture) and verifying the delta renders with correct summary counts, item names, and quantity changes.

**Acceptance Scenarios**:

1. **Given** the user has a valid container ID selected and a known session ID, **When** they navigate to the Inventory tab and select a run from the list, **Then** the system fetches the delta from the backend and displays the run detail view with a diff summary and per-item change table.
2. **Given** the user enters a session ID via the session lookup input, **When** the session has a completed analysis run, **Then** the system resolves and displays the full delta detail including items before, items after, and computed changes.
3. **Given** the user is viewing a delta, **When** they look at any displayed identifier (run ID, session ID, container ID), **Then** each ID is displayed in a monospace font with a copy-to-clipboard action.

---

### User Story 2 - Diff Summary with Status Badges and Per-Item Changes (Priority: P1)

As a warehouse operator, I can see a clear visual summary of what changed — how many items were added, removed, or had quantity changes — along with per-item rows showing before/after counts, change direction, and confidence levels, so I can quickly assess whether the delta looks correct.

**Why this priority**: Equal to P1 because the rendering fidelity of the delta table is the core deliverable — a loaded delta is useless if it doesn't render correctly or match the upstream data contract.

**Independent Test**: Can be tested by rendering a golden fixture delta with known values and asserting exact text content for item names, counts, change values, confidence badges, and status indicators.

**Acceptance Scenarios**:

1. **Given** a completed analysis run with mixed changes (items added, removed, and quantity-changed), **When** the delta table renders, **Then** each item row shows the item name, before count, after count, signed change value (e.g., "+2" or "-1"), and a confidence indicator (high/medium/low tier).
2. **Given** a delta where all items are unchanged (zero-delta), **When** the table renders, **Then** the system displays a clear "no changes detected" message instead of an empty table.
3. **Given** an analysis run with status "needs_review", **When** the detail view renders, **Then** a status badge indicates the run requires human review, and the review form is accessible.
4. **Given** an analysis run with status "error", **When** the detail view renders, **Then** the error message from the analysis metadata is displayed along with a retry or back action.

---

### User Story 3 - Actionable Error States (Priority: P2)

As a warehouse operator, when I try to load a delta and something goes wrong, I see a specific, actionable error message (e.g., "No analysis found for this session", "Analysis is still processing", "Service temporarily unavailable") rather than a generic failure, so I know whether to wait, retry, or contact support.

**Why this priority**: Error UX is essential for production trust, but it enhances rather than enables the core viewing flow.

**Independent Test**: Can be tested by simulating each error condition (404 not found, 503 unavailable, network timeout, invalid IDs) and verifying the rendered error message matches the expected actionable text and includes a retry button where appropriate.

**Acceptance Scenarios**:

1. **Given** the user requests a delta for a session that has no analysis, **When** the API returns a "not found" response, **Then** the system displays "No inventory analysis found for this session" with a suggestion to check the session ID.
2. **Given** an analysis run is still processing, **When** the user loads the run detail, **Then** the system displays a processing indicator with a message like "Analysis in progress" and polls for completion.
3. **Given** the backend is unreachable or returns a server error, **When** the user tries to load a delta, **Then** the system displays a "Service temporarily unavailable" message with a retry button.
4. **Given** the user enters an empty or whitespace-only session ID, **When** they submit the lookup form, **Then** the system shows a client-side validation error without making an API call.

---

### User Story 4 - Contract Drift Prevention (Priority: P2)

As an engineering team member, I want automated tests that validate PiDashboard's schema definitions against golden response fixtures derived from the BridgeServer contract, so that any field additions, removals, type changes, or enum value changes in the upstream API are caught before they reach production.

**Why this priority**: Critical for long-term reliability, but it is a developer-facing safeguard rather than a user-facing feature.

**Independent Test**: Can be tested by running the contract test suite against golden fixtures; a schema mismatch produces a clear test failure message identifying the exact field and expected vs. actual type.

**Acceptance Scenarios**:

1. **Given** a golden fixture file representing a successful delta response from BridgeServer, **When** contract tests validate it against PiDashboard's schema definitions, **Then** all fields parse successfully and the test passes.
2. **Given** a new field is added to the BridgeServer delta response (e.g., a new enum value or nullable field), **When** the golden fixture is updated to include it but PiDashboard schemas are not updated, **Then** the contract test fails with a clear message identifying the unknown or mismatched field.
3. **Given** the set of analysis status enum values in PiDashboard, **When** compared to the BridgeServer's status enum, **Then** every BridgeServer status value is represented in PiDashboard's schema (no missing statuses).

---

### Edge Cases

- What happens when the delta array is present but empty (no items changed)? System shows a "no changes detected" state, not an error.
- What happens when evidence images are missing (null URLs)? Placeholder icons are shown instead of broken image links.
- What happens when confidence values are at the exact tier boundaries (0.5 and 0.8)? Values at exactly 0.5 are "medium"; values at exactly 0.8 are "high".
- What happens when the API returns a delta in the categorized format (added/removed/changed_qty/unknown) instead of the flat DeltaEntry format? The system handles both formats gracefully or the adapter layer normalizes to the display format.
- What happens when a run has both an error status and partial data (e.g., items_before populated but no delta)? The error state takes precedence, showing the error message; partial data is not displayed.
- What happens when the user rapidly switches between runs in the list? Previous pending requests are cancelled; only the most recent selection is displayed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to view an inventory delta by selecting a run from the container's run list or by entering a session ID in the lookup input.
- **FR-002**: System MUST render a diff summary showing total items, items changed, items added, and items removed for each completed analysis run.
- **FR-003**: System MUST render a per-item delta table with columns for item name, before count, after count, signed change, and confidence tier (high/medium/low).
- **FR-004**: System MUST display the analysis status as a visual badge (pending, processing, done, needs_review, error) on both the run list and detail views.
- **FR-005**: System MUST display distinct, actionable messages for each error condition: not found (404), service unavailable (503), network failure, and validation error.
- **FR-006**: System MUST provide a retry button for recoverable errors (network failures, server errors) that re-fetches the delta.
- **FR-007**: System MUST display all identifiers (run ID, session ID, container ID) in a monospace, copyable format.
- **FR-008**: System MUST show a loading skeleton while delta data is being fetched.
- **FR-009**: System MUST validate all API responses against defined schemas before rendering, falling back to an error state if validation fails.
- **FR-010**: System MUST maintain golden fixture files that represent canonical BridgeServer responses, with automated tests ensuring PiDashboard schemas can parse them without errors.
- **FR-011**: System MUST handle both flat delta format (per-item entries with before/after counts) and categorized delta format (added/removed/changed_qty/unknown groupings) from the backend.
- **FR-012**: System MUST cancel in-flight requests when the user navigates away from a run detail or selects a different run.

### Key Entities

- **Analysis Run**: A single inventory analysis for a session, identified by run_id. Has a lifecycle status (pending → processing → done/needs_review/error), optional before/after item snapshots, computed delta, evidence images, and metadata (provider, timing, errors).
- **Delta Entry**: A per-item change record showing what changed for one product: name, before count, after count, net change, confidence score, and optional rationale.
- **Delta Summary**: Aggregate counts for a run: total items observed, items changed, items added, items removed.
- **Evidence Images**: Before and after shelf photos with optional bounding box overlays marking detected items.
- **Review**: A human review of a delta — either approval or override with corrections. Includes reviewer identity, action, notes, and timestamp.
- **Golden Fixture**: A test artifact containing a canonical API response that represents the BridgeServer contract at a point in time, used to detect schema drift.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can load and view an inventory delta for any valid (container, session, run) combination within 3 seconds of selection, including loading indicator feedback within 200ms.
- **SC-002**: All five analysis statuses (pending, processing, done, needs_review, error) render with distinct visual badges that are identifiable at a glance.
- **SC-003**: Error states display actionable messages — users can distinguish between "not found", "still processing", and "service error" without technical knowledge.
- **SC-004**: Contract validation tests catch 100% of schema field additions, removals, type changes, and enum value changes between PiDashboard and BridgeServer.
- **SC-005**: The full delta viewer flow (select container → select run → view delta → see items) works deterministically against a mocked golden fixture in E2E tests.
- **SC-006**: Component tests cover all rendering states: success with data, zero-delta (empty changes), pending/processing (loading), error, and not-found — at least one test per state.
- **SC-007**: All identifiers displayed in the UI are copyable with a single click, with visual feedback confirming the copy action.

## Assumptions

- PiDashboard communicates with BridgeServer through PiOrchestrator as a proxy; the response shape reaching PiDashboard matches the BridgeServer contract after any PiOrchestrator transformations.
- The existing inventory delta components (Features 047, 048) provide the rendering foundation; this feature focuses on end-to-end verification, contract alignment, and test hardening rather than building new UI from scratch.
- Golden fixtures are maintained as static test files within the PiDashboard repository; they are manually updated when the BridgeServer contract intentionally changes.
- The dual delta format (flat DeltaEntry[] and categorized CategorizedDelta) reflects an active migration in BridgeServer from schema v1.0 to v2.0; PiDashboard must support both during the transition period.
