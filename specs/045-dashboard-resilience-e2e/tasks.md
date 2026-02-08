# Tasks: Dashboard Resilience & E2E Coverage

**Input**: Design documents from `/specs/045-dashboard-resilience-e2e/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete), quickstart.md (complete), contracts/ (complete)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Branch creation and baseline verification

- [x] T001 Create feature branch `045-dashboard-resilience-e2e` from `main`
- [x] T002 Verify baseline: `npm run lint` (0 errors), `VITEST_MAX_WORKERS=1 npm test` (all pass), `npm run build` (success)

---

## Phase 2: Foundational — E2E Mock Infrastructure (US1 dependency)

**Purpose**: Extend `mock-routes.ts` with container, diagnostics, session, and evidence mock data. This BLOCKS US1, US3, and partially US2 (E2E verification).

**⚠️ CRITICAL**: US1 and US3 E2E specs depend on these mocks being available.

- [x] T003 [US1] Add container mock data (mixed opaque IDs: UUID, semantic string, numeric) to `tests/e2e/fixtures/mock-routes.ts`
- [x] T004 [P] [US1] Add diagnostics health mock data to `tests/e2e/fixtures/mock-routes.ts`
- [x] T005 [P] [US1] Add session list mock data to `tests/e2e/fixtures/mock-routes.ts`
- [x] T006 [P] [US1] Add evidence mock data to `tests/e2e/fixtures/mock-routes.ts`
- [x] T007 [US1] Add `mockContainers()`, `mockDiagnosticsHealth()`, `mockSessions()`, `mockEvidence()` methods to `MockAPI` class in `tests/e2e/fixtures/mock-routes.ts`
- [x] T008 [US1] Update `MockAPI.applyAllMocks()` to include new mock methods so `mockedPage` fixture covers all 12 tabs in `tests/e2e/fixtures/mock-routes.ts`

**Checkpoint**: `npm run build` passes. Mock infrastructure ready for E2E specs.

---

## Phase 3: User Story 2 — Graceful Degradation for Missing Endpoints (Priority: P1)

**Goal**: Add `isFeatureUnavailable()` to `useContainers()` and `useCameras()` hooks so 404/503 responses stop polling and retries instead of showing error states.

**Independent Test**: Mock `/v1/containers` and `/v1/cameras` as 404. Verify no retry loops, no polling, and "feature unavailable" behavior instead of error cards.

### Hook Implementation

- [x] T009 [US2] Add `isFeatureUnavailable()` import and `retry`/`refetchInterval` logic to `useContainers()` in `src/application/hooks/useContainers.ts` (follow `useWifiStatus()` pattern from `src/application/hooks/useWifi.ts`)
- [x] T010 [P] [US2] Add `isFeatureUnavailable()` import and `retry`/`refetchInterval` logic to `useCameras()` in `src/application/hooks/useCameras.ts` (follow `useWifiStatus()` pattern)

### Hook Unit Tests

- [x] T011 [P] [US2] Add/extend unit tests for `useContainers()` graceful degradation (404/503 stops polling, stops retry) in `tests/integration/hooks/useContainers.test.ts`
- [x] T012 [P] [US2] Add/extend unit tests for `useCameras()` graceful degradation (404/503 stops polling, stops retry) in `tests/integration/hooks/useCameras.test.ts`

### Verification

- [x] T013 [US2] Verify: `npm run lint` (0 errors), `VITEST_MAX_WORKERS=1 npm test` (all pass including new tests)

**Checkpoint**: Hooks handle 404/503 gracefully. Existing tests still pass.

---

## Phase 4: User Story 1 — E2E Mock Infrastructure for Full Dashboard (Priority: P1)

**Goal**: Verify all 12 tabs render correctly with full mock coverage. No console errors during tab navigation.

**Independent Test**: `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/v1-full-dashboard-mocks.spec.ts`

### E2E Test Implementation

- [x] T014 [US1] Create `tests/e2e/v1-full-dashboard-mocks.spec.ts` — full dashboard tab navigation test using `mockedPage` fixture. Verify all 12 tabs render loading → data states with no console errors.
- [x] T015 [US1] In full dashboard E2E test, verify container cards render with opaque IDs (`"kitchen-fridge-001"`, UUID, numeric) in monospace font
- [x] T016 [US1] In full dashboard E2E test, verify diagnostics tab renders health cards with status badges
- [x] T017 [US1] Run `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/v1-full-dashboard-mocks.spec.ts` — all pass, zero console errors

**Checkpoint**: Full dashboard E2E coverage with mocked API. All 12 tabs render.

---

## Phase 5: User Story 2 (continued) — Graceful Degradation E2E (Priority: P1)

**Goal**: E2E tests verifying that 404/503 on V1 endpoints doesn't break core tabs.

**Independent Test**: `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/v1-graceful-degradation.spec.ts`

- [x] T018 [US2] Create `tests/e2e/v1-graceful-degradation.spec.ts` — mock all V1 endpoints as 404, verify core tabs (System, WiFi, Door, Config, Logs) render normally
- [x] T019 [US2] In graceful degradation E2E, verify Containers tab shows graceful "unavailable" state (not error card) when `/v1/containers` returns 404
- [x] T020 [US2] In graceful degradation E2E, verify Cameras tab shows graceful "unavailable" state when `/v1/cameras` returns 503
- [x] T021 [US2] In graceful degradation E2E, verify zero console errors across all tabs when V1 endpoints return 404
- [x] T022 [US2] Run `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/v1-graceful-degradation.spec.ts` — all pass

**Checkpoint**: Graceful degradation verified end-to-end. Core tabs unaffected by V1 failures.

---

## Phase 6: User Story 3 — Operator-Critical Flow E2E Coverage (Priority: P1)

**Goal**: E2E tests for camera capture, container detail, and diagnostics rendering flows.

**Independent Test**: `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/v1-operator-flows.spec.ts`

- [x] T023 [US3] Create `tests/e2e/v1-operator-flows.spec.ts` — operator-critical flow tests using mocked APIs
- [x] T024 [US3] Add test: navigate to Cameras tab, verify camera card renders with status, click camera for detail view
- [x] T025 [US3] Add test: navigate to Containers tab, verify container cards render, open container detail showing camera slots
- [x] T026 [US3] Add test: navigate to Diagnostics tab, verify health cards and session list render
- [x] T027 [US3] Run `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/v1-operator-flows.spec.ts` — all pass

**Checkpoint**: Operator-critical flows verified in E2E. CI will catch rendering regressions.

---

## Phase 7: User Story 4 — Live Pi Smoke Runbook Extension (Priority: P2)

**Goal**: Extend `live-smoke.spec.ts` to cover Cameras, Containers, Diagnostics tabs with graceful skip when endpoints unavailable.

**Independent Test**: `LIVE_PI_URL=http://192.168.1.124:8082 PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/live-smoke.spec.ts`

