# Tasks: Operator Review — Session Drill-down + Delta Validation UX

**Input**: Design documents from `/specs/055-session-review-drilldown/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-changes.md

**Tests**: Included — constitution mandates test files for all new components and MSW-backed hook tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Verify baseline and ensure clean starting point

- [x] T001 Verify baseline: run `npm run lint`, `npm test`, and `npm run build` pass on branch `055-session-review-drilldown`
- [x] T002 Verify existing inventory components render correctly by running `VITEST_MAX_WORKERS=1 npx vitest run tests/component/inventory`

**Checkpoint**: Baseline green — all existing functionality confirmed working

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructure changes shared by multiple user stories — MUST complete before user story work

- [x] T003 Add `_lastRequestId` module-level capture and `getLastRequestId()` export in `src/infrastructure/api/inventory-delta.ts`: set `_lastRequestId = parsed.data.request_id` inside `getLatest()` and `getBySession()` after successful Zod parse (per research R3)
- [x] T004 [P] Add `rerunAnalysis(runId)` method to `inventoryDeltaApi` in `src/infrastructure/api/inventory-delta.ts`: POST to `/v1/inventory/:runId/rerun`, return `{ supported: boolean, newRunId?: string }`, catch 404/501 as `supported: false` (per design D2)
- [x] T005 [P] Add RERUN error codes (`RERUN_NOT_SUPPORTED`, `RERUN_IN_PROGRESS`, `RERUN_FAILED`) to `ERROR_MESSAGES` registry and `getErrorCategory()` in `src/infrastructure/api/errors.ts`
- [x] T006 Add `useRerunAnalysis(runId)` hook in `src/application/hooks/useInventoryDelta.ts`: useMutation wrapping `inventoryDeltaApi.rerunAnalysis()`, with toast feedback and inventory query invalidation on success

**Checkpoint**: Foundation ready — `request_id` capture, re-run API, and error codes available for all user stories

---

## Phase 3: User Story 1 — Session Drill-down with Status Timeline (Priority: P1) MVP

**Goal**: Operator sees a 5-step visual status timeline (Created → Capture → Analysis → Delta Ready → Finalized) at the top of the run drill-down.

**Independent Test**: Open any run detail — the timeline renders for all statuses and visually distinguishes completed, active, error, and upcoming steps.

### Implementation for User Story 1

- [x] T007 [US1] Create `SessionStatusTimeline` component in `src/presentation/components/inventory/SessionStatusTimeline.tsx`: accepts `InventoryAnalysisRun` prop, derives 5 `TimelineStep` objects using `deriveTimelineSteps()` logic from data-model.md, renders horizontal step indicator with lucide icons (CheckCircle2 for completed, Circle/Loader2 for active, XCircle for error, Circle for upcoming), connected by lines with Tailwind styling. Include `data-testid="session-timeline"` and `data-testid="timeline-step-N"` attributes.
- [x] T008 [US1] Create component test in `tests/component/inventory/SessionStatusTimeline.test.tsx`: test all 5 status mappings (pending, processing, done without review, done with review, error), verify correct step statuses for each, verify `data-testid` attributes, verify error step renders error indicator.
- [x] T009 [US1] Integrate `SessionStatusTimeline` into `InventoryRunDetail` in `src/presentation/components/inventory/InventoryRunDetail.tsx`: render timeline below the "Back to list" button and above the card content for all statuses (pending, processing, done, needs_review, error). Remove or replace the existing inline status text displays in pending/processing/error states with the timeline component.

**Checkpoint**: Timeline renders in the drill-down for all run statuses. Verify by opening runs with different statuses.

---

## Phase 4: User Story 2 — Delta Review & Correction Enhancements (Priority: P1)

**Goal**: Delta table shows item count in header; empty deltas allow approval; review form is always accessible when status allows.

**Independent Test**: Open a `needs_review` run — delta table has count badge, empty delta shows approval option, corrections work end-to-end.

### Implementation for User Story 2

- [x] T010 [P] [US2] Add item count badge to `InventoryDeltaTable` header in `src/presentation/components/inventory/InventoryDeltaTable.tsx`: show `Badge` with `{delta.length} items` next to the table, visible when delta has items. Add `data-testid="delta-item-count"`.
- [x] T011 [P] [US2] Modify `InventoryReviewForm` visibility in `src/presentation/components/inventory/InventoryRunDetail.tsx`: change `showReviewForm` condition to `!data.review && (data.status === 'done' || data.status === 'needs_review')` — remove the dependency on `data.delta` being truthy, so the review form appears even when delta is null or empty (per research R6).
- [x] T012 [US2] Add empty delta approval message in `src/presentation/components/inventory/InventoryRunDetail.tsx`: when `data.delta` is null or empty array AND status is reviewable, show "No inventory changes detected" text above the review form with `data-testid="delta-empty-reviewable"`, replacing the generic "No delta data available" text in this context.
- [x] T013 [P] [US2] Create enhanced tests in `tests/component/inventory/InventoryDeltaTable.enhanced.test.tsx`: test item count badge renders with correct count, test badge hidden when delta is empty.
- [x] T014 [P] [US2] Create enhanced tests in `tests/component/inventory/InventoryReviewForm.enhanced.test.tsx`: test review form renders when delta is null, test "Approve" works with empty corrections, test form renders when delta is empty array.

**Checkpoint**: Delta table shows item counts. Empty deltas show approval option. Verify by opening a run with no delta and confirming the Approve button is available.

---

## Phase 5: User Story 3 — Evidence Preview Enhancements (Priority: P2)

**Goal**: Better placeholder messages when evidence is partially available (before-only, after-only).

**Independent Test**: Open a run with partial evidence — appropriate placeholder messages display for each missing image slot.

### Implementation for User Story 3

- [x] T015 [US3] Enhance `InventoryEvidencePanel` in `src/presentation/components/inventory/InventoryEvidencePanel.tsx`: replace the generic `ImageIcon` placeholder with descriptive messages — when `before_image_url` is missing show "Before image not captured" text with `data-testid="evidence-before-missing"`, when `after_image_url` is missing show "After image not captured" with `data-testid="evidence-after-missing"`. Update the top-level null check message to "No evidence images available for this session" with `data-testid="evidence-no-images"` (already exists, verify wording matches spec).
- [x] T016 [P] [US3] Create enhanced tests in `tests/component/inventory/InventoryEvidencePanel.enhanced.test.tsx`: test before-only evidence (before renders, after shows placeholder), test after-only evidence (after renders, before shows placeholder), test both missing shows overall message, test both present shows both images.

**Checkpoint**: Evidence panel shows descriptive placeholders for all partial states. Verify with mock data for each combination.

---

## Phase 6: User Story 4 — Failure UX & Recovery Actions (Priority: P2)

**Goal**: Enhanced error states with copy-to-clipboard, conditional re-run button, stale analysis warning, and auth error guidance.

**Independent Test**: Simulate each error condition and verify the correct message and available actions appear.

### Implementation for User Story 4

- [x] T017 [US4] Enhance error state in `InventoryRunDetail` (`src/presentation/components/inventory/InventoryRunDetail.tsx`): for `status === 'error'`, add a "Copy Error Details" button that copies JSON with `{ run_id, session_id, container_id, error_message }` to clipboard via `navigator.clipboard.writeText()` + `toast.success('Copied')`. Add `data-testid="copy-error-details"`.
- [x] T018 [US4] Add conditional re-run button in `InventoryRunDetail` error state: show "Request Re-run" button that calls `useRerunAnalysis(runId)` from T006. On success, show toast and invalidate inventory queries. On 404/501, hide the button and show "Contact support with the details below." Use `data-testid="rerun-btn"` and `data-testid="rerun-unsupported"`.
- [x] T019 [US4] Add stale analysis warning in `InventoryRunDetail` processing state: when `run.status === 'processing'` and `Date.now() - new Date(run.metadata.created_at).getTime() > 5 * 60 * 1000`, show an Alert with "Analysis may be stuck — started over 5 minutes ago" and a "Refresh" button that calls `refetch()`. Add `data-testid="stale-analysis-warning"`.
- [x] T020 [US4] Add auth error handling in `InventoryRunDetail` error state: detect `V1ApiError.isAuthError()` or HTTP 401/403 on the query error and show "Authentication error — the device may need re-authorization. Check the Pi's connection to BridgeServer." with `data-testid="auth-error-banner"`.
- [x] T021 [P] [US4] Create enhanced tests in `tests/component/inventory/InventoryRunDetail.enhanced.test.tsx`: test copy error details button copies correct JSON, test re-run button shows for error runs, test re-run button hides after 404 response, test stale analysis warning shows after 5 minutes, test auth error banner shows for 401/403 errors. Use MSW handlers to mock API responses.

**Checkpoint**: All error states show actionable messages. Verify by rendering runs with error/processing/auth-error status in tests.

---

## Phase 7: User Story 5 — CorrelationId & Diagnostic Metadata Display (Priority: P3)

**Goal**: Collapsible "Debug Info" section at the bottom of drill-down showing all metadata with copy buttons.

**Independent Test**: Open any run detail, expand Debug Info, verify all fields render with copy buttons.

### Implementation for User Story 5

- [x] T022 [US5] Create `RunDebugInfo` component in `src/presentation/components/inventory/RunDebugInfo.tsx`: accepts `InventoryAnalysisRun` prop, uses `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` from shadcn/ui. Shows a "Debug Info" toggle that expands to display: Run ID, Session ID, Container ID, Provider, Processing Time (ms), Model Version, Request ID (from `getLastRequestId()`). Each ID field rendered in `font-mono text-xs` with a copy button (lucide `Copy` icon) that calls `navigator.clipboard.writeText(fullValue)` + `toast.success('Copied')`. Add `data-testid="debug-info"`, `data-testid="debug-info-toggle"`, and `data-testid="debug-copy-{field}"` attributes.
- [x] T023 [P] [US5] Create component test in `tests/component/inventory/RunDebugInfo.test.tsx`: test collapsible starts closed, test toggle opens it, test all metadata fields render with correct values, test copy buttons call navigator.clipboard, test request_id displays when available, test request_id field absent when getLastRequestId returns undefined.
- [x] T024 [US5] Integrate `RunDebugInfo` into `InventoryRunDetail` in `src/presentation/components/inventory/InventoryRunDetail.tsx`: render at the bottom of the card content (after audit trail or review form) for all terminal statuses (done, needs_review, error). Pass the `data` (InventoryAnalysisRun) prop.

**Checkpoint**: Debug Info section appears in drill-down. Expand it and verify all fields render with copy functionality.

---

## Phase 8: User Story 6 — Demo Script E2E (Priority: P3)

**Goal**: E2E test validating the 10-step operator review walkthrough.

**Independent Test**: Run the E2E test — it covers the full operator workflow from list to finalized.

### Implementation for User Story 6

- [x] T025 [US6] Create E2E test in `tests/e2e/inventory-review-drilldown.spec.ts`: implement the 10-step demo script from spec US6 using Playwright. Mock all API endpoints via `page.route()`: run list returns runs with `needs_review` status, session lookup returns a specific run, review submission returns success, evidence URLs return placeholder images. Steps: navigate to Inventory tab → search by session ID → verify timeline shows "Delta Ready" → verify evidence panel → verify delta table → click "Edit & Correct" → change a count → submit → verify timeline updates to "Finalized" → verify audit trail → expand Debug Info → verify copy. Add `data-testid` selectors throughout.
- [x] T026 [P] [US6] Create MSW mock fixtures for E2E in `tests/e2e/fixtures/inventory-review-mocks.ts`: export mock data for run list, single run detail (needs_review with delta, evidence, metadata), review success response, and evidence list response. These fixtures are reused by the E2E mock routes.

**Checkpoint**: E2E test passes with `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/inventory-review-drilldown.spec.ts`

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories

- [x] T027 Run full lint check: `npm run lint` — fix any new ESLint errors introduced by this feature
- [x] T028 Run full test suite: `VITEST_MAX_WORKERS=1 npm test` — verify all existing and new tests pass
- [x] T029 Run TypeScript build: `npm run build` — verify no compilation errors
- [x] T030 Run E2E smoke tests: `PLAYWRIGHT_WORKERS=1 npm run test:e2e` — verify no regressions
- [x] T031 Validate quickstart.md: walk through `specs/055-session-review-drilldown/quickstart.md` dev setup steps and verify they work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — can start as soon as foundation is done
- **US2 (Phase 4)**: Depends on Phase 2 — can run in parallel with US1 (different files)
- **US3 (Phase 5)**: Depends on Phase 2 — can run in parallel with US1/US2 (different file)
- **US4 (Phase 6)**: Depends on Phase 2 (re-run hook T006) — can run in parallel with US1/US2/US3
- **US5 (Phase 7)**: Depends on Phase 2 (`getLastRequestId` from T003) — can run in parallel with US1-US4
- **US6 (Phase 8)**: Depends on US1+US2+US3+US4+US5 (tests the composed workflow)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Timeline)**: Independent after Phase 2 — no dependency on other stories
- **US2 (Delta Review)**: Independent after Phase 2 — no dependency on other stories
- **US3 (Evidence)**: Independent after Phase 2 — no dependency on other stories
- **US4 (Failure UX)**: Independent after Phase 2 — no dependency on other stories
- **US5 (Debug Info)**: Independent after Phase 2 — no dependency on other stories
- **US6 (Demo E2E)**: Depends on US1–US5 (integration test)

### Within Each User Story

- Component implementation before integration into parent component
- Tests can run in parallel with integration tasks (different files)
- Integration task (adding to InventoryRunDetail) depends on component being complete

### Parallel Opportunities

- **Phase 2**: T004 and T005 can run in parallel (different files)
- **Phases 3–7**: All five user stories (US1–US5) can run in parallel after Phase 2
- **Within US2**: T010, T011, T013, T014 can all run in parallel (different files)
- **Within US4**: T021 can run in parallel with T017–T020 (test file vs source files)
- **Within US5**: T023 can run in parallel with T022 (test file vs source file)

---

## Parallel Example: User Stories 1 and 2

```bash
# After Phase 2 completes, launch US1 and US2 in parallel:

