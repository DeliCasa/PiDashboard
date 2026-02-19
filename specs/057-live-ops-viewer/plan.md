# Implementation Plan: Live Operations Viewer

**Branch**: `057-live-ops-viewer` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/057-live-ops-viewer/spec.md`

## Summary

Create an operator-focused "Operations" tab in PiDashboard that surfaces real session lifecycle data, evidence images (before/after), camera health, and failure debugging with correlation IDs — all from live BridgeServer and PiOrchestrator backends. This feature composes existing API infrastructure (~90% reuse) into a unified operational view, adding ~650 LOC of new presentation components and ~60 LOC of enhancements to existing components.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner
**Storage**: N/A (API-driven; active container selection via localStorage/Zustand from Feature 046)
**Testing**: Vitest 3.2.4 + React Testing Library + MSW 2.x (unit/component/integration), Playwright 1.57.0 (E2E)
**Target Platform**: Modern browsers (Chromium primary), served from PiOrchestrator on port 8082
**Project Type**: Web SPA (frontend only)
**Performance Goals**: Dashboard loads in <2s, auto-refresh every 10-15s, image thumbnails lazy-loaded
**Constraints**: Must work on local Pi network, graceful degradation when services unavailable, VITEST_MAX_WORKERS=1 for tests
**Scale/Scope**: Single operator, ~5 cameras, ~100 recent sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Hexagonal Architecture — PASS

| Rule | Compliance |
|------|-----------|
| Domain types no external imports | PASS — No new domain types needed; reusing existing schemas |
| Application hooks no direct fetch | PASS — New components use existing hooks only |
| Infrastructure implements domain contracts | PASS — No new infrastructure code needed |
| Presentation via hooks only | PASS — All new components consume existing hooks |
| No circular dependencies | PASS — New `operations/` components import from `application/hooks/` only |

### II. Contract-First API — PASS

| Rule | Compliance |
|------|-----------|
| All endpoints have Zod schemas | PASS — All consumed endpoints already validated |
| API responses parsed through schemas | PASS — Existing API clients handle validation |
| MSW handlers match contracts | PASS — Existing handlers reused |
| No new enum values added | PASS — No schema modifications |

### III. Test Discipline — PASS

| Rule | Compliance |
|------|-----------|
| New components have test files | WILL ENFORCE — All 5 new components get tests |
| Integration tests for hooks | PASS — Existing hooks already tested |
| Accessibility tests | WILL ENFORCE — New components tested with axe-core |
| Resource constraints | WILL ENFORCE — VITEST_MAX_WORKERS=1 |
| No new contract tests needed | PASS — No new schemas |

### IV. Simplicity & YAGNI — PASS

| Rule | Compliance |
|------|-----------|
| No features beyond request | PASS — Only building what spec requires |
| No future-proofing abstractions | PASS — Composing existing components directly |
| No utility functions for one-time ops | PASS — Reusing diagnostics-utils.ts |
| Delete unused code | PASS — No code being removed |

### Post-Design Re-Check — PASS

All constitution principles maintained. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/057-live-ops-viewer/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity documentation
├── quickstart.md        # Developer setup guide
├── contracts/           # API contract documentation
│   └── endpoints.md     # Consumed endpoints catalog
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── presentation/
│   └── components/
│       ├── operations/                    # NEW — Operations tab components
│       │   ├── OperationsView.tsx         # Tab layout: sessions + camera health
│       │   ├── SessionListView.tsx        # Session list with status filter tabs
│       │   ├── SessionDetailView.tsx      # Session drill-down (evidence + delta + debug)
│       │   ├── CameraHealthDashboard.tsx  # Camera card grid overview
│       │   └── CameraHealthCard.tsx       # Single camera health summary card
│       ├── diagnostics/
│       │   ├── SessionCard.tsx            # MODIFIED — Add failure reason + correlation IDs
│       │   └── EvidencePreviewModal.tsx   # MODIFIED — Add raw object key section
│       └── [existing components unchanged]
├── App.tsx                                # MODIFIED — Add Operations tab
└── [all other layers unchanged]

tests/
├── component/
│   └── operations/                        # NEW — Component tests
│       ├── OperationsView.test.tsx
│       ├── SessionListView.test.tsx
│       ├── SessionDetailView.test.tsx
│       ├── CameraHealthDashboard.test.tsx
│       └── CameraHealthCard.test.tsx
└── e2e/
    └── operations.spec.ts                 # NEW — E2E smoke test
```

