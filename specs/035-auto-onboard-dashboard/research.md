# Phase 0 Research: Auto-Onboard ESP-CAM Dashboard Integration

**Feature**: 035-auto-onboard-dashboard
**Date**: 2026-01-22
**Status**: Complete

## Executive Summary

This research document captures all findings from Phase 0 exploration for integrating the PiOrchestrator Auto-Onboard API into the PiDashboard. All unknowns have been resolved through codebase analysis and API contract review.

## Research Questions & Resolutions

### Q1: What existing patterns should we follow for API client implementation?

**Resolution**: Follow the `v1-cameras.ts` pattern exactly.

**Patterns discovered**:
1. **Zod Schema Validation**: All API responses must be validated through Zod schemas (`v1-cameras-schemas.ts:1-138`)
2. **Separate Schema File**: Create `v1-auto-onboard-schemas.ts` with schema definitions
3. **Separate API Client File**: Create `v1-auto-onboard.ts` with typed methods
4. **Error Handling**: Use `V1ApiError` class from `errors.ts` with code-based categorization
5. **HTML Fallback**: Handle SPA fallback when API returns HTML (check content-type)

**Key patterns from v1-cameras.ts**:
```typescript
// Schema validation after fetch
const parsed = CameraListResponseSchema.safeParse(response);
if (!parsed.success) {
  console.warn('[V1 Cameras] validation failed:', parsed.error.issues);
  return response; // Return raw for resilience
}
return parsed.data;

// Error parsing
function parseErrorResponse(error: unknown): V1ApiError {
  // Try Zod parse of error body
  // Fall back to generic error
}
```

### Q2: How should we implement visibility-aware polling?

**Resolution**: Use `useVisibilityAwareInterval` hook from `useDocumentVisibility.ts`.

**Implementation pattern** (from `useCameras.ts:27-41`):
```typescript
export function useAutoOnboard(enabled = true, pollingInterval = AUTO_ONBOARD_POLLING_INTERVAL) {
  const refetchInterval = useVisibilityAwareInterval({
    interval: pollingInterval,
    enabled,
  });

  return useQuery({
    queryKey: queryKeys.autoOnboardStatus(),
    queryFn: autoOnboardApi.getStatus,
    enabled,
    refetchInterval,
    placeholderData: (previousData) => previousData,
  });
}
```

