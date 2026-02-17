# Tasks: Inventory Delta Viewer E2E Verification

**Input**: Design documents from `/specs/052-delta-viewer-e2e/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED — spec acceptance criteria mandate component tests, contract tests, and E2E tests.

**Organization**: Tasks grouped by user story. All code builds on existing Features 047, 048 — no new UI components.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Foundational — Schema Extensions + Adapter

**Purpose**: Add CategorizedDelta schemas and normalizeDelta adapter. BLOCKS all user story work.

- [x] T001 Add CategorizedDelta Zod schemas (AddedItemSchema, RemovedItemSchema, ChangedQtyItemSchema, UnknownItemSchema, CategorizedDeltaSchema) in `src/infrastructure/api/inventory-delta-schemas.ts`
- [x] T002 Update `InventoryAnalysisRunSchema.delta` field to `z.union([z.array(DeltaEntrySchema), CategorizedDeltaSchema]).nullable().optional()` in `src/infrastructure/api/inventory-delta-schemas.ts`
- [x] T003 Re-export new CategorizedDelta types (CategorizedDelta, AddedItem, RemovedItem, ChangedQtyItem, UnknownItem) in `src/domain/types/inventory.ts`
- [x] T004 Create `normalizeDelta()` adapter function that converts CategorizedDelta to DeltaEntry[] using mapping rules from data-model.md, with `isCategorizedDelta()` type guard, in `src/infrastructure/api/inventory-delta-adapter.ts`
- [x] T005 [P] Add categorized delta mock fixture variants (mockInventoryRunCategorized, mockInventoryRunCategorizedMixed) in `tests/mocks/inventory-delta-fixtures.ts`

**Checkpoint**: Schemas compile, adapter function exists, existing tests still pass (`VITEST_MAX_WORKERS=1 npm test`)

---

## Phase 2: User Story 1 — Load and View Delta by Identifiers (Priority: P1) MVP

**Goal**: Prove PiDashboard can load a delta in both flat and categorized formats and render it correctly via the existing component pipeline.

**Independent Test**: Select a container, click a run, verify the delta table shows correct item names and counts for both delta formats.

### Tests for User Story 1

- [x] T006 [P] [US1] Unit test `normalizeDelta()` in `tests/unit/api/inventory-delta-adapter.test.ts`: test added→DeltaEntry, removed→DeltaEntry, changed_qty→DeltaEntry, unknown→DeltaEntry, empty categorized delta, null passthrough, flat array passthrough
- [x] T007 [P] [US1] Contract test: categorized delta fixtures pass `InventoryAnalysisRunSchema` validation in `tests/integration/contracts/inventory-delta.contract.test.ts` (extend existing file)

### Implementation for User Story 1

- [x] T008 [US1] Wire `normalizeDelta()` into `useSessionDelta` hook: after fetching, detect delta format and normalize categorized→flat before returning to components, in `src/application/hooks/useInventoryDelta.ts`
- [x] T009 [US1] Wire `normalizeDelta()` into `useLatestInventory` hook: same normalization after fetch, in `src/application/hooks/useInventoryDelta.ts`
- [x] T010 [US1] Component test: `InventoryDeltaTable` renders categorized delta data (via normalization) with correct item names, before/after counts, and change values in `tests/component/inventory/InventoryDeltaTable.test.tsx` (extend existing file)

**Checkpoint**: Categorized delta loads and renders identically to flat delta. Run `VITEST_MAX_WORKERS=1 npm test -- --testPathPattern inventory`

---

## Phase 3: User Story 2 — Diff Summary with Status Badges and Per-Item Changes (Priority: P1)

**Goal**: Verify rendering fidelity across all analysis states — success, zero-delta, needs_review, error — with correct status badges, confidence tiers, and per-item formatting.

**Independent Test**: Render each fixture variant and assert exact text content for item names, counts, change signs, confidence badges, and status indicators.

### Tests for User Story 2

- [x] T011 [P] [US2] Component test: `InventoryDeltaTable` renders mixed changes (added +N green, removed -N red, changed quantities) with correct sign formatting and confidence tier badges (high/medium/low) in `tests/component/inventory/InventoryDeltaTable.test.tsx`
- [x] T012 [P] [US2] Component test: `InventoryDeltaTable` renders zero-delta fixture with "no changes detected" message (not an empty table) in `tests/component/inventory/InventoryDeltaTable.test.tsx`
- [x] T013 [P] [US2] Component test: `InventoryRunDetail` renders needs_review status badge and shows review form when run has no existing review, in `tests/component/inventory/InventoryRunDetail.test.tsx` (extend existing)
- [x] T014 [P] [US2] Component test: `InventoryRunDetail` renders error status with error_message from metadata and back/retry action in `tests/component/inventory/InventoryRunDetail.test.tsx`

**Checkpoint**: All 5 analysis statuses render with distinct badges and correct content. Run `VITEST_MAX_WORKERS=1 npm test -- --testPathPattern "DeltaTable|RunDetail"`

---

## Phase 4: User Story 3 — Actionable Error States (Priority: P2)

**Goal**: Verify error conditions produce specific, actionable messages (not generic failures) with retry buttons where appropriate.

**Independent Test**: Simulate each error scenario (404, 503, network failure, empty input) and verify rendered error text and retry button presence.

### Tests for User Story 3

- [x] T015 [P] [US3] Component test: `InventoryRunDetail` shows "No inventory analysis found" for 404 not-found error in `tests/component/inventory/InventoryRunDetail.test.tsx`
- [x] T016 [P] [US3] Component test: `InventoryRunDetail` shows processing spinner with "Analysis in progress" for pending/processing status in `tests/component/inventory/InventoryRunDetail.test.tsx`
- [x] T017 [P] [US3] Component test: `InventoryRunList` shows "Service temporarily unavailable" with retry button for 503/network errors in `tests/component/inventory/InventoryRunList.test.tsx` (extend existing)
- [x] T018 [US3] Component test: `InventorySessionLookup` shows client-side validation error for empty/whitespace session ID input (no API call made) in `tests/component/inventory/InventorySessionLookup.test.tsx` (extend existing)

**Checkpoint**: Each error condition renders a distinct, actionable message. Run `VITEST_MAX_WORKERS=1 npm test -- --testPathPattern "RunDetail|RunList|SessionLookup"`

---

## Phase 5: User Story 4 — Contract Drift Prevention (Priority: P2)

**Goal**: Create golden fixtures representing canonical BridgeServer responses and validate them against PiDashboard schemas with strict mode to catch any field additions, removals, or type changes.

**Independent Test**: Run golden contract tests; intentionally add an unknown field to a fixture and verify the strict test fails.

### Implementation for User Story 4

- [x] T019 [P] [US4] Create golden fixture file with canonical BridgeServer response shapes: golden success (flat delta), golden success (categorized delta), golden pending, golden error, golden with review, in `tests/mocks/inventory-delta-golden.ts`
- [x] T020 [P] [US4] Create golden contract test file that validates each golden fixture against PiDashboard schemas using `z.strict()` wrappers to reject unknown fields, in `tests/integration/contracts/inventory-delta-golden.contract.test.ts`
- [x] T021 [US4] Add enum exhaustiveness test: verify all BridgeServer AnalysisStatus values (pending, processing, done, needs_review, error) are present in PiDashboard's AnalysisStatusSchema, in `tests/integration/contracts/inventory-delta-golden.contract.test.ts`
- [x] T022 [US4] Add golden fixture consistency tests: flat delta change equals after_count - before_count, categorized delta categories are non-overlapping, confidence values in valid range, in `tests/integration/contracts/inventory-delta-golden.contract.test.ts`

**Checkpoint**: Golden contract tests pass. Intentionally break a fixture field to verify strict mode catches it. Run `VITEST_MAX_WORKERS=1 npm test -- tests/integration/contracts/inventory-delta-golden`

---

## Phase 6: Polish & Cross-Cutting — E2E Verification

**Purpose**: Deterministic E2E test proving the full delta viewer flow renders correctly against a golden fixture. Final validation.

- [x] T023 Create deterministic E2E golden test: mock API with golden fixture, select container, navigate to Inventory tab, select run from list, verify delta table renders with exact item names + counts + change values + confidence badges in `tests/e2e/inventory-delta-golden.spec.ts`
- [x] T024 Run full test suite and verify no regressions: `VITEST_MAX_WORKERS=1 npm test` (all unit/component/contract tests pass)
- [x] T025 Run lint and build verification: `npm run lint && npm run build` (zero errors)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 (schemas + adapter must exist)
- **US2 (Phase 3)**: Depends on Phase 2 (hooks must normalize delta)
- **US3 (Phase 4)**: Depends on Phase 1 only (error states are independent of delta format)
- **US4 (Phase 5)**: Depends on Phase 1 only (golden fixtures validate against schemas)
- **Polish (Phase 6)**: Depends on Phases 2–5 (E2E test exercises full flow)

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — can start as soon as schemas compile
- **US2 (P1)**: Depends on US1 — needs normalization wired into hooks before testing rendering
- **US3 (P2)**: Independent of US1/US2 — tests existing error handling against existing components
- **US4 (P2)**: Independent of US1/US2 — tests schemas against golden fixtures directly

### Parallel Opportunities

```
Phase 1 complete
  ├── US1 (T006–T010)
  │     └── US2 (T011–T014) [after US1]
  ├── US3 (T015–T018) [parallel with US1]
  └── US4 (T019–T022) [parallel with US1]

