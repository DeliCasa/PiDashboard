# Research: DEV Observability Panels

**Feature**: 038-dev-observability-panels
**Date**: 2026-01-25
**Status**: Complete

## Summary

Research phase resolved all technical unknowns for implementing DEV observability panels. Key findings include BridgeServer health endpoints, existing network status integration patterns, and evidence viewing via presigned URLs.

## Research Tasks

### 1. BridgeServer Health API

**Decision**: Use existing `/health` endpoint with Kubernetes-style checks

**Rationale**: BridgeServer already exposes comprehensive health endpoints following Kubernetes probe patterns. No new endpoints needed.

**Alternatives Considered**:
- Custom health endpoint: Rejected - adds maintenance burden
- Direct service probing: Rejected - BridgeServer already aggregates checks

**Endpoint Details**:

| Endpoint | Purpose | Response Time | Use Case |
|----------|---------|---------------|----------|
| `/health/live` | Liveness probe (process alive) | <50ms | Quick connectivity check |
| `/health/ready` | Readiness probe (DB, storage, migrations) | <500ms | Full health assessment |
| `/health` | Legacy combined endpoint | <500ms | Backward compatibility |
| `/ping` | Ultra-lightweight test | <10ms | Network connectivity only |
| `/health/storage` | MinIO/S3 connectivity | Variable | Storage health check |

**Response Schema**:
```json
{
  "status": "healthy" | "not_ready" | "unhealthy",
  "timestamp": "2026-01-25T15:30:00Z",
  "checks": {
    "database": { "status": "healthy" | "error", "message": "..." },
    "storage": { "status": "healthy" | "error", "message": "..." }
  }
}
```

**Source**: `BridgeServer/src/interfaces/http/health.routes.ts`

---

### 2. PiOrchestrator Health API

**Decision**: Use existing `/api/system/info` endpoint (already integrated)

**Rationale**: PiDashboard already has `useSystemStatus()` hook polling PiOrchestrator. Reuse existing pattern.

**Alternatives Considered**:
- Dedicated health endpoint: Rejected - system info provides more diagnostic value
- Direct SSH health check: Rejected - out of scope for browser-based dashboard

**Existing Integration**:
- Hook: `src/application/hooks/useSystemStatus.ts`
- API: `src/infrastructure/api/system.ts`
- Polling: 5s interval with visibility-aware pause

**Source**: `PiDashboard/src/application/hooks/useSystemStatus.ts`

---

### 3. MinIO Health Check

**Decision**: Proxy through BridgeServer `/health/storage` endpoint

**Rationale**: BridgeServer already checks MinIO connectivity. Direct MinIO access from browser is blocked by CORS and exposes infrastructure details.

**Alternatives Considered**:
- Direct MinIO health endpoint: Rejected - CORS issues, exposes internal URLs
- PiOrchestrator MinIO proxy: Rejected - unnecessary hop, BridgeServer already has connection

**Health Check Pattern**:
- BridgeServer's `/health/ready` includes storage check
- Separate `/health/storage` endpoint for detailed storage health
- Returns bucket accessibility status

**Source**: `BridgeServer/src/interfaces/http/health.routes.ts:329-961`

---

### 4. Session Management API

**Decision**: Use BridgeServer session endpoints (discovery needed)

**Rationale**: BridgeServer manages purchase/delivery sessions. Session data flows through BridgeServer, not PiOrchestrator.

**Endpoints Identified**:
- Session entity: `BridgeServer/src/domain/entities/purchase-session.entity.ts`
- Routes: `BridgeServer/src/interfaces/http/purchase-session.routes.ts`

**Session Entity Structure** (from BridgeServer):
```typescript
interface PurchaseSession {
  id: string;
  deliveryId?: string;
  startedAt: string; // ISO 8601
  status: 'active' | 'completed' | 'cancelled';
  captureCount: number;
  lastCaptureAt?: string; // ISO 8601
}
```

**API Pattern for DEV Dashboard**:
- `GET /api/v1/sessions` - List active sessions
- `GET /api/v1/sessions/:id` - Session details with evidence

**Note**: Exact endpoints require BridgeServer API documentation verification. May need handoff from BridgeServer team.

---

### 5. Evidence Viewing (Thumbnails)

**Decision**: Use BridgeServer presigned URL pattern via `/api/v1/images/presign`

**Rationale**: Evidence images are stored in MinIO with presigned URLs. BridgeServer generates time-limited URLs to prevent storageKey exposure.

**Alternatives Considered**:
- Direct MinIO URLs: Rejected - exposes storage keys, CORS issues
- PiOrchestrator image proxy: Rejected - unnecessary bandwidth through Pi
- Base64 inline images: Rejected - performance issues for multiple thumbnails

**Image Access Pattern**:

1. **Capture Endpoint**: `POST /api/v1/cameras/:cameraId/capture-and-store`
   ```json
   {
     "success": true,
     "data": {
       "id": "img-550e8400-e29b-41d4-a716-446655440000",
       "bucket": "delicasa-images",
       "key": "deliveries/del-12345/cameras/espcam-b0f7f1/2026-01-20T10-00-00-000Z.jpg",
       "url": "https://minio.../image.jpg?X-Amz-Algorithm=...",
       "capturedAt": "2026-01-20T10:00:00.000Z",
       "expiresAt": "2026-01-20T10:15:00.000Z"
     }
   }
   ```

