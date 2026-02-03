# Quickstart: API Resilience & UI Correctness

**Feature**: 037-api-resilience
**Date**: 2026-01-25

## Overview

This guide helps developers quickly implement and test the API resilience improvements.

## Prerequisites

```bash
# Ensure you're on the feature branch
git checkout 037-api-resilience

# Install dependencies
npm install

# Verify tests pass before changes
npm test
npm run test:e2e
```

## Implementation Checklist

### Phase 1: Camera State Fixes (P1)

1. **Verify current behavior**:
   ```bash
   # Start dev server
   npm run dev

   # In browser console, verify camera loading states:
   # - isLoading true initially
   # - data becomes array (or empty)
   # - isError false on success
   ```

2. **Update CameraList.tsx** (if needed):
   ```typescript
   // Ensure state check order is correct:
   if (isLoading && !data) return <Loading />  // First load
   if (isError) return <Error />               // API failed
   if (!data || data.length === 0) return <Empty />  // Success, no cameras
   return <CameraGrid cameras={data} />        // Success with data
   ```

3. **Add E2E test**:
   ```bash
   # Run existing camera tests
   npm run test:e2e -- --grep "camera"

   # Add new resilience test
   # tests/e2e/cameras-resilience.spec.ts
   ```

### Phase 2: WiFi Graceful Degradation (P2)

1. **Update wifi.ts API client**:
   ```typescript
   // Add silent 404/503 handling
   function isFeatureUnavailable(error: unknown): boolean {
     return ApiError.isApiError(error) &&
            (error.status === 404 || error.status === 503);
   }

   export const wifiApi = {
     scan: async () => {
       try {
         return await apiClient.get('/wifi/scan');
       } catch (error) {
         if (isFeatureUnavailable(error)) {
           // Silent fallback - no console error
           return { networks: [] };
         }
         throw error;
       }
     },
     // ... similar for other methods
   };
   ```

2. **Verify no console errors**:
   ```bash
   # Run E2E with WiFi 404 mock
   npm run test:e2e -- --grep "wifi 404"

   # Check browser console - should be clean
   ```

### Phase 3: E2E Test Suite (P3)

1. **Add mock route helpers** to `tests/e2e/fixtures/mock-routes.ts`:
   ```typescript
   export function createMockAPI() {
     return {
       async mockCamerasError(page: Page) {
         await page.route('**/api/v1/cameras/**', route =>
           route.fulfill({ status: 500, body: '{"error":"Internal error"}' })
         );
       },
       // ... other presets
     };
   }
   ```

2. **Create resilience test files**:
   ```bash
   # Create test files
   touch tests/e2e/cameras-resilience.spec.ts
   touch tests/e2e/wifi-degradation.spec.ts
   touch tests/e2e/door-resilience.spec.ts
   touch tests/e2e/system-resilience.spec.ts
   ```

3. **Run full E2E suite**:
   ```bash
   npm run test:e2e
   ```

### Phase 4: CI Configuration

1. **Update `.github/workflows/test.yml`**:
   ```yaml
   - name: Upload E2E artifacts on failure
     if: failure()
     uses: actions/upload-artifact@v4
     with:
       name: playwright-traces
       path: test-results/
       retention-days: 7
   ```

2. **Verify CI works**:
   ```bash
   # Push branch and check GitHub Actions
   git push -u origin 037-api-resilience
   ```

## Testing Commands

```bash
# Run all tests
npm test

# Run E2E tests only
npm run test:e2e

# Run specific E2E test file
npx playwright test tests/e2e/cameras-resilience.spec.ts

# Run E2E with headed browser (for debugging)
npx playwright test --headed

# Run E2E with UI mode (interactive)
npx playwright test --ui

# Run E2E and show trace on failure
npx playwright test --trace on

# Run smoke tests against real Pi
E2E_BASE_URL=http://192.168.1.124:8082 npm run test:e2e -- --grep @smoke
```

## Key Files to Modify

| File | Purpose | Changes |
|------|---------|---------|
| `src/infrastructure/api/client.ts` | API client | Verify retry/timeout config |
| `src/infrastructure/api/wifi.ts` | WiFi API | Add silent 404 handling |
| `src/application/hooks/useCameras.ts` | Camera hook | Verify state handling |
| `src/presentation/components/cameras/CameraList.tsx` | Camera UI | Fix state checks |
| `tests/e2e/fixtures/mock-routes.ts` | E2E mocks | Add error presets |
| `tests/e2e/cameras-resilience.spec.ts` | E2E tests | New file |
| `.github/workflows/test.yml` | CI | Add artifact upload |

## Validation

### Manual Verification

1. **Camera states**:
   - Open DevTools Network tab
   - Throttle to "Slow 3G"
   - Reload page
   - Verify spinner shows during load
   - Verify "No cameras" only shows when API returns `[]`

2. **WiFi degradation**:
   - Stop PiOrchestrator WiFi endpoints (or mock 404)
   - Navigate around dashboard
   - Verify no error toasts
   - Verify console is clean

3. **Error recovery**:
   - Mock a 500 error
   - Verify error message appears
   - Verify Retry button works
   - Verify success after retry

### Automated Verification

```bash
# Run full validation suite
npm run lint && npm test && npm run build && npm run test:e2e

# Should see:
# ✓ Lint passes
# ✓ Unit tests pass
# ✓ Build succeeds
# ✓ E2E tests pass
```

## Common Issues

### Issue: "No cameras connected" shows on error

**Cause**: State check order is wrong
**Fix**: Ensure `isError` check comes before empty data check

```typescript
// Wrong
if (!data || data.length === 0) return <Empty />
if (isError) return <Error />  // Never reached when data is undefined

// Correct
if (isLoading && !data) return <Loading />
if (isError) return <Error />  // Checked before data
if (!data || data.length === 0) return <Empty />
```

### Issue: Console errors on WiFi 404

**Cause**: API client throws error instead of returning fallback
**Fix**: Catch 404/503 in WiFi API client

```typescript
try {
  return await apiClient.get('/wifi/scan');
} catch (error) {
  if (isFeatureUnavailable(error)) {
    return { networks: [] };  // Silent fallback
  }
  throw error;  // Re-throw other errors
}
```

### Issue: E2E tests flaky with loading states

**Cause**: Not waiting for loading to complete
**Fix**: Use proper Playwright waits

```typescript
// Wrong
await page.goto('/');
await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();

// Correct
await page.goto('/');
await expect(page.locator('[data-testid="camera-loading"]')).not.toBeVisible();
await expect(page.locator('[data-testid="camera-grid"]')).toBeVisible();
```

## Success Criteria Checklist

- [ ] SC-001: Mocked API with cameras → cameras displayed 100%
- [ ] SC-002: Mocked API with empty list → "No cameras" 100%
- [ ] SC-003: WiFi 404 → zero console errors
- [ ] SC-004: E2E covers Cameras, Door, System flows (90%+)
- [ ] SC-005: CI uploads artifacts on failure
- [ ] SC-006: API errors → user-friendly messages
- [ ] SC-007: WiFi 404 → other features work

## Next Steps

After implementing:

1. Run `/speckit.tasks` to generate detailed task list
2. Create PR with all changes
3. Verify CI passes
4. Request review
