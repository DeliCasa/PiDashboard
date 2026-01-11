# Feature Specification: PiOrchestrator V1 API Sync

> **Version**: 1.0.0  
> **Created**: 2026-01-11  
> **Last Updated**: 2026-01-11  
> **Status**: Ready for Implementation  
> **Feature ID**: 006-piorchestrator-v1-api-sync

---

## Overview

### Problem Statement

PiOrchestrator has evolved significantly since the initial Pi Dashboard integration (Feature 002). The backend now provides:

1. **New V1 API Prefix** (`/api/v1/*`) with standardized response envelopes
2. **Batch Provisioning System** for multi-device onboarding
3. **Device Allowlist Management** for security
4. **Session Recovery** for interrupted provisioning
5. **SSE Event Streaming** for real-time provisioning updates
6. **API Key Authentication** for protected endpoints
7. **Structured Error Codes** with retry guidance
8. **WebSocket Monitoring** for system health

The Pi Dashboard currently:
- Uses legacy `/api/*` endpoints (still functional but deprecated)
- Has no batch provisioning UI
- Uses polling for logs instead of SSE
- Has no API key authentication support
- Does not handle the new response envelope format

Without this sync, the dashboard cannot leverage the new multi-device provisioning workflow, which is critical for field technicians onboarding multiple cameras simultaneously.

### Proposed Solution

Incrementally update the Pi Dashboard to:

1. **Add V1 API Client Layer** with response envelope handling
2. **Implement API Key Authentication** for protected endpoints
3. **Add Batch Provisioning UI** with SSE-driven progress updates
4. **Implement Allowlist Management** UI
5. **Add WebSocket Monitoring** for real-time system health
6. **Upgrade Error Handling** to use typed error codes
7. **Maintain Backward Compatibility** with existing features

### Target Users

| User | Primary Use Case |
|------|-----------------|
| **Field Technicians** | Onboard multiple ESP-CAM devices in a single session |
| **System Administrators** | Manage device allowlist and monitor provisioning sessions |
| **Support Engineers** | Diagnose provisioning failures using correlation IDs |

### Business Value

- **Reduced Onboarding Time**: Provision 10 cameras in 5 minutes vs 30+ minutes individually
- **Improved Security**: Only allowlisted devices can be provisioned
- **Better UX**: Real-time progress feedback via SSE replaces polling guesswork
- **Easier Debugging**: Correlation IDs enable end-to-end request tracing

---

## Handoff Document Summary

**Source**: `docs/HANDOFF_PIORCH_DASHBOARD_INTEGRATION.md`  
**Baseline**: v0.1.0 (SHA: 8814cf2)  
**Current**: 024-multi-device-onboarding-hub (SHA: d0093b0)

### Breaking Changes Assessment

| Change | Impact | Dashboard Action |
|--------|--------|------------------|
| Protected routes require API key | **HIGH** | Add `X-API-Key` header for batch/door/config endpoints |
| New response envelope format | **MEDIUM** | Wrap API responses with envelope parser |
| SSE events have versioned envelope | **LOW** | Parse `version`, `type`, `payload` structure |
| Correlation IDs in responses | **NONE** | Log for debugging (informational) |

### Existing Endpoints (Unchanged)

The following continue to work exactly as before:
- `/api/v1/system/*` - System info, health, logs
- `/api/v1/wifi/*` - WiFi scanning, connection
- `/api/v1/cameras/*` - Camera management
- `/api/v1/espcam/*` - ESP-CAM discovery and pairing
- `/api/v1/config` (GET) - Read config (unprotected)
- `/api/v1/network/*` - Network diagnostics

---

## User Scenarios & Acceptance Criteria

### US1: Batch Device Provisioning

**As a** field technician  
**I want to** provision multiple ESP-CAM devices simultaneously  
**So that** I can complete vending machine setup efficiently

**Acceptance Criteria**:
- [ ] AC1.1: Can start a batch provisioning session with target WiFi credentials
- [ ] AC1.2: Discovered devices appear in real-time as SSE events arrive
- [ ] AC1.3: Can provision all discovered devices with one click
- [ ] AC1.4: Progress bar shows per-device state transitions (discovered -> provisioning -> verified)
- [ ] AC1.5: Failed devices show error messages with retry option
- [ ] AC1.6: Can stop a session gracefully

### US2: Device Allowlist Management

**As a** system administrator  
**I want to** maintain a list of approved device MAC addresses  
**So that** only trusted devices can be provisioned

**Acceptance Criteria**:
- [ ] AC2.1: View current allowlist with device descriptions
- [ ] AC2.2: Add new devices with MAC address validation
- [ ] AC2.3: Remove devices from allowlist
- [ ] AC2.4: See which allowlist entries have been used

