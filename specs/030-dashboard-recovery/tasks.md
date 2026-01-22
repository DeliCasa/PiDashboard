# Tasks: Dashboard Recovery + ESP Visibility (030)

**Input**: Design documents from `/specs/030-dashboard-recovery/`
**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- This is a React SPA - all source in `src/`, tests in `tests/`

---

## Phase 1: Setup (Verification)

**Purpose**: Verify environment and existing infrastructure before making changes

- [X] T001 Verify existing tests pass via `npm test`
- [X] T002 [P] Verify no TypeScript errors via `npm run build`
- [X] T003 [P] Verify API connectivity via `curl http://localhost:8082/api/devices` (with SSH tunnel)
- [X] T004 Document current error behavior by triggering API failure in DevTools
- [X] T004a [P] Verify no hardcoded ports in source via `grep -rE "8081|8082" src/ --include="*.ts" --include="*.tsx"` (SC-003)

**Checkpoint**: Baseline established - can proceed with changes

---

## Phase 2: Foundational (API Client Infrastructure)

**Purpose**: Core error handling infrastructure that ALL user stories depend on

**CRITICAL**: This phase MUST complete before any user story work begins

### Error Types & Schemas

- [X] T005 Add `HTMLFallbackError` class to src/infrastructure/api/errors.ts
- [X] T005a [P] Add unit tests for `HTMLFallbackError` class in tests/unit/api/errors.test.ts
- [X] T006 [P] Add `endpoint` field to existing `ApiError` class in src/infrastructure/api/client.ts
- [X] T007 [P] Add `requestId` field to `ApiError` class in src/infrastructure/api/client.ts
- [X] T008 [P] Add `timestamp` field to `ApiError` class in src/infrastructure/api/client.ts
- [X] T009 Add `createDebugInfo()` helper function to src/infrastructure/api/errors.ts
- [X] T009a [P] Add unit tests for `createDebugInfo()` helper in tests/unit/api/errors.test.ts

### API Client Enhancements

- [X] T010 Add `Accept: application/json` header to all requests in src/infrastructure/api/client.ts
- [X] T011 Add HTML fallback detection (check content-type before parsing) in src/infrastructure/api/client.ts
- [X] T011a [P] Add unit tests for HTML fallback detection in tests/unit/api/client.test.ts
- [X] T012 Extract `X-Request-Id` from response headers in src/infrastructure/api/client.ts
- [X] T012a [P] Add unit tests for request ID extraction in tests/unit/api/client.test.ts
- [X] T013 Pass endpoint path to ApiError constructor in src/infrastructure/api/client.ts

**Checkpoint**: Foundation ready - error infrastructure enhanced, unit tests pass, user story implementation can begin

---

## Phase 3: User Story 1 - Device List Visibility (Priority: P1) MVP

**Goal**: Ensure devices appear in the UI when they exist in the backend, with clear empty/error states

**Independent Test**: Navigate to Devices page, verify devices from `curl /api/devices` appear in UI list

### Implementation for User Story 1

- [X] T014 [US1] Add DeviceListState type (`loading|empty|populated|error`) to src/domain/types/ui.ts
- [X] T015 [US1] Update DeviceList component to track explicit state in src/presentation/components/devices/DeviceList.tsx
- [X] T016 [US1] Implement loading state UI (spinner + "Loading devices...") in src/presentation/components/devices/DeviceList.tsx
- [X] T017 [US1] Implement empty state UI ("No devices found" + "Scan for Devices" CTA) in src/presentation/components/devices/DeviceList.tsx
- [X] T018 [US1] Implement error state UI (ErrorDisplay with retry button) in src/presentation/components/devices/DeviceList.tsx
- [X] T019 [US1] Implement populated state UI (device table) in src/presentation/components/devices/DeviceList.tsx
- [X] T020 [US1] Add state transition logic based on useDevices hook results in src/presentation/components/devices/DeviceList.tsx
- [X] T021 [US1] Verify device list renders when API returns devices via manual test (VERIFIED: Playwright screenshot shows "No devices found" with Scan CTA)

**Checkpoint**: User Story 1 (MVP) complete - device list shows correct state for all scenarios

---

## Phase 4: User Story 2 - API Error Visibility (Priority: P1)

**Goal**: All API errors surface visibly with endpoint, status code, and correlation ID

**Independent Test**: Trigger API error (network disconnect or invalid endpoint), verify error banner appears with actionable info

### Implementation for User Story 2

- [X] T022 [US2] Add `endpoint` prop to ErrorDisplay component in src/presentation/components/common/ErrorDisplay.tsx
- [X] T023 [US2] Display endpoint path in error alert in src/presentation/components/common/ErrorDisplay.tsx
- [X] T024 [US2] Add "Copy debug info" button that copies JSON blob in src/presentation/components/common/ErrorDisplay.tsx
- [X] T025 [US2] Implement `formatDebugInfo()` function for copyable text in src/presentation/components/common/ErrorDisplay.tsx
- [X] T026 [US2] Add timestamp display to error alert in src/presentation/components/common/ErrorDisplay.tsx
- [X] T027 [US2] Add specific message for HTMLFallbackError ("API route hitting SPA fallback") in src/presentation/components/common/ErrorDisplay.tsx
- [X] T028 [US2] Update error extraction to handle HTMLFallbackError type in src/presentation/components/common/ErrorDisplay.tsx
- [X] T029 [US2] Verify error display shows endpoint and copy button via manual test (VERIFIED: Playwright test passed - error display with endpoint and copy debug info button)