# Stream 1: US1 - Timeline
Task: "Create SessionStatusTimeline component in src/presentation/components/inventory/SessionStatusTimeline.tsx"
Task: "Create SessionStatusTimeline tests in tests/component/inventory/SessionStatusTimeline.test.tsx"
Task: "Integrate timeline into InventoryRunDetail"

# Stream 2: US2 - Delta Review
Task: "Add item count badge to InventoryDeltaTable in src/presentation/components/inventory/InventoryDeltaTable.tsx"
Task: "Modify InventoryReviewForm visibility in src/presentation/components/inventory/InventoryRunDetail.tsx"
# Note: US2 T011 touches InventoryRunDetail — coordinate with US1 T009 to avoid merge conflicts
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (verify baseline)
2. Complete Phase 2: Foundational (request_id capture, re-run API, error codes)
3. Complete Phase 3: US1 — Timeline (the signature visual element)
4. Complete Phase 4: US2 — Delta Review Enhancements (item count badge, empty delta approval)
5. **STOP and VALIDATE**: Run lint + tests + build. Test US1 and US2 independently.
6. Deploy/demo: Timeline + enhanced review is the minimum viable demo

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Timeline) → Test independently → **MVP demo-ready**
3. Add US2 (Delta Review) → Test independently → Enhanced review
4. Add US3 (Evidence) → Test independently → Better evidence UX
5. Add US4 (Failure UX) → Test independently → Robust error handling
6. Add US5 (Debug Info) → Test independently → Observability layer
7. Add US6 (E2E) → Full demo validation
8. Polish → Production-ready

### Sequential Single-Developer Strategy

Recommended order for one developer:

1. Phase 1 + Phase 2 (foundation)
2. Phase 3: US1 (timeline — touches InventoryRunDetail first)
3. Phase 4: US2 (delta review — minor InventoryRunDetail changes)
4. Phase 7: US5 (debug info — adds to InventoryRunDetail bottom)
5. Phase 6: US4 (failure UX — final InventoryRunDetail error state changes)
6. Phase 5: US3 (evidence — separate file, no InventoryRunDetail conflicts)
7. Phase 8: US6 (E2E — validates everything)
8. Phase 9: Polish

This order minimizes merge conflicts in `InventoryRunDetail.tsx` by batching related changes.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after Phase 2
- `InventoryRunDetail.tsx` is modified by US1 (T009), US2 (T011, T012), US4 (T017-T020), and US5 (T024) — coordinate when running stories in parallel
- Resource constraint: always use `VITEST_MAX_WORKERS=1` for tests and `PLAYWRIGHT_WORKERS=1` for E2E
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
