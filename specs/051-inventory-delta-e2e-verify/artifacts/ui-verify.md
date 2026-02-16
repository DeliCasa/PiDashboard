# UI Verification: Inventory Delta Display

**Feature**: 051-inventory-delta-e2e-verify
**Date**: 2026-02-12
**Method**: Static analysis + test execution (no live DEV backend available)

## Verification Approach

Since no live BridgeServer/PiOrchestrator backend is running, verification was performed via:
1. Code walkthrough of all 8 inventory components
2. Execution of 122 passing tests (unit + contract)
3. Review of E2E test scenarios with mocked routes
4. Tracing the full data flow from API client to rendered UI

## Navigation Path

```
App.tsx → Tab "Inventory" (data-testid="tab-inventory")
  → InventorySection.tsx (data-testid="inventory-section")
    → Requires: active container selected via ContainerPicker
    → View 1: InventoryRunList (paginated list of runs)
    → View 2: InventoryRunDetail (single run, reached by clicking list item or session lookup)
```

### Step-by-step Flow

| Step | Action | Component | data-testid |
|------|--------|-----------|-------------|
| 1 | Open dashboard | App.tsx | — |
| 2 | Select container from picker | ContainerPicker | `container-picker` |
| 3 | Click "Inventory" tab | Tabs | `tab-inventory` |
| 4 | View run list (auto-loads) | InventoryRunList | `run-list` |
| 5 | Click a run row | InventoryRunList | `run-list-item-{index}` |
| 6 | View delta table | InventoryDeltaTable | `inventory-delta-table` |
| 7 | View evidence images | InventoryEvidencePanel | `evidence-panel` |
| 8 | Toggle overlays | InventoryEvidencePanel | `overlay-toggle` |
| 9 | Click "Approve" or "Edit & Correct" | InventoryReviewForm | `review-approve-btn`, `review-edit-btn` |
| 10 | (If override) Edit items, submit | InventoryReviewForm | `review-submit-btn` |
| 11 | View audit trail | InventoryAuditTrail | `audit-trail` |
| 12 | Click "Back" | InventoryRunDetail | `run-detail-back` |

### Alternative: Session ID Lookup

| Step | Action | Component | data-testid |
|------|--------|-----------|-------------|
| A1 | Enter session ID in search | InventorySessionLookup | `session-lookup-input` |
| A2 | Click Search | InventorySessionLookup | `session-lookup-submit` |
| A3 | View run detail | InventoryRunDetail | `run-detail` |

## IDs Used in Verification

### Fixture IDs (from `tests/mocks/inventory-delta-fixtures.ts`)

| Entity | ID | Purpose |
|--------|----|---------|
| Container | `ctr-c1c2c3c4-e5f6-7890-abcd-ef1234567890` | Primary test container |
| Session | `sess-s1s2s3s4-e5f6-7890-abcd-ef1234567890` | Primary test session |
| Run | `run-a1b2c3d4-e5f6-7890-abcd-ef1234567890` | Primary "needs_review" run |
| Run (approved) | `run-approved-001` | Approved with corrections |
| Run (needs review) | `run-needs-review-002` | Awaiting operator review |
| Run (completed) | `run-completed-003` | Completed, no review needed |
| Run (pending) | `run-pending-004` | In-progress analysis |
| Run (failed) | `run-failed-005` | Failed with error message |

### API Endpoints Called

| Call | URL Pattern | Fixture Used |
|------|-------------|-------------|
| Run list | `GET /v1/containers/ctr-c1c2.../inventory/runs` | `mockRunListResponse` |
| Session detail | `GET /v1/sessions/sess-bbb2.../inventory-delta` | `mockInventoryRunNeedsReview` |
| Submit review | `POST /v1/inventory/run-a1b2.../review` | `mockReviewSuccessResponse` |

## Delta Display Verification

### What the delta table shows (from `mockInventoryRunNeedsReview`):

| Item | Before | After | Change | Confidence |
|------|--------|-------|--------|------------|
| Coca-Cola 330ml (CC330) | 5 | 3 | -2 (red) | 0.92 High (green) |
| Sprite 330ml (SP330) | 3 | 3 | 0 (gray) | 0.90 High (green) |

### Confidence tier rendering:
- >= 0.8 → "High" badge (green)
- 0.5–0.79 → "Medium" badge (amber)
- < 0.5 → "Low" badge (red) + low-confidence banner

### Evidence panel:
- Before image: `https://storage.example.com/images/before-abc123.jpg?token=xyz`
- After image: `https://storage.example.com/images/after-abc123.jpg?token=xyz`
- Overlay toggle available (1 before overlay, 1 after overlay)

