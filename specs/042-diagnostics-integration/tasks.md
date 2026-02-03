# Tasks: PiOrchestrator Diagnostics Integration

**Feature**: 042-diagnostics-integration
**Input**: Design documents from `/specs/042-diagnostics-integration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: REQUIRED per Constitution III (Test Discipline)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Following hexagonal architecture from plan.md:
- Domain: `src/domain/types/`
- Application: `src/application/hooks/`
- Infrastructure: `src/infrastructure/api/`
- Presentation: `src/presentation/components/`
- Tests: `tests/` (unit, component, integration, e2e)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create base schemas and mock infrastructure needed by all user stories

- [X] T001 [P] Create camera diagnostics Zod schemas in src/infrastructure/api/camera-diagnostics-schemas.ts
- [X] T002 [P] Create MSW mock fixtures in tests/mocks/diagnostics/fixtures.ts
- [X] T003 [P] Create MSW handlers for camera diagnostics in tests/mocks/handlers/camera-diagnostics.ts
- [X] T004 Register camera diagnostics handlers in tests/integration/mocks/handlers.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create domain types for camera diagnostics in src/domain/types/camera-diagnostics.ts
- [X] T006 [P] Create camera diagnostics API client in src/infrastructure/api/camera-diagnostics.ts
- [X] T007 [P] Create evidence API client in src/infrastructure/api/evidence.ts
- [X] T008 [P] Create sessions API client in src/infrastructure/api/sessions.ts (already existed from Feature 038)
- [X] T009 Create shared ConnectionQualityBadge component in src/presentation/components/diagnostics/ConnectionQualityBadge.tsx
- [X] T010 Export all diagnostics components from src/presentation/components/diagnostics/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Camera Diagnostics Panel (Priority: P1) 🎯 MVP

**Goal**: Display camera health metrics, firmware version, and network stats from `/api/v1/cameras/:id/diagnostics`

**Independent Test**: Navigate to camera detail → Open diagnostics panel → Verify health metrics display with connection quality badge

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Contract test for CameraDiagnosticsSchema in tests/integration/contracts/camera-diagnostics.contract.test.ts
- [X] T012 [P] [US1] Unit test for camera diagnostics API client in tests/unit/api/camera-diagnostics.test.ts
- [X] T013 [P] [US1] Hook test for useCameraDiagnostics in tests/integration/hooks/useCameraDiagnostics.test.tsx
- [X] T014 [P] [US1] Component test for DiagnosticsPanel in tests/component/diagnostics/DiagnosticsPanel.test.tsx

### Implementation for User Story 1

- [X] T015 [US1] Create useCameraDiagnostics hook in src/application/hooks/useCameraDiagnostics.ts
- [X] T016 [US1] Create DiagnosticsPanel component in src/presentation/components/diagnostics/DiagnosticsPanel.tsx
- [X] T017 [US1] Create DiagnosticsUnavailable fallback component in src/presentation/components/diagnostics/DiagnosticsUnavailable.tsx
- [~] T018 [US1] Integrate DiagnosticsPanel with camera detail view (deferred - existing CameraDetail already has health metrics)
- [X] T019 [US1] Add data-testid attributes for E2E testing in DiagnosticsPanel (done in T016)

**Checkpoint**: Camera diagnostics panel displays health metrics - verify with `npm test -- tests/integration/hooks/useCameraDiagnostics.test.tsx`

---

## Phase 4: User Story 2 - Evidence Capture (Priority: P2)

**Goal**: Capture evidence image via POST, display preview with download option

**Independent Test**: Click "Capture Evidence" button → Verify loading state → Verify image displays → Download image

### Tests for User Story 2

- [X] T020 [P] [US2] Contract test for CapturedEvidenceSchema in tests/integration/contracts/camera-diagnostics.contract.test.ts (included in T011)
- [X] T021 [P] [US2] Unit test for evidence API client in tests/unit/api/evidence.test.ts (already existed from 038)
- [ ] T022 [P] [US2] Hook test for useEvidenceCapture in tests/integration/hooks/useEvidence.test.tsx
- [ ] T023 [P] [US2] Component test for EvidenceCapture in tests/component/diagnostics/EvidenceCapture.test.tsx

### Implementation for User Story 2

- [X] T024 [US2] Create useEvidenceCapture mutation hook in src/application/hooks/useEvidence.ts
- [ ] T025 [US2] Create EvidenceCapture component in src/presentation/components/diagnostics/EvidenceCapture.tsx
- [ ] T026 [US2] Create EvidencePreview modal component in src/presentation/components/diagnostics/EvidencePreview.tsx
- [ ] T027 [US2] Implement image download functionality in EvidenceCapture
- [ ] T028 [US2] Add error handling for capture failures (timeout, offline camera)
- [ ] T029 [US2] Add data-testid attributes for E2E testing in EvidenceCapture

**Checkpoint**: Evidence capture works independently - verify with `npm test -- tests/integration/hooks/useEvidence.test.tsx`

---

## Phase 5: User Story 3 - Session Detail View (Priority: P3)

**Goal**: Display session metadata and capture history from `/api/v1/sessions/:id`

**Independent Test**: Navigate to session detail → Verify session info displays → Verify evidence list shows capture history

### Tests for User Story 3

- [ ] T030 [P] [US3] Contract test for SessionDetailSchema in tests/integration/contracts/camera-diagnostics.contract.test.ts
- [ ] T031 [P] [US3] Unit test for sessions API client in tests/unit/api/sessions.test.ts
- [ ] T032 [P] [US3] Hook test for useSessionDetail in tests/integration/hooks/useSessions.test.tsx
- [ ] T033 [P] [US3] Component test for SessionDetail in tests/component/diagnostics/SessionDetail.test.tsx

### Implementation for User Story 3

- [ ] T034 [US3] Create useSessionDetail hook in src/application/hooks/useSessions.ts
- [ ] T035 [US3] Create SessionDetail component in src/presentation/components/diagnostics/SessionDetail.tsx
- [ ] T036 [US3] Create EvidenceList subcomponent in src/presentation/components/diagnostics/EvidenceList.tsx
- [ ] T037 [US3] Integrate SessionDetail with existing session views
- [ ] T038 [US3] Add data-testid attributes for E2E testing in SessionDetail

**Checkpoint**: Session detail view works independently - verify with `npm test -- tests/integration/hooks/useSessions.test.tsx`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, integration, and final validation

- [ ] T039 [P] E2E test for camera diagnostics flow in tests/e2e/diagnostics.spec.ts
- [ ] T040 [P] E2E test for evidence capture flow in tests/e2e/diagnostics.spec.ts
- [ ] T041 [P] E2E test for session detail flow in tests/e2e/diagnostics.spec.ts
- [ ] T042 Add graceful degradation for 404/503 responses per Feature 037 patterns
- [ ] T043 Verify tab visibility handling (pause polling when hidden)
- [ ] T044 Run quickstart.md validation - verify development workflow works
- [ ] T045 Update CLAUDE.md Active Technologies section for Feature 042

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T003) completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (P1) | Phase 2 complete | T010 |
| US2 (P2) | Phase 2 complete | T010 (parallel with US1) |
| US3 (P3) | Phase 2 complete | T010 (parallel with US1/US2) |

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. API client before hooks
3. Hooks before components
4. Core implementation before integration
5. Story complete before Polish phase

### Parallel Opportunities

**Phase 1 (all parallel)**:
- T001, T002, T003 can run simultaneously

**Phase 2 (partial parallel)**:
- T006, T007, T008 can run in parallel after T005

**User Story Tests (all parallel within story)**:
- T011-T014 (US1 tests) can run simultaneously
- T020-T023 (US2 tests) can run simultaneously
- T030-T033 (US3 tests) can run simultaneously

**Cross-Story Parallel**:
- US1, US2, US3 can all proceed in parallel after Phase 2

---

## Parallel Example: Phase 2 + User Story 1

```bash
# After T001-T004 complete, launch foundation in parallel:
Task: "Create domain types in src/domain/types/camera-diagnostics.ts"  # T005 first
# Then parallel:
Task: "Create camera diagnostics API client in src/infrastructure/api/camera-diagnostics.ts"
Task: "Create evidence API client in src/infrastructure/api/evidence.ts"
Task: "Create sessions API client in src/infrastructure/api/sessions.ts"

# After Phase 2 (T010) complete, launch US1 tests in parallel:
Task: "Contract test for CameraDiagnosticsSchema"
Task: "Unit test for camera diagnostics API client"
Task: "Hook test for useCameraDiagnostics"
Task: "Component test for DiagnosticsPanel"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T010)
3. Complete Phase 3: User Story 1 (T011-T019)
4. **STOP and VALIDATE**: Test diagnostics panel independently
5. Deploy/demo if ready

**MVP Scope**: Camera diagnostics panel with health metrics display

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP!)
3. Add User Story 2 → Test independently → Deploy (Evidence capture)
4. Add User Story 3 → Test independently → Deploy (Session detail)
5. Polish phase → Full feature complete

### Blocking Dependency Note

**⚠️ PiOrchestrator endpoints not yet implemented**

Per research.md, the feature proceeds with MSW mocks. When PiOrchestrator implements:
- `GET /api/v1/cameras/:id/diagnostics`
- `POST /api/v1/cameras/:id/evidence`
- `GET /api/v1/sessions/:id`

...only need to verify mocks match actual responses and remove MSW overrides for production.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All components must have data-testid attributes per constitution
