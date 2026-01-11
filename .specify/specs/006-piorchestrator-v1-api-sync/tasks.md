# Tasks: PiOrchestrator V1 API Sync

> **Feature**: 006-piorchestrator-v1-api-sync
> **Generated**: 2026-01-11
> **Total Tasks**: 51
> **User Stories**: 6
> **Status**: COMPLETE (All 8 Phases Done - 51/51 Tasks)

---

## User Story Mapping

| Story ID | Priority | Description | Task Count | Status |
|----------|----------|-------------|------------|--------|
| US1 | P0 | Batch Device Provisioning | 14 | Complete (14/14) |
| US2 | P1 | Device Allowlist Management | 6 | Complete (6/6) |
| US3 | P1 | Session Recovery | 4 | Complete (4/4) |
| US4 | P2 | Real-Time System Monitoring | 5 | Complete (5/5) |
| US5 | P1 | API Key Configuration | 3 | Complete (3/3) |
| US6 | P1 | Error Handling & Debugging | 4 | Complete (4/4) |

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Types & Contracts) - COMPLETE

**Purpose**: Define all new types and Zod schemas without changing runtime behavior.

**Status**: All 8 tasks completed

- [x] T001 [P] Create V1 API type definitions in src/domain/types/v1-api.ts
- [x] T002 Create provisioning entity types in src/domain/types/provisioning.ts
- [x] T003 [P] Create WebSocket monitoring types in src/domain/types/websocket.ts
- [x] T004 Create SSE event types in src/domain/types/sse.ts
- [x] T005 Add V1 envelope Zod schemas to src/infrastructure/api/schemas.ts
- [x] T006 Add provisioning Zod schemas to src/infrastructure/api/schemas.ts
- [x] T007 Create provisioning fixtures in tests/fixtures/provisioning.fixture.ts
- [x] T008 Create provisioning contract tests in tests/integration/contracts/provisioning.contract.test.ts

**Checkpoint**: Types and schemas complete. Run `npm test tests/integration/contracts` to validate.

---

## Phase 2: Foundational (API Client Infrastructure) - COMPLETE

**Purpose**: Core API client infrastructure that MUST be complete before user story UI implementation.

**Status**: All 8 tasks completed

- [x] T009 [P] Create error code registry in src/infrastructure/api/errors.ts
- [x] T010 [P] Create API key management module in src/infrastructure/api/auth.ts
- [x] T011 Create V1 API client wrapper in src/infrastructure/api/v1-client.ts
- [x] T012 [P] Create feature flag store in src/application/stores/features.ts
- [x] T013 Create batch provisioning API service in src/infrastructure/api/batch-provisioning.ts
- [x] T014 [P] Create allowlist API service in src/infrastructure/api/allowlist.ts
- [x] T015 [P] Create session recovery API service in src/infrastructure/api/session-recovery.ts
- [x] T016 [P] Add MSW handlers for V1 endpoints in tests/integration/mocks/handlers.ts

**Checkpoint**: Foundation ready. Contract tests pass. User story implementation can begin.

---

## Phase 3: User Story 1 - Batch Device Provisioning (Priority: P0) - COMPLETE

**Goal**: Enable field technicians to provision multiple ESP-CAM devices simultaneously with real-time SSE updates.

**Independent Test**: Start a batch session, see devices discovered via SSE, provision all, verify completion.

### Infrastructure for US1 - COMPLETE

- [x] T017 [US1] Create useSSE hook in src/application/hooks/useSSE.ts
- [x] T018 [US1] Create useBatchProvisioningEvents hook in src/application/hooks/useBatchProvisioningEvents.ts
- [x] T019 [P] [US1] Create ConnectionStatus component in src/presentation/components/common/ConnectionStatus.tsx

### Components for US1 - COMPLETE

- [x] T020 [P] [US1] Create StartSessionForm component in src/presentation/components/provisioning/StartSessionForm.tsx
- [x] T021 [P] [US1] Create SessionProgress component in src/presentation/components/provisioning/SessionProgress.tsx
- [x] T022 [P] [US1] Create ProvisioningCandidateCard component in src/presentation/components/provisioning/ProvisioningCandidateCard.tsx
- [x] T023 [US1] Create BatchProvisioningSection component in src/presentation/components/provisioning/BatchProvisioningSection.tsx
- [x] T024 [US1] Add Provisioning tab to App navigation in src/App.tsx

### Tests for US1 - COMPLETE