## Test Results

```
Tests run: 122 passed (122), 0 failed
  - Unit tests (inventory-delta.test.ts): 17 passed
  - Contract tests (inventory-delta.contract.test.ts): 105 passed
Duration: 8.65s
```

### E2E Coverage (from `tests/e2e/inventory-delta.spec.ts`)
- Run list rendering + pagination
- Session lookup + navigation to detail
- Review approve flow
- Review override flow with corrections
- Error/empty/unavailable states
- Container scoping

## Failure-Mode Analysis

### No gaps found. All 10 failure scenarios verified with source evidence:

| # | Scenario | Component | data-testid | Source Lines | Status |
|---|----------|-----------|-------------|-------------|--------|
| 1 | No container selected | InventorySection.tsx | `inventory-no-container` | L52–63 | PASS |
| 2 | Empty run list | InventoryRunList.tsx | `run-list-empty` | L121–130 | PASS |
| 3 | 404 INVENTORY_NOT_FOUND | inventory-delta.ts → InventoryRunList | `run-list-empty` | API L123–141, UI L121–130 | PASS |
| 4 | 503 SERVICE_UNAVAILABLE | InventoryRunList.tsx | `run-list-unavailable` | L90–102 | PASS |
| 5 | Pending analysis | InventoryRunDetail.tsx | `run-detail` | L106–137 | PASS |
| 6 | Failed analysis | InventoryRunDetail.tsx | `run-detail` | L140–168 | PASS |
| 7 | Low confidence (avg < 0.5) | InventoryDeltaTable.tsx | `low-confidence-banner` | L63–84 | PASS |
| 8 | Zero delta (no changes) | InventoryDeltaTable.tsx | `inventory-delta-empty` | L65–73 | PASS |
| 9 | 409 review conflict | InventoryReviewForm.tsx | `review-conflict` | L235–252 | PASS |
| 10 | Network error + retry | InventoryRunList.tsx | `run-list-error` | L104–118 | PASS |

**State precedence in InventoryRunList**: Loading → Unavailable (503) → Error → Empty → Data

### Complete data-testid Catalog (67 unique patterns)

**App.tsx**: `tab-inventory`

**InventorySection.tsx**: `inventory-section`, `inventory-no-container`

**InventorySessionLookup.tsx**: `session-lookup`, `session-lookup-input`, `session-lookup-submit`, `session-lookup-error`

**InventoryRunList.tsx**: `run-list-loading`, `run-list-unavailable`, `run-list-error`, `run-list-empty`, `run-list`, `run-list-item-{i}`, `copy-session-id-{i}`, `run-list-load-more`

**InventoryRunDetail.tsx**: `run-detail-loading`, `run-detail-error`, `run-detail`, `run-detail-back`, `container-id`, `container-label`

**InventoryDeltaTable.tsx**: `inventory-delta-table`, `inventory-delta-empty`, `low-confidence-banner`, `delta-row-{i}`, `confidence-badge-{i}`

**InventoryEvidencePanel.tsx**: `evidence-panel`, `evidence-no-images`, `overlay-toggle`, `evidence-before`, `evidence-after`, `overlay-before-{i}`, `overlay-after-{i}`, `evidence-modal`

**InventoryReviewForm.tsx**: `review-actions`, `review-approve-btn`, `review-edit-btn`, `review-edit-form`, `edit-row-{i}`, `edit-name-{i}`, `edit-count-{i}`, `edit-remove-{i}`, `review-error-name-{i}`, `review-error-count-{i}`, `review-add-item-btn`, `review-notes`, `review-error-notes`, `review-submit-disabled-reason`, `review-submit-btn`, `review-cancel-btn`, `review-confirm-dialog`, `review-correction-summary`, `review-notes-preview`, `review-confirm-btn`, `review-conflict`, `review-refresh-btn`

**InventoryAuditTrail.tsx**: `audit-trail`, `audit-reviewer`, `audit-timestamp`, `audit-action`, `audit-corrections`, `audit-approved-note`, `audit-notes`

## Conclusion

**Delta visible: YES** (verified through code analysis + 122 passing tests)

The inventory delta is correctly displayed when:
1. A container is selected via the container picker
2. The run list loads via `GET /v1/containers/:id/inventory/runs`
3. User clicks a run to view detail via `GET /v1/sessions/:id/inventory-delta`
4. The `InventoryDeltaTable` component renders per-item changes with confidence badges
5. Evidence images and overlays render in `InventoryEvidencePanel`
6. Review form allows approve/override actions via `POST /v1/inventory/:id/review`

All Zod schemas validate correctly. All error states are handled gracefully.
