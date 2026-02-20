---
handoff_id: "058-image-proxy"
direction: outgoing
from_repo: PiDashboard
to_repo: PiOrchestrator
created_at: "2026-02-19T21:39:59.677Z"
status: new
related_prs: []
related_commits: []
requires:
  - type: api
    description: "Image proxy endpoint to stream MinIO object bytes through PiOrchestrator"
  - type: api
    description: "Context-aware presigned URL generation based on client network context"
acceptance:
  - "GET /api/dashboard/diagnostics/images/:objectKey returns image bytes from MinIO"
  - "Proxy endpoint sets Content-Type, Content-Length, and Cache-Control headers"
  - "404 returned when MinIO object does not exist"
  - "502 returned when MinIO is unreachable"
  - "Evidence API responses return proxy URLs when accessed via Tailscale Funnel"
  - "Evidence images load in browser from all three network contexts (LAN, Tailscale VPN, Funnel)"
verification:
  - "curl -sI http://192.168.1.124:8082/api/dashboard/diagnostics/images/sessions/sess-xxx/before.jpg returns 200 with Content-Type: image/jpeg"
  - "curl -sI https://raspberrypi.tail345cd5.ts.net/api/dashboard/diagnostics/images/sessions/sess-xxx/before.jpg returns 200 with Content-Type: image/jpeg"
  - "Image renders in browser when accessed via Tailscale Funnel public URL"
risks:
  - "Large images may cause memory pressure if buffered — stream bytes instead"
  - "Proxy endpoint could be used to enumerate bucket contents — validate objectKey format"
notes: "Frontend already handles presigned URL refresh and image error recovery. This handoff adds the proxy layer needed for Funnel access."
---

# Handoff: Image Proxy for Tailscale Funnel Access

**Date**: 2026-02-19
**Source**: PiDashboard Feature 058 (`058-real-evidence-ops`)
**Target**: PiOrchestrator
**Priority**: High

## Summary

The PiDashboard displays evidence images (before/after captures from ESP32 cameras) stored in MinIO. Currently, the evidence API returns presigned MinIO URLs that point to the LAN IP (e.g., `http://192.168.1.x:9000/bucket/...`). These URLs work when the operator accesses the dashboard from LAN or Tailscale VPN, but they are **unreachable from Tailscale Funnel** (public internet) because MinIO is a LAN-only service.

PiOrchestrator needs to implement an **image proxy endpoint** that fetches objects from MinIO and streams the bytes to the client. When the dashboard is accessed via Funnel, the evidence API should return URLs routed through this proxy instead of direct MinIO presigned URLs.

## Requirements

### Requirement 1: Image Proxy Endpoint

**Current State**:
```
No image proxy exists. Evidence images are served directly via MinIO presigned URLs.
Frontend renders: <img src="http://192.168.1.x:9000/bucket/sessions/sess-xxx/before.jpg?X-Amz-Signature=..." />
This fails when accessed from Tailscale Funnel (public internet) because MinIO is LAN-only.
```

**Required State**:
```
GET /api/dashboard/diagnostics/images/:objectKey

Where :objectKey is the full MinIO object path, e.g.:
  /api/dashboard/diagnostics/images/sessions/sess-abc123/espcam-001122/before.jpg

Response (success):
  Status: 200 OK
  Content-Type: image/jpeg (or actual content type from MinIO object metadata)
  Content-Length: <object size in bytes>
  Cache-Control: public, max-age=3600
  Body: <raw image bytes streamed from MinIO>

Response (object not found):
  Status: 404 Not Found
  Body: {"error": "Object not found", "key": "<objectKey>"}

Response (MinIO unreachable):
  Status: 502 Bad Gateway
  Body: {"error": "Image storage unavailable", "key": "<objectKey>"}
```

**Details**:
- The endpoint MUST stream bytes from MinIO to the client without fully buffering the object in memory (use `io.Copy` or equivalent streaming)
- The `objectKey` parameter captures the full path after `/api/dashboard/diagnostics/images/` — it will contain slashes (e.g., `sessions/sess-abc/before.jpg`)
- Set `Cache-Control: public, max-age=3600` to allow browser caching (evidence images are immutable once captured)
- Validate the `objectKey` format to prevent path traversal (must not contain `..`, must start with an expected prefix like `sessions/` or `evidence/`)
- The MinIO bucket name should come from PiOrchestrator configuration (e.g., `delicasa-evidence`), not from the URL

### Requirement 2: Context-Aware URL Generation

**Current State**:
```go
// Evidence API currently generates presigned URLs pointing to MinIO's LAN address:
presignedURL := minioClient.Presign(ctx, "GET", bucket, objectKey, 15*time.Minute, nil)
// Returns: http://192.168.1.x:9000/bucket/sessions/sess-xxx/before.jpg?X-Amz-...
```

**Required State**:
```go
// When request comes through Tailscale Funnel, return proxy URLs instead:
func getEvidenceImageURL(r *http.Request, objectKey string) string {
    if isAccessedViaFunnel(r) {
        // Return proxy URL that routes through PiOrchestrator
        return fmt.Sprintf("/api/dashboard/diagnostics/images/%s", objectKey)
    }
    // For LAN/Tailscale VPN, presigned URLs still work
    return minioClient.Presign(ctx, "GET", bucket, objectKey, 15*time.Minute, nil)
}

// Detection options (choose one):
// 1. Check X-Forwarded-For or X-Real-IP headers set by Tailscale Funnel proxy
// 2. Check if Host header matches the Funnel hostname
// 3. Always return proxy URLs (simplest, works universally)
```

