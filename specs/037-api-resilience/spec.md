# Feature Specification: API Resilience & UI Correctness

**Feature Branch**: `037-api-resilience`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "Make PiDashboard resilient to PiOrchestrator API variability and ensure UI correctness"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Camera List Reliably (Priority: P1)

As an operator viewing the Cameras tab, I need to see an accurate representation of connected cameras at all times, whether cameras exist or not.

**Why this priority**: This is the core reliability issue reported - cameras were showing "No cameras connected" even when the API returned data. This directly impacts operator trust and usability.

**Independent Test**: Can be fully tested by loading the Cameras tab with various API responses (populated list, empty list, error response) and verifying the UI matches the actual data state.

**Acceptance Scenarios**:

1. **Given** the API returns a list with 1+ cameras, **When** the Cameras tab loads, **Then** all cameras from the response are displayed in the UI
2. **Given** the API returns an empty camera list `[]`, **When** the Cameras tab loads, **Then** the UI shows "No cameras connected" message
3. **Given** the API returns an error (500, 502, network failure), **When** the Cameras tab loads, **Then** the UI shows an error state with retry option (not "No cameras connected")
4. **Given** the API is slow to respond (>3 seconds), **When** the Cameras tab loads, **Then** a loading indicator is shown until data arrives

---

### User Story 2 - Graceful WiFi Feature Degradation (Priority: P2)

As an operator using the dashboard, when WiFi endpoints are unavailable (404), I should still be able to use all other dashboard features without seeing error messages or broken UI.

**Why this priority**: WiFi endpoints can 404 depending on PiOrchestrator binary configuration. This shouldn't break other unrelated features or spam the console with errors.

**Independent Test**: Can be fully tested by configuring WiFi endpoints to return 404 and verifying other tabs (Cameras, Door Status, System Info) work normally without console errors.

**Acceptance Scenarios**:

1. **Given** WiFi endpoints return 404, **When** navigating to any non-WiFi tab, **Then** no errors appear in console and the tab functions normally
2. **Given** WiFi endpoints return 404, **When** viewing the WiFi configuration area, **Then** the UI shows "WiFi configuration not available" or hides the feature gracefully
3. **Given** WiFi endpoints return 404, **When** the dashboard first loads, **Then** no error toasts or notifications appear for the WiFi 404
4. **Given** WiFi endpoints return 200 with data, **When** viewing WiFi configuration, **Then** the feature works as expected

---

### User Story 3 - Door Status Monitoring (Priority: P2)

As an operator monitoring the door status, I need to see current door state and receive updates reliably, even when the backend has intermittent connectivity.

**Why this priority**: Door status is a critical monitoring feature. Operators need confidence that the displayed state reflects reality.

**Independent Test**: Can be fully tested by loading the Door Status view with various API responses and verifying state transitions display correctly.

**Acceptance Scenarios**:

1. **Given** door status API returns valid state, **When** viewing Door Status, **Then** the current state (open/closed/locked) is displayed accurately
2. **Given** door status API fails, **When** viewing Door Status, **Then** the UI shows "Status unavailable" with last known state (if any) and timestamp
3. **Given** door status changes, **When** polling retrieves new state, **Then** the UI updates to reflect the change

---

### User Story 4 - System Information Display (Priority: P3)

As an operator checking system health, I need to view system information metrics reliably.

**Why this priority**: System info provides operational awareness but is less time-critical than cameras or door status.

**Independent Test**: Can be fully tested by loading System Info with various API responses and verifying metrics display correctly.

**Acceptance Scenarios**:

1. **Given** system info API returns metrics, **When** viewing System Info, **Then** all metrics are displayed with correct values
2. **Given** system info API fails, **When** viewing System Info, **Then** the UI shows "Unable to load system information" with retry option

---

### User Story 5 - E2E Test Coverage in CI (Priority: P3)

As a developer, I need automated E2E tests running in CI that validate the critical operator flows against mocked API responses, with trace/video artifacts on failure.

**Why this priority**: Prevents regressions and ensures UI correctness is maintained over time. Essential for long-term quality but not user-facing.

**Independent Test**: Can be tested by running the CI pipeline and verifying tests execute, pass with mocked data, and produce artifacts on failure.

**Acceptance Scenarios**:

