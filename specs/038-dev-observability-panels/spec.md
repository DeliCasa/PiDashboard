# Feature Specification: DEV Observability Panels for Purchase/Evidence Sessions

**Feature Branch**: `038-dev-observability-panels`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "DEV Observability Panels for Purchase/Evidence Sessions - dashboard views for validating current sessions, evidence capture timestamps, evidence thumbnails via BridgeServer /view endpoints, and DEV diagnostics page showing health status of BridgeServer, PiOrchestrator, and MinIO"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - DEV Diagnostics Health Check (Priority: P1)

As a DEV operator, I need to quickly verify that all backend services (BridgeServer, PiOrchestrator, MinIO) are operational so I can confirm the system is healthy before investigating session issues.

**Why this priority**: This is the foundation for all other observability - operators cannot diagnose session/evidence issues without first knowing if services are up. This enables the <60s health assessment requirement.

**Independent Test**: Can be fully tested by navigating to the DEV Diagnostics page and verifying all three service health indicators display current status (up/down/degraded). Delivers immediate operational visibility value.

**Acceptance Scenarios**:

1. **Given** the operator navigates to the DEV Diagnostics page, **When** all services are healthy, **Then** each service shows a green "healthy" indicator with last-checked timestamp
2. **Given** the operator is on the DEV Diagnostics page, **When** BridgeServer is unreachable, **Then** BridgeServer shows a red "down" indicator with error details
3. **Given** the operator is on the DEV Diagnostics page, **When** PiOrchestrator is unreachable, **Then** PiOrchestrator shows a red "down" indicator with error details
4. **Given** the operator is on the DEV Diagnostics page, **When** MinIO is unhealthy, **Then** MinIO shows a degraded/down indicator with error details
5. **Given** any service shows unhealthy status, **When** the operator clicks refresh, **Then** all health checks re-run and update within 5 seconds

---

### User Story 2 - Active Sessions Overview (Priority: P2)

As a DEV operator, I need to view current purchase/evidence sessions so I can monitor active activity and identify stale or stuck sessions.

**Why this priority**: After confirming services are healthy, operators need to see what sessions exist to diagnose specific issues. This enables real-time session monitoring.

**Independent Test**: Can be fully tested by viewing the sessions panel and verifying it displays session data when active sessions exist. Delivers session visibility value.

**Acceptance Scenarios**:

1. **Given** the operator views the sessions panel, **When** active sessions exist, **Then** each session displays session ID, start time, and current state
2. **Given** the operator views the sessions panel, **When** no active sessions exist, **Then** an empty state message indicates "No active sessions"
3. **Given** an active session exists, **When** the session state changes, **Then** the display updates within the polling interval (configurable, default 10 seconds)
4. **Given** multiple sessions exist, **When** viewing the sessions panel, **Then** sessions are sorted by start time (most recent first)

---

### User Story 3 - Evidence Capture Status (Priority: P2)

As a DEV operator, I need to see the last evidence capture timestamp for sessions so I can verify captures are occurring as expected.

**Why this priority**: Equal priority to session overview - timestamps are essential for confirming the capture pipeline is working. Paired with User Story 2 for complete session monitoring.

**Independent Test**: Can be fully tested by viewing evidence capture timestamps for sessions with captures. Delivers capture pipeline monitoring value.

**Acceptance Scenarios**:

1. **Given** a session has captured evidence, **When** viewing the session details, **Then** the last capture timestamp is displayed
2. **Given** a session has no evidence captured yet, **When** viewing the session details, **Then** a "No captures yet" indicator is shown
3. **Given** a session's last capture was more than 5 minutes ago, **When** viewing the session details, **Then** a warning indicator highlights the stale capture state
4. **Given** evidence is captured for a session, **When** viewing the panel, **Then** the timestamp updates on the next polling cycle

---

### User Story 4 - Evidence Thumbnail Preview (Priority: P3)

As a DEV operator, I need to view evidence thumbnails via BridgeServer /view endpoints so I can visually confirm evidence is captured and stored correctly without exposing internal storage keys.

**Why this priority**: Lower priority as it's a verification layer on top of capture status. Requires sessions and captures to work first. Important for visual validation but not critical for basic health assessment.

**Independent Test**: Can be fully tested by viewing a session with captured evidence and seeing thumbnail images load. Delivers visual evidence verification value.

**Acceptance Scenarios**:

1. **Given** evidence exists for a session, **When** the operator views the evidence panel, **Then** thumbnails load via BridgeServer /view endpoints (not direct storage URLs)
2. **Given** evidence thumbnails are loading, **When** a thumbnail fails to load, **Then** a placeholder with error state is shown
3. **Given** the operator clicks a thumbnail, **When** the full image modal opens, **Then** the full-resolution image loads via BridgeServer /view endpoint
4. **Given** multiple evidence items exist, **When** viewing the evidence panel, **Then** thumbnails are displayed in capture order (most recent first)
5. **Given** evidence is being viewed, **When** the operator inspects network requests, **Then** no storageKey values are visible in URLs or responses

---

### Edge Cases

- What happens when BridgeServer /health endpoint times out? (Display "timeout" status with last known state after 5 second timeout)
- What happens when PiOrchestrator is behind a firewall/unreachable? (Display "unreachable" with connection error details after 5 second timeout)
- What happens when MinIO health check returns degraded status? (Display "degraded" with specific bucket/service info)
- What happens when a session has evidence but BridgeServer /view endpoint returns 404? (Show "evidence unavailable" with retry option)
- How does the system handle rapid polling when services are flapping? (Implement exponential backoff on repeated failures, max 3 retries with 2x backoff)
- What happens when evidence thumbnails exceed reasonable size limits? (Thumbnails limited to 200x150px display size; images >500KB show loading indicator with lazy loading)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated DEV Diagnostics page accessible from the dashboard navigation
- **FR-002**: System MUST display BridgeServer health status by querying its /health endpoint
- **FR-003**: System MUST display PiOrchestrator health status by querying its /health endpoint
- **FR-004**: System MUST display MinIO health status by querying appropriate health endpoints
- **FR-005**: System MUST display health check timestamps showing when each service was last checked
- **FR-006**: System MUST provide manual refresh capability for all health checks
- **FR-007**: System MUST display current active sessions with session ID, start time, and state
- **FR-008**: System MUST display last evidence capture timestamp for each session
- **FR-009**: System MUST highlight sessions with stale captures (no capture in last 5 minutes)
- **FR-010**: System MUST display evidence thumbnails via BridgeServer /view endpoints
- **FR-011**: System MUST NOT expose storageKey values in any client-side URLs or API responses
- **FR-012**: System MUST handle service unavailability gracefully with appropriate error states
- **FR-013**: System MUST support configurable polling interval for session/evidence updates (default 10 seconds, configured as code constant in hooks - no UI required for DEV feature)
- **FR-014**: System MUST provide documentation at docs/dev-diagnostics.md with troubleshooting guidance

### Key Entities

- **ServiceHealth**: Represents the health status of a backend service (service name, status enum [healthy/degraded/down/timeout/unknown], last checked timestamp, error details if any)
- **Session**: Represents an active purchase/evidence session (session ID, start timestamp, current state, associated evidence count)
- **EvidenceCapture**: Represents a captured evidence item (capture ID, session ID, capture timestamp, view URL via BridgeServer)
- **DiagnosticsState**: Aggregate of all health statuses and session summaries for the diagnostics view

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can determine system health status (all services up/any down) within 60 seconds of opening the DEV Diagnostics page
- **SC-002**: Health check results display within 5 seconds of page load or manual refresh
- **SC-003**: Session list updates reflect current state within the configured polling interval (default 10 seconds)
- **SC-004**: Evidence thumbnails load within 3 seconds for 95% of requests
- **SC-005**: Zero storageKey values exposed in browser network traffic during evidence viewing
- **SC-006**: Documentation enables new operators to perform basic troubleshooting without additional guidance

## Assumptions

- BridgeServer is deployed on DEV Dokku and exposes a /health endpoint
- PiOrchestrator is running on the real Pi device and exposes /api/system/info endpoint (used to derive health status)
- MinIO health is checked via BridgeServer /health/storage endpoint (no direct MinIO access from browser)
- BridgeServer /view endpoints are available for secure evidence viewing without storageKey exposure
- The dashboard has network access to all three services (BridgeServer, PiOrchestrator, MinIO)
- Session and evidence data is available via existing BridgeServer API endpoints
- Polling approach is acceptable for DEV environment (no real-time WebSocket requirement)

## Constraints

- No Docker Compose usage - consumes DEV Dokku BridgeServer and real PiOrchestrator
- Evidence viewing must go through BridgeServer /view endpoints (no direct MinIO access from client)
- This is a DEV-focused feature - production security and scalability are secondary concerns
