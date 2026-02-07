# Feature Specification: Dashboard Resilience & E2E Coverage

**Feature Branch**: `045-dashboard-resilience-e2e`
**Created**: 2026-02-06
**Status**: Draft
**Input**: User description: "Reconstruct current UI/API assumptions and ensure the dashboard works with opaque container IDs; tolerate optional/missing PiOrchestrator endpoints gracefully; add/extend E2E coverage for operator-critical flows"

## Context

Feature 044 (Evidence/CI Remediation) is complete. The dashboard is stable with 2094+ passing tests and 0 lint errors. However, three gaps remain:

1. **E2E mock coverage gap**: Existing E2E mocks in `tests/e2e/fixtures/mock-routes.ts` cover system, WiFi, door, config, logs, and cameras — but **containers**, **diagnostics/evidence**, and **sessions** have no E2E mock infrastructure. This means these newer features have no Playwright coverage.

2. **Opaque ID gap**: While the codebase correctly treats container IDs as opaque strings (verified in Feature 044), E2E tests don't exercise this. A mock returning `"kitchen-fridge-001"` as a container ID should render correctly — no E2E test verifies this today.

3. **Missing endpoint tolerance gap**: `isFeatureUnavailable()` exists in the API client and is used by WiFi, diagnostics, evidence, and sessions hooks — but **containers** and **cameras** hooks don't use it. If PiOrchestrator drops these endpoints, the UI will show error states instead of graceful "feature unavailable" messages.

4. **Live Pi smoke runbook gap**: `live-smoke.spec.ts` exists but only covers legacy tabs (System, WiFi, Door, Config, Logs). The newer Cameras, Containers, and Diagnostics tabs have no live Pi verification.

## User Scenarios & Testing

### User Story 1 - E2E Mock Infrastructure for Full Dashboard (Priority: P1)

As an operator, I need the entire dashboard to render correctly with mocked API responses so that CI catches rendering regressions across all features — not just the legacy tabs.

**Why this priority**: Without E2E mock coverage for containers, cameras, diagnostics, and evidence, regressions in these critical features go undetected until manual testing on a real Pi. This is the foundational gap that blocks all other stories.

**Independent Test**: Run `npm run test:e2e` with full mock coverage. All tabs render loading → data states. No console errors.

**Acceptance Scenarios**:

1. **Given** the mock API returns 1 camera with opaque ID `"espcam-a1b2c3"`, **When** the Cameras tab loads, **Then** the camera card renders with name and status visible (not "No cameras connected")
2. **Given** the mock API returns 2 containers with opaque IDs `"kitchen-fridge-001"` and `"550e8400-e29b-41d4-a716-446655440000"`, **When** the Containers tab loads, **Then** both container cards render with labels and ID display in monospace
3. **Given** the mock API returns diagnostics health data, **When** the Diagnostics tab loads, **Then** health cards render with status badges
4. **Given** the mock API returns evidence/session data, **When** the evidence panel loads within Diagnostics, **Then** evidence thumbnails render

---

### User Story 2 - Graceful Degradation for Missing Endpoints (Priority: P1)

As an operator running an older PiOrchestrator version, I need the dashboard to gracefully handle 404/503 responses from newer endpoints (containers, diagnostics) without breaking the core tabs (System, WiFi, Door, Config, Logs).

**Why this priority**: PiOrchestrator is the primary dependency and its API surface evolves independently. The dashboard must tolerate missing endpoints without showing error states that confuse operators.

**Independent Test**: Mock all V1 endpoints (cameras, containers, diagnostics) as 404/503. Verify core tabs still render and no uncaught console errors appear.

**Acceptance Scenarios**:

1. **Given** `/v1/containers` returns 404, **When** the Containers tab loads, **Then** a "Feature unavailable" message appears (not a red error card with retry)
2. **Given** `/v1/cameras` returns 503, **When** the Cameras tab loads, **Then** a "Feature unavailable" message appears and polling stops
3. **Given** `/dashboard/diagnostics/*` returns 404, **When** the Diagnostics tab loads, **Then** diagnostics silently degrades (already handled by `isFeatureUnavailable()`)
4. **Given** all V1 endpoints return 404, **When** the user navigates through System → WiFi → Door → Config → Logs tabs, **Then** all core tabs render normally with no console errors

---

### User Story 3 - Operator-Critical Flow E2E Coverage (Priority: P1)

As a developer, I need Playwright E2E tests covering the operator-critical flows (camera capture, container management, evidence viewing) so that CI catches UI regressions in these workflows.

**Why this priority**: These flows are operator-facing and currently have no E2E coverage. Component tests exist but don't catch integration issues (e.g., wrong tab wiring, broken navigation, missing data-testid).

**Independent Test**: Run `npm run test:e2e` and verify operator-critical flow tests pass with mocked APIs.

**Acceptance Scenarios**:

