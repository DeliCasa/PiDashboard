# Data Model: Live Dashboard Inventory Validation

**Feature**: 054-live-dashboard-inventory-validation
**Date**: 2026-02-17

## Overview

This feature introduces no new domain entities. All entities below are pre-existing from Features 047-053. This document captures the entities that live tests interact with, plus two new test-infrastructure types.

## Existing Entities (Reference Only)

### InventoryAnalysisRun

The primary entity displayed in the delta viewer. Represents a single analysis of a container's contents.

**Schema**: `InventoryAnalysisRunSchema` in `src/infrastructure/api/inventory-delta-schemas.ts`

**Key fields for live tests**:
- `run_id: string` — unique run identifier
- `session_id: string` — session that triggered the analysis
- `container_id: string` — owning container (opaque string)
- `status: AnalysisStatus` — one of: `pending`, `processing`, `done`, `needs_review`, `error`
- `delta: DeltaEntry[] | CategorizedDelta` — detected changes (normalized by adapter)
- `review?: Review` — operator review if submitted

**Status transitions relevant to live tests**:
```
pending → processing → done
                    → needs_review → done (after review)
                    → error
```

### Review

The operator's assessment of a delta. Created by correction submission.

**Schema**: `ReviewSchema` in `src/infrastructure/api/inventory-delta-schemas.ts`

**Key fields for live tests**:
- `action: 'approve' | 'override'` — what the operator did
- `corrections: ReviewCorrection[]` — item-level changes
- `notes?: string` — free-text explanation
- `reviewed_at: string` — ISO timestamp

### Container

The container entity from Feature 046 (opaque container identity).

**Selection**: Stored in `useActiveContainerStore` (Zustand, localStorage key: `delicasa-pi-active-container`).

## New Test-Infrastructure Types

### PreflightResult

Returned by the preflight check function. Not a domain entity — exists only in test code.

```typescript
interface PreflightResult {
  /** Whether live tests can proceed */
  canRun: boolean;
  /** Human-readable reason for skip (when canRun=false) */
  skipReason?: string;
  /** Container IDs available for testing */
  containerIds: string[];
  /** The base URL being tested against */
  baseUrl: string;
  /** Optional: first container with reviewable inventory data */
  reviewableContainerId?: string;
}
```

**Location**: `tests/e2e/fixtures/live-preflight.ts`

### LiveTestConfig

Environment-variable-driven configuration for live test execution. Not a domain entity — exists only in test code.

```typescript
interface LiveTestConfig {
  /** Whether live tests are enabled (LIVE_E2E=1) */
  enabled: boolean;
  /** Target deployment URL (LIVE_BASE_URL or default) */
  baseUrl: string;
  /** Optional specific container to test (LIVE_TEST_CONTAINER_ID) */
  testContainerId?: string;
}
```

**Location**: Inline in `tests/e2e/live-inventory-correction.spec.ts` (no separate file needed)

## API Endpoints (Consumed by Live Tests)

| Endpoint | Method | Used By |
|----------|--------|---------|
| `/api/v1/containers` | GET | Preflight (container discovery) |
| `/api/v1/containers/{id}/inventory/latest` | GET | Preflight (data check) + live view test |
| `/api/v1/inventory/{runId}/review` | POST | Live correction/approve tests |

## Relationships

```
Container 1──* InventoryAnalysisRun
InventoryAnalysisRun 0──1 Review
Review 0──* ReviewCorrection
PreflightResult ──uses── Container (IDs)
PreflightResult ──uses── InventoryAnalysisRun (status check)
```
