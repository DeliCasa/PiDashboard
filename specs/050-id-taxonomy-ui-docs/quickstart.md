# Quickstart: 050 ID Taxonomy Consistency

**Date**: 2026-02-10

## What This Feature Does

Ensures all opaque identifiers displayed in the UI are explicitly labeled (e.g., "Container ID:", "Session ID:", "Camera ID:") and that test fixtures use UUID-format strings instead of semantic IDs like "kitchen-fridge-001".

## Changes at a Glance

1. **UI label additions** (12 components): Add visible "XYZ ID:" prefix to all opaque identifier displays
2. **Test fixture cleanup** (4 files, ~16 replacements): Replace `kitchen-fridge-001` and `container-001` with UUID-format strings
3. **Verification** (0 code changes): Confirm docs and production code are already clean

## How to Verify

```bash
# 1. Run all tests to confirm no regressions
VITEST_MAX_WORKERS=1 npm test

# 2. Run E2E tests
PLAYWRIGHT_WORKERS=1 npm run test:e2e

# 3. Search for remaining semantic IDs (should return only anti-pattern refs in specs)
grep -r "kitchen-fridge-001" src/ tests/e2e/ tests/component/ tests/integration/
# Expected: Only tests/integration/contracts/containers.contract.test.ts (intentional T046 validation)

# 4. Visual audit: Start dev server and inspect ID labels
npm run dev
# Check: Container Picker, Container Detail, Camera Card, Inventory Run List
```

## Key Design Decisions

- **Inline label prefix** pattern (e.g., `Container ID: abc123...`) matches the existing `InventoryAuditTrail` "Reviewer:" pattern
- **UUID `550e8400-e29b-41d4-a716-446655440001`** used as deterministic test fixture ID for debuggability
- **No new components or abstractions** — labels are added directly to existing JSX
- **Contract test T046** (`kitchen-fridge-001`) intentionally preserved to validate opaque ID acceptance
