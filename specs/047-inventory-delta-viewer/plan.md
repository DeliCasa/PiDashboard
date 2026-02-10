# Implementation Plan: Inventory Delta Viewer & Human Review Workflow

**Branch**: `047-inventory-delta-viewer` | **Date**: 2026-02-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/047-inventory-delta-viewer/spec.md`

## Summary

Add an Inventory tab to the PiDashboard that displays per-session inventory deltas (before vs. after stock counts) scoped to the active container, with before/after evidence images, confidence indicators, and a human review workflow for operators to approve or correct vision-system detections. The feature consumes three BridgeServer endpoints proxied through PiOrchestrator (`/v1/containers/:id/inventory/latest`, `/v1/sessions/:id/inventory-delta`, `/v1/inventory/:runId/review`) and follows the established hexagonal architecture with Zod-validated API contracts, React Query hooks, and shadcn/ui components.

## Technical Context

**Language/Version**: TypeScript ~5.9.3 + React 19.2.0
**Primary Dependencies**: TanStack React Query 5.x, Zod 3.x, Zustand 5.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner
**Storage**: N/A (API-driven; PiOrchestrator/BridgeServer handle persistence). Active container selection via localStorage (Zustand persist, feature 046).
**Testing**: Vitest 3.2.4 + React Testing Library, MSW 2.x (mock handlers), Playwright 1.57.0 (E2E)
**Target Platform**: Web (modern browsers, responsive desktop/mobile)
**Project Type**: Web application (frontend SPA)
**Performance Goals**: Delta view renders within 3 seconds of container selection (SC-001). Review submission completes within 2 minutes operator time (SC-002).
**Constraints**: Visibility-aware polling (pause when tab hidden). Resource-constrained test execution (VITEST_MAX_WORKERS=1 for CI).
**Scale/Scope**: Single active container at a time. Up to ~50 items per delta. One review per analysis run.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Hexagonal Architecture (NON-NEGOTIABLE) — PASS

| Layer | Files | Dependency Direction |
|-------|-------|---------------------|
| Domain | `src/domain/types/inventory.ts` | No external dependencies |
| Infrastructure | `src/infrastructure/api/inventory-delta-schemas.ts`, `inventory-delta.ts` | Implements domain contracts |
| Application | `src/application/hooks/useInventoryDelta.ts` | Depends on domain types, calls infrastructure via injected API client |
| Presentation | `src/presentation/components/inventory/*.tsx` | Consumes hooks only, never imports infrastructure |

### II. Contract-First API (NON-NEGOTIABLE) — PASS

- Zod schemas defined in `inventory-delta-schemas.ts` before any component work
- All API responses validated through schemas (safeParse with fallback)
- Contract tests in `tests/integration/contracts/inventory-delta.contract.test.ts`
- MSW handlers return schema-valid test data
- Error handling via `V1ApiError` and centralized error codes
- Field names use snake_case matching Go JSON tags

### III. Test Discipline (STRICTLY ENFORCED) — PASS

- Contract tests for all Zod schemas
- Component tests for every new component with `data-testid` attributes
- Hook integration tests with MSW handlers
- E2E tests for critical user flows (view delta, submit review)
- Resource constraints: `VITEST_MAX_WORKERS=1` for CI, 50% CPU for local
- Accessibility: all new components tested with axe-core

### IV. Simplicity & YAGNI (MANDATORY) — PASS

- No abstractions beyond what's needed for three endpoints
- No product catalog management (items are free-text from backend)
- No draft persistence for review edits (spec explicitly states no draft save)
- No re-review capability (single review per run)
- No image diff/slider (simple side-by-side display)
- CSS-positioned overlays instead of canvas rendering

### Post-Phase 1 Re-Check — PASS

All design decisions documented in research.md align with constitution. No violations detected. Complexity tracking section not needed.

## Project Structure

### Documentation (this feature)

```text
specs/047-inventory-delta-viewer/
├── plan.md                          # This file
├── spec.md                          # Feature specification
├── research.md                      # Phase 0: research findings
├── data-model.md                    # Phase 1: entity definitions
├── quickstart.md                    # Phase 1: development guide
├── contracts/
│   └── inventory-delta-api.md       # Phase 1: API contract
├── checklists/
│   └── requirements.md              # Spec quality checklist
└── tasks.md                         # Phase 2: task breakdown (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/types/
│   └── inventory.ts                          # InventoryAnalysisRun, DeltaEntry, Review types
├── infrastructure/api/
│   ├── inventory-delta-schemas.ts            # Zod schemas + type inference
│   └── inventory-delta.ts                    # API client (getLatest, getBySession, submitReview)
├── application/hooks/
│   └── useInventoryDelta.ts                  # useLatestInventory, useSessionDelta, useSubmitReview
├── presentation/components/inventory/
│   ├── InventorySection.tsx                  # Tab content: state machine (loading/error/empty/pending/content)
│   ├── InventoryDeltaTable.tsx               # Delta table with confidence badges + inline edit mode
│   ├── InventoryEvidencePanel.tsx            # Before/after image side-by-side with overlay toggle
│   ├── InventoryReviewForm.tsx               # Review controls: approve, edit corrections, submit
│   └── InventoryAuditTrail.tsx               # Audit display: reviewer, timestamp, corrections diff
├── App.tsx                                   # Modified: add Inventory tab
└── lib/queryClient.ts                        # Modified: add inventory query keys + invalidation

tests/
├── unit/api/
│   └── inventory-delta.test.ts               # API client tests
├── component/inventory/
│   ├── InventorySection.test.tsx             # State machine: loading, error, empty, pending, content
│   ├── InventoryDeltaTable.test.tsx          # Table rendering, confidence badges, zero-change
│   ├── InventoryEvidencePanel.test.tsx       # Image loading, side-by-side, overlay toggle
│   ├── InventoryReviewForm.test.tsx          # Approve, edit, add item, remove item, submit
│   └── InventoryAuditTrail.test.tsx          # Audit display for approve vs override
├── integration/
│   ├── contracts/inventory-delta.contract.test.ts  # Schema validation against mock fixtures
│   └── hooks/useInventoryDelta.test.ts       # Hook tests with MSW
├── mocks/
│   └── inventory-delta-fixtures.ts           # Mock data: all statuses, high/low confidence, reviewed
└── e2e/
    └── inventory-delta.spec.ts               # E2E: view delta → verify images → submit review → verify audit
```

**Structure Decision**: Follows existing hexagonal architecture with feature-scoped files. New `inventory/` component directory parallels existing `cameras/`, `containers/`, `diagnostics/` patterns. Schema file is infrastructure-layer. Hooks are application-layer. All component imports go through hooks.

## Complexity Tracking

> No constitution violations detected. This section is intentionally empty.
