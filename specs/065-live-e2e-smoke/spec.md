# Feature Specification: Live E2E Smoke Tests

**Feature Branch**: `065-live-e2e-smoke`
**Created**: 2026-03-08
**Status**: Draft
**Input**: PiDashboard — run post-deploy E2E smoke against live stack (sessions/evidence/cameras) and publish PASS evidence

## User Scenarios & Testing

### User Story 1 - Run E2E Smoke Suite Against Live Stack (Priority: P1)

As the deployment operator, I want to run the existing E2E smoke tests (operations + rpc-smoke) against the live PiOrchestrator/BridgeServer endpoints so that I can verify the deployed stack is functioning correctly for sessions, evidence capture, and camera operations.

**Why this priority**: This is the core deliverable — confirming that the live system passes the same smoke tests that pass in CI with mocks. Without this, there is no deployment confidence.

**Independent Test**: Can be tested by configuring the test runner to point at the live Pi endpoint and executing the operations and rpc-smoke E2E test suites end-to-end.

**Acceptance Scenarios**:

1. **Given** the PiOrchestrator service is running on the Pi (port 8082), **When** the E2E smoke suite is executed with the live endpoint configured, **Then** all session, evidence, and camera smoke tests execute against the real API.
2. **Given** the capture pipeline is operational (cameras responding, evidence storage working), **When** the operations E2E tests run, **Then** they exercise real session creation, evidence capture, and camera list/detail flows.
3. **Given** a test run completes (pass or fail), **When** results are collected, **Then** screenshots and trace files are generated as artifacts.

---

### User Story 2 - Publish PASS Evidence Bundle (Priority: P1)

As the deployment operator, I want the test artifacts (screenshots, traces, test results summary) published under the feature's specs directory so that the team has a permanent record that the live stack passed E2E validation.

**Why this priority**: Evidence is the deliverable — without published artifacts, there is no proof of a passing deployment.

**Independent Test**: Can be tested by verifying that after a successful test run, artifact files exist under `specs/065-live-e2e-smoke/evidence/` and contain valid output.

**Acceptance Scenarios**:

1. **Given** the E2E smoke suite passes all tests, **When** artifacts are collected, **Then** screenshots and/or trace files are saved to `specs/065-live-e2e-smoke/evidence/`.
2. **Given** evidence files have been collected, **When** the operator reviews the evidence directory, **Then** a summary document lists which tests passed, the timestamp, and the target endpoint.

---

### User Story 3 - Configure Test Environment for Live Endpoints (Priority: P2)

As a developer, I want the test configuration to support pointing at the live PiOrchestrator endpoint (via SSH tunnel or Tailscale) without modifying the default CI/local mock configuration, so that the same test suite works in both mock and live modes.

**Why this priority**: Configuration must exist before tests can run against live, but it's a supporting task rather than the primary deliverable.

**Independent Test**: Can be tested by setting the environment variable and confirming that the test runner uses the live base URL instead of the default localhost mock.

**Acceptance Scenarios**:

1. **Given** no environment override is set, **When** E2E tests run, **Then** they use the default mock/local configuration (no regression).
2. **Given** the live endpoint environment variable is set, **When** E2E tests run, **Then** they send requests to the configured live endpoint.
3. **Given** the live endpoint is unreachable, **When** E2E tests attempt to connect, **Then** tests fail with a clear connection error rather than hanging.

---

### Edge Cases

- What happens when the SSH tunnel to the Pi drops mid-test? Tests should fail with a connection timeout, not hang indefinitely.
- What happens when cameras are offline or no evidence sessions exist? Tests that depend on real device state should report the failure clearly rather than producing false passes.
- What happens if the evidence directory already exists from a previous run? New artifacts should be written alongside or replace previous ones without error.
- What happens when trace files are too large for git? Only lightweight artifacts (screenshots, JSON summaries) should be committed; large traces should be excluded or stored externally.

## Requirements

### Functional Requirements

- **FR-001**: The test configuration MUST support an environment variable (e.g., `E2E_BASE_URL`) to override the default base URL for live endpoint testing.
- **FR-002**: The existing E2E smoke tests (operations and rpc-smoke specs) MUST run without modification against both mocked and live endpoints.
- **FR-003**: The system MUST generate screenshots for each test on completion (pass or fail).
- **FR-004**: The system MUST save test artifacts (screenshots, optional traces, result summary) to `specs/065-live-e2e-smoke/evidence/`.
- **FR-005**: The evidence bundle MUST include a summary document recording: test suite name, pass/fail status per test, timestamp, target endpoint URL, and total execution time.
- **FR-006**: Large binary artifacts (traces > 5 MB) MUST be excluded from version control.
- **FR-007**: Default test behavior (mock-based, CI-compatible) MUST NOT change when no environment override is set.

### Key Entities

- **Test Run**: A single execution of the E2E smoke suite against a target endpoint, producing a set of artifacts and a pass/fail result.
- **Evidence Bundle**: The collection of screenshots, traces, and summary documents produced by a test run, stored in the specs evidence directory.
- **Target Endpoint**: The base URL of the PiOrchestrator instance being tested (either local mock or live Pi).

## Success Criteria

### Measurable Outcomes

- **SC-001**: The E2E smoke suite (operations + rpc-smoke) runs to completion against the live PiOrchestrator endpoint and all tests pass.
- **SC-002**: Evidence artifacts (at minimum: screenshots and a results summary) are published under `specs/065-live-e2e-smoke/evidence/`.
- **SC-003**: The evidence summary document clearly states "PASS" with timestamp and endpoint details.
- **SC-004**: Running the same tests without the live endpoint override produces identical behavior to the current CI configuration (no regressions).
- **SC-005**: The entire live smoke test execution completes within 5 minutes.

## Assumptions

- The PiOrchestrator service is running and accessible on the Pi at `192.168.1.124:8082` (or via SSH tunnel on `localhost:8082`).
- The capture pipeline (cameras, evidence storage) is operational — this is stated as a prerequisite.
- BridgeServer token strategy is finalized — this is stated as a prerequisite.
- An SSH tunnel or Tailscale connection provides network access from the dev machine to the Pi.
- The existing `operations.spec.ts` and rpc-smoke tests already cover sessions, evidence, and camera flows — no new test logic needs to be written.

## Dependencies

- **Feature 064**: Post-deploy validation suite (RPC E2E smoke tests) — provides the test specs being run.
- **PiOrchestrator**: Must be deployed and running on the Pi with the latest firmware.
- **Capture pipeline**: Cameras and evidence storage must be operational (A2/A3 prerequisite).
- **BridgeServer**: Token strategy must be finalized (A4 prerequisite).

## Out of Scope

- Writing new E2E test cases — this feature uses the existing smoke suite from Feature 064.
- Modifying PiOrchestrator or BridgeServer code.
- Setting up CI automation for live endpoint testing (this is a manual, one-time validation).
- Performance or load testing.
