# Feature Specification: Test Reliability & Hardening

**Feature Branch**: `040-test-reliability-hardening`
**Created**: 2026-02-01
**Status**: Draft
**Input**: Stabilize PiDashboard test reliability and handoff hygiene, and harden UI resilience to PiOrchestrator/API variability.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Runs Tests Reliably (Priority: P1)

As a developer, I need the full test suite to pass deterministically on every run so that I can trust CI results and merge code with confidence. Currently, 12 of 81 test files fail due to a missing mock fixture file (`session-fixtures`) that breaks the shared MSW handler chain, blocking every integration hook test and several unit tests.

**Why this priority**: All 12 failing tests share a single root cause — a missing `tests/mocks/diagnostics/session-fixtures.ts` file imported by the diagnostics MSW handlers, which are combined into the global handler set used by every integration test. This is the highest-impact fix because it unblocks all other testing work.

**Independent Test**: Run `npm test` and verify all 81 test files pass with 0 failures.

**Acceptance Scenarios**:

1. **Given** the test suite in its current state, **When** a developer runs `npm test`, **Then** all test files pass (0 failures) and 1496+ individual tests succeed.
2. **Given** a CI pipeline triggers on a pull request, **When** the test job executes, **Then** it completes successfully without flaky or non-deterministic failures.
3. **Given** the MSW mock server starts for integration tests, **When** all handlers are loaded (legacy + V1 + diagnostics), **Then** no import resolution errors occur and all mock endpoints respond correctly.

---

### User Story 2 - Handoff Sentinel Passes Clean (Priority: P2)

As a developer, I need the handoff sentinel (`npm run handoff:detect`) to report no errors so that cross-repo coordination between PiDashboard and PiOrchestrator is tracked reliably. Currently, 7 handoff files lack required YAML frontmatter and 1 template file fails the naming pattern check, producing 8 errors every time the sentinel runs (which triggers on `predev` and `pretest` hooks).

**Why this priority**: The sentinel errors pollute every developer workflow (dev server start, test runs) and mask legitimate handoff status warnings. Fixing this restores the sentinel as a useful coordination tool.

**Independent Test**: Run `npm run handoff:detect` and verify it produces no errors.

**Acceptance Scenarios**:

1. **Given** 7 handoff files without YAML frontmatter, **When** frontmatter is added following the schema at `specs/032-handoff-sentinel/contracts/handoff-schema.yaml`, **Then** `npm run handoff:detect` reports 0 errors.
2. **Given** a handoff template file matching the sentinel's scan pattern, **When** the sentinel validates it, **Then** it is either excluded from scanning or has a valid ID format.
3. **Given** completed/historical handoff files (028, 030), **When** their frontmatter is added, **Then** their status is set to `done` so the sentinel does not flag them as pending work.

---

### User Story 3 - Clean Lint Output for Affected Areas (Priority: P3)

As a developer, I need lint errors in diagnostics-related files and handoff scripts to be resolved so that `npm run lint` output is actionable rather than noisy. Currently there are 16 lint errors across diagnostics types, handoff scripts, and UI components.

**Why this priority**: Lint noise hides real issues. Cleaning affected areas ensures new code changes are reviewable against a clean baseline.

**Independent Test**: Run `npm run lint` and verify diagnostics-related files and handoff scripts produce 0 errors.

**Acceptance Scenarios**:

1. **Given** unused type exports in diagnostics type files, **When** lint runs, **Then** no `@typescript-eslint/no-unused-vars` errors are reported for those files.
2. **Given** unused variables in handoff sentinel scripts, **When** lint runs, **Then** no `@typescript-eslint/no-unused-vars` errors are reported for those files.

---

### User Story 4 - Dashboard UI Degrades Gracefully for Optional Endpoints (Priority: P4)

As a user viewing the dashboard when the PiOrchestrator backend has partial availability, I need the UI to show accurate states — loading when fetching, populated when data exists, empty only when the response genuinely contains no items, and a helpful error when the backend is unreachable — rather than showing misleading states like "No cameras connected" during loading.

**Why this priority**: Users on real Pi devices encounter partial API availability (WiFi endpoints may not exist, cameras may be offline). The UI must not confuse "still loading" or "endpoint unavailable" with "no data."

**Independent Test**: Verify each major dashboard section (cameras, WiFi, door, system) displays the correct state (loading/success/empty/error) by mocking corresponding API responses in E2E tests.

**Acceptance Scenarios**:

1. **Given** the cameras API returns an empty array, **When** the camera section renders, **Then** it shows "No cameras connected" with an informational message.
2. **Given** the cameras API is still loading (no response yet), **When** the camera section renders, **Then** it shows a loading spinner, not the empty state.
3. **Given** the WiFi status endpoint returns 404 (not available on this device), **When** the WiFi section renders, **Then** it shows "Status unavailable" without an error banner and stops polling.
4. **Given** the system info endpoint returns a 500 error, **When** the system section renders, **Then** it shows an error card with a Retry button.

---

