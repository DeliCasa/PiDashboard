# Tasks: Inventory Delta Viewer & Human Review Workflow

**Input**: Design documents from `/specs/047-inventory-delta-viewer/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included - constitution III (Test Discipline) mandates contract tests, component tests, hook integration tests, and E2E tests.

**Organization**: Tasks grouped by user story. Each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Zod schemas, domain types, API client, query keys, mock fixtures, and MSW handlers that all user stories depend on.

- [x] T001 [P] Create Zod schemas for all inventory delta entities in src/infrastructure/api/inventory-delta-schemas.ts — define AnalysisStatusSchema, ItemConditionSchema, ReviewActionSchema, BoundingBoxSchema, InventoryItemSchema, DeltaEntrySchema, OverlayItemSchema, OverlayDataSchema, EvidenceImagesSchema, ReviewCorrectionSchema, ReviewSchema, AnalysisMetadataSchema, InventoryAnalysisRunSchema, InventoryLatestResponseSchema, SubmitReviewRequestSchema, ReviewResponseSchema with type exports per contracts/inventory-delta-api.md
- [x] T002 [P] Create domain types re-export in src/domain/types/inventory.ts — re-export InventoryAnalysisRun, InventoryItem, DeltaEntry, BoundingBox, EvidenceImages, OverlayData, OverlayItem, Review, ReviewCorrection, AnalysisMetadata, AnalysisStatus, ReviewAction, SubmitReviewRequest from schema file (domain layer re-export only, no infrastructure imports in consuming components)
- [x] T003 [P] Create mock fixtures in tests/mocks/inventory-delta-fixtures.ts — export mockInventoryRun variants for all 5 statuses (pending, completed, needs_review, approved, failed), high/low confidence variants, zero-delta variant, reviewed-with-corrections variant, single-image-only variant. All fixtures must pass InventoryAnalysisRunSchema validation.
- [x] T004 Create API client in src/infrastructure/api/inventory-delta.ts — implement inventoryDeltaApi object with getLatest(containerId), getBySession(sessionId), submitReview(runId, data) methods. Use apiClient.get/post, validate responses with safeParse against InventoryLatestResponseSchema/ReviewResponseSchema, handle V1ApiError, 10-second timeout per request.
- [x] T005 Add inventory query keys and invalidation helpers to src/lib/queryClient.ts — add inventory: ['inventory'] as const, inventoryLatest: (containerId: string) => [...queryKeys.inventory, 'latest', containerId] as const, inventoryBySession: (sessionId: string) => [...queryKeys.inventory, 'session', sessionId] as const. Add invalidateQueries.inventory entry.
- [x] T006 Create React Query hooks in src/application/hooks/useInventoryDelta.ts — implement useLatestInventory(containerId, enabled) with 15-second visibility-aware polling that stops for terminal statuses (completed/approved/failed), useSessionDelta(sessionId, enabled), useSubmitReview() mutation that invalidates inventory queries and shows toast on success/error. Use useActiveContainerId for container scoping.
- [x] T007 Add MSW handlers for inventory endpoints to tests/mocks/handlers.ts — add handlers for GET /api/v1/containers/:containerId/inventory/latest (returns mockInventoryRunCompleted), GET /api/v1/sessions/:sessionId/inventory-delta, POST /api/v1/inventory/:runId/review. Use fixtures from T003.
- [x] T008 Add inventory-specific error codes to src/infrastructure/api/errors.ts — add INVENTORY_NOT_FOUND, REVIEW_CONFLICT, REVIEW_INVALID to ERROR_MESSAGES with user-friendly messages per research.md RQ-8.

**Checkpoint**: All infrastructure ready. Tests, hooks, and components can now reference schemas, fixtures, API client, and hooks.

---

## Phase 2: Foundational Tests (Blocking Prerequisites)

**Purpose**: Contract tests and hook integration tests that validate the infrastructure before UI work.

**CRITICAL**: These tests must pass before any component implementation begins.

- [x] T009 [P] Create contract tests in tests/integration/contracts/inventory-delta.contract.test.ts — validate all mock fixture variants against their respective schemas (InventoryAnalysisRunSchema, InventoryLatestResponseSchema, ReviewResponseSchema, SubmitReviewRequestSchema). Test enum schemas reject invalid values. Test all 5 status variants pass. Test reviewed fixtures include valid ReviewSchema.
- [x] T010 [P] Create API client unit tests in tests/unit/api/inventory-delta.test.ts — test getLatest returns validated data, getBySession returns validated data, submitReview sends correct POST body. Test error handling: 404 returns INVENTORY_NOT_FOUND, 409 returns REVIEW_CONFLICT, 503 triggers isFeatureUnavailable. Mock apiClient calls.
- [x] T011 Create hook integration tests in tests/integration/hooks/useInventoryDelta.test.ts — test useLatestInventory fetches and returns data, polling pauses on terminal status, useSubmitReview sends review and invalidates cache. Use MSW handlers from T007. Wrap renders with test QueryClient.

**Checkpoint**: Infrastructure validated. Schema, API client, and hooks are tested.

---

## Phase 3: User Story 1 — View Latest Inventory Delta for a Container (Priority: P1) MVP

**Goal**: Operator selects a container and sees the latest inventory delta with per-item before/after counts, change values, and confidence badges. Handles all 5 session states (pending, completed, needs_review, approved, failed), empty state (no analysis), and service-unavailable degradation.

**Independent Test**: Select a container → navigate to Inventory tab → verify delta table shows items with before counts, after counts, change (+/-), and confidence badges. Switch container → verify delta updates.

### Tests for User Story 1

- [x] T012 [P] [US1] Create component tests in tests/component/inventory/InventoryDeltaTable.test.tsx — test renders delta rows with item name, before_count, after_count, change (+/-), confidence badge (High/Medium/Low colors). Test zero-change row renders "No change". Test empty delta shows "No changes detected" message. Test low-confidence banner when all items below 0.5. Verify data-testid attributes.
- [x] T013 [P] [US1] Create component tests in tests/component/inventory/InventorySection.test.tsx — test loading state shows skeleton, completed state renders InventoryDeltaTable, pending state shows "Analysis in progress" message with spinner, failed state shows error with reason and refresh button, empty/404 state shows "No inventory data" message, service unavailable (503) shows graceful degradation message. Test container scoping: no container selected shows "Select a container" prompt. Verify data-testid attributes.

### Implementation for User Story 1

- [x] T014 [P] [US1] Create InventoryDeltaTable component in src/presentation/components/inventory/InventoryDeltaTable.tsx — accept delta: DeltaEntry[] prop. Render table with columns: Item (name + SKU in muted), Before, After, Change (green +N / red -N / gray 0), Confidence (Badge: High green, Medium amber, Low red). Show "No changes detected" when all changes are 0. Show "Low Confidence" banner when average confidence < 0.5. Add data-testid="inventory-delta-table", data-testid="delta-row-{index}", data-testid="confidence-badge-{index}".
- [x] T015 [US1] Create InventorySection component in src/presentation/components/inventory/InventorySection.tsx — use useActiveContainerId() for scoping; if null, render "Select a container" prompt. Use useLatestInventory(containerId). Implement state machine: isLoading → Skeleton, isError + isFeatureUnavailable → "Inventory unavailable" card, isError → ErrorDisplay with retry, data.status === 'pending' → pending card with spinner, data.status === 'failed' → error card with metadata.error_message, !data (404) → empty state, data with delta → render InventoryDeltaTable. Add data-testid="inventory-section", "inventory-loading", "inventory-empty", "inventory-pending", "inventory-error", "inventory-unavailable".
- [x] T016 [US1] Add Inventory tab to src/App.tsx — import ClipboardList from lucide-react and InventorySection. Add TabsTrigger value="inventory" with ClipboardList icon, label "Inventory", data-testid="tab-inventory". Place between Containers and Door triggers. Add TabsContent value="inventory" wrapping InventorySection in ErrorBoundary.
- [x] T017 [US1] Verify lint, build, and tests pass — run npm run lint, npm run build, VITEST_MAX_WORKERS=1 npm test. Fix any issues.

**Checkpoint**: User Story 1 complete. Operator can view delta for any container. All 5 states handled. Tab visible and functional.

---

## Phase 4: User Story 2 — View Before/After Evidence Images (Priority: P2)

**Goal**: Operator sees before/after images side-by-side below the delta table. Optional overlay toggle shows bounding boxes over images. Click-to-expand opens full-resolution modal.

**Independent Test**: Open a completed session → verify before/after images display side-by-side with labels → toggle overlay → verify bounding boxes appear → click image → verify modal opens with full resolution.

### Tests for User Story 2

- [x] T018 [P] [US2] Create component tests in tests/component/inventory/InventoryEvidencePanel.test.tsx — test renders two images side-by-side with "Before"/"After" labels when both URLs present. Test single image (only after_image_url) shows image + placeholder for missing. Test no images shows "No evidence images" message. Test overlay toggle appears when overlays data present. Test overlay toggle shows/hides bounding box divs. Test click on image opens full-screen dialog. Test loading state for images (skeleton). Verify data-testid attributes.

### Implementation for User Story 2

- [x] T019 [US2] Create InventoryEvidencePanel component in src/presentation/components/inventory/InventoryEvidencePanel.tsx — accept evidence: EvidenceImages | null prop. Render 2-column grid (stacked on mobile) with Before/After labels. Each image in relative container with loading skeleton and error fallback. Optional overlay toggle (Switch component) when evidence.overlays exists. Overlay renders positioned divs with label, border, and semi-transparent background. Click image opens Dialog with full-size image. Add data-testid="evidence-panel", "evidence-before", "evidence-after", "overlay-toggle", "evidence-modal".
- [x] T020 [US2] Integrate InventoryEvidencePanel into InventorySection in src/presentation/components/inventory/InventorySection.tsx — render InventoryEvidencePanel below InventoryDeltaTable when data.evidence exists and status is completed/needs_review/approved. Pass data.evidence prop.
- [x] T021 [US2] Verify lint, build, and tests pass — run npm run lint, npm run build, VITEST_MAX_WORKERS=1 npm test. Fix any issues.

**Checkpoint**: User Stories 1 and 2 complete. Operator can view delta and evidence images with overlays.

---

## Phase 5: User Story 3 — Submit Review: Approve or Correct Delta (Priority: P3)

**Goal**: Operator can approve a delta as-is or enter edit mode to correct counts, add missing items, remove false positives, rename items, then submit the review. Form preserves edits on submission failure.

**Independent Test**: Open a needs_review session → click Approve → verify status changes to approved. Open another needs_review session → edit a count, add an item, remove an item → submit → verify corrections persist on reload.

### Tests for User Story 3

- [x] T022 [P] [US3] Create component tests in tests/component/inventory/InventoryReviewForm.test.tsx — test Approve button visible for needs_review/completed status, hidden for approved/pending/failed. Test Approve click calls submitReview with action:"approve". Test "Edit & Correct" button toggles inline edit mode on delta table. Test editing a count updates local state. Test "Add Item" adds a new row with name/count inputs. Test "Remove" marks item as removed (strikethrough). Test rename item updates name field. Test Submit Review opens confirmation AlertDialog. Test confirmation submits with corrections array. Test failed submission preserves edits (form not cleared). Test review conflict (409) shows toast. Verify data-testid attributes.

### Implementation for User Story 3

- [x] T023 [US3] Create InventoryReviewForm component in src/presentation/components/inventory/InventoryReviewForm.tsx — accept run: InventoryAnalysisRun prop and onReviewSubmitted callback. Show "Approve" button and "Edit & Correct" button when status is needs_review or completed and review is null. Approve calls useSubmitReview with action:"approve". Edit mode converts delta table to editable: count fields become number inputs, each row gets remove button, bottom gets "Add Item" button. Name field editable for rename. Build corrections array from diffs. Submit opens AlertDialog with summary of changes. On confirm, call useSubmitReview with action:"override" and corrections. On error, preserve form state (don't reset). Toast for success/error. Handle 409 REVIEW_CONFLICT with specific message.
- [x] T024 [US3] Integrate InventoryReviewForm into InventorySection in src/presentation/components/inventory/InventorySection.tsx — render InventoryReviewForm below evidence panel (or below delta table if no evidence) when data.status is completed or needs_review and data.review is null. Pass data as run prop. On review submitted, invalidate query to refresh display.
- [x] T025 [US3] Verify lint, build, and tests pass — run npm run lint, npm run build, VITEST_MAX_WORKERS=1 npm test. Fix any issues.

**Checkpoint**: User Stories 1-3 complete. Full review workflow operational.

---

## Phase 6: User Story 4 — View Review Audit Trail (Priority: P4)

**Goal**: After a session is reviewed, display who reviewed it, when, what action was taken, and what corrections were made (diff of original vs. corrected values).

**Independent Test**: View an approved session that had corrections → verify audit section shows reviewer, timestamp, and corrections diff. View an approved-as-is session → verify "Approved as-is" note. View an unreviewed session → verify no audit section.

### Tests for User Story 4

- [x] T026 [P] [US4] Create component tests in tests/component/inventory/InventoryAuditTrail.test.tsx — test renders reviewer_id, reviewed_at timestamp, and action label for reviewed session. Test "override" action shows corrections table with original vs. corrected values, added items, removed items. Test "approve" action shows "Approved as-is" note. Test notes field displayed when present. Test component not rendered when review is null. Verify data-testid attributes.

### Implementation for User Story 4

- [x] T027 [US4] Create InventoryAuditTrail component in src/presentation/components/inventory/InventoryAuditTrail.tsx — accept review: Review | null prop. If null, return null. Render Card with "Review Audit" heading. Show reviewer_id in font-mono, reviewed_at formatted timestamp, action badge (Approved / Corrected). If action is "override", render corrections table: Item name, Original count, Corrected count, with visual indicators for added (green +), removed (red strikethrough). Show notes in a muted text block if present. Add data-testid="audit-trail", "audit-reviewer", "audit-timestamp", "audit-corrections".
- [x] T028 [US4] Integrate InventoryAuditTrail into InventorySection in src/presentation/components/inventory/InventorySection.tsx — render InventoryAuditTrail after review form area when data.review is not null. Pass data.review prop.
- [x] T029 [US4] Verify lint, build, and tests pass — run npm run lint, npm run build, VITEST_MAX_WORKERS=1 npm test. Fix any issues.

**Checkpoint**: All 4 user stories complete. Full feature operational.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, accessibility, and final validation.

- [x] T030 Create E2E test in tests/e2e/inventory-delta.spec.ts — test full workflow: navigate to Inventory tab → verify delta table renders → verify evidence images display → submit review (approve) → verify status changes → verify audit trail. Test pending state with mock. Test error/unavailable states. Test container switching updates delta. Use Playwright page fixtures with mock routes for all 3 endpoints.
- [x] T031 Add accessibility testing to E2E or component tests — verify axe-core passes for InventorySection, InventoryDeltaTable, InventoryEvidencePanel, InventoryReviewForm, InventoryAuditTrail. Add aria-labels to confidence badges, overlay toggle, image buttons, and review form controls.
- [x] T032 Run full validation: npm run lint && npm run build && VITEST_MAX_WORKERS=1 npm test && PLAYWRIGHT_WORKERS=1 npm run test:e2e — fix any remaining issues. Ensure 0 lint errors and all tests pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational Tests)**: Depends on Phase 1 completion — validates infrastructure
- **Phase 3 (US1)**: Depends on Phase 2 — first user story, MVP
- **Phase 4 (US2)**: Depends on Phase 3 — adds evidence images to existing InventorySection
- **Phase 5 (US3)**: Depends on Phase 3 — adds review form (can parallelize with Phase 4 if InventorySection integration is coordinated)
- **Phase 6 (US4)**: Depends on Phase 5 — displays review data produced by US3
- **Phase 7 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent — core delta view
- **US2 (P2)**: Integrates into US1's InventorySection — adds evidence panel below delta table
- **US3 (P3)**: Integrates into US1's InventorySection — adds review controls; benefits from US2 (evidence context) but works without it
- **US4 (P4)**: Depends on US3 — displays review data that US3 creates

### Within Each Phase

- Tests marked [P] can run in parallel with other [P] tasks in the same phase
- Implementation tasks within a story should generally run sequentially (component → integration → verify)
- T001, T002, T003 can all run in parallel (different files, no dependencies)

### Parallel Opportunities

```
Phase 1 parallel group:
  T001 (schemas) | T002 (domain types) | T003 (fixtures)
  → then T004 (API client), T005 (query keys), T008 (error codes)
  → then T006 (hooks), T007 (MSW handlers)

