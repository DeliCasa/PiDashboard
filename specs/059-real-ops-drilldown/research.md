# Research: 059 Real Ops Drilldown

**Date**: 2026-02-20
**Branch**: `059-real-ops-drilldown`

## Research Questions

### RQ-1: What endpoint URLs does PiOrchestrator actually serve?

**Decision**: Dashboard must update API paths from `/dashboard/diagnostics/*` to `/v1/diagnostics/*` and `/v1/sessions/*`.

**Rationale**: PiOrchestrator registers session/evidence endpoints under the V1 API prefix, not the dashboard prefix:

| PiDashboard Currently Calls | PiOrchestrator Actually Serves | Auth |
|------------------------------|-------------------------------|------|
| `GET /dashboard/diagnostics/sessions` | `GET /api/v1/diagnostics/sessions` | API key |
| `GET /dashboard/diagnostics/sessions/{id}` | *(not implemented)* | — |
| `GET /dashboard/diagnostics/sessions/{id}/evidence` | `GET /api/v1/sessions/{id}/evidence` | API key |
| `GET /dashboard/diagnostics/images/presign` | *(not implemented)* | — |
| `GET /dashboard/cameras/diagnostics` | `GET /api/v1/dashboard/diagnostics/cameras` | None |

**Alternatives considered**:
- Having PiOrchestrator add `/dashboard/` aliases: Rejected — adds maintenance burden and diverges from V1 API convention.
- Adding API key auth to dashboard: Best approach — config UI server on port 8082 can forward requests internally, or a shared key can be configured.

**Action**: PiOrchestrator handoff needed to clarify how port 8082 routes to V1 endpoints. Dashboard should update to V1 paths and PiOrchestrator should proxy these on port 8082 without requiring API key from local dashboard requests.

---

### RQ-2: What are the response schema differences?

**Decision**: Dashboard Zod schemas must be updated to match PiOrchestrator's actual response shapes.

**Rationale**: Significant field-level mismatches exist:

#### Session Schema Differences

| Dashboard Expects | PiOrchestrator Returns | Notes |
|-------------------|----------------------|-------|
| `id: string` | `session_id: string` | Field name mismatch |
| `delivery_id?: string` | `container_id: string` | Different semantic name |
| `status: 'active'\|'completed'\|'cancelled'` | `status: 'active'\|'complete'\|'partial'\|'failed'` | Different enum values |
| `capture_count: number` | `total_captures: number` | Field name mismatch |
| `last_capture_at?: string` | *(not present)* | Not in PiOrchestrator response |
| *(not present)* | `successful_captures: number` | New field |
| *(not present)* | `failed_captures: number` | New field |
| *(not present)* | `has_before_open: boolean` | New field |
| *(not present)* | `has_after_close: boolean` | New field |
| *(not present)* | `pair_complete: boolean` | New field |
| *(not present)* | `last_error: object` | New nested object |
| *(not present)* | `elapsed_seconds: number` | New field |

#### Evidence Schema Differences

| Dashboard Expects | PiOrchestrator Returns | Notes |
|-------------------|----------------------|-------|
| `id: string` | `evidence_id: string` | Field name mismatch |
| `camera_id: string` (espcam-XXXXXX) | `device_id: string` | Different field name |
| `thumbnail_url: string` (presigned) | `image_data: string` (base64) | Fundamentally different approach |
| `full_url: string` (presigned) | `object_key?: string` (S3 key) | No presigned URLs |
| `expires_at: string` | *(not present)* | No URL expiry |
| *(not present)* | `capture_tag: string` | BEFORE_OPEN/AFTER_CLOSE |
| *(not present)* | `status: string` | captured/failed/timeout |
| *(not present)* | `failure_reason?: string` | Error detail |
| *(not present)* | `upload_status?: string` | S3 upload status |

**Alternatives considered**:
- Adapter layer: Rejected as over-engineering — simpler to update schemas directly.
- Transform middleware: Rejected — adds runtime cost with no clear benefit.

---

### RQ-3: How should evidence images be served to the browser?

**Decision**: Use a hybrid approach — base64 inline for recent captures, proxy endpoint for S3-stored images.

