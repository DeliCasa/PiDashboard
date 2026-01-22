# Tasks: ESP Camera Integration via PiOrchestrator

**Input**: Design documents from `/specs/034-esp-camera-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/v1-cameras-api.yaml

**Tests**: Tests are included as this project has established testing infrastructure (Vitest, Playwright, MSW).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project (this repo)**: `src/`, `tests/` at repository root
- Follows hexagonal architecture: `domain/types/`, `infrastructure/api/`, `application/hooks/`, `presentation/components/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: API client, schemas, and utilities needed by all user stories

- [x] T001 [P] Create Zod schemas for V1 cameras API in src/infrastructure/api/v1-cameras-schemas.ts
- [x] T002 [P] Create base64 download utility in src/lib/download.ts
- [x] T003 [P] Create useDocumentVisibility hook in src/application/hooks/useDocumentVisibility.ts
- [x] T004 Create V1 cameras API client in src/infrastructure/api/v1-cameras.ts (uses schemas from T001)
- [x] T005 Add camera-specific error codes to src/infrastructure/api/errors.ts (CAMERA_OFFLINE, CAMERA_NOT_FOUND, etc.)
- [x] T006 Update src/lib/queryClient.ts with cameraById query key factory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 [P] Create MSW handlers for V1 cameras endpoints in tests/mocks/v1-cameras-handlers.ts
- [x] T008 [P] Unit test V1 cameras API client in tests/unit/api/v1-cameras.test.ts
- [x] T009 [P] Unit test download utility in tests/unit/lib/download.test.ts
- [x] T010 [P] Unit test useDocumentVisibility hook in tests/unit/hooks/useDocumentVisibility.test.ts
- [x] T010a [P] Unit test error categorization and retry logic (FR-009-011) in tests/unit/api/camera-errors.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Camera List (Priority: P1) MVP

**Goal**: Display all registered cameras with status, health indicator, and last seen timestamp. Poll every 10 seconds, pause when tab hidden.

**Independent Test**: Navigate to cameras section, verify cameras display with status badges and health indicators. Verify polling pauses when tab hidden.

### Implementation for User Story 1

- [x] T011 [US1] Update useCameras hook to use V1 API in src/application/hooks/useCameras.ts
- [x] T012 [US1] Add visibility-aware polling to useCameras using useDocumentVisibility
- [x] T013 [US1] Update CameraCard component for V1 data shape in src/presentation/components/cameras/CameraCard.tsx
- [x] T014 [US1] Update CameraSection to handle loading/error/empty states in src/presentation/components/cameras/CameraSection.tsx
- [x] T015 [US1] Add empty state "No cameras connected" message to CameraSection
- [x] T016 [US1] Add error state with "Retry" button to CameraSection

### Tests for User Story 1

- [x] T017 [P] [US1] Component test CameraSection loading state in tests/component/cameras/CameraSection.test.tsx
- [x] T018 [P] [US1] Component test CameraSection empty state in tests/component/cameras/CameraSection.test.tsx
- [x] T019 [P] [US1] Component test CameraSection error state in tests/component/cameras/CameraSection.test.tsx
- [x] T020 [US1] E2E test camera list displays with MSW in tests/e2e/cameras.spec.ts

**Checkpoint**: User Story 1 complete - cameras list functional and testable independently

---

## Phase 4: User Story 2 - Capture Image from Camera (Priority: P2)

**Goal**: Capture still image from camera, display base64 JPEG in modal, provide download option.

**Independent Test**: Click "Capture" on online camera, verify modal shows loading then image, verify download works.

### Implementation for User Story 2

- [x] T021 [US2] Create useCameraCapture mutation hook in src/application/hooks/useCameraCapture.ts
- [x] T022 [US2] Create CaptureModal component in src/presentation/components/cameras/CaptureModal.tsx
- [x] T023 [US2] Update CapturePreview to render base64 images in src/presentation/components/cameras/CapturePreview.tsx
- [x] T024 [US2] Add download button using download.ts utility to CaptureModal
- [x] T025 [US2] Update CameraSection capture flow to use new CaptureModal
- [x] T026 [US2] Add capture timeout handling (30s) with error message
- [x] T027 [US2] Disable capture button for offline cameras with warning tooltip

### Tests for User Story 2

