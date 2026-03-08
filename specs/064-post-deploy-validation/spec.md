# Feature Specification: Post-Deploy Validation Suite

**Feature Branch**: `064-post-deploy-validation`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "EPIC: PiDashboard — post-deploy validation suite (E2E smoke + transport regression tests) for device RPC flows"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - E2E Smoke Tests for Device RPC Flows (Priority: P1)

A developer or CI pipeline runs the post-deploy smoke suite to confirm that the core device management screens — sessions, evidence, and cameras — render correctly and respond to user interactions after a dashboard deployment. The smoke tests exercise the full UI path: navigating to the Operations tab, viewing session lists, drilling into session details, viewing evidence pairs, and checking camera health. These tests use mocked RPC endpoints (Connect protocol over HTTP POST) to simulate realistic backend responses.

**Why this priority**: These flows are the primary value of the dashboard. If sessions, evidence, or cameras fail to render after a deploy, operators cannot manage the vending machine. Catching regressions here prevents broken deployments to the Pi.

**Independent Test**: Can be fully tested by running the E2E test suite against the Vite dev server with mocked RPC endpoints. Delivers confidence that all critical device management screens load and function correctly.

**Acceptance Scenarios**:

1. **Given** the dashboard is deployed and the smoke suite runs, **When** a user navigates to the Operations tab, **Then** the sessions list renders with session entries showing status, timestamps, and container identifiers.
2. **Given** the sessions list is displayed, **When** a user selects a session, **Then** the session detail view opens showing session metadata and evidence captures.
3. **Given** a session detail view is open, **When** the evidence section loads, **Then** evidence pairs (before/after images) display with correct capture tags, timestamps, and status indicators.
4. **Given** the dashboard is deployed, **When** a user navigates to the cameras section, **Then** the camera list renders with health metrics (uptime, free heap, signal strength) and status indicators.
5. **Given** any RPC endpoint returns an error (unavailable, not found), **When** the corresponding UI section loads, **Then** the system degrades gracefully with appropriate error messaging and no unhandled console errors.

---

### User Story 2 - Transport Layer Regression Tests (Priority: P2)

A developer runs unit tests that verify the custom RPC transport configuration behaves correctly. Specifically, the transport must strip AbortSignals (which cause cross-realm failures in jsdom test environments), late-bind to the global fetch function (so MSW interception works), and correctly attach authentication and correlation headers via interceptors. These tests prevent regressions in the fetch wrapper that would silently break all RPC communication.

**Why this priority**: The custom fetch wrapper is a critical but invisible piece of infrastructure. A regression here breaks every RPC call in the dashboard. Dedicated unit tests provide fast feedback without requiring full E2E setup.

**Independent Test**: Can be tested independently by running unit tests against the transport module. Delivers assurance that the Connect RPC transport layer handles jsdom quirks and MSW compatibility correctly.

**Acceptance Scenarios**:

1. **Given** a request is made through the transport, **When** an AbortSignal is present in the request options, **Then** the signal is removed before the request is dispatched.
2. **Given** MSW has patched the global fetch function, **When** a request is made through the transport, **Then** it uses the current (patched) global fetch rather than a captured reference.
3. **Given** a request is made through the transport, **When** interceptors are applied, **Then** the request includes both an API key header and a correlation ID header.
4. **Given** the transport is configured, **When** it serializes requests, **Then** it uses JSON format (not binary protobuf) for HTTP/1.1 compatibility.

---

### User Story 3 - Proto-Safe Contract Fixtures (Priority: P2)

A developer audits and updates all MSW test handlers to ensure they use factory functions from the shared wire testing package rather than hand-crafted JSON. This guarantees that test fixtures conform to the protobuf schema — correct enum string values, proper timestamp formats, valid field names — so tests accurately represent what the real backend returns. Any schema drift in the wire package is immediately caught by failing tests.

**Why this priority**: Hand-crafted proto JSON in test fixtures is fragile and error-prone. Enum names like `SESSION_STATUS_COMPLETE` must match the proto definition exactly, and timestamps must be valid proto3 JSON. Using shared factory functions eliminates this class of bugs and ensures fixtures evolve with the schema.

**Independent Test**: Can be tested by running the existing unit and integration test suites after updating handlers to use factory functions. Any fixture that produces invalid proto JSON will cause deserialization failures in the adapter layer.

**Acceptance Scenarios**:

1. **Given** the MSW RPC handlers exist, **When** they construct response payloads, **Then** all session, evidence, and camera responses use factory functions from the wire testing package.
2. **Given** test fixtures use factory functions, **When** the wire package updates enum values or field names, **Then** the fixtures automatically reflect the changes (no manual JSON updates required).
3. **Given** a test fixture creates a timestamp, **When** the timestamp is serialized, **Then** it uses the factory's standard format rather than hand-crafted date strings.
4. **Given** a test fixture creates an enum value, **When** the value is serialized, **Then** it uses proto3 string enum names (e.g., `SESSION_STATUS_COMPLETE`, not numeric or shortened forms).

