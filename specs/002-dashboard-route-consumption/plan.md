# Implementation Plan: Dashboard Route Consumption (030)

**Feature**: 002-dashboard-route-consumption
**Created**: 2026-01-12
**Status**: Verification-Only (Implementation Complete)

---

## Overview

This plan documents the **verification and testing** approach for consuming PiOrchestrator's 029 route normalization. The PiDashboard codebase is already well-architected for same-origin API access - no new implementation is required.

---

## Implementation Status

### Pre-Existing Architecture (Complete)

| Component | File | Status |
|-----------|------|--------|
| API base URL | `src/infrastructure/api/routes.ts` | `API_BASE = '/api'` |
| V1 prefix | `src/infrastructure/api/v1-client.ts` | Adds `/v1` prefix |
| SSE endpoint | `src/infrastructure/api/routes.ts` | `getSSEEndpoint()` returns `/api/v1/provisioning/batch/events` |
| Auto-reconnect | `src/application/hooks/useSSE.ts` | Exponential backoff (1s-30s) |
| Connection state | `src/application/hooks/useSSE.ts` | Exposed via `connectionState` |
| No hardcoded ports | All of `src/` | Only `vite.config.ts` has 8082 for dev proxy |

### Remaining Work

1. **Verification Testing** - Manual and automated checks after PiOrchestrator 029 deployment
2. **Documentation Updates** - Remove references to dual-port architecture
3. **Optional**: Document `VITE_API_ORIGIN` override for advanced dev scenarios

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **State Management**: TanStack React Query + Zustand
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **API Client**: Custom fetch wrapper in `v1-client.ts`
- **SSE**: Native EventSource with custom reconnection logic

---

## Project Structure

```
src/
├── application/
│   └── hooks/
│       ├── useSSE.ts                      # Generic SSE with auto-reconnect
│       ├── useBatchProvisioningEvents.ts  # Provisioning-specific SSE
│       ├── useAllowlist.ts                # Allowlist CRUD operations
│       ├── useRecoverableSessions.ts      # Session recovery
│       └── useDevices.ts                  # Device management
├── infrastructure/
│   └── api/
│       ├── routes.ts                      # Centralized route definitions
│       ├── v1-client.ts                   # V1 API client with auth
│       └── errors.ts                      # Error code registry
├── lib/
│   └── normalize.ts                       # Defensive array/object handling
└── presentation/
    └── components/
        └── common/
            └── ErrorDisplay.tsx           # Error banner with retry UX
```

---

## Verification Approach

### Phase 1: Prerequisites Check

Verify PiOrchestrator 029 is deployed with V1 routes on port 8082.

### Phase 2: Foundational Tests

Run existing unit test suite to ensure no regressions.

### Phase 3: User Story Verification

Each user story is independently verifiable:

1. **US1 - Allowlist Management**: CRUD operations via `/api/v1/provisioning/allowlist`
2. **US2 - SSE Event Streaming**: Connect to `/api/v1/provisioning/batch/events`
3. **US3 - Batch Session Management**: Full session lifecycle via `/api/v1/provisioning/batch/*`
4. **US4 - Session Recovery**: Recoverable sessions via `/api/v1/provisioning/sessions/*`

### Phase 4: Documentation

Update docs to reflect single-port architecture.

---

## API Endpoints to Verify

All endpoints should return JSON (not HTML) on port 8082:

| Endpoint | Method | User Story |
|----------|--------|------------|
| `/health` | GET | Setup |
| `/api/v1/provisioning/allowlist` | GET | US1 |
| `/api/v1/provisioning/allowlist` | POST | US1 |
| `/api/v1/provisioning/allowlist/:mac` | DELETE | US1 |
| `/api/v1/provisioning/batch/events` | GET (SSE) | US2 |
| `/api/v1/provisioning/batch/start` | POST | US3 |
| `/api/v1/provisioning/batch/:id` | GET | US3 |
| `/api/v1/provisioning/batch/:id/devices` | GET | US3 |
| `/api/v1/provisioning/batch/:id/devices/:mac/provision` | POST | US3 |
| `/api/v1/provisioning/batch/:id/close` | POST | US3 |
| `/api/v1/provisioning/sessions/recoverable` | GET | US4 |
| `/api/v1/provisioning/sessions/:id/resume` | POST | US4 |

---

## Dependencies

- **External**: PiOrchestrator must deploy 029-route-normalization (commit `6edcfeb`)
- **Internal**: No new dependencies required

---

## Success Criteria

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| SC-001 | All `/api/v1/provisioning/*` calls return JSON | curl + Network tab |
| SC-002 | SSE connection establishes within 2s | Browser DevTools |
| SC-003 | SSE reconnects within 30s after disconnect | Network interruption test |
| SC-004 | Zero hardcoded ports in `src/` | grep verification |
| SC-005 | Existing integration tests pass | `npm test` |
| SC-006 | Dashboard works on port 8082 | Manual browser test |

---

## Notes

- This is a **verification-only** feature - no new code is required
- All tasks are verification and documentation focused
- The feature depends entirely on PiOrchestrator 029 being deployed
- Optional E2E tests may be added but are not blocking
