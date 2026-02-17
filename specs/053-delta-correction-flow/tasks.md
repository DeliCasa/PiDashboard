# Tasks: Delta Correction Flow

**Input**: Design documents from `/specs/053-delta-correction-flow/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story. Since this is a test-hardening feature, all "implementation" tasks ARE test tasks. The UI components already exist (Features 047-052).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify baseline and prepare infrastructure for new tests

- [x] T001 Run existing test suite to confirm baseline passes: `VITEST_MAX_WORKERS=1 npm test`
- [x] T002 Verify FR-015 low-confidence banner exists in src/presentation/components/inventory/InventoryDeltaTable.tsx — if missing, implement (~10 lines: conditional Alert when avg confidence < 0.5 with data-testid="low-confidence-banner")
- [x] T003 Verify zero-delta empty state renders "No changes detected" in src/presentation/components/inventory/InventoryDeltaTable.tsx — if missing, implement (empty-state div with data-testid="inventory-delta-empty")

**Checkpoint**: Baseline green, all UI functionality confirmed present

---

## Phase 2: Foundational (E2E Mock Helpers)

**Purpose**: Shared E2E mock helpers that BLOCK all E2E test tasks (Phase 6+)

**CRITICAL**: No E2E test can be written until these helpers exist

- [x] T004 Add `mockReviewSubmit(page, responseData?)` helper to tests/e2e/fixtures/mock-routes.ts — ALREADY EXISTS as `mockInventoryReviewSubmit(page, status)` at line 1704
- [x] T005 [P] Add `mockReviewConflict(page)` helper to tests/e2e/fixtures/mock-routes.ts — ALREADY EXISTS: call `mockInventoryReviewSubmit(page, 409)` returns REVIEW_CONFLICT
- [x] T006 [P] Add `mockInventoryAfterCorrection` fixture to tests/mocks/inventory-delta-fixtures.ts — ALREADY EXISTS as `mockInventoryRunApproved` (override) and `mockInventoryRunApprovedAsIs` (approve)

**Checkpoint**: E2E mock infrastructure ready for correction workflow tests

---

## Phase 3: User Story 1 — View Latest Delta (Priority: P1)

**Goal**: Verify delta display handles edge cases — low-confidence banner and zero-delta empty state

**Independent Test**: Render InventoryDeltaTable with low-confidence/zero-delta fixtures and confirm correct UI treatment

- [x] T007 [P] [US1] Low-confidence banner test — ALREADY EXISTS at InventoryDeltaTable.test.tsx:143
- [x] T008 [P] [US1] High-confidence no-banner test — ALREADY EXISTS at InventoryDeltaTable.test.tsx:150
- [x] T009 [P] [US1] Zero-delta empty state test — ALREADY EXISTS at InventoryDeltaTable.test.tsx:136,325
- [x] T010 [P] [US1] Add low-confidence integration test to tests/component/inventory/InventoryRunDetail.test.tsx — shows low-confidence-banner in detail view
- [x] T011 [P] [US1] Add zero-delta integration test to tests/component/inventory/InventoryRunDetail.test.tsx — shows "No change" for all rows in detail view (zero-delta has items, not empty state)

**Checkpoint**: Delta table edge cases (FR-015, FR-016) fully tested at component level

---

## Phase 4: User Story 2 — Submit a Correction (Priority: P1) — LARGEST PHASE

**Goal**: Close all component-level test gaps for the correction/review workflow

**Independent Test**: Render InventoryReviewForm with needs-review fixture, exercise add/remove/validate/confirm/conflict flows

### Add/Remove Item Operations (FR-004, FR-005)

- [x] T012 [P] [US2] Add item test — ALREADY EXISTS at InventoryReviewForm.test.tsx:139
- [x] T013 [P] [US2] Add item with data in summary — ALREADY EXISTS at InventoryReviewForm.test.tsx:325
- [x] T014 [P] [US2] Remove item strikethrough — ALREADY EXISTS at InventoryReviewForm.test.tsx:153
- [x] T015 [P] [US2] Add "add then remove cancels out" test — submit stays disabled when added+removed cancels out

### Form Validation (FR-007)

- [x] T016 [P] [US2] Empty name validation — ALREADY EXISTS at InventoryReviewForm.test.tsx:237,384
- [x] T017 [P] [US2] Negative count validation — ALREADY EXISTS at InventoryReviewForm.test.tsx:253
- [x] T018 [P] [US2] Add "notes length validation" test — >500 chars shows review-error-notes and disables submit

### Confirmation Dialog (FR-008)

- [x] T019 [P] [US2] Confirmation dialog renders — ALREADY EXISTS at InventoryReviewForm.test.tsx:164
- [x] T020 [P] [US2] Add "confirmation dialog cancel" test — dialog closes, form retains edits with count=10
- [x] T021 [P] [US2] Confirmation dialog confirm submits — ALREADY EXISTS at InventoryReviewForm.test.tsx:181

### Conflict Handling (FR-010)

- [x] T022 [P] [US2] Add "conflict (409) shows conflict UI" test — 409 response shows review-conflict with review-refresh-btn
- [x] T023 [P] [US2] Add "conflict refresh re-enables review" test — refresh click resets to review-actions state

**Checkpoint**: All InventoryReviewForm gaps (FR-004, FR-005, FR-007, FR-008, FR-010) covered at component level

---

## Phase 5: User Story 3 — View Audit Trail (Priority: P2)

**Goal**: Confirm audit trail displays correctly for all review variants

**Independent Test**: Render InventoryAuditTrail with approved/corrected/with-notes fixtures and verify all fields

**Note**: Existing component tests in tests/component/inventory/InventoryAuditTrail.test.tsx already cover this story well. Only a gap check is needed.

- [x] T024 [US3] Verify existing InventoryAuditTrail tests — ALL COVERED: audit-approved-note (line 98), audit-corrections (line 77), audit-notes (line 111), added/removed indicators, null handling

**Checkpoint**: US3 audit trail verified at component level; E2E coverage added in Phase 8

---

## Phase 6: User Story 4 — Session-Based Lookup (Priority: P2)

**Goal**: Confirm session lookup navigates to correct delta detail

**Independent Test**: Enter session ID, verify detail view loads with correct data

**Note**: Existing tests in tests/component/inventory/InventorySessionLookup.test.tsx cover valid/invalid lookup. E2E tests in tests/e2e/inventory-delta.spec.ts cover the navigation flow.

- [x] T025 [US4] Verify existing InventorySessionLookup tests — ALL COVERED: valid lookup (line 86), invalid/404 (line 130), empty input (line 63), whitespace trimming (line 104), loading state (line 163)

**Checkpoint**: US4 session lookup fully verified; no major gaps expected

---

## Phase 7: User Story 5 — Resilient State Handling (Priority: P1)

**Goal**: Harden contract tests for review error variants and validate all status states

**Independent Test**: Parse each error response fixture through Zod schemas and verify all 5 status states render correctly

### Contract Test Hardening (FR-017)

- [x] T026 [P] [US5] Conflict (409) response validates — ALREADY EXISTS at inventory-delta.contract.test.ts:317
- [x] T027 [P] [US5] Invalid (400) response validates — ALREADY EXISTS at inventory-delta.contract.test.ts:321
- [x] T028 [P] [US5] Add "SubmitReviewRequest rejects empty name" test — override with empty correction name fails safeParse
- [x] T029 [P] [US5] Add "SubmitReviewRequest rejects negative count" test — negative original_count and corrected_count both fail
- [x] T030 [P] [US5] Add "ReviewCorrectionSchema accepts added/removed flags" test — added=true and removed=true both pass

**Checkpoint**: Contract tests cover all review error variants per FR-017

---

## Phase 8: E2E Full Correction Workflow (Cross-Story)

**Goal**: Create comprehensive E2E tests covering the complete correction workflow (FR-018) and all state variants

**Independent Test**: Run `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/inventory-correction-flow.spec.ts --project=chromium`

**CRITICAL**: Depends on Phase 2 (E2E mock helpers) being complete

- [x] T031 [US2] Create tests/e2e/inventory-correction-flow.spec.ts with test scaffold — import mockedPage fixture, add setup helpers for container selection + inventory tab navigation + session delta mocking (follow patterns from tests/e2e/inventory-delta-golden.spec.ts)
- [x] T032 [US2] Add "full correction workflow" E2E test — view needs-review delta → enter edit mode → change count → add item → remove item → add notes → submit → confirm dialog → verify POST → re-mock with corrected run → verify audit trail renders (FR-018)
- [x] T033 [US2] Add "approve as-is" E2E test — view done delta → click approve → verify POST with action="approve" → verify audit trail shows approval
- [x] T034 [US2] Add "conflict (409) handling" E2E test — view needs-review delta → submit correction → mock POST returns 409 → verify conflict message visible → click refresh → verify re-review available (FR-010)
- [x] T035 [US1] Add "zero-delta display" E2E test — mock session delta with mockInventoryRunZeroDelta → navigate to detail → verify "No changes detected" message visible (FR-016)
- [x] T036 [US1] Add "low-confidence banner" E2E test — mock session delta with mockInventoryRunLowConfidence → navigate to detail → verify low-confidence-banner visible (FR-015)
- [x] T037 [US5] Add "service unavailable (503)" E2E test — mock inventory endpoints with 503 → navigate → verify "service unavailable" message → verify no console errors (FR-013)
- [x] T038 [US5] Add "pending state with polling indicator" E2E test — mock latest with pending status → navigate → verify pending indicator visible (FR-011, FR-012)

**Checkpoint**: All E2E scenarios pass; FR-018 (full correction workflow) verified

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: HANDOFF document, final validation, and coverage check

- [x] T039 Create specs/053-delta-correction-flow/HANDOFF_053.md with manual verification walkthrough — document: test commands per category, expected test counts, correction flow steps, known limitations, FR-to-test traceability matrix
- [x] T040 Run full test suite: `VITEST_MAX_WORKERS=1 npm test` — verify all existing + new tests pass with 0 failures — 2495 passed, 0 failures
- [x] T041 Run lint: `npm run lint` — verify 0 errors — 0 errors, 1 pre-existing warning
- [x] T042 Run E2E tests: `PLAYWRIGHT_WORKERS=1 npm run test:e2e` — 226 passed, 80 pre-existing failures (cameras, config, resilience, etc.), 25 skipped (live-smoke). All 7 new correction flow tests pass.
- [x] T043 Run build: `npm run build` — verify production build succeeds — built in 4.70s
- [x] T044 Verify FR coverage — confirm each FR-001 through FR-018 has at least one passing test, update HANDOFF_053.md traceability matrix

**Checkpoint**: Feature 053 complete — all tests pass, lint clean, build succeeds, HANDOFF delivered

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — blocks all E2E work (Phase 8)
- **US1 (Phase 3)**: Depends on Phase 1 only — component tests, no E2E dependency
- **US2 (Phase 4)**: Depends on Phase 1 only — component tests, no E2E dependency
- **US3 (Phase 5)**: Depends on Phase 1 only — verification task
- **US4 (Phase 6)**: Depends on Phase 1 only — verification task
- **US5 (Phase 7)**: Depends on Phase 1 only — contract tests, no E2E dependency
- **E2E Workflow (Phase 8)**: Depends on Phase 2 (mock helpers) + Phases 3-7 (component/contract tests should pass first)
- **Polish (Phase 9)**: Depends on all previous phases

### User Story Dependencies

- **US1 (View Delta)**: Independent — can start after Phase 1
- **US2 (Submit Correction)**: Independent — can start after Phase 1
- **US3 (Audit Trail)**: Independent — lightweight verification
- **US4 (Session Lookup)**: Independent — lightweight verification
- **US5 (Resilient States)**: Independent — contract tests only

### Parallel Opportunities

Phases 3, 4, 5, 6, 7 are ALL independent and can run in parallel (different test files):

```
Phase 1 (Setup)
  ↓
