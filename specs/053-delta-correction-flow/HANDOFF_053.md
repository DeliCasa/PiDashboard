# HANDOFF: Feature 053 — Delta Correction Flow

**Feature Branch**: `053-delta-correction-flow`
**Date**: 2026-02-17
**Status**: Complete

## Summary

Feature 053 is a **test-hardening feature** — all UI components already existed from Features 047-052. This feature closes test coverage gaps with:

- Component-level tests for edge cases (low confidence, zero delta, add/remove cancellation, notes validation, conflict handling)
- Contract test hardening (empty names, negative counts, boolean flags)
- Full E2E correction workflow test (view → edit → submit → verify audit trail)
- E2E tests for all state variants (zero-delta, low-confidence, 503, pending, conflict)

## Test Commands

### Unit & Component Tests
```bash
VITEST_MAX_WORKERS=1 npm test
```
**Expected**: 2495+ tests pass across 115 test files

### E2E Tests
```bash
PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/inventory-correction-flow.spec.ts --project=chromium
```
**Expected**: 7 tests pass

### Full E2E Suite
```bash
PLAYWRIGHT_WORKERS=1 npm run test:e2e
```
**Expected**: 226 passed, 80 pre-existing failures (cameras, config, resilience, batch-provisioning), 25 skipped (live-smoke). All 7 new correction flow tests pass.

### Lint
```bash
npm run lint
```
**Expected**: 0 errors, 1 pre-existing warning (TanStack Virtual memoization in LogStream.tsx)

### Build
```bash
npm run build
```

## Test Counts by Category

| File | New Tests | Total Tests |
|------|-----------|-------------|
| `tests/component/inventory/InventoryRunDetail.test.tsx` | 2 (T010, T011) | 23 |
| `tests/component/inventory/InventoryReviewForm.test.tsx` | 5 (T015, T018, T020, T022, T023) | 27 |
| `tests/integration/contracts/inventory-delta.contract.test.ts` | 5 (T028-T030) | 127 |
| `tests/e2e/inventory-correction-flow.spec.ts` | 7 (T031-T038) | 7 |
| **Total** | **19** | |

## New Files

| File | Purpose |
|------|---------|
| `tests/e2e/inventory-correction-flow.spec.ts` | E2E correction workflow tests |
| `src/infrastructure/api/inventory-delta-adapter.ts` | Delta normalization adapter (dual format support) |
| `tests/unit/api/inventory-delta-adapter.test.ts` | Adapter unit tests |
| `tests/integration/contracts/inventory-delta-golden.contract.test.ts` | Golden fixture contract tests |
| `tests/mocks/inventory-delta-golden.ts` | Golden E2E fixtures |
| `tests/e2e/inventory-delta-golden.spec.ts` | Golden E2E spec (Feature 052) |

## Correction Flow Steps (Manual Verification)

1. Select a container with inventory runs
2. Click "Inventory" tab
3. Click a "Needs Review" run to open detail view
4. Verify delta table shows items with confidence badges
5. Click "Edit & Correct" to enter edit mode
6. Change an item count, add a new item, remove an existing item
7. Add review notes
8. Click "Submit Review"
9. Verify confirmation dialog shows correction summary
10. Click "Confirm"
11. Verify audit trail renders with "Corrected" badge and corrections table

## Known Limitations

- `sku: null` is not valid for `DeltaEntrySchema` (uses `z.string().optional()`, not `.nullable()`) — E2E fixtures must omit `sku` rather than pass `null`
- Approve-as-is flow has a race condition window: the session delta mock must be updated BEFORE clicking Approve (since it fires POST immediately without a confirmation dialog)
- `act()` warnings from Radix UI AlertDialog components are benign (Presence, FocusScope, DismissableLayer)
- Pre-existing timeout in `v1-auto-onboard.test.ts` network error test (~3s per error test)

## FR-to-Test Traceability Matrix

| FR | Description | Test(s) | Type |
|----|-------------|---------|------|
| FR-001 | Display latest delta | `InventoryDeltaTable.test.tsx`, `inventory-delta-golden.spec.ts` | Component, E2E |
| FR-002 | Approve as-is | `InventoryReviewForm.test.tsx:181`, `inventory-correction-flow.spec.ts:T033` | Component, E2E |
| FR-003 | Edit mode | `InventoryReviewForm.test.tsx:125`, `inventory-correction-flow.spec.ts:T032` | Component, E2E |
| FR-004 | Add items | `InventoryReviewForm.test.tsx:139,325`, `inventory-correction-flow.spec.ts:T032` | Component, E2E |
| FR-005 | Remove items | `InventoryReviewForm.test.tsx:153`, `inventory-correction-flow.spec.ts:T032` | Component, E2E |
| FR-006 | Notes (500 char) | `InventoryReviewForm.test.tsx:T018`, `inventory-correction-flow.spec.ts:T032` | Component, E2E |
| FR-007 | Inline validation | `InventoryReviewForm.test.tsx:237,253,T018`, `inventory-delta.contract.test.ts:T028,T029` | Component, Contract |
| FR-008 | Confirmation dialog | `InventoryReviewForm.test.tsx:164,T020`, `inventory-correction-flow.spec.ts:T032` | Component, E2E |
| FR-009 | Audit trail | `InventoryAuditTrail.test.tsx`, `inventory-correction-flow.spec.ts:T032,T033` | Component, E2E |
| FR-010 | Conflict (409) | `InventoryReviewForm.test.tsx:T022,T023`, `inventory-correction-flow.spec.ts:T034` | Component, E2E |
| FR-011 | Status variants | `InventoryRunDetail.test.tsx`, `inventory-correction-flow.spec.ts:T038` | Component, E2E |
| FR-012 | Polling for updates | `InventoryRunDetail.test.tsx`, `inventory-correction-flow.spec.ts:T038` | Component, E2E |
| FR-013 | Service unavailable | `InventoryRunList.test.tsx`, `inventory-correction-flow.spec.ts:T037` | Component, E2E |
| FR-014 | Session lookup | `InventorySessionLookup.test.tsx`, `inventory-delta.spec.ts` | Component, E2E |
| FR-015 | Low-confidence banner | `InventoryDeltaTable.test.tsx:143`, `InventoryRunDetail.test.tsx:T010`, `inventory-correction-flow.spec.ts:T036` | Component, E2E |
| FR-016 | Zero-delta state | `InventoryDeltaTable.test.tsx:136,325`, `InventoryRunDetail.test.tsx:T011`, `inventory-correction-flow.spec.ts:T035` | Component, E2E |
| FR-017 | Contract tests | `inventory-delta.contract.test.ts` (127 tests including T028-T030) | Contract |
| FR-018 | E2E workflow | `inventory-correction-flow.spec.ts:T032` | E2E |
