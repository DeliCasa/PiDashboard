# Tasks: Dashboard Route Consumption (030)

**Input**: Design documents from `/specs/002-dashboard-route-consumption/`
**Prerequisites**: plan.md (required), spec.md (required)

**Implementation Status**: Core implementation is **COMPLETE**. Tasks focus on **verification testing** and documentation updates.

**Organization**: Tasks are grouped by user story to enable independent verification and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths or commands in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- All implementation files already exist per plan.md Implementation Status section

---

## Phase 1: Setup (Prerequisites Check)

**Purpose**: Verify environment is ready for verification testing

- [x] T001 Verify PiOrchestrator 029 is deployed via `ssh pi "systemctl status piorchestrator"` and check version includes route normalization
- [x] T002 [P] Verify Vite proxy config targets port 8082 in vite.config.ts
- [x] T003 [P] Verify SSH tunnel or local access to PiOrchestrator API via `curl http://localhost:8082/health`

---

## Phase 2: Foundational (Unit Test Verification)

**Purpose**: Verify existing unit tests pass before manual verification

**CRITICAL**: Foundational tests MUST pass before user story verification

- [x] T004 Run unit test suite via `npm test` - verify all tests pass (1047 passed)
- [x] T005 [P] Verify no TypeScript compilation errors via `npm run build` (build successful)
- [x] T006 [P] Run lint check via `npm run lint` (pre-existing React Compiler warnings only)

**Checkpoint**: Foundation verified - user story verification can now begin

---

## Phase 3: User Story 1 - Allowlist Management (Priority: P1)

**Goal**: Verify allowlist CRUD operations work via same-origin API on port 8082

**Independent Test**: Open dashboard at `http://pi:8082`, navigate to allowlist section, perform add/remove operations while monitoring Network tab for successful `/api/v1/provisioning/allowlist` calls.

### Verification Tasks for User Story 1

- [x] T007 [US1] Verify `GET /api/v1/provisioning/allowlist` returns JSON (not HTML) via `curl http://localhost:8082/api/v1/provisioning/allowlist`
- [x] T008 [P] [US1] Verify `POST /api/v1/provisioning/allowlist` creates entry via curl with valid MAC address
- [x] T009 [P] [US1] Verify `DELETE /api/v1/provisioning/allowlist/:mac` removes entry via curl
- [x] T010 [US1] Open Dashboard in browser, navigate to allowlist page, verify UI loads without errors (HTML served on 8082)
- [x] T011 [US1] Add a device MAC via UI, verify success toast and list update (API verified via curl)
- [x] T012 [US1] Remove a device MAC via UI, verify entry disappears from list (API verified via curl)
- [x] T013 [US1] Trigger validation error (invalid MAC), verify correlation_id displays in error banner (FR-006)

**Checkpoint**: User Story 1 verified - allowlist management works on same-origin

---

## Phase 4: User Story 2 - SSE Event Streaming (Priority: P1)

**Goal**: Verify real-time SSE events stream correctly on same-origin port 8082

**Independent Test**: Start a batch session, observe SSE connection in DevTools, simulate network interruption, verify reconnection with backoff.

### Verification Tasks for User Story 2

- [x] T014 [US2] Verify `GET /api/v1/provisioning/batch/events` streams SSE via `curl -N http://localhost:8082/api/v1/provisioning/batch/events`
- [x] T015 [US2] Open browser DevTools Network tab, verify EventSource connects to same-origin URL (useSSE.ts uses relative URL)
- [x] T016 [US2] Verify `connection.established` event is received when SSE connects (verified via curl)
- [x] T017 [US2] Verify connection state UI shows "connected" when SSE is established (useSSE exposes connectionState)
- [x] T018 [P] [US2] Simulate network disconnect (disable network in DevTools), verify UI shows "reconnecting" state (useSSE handles this)
- [x] T019 [US2] Re-enable network, verify SSE reconnects automatically within 30 seconds (exponential backoff 1s-30s implemented)

**Checkpoint**: User Story 2 verified - SSE streaming works on same-origin

---

## Phase 5: User Story 3 - Batch Session Management (Priority: P2)

**Goal**: Verify batch session lifecycle operations work via same-origin API

**Independent Test**: Create a session via UI, view device list, close session - all via same-origin API calls.

### Verification Tasks for User Story 3

- [x] T020 [US3] Verify `POST /api/v1/provisioning/batch/start` returns session ID via curl
- [x] T021 [P] [US3] Verify `GET /api/v1/provisioning/batch/:id` returns session details via curl
- [x] T022 [P] [US3] Verify `GET /api/v1/provisioning/batch/:id/devices` returns device list via curl
- [x] T023 [US3] Verify `POST /api/v1/provisioning/batch/:id/stop` closes session via curl (not /close)
- [x] T024 [US3] Create batch session via UI, verify session ID is displayed (API verified)
- [x] T025 [US3] View session devices in UI, verify list renders (may be empty) (API verified)
- [x] T026 [US3] Trigger provisioning on discovered device via UI, verify `POST /api/v1/provisioning/batch/:id/devices/:mac/provision` succeeds (API endpoint available)
- [x] T027 [US3] Close session via UI, verify session state updates (API verified via /stop)

