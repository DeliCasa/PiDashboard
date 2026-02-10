# Tasks: Inventory Review — Run History & Enhanced Review Workflow

**Input**: Design documents from `/specs/048-inventory-review/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — constitution III (Test Discipline) mandates contract tests, component tests, hook integration tests, and E2E tests.

**Organization**: Tasks grouped by user story. Each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Zod schemas, domain types, API client, query keys, mock fixtures, and MSW handlers that all user stories depend on.

- [x] T001 [P] Add run list Zod schemas to src/infrastructure/api/inventory-delta-schemas.ts — define DeltaSummarySchema, RunListItemSchema, InventoryPaginationSchema, RunListDataSchema, RunListResponseSchema, RunListFilters interface with type exports per contracts/inventory-runs-api.md
- [x] T002 [P] Add domain type re-exports to src/domain/types/inventory.ts — re-export RunListItem, DeltaSummary, RunListData, InventoryPagination, RunListFilters from the schema file
- [x] T003 [P] Add run list mock fixtures to tests/mocks/inventory-delta-fixtures.ts — export mockRunListItems array (5+ runs covering all 5 statuses), mockRunListResponse with pagination, mockRunListEmpty with zero runs, mockRunListSecondPage for pagination testing. All fixtures must pass RunListResponseSchema validation.
- [x] T004 Add getRuns API client method to src/infrastructure/api/inventory-delta.ts — implement getRuns(containerId, filters?: RunListFilters) method. Build query string from filters (limit, offset, status). Use apiClient.get, validate response with safeParse against RunListResponseSchema. Handle 404/503 via isFeatureUnavailable. 10-second timeout.
- [x] T005 Add inventory run list query keys to src/lib/queryClient.ts — add inventoryRuns: (containerId: string, filters?: RunListFilters) => [...queryKeys.inventory, 'runs', containerId, filters] as const. Ensure invalidateQueries.inventory invalidates run list queries too.
- [x] T006 Add useInventoryRuns hook to src/application/hooks/useInventoryDelta.ts — implement useInventoryRuns(containerId, filters, enabled) with 30-second visibility-aware polling that stops when all visible runs have terminal statuses (completed/approved/failed). Use isFeatureUnavailable for graceful degradation. Use placeholderData for smooth pagination transitions.
- [x] T007 Add MSW handler for run list endpoint to tests/integration/mocks/handlers.ts — add handler for GET /api/v1/containers/:containerId/inventory/runs returning mockRunListResponse. Support query parameter parsing for limit, offset, status filter.
- [x] T008 Add run list mock route to tests/e2e/fixtures/mock-routes.ts — add mock route for GET /api/v1/containers/*/inventory/runs returning paginated run list fixture data.

**Checkpoint**: All shared infrastructure ready. Tests, hooks, and components can now reference new schemas, fixtures, API client, and hooks.

---

## Phase 2: Foundational Tests (Blocking Prerequisites)

**Purpose**: Contract tests and hook integration tests that validate the infrastructure before UI work.

**CRITICAL**: These tests must pass before any component implementation begins.

- [x] T009 [P] Add run list contract tests to tests/integration/contracts/inventory-delta.contract.test.ts — validate mockRunListItems against RunListItemSchema, mockRunListResponse against RunListResponseSchema, mockRunListEmpty against RunListResponseSchema. Test DeltaSummarySchema rejects negative values. Test RunListItemSchema rejects invalid status values. Test pagination fields are validated correctly.
- [x] T010 [P] Add getRuns API client unit tests to tests/unit/api/inventory-delta.test.ts — test getRuns returns validated paginated data, test getRuns with filters builds correct query string, test 404 returns feature unavailable, test 503 triggers isFeatureUnavailable. Mock apiClient calls.
- [x] T011 Add useInventoryRuns hook integration tests to tests/integration/hooks/useInventoryDelta.test.ts — test useInventoryRuns fetches and returns paginated data, test polling pauses when all runs are terminal, test container change cancels previous request, test filters are passed to API. Use MSW handlers from T007.

**Checkpoint**: Infrastructure validated. Schemas, API client, and hooks are tested.

---

## Phase 3: User Story 1 — Browse Analysis Runs for a Container (Priority: P1) MVP

**Goal**: Operator selects a container and sees a paginated list of all analysis runs. Clicking a run shows the full detail view (delta, evidence, review, audit) using existing 047 components. Handles empty state, loading, errors, and service unavailability.

**Independent Test**: Navigate to Inventory tab → verify run list renders with status badges, timestamps, and delta summaries → click a run → verify detail view shows delta table, evidence images, and review controls → paginate to next page → verify more runs load.

### Tests for User Story 1

- [x] T012 [P] [US1] Create component tests in tests/component/inventory/InventoryRunList.test.tsx — test renders list of runs with status badge, timestamp (formatted), delta summary ("N items changed"), and truncated session ID for each. Test empty state shows "No inventory data available" message. Test loading state shows skeleton rows. Test error state shows error message with retry button. Test unavailable state (503) shows graceful degradation message. Test clicking a run calls onSelectRun with run_id. Test pagination: "Load More" button appears when has_more is true, clicking it calls onLoadMore. Test pagination button hidden when has_more is false. Verify data-testid attributes: "run-list", "run-list-item-{index}", "run-list-empty", "run-list-loading", "run-list-load-more".
- [x] T013 [P] [US1] Create component tests in tests/component/inventory/InventoryRunDetail.test.tsx — test loading state shows skeleton. Test renders InventoryDeltaTable when run has delta. Test renders InventoryEvidencePanel when run has evidence. Test renders InventoryReviewForm when run has reviewable status. Test renders InventoryAuditTrail when run has review. Test error state shows error message with retry and back button. Test back button calls onBack. Verify data-testid attributes: "run-detail", "run-detail-loading", "run-detail-error", "run-detail-back".
- [x] T014 [P] [US1] Create component tests in tests/component/inventory/InventorySection.test.tsx — test list-detail layout: initially shows run list, selecting a run shows detail view, back button returns to list. Test no container selected shows "Select a container" prompt. Test container switch resets selection and fetches new runs. Verify data-testid attributes: "inventory-section", "inventory-no-container".

### Implementation for User Story 1

- [x] T015 [US1] Create InventoryRunList component in src/presentation/components/inventory/InventoryRunList.tsx — accept runs: RunListItem[], isLoading, isError, error, isUnavailable, hasMore, onSelectRun(runId), onLoadMore, onRetry props. Render Card with list of run items. Each item shows: status Badge (color-coded per AnalysisStatus), formatted timestamp from metadata.created_at, delta summary text (e.g., "2 items changed, 1 added"), truncated session ID in font-mono text-xs text-muted-foreground. Empty state: "No inventory data available" with empty icon. Loading: Skeleton rows. Error: error message + retry Button. Unavailable: "Inventory service temporarily unavailable" card. "Load More" Button at bottom when hasMore. Add data-testid attributes per T012.
- [x] T016 [US1] Create InventoryRunDetail component in src/presentation/components/inventory/InventoryRunDetail.tsx — accept runId: string and onBack callback props. Use useSessionDelta(runId) or useLatestInventory to fetch full run detail (decide based on available data — if run list provides session_id, use getBySession). Render loading skeleton, error state with back+retry, or content: InventoryDeltaTable + InventoryEvidencePanel + InventoryReviewForm + InventoryAuditTrail (reuse all 047 components unchanged). Back button at top. Add data-testid attributes per T013.
- [x] T017 [US1] Refactor InventorySection in src/presentation/components/inventory/InventorySection.tsx — replace single-run layout with list-detail navigation. Add local state: selectedRunId (string | null). When null, render InventoryRunList using useInventoryRuns(containerId). When set, render InventoryRunDetail with selectedRunId and onBack that clears selection. Preserve no-container prompt. Handle container switch: reset selectedRunId when containerId changes. Add data-testid="inventory-section".
- [x] T018 [US1] Verify lint, build, and tests pass — run npm run lint, npm run build, VITEST_MAX_WORKERS=1 npm test. Fix any issues.

**Checkpoint**: User Story 1 complete. Operator can browse run history and view any run's detail. Pagination works. All states handled.

---

## Phase 4: User Story 2 — Look Up a Run by Session ID (Priority: P2)

**Goal**: Operator enters or pastes a session ID and jumps directly to that run's detail view. Handles not-found, whitespace trimming, and cross-container lookups.

**Independent Test**: On the Inventory tab, enter a valid session ID in the lookup field → verify detail view loads showing delta and evidence → enter an invalid session ID → verify "No inventory analysis found" error → paste a session ID with whitespace → verify it's trimmed and lookup works.

### Tests for User Story 2

- [x] T019 [P] [US2] Create component tests in tests/component/inventory/InventorySessionLookup.test.tsx — test renders input field with placeholder "Enter session ID..." and search button. Test submitting a valid session ID calls onLookup with trimmed value. Test submitting empty input shows "Please enter a session ID" error. Test submitting whitespace-only input shows error. Test leading/trailing whitespace is trimmed before lookup. Test loading state disables input and shows spinner on button. Test not-found state shows "No inventory analysis found for this session" error. Test found state calls onRunFound with the run data. Test clearing input resets error state. Verify data-testid attributes: "session-lookup", "session-lookup-input", "session-lookup-submit", "session-lookup-error".

### Implementation for User Story 2

- [x] T020 [US2] Add useSessionLookup hook to src/application/hooks/useInventoryDelta.ts — implement useSessionLookup() returning { lookup(sessionId), data, isLoading, isError, error, reset() }. Uses inventoryDeltaApi.getBySession internally. Trims input. Handles INVENTORY_NOT_FOUND error gracefully. Returns the full InventoryAnalysisRun on success.
- [x] T021 [US2] Create InventorySessionLookup component in src/presentation/components/inventory/InventorySessionLookup.tsx — render Input with placeholder "Enter session ID..." and Search Button (lucide-react Search icon). On submit: trim input, validate non-empty (show inline error if empty), call useSessionLookup. Show loading state (disabled input, spinner). Show error state with message below input. On success, call onRunFound(run) prop to navigate to detail view. Add data-testid attributes per T019.
- [x] T022 [US2] Integrate InventorySessionLookup into InventorySection in src/presentation/components/inventory/InventorySection.tsx — render InventorySessionLookup above the run list when no run is selected. When session lookup finds a run, set selectedRunId to that run's run_id (or switch to showing the full run data directly). Session lookup is not scoped to active container — if found run belongs to a different container, show a note "This run belongs to container [label/id]".
- [x] T023 [US2] Add useSessionLookup hook integration tests to tests/integration/hooks/useInventoryDelta.test.ts — test lookup with valid session ID returns run data, test lookup with invalid session ID returns INVENTORY_NOT_FOUND, test trim is applied, test reset clears state. Use MSW handlers.
- [x] T024 [US2] Verify lint, build, and tests pass — run npm run lint, npm run build, VITEST_MAX_WORKERS=1 npm test. Fix any issues.

**Checkpoint**: User Stories 1 and 2 complete. Operator can browse runs and look up by session ID.

---

## Phase 5: User Story 3 — Approve or Override a Review with Validated Inputs (Priority: P3)

**Goal**: Enhance the existing InventoryReviewForm with inline validation errors, disabled submit for invalid/empty overrides, and a correction summary in the confirmation dialog. Prevents bad data from reaching the server.

**Independent Test**: Open a needs_review run → enter edit mode → set a count to -1 → verify inline error "Count must be 0 or greater" and submit disabled → add an item with empty name → verify inline error "Item name is required" → fix errors → attempt override with no actual changes → verify "At least one correction is required" → make a valid correction → submit → verify confirmation dialog shows correction summary → confirm → verify success.

### Tests for User Story 3

- [x] T025 [P] [US3] Add validation tests to tests/component/inventory/InventoryReviewForm.test.tsx — test entering negative count shows inline error "Count must be 0 or greater" and submit button is disabled. Test adding item with empty name shows inline error "Item name is required". Test override with no corrections shows "At least one correction is required" and submit is disabled. Test valid corrections enable submit button. Test confirmation dialog shows correction count, list of changes (item name, original → corrected), added items, removed items. Test failed submission preserves all edits (form not cleared, errors displayed). Test 409 conflict shows specific toast and "Refresh & Re-review" option. Test notes field validates max 500 characters. Verify data-testid attributes: "review-error-{field}-{index}", "review-submit-disabled-reason".

### Implementation for User Story 3

- [x] T026 [US3] Add inline validation state to InventoryReviewForm in src/presentation/components/inventory/InventoryReviewForm.tsx — add per-field error tracking: Map<string, string> for errors keyed by "{field}-{index}" (e.g., "count-0", "name-2"). Validate on blur: count fields must be >= 0 (integer), name fields must be non-empty. Validate on submit attempt: override must have at least one correction (count changed, item added, or item removed). Show error text below each invalid field in text-destructive text-xs. Disable submit button when any errors exist or when override has no corrections. Add data-testid="review-error-{field}-{index}" to each error message.
- [x] T027 [US3] Enhance confirmation dialog in InventoryReviewForm in src/presentation/components/inventory/InventoryReviewForm.tsx — update the AlertDialog content to show: total correction count, itemized list of changes (item name, "original_count → corrected_count"), items marked as added (green +), items marked as removed (red strikethrough). Show notes preview if notes are non-empty.
- [x] T028 [US3] Add "Refresh & Re-review" option for 409 conflicts in InventoryReviewForm in src/presentation/components/inventory/InventoryReviewForm.tsx — when submitReview returns 409 REVIEW_CONFLICT, show toast with "This session has already been reviewed" and a "Refresh & Re-review" Button that invalidates the query and resets the form. Preserve all edits until the operator explicitly clicks refresh.
- [x] T029 [US3] Verify lint, build, and tests pass — run npm run lint, npm run build, VITEST_MAX_WORKERS=1 npm test. Fix any issues.

**Checkpoint**: User Stories 1-3 complete. Full review workflow with validation operational.

---

## Phase 6: User Story 4 — Friendly Labels for Opaque IDs (Priority: P4)

**Goal**: Consistent opaque ID display throughout the inventory UI: container labels as primary, truncated monospace IDs as secondary, click-to-copy for session/run IDs, tooltips for full values.

**Independent Test**: View the run list → verify session IDs show as truncated monospace (e.g., "a1b2c3d4...") → click a truncated ID → verify it copies to clipboard with toast "Copied!" → view run detail → verify container shows label "Kitchen Fridge" with small opaque ID below → verify no ID is parsed semantically (no "Session 1" or "Run #3").

### Tests for User Story 4

- [x] T030 [P] [US4] Add opaque ID display tests to tests/component/inventory/InventoryRunList.test.tsx — test session IDs displayed in font-mono text-xs text-muted-foreground with truncation (8 chars...4 chars for long IDs). Test clicking a truncated ID copies full value to clipboard (mock navigator.clipboard). Test toast "Copied!" appears after copy. Test no IDs are displayed as "Session 1" or "Run #3" style labels.
- [x] T031 [P] [US4] Add container label tests to tests/component/inventory/InventoryRunDetail.test.tsx — test container with configured label shows label as primary text with opaque ID as secondary muted monospace. Test container with no label shows "Unnamed Container" with opaque ID. Test container label is fetched from container store/hook.

### Implementation for User Story 4

- [x] T032 [US4] Add click-to-copy for IDs in InventoryRunList in src/presentation/components/inventory/InventoryRunList.tsx — wrap truncated session IDs in a clickable span with cursor-pointer. On click, copy full session_id to clipboard via navigator.clipboard.writeText() and show toast.success("Copied!"). Use Tooltip to show full ID on hover (desktop). Add data-testid="copy-session-id-{index}".
- [x] T033 [US4] Add container label display to InventoryRunDetail in src/presentation/components/inventory/InventoryRunDetail.tsx — use useContainerList() or the active container from Zustand store to resolve container_id to a label. Display label as primary text (CardTitle or heading), opaque ID below in font-mono text-xs text-muted-foreground with truncation. If no label, show "Unnamed Container". If run belongs to a different container than active (from session lookup), show both the label and a note.
- [x] T034 [US4] Audit all ID displays in inventory components — review InventorySection.tsx, InventoryRunList.tsx, InventoryRunDetail.tsx, InventorySessionLookup.tsx for any ID displays that don't follow the opaque pattern (font-mono text-xs text-muted-foreground, truncated, never semantically parsed). Fix any inconsistencies. Verify run_id is never displayed as "Run #N".
- [x] T035 [US4] Verify lint, build, and tests pass — run npm run lint, npm run build, VITEST_MAX_WORKERS=1 npm test. Fix any issues.

**Checkpoint**: All 4 user stories complete. Full feature operational.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, accessibility, and final validation.

- [x] T036 Update E2E tests in tests/e2e/inventory-delta.spec.ts — add tests: navigate to Inventory tab → verify run list renders → click a run → verify detail view shows delta table and evidence → go back to list → verify list is restored. Test session lookup: enter valid session ID → verify detail loads. Test enter invalid session ID → verify error message. Test pagination: verify "Load More" button works. Test validation: enter edit mode → set negative count → verify inline error → fix → submit → verify confirmation dialog. Use Playwright page fixtures with mock routes for all endpoints.
- [x] T037 Add run list mock route to tests/e2e/fixtures/mock-routes.ts and update tests/e2e/fixtures/test-base.ts — add mock intercept for GET /api/v1/containers/*/inventory/runs returning paginated fixture. Ensure E2E tests have access to all run list mock data.
- [x] T038 Add accessibility testing — verify axe-core passes for InventoryRunList, InventoryRunDetail, InventorySessionLookup. Add aria-labels to: run list items (aria-label with status and timestamp), session lookup input (aria-label), copy-to-clipboard buttons, pagination controls.
- [x] T039 Run full validation: npm run lint && npm run build && VITEST_MAX_WORKERS=1 npm test && PLAYWRIGHT_WORKERS=1 npm run test:e2e — fix any remaining issues. Ensure 0 lint errors and all tests pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational Tests)**: Depends on Phase 1 completion — validates infrastructure
- **Phase 3 (US1)**: Depends on Phase 2 — first user story, MVP
- **Phase 4 (US2)**: Depends on Phase 3 — session lookup navigates to detail view built in US1
- **Phase 5 (US3)**: Depends on Phase 3 — enhances review form used in US1's detail view
- **Phase 6 (US4)**: Depends on Phase 3 — adds ID styling to components built in US1
- **Phase 7 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent — core list-detail navigation
- **US2 (P2)**: Depends on US1 — uses InventoryRunDetail and InventorySection layout
- **US3 (P3)**: Depends on US1 — enhances InventoryReviewForm rendered within RunDetail
- **US4 (P4)**: Depends on US1 — applies ID styling to RunList and RunDetail components

### Within Each Phase

- Tests marked [P] can run in parallel with other [P] tasks in the same phase
- Implementation tasks within a story should generally run sequentially (component → integration → verify)
- T001, T002, T003 can all run in parallel (different files, no dependencies)

### Parallel Opportunities

```
Phase 1 parallel group:
  T001 (schemas) | T002 (domain types) | T003 (fixtures)
  → then T004 (API client), T005 (query keys)
  → then T006 (hooks), T007 (MSW handlers), T008 (E2E mock routes)