**Polling interval**: Spec suggests 10-30 seconds. Use 15 seconds for auto-onboard (less frequent than cameras since it's DEV mode only).

### Q3: What query keys should we register?

**Resolution**: Add to `queryClient.ts` following existing pattern.

**New keys needed**:
```typescript
// Auto-Onboard
autoOnboard: ['auto-onboard'] as const,
autoOnboardStatus: () => [...queryKeys.autoOnboard, 'status'] as const,
autoOnboardEvents: (filters?: { mac?: string; since?: string }) =>
  [...queryKeys.autoOnboard, 'events', filters] as const,
autoOnboardEventsByMac: (mac: string) =>
  [...queryKeys.autoOnboard, 'events', mac] as const,
```

### Q4: What error codes need to be added to the error registry?

**Resolution**: Add auto-onboard specific error codes to `errors.ts`.

**From handoff document, new error codes**:
- `ONBOARD_ENABLE_FAILED`: "auto-onboard mode must be 'dev' to enable"
- `ONBOARD_DISABLE_FAILED`: "Failed to disable auto-onboard"
- `ONBOARD_NOT_AVAILABLE`: "Auto-onboard is not configured on this Pi"

**Category**: Add new `'onboard'` category to `ErrorCategory` type.

### Q5: How should the UI component integrate with CameraSection?

**Resolution**: Add `AutoOnboardPanel` as a sibling to the camera grid within `CameraSection`.

**Component hierarchy** (from spec):
```
CameraSection
├── AutoOnboardPanel (new) - only visible when mode is "dev" or "off"
│   ├── DevModeWarningBanner
│   ├── StatusCard (enabled/running state + toggle)
│   ├── MetricsCard (success/failure counts)
│   ├── ConfigCard (collapsible, read-only)
│   └── AuditEventsPanel (collapsible)
│       ├── EventFilters (MAC, time range)
│       ├── EventList (paginated)
│       └── EventDetail (expandable rows)
└── CameraGrid (existing)
```

**Placement**: Position above the camera grid as an accordion/collapsible section.

### Q6: What UI components from shadcn/ui are needed?

**Resolution**: All required components are already installed.

**Components to use**:
- `Switch` - Toggle with `role="switch"` for enable/disable (FR-007, NFR-005)
- `Card` - Container for status, metrics, config panels
- `Badge` - Status indicators (online/offline, dev mode)
- `Alert` - DEV MODE warning banner (FR-004)
- `Collapsible` - Expandable config and events panels
- `Dialog` - Confirmation dialogs if needed
- `Table` - Audit events list
- `Input` - MAC address filter
- `Button` - Actions (reset metrics, cleanup)

### Q7: What accessibility requirements must be met?

**Resolution**: Follow existing patterns from camera components.

**Requirements** (from NFR-004, NFR-005):
1. Toggle switch MUST use `role="switch"` and proper `aria-checked`
2. All interactive elements MUST be keyboard accessible
3. Warning banner MUST have `role="alert"` for screen readers
4. Status changes should announce via `aria-live` regions

**Pattern from shadcn/ui Switch**:
```tsx
<Switch
  checked={enabled}
  onCheckedChange={handleToggle}
  aria-label="Enable Auto-Onboard"
  disabled={isPending || mode !== 'dev'}
/>
```

### Q8: How should pagination work for audit events?

**Resolution**: Use React Query's `keepPreviousData` pattern with offset-based pagination.

**From handoff API**:
- Default limit: 50
- Max limit: 100
- Parameters: `limit`, `offset`, `mac`, `stage`, `since`

**Implementation approach**:
```typescript
function useAutoOnboardEvents(filters: EventFilters) {
  return useQuery({
    queryKey: queryKeys.autoOnboardEvents(filters),
    queryFn: () => autoOnboardApi.getEvents(filters),
    placeholderData: (prev) => prev, // Keep previous data during fetch
  });
}
```

### Q9: What is the mutation pattern for enable/disable?

**Resolution**: Use React Query mutations with optimistic updates.

**Pattern** (from `useCameras.ts` reboot mutation):
```typescript
export function useAutoOnboardToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: 'enable' | 'disable') =>
      action === 'enable'
        ? autoOnboardApi.enable()
        : autoOnboardApi.disable(),
    onMutate: async (action) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.autoOnboardStatus() });
      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.autoOnboardStatus());
      // Optimistically update
      queryClient.setQueryData(queryKeys.autoOnboardStatus(), (old) => ({
        ...old,
        enabled: action === 'enable',
      }));
      return { previous };
    },
    onError: (err, action, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.autoOnboardStatus(), context?.previous);
    },
    onSettled: () => {
      // Refetch to get actual state
      queryClient.invalidateQueries({ queryKey: queryKeys.autoOnboardStatus() });
    },
  });
}
```

### Q10: How should the API port be handled (8081 vs 8082)?

**Resolution**: The handoff specifies port 8081 for auto-onboard API, but the dashboard proxies through Vite which handles routing.

**Vite proxy config** (from existing setup):
- All `/api/*` requests proxy to PiOrchestrator
- No port specification needed in frontend code

**Frontend API paths**:
```typescript
const V1_AUTO_ONBOARD_BASE = '/v1/onboarding/auto';
// Full path: /api/v1/onboarding/auto/status
```

## Unknowns Resolved

| Unknown | Resolution |
|---------|------------|
| API client pattern | Follow v1-cameras.ts exactly with Zod validation |
| Polling pattern | useVisibilityAwareInterval at 15s interval |
| Query key structure | Add autoOnboard keys to queryClient.ts |
| Error handling | Extend V1ApiError with ONBOARD_* codes |
| Component placement | AutoOnboardPanel inside CameraSection |
| UI components | All needed shadcn/ui components available |
| Accessibility | Switch with role="switch", Alert with role="alert" |
| Pagination | Offset-based with keepPreviousData |
| Mutations | Optimistic updates with rollback |
| API port | Handled by Vite proxy, use relative paths |

## Risk Assessment

### Low Risk
- API integration follows proven v1-cameras pattern
- All UI components are already in the design system
- Polling/visibility patterns are battle-tested

### Medium Risk
- **Toggle state sync**: Optimistic updates could show incorrect state briefly
  - *Mitigation*: Short polling interval (15s) ensures quick reconciliation
- **Error state recovery**: HTML fallback detection for new endpoints
  - *Mitigation*: Copy exact pattern from v1-cameras.ts

### No Blockers Identified

All technical unknowns have been resolved. The implementation can proceed with Phase 1.

## Next Steps

1. Generate `data-model.md` with TypeScript interfaces
2. Generate API contracts in OpenAPI format
3. Generate `quickstart.md` with setup instructions
4. Update agent context via `update-agent-context.sh`
