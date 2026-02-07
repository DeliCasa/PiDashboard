# Tasks: Evidence UI & CI Remediation

**Input**: Design documents from `/specs/044-evidence-ci-remediation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Tests are included only where new functionality is added. Most CI remediation tasks don't require new tests.

**Organization**: Tasks grouped by user story. US3 (CI Pipeline Stability) is prioritized first since it unblocks development workflow.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4, US5)

## Path Conventions

- **Frontend only**: `src/`, `tests/` at repository root
- **CI workflows**: `.github/workflows/`
- **Nix config**: `flake.nix` at repository root

---

## Phase 1: Setup

**Purpose**: Verify current state and prepare for changes

- [x] T001 Verify current branch is `044-evidence-ci-remediation`
- [x] T002 Run `npm install` to ensure dependencies are current
- [x] T003 [P] Run `npm run lint` and capture current 21 error baseline
- [x] T004 [P] Run `npm test` to verify existing tests pass

**Checkpoint**: Baseline captured, ready to begin remediation

---

## Phase 2: Foundational (CI Stability First)

**Purpose**: Fix CI issues that block reliable PR merges. Must complete before feature work.

**⚠️ CRITICAL**: CI must be green before Evidence UI work begins

- [x] T005 Update Node.js version in `.github/workflows/handoff-check.yml` from 20 to 22
- [x] T006 [P] Add `VITEST_MAX_WORKERS: 1` environment variable to `.github/workflows/test.yml` unit-tests job
- [x] T007 [P] Update Playwright version in `flake.nix` to match package.json (1.57.0)
- [x] T008 Run `nix flake update` to apply flake.nix changes

**Checkpoint**: CI configuration updated, ready for lint fixes

---

## Phase 3: User Story 3 - CI Pipeline Stability (Priority: P1) 🎯 MVP ✅ COMPLETE

**Goal**: All CI checks pass reliably with zero lint errors

**Independent Test**: Create a PR and verify all checks pass without manual intervention

### Lint Fix: Fast Refresh Violation

- [x] T009 [US3] Create utility file `src/lib/connection-quality.ts` with `getConnectionQuality()` function
- [x] T010 [US3] Update `src/presentation/components/diagnostics/ConnectionQualityBadge.tsx` to import from new utility

### Lint Fix: Unused Imports in Container Tests

- [x] T011 [P] [US3] Remove unused `fireEvent` import from `tests/component/containers/AssignCameraDialog.test.tsx`
- [x] T012 [P] [US3] Remove unused `fireEvent`, `waitFor` imports from `tests/component/containers/CreateContainerDialog.test.tsx`
- [x] T013 [P] [US3] Remove unused `fireEvent`, `waitFor` imports from `tests/component/containers/EditContainerDialog.test.tsx`

### Lint Fix: Unused Variables in Test Files

- [x] T014 [P] [US3] Remove unused `container` destructuring from `tests/component/containers/EmptyState.test.tsx:86`
- [x] T015 [P] [US3] Remove unused `container` destructuring from `tests/component/containers/PositionSlot.test.tsx:383,394`
- [x] T016 [P] [US3] Replace unused `_` bindings with `void` in `tests/integration/contracts/camera-diagnostics.contract.test.ts:291,297,341,347`

### Lint Fix: Unused Mock Fixtures

- [x] T017 [P] [US3] Remove unused imports (`mockContainerListResponse`, `mockContainerResponse`, `mockAssignmentResponse`) from `tests/integration/hooks/useContainers.test.ts:32-34`
- [x] T018 [P] [US3] Remove unused exports (`mockCapturedEvidenceResponse`, `mockSessionDetailResponse`) from `tests/mocks/handlers/camera-diagnostics.ts:11-12`
- [x] T019 [P] [US3] Remove unused exports (`mockContainerDetailWithCamera`, `mockCameraAssignmentOnline`, `mockContainerListResponse`) from `tests/mocks/v1-containers-handlers.ts:18-20`

### Verification

- [x] T020 [US3] Run `npm run lint` and verify 0 errors
- [x] T021 [US3] Run `npm run build` and verify no Fast Refresh warnings
- [x] T022 [US3] Run `VITEST_MAX_WORKERS=1 npm test` and verify all tests pass

**Checkpoint**: CI pipeline is stable. Lint passes. Tests pass. Ready for feature work.

---

## Phase 4: User Story 1 - Capture Evidence from Camera (Priority: P1) ✅ COMPLETE

**Goal**: Admin can capture evidence images from cameras and see them immediately

**Independent Test**: Open camera detail, click "Capture Evidence", verify image captured and displayed

### Implementation

- [x] T023 [US1] Verify `useEvidenceCapture()` hook exists in `src/application/hooks/useEvidence.ts`
- [x] T024 [US1] Check if evidence capture button exists in camera detail view (search for `capture-evidence-btn` data-testid)
- [x] T025 [US1] If missing, add "Capture Evidence" button to camera detail component with loading state and disabled-during-capture behavior
- [x] T026 [US1] Ensure capture button calls `captureFromCamera()` via `useEvidenceCapture()` hook
- [x] T027 [US1] Verify error handling shows user-friendly toast on capture failure
- [x] T028 [US1] Add `data-testid="capture-evidence-btn"` attribute if not present

### Testing (if button added)

- [x] T029 [P] [US1] Add component test for capture button loading state in `tests/component/cameras/CameraDetail.test.tsx`
- [x] T030 [P] [US1] Add component test for capture button error handling in `tests/component/cameras/CameraDetail.test.tsx`

**Checkpoint**: Evidence capture works from camera detail. Button shows loading state. Errors handled gracefully.

---

## Phase 5: User Story 2 - View Session Evidence Gallery (Priority: P1) ✅ COMPLETE

**Goal**: Admin can view and filter evidence in the gallery

**Independent Test**: Navigate to evidence gallery, view thumbnails, filter by camera, verify filtering works

### Camera Filter Enhancement (FR-008)

- [x] T031 [US2] Add `filterCameraId` state to `src/presentation/components/diagnostics/EvidencePanel.tsx`
- [x] T032 [US2] Add camera filter dropdown using shadcn Select component in `EvidencePanel.tsx`
- [x] T033 [US2] Wire filter state to client-side evidence filtering (API doesn't support cameraId param)
- [x] T034 [US2] Add `data-testid="evidence-camera-filter"` attribute to filter dropdown

### Download Verification (FR-003)

- [x] T035 [US2] Verify download button exists in `src/presentation/components/diagnostics/EvidencePreviewModal.tsx`
- [x] T036 [US2] Download button already wired via `handleDownload()` with presigned URL
- [x] T037 [US2] Existing `data-testid="download-button"` attribute confirmed

### Testing

- [x] T038 [P] [US2] Add 5 component tests for camera filter in `tests/component/diagnostics/EvidencePanel.test.tsx`
- [x] T039 [P] [US2] MSW handler update not needed - filtering is client-side

**Checkpoint**: Evidence gallery shows thumbnails. Filter by camera works. Download works.

---

## Phase 6: User Story 4 - Evidence Diagnostics View (Priority: P2) ✅ COMPLETE

**Goal**: Admin can view evidence statistics and capture metrics

**Independent Test**: Navigate to diagnostics, view aggregate stats, verify data accuracy

### Verification Only (Existing Infrastructure)

- [x] T040 [US4] Verified `SessionsPanel.tsx` displays session list with capture counts and stale badges
- [x] T041 [US4] Verified `SessionCard.tsx` shows `capture_count` and `is_stale` indicator with warning
- [x] T042 [US4] Diagnostics capabilities: health checks, sessions, evidence, 10s auto-refresh, stale detection

**Checkpoint**: Diagnostics panel shows session statistics. Existing functionality verified.

---

## Phase 7: User Story 5 - Container ID Audit (Priority: P2) ✅ COMPLETE

**Goal**: Confirm all IDs are treated as opaque strings

**Independent Test**: Code review confirms no semantic parsing of container_id/device_id

### Verification & Documentation

- [x] T043 [US5] JSDoc in containers.ts: "Opaque container ID (UUID or similar) - never assume semantic meaning"
- [x] T044 [US5] All container components use `font-mono text-xs text-muted-foreground` for ID display
- [x] T045 [US5] Zero semantic ID parsing found (only safe display-truncation in SessionProgress.tsx)
- [x] T046 [P] [US5] Added contract test for non-UUID ID acceptance (kitchen-fridge-001, CONTAINER_ABC_123, numeric)

**Checkpoint**: ID handling audit complete. No semantic assumptions found. Contract test added.

---

## Phase 8: Polish & Cross-Cutting Concerns ✅ COMPLETE

**Purpose**: Final validation and cleanup

- [x] T047 Run full lint check: 0 errors, 1 pre-existing warning (TanStack Virtual memoization)
- [x] T048 Run full test suite: 2094 passed, 2 skipped, 0 failures
- [x] T049 Run build: success, no Fast Refresh warnings
- [x] T050 [P] All `data-testid` attributes verified on new elements (capture-evidence-btn, evidence-camera-filter, evidence-filtered-empty)
- [x] T051 [P] Updated spec.md status from Draft to Complete
- [x] T052 Verification checklist: lint ✅, tests ✅, build ✅, data-testids ✅

**Checkpoint**: All quality gates pass. Feature complete.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational CI Config)
    ↓
Phase 3 (US3: CI Pipeline - LINT FIXES) ← CRITICAL PATH
    ↓
╔═════════════════════════════════════════════╗
║ Phase 4 (US1)  ║  Phase 5 (US2)  ║ (Parallel) ║
╚═════════════════════════════════════════════╝
    ↓
╔═════════════════════════════════════════════╗
║ Phase 6 (US4)  ║  Phase 7 (US5)  ║ (Parallel) ║
╚═════════════════════════════════════════════╝
    ↓
Phase 8 (Polish)
```