**Details**:
- The simplest approach is to **always return proxy URLs** (option 3 above) — this works from all network contexts and avoids the complexity of detecting the access method
- If using presigned URLs for LAN access is preferred for performance, detect Funnel access by checking the `Host` header against the configured Funnel hostname (e.g., `raspberrypi.tail345cd5.ts.net`)
- The presign refresh endpoint (`GET /api/dashboard/diagnostics/images/presign?key=...`) should also return context-appropriate URLs

## Acceptance Criteria

- [ ] `GET /api/dashboard/diagnostics/images/:objectKey` returns image bytes with correct Content-Type
- [ ] Proxy streams bytes without full buffering (suitable for images up to 10MB)
- [ ] Returns 404 when the MinIO object does not exist
- [ ] Returns 502 when MinIO is unreachable
- [ ] `objectKey` is validated to prevent path traversal attacks
- [ ] Evidence API responses return URLs that are loadable from Tailscale Funnel
- [ ] Evidence images render in the PiDashboard when accessed via all three network contexts
- [ ] Cache-Control header is set on proxy responses

## Verification Steps

After implementation, verify with these commands:

```bash
# 1. Verify proxy endpoint works from LAN
ssh pi "curl -sI http://localhost:8082/api/dashboard/diagnostics/images/sessions/sess-xxx/before.jpg"
# Expected: HTTP/1.1 200 OK, Content-Type: image/jpeg, Content-Length: <size>

# 2. Verify 404 for non-existent object
ssh pi "curl -sI http://localhost:8082/api/dashboard/diagnostics/images/nonexistent/path.jpg"
# Expected: HTTP/1.1 404 Not Found

# 3. Verify from Tailscale Funnel (public internet)
curl -sI "https://raspberrypi.tail345cd5.ts.net/api/dashboard/diagnostics/images/sessions/sess-xxx/before.jpg"
# Expected: HTTP/1.1 200 OK, Content-Type: image/jpeg

# 4. Verify evidence API returns accessible URLs
curl -s "https://raspberrypi.tail345cd5.ts.net/api/dashboard/diagnostics/sessions" | jq '.data.sessions[0]'
# Expected: evidence URLs should be proxy paths (/api/dashboard/diagnostics/images/...) or
#           presigned URLs that resolve from the public internet

# 5. Open PiDashboard via Funnel and confirm images render
# Navigate to: https://raspberrypi.tail345cd5.ts.net/
# Go to Operations tab → select a session with evidence → images should load

# 6. Verify path traversal protection
ssh pi "curl -sI http://localhost:8082/api/dashboard/diagnostics/images/../../etc/passwd"
# Expected: HTTP/1.1 400 Bad Request (not 200)
```

## Risks

| Risk | Mitigation |
|------|------------|
| Large images (>5MB) may cause memory pressure if buffered | Stream bytes using `io.Copy` from MinIO response to HTTP response writer |
| Proxy endpoint could be used to enumerate bucket contents | Validate objectKey format: must match `^[a-zA-Z0-9/_.-]+$`, no `..` segments |
| Proxy adds latency vs direct MinIO presigned URLs on LAN | Only use proxy when accessed via Funnel; LAN/Tailscale VPN can continue using presigned URLs |
| MinIO connection pool exhaustion under concurrent image loads | Use connection pooling with reasonable limits (e.g., max 10 concurrent MinIO connections) |

## Related Files

| Repository | File | Change Type |
|------------|------|-------------|
| PiOrchestrator | `internal/interfaces/http/dashboard_handler.go` (or equivalent) | Add proxy endpoint handler |
| PiOrchestrator | `internal/interfaces/http/routes.go` (or equivalent) | Register new route |
| PiOrchestrator | `internal/infrastructure/minio/client.go` (or equivalent) | Add `GetObject` method if not exists |
| PiOrchestrator | Evidence API response builder | Modify URL generation to be context-aware |

## Frontend Context

The PiDashboard (Feature 058) has already implemented:

- **Image auto-refresh**: On `<img>` load error, the frontend calls `refreshPresignedUrl(objectKey)` to get a fresh URL and retries once. If the proxy endpoint is used, the URL never expires (it proxies on-demand), so auto-refresh becomes a simple retry.
- **Per-image error handling**: Each image independently shows loading/error/retry states. A failed proxy call (502) shows "Image unavailable" with a retry button.
- **Debug panel**: The `InventoryEvidencePanel` shows extracted object keys (parsed from URLs) for manual MinIO verification.
- **SubsystemErrorBoundary**: Evidence section is isolated — proxy errors do not crash sessions or camera health.

The frontend does NOT need changes for this handoff. It already renders `<img src={url}>` where `url` comes from the API. If the API returns proxy URLs, they work seamlessly.

## Notes

- The "always use proxy URLs" approach (Requirement 2, option 3) is recommended for simplicity. It eliminates the need to detect network context and works universally. The latency overhead of proxying through PiOrchestrator (same Pi, localhost) is negligible on LAN.
- The frontend's `extractObjectKey()` helper parses the object key from the URL pathname. For proxy URLs like `/api/dashboard/diagnostics/images/sessions/sess-xxx/before.jpg`, it would need to strip the `/api/dashboard/diagnostics/images/` prefix. This is a minor frontend adjustment that can be made when the proxy is available.
- If the proxy approach is adopted, the `refreshPresignedUrl()` endpoint may become unnecessary for proxied images (since proxy URLs don't expire). However, keeping it for backward compatibility is recommended.

---

*Generated by Handoff Sentinel*