Phase 6 [after all stories complete]
```

### Within Each User Story

- Tests marked [P] can run in parallel within a phase
- Implementation tasks run sequentially (hooks before component tests)
- Contract tests before dependent implementation

## Parallel Example: After Phase 1

```bash
# Launch US1 tests in parallel:
Task: "Unit test normalizeDelta() in tests/unit/api/inventory-delta-adapter.test.ts"
Task: "Contract test categorized fixtures in tests/integration/contracts/inventory-delta.contract.test.ts"

# Launch US3 tests in parallel (independent of US1):
Task: "Component test: not-found error in tests/component/inventory/InventoryRunDetail.test.tsx"
Task: "Component test: processing state in tests/component/inventory/InventoryRunDetail.test.tsx"
Task: "Component test: service unavailable in tests/component/inventory/InventoryRunList.test.tsx"

# Launch US4 in parallel (independent of US1):
Task: "Create golden fixtures in tests/mocks/inventory-delta-golden.ts"
Task: "Create golden contract tests in tests/integration/contracts/inventory-delta-golden.contract.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Foundational (schemas + adapter)
2. Complete Phase 2: US1 (hook wiring + basic rendering test)
3. **STOP and VALIDATE**: Categorized delta loads and renders correctly
4. This alone proves the dual-format data path works end-to-end

### Incremental Delivery

1. Phase 1 (Foundational) → schemas compile, adapter exists
2. US1 → categorized delta loads and renders → **MVP!**
3. US2 → all rendering states verified → rendering quality confirmed
4. US3 → error states verified → production trust
5. US4 → golden fixtures + contract tests → drift prevention active
6. Phase 6 → deterministic E2E test → full flow proven

### Parallel Team Strategy

With multiple developers after Phase 1:
- Developer A: US1 → US2 (sequential, US2 depends on US1)
- Developer B: US3 + US4 (parallel, both independent)
- Then: Phase 6 (E2E) after all stories merge

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Existing components (InventoryDeltaTable, InventoryRunDetail, InventoryRunList) are NOT modified — only schemas, adapter, hooks, and tests
- Resource constraints: always use `VITEST_MAX_WORKERS=1` for Vitest, `PLAYWRIGHT_WORKERS=1` for Playwright
- All golden fixtures use PiOrchestrator-normalized shape (snake_case), not raw BridgeServer (camelCase)
- Refer to `specs/052-delta-viewer-e2e/contracts/api-contract-snapshot.md` for field mapping reference
