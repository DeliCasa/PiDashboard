# Feature Specification: Session Drill-Down E2E Operational Validation

**Feature Branch**: `056-session-drilldown-e2e`
**Created**: 2026-02-18
**Status**: Draft
**Input**: User description: "Ops session review drill-down end-to-end: evidence + delta + traceability. Specify the operational review experience so it reliably supports debugging and audit/review."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Session Investigation (Priority: P1)

As an operator, I need to open any completed session's drill-down and see the full picture: timeline progression, evidence images (open/close), delta results (what changed), and any errors that occurred. This is the core debugging workflow that every investigation starts with.

**Why this priority**: Without a reliable drill-down showing all session data, operators cannot investigate outcomes, making the entire review system unusable. This is the foundational use case.

**Independent Test**: Can be fully tested by selecting a completed session from the run list, opening its drill-down, and verifying all data sections render with real backend data. Delivers the core ability to investigate any session outcome.

**Acceptance Scenarios**:

1. **Given** a session with status `done` and populated evidence + delta, **When** the operator opens the drill-down, **Then** the timeline shows all 5 steps completed, the delta table displays item changes with confidence scores, and the evidence panel shows before/after images side-by-side.
2. **Given** a session with status `done` but no evidence images available, **When** the operator opens the drill-down, **Then** the evidence panel shows a clear empty state explaining "Evidence images not available for this session" with a suggested next action (e.g., "Check if the camera was online during this session").
3. **Given** a session with status `done` but no delta entries (zero changes detected), **When** the operator opens the drill-down, **Then** the delta section shows a clear message like "No inventory changes detected" rather than an empty table.
4. **Given** a session with status `error`, **When** the operator opens the drill-down, **Then** the timeline shows the error step, the error message is displayed in human-readable form, and "Copy Error Details" and "Request Re-run" actions are available.

---

### User Story 2 - Correlation ID Traceability (Priority: P2)

As an operator, when I'm investigating a session issue, I need to quickly copy the session ID, run ID, and container ID so I can search backend logs (PiOrchestrator, BridgeServer) for the same transaction. The debug info must be easily accessible and one-click copyable.

**Why this priority**: Cross-system traceability is essential for diagnosing issues that span the Pi, backend, and analysis pipeline. Without it, operators must manually hunt through logs without a search key.

**Independent Test**: Can be tested by opening any session drill-down, expanding the debug info panel, and copying each identifier. Verify the copied value matches what the backend returns and can be used to find corresponding log entries.

**Acceptance Scenarios**:

1. **Given** a session drill-down is open, **When** the operator expands the debug info section, **Then** the following fields are visible: Run ID, Session ID, Container ID, Provider, Processing Time, Model Version, and Request ID.
2. **Given** the debug info section is expanded, **When** the operator clicks the copy button next to Session ID, **Then** the session ID is copied to the clipboard and a confirmation toast appears.
3. **Given** any identifier field in debug info, **When** the operator copies it, **Then** the copied value is the raw identifier string (no formatting, labels, or extra whitespace) suitable for pasting directly into a log search query.

---

### User Story 3 - Sensitive Data Exclusion (Priority: P2)

As an operator, I must not see raw internal storage keys (e.g., S3/R2 bucket paths, internal API tokens, raw file system paths) in the drill-down UI. Only operator-relevant identifiers and human-readable labels should be displayed.

**Why this priority**: Exposing internal storage paths or keys could leak infrastructure details and confuse operators with irrelevant technical information. This is both a security and usability concern.

**Independent Test**: Can be tested by reviewing all fields displayed in the drill-down (evidence panel, debug info, delta table, audit trail) and confirming no raw storage URLs, bucket paths, or internal keys appear.

**Acceptance Scenarios**:

1. **Given** a session with evidence images, **When** the evidence panel renders, **Then** image URLs displayed to the operator (if any) do not reveal internal storage bucket names, paths, or signing keys.
2. **Given** the debug info panel is expanded, **When** the operator reviews all displayed fields, **Then** no field contains raw infrastructure paths (e.g., `/mnt/data/...`, `s3://bucket/...`, internal service URLs).
3. **Given** the delta table or audit trail is displayed, **When** the operator reviews all visible data, **Then** only business-relevant information is shown (item names, counts, reviewer actions) with no leaked internal identifiers.

---

### User Story 4 - Responsive Drill-Down Performance (Priority: P3)

As an operator, when I open a session drill-down, the initial view should load quickly so I can begin my investigation without delay. Long waits break the debugging flow, especially when triaging multiple sessions.

**Why this priority**: Performance directly affects operator efficiency. When triaging incidents with many sessions, slow load times compound into significant time waste.

**Independent Test**: Can be tested by measuring time from drill-down click to first meaningful content (timeline + delta) appearing on screen against target thresholds.

**Acceptance Scenarios**:

1. **Given** the operator clicks to open a session drill-down, **When** the backend responds within normal latency, **Then** the timeline and delta content appear within 2 seconds of the click.
2. **Given** the drill-down is loading, **When** data is being fetched, **Then** a loading skeleton or spinner is shown immediately (within 200ms) so the operator knows the system is working.
3. **Given** evidence images are large, **When** the drill-down loads, **Then** text-based content (timeline, delta table, debug info) loads and becomes interactive before images finish loading.

---

### Edge Cases

- What happens when the backend returns a session in `processing` status that has been stuck for over 5 minutes? The UI should show a "stale processing" warning with a suggestion to re-run or contact support.
- What happens when the operator navigates to a drill-down via direct session ID lookup and the session does not exist? The UI should show a clear "Session not found" message, not a blank screen or unhandled error.
- What happens when evidence images fail to load (broken URL, network timeout)? The evidence panel should show a placeholder with "Image unavailable" rather than a broken image icon.
- What happens when the analysis re-run endpoint is not supported by the backend? The "Request Re-run" button should gracefully hide rather than show an error.
- What happens when the operator opens a drill-down while offline or with degraded connectivity? The UI should show a connection error with a retry option.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The drill-down MUST display a 5-step status timeline (Created, Capture, Analysis, Delta Ready, Finalized) reflecting the session's current progression.
- **FR-002**: The drill-down MUST display the inventory delta table showing item-level changes (name, before count, after count, change amount, confidence score) for completed sessions.
- **FR-003**: The drill-down MUST display evidence images (before and after) in a side-by-side layout when available, with the ability to view each image in full screen.
- **FR-004**: When evidence images are unavailable, the drill-down MUST show an informative empty state with a human-readable explanation and suggested next action.
- **FR-005**: When no delta entries exist (zero changes), the drill-down MUST show a clear "no changes detected" message rather than an empty table.
- **FR-006**: The drill-down MUST provide a collapsible debug info section containing: Run ID, Session ID, Container ID, Provider, Processing Time, Model Version, and Request ID.
- **FR-007**: Each identifier in the debug info section MUST be copyable to clipboard with a single click, copying only the raw value without labels or formatting.
- **FR-008**: The drill-down MUST NOT display raw storage keys, internal bucket paths, file system paths, or signing tokens anywhere in the UI.
- **FR-009**: For sessions in `error` status, the drill-down MUST display the error message and provide "Copy Error Details" and "Request Re-run" actions.
- **FR-010**: The "Request Re-run" button MUST gracefully hide when the backend does not support the re-run endpoint (404/501 response).
- **FR-011**: For sessions stuck in `processing` status beyond 5 minutes, the drill-down MUST display a stale processing warning with a refresh action.
- **FR-012**: Session lookup by direct ID entry MUST return a clear "not found" message when the session does not exist, rather than an empty or broken view.
- **FR-013**: Text-based content (timeline, delta, debug info) MUST load and become interactive independently of evidence image loading.
- **FR-014**: All identifier fields (Run ID, Session ID, Container ID) MUST be displayed in a monospace font for readability and copy accuracy.

### Key Entities

- **Inventory Analysis Run**: The central entity representing one analysis pass for a session. Contains status, delta results, evidence references, review state, and metadata (provider, processing time, model version). Linked to exactly one session and one container.
- **Evidence Pair**: Before and after images captured for a session. May include overlay data (bounding boxes for detected items). Can be absent if the camera was offline or capture failed.
- **Delta Entry**: A single item-level change detected between before and after states. Includes item name, SKU, count changes, confidence score, and AI-generated rationale.
- **Review**: An operator's assessment of the analysis results. Can be an approval (confirming the delta is correct) or an override (providing corrections). Includes reviewer identity and timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can open a session drill-down and see meaningful content (timeline + delta or error message) within 2 seconds of clicking.
- **SC-002**: 100% of completed sessions display either a populated evidence pair or a clear explanation of why evidence is missing.
- **SC-003**: Operators can copy any session identifier from the drill-down and use it directly in a backend log search within 3 clicks (open debug info, click copy, paste).
- **SC-004**: Zero internal storage paths, bucket names, or signing keys are visible anywhere in the drill-down UI across all session states.
- **SC-005**: All session status states (pending, processing, done, needs_review, error) render a meaningful, non-broken view with appropriate actions available.
- **SC-006**: Loading indicators appear within 200ms of initiating a drill-down, eliminating blank-screen confusion during data fetch.

## Assumptions

- The PiOrchestrator backend already serves the required API endpoints (`/v1/sessions/{id}/inventory-delta`, `/v1/containers/{id}/inventory/latest`, etc.) and returns data conforming to the established Zod schemas.
- Evidence images are served as URLs (or base64) from the backend; the dashboard does not directly access storage buckets.
- The "Request Re-run" feature uses backend feature detection (404/501 = unsupported) and does not require explicit capability negotiation.
- Performance targets (2s content load, 200ms loading indicator) assume standard LAN connectivity between the dashboard and PiOrchestrator.
- The existing 5-step timeline model (Created, Capture, Analysis, Delta Ready, Finalized) accurately represents the session lifecycle and does not need modification.
