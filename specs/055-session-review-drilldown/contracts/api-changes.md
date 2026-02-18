# API Contract Changes: 055-session-review-drilldown

**Date**: 2026-02-18
**Status**: Draft

## Summary

This feature consumes **all existing endpoints as-is** and adds **one conditional new endpoint** (re-run). No breaking changes to existing contracts.

## Existing Endpoints (No Changes)

All endpoints below are already implemented in `src/infrastructure/api/inventory-delta.ts` and `src/infrastructure/api/evidence.ts` with full Zod validation.

### GET /v1/containers/:containerId/inventory/runs

Paginated list of analysis runs. Query params: `limit`, `offset`, `status`.

### GET /v1/sessions/:sessionId/inventory-delta

Full analysis run by session ID. Returns `InventoryAnalysisRun` in V1 envelope.

### GET /v1/containers/:containerId/inventory/latest

Latest analysis run for a container.

### POST /v1/inventory/:runId/review

Submit operator review. Body: `SubmitReviewRequest`.

### GET /dashboard/diagnostics/sessions/:sessionId/evidence

List evidence captures for a session.

### GET /dashboard/diagnostics/images/presign

Refresh expired presigned image URLs. Query params: `key`, `expiresIn`.

## New Endpoint: POST /v1/inventory/:runId/rerun (CONDITIONAL)

**Status**: Conditional — the PiDashboard feature-detects this endpoint at runtime.

### Request

```
POST /v1/inventory/:runId/rerun
Content-Type: application/json

(empty body or optional parameters TBD)
```

### Expected Success Response (200 or 202)

```json
{
  "success": true,
  "data": {
    "new_run_id": "run_abc123",
    "status": "pending"
  },
  "timestamp": "2026-02-18T12:00:00Z",
  "request_id": "req_xyz789"
}
```

### Expected Failure Responses

| Status | Meaning | Dashboard Behavior |
| ------ | ------- | ------------------ |
| 200/202 | Re-run initiated | Show success toast, navigate to new run |
| 404 | Endpoint not implemented | Hide re-run button permanently |
| 501 | Feature not supported | Hide re-run button permanently |
| 409 | Run already has pending re-run | Show "Re-run already in progress" |
| 500 | Server error | Show retry-able error |

### Feature Detection Flow

```
1. Run status === 'error'
2. Send POST /v1/inventory/:runId/rerun
3. If 404 or 501:
   → Cache "rerun_unsupported" = true (staleTime: Infinity)
   → Hide button, show "Copy error details" instead
4. If 200 or 202:
   → Cache "rerun_supported" = true
   → Show success, invalidate inventory queries
5. On future renders:
   → Check cached support flag before showing button
```

### Zod Schema (deferred)

No Zod schema is created for the re-run response until the backend contract is confirmed. The feature detection path handles the 404/501 case without schema validation — it only needs to check the HTTP status code.

Once the backend implements the endpoint, add:
```typescript
// src/infrastructure/api/inventory-delta-schemas.ts
export const RerunResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    new_run_id: z.string().min(1),
    status: AnalysisStatusSchema,
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
  }).optional(),
  timestamp: z.string().optional(),
  request_id: z.string().optional(),
});
```

## request_id Propagation Enhancement

### Current Behavior

The V1 response envelope includes `request_id: string | undefined`. Zod schemas already parse it:

```typescript
// inventory-delta-schemas.ts
export const InventoryLatestResponseSchema = z.object({
  success: z.boolean(),
  data: InventoryAnalysisRunSchema.optional(),
  error: z.object({ ... }).optional(),
  timestamp: z.string().optional(),
  request_id: z.string().optional(),  // ← already parsed
});
```

But the API client methods (`getLatest`, `getBySession`) extract `data` and discard the envelope.

### Enhancement

Add a module-level capture in `inventory-delta.ts`:

```typescript
let _lastRequestId: string | undefined;

export function getLastRequestId(): string | undefined {
  return _lastRequestId;
}

// Inside getLatest() and getBySession(), after successful parse:
_lastRequestId = parsed.data.request_id;
```

The `RunDebugInfo` component calls `getLastRequestId()` to display the correlation ID.

## Error Code Additions

### New Error Codes (conditional)

Add to `src/infrastructure/api/errors.ts` only if re-run endpoint is implemented:

```typescript
// In ERROR_MESSAGES registry
RERUN_NOT_SUPPORTED: 'Re-run is not available for this analysis.',
RERUN_IN_PROGRESS: 'A re-run is already in progress for this analysis.',
RERUN_FAILED: 'Failed to start re-run. Please try again.',
```

Add to `getErrorCategory()`:
```typescript
if (code === 'RERUN_NOT_SUPPORTED' || code === 'RERUN_IN_PROGRESS' || code === 'RERUN_FAILED') {
  return 'inventory';
}
```
