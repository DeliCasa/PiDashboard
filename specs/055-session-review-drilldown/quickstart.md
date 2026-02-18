# Quickstart: 055-session-review-drilldown

**Date**: 2026-02-18
**Branch**: `055-session-review-drilldown`

## Prerequisites

- Node.js 22+
- PiDashboard dependencies installed (`npm install`)
- SSH tunnel to Pi for API proxy: `ssh -L 8082:localhost:8082 pi`
- OR mock data via MSW (see Testing section)

## Development

```bash
# Start dev server (proxies /api to localhost:8082)
npm run dev

# Navigate to http://localhost:5173
# Select a container in the header picker
# Click the "Inventory" tab
```

## What's New

### New Components

| Component | Path | Description |
| --------- | ---- | ----------- |
| `SessionStatusTimeline` | `src/presentation/components/inventory/SessionStatusTimeline.tsx` | 5-step visual lifecycle indicator |
| `RunDebugInfo` | `src/presentation/components/inventory/RunDebugInfo.tsx` | Collapsible metadata with copy-to-clipboard |

### Modified Components

| Component | Changes |
| --------- | ------- |
| `InventoryRunDetail` | Integrates timeline at top, debug info at bottom, enhanced error states |
| `InventoryDeltaTable` | Item count badge in header |
| `InventoryEvidencePanel` | Better messages for partial evidence (before-only, after-only) |
| `InventoryReviewForm` | Renders for empty deltas; empty delta approval path |

### Modified Infrastructure

| File | Changes |
| ---- | ------- |
| `infrastructure/api/inventory-delta.ts` | `lastRequestId` capture, `rerunAnalysis()` method |
| `infrastructure/api/errors.ts` | RERUN_* error codes (conditional) |
| `application/hooks/useInventoryDelta.ts` | `useRerunAnalysis()` hook |

## Testing

```bash
# Run all unit/component tests
VITEST_MAX_WORKERS=1 npm test

# Run only this feature's tests
VITEST_MAX_WORKERS=1 npx vitest run tests/component/inventory/SessionStatusTimeline
VITEST_MAX_WORKERS=1 npx vitest run tests/component/inventory/RunDebugInfo

# Run E2E tests
PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/inventory-review-drilldown.spec.ts

# Lint
npm run lint

# Build verification
npm run build
```

## Key Design Decisions

1. **Timeline is client-side derived** — no backend status changes needed. "Finalized" = `done` + `review !== null`.
2. **Re-run uses feature detection** — POST to `/v1/inventory/:runId/rerun`, hide button on 404/501.
3. **request_id captured via module variable** — simple, YAGNI-compliant, no consumer API changes.
4. **Copy uses `navigator.clipboard.writeText()`** — no external library.

## Demo Walkthrough

1. Open Inventory tab with a container selected
2. Click a run with status "Needs Review" (or search by session ID)
3. Observe: Timeline shows "Delta Ready" active
4. Review delta table with confidence badges
5. Click "Edit & Correct" → change a count → "Submit Review" → Confirm
6. Observe: Timeline updates to "Finalized", audit trail appears
7. Expand "Debug Info" → copy Run ID
