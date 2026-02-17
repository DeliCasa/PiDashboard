# Quickstart: Delta Correction Flow

**Feature**: 053-delta-correction-flow
**Date**: 2026-02-16

## Overview

Feature 053 closes test coverage gaps in the inventory delta correction workflow. The UI components are already implemented (Features 047-052). This feature adds missing component tests, contract test hardening, and a full E2E correction workflow test.

## Prerequisites

```bash
# Install dependencies (from PiDashboard root)
npm install

# Verify existing tests pass
VITEST_MAX_WORKERS=1 npm test

# Verify E2E infrastructure works
PLAYWRIGHT_WORKERS=1 npm run test:e2e
```

## What's Being Added

### Component Tests (InventoryReviewForm)

New tests for previously untested operations:
- Add item to correction (FR-004)
- Remove item from correction (FR-005)
- Form validation — empty names, negative counts (FR-007)
- Confirmation dialog — render, cancel, submit (FR-008)
- Conflict handling — 409 error → conflict UI → refresh (FR-010)

### Component Tests (InventoryDeltaTable / InventoryRunDetail)

- Low-confidence banner visibility (FR-015)
- Zero-delta empty state message (FR-016)

### Contract Tests

- ReviewResponseSchema validates conflict (409) envelope
- ReviewResponseSchema validates invalid (400) envelope
- SubmitReviewRequestSchema rejects invalid corrections
- ReviewCorrectionSchema boundary cases

### E2E Test: Full Correction Workflow (FR-018)

New file: `tests/e2e/inventory-correction-flow.spec.ts`

Tests the complete operator workflow:
1. Navigate to Inventory tab → select container
2. View run list → click a needs-review run
3. View delta table with item details
4. Enter edit mode → modify a count
5. Add a new item
6. Remove an existing item
7. Add notes
8. Click submit → verify confirmation dialog
9. Confirm → mock POST response
10. Verify audit trail renders with corrections

Additional E2E scenarios:
- Approve as-is flow
- Conflict (409) handling
- Zero-delta display
- Low-confidence banner
- Service unavailable (503) state

### HANDOFF Document

`specs/053-delta-correction-flow/HANDOFF_053.md` — manual verification walkthrough.

## Key Files

| Category | Files |
|----------|-------|
| Component under test | `src/presentation/components/inventory/InventoryReviewForm.tsx` |
| Component under test | `src/presentation/components/inventory/InventoryDeltaTable.tsx` |
| Component under test | `src/presentation/components/inventory/InventoryRunDetail.tsx` |
| Existing tests to extend | `tests/component/inventory/InventoryReviewForm.test.tsx` |
| Existing tests to extend | `tests/component/inventory/InventoryDeltaTable.test.tsx` |
| Existing tests to extend | `tests/component/inventory/InventoryRunDetail.test.tsx` |
| Existing contract tests | `tests/integration/contracts/inventory-delta.contract.test.ts` |
| New E2E test | `tests/e2e/inventory-correction-flow.spec.ts` |
| Mock fixtures | `tests/mocks/inventory-delta-fixtures.ts` |
| E2E mock helpers | `tests/e2e/fixtures/mock-routes.ts` |
| E2E base fixture | `tests/e2e/fixtures/test-base.ts` |

## Running Tests

```bash
# Component tests only (inventory)
VITEST_MAX_WORKERS=1 npx vitest run tests/component/inventory/

# Contract tests only
VITEST_MAX_WORKERS=1 npx vitest run tests/integration/contracts/inventory-delta

# New E2E test
PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/inventory-correction-flow.spec.ts --project=chromium

# All tests
VITEST_MAX_WORKERS=1 npm test
PLAYWRIGHT_WORKERS=1 npm run test:e2e
```

## Architecture Compliance

This feature only adds/modifies test files. No production code changes unless FR-015 (low-confidence banner) requires implementation. All test patterns follow existing conventions:
- Component tests: RTL + Vitest + MSW handlers
- Contract tests: Zod schema `.safeParse()` assertions
- E2E tests: Playwright route interception via `mockEndpoint()` helper