- [x] T025 [P] [US1] Create useSSE hook unit tests in tests/unit/hooks/useSSE.test.ts (20 tests)
- [x] T026 [P] [US1] Create useBatchProvisioningEvents integration tests in tests/integration/hooks/useBatchProvisioningEvents.test.tsx (22 tests)
- [x] T027 [P] [US1] Create ConnectionStatus component tests in tests/component/common/ConnectionStatus.test.tsx (27 tests)
- [x] T028 [US1] Create BatchProvisioningSection component tests in tests/component/provisioning/BatchProvisioningSection.test.tsx (13 tests)
- [x] T029 [US1] Create SSE reconnection integration test in tests/integration/hooks/useSSE.reconnection.test.ts (19 tests)
- [x] T030 [US1] Create batch provisioning E2E test in tests/e2e/batch-provisioning.spec.ts (13 tests)

**Checkpoint**: Batch provisioning flow complete. Run `npm run test:e2e -- batch-provisioning` to validate.

---

## Phase 4: User Story 2 - Device Allowlist Management (Priority: P1) - COMPLETE

**Goal**: Enable administrators to manage approved device MAC addresses for security.

**Independent Test**: View allowlist, add entry with MAC validation, remove entry, see usage status.

### Components for US2 - COMPLETE

- [x] T031 [P] [US2] Create AllowlistEntryForm component in src/presentation/components/allowlist/AllowlistEntryForm.tsx
- [x] T032 [P] [US2] Create AllowlistEntryCard component in src/presentation/components/allowlist/AllowlistEntryCard.tsx
- [x] T033 [US2] Create AllowlistSection component in src/presentation/components/allowlist/AllowlistSection.tsx
- [x] T034 [US2] Create useAllowlist hook in src/application/hooks/useAllowlist.ts

### Tests for US2 - COMPLETE

- [x] T035 [P] [US2] Create AllowlistEntryForm component tests in tests/component/allowlist/AllowlistEntryForm.test.tsx (37 tests)
- [x] T036 [US2] Create AllowlistSection component tests in tests/component/allowlist/AllowlistSection.test.tsx (21 tests)

**Checkpoint**: Allowlist management complete. Run `npm test tests/component/allowlist` to validate.

---

## Phase 5: User Story 3 - Session Recovery (Priority: P1) - COMPLETE

**Goal**: Enable field technicians to resume interrupted provisioning sessions.

**Independent Test**: See recoverable sessions banner on load, click resume, session continues.

### Components for US3 - COMPLETE

- [x] T037 [US3] Create useRecoverableSessions hook in src/application/hooks/useRecoverableSessions.ts
- [x] T038 [US3] Create SessionRecoveryBanner component in src/presentation/components/provisioning/SessionRecoveryBanner.tsx

### Tests for US3 - COMPLETE

- [x] T039 [P] [US3] Create useRecoverableSessions hook tests in tests/integration/hooks/useRecoverableSessions.test.tsx (16 tests)
- [x] T040 [US3] Create SessionRecoveryBanner component tests in tests/component/provisioning/SessionRecoveryBanner.test.tsx (30 tests)

**Checkpoint**: Session recovery complete. Banner appears for recoverable sessions.

---

## Phase 6: User Story 4 - Real-Time System Monitoring (Priority: P2) [COMPLETE]

**Goal**: Enable support engineers to see live system health via WebSocket with polling fallback.

**Independent Test**: Open dashboard, see real-time CPU/memory/temp updates, disconnect WebSocket, fallback to polling works.

### Components for US4

- [x] T041 [US4] Create useWebSocket hook in src/application/hooks/useWebSocket.ts
- [x] T042 [US4] Create useSystemMonitor hook in src/application/hooks/useSystemMonitor.ts

### Tests for US4

- [x] T043 [P] [US4] Create useWebSocket hook unit tests in tests/unit/hooks/useWebSocket.test.ts (27 tests)
- [x] T044 [P] [US4] Create useSystemMonitor hook integration tests in tests/integration/hooks/useSystemMonitor.test.tsx (21 tests)
- [x] T045 [US4] Update system monitoring UI to use WebSocket with fallback

**Checkpoint**: WebSocket monitoring complete with polling fallback.

---

## Phase 7: User Story 5 & 6 - API Key & Error Handling (Priority: P1) [COMPLETE]

**Goal**: Secure protected endpoints and provide structured error feedback.

**Independent Test**: Missing API key shows clear error, retryable errors show countdown, correlation IDs visible.

### Components for US5/US6

- [x] T046 [US6] Create ErrorDisplay component in src/presentation/components/common/ErrorDisplay.tsx

### Tests for US5/US6

- [x] T047 [P] [US5] Create API key management unit tests in tests/unit/api/auth.test.ts (43 tests)
- [x] T048 [P] [US6] Create ErrorDisplay component tests in tests/component/common/ErrorDisplay.test.tsx (47 tests)
- [x] T049 [US6] Create V1 client error handling unit tests in tests/unit/api/v1-client.test.ts (36 tests)