### US3: Session Recovery

**As a** field technician  
**I want to** resume an interrupted provisioning session  
**So that** I don't lose progress if the Pi restarts

**Acceptance Criteria**:
- [ ] AC3.1: See list of recoverable sessions on dashboard load
- [ ] AC3.2: Resume a session with preserved device states
- [ ] AC3.3: Clear notification when no recoverable sessions exist

### US4: Real-Time System Monitoring

**As a** support engineer  
**I want to** see live system health metrics  
**So that** I can monitor the Pi during provisioning

**Acceptance Criteria**:
- [ ] AC4.1: WebSocket connection shows CPU, memory, temperature in real-time
- [ ] AC4.2: Connection status indicator shows WebSocket health
- [ ] AC4.3: Fallback to polling if WebSocket fails

### US5: API Key Configuration

**As a** system administrator  
**I want to** configure the API key used by the dashboard  
**So that** I can access protected endpoints securely

**Acceptance Criteria**:
- [ ] AC5.1: API key stored securely (not in localStorage in production)
- [ ] AC5.2: Clear error message when API key is missing/invalid
- [ ] AC5.3: Dev mode bypasses auth for local development

### US6: Error Handling & Debugging

**As a** support engineer  
**I want to** see structured error messages with correlation IDs  
**So that** I can diagnose provisioning failures

**Acceptance Criteria**:
- [ ] AC6.1: Error messages display user-friendly text
- [ ] AC6.2: Retryable errors show countdown timer
- [ ] AC6.3: Correlation ID visible in error details (expandable)
- [ ] AC6.4: Rate limit errors (429) show retry-after countdown

---

## Functional Requirements

### FR-1: V1 API Client Enhancement

**FR-1.1**: The API client shall support a configurable base path (`/api` or `/api/v1`).

**FR-1.2**: The API client shall unwrap V1 response envelopes, extracting `data` on success and throwing typed errors on failure.

**FR-1.3**: The API client shall include `X-API-Key` header for protected endpoints when configured.

**FR-1.4**: The API client shall store and log `correlation_id` from all responses for debugging.

**FR-1.5**: The API client shall handle `retryable: true` errors with automatic retry after `retry_after_seconds`.

### FR-2: Batch Provisioning Module

**FR-2.1**: The system shall provide a `BatchProvisioningSection` component with session lifecycle management.

**FR-2.2**: The system shall connect to SSE endpoint `/api/v1/provisioning/batch/events` for real-time updates.

**FR-2.3**: The system shall display device state machine transitions with visual indicators.

**FR-2.4**: The system shall support "Provision All" and individual device provisioning.

**FR-2.5**: The system shall handle SSE reconnection with exponential backoff.

### FR-3: Allowlist Management Module

**FR-3.1**: The system shall provide CRUD operations for device allowlist entries.

**FR-3.2**: The system shall validate MAC address format (AA:BB:CC:DD:EE:FF) before submission.

**FR-3.3**: The system shall show allowlist usage status (used/available).

### FR-4: Session Recovery Module

**FR-4.1**: The system shall check for recoverable sessions on mount.

**FR-4.2**: The system shall display a notification banner for recoverable sessions.

**FR-4.3**: The system shall provide one-click session resume functionality.

### FR-5: WebSocket Monitoring Integration

**FR-5.1**: The system shall connect to `/ws/monitor` for real-time system health.

**FR-5.2**: The system shall fallback to polling on WebSocket failure.

**FR-5.3**: The system shall display connection status (connected/reconnecting/disconnected).

### FR-6: Error Handling Enhancement

**FR-6.1**: The system shall map error codes to user-friendly messages.

**FR-6.2**: The system shall display retry countdowns for retryable errors.

**FR-6.3**: The system shall expose correlation IDs in an expandable details section.

---

## Non-Functional Requirements

### NFR-1: Performance

- SSE connection shall not increase memory usage by more than 5MB over 1 hour
- WebSocket reconnection shall occur within 5 seconds
- Batch provisioning UI shall handle 50 devices without lag

### NFR-2: Reliability

- SSE/WebSocket shall auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- API key shall persist across browser refreshes
- Session recovery shall work after Pi restarts

### NFR-3: Security

- API key shall NOT be stored in localStorage (use sessionStorage or in-memory for production)
- Protected endpoints shall fail gracefully with clear auth error messages
- CORS shall work correctly for embedded dashboard serving

### NFR-4: Backward Compatibility

- Existing polling-based features shall continue to work
- Legacy endpoint responses shall remain functional
- Feature flags shall control new functionality rollout

