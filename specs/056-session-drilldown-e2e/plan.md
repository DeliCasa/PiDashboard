# Implementation Plan: Session Drill-Down E2E Operational Validation

**Branch**: `056-session-drilldown-e2e` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/056-session-drilldown-e2e/spec.md`

## Summary

Feature 055 delivered the session review drill-down UI with timeline, evidence, delta, review, and debug info panels. This feature validates the implementation end-to-end against operational requirements and fixes three identified gaps: (1) image load failure shows browser broken-image icon instead of an informative placeholder, (2) session-not-found returns a misleading generic error instead of a specific "not found" message, (3) evidence empty state lacks a suggested next action. Additionally, comprehensive E2E tests are added for all status states and edge cases not currently covered.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner
**Storage**: N/A (API-driven; active container selection via localStorage/Zustand from Feature 046)
**Testing**: Vitest 3.2.4 (unit/component/integration), Playwright 1.57.0 (E2E), MSW 2.x (API mocking)
**Target Platform**: Web (React SPA served from PiOrchestrator on Raspberry Pi)
**Project Type**: Web (frontend SPA)
**Performance Goals**: Drill-down content visible within 2s; loading indicator within 200ms
**Constraints**: Test workers limited to 50% CPU; single-threaded for CI (`VITEST_MAX_WORKERS=1`)
**Scale/Scope**: 2 component fixes, ~5 new E2E tests, ~3 new component tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | All changes are in presentation layer (components). No cross-layer violations. |
| II. Contract-First API | PASS | No new API endpoints or schema changes. Existing Zod schemas cover all data. |
| II.A Zod Schema Conventions | PASS | No schema modifications needed. |
| II.B Enum Synchronization | PASS | No new enum values. |
| II.C API Integration Workflow | PASS | No new API integrations. |
| III. Test Discipline | PASS | Adding tests, not removing. Resource constraints observed (VITEST_MAX_WORKERS=1). |
| IV. Simplicity & YAGNI | PASS | Minimal fixes for identified gaps. No new abstractions or features beyond spec. |

### Post-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | Component changes only affect presentation layer. |
| II. Contract-First API | PASS | No contract changes. |
| III. Test Discipline | PASS | E2E and component tests added for all identified gaps. |
| IV. Simplicity & YAGNI | PASS | Three targeted component fixes + test coverage. No over-engineering. |

## Project Structure

### Documentation (this feature)

```text
specs/056-session-drilldown-e2e/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research findings
├── data-model.md        # Data model documentation (no changes)
├── quickstart.md        # Developer quickstart guide
├── contracts/           # API contract reference (no changes)
│   └── existing-api-contracts.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── presentation/
│   └── components/
│       └── inventory/
│           ├── InventoryEvidencePanel.tsx   # FIX: image error state placeholder
│           └── InventoryRunDetail.tsx       # FIX: session-not-found differentiation

tests/
├── component/
│   └── inventory/
│       ├── InventoryEvidencePanel.test.tsx  # ADD: image load failure tests
│       └── InventoryRunDetail.test.tsx      # ADD: session-not-found test
└── e2e/
    ├── session-drilldown-e2e.spec.ts       # NEW: operational edge case E2E suite
    └── fixtures/
        └── session-drilldown-e2e-mocks.ts  # NEW: E2E mock fixtures
```

**Structure Decision**: Web SPA — all changes are in the existing `src/presentation/` and `tests/` directories following established patterns.

## Design Decisions

### D1: Image Error State in Evidence Panel

**Change**: Add `imageError` state tracking alongside existing `imageLoading` state. When `onError` fires, set error state and render an "Image unavailable" placeholder instead of showing the broken browser icon.

**Implementation**:
- Add `imageError` state: `{ before: false, after: false }`
- On `onError`: set `imageError[side] = true` and `imageLoading[side] = false`
- When `imageError[side]` is true, render a placeholder div with `ImageOff` icon and "Image unavailable" text
- Add `data-testid="evidence-before-error"` / `data-testid="evidence-after-error"` for testing

**Why not retry**: Evidence images are fetched once from the backend. If the URL is broken (expired, deleted), retrying won't help. A clear error state is more honest than silent failure.

### D2: Session Not Found Differentiation

**Change**: In `InventoryRunDetail`, differentiate between `data === null && !isError` (session not found) and `isError` (API failure).

**Implementation**:
- The `useSessionDelta` hook returns `null` for 404/INVENTORY_NOT_FOUND (not an error)
- After loading completes, check: if `!isLoading && !isError && !data` → render "Session not found" view
- The "not found" view shows a distinct message ("No analysis found for this session") without a retry button (retrying won't help for a 404)
- Keep the existing error view with retry for actual API failures

### D3: Evidence Empty State Enhancement

**Change**: Add a brief suggested next action to the existing "No evidence images available" message.

**Implementation**:
- Append text: "Check if the camera was online during this session."
- Minimal change to existing JSX in `InventoryEvidencePanel.tsx`

### D4: E2E Test Suite Structure

**Change**: New E2E spec file covering operational edge cases not in existing suites.

**Test Cases**:
1. **Image load failure**: Mock evidence URLs that return 404, verify placeholder appears
2. **Processing state detail**: Mock session in `processing` status, verify timeline + spinner + stale warning
3. **Pending state detail**: Mock session in `pending` status, verify timeline + waiting message
4. **Session not found**: Mock session lookup returning 404, verify "not found" message
5. **Evidence empty state**: Mock session with null evidence, verify empty state with guidance text

**Fixture Strategy**: New mock file `session-drilldown-e2e-mocks.ts` with setup functions per scenario, following the pattern established in `inventory-review-mocks.ts`.

## Complexity Tracking

> No constitution violations. All changes are minimal targeted fixes within existing patterns.

| Change | Complexity | Justification |
|--------|-----------|---------------|
| Image error state | Low | Single new state variable + conditional render |
| Session not found | Low | Additional null check in existing conditional chain |
| Evidence next action | Trivial | Text change |
| E2E test suite | Medium | 5 new tests with mock fixtures, following established patterns |
