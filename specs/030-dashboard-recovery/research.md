# Research: Dashboard Recovery + ESP Visibility

**Feature**: 030-dashboard-recovery
**Date**: 2026-01-12
**Status**: Complete

## Executive Summary

After investigating the "ESPs not being shown" and "no feature is working" reports, I found that **the core API infrastructure is working correctly**. The issues are likely related to:

1. **Empty device list** - Backend returns `{"count":0,"devices":[]}` - no devices are registered
2. **Content-type validation gap** - Client doesn't detect HTML fallback early
3. **Missing endpoint info in errors** - ErrorDisplay shows code/message but not the failing endpoint

## Investigation Findings

### 1. API Infrastructure Status

| Component | Status | Evidence |
|-----------|--------|----------|
| API Base URL | ✅ Correct | `client.ts:8` uses `/api` (relative) |
| V1 Routes | ✅ Correct | `routes.ts` uses relative paths |
| Devices API | ✅ Working | `curl /api/devices` returns JSON |
| WiFi API | ✅ Working | `curl /api/wifi/status` returns JSON |
| System API | ✅ Working | `curl /api/system/info` returns JSON |
| V1 Provisioning | ✅ Working | `curl /api/v1/provisioning/allowlist` returns JSON |
| SSE Events | ✅ Working | `curl /api/v1/provisioning/batch/events` streams |

### 2. Backend Response Format

**`GET /api/devices`** response:
```json
{"count":0,"devices":[],"success":true}
```

**Expected by frontend** (`devices.ts:18`):
```typescript
apiClient.get<{ devices: Device[] }>('/devices')
```

**Analysis**: Response format matches. The `devices` array is present but empty.

### 3. Content-Type Handling

**Current behavior** (`client.ts:124-128`):
```typescript
const contentType = response.headers.get('content-type');
if (!contentType || !contentType.includes('application/json')) {
  return undefined as T;
}
```

**Issue**: If HTML is returned (SPA fallback), the client returns `undefined` silently instead of throwing an error with actionable information.

### 4. Error Display Capabilities

**ErrorDisplay.tsx** supports:
- ✅ Error code display
- ✅ Correlation ID with copy button
- ✅ Retry countdown
- ✅ Category-based styling
- ❌ Endpoint path (not captured by current error objects)
- ❌ HTML fallback detection

### 5. Code Audit for Hardcoded Values

**Search results**: `grep -r "8081\|8082\|192\.168\|100\." src/`
- `MQTTConfigForm.tsx` - placeholder text only
- `PingTool.tsx` - gateway example only
- **No actual API calls use hardcoded values** ✅

## Root Cause Analysis

### Why "ESPs not being shown"

**Most likely cause**: No devices are registered in the backend.
- API returns `{"count":0,"devices":[]}`
- Frontend correctly shows empty list
- User interprets empty list as "not working"

**Alternative causes** (to verify):
- BLE scanning not triggering device discovery
- Device discovery happening but not persisting
- UI showing loading state indefinitely

### Why "no feature is working"

**Possible causes**:
1. Silent failures from HTML fallback responses
2. Network errors not surfaced visibly
3. Loading states stuck without error indication
4. User expectation mismatch (features work but produce empty results)

## Decisions

### D1: Add HTML Fallback Detection

**Decision**: Enhance API client to detect HTML responses and throw a specific error.

**Rationale**: HTML fallback indicates a route registration issue on the backend. Users need a clear message: "API route hitting SPA fallback - endpoint may not be registered".

**Alternatives considered**:
- Silent ignore (current) - Rejected: leads to "nothing works" perception
- Generic error - Rejected: not actionable

### D2: Add Endpoint Path to Error Objects

**Decision**: Include the failing endpoint path in API errors and ErrorDisplay.

**Rationale**: When debugging "nothing works", knowing WHICH endpoint failed is critical.

**Implementation**: Enhance `ApiError` to include `endpoint` field, display in ErrorDisplay.

### D3: Add Global API Status Indicator

**Decision**: Add a connection status indicator that shows API health.

**Rationale**: Provides immediate feedback if API is unreachable, reducing "nothing works" reports.

**Alternatives considered**:
- Per-page status - Rejected: too scattered
- No indicator - Rejected: current state, causes confusion

### D4: Verify Device Discovery Pipeline

**Decision**: Add smoke test to verify BLE scan → device list pipeline.

**Rationale**: If devices exist but don't show, the issue is in discovery. Smoke test verifies the full path.

### D5: Distinct Empty vs Error States

**Decision**: Ensure all data-fetching components clearly distinguish:
- Loading (spinner)
- Empty (no data, CTA to scan/add)
- Error (message with retry)

**Rationale**: Empty state saying "No devices found - start a scan" is different from error state.

## Technical Approach

### Phase 1: API Client Hardening
1. Add content-type validation with specific HTML fallback error
2. Add `Accept: application/json` header to all requests
3. Include endpoint path in error objects
4. Add request ID tracking from response headers

### Phase 2: Error Display Enhancement
1. Add endpoint path display to ErrorDisplay
2. Add "Copy debug info" button (endpoint, status, correlation ID, timestamp)
3. Add HTML fallback specific error message

### Phase 3: Device List Pipeline
1. Verify useDevices hook handles all states correctly
2. Add loading/empty/error state distinction in DeviceList component
3. Add "Scan for devices" CTA in empty state

### Phase 4: Smoke Test
1. Create `scripts/smoke_030_dashboard_recovery.sh`
2. Test all critical endpoints for JSON response
3. Verify content-type and status codes

## Files to Modify

| File | Change |
|------|--------|
| `src/infrastructure/api/client.ts` | Add HTML detection, endpoint tracking, Accept header |
| `src/infrastructure/api/errors.ts` | Add HTMLFallbackError class |
| `src/presentation/components/common/ErrorDisplay.tsx` | Add endpoint display, copy debug info |
| `src/presentation/components/devices/DeviceList.tsx` | Add distinct empty/error states |
| `scripts/smoke_030_dashboard_recovery.sh` | New file - smoke test |

## Open Questions

1. **Are devices being discovered but not persisting?**
   - Requires checking PiOrchestrator logs during BLE scan
   - Out of scope for this fix (backend investigation)

2. **Is BLE scanning even being triggered?**
   - May require Web Bluetooth debugging
   - Can add debug logging to verify

## Conclusion

The API infrastructure is functioning correctly. The "nothing works" perception stems from:
1. Silent failures when HTML fallback occurs
2. Lack of actionable error information (missing endpoint)
3. Empty device list (possibly expected state)
4. No clear distinction between empty and error states

The fix focuses on **observability** - making failures visible and actionable - rather than assuming broken functionality.