### User Story Dependencies

| Story | Priority | Depends On | Can Parallelize With |
|-------|----------|------------|---------------------|
| US3 (CI) | P1 | Setup + Foundational | None - blocks others |
| US1 (Capture) | P1 | US3 complete | US2 |
| US2 (Gallery) | P1 | US3 complete | US1 |
| US4 (Diagnostics) | P2 | US1, US2 | US5 |
| US5 (ID Audit) | P2 | None (verification only) | US4 |

### Parallel Opportunities

**Within Phase 3 (CI Fixes)**:
```
T011, T012, T013 - Container test import fixes (parallel)
T014, T015, T016 - Variable fixes (parallel)
T017, T018, T019 - Mock fixture fixes (parallel)
```

**Phases 4 & 5 (Evidence UI)**:
```
US1 and US2 can proceed in parallel after US3 complete
```

**Phases 6 & 7 (P2 Stories)**:
```
US4 and US5 can proceed in parallel
```

---

## Implementation Strategy

### MVP First (US3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US3 (CI Pipeline)
4. **STOP and VALIDATE**: Create PR, verify CI green
5. Merge if urgent

### Full Feature

1. Complete Phases 1-3: CI is stable
2. Complete Phases 4-5: Evidence capture and gallery work
3. Complete Phases 6-7: Diagnostics verified, ID audit done
4. Complete Phase 8: Polish
5. Create PR with full feature

