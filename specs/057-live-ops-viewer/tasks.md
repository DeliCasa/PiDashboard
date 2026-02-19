# Tasks: Live Operations Viewer

**Input**: Design documents from `/specs/057-live-ops-viewer/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/endpoints.md

**Tests**: Tests are REQUIRED per Constitution III (Test Discipline). All new presentation components MUST have component tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create directory structure for new operations components and tests

- [x] T001 Create operations component directory at `src/presentation/components/operations/`
- [x] T002 Create operations test directory at `tests/component/operations/`

**Checkpoint**: Directory structure ready for component development

---

## Phase 2: User Story 4+5 — Camera Health Overview + Diagnostics (Priority: P2)

**Goal**: Operators can see all cameras at a glance with online/offline status, last-seen time, connection quality, error counts, and expandable diagnostics details.

**Independent Test**: Load the camera health dashboard and verify each camera shows its current status, last-seen timestamp, connection quality badge, and diagnostics summary. Verify 404/503 graceful degradation shows actionable message.

### Implementation

- [x] T003 [P] [US4] Create CameraHealthCard component in `src/presentation/components/operations/CameraHealthCard.tsx` — renders single camera card with status badge (online/offline/error icon), last-seen relative time, ConnectionQualityBadge (reuse existing), error count, last error message, and expandable diagnostics section (firmware, resolution, avg capture time). Props: `camera: CameraDiagnostics`. Follow SessionCard pattern for card layout. Use `formatRelativeTime()` from `src/lib/diagnostics-utils.ts`. Display camera_id in `font-mono text-xs text-muted-foreground`.
- [x] T004 [P] [US4] Create CameraHealthCard component test in `tests/component/operations/CameraHealthCard.test.tsx` — test renders with online camera (status badge, last-seen, connection quality), offline camera (flagged prominently), camera with errors (error count + last error displayed), camera without diagnostics (shows "Diagnostics not available"), expandable diagnostics section toggle. Use existing camera diagnostics mock data from `tests/mocks/`.
- [x] T005 [US4] Create CameraHealthDashboard component in `src/presentation/components/operations/CameraHealthDashboard.tsx` — uses `useCameraDiagnosticsList()` hook, renders responsive card grid (1-col mobile, 2-col md, 3-col lg) of CameraHealthCard components. Includes summary bar showing total/online/offline camera counts. Loading state: 3 skeleton cards. Error state: ErrorDisplay with retry. Empty state: "No cameras registered" with info icon. 404/503 state: "Camera health data is not available. The orchestrator may need updating." actionable message via `isFeatureUnavailable()`.
- [x] T006 [US4] Create CameraHealthDashboard component test in `tests/component/operations/CameraHealthDashboard.test.tsx` — test loading skeleton state, error state with retry button, empty state message, 404/503 graceful degradation message, successful render with multiple cameras showing summary counts, offline cameras visually flagged. Mock `useCameraDiagnosticsList()` hook.

**Checkpoint**: Camera health dashboard independently functional and testable. Satisfies US4 (Camera Health Overview) and US5 (Camera Diagnostics Summary).

---

## Phase 3: User Story 1+3 — Recent Sessions List + Correlation IDs (Priority: P1) MVP

**Goal**: Operators can see a list of recent sessions with status badges, failure reasons, and correlation IDs (session_id, delivery_id) with one-click copy to clipboard.

**Independent Test**: Load the operations view and verify sessions appear in reverse chronological order with correct status badges. Click a correlation ID to verify clipboard copy. Filter by status tab.

### Implementation

- [x] T007 [US1] Enhance SessionCard component in `src/presentation/components/diagnostics/SessionCard.tsx` — add correlation ID row showing delivery_id (if present) with copy-to-clipboard button following RunDebugInfo pattern (Copy icon → Check icon + toast). When status is `cancelled`, display it with destructive badge variant labeled "Failed". Add `data-testid="session-card-correlation"` and `data-testid="session-card-failure"` attributes.
- [x] T008 [US1] Update SessionCard tests to cover new failure/correlation display — verify `cancelled` status renders as "Failed" badge with destructive variant, delivery_id rendered with copy button when present, delivery_id hidden when absent, copy-to-clipboard triggers toast.success. File: existing SessionCard test file in `tests/component/diagnostics/`.
- [x] T009 [US1] Create SessionListView component in `src/presentation/components/operations/SessionListView.tsx` — uses `useSessions()` hook with status filter parameter. Renders status filter tabs (All | Active | Completed | Failed) where "Failed" maps to `cancelled` query param. Composes enhanced SessionCard components in a list. Props: `onSessionSelect: (sessionId: string) => void`. Includes count badge per tab, manual refresh button with spinning RefreshCw icon, loading skeleton (2 cards), error state with ErrorDisplay + retry, empty state "No sessions recorded yet — verify the system is running." Sessions sorted by started_at descending (already handled by hook).
- [x] T010 [US1] Create SessionListView component test in `tests/component/operations/SessionListView.test.tsx` — test loading state, error state with retry, empty state message, successful render with multiple sessions, status filter tab switching (All/Active/Completed/Failed), onSessionSelect callback fires with correct sessionId, refresh button triggers data refetch, sessions display in reverse chronological order. Mock `useSessions()` hook.

**Checkpoint**: Session list independently functional. Operators can browse sessions, see failure reasons, copy correlation IDs, and filter by status. Satisfies US1 (Recent Sessions List) and US3 partial (Correlation IDs on list view).

---

## Phase 4: User Story 2+3+6 — Session Detail with Evidence, Failure Debugging, Raw Access (Priority: P1/P3)

**Goal**: Operators can drill down into a session to see before/after evidence images, inventory delta, failure reasons with correlation IDs, and raw evidence object keys.

**Independent Test**: Click a session from the list, verify evidence images display side-by-side (or flat grid if no inventory data), delta table shows item changes, correlation IDs (session_id, delivery_id, run_id) are copyable, and raw object key is accessible via evidence preview modal debug section.

### Implementation

- [x] T011 [US6] Enhance EvidencePreviewModal in `src/presentation/components/diagnostics/EvidencePreviewModal.tsx` — add collapsible "Debug Info" section (Collapsible component) below the image. Extract object key from presigned URL path (parse URL, get pathname). Display object key in `font-mono text-xs` with copy-to-clipboard button. Add "Open raw" link that opens `full_url` in new tab via `window.open()`. Add `data-testid="evidence-debug-info"` and `data-testid="evidence-open-raw"` attributes.
- [x] T012 [US6] Update EvidencePreviewModal tests to cover raw object key display — verify debug info section renders with object key, copy-to-clipboard works, "Open raw" link present with correct href, debug info section is collapsible. File: existing EvidencePreviewModal test file in `tests/component/diagnostics/`.
- [x] T013 [US2] Create SessionDetailView component in `src/presentation/components/operations/SessionDetailView.tsx` — Props: `sessionId: string`, `onBack: () => void`. Uses `useSession(sessionId)`, `useSessionEvidence(sessionId)`, `useSessionDelta(sessionId)` hooks. Layout sections: (1) Header with back button (ArrowLeft), session ID in font-mono, status badge, started_at/completed_at timestamps. (2) Correlation IDs section: session_id, delivery_id (if present), run_id (if inventory data available) — each with copy-to-clipboard buttons in a horizontal row. (3) Error section (if status cancelled): display ErrorDisplay with failure context, show `metadata.error_message` from inventory run if available. (4) Evidence section: if inventory delta has `evidence.before_image_url`/`after_image_url`, compose `InventoryEvidencePanel`; otherwise compose `EvidencePanel` with session evidence. (5) Delta section (if delta data available): compose `InventoryDeltaTable`. (6) Debug section: collapsible metadata following RunDebugInfo pattern with session_id, delivery_id, run_id, request_id (via `getLastRequestId()`). Loading: full-page skeleton. Error: ErrorDisplay with retry + back button. Not found: "Session not found" with back button.
- [x] T014 [US2] Create SessionDetailView component test in `tests/component/operations/SessionDetailView.test.tsx` — test loading skeleton, error state with retry + back button, session not found state, successful render with session header (ID, status badge, timestamps), correlation IDs display with copy buttons, evidence section renders InventoryEvidencePanel when delta has evidence URLs, evidence section falls back to EvidencePanel when no delta evidence, delta table renders when delta data available, cancelled session shows error section, back button calls onBack, debug info section collapsible. Mock `useSession()`, `useSessionEvidence()`, `useSessionDelta()` hooks.

**Checkpoint**: Session detail view independently functional. Satisfies US2 (Session Detail with Evidence), US3 (Failure Debugging with Correlation IDs), and US6 (Raw Evidence Object Access).

---

## Phase 5: Integration — Operations Tab (All User Stories)

**Goal**: Wire all components into a new "Operations" tab in the main dashboard, composing sessions list and camera health into a unified operator view.

**Independent Test**: Open the dashboard, click the Operations tab, verify two-column layout (sessions left, cameras right), click a session to drill down to detail view, click back to return to list.

### Implementation

- [x] T015 [P] Create OperationsView component in `src/presentation/components/operations/OperationsView.tsx` — manages `selectedSessionId: string | null` state. When null: two-column responsive layout — left column (lg:col-span-2) renders SessionListView with `onSessionSelect` setting the selectedSessionId, right column (lg:col-span-1) renders CameraHealthDashboard. Mobile: stacked vertically (sessions then cameras). When sessionId selected: full-width SessionDetailView with `onBack` clearing selectedSessionId. Wrapped in fragment, no extra ErrorBoundary (App.tsx handles that).
- [x] T016 [P] Create OperationsView component test in `tests/component/operations/OperationsView.test.tsx` — test default layout shows both SessionListView and CameraHealthDashboard, selecting a session switches to SessionDetailView, back button returns to list+health layout, mobile responsive behavior (stacked layout).
- [x] T017 Add Operations tab to App.tsx in `src/App.tsx` — import OperationsView, add new TabsTrigger with `Activity` icon from lucide-react labeled "Operations", positioned after the Overview tab. Wrap OperationsView in ErrorBoundary within TabsContent. Follow existing tab pattern for responsive icon/label display.
- [x] T018 Verify existing tests pass — run `VITEST_MAX_WORKERS=1 npm test` to confirm no regressions from SessionCard and EvidencePreviewModal modifications. Run `npm run lint` and `npm run build` to verify no TypeScript or lint errors.

**Checkpoint**: Full Operations tab functional. All user stories accessible from a single entry point.

---

## Phase 6: E2E + Polish

**Purpose**: End-to-end smoke test and cross-cutting validation

- [x] T019 Create E2E smoke test in `tests/e2e/operations.spec.ts` — test Operations tab loads and shows session list, click session to drill down to detail view, back navigation returns to list, camera health dashboard visible, error states display actionable messages when backend mocked to return errors. Use existing E2E mock infrastructure (mockEndpoint pattern). Run with `PLAYWRIGHT_WORKERS=1`.
- [x] T020 Run full validation — `npm run lint` (0 errors), `VITEST_MAX_WORKERS=1 npm test` (all pass), `npm run build` (succeeds), `PLAYWRIGHT_WORKERS=1 npm run test:e2e` (operations smoke test passes).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US4+US5)**: Depends on Phase 1 — can run in parallel with Phase 3
- **Phase 3 (US1+US3)**: Depends on Phase 1 — can run in parallel with Phase 2
- **Phase 4 (US2+US3+US6)**: Depends on Phase 3 (needs enhanced SessionCard) — can run in parallel with Phase 2
- **Phase 5 (Integration)**: Depends on Phase 2, 3, and 4 completion
- **Phase 6 (E2E + Polish)**: Depends on Phase 5 completion

### User Story Dependencies

```
US4+US5 (Camera Health) ──────────────────────────┐
                                                    ├── Phase 5 (Integration) ── Phase 6 (E2E)
