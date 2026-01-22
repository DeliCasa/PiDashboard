# Quickstart: Dashboard Recovery + ESP Visibility

**Feature**: 030-dashboard-recovery
**Date**: 2026-01-12

## Prerequisites

- Node.js 18+ with npm
- SSH access to Raspberry Pi (`ssh pi`)
- PiOrchestrator running on port 8082

## Quick Verification

### 1. Check API Connectivity

```bash
# From your machine (via SSH tunnel or Tailscale)
ssh pi "curl -s http://localhost:8082/api/devices" | jq .

# Expected output:
# {"count":0,"devices":[],"success":true}
```

### 2. Check Dashboard Serves

```bash
# Dashboard HTML should be served at root
curl -s https://raspberrypi.tail345cd5.ts.net/ | head -5

# Expected: <!doctype html>...
```

### 3. Run Smoke Test (after implementation)

```bash
./scripts/smoke_030_dashboard_recovery.sh

# Expected: All endpoints PASS
```

## Development Setup

### Local Development with SSH Tunnel

```bash
# Terminal 1: SSH tunnel to Pi
ssh -L 8082:localhost:8082 pi

# Terminal 2: Start dev server
npm run dev

# Open http://localhost:5173
```

### Verify API Proxy Works

```bash
# With dev server running, test proxy
curl http://localhost:5173/api/devices

# Should return JSON from Pi backend
```

## Testing Changes

### Unit Tests

```bash
npm test

# Run specific test file
npm test -- src/infrastructure/api/client.test.ts
```

### Integration Tests

```bash
npm test -- tests/integration/
```

### E2E Tests

```bash
npm run test:e2e
```

## Key Files to Modify

| File | Purpose |
|------|---------|
| `src/infrastructure/api/client.ts` | API client with error handling |
| `src/infrastructure/api/errors.ts` | Error classes and categorization |
| `src/presentation/components/common/ErrorDisplay.tsx` | Error UI component |
| `src/presentation/components/devices/DeviceList.tsx` | Device list with states |

## Implementation Checklist

### Phase 1: API Client Hardening

- [ ] Add `Accept: application/json` header to all requests
- [ ] Add HTML fallback detection (check content-type)
- [ ] Include endpoint path in error objects
- [ ] Extract `X-Request-Id` from response headers

### Phase 2: Error Display Enhancement

- [ ] Add endpoint path to ErrorDisplay
- [ ] Add "Copy debug info" button
- [ ] Add specific message for HTML fallback errors

### Phase 3: Device List States

- [ ] Add loading state with spinner
- [ ] Add empty state with "Scan for devices" CTA
- [ ] Add error state with retry button
- [ ] Ensure populated state shows device table

### Phase 4: Smoke Test

- [ ] Create `scripts/smoke_030_dashboard_recovery.sh`
- [ ] Test `/api/devices` returns JSON
- [ ] Test `/api/wifi/status` returns JSON
- [ ] Test `/api/system/info` returns JSON
- [ ] Test `/api/v1/provisioning/allowlist` returns JSON

## Verification Commands

### Check for Hardcoded Ports

```bash
# Should return only placeholder/example values
grep -r "8081\|8082" src/ --include="*.ts" --include="*.tsx"
```

### Check API Base URL

```bash
# Should show '/api' (relative)
grep "BASE_URL\|API_BASE" src/infrastructure/api/*.ts
```

### Check Error Handling

```bash
# Should show error classes with endpoint field
grep -A5 "class ApiError" src/infrastructure/api/client.ts
```

## Troubleshooting

### "Nothing works" symptoms

1. **Check browser console** - Look for JavaScript errors
2. **Check Network tab** - Look for failed requests, HTML responses
3. **Run smoke test** - Verify backend is responding correctly
4. **Check content-type** - Ensure responses are `application/json`

### Empty device list

1. **Verify with curl**: `ssh pi "curl -s http://localhost:8082/api/devices"`
2. **If count is 0**: No devices discovered (expected if no ESPs nearby)
3. **If curl fails**: Backend issue, check PiOrchestrator logs

### HTML fallback errors

1. **Check endpoint spelling** - Typos cause 404 → SPA fallback
2. **Check PiOrchestrator version** - Needs 029+ for V1 routes on 8082
3. **Check route registration** - `journalctl -u piorchestrator | grep registered`

## Success Criteria

After implementation:

1. ✅ Device list shows loading → empty/populated/error states clearly
2. ✅ All API errors show endpoint, status, and correlation ID
3. ✅ HTML fallback responses trigger specific error message
4. ✅ Smoke test passes with all JSON responses
5. ✅ No hardcoded ports in production code paths
