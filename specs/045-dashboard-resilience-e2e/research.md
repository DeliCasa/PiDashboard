# Research: Dashboard Resilience & E2E Coverage

**Feature**: 045-dashboard-resilience-e2e
**Date**: 2026-02-06
**Status**: Complete

## Research Summary

This document captures technical decisions and findings for Feature 045. All questions resolved through codebase exploration.

---

## R1: Graceful Degradation Gap in Containers/Cameras Hooks

### Question
Do `useContainers()` and `useCameras()` handle 404/503 gracefully like `useWifiStatus()`?

### Decision
**No — both hooks lack `isFeatureUnavailable()` and need enhancement.**

### Rationale

**`useContainers()` (src/application/hooks/useContainers.ts)**:
- No `retry` function — uses React Query default (3 retries)
- No `refetchInterval` conditional — keeps polling even on 404/503
- No `isFeatureUnavailable()` import
- Consequence: If `/v1/containers` returns 404, the Containers tab shows a red error card with retry button instead of a "Feature unavailable" message

**`useCameras()` (src/application/hooks/useCameras.ts)**:
- No `retry` function — uses React Query default
- Has `refetchInterval` via `useVisibilityAwareInterval` but doesn't stop on error
- No `isFeatureUnavailable()` import
- Consequence: Keeps polling a 404/503 endpoint every 10 seconds

**Reference implementation** (`useWifiStatus()` in src/application/hooks/useWifi.ts):
```typescript
refetchInterval: (query) => {
  if (query.state.error) {
    if (isFeatureUnavailable(err) || (ApiError.isApiError(err) && err.status >= 400)) {
      return false; // Stop polling
    }
  }
  return pollingInterval;
},
retry: (failureCount, error) => {
  if (isFeatureUnavailable(error)) return false;
  return failureCount < 2;
},
```

### Fix Approach
Apply the same `retry` + `refetchInterval` pattern from `useWifiStatus()` to both hooks. Minimal change — 10-15 lines per hook.

### Alternatives Considered
- **Handle in API client globally**: Rejected — React Query retry behavior is per-hook, not per-client
- **Add error boundary at tab level**: Rejected — error boundaries catch render errors, not query errors; also less user-friendly than "Feature unavailable" message

---

## R2: E2E Mock Infrastructure Coverage

### Question
Which tabs have E2E mock coverage in `mock-routes.ts` vs inline mocks vs no mocks?

### Decision
**Centralize mock data in `mock-routes.ts` for new additions. Existing inline mocks in containers.spec.ts and diagnostics.spec.ts are acceptable — don't refactor them.**

### Rationale

**Coverage audit of `tests/e2e/fixtures/mock-routes.ts`**:

| Endpoint Pattern | MockAPI Method | Coverage |
|-----------------|---------------|----------|
| `/api/system/info` | `mockSystemInfo()` | COVERED |
| `/api/wifi/*` | `mockWifiScan/Status/Connect()` | COVERED |
| `/api/door/*` | `mockDoorStatus/Command()` | COVERED |
| `/api/dashboard/config` | `mockConfig()` | COVERED |
| `/api/dashboard/logs` | `mockLogs()` | COVERED |
| `/api/cameras` | `mockCameras()` | COVERED (legacy) |
| `/api/v1/cameras` | `mockCamerasSuccess/Error/etc` | COVERED |
| `/api/devices` | `mockDevices()` | COVERED |
| `/api/network/**` | `mockNetwork()` | COVERED |
| `/api/v1/containers` | — | **MISSING** |
| `/dashboard/diagnostics/*` | — | **MISSING** |
| `/dashboard/diagnostics/sessions/*` | — | **MISSING** |
| `/v1/cameras/*/evidence` | — | **MISSING** |

**Existing inline E2E tests**:
- `containers.spec.ts`: Has own mock data for containers (UUID-based IDs)
- `diagnostics.spec.ts`: Has own mock data for health checks, sessions
- `cameras.spec.ts`: Uses `mockCamerasSuccess()` from mock-routes + inline capture mock