US1+US3 (Session List) ── US2+US3+US6 (Detail) ──┘
```

- **US4+US5**: Independent — no dependency on session stories
- **US1+US3**: Independent — no dependency on camera stories
- **US2+US3+US6**: Depends on US1+US3 (uses enhanced SessionCard and needs list to navigate from)
- **All stories**: Converge at Phase 5 for tab integration

### Within Each Phase

- Tasks marked [P] within a phase can run in parallel
- Component implementation before its test (or in parallel if TDD)
- All tests must pass before phase checkpoint

### Parallel Opportunities

```
Phase 1 (Setup)
    │
    ├── Phase 2 (US4+US5 Camera Health)  ←── PARALLEL
    │       T003 [P] CameraHealthCard
    │       T004 [P] CameraHealthCard tests
    │       T005     CameraHealthDashboard
    │       T006     CameraHealthDashboard tests
    │
    └── Phase 3 (US1+US3 Session List)   ←── PARALLEL
            T007     SessionCard enhancement
            T008     SessionCard test update
            T009     SessionListView
            T010     SessionListView tests
                │
                └── Phase 4 (US2+US3+US6 Session Detail)
                        T011 [P] EvidencePreviewModal enhancement
                        T012 [P] EvidencePreviewModal test update
                        T013     SessionDetailView
                        T014     SessionDetailView tests
