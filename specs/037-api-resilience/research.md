# Research: API Resilience & UI Correctness

**Feature**: 037-api-resilience
**Date**: 2026-01-25
**Status**: Complete

## Research Topics

### 1. React Query v5 Error Handling Patterns

**Decision**: Use existing TanStack Query state properties (`isLoading`, `isError`, `data`) with explicit state checks.

**Rationale**:
- PiDashboard already has correct patterns in `src/lib/queryClient.ts`
- The `shouldRetry()` function already excludes 4xx errors from retry
- `placeholderData: (prev) => prev` keeps showing stale data during refetch

**Key Pattern - State Distinction**:
```typescript
// Correct order of state checks:
if (isLoading && !data) return <Loading />  // First load only
if (isError) return <Error />               // Fetch failed
if (!data || data.length === 0) return <Empty />  // Success but empty
return <Content data={data} />              // Success with data
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Custom state machine (XState) | Over-engineering for 3 states |
| Global error boundary only | Can't distinguish empty from error |
| Keep old `keepPreviousData` v4 style | Deprecated in TanStack Query v5 |

---

### 2. Graceful 404 Handling for WiFi Endpoints

**Decision**: Treat HTTP 404 and 503 on WiFi endpoints as "feature unavailable" - return empty data, no console errors, no retries.

**Rationale**:
- WiFi endpoints (`/api/wifi/*`) depend on PiOrchestrator binary configuration
- A 404 means "endpoint not available", not "transient error"
- Retrying won't help; user should see "feature unavailable" state

**Implementation Pattern**:
```typescript
// In wifi.ts API client
function isEndpointUnavailable(error: unknown): boolean {
  if (!ApiError.isApiError(error)) return false;
  return error.status === 404 || error.status === 503;
}

export const wifiApi = {
  scan: async (): Promise<{ networks: WiFiNetwork[] }> => {
    try {
      return await apiClient.get('/wifi/scan');
    } catch (error) {
      if (isEndpointUnavailable(error)) {
        // Silent fallback - no console error
        return { networks: [] };
      }
      throw error; // Re-throw other errors
    }
  },
};
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Always retry 404 | Wastes requests, won't succeed |
| Show error toast on 404 | Confuses users for optional features |
| Disable WiFi tab entirely | Too aggressive, feature may come back |

---

### 3. Visibility-Aware Polling

**Decision**: Continue using existing `useVisibilityAwareInterval()` hook with `placeholderData` for smooth UX.

**Rationale**:
- Already implemented in `src/application/hooks/useDocumentVisibility.ts`
- Returns `false` when tab hidden, pausing polling
- Combined with `placeholderData` keeps showing stale data

**Key Pattern**:
```typescript
const refetchInterval = useVisibilityAwareInterval({
  interval: 10_000,
  enabled: true,
});

useQuery({
  queryKey: ['cameras'],
  queryFn: fetchCameras,
  refetchInterval,  // Pauses when tab hidden
  placeholderData: (prev) => prev,  // Shows stale data
});
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Always poll (no visibility check) | Wastes battery/bandwidth on hidden tabs |
| Clear data when hidden | Jarring UX when tab becomes visible |
| WebSocket instead of polling | Over-engineering for dashboard use case |

---

### 4. Playwright E2E Error Scenario Testing

**Decision**: Use `page.route()` with status code mocking and network abort patterns.

**Rationale**:
- Existing `mock-routes.ts` already has route interception patterns
- Can mock any HTTP status (200, 404, 500, 502) or network failures
- Deterministic tests without depending on live API

**Mock Patterns**:
```typescript
// Mock 500 error
await page.route('**/api/v1/cameras/**', route =>
  route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal error' }) })
);

// Mock network failure
await page.route('**/api/v1/cameras/**', route =>
  route.abort('connectionfailed')
);

// Mock slow response (for loading state)
await page.route('**/api/v1/cameras/**', async route => {
  await new Promise(r => setTimeout(r, 3000));
  route.fulfill({ status: 200, body: JSON.stringify({ cameras: [] }) });
});
```

**State Testing Matrix**:
| State | Mock Pattern | Assertion |
|-------|--------------|-----------|
| Loading | Delay response 3s | Spinner visible |
| Success | Return cameras array | Camera cards visible |
| Empty | Return empty array | "No cameras" message |
| Error | Return 500 | Error message + retry button |
| Network | Abort connection | "Connection failed" message |

---

### 5. CI Artifact Upload on E2E Failure

**Decision**: Use Playwright's built-in trace/video/screenshot collection with GitHub Actions artifact upload.

**Rationale**:
- Playwright has native support for trace files (zip with timeline)
- GitHub Actions `upload-artifact` action handles large files
- Only upload on failure to save storage

**Configuration**:
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry',      // Full timeline on retry
    screenshot: 'only-on-failure', // Save space
    video: 'on-first-retry',       // Visual proof
  },
  reporter: [
    ['html', { open: 'never' }],
    ['github'],  // Annotations in PR
  ],
});
```

**GitHub Actions Pattern**:
```yaml
- name: Upload E2E artifacts on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report-${{ github.run_id }}
    path: |
      playwright-report/
      test-results/
    retention-days: 7
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Always upload artifacts | Wastes 50MB+ storage per run |
| External trace service | Adds complexity, cost |
| Screenshots only | Missing interaction timeline |

---

### 6. Staleness Indicator (FR-013)

**Decision**: Use `dataUpdatedAt` from React Query with relative time display.

**Rationale**:
- React Query already tracks `dataUpdatedAt` timestamp
- Can compute staleness: `Date.now() - dataUpdatedAt > 30_000`
- Minimal UI impact (subtle indicator, not blocking)

**Pattern**:
```typescript
const { data, dataUpdatedAt } = useQuery({ ... });

const isStale = dataUpdatedAt && (Date.now() - dataUpdatedAt) > 30_000;

return (
  <>
    {isStale && <Badge variant="outline">Data may be stale</Badge>}
    <Content data={data} />
  </>
);
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Auto-refresh on stale | User might be reading; disruptive |
| Block UI when stale | Too aggressive for dashboard |
| Hide stale indicator | Users lose trust if data looks old |

---

## Summary of Decisions

| Topic | Decision | Key Implementation |
|-------|----------|-------------------|
| State handling | Explicit isLoading/isError/data checks | Order: loading → error → empty → success |
| WiFi 404 | Silent fallback to empty | `isEndpointUnavailable()` helper |
| Polling | Visibility-aware + placeholderData | `useVisibilityAwareInterval()` hook |
| E2E mocking | page.route() with status codes | Add to mock-routes.ts |
| CI artifacts | Upload on failure only | `if: failure()` in GitHub Actions |
| Staleness | Badge when >30s old | Compute from `dataUpdatedAt` |

## References

- TanStack Query v5 Retry Docs: https://tanstack.com/query/v5/docs/react/guides/query-retries
- TanStack Query v5 Placeholder Data: https://tanstack.com/query/latest/docs/framework/react/guides/placeholder-query-data
- Playwright Route Interception: https://playwright.dev/docs/network#handle-requests
- GitHub Actions Upload Artifact: https://github.com/actions/upload-artifact