2. **Presign Endpoint**: `GET /api/v1/images/presign?key=...&expiresIn=900`
   - Generates fresh presigned URL for expired images
   - Default expiry: 15 minutes
   - Max expiry: 1 hour

**Security**:
- No `storageKey` in client-visible URLs
- All image access through presigned URLs with expiration
- BridgeServer validates JWT before generating presigned URLs

**Source**: `BridgeServer/docs/handoffs/outgoing/HANDOFF-BRS-CLIENT-20260120-001.md`

---

### 6. Existing Dashboard Integration

**Decision**: Follow established patterns from `useBridgeServerStatus()` hook

**Rationale**: PiDashboard already has BridgeServer status checking. Extend this pattern for full diagnostics.

**Existing Code**:

```typescript
// src/infrastructure/api/network.ts
getBridgeServerStatus: async (): Promise<{
  connected: boolean;
  url?: string;
  latency_ms?: number;
  version?: string;
}> => {
  const response = await apiClient.get<BridgeApiResponse>('/dashboard/bridge/status');
  return {
    connected: response.status?.connected ?? false,
    url: response.status?.url,
  };
}

// src/application/hooks/useNetwork.ts
export function useBridgeServerStatus(enabled = true, pollingInterval = 10000) {
  return useQuery({
    queryKey: queryKeys.bridgeServer(),
    queryFn: networkApi.getBridgeServerStatus,
    enabled,
    refetchInterval: pollingInterval,
  });
}
```

**Pattern to Follow**:
- React Query hook with polling interval
- Graceful degradation on 404/503 (isFeatureUnavailable)
- Visibility-aware polling (pause when tab hidden)

**Source**: `PiDashboard/src/application/hooks/useNetwork.ts`

---

### 7. Polling Strategy

**Decision**: Use differentiated polling intervals based on data criticality

**Rationale**: Health checks need faster updates (5s) than session data (10s). Matches existing dashboard patterns.

| Data Type | Polling Interval | Rationale |
|-----------|------------------|-----------|
| Health status (all services) | 5s | Critical for <60s assessment goal |
| Active sessions | 10s | Matches camera list pattern |
| Evidence thumbnails | On-demand | Load when session expanded |
| Evidence preview (full) | On-demand | Load on user click |

**Error Handling**:
- Stop polling on 404/503 (service unavailable)
- Exponential backoff on repeated failures
- Visual indicator for stale data (>30s without update)

---

### 8. Authentication Pattern

**Decision**: Use existing PiOrchestrator proxy pattern (no direct BridgeServer auth from dashboard)

**Rationale**: PiDashboard connects to PiOrchestrator which proxies to BridgeServer. Dashboard doesn't need BridgeServer JWT directly.

**Data Flow**:
```
Browser (PiDashboard)
  ↓ HTTP (no auth needed - local network)
PiOrchestrator (8082)
  ↓ HTTP (service-to-service)
BridgeServer
  ↓ HTTPS (presigned URLs)
MinIO
```

**Note**: If BridgeServer requires direct dashboard access, consider:
- Cognito JWT tokens (already supported by BridgeServer)
- API key header pattern
- PiOrchestrator token relay

---

## Unresolved Items

### Requires BridgeServer Team Input

1. **Session List API**: Exact endpoint for listing active sessions
   - Assumption: `GET /api/v1/sessions?status=active`
   - Needs confirmation from BridgeServer team

2. **Session Evidence API**: Endpoint for session's captured evidence
   - Assumption: `GET /api/v1/sessions/:id/evidence`
   - Needs confirmation from BridgeServer team

### Implementation Decisions (Deferred to Tasks)

1. **Stale Capture Warning Threshold**: Spec says 5 minutes. Confirm this is appropriate for DEV use case.

2. **Thumbnail Size**: Need to determine optimal thumbnail dimensions for grid display (suggested: 200x150px).

3. **Error State Colors**: Confirm color scheme for health indicators (suggested: green/yellow/red following existing patterns).

---

## Architecture Decision Records

### ADR-001: Health Check Architecture

**Context**: Need to check health of three services (BridgeServer, PiOrchestrator, MinIO) from PiDashboard.

**Decision**: Aggregate health checks through existing API patterns:
- PiOrchestrator: Direct via `/api/system/info` (existing)
- BridgeServer: Via PiOrchestrator proxy to `/health/ready`
- MinIO: Via BridgeServer `/health/storage` (included in ready check)

**Consequences**:
- Single point of failure: If PiOrchestrator is down, can't check other services
- Acceptable for DEV use case where Pi availability is primary concern

### ADR-002: Evidence Thumbnail Loading

**Context**: Need to display evidence thumbnails without exposing storage keys.

**Decision**: Use BridgeServer presigned URL pattern:
1. Fetch session evidence list (includes presigned URLs)
2. Display thumbnails using presigned URLs
3. Refresh presigned URLs on expiration (15 min default)

**Consequences**:
- URLs expire and need refresh for long-running sessions
- No caching benefit (URLs change on refresh)
- Secure: No storageKey exposure in client

### ADR-003: Polling vs WebSocket

**Context**: Real-time updates for health status and session data.

**Decision**: Use polling (React Query refetchInterval):
- Health: 5s interval
- Sessions: 10s interval

**Rationale**:
- Simpler implementation
- Matches existing dashboard patterns
- DEV use case doesn't require sub-second updates
- WebSocket would add complexity (connection management, reconnection)

**Consequences**:
- Maximum 5s latency for health status changes
- Maximum 10s latency for session state changes
- Acceptable for DEV observability use case