---

## Key Entities (New)

All TypeScript type definitions and Zod schemas for this feature are documented in the authoritative data model:

**See**: [data-model.md](./data-model.md)

**Key types defined**:
- `V1SuccessResponse<T>`, `V1ErrorResponse`, `V1Response<T>` - Response envelopes
- `BatchProvisioningSession`, `SessionConfig`, `SessionState` - Session lifecycle
- `ProvisioningCandidate`, `CandidateState` - Device provisioning state machine
- `DeviceAllowlistEntry` - Security allowlist
- `SSEEventEnvelope<T>`, `SSEEventType` - Real-time event streaming
- `MonitoringData`, `WebSocketMessage` - System health monitoring
- `ErrorCode` - Typed error codes with retry guidance

---

## Success Criteria

| # | Criterion | Measurement |
|---|-----------|-------------|
| 1 | Batch provisioning completes for 5 devices | E2E test passes |
| 2 | SSE events render in < 100ms | Performance test |
| 3 | API key auth works for all protected endpoints | Contract test passes |
| 4 | Error codes map to user messages | Component test passes |
| 5 | WebSocket fallback to polling works | Integration test passes |
| 6 | Session recovery works after simulated restart | Manual test |
| 7 | No regression in existing features | Full test suite passes |

---

## Assumptions

1. PiOrchestrator is running v0.1.0+ with all V1 endpoints available
2. API key is provisioned out-of-band (environment variable on Pi)
3. Dashboard is served from same origin (no CORS issues)
4. Browser supports EventSource API (all modern browsers)
5. Playwright on NixOS is configured (Feature 004)

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Feature 002 (Integration) | Complete | Base integration done |
| Feature 004 (Testing) | Complete | Playwright available |
| Feature 005 (Hardening) | Complete | Contract tests exist |
| PiOrchestrator V1 API | Available | Documented in handoff |

---

## Out of Scope

1. API key rotation/management UI
2. Multi-user authentication
3. Role-based access control
4. Offline provisioning (requires connectivity)
5. Camera configuration beyond provisioning
6. MQTT broker management

---

## Implementation Phases

### Phase 1: Types & Contracts (Safe, No UI Change)
- Add V1 response envelope types
- Add batch provisioning entity types
- Add error code enum and message mappings
- Create Zod schemas for runtime validation
- Add contract tests for new schemas

### Phase 2: API Client Enhancement (Safe, Feature Flagged)
- Create V1 API client wrapper
- Add API key header injection
- Add correlation ID logging
- Add retryable error handling
- Feature flag to switch V1/legacy

### Phase 3: SSE & WebSocket Infrastructure (New Hooks)
- Create `useSSE` hook with reconnection
- Create `useWebSocket` hook for monitoring
- Add connection status state
- Fallback to polling for monitoring

### Phase 4: Batch Provisioning UI (New Feature)
- Create `BatchProvisioningSection` component
- Create `ProvisioningCandidateCard` component
- Create `SessionRecoveryBanner` component
- Wire to SSE hook and API client

### Phase 5: Allowlist Management UI (New Feature)
- Create `AllowlistSection` component
- Create `AllowlistEntryForm` component
- Wire to API client

### Phase 6: Integration & Polish
- Add loading/error/empty states
- Add accessibility labels
- Add E2E tests for golden flows
- Update existing tests if needed

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SSE connection instability | Medium | Medium | Exponential backoff + polling fallback |
| API key exposure | Low | High | Use sessionStorage, never log key |
| Type drift from backend | Medium | Medium | Zod validation + contract tests |
| Breaking existing features | Low | High | Feature flags + full test suite |
| Bundle size increase | Low | Low | Tree-shaking, lazy load new components |

---

## Appendix: Error Code Reference

| Code | HTTP | User Message | Retryable |
|------|------|--------------|-----------|
| `SESSION_NOT_FOUND` | 404 | "Session not found" | No |
| `SESSION_ALREADY_ACTIVE` | 409 | "Another session is active" | No |
| `DEVICE_NOT_FOUND` | 404 | "Device not found" | No |
| `DEVICE_NOT_IN_ALLOWLIST` | 403 | "Device not approved" | No |
| `TOTP_INVALID` | 401 | "Invalid auth code" | Yes |
| `RATE_LIMITED` | 429 | "Too many requests" | Yes |
| `DEVICE_UNREACHABLE` | 502 | "Cannot reach device" | Yes |
| `DEVICE_TIMEOUT` | 504 | "Device not responding" | Yes |
| `NETWORK_ERROR` | 503 | "Network unavailable" | Yes |
| `UNAUTHORIZED` | 401 | "Auth required" | No |
