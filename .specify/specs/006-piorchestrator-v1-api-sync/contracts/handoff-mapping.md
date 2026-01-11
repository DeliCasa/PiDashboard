# Handoff-to-Backlog Mapping: PiOrchestrator V1 API Sync

> **Feature**: 006-piorchestrator-v1-api-sync  
> **Source**: `docs/HANDOFF_PIORCH_DASHBOARD_INTEGRATION.md`  
> **Created**: 2026-01-11

---

## Executive Summary

This document maps every requirement from the PiOrchestrator handoff document to specific PiDashboard implementation changes.

| Category | Requirements | Files Impacted | Test Strategy |
|----------|-------------|----------------|---------------|
| Breaking Changes | 4 | 8 | Contract + Integration |
| New Endpoints | 12 | 15 | Contract + E2E |
| Response Envelopes | 2 | 3 | Contract |
| Error Codes | 20 | 2 | Unit |
| Authentication | 3 | 4 | Integration |
| Real-time (SSE/WS) | 2 | 6 | Integration + E2E |
| Data Models | 6 | 4 | Contract |

---

## Mapping Table

| # | Handoff Item | Section | Dashboard Impact | Files | Priority | Risk | Test Plan |
|---|--------------|---------|------------------|-------|----------|------|-----------|
| H01 | API Key required for protected routes | 2, 6 | Add `X-API-Key` header injection | `client.ts`, `auth.ts` (new), `v1-client.ts` (new) | P0 | High | Integration: auth flow |
| H02 | New response envelope format | 4 | Unwrap V1 responses, extract `data` | `v1-client.ts` (new), `schemas.ts` | P0 | Medium | Contract: envelope parsing |
| H03 | SSE events have versioned envelope | 7.2 | Parse `version`, `type`, `payload` | `useSSE.ts` (new), `sse.ts` (new) | P1 | Medium | Integration: SSE parsing |
| H04 | Correlation IDs in responses | 4 | Log for debugging | `v1-client.ts` (new), `errors.ts` (new) | P2 | Low | Unit: logging |
| H05 | Batch provisioning start | 3.1 | New API service method | `batch-provisioning.ts` (new) | P0 | Medium | Contract + E2E |
| H06 | Batch provisioning get session | 3.1 | New API service method | `batch-provisioning.ts` (new) | P0 | Low | Contract |
| H07 | Batch provisioning stop | 3.1 | New API service method | `batch-provisioning.ts` (new) | P0 | Low | Contract |
| H08 | Batch provisioning provision-all | 3.1 | New API service method | `batch-provisioning.ts` (new) | P0 | Medium | E2E |
| H09 | Batch provisioning list devices | 3.1 | New API service method | `batch-provisioning.ts` (new) | P1 | Low | Contract |
| H10 | Batch provisioning single device | 3.1 | New API service method | `batch-provisioning.ts` (new) | P1 | Low | Contract |
| H11 | Batch provisioning retry device | 3.1 | New API service method | `batch-provisioning.ts` (new) | P1 | Low | Contract |
| H12 | Batch provisioning SSE events | 3.1 | New SSE hook | `useBatchProvisioningEvents.ts` (new) | P0 | High | Integration + E2E |
| H13 | Batch provisioning network status | 3.1 | New API service method | `batch-provisioning.ts` (new) | P2 | Low | Contract |
| H14 | Allowlist list | 3.2 | New API service | `allowlist.ts` (new) | P1 | Low | Contract |
| H15 | Allowlist add | 3.2 | New API service | `allowlist.ts` (new) | P1 | Low | Contract |
| H16 | Allowlist remove | 3.2 | New API service | `allowlist.ts` (new) | P1 | Low | Contract |
| H17 | Recoverable sessions list | 3.3 | New API service | `session-recovery.ts` (new) | P1 | Low | Contract |
| H18 | Session resume | 3.3 | New API service | `session-recovery.ts` (new) | P1 | Medium | E2E |
| H19 | Error code registry | 5 | Error message mapping | `errors.ts` (new) | P0 | Low | Unit |
| H20 | Retryable error handling | 5 | Auto-retry with delay | `v1-client.ts` (new) | P1 | Medium | Integration |
| H21 | WebSocket monitoring | 7.1 | New WebSocket hook | `useWebSocket.ts` (new), `useSystemMonitor.ts` (new) | P2 | Medium | Integration |
| H22 | MonitoringData type | 7.1 | New TypeScript type | `websocket.ts` (new) | P2 | Low | Type-only |
| H23 | BatchProvisioningSession type | 9.1 | New TypeScript type | `provisioning.ts` (new) | P0 | Low | Type-only |
| H24 | ProvisioningCandidate type | 9.1 | New TypeScript type | `provisioning.ts` (new) | P0 | Low | Type-only |
| H25 | DeviceAllowlistEntry type | 9.1 | New TypeScript type | `provisioning.ts` (new) | P1 | Low | Type-only |
| H26 | Polling intervals guidance | 8.2 | Validate existing intervals | Existing hooks | P2 | Low | Manual review |
| H27 | Caching guidance | 8.5 | Verify React Query settings | `queryClient.ts` | P2 | Low | Manual review |
| H28 | Auth bypass in dev mode | 6 | Check env var | `auth.ts` (new) | P1 | Low | Unit |

