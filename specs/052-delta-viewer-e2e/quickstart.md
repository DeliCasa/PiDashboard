# Quickstart: 052-delta-viewer-e2e

**Feature**: Inventory Delta Viewer E2E Verification
**Branch**: `052-delta-viewer-e2e`

## What This Feature Does

Hardens the existing Inventory Delta Viewer (Features 047, 048) with:
1. Dual delta format support (flat v1.0 + categorized v2.0)
2. Golden fixture contract tests to catch BridgeServer schema drift
3. Deterministic E2E test proving the full view flow renders correctly
4. API contract snapshot documenting the upstream data shape

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/infrastructure/api/inventory-delta-adapter.ts` | `normalizeDelta()` — converts categorized delta to flat `DeltaEntry[]` for display |
| `tests/mocks/inventory-delta-golden.ts` | Golden fixtures representing canonical BridgeServer response shapes |
| `tests/integration/contracts/inventory-delta-golden.contract.test.ts` | Contract tests validating golden fixtures against PiDashboard schemas |
| `tests/e2e/inventory-delta-golden.spec.ts` | E2E test for deterministic golden fixture rendering |

### Modified Files

| File | Change |
|------|--------|
| `src/infrastructure/api/inventory-delta-schemas.ts` | Add `CategorizedDeltaSchema`, `AddedItemSchema`, `RemovedItemSchema`, `ChangedQtyItemSchema`, `UnknownItemSchema`. Update `InventoryAnalysisRunSchema.delta` to `z.union()` |
| `src/domain/types/inventory.ts` | Re-export new types |
| `src/application/hooks/useInventoryDelta.ts` | Use `normalizeDelta()` in hooks that supply delta to components |
| `tests/mocks/inventory-delta-fixtures.ts` | Add categorized delta fixture variants |

### Unchanged (no modifications needed)

| File | Why unchanged |
|------|--------------|
| `src/presentation/components/inventory/InventoryDeltaTable.tsx` | Already renders `DeltaEntry[]` — adapter handles normalization upstream |
| `src/presentation/components/inventory/InventoryRunList.tsx` | Already handles all states |
| `src/presentation/components/inventory/InventoryRunDetail.tsx` | Already handles all states |
| `src/infrastructure/api/inventory-delta.ts` | API client unchanged — Zod parsing handles new union type automatically |

## Implementation Order

```
Phase 1: Schema + Adapter (no UI changes)
  1. Add CategorizedDelta schemas
  2. Update delta union type
  3. Create normalizeDelta adapter
  4. Add golden fixtures
  5. Add golden contract tests

Phase 2: Hook Integration
  6. Wire normalizeDelta into hooks
  7. Add categorized delta fixture to existing test suite
  8. Update component tests for categorized delta rendering

Phase 3: E2E Verification
  9. Create golden E2E test
  10. Verify full flow with deterministic assertions
```

## Running Tests

```bash
# Contract tests only (fastest feedback)
VITEST_MAX_WORKERS=1 npm test -- tests/integration/contracts/inventory-delta

# All inventory tests
VITEST_MAX_WORKERS=1 npm test -- --testPathPattern inventory

# Golden E2E test
PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/inventory-delta-golden.spec.ts --project=chromium

# Full test suite
VITEST_MAX_WORKERS=1 npm test
```

## Key Design Decisions

1. **Adapter pattern** for delta normalization — keeps `InventoryDeltaTable` unchanged, adapter lives in infrastructure layer
2. **Golden fixtures** represent PiOrchestrator-normalized shape (snake_case), not raw BridgeServer (camelCase)
3. **`z.union()`** for delta field — Zod discriminates array vs. object automatically at parse time
4. **Single E2E test** with deterministic assertions — proves data path, not UI polish
