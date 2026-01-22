# Feature Specification: Dashboard Recovery + ESP Visibility

**Feature Branch**: `030-dashboard-recovery`
**Created**: 2026-01-12
**Status**: Draft
**Input**: User description: "PiDashboard: Nothing Works Recovery + ESP Visibility (Post-029 Routes)"

## Context

The PiDashboard has been deployed and is served from PiOrchestrator on port 8082 following the 029 route normalization work (commit `6edcfeb`). However, users report that "ESPs are not being shown" and "no feature is working." This specification covers the forensic investigation, root cause analysis, and stabilization fixes required to restore full dashboard functionality.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Device List Visibility (Priority: P1)

A field technician opens the PiDashboard and expects to see all discovered ESP32 devices listed on the Devices page. Currently, the device list appears empty even when devices exist in the backend.

**Why this priority**: Without visible devices, the primary function of the dashboard (device provisioning and management) is completely unusable. This is the most critical user-facing symptom.

**Independent Test**: Navigate to the Devices page and verify that known devices (confirmed via direct API curl) appear in the UI list.

**Acceptance Scenarios**:

1. **Given** devices exist in the backend (verified via `curl /api/devices`), **When** the user opens the Devices page, **Then** devices appear in the device list within 3 seconds
2. **Given** the backend returns an empty device list, **When** the user opens the Devices page, **Then** an empty state message is shown (not a blank/broken page)
3. **Given** the API returns an error, **When** the user opens the Devices page, **Then** an error banner displays with the endpoint, status code, and request ID

---

### User Story 2 - API Error Visibility (Priority: P1)

A field technician encounters an API failure and needs to understand what went wrong. Currently, failures may be silent or produce cryptic errors.

**Why this priority**: Silent failures prevent diagnosis and create a "nothing works" perception. Making errors visible is prerequisite to all other fixes.

**Independent Test**: Trigger an API error (e.g., network disconnect or invalid endpoint) and verify the error is surfaced in the UI with actionable information.

**Acceptance Scenarios**:

1. **Given** any API call fails, **When** the response is received, **Then** an error banner appears showing: endpoint path, HTTP status code, and request ID (from `X-Request-Id` header) if present
2. **Given** an API returns HTML instead of JSON (SPA fallback bug), **When** the dashboard tries to parse it, **Then** a specific error message indicates "API route hitting SPA fallback - endpoint not registered"
3. **Given** a network error occurs, **When** the request fails, **Then** the UI shows "Network error" with a retry option

---

### User Story 3 - Core Page Loading (Priority: P2)

A field technician navigates between dashboard pages (Devices, WiFi, System Status) and expects each page to load and display relevant information.

**Why this priority**: Page loading is foundational but depends on device visibility (P1) working first.

**Independent Test**: Navigate to each core page and verify it renders without errors and displays appropriate content or empty states.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded, **When** the user navigates to the Devices page, **Then** the page renders with device table headers visible
2. **Given** the dashboard is loaded, **When** the user navigates to the WiFi page, **Then** WiFi status and available networks load (or show loading/error state)
3. **Given** the dashboard is loaded, **When** the user navigates to any page, **Then** no uncaught JavaScript exceptions appear in the console

---

### User Story 4 - Provisioning Flow Access (Priority: P3)

A field technician accesses provisioning features (allowlist management, batch sessions) and expects them to function without HTML fallback errors.

**Why this priority**: Provisioning is critical but requires device visibility (P1) and error handling (P1) to be usable.

**Independent Test**: Access provisioning endpoints from the UI and verify JSON responses are received and parsed correctly.

**Acceptance Scenarios**:

1. **Given** the V1 provisioning API is available, **When** the user accesses the allowlist page, **Then** the allowlist loads showing entries or an empty state
2. **Given** SSE events are working, **When** the user starts a batch session, **Then** real-time events update the UI
3. **Given** any provisioning endpoint fails, **When** the error occurs, **Then** the error banner shows the V1 endpoint path and request ID

---

### Edge Cases

- What happens when the API returns HTML instead of JSON (SPA fallback)?
  - System detects `content-type: text/html` and shows specific error: "API route hitting SPA fallback"
- What happens when response JSON structure doesn't match expected schema?
  - System shows parsing error with field mismatches and logs details for debugging
- What happens when the dashboard is accessed via wrong port (e.g., old bookmark to 8081)?
  - User sees 404 or connection refused; documented in troubleshooting
- What happens when network disconnects mid-request?
  - System shows "Network error" with retry button
- What happens when API responds with 5xx error?
  - System shows error banner with status code and retry option if retryable

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Dashboard MUST use relative same-origin URLs for all API calls (no hardcoded ports or IPs)
- **FR-002**: API client MUST validate response content-type before parsing (expect `application/json`)
- **FR-003**: API client MUST surface errors visibly in the UI with endpoint, status code, and request ID
- **FR-004**: Device list MUST handle response shape variations (normalize `data.devices` vs `devices` vs array)
- **FR-005**: All API responses MUST be decoded through validation schemas with graceful error handling
- **FR-006**: Dashboard MUST show distinct states: loading, empty (no data), error (API failed), populated (has data)
- **FR-007**: API client MUST include `Accept: application/json` header on all requests
- **FR-008**: HTML fallback responses MUST trigger a specific, actionable error message
- **FR-009**: Dashboard MUST provide a mechanism to copy debug information (endpoint, status, request ID, timestamp)
- **FR-010**: A smoke test script MUST verify all critical endpoints return JSON with correct status codes

### Key Entities

- **APIError**: Structured error with endpoint path, HTTP status, request ID (from `X-Request-Id` header), error message, timestamp, and retryable flag
- **HTMLFallbackError**: Specialized error for when API returns HTML instead of JSON (SPA fallback detection)
- **DeviceListState**: UI state enum for device list (loading, empty, populated, error)
- **DebugInfo**: Copyable debug information structure containing endpoint, status, request ID, timestamp, user agent, and origin
- **ConnectionState**: Current state of API connectivity (connected, error, reconnecting, disconnected)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Devices page shows device list within 3 seconds when devices exist (0% blank page occurrences)
- **SC-002**: 100% of API errors display visible error banner with endpoint and status code
- **SC-003**: 0% of API calls use hardcoded ports (8081, 8082) or IP addresses in production code
- **SC-004**: Smoke test script passes with all endpoints returning JSON (not HTML) and status 200
- **SC-005**: All core pages (Devices, WiFi, Status) render without uncaught console exceptions
- **SC-006**: HTML fallback responses are detected and show specific "SPA fallback" error message

---

## Assumptions

- PiOrchestrator 029 is deployed with route normalization (commit `6edcfeb`)
- Backend API returns devices in a consistent format (variations handled by normalization layer)
- No authentication changes are required (existing flow works)
- Tailscale Funnel continues to expose port 8082 publicly
- The issue is frontend integration/parsing, not backend data availability
- FR-004 (response shape normalization) is already implemented via `ensureArray()` in `useDevices` hook (feature 028-api-compat)

## Out of Scope

- Backend API changes beyond documentation of expected formats
- UI/UX redesign
- New feature development
- Performance optimization beyond basic timeout handling