**Structure Decision**: Frontend-only SPA following existing hexagonal architecture. All new code is in the presentation layer (`src/presentation/components/operations/`). No changes to domain, application, or infrastructure layers — the feature composes existing hooks and API clients.

## Implementation Phases

### Phase 1: Camera Health Dashboard (US4, US5)

Build the camera health overview as standalone components. These have no dependency on sessions and can be developed and tested independently.

**New files**:
- `src/presentation/components/operations/CameraHealthCard.tsx` (~100 LOC)
  - Props: `CameraDiagnostics` from existing type
  - Status badge (online/offline/error with icon)
  - Last-seen relative time
  - Connection quality badge (reuse `ConnectionQualityBadge`)
  - Error count display
  - Last error message (if any)
  - Expandable diagnostics section (firmware, resolution, capture time)

- `src/presentation/components/operations/CameraHealthDashboard.tsx` (~150 LOC)
  - Uses `useCameraDiagnosticsList()` hook
  - Responsive card grid (1-2-3 columns)
  - Summary bar: total cameras, online count, offline count
  - Loading: skeleton cards
  - Error: `ErrorDisplay` with retry
  - Empty: "No cameras registered" message
  - 404/503: "Camera health data is not available" actionable message

**Tests**:
- `tests/component/operations/CameraHealthCard.test.tsx`
- `tests/component/operations/CameraHealthDashboard.test.tsx`

### Phase 2: Enhanced Session Components (US1, US3)

Enhance existing SessionCard with failure reason and correlation ID display, then build the session list view with status filtering.

**Modified files**:
- `src/presentation/components/diagnostics/SessionCard.tsx` (~30 LOC added)
  - Add failure reason row (when status is `cancelled`)
  - Add correlation ID row: delivery_id with copy-to-clipboard
  - Follow `RunDebugInfo` pattern for copy button

**New files**:
- `src/presentation/components/operations/SessionListView.tsx` (~120 LOC)
  - Uses `useSessions()` hook with status filter
  - Status filter tabs: All | Active | Completed | Failed
  - Maps `cancelled` → "Failed" in filter UI
  - Composes `SessionCard` components
  - Loading/error/empty states
  - Manual refresh button
  - Count badge per status tab

**Tests**:
- `tests/component/operations/SessionListView.test.tsx`
- Update existing SessionCard tests for new failure/correlation display

### Phase 3: Session Detail View (US2, US3, US6)

Build the session drill-down that combines evidence, inventory delta, and debug info in one view.

**Modified files**:
- `src/presentation/components/diagnostics/EvidencePreviewModal.tsx` (~40 LOC added)
  - Add collapsible "Debug Info" section
  - Extract object key from presigned URL path
  - Display object key with copy-to-clipboard
  - "Open raw" link opening full URL in new tab

**New files**:
- `src/presentation/components/operations/SessionDetailView.tsx` (~200 LOC)
  - Props: `sessionId: string`, `onBack: () => void`
  - Uses: `useSession(sessionId)`, `useSessionEvidence(sessionId)`, `useSessionDelta(sessionId)`
  - Layout sections:
    1. Header: session ID, status badge, timestamps, back button
    2. Correlation IDs: session_id, delivery_id — all copyable
    3. Error section (if cancelled): failure context with `ErrorDisplay`
    4. Evidence section: Compose `InventoryEvidencePanel` (before/after) when delta has evidence, otherwise compose `EvidencePanel` (flat grid)
    5. Delta section (if available): Compose `InventoryDeltaTable`
    6. Debug info: Compose `RunDebugInfo` pattern with session metadata
  - Loading: full-page skeleton
  - Error: `ErrorDisplay` with retry and back button

