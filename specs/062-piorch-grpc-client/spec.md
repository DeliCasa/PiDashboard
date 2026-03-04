# Feature Specification: PiOrchestrator Connect RPC Client Migration

**Feature Branch**: `062-piorch-grpc-client`
**Created**: 2026-03-03
**Status**: Draft
**Input**: User description: "PiDashboard — gRPC/Connect client to PiOrchestrator via @delicasa/wire; remove REST shape drift"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Live Operation Sessions via RPC (Priority: P1)

An operator opens the PiDashboard Operations tab and sees a list of operation sessions (active, complete, failed) fetched via Connect RPC instead of REST. The session list loads with the same data as before but is now type-safe against the PiOrchestrator contract — no manual response-shape alignment needed.

**Why this priority**: Sessions are the primary operational view. If session listing works via RPC, it proves the entire Connect transport pipeline end-to-end (client creation, proxy routing, CORS, response parsing).

**Independent Test**: Navigate to Operations tab on the real Pi dashboard. Sessions load successfully with correct status badges, timestamps, and container IDs. Browser Network tab shows `/rpc/delicasa.device.v1.SessionService/ListSessions` requests instead of `/api/v1/sessions`.

**Acceptance Scenarios**:

1. **Given** the Pi is running PiOrchestrator with Connect RPC enabled, **When** an operator opens the Operations tab, **Then** the session list loads via RPC with the same data previously shown by REST.
2. **Given** PiOrchestrator is unreachable, **When** an operator opens the Operations tab, **Then** a user-friendly error is shown with retry option (no raw transport errors).
3. **Given** sessions are loaded via RPC, **When** an operator clicks a session row, **Then** the session detail view opens showing session metadata fetched via `SessionService/GetSession`.

---

### User Story 2 - View Session Evidence and Thumbnails via RPC (Priority: P1)

When drilling into a session, the operator sees evidence captures (before/after image pairs) fetched via Connect RPC. Evidence thumbnails render correctly using presigned URLs or base64 data returned by the RPC response.

**Why this priority**: Evidence rendering is the core validation requirement — proving that binary image data flows correctly through Connect protocol. This is the highest-risk migration point.

**Independent Test**: Open a session with captured evidence on the real Pi. Before/after image thumbnails display correctly. Evidence metadata (camera ID, capture time, status) matches the RPC response fields.

**Acceptance Scenarios**:

1. **Given** a session with complete evidence pairs, **When** the operator opens session detail, **Then** before/after thumbnails render correctly via `EvidenceService/GetEvidencePair`.
2. **Given** a session with partial evidence, **When** the operator opens session detail, **Then** the incomplete pair is indicated with appropriate status (e.g., "missing after image").
3. **Given** evidence is fetched via RPC, **When** the response includes image data, **Then** thumbnails render without additional REST calls for presigned URLs.

---

### User Story 3 - Camera List and Status via RPC (Priority: P2)

The operator views the camera list and individual camera status fetched via Connect RPC instead of REST. Camera health metrics, online/offline status, and container assignments display correctly.

**Why this priority**: Camera management is frequently used but less critical than session/evidence for the migration validation. It covers the largest number of RPC endpoints (4 of 9).

**Independent Test**: Navigate to the Cameras tab. Camera list loads via RPC. Click a camera to see detail/health. All data matches what REST previously showed.

**Acceptance Scenarios**:

1. **Given** ESP32 cameras are connected to the Pi, **When** the operator opens the Cameras tab, **Then** cameras load via `CameraService/ListCameras` with correct status indicators.
2. **Given** a specific camera is selected, **When** the detail view opens, **Then** health metrics are fetched via `CameraService/GetCamera` with WiFi RSSI, heap, uptime.
3. **Given** the operator triggers image capture, **When** the capture completes, **Then** the image is returned via `CaptureService/CaptureImage` with correct content type and data.

---

### User Story 4 - Environment-Driven RPC Configuration (Priority: P2)

The dashboard connects to the PiOrchestrator RPC endpoint using an environment variable instead of hardcoded ports or IPs. This allows the same build to work across local development (via Vite proxy), LAN deployment, and Cloudflare Tunnel access.

**Why this priority**: Eliminates hardcoded infrastructure coupling. Required for Dokku deployment where the RPC URL differs from development.

**Independent Test**: Set the RPC URL environment variable to different values (localhost proxy, LAN IP, Cloudflare Tunnel URL). Dashboard connects correctly in each case.

**Acceptance Scenarios**:

1. **Given** the RPC URL is set to a Cloudflare Tunnel URL, **When** the dashboard loads, **Then** RPC calls route through the tunnel successfully.
2. **Given** the RPC URL is not set, **When** the dashboard loads in development, **Then** RPC calls use the Vite proxy path (`/rpc/`) which forwards to the Pi.
3. **Given** no environment variables are configured, **When** the dashboard loads in production (served from PiOrchestrator), **Then** RPC calls use same-origin relative path (`/rpc/`).

---

### Edge Cases

