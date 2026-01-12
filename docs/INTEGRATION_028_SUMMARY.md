# Integration Summary: 028 API Compatibility

**Date**: 2026-01-11
**Feature**: 028-api-compat
**Status**: Verified (2026-01-11)

---

## Overview

This document summarizes the PiDashboard integration with PiOrchestrator's **028-dashboard-api-compat** feature. The backend changes ensure API responses always return empty arrays `[]` instead of `null` for list endpoints, preventing JavaScript crashes.

---

## Backend Contract (from PiOrchestrator)

### Base URL

- **Development**: `http://localhost:8082` (proxied via Vite)
- **Production**: Same origin as dashboard (served from PiOrchestrator binary)

### V1 API Prefix

All provisioning endpoints use the `/api/v1/` prefix.

### Response Envelope

All V1 API responses follow this envelope:

```json
{
  "success": true | false,
  "data": { ... },
  "correlation_id": "uuid",
  "timestamp": "ISO8601"
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "retryable": true | false,
    "retry_after_seconds": 5,
    "details": "Optional details"
  },
  "correlation_id": "uuid",
  "timestamp": "ISO8601"
}
```

### Fixed Endpoints (null → [])

| Endpoint | Field | Before | After |
|----------|-------|--------|-------|
| `GET /api/v1/provisioning/allowlist` | `entries` | `null` | `[]` |
| `GET /api/v1/provisioning/batch/:id/devices` | `devices` | `null` | `[]` |
| `GET /api/v1/provisioning/sessions/recoverable` | `sessions` | `[]` | `[]` |

### Complete Endpoint Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/provisioning/allowlist` | GET | List allowlist entries |
| `/api/v1/provisioning/allowlist` | POST | Add entry |
| `/api/v1/provisioning/allowlist/:mac` | DELETE | Remove entry |
| `/api/v1/provisioning/batch` | POST | Start session |
| `/api/v1/provisioning/batch/:id` | GET | Get session |
| `/api/v1/provisioning/batch/:id/stop` | POST | Stop/close session |
| `/api/v1/provisioning/batch/:id/devices` | GET | List devices |
| `/api/v1/provisioning/batch/:id/devices/:mac/provision` | POST | Provision device |
| `/api/v1/provisioning/batch/:id/provision-all` | POST | Provision all |
| `/api/v1/provisioning/batch/events` | GET | SSE event stream |
| `/api/v1/provisioning/batch/network` | GET | Network status |
| `/api/v1/provisioning/sessions/recoverable` | GET | Recoverable sessions |
| `/api/v1/provisioning/sessions/:id/resume` | POST | Resume session |

### SSE Event Format

```json
{
  "version": "1.0",
  "type": "device.discovered",
  "timestamp": "ISO8601",
  "session_id": "uuid",
  "payload": { ... }
}
```

---

## Frontend Implementation

### New Files

1. **`src/lib/normalize.ts`** - Defensive data normalization utilities
   - `ensureArray<T>()` - Guarantees value is an array
   - `ensureObject<T>()` - Guarantees value is an object or null
   - `extractList<T>()` - Extracts array from response with fallback field names
   - `normalizeListResponse()` - Normalizes list endpoints

2. **`src/infrastructure/api/routes.ts`** - Centralized API route definitions
   - `SYSTEM_ROUTES` - Health, system info
   - `WIFI_ROUTES` - WiFi management
   - `DEVICE_ROUTES` - BLE device management
   - `DASHBOARD_ROUTES` - Dashboard-specific endpoints
   - `PROVISIONING_ROUTES` - V1 provisioning endpoints
   - `getSSEEndpoint()` - SSE URL builder

### Updated Files

1. **`src/application/hooks/useDevices.ts`**
   - Added defensive `ensureArray()` in `useDevices()`
   - Added defensive `ensureArray()` in `useProvisioningHistory()`

2. **`src/application/hooks/useBatchProvisioningEvents.ts`**
   - Import centralized `getSSEEndpoint()` from routes
   - Added defensive `ensureArray()` for `initialDevices`
   - Added defensive `ensureArray()` in `updateDevices()`