**Rationale**: PiOrchestrator does NOT have a presigned URL endpoint. Evidence images are either:
1. **Base64-encoded inline** in the evidence response (for images still in memory, <24h)
2. **In S3/MinIO** via `object_key` (for persisted images, after upload)

The dashboard needs to handle both cases:
- If `image_data` is present: render directly as `data:image/jpeg;base64,{image_data}`
- If `object_key` is present and `upload_status === 'uploaded'`: request image through a PiOrchestrator proxy/presign endpoint

**Action**: PiOrchestrator handoff needed to add an image proxy or presign endpoint:
- Proposed: `GET /api/v1/evidence/image?key={object_key}` — returns image bytes proxied from MinIO
- Alternative: `GET /api/v1/evidence/presign?key={object_key}` — returns presigned MinIO URL

Until the proxy endpoint exists, dashboard can render base64 inline images from the evidence response.

**Alternatives considered**:
- Direct MinIO access from browser: Rejected — violates spec requirement that browser never makes direct MinIO LAN requests.
- Always base64 inline: Rejected — wastes bandwidth for already-uploaded images and increases payload size.

---

### RQ-4: How should session detail work without a dedicated endpoint?

**Decision**: Fetch session detail from the list endpoint with a `session_id` filter, or use the evidence endpoint which includes session metadata.

**Rationale**: PiOrchestrator has no `GET /api/v1/diagnostics/sessions/{id}` endpoint. Two approaches:
1. Filter the list: Call `GET /api/v1/diagnostics/sessions?limit=100` and find by `session_id` client-side
2. Use evidence endpoint: `GET /api/v1/sessions/{id}/evidence` returns session-level metadata alongside evidence

Option 2 is preferred since the detail view always needs evidence data anyway, and the evidence endpoint already returns `session_id`, `container_id`, and a `summary` block.

**Alternatives considered**:
- Request PiOrchestrator add a detail endpoint: Possible future enhancement but not blocking for MVP.

---

### RQ-5: What about the session status enum mismatch?

**Decision**: Update dashboard status enum to match PiOrchestrator values and add UI mapping.

**Rationale**: PiOrchestrator uses `active | complete | partial | failed`. Dashboard currently uses `active | completed | cancelled`. Need to:
1. Update Zod enum: `'active' | 'complete' | 'partial' | 'failed'`
2. Update UI tab labels: "Active" → active, "Completed" → complete, "Failed" → failed, add "Partial" tab
3. Keep stale detection logic but derive it from `elapsed_seconds` field instead of `last_capture_at`

---

### RQ-6: API key authentication for dashboard requests?

**Decision**: Dashboard requests on port 8082 should be unauthenticated; PiOrchestrator config server should internally proxy to V1 API routes.

**Rationale**: The dashboard is served by PiOrchestrator itself on port 8082 (same-origin). Port 8082 is the config UI server which serves the dashboard SPA and handles dashboard-specific API routes. V1 API routes on port 8081 require API key auth.

Best approach: PiOrchestrator config server (8082) registers handler stubs that internally call the same service layer as the V1 API, without requiring API key authentication. This is already the pattern used for `/api/v1/dashboard/diagnostics/system` and `/api/v1/dashboard/diagnostics/cameras`.

**Action**: PiOrchestrator handoff needed to expose session/evidence endpoints on the config UI server (8082) without API key requirement.

---

## Summary of Handoff Requirements

The following PiOrchestrator changes are needed (generate handoff document):

1. **Session diagnostics on port 8082**: Expose session listing without API key
2. **Evidence listing on port 8082**: Expose session evidence without API key
3. **Image proxy/presign endpoint**: New endpoint to serve evidence images from S3 without direct MinIO browser access
4. **Optional: Session detail endpoint**: Single-session fetch by ID

## Technology Best Practices

### Base64 Image Rendering
- Use `<img src="data:image/jpeg;base64,{data}" />` for inline rendering
- No CORS issues since data is inline
- Memory concern: large images (5MB base64 = ~6.7MB string) — lazy-load thumbnails
- Consider extracting thumbnails at capture time (PiOrchestrator-side)

### Hybrid Image Loading
- Check `image_data` first → render inline if present
- Check `object_key` + `upload_status === 'uploaded'` → fetch through proxy
- Fallback: show placeholder with "Image not available" message
- Cache proxy URLs in React Query with 10-minute stale time
