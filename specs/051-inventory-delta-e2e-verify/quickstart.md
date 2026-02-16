# Quickstart: 051 — Live E2E Inventory Delta Display

**Date**: 2026-02-15

## How to Verify the Changes

### 1. Run Tests After Schema Alignment

```bash
cd /home/notroot/Documents/Code/CITi/DeliCasa/PiDashboard

# Unit + contract tests (should pass after status enum + fixture updates)
VITEST_MAX_WORKERS=1 npx vitest run \
  tests/unit/api/inventory-delta.test.ts \
  tests/integration/contracts/inventory-delta.contract.test.ts

# TypeScript compilation check
npx tsc --noEmit

# Full test suite (includes component and E2E tests)
VITEST_MAX_WORKERS=1 npm test
```

### 2. Verify Status Enum Changes

After alignment, the `AnalysisStatusSchema` should contain:
```
pending, processing, done, needs_review, error
```

Check with:
```bash
grep -A5 'AnalysisStatusSchema' src/infrastructure/api/inventory-delta-schemas.ts
```

### 3. Verify Rationale Display

The delta table should now show the `rationale` field as a subtitle under each item name.

### 4. Live Verification (requires backend)

If PiOrchestrator + BridgeServer are running:

```bash
# SSH tunnel to Pi
ssh -L 8082:localhost:8082 pi

# Start dev server
npm run dev

# Open http://localhost:5173
# 1. Select a container from the picker
# 2. Click "Inventory" tab
# 3. Latest run should load (via /v1/containers/:id/inventory/latest)
# 4. Open run to see delta detail with rationale
```

**Note**: The run list (`GET /v1/containers/:id/inventory/runs`) is not yet implemented in BridgeServer. The "latest" endpoint works. The run list will show "service temporarily unavailable" until BridgeServer adds the paginated endpoint.

### 5. E2E Tests (optional, requires Playwright)

```bash
nix develop  # Sets PLAYWRIGHT_BROWSERS_PATH
PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/inventory-delta.spec.ts --project=chromium
```

## Key Files Modified

| Purpose | Path |
|---------|------|
| Zod schemas (status enum) | `src/infrastructure/api/inventory-delta-schemas.ts` |
| Domain types (re-exports) | `src/domain/types/inventory.ts` |
| Delta table (rationale display) | `src/presentation/components/inventory/InventoryDeltaTable.tsx` |
| Run list (refresh button, status labels) | `src/presentation/components/inventory/InventoryRunList.tsx` |
| Run detail (status handling) | `src/presentation/components/inventory/InventoryRunDetail.tsx` |
| Hooks (terminal status list) | `src/application/hooks/useInventoryDelta.ts` |
| Test fixtures | `tests/mocks/inventory-delta-fixtures.ts` |
| Unit tests | `tests/unit/api/inventory-delta.test.ts` |
| Contract tests | `tests/integration/contracts/inventory-delta.contract.test.ts` |
| E2E tests | `tests/e2e/inventory-delta.spec.ts` |

## Known Limitations

1. **Run list endpoint missing**: `GET /v1/containers/:id/inventory/runs` not implemented in BridgeServer
2. **`correlation_id` not available**: Not in BridgeServer inventory schema; `run_id` used instead
3. **"Approved" is derived**: No backend `approved` status; derived from `done` + non-null review
