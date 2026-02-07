# Data Model: Dashboard Resilience & E2E Coverage

**Feature**: 045-dashboard-resilience-e2e
**Date**: 2026-02-06
**Status**: Reference (no new entities)

## Overview

This feature adds **no new data entities**. It enhances error handling in existing hooks and adds E2E test infrastructure. This document references the existing types that E2E mocks must conform to.

---

## Entities Affected by Graceful Degradation (FR-003)

### Container (existing)

**Location**: `src/domain/types/containers.ts`, `src/infrastructure/api/v1-containers-schemas.ts`

```typescript
interface ContainerDetail {
  id: string;              // Opaque string — any format
  label?: string;          // Human-readable name
  description?: string;
  created_at: string;      // RFC3339
  updated_at: string;      // RFC3339
  cameras: CameraAssignment[];
  camera_count: number;
  online_count: number;
}
```

**Hook affected**: `useContainers()` — needs `retry` + `refetchInterval` with `isFeatureUnavailable()`

### Camera (existing)

**Location**: `src/infrastructure/api/v1-cameras.ts`

```typescript
interface Camera {
  id: string;              // MAC address (e.g., "AA:BB:CC:DD:EE:FF")
  name: string;
  status: CameraStatus;    // 'online' | 'offline' | 'error' | etc.
  ip_address?: string;
  mac_address: string;
  health?: CameraHealth;
}
```

**Hook affected**: `useCameras()` — needs `retry` + `refetchInterval` with `isFeatureUnavailable()`

---

## E2E Mock Data Shapes (FR-001, FR-002)

### Container Mock (new in mock-routes.ts)

```typescript
// Must conform to V1 API response wrapper
{
  success: true,
  data: {
    containers: ContainerDetail[]
  },
  correlation_id: string,
  timestamp: string
}
```

**Required mock variants**:
- Empty list (0 containers)
- Mixed IDs: UUID + semantic string + numeric
- Container with assigned cameras
- Container without cameras (empty)

### Diagnostics Health Mock (new in mock-routes.ts)

```typescript
// BridgeServer health response
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  timestamp: string,
  checks: Record<string, { status: string; message: string }>
}
```

### Session Mock (new in mock-routes.ts)

```typescript
// Session list response
{
  success: true,
  data: {
    sessions: Session[]
  }
}
```

---

## State Transitions Added by This Feature

### Feature Unavailability State (new for Containers/Cameras tabs)

```
         query start
              │
              ▼
         ┌─────────┐
         │ Loading  │
         └─────┬────┘
               │
     ┌─────────┼──────────┬──────────────┐
     │         │          │              │
     ▼         ▼          ▼              ▼
  Success    Error    Empty Array   Feature Unavailable
  (data)   (5xx,net) ([] returned)  (404 or 503)
     │         │          │              │
     ▼         ▼          ▼              ▼
  Populated  Error UI   Empty UI    "Not available"
  + polling  + retry    + create     + polling stops
             button     prompt       + no retry
```

**New state**: "Feature Unavailable" — shown when `isFeatureUnavailable(error)` returns true.

---

## File Locations Summary

| Entity | Schema | Hook | Change Needed |
|--------|--------|------|---------------|
| Container | `v1-containers-schemas.ts` | `useContainers.ts` | Add retry/refetchInterval logic |
| Camera | `v1-cameras-schemas.ts` | `useCameras.ts` | Add retry/refetchInterval logic |
| Diagnostics | `diagnostics-schemas.ts` | `useHealthChecks.ts` | Already handled |
| Evidence | `diagnostics-schemas.ts` | `useEvidence.ts` | Already handled |
| Session | `diagnostics-schemas.ts` | `useSessions.ts` | Already handled |