**Tests**:
- `tests/component/operations/SessionDetailView.test.tsx`
- Update existing EvidencePreviewModal tests

### Phase 4: Operations Tab Integration (All US)

Wire everything together as a new top-level tab in App.tsx.

**New files**:
- `src/presentation/components/operations/OperationsView.tsx` (~80 LOC)
  - State: `selectedSessionId: string | null`
  - When no session selected: Two-column layout
    - Left (2/3): `SessionListView` with `onSessionSelect`
    - Right (1/3): `CameraHealthDashboard`
    - Mobile: Stacked vertically
  - When session selected: Full-width `SessionDetailView` with back navigation
  - Transitions handled via state, not routing

**Modified files**:
- `src/App.tsx` (~10 LOC added)
  - Add "Operations" tab after Overview tab
  - Import and render `OperationsView` in ErrorBoundary
  - Icon: `Activity` from lucide-react

**Tests**:
- `tests/component/operations/OperationsView.test.tsx`

### Phase 5: E2E Smoke Test

Add Playwright E2E test for the operations tab flow.

**New files**:
- `tests/e2e/operations.spec.ts`
  - Smoke test: Operations tab loads, sessions list visible
  - Session drill-down: click session → detail view with evidence
  - Camera health: health dashboard visible with camera cards
  - Error states: mock backend failure → error message displayed
  - Uses existing E2E mock infrastructure

## Reused Components (No Changes)

| Component | Location | Used In |
|-----------|----------|---------|
| `EvidencePanel` | `diagnostics/EvidencePanel.tsx` | SessionDetailView (fallback) |
| `EvidenceThumbnail` | `diagnostics/EvidenceThumbnail.tsx` | EvidencePanel |
| `InventoryEvidencePanel` | `inventory/InventoryEvidencePanel.tsx` | SessionDetailView (primary) |
| `InventoryDeltaTable` | `inventory/InventoryDeltaTable.tsx` | SessionDetailView |
| `SessionStatusTimeline` | `inventory/SessionStatusTimeline.tsx` | SessionDetailView |
| `ConnectionQualityBadge` | `diagnostics/ConnectionQualityBadge.tsx` | CameraHealthCard |
| `ErrorDisplay` | `common/ErrorDisplay.tsx` | All new components |
| `RunDebugInfo` pattern | `inventory/RunDebugInfo.tsx` | SessionDetailView |
| All existing hooks | `application/hooks/use*.ts` | All new components |
| All existing API clients | `infrastructure/api/*.ts` | Via hooks only |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Backend endpoints return unexpected data | Low | Medium | Existing Zod validation + graceful degradation handles this |
| BridgeServer unreachable from Pi | Medium | Low | 404/503 handling already tested; shows actionable message |
| Session schema missing failure_reason field | Medium | Low | Map `cancelled` status to failure display; show available metadata |
| Performance with many sessions + cameras | Low | Low | Existing pagination/lazy-loading patterns; limit default to 20 sessions |
| Accessibility regressions | Low | Medium | axe-core tests on all new components |

## Complexity Tracking

> No constitution violations. No complexity justifications needed.

| Metric | Value |
|--------|-------|
| New files | 7 (5 components + 1 test suite + 1 E2E) |
| Modified files | 3 (App.tsx, SessionCard.tsx, EvidencePreviewModal.tsx) |
| Estimated new LOC | ~650 (components) + ~400 (tests) |
| Estimated modified LOC | ~80 |
| New API endpoints | 0 |
| New schemas | 0 |
| New hooks | 0 |
