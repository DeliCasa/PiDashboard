# Research: Container Identity Model UI

**Feature**: 043-container-identity-ui
**Date**: 2026-02-04

## Research Summary

This feature has **substantial existing implementation** in the codebase. The research phase focused on verifying existing patterns and identifying gaps rather than technical discovery.

## Resolved Questions

### Q1: How should container IDs be displayed?

**Decision**: Container IDs are displayed in monospace, muted text below the prominent label.

**Rationale**: Existing `ContainerCard.tsx` already implements this pattern:
```tsx
<CardTitle className="text-base truncate">
  {hasLabel ? container.label : (
    <span className="text-muted-foreground italic">Unnamed Container</span>
  )}
</CardTitle>
<CardDescription className="font-mono text-xs truncate">
  {container.id}
</CardDescription>
```

**Alternatives Considered**:
- ID-first display (rejected: violates opaque identity requirement)
- ID hidden entirely (rejected: needed for debugging/support)

### Q2: What API patterns should be used for containers?

**Decision**: Use existing V1 API pattern with Zod validation.

**Rationale**: The project already has `v1-containers.ts` and `v1-containers-schemas.ts` following the same patterns as V1 Cameras API. This maintains consistency.

**Alternatives Considered**:
- Direct fetch without validation (rejected: violates Contract-First API principle)
- New API client pattern (rejected: unnecessary deviation from existing patterns)

### Q3: How should unassigned cameras be identified?

**Decision**: Derive from comparison of all cameras vs assigned cameras.

**Rationale**: Existing `useUnassignedCameras` hook implements this:
```tsx
const assignedDeviceIds = new Set<string>();
for (const container of containers) {
  for (const camera of container.cameras) {
    assignedDeviceIds.add(camera.device_id);
  }
}
const unassignedCameras = cameras.filter(
  (camera) => !assignedDeviceIds.has(camera.id)
);
```

**Alternatives Considered**:
- Backend returns unassigned flag (rejected: requires API change)
- Separate unassigned cameras endpoint (rejected: unnecessary complexity)

### Q4: What testing patterns should be used?

**Decision**: Follow existing testing patterns from cameras feature.

**Rationale**: The project has established patterns in:
- `tests/integration/contracts/` - Zod schema validation
- `tests/component/cameras/` - Component render tests
- `tests/mocks/` - Typed mock data with variants

**Evidence of Existing Patterns**:
```typescript
// From tests/mocks/camera-mocks.ts (pattern to follow)
export const mockCameraVariants = {
  online: { ...mockCameraDevice, status: 'online' },
  offline: { ...mockCameraDevice, status: 'offline' },
  // ... variants for each status
};
```

### Q5: Are there any "fridge-1" hardcoded references to remove?

**Decision**: Search codebase for semantic ID assumptions.

**Research Findings**:
- No "fridge-1" literals found in current container implementation
- Container types properly use opaque `id: string` type
- API client does not assume any ID format
- UI components display IDs as-is without parsing

**Search Commands Used**:
```bash
grep -r "fridge" src/          # No results
grep -r "fridge" tests/        # No results
```

## Technology Stack Verification

| Component | Version | Status |
|-----------|---------|--------|
| React | 19.2.0 | Verified |
| TanStack Query | 5.x | Verified |
| Zod | 3.x | Verified |
| shadcn/ui | latest | Verified |
| Vitest | 3.2.4 | Verified |
| MSW | 2.8.0 | Verified |

## Pattern References

### Existing Container Schema Pattern
Location: `src/infrastructure/api/v1-containers-schemas.ts`

The schema properly uses snake_case for Go compatibility:
```typescript
export const ContainerSchema = z.object({
  id: z.string().min(1),           // Opaque ID
  label: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  created_at: z.string(),           // RFC3339
  updated_at: z.string(),           // RFC3339
});
```

### Existing React Query Hook Pattern
Location: `src/application/hooks/useContainers.ts`

Follows established patterns:
```typescript
export function useContainers(enabled = true, pollingInterval = 30_000) {
  return useQuery({
    queryKey: queryKeys.containerList(),
    queryFn: v1ContainersApi.list,
    enabled,
    refetchInterval: pollingInterval,
    placeholderData: (previousData) => previousData,
  });
}
```

### Existing Component Pattern
Location: `src/presentation/components/containers/ContainerCard.tsx`

Label-first display pattern:
```typescript
const hasLabel = container.label && container.label.trim().length > 0;
// ...
<CardTitle className="text-base truncate">
  {hasLabel ? container.label : (
    <span className="text-muted-foreground italic">Unnamed Container</span>
  )}
</CardTitle>
```

## Open Items

None - all questions resolved via codebase analysis.

## Recommendations

1. **Proceed to test implementation** - Source code is complete
2. **Create mock fixtures first** - Required for all other tests
3. **Follow cameras test patterns** - Maintain consistency
4. **Document in admin guide** - Only missing documentation
