# Feature Specification: Live Dashboard Inventory Validation

**Feature Branch**: `054-live-dashboard-inventory-validation`
**Created**: 2026-02-17
**Status**: Draft
**Input**: Add opt-in live integration validation around the already-complete delta correction workflow — keep deterministic tests, add a live smoke that proves the UI works against real BridgeServer data when available.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Live Correction Workflow Smoke (Priority: P1)

An operator or CI job sets `LIVE_E2E=1` and `LIVE_BASE_URL` to point at a real BridgeServer-backed deployment. A small, targeted Playwright suite runs the core inventory correction flow against live data: navigate to a container, view the latest delta, submit a correction, and verify the audit trail and updated state render correctly. This proves the full stack works end-to-end with real API responses, not just mocked fixtures.

**Why this priority**: This is the primary deliverable — without it there is no live validation capability.

**Independent Test**: Can be fully tested by setting `LIVE_E2E=1 LIVE_BASE_URL=https://raspberrypi.tail345cd5.ts.net` and running the live spec. The suite completes with passes or explicit skips — never cryptic failures.

**Acceptance Scenarios**:

1. **Given** `LIVE_E2E=1` and a reachable backend with inventory data, **When** the live suite runs, **Then** it navigates to the Inventory tab, selects a container, views the latest delta, and verifies delta entries are displayed with item names and counts.
2. **Given** `LIVE_E2E=1` and a reachable backend with a reviewable delta, **When** the suite submits a correction (edit one count + add note), **Then** the correction POST succeeds, the view refreshes, and the audit trail shows the correction.
3. **Given** `LIVE_E2E=1` and a reachable backend with a reviewable delta, **When** the suite approves a delta as-is, **Then** the approval POST succeeds and the audit trail shows "Approved".
4. **Given** `LIVE_E2E=1` and a reachable backend, **When** the suite completes, **Then** screenshots are captured at each step and stored as Playwright artifacts.

---

### User Story 2 — Preflight Checks with Deterministic Skip (Priority: P1)

Before running any live test, a preflight function probes the backend to verify it is reachable, the inventory API responds, and at least one container with delta data exists. If any preflight check fails, all live tests SKIP with an explicit, human-readable reason (e.g., "SKIP: BridgeServer at https://... returned 503 on /api/v1/inventory/latest"). No misleading failures, no ambiguous timeouts.

**Why this priority**: Without preflights, live tests produce confusing failures when the backend is down, eroding trust in the test suite.

**Independent Test**: Can be tested by running with `LIVE_E2E=1 LIVE_BASE_URL=http://localhost:9999` (unreachable) and verifying all tests report SKIP with a reason — zero failures.

**Acceptance Scenarios**:

1. **Given** `LIVE_E2E=1` and the backend is unreachable (connection refused), **When** the preflight runs, **Then** all live tests SKIP with reason "Backend unreachable at [URL]".
2. **Given** `LIVE_E2E=1` and the backend returns 503, **When** the preflight runs, **Then** all live tests SKIP with reason "Backend returned 503 — service unavailable".
3. **Given** `LIVE_E2E=1` and the inventory endpoint returns 404, **When** the preflight runs, **Then** all live tests SKIP with reason "Inventory API not available (404)".
4. **Given** `LIVE_E2E=1` and the backend is healthy but no containers have delta data, **When** the preflight runs, **Then** tests that require delta data SKIP with reason "No containers with inventory data found".
5. **Given** `LIVE_E2E=1` is NOT set, **When** the test file is loaded, **Then** all live tests SKIP with reason "LIVE_E2E not enabled".

---

### User Story 3 — CI Isolation and Artifact Capture (Priority: P1)

Default CI (PR workflow, nightly) never runs live tests — they require explicit `LIVE_E2E=1`. When live tests ARE run (manually or via a dedicated CI job), Playwright captures screenshots at each test step, traces on failure, and a summary report. These artifacts are uploaded for debugging. The live suite never introduces flakes into the main CI path.

**Why this priority**: If live tests can accidentally destabilize CI, the entire test suite loses credibility.

**Independent Test**: Can be tested by running the default CI workflow and verifying zero live-test executions, then running with `LIVE_E2E=1` and verifying artifact upload.

**Acceptance Scenarios**:

1. **Given** default CI (no `LIVE_E2E` env), **When** the PR workflow runs, **Then** zero live inventory tests execute (they SKIP immediately).
2. **Given** `LIVE_E2E=1` in CI, **When** the live suite runs and all tests pass, **Then** screenshots and HTML report are uploaded as artifacts.
3. **Given** `LIVE_E2E=1` in CI, **When** a live test fails, **Then** traces, screenshots, and video are captured and uploaded for debugging.
4. **Given** the live suite file exists in `tests/e2e/`, **When** the default nightly E2E shards run, **Then** live tests are SKIPPED (not failed) because `LIVE_E2E` is not set.

---

### User Story 4 — Operator Deploy Validation Checklist (Priority: P2)

An operator deploying a new PiDashboard or BridgeServer version needs a one-page runbook listing: the URLs to check, the env vars to set, the exact command to run, the expected screens to see at each step, and a pass/fail checklist. This document enables a non-developer to validate a deployment in under 5 minutes.

**Why this priority**: Useful for production operations but depends on the live test suite (US1) being complete first.

**Independent Test**: Can be validated by a non-developer following the runbook steps on a staging deployment.

**Acceptance Scenarios**:

1. **Given** a freshly deployed PiDashboard + BridgeServer, **When** an operator follows the runbook, **Then** they can validate the inventory correction flow in under 5 minutes.
2. **Given** the runbook, **When** a step fails, **Then** the runbook provides a troubleshooting action for each failure mode (backend unreachable, no data, API error).
3. **Given** the runbook, **When** the operator runs the automated live suite, **Then** the runbook explains how to interpret PASS/SKIP/FAIL results.

