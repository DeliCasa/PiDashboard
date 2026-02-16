# E2E Verification Playbook: Feature 051

## Status Enum Alignment

PiDashboard now uses BridgeServer's actual enum values:

| BridgeServer Status | PiDashboard Display | Badge Variant |
|--------------------|--------------------|---------------|
| `pending` | Queued | secondary |
| `processing` | Running | secondary |
| `done` | Completed | default |
| `needs_review` | Needs Review | outline |
| `error` | Failed | destructive |

**Derived state**: `status === 'done' && review !== null` renders as "Reviewed" in the detail header.

## Test Fixture IDs

| Entity | Fixture ID |
|--------|-----------|
| Container | `ctr-c1c2c3c4-e5f6-7890-abcd-ef1234567890` |
| Session | `sess-s1s2s3s4-e5f6-7890-abcd-ef1234567890` |
| Run | `run-a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

## Verification Steps

### 1. Run List Status Badges

**Navigate**: App > Container Picker > Select Container > Inventory Tab

**Expected**: Run list items show these badges:
- `run-done-001`: "Completed" (default variant)
- `run-needs-review-002`: "Needs Review" (outline variant)
- `run-processing-003`: "Running" (secondary variant)
- `run-pending-004`: "Queued" (secondary variant)
- `run-error-005`: "Failed" (destructive variant)

**Refresh button**: `data-testid="run-list-refresh"` visible at top of list.

### 2. Delta Table with Rationale

**Navigate**: Click a `needs_review` run to open detail view.

**Expected**:
- `data-testid="inventory-delta-table"` visible
- Item names display in table rows (`data-testid="delta-row-{index}"`)
- Rationale text appears below each item name (`data-testid="delta-rationale-{index}"`)
  - Example: "Two cans removed from shelf" for Coca-Cola 330ml
- Confidence badges show High/Medium/Low tiers

### 3. Run ID in Detail Header

**Expected**: `data-testid="run-id"` shows truncated run ID in `font-mono text-xs text-muted-foreground` style, alongside container ID.

Format: `run-a1b2...7890` (8 chars...4 chars truncation)

### 4. Review Flow

**Navigate**: Open a `needs_review` run.

**Approve flow**:
1. Click `data-testid="review-approve-btn"`
2. Response returns `status: 'done'` with non-null `review`
3. UI shows "Reviewed" in header + audit trail

**Override flow**:
1. Click `data-testid="review-edit-btn"`
2. Edit item counts in `data-testid="edit-count-{index}"`
3. Click `data-testid="review-submit-btn"`
4. Confirm in dialog (`data-testid="review-confirm-btn"`)
5. Response returns `status: 'done'` with corrections in review

### 5. Error States

| Scenario | Expected UI |
|----------|------------|
| `status: 'pending'` | Spinner: "Inventory analysis is being processed..." |
| `status: 'processing'` | Spinner: "Inventory analysis is being processed..." |
| `status: 'error'` | Alert: "Inventory analysis failed" with error_message |
| 404 on session lookup | Error message in lookup form |
| 503 service unavailable | "Inventory service temporarily unavailable" |
| Empty run list | "No inventory data available" |
| 409 review conflict | "This session has already been reviewed" + refresh button |

### 6. Polling Behavior

- Terminal statuses: `['done', 'error']`
- Non-terminal: `['pending', 'processing', 'needs_review']` — polling continues
- Manual refresh via `data-testid="run-list-refresh"` triggers `refetch()`

## Test Commands

```bash
# Full Vitest suite (2390 tests)
VITEST_MAX_WORKERS=1 npm test

# Inventory-specific tests
VITEST_MAX_WORKERS=1 npx vitest run tests/unit/api/inventory-delta.test.ts tests/integration/contracts/inventory-delta.contract.test.ts tests/component/inventory/

# E2E inventory tests
PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/inventory-delta.spec.ts --project=chromium

# TypeScript check
npx tsc --noEmit

# Lint
npm run lint
```

## Key Changes Summary

1. **Schema**: `AnalysisStatusSchema` enum aligned with BridgeServer (`processing`/`done`/`error` replace `completed`/`approved`/`failed`)
2. **Terminal statuses**: `TERMINAL_STATUSES` changed from `['completed', 'approved', 'failed']` to `['done', 'error']`
3. **UI labels**: `statusConfig` updated — `Queued`/`Running`/`Completed`/`Needs Review`/`Failed`
4. **Rationale**: `entry.rationale` displayed in delta table below item name
5. **Run ID**: `run_id` shown in detail header via `truncateId()`
6. **Refresh**: Manual refresh button added to run list
7. **Review**: Mock handler returns `status: 'done'` instead of `'approved'`
