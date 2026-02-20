# Feature Specification: Real Ops Drilldown

**Feature Branch**: `059-real-ops-drilldown`
**Created**: 2026-02-20
**Status**: Draft
**Input**: User description: "PiDashboard Real Ops Drilldown (sessions + evidence) using PiOrchestrator live endpoints (no mocks)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Session List (Priority: P1)

An operator opens the Operations tab and sees a list of real sessions fetched from the PiOrchestrator backend. Sessions are grouped by status (Active, Completed, Failed) using tab filters. The operator can visually distinguish session states and identify stale sessions (no capture activity for 5+ minutes). The list auto-refreshes every 10 seconds without losing scroll position or selected tab.

**Why this priority**: Without a working session list, no other drilldown functionality is reachable. This is the entry point to all operations visibility.

**Independent Test**: Can be fully tested by creating a session via PiOrchestrator's DEV smoke run, then verifying it appears in the dashboard session list with correct status and metadata.

**Acceptance Scenarios**:

1. **Given** PiOrchestrator is running with at least one completed session, **When** the operator opens the Operations tab, **Then** the session list loads within 3 seconds and displays the session with correct status badge, container ID, start time, and capture count.
2. **Given** an active session with no captures in the last 5 minutes, **When** the operator views the session list, **Then** a "Stale" indicator appears on that session.
3. **Given** multiple sessions exist, **When** the operator selects the "Failed" tab, **Then** only sessions with `failed` status are shown.
4. **Given** PiOrchestrator is temporarily unreachable, **When** the operator views the Operations tab, **Then** an error message with a Retry button is shown (not a crash or blank screen).

---

### User Story 2 - Session Detail with Evidence Images (Priority: P1)

An operator clicks a session in the list and drills down into a detail view showing session metadata (IDs, timestamps, status timeline) and evidence images (before/after captures). Evidence images load as base64 inline data from PiOrchestrator (for recent captures) or via an image proxy endpoint (for S3-stored captures) — the browser never makes direct requests to MinIO on the LAN. The operator can click a thumbnail to see a full-size preview and download the image.

**Why this priority**: Evidence images are the core value of the drilldown — operators need to visually verify what happened during a session. This is the primary reason for the feature.

**Independent Test**: Can be tested by navigating to a session that has evidence captures, verifying images render in the browser, and confirming the image URLs route through PiOrchestrator (not direct MinIO `192.168.x.x` addresses).

**Acceptance Scenarios**:

1. **Given** a completed session with 2+ evidence captures, **When** the operator opens session detail, **Then** thumbnail images load and display camera ID and capture timestamp overlays.
2. **Given** evidence captures with base64 image data, **When** the operator views them, **Then** images render inline without additional network requests. When base64 data is absent but an S3 object key exists, the dashboard shows a "Stored in S3" placeholder.
3. **Given** an evidence image that fails to load (e.g., MinIO object deleted), **When** the thumbnail errors, **Then** a "Failed to load" placeholder appears with a Retry button — other images in the grid are unaffected.
4. **Given** a session with evidence, **When** the operator clicks a thumbnail, **Then** a full-size preview modal opens with the image and a Download button.

---

### User Story 3 - Failure Diagnostics (Priority: P2)

An operator opens a failed session and sees actionable failure information: a clear reason for the failure, the correlation ID for cross-referencing with PiOrchestrator logs, and the last known camera state. The operator can copy IDs to clipboard for sharing with support or searching logs.

**Why this priority**: Understanding why a session failed is essential for operations, but is secondary to seeing sessions and evidence at all. This story adds diagnostic depth to the drilldown.

**Independent Test**: Can be tested by creating a failed session in PiOrchestrator, opening its detail view, and verifying failure reason text and copy-to-clipboard for correlation IDs.

**Acceptance Scenarios**:

1. **Given** a failed session with a known failure reason, **When** the operator opens session detail, **Then** the failure reason is displayed prominently in the status section.
2. **Given** any session, **When** the operator clicks the copy icon next to the session ID or container ID, **Then** the ID is copied to clipboard and a toast confirmation appears.
3. **Given** a failed session with camera diagnostics available, **When** the operator views the detail, **Then** the camera health section shows the last known state of the involved camera (online/offline, error count, last error).

---

### User Story 4 - DEV Validation Workflow (Priority: P2)

A developer can run a reproducible validation against the real DEV environment to confirm sessions and evidence render correctly. This includes a documented procedure to create a test session, capture evidence, and verify end-to-end rendering in the browser.

**Why this priority**: Without a repeatable validation procedure, there is no way to confirm the feature works against real infrastructure. This is essential for deployment readiness.

**Independent Test**: Can be tested by following the documented DEV validation steps and confirming all checkpoints pass (session visible, images render, no console errors).

**Acceptance Scenarios**:

1. **Given** the DEV validation procedure, **When** a developer follows all steps, **Then** at least one real session with evidence images is visible in the dashboard.
2. **Given** the dashboard is running against a live PiOrchestrator, **When** viewing sessions and evidence, **Then** the browser console shows no uncaught errors and no direct MinIO LAN requests.

