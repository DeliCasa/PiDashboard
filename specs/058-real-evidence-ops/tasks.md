# Tasks: Real Evidence Ops

**Input**: Design documents from `/specs/058-real-evidence-ops/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — constitution (III. Test Discipline) mandates tests for all modified components.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructure fixes and reusable components that MUST be complete before ANY user story can be implemented.

**Why blocking**: `getFreshUrl()` fix is required by US2 (image auto-refresh). `SubsystemErrorBoundary` is required by US4 (failure isolation) and wraps components touched by US1/US3.

- [x] T001 Fix `getFreshUrl()` to actually call `refreshPresignedUrl()` when URL is expired in `src/infrastructure/api/evidence.ts` — currently checks expiration but returns stale URL with a console.warn; must call refresh and return fresh URL (research R1)
- [x] T002 Update tests for fixed `getFreshUrl()` in `tests/unit/api/evidence.test.ts` — test: calls refresh when expired, returns fresh URL on success, returns original URL on refresh failure, skips refresh when not expired
- [x] T003 [P] Create `SubsystemErrorBoundary` component in `src/presentation/components/common/SubsystemErrorBoundary.tsx` — React error boundary with: `subsystemName` prop for actionable message, retry button that resets boundary, styling consistent with existing AlertCircle error cards, `onError` callback for logging (research R3)
- [x] T004 [P] Create tests for `SubsystemErrorBoundary` in `tests/component/common/SubsystemErrorBoundary.test.tsx` — test: renders children normally, shows fallback with subsystem name on error, retry button resets and re-renders children, onError callback fires

**Checkpoint**: Foundation ready — `getFreshUrl()` works, `SubsystemErrorBoundary` available. User story implementation can begin.

---

## Phase 2: User Story 1 — Browse and Filter Live Sessions (Priority: P1) MVP

**Goal**: Session list loads from real API with graceful handling of 404/503 and actionable error messages instead of generic "Failed to load sessions."

**Independent Test**: Open Operations tab → sessions load from real API → filter by status → compare with `curl` output of `/api/dashboard/diagnostics/sessions`. On 404/503, see graceful degradation instead of error.

### Implementation for User Story 1

- [x] T005 [US1] Add `isFeatureUnavailable()` check and actionable error message to `src/presentation/components/operations/SessionListView.tsx` — on 404/503: show info-style "Sessions not available on this PiOrchestrator version" (matching CameraHealthDashboard pattern); on other errors: show "Unable to load sessions — PiOrchestrator may be unreachable. Check the service status or retry." with retry button (FR-007, FR-008)
- [x] T006 [P] [US1] Add `isFeatureUnavailable()` check to `src/presentation/components/diagnostics/EvidencePanel.tsx` — on 404/503: show info-style message instead of error; currently missing this check per research
- [x] T007 [US1] Update tests in `tests/component/operations/SessionListView.test.tsx` — add tests: mock 404 → shows graceful degradation UI, mock 503 → shows graceful degradation UI, mock 500 → shows actionable error with retry, verify error text matches spec FR-007
- [x] T008 [P] [US1] Update tests in `tests/component/diagnostics/EvidencePanel.test.tsx` — add test for `isFeatureUnavailable()` graceful degradation on 404/503

**Checkpoint**: Session list works against real API with production-grade error handling. MVP functional.

---

## Phase 3: User Story 2 — View Real Evidence Images from MinIO (Priority: P1)

**Goal**: Evidence thumbnails and full-resolution images load via presigned URLs with auto-refresh on expiry/error, per-image loading skeletons, and per-image error placeholders with retry.

**Independent Test**: Open a session with evidence → thumbnails render from presigned URLs → click thumbnail for full-res → simulate expired URL (wait 15+ min) → auto-refresh triggers → image reloads. On MinIO down: per-image "Image unavailable" with retry.

### Implementation for User Story 2

- [x] T009 [P] [US2] Add image auto-refresh on error to `src/presentation/components/diagnostics/EvidenceThumbnail.tsx` — implement state machine (loading → loaded | error → refreshing → loaded | failed): on `<img>` onError, extract object key via `extractObjectKey()`, call `evidenceApi.refreshPresignedUrl()`, update src, retry once; show skeleton during refresh, permanent error with "Retry" button on failure; max 1 auto-retry per mount (FR-003, FR-004, FR-010, data-model state machine)
- [x] T010 [P] [US2] Add image auto-refresh on error to `src/presentation/components/diagnostics/EvidencePreviewModal.tsx` — same state machine pattern as EvidenceThumbnail for full-resolution image; on error: extract key, refresh, retry once; show "Retry" on permanent failure (FR-003, FR-004)
- [x] T011 [P] [US2] Add image auto-refresh on error to `src/presentation/components/inventory/InventoryEvidencePanel.tsx` — apply auto-refresh to both before and after images independently; use `extractObjectKey()` on `before_image_url`/`after_image_url`; independent loading/error/retry per image; add "Retry" button next to each failed image (FR-003, FR-004)
- [x] T012 [US2] Update tests in `tests/component/diagnostics/EvidenceThumbnail.test.tsx` — test: image load success shows image, image load failure triggers refresh call, refresh success retries image, refresh failure shows permanent error with retry button, retry button resets state, max 1 auto-retry (no infinite loops)
- [x] T013 [P] [US2] Update tests in `tests/component/diagnostics/EvidencePreviewModal.test.tsx` — test: full-res image auto-refresh on error, retry button works, permanent failure shows placeholder
- [x] T014 [P] [US2] Update tests in `tests/component/inventory/InventoryEvidencePanel.test.tsx` — test: before/after images refresh independently on error, one failed image doesn't break the other, retry buttons work per-image

**Checkpoint**: Evidence images load from real MinIO with auto-refresh. Expired URLs recover automatically. Per-image error isolation works.

---

## Phase 4: User Story 3 — Camera Health with Last Capture Time (Priority: P2)

**Goal**: Camera health panel shows real diagnostics data with staleness indicators. Already mostly implemented by Features 055-057; this phase verifies it works under the error boundary and with real data patterns.

**Independent Test**: Check Camera Health panel → compare status/last-seen with `curl` output of `/api/v1/cameras/:id/diagnostics`. On diagnostics error: see "Camera health unavailable" without crashing Operations view.

### Implementation for User Story 3

- [x] T015 [US3] Verify and update camera staleness threshold in `src/presentation/components/operations/CameraHealthCard.tsx` — confirm 5-minute staleness badge triggers correctly per spec US3.AS2; ensure "Stale" badge uses yellow/warning styling; ensure offline cameras show distinct styling from never-discovered cameras (FR-009)
- [x] T016 [US3] Update tests in `tests/component/operations/CameraHealthDashboard.test.tsx` — add test: camera not seen >5 min shows stale badge, offline camera is visually distinct from undiscovered, diagnostics error shows fallback without crash

**Checkpoint**: Camera health works with real data. Staleness and error handling verified.

---

## Phase 5: User Story 4 — Graceful Degradation Under Real Network Conditions (Priority: P2)

**Goal**: Subsystem failures are isolated — sessions error doesn't break camera health, MinIO error doesn't break session metadata, delta error doesn't break evidence panel. Each subsystem has its own error boundary.

**Independent Test**: Stop MinIO (or mock 500) → session list and camera health still load → evidence shows per-image errors. Stop sessions API → camera health still loads → session list shows actionable error.

### Implementation for User Story 4

- [x] T017 [US4] Wrap `SessionListView` in `SubsystemErrorBoundary` in `src/presentation/components/operations/OperationsView.tsx` — use subsystemName="Sessions" with actionable message
- [x] T018 [US4] Wrap `CameraHealthDashboard` in `SubsystemErrorBoundary` in `src/presentation/components/operations/OperationsView.tsx` — use subsystemName="Camera Health" with actionable message (same file as T017, sequential)
- [x] T019 [US4] Add delta error isolation in `src/presentation/components/operations/SessionDetailView.tsx` — when `deltaError` occurs but `session` loads successfully: show "Delta data unavailable" info card instead of silently falling back; wrap evidence/delta section in SubsystemErrorBoundary with subsystemName="Evidence & Analysis" (FR-005)
- [x] T020 [US4] Update tests in `tests/component/operations/OperationsView.test.tsx` — test: SessionListView error → CameraHealthDashboard still renders, CameraHealthDashboard error → SessionListView still renders, both render independently
- [x] T021 [P] [US4] Update tests in `tests/component/operations/SessionDetailView.test.tsx` — test: session loads but delta fails → shows "Delta data unavailable", evidence boundary catches render errors, session metadata always visible when session fetch succeeds

**Checkpoint**: All subsystems fail independently. No cascading errors. Actionable messages everywhere.

---

## Phase 6: User Story 5 — Validation: Verify Evidence Corresponds to Real MinIO Objects (Priority: P3)

**Goal**: Debug panel on inventory evidence shows MinIO object keys in copyable monospace format, matching the existing pattern in `EvidencePreviewModal`.

**Independent Test**: Open a session → open inventory evidence panel → expand debug section → copy object key → run `ssh pi "mc stat minio/delicasa-evidence/OBJECT_KEY"` → object exists.

### Implementation for User Story 5

- [x] T022 [US5] Add collapsible debug panel to `src/presentation/components/inventory/InventoryEvidencePanel.tsx` — add "Debug Info" collapsible section (matching `EvidencePreviewModal` pattern) showing: `extractObjectKey(before_image_url)` and `extractObjectKey(after_image_url)` in `font-mono text-xs`; copy-to-clipboard button with toast feedback per field; "Open raw" link for each URL; only render debug section when URLs are available (FR-006, research R5)
- [x] T023 [US5] Update tests in `tests/component/inventory/InventoryEvidencePanel.test.tsx` — test: debug panel shows extracted object keys, copy button calls navigator.clipboard with correct key, debug section hidden when no URLs, collapsible toggle works

**Checkpoint**: Object key validation workflow functional. Operators can verify evidence against MinIO.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, backend handoff, and final validation across all stories.

- [x] T024 Create E2E test suite in `tests/e2e/real-evidence-ops.spec.ts` — tests: Operations tab smoke (sessions load), session detail loads evidence thumbnails, image load failure shows error placeholder with retry, sessions API 404 shows graceful degradation, camera health loads independently of session errors, evidence debug panel shows object keys (plan Phase F)
- [x] T025 Generate backend handoff document for PiOrchestrator image proxy endpoint via `/handoff-generate` — document: `GET /api/dashboard/diagnostics/images/:objectKey` proxy requirement, context-aware URL generation, expected response format (stream bytes, Content-Type, Cache-Control), error responses (404, 502), rationale (MinIO LAN-only, Funnel needs proxy) (plan Phase G, research R2/R6)
- [x] T026 Run lint, build, and full test suite — `npm run lint && npm run build && VITEST_MAX_WORKERS=1 npm test`
- [x] T027 Run quickstart validation workflow from `specs/058-real-evidence-ops/quickstart.md` — verify against real Pi data if SSH tunnel available

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. BLOCKS all user stories.
- **US1 (Phase 2)**: Depends on Phase 1 completion (needs `isFeatureUnavailable` pattern, no direct dependency on `getFreshUrl` fix but same infrastructure layer)
- **US2 (Phase 3)**: Depends on Phase 1 completion (needs fixed `getFreshUrl()`)
- **US3 (Phase 4)**: Depends on Phase 1 completion (needs `SubsystemErrorBoundary` for verification)
- **US4 (Phase 5)**: Depends on Phase 1 completion (needs `SubsystemErrorBoundary`). Can run in parallel with US1-US3.
- **US5 (Phase 6)**: Depends on Phase 1 completion. Can run in parallel with US1-US4.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (Browse Sessions)**: Independent. Can start after Phase 1.
- **US2 (View Evidence)**: Independent. Can start after Phase 1. Shares no files with US1.
- **US3 (Camera Health)**: Independent. Can start after Phase 1. Minimal implementation (mostly verification).
- **US4 (Graceful Degradation)**: Touches `OperationsView.tsx` and `SessionDetailView.tsx`. Can run in parallel with US1-US3 since it wraps components, not modifies internals.
- **US5 (Validation/Debug)**: Touches `InventoryEvidencePanel.tsx` (also touched by US2 T011). **Must run after US2 T011** to avoid merge conflicts on same file.

### Within Each User Story

- Implementation tasks before test tasks (unless TDD requested)
- Tasks modifying the same file are sequential
- Tasks modifying different files are parallelizable [P]

### Parallel Opportunities

**Within Phase 1 (Foundational)**:
- T001 → T002 (sequential, same file area)
- T003 + T004 can run in parallel with T001 + T002 (different files)

**Within Phase 2 (US1)**:
- T005 (SessionListView) + T006 (EvidencePanel) can run in parallel [P]
- T007 + T008 can run in parallel [P] (different test files)

**Within Phase 3 (US2)**:
- T009 + T010 + T011 can all run in parallel [P] (different files)
- T012 + T013 + T014 can all run in parallel [P] (different test files)

**Across Stories**:
- After Phase 1 completes: US1, US2, US3, US4 can all start simultaneously (if team capacity allows)
- US5 should wait for US2 T011 (shared file: `InventoryEvidencePanel.tsx`)

---

## Parallel Example: User Story 2

```text
# Launch all implementation tasks together (3 different files):
Task T009: "Add auto-refresh to EvidenceThumbnail.tsx"
Task T010: "Add auto-refresh to EvidencePreviewModal.tsx"
Task T011: "Add auto-refresh to InventoryEvidencePanel.tsx"