### Existing Defensive Patterns

The following hooks already had defensive array handling:

- `useAllowlist.ts` (line 116-117): `Array.isArray(rawEntries) ? rawEntries : []`
- `useRecoverableSessions.ts` (line 112-113): `Array.isArray(rawSessions) ? rawSessions : []`
- `useSessionHistory.ts` (line 283-284): `Array.isArray(rawSessions) ? rawSessions : []`

### Error Handling

The `ErrorDisplay` component (`src/presentation/components/common/ErrorDisplay.tsx`) already supports:

- Retry countdown display when `retryAfterSeconds` is present
- Category-based styling (auth, session, device, network, validation, infrastructure)
- Correlation ID copy-to-clipboard for debugging

---

## Verification Checklist

### Local Development

1. **Start SSH tunnel** (if testing against real Pi):
   ```bash
   ssh -L 8082:localhost:8082 pi
   ```

2. **Start dev server**:
   ```bash
   npm run dev
   ```

3. **Verify endpoints**:
   - [ ] Open http://localhost:5173
   - [ ] Check DevTools Network tab for API calls
   - [ ] Verify no 404s on `/api/v1/provisioning/*` endpoints

### Empty State Testing

1. **Clear all data** on PiOrchestrator:
   ```bash
   # On Pi, clear allowlist
   curl -X DELETE http://localhost:8081/api/v1/provisioning/allowlist/all \
     -H "Content-Type: application/json" \
     -d '{"confirm":"CONFIRM"}'
   ```

2. **Verify empty states in UI**:
   - [ ] Devices tab shows "No devices found" (not crash)
   - [ ] Allowlist section shows "No devices in allowlist" (not crash)
   - [ ] Session recovery shows "No recoverable sessions" (not crash)

3. **Check console**:
   - [ ] No `TypeError: entries.filter is not a function`
   - [ ] No `TypeError: devices.map is not a function`
   - [ ] No `TypeError: sessions.length is not a function`

### Error Response Testing

1. **Trigger validation error**:
   ```bash
   curl -X POST http://localhost:8081/api/v1/provisioning/allowlist \
     -H "Content-Type: application/json" \
     -d '{"mac":"invalid"}'
   ```

2. **Verify in UI**:
   - [ ] Error banner shows user-friendly message
   - [ ] If retryable, countdown appears
   - [ ] Correlation ID is displayed and copyable

### SSE Testing

1. **Start a batch session** (via UI or API)
2. **Verify SSE connection**:
   - [ ] Connection established event received
   - [ ] Device discovered events update UI in real-time
   - [ ] Device state change events update UI in real-time

---

## Smoke Test Script

Run the PiOrchestrator smoke test to verify backend compatibility:

```bash
ssh pi "cd ~/Documents/Code/PiOrchestrator && bash scripts/smoke_routes.sh"
```

Expected output:
```
✓ [200] GET /health
✓ [200] GET /api/v1/provisioning/allowlist
✓ [ARRAY] /api/v1/provisioning/allowlist - entries is []
...
16/16 PASSED
```

---

## Rollback

If issues are discovered, the defensive normalization is backward-compatible. To remove:

1. Remove `ensureArray()` calls from hooks
2. Remove `src/lib/normalize.ts`
3. Remove `src/infrastructure/api/routes.ts` (or keep for documentation)

The frontend will then rely solely on the backend's 028 compatibility fixes.

---

## Related Documents

- **Source of truth**: `docs/HANDOFF_028_API_COMPAT_COMPLETE.md`
- **PiOrchestrator spec**: `specs/028-dashboard-api-compat/`
- **Smoke test**: PiOrchestrator `scripts/smoke_routes.sh`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-11 | Initial implementation of 028-api-compat integration |
| 2026-01-11 | Verification completed: 1047 unit tests pass, API endpoints verified via curl |
| 2026-01-12 | **030 Route Consumption Verified**: All V1 provisioning endpoints confirmed working on same-origin port 8082. SSE streaming verified. No hardcoded ports in src/. Dashboard serves from PiOrchestrator binary. |
