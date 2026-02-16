# Tasks: 051 — Live E2E Inventory Delta Display

**Input**: Design documents from `/specs/051-inventory-delta-e2e-verify/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Existing tests are updated to match the new schema. No new test files created. Test updates are part of the foundational phase (breaking change procedure per Constitution II.D).

**Organization**: Tasks are grouped by user story. The foundational phase (schema alignment) is a breaking change that must complete before any story work begins.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## User Story Mapping

| Story | Spec Requirement | Priority | Key Change |
|-------|-----------------|----------|------------|
| US1 | View seeded run with full detail (rationale + run_id) | P1 | Display rationale in delta table, show run_id |
| US2 | Status lifecycle rendering (queued/running/completed/needs_review/failed) | P1 | Update status labels/badges in components |
| US3 | Review submission and state update | P1 | Review response uses `done` not `approved` |
| US4 | Polling, refresh, stale-cache prevention | P2 | Add refresh button, update terminal statuses |
| US5 | Error UX for missing or partial data | P2 | Verify graceful degradation with new statuses |

---

## Phase 1: Setup

**Purpose**: Verify baseline and confirm current tests pass before breaking changes

- [x] T001 Run inventory unit tests to confirm baseline: `VITEST_MAX_WORKERS=1 npx vitest run tests/unit/api/inventory-delta.test.ts`
- [x] T002 [P] Run inventory contract tests to confirm baseline: `VITEST_MAX_WORKERS=1 npx vitest run tests/integration/contracts/inventory-delta.contract.test.ts`
- [x] T003 [P] Run TypeScript compilation check: `npx tsc --noEmit`

**Checkpoint**: All existing tests pass. Baseline verified before breaking changes.

---

## Phase 2: Foundational — Schema Alignment (Breaking Change)

**Purpose**: Align `AnalysisStatusSchema` with BridgeServer's actual enum values. This is a breaking change per Constitution II.D — update schema first, then fixtures, then tests, then components.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Update `AnalysisStatusSchema` enum in `src/infrastructure/api/inventory-delta-schemas.ts` from `['pending', 'completed', 'needs_review', 'approved', 'failed']` to `['pending', 'processing', 'done', 'needs_review', 'error']`
- [x] T005 Update `TERMINAL_STATUSES` array in `src/application/hooks/useInventoryDelta.ts` from `['completed', 'approved', 'failed']` to `['done', 'error']`
- [x] T006 Update all fixtures in `tests/mocks/inventory-delta-fixtures.ts`: change `completed` → `done`, `failed` → `error`, `approved` → `done` (with review non-null), add `mockInventoryRunProcessing` fixture with `status: 'processing'`
- [x] T007 Update run list fixtures in `tests/mocks/inventory-delta-fixtures.ts`: change run list item statuses to use new enum values (`run-done-001`, `run-error-005`, etc.)
- [x] T008 Update unit tests in `tests/unit/api/inventory-delta.test.ts`: replace all old status string literals with new values
- [x] T009 Update contract tests in `tests/integration/contracts/inventory-delta.contract.test.ts`: replace all old status values, add `processing` variant validation test
- [x] T010 Update E2E mock routes in `tests/e2e/inventory-delta.spec.ts`: replace status values in mock API responses and assertions
- [x] T011 Run all inventory tests to confirm schema alignment: `VITEST_MAX_WORKERS=1 npx vitest run tests/unit/api/inventory-delta.test.ts tests/integration/contracts/inventory-delta.contract.test.ts`
- [x] T012 Run TypeScript compilation check after schema change: `npx tsc --noEmit`

**Checkpoint**: Schema aligned. All tests pass with new enum values. TS compiles clean.

---

## Phase 3: User Story 1 — View Seeded Run with Full Detail (Priority: P1) 🎯 MVP

**Goal**: Display the `rationale` field in the delta table and show `run_id` as the tracing identifier in run detail.

**Independent Test**: Open a needs_review run in the delta table and confirm rationale text appears below each item name. Confirm run_id is visible in the detail header.

### Implementation for User Story 1

- [x] T013 [US1] Add rationale subtitle to delta table in `src/presentation/components/inventory/InventoryDeltaTable.tsx`: render `entry.rationale` as `<p className="text-xs text-muted-foreground">` below the item name/SKU span (inside the name `<TableCell>`, after the `<div>` containing name + SKU)
- [x] T014 [US1] Add `data-testid="delta-rationale-{index}"` to the rationale element in `src/presentation/components/inventory/InventoryDeltaTable.tsx`
- [x] T015 [US1] Display `run_id` in run detail header in `src/presentation/components/inventory/InventoryRunDetail.tsx`: add a `<span data-testid="run-id" className="font-mono text-xs text-muted-foreground">` showing `truncateId(data.run_id)` in the `CardDescription` alongside container ID
- [x] T016 [US1] Verify fixture `mockInventoryRunNeedsReview` in `tests/mocks/inventory-delta-fixtures.ts` includes `rationale` field on delta entries (confirm existing or add "Two cans removed from shelf" rationale)

**Checkpoint**: Delta table shows rationale. Run detail shows run_id. US1 independently verifiable.

---

## Phase 4: User Story 2 — Status Lifecycle Rendering (Priority: P1)

**Goal**: All 5 backend statuses (`pending`, `processing`, `done`, `needs_review`, `error`) render with correct labels and badges. "Approved" is derived from `done` + non-null review.

**Independent Test**: Create fixtures with each status and verify the correct badge renders in the run list and correct state renders in run detail.

### Implementation for User Story 2

- [x] T017 [US2] Update `statusConfig` in `src/presentation/components/inventory/InventoryRunList.tsx`: replace keys with `pending: { label: 'Queued', variant: 'secondary' }`, `processing: { label: 'Running', variant: 'secondary' }`, `done: { label: 'Completed', variant: 'default' }`, `needs_review: { label: 'Needs Review', variant: 'outline' }`, `error: { label: 'Failed', variant: 'destructive' }`
- [x] T018 [US2] Update pending/processing state in `src/presentation/components/inventory/InventoryRunDetail.tsx`: change `status === 'pending'` check to `status === 'pending' || status === 'processing'` for the spinner/loading state
- [x] T019 [US2] Update failed state in `src/presentation/components/inventory/InventoryRunDetail.tsx`: change `status === 'failed'` to `status === 'error'` for the error display
- [x] T020 [US2] Update completed/approved logic in `src/presentation/components/inventory/InventoryRunDetail.tsx`: replace `status === 'completed'` with `status === 'done'` for show-evidence and show-review-form conditions; replace `status === 'approved'` with `status === 'done' && data.review` for the "Reviewed" title suffix
- [x] T021 [US2] E2E test assertions in `tests/e2e/inventory-delta.spec.ts` verified — existing assertions use generic checks ('Needs Review') that work with new status labels

**Checkpoint**: All 5 statuses render with correct labels. "Approved" derived correctly. US2 independently verifiable.

---

## Phase 5: User Story 3 — Review Submission and State Update (Priority: P1)

**Goal**: Review submission returns `status: 'done'` (not `approved`). UI correctly shows "Approved" state (derived from `done` + review).

**Independent Test**: Submit a review on a needs_review run, confirm the response is processed, and the UI shows "Approved" with audit trail.

### Implementation for User Story 3

- [x] T022 [US3] Verified `ReviewResponseSchema` in `src/infrastructure/api/inventory-delta-schemas.ts` uses `AnalysisStatusSchema` (updated in T004) — no hardcoded `approved` references
- [x] T023 [US3] Updated `InventoryReviewForm` guard clause to include `processing` status; show-review-form condition uses `done`/`needs_review` via parent component
- [x] T024 [US3] Review success fixture `mockReviewSuccessResponse` updated in T006 to return `status: 'done'`
- [x] T025 [US3] E2E review flow verified — approve flow re-mocks with `status: 'done'` and checks for `audit-trail` visibility

**Checkpoint**: Review flow works end-to-end with new status values. US3 independently verifiable.

---

## Phase 6: User Story 4 — Polling, Refresh, and Stale-Cache Prevention (Priority: P2)

**Goal**: Add a manual refresh button to the run list. Polling stops for terminal statuses `done` and `error`.

**Independent Test**: Click the refresh button and confirm the run list reloads. Observe polling stops when all runs are terminal.

### Implementation for User Story 4

- [x] T026 [US4] Add `onRefresh` prop to `InventoryRunList` interface in `src/presentation/components/inventory/InventoryRunList.tsx`
- [x] T027 [US4] Render refresh button in `src/presentation/components/inventory/InventoryRunList.tsx`: add a `<Button variant="ghost" size="sm" data-testid="run-list-refresh">` with `<RefreshCw>` icon at the top of the run list (before the mapped items), calling `onRefresh` on click
- [x] T028 [US4] Pass `onRefresh` from `InventorySection` in `src/presentation/components/inventory/InventorySection.tsx`: wire the runs query's `refetch()` function to the `InventoryRunList` component's `onRefresh` prop
- [x] T029 [US4] Verified polling terminal statuses in `src/application/hooks/useInventoryDelta.ts` are `['done', 'error']` (done in T005)

**Checkpoint**: Refresh button works. Polling uses correct terminal statuses. US4 independently verifiable.

---

## Phase 7: User Story 5 — Error UX for Missing or Partial Data (Priority: P2)

**Goal**: Verify all error states work correctly with the new status enum. No code changes expected — this is a verification pass.

**Independent Test**: Run the existing error/resilience E2E tests and confirm all pass with the new status values.

### Implementation for User Story 5

- [x] T030 [US5] Verified 404/empty state renders correctly — `InventoryRunList.tsx` empty/error states are status-agnostic (no status references)
- [x] T031 [US5] Verified 503/unavailable state renders correctly — `isUnavailable` prop is independent of status enum
- [x] T032 [US5] Verified partial data rendering — `InventoryRunDetail.tsx` show-evidence uses `done`/`needs_review`, show-review-form uses `done`/`needs_review`, error uses `error`
- [x] T033 [US5] E2E test suite: 5/15 pass, 10 failures are PRE-EXISTING (confirmed by testing on main branch — container picker selector ambiguity from feature 050). Not caused by feature 051 changes.

**Checkpoint**: All error states verified with new status values. US5 complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation artifacts, handoff, final validation

- [x] T034 [P] Written `specs/051-inventory-delta-e2e-verify/artifacts/e2e-verify.md` — step-by-step E2E verification playbook
- [x] T035 [P] Updated `specs/051-inventory-delta-e2e-verify/HANDOFF_051.md` with implementation evidence and test results
- [x] T036 Full test suite: 2390 passed, 0 failed (113 files)
- [x] T037 TypeScript compilation: clean (0 errors)
- [x] T038 Lint check: 0 errors, 1 pre-existing warning (LogStream.tsx TanStack Virtual)
- [x] T039 Quickstart validated: all commands and file paths match implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories (breaking change)
- **User Stories (Phases 3–7)**: All depend on Phase 2 (schema alignment)
  - US1 (rationale/run_id display) — no cross-story dependency
  - US2 (status labels) — no cross-story dependency
  - US3 (review flow) — no cross-story dependency
  - US4 (refresh button) — no cross-story dependency
  - US5 (error verification) — should run after US2 (status labels affect error display)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — independent of other stories
- **US2 (P1)**: Can start after Phase 2 — independent of other stories
- **US3 (P1)**: Can start after Phase 2 — independent of other stories
- **US4 (P2)**: Can start after Phase 2 — independent of other stories
- **US5 (P2)**: Depends on US2 (status labels must be correct before verifying error states)

### Within Each User Story

- Component changes before test assertions
- One file per task (parallelizable within story if on different files)

### Parallel Opportunities

- T001, T002, T003 can all run in parallel (independent baseline checks)
- T006, T007 modify the same file — must be sequential
- T008, T009, T010 can all run in parallel (different test files)
- T013, T015 can run in parallel (different component files)
- T017, T018–T020 work on different components — T018, T019, T020 are on the same file and must be sequential
- T026, T028 are on different files and can run in parallel
- T030, T031, T032 are code reviews and can run in parallel
- T034, T035 are different documentation files and can run in parallel
- **US1, US2, US3, US4 can execute simultaneously** (different files, no shared state)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Sequential: Schema change must come first
Task: "Update AnalysisStatusSchema in inventory-delta-schemas.ts"   # T004
Task: "Update TERMINAL_STATUSES in useInventoryDelta.ts"            # T005

# Then fixtures (same file, sequential):
Task: "Update analysis run fixtures"                                 # T006
Task: "Update run list fixtures"                                     # T007

# Then tests (parallel — different files):
Task: "Update unit tests"                                            # T008
Task: "Update contract tests"                                        # T009
Task: "Update E2E mock routes"                                       # T010
```

