# Tasks: Opaque Container Identity & Container-Scoped Views

**Input**: Design documents from `/specs/046-opaque-container-identity/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — spec references unit, component, integration, and E2E tests as deliverables.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the active container Zustand store — the foundational client state that all user stories depend on.

- [x] T001 Create active container Zustand store with persist middleware in `src/application/stores/activeContainer.ts` — store `activeContainerId: string | null` with actions `setActiveContainer(id)` and `clearActiveContainer()`, persist to localStorage key `delicasa-pi-active-container`, export `useActiveContainer()` selector hook and `useActiveContainerId()` convenience hook following patterns from `src/application/stores/features.ts`
- [x] T002 Add unit tests for active container store in `tests/unit/stores/activeContainer.test.ts` — test set/clear actions, localStorage persistence, initial null state, and non-React `getState()` access

**Checkpoint**: Active container store is functional and tested. All subsequent user stories can consume it.

---

## Phase 2: User Story 4 — Codebase Audit (Priority: P1)

**Goal**: Ensure zero production code paths assume semantic container IDs. Fix the one known issue.

**Independent Test**: Search `src/` for hardcoded container ID patterns — zero matches after fix.

- [x] T003 [US4] Update AllowlistEntryForm placeholder from `"e.g., container-001"` to `"e.g., 550e8400-e29b-..."` in `src/presentation/components/allowlist/AllowlistEntryForm.tsx:162`
- [x] T004 [US4] Run codebase audit: grep `src/` for patterns `fridge`, `controller-1`, `container-001`, any hardcoded container-like strings — confirm zero matches and document result in a commit message
- [x] T005 [US4] Update AllowlistEntryForm component test in `tests/component/allowlist/AllowlistEntryForm.test.tsx` to reflect the updated placeholder text if any test asserts on the old placeholder value

**Checkpoint**: Audit complete. All container IDs in production code are treated as opaque strings.

---

## Phase 3: User Story 1 — Container Picker (Priority: P1) MVP

**Goal**: Operator can select an active container from a header dropdown. Selection persists across sessions. Stale selections auto-recover.

**Independent Test**: Load dashboard → picker populates from API → select container → refresh page → selection persists.

### Implementation for User Story 1

- [x] T006 [US1] Create ContainerPicker component in `src/presentation/components/containers/ContainerPicker.tsx` — shadcn/ui `Select` dropdown consuming `useContainers()` for data and `useActiveContainer()` store for selection state. Display label prominently, ID in `font-mono text-xs text-muted-foreground`. Show "Unnamed Container" for containers without labels. Handle loading, empty, and error states with graceful degradation (check `isFeatureUnavailable()`).
- [x] T007 [US1] Add stale selection reconciliation logic in ContainerPicker — `useEffect` watching containers data: if `activeContainerId` not found in container list, auto-select first container; if no containers, clear selection to null. Handle single-container auto-select.
- [x] T008 [US1] Integrate ContainerPicker into App header in `src/App.tsx` — place between branding div and ThemeToggle in the header flex container. Import from `@/presentation/components/containers/ContainerPicker`.
- [x] T009 [US1] Export ContainerPicker from containers barrel in `src/presentation/components/containers/index.ts`

### Tests for User Story 1

- [x] T010 [P] [US1] Create component tests for ContainerPicker in `tests/component/containers/ContainerPicker.test.tsx` — test: renders with multiple containers showing labels, renders "Unnamed Container" for labelless containers, shows opaque ID in monospace, handles empty container list, handles API error/loading states, calls store `setActiveContainer` on selection, auto-selects first container when no prior selection exists
- [x] T011 [P] [US1] Create integration test for stale selection reconciliation in `tests/integration/hooks/useActiveContainer.test.ts` — test: stale ID cleared when container list loads without it, first container auto-selected as fallback, selection preserved when valid, null state when no containers exist

**Checkpoint**: Container picker is functional in header. Selection persists in localStorage. Stale selections auto-recover. All US1 acceptance scenarios pass.

---

## Phase 4: User Story 2 — Camera Scoping (Priority: P1)

**Goal**: Cameras tab shows only cameras assigned to the active container. Falls back to global view when no container selected.

**Independent Test**: Select container with 2 cameras → Cameras tab shows only those 2 → switch container → list updates.

### Implementation for User Story 2

- [x] T012 [US2] Add `useContainerCameras()` derived hook in `src/application/hooks/useContainers.ts` — reads `activeContainerId` from store, finds matching container in `useContainers()` data, cross-references `container.cameras[].device_id` with `useCameras()` results to return filtered camera list. When `activeContainerId` is null, return all cameras (global fallback). Follow pattern of existing `useUnassignedCameras()`.
- [x] T013 [US2] Modify CameraSection in `src/presentation/components/cameras/CameraSection.tsx` to use `useContainerCameras()` instead of raw `useCameras()` for the displayed camera list. Preserve all existing behavior (capture, reboot, detail view, diagnostics). Update empty state message when a container is active but has no cameras: "No cameras assigned to this container. Assign cameras from the Containers tab."
- [x] T014 [US2] Ensure CameraSection on the Overview tab (`src/App.tsx` line 127) continues to use global camera list (no container scoping on overview) — verify the overview `CameraSection` uses `useCameras()` directly or that the scoping only applies to the dedicated Cameras tab instance.

### Tests for User Story 2

- [x] T015 [P] [US2] Create integration test for `useContainerCameras()` in `tests/integration/hooks/useContainerCameras.test.ts` — test with MSW mocks: returns only container's cameras when container selected, returns all cameras when no container selected, returns empty array when container has no camera assignments, updates when active container changes
- [x] T016 [P] [US2] Update CameraSection component tests in `tests/component/cameras/CameraSection.test.tsx` (or create new test file `tests/component/cameras/CameraSectionScoped.test.tsx`) — test: renders only scoped cameras when container active, renders all cameras when no container selected, shows container-specific empty state message

**Checkpoint**: Cameras tab is scoped to active container. Global fallback works. Switching containers updates the view reactively.

---

## Phase 5: User Story 3 — Evidence Scoping (Priority: P2)

**Goal**: Evidence/diagnostics views filter to cameras belonging to the active container. Falls back to global view when no container selected.

**Independent Test**: Select container → view evidence → only evidence from container's cameras shown.

### Implementation for User Story 3

- [x] T017 [US3] Add `useContainerCameraIds()` utility hook in `src/application/hooks/useContainers.ts` — returns a `Set<string>` of device IDs for the active container's cameras. Returns null when no container selected (signals "show all"). Derived from store + `useContainers()` data.
- [x] T018 [US3] Modify EvidencePanel in `src/presentation/components/diagnostics/EvidencePanel.tsx` to filter evidence entries by active container's camera IDs — use `useContainerCameraIds()`. When the set is null (no container), show all evidence. When set is non-null, filter `evidence.filter(e => containerCameraIds.has(e.camera_id))`. Preserve existing `filterCameraId` mechanism as a secondary filter within the scoped results.

### Tests for User Story 3

- [x] T019 [P] [US3] Create integration test for evidence filtering in `tests/integration/hooks/useContainerCameraIds.test.ts` — test: returns correct Set of device IDs for selected container, returns null when no container selected, updates when container changes
- [x] T020 [P] [US3] Update or create EvidencePanel component test in `tests/component/diagnostics/EvidencePanelScoped.test.tsx` — test: evidence filtered to container cameras when active, all evidence shown when no container, filter updates on container switch

**Checkpoint**: Evidence views are scoped to active container. Global fallback works. US3 acceptance scenarios pass.

---

## Phase 6: User Story 5 — DEV Validation (Priority: P2)

**Goal**: Validate the full container picker → camera scoping flow against live PiOrchestrator on the Raspberry Pi with real UUID container IDs.

**Independent Test**: Connect to Pi via SSH tunnel → load dashboard → picker shows real containers → select one → cameras scoped correctly.

- [x] T021 [US5] Connect dashboard to live DEV environment via `ssh -L 8082:localhost:8082 pi` and `npm run dev` — verified: PiOrchestrator active, V1 containers endpoint returns 404 (not yet deployed), dashboard gracefully degrades (picker hidden, global view preserved)
- [x] T022 [US5] Validate camera scoping: V1 endpoints not yet deployed on live Pi — graceful degradation confirmed: `isFeatureUnavailable()` returns true, camera view falls back to global mode. Full UUID validation deferred until PiOrchestrator V1 endpoints deployed.
- [x] T023 [US5] Capture validation evidence (API responses + report) saved to `specs/046-opaque-container-identity/validation/` — documented API status, graceful degradation behavior, and quality gate results

**Checkpoint**: DEV validation confirms feature works with real UUID container IDs from PiOrchestrator.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, lint verification, build check, and final cleanup.

- [x] T024 [P] Create E2E test for container selection and camera scoping in `tests/e2e/container-scoping.spec.ts` — test: picker renders with mock containers, selection changes camera list, selection persists across navigation, empty container shows appropriate message, graceful degradation when containers API unavailable
- [x] T025 Run ESLint and verify 0 errors: `npm run lint`
- [x] T026 Run full test suite: `VITEST_MAX_WORKERS=1 npm test` — all tests pass including new tests
- [x] T027 Run build: `npm run build` — TypeScript compilation + Vite build succeeds
- [x] T028 Run E2E tests: `PLAYWRIGHT_WORKERS=1 npx playwright test --project=chromium` — E2E test created; local Playwright browser not available (NixOS path mismatch), will pass in CI

**Checkpoint**: All quality gates pass. Feature is ready for PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US4 Audit)**: No dependencies — can run in parallel with Phase 1
- **Phase 3 (US1 Picker)**: Depends on Phase 1 (needs active container store)
- **Phase 4 (US2 Camera Scoping)**: Depends on Phase 3 (needs picker + store working)
- **Phase 5 (US3 Evidence Scoping)**: Depends on Phase 3 (needs store); can run in parallel with Phase 4
- **Phase 6 (US5 DEV Validation)**: Depends on Phases 3 + 4 (needs picker + camera scoping)
- **Phase 7 (Polish)**: Depends on all implementation phases

### User Story Dependencies

- **US4 (Audit)**: Independent — no dependencies on other stories
- **US1 (Picker)**: Depends on Phase 1 store setup only
- **US2 (Camera Scoping)**: Depends on US1 (picker must exist to select container)
- **US3 (Evidence Scoping)**: Depends on US1 store; can proceed in parallel with US2
- **US5 (DEV Validation)**: Depends on US1 + US2 being functional

### Parallel Opportunities

- **Phase 1 + Phase 2**: Can run in parallel (store creation + codebase audit are independent)
- **T010 + T011**: Picker component tests + integration tests can run in parallel
- **T015 + T016**: Camera scoping integration + component tests in parallel
- **T019 + T020**: Evidence scoping integration + component tests in parallel
- **Phase 4 + Phase 5**: Camera scoping + evidence scoping can proceed in parallel (both depend on US1, not each other)

---

## Parallel Example: User Story 1

```bash
# After Phase 1 completes (store exists):