### User Story 5 - Documented Dashboard State Machine (Priority: P5)

As a developer, I need a reference document describing the state machine for each critical dashboard page so that new contributors can understand the expected UI behavior for each API state and implement consistent patterns.

**Why this priority**: The codebase already implements graceful degradation patterns, but they are not documented. A state machine document serves as both documentation and a testing checklist.

**Independent Test**: Verify the document exists at `docs/dashboard_states.md` and covers cameras, WiFi, door, system, and logs sections with states: loading, success, empty, error, and network failure.

**Acceptance Scenarios**:

1. **Given** a new developer joins the project, **When** they read `docs/dashboard_states.md`, **Then** they can identify what UI state to expect for any combination of API response status.
2. **Given** the documented states, **When** compared against actual component behavior, **Then** the document accurately reflects current implementation.

---

### Edge Cases

- What happens when `tests/mocks/diagnostics/session-fixtures.ts` is created but exports the wrong shape? (Contract tests catch schema drift)
- What happens when a handoff file has frontmatter but an invalid `handoff_id` format? (Sentinel reports pattern mismatch error)
- What happens when the cameras API returns 200 with `data: null` instead of an empty array? (UI should treat null as empty, not crash)
- What happens when multiple optional endpoints (WiFi + door) are both unavailable? (Each section degrades independently without cascading errors)
- What happens when a test runs with MSW but the AbortSignal workaround (`IS_TEST_ENV`) is not active? (Vitest 3.x + Node 24 + jsdom causes the AbortSignal instanceof error; the workaround must remain until Vitest v4 or environment switch)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST provide all mock fixture files referenced by MSW handlers so that the test suite can load without import resolution errors.
- **FR-002**: All handoff files matching the sentinel's scan patterns MUST contain valid YAML frontmatter conforming to the handoff schema (handoff_id, direction, from_repo, to_repo, created_at, status).
- **FR-003**: The handoff template file MUST either be excluded from sentinel scanning or conform to the required naming pattern.
- **FR-004**: Lint errors in diagnostics type files and handoff sentinel scripts MUST be resolved (unused variables/types removed or prefixed).
- **FR-005**: Each dashboard section (cameras, WiFi, door, system, logs) MUST display distinct UI states for: loading, success with data, success with empty data, error, and network failure.
- **FR-006**: Optional API endpoints (WiFi status, WiFi scan) MUST degrade gracefully — showing "unavailable" instead of error states and disabling polling when the endpoint returns 404 or 503.
- **FR-007**: The AbortSignal workaround for test environments MUST remain in place until the underlying jsdom/Vitest realm mismatch is resolved upstream.
- **FR-008**: A dashboard state machine document MUST be created describing the expected UI state per API response for each major section.
- **FR-009**: The MSW handler architecture MUST remain modular (legacy handlers, V1 handlers, diagnostics handlers combined into allHandlers) so that handler sets can be tested independently.

### Key Entities

- **Mock Fixture**: A TypeScript file exporting mock API response data used by MSW handlers. Must match the shape expected by Zod schemas in contract tests.
- **Handoff Document**: A Markdown file with YAML frontmatter tracking cross-repo work items between PiDashboard and PiOrchestrator. Has a lifecycle: new → acknowledged → in_progress → done.
- **Dashboard State**: One of five UI states (loading, success, empty, error, unavailable) displayed per dashboard section, determined by the combination of React Query status flags and API response content.

## Assumptions

- The missing `session-fixtures.ts` file was intended to be created as part of Feature 038 (dev-observability-panels) but was not committed. The file's index re-export exists in `tests/mocks/diagnostics/index.ts`.
- Handoff files for completed work (028, 030) should receive `status: done` frontmatter since those features are already merged.
- The incoming handoff files using non-standard ID formats (HANDOFF-PIO-PID-*) will be migrated to the `NNN-slug` format required by the sentinel schema.
- The AbortSignal issue is a known Vitest v3 + Node 24 + jsdom realm mismatch (tracked as vitest-dev/vitest#8374). The existing `IS_TEST_ENV` workaround is the correct approach until Vitest v4 ships the fix.
- Lint errors in shadcn/ui primitive files (badge.tsx, button.tsx) are excluded from this feature's scope since they are third-party generated components.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 81 test files pass with 0 failures when running `npm test` — achieving 100% test file pass rate (up from 85% currently).
- **SC-002**: `npm run handoff:detect` produces 0 errors (down from 8 currently).
- **SC-003**: Diagnostics-related files and handoff scripts produce 0 lint errors when running `npm run lint`.
- **SC-004**: Each dashboard section displays the correct UI state for all 5 scenarios (loading, success, empty, error, unavailable) as verified by integration and E2E tests.
- **SC-005**: The `docs/dashboard_states.md` document exists and accurately describes the state machine for all 5 major dashboard sections (cameras, WiFi, door, system, logs).
- **SC-006**: CI pipeline (PR workflow) passes deterministically with no test flakiness across 5 consecutive runs.