---

### User Story 4 - Testing Runbook Documentation (Priority: P3)

An operator or new developer reads the testing runbook to understand how to run the smoke suite locally, interpret results, and configure CI to run post-deploy validation. The runbook covers local setup (SSH tunnel to Pi, dev server startup), CI configuration, and troubleshooting common failures.

**Why this priority**: Documentation ensures the validation suite is maintainable and usable by team members beyond the original author. Without clear instructions, the tests become tribal knowledge.

**Independent Test**: Can be verified by having a new developer follow the runbook end-to-end and successfully run the smoke suite on their machine.

**Acceptance Scenarios**:

1. **Given** the runbook exists, **When** a developer reads the "Local Setup" section, **Then** they can run the E2E smoke suite against a local dev server within 5 minutes.
2. **Given** the runbook exists, **When** a developer reads the "CI Setup" section, **Then** they understand how the smoke suite integrates with the existing CI workflows.
3. **Given** a smoke test fails, **When** a developer reads the "Troubleshooting" section, **Then** they find guidance for the most common failure modes (transport errors, mock mismatches, timeout issues).

---

### Edge Cases

- What happens when the RPC endpoint returns an unexpected content type (e.g., HTML error page instead of JSON)?
- How does the system handle network timeouts during E2E smoke tests (flaky CI)?
- What happens if the wire package version is out of sync with the backend proto definitions?
- How do tests behave when MSW fails to intercept a request (request escapes to real network)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The validation suite MUST include E2E smoke tests covering session listing, session detail viewing, evidence display, and camera health display.
- **FR-002**: The validation suite MUST include transport layer unit tests verifying AbortSignal stripping, late-bound fetch resolution, and interceptor header injection.
- **FR-003**: All MSW RPC handlers MUST use proto-safe factory functions from the shared wire testing package for constructing response payloads.
- **FR-004**: The validation suite MUST include graceful degradation tests verifying that RPC errors (unavailable, not found) produce user-friendly error states without unhandled console errors.
- **FR-005**: E2E smoke tests MUST use the existing test infrastructure (Playwright fixtures, mock helpers, mocked page pattern) for consistency with the rest of the test suite.
- **FR-006**: A testing runbook document MUST be provided explaining how to run the smoke suite locally and in CI.
- **FR-007**: E2E tests MUST register Connect RPC endpoint mocks (HTTP POST to `/rpc/...`) since the default mock set only covers REST endpoints.
- **FR-008**: Transport regression tests MUST verify that the custom fetch wrapper is compatible with both MSW interception and jsdom's cross-realm limitations.
- **FR-009**: All test fixtures MUST use proto3 JSON-compatible values: string enum names, standard timestamp format, and stringified bigint fields.
- **FR-010**: The validation suite MUST run within existing CI resource constraints (configurable worker count, 50% CPU cap).

### Key Entities

- **Smoke Test**: An E2E test that verifies a critical user flow renders correctly with mocked backend responses, focused on catching deployment regressions.
- **Transport Wrapper**: The custom fetch configuration that adapts the RPC client for compatibility with jsdom (test environment) and MSW (mock interception).
- **Proto Fixture**: A test data object constructed via factory functions that guarantees conformance to the protobuf wire format schema.
- **Testing Runbook**: A reference document explaining how to execute, interpret, and troubleshoot the validation suite.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All four critical device management flows (session list, session detail, evidence display, camera health) are covered by passing E2E smoke tests on every CI run.
- **SC-002**: The transport layer has dedicated regression tests covering all custom behaviors (signal stripping, late-bound fetch, interceptor headers), achieving full branch coverage of the fetch wrapper function.
- **SC-003**: Zero MSW RPC handlers contain hand-crafted proto JSON — all use wire testing factory functions.
- **SC-004**: The E2E smoke suite completes in under 60 seconds on CI (single browser worker).
- **SC-005**: A new developer can set up and run the smoke suite locally by following the runbook within 5 minutes.
- **SC-006**: All existing tests continue to pass after fixture migration (no regressions).

## Assumptions

- The shared wire testing package already provides factory functions for all required response types (sessions, evidence, cameras). No new factory functions need to be created.
- The existing Playwright test infrastructure (fixtures, helpers, CI workflows) is sufficient — no new Playwright plugins or browser configurations are needed.
- The dashboard's RPC endpoints follow the Connect protocol convention: HTTP POST to `/rpc/{service}/{method}` with JSON bodies.
- E2E smoke tests will use mocked endpoints (not a live Pi backend), consistent with the existing E2E test approach.
- The testing runbook will be a Markdown document in the `docs/` directory.