Phase 2 (E2E Helpers) ← can start alongside Phase 3-7
  ↓
┌─────────────────────────────────────────────────────┐
│ Phase 3 (US1) ║ Phase 4 (US2) ║ Phase 5 (US3)      │
│               ║               ║ Phase 6 (US4)      │
│               ║               ║ Phase 7 (US5)      │
└─────────────────────────────────────────────────────┘
  ↓
Phase 8 (E2E Workflow) — needs Phases 2-7 complete
  ↓
Phase 9 (Polish)
```

Within each phase, tasks marked [P] can run in parallel.

### Parallel Example: Phase 4 (US2)

```bash
# Launch all US2 component tests in parallel (all in same file but different describe blocks):
Task: T012 "Add item test" in InventoryReviewForm.test.tsx
Task: T014 "Remove item test" in InventoryReviewForm.test.tsx
Task: T016 "Empty name validation" in InventoryReviewForm.test.tsx
Task: T019 "Confirmation dialog renders" in InventoryReviewForm.test.tsx
Task: T022 "Conflict shows conflict UI" in InventoryReviewForm.test.tsx
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: E2E Helpers (T004-T006)
3. Complete Phase 3: US1 component tests (T007-T011)
4. Complete Phase 4: US2 component tests (T012-T023)
5. Complete Phase 8: E2E workflow (T031-T034 minimum)
6. **STOP and VALIDATE**: Run all tests — this covers FR-001 through FR-010, FR-015, FR-016, FR-018

