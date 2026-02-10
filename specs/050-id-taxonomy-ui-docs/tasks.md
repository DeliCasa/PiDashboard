# Tasks: ID Taxonomy Consistency in UI & Documentation

**Input**: Design documents from `/specs/050-id-taxonomy-ui-docs/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No dedicated test tasks — this feature updates existing tests (fixture IDs) and existing component tests will validate UI label additions.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- All UI changes in `src/presentation/components/`
- All test fixture changes in `tests/`

---

## Phase 1: Setup

**Purpose**: No project initialization needed — existing codebase. This phase is a no-op.

(No tasks — the project is already fully set up.)

---

## Phase 2: Foundational (Documentation Verification)

**Purpose**: Verify documentation is already clean before proceeding to UI and test changes.

- [x] T001 [US1] Verify `docs/admin/container-management.md` uses UUID-format container ID examples and explains the ID-vs-label taxonomy (opaque ID vs display label). Confirm no changes needed.
- [x] T002 [US1] Verify `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md` uses UUID-format for `AUTO_ONBOARD_TARGET_CONTAINER` example. Confirm no changes needed.
- [x] T003 [US1] Verify spec files in `specs/046-opaque-container-identity/`, `specs/048-inventory-review/`, and `specs/049-dashboard-container-ids/` only reference "fridge-1" as anti-pattern illustrations. Confirm no changes needed.

**Checkpoint**: Documentation verified clean — US1 acceptance scenarios satisfied.

---

## Phase 3: User Story 3 - Test Fixtures Use Clearly Opaque IDs (Priority: P3) 🎯 MVP

**Goal**: Replace all semantic container IDs in test fixtures with UUID-format strings. Done first because subsequent UI label changes may cause test updates; clean fixtures first avoids double-editing.

**Independent Test**: `grep -r "kitchen-fridge-001" tests/e2e/ tests/component/` returns zero results (except `containers.contract.test.ts` T046 intentional test).

**Standard UUID**: `550e8400-e29b-41d4-a716-446655440001`

### Implementation for User Story 3

- [x] T004 [P] [US3] Replace all 9 instances of `kitchen-fridge-001` with `550e8400-e29b-41d4-a716-446655440001` in `tests/e2e/fixtures/mock-routes.ts` (lines ~869, 1478, 1507, 1535, 1555, 1563, 1571, 1579, 1587). Keep `label: 'Kitchen Fridge'` unchanged.
- [x] T005 [P] [US3] Replace 2 instances of `kitchen-fridge-001` with `550e8400-e29b-41d4-a716-446655440001` in `tests/e2e/accessibility.spec.ts` (lines ~431, 501). Keep labels unchanged.
- [x] T006 [P] [US3] Replace 1 instance of `kitchen-fridge-001` with `550e8400-e29b-41d4-a716-446655440001` in `tests/e2e/inventory-delta.spec.ts` (line ~27). Keep label unchanged.
- [x] T007 [P] [US3] Replace 4 instances of `container-001` with `550e8400-e29b-41d4-a716-446655440001` in `tests/component/allowlist/AllowlistEntryForm.test.tsx` (lines ~173, 180, 203, 210).
- [x] T008 [US3] Run `VITEST_MAX_WORKERS=1 npm test` and `PLAYWRIGHT_WORKERS=1 npm run test:e2e` to verify all tests pass with new fixture IDs.

**Checkpoint**: All test fixtures use UUID-format container IDs. `grep -r "kitchen-fridge-001" tests/` returns only `containers.contract.test.ts` (T046 intentional).

---

## Phase 4: User Story 2 - UI Labels Distinguish IDs from Display Names (Priority: P2)

**Goal**: Add explicit type labels ("Container ID:", "Camera ID:", "Session ID:", "Device ID:") before every opaque identifier displayed in the UI.

**Independent Test**: Navigate Container Picker, Container Card, Container Detail, Camera Card, Inventory Run List, Inventory Run Detail — every opaque ID has a visible label prefix.

**Pattern** (from `InventoryAuditTrail.tsx`):
```tsx
<span className="text-muted-foreground">Container ID: </span>
<span className="font-mono text-xs text-muted-foreground">{id}</span>
```

### Container Components

- [x] T009 [P] [US2] Add "Container ID: " label prefix to the opaque ID display in `src/presentation/components/containers/ContainerPicker.tsx` (lines ~134-138). Add a `<span className="text-muted-foreground">Container ID: </span>` before the monospace ID span.
- [x] T010 [P] [US2] Add "Container ID: " label prefix to the CardDescription in `src/presentation/components/containers/ContainerCard.tsx` (lines ~55-57). Wrap with label span before the ID text.
- [x] T011 [P] [US2] Add "Container ID: " label prefix at both ID display locations in `src/presentation/components/containers/ContainerDetail.tsx` (line ~160 header, lines ~188-195 card description).
- [x] T012 [P] [US2] Add "Container ID: " label prefix to the DialogDescription in `src/presentation/components/containers/EditContainerDialog.tsx` (lines ~76-78).

### Camera/Device Components

- [x] T013 [P] [US2] Add "Device ID: " label prefix to the device ID display in `src/presentation/components/containers/PositionSlot.tsx` (lines ~114-116).
- [x] T014 [P] [US2] Add "Camera ID: " label prefix to the selected camera ID display in `src/presentation/components/containers/AssignCameraDialog.tsx` (lines ~150-152).
- [x] T015 [P] [US2] Add "Camera ID: " label prefix to the CardDescription in `src/presentation/components/cameras/CameraCard.tsx` (lines ~101-104).
- [x] T016 [P] [US2] Add "Camera ID: " label prefix to the camera ID display in `src/presentation/components/cameras/CameraDetail.tsx` (line ~188).

### Inventory Components

- [x] T017 [P] [US2] Add "Session ID: " visible label to the session ID copy button in `src/presentation/components/inventory/InventoryRunList.tsx` (lines ~162-179). Add label span before the truncated ID text inside the button.
- [x] T018 [P] [US2] Add "Container ID: " label prefix at both container ID display locations in `src/presentation/components/inventory/InventoryRunDetail.tsx` (lines ~122-124 pending state, lines ~188-195 main content).

### Verification

- [x] T019 [US2] Run `npm run lint && VITEST_MAX_WORKERS=1 npm test` to verify all existing component tests pass with the new UI labels. Update any snapshot or text-matching assertions that break due to the added label prefixes.

**Checkpoint**: Every opaque ID in the dashboard has a visible type label. Existing tests pass.

---

## Phase 5: Polish & Final Verification

**Purpose**: Cross-cutting verification across all user stories.

- [x] T020 Run `npm run build` to verify TypeScript compilation and Vite production build pass with zero errors.
- [x] T021 Run `npm run lint` to verify zero ESLint errors.
- [x] T022 Run `VITEST_MAX_WORKERS=1 npm test` to verify all unit, component, and integration tests pass.
- [x] T023 Run `PLAYWRIGHT_WORKERS=1 npm run test:e2e` to verify all E2E tests pass. (Note: mobile-chrome/mobile-safari projects fail due to pre-existing NixOS chromium_headless_shell path issue — not related to feature changes. Core browsers chromium/firefox/webkit all pass.)
- [x] T024 Run `grep -r "kitchen-fridge-001" src/ tests/e2e/ tests/component/` and confirm zero results (only `tests/integration/contracts/containers.contract.test.ts` should match — T046 opaque acceptance test).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Documentation Verification)**: No dependencies — can start immediately. US1 verification only.
- **Phase 3 (Test Fixtures — US3)**: No dependencies — can run in parallel with Phase 2.
- **Phase 4 (UI Labels — US2)**: Can start in parallel with Phase 3, but T019 (test verification) should run after Phase 3 completes to avoid conflating fixture vs label test failures.
- **Phase 5 (Polish)**: Depends on Phases 2, 3, and 4 all being complete.

### User Story Dependencies

- **User Story 1 (P1 — Docs)**: Independent. Verification only, no code changes. Can complete immediately.
- **User Story 3 (P3 — Test Fixtures)**: Independent. No dependency on US1 or US2.
- **User Story 2 (P2 — UI Labels)**: Independent code changes. Test verification (T019) benefits from Phase 3 being done first.

### Within Phase 3 (Test Fixtures)

- T004, T005, T006, T007 are all [P] — different files, can run in parallel.
- T008 depends on T004-T007 completion.

### Within Phase 4 (UI Labels)

- T009 through T018 are all [P] — different files, can run in parallel.
- T019 depends on T009-T018 completion and Phase 3 completion.

### Parallel Opportunities

```bash
# Phase 2 + Phase 3 can run in parallel:
# Agent A: T001, T002, T003 (doc verification)
# Agent B: T004, T005, T006, T007 (test fixture replacements)

