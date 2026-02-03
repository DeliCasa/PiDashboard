# Feature Specification: MSW Hook Test Stabilization

**Feature Branch**: `039-msw-hook-tests`  
**Created**: 2026-02-01  
**Status**: Draft  
**Input**: Fix failing hook integration tests (MSW), reduce lint debt in scope, and validate observability panels end-to-end

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Runs Hook Integration Tests (Priority: P1)

As a developer working on PiDashboard, I want all hook integration tests to pass reliably so that I can trust the test suite and develop with confidence.

**Why this priority**: Failing tests block CI/CD pipelines, erode developer trust in the test suite, and prevent safe refactoring. This is the core mission of the feature.

**Independent Test**: Can be validated by running `npm test` and observing 100% pass rate for all hook integration tests in `tests/integration/hooks/`.

**Acceptance Scenarios**:

1. **Given** a fresh checkout of the repository, **When** I run `npm test`, **Then** all hook integration tests pass without flakiness across 5 consecutive runs
2. **Given** the MSW server is started, **When** a hook test makes an API request, **Then** the correct mock handler intercepts and responds within the test timeout
3. **Given** a hook test completes, **When** the test suite continues, **Then** no state leaks between tests (query cache is clean, handlers are reset)

---

### User Story 2 - Developer Adds New Hook Tests (Priority: P2)

As a developer adding new hooks or features, I want documented patterns and reusable test utilities so that I can write reliable tests quickly without reinventing the wheel.

**Why this priority**: Sustainable testing practices prevent future regressions and reduce maintenance burden. Documentation enables team scaling.

**Independent Test**: Can be validated by following the documented patterns to write a new hook test that passes reliably.

**Acceptance Scenarios**:

1. **Given** a new hook implementation, **When** I follow the documented testing patterns, **Then** I can create a passing test file in under 30 minutes
2. **Given** the test utilities and patterns documentation, **When** a developer unfamiliar with the codebase reads it, **Then** they understand how to set up MSW handlers and test React Query hooks
3. **Given** common error scenarios, **When** I use the provided error handler utilities, **Then** I can test error states without creating custom handlers

---

### User Story 3 - Developer Reviews Lint-Clean Code (Priority: P3)

As a developer reviewing or modifying test files, I want minimal lint errors in the test infrastructure so that code quality is consistent and maintainable.

**Why this priority**: Clean code reduces cognitive load during reviews and makes the codebase more approachable for new contributors.

**Independent Test**: Can be validated by running `npm run lint` and observing zero errors in test files touched by this feature.

**Acceptance Scenarios**:

1. **Given** modified test files, **When** I run the linter, **Then** zero lint errors are reported in those files
2. **Given** the test utility files, **When** new developers import them, **Then** TypeScript types are correct and complete

---

### User Story 4 - CI Pipeline Validates Observability Panels (Priority: P3)

As a team maintaining the observability panels (Feature 038), I want E2E tests to validate the panels work correctly so that regressions are caught before merge.

**Why this priority**: End-to-end validation provides confidence that the entire feature works, complementing unit and integration tests.

**Independent Test**: Can be validated by running `npm run test:e2e` with observability panel tests and observing passes.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded, **When** E2E tests navigate to observability panels, **Then** the panels render without errors
2. **Given** mock API responses, **When** the observability panels fetch data, **Then** the data is displayed correctly

---

### Edge Cases

- What happens when MSW handlers are registered in the wrong order (more specific routes should come first)?
- How does the system handle tests that don't properly clean up query cache between runs?
- What happens when a hook test doesn't await all promises before completing?
- How should tests behave when the MSW server isn't started before the first request?
- What happens when multiple hooks share the same query key but expect different data?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Test harness MUST start MSW server before any integration tests run
- **FR-002**: Test harness MUST reset MSW handlers after each test to prevent state leakage
- **FR-003**: Test harness MUST create a fresh QueryClient for each test to isolate query cache
- **FR-004**: Test harness MUST close MSW server after all integration tests complete
- **FR-005**: MSW handlers MUST match all API routes used by hooks under test
- **FR-006**: MSW handlers MUST provide factory functions for customizing mock responses
- **FR-007**: Test utilities MUST export a `createWrapper` function that provides QueryClientProvider and ThemeProvider
- **FR-008**: Test utilities MUST export error handler presets for common error scenarios (404, 500, network failure)
- **FR-009**: Hook tests MUST use `waitFor` or `waitForNextUpdate` for async state changes (not arbitrary delays)
- **FR-010**: Hook tests MUST verify both success and error states for data-fetching hooks
- **FR-011**: All missing test fixture files MUST be created (e.g., `session-fixtures.ts`)
- **FR-012**: Documentation MUST include a "golden path" pattern for writing hook integration tests
- **FR-013**: Lint errors MUST be resolved in all test files modified by this feature
- **FR-014**: E2E tests MUST validate observability panels render and display data correctly

### Key Entities

- **MSW Server**: Mock Service Worker server instance that intercepts HTTP requests in Node.js environment
- **QueryClient**: TanStack React Query client instance managing cache and request lifecycle
- **Test Wrapper**: React component providing context providers (QueryClientProvider, ThemeProvider) for hook testing
- **Handler Factory**: Function that creates MSW handlers with customizable mock data
- **Test Fixtures**: Static mock data objects representing API responses

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of hook integration tests pass on 5 consecutive `npm test` runs
- **SC-002**: Zero lint errors in test files touched by this feature
- **SC-003**: Test documentation enables new developers to write a hook test in under 30 minutes
- **SC-004**: Test suite execution time increases by no more than 10% from baseline
- **SC-005**: All 15+ hook integration test files in `tests/integration/hooks/` pass reliably
- **SC-006**: E2E tests for observability panels pass in CI pipeline

## Assumptions

- The existing MSW v2 setup is correct and only needs handler/lifecycle fixes, not a major rewrite
- React Query v5 testing patterns apply (not v4 which had different async behavior)
- The test QueryClient configuration with `retry: false` and `staleTime: Infinity` is appropriate
- E2E tests will use Playwright with existing fixtures and mock infrastructure
- The missing `session-fixtures.ts` file contains standard fixture data that can be inferred from test imports