1. **Given** mocked cameras API with 1 online camera, **When** the user navigates to Cameras tab and clicks capture, **Then** the capture flow completes (loading → image preview)
2. **Given** mocked containers API with 1 container, **When** the user opens container detail, **Then** the container card shows camera slots
3. **Given** mocked diagnostics API, **When** the user navigates to Diagnostics tab, **Then** health cards and session list render

---

### User Story 4 - Live Pi Smoke Runbook Extension (Priority: P2)

As an operator deploying to a real Pi, I need smoke tests that verify the newer features (Cameras, Containers, Diagnostics) work against a live PiOrchestrator instance.

**Why this priority**: The existing `live-smoke.spec.ts` only covers legacy tabs. New features need live verification to catch deployment issues that mocks can't replicate.

**Independent Test**: Run `LIVE_PI_URL=http://192.168.1.124:8082 npm run test:e2e -- tests/e2e/live-smoke.spec.ts` and verify new tab tests pass or skip gracefully if endpoints unavailable.

**Acceptance Scenarios**:

1. **Given** a live Pi with PiOrchestrator running, **When** the Cameras tab is tested, **Then** the test either shows camera data or gracefully reports "no cameras" (not error state)
2. **Given** a live Pi where containers endpoint may or may not exist, **When** the Containers tab is tested, **Then** the test either shows container data or skips with "endpoint unavailable"
3. **Given** a live Pi, **When** all tabs are navigated in sequence, **Then** no tab produces console errors

---

### User Story 5 - Dashboard State Documentation (Priority: P2)

As a developer maintaining the dashboard, I need a state machine document per page so that new contributors understand the loading/error/empty/populated states without reading every component file.

**Why this priority**: The codebase has 12 tabs with complex state handling. A centralized document prevents inconsistent state handling in future features.

**Independent Test**: The document exists at `docs/dashboard_states.md` and accurately describes each tab's state machine.

**Acceptance Scenarios**:

1. **Given** the document is generated, **When** a developer reads it, **Then** they can identify all possible states for each tab (loading, error, empty, populated, feature-unavailable)
2. **Given** the document lists the hooks per tab, **When** a developer needs to modify a tab, **Then** they know which hooks and API endpoints are involved

---

### Edge Cases

- What happens when a container has an ID that contains URL-unsafe characters (e.g., `container/with/slashes`)? The API client uses `encodeURIComponent()` — E2E test should verify.
- What happens when evidence capture returns a very large base64 image (>5MB)? Performance should remain acceptable.
- What happens when the SSE log stream disconnects mid-session? The LogSection should show reconnection status.
- What happens when two tabs poll the same endpoint concurrently? React Query deduplication should prevent duplicate requests.

## Requirements

### Functional Requirements

- **FR-001**: E2E mock infrastructure MUST cover all 12 dashboard tabs with realistic mock data
- **FR-002**: Mock data for containers MUST use opaque IDs (mix of UUIDs, semantic strings, numeric strings) to verify no semantic ID coupling
- **FR-003**: `isFeatureUnavailable()` MUST be applied to containers and cameras hooks for graceful 404/503 handling
- **FR-004**: E2E tests MUST verify that 404/503 on V1 endpoints does not break core tabs
- **FR-005**: E2E tests MUST cover camera capture, container detail, and diagnostics rendering flows
- **FR-006**: Live Pi smoke tests MUST cover Cameras, Containers, and Diagnostics tabs
- **FR-007**: Dashboard state documentation MUST be generated at `docs/dashboard_states.md`
- **FR-008**: E2E tests MUST use `data-testid` selectors for reliable element targeting
- **FR-009**: E2E tests MUST verify zero console errors during full tab navigation

### Key Entities

- **MockAPI Extensions**: New mock methods for containers, diagnostics, evidence, sessions in `tests/e2e/fixtures/mock-routes.ts`
- **Dashboard States**: State machine per tab documenting loading/error/empty/populated/unavailable transitions
- **Live Smoke Extensions**: New test cases in `tests/e2e/live-smoke.spec.ts` for newer tabs

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 12 tabs have E2E mock data in `mock-routes.ts` (currently 7 of 12 covered)
- **SC-002**: E2E test suite includes at least 3 new spec files covering containers, diagnostics, and graceful degradation
- **SC-003**: Running E2E tests with all V1 endpoints mocked as 404 produces zero console errors on core tabs
- **SC-004**: `docs/dashboard_states.md` exists with state machines for all 12 tabs
- **SC-005**: Live Pi smoke tests cover Cameras, Containers, Diagnostics tabs (skip if endpoint unavailable)
- **SC-006**: Container ID display works with IDs: `"kitchen-fridge-001"`, `"550e8400-e29b-41d4-a716-446655440000"`, `"CONTAINER_ABC_123"`, `"12345"`
- **SC-007**: Lint passes with 0 errors, all existing 2094+ tests continue to pass