Phase 2 parallel group:
  T009 (contract tests) | T010 (API client tests)
  → then T011 (hook tests)

Phase 3 (US1) parallel group:
  T012 (run list tests) | T013 (run detail tests) | T014 (section tests)
  → then T015 (run list) | T016 (run detail) in parallel
  → then T017 (section refactor)

Phase 4 (US2):
  T019 (session lookup tests)
  → T020 (hook) → T021 (component) → T022 (integration)
  → T023 (hook integration tests)

Phase 5 (US3):
  T025 (validation tests)
  → T026 (inline validation) → T027 (confirmation dialog) → T028 (conflict handling)

Phase 6 (US4):
  T030 (ID copy tests) | T031 (label tests)
  → T032 (copy-to-clipboard) | T033 (container labels) in parallel
  → T034 (audit all IDs)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schemas, API client, hooks, fixtures, MSW)
2. Complete Phase 2: Foundational Tests (contract + hook tests)
3. Complete Phase 3: User Story 1 (run list + detail + section refactor)
4. **STOP and VALIDATE**: Operator can browse all runs for a container. Pagination works. Detail view shows delta/evidence/review/audit.
5. Deploy/demo if ready — this is a functional run history browser.

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 (run list + detail) → Test → Deploy (MVP!)
3. Add US2 (session lookup) → Test → Deploy (cross-system navigation)
4. Add US3 (validated review) → Test → Deploy (data quality)
5. Add US4 (friendly IDs) → Test → Deploy (polish)
6. Polish (E2E + a11y) → Final validation

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [USn] label maps task to specific user story
- All new component files go in src/presentation/components/inventory/
- All new test files mirror component structure in tests/component/inventory/
- MSW handlers in tests/integration/mocks/handlers.ts must use schema-valid fixture data
- E2E mock routes in tests/e2e/fixtures/mock-routes.ts and test-base.ts
- Resource constraint: always use VITEST_MAX_WORKERS=1 for test runs
- Container IDs are opaque strings — display in font-mono text-xs text-muted-foreground
- Feature 047 must be merged before implementation begins
- Backend dependency: run list endpoint requires handoff to PiOrchestrator/BridgeServer