### Fix Approach
1. Add containers mock methods to `MockAPI` class in `mock-routes.ts`
2. Add diagnostics/sessions mock methods
3. New E2E spec files use centralized mocks
4. Don't refactor existing working spec files

### Alternatives Considered
- **Refactor all existing specs to use centralized mocks**: Rejected — Constitution IV (YAGNI). Working tests shouldn't be touched.
- **Create separate mock file per feature**: Rejected — `mock-routes.ts` is the established pattern

---

## R3: Container ID Display with Non-UUID IDs

### Question
Will the ContainerCard/ContainerSection render correctly with non-UUID container IDs like `"kitchen-fridge-001"` or `"12345"`?

### Decision
**Yes — no code changes needed. The existing Zod schema accepts any string for container `id`.**

### Rationale

**Schema check** (`src/infrastructure/api/v1-containers-schemas.ts`):
```typescript
export const ContainerSchema = z.object({
  id: z.string(), // No UUID validation — accepts any string
  label: z.string().optional(),
  ...
});
```

**Display check** (`src/presentation/components/containers/ContainerCard.tsx`):
- ID displayed in `font-mono text-xs text-muted-foreground`
- No string manipulation on ID (no split, substring, parseInt)
- `encodeURIComponent()` used in API calls — handles special characters

**Contract test already exists** (Feature 044, T046):
- Tests non-UUID IDs: `"kitchen-fridge-001"`, `"CONTAINER_ABC_123"`, numeric `"12345"`

### Verification Approach
E2E tests should include a container with semantic ID (`"kitchen-fridge-001"`) in mock data alongside UUID IDs to verify rendering.

---

## R4: Live Pi Smoke Test Pattern

### Question
How should new live smoke tests handle endpoints that may not exist on an older PiOrchestrator?

### Decision
**Use try/catch with API request pre-flight check, then skip test if endpoint unavailable.**

### Rationale

**Existing pattern** (`tests/e2e/live-smoke.spec.ts`):
```typescript
test.beforeAll(() => {
  if (!LIVE_PI_URL) test.skip();
});
```

**New pattern for optional endpoints**:
```typescript
test('should display cameras or skip gracefully', async ({ page }) => {
  // Pre-flight: check if endpoint exists
  const response = await page.request.get(`${LIVE_PI_URL}/api/v1/cameras`);
  if (response.status() === 404 || response.status() === 503) {
    test.skip();
    return;
  }
  // ... continue with test
});
```

### Alternatives Considered
- **Use `annotations.requiresLivePi()` only**: Insufficient — doesn't handle endpoint-level unavailability
- **Hard-fail on missing endpoints**: Rejected — live smoke should work against any PiOrchestrator version

---

## R5: Dashboard State Documentation Approach

### Question
Should `docs/dashboard_states.md` be auto-generated or manually curated?

### Decision
**Manually curated with clear format.** Auto-generation would require AST parsing which is overengineering.

### Rationale
The codebase has 12 tabs with different state patterns. A manually curated document is:
- Easier to maintain alongside component changes
- Can include context that AST parsing would miss (e.g., "WiFi may be unavailable")
- Consistent with existing documentation approach (CLAUDE.md, API-TYPE-CONTRACTS.md)

### Format
Per-tab state machine using text diagram:
```
Tab: Containers
Hooks: useContainers(), useCreateContainer(), useUnassignedCameras()
States:
  Loading → [data received] → Populated
  Loading → [error] → Error (retry)
  Loading → [404/503] → Feature Unavailable
  Loading → [empty array] → Empty (create prompt)
```

---

## Summary Table

| Research Item | Decision | Confidence |
|---------------|----------|------------|
| R1: Graceful degradation gaps | Add isFeatureUnavailable to containers/cameras hooks | High |
| R2: E2E mock coverage | Extend mock-routes.ts, don't refactor existing | High |
| R3: Non-UUID container IDs | Already works, verify with E2E test | High |
| R4: Live smoke pattern | Pre-flight check + test.skip() | High |
| R5: Dashboard states doc | Manual curation per tab | High |

## Open Questions

None. All research items resolved.
