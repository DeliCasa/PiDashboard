# API Contracts: Session Drill-Down E2E

**Feature**: 056-session-drilldown-e2e
**Date**: 2026-02-18

## Overview

No new API endpoints or contract changes are required. This feature validates the existing contracts established in Features 047-055. The following documents the contracts relevant to the drill-down for reference.

## Existing Endpoints (No Changes)

### GET /v1/sessions/{sessionId}/inventory-delta

**Purpose**: Fetch inventory analysis run by session ID (primary drill-down endpoint)

**Response**: `InventoryLatestResponseSchema`
```
{
  success: boolean,
  data?: InventoryAnalysisRun,
  error?: { code: string, message: string, retryable?: boolean },
  timestamp?: string,
  request_id?: string
}
```

**Error Codes**:
- `INVENTORY_NOT_FOUND` (404): Session has no analysis run → returns null in client
- `INTERNAL_ERROR` (500): Server error → throws V1ApiError

### GET /v1/containers/{containerId}/inventory/latest

**Purpose**: Fetch latest inventory run for a container

**Response**: Same as above

### GET /v1/containers/{containerId}/inventory/runs

**Purpose**: Paginated list of inventory runs for a container

**Query Params**: `limit`, `offset`, `status`

**Response**: `RunListResponseSchema`
```
{
  success: boolean,
  data?: { runs: RunListItem[], pagination: { total, limit, offset, has_more } },
  error?: { code, message, retryable?, retry_after_seconds? },
  timestamp?: string,
  request_id?: string
}
```

### POST /v1/inventory/{runId}/review

**Purpose**: Submit operator review (approve or override)

**Request**: `{ action: 'approve' | 'override', corrections?: [], notes?: string }`

**Response**: `ReviewResponseSchema`

**Error Codes**:
- `REVIEW_CONFLICT` (409): Already reviewed
- `REVIEW_INVALID` (400): Bad request data

### POST /v1/inventory/{runId}/rerun

**Purpose**: Request analysis re-run (feature-detected)

**Response**: `{ new_run_id: string, status: 'pending' }` or 404/501 (unsupported)

## Contract Test Coverage

All schemas have comprehensive contract tests in:
- `tests/integration/contracts/inventory-delta.contract.test.ts` (170+ tests)
- `tests/integration/contracts/inventory-delta-golden.contract.test.ts` (strict mode)

No additional contract tests are needed for this feature.
