# Feature Specification: PiOrchestrator Diagnostics Integration

**Feature Branch**: `042-diagnostics-integration`
**Created**: 2026-02-03
**Status**: Blocked (awaiting PiOrchestrator endpoints)
**Depends On**: PiOrchestrator diagnostics API implementation (see HANDOFF_035_CAMERA_DIAGNOSTICS_API.md)

## Overview

Integrate PiOrchestrator's diagnostics API endpoints into PiDashboard UI once they become available. This feature stub tracks the pending work to consume backend APIs for camera diagnostics, session management, and evidence capture.

## Blocking Dependencies

This feature cannot proceed until PiOrchestrator implements the following endpoints:

| Endpoint | Status | Handoff Reference |
|----------|--------|-------------------|
| `GET /api/v1/cameras/:id/diagnostics` | Pending | HANDOFF_035_CAMERA_DIAGNOSTICS_API |
| `POST /api/v1/cameras/:id/evidence` | Pending | HANDOFF_035_CAMERA_DIAGNOSTICS_API |
| `GET /api/v1/sessions/:id` | Pending | HANDOFF_035_CAMERA_DIAGNOSTICS_API |

## Scope (Once Unblocked)

### In Scope

- Camera diagnostics panel displaying health metrics, firmware version, and network stats
- Evidence capture UI with preview and download
- Session detail view showing capture history and state
- Integration with existing camera list and detail views

### Out of Scope

- Backend API implementation (PiOrchestrator responsibility)
- New camera discovery or provisioning flows
- Real-time video streaming (separate feature)

## Acceptance Criteria (Draft)

1. Camera diagnostics panel loads and displays data from `/api/v1/cameras/:id/diagnostics`
2. Evidence capture button triggers POST and displays captured image
3. Session detail view shows session metadata and capture history
4. Graceful degradation when endpoints return 404/503 (consistent with Feature 037 patterns)

## Next Steps

1. Monitor PiOrchestrator for diagnostics API implementation
2. Once endpoints available, receive handoff and spec out detailed implementation
3. Follow existing patterns from Feature 034 (camera integration) and Feature 037 (API resilience)

## Related Documents

- [HANDOFF_035_CAMERA_DIAGNOSTICS_API.md](../../docs/HANDOFF_035_CAMERA_DIAGNOSTICS_API.md) - Outgoing request to PiOrchestrator
- [Feature 034: ESP Camera Integration](../034-esp-camera-integration/spec.md) - Existing camera patterns
- [Feature 037: API Resilience](../037-api-resilience/spec.md) - Error handling patterns
