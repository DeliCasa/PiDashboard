# Tasks: Dashboard Container IDs

**Input**: Design documents from `/specs/049-dashboard-container-ids/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

**Tests**: Not explicitly requested. Verification tasks confirm existing test suites pass.

**Organization**: Tasks grouped by user story. Each user story maps to a verification + optional cleanup concern. All four user stories are already satisfied by existing code (Features 043, 046, 047, 048).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Verification (Shared Infrastructure)

**Purpose**: Confirm all functional requirements are already satisfied before any optional cleanup

- [x] T001 [P] Verify zero "fridge-1" references in production code by running `grep -r "fridge-1" src/` and confirming zero matches in `/home/notroot/Documents/Code/CITi/DeliCasa/PiDashboard/src/` — PASSED: 0 matches
- [x] T002 [P] Verify zero hardcoded container IDs in production code by running `grep -rn "container.*=.*['\"].*-[0-9]" src/` and confirming no semantic ID patterns exist in `/home/notroot/Documents/Code/CITi/DeliCasa/PiDashboard/src/` — PASSED: only TabsTrigger value="containers" (UI tab name, not a container ID)
- [x] T003 [P] Verify existing test suites pass by running `VITEST_MAX_WORKERS=1 npm test` — all unit, component, integration, and contract tests must pass — PASSED: 2390 tests passed, 0 failed, 113 test files
- [x] T004 [P] Verify E2E tests pass by running `PLAYWRIGHT_WORKERS=1 npm run test:e2e` — all Playwright tests must pass — PASSED: all chromium tests pass (25 skipped = live-only tests)

**Checkpoint**: All verification tasks must pass before proceeding to optional cleanup

---

## Phase 2: User Story 1 — No Hardcoded Container IDs in Production Code (Priority: P1)

**Goal**: Confirm no "fridge-1" or semantic container ID defaults exist anywhere in `src/`

**Independent Test**: `grep -r "fridge-1" src/` returns zero matches

**Status**: ALREADY COMPLETE — verified in T001

- [x] T005 [US1] Confirm zero "fridge-1" literals in `src/` directory — verified via codebase search (research.md RQ-1). No production code references found.
- [x] T006 [US1] Confirm zero semantic container ID defaults in `src/` directory — verified via codebase search (research.md RQ-1). All container IDs come from API responses or Zustand state.

**Checkpoint**: US1 verified — no implementation needed

---

## Phase 3: User Story 2 — Container Picker Driven by API (Priority: P1)

**Goal**: Container picker fetches from `/api/v1/containers` and displays UUID + label

**Independent Test**: Load the dashboard with the container API returning 2+ containers and verify the picker shows all of them with correct labels

**Status**: ALREADY COMPLETE — implemented in Feature 046

- [x] T007 [US2] Confirm container picker fetches from `/api/v1/containers` — implemented in `src/presentation/components/containers/ContainerPicker.tsx` using `useContainers()` hook with 30s polling
- [x] T008 [US2] Confirm auto-selection of first container — implemented in `src/presentation/components/containers/ContainerPicker.tsx` with stale selection reconciliation (T007 from Feature 046)
- [x] T009 [US2] Confirm label-first display in picker dropdown — implemented: label as primary text, truncated opaque ID in `font-mono text-xs text-muted-foreground` style
- [x] T010 [US2] Confirm graceful degradation on 404/503 — implemented: picker returns `null` (hidden) when container endpoint is unavailable

**Checkpoint**: US2 verified — no implementation needed

---

## Phase 4: User Story 3 — UUID Used in All API Calls (Priority: P1)

**Goal**: All API calls use the selected container's UUID, not a hardcoded value

**Independent Test**: Select a container and verify network requests to `/v1/containers/{uuid}/inventory/runs` use the selected UUID

**Status**: ALREADY COMPLETE — implemented in Features 046, 047

- [x] T011 [US3] Confirm `activeContainerId` stored in Zustand with `localStorage` persistence — implemented in `src/application/stores/activeContainer.ts` with key `delicasa-pi-active-container`
- [x] T012 [US3] Confirm inventory latest endpoint uses UUID — implemented in `src/infrastructure/api/inventory-delta.ts` using `encodeURIComponent(containerId)` in URL
- [x] T013 [US3] Confirm inventory runs endpoint uses UUID — implemented in `src/infrastructure/api/inventory-delta.ts` using `encodeURIComponent(containerId)` in URL
- [x] T014 [US3] Confirm container camera scoping uses UUID — implemented in `src/application/hooks/useContainers.ts` via `useContainerCameras()` and `useContainerCameraIds()`
- [x] T015 [US3] Confirm no string manipulation or parsing of container IDs in `src/` — verified via codebase search (research.md RQ-4)

**Checkpoint**: US3 verified — no implementation needed

---

## Phase 5: User Story 4 — Labels Displayed, UUIDs in Debug Views Only (Priority: P2)

**Goal**: Container labels shown as primary identifier; UUIDs only in monospace debug style

**Independent Test**: View any inventory screen and confirm the container label is prominent while the UUID is in small monospace text

**Status**: ALREADY COMPLETE — implemented in Features 046, 048

- [x] T016 [US4] Confirm label-first display in `ContainerPicker.tsx` — label shown as primary text; truncated opaque ID in `font-mono text-xs text-muted-foreground`
- [x] T017 [US4] Confirm label resolution in `InventoryRunDetail.tsx` — resolves container label via `useContainers()` lookup; falls back to "Unnamed Container"
- [x] T018 [US4] Confirm session/run IDs displayed as truncated monospace — implemented via `truncateId()` utility (8 chars...4 chars format)
- [x] T019 [US4] Confirm no semantically misleading identifiers — labels come only from `container.label` metadata, never from parsing opaque IDs

**Checkpoint**: US4 verified — no implementation needed

---

## Phase 6: Polish & Optional Cleanup

**Purpose**: Cosmetic improvements that do not affect functionality

- [x] T020 [P] Update handoff doc example in `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md:388` — replace `AUTO_ONBOARD_TARGET_CONTAINER=fridge-1` with `AUTO_ONBOARD_TARGET_CONTAINER=550e8400-e29b-41d4-a716-446655440000`. Documentation-only change; no runtime impact. — DONE
- [x] T021 Run quickstart.md validation — execute verification commands from `specs/049-dashboard-container-ids/quickstart.md` to confirm all checks pass — DONE (covered by T001-T004 verification results)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Verification (Phase 1)**: No dependencies — run immediately to confirm baseline
- **User Stories (Phases 2-5)**: All ALREADY COMPLETE — verification only, no blocking
- **Polish (Phase 6)**: Can start after Phase 1 verification passes

### User Story Dependencies

- **User Story 1 (P1)**: Independent — codebase search only
- **User Story 2 (P1)**: Independent — Feature 046 implementation audit
- **User Story 3 (P1)**: Independent — Feature 046/047 implementation audit
- **User Story 4 (P2)**: Independent — Feature 046/048 implementation audit

### Parallel Opportunities

- T001, T002, T003, T004 can all run in parallel (Phase 1 verification)
- T020, T021 can run in parallel (Phase 6 cleanup)
- All user story verification phases (2-5) are read-only audits with no side effects

---

## Parallel Example: Phase 1 Verification

```bash
# Launch all verification tasks in parallel:
Task: "Verify zero fridge-1 references: grep -r 'fridge-1' src/"
Task: "Verify zero hardcoded IDs: grep -rn 'container.*=.*['\\''].*-[0-9]' src/"
Task: "Verify tests pass: VITEST_MAX_WORKERS=1 npm test"
Task: "Verify E2E pass: PLAYWRIGHT_WORKERS=1 npm run test:e2e"
```

---

## Implementation Strategy

### This Feature is Verification-Only

1. Complete Phase 1: Run all verification commands
2. Phases 2-5: Confirm existing implementation satisfies all user stories (already checked [x])
3. Phase 6: Apply optional cosmetic cleanup (T020) and run quickstart validation (T021)
4. **No MVP/incremental strategy needed** — all code is already shipped

### Summary

| Metric | Value |
|--------|-------|
| Total tasks | 21 |
| Complete | 21 (T001-T021) |
| Verification tasks | 4 (T001-T004) — ALL PASSED |
| Optional cleanup tasks | 2 (T020-T021) — ALL DONE |
| New production code tasks | 0 |
| User stories requiring implementation | 0 of 4 |

---

## Notes

- All four user stories are verified COMPLETE by codebase search and code review
- The only "fridge-1" reference is in a handoff doc example (T020 — cosmetic)
- Test fixture ID `kitchen-fridge-001` is intentionally retained per design decision D2 (validates opaque handling)
- No new components, hooks, API clients, schemas, or tests need to be created
- This feature closes the audit gap requested by the user without introducing any new code
