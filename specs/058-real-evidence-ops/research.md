# Research: 058-real-evidence-ops

**Date**: 2026-02-19
**Branch**: `058-real-evidence-ops`

## R1: Presigned URL Auto-Refresh on Image Error

**Decision**: Implement component-level auto-refresh that intercepts `<img>` `onError`, extracts the object key from the failed URL, calls `refreshPresignedUrl()`, and retries the image load once.

**Rationale**: The infrastructure pieces already exist (`refreshPresignedUrl()`, `extractObjectKey()`, `isUrlExpired()`) but are not wired together at the component level. The `getFreshUrl()` function has a known design limitation — it checks expiration but does NOT call refresh. Components currently show a permanent "Failed to load" state on image error with no recovery path.

**Alternatives considered**:
- **Polling-only refresh**: The 10-second evidence polling cycle already fetches fresh URLs. Rejected because: (a) 10s latency is too high for already-expired images, (b) the modal preview doesn't re-poll, (c) doesn't help for Funnel access where URLs may have different lifetimes.
- **Preemptive refresh before render**: Check `isUrlExpired()` before rendering each `<img>`. Rejected because: (a) adds latency on every render, (b) serial presign calls for N images would be slow, (c) the 10s polling already provides reasonably fresh URLs.
- **Service worker intercept**: Intercept 403 responses at the network level and transparently refresh. Rejected because: overengineered for this use case and adds complexity.

**Implementation approach**: Create a reusable `useImageWithRefresh` hook or enhance `EvidenceThumbnail`/`EvidencePreviewModal` to:
1. On `<img>` `onError`: extract object key via existing `extractObjectKey()` helper
2. Call `evidenceApi.refreshPresignedUrl(objectKey)` once
3. If refresh succeeds, update `src` with new URL and retry
4. If refresh fails, show permanent error state with "Retry" button
5. Max 1 automatic retry per image to prevent loops

---

## R2: Image Proxy for Tailscale Funnel Access

**Decision**: The PiOrchestrator backend will provide an image proxy endpoint. The frontend prefers proxy URLs for universal network compatibility. This is a **backend change** — the PiDashboard spec requires the backend to return URLs that work from any network context.

**Rationale**: MinIO is LAN-only. Presigned URLs pointing to a LAN IP (e.g., `http://192.168.1.x:9000/...`) are unreachable from Tailscale Funnel (public internet). Proxying through PiOrchestrator (which is already exposed via Funnel on port 8082) solves this without exposing MinIO publicly.

**Alternatives considered**:
- **Expose MinIO via Tailscale Funnel**: Requires additional Tailscale serve config and exposes MinIO publicly. Rejected: security concern, operational complexity.
- **LAN-only evidence images**: Funnel users see "images unavailable." Rejected: degrades the primary value proposition for remote operators.
- **Client-side detection + URL rewriting**: Detect network context and rewrite URLs. Rejected: fragile, complex, and the backend should own URL generation.

**Frontend implications**:
- If backend returns proxy URLs (e.g., `/api/dashboard/diagnostics/images/{objectKey}`), frontend uses them directly — no change needed.
- If backend returns presigned URLs that include the proxy host (e.g., `https://raspberrypi.tail345cd5.ts.net/api/...`), frontend uses them directly.
- The frontend does NOT need to detect network context. The backend generates context-appropriate URLs.
- **Handoff required**: PiOrchestrator must implement the image proxy endpoint. Create a handoff document.

---

## R3: Subsystem Failure Isolation

**Decision**: Add React error boundaries around each independent subsystem in OperationsView (SessionListView, CameraHealthDashboard) and around the evidence section in SessionDetailView.

**Rationale**: Currently, if SessionListView throws an unhandled error, CameraHealthDashboard also crashes because they share the same render tree with no isolation. The spec requires (FR-005) that "a session API failure MUST NOT prevent camera health from loading."

**Alternatives considered**:
- **Try-catch in hooks only**: React Query already catches fetch errors, but render errors in components are not caught by hooks. Rejected: insufficient for render-time errors.
- **Single top-level ErrorBoundary**: Already exists at the tab level in App.tsx. Rejected: too coarse — crashes the entire Operations tab instead of just the failing subsystem.

**Implementation approach**:
1. Create a reusable `<SubsystemErrorBoundary>` component with:
   - Fallback UI showing which subsystem failed
   - Retry button that resets the boundary
   - Optional `onError` callback for logging
2. Wrap `SessionListView` and `CameraHealthDashboard` independently
3. Wrap evidence/delta section in SessionDetailView
4. Add `isFeatureUnavailable()` checks to SessionListView (matching CameraHealthDashboard pattern)

---

## R4: Actionable Error Messages

**Decision**: Replace generic "Failed to load" messages with context-specific, actionable messages that identify the failing subsystem and suggest corrective action.

**Rationale**: Spec FR-007 requires "clear, actionable error messages when backend services are unreachable — including which service is affected and a suggested corrective action." Current messages are generic (e.g., "Failed to load sessions").

**Implementation approach**:
- Sessions error: "Unable to load sessions — PiOrchestrator may be unreachable. Check the service status or retry."
- Evidence error: "Evidence images unavailable — image storage may be offline. Other session data is still accessible."
- Camera health error: "Camera diagnostics unavailable — this feature may not be enabled on your PiOrchestrator version."
- Per-image error: "Image could not be loaded. Tap to retry."

---

## R5: Evidence Debug Panel for Inventory Evidence

**Decision**: Extend `InventoryEvidencePanel` with a collapsible debug section, reusing the pattern from `EvidencePreviewModal`.

**Rationale**: `EvidencePreviewModal` (diagnostic evidence) already has object key extraction, copy-to-clipboard, and "Open raw" button. `InventoryEvidencePanel` (inventory delta evidence) has none of this. Spec FR-006 requires object key display for ALL evidence.

**Gap**: The inventory delta API response (`EvidenceImagesSchema`) only has `before_image_url` and `after_image_url` — no `object_key`, `expires_at`, or file metadata. Object keys must be extracted from URLs client-side (using existing `extractObjectKey()`), or the backend must add explicit fields.

**Decision**: Extract object keys client-side from presigned URLs using existing `extractObjectKey()` helper. This avoids requiring backend API changes for this feature. If the backend later adds explicit `object_key` fields, the frontend can consume them as a progressive enhancement.

---

## R6: Backend Handoff Requirements

**Decision**: This feature requires a handoff to PiOrchestrator for the image proxy endpoint.

**Required backend changes** (document in handoff):
1. **Image proxy endpoint**: `GET /api/dashboard/diagnostics/images/:objectKey` — fetches object from MinIO and streams bytes to client. Must set `Content-Type`, `Content-Length`, and `Cache-Control` headers.
2. **Context-aware URL generation**: When generating presigned URLs for evidence responses, the backend should detect whether the request came through Tailscale Funnel and return proxy URLs instead of direct MinIO URLs.

**Not required for this feature** (frontend-only changes):
- Auto-refresh on expired URLs (frontend handles with existing presign endpoint)
- Subsystem error boundaries (frontend-only)
- Actionable error messages (frontend-only)
- Debug panel for inventory evidence (frontend-only, uses URL parsing)