- [x] T028 [P] [US2] Component test CaptureModal loading state in tests/component/cameras/CapturePreview.test.tsx
- [x] T029 [P] [US2] Component test CaptureModal image display in tests/component/cameras/CapturePreview.test.tsx
- [x] T030 [P] [US2] Component test CaptureModal download button in tests/component/cameras/CapturePreview.test.tsx
- [x] T031 [US2] E2E test capture flow end-to-end in tests/e2e/cameras.spec.ts

**Checkpoint**: User Story 2 complete - capture and download functional independently

---

## Phase 5: User Story 3 - View Camera Details (Priority: P3)

**Goal**: Show detailed camera info in modal: status, health metrics, IP, MAC, last error.

**Independent Test**: Click "View" on camera, verify detail modal shows all information fields.

### Implementation for User Story 3

- [x] T032 [US3] Create useCamera hook for single camera in src/application/hooks/useCamera.ts
- [x] T033 [US3] Create CameraDetail modal component in src/presentation/components/cameras/CameraDetail.tsx
- [x] T034 [US3] Add "View" button to CameraCard component
- [x] T035 [US3] Add health metrics display (WiFi signal, memory, uptime) to CameraDetail
- [x] T036 [US3] Add last error display to CameraDetail when present
- [x] T036a [US3] Add last capture preview thumbnail to CameraDetail (display if health.last_capture exists)
- [x] T037 [US3] Add 404 state when camera not found with link back to list
- [x] T038 [US3] Wire CameraDetail to CameraSection with dialog state management

### Tests for User Story 3

- [x] T039 [P] [US3] Component test CameraDetail health metrics display in tests/component/cameras/CameraDetail.test.tsx
- [x] T040 [P] [US3] Component test CameraDetail 404 state in tests/component/cameras/CameraDetail.test.tsx
- [x] T041 [US3] E2E test camera detail flow in tests/e2e/cameras.spec.ts

**Checkpoint**: User Story 3 complete - camera details viewable independently

---

## Phase 6: User Story 4 - Reboot Camera (Priority: P4)

**Goal**: Allow remote camera reboot with confirmation dialog and feedback.

**Independent Test**: Click "Reboot", verify confirmation dialog appears, confirm and verify success toast.

### Implementation for User Story 4

- [x] T042 [US4] Create useRebootCamera mutation hook in src/application/hooks/useCameras.ts (consolidated)
- [x] T043 [US4] Create RebootDialog confirmation component in src/presentation/components/cameras/RebootDialog.tsx
- [x] T044 [US4] Add AlertDialog with warning message to RebootDialog
- [x] T045 [US4] Add button disabled state during reboot request
- [x] T046 [US4] Add success/error toast feedback using sonner
- [x] T047 [US4] Wire RebootDialog to CameraCard "Reboot" button
- [x] T048 [US4] Handle "rebooting" status display in CameraCard

### Tests for User Story 4

- [x] T049 [P] [US4] Component test RebootDialog confirmation flow in tests/component/cameras/RebootDialog.test.tsx
- [x] T050 [P] [US4] Component test RebootDialog loading state in tests/component/cameras/RebootDialog.test.tsx
- [x] T051 [US4] E2E test reboot flow in tests/e2e/cameras.spec.ts

**Checkpoint**: User Story 4 complete - reboot functional independently

---

## Phase 7: User Story 5 - View Diagnostics (Priority: P5)

**Goal**: Display raw diagnostic JSON with search/filter and copy functionality.

**Independent Test**: Navigate to diagnostics, verify JSON displays with search and copy button works.

### Implementation for User Story 5

- [x] T052 [US5] Create useCameraDiagnostics hook in src/application/hooks/useCameras.ts (consolidated)
- [x] T053 [US5] Create DiagnosticsView component in src/presentation/components/cameras/DiagnosticsView.tsx
- [x] T054 [US5] Add warning banner "For debugging purposes only" to DiagnosticsView
- [x] T055 [US5] Add JSON display with syntax highlighting using pre/code tags
- [x] T056 [US5] Add search/filter input with regex matching
- [x] T057 [US5] Add "Copy JSON" button using navigator.clipboard API
- [x] T058 [US5] Add copy success feedback toast
- [x] T059 [US5] Add DiagnosticsView to CameraSection or as collapsible section

### Tests for User Story 5