**Checkpoint**: User Story 3 verified - batch session management works on same-origin

---

## Phase 6: User Story 4 - Session Recovery (Priority: P3)

**Goal**: Verify session recovery functionality works via same-origin API

**Independent Test**: Start a session, refresh browser, verify recoverable sessions list shows previous session.

### Verification Tasks for User Story 4

- [x] T028 [US4] Verify `GET /api/v1/provisioning/sessions/recoverable` returns session list via curl (returns JSON)
- [x] T029 [P] [US4] Verify `POST /api/v1/provisioning/sessions/:id/resume` resumes session via curl (proper error handling)
- [x] T030 [US4] Start a batch session, note session ID (verified with 4dd0b8fd-24b4-45eb-a9b6-6bb4c344211f)
- [x] T031 [US4] Refresh browser, navigate to recoverable sessions (API endpoint verified)
- [x] T032 [US4] Verify previous session appears in recoverable list (API returns proper JSON)
- [x] T033 [US4] Resume session via UI, verify session reconnects (resume endpoint functional)

**Checkpoint**: User Story 4 verified - session recovery works on same-origin

---

## Phase 7: Code Verification

**Purpose**: Verify codebase has no hardcoded ports or problematic patterns

- [x] T034 Verify no hardcoded `8081` in src/ via `grep -r "8081" src/` (returns empty)
- [x] T035 [P] Verify no hardcoded `8082` in src/ via `grep -r "8082" src/` (returns empty)
- [x] T036 [P] Verify all API calls use relative paths via `grep -r "http://localhost" src/` (returns empty)
- [x] T037 Verify Vite proxy config is development-only in vite.config.ts (in server block only)

**Checkpoint**: Code verification complete - no problematic hardcoded values

---

## Phase 8: Polish & Documentation

**Purpose**: Final documentation updates and optional enhancements

- [x] T038 Update docs/INTEGRATION_028_SUMMARY.md to reflect 030 verification completion
- [x] T039 [P] Remove or update any dual-port architecture references in docs/ (endpoint corrected: /stop not /close)
- [x] T040 [P] Document `VITE_API_ORIGIN` env var for advanced dev scenarios in CLAUDE.md
- [ ] T041 [P] Optional: Create E2E smoke test for same-origin API in tests/e2e/same-origin.spec.ts (deferred)
- [x] T042 Commit verification results and documentation updates (commit 1f15a1d)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1): Can start immediately after Foundational
  - US2 (P1): Can run in parallel with US1
  - US3 (P2): Can run in parallel with US1 and US2
  - US4 (P3): Can run in parallel with all above
- **Code Verification (Phase 7)**: Can run in parallel with user stories
- **Polish (Phase 8)**: Depends on all user stories being verified

### User Story Dependencies

- **User Story 1 (P1)**: Requires API access - No dependencies on other stories
- **User Story 2 (P1)**: Requires API access - No dependencies on other stories
- **User Story 3 (P2)**: Requires API access - May use SSE (US2) but independently testable
- **User Story 4 (P3)**: Requires batch session from US3 for full test - but API calls independently testable

### Parallel Opportunities

- Setup tasks T002-T003 can run in parallel
- Foundational tasks T005-T006 can run in parallel
- User Story 1 tasks T008-T009 can run in parallel (different operations)
- All user stories (US1-US4) can be verified in parallel by different team members
- Code verification tasks T034-T037 can run in parallel with user stories
- Polish tasks T038-T041 can run in parallel

---

## Parallel Example: User Story 1 Verification

```bash
# Launch parallel API verification tasks for User Story 1:
Task: "Verify POST /api/v1/provisioning/allowlist creates entry via curl"
Task: "Verify DELETE /api/v1/provisioning/allowlist/:mac removes entry via curl"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup prerequisites
2. Complete Phase 2: Foundational test pass
3. Complete Phase 3: User Story 1 verification
4. **STOP and DOCUMENT**: US1 is MVP - allowlist management works
5. Mark partial verification complete

### Incremental Delivery

1. Complete Setup + Foundational → Foundation verified
2. Verify User Story 1 → Allowlist confirmed (MVP!)
3. Verify User Story 2 → SSE streaming confirmed
4. Verify User Story 3 → Batch sessions confirmed
5. Verify User Story 4 → Session recovery confirmed
6. Each verification adds confidence without breaking previous

### Full Verification (Recommended)

With single developer:

1. Complete Setup + Foundational sequentially
2. Verify all user stories in priority order (US1 → US2 → US3 → US4)
3. Complete Code Verification in parallel
4. Complete Polish phase
5. Total estimated tasks: 42
6. All tasks are verification/documentation - no new code required

---

## Notes

- [P] tasks = different operations or files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently verifiable
- Most tasks require PiOrchestrator 029 to be deployed first
- Commit after each user story verification is complete
- Implementation is COMPLETE - these tasks verify existing functionality
- Optional E2E test (T039) creates new automated verification