---

## File Impact Summary

### New Files Required

| File Path | Purpose | Tasks |
|-----------|---------|-------|
| `src/domain/types/v1-api.ts` | V1 response envelope types | T001 |
| `src/domain/types/provisioning.ts` | Provisioning entity types | T002 |
| `src/domain/types/websocket.ts` | WebSocket monitoring types | T003 |
| `src/domain/types/sse.ts` | SSE event types | T004 |
| `src/infrastructure/api/errors.ts` | Error code registry | T009 |
| `src/infrastructure/api/auth.ts` | API key management | T010 |
| `src/infrastructure/api/v1-client.ts` | V1 API client wrapper | T011 |
| `src/infrastructure/api/batch-provisioning.ts` | Batch provisioning API | T013 |
| `src/infrastructure/api/allowlist.ts` | Allowlist API | T014 |
| `src/infrastructure/api/session-recovery.ts` | Session recovery API | T015 |
| `src/application/stores/features.ts` | Feature flags store | T012 |
| `src/application/hooks/useSSE.ts` | Generic SSE hook | T018 |
| `src/application/hooks/useBatchProvisioningEvents.ts` | Provisioning SSE hook | T019 |
| `src/application/hooks/useWebSocket.ts` | Generic WebSocket hook | T020 |
| `src/application/hooks/useSystemMonitor.ts` | Monitoring hook | T021 |
| `src/application/hooks/useRecoverableSessions.ts` | Recovery hook | T031 |
| `src/application/hooks/useAllowlist.ts` | Allowlist hook | T038 |
| `src/presentation/components/common/ConnectionStatus.tsx` | Connection indicator | T022 |
| `src/presentation/components/common/ErrorDisplay.tsx` | Error display | T040 |
| `src/presentation/components/provisioning/BatchProvisioningSection.tsx` | Main provisioning UI | T026 |
| `src/presentation/components/provisioning/StartSessionForm.tsx` | Session start form | T027 |
| `src/presentation/components/provisioning/SessionProgress.tsx` | Progress display | T028 |
| `src/presentation/components/provisioning/ProvisioningCandidateCard.tsx` | Device card | T029 |
| `src/presentation/components/provisioning/SessionRecoveryBanner.tsx` | Recovery banner | T030 |
| `src/presentation/components/allowlist/AllowlistSection.tsx` | Allowlist UI | T035 |
| `src/presentation/components/allowlist/AllowlistEntryForm.tsx` | Add entry form | T036 |
| `src/presentation/components/allowlist/AllowlistEntryCard.tsx` | Entry card | T037 |

### Modified Files

| File Path | Change Description | Tasks |
|-----------|-------------------|-------|
| `src/infrastructure/api/schemas.ts` | Add V1 + provisioning schemas | T005, T006 |
| `src/App.tsx` | Add Provisioning tab | T032 |
| `tests/integration/mocks/handlers.ts` | Add V1 endpoint handlers | T016 |

---

## Test Coverage Matrix

| Handoff Item | Unit | Component | Integration | Contract | E2E |
|--------------|------|-----------|-------------|----------|-----|
| H01 API Key | x | | x | | |
| H02 Envelope | x | | | x | |
| H03 SSE Envelope | | | x | x | |
| H04 Correlation ID | x | | | | |
| H05-H13 Batch API | | | x | x | x |
| H14-H16 Allowlist | | | x | x | |
| H17-H18 Recovery | | | x | x | x |
| H19 Error Codes | x | | | | |
| H20 Retry Logic | | | x | | |
| H21 WebSocket | | | x | | |
| H23-H25 Types | | | | x | |

