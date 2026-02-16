# Implementation Plan: 051 — Live E2E Inventory Delta Display

**Branch**: `051-inventory-delta-e2e-verify` | **Date**: 2026-02-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/051-inventory-delta-e2e-verify/spec.md`

## Summary

Align PiDashboard's inventory delta display with BridgeServer's actual API contract, add display for the `rationale` field, add a manual refresh button, update status enum to match backend values (`pending`, `processing`, `done`, `needs_review`, `error`), and produce an E2E verification playbook. This is a contract-alignment + minimal-patch feature, not a new UI.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner
**Storage**: N/A (API-driven; active container selection via localStorage/Zustand from feature 046)
**Testing**: Vitest 3.2.4 (unit + contract), Playwright 1.57.0 (E2E), MSW 2.x (mocking)
**Target Platform**: Browser (React SPA served from PiOrchestrator port 8082)
**Project Type**: Web application (frontend only)
**Performance Goals**: N/A (no new runtime code paths, only enum/display changes)
**Constraints**: Backward-compatible with existing test infrastructure; no BridgeServer changes
**Scale/Scope**: 1 Zod enum change, 3 component patches, 1 hook update, fixture + test updates across ~10 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | Schema changes in infrastructure/, display changes in presentation/, hook changes in application/ — no layer violations |
| II. Contract-First API | PASS | Aligning Zod schema to actual BridgeServer values (II.B enum sync). Contract tests updated to match. |
| III. Test Discipline | PASS | All fixtures, unit tests, contract tests, and E2E tests updated. No new untested code paths. Resource constraints preserved. |
| IV. Simplicity & YAGNI | PASS | Minimal patches only. No new abstractions. Display mapping uses a simple object literal. |

**Pre-design gate: PASS** — All principles satisfied.

### Post-Design Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | Status display mapping is a presentation concern (in components). Zod schema is infrastructure. |
| II. Contract-First API | PASS | Enum values now match BridgeServer exactly. "Approved" derived client-side from `done` + review. |
| III. Test Discipline | PASS | Breaking change procedure (II.D) followed: update schema → update mocks → re-run contract tests → update components → full test suite. |
| IV. Simplicity & YAGNI | PASS | No `correlation_id` added (not in backend). No speculative features. |

**Post-design gate: PASS**

## Project Structure

### Documentation (this feature)

```text
specs/051-inventory-delta-e2e-verify/
├── spec.md                          # Feature specification (updated)
├── plan.md                          # This file
├── research.md                      # Phase 0: Contract mismatch findings
├── data-model.md                    # Phase 1: Revised entity/enum summary
├── quickstart.md                    # Phase 1: Verification steps
├── checklists/
│   └── requirements.md              # Spec quality checklist
├── contracts/
│   └── README.md                    # References to contract sources
├── artifacts/
│   ├── api-contract.md              # Updated endpoint documentation
│   ├── ui-verify.md                 # UI walkthrough (from original audit)
│   └── e2e-verify.md                # NEW: E2E verification playbook
└── HANDOFF_051.md                   # Updated handoff with revised verdict
```

### Source Code (repository root)

```text
src/
├── infrastructure/api/
│   └── inventory-delta-schemas.ts   # MODIFIED: AnalysisStatusSchema aligned
├── application/hooks/
│   └── useInventoryDelta.ts         # MODIFIED: Terminal statuses updated
└── presentation/components/inventory/
    ├── InventoryDeltaTable.tsx       # MODIFIED: rationale display added
    ├── InventoryRunList.tsx          # MODIFIED: status labels + refresh button
    └── InventoryRunDetail.tsx        # MODIFIED: processing/done/error handling

tests/
├── mocks/
│   └── inventory-delta-fixtures.ts  # MODIFIED: All fixtures use new enum values
├── unit/api/
│   └── inventory-delta.test.ts      # MODIFIED: Tests use new enum values
├── integration/contracts/
│   └── inventory-delta.contract.test.ts  # MODIFIED: Contract tests aligned
└── e2e/
    └── inventory-delta.spec.ts      # MODIFIED: E2E tests use new status values