- [x] T060 [P] [US5] Component test DiagnosticsView JSON rendering in tests/component/cameras/DiagnosticsView.test.tsx
- [x] T061 [P] [US5] Component test DiagnosticsView search filter in tests/component/cameras/DiagnosticsView.test.tsx
- [x] T062 [P] [US5] Component test DiagnosticsView copy button in tests/component/cameras/DiagnosticsView.test.tsx
- [x] T063 [US5] E2E test diagnostics page in tests/e2e/cameras.spec.ts

**Checkpoint**: User Story 5 complete - diagnostics viewable independently

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T064 [P] Run full test suite and fix any failures
- [x] T065 [P] Add accessibility labels to all new modals and buttons
- [ ] T066 [P] Run axe-core accessibility audit in E2E tests
- [x] T067 Verify all error states show user-friendly messages per FR-005
- [ ] T068 Performance check: verify camera list loads < 5s per SC-001
- [ ] T069 Performance check: verify capture completes < 30s per SC-003
- [ ] T070 Run quickstart.md validation against live Pi (manual)
- [x] T071 Deprecate old cameras.ts API client with @deprecated JSDoc
- [x] T072 Update CLAUDE.md with feature completion notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T006) completion
- **User Stories (Phase 3-7)**: All depend on Foundational (Phase 2) completion
  - User stories can proceed in priority order (P1 → P2 → P3 → P4 → P5)
  - US2, US3, US4 can start in parallel after US1 if team capacity allows
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (P1) | Foundational | Phase 2 complete |
| US2 (P2) | Foundational + download.ts | Phase 2 complete |
| US3 (P3) | Foundational | Phase 2 complete |
| US4 (P4) | Foundational | Phase 2 complete |
| US5 (P5) | Foundational | Phase 2 complete |

### Within Each User Story

- Implementation tasks before test tasks (tests verify implementation)
- Hooks before components (components use hooks)
- Core component before integration (CaptureModal before wiring to CameraSection)

### Parallel Opportunities

**Setup Phase (3 parallel tracks):**
```
Track A: T001 (schemas)
Track B: T002 (download.ts)
Track C: T003 (visibility hook)
Then: T004 (API client - needs T001), T005, T006
```

**Foundational Phase (4 parallel tracks):**
```
Track A: T007 (MSW handlers)
Track B: T008 (API tests)
Track C: T009 (download tests)
Track D: T010 (visibility tests)
```

**User Story Tests (parallel within each story):**
```
US1: T017, T018, T019 can run in parallel
US2: T028, T029, T030 can run in parallel
US3: T039, T040 can run in parallel
US4: T049, T050 can run in parallel
US5: T060, T061, T062 can run in parallel
```

---

## Parallel Example: Setup Phase

```bash
# Launch all setup tasks that can run in parallel:
Task: "Create Zod schemas in src/infrastructure/api/v1-cameras-schemas.ts"
Task: "Create download utility in src/lib/download.ts"
Task: "Create useDocumentVisibility hook in src/application/hooks/useDocumentVisibility.ts"

# Then sequential tasks:
Task: "Create V1 cameras API client in src/infrastructure/api/v1-cameras.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T010)
3. Complete Phase 3: User Story 1 (T011-T020)
4. **STOP and VALIDATE**: Camera list displays, polling works, tab visibility pauses polling
5. Deploy/demo if ready - users can now see their cameras!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Camera List) → Test → Deploy (MVP!)
3. Add US2 (Capture) → Test → Deploy
4. Add US3 (Details) → Test → Deploy
5. Add US4 (Reboot) → Test → Deploy
6. Add US5 (Diagnostics) → Test → Deploy
7. Polish phase → Final release

### Suggested Scope

| Phase | Tasks | Story Value |
|-------|-------|-------------|
| MVP | T001-T020 | Users can see all cameras with status |
| +Capture | T021-T031 | Users can capture and download images |
| +Details | T032-T041 | Users can view detailed camera info |
| +Reboot | T042-T051 | Users can remotely reboot cameras |
| +Diagnostics | T052-T063 | Advanced users can debug issues |
| Full | T064-T072 | Production-ready with polish |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Existing camera infrastructure (CameraSection, CameraCard) will be updated, not replaced
- V1 API client created alongside existing cameras.ts to allow gradual migration
