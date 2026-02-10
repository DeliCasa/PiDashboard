# Quickstart: Inventory Delta Viewer & Human Review Workflow

**Feature**: 047-inventory-delta-viewer
**Date**: 2026-02-09

## Prerequisites

- Node.js 22+
- PiDashboard dev server (`npm run dev`)
- Familiarity with project architecture (see CLAUDE.md)

## File Map

### New Files to Create

```
src/
├── domain/types/
│   └── inventory.ts                          # Domain types for inventory entities
├── infrastructure/api/
│   ├── inventory-delta-schemas.ts            # Zod schemas for API validation
│   └── inventory-delta.ts                    # API client for inventory endpoints
├── application/hooks/
│   └── useInventoryDelta.ts                  # React Query hooks (queries + mutations)
└── presentation/components/inventory/
    ├── InventorySection.tsx                   # Main tab content (state machine)
    ├── InventoryDeltaTable.tsx                # Delta display table with confidence badges
    ├── InventoryEvidencePanel.tsx             # Before/after image side-by-side
    ├── InventoryReviewForm.tsx                # Inline edit + approve/submit review
    └── InventoryAuditTrail.tsx                # Review audit display

tests/
├── unit/api/
│   └── inventory-delta.test.ts               # API client unit tests
├── component/inventory/
│   ├── InventorySection.test.tsx              # Section state machine tests
│   ├── InventoryDeltaTable.test.tsx           # Delta table rendering tests
│   ├── InventoryEvidencePanel.test.tsx        # Image display tests
│   ├── InventoryReviewForm.test.tsx           # Review form interaction tests
│   └── InventoryAuditTrail.test.tsx           # Audit trail display tests
├── integration/
│   ├── contracts/inventory-delta.contract.test.ts  # Schema validation tests
│   └── hooks/useInventoryDelta.test.ts        # Hook integration tests with MSW
└── e2e/
    └── inventory-delta.spec.ts                # E2E tests for full workflow
```

### Existing Files to Modify

```
src/
├── App.tsx                                    # Add Inventory tab trigger + content
└── lib/queryClient.ts                         # Add inventory query keys + invalidation

tests/
└── mocks/handlers.ts                          # Add MSW handlers for inventory endpoints
```

## Key Patterns to Follow

### 1. Schema → API Client → Hook → Component

```
inventory-delta-schemas.ts  →  inventory-delta.ts  →  useInventoryDelta.ts  →  InventorySection.tsx
       (Zod)                      (API client)         (React Query)              (UI)
```

### 2. Container Scoping

```typescript
// In hooks: scope to active container
const activeContainerId = useActiveContainerId();
const query = useQuery({
  queryKey: queryKeys.inventoryLatest(activeContainerId ?? ''),
  queryFn: () => inventoryDeltaApi.getLatest(activeContainerId!),
  enabled: !!activeContainerId,
});
```

### 3. Review Mutation

```typescript
// Optimistic update not needed - just invalidate on success
const mutation = useMutation({
  mutationFn: (data) => inventoryDeltaApi.submitReview(runId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
    toast.success('Review submitted');
  },
});
```

## Development Order

1. **Schemas + domain types** (foundation, no dependencies)
2. **API client** (depends on schemas)
3. **Query keys + hooks** (depends on API client)
4. **MSW handlers + mock fixtures** (depends on schemas)
5. **Contract tests** (depends on schemas + fixtures)
6. **InventoryDeltaTable component** (P1 - delta view)
7. **InventorySection + tab integration** (P1 - wiring)
8. **InventoryEvidencePanel** (P2 - images)
9. **InventoryReviewForm** (P3 - review)
10. **InventoryAuditTrail** (P4 - audit)
11. **E2E tests** (end-to-end validation)

## Running Locally

```bash
# Development (MSW mocks inventory endpoints for frontend-only dev)
npm run dev

# Unit + component tests
VITEST_MAX_WORKERS=1 npm test

# E2E tests
PLAYWRIGHT_WORKERS=1 npm run test:e2e
```
