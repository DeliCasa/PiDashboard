# API Contracts: Live Operations Viewer

**Feature**: 057-live-ops-viewer
**Date**: 2026-02-18

## Overview

This feature consumes **only existing endpoints** — no new API contracts are introduced. All endpoints below are already integrated with Zod-validated clients, React Query hooks, and MSW test handlers.

## Consumed Endpoints

### Sessions (BridgeServer via PiOrchestrator proxy)

| Method | Endpoint | Hook | Schema |
|--------|----------|------|--------|
| GET | `/dashboard/diagnostics/sessions` | `useSessions()` | `SessionListResponseSchema` |
| GET | `/dashboard/diagnostics/sessions/:id` | `useSession(id)` | `SessionDetailResponseSchema` |

**Query parameters**: `status` (active\|completed\|cancelled\|all), `limit` (number)

**Graceful degradation**: Returns `[]` on 404/503

---

### Evidence (BridgeServer via PiOrchestrator proxy)

| Method | Endpoint | Hook | Schema |
|--------|----------|------|--------|
| GET | `/dashboard/diagnostics/sessions/:sessionId/evidence` | `useSessionEvidence(sessionId)` | `EvidenceListResponseSchema` |
| GET | `/dashboard/diagnostics/images/presign` | `useRefreshPresignedUrl()` | `PresignResponseSchema` |

**Query parameters**: `limit` (default 50), `key` (image key), `expiresIn` (default 900s)

**Graceful degradation**: Returns `[]` on 404/503

---

### Camera Diagnostics (PiOrchestrator)

| Method | Endpoint | Hook | Schema |
|--------|----------|------|--------|
| GET | `/v1/cameras/:cameraId/diagnostics` | `useCameraDiagnostics(cameraId)` | `CameraDiagnosticsResponseSchema` |
| GET | `/dashboard/cameras/diagnostics` | `useCameraDiagnosticsList()` | `CameraDiagnosticsListSchema` |

**Fallback**: V1 endpoint first, then legacy list endpoint if V1 returns non-404/503 error

**Graceful degradation**: Returns `[]` on 404/503

---

### Inventory Delta (BridgeServer via PiOrchestrator proxy)

| Method | Endpoint | Hook | Schema |
|--------|----------|------|--------|
| GET | `/v1/sessions/:sessionId/inventory-delta` | `useSessionDelta(sessionId)` | `InventoryLatestResponseSchema` |
| GET | `/v1/containers/:containerId/inventory/runs` | `useInventoryRuns(containerId)` | `RunListResponseSchema` |

**Graceful degradation**: Returns `null` on 404 (`INVENTORY_NOT_FOUND`)

---

### Cameras (PiOrchestrator)

| Method | Endpoint | Hook | Schema |
|--------|----------|------|--------|
| GET | `/v1/espcam/paired` | `usePairedCameras()` | `PairedCamerasDataSchema` |

Used to resolve camera list for the health dashboard.

---

## Response Envelope (V1 endpoints)

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
    retry_after_seconds?: number;
  };
  timestamp?: string;
  request_id?: string;  // Correlation ID
}
```

## Error Handling

All endpoints use `isFeatureUnavailable()` for 404/503 detection:
- Sessions/Evidence: Return empty arrays, stop polling
- Camera diagnostics: Return empty arrays
- Inventory: Return null, stop polling

All errors displayed via `ErrorDisplay` component with retry buttons and correlation info.

## No New Endpoints Required

This feature is purely a frontend composition layer. All backend endpoints are already deployed and integrated.