### Recommended Order (Single Developer)

1. T001-T004: Setup and baseline
2. T005-T008: CI configuration
3. T009-T022: All US3 lint fixes (highest impact)
4. T023-T030: US1 evidence capture
5. T031-T039: US2 evidence gallery
6. T040-T042: US4 diagnostics verification
7. T043-T046: US5 ID audit
8. T047-T052: Polish and validation

---

## Task Summary

| Phase | Story | Task Count | Parallelizable |
|-------|-------|------------|----------------|
| 1 - Setup | - | 4 | 2 |
| 2 - Foundational | - | 4 | 2 |
| 3 - US3 CI | US3 | 14 | 9 |
| 4 - US1 Capture | US1 | 8 | 2 |
| 5 - US2 Gallery | US2 | 9 | 2 |
| 6 - US4 Diagnostics | US4 | 3 | 0 |
| 7 - US5 ID Audit | US5 | 4 | 1 |
| 8 - Polish | - | 6 | 2 |
| **Total** | | **52** | **20** |

---

## Notes

- US3 (CI Pipeline) is prioritized first because it unblocks reliable PR merges
- Most tasks are small configuration/verification changes
- Existing infrastructure reduces new code needed
- Tests included only for new functionality (camera filter, capture button if added)
- Commit after each logical group of tasks for easy rollback