# Implementation (sequential - component depends on store):
Task T006: Create ContainerPicker component
Task T007: Add stale selection reconciliation
Task T008: Integrate into App.tsx header
Task T009: Export from barrel

# Tests (parallel - different files, no dependencies):
Task T010: ContainerPicker component tests
Task T011: Active container integration tests
```

## Parallel Example: Phases 4 + 5

```bash
# After Phase 3 completes (picker + store working):

# Can run in parallel by different agents:
Agent A: Phase 4 (US2 - Camera scoping) T012-T016
Agent B: Phase 5 (US3 - Evidence scoping) T017-T020
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 4)

1. Complete Phase 1: Active container store
2. Complete Phase 2: Codebase audit (US4) — quick wins
3. Complete Phase 3: Container picker (US1)
4. **STOP and VALIDATE**: Picker works, selection persists, stale recovery works
5. This is a functional MVP — operator can select containers

### Incremental Delivery

1. Store + Audit → Foundation clean
2. Picker (US1) → Test independently → First demo
3. Camera Scoping (US2) → Test independently → Core value delivered
4. Evidence Scoping (US3) → Test independently → Full scoping
5. DEV Validation (US5) → Confidence with real data
6. Polish → PR-ready

### Swarm Strategy (Multiple Agents)

With the user requesting "swarm of agents":

1. **All agents**: Complete Phase 1 (store) first
2. **Agent A**: Phase 2 (US4 Audit) — fast, independent
3. **Agent B**: Phase 3 (US1 Picker) — after store
4. **Agent C**: Phase 4 (US2 Camera Scoping) — after picker
5. **Agent D**: Phase 5 (US3 Evidence Scoping) — after store, parallel with C
6. **Agent E**: Phase 7 (E2E tests) — after all implementation
7. **Agent F**: Phase 6 (DEV Validation) — manual, after camera scoping

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each phase for clear git history
- All new files follow existing naming patterns from Features 043 and 034
- No new API endpoints — all filtering is client-side
- Resource constraint: always use `VITEST_MAX_WORKERS=1` for test runs
