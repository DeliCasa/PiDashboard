# Quickstart: Session Drill-Down E2E Operational Validation

**Feature**: 056-session-drilldown-e2e
**Date**: 2026-02-18

## What This Feature Does

Validates and polishes the session review drill-down (Feature 055) for production operator use. Fixes identified UX gaps (image failures, session not found, empty state guidance) and adds E2E test coverage for all operational edge cases.

## Prerequisites

- Node.js 22+
- PiDashboard dependencies installed (`npm install`)
- Playwright browsers installed (for E2E tests)

## Key Files to Modify

### Component Fixes

| File | Change |
|------|--------|
| `src/presentation/components/inventory/InventoryEvidencePanel.tsx` | Add image error state with "Image unavailable" placeholder |
| `src/presentation/components/inventory/InventoryRunDetail.tsx` | Differentiate session-not-found from API errors |

### New/Updated Tests

| File | Change |
|------|--------|
| `tests/component/inventory/InventoryEvidencePanel.test.tsx` | Add image load failure tests |
| `tests/component/inventory/InventoryRunDetail.test.tsx` | Add session-not-found state test |
| `tests/e2e/session-drilldown-e2e.spec.ts` | New E2E suite for operational edge cases |
| `tests/e2e/fixtures/session-drilldown-e2e-mocks.ts` | New E2E mock fixtures |

## Development Workflow

```bash
# 1. Run existing tests to confirm baseline
VITEST_MAX_WORKERS=1 npm test

# 2. Make component changes
# Edit InventoryEvidencePanel.tsx and InventoryRunDetail.tsx

# 3. Run affected component tests
VITEST_MAX_WORKERS=1 npm test -- tests/component/inventory/InventoryEvidencePanel
VITEST_MAX_WORKERS=1 npm test -- tests/component/inventory/InventoryRunDetail

# 4. Run E2E tests
PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/session-drilldown-e2e.spec.ts

# 5. Full validation
npm run lint && VITEST_MAX_WORKERS=1 npm test && npm run build
```

## Architecture Notes

- All changes follow hexagonal architecture (presentation layer only for component fixes)
- No domain or infrastructure changes needed
- No new API endpoints or schema changes
- E2E tests use MSW-backed route mocking via Playwright
