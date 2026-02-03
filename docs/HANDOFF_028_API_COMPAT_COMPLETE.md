---
handoff_id: "028-api-compat-complete"
direction: "incoming"
from_repo: "PiOrchestrator"
to_repo: "PiDashboard"
created_at: "2026-01-11T00:00:00Z"
status: "done"
related_prs: []
related_commits: []
requires: []
acceptance: []
verification: []
risks: []
notes: ""
---

# Handoff: PiOrchestrator API Compatibility Fix Complete

**From**: PiOrchestrator Team
**To**: PiDashboard Team
**Date**: 2026-01-11
**Feature**: 028-dashboard-api-compat
**Status**: ✅ **DEPLOYED AND VERIFIED**

---

## Summary

All API compatibility issues identified in `HANDOFF_PIORCH_DASHBOARD_INTEGRATION.md` have been resolved. The PiOrchestrator API now returns empty arrays `[]` instead of `null` for list endpoints, preventing JavaScript crashes in PiDashboard.

---

## What Was Fixed

### Null Array Issue (Critical)

**Problem**: Go's JSON marshaler converts `nil` slices to `null`, causing:
```javascript
// PiDashboard crash
entries.filter(...) // TypeError: entries.filter is not a function
```

**Solution**: Added nil-to-empty-slice guards in handlers:

| Endpoint | Field | Before | After |
|----------|-------|--------|-------|
| `GET /api/v1/provisioning/allowlist` | `entries` | `null` | `[]` |
| `GET /api/v1/provisioning/batch/:id/devices` | `devices` | `null` | `[]` |
| `GET /api/v1/provisioning/sessions/recoverable` | `sessions` | `[]` | `[]` (already fixed) |

---

## API Response Examples

### Allowlist (Empty)
```json
{
  "success": true,
  "data": {
    "entries": [],
    "count": 0
  },
  "correlation_id": "...",
  "timestamp": "2026-01-11T22:33:20Z"
}
```

### Devices (Empty Session)
```json
{
  "success": true,
  "data": {
    "devices": [],
    "count": 0
  },
  "correlation_id": "...",
  "timestamp": "..."
}
```

### SSE Connection
```
event:connection.established
data:{"version":"1.0","type":"connection.established","timestamp":"2026-01-11T21:45:29Z","payload":{"message":"Connected to batch provisioning events"}}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "retryable": false,
    "details": "Invalid MAC address format..."
  },
  "correlation_id": "...",
  "timestamp": "..."
}
```

---

## Verification Results

### Smoke Test: 16/16 PASSED

```
✓ [200] GET /health
✓ [200] GET /api/v1/provisioning/allowlist
✓ [200] GET /api/v1/provisioning/batch/network
✓ [200] GET /api/v1/provisioning/batch/events (SSE)
✓ [200] GET /api/v1/provisioning/sessions/recoverable
✓ [400] POST /api/v1/provisioning/allowlist (invalid MAC)
✓ [ARRAY] /api/v1/provisioning/allowlist - entries is []
✓ [ARRAY] /api/v1/provisioning/sessions/recoverable - sessions is []
... (all 16 tests passed)
```

### Unit Tests: 8/8 PASSED

- `TestNilSliceVsEmptySlice_JSONSerialization`
- `TestDevicesData_WithEmptySlice_SerializesToEmptyArray`
- `TestAllowlistData_WithEmptySlice_SerializesToEmptyArray`
- `TestNilCheckPattern_DevicesSlice`
- `TestNilCheckPattern_EntriesSlice`
- (and 3 more)

---

## What PiDashboard Should Do

### Immediate (No Changes Required)

The fix is backward-compatible. PiDashboard code that handles arrays should now work without crashes:

```typescript
// This now works (entries is [] not null)
const filtered = data.entries.filter(e => e.status === 'active');
```

### Recommended (Optional Hardening)

For extra safety, consider defensive checks:

```typescript
// Optional: fallback for any edge cases
const entries = data.entries ?? [];
const filtered = entries.filter(e => e.status === 'active');
```

---

## Endpoint Reference

All endpoints match the original contract. No path changes.

| Endpoint | Method | Status |
|----------|--------|--------|
| `/health` | GET | ✅ |
| `/api/v1/provisioning/allowlist` | GET | ✅ Fixed |
| `/api/v1/provisioning/allowlist` | POST | ✅ |
| `/api/v1/provisioning/allowlist/:mac` | DELETE | ✅ |
| `/api/v1/provisioning/batch` | POST | ✅ |
| `/api/v1/provisioning/batch/:id` | GET | ✅ |
| `/api/v1/provisioning/batch/:id/close` | POST | ✅ |
| `/api/v1/provisioning/batch/:id/devices` | GET | ✅ Fixed |
| `/api/v1/provisioning/batch/:id/devices/:mac/provision` | POST | ✅ |
| `/api/v1/provisioning/batch/:id/provision-all` | POST | ✅ |
| `/api/v1/provisioning/batch/events` | GET | ✅ SSE |
| `/api/v1/provisioning/batch/network` | GET | ✅ |
| `/api/v1/provisioning/sessions/recoverable` | GET | ✅ |
| `/api/v1/provisioning/sessions/:id/resume` | POST | ✅ |

---

## Deployment Details

- **Binary**: `/home/pi/Documents/Code/PiOrchestrator/bin/piorch-hex`
- **Build**: Native ARM64 (Go 1.24.1 on Pi)
- **Service**: `piorchestrator.service` (systemd)
- **Port**: 8081

### Verify Deployment

```bash
# SSH to Pi
ssh DelicasaPi

# Check service
sudo systemctl status piorchestrator

# Test allowlist returns []
curl -s http://localhost:8081/api/v1/provisioning/allowlist | jq '.data.entries'
# Expected: []
```

---

## Related Documents

- PiOrchestrator: `specs/028-dashboard-api-compat/tasks.md`
- PiOrchestrator: `docs/HANDOFF_CONSUMPTION_REPORT.md`
- Smoke Test: `scripts/smoke_routes.sh`

---

## Contact

If issues persist, check:
1. Service is running: `sudo systemctl status piorchestrator`
2. Correct binary deployed: `file /home/pi/Documents/Code/PiOrchestrator/bin/piorch-hex` (should show ARM aarch64)
3. Run smoke test: `bash scripts/smoke_routes.sh`