---

### User Story 5 — UI Operator-Grade Error Messaging (Priority: P2)

When the backend is unavailable or returns errors during live use, the UI surfaces clear, actionable messages — never silent hangs or raw error dumps. The Inventory tab shows distinct states: "Service unavailable — retry later", "Connection failed — check network", "API error (500) — contact support". Loading states have timeouts that transition to error messages rather than spinning indefinitely.

**Why this priority**: Important for production usability but the UI already handles most states from Feature 053. This story focuses on verifying/hardening the remaining gaps identified during live testing.

**Independent Test**: Can be tested by running the existing deterministic E2E tests for error states and verifying messaging is operator-appropriate.

**Acceptance Scenarios**:

1. **Given** the backend is unreachable, **When** the Inventory tab loads, **Then** within 10 seconds the loading spinner transitions to "Unable to connect — check if the server is running".
2. **Given** the backend returns a 500 error, **When** the Inventory tab loads, **Then** an error message is shown with the status code and a retry button.
3. **Given** the backend is slow (>5s response), **When** the Inventory tab loads, **Then** a loading indicator is shown (not a blank screen) until the response arrives.

---

### Edge Cases

- What happens when `LIVE_E2E=1` is set but `LIVE_BASE_URL` is not? The suite uses a sensible default (the Tailscale Funnel URL) and logs the URL being used.
- What happens when the live backend has no inventory data at all (no containers)? The preflight detects this and SKIPs data-dependent tests while still running connectivity checks.
- What happens when a live correction test modifies real data? The test should use a designated "test container" or clean up after itself. Document this requirement in the runbook.
- What happens when the live suite runs concurrently from two machines? Tests should be idempotent and handle 409 conflicts gracefully (refresh and retry once).
- What happens when the BridgeServer contract has changed since the last PiDashboard deploy? Zod validation catches the mismatch and the test fails with a clear schema validation error, not a cryptic UI crash.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `LIVE_E2E=1` opt-in flag that enables live inventory validation tests.
- **FR-002**: System MUST provide a `LIVE_BASE_URL` env var to specify the target deployment URL, with a sensible default.
- **FR-003**: System MUST run a preflight check before any live test that verifies: (a) backend reachability, (b) inventory API availability, (c) presence of container data.
- **FR-004**: System MUST SKIP all live tests with human-readable reasons when preflight checks fail.
- **FR-005**: System MUST SKIP all live tests immediately when `LIVE_E2E` is not set (no network calls).
- **FR-006**: Live tests MUST validate the core correction workflow: view delta, submit correction, verify updated state.
- **FR-007**: Live tests MUST validate the approve-as-is workflow: view delta, approve, verify audit trail.
- **FR-008**: Live tests MUST capture screenshots at key workflow steps as Playwright artifacts.
- **FR-009**: Live tests MUST capture traces and video on failure.
- **FR-010**: Default CI workflows (PR, nightly) MUST NOT execute live tests and MUST NOT fail due to their presence.
- **FR-011**: A dedicated CI workflow or job MUST support running live tests with `LIVE_E2E=1` and artifact upload.
- **FR-012**: An operator runbook MUST document: URLs, env vars, commands, expected screens, and troubleshooting steps.
- **FR-013**: The UI MUST surface backend unavailability with operator-grade messaging (no silent hangs).
- **FR-014**: Loading states in the Inventory tab MUST have a timeout that transitions to an error message.

### Key Entities

- **Live Test Preflight**: A pre-suite check that probes the backend and determines whether live tests can proceed. Returns a structured result with `canRun: boolean`, `skipReason?: string`, `containerIds?: string[]`, `baseUrl: string`.
- **Live Test Configuration**: Env-var-driven config combining `LIVE_E2E`, `LIVE_BASE_URL`, and optional `LIVE_TEST_CONTAINER_ID` for targeting a specific container.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Default CI (PR + nightly) runs produce zero live-test failures and zero live-test executions (all SKIP).
- **SC-002**: When `LIVE_E2E=1` and backend is reachable with data, the live suite completes with all tests passing and screenshots captured.
- **SC-003**: When `LIVE_E2E=1` and backend is unreachable, all live tests SKIP with explicit reasons — zero failures.
- **SC-004**: An operator can follow the runbook and validate a deployment in under 5 minutes.
- **SC-005**: No new flakes are introduced to the existing deterministic test suite.
- **SC-006**: Live test artifacts (screenshots, traces, report) are available after both local and CI runs.

## Assumptions

- The BridgeServer inventory API is deployed and accessible at the target URL when `LIVE_E2E=1` is set.
- The existing `live-pi` Playwright project in `playwright.config.ts` provides a pattern to extend (conditional project, env-var gated).
- The delta correction workflow UI is complete and tested with mocks (Feature 053).
- Tailscale Funnel is configured on the Pi for public access when testing remotely.
- The live suite may modify real inventory data (corrections); this is acceptable for test containers.

## Scope Boundaries

**In scope**:
- Live E2E test file with preflight + targeted inventory correction assertions
- Preflight utility for backend health/data checks
- Playwright config updates for live inventory project
- CI workflow addition/extension for opt-in live test execution with artifact capture
- Operator runbook (one-page deploy validation checklist)
- UI error messaging verification (leveraging existing deterministic tests)

**Out of scope**:
- Changing BridgeServer contracts or backend behavior
- Adding new mocked/deterministic tests (Feature 053 covers this)
- Camera, WiFi, door, or other non-inventory live validation
- Automated test data seeding on the backend
- Multi-environment support (staging vs production) — single target URL for now
