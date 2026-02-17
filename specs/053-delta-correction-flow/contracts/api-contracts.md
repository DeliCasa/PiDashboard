# API Contracts: Delta Correction Flow

**Feature**: 053-delta-correction-flow
**Date**: 2026-02-16

## Endpoints

All endpoints are already implemented in `src/infrastructure/api/inventory-delta.ts`. This document captures the contract expectations that must be tested.

### GET /v1/containers/{containerId}/inventory/latest

**Purpose**: Fetch the latest inventory analysis for a container.

**Path Parameters**:
- `containerId` (string, required): Opaque container identifier

**Responses**:

| Status | Body | When |
|--------|------|------|
| 200 | `{ success: true, data: InventoryAnalysisRun }` | Analysis exists |
| 404 | `{ success: false, error: { code: "INVENTORY_NOT_FOUND", ... } }` | No analysis for container |
| 503 | `{ success: false, error: { code: "SERVICE_UNAVAILABLE", retryable: true, ... } }` | Backend down |

**Contract Tests Required**:
- [x] Success with done status (existing)
- [x] Success with pending status (existing)
- [x] Error 404 envelope (existing)
- [x] Error 503 envelope (existing)

---

### GET /v1/sessions/{sessionId}/inventory-delta

**Purpose**: Fetch inventory analysis by session ID (direct lookup).

**Path Parameters**:
- `sessionId` (string, required): Session identifier

**Responses**: Same envelope as latest endpoint.

**Contract Tests Required**:
- [x] Success with analysis data (existing)
- [x] 404 when session not found (existing)

---

### GET /v1/containers/{containerId}/inventory/runs

**Purpose**: Fetch paginated list of analysis runs for a container.

**Path Parameters**:
- `containerId` (string, required): Opaque container identifier

**Query Parameters**:
- `limit` (number, optional, default 20): Page size
- `offset` (number, optional, default 0): Pagination offset
- `status` (AnalysisStatus, optional): Filter by status

**Responses**:

| Status | Body | When |
|--------|------|------|
| 200 | `{ success: true, data: { runs: RunListItem[], pagination: Pagination } }` | Container exists |
| 404 | Error envelope | Container not found |

**Contract Tests Required**:
- [x] Success with runs + pagination (existing)
- [x] Empty run list (existing)
- [x] Second page pagination (existing)

---

### POST /v1/inventory/{runId}/review

**Purpose**: Submit an operator review with optional corrections.

**Path Parameters**:
- `runId` (string, required): Analysis run identifier

**Request Body** (`SubmitReviewRequest`):
```
{
  action: "approve" | "override",
  corrections: ReviewCorrection[],  // empty for approve
  notes?: string                    // max 500 chars
}
```

**Responses**:

| Status | Body | When |
|--------|------|------|
| 200 | `{ success: true, data: { run_id, status, review } }` | Review accepted |
| 400 | `{ success: false, error: { code: "REVIEW_INVALID", ... } }` | Bad correction data |
| 409 | `{ success: false, error: { code: "REVIEW_CONFLICT", ... } }` | Already reviewed |
| 503 | `{ success: false, error: { code: "SERVICE_UNAVAILABLE", ... } }` | Backend down |

**Contract Tests Required**:
- [x] Success review response (existing)
- [ ] **NEW**: Conflict response validates against ReviewResponseSchema
- [ ] **NEW**: Invalid response validates against ReviewResponseSchema
- [ ] **NEW**: SubmitReviewRequest rejects invalid corrections (empty name, negative count)

---

## Schema Validation Gaps (Feature 053 Additions)

### Contract Tests to Add

```
describe('ReviewResponseSchema - error variants')
  it('validates conflict (409) response envelope')
  it('validates invalid (400) response envelope')

describe('SubmitReviewRequestSchema - validation edge cases')
  it('rejects override action with empty corrections array')
  it('rejects correction with empty name')
  it('rejects correction with negative count')

describe('ReviewCorrectionSchema - boundary cases')
  it('accepts correction with added=true flag')
  it('accepts correction with removed=true flag')
  it('rejects correction with both added=true and removed=true')
```

## Mock Fixture Mapping

| Endpoint | Fixture | Purpose |
|----------|---------|---------|
| GET latest (200) | mockInventoryLatestResponse | Happy path |
| GET latest (pending) | mockInventoryLatestPendingResponse | Polling scenario |
| GET latest (404) | mockInventoryNotFoundResponse | Empty state |
| GET latest (503) | mockInventoryServiceUnavailableResponse | Service down |
| POST review (200) | mockReviewSuccessResponse | Approve/correct success |
| POST review (409) | mockReviewConflictResponse | Concurrent conflict |
| POST review (400) | mockReviewInvalidResponse | Validation failure |
| GET runs (200) | mockRunListResponse | Paginated list |
| GET runs (empty) | mockRunListEmpty | No runs |
| GET runs (page 2) | mockRunListSecondPage | Pagination |