# Phase 4 — all UI label tasks in parallel:
# Agent swarm: T009, T010, T011, T012, T013, T014, T015, T016, T017, T018
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 3)

1. Complete Phase 2: Verify docs are clean (US1 — minutes)
2. Complete Phase 3: Replace semantic test fixture IDs (US3 — 30 min)
3. **STOP and VALIDATE**: Run full test suite
4. The codebase is now consistent at the test/doc layer

### Incremental Delivery

1. Phase 2 + Phase 3 → Test fixtures and docs verified → Ship as first increment
2. Phase 4 → UI labels added → Run full test suite → Ship as second increment
3. Phase 5 → Final cross-cutting verification → Feature complete

### Agent Swarm Strategy

With multiple agents:

1. **Agent A**: Phase 2 (T001-T003 documentation verification)
2. **Agent B**: Phase 3 (T004-T007 test fixture replacements in parallel, then T008 verification)
3. **Agents C-L**: Phase 4 (T009-T018 UI label additions — one agent per component file, all in parallel)
4. **Agent M**: Phase 5 (T019-T024 final verification after all others complete)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 is verification-only (no code changes needed — docs already clean)
- US3 is done before US2 to establish clean test fixtures before UI changes
- Phase 4 UI label tasks follow the `InventoryAuditTrail.tsx` pattern: `<span className="text-muted-foreground">Label: </span>` before the monospace ID
- `containers.contract.test.ts` line 147 (`kitchen-fridge-001`) is intentionally preserved — T046 opaque acceptance test
- All test runs use `VITEST_MAX_WORKERS=1` and `PLAYWRIGHT_WORKERS=1` per constitution
