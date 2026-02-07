# Feature Specification: Evidence UI & CI Remediation

**Feature Branch**: `044-evidence-ci-remediation`
**Created**: 2026-02-04
**Status**: Complete
**Input**: User description: "PiDashboard: remove any assumptions about container IDs and support opaque container_id + human-readable labels. Implement container management UI wired to /api/v1/containers/* and evidence flows wired to /api/v1/cameras/:id/evidence + diagnostics endpoints. CI remediation: Node version sync, Playwright version sync, VITEST_MAX_WORKERS=1, and fix lint issues."

## Context

This feature builds upon Feature 043 (Container Identity Model UI) and addresses findings from Feature 001 (Current State Report). The container management infrastructure already exists with proper opaque ID handling. This feature:
1. Verifies and reinforces opaque ID handling (no semantic assumptions)
2. Completes evidence capture UI integration with `/api/v1/cameras/:id/evidence`
3. Remediates CI pipeline issues identified in the current state report

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture Evidence from Camera (Priority: P1)

An admin views a camera detail and initiates evidence capture. The system calls `/api/v1/cameras/:id/evidence` to capture an image, stores it for the active session, and provides visual feedback. The captured image can be previewed and downloaded.

**Why this priority**: Evidence capture is the core value proposition for container-based monitoring. Without this flow, cameras cannot record events.

**Independent Test**: Can be fully tested by opening a camera detail, clicking "Capture Evidence", and verifying an image is captured, previewed, and added to the session evidence list.

**Acceptance Scenarios**:

1. **Given** a camera is online, **When** the user clicks "Capture Evidence", **Then** the system captures an image and displays it with a timestamp.
2. **Given** evidence capture is in progress, **When** the user views the UI, **Then** a loading indicator shows and the capture button is disabled.
3. **Given** evidence capture fails (camera offline, network error), **When** the API returns an error, **Then** an error toast appears with a user-friendly message and retry option.
4. **Given** no active session exists, **When** the user attempts capture, **Then** the system shows guidance to start a monitoring session first.

---

### User Story 2 - View Session Evidence Gallery (Priority: P1)

An admin views all captured evidence for the current or past monitoring sessions. Evidence is displayed chronologically with thumbnails, timestamps, and source camera identification. Users can filter by camera or time range.

**Why this priority**: Evidence review is essential for investigating incidents and validating container monitoring effectiveness.

**Independent Test**: Can be fully tested by navigating to the evidence gallery, viewing thumbnails, filtering by camera, and verifying correct chronological ordering.

**Acceptance Scenarios**:

1. **Given** a session has captured evidence, **When** the user opens the evidence gallery, **Then** thumbnails display in reverse chronological order.
2. **Given** evidence from multiple cameras exists, **When** the user filters by a specific camera, **Then** only evidence from that camera is displayed.
3. **Given** a presigned URL has expired, **When** the user views the gallery, **Then** the system automatically refreshes the URL via `/dashboard/diagnostics/images/presign`.
4. **Given** no evidence exists for a session, **When** the user opens the gallery, **Then** an empty state with guidance is displayed.

---

### User Story 3 - CI Pipeline Stability (Priority: P1)

As a developer, I want the CI pipeline to pass reliably so PRs can be merged without flaky failures. This requires Node.js version sync, Playwright version sync, test worker limits, and lint error fixes.

**Why this priority**: CI stability is a prerequisite for team velocity and code quality. Flaky pipelines erode trust and slow development.

**Independent Test**: Can be fully tested by creating a PR and verifying all CI checks pass without manual intervention.

**Acceptance Scenarios**:

1. **Given** a PR is opened, **When** CI runs, **Then** all checks pass (tests, lint, build).
2. **Given** the handoff-check workflow runs, **When** Node.js version is checked, **Then** it matches the project's target version (22).
3. **Given** tests run in CI, **When** Vitest executes, **Then** worker limit is enforced (`VITEST_MAX_WORKERS=1`) for reproducibility.
4. **Given** lint check runs, **When** `npm run lint` executes, **Then** zero errors are reported.

---

### User Story 4 - Evidence Diagnostics View (Priority: P2)

An admin views session diagnostics including evidence statistics, capture success rates, and storage usage. This helps identify issues with cameras or storage.

**Why this priority**: Diagnostics enable proactive maintenance but are not required for basic evidence capture flow.

**Independent Test**: Can be fully tested by navigating to diagnostics, viewing evidence statistics, and verifying data accuracy against known captured images.

**Acceptance Scenarios**:

1. **Given** sessions exist with evidence, **When** the user views diagnostics, **Then** aggregate statistics (total captures, success rate, storage used) are displayed.
2. **Given** a camera has failed captures, **When** the user views diagnostics, **Then** the failure count and reasons are visible.

---

### User Story 5 - Container ID Audit (Priority: P2)

As a maintainer, I want confirmation that all container and camera references use opaque IDs without semantic assumptions, ensuring the UI is compatible with any backend ID generation strategy.