### Incremental Delivery

1. Setup + Foundational → mock infrastructure ready
2. US1 component tests → delta edge cases verified
3. US2 component tests → correction flow verified at component level
4. US5 contract tests → API contracts hardened
5. E2E workflow → full flow verified end-to-end
6. HANDOFF → documentation delivered

### Suggested Swarm Allocation

Per the spec's swarm suggestion:
- **Agent A (UX states)**: Phase 3 (US1 component tests) + Phase 5/6 (US3/US4 verification)
- **Agent B (Contract tests)**: Phase 7 (US5 contract hardening) + Phase 2 (fixtures)
- **Agent C (E2E)**: Phase 8 (E2E correction workflow) + Phase 9 (HANDOFF)

---

## Notes

- All tasks write tests, not production code (except T002/T003 which may implement FR-015/FR-016 if missing)
- [P] tasks target different describe blocks within the same file — can be authored in parallel but merge sequentially
- E2E tests use Playwright route interception (NOT MSW) — follow mock-routes.ts patterns
- Component tests use RTL + Vitest + MSW — follow existing InventoryReviewForm.test.tsx patterns
- Resource constraints: VITEST_MAX_WORKERS=1, PLAYWRIGHT_WORKERS=1
- Commit after each phase checkpoint or logical group of tasks