```

---

## Parallel Example: Phases 2 and 3

```bash
# These two phases can run concurrently (different files, no shared dependencies):

# Phase 2 agent:
Task: "Create CameraHealthCard in src/presentation/components/operations/CameraHealthCard.tsx"
Task: "Create CameraHealthCard tests in tests/component/operations/CameraHealthCard.test.tsx"

# Phase 3 agent (simultaneously):
Task: "Enhance SessionCard in src/presentation/components/diagnostics/SessionCard.tsx"
Task: "Create SessionListView in src/presentation/components/operations/SessionListView.tsx"
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 3 Only)

1. Complete Phase 1: Setup (directories)
2. Complete Phase 3: US1+US3 (Session List with correlation IDs)
3. **STOP and VALIDATE**: Sessions visible, status badges work, correlation IDs copyable
4. This alone delivers immediate operational value (SC-001, SC-005)

### Incremental Delivery

1. Phase 1 (Setup) → directories ready
2. Phase 2 + Phase 3 (parallel) → Camera health + Session list → **Demo: operator can see sessions and camera status**
3. Phase 4 → Session detail drill-down → **Demo: operator can debug individual sessions**
4. Phase 5 → Unified Operations tab → **Demo: single entry point for all operational views**
5. Phase 6 → E2E validation → **Ship: feature complete with confidence**

### Key Metrics

| Metric | Count |
|--------|-------|
| Total tasks | 20 |
| Setup tasks | 2 |
| US4+US5 tasks | 4 |
| US1+US3 tasks | 4 |
| US2+US3+US6 tasks | 4 |
| Integration tasks | 4 |
| E2E + Polish tasks | 2 |
| Parallelizable tasks | 6 (marked [P]) |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- US3 (Correlation IDs) is cross-cutting — split between Phase 3 (list view) and Phase 4 (detail view)
- US5 (Camera Diagnostics) is implemented within CameraHealthCard (Phase 2) — expandable diagnostics section
- US6 (Raw Evidence) is implemented within EvidencePreviewModal enhancement (Phase 4)
- All new components MUST have `data-testid` attributes per Constitution III
- Test resource constraint: `VITEST_MAX_WORKERS=1` for all test runs
- No new API clients, schemas, or hooks needed — 100% composition of existing infrastructure
