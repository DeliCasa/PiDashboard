# Feature Specification: Real Evidence Ops — Live Sessions & MinIO Evidence on DEV Data

**Feature Branch**: `058-real-evidence-ops`
**Created**: 2026-02-19
**Status**: Draft
**Input**: User description: "EPIC: PiDashboard Ops visibility on real DEV data — sessions list, drilldown, and evidence rendering from MinIO with production-grade error handling."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse and Filter Live Sessions (Priority: P1)

As an operator, I can browse sessions created by the PiOrchestrator on the DEV environment, filter by status (active, completed, failed), and see real session metadata (delivery ID, timestamps, camera count) — all populated from the live API, not mocked data.

**Why this priority**: Without a working session list against real data, no other feature can be demonstrated or validated. This is the entry point to all operations visibility.

**Independent Test**: Can be fully tested by opening the Operations tab on a Pi connected to the DEV environment and confirming that sessions returned match those visible via the PiOrchestrator API (`GET /dashboard/diagnostics/sessions`). Delivers value by letting the operator see what the system is actually doing.

**Acceptance Scenarios**:

1. **Given** the PiOrchestrator has created at least one session, **When** the operator opens the Operations tab, **Then** the session list displays sessions with real delivery IDs, timestamps, and status badges — matching what the API returns.
2. **Given** the operator selects the "Active" status tab, **When** an active session exists, **Then** only active sessions appear — and the count matches the API response filtered by `status=active`.
3. **Given** the operator selects the "Failed" status tab, **When** cancelled sessions exist, **Then** they appear under "Failed" — consistent with the existing `failed → cancelled` status mapping.
4. **Given** the PiOrchestrator API is unreachable (Pi offline or network issue), **When** the operator opens the Operations tab, **Then** a clear error message appears (e.g., "Cannot reach PiOrchestrator — check network") with a suggested action (retry or check connection), and no JavaScript exceptions are thrown.

---

### User Story 2 — View Real Evidence Images from MinIO (Priority: P1)

As an operator, I can open a session detail page and see before/after evidence images that are stored in the DEV MinIO instance, rendered as thumbnails and expandable to full resolution — using real presigned URLs, not base64 placeholders.

**Why this priority**: Evidence images are the core deliverable of the vending machine monitoring system. If the operator cannot see what the cameras captured, the dashboard provides no operational value. Co-equal with P1 because session list without viewable evidence is incomplete.

**Independent Test**: Can be tested by selecting a session that has evidence captures, confirming images render, and cross-referencing the presigned URL's object key with the actual MinIO bucket contents via `mc ls`.

**Acceptance Scenarios**:

1. **Given** a session has evidence captures stored in MinIO, **When** the operator opens the session detail, **Then** thumbnail images load from presigned URLs and display within 3 seconds on the operator's network.
2. **Given** the operator clicks a thumbnail, **When** the full-resolution image loads, **Then** it displays in a modal/preview at native resolution with a download option.
3. **Given** a presigned URL has expired (past `expires_at`), **When** the component attempts to render the image, **Then** the system automatically refreshes the URL via the presign endpoint and retries the image load — without the operator needing to manually refresh the page.
4. **Given** the MinIO instance is unreachable (network partition, service down), **When** evidence images fail to load, **Then** each failed image shows a clear placeholder (e.g., broken-image icon with "Image unavailable — MinIO may be offline") and a "Retry" action — the rest of the page remains functional.
5. **Given** a session exists but has zero evidence captures, **When** the operator opens the session detail, **Then** the evidence section shows "No evidence captured for this session" — not an error state.

---

### User Story 3 — Camera Health with Last Capture Time (Priority: P2)

As an operator, I can see the health status and last capture timestamp for each camera, so I know whether cameras are functioning and actively capturing evidence for current sessions.

**Why this priority**: Camera health is secondary to viewing session data and evidence, but is essential for diagnosing why evidence might be missing or sessions are stalled.

**Independent Test**: Can be tested by checking the Camera Health panel against the diagnostics endpoint (`GET /v1/cameras/:id/diagnostics`) and confirming last-seen times and online/offline status match reality.

**Acceptance Scenarios**:

1. **Given** a camera is online and has captured evidence in the last 5 minutes, **When** the operator views the Camera Health panel, **Then** the camera shows "Online" status with a "Last capture: X minutes ago" timestamp.
2. **Given** a camera has not been seen for more than 5 minutes, **When** the operator views the Camera Health panel, **Then** the camera shows a warning indicator (e.g., yellow "Stale" badge) with the last-seen timestamp.
3. **Given** a camera is offline, **When** the operator views the Camera Health panel, **Then** the camera shows "Offline" status with the last-seen time, and the operator can distinguish it from cameras that were never discovered.
4. **Given** the camera diagnostics endpoint returns an error, **When** the Camera Health panel loads, **Then** a fallback message appears ("Camera health unavailable") without crashing the Operations view.

---

### User Story 4 — Graceful Degradation Under Real Network Conditions (Priority: P2)

As an operator using the dashboard from the operator network (LAN, Tailscale VPN, or Tailscale Funnel), I experience consistent behavior regardless of which access method I use, and failures in one subsystem (sessions, evidence, cameras) do not cascade to break other parts of the page.

**Why this priority**: The dashboard is accessed from varying network contexts in practice. Production-grade error handling means partial failures are isolated and communicated clearly.

**Independent Test**: Can be tested by accessing the dashboard via each network path (LAN, Tailscale, Funnel) and simulating subsystem failures (e.g., stopping MinIO while sessions API remains available).

**Acceptance Scenarios**:

1. **Given** the operator accesses the dashboard via LAN (`http://192.168.1.124:8082`), **When** all services are healthy, **Then** sessions, evidence images, and camera health all load correctly.
2. **Given** the operator accesses the dashboard via Tailscale Funnel (`https://raspberrypi.tail345cd5.ts.net/`), **When** all services are healthy, **Then** evidence images load correctly — presigned URLs work from the public internet context.
3. **Given** MinIO is down but the PiOrchestrator sessions API is healthy, **When** the operator opens a session detail, **Then** session metadata and status timeline display correctly, evidence images show individual "Image unavailable" placeholders with retry, and camera health loads independently.
4. **Given** the sessions API returns errors but camera diagnostics are healthy, **When** the operator opens the Operations tab, **Then** the Camera Health panel loads correctly, and the session list shows an error with a retry option.
5. **Given** a slow network connection (Tailscale Funnel over mobile), **When** evidence images are loading, **Then** a loading skeleton/spinner appears per-image, and successfully loaded images remain visible even if subsequent images fail.

---

### User Story 5 — Validation: Verify Evidence Corresponds to Real MinIO Objects (Priority: P3)

As an operator or developer validating the system, I can confirm that evidence displayed in the UI corresponds to actual objects in the MinIO bucket — using debug information and documented verification commands.

**Why this priority**: This is a validation/debugging story, not a day-to-day operator flow. Essential for system trust and QA, but not for normal operations.

**Independent Test**: Can be tested by extracting the object key from the UI's debug panel and running `mc ls` / `mc stat` against the MinIO bucket to confirm the object exists.

**Acceptance Scenarios**:

1. **Given** an evidence image is displayed in the UI, **When** the operator opens the debug/detail panel for that evidence, **Then** the MinIO object key (e.g., `evidence/{session_id}/{camera_id}/{timestamp}.jpg`) is visible in a copyable, monospace field.
2. **Given** the operator copies an object key from the UI, **When** they run the documented verification command (see Validation Plan below), **Then** the MinIO object exists with matching size and content type.
3. **Given** the evidence detail panel is open, **When** the presigned URL is displayed, **Then** the URL's query parameters (`X-Amz-Expires`, `X-Amz-Date`) are visible, allowing the operator to understand the URL's lifetime.

---

### Edge Cases

