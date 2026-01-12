# Feature Specification: Dashboard Route Consumption (030)

**Feature Branch**: `002-dashboard-route-consumption`
**Created**: 2026-01-12
**Status**: Draft
**Input**: User description: "Consume PiOrchestrator 029 route normalization - V1 same-origin on :8082"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Provisioning Allowlist Management (Priority: P1)

A field technician opens the PiDashboard served from PiOrchestrator port 8082 and manages the device allowlist. All CRUD operations (list, add, remove) work without any cross-origin issues or 404 errors.

**Why this priority**: Allowlist management is the foundational provisioning operation. Without same-origin API access, the dashboard cannot perform its core function.

**Independent Test**: Can be tested by opening the dashboard at `http://pi:8082`, navigating to the allowlist section, and performing add/remove operations while monitoring the Network tab for successful `/api/v1/provisioning/allowlist` calls.

**Acceptance Scenarios**:

1. **Given** the dashboard is served from port 8082, **When** the user opens the allowlist page, **Then** `GET /api/v1/provisioning/allowlist` returns JSON (not HTML) with status 200
2. **Given** an empty allowlist, **When** the user adds a device MAC address, **Then** `POST /api/v1/provisioning/allowlist` succeeds and the UI updates immediately
3. **Given** an existing allowlist entry, **When** the user removes it, **Then** `DELETE /api/v1/provisioning/allowlist/:mac` succeeds and the entry disappears from the UI

---

### User Story 2 - Real-Time SSE Event Streaming (Priority: P1)

A field technician starts a batch provisioning session and receives real-time device discovery and state change events via SSE. The connection remains stable and automatically reconnects after transient network issues.

**Why this priority**: SSE is critical for real-time provisioning feedback. Without stable streaming, users cannot monitor device provisioning progress.

**Independent Test**: Start a batch session, observe SSE connection in DevTools, simulate network interruption, and verify reconnection with backoff.

**Acceptance Scenarios**:

1. **Given** an active batch session, **When** the dashboard connects to `/api/v1/provisioning/batch/events`, **Then** a `connection.established` event is received and connection state shows "connected"
2. **Given** an active SSE connection, **When** a device is discovered, **Then** a `device.discovered` event updates the UI in real-time
3. **Given** an active SSE connection, **When** the network disconnects temporarily, **Then** the connection state shows "reconnecting" and reconnects with exponential backoff
4. **Given** an SSE connection that fails to reconnect after max retries, **When** retries are exhausted, **Then** the connection state shows "error" with a user-friendly message and manual retry option

---

### User Story 3 - Batch Provisioning Session Management (Priority: P2)

A field technician creates, monitors, and closes batch provisioning sessions entirely from the dashboard served on port 8082, without needing to access a different port.

**Why this priority**: Full session lifecycle management is required for production use but depends on allowlist (P1) and SSE (P1) working first.

**Independent Test**: Create a session, view device list, provision a device, close the session - all via same-origin API calls.

**Acceptance Scenarios**:

1. **Given** the dashboard on port 8082, **When** the user starts a new batch session, **Then** `POST /api/v1/provisioning/batch/start` returns a session ID
2. **Given** an active session, **When** the user views session devices, **Then** `GET /api/v1/provisioning/batch/:id/devices` returns the device list
3. **Given** a discovered device, **When** the user triggers provisioning, **Then** `POST /api/v1/provisioning/batch/:id/devices/:mac/provision` initiates provisioning
4. **Given** an active session, **When** the user closes it, **Then** `POST /api/v1/provisioning/batch/:id/close` succeeds

---

### User Story 4 - Session Recovery (Priority: P3)

A field technician returns to the dashboard after a browser refresh or network interruption and can resume or view recoverable sessions.

**Why this priority**: Recovery is a convenience feature that improves UX but is not blocking for core provisioning workflows.

**Independent Test**: Start a session, refresh the browser, verify recoverable sessions list shows the previous session.

**Acceptance Scenarios**:

1. **Given** a previously interrupted session, **When** the user opens the dashboard, **Then** `GET /api/v1/provisioning/sessions/recoverable` lists the session
2. **Given** a recoverable session, **When** the user resumes it, **Then** `POST /api/v1/provisioning/sessions/:id/resume` reconnects to the session

---

### Edge Cases

- What happens when the API returns HTML instead of JSON (SPA fallback bug)?
  - Dashboard detects non-JSON response and shows error: "API endpoint not available - ensure PiOrchestrator 029+ is deployed"
- What happens when SSE connection receives malformed events?
  - Events are logged and skipped; connection remains open
