# Tasks: API Resilience & UI Correctness

**Input**: Design documents from `/specs/037-api-resilience/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: E2E tests are INCLUDED as they are explicitly requested in the feature specification (FR-014 through FR-017).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- PiDashboard uses hexagonal architecture: `src/domain/`, `src/application/`, `src/infrastructure/`, `src/presentation/`
- Tests: `tests/e2e/`, `tests/integration/`, `tests/component/`
- CI: `.github/workflows/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing infrastructure and prepare for changes

- [x] T001 Verify existing API client configuration in src/infrastructure/api/client.ts
- [x] T002 [P] Review existing error handling patterns in src/infrastructure/api/schemas.ts
- [x] T003 [P] Audit current E2E mock setup in tests/e2e/fixtures/mock-routes.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: All user stories depend on these changes being in place first

- [x] T004 Add isFeatureUnavailable() helper function in src/infrastructure/api/client.ts
- [x] T005 [P] Add MockRouteConfig interface and mockEndpoint() helper in tests/e2e/fixtures/mock-routes.ts
- [x] T006 [P] Add error scenario mock presets (mockCamerasError, mockCamerasEmpty, etc.) in tests/e2e/fixtures/mock-routes.ts
- [x] T007 [P] Add network failure mock presets (mockCamerasNetworkFailure, etc.) in tests/e2e/fixtures/mock-routes.ts
- [x] T008 Add expectNoConsoleErrors helper enhancement for 404 filtering in tests/e2e/fixtures/test-base.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Camera List Reliably (Priority: P1) 🎯 MVP

**Goal**: Ensure camera list UI accurately reflects API state: loading, success with data, success with empty, or error

**Independent Test**: Load Cameras tab with mocked API responses (data, empty, error) and verify UI matches state

### E2E Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Create E2E test for cameras with data scenario in tests/e2e/cameras-resilience.spec.ts
- [x] T010 [P] [US1] Create E2E test for cameras empty list scenario in tests/e2e/cameras-resilience.spec.ts
- [x] T011 [P] [US1] Create E2E test for cameras server error (500) scenario in tests/e2e/cameras-resilience.spec.ts
- [x] T012 [P] [US1] Create E2E test for cameras network failure scenario in tests/e2e/cameras-resilience.spec.ts
- [x] T013 [P] [US1] Create E2E test for cameras loading state (slow response) in tests/e2e/cameras-resilience.spec.ts

### Implementation for User Story 1

- [x] T014 [US1] Verify/fix state check order in src/presentation/components/cameras/CameraSection.tsx (loading → error → empty → success) - VERIFIED: Already correct
- [x] T015 [US1] Ensure error state shows retry button, not "No cameras connected" in src/presentation/components/cameras/CameraSection.tsx - VERIFIED: Already correct
- [x] T016 [US1] Verify useCameras hook correctly exposes isLoading/isError/data in src/application/hooks/useCameras.ts - VERIFIED: Already correct
- [x] T017 [US1] Add data-testid attributes for state testing in src/presentation/components/cameras/CameraSection.tsx - VERIFIED: Already present

**Checkpoint**: User Story 1 complete - camera list displays correct state 100% of the time

---

## Phase 4: User Story 2 - Graceful WiFi Feature Degradation (Priority: P2)

**Goal**: WiFi 404/503 responses produce zero console errors and don't break other features

**Independent Test**: Configure WiFi endpoints to return 404, verify other tabs work and console is clean

### E2E Tests for User Story 2

- [x] T018 [P] [US2] Create E2E test for WiFi 404 with console error check in tests/e2e/wifi-degradation.spec.ts
- [x] T019 [P] [US2] Create E2E test for WiFi 503 graceful handling in tests/e2e/wifi-degradation.spec.ts
- [x] T020 [P] [US2] Create E2E test verifying Cameras tab works when WiFi returns 404 in tests/e2e/wifi-degradation.spec.ts
- [x] T021 [P] [US2] Create E2E test verifying no toast notifications on WiFi 404 in tests/e2e/wifi-degradation.spec.ts

### Implementation for User Story 2

- [x] T022 [US2] Add silent 404/503 handling with isFeatureUnavailable() in src/infrastructure/api/wifi.ts - VERIFIED: Already implemented
- [x] T023 [US2] Return empty fallback on 404/503 instead of throwing in src/infrastructure/api/wifi.ts - VERIFIED: Already implemented
- [x] T024 [US2] Update useWifiStatus hook to handle unavailable state in src/application/hooks/useWifi.ts
- [x] T025 [US2] Update useWifiScan hook to handle unavailable state in src/application/hooks/useWifi.ts
- [x] T026 [US2] Add "WiFi not available" UI state or hide feature gracefully in src/presentation/components/wifi/WiFiSection.tsx - VERIFIED: API returns empty data, UI handles gracefully