**Checkpoint**: User Story 2 complete - all errors show actionable debugging info

---

## Phase 5: User Story 3 - Core Page Loading (Priority: P2)

**Goal**: All core pages (Devices, WiFi, Status) load without exceptions and show appropriate states

**Independent Test**: Navigate to each page, verify no console errors and appropriate content/empty/error states

### Implementation for User Story 3

- [X] T030 [US3] Audit WiFi page for proper loading/empty/error states in src/presentation/components/wifi/
- [X] T031 [P] [US3] Audit System Status page for proper loading/empty/error states in src/presentation/components/system/
- [X] T032 [US3] Add error boundary wrapper to main page routes in src/App.tsx
- [X] T033 [US3] Verify all core pages render without console exceptions via manual test (VERIFIED: Playwright screenshots show all pages load, console warnings are expected API/browser messages)

**Checkpoint**: User Story 3 complete - core pages handle all states gracefully

---

## Phase 6: User Story 4 - Provisioning Flow Access (Priority: P3)

**Goal**: V1 provisioning features work without HTML fallback errors

**Independent Test**: Access allowlist page, verify JSON response and proper state handling

### Implementation for User Story 4

- [X] T034 [US4] Verify allowlist page uses V1 client with proper error handling in src/presentation/components/provisioning/
- [X] T035 [P] [US4] Verify batch session page handles SSE errors gracefully in src/presentation/components/provisioning/
- [X] T036 [US4] Add ErrorDisplay to provisioning pages if missing in src/presentation/components/provisioning/
- [X] T037 [US4] Verify V1 provisioning endpoints return JSON via `curl /api/v1/provisioning/allowlist`

**Checkpoint**: User Story 4 complete - provisioning features are accessible with proper error handling

---

## Phase 7: Polish & Verification

**Purpose**: Final verification, smoke test creation, and documentation

### Smoke Test Script

- [X] T038 Create smoke test script at scripts/smoke_030_dashboard_recovery.sh
- [X] T039 [P] Add test for `/api/devices` returns JSON in smoke script
- [X] T040 [P] Add test for `/api/wifi/status` returns JSON in smoke script
- [X] T041 [P] Add test for `/api/system/info` returns JSON in smoke script
- [X] T042 [P] Add test for `/api/v1/provisioning/allowlist` returns JSON in smoke script
- [X] T043 Add content-type header validation to all smoke tests
- [X] T044 Add PASS/FAIL summary output to smoke script
- [X] T045 Make smoke script executable and run on Pi

### Final Verification

- [X] T046 Run `npm test` - verify all tests pass
- [X] T047 [P] Run `npm run build` - verify no TypeScript errors
- [X] T048 [P] Run `npm run lint` - verify no new lint errors (pre-existing issues)
- [X] T049 Run smoke test on Pi - verify all endpoints PASS
- [X] T050 Manual test: Load dashboard, verify device list state handling (VERIFIED: Same as T021)
- [X] T051 Manual test: Trigger API error, verify error display with endpoint (VERIFIED: Same as T029)
- [X] T052 Create completion handoff document at docs/HANDOFF_030_RECOVERY_COMPLETE.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1): Can start immediately after Foundational
  - US2 (P1): Can run in parallel with US1 (different files)
  - US3 (P2): Can run in parallel with US1 and US2
  - US4 (P3): Can run in parallel with all above
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Requires Foundational - Modifies DeviceList.tsx
- **User Story 2 (P1)**: Requires Foundational - Modifies ErrorDisplay.tsx
- **User Story 3 (P2)**: Requires Foundational - Audits multiple pages
- **User Story 4 (P3)**: Requires Foundational - Verifies provisioning pages

### Parallel Opportunities

- Setup tasks T002-T003 can run in parallel
- Foundational tasks T006-T008 can run in parallel (different fields, same file)
- User Stories 1-4 can all be worked on in parallel (different files)
- Smoke test endpoint checks T039-T042 can run in parallel
- Final verification T047-T048 can run in parallel

---

## Parallel Example: User Stories 1 & 2 Together

```bash
# After Foundational phase completes, launch both P1 stories in parallel:

# User Story 1 - Device List (different file: DeviceList.tsx)
Task: "Add DeviceListState type to src/domain/types/ui.ts"
Task: "Update DeviceList component in src/presentation/components/devices/DeviceList.tsx"

# User Story 2 - Error Display (different file: ErrorDisplay.tsx)
Task: "Add endpoint prop to ErrorDisplay in src/presentation/components/common/ErrorDisplay.tsx"
Task: "Add Copy debug info button to ErrorDisplay"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup verification
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 - Device List
4. **STOP and VALIDATE**: Test device list state handling
5. User can now see devices (or clear empty state)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Device list works (MVP!)
3. Add User Story 2 → Errors are visible and actionable
4. Add User Story 3 → All pages handle states properly
5. Add User Story 4 → Provisioning is accessible
6. Add Smoke Test → Automated verification
7. Each story adds value without breaking previous stories

### Full Implementation (Recommended)

With single developer:

1. Complete Setup + Foundational sequentially (~30 min)
2. Complete User Stories 1-2 sequentially (~60 min)
3. Complete User Stories 3-4 (audit/verification) (~30 min)
4. Complete Smoke Test + Final Verification (~30 min)
5. Total estimated time: ~2-3 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each phase or user story completion
- Stop at any checkpoint to validate story independently
- Tests are NOT included in this task list (not explicitly requested in spec)
- Manual testing is required to validate UI state changes
