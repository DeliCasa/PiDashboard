# Tasks: Session Drill-Down E2E Operational Validation

**Input**: Design documents from `/specs/056-session-drilldown-e2e/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Included — this feature's deliverables explicitly require E2E test coverage and component tests for identified gaps.

**Organization**: Tasks grouped by user story. US2 (Correlation ID Traceability), US3 (Sensitive Data Exclusion), and US4 (Responsive Performance) require no implementation — research confirmed they already pass all acceptance criteria from Feature 055. Work focuses on US1 gaps and E2E edge case coverage.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (E2E Test Infrastructure)

**Purpose**: Create mock fixtures needed by the new E2E test suite

- [x] T001 Create E2E mock fixtures with status state variants (processing, pending, error, empty evidence, broken image URLs) in `tests/e2e/fixtures/session-drilldown-e2e-mocks.ts`
  - Follow the pattern established in `tests/e2e/fixtures/inventory-review-mocks.ts`
  - Include `setupProcessingStateMocks()`, `setupPendingStateMocks()`, `setupEmptyEvidenceMocks()`, `setupBrokenImageMocks()`, `setupSessionNotFoundMocks()` setup functions
  - Each function mocks `/api/v1/containers` and `/api/v1/sessions/*/inventory-delta` with appropriate response data
  - Processing mock: use `created_at` > 6 minutes ago to trigger stale warning
  - Broken image mock: use evidence URLs pointing to non-existent image paths that will 404
  - Session not found mock: return `{ success: false, error: { code: "INVENTORY_NOT_FOUND", message: "Not found" } }` for session delta endpoint

---

## Phase 2: User Story 1 — Complete Session Investigation (Priority: P1) — MVP

**Goal**: Fix three identified UX gaps so that all session status states and edge cases render informative, actionable views for operators.

**Independent Test**: Open drill-down for each status state (done, done+no-evidence, done+no-delta, error, processing, pending, not-found) and verify each renders meaningful content with no broken UI elements.

### Implementation

- [x] T002 [P] [US1] Add image error state and evidence empty state next action in `src/presentation/components/inventory/InventoryEvidencePanel.tsx`
  - Add `imageError` state: `useState({ before: false, after: false })`
  - Update `onError` handlers to set `imageError[side] = true` and `imageLoading[side] = false`
  - When `imageError[side]` is true, render placeholder div with `ImageOff` icon (from lucide-react) and text "Image unavailable"
  - Add `data-testid="evidence-before-error"` and `data-testid="evidence-after-error"` to error placeholders
  - Style placeholder: `aspect-video w-full flex flex-col items-center justify-center bg-muted/30 rounded-lg text-muted-foreground`
  - Update the null/no-images empty state text from "No evidence images available for this session" to include next action: "No evidence images available for this session. Check if the camera was online during this session."

- [x] T003 [P] [US1] Differentiate session-not-found from API error in `src/presentation/components/inventory/InventoryRunDetail.tsx`
  - Currently `isError || !data` renders the same error view
  - After loading: check `!isLoading && !isError && !data` as a separate condition (before the `isError` check)
  - Render a distinct "not found" view: `SearchX` icon, message "No analysis found for this session", sub-text "The session may not have been analyzed yet, or the ID may be incorrect."
  - Add `data-testid="run-detail-not-found"` to the not-found container
  - Include a Back button but no Retry button (retrying a 404 won't help)
  - Keep the existing `isError` path unchanged (with Retry button) for actual API failures

### Component Tests

- [x] T004 [P] [US1] Add image load failure tests in `tests/component/inventory/InventoryEvidencePanel.test.tsx`
  - Test: when `before_image_url` image fires `onError`, the error placeholder with `data-testid="evidence-before-error"` appears and contains "Image unavailable"
  - Test: when `after_image_url` image fires `onError`, the error placeholder with `data-testid="evidence-after-error"` appears
  - Test: when both images fail, both error placeholders appear
  - Test: evidence empty state contains "Check if the camera was online" text
  - Use `fireEvent.error()` on the `<img>` elements to trigger error handlers
  - Follow existing test patterns in the same file

- [x] T005 [P] [US1] Add session-not-found state test in `tests/component/inventory/InventoryRunDetail.test.tsx`
  - Test: when `useSessionDelta` returns `{ data: null, isLoading: false, isError: false }`, the component renders `data-testid="run-detail-not-found"` with "No analysis found for this session"
  - Test: the not-found view does NOT show a Retry button
  - Test: the not-found view shows a Back button that calls `onBack`
  - Mock `useSessionDelta` to return the null-no-error state
  - Follow existing test patterns in the same file (mock hooks at module level)

### E2E Tests

- [x] T006 [US1] Create E2E test suite for operational edge cases in `tests/e2e/session-drilldown-e2e.spec.ts`
  - Depends on T001 (fixtures), T002, T003 (component fixes)
  - Import setup functions from `./fixtures/session-drilldown-e2e-mocks`
  - Follow the test structure in `tests/e2e/inventory-review-drilldown.spec.ts`
  - **Test 1 — Image load failure**: Use `setupBrokenImageMocks()`, navigate to drill-down, verify `evidence-before-error` or `evidence-after-error` placeholder is visible with "Image unavailable" text
  - **Test 2 — Evidence empty state**: Use `setupEmptyEvidenceMocks()`, navigate to drill-down, verify `evidence-no-images` is visible and contains "Check if the camera was online"
  - **Test 3 — Processing state with stale warning**: Use `setupProcessingStateMocks()`, navigate to drill-down, verify `stale-analysis-warning` is visible with "Analysis may be stuck" text
  - **Test 4 — Pending state detail**: Use `setupPendingStateMocks()`, navigate to drill-down, verify processing indicator is visible and timeline shows first step active
  - **Test 5 — Session not found**: Use `setupSessionNotFoundMocks()`, navigate to session lookup, enter a non-existent session ID, verify `run-detail-not-found` is visible with "No analysis found"

**Checkpoint**: US1 is complete — all session states and edge cases render meaningful views with no broken UI

---

## Phase 3: Polish & Validation

**Purpose**: Verify no regressions and all quality gates pass

- [x] T007 Run lint, TypeScript compilation, and full unit/component test suite to verify no regressions: `npm run lint && npm run build && VITEST_MAX_WORKERS=1 npm test`
- [x] T008 Run full E2E test suite including new and existing inventory tests: `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/session-drilldown-e2e.spec.ts tests/e2e/inventory-review-drilldown.spec.ts tests/e2e/inventory-correction-flow.spec.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **US1 (Phase 2)**: Implementation tasks T002, T003 have no dependencies; test tasks T004, T005 depend on T002, T003 respectively; T006 depends on T001 + T002 + T003
- **Polish (Phase 3)**: Depends on all Phase 2 tasks being complete

### Parallel Opportunities

**Wave 1** (all parallel — different files, no dependencies):
- T001: E2E mock fixtures (`tests/e2e/fixtures/`)
- T002: InventoryEvidencePanel fix (`src/presentation/`)
- T003: InventoryRunDetail fix (`src/presentation/`)

**Wave 2** (parallel — different test files, depend on Wave 1):
- T004: Evidence panel tests (depends on T002)
- T005: Run detail tests (depends on T003)

**Wave 3** (sequential — depends on T001 + T002 + T003):
- T006: E2E test suite

**Wave 4** (sequential — depends on all above):
- T007: Lint + build + unit tests
- T008: Full E2E validation

### User Story Dependencies

- **US1 (P1)**: Sole implementation target. No dependencies on other stories.
- **US2 (P2)**: Already complete (Feature 055). No tasks needed.
- **US3 (P2)**: Already complete (Feature 055). No tasks needed.
- **US4 (P3)**: Already complete (Feature 055). No tasks needed.

---

## Parallel Example: Wave 1

```bash
# Launch all Wave 1 tasks in parallel (different files, no dependencies):
Task: "Create E2E mock fixtures in tests/e2e/fixtures/session-drilldown-e2e-mocks.ts"
Task: "Fix InventoryEvidencePanel image error state in src/presentation/components/inventory/InventoryEvidencePanel.tsx"
Task: "Fix InventoryRunDetail session-not-found in src/presentation/components/inventory/InventoryRunDetail.tsx"
```

---

## Implementation Strategy

### MVP First (US1 Only — this is the full scope)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: US1 implementation (T002-T003) + tests (T004-T006)
3. Complete Phase 3: Validation (T007-T008)
4. **DONE**: All spec requirements met

### Why US2-US4 Need No Work

Research findings (documented in `research.md`):
- **US2 (Correlation ID)**: RunDebugInfo displays all 7 required fields with copy-to-clipboard and toast feedback. 9 existing component tests cover expand/collapse and copy behavior.
- **US3 (Sensitive Data)**: No raw storage paths, bucket names, or internal URLs appear anywhere in the drill-down. Only operational metadata is displayed.
- **US4 (Performance)**: Loading skeletons render immediately. Text content and images load independently (separate `imageLoading` state per image).

---

## Notes

- [P] tasks = different files, no dependencies
- [US1] label maps task to User Story 1 (Complete Session Investigation)
- Total scope: 3 component changes + 3 new test files + 2 validation runs
- All changes stay within the presentation layer — no domain, application, or infrastructure modifications
- Resource constraints: always use `VITEST_MAX_WORKERS=1` and `PLAYWRIGHT_WORKERS=1`
