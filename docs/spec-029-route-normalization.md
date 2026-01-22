# Feature Specification: Route Structure Normalization (029)

**Feature Branch**: `029-route-normalization`
**Created**: 2026-01-12
**Status**: Ready
**Input**: Handoff from PiDashboard deployment

## Summary

Normalize API route structure so that port 8082 (dashboard config server) has access to all V1 provisioning API routes, enabling the React dashboard to function fully without requiring a separate API proxy.

## Problem Statement

The PiDashboard React frontend expects all API endpoints on the same origin. Currently:

- Port 8081: Full API (V1 provisioning, health, docs)
- Port 8082: Dashboard static files + legacy `/api/*` routes only

The V1 provisioning routes (`/api/v1/provisioning/*`) are missing from port 8082, breaking:
- Allowlist management
- Batch provisioning sessions
- Session recovery
- SSE event streaming

## User Stories

### US1: Dashboard API Access (P1)

**As a** field technician using the dashboard via Tailscale Funnel,
**I want** all provisioning API endpoints available on the same port as the dashboard,
**So that** I can manage device allowlists and run provisioning sessions without errors.

**Acceptance Criteria**:
1. `GET /api/v1/provisioning/allowlist` returns JSON on port 8082
2. `POST /api/v1/provisioning/batch/start` works on port 8082
3. `GET /api/v1/provisioning/batch/events` SSE stream connects on port 8082
4. No 404 or HTML responses for `/api/v1/*` routes

### US2: Health Check Consistency (P2)

**As a** monitoring system,
**I want** the `/health` endpoint available on port 8082,
**So that** Tailscale Funnel health checks work correctly.

**Acceptance Criteria**:
1. `GET /health` returns `{"status":"healthy"}` on port 8082
2. Response includes version information

### US3: Error Response Consistency (P2)

**As a** developer debugging issues,
**I want** error responses on port 8082 to match port 8081 format,
**So that** correlation IDs and error codes are available for debugging.

**Acceptance Criteria**:
1. Validation errors return `{"success":false,"error":{...},"correlation_id":"..."}`
2. All error responses include timestamp
3. Error codes match documented values (VALIDATION_FAILED, etc.)

## Functional Requirements

- **FR-001**: Port 8082 MUST serve all `/api/v1/provisioning/*` endpoints
- **FR-002**: Port 8082 MUST serve `/health` endpoint
- **FR-003**: Response format MUST match port 8081 exactly (V1 envelope)
- **FR-004**: SSE endpoint MUST support session filtering via query param
- **FR-005**: Request ID middleware MUST be applied to V1 routes on port 8082
- **FR-006**: CORS middleware MUST be applied to V1 routes on port 8082

## Non-Functional Requirements

- **NFR-001**: No measurable latency increase for API calls
- **NFR-002**: No additional network hops (direct handler, not proxy)
- **NFR-003**: Memory footprint increase < 1MB

## Implementation Approach

### Recommended: Shared Route Registration

1. Extract V1 route registration into a reusable function
2. Call from both `setupAPIRoutes()` and `setupConfigWebRoutes()`
3. Ensure handler dependencies are available in both contexts

### Files to Modify

| File | Change |
|------|--------|
| `cmd/hexagonal/main.go` | Add `setupV1Routes()` call to config server |
| `internal/api/router.go` | Extract route registration to shared function |
| `internal/container/container.go` | Verify handler accessibility |

## Routes to Add

```
GET    /health
GET    /api/v1/provisioning/allowlist
POST   /api/v1/provisioning/allowlist
DELETE /api/v1/provisioning/allowlist/:mac
POST   /api/v1/provisioning/allowlist/bulk
DELETE /api/v1/provisioning/allowlist/bulk-remove
DELETE /api/v1/provisioning/allowlist/all
GET    /api/v1/provisioning/allowlist/stats
POST   /api/v1/provisioning/batch/start
GET    /api/v1/provisioning/batch/:id
POST   /api/v1/provisioning/batch/:id/stop
POST   /api/v1/provisioning/batch/:id/pause
POST   /api/v1/provisioning/batch/:id/resume
GET    /api/v1/provisioning/batch/:id/devices
POST   /api/v1/provisioning/batch/:id/devices/:mac/provision
POST   /api/v1/provisioning/batch/:id/devices/:mac/retry
POST   /api/v1/provisioning/batch/:id/devices/:mac/skip
POST   /api/v1/provisioning/batch/:id/provision-all
POST   /api/v1/provisioning/batch/:id/close
GET    /api/v1/provisioning/batch/events
GET    /api/v1/provisioning/batch/network
GET    /api/v1/provisioning/sessions/recoverable
POST   /api/v1/provisioning/sessions/:id/resume
DELETE /api/v1/provisioning/sessions/:id
GET    /api/v1/provisioning/sessions/history
GET    /api/v1/provisioning/network/status
GET    /api/v1/config
GET    /api/v1/logs
```

## Success Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| SC-001 | All V1 routes return JSON on port 8082 | curl test |
| SC-002 | Dashboard allowlist page loads without errors | Browser test |
| SC-003 | Batch session can be started from dashboard | E2E test |
| SC-004 | SSE events received in dashboard | Browser DevTools |
| SC-005 | Error responses include correlation_id | curl test |
| SC-006 | No regression on port 8081 routes | Existing tests |

## Testing

```bash
# Verify V1 routes on port 8082
curl -s http://localhost:8082/health | jq .
curl -s http://localhost:8082/api/v1/provisioning/allowlist | jq .
curl -s http://localhost:8082/api/v1/provisioning/batch/network | jq .

# Verify error format
curl -s -X POST http://localhost:8082/api/v1/provisioning/allowlist \
  -H "Content-Type: application/json" \
  -d '{"mac":"invalid"}' | jq .

# Verify SSE (should stream events)
curl -N http://localhost:8082/api/v1/provisioning/batch/events
```

## Related Documents

- Handoff: `docs/HANDOFF_029_ROUTE_NORMALIZATION.md`
- PiDashboard routes: `src/infrastructure/api/routes.ts`
- PiDashboard API contract: `specs/001-api-compat-integration/contracts/v1-provisioning-api.md`
