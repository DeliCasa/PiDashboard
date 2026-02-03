# Research: PiOrchestrator Diagnostics Integration

**Feature**: 042-diagnostics-integration
**Date**: 2026-02-03
**Status**: Complete

## Executive Summary

This feature integrates PiOrchestrator's camera-specific diagnostics API with PiDashboard UI. Research reveals that Feature 038 (DEV Observability Panels) already established infrastructure for diagnostics, sessions, and evidence - but for BridgeServer services. Feature 042 extends this pattern to camera-specific diagnostics from PiOrchestrator.

## Key Decisions

### 1. API Endpoint Strategy

**Decision**: Use `/api/v1/cameras/:id/diagnostics` pattern with fallback to legacy `/api/dashboard/cameras/diagnostics`.

**Rationale**:
- Aligns with V1 API migration strategy from Feature 034
- Fallback ensures compatibility if PiOrchestrator hasn't implemented V1 yet
- Consistent with existing `v1CamerasApi` patterns

**Alternatives Rejected**:
- Single legacy endpoint only: Would miss V1 API benefits (stricter typing, versioning)
- Direct BridgeServer calls: Violates architecture (PiOrchestrator is the intermediary)

### 2. Schema Reuse vs. New Schemas

**Decision**: Create dedicated camera diagnostics schemas separate from Feature 038 service health schemas.

**Rationale**:
- Feature 038 schemas (`ServiceHealthSchema`, `SessionSchema`) are for BridgeServer health/sessions
- Camera diagnostics have different entity structure (per-camera metrics, firmware, RSSI)
- Separation maintains clear ownership and avoids schema confusion

**Alternatives Rejected**:
- Extend Feature 038 schemas: Would conflate service health with camera diagnostics
- Single unified diagnostics schema: Too complex, violates single-responsibility

### 3. Existing Work Assessment

**Decision**: Feature 038 infrastructure can be partially reused; camera-specific types need new files.

**Findings from uncommitted work**:
| File | Status | Reuse |
|------|--------|-------|
| `src/infrastructure/api/diagnostics-schemas.ts` | Feature 038 | Keep for service health |
| `src/domain/types/diagnostics.ts` | Feature 038 | Keep for service health |
| `src/application/hooks/useDiagnostics.ts` | Feature 038 | Keep, add camera hooks separately |

**Action**: Feature 042 adds camera-specific diagnostics alongside Feature 038's service diagnostics.

### 4. Blocking Dependencies

**Decision**: Feature can proceed with mock endpoints; real data waits for PiOrchestrator implementation.

**Current State** (from HANDOFF_035):
- `GET /api/v1/cameras/:id/diagnostics` - **NOT IMPLEMENTED** in PiOrchestrator
- `POST /api/v1/cameras/:id/evidence` - **NOT IMPLEMENTED** in PiOrchestrator
- `GET /api/v1/sessions/:id` - **NOT IMPLEMENTED** in PiOrchestrator

**Mitigation**:
1. Build UI with MSW mocks matching proposed schema
2. Contract tests validate mock data
3. When PiOrchestrator implements, only need to remove mocks

**Risk**: If PiOrchestrator schema differs, will need schema migration.

## Technology Research

### React Query Patterns for Diagnostics

**Best Practice**: Use `staleTime` and `refetchInterval` for polling diagnostics.

```typescript
// Polling every 10 seconds for camera diagnostics
useQuery({
  queryKey: ['cameras', cameraId, 'diagnostics'],
  queryFn: () => diagnosticsApi.getCameraDiagnostics(cameraId),
  staleTime: 5_000,      // Consider fresh for 5s
  refetchInterval: 10_000, // Poll every 10s
  enabled: isVisible,     // Pause when tab hidden
});
```

**Reference**: Feature 034 `useCameras.ts` uses similar pattern.

### Graceful Degradation (Feature 037 Patterns)

**Best Practice**: Silent 404/503 handling for optional diagnostic features.

```typescript
// From Feature 037 - isFeatureUnavailable helper
export function isFeatureUnavailable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 404 || error.status === 503;
  }
  return false;
}

// Usage in component
if (isFeatureUnavailable(error)) {
  return <DiagnosticsUnavailable />;
}
```

### Camera Diagnostics Schema Design

**Proposed Schema** (based on HANDOFF_035 requirements):

```typescript
// Camera-specific diagnostics extending base camera data
export const CameraDiagnosticsSchema = z.object({
  camera_id: z.string(),
  name: z.string(),
  status: CameraStatusSchema,
  last_seen: z.string(),

  // Health metrics (from camera)
  health: z.object({
    heap: z.number(),
    wifi_rssi: z.number(),
    uptime: z.number(),
  }).optional(),

  // Extended diagnostics
  diagnostics: z.object({
    connection_quality: z.enum(['excellent', 'good', 'fair', 'poor']),
    error_count: z.number(),
    last_error: z.string().optional(),
    last_error_time: z.string().optional(),
    firmware_version: z.string().optional(),
    resolution: z.string().optional(),
    frame_rate: z.number().optional(),
    avg_capture_time_ms: z.number().optional(),
  }).optional(),
});
```

## Questions Resolved

| Question | Resolution |
|----------|------------|
| Reuse Feature 038 schemas? | No - camera diagnostics are distinct from service health |
| How to handle missing endpoints? | MSW mocks + graceful degradation |
| Polling interval? | 10s (consistent with Feature 034 camera list) |
| Tab visibility handling? | Pause polling when hidden (Feature 034 pattern) |

## Next Steps

1. **Phase 1**: Create data-model.md with camera diagnostics entities
2. **Phase 1**: Define OpenAPI contract in `contracts/` directory
3. **Phase 1**: Create quickstart.md for local development with mocks
4. **Post-Phase 1**: Run agent context update script