- What happens when the Pi is running an older PiOrchestrator without RPC support? The dashboard should detect the absence of `/rpc/` and show a clear "RPC unavailable" message, not silent failures.
- How does the system handle Connect protocol errors (e.g., `deadline_exceeded`, `unavailable`)? Errors must be mapped to user-friendly messages consistent with the existing error UX.
- What if the API key is missing or invalid for protected RPCs (CaptureImage, ReconcileCameras)? The dashboard must show an authentication error with guidance, not a raw transport error.
- What happens to REST endpoints that have NO RPC equivalent (WiFi, door, config, containers, etc.)? They continue working via REST exactly as before — no regression.
- What if the browser blocks cross-origin RPC requests due to CORS? The Vite proxy in development and same-origin serving in production should prevent this, but a fallback error message should guide debugging.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use Connect RPC protocol (JSON over HTTP/1.1) for all camera, session, evidence, and capture operations — replacing 9 REST endpoints with 9 RPC calls.
- **FR-002**: System MUST use the shared wire package as the single source of truth for RPC message types and Zod validation schemas.
- **FR-003**: System MUST provide a single, centralized RPC client module that creates typed clients for all four device services (Camera, Capture, Session, Evidence).
- **FR-004**: System MUST read the RPC endpoint URL from an environment variable, defaulting to same-origin `/rpc/` when unset.
- **FR-005**: System MUST validate RPC responses at the UI boundary using shared Zod schemas before passing data to presentation components.
- **FR-006**: System MUST include the API key header for protected RPCs (image capture, camera reconciliation) using the existing auth key mechanism.
- **FR-007**: System MUST map Connect protocol error codes (`not_found`, `unavailable`, `deadline_exceeded`, `unauthenticated`, `internal`) to user-friendly error messages with retry affordances where appropriate.
- **FR-008**: System MUST NOT break any REST-only features (WiFi, door, config, containers, inventory, onboarding, devices, diagnostics, logs, system health) — these continue using the existing REST client.
- **FR-009**: System MUST remove all hardcoded port references from application source code; only environment-driven or proxy-based routing is permitted.
- **FR-010**: System MUST include a development proxy rule for `/rpc/` that forwards to the PiOrchestrator RPC endpoint for local development.
- **FR-011**: System MUST have Connect service descriptors available for the four device services (Camera, Capture, Session, Evidence) to create typed RPC clients.

### Key Entities

- **RPC Transport**: The Connect-Web transport configuration (base URL, interceptors for auth and correlation ID).
- **Service Client**: A typed Connect client for each of the four device services, created from the service descriptor and shared transport.
- **Connect Error**: A structured error with a `code` field (e.g., `not_found`, `unavailable`) that must be mapped to UI error states.
- **Evidence Pair**: Before/after image pair with status (complete/incomplete/missing), fetched via EvidenceService RPC instead of REST.
- **Camera**: Device with status, health metrics, and container assignment, fetched via CameraService RPC.
- **Operation Session**: A capture session with status, timing, and evidence counts, fetched via SessionService RPC.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 9 REST endpoints in scope (cameras, sessions, evidence, capture) are replaced by RPC calls — zero REST calls remain for these operations in production network traffic.
- **SC-002**: Real Pi validation passes: operator can list sessions, open session detail, and view evidence thumbnails with no errors in the browser console.
- **SC-003**: No hardcoded port numbers (8081, 8082) remain in application source files — only environment-driven configuration.
- **SC-004**: All existing REST-only features (WiFi, door, config, containers, inventory, onboarding) continue working without regression.
- **SC-005**: RPC response data is validated against shared Zod schemas at the UI boundary — no manual type casting or response-shape adaptation code for migrated endpoints.
- **SC-006**: The dashboard loads and operates correctly in three configurations: local dev (proxy), LAN production (same-origin), and Cloudflare Tunnel (cross-origin via env var).
- **SC-007**: Protected RPC calls (image capture, camera reconciliation) correctly include the API key header and report authentication errors when the key is missing.

## Assumptions

- PiOrchestrator already exposes the Connect RPC surface at `/rpc/` on port 8081 (per spec 087).
- The shared wire package v0.2.0 contains device message types but NOT service descriptors — service protos must be sourced from PiOrchestrator's contract files.
- CORS on the PiOrchestrator RPC mux is already configured to allow browser access from the dashboard's development and production origins.
- The existing REST client and hooks for non-RPC endpoints remain unchanged and continue working.
- The development proxy will be extended to forward `/rpc/*` to the PiOrchestrator RPC port while existing `/api/*` continues going to the dashboard port.

## Scope Boundaries

**In scope**:
- Connect RPC client setup with Connect-Web library
- Migration of 9 REST endpoints to 9 RPC calls across 4 services
- Zod boundary validation using shared wire schemas
- Environment-driven RPC URL configuration
- Development proxy for `/rpc/` path
- Real Pi validation with sessions, evidence, and cameras

**Out of scope**:
- Modifying PiOrchestrator or BridgeServer
- Migrating REST endpoints that have no RPC equivalent (WiFi, door, config, containers, inventory, onboarding, devices, diagnostics, logs, network)
- Adding new RPC services or methods
- Binary gRPC protocol support (only Connect JSON/HTTP1.1)
- Server-side streaming or bidirectional streaming
- WebSocket system monitor migration (remains WebSocket)
