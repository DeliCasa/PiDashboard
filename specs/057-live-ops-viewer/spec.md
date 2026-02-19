# Feature Specification: Live Operations Viewer

**Feature Branch**: `057-live-ops-viewer`
**Created**: 2026-02-18
**Status**: Draft
**Input**: User description: "PiDashboard shows real operational state (sessions, evidence, cameras) from live BridgeServer + PiOrchestrator (no mocks)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recent Sessions List (Priority: P1)

As an operator, I can see a list of recent sessions pulled from the live backend, with status badges, timestamps, and correlation IDs, so I can quickly assess what has happened and whether runs succeeded or failed.

**Why this priority**: The session list is the primary entry point for operational debugging. Without seeing real sessions, the operator has no starting point for investigating issues.

**Independent Test**: Can be fully tested by loading the dashboard and verifying that real sessions appear with correct statuses, sorted by recency. Delivers immediate operational visibility.

**Acceptance Scenarios**:

1. **Given** sessions exist in the live backend, **When** the operator opens the operations view, **Then** the most recent sessions are displayed in reverse chronological order with status badges (e.g., completed, active, failed, cancelled), start/end timestamps, and session ID.
2. **Given** a session failed, **When** the operator views the session list, **Then** the failure is visually distinct (e.g., red/error badge) and shows a brief failure reason inline.
3. **Given** the backend is unreachable, **When** the operator opens the operations view, **Then** a clear error message is shown with a retry option instead of a blank screen.
4. **Given** no sessions exist yet, **When** the operator opens the operations view, **Then** an informative empty state explains that no sessions have been recorded and suggests verifying the system is running.

---

### User Story 2 - Session Detail with Evidence (Priority: P1)

As an operator, I can open a session and see its before/after evidence images, delta summary, and full timeline, so I can verify what the system captured and whether the inventory analysis was correct.

**Why this priority**: Evidence verification is the core debugging workflow. Operators need to visually confirm what the cameras saw and compare it against the system's analysis.

**Independent Test**: Can be tested by selecting any session from the list and verifying that evidence images load, timestamps are correct, and the delta summary (if available) matches expectations.

**Acceptance Scenarios**:

1. **Given** a session with before and after evidence captures, **When** the operator opens the session detail, **Then** both images are displayed side-by-side with their capture timestamps and camera IDs.
2. **Given** a session with a delta summary (inventory changes), **When** the operator opens the session detail, **Then** the delta is displayed showing items added, removed, or changed.
3. **Given** evidence images have expired presigned URLs, **When** the operator views the session detail, **Then** the system automatically refreshes the URLs and displays the images without manual intervention.
4. **Given** a session with no evidence (e.g., camera failure), **When** the operator opens the session detail, **Then** a clear message explains that no evidence was captured and shows the failure reason if available.

---

### User Story 3 - Failure Debugging with Correlation IDs (Priority: P1)

As an operator, I can see failure reasons and correlation IDs for failed sessions, so I can trace issues across the system (orchestrator logs, server logs, camera diagnostics) without guessing.

**Why this priority**: Debugging failures across distributed services is the most time-consuming operator task. Correlation IDs and clear failure reasons dramatically reduce mean-time-to-resolution.

**Independent Test**: Can be tested by viewing a failed session and confirming that the error message, correlation/session IDs, and related timestamps are visible and copyable.

**Acceptance Scenarios**:

1. **Given** a session that failed during capture, **When** the operator views the session detail, **Then** the specific failure reason is displayed (e.g., "Camera timeout", "Network error", "Analysis failed") along with the correlation ID.
2. **Given** a failure with a correlation ID, **When** the operator clicks the correlation ID, **Then** it is copied to the clipboard for use in log searches.
3. **Given** a session with partial failure (e.g., one camera failed but another succeeded), **When** the operator views the session detail, **Then** each camera's status is shown individually with its own failure reason if applicable.

---

### User Story 4 - Camera Health Overview (Priority: P2)

As an operator, I can see the online/offline status, last-seen time, and last capture time for all cameras, so I can quickly identify hardware issues before they cause session failures.

**Why this priority**: Camera health is a leading indicator of session failures. Proactively seeing offline cameras prevents wasted debugging time on sessions that failed due to known hardware issues.

**Independent Test**: Can be tested by loading the health page and verifying that each camera shows its current status, last-seen timestamp, and connection quality, matching the physical reality of the devices.

**Acceptance Scenarios**:

1. **Given** cameras are connected and reporting, **When** the operator opens the health view, **Then** each camera shows online/offline status, last-seen time (relative, e.g., "2 minutes ago"), and last capture time.
2. **Given** a camera has been offline for an extended period, **When** the operator views the health page, **Then** the camera is visually flagged as a concern with its last-seen time prominently displayed.
3. **Given** the health endpoint is unavailable (404 or 503), **When** the operator opens the health view, **Then** an actionable message is shown (e.g., "Camera health data is not available. The orchestrator may need updating.") rather than a blank screen or generic error.

---

### User Story 5 - Camera Diagnostics Summary (Priority: P2)

As an operator, I can see diagnostic summaries for cameras including recent capture success/failure rates and error counts, so I can assess camera reliability trends.

**Why this priority**: Beyond simple online/offline status, operators need to understand camera reliability patterns to make proactive maintenance decisions.

**Independent Test**: Can be tested by viewing camera diagnostics and confirming that capture counts, error rates, and recent error messages are displayed for each camera.

**Acceptance Scenarios**:

1. **Given** a camera with diagnostic data available, **When** the operator views its diagnostics, **Then** they see error count, last error message and time, connection quality, and performance metrics (e.g., average capture time).
2. **Given** a camera with no recent errors, **When** the operator views its diagnostics, **Then** it shows a healthy status with zero errors and normal performance metrics.
3. **Given** diagnostics are unavailable for a specific camera, **When** the operator views the health page, **Then** the camera still appears with its basic status, and the diagnostics section shows "Diagnostics not available" instead of hiding the camera entirely.

---

### User Story 6 - Raw Evidence Object Access (Priority: P3)

As an operator, I can access the raw evidence storage path (object key/URL) for any evidence capture, so I can directly verify the image in the storage backend if needed.

**Why this priority**: For deep debugging or storage auditing, operators occasionally need direct access to the raw storage location. This is an advanced debugging affordance, not a daily workflow.

**Independent Test**: Can be tested by opening an evidence capture detail and confirming that the raw object key and a direct link to the storage object are accessible.

**Acceptance Scenarios**:

1. **Given** an evidence capture with a known storage location, **When** the operator opens the evidence detail, **Then** the raw object key (storage path) is visible and copyable.
2. **Given** an evidence capture, **When** the operator clicks "Open raw", **Then** the full-resolution image opens in a new tab via its direct storage URL.

---

### Edge Cases

- What happens when a session has evidence from cameras that are no longer registered? The evidence should still display with the camera ID shown, and a note that the camera is no longer active.
- How does the system handle sessions with very large numbers of evidence captures (e.g., 50+)? Evidence should be paginated or lazy-loaded to avoid performance degradation.
- What happens when the clock is out of sync between the orchestrator and backend server? Timestamps should be displayed as received, with a visual warning if timestamps appear inconsistent (e.g., "after" evidence timestamped before "before" evidence).
- What happens when the operator's network connection drops while viewing a session? The UI should show cached data with a "connection lost" banner and automatically retry when connectivity returns.
- What happens when evidence images fail to load (broken URLs, storage errors)? A placeholder with the error reason should be shown, not a broken image icon.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display real session data from the live backend, not from mocked or static data sources.
- **FR-002**: System MUST show session status using clear visual indicators (badges with distinct colors for each status: active, completed, failed, cancelled).
- **FR-003**: System MUST display before and after evidence images for sessions that have them, with side-by-side comparison capability.
- **FR-004**: System MUST show delta/inventory change summaries when analysis data is available for a session.
- **FR-005**: System MUST display correlation IDs and failure reasons for failed sessions, with one-click copy to clipboard.
- **FR-006**: System MUST show camera online/offline status, last-seen time, and last capture time on a health page.
- **FR-007**: System MUST show camera diagnostic details including error counts, connection quality, and performance metrics.
- **FR-008**: System MUST handle unavailable endpoints gracefully, displaying actionable messages instead of blank screens or unhandled errors.
- **FR-009**: System MUST auto-refresh session and evidence data periodically so the operator sees near-real-time information.
- **FR-010**: System MUST allow the operator to access raw evidence object keys and storage URLs for advanced debugging.
- **FR-011**: System MUST automatically refresh expired evidence URLs without requiring operator intervention.
- **FR-012**: System MUST display all IDs (session, correlation, camera) in a monospace font with copy-to-clipboard support.

### Key Entities

- **Session**: Represents a single operational cycle (capture request through completion). Key attributes: ID, status, start/end timestamps, delivery ID, correlation ID, capture count, failure reason.
- **Evidence Capture**: An image captured by a camera during a session. Key attributes: ID, session ID, camera ID, capture timestamp, storage path (object key), thumbnail and full-size URLs, image dimensions/size.
- **Camera**: A physical capture device. Key attributes: camera ID, name, status (online/offline/error), last-seen time, last capture time, connection quality, health metrics (memory, signal strength, uptime).
- **Inventory Delta**: The computed difference in inventory between before and after captures. Key attributes: session ID, items before, items after, changes (added/removed/modified), analysis status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can identify a failed session and its failure reason within 30 seconds of opening the dashboard.
- **SC-002**: Operators can view before/after evidence images for any completed session within 2 clicks from the session list.
- **SC-003**: All camera health statuses are visible at a glance, with offline cameras immediately identifiable without scrolling.
- **SC-004**: 100% of error states (backend unreachable, endpoint missing, image load failure) display actionable messages rather than blank screens or browser errors.
- **SC-005**: Operators can copy a correlation ID or session ID to clipboard within 1 click for cross-system log searching.
- **SC-006**: Dashboard data auto-refreshes so the operator sees updates within 15 seconds of a backend state change without manual page reload.
- **SC-007**: All features degrade gracefully when individual services are unavailable; the dashboard never fully crashes due to a single service being down.

## Assumptions

- The live backend services (BridgeServer on Dokku DEV and PiOrchestrator on Pi) are accessible from the dashboard's network context, either via direct connection or through a configured proxy.
- Session and evidence data follow a consistent schema across the backend services.
- Evidence images are stored in object storage and accessible via presigned URLs with configurable expiration.
- Camera diagnostic data is provided by the orchestrator and reflects the real-time state of connected hardware.
- The dashboard will run on the same local network as the orchestrator, ensuring low-latency access to camera health data.
- Authentication is not required for the operator dashboard in this context (local network access).

## Scope Boundaries

### In Scope
- Displaying real session lifecycle data from live services
- Before/after evidence image viewing with presigned URL management
- Camera health and diagnostics visualization
- Failure reason display with correlation IDs
- Graceful degradation for unavailable services
- Auto-refreshing data display

### Out of Scope
- Advanced analytics or trend visualization over time
- Automated alerting or notification systems
- Session creation or management (read-only operational view)
- Camera firmware updates or configuration changes
- Multi-tenant or access-controlled views
- Historical data archival or export features
