# Quickstart: Inventory Review — Run History & Enhanced Review Workflow

**Feature**: 048-inventory-review
**Prerequisite**: Feature 047 (Inventory Delta Viewer) must be merged

## What This Feature Adds

Extends the Inventory tab (from 047) with:
1. **Run list**: Browse all analysis runs for a container, not just the latest
2. **Session lookup**: Jump directly to a run by pasting a session ID
3. **Validated review form**: Inline validation errors, disabled submit for invalid overrides
4. **Consistent ID display**: Opaque IDs with friendly labels, click-to-copy

## Architecture Overview

```
src/
├── domain/types/
│   └── inventory.ts              # Add RunListItem, DeltaSummary, RunListFilters re-exports
├── application/hooks/
│   └── useInventoryDelta.ts      # Add useInventoryRuns hook, useSessionLookup hook
├── infrastructure/api/
│   ├── inventory-delta-schemas.ts # Add RunListItemSchema, DeltaSummarySchema, PaginationSchema
│   └── inventory-delta.ts        # Add getRuns(containerId, filters) API client method
├── presentation/components/inventory/
│   ├── InventorySection.tsx       # Refactor to list-detail layout
│   ├── InventoryRunList.tsx       # NEW: Paginated run list with status badges
│   ├── InventoryRunDetail.tsx     # NEW: Wrapper for detail view of selected run
│   ├── InventorySessionLookup.tsx # NEW: Session ID input + search
│   ├── InventoryReviewForm.tsx    # MODIFY: Add inline validation
│   ├── InventoryDeltaTable.tsx    # Unchanged (reused)
│   ├── InventoryEvidencePanel.tsx # Unchanged (reused)
│   └── InventoryAuditTrail.tsx    # Unchanged (reused)
└── components/ui/                 # Existing shadcn/ui primitives (Table, Input, Badge, Tooltip)

tests/
├── component/inventory/
│   ├── InventoryRunList.test.tsx          # NEW
│   ├── InventorySessionLookup.test.tsx    # NEW
│   └── InventoryReviewForm.test.tsx       # MODIFY: Add validation tests
├── integration/
│   ├── contracts/inventory-delta.contract.test.ts  # MODIFY: Add run list schemas
│   └── hooks/useInventoryDelta.test.ts              # MODIFY: Add useInventoryRuns tests
├── unit/api/
│   └── inventory-delta.test.ts            # MODIFY: Add getRuns tests
├── mocks/
│   └── inventory-delta-fixtures.ts        # MODIFY: Add run list fixtures
└── e2e/
    └── inventory-delta.spec.ts            # MODIFY: Add run list + session lookup E2E tests
```

## Key Design Decisions

1. **List-detail layout**: InventorySection becomes a container with RunList on the left and RunDetail on the right (stacked on mobile)
2. **Lightweight list items**: RunListItemSchema has `delta_summary` counts instead of full delta/evidence arrays — keeps list API fast
3. **Reuse all 047 components**: InventoryDeltaTable, InventoryEvidencePanel, InventoryAuditTrail are used unchanged in the detail view
4. **Component-local validation**: Review form validation uses React state, not a form library (YAGNI — constitution IV)
5. **Offset/limit pagination**: Follows established pattern from V1 Auto-Onboard API
6. **30-second polling on list**: Only when pending runs exist; visibility-aware

## Development Workflow

```bash
# 1. Ensure 047 is merged to main first
git checkout main && git pull

# 2. Checkout feature branch
git checkout 048-inventory-review

# 3. Development
npm run dev                    # Dev server on :5173

# 4. Testing
VITEST_MAX_WORKERS=1 npm test  # Unit + component + integration
PLAYWRIGHT_WORKERS=1 npm run test:e2e  # E2E

# 5. Pre-commit validation
npm run lint && npm run build && VITEST_MAX_WORKERS=1 npm test
```

## Backend Dependency

This feature requires a **new endpoint** on the BridgeServer/PiOrchestrator side:

```
GET /api/v1/containers/:containerId/inventory/runs?limit=20&offset=0&status=needs_review
```

A handoff document should be generated using `/handoff-generate` to request this endpoint from the backend team. Frontend development can proceed in parallel using MSW mocks.