**Why this priority**: Ensures long-term compatibility and prevents subtle bugs from ID format assumptions.

**Independent Test**: Can be fully tested by code review confirming no semantic parsing, comparison, or formatting of container_id/device_id values.

**Acceptance Scenarios**:

1. **Given** the container list loads, **When** containers are rendered, **Then** labels are displayed prominently and IDs appear in monospace secondary text with no format assumptions.
2. **Given** a container has a UUID-format ID, **When** displayed, **Then** the UI does not parse, truncate, or interpret the ID.
3. **Given** a container has a non-UUID ID (e.g., "kitchen-001"), **When** displayed, **Then** the UI renders it identically to UUID-format IDs.

---

### Edge Cases

- What happens when evidence capture times out? Display timeout error with retry button; do not block camera view.
- How does the system handle presigned URL expiration during gallery scroll? Lazy-refresh URLs as images enter viewport.
- What if lint fixes introduce regressions? Run full test suite after each lint fix commit.
- What if Playwright version change breaks tests? Update tests to match Playwright 1.57.0 API if needed.

## Requirements *(mandatory)*

### Functional Requirements

**Evidence Capture:**
- **FR-001**: System MUST provide a "Capture Evidence" button on camera detail views that calls `/api/v1/cameras/:id/evidence`.
- **FR-002**: System MUST display captured evidence with preview thumbnail, timestamp, and source camera identification.
- **FR-003**: System MUST allow downloading captured evidence images.
- **FR-004**: System MUST show loading state during capture and disable the capture button to prevent double-submission.
- **FR-005**: System MUST display user-friendly error messages for capture failures with retry option.

**Evidence Gallery:**
- **FR-006**: System MUST provide an evidence gallery view at `/dashboard/diagnostics/sessions/{sessionId}/evidence`.
- **FR-007**: System MUST display evidence thumbnails in reverse chronological order.
- **FR-008**: System MUST allow filtering evidence by camera source.
- **FR-009**: System MUST automatically refresh expired presigned URLs via `/dashboard/diagnostics/images/presign`.
- **FR-010**: System MUST show empty state when no evidence exists for a session.

**CI Remediation:**
- **FR-011**: CI MUST use Node.js version 22 across all workflows (sync handoff-check.yml with test.yml).
- **FR-012**: CI MUST set `VITEST_MAX_WORKERS=1` environment variable for unit test jobs.
- **FR-013**: Project MUST sync Playwright version between `flake.nix` and `package.json` (target: 1.57.0).
- **FR-014**: All 21 lint errors MUST be resolved (unused imports/variables in test files).
- **FR-015**: React Fast Refresh warning in ConnectionQualityBadge.tsx MUST be addressed.

**ID Handling:**
- **FR-016**: System MUST treat all container_id and device_id values as opaque strings with no semantic interpretation.
- **FR-017**: System MUST NOT parse, truncate, or format ID values for display (render as-is in monospace).
- **FR-018**: System MUST use labels as the primary user-facing identifier, with IDs shown secondarily.

### Key Entities

- **Evidence**: A captured image from a camera with timestamp, presigned URL, session association, and source camera reference.
- **Session**: A monitoring period with associated evidence captures, start/end times, and aggregate statistics.
- **PresignedUrl**: A time-limited URL for accessing evidence images, requiring refresh via `/dashboard/diagnostics/images/presign`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can capture evidence and view it in the gallery within 5 seconds of clicking "Capture".
- **SC-002**: Evidence gallery loads and displays up to 50 thumbnails within 3 seconds.
- **SC-003**: CI pipeline achieves 100% pass rate on clean PRs (no flaky failures from version mismatches or worker limits).
- **SC-004**: Lint check reports 0 errors when `npm run lint` is executed.
- **SC-005**: All container and camera IDs render identically regardless of format (UUID, MAC address, custom string).
- **SC-006**: Evidence capture success rate matches backend capability (no UI-induced failures).
- **SC-007**: All interactive elements have appropriate data-testid attributes for E2E testing.

## Assumptions

- The PiOrchestrator backend provides `/api/v1/cameras/:id/evidence` endpoint for capturing evidence.
- The `/api/dashboard/diagnostics/sessions/{sessionId}/evidence` endpoint returns evidence with presigned URLs.
- The `/api/dashboard/diagnostics/images/presign` endpoint accepts an image ID and returns a fresh presigned URL.
- Container management UI from Feature 043 is complete and functional.
- All ID values (container_id, device_id) remain stable across sessions and reboots.

## Dependencies

- **Feature 043**: Container Identity Model UI (container CRUD, camera assignment)
- **PiOrchestrator**: Evidence capture endpoint implementation
- **BridgeServer**: Diagnostics session and evidence endpoints (if separate service)

## Out of Scope

- Evidence retention policies (handled by backend)
- Evidence search/tagging features
- Multi-tenancy or user-based evidence access control
- Real-time evidence streaming (only point-in-time capture)