---

## Priority Breakdown

### P0 - Critical (Must Have for MVP)

| # | Item | Rationale |
|---|------|-----------|
| H01 | API Key auth | Required for all protected endpoints |
| H02 | Response envelope | Foundation for all V1 API calls |
| H05 | Start session | Core batch provisioning |
| H06-H08 | Session management | Complete batch workflow |
| H12 | SSE events | Real-time device updates |
| H19 | Error codes | User-friendly error messages |
| H23-H24 | Core types | Type safety for provisioning |

### P1 - Important (Should Have)

| # | Item | Rationale |
|---|------|-----------|
| H03 | SSE envelope | Parse versioned events correctly |
| H09-H11 | Device operations | Individual device control |
| H14-H16 | Allowlist | Security feature |
| H17-H18 | Session recovery | Resilience |
| H20 | Retry logic | Better UX for transient errors |
| H25 | Allowlist type | Type safety |
| H28 | Dev mode bypass | Developer experience |

### P2 - Nice to Have (Could Have)

| # | Item | Rationale |
|---|------|-----------|
| H04 | Correlation ID logging | Debugging aid |
| H13 | Network status | Informational |
| H21-H22 | WebSocket monitoring | Enhancement over polling |
| H26-H27 | Polling/caching guidance | Optimization |

---

## Risk Assessment by Item

### High Risk

| # | Item | Risk | Mitigation |
|---|------|------|------------|
| H01 | API Key auth | Key exposure | sessionStorage, never log |
| H12 | SSE events | Connection stability | Exponential backoff, polling fallback |

### Medium Risk

| # | Item | Risk | Mitigation |
|---|------|------|------------|
| H02 | Envelope parsing | Type drift | Zod validation + contract tests |
| H03 | SSE envelope | Version mismatch | Version check, graceful fallback |
| H08 | Provision-all | Partial failure | Per-device error handling |
| H18 | Session resume | Stale state | Validate session before resume |
| H20 | Retry logic | Infinite loops | Max retry limit |
| H21 | WebSocket | Connection drops | Polling fallback |

### Low Risk

| # | Item | Risk | Mitigation |
|---|------|------|------------|
| H04-H07, H09-H11, H13-H17, H19, H22-H28 | Various | Minimal | Standard testing |

---

## Open Questions

### Q1: API Key Rotation

**Question**: How should the dashboard handle API key rotation?

**Current Decision**: Out of scope. API key is baked in at build time or set via sessionStorage. Rotation requires redeployment.

**Assumption**: Single API key per deployment is acceptable.

### Q2: SSE vs Polling for Logs

**Question**: Should logs use SSE (`/api/v1/system/logs/stream`) or continue polling?

**Current Decision**: Keep polling for now. Logs are not in the critical path for batch provisioning. Can migrate to SSE in a future iteration.

**Assumption**: 3-second polling is acceptable for log viewing.

### Q3: WebSocket Priority

**Question**: Is WebSocket monitoring higher priority than batch provisioning?

**Current Decision**: No. Batch provisioning is the primary business driver. WebSocket is a P2 enhancement.

**Assumption**: Polling-based system monitoring is sufficient for MVP.

---

## Backward Compatibility

All changes are additive. Existing functionality is preserved:

| Feature | Current State | After Integration |
|---------|---------------|-------------------|
| System Status | Polling `/api/system/info` | Unchanged (optional WS upgrade) |
| WiFi Management | `/api/wifi/*` | Unchanged |
| Door Control | `/api/door/*` | Unchanged (now requires API key) |
| Config | `/api/dashboard/config` | Unchanged (write requires API key) |
| Logs | Polling `/dashboard/logs` | Unchanged |
| Cameras | `/api/cameras/*` | Unchanged |
| Devices (BLE) | `/api/devices/*` | Unchanged |

New features are behind feature flags:
- `VITE_USE_V1_API` - Enable V1 client
- `VITE_BATCH_PROVISIONING` - Show provisioning tab
- `VITE_WS_MONITOR` - Use WebSocket for monitoring