- [x] T028 [US4] Add Cameras tab smoke test to `tests/e2e/live-smoke.spec.ts` — pre-flight check on `/api/v1/cameras`, skip if 404/503, verify camera list renders otherwise
- [x] T029 [P] [US4] Add Containers tab smoke test to `tests/e2e/live-smoke.spec.ts` — pre-flight check on `/api/v1/containers`, skip if 404/503, verify container list renders otherwise
- [x] T030 [P] [US4] Add Diagnostics tab smoke test to `tests/e2e/live-smoke.spec.ts` — pre-flight check on `/dashboard/diagnostics/health`, skip if 404/503, verify health cards render otherwise
- [x] T031 [US4] Verify live smoke extensions: run with `LIVE_PI_URL` unset (all new tests skip gracefully), confirm no regressions in existing smoke tests

**Checkpoint**: Live smoke covers all major tabs. New tests skip gracefully when endpoints unavailable.

---

## Phase 8: User Story 5 — Dashboard State Documentation (Priority: P2)

**Goal**: Create `docs/dashboard_states.md` documenting the state machine per tab.

**Independent Test**: File exists and accurately describes each tab's states.

- [x] T032 [US5] Create `docs/dashboard_states.md` with state machines for all 12 tabs (Loading, Error, Empty, Populated, Feature Unavailable)
- [x] T033 [US5] Include hooks and API endpoints per tab in `docs/dashboard_states.md`
- [x] T034 [US5] Document new Feature Unavailable state for Containers and Cameras tabs added in this feature

**Checkpoint**: Dashboard states documented for all 12 tabs.

---

## Phase 9: Polish & Validation

**Purpose**: Final quality checks across all work streams

- [x] T035 Run full lint check: `npm run lint` — 0 errors (1 pre-existing warning)
- [x] T036 Run full unit/integration test suite: `VITEST_MAX_WORKERS=1 npm test` — all pass (2099 tests, 96 files)
- [x] T037 Run full E2E test suite: `PLAYWRIGHT_WORKERS=1 npx playwright test` — 28/28 pass on chromium (CI browser)
- [x] T038 Run build: `npm run build` — success
- [x] T039 Verify spec acceptance criteria: SC-001 through SC-007 from `specs/045-dashboard-resilience-e2e/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS Phases 4, 5, 6
- **Phase 3 (US2 Hooks)**: Depends on Phase 1 only — can run in parallel with Phase 2
- **Phase 4 (US1 E2E)**: Depends on Phase 2 (needs mock infrastructure)
- **Phase 5 (US2 E2E)**: Depends on Phase 2 + Phase 3 (needs mocks + hook changes)
- **Phase 6 (US3 E2E)**: Depends on Phase 2 (needs mock infrastructure)
- **Phase 7 (US4 Live Smoke)**: Depends on Phase 1 only — can run after hooks are done
- **Phase 8 (US5 Docs)**: No code dependencies — can run at any time
- **Phase 9 (Polish)**: Depends on all previous phases

### Recommended Execution Order (Sequential)

1. Phase 1: Setup
2. Phase 2 + Phase 3 (in parallel): Mock infrastructure + Hook changes
3. Phase 4: Full dashboard E2E
4. Phase 5: Graceful degradation E2E
5. Phase 6: Operator flow E2E
6. Phase 7: Live smoke extensions
7. Phase 8: Dashboard states documentation
8. Phase 9: Polish & validation

### Parallel Opportunities

- T004, T005, T006 can run in parallel (different mock data sections)
- T009, T010 can run in parallel (different hook files)
- T011, T012 can run in parallel (different test files)
- T028, T029, T030 can run in parallel (different test sections in same file)
- Phase 2 and Phase 3 can run in parallel (different file sets)
- Phase 8 can run at any time (documentation only)

---

## Task Count Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1: Setup | 2 | Branch + baseline |
| Phase 2: Foundational | 6 | Mock infrastructure |
| Phase 3: US2 Hooks | 5 | Hook changes + unit tests |
| Phase 4: US1 E2E | 4 | Full dashboard E2E |
| Phase 5: US2 E2E | 5 | Graceful degradation E2E |
| Phase 6: US3 E2E | 5 | Operator flow E2E |
| Phase 7: US4 Smoke | 4 | Live Pi smoke extensions |
| Phase 8: US5 Docs | 3 | Dashboard states documentation |
| Phase 9: Polish | 5 | Final validation |
| **Total** | **39** | |
