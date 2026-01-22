# Quickstart: Auto-Onboard ESP-CAM Dashboard Integration

**Feature**: 035-auto-onboard-dashboard
**Date**: 2026-01-22

## Prerequisites

Before starting implementation:

1. **PiOrchestrator Backend**: Must have auto-onboard API endpoints available (spec 032-dev-auto-onboard-espcam)
2. **Dashboard Codebase**: Feature 034-esp-camera-integration must be complete (camera list, V1 API patterns)
3. **Development Environment**: `npm run dev` working with API proxy to Pi

## Quick Verification

Test that the auto-onboard API is accessible:

```bash
# Via SSH tunnel (if using local dev)
ssh -L 8082:localhost:8082 pi

# Test status endpoint
curl http://localhost:8082/api/v1/onboarding/auto/status
```

Expected response when mode is "dev":
```json
{
  "success": true,
  "data": {
    "enabled": false,
    "mode": "dev",
    "config": { ... }
  }
}
```

Expected response when mode is "off":
```json
{
  "success": true,
  "data": {
    "enabled": false,
    "mode": "off",
    "config": { ... }
  }
}
```

## Implementation Order

Follow this sequence to build the feature incrementally:

### Step 1: Zod Schemas (30 min)

Create `src/infrastructure/api/v1-auto-onboard-schemas.ts`:

```typescript
import { z } from 'zod';

// Start with basic schemas
export const AutoOnboardModeSchema = z.enum(['off', 'dev']);
export const AutoOnboardConfigSchema = z.object({
  max_per_minute: z.number().nonnegative(),
  burst_size: z.number().nonnegative(),
  subnet_allowlist: z.array(z.string()),
  verification_timeout_sec: z.number().positive(),
});
// ... add remaining schemas from data-model.md
```

**Test**: Write unit tests to validate schemas against mock data.

### Step 2: API Client (45 min)

Create `src/infrastructure/api/v1-auto-onboard.ts`:

```typescript
import { apiClient } from './client';
import { V1ApiError } from './errors';
import {
  AutoOnboardStatusResponseSchema,
  type AutoOnboardStatus,
} from './v1-auto-onboard-schemas';

const V1_AUTO_ONBOARD_BASE = '/v1/onboarding/auto';

export const autoOnboardApi = {
  getStatus: async (): Promise<AutoOnboardStatus> => {
    const response = await apiClient.get(V1_AUTO_ONBOARD_BASE + '/status');
    // Validate and extract data
    const parsed = AutoOnboardStatusResponseSchema.safeParse(response);
    if (!parsed.success || !parsed.data.success || !parsed.data.data) {
      throw new V1ApiError('ONBOARD_NOT_AVAILABLE', 'Failed to get status', true);
    }
    return parsed.data.data;
  },
  // ... add enable, disable, getEvents, etc.
};
```

**Test**: Write API client tests with MSW handlers.

### Step 3: Query Keys (10 min)

Update `src/lib/queryClient.ts`:

```typescript
export const queryKeys = {
  // ... existing keys

  // Auto-Onboard
  autoOnboard: ['auto-onboard'] as const,
  autoOnboardStatus: () => [...queryKeys.autoOnboard, 'status'] as const,
  autoOnboardEvents: (filters?: { mac?: string; since?: string }) =>
    [...queryKeys.autoOnboard, 'events', filters] as const,
};

export const invalidateQueries = {
  // ... existing
  autoOnboard: () => queryClient.invalidateQueries({ queryKey: queryKeys.autoOnboard }),
};
```

### Step 4: React Hooks (30 min)

Create `src/application/hooks/useAutoOnboard.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { autoOnboardApi } from '@/infrastructure/api/v1-auto-onboard';
import { queryKeys } from '@/lib/queryClient';
import { useVisibilityAwareInterval } from './useDocumentVisibility';

const AUTO_ONBOARD_POLLING_INTERVAL = 15_000; // 15 seconds

export function useAutoOnboardStatus(enabled = true) {
  const refetchInterval = useVisibilityAwareInterval({
    interval: AUTO_ONBOARD_POLLING_INTERVAL,
    enabled,
  });

  return useQuery({
    queryKey: queryKeys.autoOnboardStatus(),
    queryFn: autoOnboardApi.getStatus,
    enabled,
    refetchInterval,
    placeholderData: (prev) => prev,
  });
}

export function useAutoOnboardToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: 'enable' | 'disable') =>
      action === 'enable' ? autoOnboardApi.enable() : autoOnboardApi.disable(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.autoOnboardStatus() });
    },
  });
}
```

**Test**: Write hook tests with MSW and React Testing Library.

### Step 5: Error Codes (15 min)

Update `src/infrastructure/api/errors.ts`:

```typescript
// Add to ERROR_MESSAGES
export const ERROR_MESSAGES: Record<ErrorCode | string, string> = {
  // ... existing

  // Auto-Onboard Errors (035)
  ONBOARD_ENABLE_FAILED: 'Cannot enable auto-onboard. DEV mode must be configured on the Pi.',
  ONBOARD_DISABLE_FAILED: 'Failed to disable auto-onboard.',
  ONBOARD_NOT_AVAILABLE: 'Auto-onboard is not configured on this Pi.',
  ONBOARD_RATE_LIMITED: 'Too many onboarding requests. Please wait.',
};

// Add to getErrorCategory
export function getErrorCategory(code: ErrorCode | string): ErrorCategory {
  // ... existing

  if (
    code === 'ONBOARD_ENABLE_FAILED' ||
    code === 'ONBOARD_DISABLE_FAILED' ||
    code === 'ONBOARD_NOT_AVAILABLE' ||
    code === 'ONBOARD_RATE_LIMITED'
  ) {
    return 'onboard';
  }

  return 'unknown';
}
```

### Step 6: UI Components (2-3 hours)

Create components in `src/presentation/components/auto-onboard/`:

1. **DevModeWarningBanner.tsx** - Alert banner for DEV mode
2. **AutoOnboardStatusCard.tsx** - Toggle + status display
3. **AutoOnboardMetricsCard.tsx** - Success/failure counters
4. **AutoOnboardConfigCard.tsx** - Collapsible config display
5. **AuditEventsPanel.tsx** - Paginated event list
6. **AutoOnboardPanel.tsx** - Container for all above

**Pattern from CameraSection**:
```tsx
export function AutoOnboardPanel({ className }: { className?: string }) {
  const { data: status, isLoading, isError, error, refetch } = useAutoOnboardStatus();
  const toggleMutation = useAutoOnboardToggle();

  // Derived state
  const isAvailable = status?.mode === 'dev';
  const isEnabled = status?.enabled ?? false;

  if (!status && isLoading) return <LoadingSkeleton />;
  if (!status) return null; // Don't show if API unavailable

  return (
    <div className={className}>
      {isEnabled && <DevModeWarningBanner />}
      <AutoOnboardStatusCard
        status={status}
        onToggle={(enabled) => toggleMutation.mutate(enabled ? 'enable' : 'disable')}
        isToggling={toggleMutation.isPending}
      />
      {/* ... other cards */}
    </div>
  );
}
```

### Step 7: Integration (30 min)

Add to `src/presentation/components/cameras/CameraSection.tsx`:

```tsx
import { AutoOnboardPanel } from '@/presentation/components/auto-onboard/AutoOnboardPanel';

export function CameraSection({ className }: CameraSectionProps) {
  // ... existing code

  return (
    <Card className={className}>
      {/* ... header */}
      <CardContent>
        {/* Auto-onboard panel - shows only when available */}
        <AutoOnboardPanel className="mb-6" />

        {/* Existing camera content */}
        {isLoading ? (
          // ...
        )}
      </CardContent>
    </Card>
  );
}
```

## Testing Checklist

### Unit Tests
- [ ] Zod schemas validate correctly
- [ ] API client handles success/error responses
- [ ] Error codes map to user-friendly messages

### Component Tests
- [ ] StatusCard shows correct toggle state
- [ ] Toggle is disabled when mode is "off"
- [ ] Warning banner visible when enabled
- [ ] Metrics display correctly
- [ ] Events paginate correctly

### Integration Tests
- [ ] Hooks fetch and cache data correctly
- [ ] Mutations invalidate queries
- [ ] Visibility-aware polling works

### E2E Tests
- [ ] Can view status when mode is "dev"
- [ ] Can toggle enable/disable
- [ ] Can view events list
- [ ] Warning banner appears when enabled

## Common Issues

### API Returns HTML Instead of JSON

If you see `HTMLFallbackError`, the endpoint isn't registered on PiOrchestrator:
1. Check that PiOrchestrator has auto-onboard feature enabled
2. Verify `AUTO_ONBOARD_MODE=dev` in Pi environment
3. Restart PiOrchestrator: `ssh pi "sudo systemctl restart piorchestrator"`

### Toggle Doesn't Work

If toggle fails with `ONBOARD_ENABLE_FAILED`:
1. Mode is "off" - cannot enable unless Pi is configured for "dev" mode
2. Check Pi configuration: `AUTO_ONBOARD_ENABLED=true AUTO_ONBOARD_MODE=dev`

### Polling Too Frequent

If seeing excessive API requests:
1. Verify `useVisibilityAwareInterval` is pausing when tab hidden
2. Check polling interval (should be 15s)
3. Ensure `enabled` flag is respected

## Files Created

```
src/infrastructure/api/
├── v1-auto-onboard-schemas.ts    # Zod schemas
└── v1-auto-onboard.ts            # API client

src/application/hooks/
└── useAutoOnboard.ts             # React Query hooks

src/presentation/components/auto-onboard/
├── DevModeWarningBanner.tsx
├── AutoOnboardStatusCard.tsx
├── AutoOnboardMetricsCard.tsx
├── AutoOnboardConfigCard.tsx
├── AuditEventsPanel.tsx
└── AutoOnboardPanel.tsx

tests/
├── unit/api/v1-auto-onboard.test.ts
├── component/auto-onboard/*.test.tsx
├── mocks/v1-auto-onboard-handlers.ts
└── e2e/auto-onboard.spec.ts
```
