# Feature Specification: Live Ops Validation

**Feature Branch**: `060-live-ops-validation`
**Created**: 2026-02-20
**Status**: Draft
**Input**: User description: "PiDashboard Real Ops Drilldown — sessions + evidence + camera health (live PiOrchestrator + live BridgeServer, no mocks)"
**Predecessor**: Feature 059 (Real Ops Drilldown) — built schemas, API clients, hooks, and UI components against V1 endpoint shapes. All 31 tasks completed. This feature validates against real infrastructure and fixes any wiring gaps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Live Sessions (Priority: P1)

An operator opens the Operations tab on the PiDashboard and sees a list of real sessions fetched from the live PiOrchestrator. Sessions display correct status badges (Active, Complete, Partial, Failed), container IDs, timestamps, and capture counts. The operator can filter by status tab and identify stale sessions. The list auto-refreshes without losing scroll position or selected filter.

**Why this priority**: Without live session data rendering, no other ops functionality is reachable. This is the entry point — if sessions don't load from the real backend, nothing else matters.

**Independent Test**: Connect the dashboard to a running PiOrchestrator that has at least one completed session. Open the Operations tab and verify sessions appear with correct metadata. Filter by "Completed" tab and confirm only completed sessions show.

**Acceptance Scenarios**:

1. **Given** PiOrchestrator is running with at least one session, **When** the operator opens the Operations tab, **Then** the session list loads within 5 seconds and displays sessions with correct status badge, container ID, start time, and capture count.
2. **Given** multiple sessions with different statuses exist, **When** the operator selects a status filter tab, **Then** only sessions matching that status are shown.
3. **Given** an active session with no activity for 5+ minutes, **When** the operator views the session list, **Then** a "Stale" indicator appears on that session.
4. **Given** PiOrchestrator is temporarily unreachable, **When** the operator views the Operations tab, **Then** an error message with a Retry button is shown instead of a crash or blank screen.
5. **Given** the session list is displayed, **When** the operator clicks a session, **Then** the detail view opens showing session metadata, evidence captures, and IDs formatted in monospace.

---

### User Story 2 - View Evidence Images from Non-Pi Browser (Priority: P1)

An operator viewing the dashboard from a browser that is NOT on the Pi's local network (e.g., via Tailscale Funnel or remote LAN) drills into a session and sees before/after evidence images. Images render through PiOrchestrator's mechanisms (base64 inline data for recent captures, or proxy/presign endpoints for stored images) without requiring direct MinIO access. The operator can click a thumbnail for a full-size preview and download the image.

**Why this priority**: Evidence images are the core diagnostic value — operators need to visually confirm what happened during a session. Images must work from any browser, not just from the Pi itself.

**Independent Test**: Access the dashboard from a non-Pi browser (e.g., via Tailscale Funnel or LAN from a laptop). Open a session with evidence captures. Verify images render visually. Inspect the browser Network tab to confirm no requests go to MinIO LAN addresses (192.168.x.x).

**Acceptance Scenarios**:

1. **Given** a session with evidence captures that include base64 image data, **When** the operator opens session detail, **Then** thumbnail images render inline without additional network requests to MinIO.
2. **Given** evidence captures where base64 data is absent but an object key exists, **When** the operator views the evidence panel, **Then** a "Stored in S3" placeholder displays the object key for reference.
3. **Given** an evidence image that fails to load, **When** the thumbnail errors, **Then** a placeholder appears with contextual information — other images in the grid are unaffected.
4. **Given** evidence images are displayed, **When** the operator clicks a thumbnail, **Then** a full-size preview modal opens with a Download button that produces a local file.
5. **Given** the dashboard is accessed from outside the Pi's LAN, **When** viewing any operations screen, **Then** zero requests are made to MinIO LAN addresses (192.168.10.x or 192.168.1.x).

---

### User Story 3 - Camera Health and Last Capture Time (Priority: P2)

An operator views the camera health dashboard alongside the session list and sees each camera's online/offline status, signal strength, error count, and last capture time. This helps the operator correlate session failures with camera issues and determine whether cameras are operational.

**Why this priority**: Camera health provides supporting diagnostic context. While sessions and evidence are the primary value, camera health helps operators understand *why* things failed and whether cameras are ready for the next session.

**Independent Test**: Open the Operations tab with PiOrchestrator running and at least one camera registered. Verify the camera health section displays camera devices with status indicators, health metrics, and the timestamp of the most recent capture.

**Acceptance Scenarios**:

1. **Given** PiOrchestrator is running with registered cameras, **When** the operator opens the Operations tab, **Then** the camera health dashboard displays each camera's online/offline status and device ID.
2. **Given** a camera has captured evidence recently, **When** the operator views camera health, **Then** the last capture time is displayed for that camera.
3. **Given** a camera has errors, **When** the operator views its health card, **Then** the error count and signal strength are visible.
4. **Given** the camera health endpoint is unavailable (404/503), **When** the operator views the Operations tab, **Then** the session list continues to function normally and the camera section shows a graceful degradation message.

---

### User Story 4 - Failure Diagnostics with Correlation IDs (Priority: P2)

An operator opens a failed session and sees actionable failure information: the failure reason, the phase where failure occurred, the correlation ID for cross-referencing with PiOrchestrator logs, and the device ID of the failing camera. The operator can copy IDs to clipboard for sharing with support or searching logs.

**Why this priority**: Understanding failure root causes is essential for operations, but secondary to seeing sessions and evidence at all. This story adds diagnostic depth after the core viewing capabilities work.

**Independent Test**: Create or locate a failed session in PiOrchestrator. Open its detail view. Verify failure reason text displays prominently. Copy the correlation ID to clipboard and confirm toast feedback.

**Acceptance Scenarios**:

1. **Given** a failed session with a last_error containing failure_reason, **When** the operator opens session detail, **Then** the failure reason and phase are displayed prominently in a visually distinct error block.
2. **Given** any session detail view, **When** the operator clicks the copy icon next to session_id, container_id, or correlation_id, **Then** the ID is copied to clipboard and a toast confirmation appears.
3. **Given** a session with failed or timed-out evidence captures, **When** the operator views the evidence panel, **Then** failed captures are listed separately with their failure reasons, distinct from successfully captured images.

---

### Edge Cases

- What happens when PiOrchestrator returns an empty sessions list (no sessions created yet)? The session list shows an empty state message indicating no sessions are available, not a loading spinner or error.
- What happens when the PiOrchestrator response schema has unexpected fields? Extra fields are silently ignored by schema validation; missing required fields trigger graceful degradation with an informational message rather than a crash.
- What happens when the operator's browser is behind Tailscale Funnel (public internet)? All evidence images load via base64 inline data or show the "Stored in S3" placeholder — no direct MinIO LAN requests occur.
- What happens when a session has zero evidence captures? The evidence panel shows an empty state: "No evidence captures yet."
- What happens when the operator switches tabs or navigates away while data is loading? In-flight requests complete or cancel gracefully with no console errors or memory leaks.
- What happens when PiOrchestrator serves V1 diagnostics endpoints on port 8082 but the routes are not yet registered? The dashboard receives 404 and shows its existing graceful degradation message — not a blank screen or uncaught error.
- What happens when the E2E tests use mock data with a status value not in the schema enum? Zod validation rejects it. Any test fixture mismatches discovered during this validation must be fixed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST load and display sessions from the live PiOrchestrator V1 diagnostics endpoint with correct status, timestamps, container IDs, and capture counts.
- **FR-002**: System MUST render evidence images from base64 inline data for sessions that have image data, without requiring the operator's browser to have direct network access to MinIO.
- **FR-003**: System MUST display a "Stored in S3" placeholder for evidence captures that have an object key but no inline image data, showing the object key for manual reference.
- **FR-004**: System MUST isolate subsystem failures so that an error in the evidence panel, camera health, or any individual endpoint does not prevent other sections from rendering.
- **FR-005**: System MUST display camera health (online/offline status, error count, last capture time) from the live PiOrchestrator camera diagnostics endpoint.
- **FR-006**: System MUST display actionable failure information (reason, phase, correlation ID, device ID) for failed sessions.
- **FR-007**: System MUST support copy-to-clipboard for session IDs, container IDs, and correlation IDs with toast confirmation.
- **FR-008**: System MUST degrade gracefully when any endpoint returns 404 or 503, showing an informational message rather than crashing.
- **FR-009**: System MUST produce validation artifacts (screenshots or equivalent) demonstrating real session data and evidence images rendering in the browser from live PiOrchestrator.
- **FR-010**: System MUST have zero console errors and zero direct MinIO LAN requests when operating against live infrastructure.
- **FR-011**: Any test fixture mismatches discovered during live validation (e.g., mock data using invalid status values) MUST be corrected.

### Key Entities

- **Session**: A vending machine operation cycle. Key attributes: session ID, container ID, status (active/complete/partial/failed), start time, capture counts (total, successful, failed), pair completeness, elapsed time, optional last error with correlation ID.
- **Capture Entry**: A timestamped evidence image from an ESP32 camera during a session. Key attributes: evidence ID, session ID, device ID, capture tag (before/after open/close), capture status (captured/failed/timeout), optional inline image data, optional storage object key.
- **Evidence Pair**: Structured before/after evidence for a session. Key attributes: pair status (complete/incomplete/missing), before and after capture slots, retry guidance for incomplete pairs.
- **Camera**: An ESP32 camera device. Key attributes: device ID, online/offline status, health metrics (signal strength, error count), last seen time, last capture time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can view a list of real sessions and open session detail within 5 seconds of navigating to the Operations tab on a local network.
- **SC-002**: Evidence images from at least one real session render visually in the browser when accessed from a non-Pi browser.
- **SC-003**: Zero direct MinIO LAN requests (192.168.x.x) appear in the browser Network tab during any operations screen usage.
- **SC-004**: When any single backend endpoint is unavailable, the remaining dashboard sections continue to function — verified by at least one subsystem error scenario.
- **SC-005**: Camera health displays at least one camera's online/offline status and last capture time from live PiOrchestrator data.
- **SC-006**: A developer can reproduce the end-to-end validation (session list to evidence images to camera health) in under 10 minutes following the documented procedure.
- **SC-007**: The browser console shows zero uncaught errors during normal operations viewing against live infrastructure.
- **SC-008**: All existing unit, component, integration, and E2E tests continue to pass after any wiring fixes applied.

## Assumptions

- Feature 059 (Real Ops Drilldown) is fully merged and its code (schemas, API clients, hooks, UI components) is the baseline for this feature.
- PiOrchestrator exposes V1 diagnostics endpoints on port 8082 (the config UI server) that the dashboard proxies to during development.
- At least one real session with evidence captures exists in the PiOrchestrator environment (created by smoke run, manual trigger, or prior vending operation).
- At least one ESP32 camera is registered with PiOrchestrator for camera health validation.
- Recent evidence captures (less than 24 hours old) include base64 inline image data in the API response — older captures may only have object keys.
- MinIO is running on the Pi and accessible to PiOrchestrator for evidence storage, but the dashboard never accesses MinIO directly.
- The Vite dev proxy configuration routes `/api/*` requests to PiOrchestrator on port 8082.
- The operator may access the dashboard from the Pi's LAN, via Tailscale, or via Tailscale Funnel — all access patterns must work for evidence viewing.
