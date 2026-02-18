# Implementation Plan: Operator Review — Session Drill-down + Delta Validation UX

**Branch**: `055-session-review-drilldown` | **Date**: 2026-02-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/055-session-review-drilldown/spec.md`

## Summary

Enhance the existing Inventory tab drill-down with a visual status timeline, collapsible debug metadata with copy-to-clipboard, conditional re-run support, improved failure UX, and minor refinements to existing delta/evidence/review components. Most of the core infrastructure (run list, delta table, evidence panel, review form, audit trail) already exists from Features 047/048/053 — this feature layers on UX polish and the timeline visualization to make it demo-ready.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner
**Storage**: N/A (API-driven; active container via localStorage/Zustand from Feature 046)
**Testing**: Vitest 3.2.4 + MSW 2.x + React Testing Library + Playwright 1.57.0
**Target Platform**: Chromium-based browsers on local network (Pi dashboard)
**Project Type**: Single (frontend SPA embedded in PiOrchestrator)
**Performance Goals**: Delta tables with 50+ items scroll without jank; full review workflow < 2 minutes
**Constraints**: Resource-constrained (Raspberry Pi serves the dashboard); VITEST_MAX_WORKERS=1 in CI
**Scale/Scope**: ~5 new/modified components, ~3 new/modified hooks, ~1 new API method (conditional)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Hexagonal Architecture | PASS | New components in `presentation/`, hooks in `application/`, API in `infrastructure/`. No layer violations. |
| II. Contract-First API | PASS | All existing endpoints have Zod schemas. Conditional re-run endpoint uses feature detection (404/501), no new schema required until backend contract is established. |
| II.A Zod Schema Conventions | PASS | No new schemas needed — all types already exist in `inventory-delta-schemas.ts`. |
| II.B Enum Synchronization | PASS | No new enum values. The 5-step timeline is derived client-side from existing `AnalysisStatus` + `review` presence. |
| II.C API Integration Workflow | PASS | Re-run API method follows the existing pattern in `inventory-delta.ts`. |
| III. Test Discipline | PASS | All new components require tests with `data-testid`. MSW handlers for new endpoint. E2E coverage for demo script. |
| III.A Contract Testing | N/A | No new schemas to contract-test. |
| IV. Simplicity & YAGNI | PASS | Building only what spec requires. Timeline is a single component. Debug info reuses existing `Collapsible` UI primitive. |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/055-session-review-drilldown/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-changes.md   # Conditional re-run endpoint contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── types/
│       └── inventory.ts                         # Re-export (add timeline step type if needed)
├── application/
│   └── hooks/
│       └── useInventoryDelta.ts                 # Extend: useRerunAnalysis() hook
├── infrastructure/
│   └── api/
│       ├── inventory-delta.ts                   # Extend: rerunAnalysis() method (conditional)
│       └── errors.ts                            # Extend: RERUN_* error codes
├── presentation/
│   └── components/
│       └── inventory/
│           ├── SessionStatusTimeline.tsx         # NEW: 5-step visual timeline
│           ├── RunDebugInfo.tsx                  # NEW: Collapsible metadata + copy
│           ├── InventoryRunDetail.tsx            # MODIFY: Integrate timeline, debug, error UX
│           ├── InventoryDeltaTable.tsx           # MODIFY: Item count badge header
│           ├── InventoryEvidencePanel.tsx        # MODIFY: Better partial-evidence messages
│           └── InventoryReviewForm.tsx           # MODIFY: Empty delta approval path
└── lib/
    └── clipboard.ts                             # NEW (if needed): copy-to-clipboard utility

tests/
├── component/
│   └── inventory/
│       ├── SessionStatusTimeline.test.tsx        # NEW
│       ├── RunDebugInfo.test.tsx                 # NEW
│       ├── InventoryRunDetail.enhanced.test.tsx  # NEW: Timeline + debug + error states
│       ├── InventoryDeltaTable.enhanced.test.tsx # NEW: Item count badge
│       └── InventoryReviewForm.enhanced.test.tsx # NEW: Empty delta approval
├── integration/
│   └── hooks/
│       └── useRerunAnalysis.test.tsx             # NEW (if re-run hook added)
└── e2e/
    └── inventory-review-drilldown.spec.ts        # NEW: Demo script E2E
```

**Structure Decision**: Follows existing hexagonal layout. New components live alongside existing inventory components. No new directories created — only new files within established paths.

## Design Decisions

### D1: Timeline Step Derivation (Client-side)

The 5 timeline steps (Created → Capture → Analysis → Delta Ready → Finalized) are derived from the existing `AnalysisStatus` enum and `review` field — no backend changes needed.

| Timeline Step | Active When | Completed When |
| ------------- | ----------- | -------------- |
| Created | `status === 'pending'` | Always (run exists) |
| Capture | `status === 'pending'` | `status !== 'pending'` |
| Analysis | `status === 'processing'` | `status in ['done', 'needs_review', 'error']` |
| Delta Ready | `status in ['done', 'needs_review']` && `!review` | `review !== null` |
| Finalized | `review !== null` (being displayed) | `review !== null` |