- What happens when the dashboard is accessed via wrong port (e.g., 8081)?
  - Static files won't be served; user sees 404 or API-only response
- What happens during PiOrchestrator restart while SSE is connected?
  - SSE reconnects automatically with backoff; UI shows "reconnecting" state

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Dashboard MUST use relative same-origin URLs for all API calls (e.g., `/api/v1/...` not `http://host:port/api/v1/...`)
- **FR-002**: All V1 provisioning endpoints MUST be called via same-origin on port 8082
- **FR-003**: SSE EventSource MUST connect to same-origin endpoint `/api/v1/provisioning/batch/events`
- **FR-004**: SSE implementation MUST support automatic reconnection with exponential backoff (max 5 retries, 1s-30s delay range)
- **FR-005**: SSE connection state MUST be exposed to UI (disconnected, connecting, connected, reconnecting, error)
- **FR-006**: Error responses MUST display correlation ID when available for debugging
- **FR-007**: Dashboard MUST NOT contain hardcoded port references (8081, 8082) in production code paths
- **FR-008**: Development mode MAY support optional `VITE_API_ORIGIN` override for local testing against different backends

### Key Entities

- **SSEConnectionState**: Enum tracking EventSource lifecycle (disconnected, connecting, connected, reconnecting, error)
- **V1ApiError**: Error structure with code, message, retryable flag, correlation_id, and optional retry_after_seconds

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All `/api/v1/provisioning/*` calls from dashboard return JSON responses (0% HTML fallback errors)
- **SC-002**: SSE connection establishes within 2 seconds on stable network
- **SC-003**: SSE reconnects successfully within 30 seconds after transient disconnect
- **SC-004**: Zero hardcoded port references (8081, 8082) in `src/` directory (excluding comments/docs)
- **SC-005**: All existing provisioning integration tests pass with same-origin configuration
- **SC-006**: Dashboard loads and functions correctly when served from PiOrchestrator port 8082 without any proxy

---

## Implementation Status

### Current State (Pre-030)

The codebase is already well-architected for same-origin API access:

| Component | Status | Notes |
|-----------|--------|-------|
| API client uses relative URLs | Complete | `API_BASE = '/api'` in routes.ts |
| V1 client adds `/v1` prefix | Complete | v1-client.ts handles this |
| SSE uses `getSSEEndpoint()` | Complete | Returns `/api/v1/provisioning/batch/events` |
| SSE auto-reconnect | Complete | useSSE.ts with exponential backoff |
| Connection state exposed | Complete | useSSE returns connectionState |
| No hardcoded ports in src/ | Complete | Only vite.config.ts has localhost:8082 |

### Remaining Work

1. **Verification Testing** - Confirm all endpoints work on port 8082 after PiOrchestrator 029
2. **Documentation Updates** - Remove references to dual-port architecture
3. **Optional: Dev Override** - Document `VITE_API_ORIGIN` for advanced dev scenarios

---

## Verification Checklist

### API Endpoint Testing (from dashboard origin) - **VERIFIED 2026-01-12**

- [x] `GET /health` returns `{"status":"healthy"}` (not HTML)
- [x] `GET /api/v1/provisioning/allowlist` returns `{"success":true,"data":{...}}`
- [x] `POST /api/v1/provisioning/allowlist` creates entry successfully
- [x] `DELETE /api/v1/provisioning/allowlist/:mac` removes entry successfully
- [x] `POST /api/v1/provisioning/batch/start` creates session
- [x] `GET /api/v1/provisioning/batch/:id/devices` returns device list
- [x] `GET /api/v1/provisioning/batch/events` streams SSE events
- [x] `GET /api/v1/provisioning/sessions/recoverable` returns session list

### SSE Verification - **VERIFIED 2026-01-12**

- [x] EventSource connects to same-origin URL (useSSE.ts uses relative paths)
- [x] `connection.established` event received on connect
- [x] `device.discovered` events update UI in real-time (SSE hook implemented)
- [x] Connection recovers after simulated network drop (exponential backoff 1s-30s)
- [x] Connection state UI reflects actual state (connectionState exposed)

### Code Verification - **VERIFIED 2026-01-12**

- [x] No `8081` or `8082` in src/ files (excluding comments)
- [x] All API calls use relative paths
- [x] Vite proxy config remains for development only

---

## Assumptions

- PiOrchestrator has deployed 029-route-normalization (commit `6edcfeb`)
- Port 8082 now serves all V1 provisioning routes with proper JSON responses
- SSE endpoint `/api/v1/provisioning/batch/events` is available on port 8082
- No authentication changes are required (existing X-API-Key flow works)
- Tailscale Funnel continues to expose port 8082 publicly