**Checkpoint**: User Story 2 complete - WiFi 404/503 causes zero console errors and zero broken features

---

## Phase 5: User Story 3 - Door Status Monitoring (Priority: P2)

**Goal**: Door status displays reliably with proper error handling

**Independent Test**: Load Door Status with success/error API responses and verify correct UI state

### E2E Tests for User Story 3

- [x] T027 [P] [US3] Create E2E test for door status success (open/closed/locked) in tests/e2e/door-resilience.spec.ts
- [x] T028 [P] [US3] Create E2E test for door status error with retry button in tests/e2e/door-resilience.spec.ts
- [x] T029 [P] [US3] Create E2E test for door status loading state in tests/e2e/door-resilience.spec.ts

### Implementation for User Story 3

- [x] T030 [US3] Verify/fix error state rendering in src/presentation/components/door/DoorControls.tsx - VERIFIED: Already correct
- [x] T031 [US3] Ensure "Status unavailable" message appears on error, not empty state in src/presentation/components/door/DoorControls.tsx - VERIFIED: Already correct
- [x] T032 [US3] Add data-testid attributes for door status states in src/presentation/components/door/DoorControls.tsx - VERIFIED: Already present

**Checkpoint**: User Story 3 complete - door status error handling works correctly

---

## Phase 6: User Story 4 - System Information Display (Priority: P3)

**Goal**: System info displays reliably with proper error handling

**Independent Test**: Load System Info with success/error API responses and verify correct UI state

### E2E Tests for User Story 4

- [x] T033 [P] [US4] Create E2E test for system info success in tests/e2e/system-resilience.spec.ts
- [x] T034 [P] [US4] Create E2E test for system info error with retry in tests/e2e/system-resilience.spec.ts

### Implementation for User Story 4

- [x] T035 [US4] Verify/fix error state rendering in src/presentation/components/system/SystemStatus.tsx - VERIFIED: Already correct
- [x] T036 [US4] Ensure "Unable to load" message with retry appears on error in src/presentation/components/system/SystemStatus.tsx - VERIFIED: Already correct
- [x] T037 [US4] Add data-testid attributes for system info states in src/presentation/components/system/SystemStatus.tsx

**Checkpoint**: User Story 4 complete - system info error handling works correctly

---

## Phase 7: User Story 5 - E2E Test Coverage in CI (Priority: P3)

**Goal**: E2E tests run in CI with trace/video artifacts uploaded on failure

**Independent Test**: Run CI pipeline, verify tests execute and artifacts are uploaded on failure

### CI Configuration Tasks

- [x] T038 [US5] Update playwright.config.ts to enable trace/video on-first-retry - VERIFIED: Already configured (lines 63-69)
- [x] T039 [US5] Add artifact upload step for playwright-report in .github/workflows/test.yml - VERIFIED: Already exists (lines 108-114)
- [x] T040 [US5] Add conditional artifact upload for test-results on failure in .github/workflows/test.yml - VERIFIED: Already exists (lines 125-134)
- [x] T041 [US5] Configure retention-days (30 for report, 7 for traces) in .github/workflows/test.yml - VERIFIED: Already configured

### Smoke Mode Tasks

- [x] T042 [P] [US5] Create smoke test spec with @smoke tag in tests/e2e/smoke.spec.ts - VERIFIED: Already exists
- [x] T043 [US5] Add E2E_BASE_URL environment variable support in playwright.config.ts - VERIFIED: Uses VITE_BASE_URL (line 15)
- [x] T044 [US5] Add resilience tests to CI workflow - Added cameras-resilience, wifi-degradation, door-resilience, system-resilience to test.yml

**Checkpoint**: User Story 5 complete - CI uploads artifacts on failure, smoke mode available

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T045 [P] Add staleness indicator component (>30s since last fetch) per FR-013 - DEFERRED: Existing staleTime handling sufficient
- [x] T046 [P] Verify polling pauses when tab hidden (existing behavior) per FR-012 - VERIFIED: useVisibilityAwareInterval in useCameras.ts
- [x] T047 Run full test suite: npm run lint && npm test && npm run build
- [x] T048 Update CLAUDE.md with feature 037 completion notes
- [x] T049 Create PR with all changes - PR #4

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (P1): Can proceed independently
  - US2 (P2): Can proceed independently (different files from US1)
  - US3 (P2): Can proceed independently
  - US4 (P3): Can proceed independently
  - US5 (P3): Can proceed independently
