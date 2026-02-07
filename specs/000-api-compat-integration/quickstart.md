# Quickstart: API Compatibility Integration Verification

**Feature**: 001-api-compat-integration
**Date**: 2026-01-11

## Overview

This guide walks through verifying the 028 API compatibility integration between PiDashboard and PiOrchestrator.

---

## Prerequisites

1. PiOrchestrator running with 028-dashboard-api-compat fixes
2. SSH access to Raspberry Pi (or local dev environment)
3. PiDashboard dev server running

---

## Quick Verification Steps

### 1. Start Development Environment

```bash
# Terminal 1: SSH tunnel to Pi (if remote)
ssh -L 8082:localhost:8082 pi

# Terminal 2: Start dashboard
npm run dev
```

Open http://localhost:5173 in browser.

### 2. Verify Empty States (P1 - Critical)

**Backend Setup** (clear all data):
```bash
# SSH to Pi
ssh pi

# Clear allowlist
curl -X DELETE http://localhost:8081/api/v1/provisioning/allowlist/all \
  -H "Content-Type: application/json" \
  -d '{"confirm":"CONFIRM"}'
```

**Dashboard Verification**:
- [ ] Open Devices tab → Shows "No devices found" (no crash)
- [ ] Open browser DevTools Console → No JavaScript errors
- [ ] Navigate between tabs → No `TypeError: x.filter is not a function`

### 3. Verify Error UX (P2)

**Trigger Validation Error**:
```bash
curl -X POST http://localhost:8081/api/v1/provisioning/allowlist \
  -H "Content-Type: application/json" \
  -d '{"mac":"invalid"}'
```

**Dashboard Verification**:
- [ ] Error banner displays user-friendly message
- [ ] Error code shown (VALIDATION_FAILED)
- [ ] Correlation ID displayed and copyable

**Trigger Retryable Error**:

Option A - Use MSW mock (recommended for testing):
```typescript
// In test file, add MSW handler that returns retryable error:
http.post('/api/v1/provisioning/allowlist', () => {
  return HttpResponse.json({
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      retryable: true,
      retry_after_seconds: 10
    },
    correlation_id: 'test-correlation-id',
    timestamp: new Date().toISOString()
  }, { status: 429 })
})
```

Option B - Rapid API calls (may trigger rate limiting on live backend):
```bash
# Run this loop rapidly to potentially trigger rate limiting
for i in {1..20}; do
  curl -X POST http://localhost:8082/api/v1/provisioning/allowlist \
    -H "Content-Type: application/json" \
    -d '{"mac":"AA:BB:CC:DD:EE:FF","description":"Test"}' &
done
```

Option C - Temporarily modify PiOrchestrator rate limits (if accessible)

**Dashboard Verification**:
- [ ] Countdown timer appears ("Retrying in N seconds...")
- [ ] "Retry Now" button works

### 4. Verify API Endpoints (P3)

**Run PiOrchestrator Smoke Test**:
```bash
ssh pi "cd ~/Documents/Code/PiOrchestrator && bash scripts/smoke_routes.sh"
```

Expected: `16/16 PASSED`

**Dashboard Network Tab Verification**:
- [ ] Open DevTools Network tab
- [ ] Navigate through all dashboard tabs
- [ ] No 404 errors on `/api/v1/*` endpoints

---

## Automated Verification

### Run Unit Tests

```bash
npm test
```

Verify `normalize.test.ts` passes (50+ tests).

### Run E2E Tests

```bash
npm run test:e2e
```

---

## Verification Checklist

Copy this checklist to track verification:

```markdown
## Empty State Testing
- [ ] Devices tab with 0 devices - shows empty state
- [ ] Allowlist section with 0 entries - shows empty state
- [ ] Session Recovery with 0 sessions - shows empty state
- [ ] No console errors in DevTools

## Error UX Testing
- [ ] Validation error shows user-friendly message
- [ ] Retryable error shows countdown timer
- [ ] Correlation ID copies to clipboard

## Endpoint Verification
- [ ] PiOrchestrator smoke test: 16/16 pass (all API endpoints)
- [ ] No 404s in Network tab during usage

## Unit Tests
- [ ] npm test passes
- [ ] normalize.test.ts: 50+ tests pass
```

---

## Troubleshooting

### 404 Errors on API Calls

1. Check Vite proxy config in `vite.config.ts`:
   ```typescript
   proxy: {
     "/api": {
       target: "http://localhost:8082",
       changeOrigin: true,
     },
   },
   ```

2. Verify PiOrchestrator is running on port 8082:
   ```bash
   ssh pi "ss -tlnp | grep 8082"
   ```

### TypeError on .filter() or .map()

1. Check hook is using `ensureArray()`:
   ```typescript
   const devices = ensureArray<Device>(response?.devices);
   ```

2. Verify API returns `[]` not `null`:
   ```bash
   curl http://localhost:8082/api/v1/provisioning/allowlist | jq '.data.entries'
   # Should show: []
   ```

### Error Display Not Showing

1. Check component imports `ErrorDisplay`:
   ```typescript
   import { ErrorDisplay } from '@/presentation/components/common/ErrorDisplay';
   ```

2. Pass error and onRetry callback:
   ```typescript
   <ErrorDisplay error={error} onRetry={refetch} />
   ```

---

## Success Criteria

Integration is verified when:

1. **SC-001**: All tabs render without JS errors on empty data
2. **SC-002**: Zero 404s from path mismatches
3. **SC-003**: Error messages display within 100ms
4. **SC-004**: Retry countdown matches `retry_after_seconds`
5. **SC-005**: All 14 endpoints correctly mapped
6. **SC-006**: Unit tests pass (50+ normalize tests)

---

## Next Steps

After verification passes:

1. Update spec status from "Draft" to "Verified"
2. Consider adding E2E test for regression protection
3. Optional: Build API self-test screen for field debugging