- What happens when a session has hundreds of evidence captures? The UI should paginate or virtualize to avoid rendering all thumbnails simultaneously.
- How does the system handle presigned URLs that were generated for a different network context (e.g., URL generated for LAN but accessed via Funnel)? The presign endpoint must generate URLs accessible from the requesting client's network context.
- What happens when the MinIO bucket exists but is empty (no objects for the session)? The UI should show "No evidence captured" — same as the zero-captures scenario.
- What happens when the PiOrchestrator returns session data referencing evidence that was deleted from MinIO? The UI should show per-image errors ("Object not found") without failing the entire evidence panel.
- How does the system behave when the browser's clock is significantly skewed? Presigned URL expiry checks may incorrectly trigger refreshes; the system should tolerate up to 5 minutes of clock skew.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST load sessions from the live PiOrchestrator API (`/dashboard/diagnostics/sessions`) and display real session data including delivery ID, timestamps, status, and camera count.
- **FR-002**: System MUST render evidence images using presigned URLs obtained from the backend, not from base64 data embedded in API responses (except for live capture previews).
- **FR-003**: System MUST automatically detect expired presigned URLs (based on `expires_at` field) and refresh them via the presign endpoint before attempting to render the image.
- **FR-004**: System MUST handle image load failures per-image without breaking the surrounding page — each failed image shows an error placeholder with a retry action.
- **FR-005**: System MUST isolate failures between subsystems: a session API failure MUST NOT prevent camera health from loading, and a MinIO failure MUST NOT prevent session metadata from displaying.
- **FR-006**: System MUST display the MinIO object key for each evidence capture in the debug/detail panel, in a copyable monospace format.
- **FR-007**: System MUST show clear, actionable error messages when backend services are unreachable — including which service is affected and a suggested corrective action (e.g., "Check PiOrchestrator service" or "MinIO may be offline — retry or contact admin").
- **FR-008**: System MUST work from all supported network access methods: LAN direct, Tailscale VPN, and Tailscale Funnel — presigned URLs must be valid from the client's network context.
- **FR-009**: System MUST display camera health (online/offline status, last-seen time, last capture time) from real diagnostics data, with staleness indicators for cameras not seen recently.
- **FR-010**: System MUST provide a loading state (skeleton/spinner) for each image while it loads, and retain successfully loaded images even if other images fail.

### Non-Functional Requirements

- **NFR-001**: Evidence thumbnails MUST begin rendering within 3 seconds on a LAN connection when presigned URLs are valid.
- **NFR-002**: Expired presigned URL refresh MUST complete within 2 seconds, measured from detection to new URL availability.
- **NFR-003**: The UI MUST remain responsive (no frozen frames, no unhandled exceptions) when up to 50 evidence thumbnails are displayed for a single session.

### Key Entities

- **Session**: A vending machine interaction created by PiOrchestrator. Key attributes: session ID (opaque string), delivery ID, status (active/completed/cancelled), started_at, completed_at, camera assignments, capture count.
- **Evidence Capture**: A camera image associated with a session. Key attributes: evidence ID, session ID, camera ID, captured_at, thumbnail presigned URL, full-resolution presigned URL, URL expiry time, MinIO object key, file size, content type.
- **Camera Health**: Real-time status of an ESP32 camera. Key attributes: camera ID (espcam-XXXXXX pattern), status (online/offline/error), last-seen timestamp, last capture timestamp, WiFi RSSI, free heap memory, connection quality.
- **Presigned URL**: A time-limited URL granting access to a MinIO object. Key attributes: URL string, expiry timestamp, associated object key. Lifecycle: generated by backend on evidence query, refreshed on-demand when near expiry.

## Integration Requirements

### Image Loading Method

The UI loads evidence images via **presigned URLs** served by the backend. The specific mechanism:

1. When evidence is queried (`GET /dashboard/diagnostics/sessions/:id/evidence`), the response includes `thumbnail_url` and `full_url` fields containing presigned MinIO URLs.
2. The frontend renders `<img src={presignedUrl}>` directly — no proxy needed for image bytes.
3. When a URL is near expiry (within 60 seconds of `expires_at`), the frontend calls `GET /dashboard/diagnostics/images/presign?key={objectKey}` to obtain a fresh URL.
4. The backend is responsible for generating URLs that are accessible from the client's network context.

**Requirement**: The spec does not prescribe whether the backend uses S3-compatible presigned URLs, a reverse proxy, or another method internally. It only requires that the URLs returned to the frontend are directly loadable by the browser from any supported network path (LAN, Tailscale, Funnel).

**Decision**: When the dashboard is accessed via Tailscale Funnel (public internet), evidence images MUST be served through the PiOrchestrator as a proxy. MinIO remains LAN-only and is never exposed publicly. The backend provides an image proxy endpoint (e.g., `/api/dashboard/diagnostics/images/:key`) that fetches the object from MinIO and streams the bytes to the client. This means presigned URLs are used for LAN/Tailscale VPN access (direct MinIO), while Funnel access uses the proxy path. The frontend should prefer the proxy path for universal compatibility, or the backend should return URLs that are already routed through the proxy.

### Network Context Assumptions

The dashboard is accessed from three network contexts:

| Context | URL | Image URL Requirement |
| ------- | --- | --------------------- |
| LAN Direct | `http://192.168.1.124:8082` | Presigned URLs must resolve on LAN |
| Tailscale VPN | `https://delicasa-pi-001.tail345cd5.ts.net/` | Presigned URLs must resolve over Tailscale |
| Tailscale Funnel | `https://raspberrypi.tail345cd5.ts.net/` | Presigned URLs must resolve from public internet |

## Validation Plan

### Verify Evidence Object Matches MinIO

To confirm that an evidence image displayed in the UI corresponds to a real MinIO object:

**Step 1 — Extract object key from UI**:
1. Open the Operations tab in the dashboard.
2. Select a session with evidence captures.
3. Open the debug/detail panel for an evidence capture.
4. Copy the "Object Key" value (e.g., `evidence/sess-abc123/espcam-001122/2026-02-19T10-30-00Z.jpg`).

**Step 2 — Verify object exists in MinIO**:
```bash
# SSH to Pi and use MinIO client (mc)
ssh pi "mc ls minio/delicasa-evidence/evidence/sess-abc123/espcam-001122/"
# Expected: lists the .jpg file with matching timestamp

ssh pi "mc stat minio/delicasa-evidence/evidence/sess-abc123/espcam-001122/2026-02-19T10-30-00Z.jpg"
# Expected: shows Size, Content-Type (image/jpeg), ETag, and LastModified
```

**Step 3 — Verify presigned URL resolves**:
```bash
# Copy the presigned URL from the UI's debug panel or browser DevTools Network tab
curl -sI "<presigned_url>"
# Expected: HTTP 200 with Content-Type: image/jpeg and Content-Length matching mc stat output
```

**Step 4 — Verify image content matches**:
```bash
# Download from presigned URL
curl -so /tmp/evidence-from-url.jpg "<presigned_url>"

# Download directly from MinIO
ssh pi "mc cp minio/delicasa-evidence/evidence/sess-abc123/espcam-001122/2026-02-19T10-30-00Z.jpg /tmp/evidence-from-minio.jpg"
scp pi:/tmp/evidence-from-minio.jpg /tmp/evidence-from-minio.jpg

# Compare checksums
sha256sum /tmp/evidence-from-url.jpg /tmp/evidence-from-minio.jpg
# Expected: identical hashes
```

### Verify Session Data Matches API

```bash
# Query sessions API directly
curl -s http://192.168.1.124:8082/api/dashboard/diagnostics/sessions | jq '.data[:3]'
# Compare session IDs, statuses, and timestamps with what the UI displays
```

### Verify Camera Health Matches Diagnostics

```bash
# Query camera diagnostics directly
curl -s http://192.168.1.124:8082/api/v1/cameras/espcam-XXXXXX/diagnostics | jq '.'
# Compare status, last_seen, and health metrics with what the Camera Health panel displays
```

## Assumptions

- The PiOrchestrator DEV environment is running and has created at least some sessions with real evidence captures stored in MinIO.
- MinIO is running on the same Pi or accessible from the Pi's network, and the `mc` CLI tool is available on the Pi for validation.
- The presigned URL endpoint (`/dashboard/diagnostics/images/presign`) is already implemented in the PiOrchestrator backend and generates valid presigned URLs for the DEV MinIO instance.
- The operator has SSH access to the Pi for running validation commands.
- Evidence images are JPEG format (`image/jpeg` content type).
- The MinIO bucket name and path structure follow a convention that includes session ID and camera ID in the object key — the exact format is determined by the PiOrchestrator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can browse and filter sessions with 100% of displayed data matching the live PiOrchestrator API response — verified by comparing UI with direct API query.
- **SC-002**: Evidence images from MinIO load and display for at least 95% of evidence captures in a session (the remaining 5% accounts for transient network issues, which show clear retry options).
- **SC-003**: When a presigned URL expires, the system refreshes and re-renders the image within 5 seconds — without operator intervention.
- **SC-004**: When MinIO is unreachable, the session list and camera health continue to function — only the evidence images show individual error placeholders.
- **SC-005**: The dashboard is accessible and functional from all three network contexts (LAN, Tailscale VPN, Tailscale Funnel) — evidence images load from each.
- **SC-006**: An operator can complete the full validation workflow (extract object key from UI, verify in MinIO, compare checksums) in under 10 minutes using the documented commands.
- **SC-007**: No unhandled JavaScript exceptions occur during normal operation or when any single backend service (sessions API, evidence API, MinIO, camera diagnostics) is unavailable.