Error state: When `status === 'error'`, the "Analysis" step shows an error indicator and steps 4–5 are dimmed.

### D2: Re-run Feature Detection

The re-run button uses runtime feature detection:
1. On first render of an `error` status run, send `POST /v1/inventory/:runId/rerun` (or OPTIONS if available).
2. If 404/501 → hide button permanently (cache in React Query).
3. If 200/202 → show button.

This avoids hardcoding backend availability and gracefully handles the case where the endpoint doesn't exist yet.

### D3: request_id Threading

The `request_id` from the V1 response envelope is already parsed by Zod schemas (`InventoryLatestResponseSchema`, `RunListResponseSchema`). Currently it's discarded after validation.

Approach: The `inventoryDeltaApi` methods don't return the envelope — they return the unwrapped `data` field. To thread `request_id`, we have two options:
- **Option A**: Modify API client to return `{ data, requestId }` tuple → breaks all consumers.
- **Option B**: Store latest `request_id` in a module-level variable or React ref, read from `RunDebugInfo` → simple, YAGNI-compliant.

**Decision**: Option B. A simple `lastRequestId` module variable in `inventory-delta.ts` avoids changing any consumer signatures. The debug info component reads it via a getter function.

### D4: Empty Delta Approval

The current `InventoryReviewForm` hides when delta is empty (it checks `run.delta` presence). The spec requires allowing approval of "no changes."

Fix: Show the review form when delta is null/empty and status is `done`/`needs_review`. The "Approve" button submits `{ action: 'approve', corrections: [], notes: '' }` as-is (already works server-side).

### D5: Copy-to-Clipboard

Use `navigator.clipboard.writeText()` with a `toast.success('Copied')` feedback pattern. No library needed — this API is available in all target browsers (Chromium-based, modern).

## Existing Code Inventory

### Components (REUSE — no changes unless noted)

| Component | File | Changes |
| --------- | ---- | ------- |
| `InventorySection` | `presentation/components/inventory/InventorySection.tsx` | None |
| `InventoryRunList` | `presentation/components/inventory/InventoryRunList.tsx` | None |
| `InventorySessionLookup` | `presentation/components/inventory/InventorySessionLookup.tsx` | None |
| `InventoryAuditTrail` | `presentation/components/inventory/InventoryAuditTrail.tsx` | None |
| `InventoryRunDetail` | `presentation/components/inventory/InventoryRunDetail.tsx` | MODIFY: Add timeline, debug info, enhanced error states |
| `InventoryDeltaTable` | `presentation/components/inventory/InventoryDeltaTable.tsx` | MODIFY: Add item count in header |
| `InventoryEvidencePanel` | `presentation/components/inventory/InventoryEvidencePanel.tsx` | MODIFY: Better partial-evidence placeholder messages |
| `InventoryReviewForm` | `presentation/components/inventory/InventoryReviewForm.tsx` | MODIFY: Show for empty delta |

### Hooks (REUSE — no changes unless noted)

| Hook | File | Changes |
| ---- | ---- | ------- |
| `useSessionDelta` | `application/hooks/useInventoryDelta.ts` | None |
| `useSubmitReview` | `application/hooks/useInventoryDelta.ts` | None |
| `useInventoryRuns` | `application/hooks/useInventoryDelta.ts` | None |
| `useSessionLookup` | `application/hooks/useInventoryDelta.ts` | None |
| `useLatestInventory` | `application/hooks/useInventoryDelta.ts` | None |
| NEW: `useRerunAnalysis` | `application/hooks/useInventoryDelta.ts` | ADD: Conditional re-run mutation |

### API Client (REUSE — extend)

| Method | File | Changes |
| ------ | ---- | ------- |
| `inventoryDeltaApi.getLatest` | `infrastructure/api/inventory-delta.ts` | MODIFY: Capture `request_id` |
| `inventoryDeltaApi.getBySession` | `infrastructure/api/inventory-delta.ts` | MODIFY: Capture `request_id` |
| `inventoryDeltaApi.getRuns` | `infrastructure/api/inventory-delta.ts` | None |
| `inventoryDeltaApi.submitReview` | `infrastructure/api/inventory-delta.ts` | None |
| NEW: `inventoryDeltaApi.rerunAnalysis` | `infrastructure/api/inventory-delta.ts` | ADD: Feature-detected POST |

### UI Primitives (REUSE from shadcn/ui)

- `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` — for Debug Info section
- `Badge` — for timeline step indicators
- `Button` — copy buttons, re-run button
- `Card` / `CardHeader` / `CardContent` — existing wrapper pattern
- `Alert` / `AlertDescription` — error/warning banners
- `AlertDialog` — confirmation dialog (already used in review form)

## Complexity Tracking

> No violations to justify. All changes follow existing patterns.
