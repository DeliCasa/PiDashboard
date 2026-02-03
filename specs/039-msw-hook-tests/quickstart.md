# Quickstart: Hook Integration Testing

**Feature**: 039-msw-hook-tests | **Date**: 2026-02-01

This guide documents the "golden path" for writing reliable hook integration tests in PiDashboard.

## Prerequisites

- MSW v2 (`msw/node`) for API mocking
- Vitest with jsdom environment
- `@testing-library/react` with `renderHook`
- TanStack React Query v5

## Step 1: Create an MSW Handler

Add a handler to `tests/mocks/handlers/` or extend `tests/integration/mocks/handlers.ts`.

```typescript
// tests/mocks/handlers/my-feature.ts
import { http, HttpResponse, delay } from 'msw';

export const myFeatureMockData = {
  items: [{ id: '1', name: 'Test Item' }],
};

export function createMyFeatureHandlers(overrides?: Partial<typeof myFeatureMockData>) {
  const data = { ...myFeatureMockData, ...overrides };

  return [
    http.get('/api/my-feature/items', async () => {
      await delay(50);
      return HttpResponse.json(data);
    }),
  ];
}

// Error handler presets for testing error states
export const myFeatureErrorHandlers = {
  serverError: http.get('/api/my-feature/items', () =>
    HttpResponse.json({ error: 'Internal error' }, { status: 500 })
  ),
  notFound: http.get('/api/my-feature/items', () =>
    HttpResponse.json({ error: 'Not found' }, { status: 404 })
  ),
  networkError: http.get('/api/my-feature/items', () =>
    HttpResponse.error()
  ),
};
```

**Key rules**:
- Always use `await delay()` for realistic timing
- Export factory functions with `overrides` parameter
- Export error handler presets as a named object
- V1 API endpoints MUST return envelope: `{ success: true, data: { ... } }`

## Step 2: Write the Test File

```typescript
// tests/integration/hooks/useMyFeature.test.tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, createWrapper } from '../../setup/test-utils';
import { server } from '../mocks/server';
import { useMyFeature } from '@/application/hooks/useMyFeature';
import { myFeatureErrorHandlers } from '../../mocks/handlers/my-feature';

// ============================================================================
// Server Lifecycle (REQUIRED in every hook test file)
// ============================================================================

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ============================================================================
// Tests
// ============================================================================

describe('useMyFeature', () => {
  it('fetches data successfully', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useMyFeature(), {
      wrapper: createWrapper(queryClient),
    });

    // Initial state: loading
    expect(result.current.isLoading).toBe(true);

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify data
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.items).toHaveLength(1);
  });

  it('handles server error gracefully', async () => {
    server.use(myFeatureErrorHandlers.serverError);
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useMyFeature(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('handles network failure', async () => {
    server.use(myFeatureErrorHandlers.networkError);
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useMyFeature(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

## Key Patterns

### Fresh QueryClient per Test

Always create a new `QueryClient` in each test to prevent cache pollution:

```typescript
it('my test', async () => {
  const queryClient = createTestQueryClient();
  // ...
});
```

The `createTestQueryClient()` utility configures:
- `retry: false` — no retries (deterministic)
- `gcTime: Infinity` — no garbage collection during test
- `staleTime: Infinity` — data stays fresh

### Wrapper Component

Use `createWrapper(queryClient)` to provide React context:

```typescript
const { result } = renderHook(() => useMyHook(), {
  wrapper: createWrapper(queryClient),
});
```

This wraps the hook in `QueryClientProvider` + `ThemeProvider`.

### Waiting for Async State

**DO**: Use `waitFor` for async assertions:
```typescript
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
```

**DON'T**: Use arbitrary delays:
```typescript
// ❌ NEVER do this
await new Promise(r => setTimeout(r, 1000));
```

### Overriding Handlers Per-Test

Use `server.use()` to override handlers for specific tests:

```typescript
it('handles empty response', async () => {
  server.use(
    http.get('/api/my-feature/items', () =>
      HttpResponse.json({ items: [], count: 0 })
    )
  );
  // Test assertions for empty state...
});
```

The handler is automatically reset in `afterEach(() => server.resetHandlers())`.

### Testing Mutations

```typescript
it('creates an item', async () => {
  const queryClient = createTestQueryClient();

  const { result } = renderHook(() => useCreateItem(), {
    wrapper: createWrapper(queryClient),
  });

  // Trigger mutation
  result.current.mutate({ name: 'New Item' });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
});
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not resetting handlers between tests | Always include `afterEach(() => server.resetHandlers())` |
| Sharing QueryClient across tests | Create new `createTestQueryClient()` per test |
| Using `setTimeout` for async waits | Use `waitFor()` from Testing Library |
| Not handling `onUnhandledRequest` | Use `server.listen({ onUnhandledRequest: 'error' })` to catch missing handlers |
| Mock data not matching Zod schemas | Validate fixtures against schemas in contract tests |
| Using `as any` for mock return values | Type mock returns as `ReturnType<typeof hookFn>` |

## File Locations

| What | Where |
|------|-------|
| Test utilities | `tests/setup/test-utils.tsx` |
| Shared MSW server | `tests/integration/mocks/server.ts` |
| Shared handlers | `tests/integration/mocks/handlers.ts` |
| Feature handlers | `tests/mocks/handlers/{feature}.ts` |
| Fixtures | `tests/mocks/{feature}/` or `tests/fixtures/` |
| Hook tests | `tests/integration/hooks/use{Feature}.test.tsx` |
| Contract tests | `tests/integration/contracts/{feature}.contract.test.ts` |