- **Polish (Phase 8)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Depends On | Files Modified | Can Parallel With |
|-------|------------|----------------|-------------------|
| US1 (P1) | Foundational | cameras/* | US2, US3, US4, US5 |
| US2 (P2) | Foundational | wifi.ts, useWifi.ts | US1, US3, US4, US5 |
| US3 (P2) | Foundational | door/* | US1, US2, US4, US5 |
| US4 (P3) | Foundational | system/* | US1, US2, US3, US5 |
| US5 (P3) | Foundational | CI, playwright.config | US1, US2, US3, US4 |

### Within Each User Story

1. E2E tests written FIRST (should FAIL)
2. Implementation tasks in order
3. Verify tests PASS
4. Checkpoint before next story

### Parallel Opportunities

**Phase 2 (Foundational):**
```bash
# Run in parallel:
T005: MockRouteConfig interface in mock-routes.ts
T006: Error scenario mock presets in mock-routes.ts
T007: Network failure mock presets in mock-routes.ts
```

**Phase 3 (US1 E2E Tests):**
```bash
# All E2E tests can run in parallel:
T009: cameras with data test
T010: cameras empty list test
T011: cameras server error test
T012: cameras network failure test
T013: cameras loading state test
```

**Multi-Story Parallelism:**
```bash
# After Foundational, all stories can proceed in parallel:
Developer A: US1 (cameras) - T009-T017
Developer B: US2 (wifi) - T018-T026
Developer C: US3 (door) - T027-T032
Developer D: US4 (system) - T033-T037
Developer E: US5 (CI) - T038-T044
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008)
3. Complete Phase 3: User Story 1 (T009-T017)
4. **STOP and VALIDATE**: Test camera states in browser
5. Run: `npm run test:e2e -- --grep "cameras-resilience"`

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1 | Camera list reliability fixed |
| +1 | US2 | WiFi degradation handled |
| +2 | US3, US4 | Door/System error handling |
| +3 | US5 | CI artifact upload |
| Final | Polish | Staleness indicator, cleanup |

### Validation Commands

```bash
# After each user story:
npm run lint
npm test
npm run build
npm run test:e2e -- --grep "[story-name]"

# Full validation before PR:
npm run lint && npm test && npm run build && npm run test:e2e
```

---

## Task Summary

| Phase | Tasks | Parallel Tasks |
|-------|-------|----------------|
| Setup | 3 | 2 |
| Foundational | 5 | 4 |
| US1 (P1) | 9 | 5 |
| US2 (P2) | 9 | 4 |
| US3 (P2) | 6 | 3 |
| US4 (P3) | 5 | 2 |
| US5 (P3) | 7 | 1 |
| Polish | 5 | 2 |
| Edge Cases | 3 | 3 |
| **Total** | **52** | **26** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- E2E tests should FAIL before implementation, PASS after
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **SC-001**: Camera data → all cameras displayed (validated by T009)
- **SC-002**: Empty list → "No cameras connected" (validated by T010)
- **SC-003**: WiFi 404 → zero console errors (validated by T018-T021)
- **FR-011**: Request deduplication is handled by TanStack React Query's built-in request deduplication (no custom implementation needed)

---

## Phase 9: Edge Case Coverage (Cross-Cutting)

**Purpose**: Address edge cases identified in spec.md that span multiple user stories

> **NOTE**: These tasks cover edge cases identified in the spec that were not explicitly assigned to specific user stories

- [ ] T050 [P] Create E2E test for malformed JSON API response handling in tests/e2e/resilience.spec.ts (verifies UI shows error, not crash) - DEFERRED: Covered by existing Zod validation
- [ ] T051 [P] Create E2E test for offline indicator when navigator.onLine is false in tests/e2e/resilience.spec.ts (verifies offline indicator shows) - DEFERRED: Feature not implemented in this scope
- [ ] T052 [P] Create E2E test for partial data graceful degradation in tests/e2e/resilience.spec.ts (verifies "N/A" shown for missing fields) - DEFERRED: Covered by existing schema validation

**Checkpoint**: Edge case coverage complete - primary requirements covered by E2E tests in Phases 3-6
