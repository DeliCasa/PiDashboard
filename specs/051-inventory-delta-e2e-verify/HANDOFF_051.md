---
title: "051: Inventory Delta E2E Verification"
status: done
from: PiDashboard
to: PiOrchestrator
date: 2026-02-16
---

# Handoff: Inventory Delta E2E Verification

## Verdict

**Delta visible: YES**

The PiDashboard UI correctly displays the inventory delta computed by BridgeServer for a specific `(container_id, session_id, run_id)` tuple. Status enum aligned with BridgeServer's actual values. Verified via 2390 passing tests (unit + contract + component + integration) and E2E Playwright suite.

## Status Enum Alignment (Breaking Change)

PiDashboard's `AnalysisStatusSchema` was updated from `['pending', 'completed', 'needs_review', 'approved', 'failed']` to match BridgeServer's actual enum:

| BridgeServer | PiDashboard Display | Notes |
|-------------|--------------------|----|
| `pending` | Queued | Spinner in detail view |
| `processing` | Running | Spinner in detail view (new status) |
| `done` | Completed | Shows evidence + review form |
| `needs_review` | Needs Review | Shows evidence + review form |
| `error` | Failed | Error display with message |

**Derived "Approved" state**: `status === 'done' && review !== null` displays "Reviewed" in detail header + audit trail.

**Terminal statuses for polling**: `['done', 'error']` (was `['completed', 'approved', 'failed']`).

## What Was Implemented

### Schema Changes
- `AnalysisStatusSchema` enum updated in `src/infrastructure/api/inventory-delta-schemas.ts`
- `TERMINAL_STATUSES` updated in `src/application/hooks/useInventoryDelta.ts`
- All test fixtures aligned across unit, contract, component, and E2E layers

### UI Enhancements
- **Rationale display**: `entry.rationale` rendered below item name in delta table (`data-testid="delta-rationale-{index}"`)
- **Run ID display**: `run_id` shown in detail header alongside container ID (`data-testid="run-id"`)
- **Refresh button**: Manual refresh added to run list (`data-testid="run-list-refresh"`)
- **Status labels**: `statusConfig` maps all 5 BridgeServer statuses to display labels

### API Contract

4 endpoints confirmed in use. Full contract documented in `artifacts/api-contract.md`.

| Endpoint | Method | Status |
|----------|--------|--------|
| `/v1/containers/:containerId/inventory/latest` | GET | Implemented, tested |
| `/v1/sessions/:sessionId/inventory-delta` | GET | Implemented, tested |
| `/v1/containers/:containerId/inventory/runs` | GET | Implemented, tested |
| `/v1/inventory/:runId/review` | POST | Implemented, tested |

### Component Summary

8 components render the full inventory flow:
- `InventoryRunList` — paginated run browser with status badges + refresh button
- `InventoryRunDetail` — detail view with run_id display, status-aware rendering
- `InventoryDeltaTable` — per-item delta with rationale, confidence badges
- `InventoryEvidencePanel` — before/after images with detection overlay toggle
- `InventoryReviewForm` — approve or override with inline validation
- `InventoryAuditTrail` — review history display
- `InventorySessionLookup` — cross-container session ID search
- `InventorySection` — list-detail layout container with refresh wiring

## Test Evidence

| Suite | Tests | Status |
|-------|-------|--------|
| Full Vitest suite | 2390 | All pass |
| Unit (API client) | 17 | All pass |
| Contract (Zod schemas) | 105 | All pass |
| Component (inventory) | 39 | All pass |
| E2E (Playwright) | 16 | All pass |
| TypeScript | 0 errors | Clean compile |
| ESLint | 0 errors | 1 pre-existing warning |

## IDs Used

| Entity | Test Fixture ID |
|--------|----------------|
| Container | `ctr-c1c2c3c4-e5f6-7890-abcd-ef1234567890` |
| Session | `sess-s1s2s3s4-e5f6-7890-abcd-ef1234567890` |
| Run | `run-a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

## Remaining Work

None for PiDashboard. The frontend is ready to consume real data from the backend.

**Backend dependency**: PiOrchestrator must proxy the 4 V1 inventory endpoints to BridgeServer. If these endpoints are not yet implemented in the Go proxy layer, that is the only remaining blocker.

## Artifacts

- `artifacts/api-contract.md` — Full endpoint documentation with request/response shapes
- `artifacts/ui-verify.md` — Step-by-step UI walkthrough with IDs and test results
- `artifacts/e2e-verify.md` — E2E verification playbook with fixture IDs, navigation steps, and expected renders
