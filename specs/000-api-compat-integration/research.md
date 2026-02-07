# Research: API Compatibility Integration (028)

**Feature**: 001-api-compat-integration
**Date**: 2026-01-11
**Status**: Complete

## Overview

This research document captures decisions made during the planning phase. Since the feature is largely already implemented, research focused on verification gaps and alignment confirmation.

---

## R1: Verification Test Coverage

### Question
What automated tests verify the 028 API compatibility integration end-to-end?

### Research Conducted
- Reviewed `tests/unit/lib/normalize.test.ts` (50+ test cases)
- Reviewed `tests/integration/hooks/useDevices.test.tsx`
- Reviewed `docs/INTEGRATION_028_SUMMARY.md` manual checklist
- Checked for E2E tests covering empty states and retry UX

### Decision
**Add targeted E2E verification for empty state rendering and retry countdown.**

### Rationale
- Unit tests cover normalization logic thoroughly
- Integration tests cover hook behavior with MSW mocks
- Manual checklist exists but isn't automated
- Gap: No automated E2E test for the specific 028 scenarios (empty lists, retry countdown)

### Alternatives Considered
1. **Rely on manual testing only** - Rejected; verification should be repeatable
2. **Add more unit tests** - Rejected; existing coverage is sufficient for logic
3. **Add E2E smoke test** - Selected; validates full stack including UI rendering

---

## R2: API Route Mapping

### Question
Are all 14 V1 provisioning endpoints correctly mapped in `routes.ts`?

### Research Conducted
Cross-referenced `src/infrastructure/api/routes.ts` against `docs/HANDOFF_028_API_COMPAT_COMPLETE.md`:

| Handoff Endpoint | routes.ts Mapping | Status |
|------------------|-------------------|--------|
| `/health` | `SYSTEM_ROUTES.health` | OK |
| `/api/v1/provisioning/allowlist` | `PROVISIONING_ROUTES.allowlistList` | OK |
| `/api/v1/provisioning/allowlist` POST | `PROVISIONING_ROUTES.allowlistList` | OK |
| `/api/v1/provisioning/allowlist/:mac` | `PROVISIONING_ROUTES.allowlistEntry(mac)` | OK |
| `/api/v1/provisioning/batch` POST | `PROVISIONING_ROUTES.batchStart` | OK |
| `/api/v1/provisioning/batch/:id` | `PROVISIONING_ROUTES.batchSession(id)` | OK |
| `/api/v1/provisioning/batch/:id/close` | `PROVISIONING_ROUTES.batchClose(id)` | OK |
| `/api/v1/provisioning/batch/:id/devices` | `PROVISIONING_ROUTES.batchDevices(id)` | OK |
| `/api/v1/provisioning/batch/:id/devices/:mac/provision` | `PROVISIONING_ROUTES.batchProvisionDevice(id, mac)` | OK |
| `/api/v1/provisioning/batch/:id/provision-all` | `PROVISIONING_ROUTES.batchProvisionAll(id)` | OK |
| `/api/v1/provisioning/batch/events` | `PROVISIONING_ROUTES.batchEvents` | OK |
| `/api/v1/provisioning/batch/network` | `PROVISIONING_ROUTES.batchNetwork` | OK |
| `/api/v1/provisioning/sessions/recoverable` | `PROVISIONING_ROUTES.sessionsRecoverable` | OK |
| `/api/v1/provisioning/sessions/:id/resume` | `PROVISIONING_ROUTES.sessionResume(id)` | OK |

### Decision
**Route mapping is complete.** All 14 endpoints from the handoff are correctly mapped.

### Rationale
- Every endpoint has a corresponding route constant or function
- V1 client automatically prepends `/v1` prefix
- `getSSEEndpoint()` helper correctly constructs SSE URL with optional session filter

### Alternatives Considered
None needed; mapping is complete.

---

## R3: Error Code Coverage

### Question
Does `errors.ts` cover all backend error codes from the 028 feature?

### Research Conducted
Compared `src/infrastructure/api/errors.ts` ERROR_MESSAGES registry against error codes documented in handoff and PiOrchestrator source:

| Error Code | User Message | Retryable | Covered |
|------------|--------------|-----------|---------|
| VALIDATION_FAILED | "Invalid input..." | No | Yes |
| SESSION_NOT_FOUND | "The provisioning session..." | No | Yes |
| DEVICE_NOT_FOUND | "The device was not found..." | No | Yes |
| DEVICE_NOT_IN_ALLOWLIST | "This device is not approved..." | No | Yes |
| RATE_LIMITED | "Too many requests..." | Yes | Yes |
| NETWORK_ERROR | "Network unavailable..." | Yes | Yes |
| CIRCUIT_OPEN | "Service temporarily unavailable..." | Yes | Yes |

### Decision
**Error handling is complete.** All documented error codes have user-friendly messages.

### Rationale
- ERROR_MESSAGES covers all documented codes
- V1ApiError class properly parses `retryable` and `retry_after_seconds`
- ErrorDisplay component renders countdown timer correctly
- `getErrorCategory()` properly categorizes errors for UI styling

### Alternatives Considered
None needed; error handling is comprehensive.

---

## R4: Empty State UI

### Question
Do all relevant components handle empty arrays without crashes?

### Research Conducted
Verified defensive patterns in hooks:

| Hook | Defensive Pattern | Location |
|------|-------------------|----------|
| `useDevices` | `ensureArray<Device>(response?.devices)` | Line 23 |
| `useAllowlist` | `Array.isArray(rawEntries) ? rawEntries : []` | Line 117 |
| `useRecoverableSessions` | `Array.isArray(rawSessions) ? rawSessions : []` | Line 113 |
| `useProvisioningHistory` | `ensureArray(response?.records)` | Line 86 |
| `useBatchProvisioningEvents` | `ensureArray()` for initial and updated devices | Multiple lines |

### Decision
**Empty state handling is complete.** All hooks use defensive normalization.

### Rationale
- Every hook that handles list data uses `ensureArray()` or equivalent
- Components receive guaranteed arrays, preventing `.filter()` / `.map()` crashes
- Pattern is consistent across codebase

### Alternatives Considered
None needed; pattern is consistently applied.

---

## Summary

All research questions resolved. The feature implementation is complete. Remaining work:

1. **Verification**: Run checklist against live PiOrchestrator
2. **Optional**: Add E2E smoke test for automated regression
3. **Optional**: Build API self-test developer tool
