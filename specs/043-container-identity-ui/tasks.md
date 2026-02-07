# Tasks: Container Identity Model UI

**Input**: Design documents from `/specs/043-container-identity-ui/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: REQUIRED - Constitution III (Test Discipline) mandates tests for all features.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Implementation Context

This feature has **existing source implementation** - all UI components, API client, hooks, and schemas exist. Tasks focus on filling Constitution-mandated testing and documentation gaps:

| Existing | Missing |
|----------|---------|
| ✅ src/domain/types/containers.ts | ❌ tests/mocks/container-mocks.ts |
| ✅ src/infrastructure/api/v1-containers.ts | ❌ tests/mocks/v1-containers-handlers.ts |
| ✅ src/infrastructure/api/v1-containers-schemas.ts | ❌ tests/integration/contracts/containers.contract.test.ts |
| ✅ src/application/hooks/useContainers.ts | ❌ tests/integration/hooks/useContainers.test.ts |
| ✅ src/presentation/components/containers/* | ❌ tests/component/containers/*.test.tsx |
| ✅ src/App.tsx (tab integration) | ❌ tests/e2e/containers.spec.ts |
| - | ❌ docs/admin/container-management.md |

---

## Phase 1: Setup (Test Infrastructure)

**Purpose**: Create shared mock data and MSW handlers required by all test phases

- [x] T001 [P] Create container mock data fixtures in tests/mocks/container-mocks.ts
- [x] T002 Create MSW handlers for V1 containers API in tests/mocks/v1-containers-handlers.ts

**Checkpoint**: Mock infrastructure ready - test phases can now begin in parallel

---

## Phase 2: Foundational (Contract Tests)

**Purpose**: Validate all Zod schemas match expected API responses - MUST complete before component/hook tests

**⚠️ CRITICAL**: Contract tests verify mocks match schemas. Other tests depend on valid mocks.

- [x] T003 Contract tests for Container schemas in tests/integration/contracts/containers.contract.test.ts

**Checkpoint**: Contract tests passing - mock data validated against schemas

---

## Phase 3: User Story 1 - View Containers with Label-First Display (Priority: P1) 🎯 MVP

**Goal**: Verify existing UI displays labels prominently and IDs secondarily

**Independent Test**: Load container list, verify label-first display pattern works for labeled and unlabeled containers

### Tests for User Story 1

- [x] T004 [P] [US1] Component test for ContainerCard label-first display in tests/component/containers/ContainerCard.test.tsx
- [x] T005 [P] [US1] Component test for ContainerSection loading/error/empty states in tests/component/containers/ContainerSection.test.tsx
- [x] T006 [P] [US1] Component test for EmptyState in tests/component/containers/EmptyState.test.tsx

### Verification for User Story 1

- [x] T007 [US1] Verify existing ContainerCard displays label prominently, ID secondary in src/presentation/components/containers/ContainerCard.tsx
- [x] T008 [US1] Verify "Unnamed Container" placeholder for missing labels in ContainerCard and ContainerDetail

**Checkpoint**: US1 - Label-first display verified and tested

---

## Phase 4: User Story 2 - Create Container with Optional Label (Priority: P1)

**Goal**: Test container creation flow with optional label and description

**Independent Test**: Click Create, submit with/without label, verify new container appears

### Tests for User Story 2

- [x] T009 [P] [US2] Component test for CreateContainerDialog in tests/component/containers/CreateContainerDialog.test.tsx
- [x] T010 [P] [US2] Hook test for useCreateContainer mutation in tests/integration/hooks/useContainers.test.ts

**Checkpoint**: US2 - Container creation tested

---

## Phase 5: User Story 3 - Assign Camera to Container Position (Priority: P1)

**Goal**: Test camera assignment dialog and position selection

**Independent Test**: Open container, click empty slot, select camera, verify assignment

### Tests for User Story 3

- [x] T011 [P] [US3] Component test for AssignCameraDialog in tests/component/containers/AssignCameraDialog.test.tsx
- [x] T012 [P] [US3] Component test for PositionSlot empty/occupied states in tests/component/containers/PositionSlot.test.tsx
- [x] T013 [US3] Hook test for useAssignCamera and useUnassignedCameras in tests/integration/hooks/useContainers.test.ts (extend existing file)

**Checkpoint**: US3 - Camera assignment tested

---

## Phase 6: User Story 4 - Unassign Camera from Container (Priority: P2)

**Goal**: Test camera unassignment from position slots

**Independent Test**: View container with cameras, click unassign, verify camera removed

### Tests for User Story 4

- [x] T014 [US4] Component test for PositionSlot unassign action (extend T012 tests) in tests/component/containers/PositionSlot.test.tsx
- [x] T015 [US4] Hook test for useUnassignCamera mutation in tests/integration/hooks/useContainers.test.ts (extend existing file)

**Checkpoint**: US4 - Camera unassignment tested

---

## Phase 7: User Story 5 - Edit Container Label and Description (Priority: P2)

**Goal**: Test container edit dialog and update flow

**Independent Test**: Open container detail, click Edit, change label, verify update

### Tests for User Story 5

- [x] T016 [US5] Component test for EditContainerDialog in tests/component/containers/EditContainerDialog.test.tsx
- [x] T017 [US5] Hook test for useUpdateContainer mutation in tests/integration/hooks/useContainers.test.ts (extend existing file)

**Checkpoint**: US5 - Container editing tested

---

## Phase 8: User Story 6 - Delete Empty Container (Priority: P3)

**Goal**: Test delete flow with empty container guard

**Independent Test**: Create empty container, delete it, verify removal. Try to delete non-empty, verify blocked.

### Tests for User Story 6

- [x] T018 [P] [US6] Component test for ContainerDetail delete flow in tests/component/containers/ContainerDetail.test.tsx
- [x] T019 [US6] Hook test for useDeleteContainer mutation in tests/integration/hooks/useContainers.test.ts (extend existing file)

**Checkpoint**: US6 - Container deletion tested

---

## Phase 9: User Story 7 - Monitor Camera Status in Containers (Priority: P2)

**Goal**: Test online/offline status indicators in container views

**Independent Test**: View container with mix of online/offline cameras, verify visual differentiation

### Tests for User Story 7

- [x] T020 [US7] Component test for PositionSlot status indicators (extend T012 tests) in tests/component/containers/PositionSlot.test.tsx
- [x] T021 [US7] Component test for ContainerCard online/offline counts in tests/component/containers/ContainerCard.test.tsx (extend existing file)

**Checkpoint**: US7 - Status monitoring tested

---

## Phase 10: E2E Tests (Critical Flows)

**Purpose**: End-to-end validation of complete user journeys

- [x] T022 [P] E2E test for container list and create flow in tests/e2e/containers.spec.ts
- [x] T023 [P] E2E test for camera assignment flow in tests/e2e/containers.spec.ts (extend)
- [x] T024 E2E test for error states and edge cases in tests/e2e/containers.spec.ts (extend)

**Checkpoint**: E2E coverage complete for critical paths

---

## Phase 11: Polish & Documentation

**Purpose**: Admin documentation and final verification

- [x] T025 Create admin documentation in docs/admin/container-management.md
- [x] T026 Verify no hardcoded semantic IDs (search for "fridge-1" patterns in src/ and tests/)
- [x] T027 Run full test suite and verify coverage thresholds (npm run test:coverage)
- [x] T028 Update API-TYPE-CONTRACTS.md with container schema documentation in docs/contracts/API-TYPE-CONTRACTS.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Contract Tests)**: Depends on Phase 1 mocks - BLOCKS all other tests
- **Phase 3-9 (User Story Tests)**: All depend on Phase 2 contract tests passing
- **Phase 10 (E2E)**: Depends on MSW handlers from Phase 1
- **Phase 11 (Polish)**: Depends on all tests passing

### User Story Dependencies

All user stories are **independently testable** after Phase 2 completes:

| Story | Can Start After | Dependencies |
|-------|-----------------|--------------|
| US1 | Phase 2 | None |
| US2 | Phase 2 | None |
| US3 | Phase 2 | None |
| US4 | Phase 2 | None (US3 optional) |
| US5 | Phase 2 | None |
| US6 | Phase 2 | None |
| US7 | Phase 2 | None |

### Within Each User Story

- Tests MUST be written and pass
- Source code already exists - verify it meets requirements
- Story complete before moving to next priority

### Parallel Opportunities

Phase 1:
- T001, T002 can run in parallel

Phase 3-9 (after Phase 2 complete):
- All user story phases can run in parallel
- All [P] marked tasks within a phase can run in parallel

---

## Parallel Examples

### After Phase 2 - Multiple Story Tests

```bash
# Launch tests for multiple user stories in parallel:
Task: "Component test for ContainerCard (US1)"
Task: "Component test for CreateContainerDialog (US2)"
Task: "Component test for AssignCameraDialog (US3)"
```

### Within Phase 3 (US1)

```bash
# Launch all US1 component tests together:
Task: "Component test for ContainerCard in tests/component/containers/ContainerCard.test.tsx"
Task: "Component test for ContainerSection in tests/component/containers/ContainerSection.test.tsx"
Task: "Component test for EmptyState in tests/component/containers/EmptyState.test.tsx"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (mocks + handlers)
2. Complete Phase 2: Contract tests
3. Complete Phase 3: User Story 1 tests
4. **STOP and VALIDATE**: Run `npm test` - US1 tests should pass
5. Deploy/demo container list view

### Incremental Delivery

1. Setup + Contract Tests → Foundation ready
2. Add US1-3 tests (P1 stories) → Core functionality validated
3. Add US4-7 tests (P2/P3 stories) → Full coverage
4. Add E2E tests → Integration validation
5. Add documentation → SC-007 complete

### Task Count by User Story

| User Story | Test Tasks | Total |
|------------|------------|-------|
| Setup | 2 | 2 |
| Foundation | 1 | 1 |
| US1 (P1) | 5 | 5 |
| US2 (P1) | 2 | 2 |
| US3 (P1) | 3 | 3 |
| US4 (P2) | 2 | 2 |
| US5 (P2) | 2 | 2 |
| US6 (P3) | 2 | 2 |
| US7 (P2) | 2 | 2 |
| E2E | 3 | 3 |
| Polish | 4 | 4 |
| **Total** | **28** | **28** |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- Source code exists - tasks focus on tests and documentation
- All tests follow existing patterns in tests/component/cameras/
- MSW handlers follow pattern in tests/mocks/v1-cameras-handlers.ts
- Contract tests follow pattern in tests/integration/contracts/
- Verify tests fail before implementation is irrelevant - code exists
- Commit after each phase or logical group
- Stop at any checkpoint to validate independently