# Then launch all test tasks together (3 different test files):
Task T012: "Update EvidenceThumbnail tests"
Task T013: "Update EvidencePreviewModal tests"
Task T014: "Update InventoryEvidencePanel tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001-T004)
2. Complete Phase 2: US1 — Browse Sessions (T005-T008)
3. **STOP and VALIDATE**: Open Operations tab with SSH tunnel → sessions load → filter works → 404 shows graceful UI
4. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 (Foundational) → Infrastructure ready
2. Phase 2 (US1 - Sessions) → Test: sessions load from real API → MVP!
3. Phase 3 (US2 - Evidence) → Test: thumbnails render from MinIO with auto-refresh
4. Phase 4 (US3 - Camera Health) → Test: cameras show real status and staleness
5. Phase 5 (US4 - Degradation) → Test: stop MinIO → sessions still work
6. Phase 6 (US5 - Debug) → Test: copy object key → verify in MinIO
7. Phase 7 (Polish) → E2E tests, handoff, final validation

### Single Developer Path

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024 → T025 → T026 → T027

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- No new Zod schemas — all existing schemas are sufficient
- No new domain types or API clients — all modifications to existing components
- Backend handoff (T025) is non-blocking for frontend implementation
- US5 (T022-T023) must follow US2 T011 due to shared `InventoryEvidencePanel.tsx`
- Constitution III requires: tests for all modified components, MSW handlers for mocked endpoints, `data-testid` attributes for testable elements