```

**Structure Decision**: No new files in `src/`. All changes are modifications to existing files. New documentation artifacts in `specs/051-*/artifacts/`.

## Implementation Strategy

### Change Breakdown

**Breaking Change**: Status enum values (`completed` → `done`, `failed` → `error`, remove `approved`, add `processing`).

This triggers Constitution II.D (Breaking Change Response):
1. Update Zod schemas
2. Update test fixtures (mocks fail first)
3. Re-run contract tests (verify they fail, then fix)
4. Update components (TypeScript compilation catches references)
5. Run full test suite

### File-by-File Changes

#### 1. `src/infrastructure/api/inventory-delta-schemas.ts`

**Change**: `AnalysisStatusSchema` enum values

```
Before: z.enum(['pending', 'completed', 'needs_review', 'approved', 'failed'])
After:  z.enum(['pending', 'processing', 'done', 'needs_review', 'error'])
```

#### 2. `src/application/hooks/useInventoryDelta.ts`

**Change**: `TERMINAL_STATUSES` array

```
Before: ['completed', 'approved', 'failed']
After:  ['done', 'error']
```

#### 3. `src/presentation/components/inventory/InventoryRunList.tsx`

**Changes**:
- Update `statusConfig` object: new keys (`processing`, `done`, `error`), remove old keys
- Add derived "Approved" display: check `done` + review in run detail (not in list — list doesn't have review data)
- Add refresh button prop and render a `RefreshCw` icon button at the top of the list

#### 4. `src/presentation/components/inventory/InventoryRunDetail.tsx`

**Changes**:
- Replace `status === 'pending'` with `status === 'pending' || status === 'processing'` for spinner state
- Replace `status === 'failed'` with `status === 'error'` for error state
- Replace `status === 'completed'` with `status === 'done'` for show-evidence/review conditions
- Replace `status === 'approved'` with `status === 'done' && data.review` for "Reviewed" title
- Replace `status === 'needs_review'` conditions (unchanged — still valid)

#### 5. `src/presentation/components/inventory/InventoryDeltaTable.tsx`

**Change**: Display `rationale` as subtitle below item name

Add after the name/SKU span:
```tsx
{entry.rationale && (
  <p className="text-xs text-muted-foreground">{entry.rationale}</p>
)}
```

#### 6. `src/presentation/components/inventory/InventorySection.tsx`

**Change**: Pass `onRefresh` callback to `InventoryRunList` that calls `refetch()` on the runs query.

#### 7. `tests/mocks/inventory-delta-fixtures.ts`

**Change**: All fixtures updated to use new enum values:
- `mockInventoryRunNeedsReview`: `status: 'needs_review'` (unchanged)
- `mockInventoryRunCompleted`: `status: 'done'` (was `completed`)
- `mockInventoryRunPending`: `status: 'pending'` (unchanged)
- `mockInventoryRunFailed`: `status: 'error'` (was `failed`)
- `mockInventoryRunApproved`: `status: 'done'` (was `approved`), keep `review` non-null
- `mockInventoryRunApprovedAsIs`: `status: 'done'` (was `approved`), keep `review` non-null
- Add `mockInventoryRunProcessing`: `status: 'processing'` (new fixture)
- Run list fixtures: update all status values

#### 8. Test files

- `tests/unit/api/inventory-delta.test.ts`: Update status references
- `tests/integration/contracts/inventory-delta.contract.test.ts`: Update all fixture status values, add `processing` variant test
- `tests/e2e/inventory-delta.spec.ts`: Update mock route status values and assertions

### Documentation Artifacts

#### `artifacts/api-contract.md`

Update with:
- Revised status enum values
- Note about `correlation_id` absence
- Note about missing `/runs` endpoint
- Polling rules with new terminal statuses

#### `artifacts/e2e-verify.md` (NEW)

Step-by-step playbook:
1. Seed a run via BridgeServer (or use mock fixtures)
2. Navigate dashboard to inventory
3. Verify each field renders
4. Submit a review
5. Confirm state transition

#### `HANDOFF_051.md`

Updated verdict with:
- Status enum alignment complete
- `correlation_id` not available (run_id used instead)
- `/runs` endpoint not available (graceful degradation)
- Rationale now displayed

## Complexity Tracking

No constitution violations. No complexity justification needed.
