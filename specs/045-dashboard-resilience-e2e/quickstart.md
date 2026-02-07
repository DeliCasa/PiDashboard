# Quickstart: Dashboard Resilience & E2E Coverage

**Feature**: 045-dashboard-resilience-e2e
**Date**: 2026-02-06

## Overview

Three work streams, ordered by priority:

1. **Graceful Degradation** (P1, US2) — Add `isFeatureUnavailable()` to containers/cameras hooks
2. **E2E Mock Infrastructure** (P1, US1) — Extend `mock-routes.ts` with containers, diagnostics, sessions
3. **E2E Tests + Docs** (P1/P2, US3-US5) — New Playwright specs, live smoke extensions, dashboard states doc

---

## Prerequisites

```bash
# Ensure you're on the feature branch
git checkout 045-dashboard-resilience-e2e

# Install dependencies
npm install

# Verify current state
npm run lint     # Should be 0 errors
npm test         # Should pass (2094+ tests)
npm run build    # Should pass
```

---

## Work Stream 1: Graceful Degradation (US2)

### Step 1.1: Add isFeatureUnavailable to useContainers

**File**: `src/application/hooks/useContainers.ts`

Add to `useContainers()`:
```typescript
import { isFeatureUnavailable } from '@/infrastructure/api/client';

export function useContainers(enabled = true, pollingInterval = CONTAINER_POLLING_INTERVAL) {
  return useQuery({
    queryKey: queryKeys.containerList(),
    queryFn: v1ContainersApi.list,
    enabled,
    refetchInterval: (query) => {
      if (query.state.error && isFeatureUnavailable(query.state.error)) {
        return false; // Stop polling on 404/503
      }
      return pollingInterval;
    },
    retry: (failureCount, error) => {
      if (isFeatureUnavailable(error)) return false;
      return failureCount < 2;
    },
    placeholderData: (previousData) => previousData,
  });
}
```

### Step 1.2: Add isFeatureUnavailable to useCameras

**File**: `src/application/hooks/useCameras.ts`

Add to `useCameras()`:
```typescript
import { isFeatureUnavailable } from '@/infrastructure/api/client';

export function useCameras(enabled = true, pollingInterval = CAMERA_POLLING_INTERVAL) {
  const refetchInterval = useVisibilityAwareInterval({
    interval: pollingInterval,
    enabled,
  });

  return useQuery({
    queryKey: queryKeys.cameraList(),
    queryFn: v1CamerasApi.list,
    enabled,
    refetchInterval: (query) => {
      if (query.state.error && isFeatureUnavailable(query.state.error)) {
        return false;
      }
      return refetchInterval;
    },
    retry: (failureCount, error) => {
      if (isFeatureUnavailable(error)) return false;
      return failureCount < 2;
    },
    placeholderData: (previousData) => previousData,
  });
}
```

### Step 1.3: Verify

```bash
npm run lint && VITEST_MAX_WORKERS=1 npm test && npm run build
```

---

## Work Stream 2: E2E Mock Infrastructure (US1)

### Step 2.1: Add Container Mocks to mock-routes.ts

**File**: `tests/e2e/fixtures/mock-routes.ts`

Add after the existing camera mock data section:

```typescript
// Container mock data with mixed ID formats (opaque IDs)
export const mockContainerData = {
  withMixedIds: {
    success: true,
    data: {
      containers: [
        {
          id: 'kitchen-fridge-001',  // Semantic string
          label: 'Kitchen Fridge',
          description: 'Main refrigerator',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          cameras: [{
            device_id: 'AA:BB:CC:DD:EE:FF',
            position: 1,
            assigned_at: new Date().toISOString(),
            status: 'online',
            name: 'Shelf Cam',
          }],
          camera_count: 1,
          online_count: 1,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440000',  // UUID
          label: 'Garage Freezer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          cameras: [],
          camera_count: 0,
          online_count: 0,
        },
      ],
    },
    correlation_id: 'test-containers',
    timestamp: new Date().toISOString(),
  },
  empty: {
    success: true,
    data: { containers: [] },
    correlation_id: 'test-containers-empty',
    timestamp: new Date().toISOString(),
  },
};
```

Add `mockContainers*` helper functions and extend `MockAPI` class.

### Step 2.2: Add Diagnostics Mocks

Add health, sessions, and evidence mock data matching existing schema shapes.

### Step 2.3: Add to MockAPI.applyAllMocks()

Ensure new mock methods are called in `applyAllMocks()` so the `mockedPage` fixture covers all tabs.

---

## Work Stream 3: E2E Tests + Documentation (US3-US5)

### Step 3.1: Graceful Degradation E2E Test (US2)

**New file**: `tests/e2e/v1-graceful-degradation.spec.ts`

```typescript
test.describe('V1 Endpoint Graceful Degradation', () => {
  test('core tabs work when V1 endpoints return 404', async ({ page }) => {
    // Mock V1 endpoints as 404
    await mockEndpoint(page, '**/api/v1/containers', { status: 404, error: true });
    await mockEndpoint(page, '**/api/v1/cameras', { status: 404, error: true });
    // Keep core endpoints working
    // Navigate through core tabs
    // Verify no console errors
  });
});
```

### Step 3.2: Operator Flow E2E Tests (US3)

Extend existing `containers.spec.ts` and `diagnostics.spec.ts` or add new spec covering the operator-critical flows.

### Step 3.3: Live Smoke Extensions (US4)

**File**: `tests/e2e/live-smoke.spec.ts`

Add tests for Cameras, Containers, Diagnostics tabs with endpoint pre-flight checks.

### Step 3.4: Dashboard States Documentation (US5)

**New file**: `docs/dashboard_states.md`

Per-tab state machine documentation.

---

## Verification Checklist

### Graceful Degradation
- [ ] `useContainers()` stops polling on 404/503
- [ ] `useCameras()` stops polling on 404/503
- [ ] Core tabs unaffected when V1 endpoints unavailable

### E2E Mocks
- [ ] `mock-routes.ts` has container mock methods
- [ ] `mock-routes.ts` has diagnostics mock methods
- [ ] `MockAPI.applyAllMocks()` covers all tabs

### E2E Tests
- [ ] Graceful degradation E2E spec passes
- [ ] Operator flow E2E specs pass
- [ ] Live smoke covers new tabs (skips if unavailable)
- [ ] Zero console errors during full tab navigation

### Documentation
- [ ] `docs/dashboard_states.md` covers all 12 tabs

### Quality
- [ ] `npm run lint` — 0 errors
- [ ] `VITEST_MAX_WORKERS=1 npm test` — all pass
- [ ] `npm run build` — success