1. **Given** E2E tests exist for Cameras/Door/System flows, **When** CI pipeline runs, **Then** tests execute against mocked API and report pass/fail
2. **Given** an E2E test fails, **When** CI pipeline completes, **Then** trace and video artifacts are uploaded and accessible
3. **Given** all tests pass, **When** CI pipeline completes, **Then** the build is marked successful

---

### Edge Cases

- What happens when the API returns malformed JSON? UI should show error state, not crash
- What happens when the API returns HTTP 502 (proxy error)? UI should show "Service unavailable" not "No data"
- What happens when network is completely offline? UI should show offline indicator (offline-first caching is out of scope per Out of Scope section - indicator only, no IndexedDB caching)
- What happens when API returns partial data (some fields missing)? UI should display available data and show "N/A" for missing fields
- What happens when polling interval fires but previous request is still pending? Requests should not stack/duplicate

## Requirements *(mandatory)*

### Functional Requirements

**API Client Hardening**

- **FR-001**: System MUST use a centralized base URL configuration for all API requests (no hardcoded URLs scattered in code)
- **FR-002**: System MUST apply consistent timeout settings (10 seconds default) to all API requests
- **FR-003**: System MUST implement retry logic with exponential backoff for transient failures (max 3 retries)
- **FR-004**: System MUST normalize all API errors into a consistent error shape with code, message, and optional details

**UI State Management**

- **FR-005**: Camera list UI MUST distinguish between three states: loading, empty (no cameras), and error
- **FR-006**: Camera list UI MUST NOT show "No cameras connected" when in loading or error state
- **FR-007**: System MUST treat HTTP 404 on WiFi endpoints as "feature unavailable" not "error"
- **FR-008**: System MUST NOT log console errors for expected 404 responses on optional endpoints
- **FR-009**: All data views MUST show a loading indicator while initial data is being fetched
- **FR-010**: All data views MUST show an error state with retry option when API calls fail

**Polling & Data Freshness**

- **FR-011**: System MUST prevent duplicate concurrent requests for the same endpoint
- **FR-012**: System MUST pause polling when browser tab is not visible (existing behavior, verify maintained)
- **FR-013**: System MUST show data staleness indicator when last successful fetch was >30 seconds ago

**E2E Testing Infrastructure**

- **FR-014**: E2E tests MUST use deterministic API fixtures (not live API)
- **FR-015**: E2E tests MUST cover: Cameras list display, Door status display, System info display
- **FR-016**: CI MUST upload trace and video artifacts on E2E test failure
- **FR-017**: E2E tests MUST be runnable against live Pi endpoint via configuration flag (smoke mode)

### Key Entities

- **APIError**: Normalized error with code (string), message (string), status (number), retryable (boolean)
- **LoadingState**: Enum of "idle", "loading", "success", "error" for each data fetch
- **FeatureAvailability**: Per-feature flag indicating if backend supports the feature (derived from 404/503 detection; applies only to WiFi endpoints per plan.md - cameras/door/system are always-available endpoints)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With mocked API returning 1+ cameras, UI displays all cameras 100% of the time (no false "No cameras" states)
- **SC-002**: With mocked API returning empty list, UI shows "No cameras connected" 100% of the time
- **SC-003**: WiFi 404 responses result in zero console errors and zero error toasts
- **SC-004**: E2E test suite achieves 90%+ coverage of critical operator flows (Cameras, Door, System)
- **SC-005**: CI pipeline uploads trace/video artifacts on 100% of E2E test failures
- **SC-006**: All API failures result in user-friendly error messages (not technical jargon or empty states)
- **SC-007**: Dashboard remains fully functional for non-WiFi features when WiFi endpoints return 404

## Assumptions

- PiOrchestrator API response schemas are stable and match existing Zod schemas in `src/infrastructure/api/schemas.ts`
- WiFi endpoints (`/api/wifi/*`) are the only optional endpoints; Cameras, Door, and System endpoints are always present
- Existing Playwright E2E infrastructure from Feature 005 can be extended for this feature
- MSW (Mock Service Worker) or similar can be used for deterministic API mocking in tests
- The "real-pi smoke mode" will use environment variables to configure the target endpoint

## Out of Scope

- Offline-first functionality with IndexedDB caching (existing offline queue is separate)
- Real-time WebSocket updates (current polling approach is acceptable)
- WiFi configuration UI changes (only degradation handling, not new WiFi features)
- Performance optimization beyond preventing duplicate requests