## Parallel Example: User Stories 1–4

```bash
# These four stories modify different files and can run simultaneously:

# US1: Delta table + Run detail (rationale + run_id)
Task: "Add rationale in InventoryDeltaTable.tsx"                     # T013
Task: "Add run_id in InventoryRunDetail.tsx"                         # T015

# US2: Status labels
Task: "Update statusConfig in InventoryRunList.tsx"                  # T017
Task: "Update state checks in InventoryRunDetail.tsx"                # T018-T020

# US3: Review flow
Task: "Verify ReviewResponseSchema"                                  # T022
Task: "Verify InventoryReviewForm"                                   # T023

# US4: Refresh button
Task: "Add onRefresh prop to InventoryRunList.tsx"                   # T026-T027
Task: "Wire refetch in InventorySection.tsx"                         # T028
```

**Note**: US2 and US1 both touch `InventoryRunDetail.tsx` — if running in parallel, merge carefully. If sequential, complete US2 first since its changes are more extensive.

---

## Implementation Strategy

### MVP First (US1 + US2 + Foundational)

1. Complete Phase 1: Setup (verify baseline)
2. Complete Phase 2: Foundational (schema alignment — breaking change)
3. Complete Phase 3: US1 (rationale + run_id display)
4. Complete Phase 4: US2 (status labels)
5. **STOP and VALIDATE**: Delta table shows rationale, all statuses render correctly
6. This is the minimum viable feature — report "delta visible: YES"

### Incremental Delivery

1. Setup + Foundational → Schema aligned, tests green
2. US1 (rationale/run_id) → Core display complete
3. US2 (status labels) → All states visible
4. US3 (review flow) → End-to-end review works
5. US4 (refresh button) → Manual refresh available
6. US5 (error verification) → Resilience confirmed
7. Polish → Documentation artifacts + handoff

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This is a **contract-alignment feature**: the primary change is aligning the Zod schema to BridgeServer's actual values
- Constitution II.D (Breaking Change Response) dictates execution order: schema → mocks → tests → components
- US5 is mostly a verification pass — no code changes expected
- `InventoryRunDetail.tsx` is touched by US1 (run_id), US2 (status checks), and US3 (review). If stories run in parallel, careful merge is needed.
- Total: 39 tasks across 8 phases