**Checkpoint**: Error handling complete. Protected endpoints work correctly.

---

## Phase 8: Polish & Cross-Cutting Concerns [COMPLETE]

**Purpose**: Final integration, accessibility, and comprehensive testing.

- [x] T050 Add accessibility labels to all new components in src/presentation/components/
- [x] T051 Create V1 API integration smoke test in tests/e2e/v1-api-integration.spec.ts

**Checkpoint**: All features complete. Run `npm run test:all` to validate.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - COMPLETE
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 - MVP deliverable
- **Phase 4 (US2)**: Depends on Phase 2 (T014) - Can run parallel with US1
- **Phase 5 (US3)**: Depends on Phase 2 (T015) - Can run parallel with US1/US2
- **Phase 6 (US4)**: Depends on Phase 2 - Can run parallel with US1/US2/US3
- **Phase 7 (US5/US6)**: Depends on Phase 2 (T009, T010) - Can run parallel with others
- **Phase 8 (Polish)**: Depends on all user stories being complete

### User Story Independence

| Story | Can Start After | Required Foundational Tasks |
|-------|-----------------|----------------------------|
| US1 | Phase 2 complete | T011, T013 |
| US2 | T014 complete | T011, T014 |
| US3 | T015 complete | T011, T015 |
| US4 | Phase 2 complete | T011 |
| US5/US6 | T009, T010 complete | T009, T010, T011 |

### Parallel Opportunities

**Phase 2 (Foundational)**:
```
Parallel: T009, T010, T012, T016
Sequential: T011 (after T009, T010) -> T013, T014, T015 (parallel after T011)
```

**Phase 3 (US1)**:
```
Parallel: T019, T020, T021, T022 (independent components)
Sequential: T017 -> T018 -> T023 -> T024
Tests: T025, T026, T027 parallel; T028, T029, T030 after implementation
```

**Phase 4 (US2)**:
```
Parallel: T031, T032 (independent components)
Sequential: T033 (after T031, T032), T034 (after T014)
Tests: T035 parallel with T031, T036 after T033
```

---

## Parallel Example: User Story 1

```bash
# Launch infrastructure tasks in parallel:
Task: T019 [P] [US1] Create ConnectionStatus component
Task: T020 [P] [US1] Create StartSessionForm component
Task: T021 [P] [US1] Create SessionProgress component
Task: T022 [P] [US1] Create ProvisioningCandidateCard component

# Then sequentially:
Task: T017 [US1] Create useSSE hook
Task: T018 [US1] Create useBatchProvisioningEvents hook
Task: T023 [US1] Create BatchProvisioningSection component
Task: T024 [US1] Add Provisioning tab to App navigation
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup - DONE
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Batch Provisioning)
4. **STOP and VALIDATE**: Test batch provisioning E2E
5. Deploy/demo if ready - **THIS IS THE MVP**

### Incremental Delivery

1. ✅ Phase 1 Complete → Types & schemas ready
2. Phase 2 → Foundation ready
3. Add US1 → Batch provisioning works → **MVP Deliverable**
4. Add US2 → Allowlist management works
5. Add US3 → Session recovery works
6. Add US4 → WebSocket monitoring works
7. Add US5/US6 → Error handling complete
8. Phase 8 → Polish & accessibility

### Parallel Team Strategy

With multiple developers after Phase 2:
- Developer A: US1 (Batch Provisioning) - CRITICAL PATH
- Developer B: US2 (Allowlist) + US3 (Recovery)
- Developer C: US4 (WebSocket) + US5/US6 (Auth/Errors)

---

## Success Criteria

| Metric | Target | Command |
|--------|--------|---------|
| All tasks complete | 51/51 | Manual |
| Contract tests pass | 100% | `npm test tests/integration/contracts` |
| Unit test coverage | > 70% | `npm run test:coverage` |
| E2E tests pass | 100% | `npm run test:e2e` |
| No new lint errors | 0 | `npm run lint` |
| Build succeeds | Yes | `npm run build` |
| Bundle size increase | < 20KB | `npm run build` |

---

## Handoff Checklist

After completing all tasks:

- [x] All 51 tasks marked complete
- [x] Contract tests pass for new schemas
- [x] E2E tests cover batch provisioning flow
- [x] Feature flags documented in README
- [x] Error code mappings complete
- [x] Accessibility labels added
- [x] No TypeScript errors
- [ ] No lint warnings
- [x] Build produces valid output (665KB JS, 57KB CSS)
- [ ] Manual testing on Pi hardware
