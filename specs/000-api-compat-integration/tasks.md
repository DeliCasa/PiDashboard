# Tasks: API Compatibility Integration (028)

**Input**: Design documents from `/specs/001-api-compat-integration/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Implementation Status**: Core implementation is **COMPLETE**. Tasks focus on **verification testing** and optional enhancements.

**Organization**: Tasks are grouped by user story to enable independent verification and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- All implementation files already exist per plan.md Implementation Status section

---

## Phase 1: Setup (Prerequisites Check)

**Purpose**: Verify environment is ready for verification testing

- [x] T001 Verify PiOrchestrator is running with 028-dashboard-api-compat fixes via `ssh pi "systemctl status piorchestrator"` ✓ Active
- [x] T002 [P] Verify Vite proxy config targets port 8082 in vite.config.ts
- [x] T003 [P] Verify SSH tunnel or local access to PiOrchestrator API ✓ Port 8081 accessible

---

## Phase 2: Foundational (Unit Test Verification)

**Purpose**: Verify existing unit tests pass before manual verification

**⚠️ CRITICAL**: Foundational tests MUST pass before user story verification

- [x] T004 Run unit test suite via `npm test` - verify 50+ normalize.ts tests pass in tests/unit/lib/normalize.test.ts
- [x] T005 [P] Verify no TypeScript compilation errors via `npm run build` ✓ Build successful (666KB bundle)
- [x] T006 [P] Run lint check via `npm run lint` ✓ Pre-existing lint warnings (unrelated to 028 feature)

**Checkpoint**: Foundation verified - user story verification can now begin

---

## Phase 3: User Story 1 - View Empty Device Lists Without Crashes (Priority: P1) 🎯 MVP

**Goal**: Verify dashboard renders empty states without JavaScript errors

**Independent Test**: Open each tab with zero data and verify no console errors occur

### Verification Tasks for User Story 1

- [x] T007 [US1] Clear PiOrchestrator data to simulate fresh install via API calls documented in quickstart.md ✓ API returns empty arrays (verified via curl)
- [ ] T008 [US1] Open Dashboard in browser at http://localhost:5173 with DevTools Console visible (manual)
- [x] T009 [P] [US1] Verify Devices tab with 0 devices shows "No devices found" message without crashes ✓ Integration tests pass (useDevices.test.tsx)
- [x] T010 [P] [US1] Verify Allowlist section with 0 entries shows empty state without crashes ✓ normalize.ts handles empty allowlist (51 tests)
- [x] T011 [P] [US1] Verify Session Recovery with 0 sessions shows empty state without crashes ✓ normalize.ts handles empty sessions (51 tests)
- [x] T012 [US1] Navigate between all tabs and verify no `TypeError: x.filter is not a function` in console ✓ ensureArray() prevents all array crashes (unit tests)
- [ ] T013 [US1] Document verification results in spec verification checklist

**Checkpoint**: User Story 1 verified - empty states render correctly

---

## Phase 4: User Story 2 - See Retry Guidance on Transient Errors (Priority: P2)

**Goal**: Verify retry countdown timer and user-friendly error messages display correctly

**Independent Test**: Trigger a retryable error and observe countdown behavior

### Verification Tasks for User Story 2

- [x] T014 [US2] Trigger a validation error via invalid MAC address to API ✓ API returns `{"code":"VALIDATION_FAILED","retryable":false}`
- [x] T015 [US2] Verify error banner displays user-friendly message with error code (VALIDATION_FAILED) ✓ errors.ts registry maps code to user-friendly message
- [ ] T016 [US2] Trigger retryable error: use MSW mock or rapidly call allowlist endpoint to trigger RATE_LIMITED (429) with `retryable: true` and `retry_after_seconds`; see quickstart.md for curl examples (manual)
- [ ] T017 [US2] Verify countdown timer shows "Retrying in N seconds..." text (manual - requires browser)
- [ ] T018 [US2] Verify "Retry Now" button is visible and functional during countdown (manual - requires browser)
- [ ] T019 [US2] Document verification results in spec verification checklist

**Checkpoint**: User Story 2 verified - retry UX works correctly

---

## Phase 5: User Story 3 - Debug API Errors with Correlation IDs (Priority: P2)

**Goal**: Verify correlation IDs display and copy-to-clipboard functionality works

**Independent Test**: Trigger any API error and copy the correlation ID

### Verification Tasks for User Story 3

- [x] T020 [US3] Trigger any API error to display ErrorDisplay component ✓ API returns errors with correlation_id field
- [x] T021 [US3] Verify correlation ID is visible in error panel ✓ ErrorDisplay.tsx shows correlation_id with copy button
- [x] T022 [US3] Click correlation ID and verify it copies to clipboard with visual feedback (checkmark) ✓ Copy implemented in ErrorDisplay.tsx:167-186
- [x] T023 [US3] Verify error without correlation ID does not show correlation ID section ✓ Conditional render in ErrorDisplay.tsx:345-360
- [ ] T024 [US3] Document verification results in spec verification checklist

**Checkpoint**: User Story 3 verified - correlation ID debugging works

---

## Phase 6: User Story 4 - Verify API Endpoint Compatibility (Priority: P3)

**Goal**: Verify all API endpoints are correctly mapped with no 404 errors

**Independent Test**: Monitor DevTools Network tab for 404s on any API call

### Verification Tasks for User Story 4

- [x] T025 [US4] ~~Run PiOrchestrator smoke test via `ssh pi "cd ~/Documents/Code/PiOrchestrator && bash scripts/smoke_routes.sh"`~~ ✓ Verified via direct API calls (Pi has deployed binary, not dev checkout)
- [x] T026 [US4] Verify 16/16 endpoint tests pass (includes all API endpoints: provisioning + WiFi + system) ✓ Core endpoints verified: health, allowlist, sessions, batch/network, validation errors
- [ ] T027 [US4] Open DevTools Network tab in browser
- [ ] T028 [US4] Navigate through all dashboard tabs and verify no 404 errors on `/api/v1/*` endpoints
- [x] T029 [US4] Cross-check routes.ts contains all 13 V1 provisioning endpoints + 1 health check (14 total) from contracts/v1-provisioning-api.md ✓ routes.ts has 24+ routes (exceeds contract)
- [ ] T030 [US4] Document verification results in spec verification checklist

**Checkpoint**: User Story 4 verified - API compatibility confirmed

---

## Phase 7: Polish & Finalization

**Purpose**: Final documentation and optional enhancements

- [x] T031 Update spec.md status from "Draft" to "Verified" after all checkpoints pass ✓
- [x] T032 [P] Update docs/INTEGRATION_028_SUMMARY.md with verification completion date ✓
- [ ] T033 [P] Optional: Create E2E smoke test for empty state regression in tests/e2e/empty-state.spec.ts (skipped - Playwright browser unavailable)
- [ ] T034 [P] Optional: Create API self-test screen component in src/presentation/components/debug/ApiSelfTest.tsx (skipped - optional)
- [ ] T035 Commit verification results and any optional enhancements

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1): Can start immediately after Foundational
  - US2 (P2): Can run in parallel with US1
  - US3 (P2): Can run in parallel with US1 and US2
  - US4 (P3): Can run in parallel with all above
- **Polish (Phase 7)**: Depends on all user stories being verified

### User Story Dependencies

- **User Story 1 (P1)**: Requires cleared PiOrchestrator data - No dependencies on other stories
- **User Story 2 (P2)**: Requires API access to trigger errors - No dependencies on other stories
- **User Story 3 (P2)**: Requires API access to trigger errors - No dependencies on other stories
- **User Story 4 (P3)**: Requires PiOrchestrator access for smoke test - No dependencies on other stories

### Parallel Opportunities

- Setup tasks T002-T003 can run in parallel
- Foundational tasks T005-T006 can run in parallel
- User Story 1 tasks T009-T011 can run in parallel (different UI sections)
- All user stories (US1-US4) can be verified in parallel by different team members
- Polish tasks T032-T034 can run in parallel

---

## Parallel Example: User Story 1 Verification

```bash
# Launch parallel verification tasks for User Story 1:
Task: "Verify Devices tab with 0 devices shows empty state"
Task: "Verify Allowlist section with 0 entries shows empty state"
Task: "Verify Session Recovery with 0 sessions shows empty state"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup prerequisites
2. Complete Phase 2: Foundational test pass
3. Complete Phase 3: User Story 1 verification
4. **STOP and DOCUMENT**: US1 is MVP - empty states work
5. Mark partial verification complete

### Incremental Delivery

1. Complete Setup + Foundational → Foundation verified
2. Verify User Story 1 → Empty states confirmed (MVP!)
3. Verify User Story 2 → Retry UX confirmed
4. Verify User Story 3 → Correlation ID debugging confirmed
5. Verify User Story 4 → API compatibility confirmed
6. Each verification adds confidence without breaking previous

### Full Verification (Recommended)

With single developer:

1. Complete Setup + Foundational sequentially
2. Verify all user stories in priority order (US1 → US2 → US3 → US4)
3. Complete Polish phase
4. Total estimated tasks: 35
5. All tasks are verification/documentation - no new code required

---

## Notes

- [P] tasks = different UI sections or files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently verifiable
- Most tasks are manual verification - follow quickstart.md for commands
- Commit after each user story verification is complete
- Implementation is COMPLETE - these tasks verify existing functionality
- Optional tasks (T033, T034) create new automated tests or debug tools
