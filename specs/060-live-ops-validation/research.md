# Research: Live Ops Validation

**Feature**: 060-live-ops-validation
**Date**: 2026-02-21
**Prerequisite**: Feature 059 (Real Ops Drilldown) fully merged

## Research Question 1: Are V1 Session/Evidence Endpoints Available on Port 8082?

**Decision**: NO — V1 session and evidence endpoints are currently **only on port 8081** (main API server). Port 8082 (config UI server) does not have them. A PiOrchestrator handoff is required.

**Rationale**: PiOrchestrator's route registration is split between two servers:
- Port 8081 (`router.go`): Full V1 API including sessions, evidence, diagnostics — requires API key auth
- Port 8082 (`main.go:setupConfigWebRoutes`): Dashboard-specific routes — no auth required

The PiDashboard proxies to port 8082 and expects V1 endpoints there. Current port 8082 routes:
- `GET /api/dashboard/diagnostics/system` — system info
- `GET /api/dashboard/diagnostics/cameras` — camera diagnostics
- `GET /api/dashboard/diagnostics/images/proxy` — image proxy
- `GET /api/dashboard/diagnostics/images/presign` — presigned URLs
- Provisioning endpoints (`/api/v1/provisioning/*`)

**Missing on port 8082** (needed by PiDashboard):
- `GET /api/v1/diagnostics/sessions` — session list
- `GET /api/v1/sessions/:sessionId` — session detail
- `GET /api/v1/sessions/:sessionId/evidence` — evidence list
- `GET /api/v1/sessions/:sessionId/evidence/pair` — evidence pair

**Alternatives considered**:
1. ~~Change PiDashboard to proxy to port 8081~~ — rejected because port 8081 requires API key authentication and mixing ports complicates deployment
2. ~~Add API key auth to PiDashboard~~ — rejected because the dashboard is a local device UI, not an external client
3. **Register V1 endpoints on port 8082** — chosen approach. PiOrchestrator needs to add these routes to `setupConfigWebRoutes()` without API key middleware. This is the simplest fix.

**Action**: Generate PiOrchestrator handoff requesting V1 session/evidence routes on port 8082.

---

## Research Question 2: What Test Fixture Mismatches Exist?

**Decision**: Three categories of test data errors need fixing.

**Findings**:

### Invalid Session Status Values
- `tests/e2e/operations.spec.ts` line 37: `status: 'completed'` (invalid — should be `'complete'`)
- `tests/e2e/operations.spec.ts` line 50: `status: 'cancelled'` (invalid — no such enum value, should be `'failed'`)
- `tests/mocks/diagnostics/fixtures.ts` line 181: `status: 'completed'` (invalid)
- `tests/mocks/diagnostics/fixtures.ts` line 188: `status: 'cancelled'` (invalid)

Valid V1 enum: `active | complete | partial | failed`

### Conflicting Schema Definitions
Two `SessionStatusSchema` definitions exist:
- `camera-diagnostics-schemas.ts` line 45-49: LEGACY — `['active', 'completed', 'cancelled']`
- `diagnostics-schemas.ts` line 108: V1 (current) — `['active', 'complete', 'partial', 'failed']`

The legacy schema is used by `tests/mocks/diagnostics/fixtures.ts` and `src/domain/types/camera-diagnostics.ts`.

### Contract Tests Already Catch These
`tests/integration/contracts/diagnostics.contract.test.ts` lines 364-367 correctly test:
```
expect(SessionStatusSchema.safeParse('completed').success).toBe(false);
expect(SessionStatusSchema.safeParse('cancelled').success).toBe(false);
```

**Action**: Fix test data to use valid V1 status values. Evaluate legacy schema removal or unification.

---

## Research Question 3: How Do Evidence Images Work for Non-Pi Browsers?

**Decision**: Base64 inline images work for recent captures. Image proxy endpoint exists for stored images.

**Rationale**:
- PiOrchestrator embeds base64 JPEG data in the `image_data` field of capture entries for recent captures
- For older captures where `image_data` is absent, the `object_key` field provides the S3/MinIO path
- Port 8082 exposes `GET /api/dashboard/diagnostics/images/proxy?key={object_key}` which streams the image from MinIO through PiOrchestrator
- Port 8082 also exposes `GET /api/dashboard/diagnostics/images/presign?key={object_key}` which returns a presigned URL
- PiDashboard's `evidence.ts` has `refreshPresignedUrl()` calling the presign endpoint (best-effort, returns null on 404)

**Current dashboard behavior**:
- EvidenceThumbnail renders base64 images via `data:image/jpeg;base64,...`
- When `image_data` absent and `object_key` present: shows "Stored in S3" placeholder
- InventoryEvidencePanel uses presigned URLs for inventory delta images

**Image proxy vs presign**: The proxy endpoint is more reliable for Tailscale Funnel access because presigned URLs contain MinIO LAN addresses. The proxy streams through PiOrchestrator's port 8082.

**Action**: Consider using the proxy endpoint (`/api/dashboard/diagnostics/images/proxy`) instead of presigned URLs for evidence images that lack base64 data.

---

## Research Question 4: What Camera Health Endpoints Are Available?

**Decision**: Camera diagnostics ARE available on port 8082 and match existing dashboard expectations.

**Rationale**:
- `GET /api/dashboard/diagnostics/cameras` is registered on port 8082
- Returns camera list with: `device_id`, `status`, `rssi`, `capture_success_rate`, `total_captures`, `failed_captures`, `last_seen`, `last_error`
- PiDashboard's `CameraHealthDashboard.tsx` already consumes this endpoint
- Camera diagnostics also available on port 8081 at `GET /api/v1/cameras/:id/diagnostics` with auth

**Status**: No changes needed for camera health. Existing wiring is correct.

---

## Research Question 5: What Is the Vite Proxy Configuration?

**Decision**: Proxy is functional but hard-coded to a specific Pi IP.

**Rationale**:
- `vite.config.ts` line 19: `target: "http://192.168.1.124:8082"`
- CLAUDE.md documents `VITE_API_ORIGIN` env var override but it's not implemented in code
- API client uses relative `/api` paths (correct for production same-origin serving)

**Impact**: Dev proxy works when Pi is at `192.168.1.124`. For other environments, developers must edit `vite.config.ts` or set up an SSH tunnel (`ssh -L 8082:localhost:8082 pi`).

**Action**: Low priority — document the SSH tunnel approach in quickstart.md.

---

## Summary of Actions

| Priority | Action | Scope |
|----------|--------|-------|
| HIGH | Generate PiOrchestrator handoff: add V1 session/evidence routes to port 8082 | PiOrchestrator |
| HIGH | Fix invalid status values in E2E tests and legacy mock fixtures | PiDashboard tests |
| MEDIUM | Evaluate/remove legacy `SessionStatusSchema` in `camera-diagnostics-schemas.ts` | PiDashboard schemas |
| MEDIUM | Consider image proxy endpoint for S3-stored evidence images | PiDashboard evidence |
| LOW | Document dev proxy setup and SSH tunnel in quickstart | Documentation |