Phase 2 parallel group:
  T009 (contract tests) | T010 (API client tests)
  → then T011 (hook tests)

Phase 3 (US1) parallel group:
  T012 (delta table tests) | T013 (section tests)
  → then T014 (delta table) | T015 (section) in parallel
  → then T016 (App.tsx tab)

Phase 4 (US2):
  T018 (evidence panel tests)
  → T019 (evidence panel) → T020 (integration)

Phase 5 (US3):
  T022 (review form tests)
  → T023 (review form) → T024 (integration)

Phase 6 (US4):
  T026 (audit trail tests)
  → T027 (audit trail) → T028 (integration)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schemas, API client, hooks, fixtures, MSW)
2. Complete Phase 2: Foundational Tests (contract + hook tests)
3. Complete Phase 3: User Story 1 (delta table + section + tab)
4. **STOP and VALIDATE**: Operator can see delta for any container. All 5 states handled.
5. Deploy/demo if ready — this is a functional read-only viewer.

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 (delta view) → Test → Deploy (MVP!)
3. Add US2 (evidence images) → Test → Deploy (visual verification)
4. Add US3 (review workflow) → Test → Deploy (human-in-the-loop)
5. Add US4 (audit trail) → Test → Deploy (accountability)
6. Polish (E2E + a11y) → Final validation

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [USn] label maps task to specific user story
- All component files go in src/presentation/components/inventory/
- All test files mirror component structure in tests/component/inventory/
- MSW handlers in tests/mocks/handlers.ts must use schema-valid fixture data
- Resource constraint: always use VITEST_MAX_WORKERS=1 for test runs
- Container IDs are opaque strings — display in font-mono text-xs text-muted-foreground
- Confidence badge colors: >= 0.8 green (High), 0.5-0.79 amber (Medium), < 0.5 red (Low)