---

### Edge Cases

- What happens when PiOrchestrator returns sessions but the evidence endpoint is still 404 (partial rollout)? The evidence panel shows its graceful degradation message independently while sessions remain visible.
- What happens when a capture's `image_data` is absent and the image proxy endpoint is unavailable? The thumbnail shows a "Stored in S3" placeholder with the object key visible for manual retrieval; other thumbnails are unaffected.
- What happens when the operator's browser is behind Tailscale Funnel? Evidence images load via base64 inline or the image proxy endpoint — never via direct MinIO LAN requests.
- What happens when a session has zero evidence captures? The evidence panel shows an empty state: "No evidence captures yet."
- What happens when the PiOrchestrator response schema drifts from the dashboard's Zod schemas? Validation errors are logged and the affected component degrades gracefully rather than crashing the entire view.
- What happens when the operator switches tabs while images are still loading? In-flight requests complete or cancel gracefully with no errors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display sessions from the live PiOrchestrator diagnostics endpoint with correct status, timestamps, and capture counts.
- **FR-002**: System MUST allow filtering sessions by status (All, Active, Complete, Partial, Failed) via tab navigation.
- **FR-003**: System MUST render evidence images for a selected session using base64 inline data or proxied through PiOrchestrator — never via direct MinIO LAN addresses.
- **FR-004**: System MUST isolate subsystem failures so that a crash in the evidence panel does not affect the session list or camera health dashboard.
- **FR-005**: System MUST display actionable failure information (reason, correlation IDs) for failed sessions.
- **FR-006**: System MUST support copy-to-clipboard for session IDs, container IDs, and correlation IDs with toast confirmation.
- **FR-007**: System MUST degrade gracefully when any individual endpoint returns 404 or 503, showing an informational message rather than an error.
- **FR-008**: System MUST validate all API responses against defined schemas and log validation failures without crashing.
- **FR-009**: System MUST provide a documented DEV validation procedure that creates a real session, captures evidence, and verifies end-to-end rendering.

### Key Entities

- **Session**: Represents a vending machine operation cycle. Key attributes: `session_id`, `container_id` (correlation), status (`active`/`complete`/`partial`/`failed`), `started_at`, capture counts (`total_captures`, `successful_captures`, `failed_captures`), `pair_complete` flag, `elapsed_seconds`, optional `last_error`.
- **Capture Entry**: A timestamped evidence image taken by an ESP32 camera during a session. Key attributes: `evidence_id`, `session_id`, `device_id`, `capture_tag` (BEFORE_OPEN/AFTER_OPEN/BEFORE_CLOSE/AFTER_CLOSE), `status` (captured/failed/timeout), `image_data` (base64, present for recent captures), `object_key` (S3 path), `content_type`, `image_size_bytes`.
- **Evidence Pair**: Structured before/after evidence for a session. Key attributes: `pair_status` (complete/incomplete/missing), nullable `before`/`after` capture slots, `retry_after_seconds` for incomplete pairs.
- **Camera**: An ESP32 camera device that captures evidence. Key attributes: `device_id` (format: espcam-XXXXXX), online/offline status, health metrics (signal strength, memory, error count), last seen timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can view a list of real sessions and open session detail within 5 seconds of page load on a local network.
- **SC-002**: Evidence images from at least one real DEV session render successfully in the browser without any direct MinIO LAN requests.
- **SC-003**: Evidence images render from base64 inline data for recent captures (<24h) and show an informative "Stored in S3" placeholder for older captures without base64 data.
- **SC-004**: When any single backend subsystem is unavailable (404/503), the remaining dashboard sections continue to function normally.
- **SC-005**: A developer can reproduce the end-to-end validation (session creation to evidence capture to dashboard rendering) in under 10 minutes following the documented procedure.
- **SC-006**: The browser console shows zero uncaught errors and zero direct MinIO LAN requests during normal operations viewing.

## Assumptions

- PiOrchestrator V1 endpoints (`/v1/diagnostics/sessions`, `/v1/sessions/{id}/evidence`, `/v1/sessions/{id}/evidence/pair`) use snake_case JSON fields and response schemas that differ significantly from the existing dashboard Zod schemas — schema reconciliation is required.
- PiOrchestrator serves recent evidence images (<24h) as base64 inline data in the `image_data` field. Older images are available only via S3 `object_key` — an image proxy endpoint is a PiOrchestrator handoff item.
- At least one real session with evidence captures exists in the DEV environment (created by PiOrchestrator's smoke run or manual trigger).
- The existing UI components from features 055-058 are functionally complete and require schema/field-name updates rather than ground-up reimplementation.
- MinIO is running on the Pi and accessible to PiOrchestrator for evidence storage.
- PiOrchestrator needs to expose V1 diagnostics routes on the config UI server (port 8082) without API key authentication — this is a handoff requirement.
