# Playwright Testing Research Summary

Comprehensive research on API mocking, error state testing, and CI artifact configuration for the PiDashboard project.

## Executive Summary

This research package contains three detailed guides covering Playwright best practices:

1. **PLAYWRIGHT_BEST_PRACTICES.md** - Complete reference guide
2. **PLAYWRIGHT_QUICK_REFERENCE.md** - Quick lookup and copy-paste configs
3. **PLAYWRIGHT_PIDASHBOARD_EXAMPLES.md** - Real examples from PiDashboard

## Key Findings

### 1. API Mocking with page.route()

**Core Pattern:**
```typescript
await page.route('**/api/endpoint', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ /* response */ })
  });
});
```

**Key Features:**
- Glob patterns for flexible route matching
- Request inspection: `route.request().method()`, `.postDataJSON()`, `.url()`
- Request abortion: `route.abort('connectionfailed')`
- Conditional routing based on request details
- Delay simulation for testing slow networks

**Best Practice:** Create a reusable MockAPI class with:
- Individual mock methods for each endpoint
- Configuration objects for status, delay, error
- Methods like `mockError()`, `mockSlow()`, `applyAllMocks()`

### 2. Testing Loading/Error/Empty States

**The Complete State Matrix:**

| State | Test Pattern | Key Assertion |
|-------|-------------|---------------|
| **Loading** | Mock with `delay: 2000` | Expect spinner/skeleton visible |
| **Success** | Mock with `status: 200` | Expect data content visible |
| **Error 5xx** | Mock with `status: 500` | Expect error message |
| **Error 4xx** | Mock with `status: 400` | Expect validation message |
| **Empty** | Mock with empty array/null | Expect "no data" message |
| **Network Error** | `route.abort('connectionfailed')` | Expect offline message |
| **Timeout** | Never respond: `new Promise(()=>{})` | Expect timeout message |
| **Partial Failure** | Some endpoints fail, some succeed | Expect mixed UI states |

**Implementation Pattern:**

```typescript
test('should handle complete state lifecycle', async ({ page }) => {
  let apiStatus = 'loading';

  await page.route('**/api/endpoint', async (route) => {
    if (apiStatus === 'loading') {
      await new Promise(r => setTimeout(r, 2000));
    } else if (apiStatus === 'error') {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Failed' }) });
    } else {
      await route.fulfill({ status: 200, body: JSON.stringify({ data: {} }) });
    }
  });

  // Test loading state
  await page.goto('/');
  await expect(page.locator('[data-testid="loading"]')).toBeVisible();

  // Data loads
  await expect(page.getByText('expected data')).toBeVisible({ timeout: 5000 });

  // Simulate error
  apiStatus = 'error';
  await page.reload();
  await expect(page.getByText(/error/i)).toBeVisible({ timeout: 5000 });

  // Recover
  apiStatus = 'success';
  await page.reload();
  await expect(page.getByText('expected data')).toBeVisible({ timeout: 5000 });
});
```

### 3. HTTP Status Code Handling

**Coverage Map:**

| Code | Scenario | Mock Pattern |
|------|----------|-------------|
| 200 | Success | `status: 200, data: {...}` |
| 201 | Created | `status: 201, data: { id: '...' }` |
| 204 | No content | `status: 204, body: ''` |
| 400 | Bad request | `status: 400, error: 'Invalid input'` |
| 401 | Unauthorized | `status: 401, error: 'Auth required'` |
| 403 | Forbidden | `status: 403, error: 'Access denied'` |
| 404 | Not found | `status: 404, error: 'Not found'` |
| 429 | Rate limited | `status: 429, headers: { 'Retry-After': '60' }` |
| 500 | Server error | `status: 500, error: 'Internal error'` |
| 502 | Bad gateway | `status: 502, error: 'Gateway error'` |
| 503 | Unavailable | `status: 503, error: 'Service unavailable'` |
| 504 | Gateway timeout | `status: 504, error: 'Timeout'` |

**Network Error Types:**
- `connectionfailed` - General network error
- `connectiontimeout` - Request timed out
- `connectionreset` - Connection reset by peer
- `connectionrefused` - Server refused connection
- `addressunreachable` - DNS/network unreachable

### 4. Waiting Properly for Async State Changes

**Anti-Pattern (Don't Do This):**
```typescript
await page.waitForTimeout(2000);  // Hope data loads in 2 seconds
```

**Pattern (Do This):**
```typescript
// Wait for specific content to appear
await expect(page.getByText('CPU')).toBeVisible({ timeout: 5000 });

// Wait for loading to disappear
await expect(page.locator('.spinner')).not.toBeVisible({ timeout: 5000 });

// Wait for custom condition
await page.waitForFunction(() => {
  return !document.querySelector('[data-loading="true"]');
}, { timeout: 10000 });
```

### 5. Playwright Configuration for Artifacts

**Critical Settings in playwright.config.ts:**

```typescript
use: {
  // Collect trace on first retry (heavy, for debugging)
  trace: 'on-first-retry',

  // Screenshot on failure only (saves space)
  screenshot: 'only-on-failure',

  // Video on first retry (helps see what happened)
  video: 'on-first-retry',

  // Timeouts
  actionTimeout: 10000,
  navigationTimeout: 15000,
},

retries: process.env.CI ? 2 : 0,
workers: process.env.CI ? 1 : undefined,

reporter: [
  ['list'],
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ...(process.env.CI ? [['github']] : []),
],
```

**Why These Settings:**
- `trace: 'on-first-retry'` - Captures full timeline for failed tests, enables Playwright Inspector debugging
- `video: 'on-first-retry'` - Visual proof of what happened, helps identify flakiness
- `screenshot: 'only-on-failure'` - Saves storage but gives last screenshot before failure
- Single worker on CI - Reduces flakiness and resource contention

### 6. GitHub Actions Artifact Upload Strategy

**Optimal Pattern:**

```yaml
# Always upload reports (small, useful)
- uses: actions/upload-artifact@v4
  if: always()  # Even on success
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7

# Only upload traces on failure (heavy, for debugging)
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-traces
    path: test-results/**/*.{zip,png,webm}
    retention-days: 14

# Merge reports from sharded runs
- run: npx playwright merge-reports ./all-reports/*
```

**Storage Math:**
- HTML report: ~50KB per test run
- Trace zip: ~500KB-2MB per failure
- Video: ~10MB+ per failed test
- Screenshot: ~50KB per failure

By only uploading traces/videos on failure, you get debugging info without paying storage costs.

### 7. Best Practices Summary

**Top 10 Playwright Best Practices:**

1. **Use reusable MockAPI class** - Centralize mock logic, make tests readable
   ```typescript
   const api = new MockAPI(page);
   await api.mockEndpoint({ delay: 1000, status: 200 });
   ```

2. **Mock with configuration objects** - Flexible, composable patterns
   ```typescript
   interface MockRouteConfig {
     data?: unknown;
     status?: number;
     delay?: number;
     error?: boolean;
   }
   ```

3. **Test all states** - Loading, success, error, empty, partial failure
   - Don't just test the happy path
   - Error handling is critical

4. **Use proper waits** - expect() with timeouts, never hardcoded delays
   - Always use timeouts: `{ timeout: 5000 }`
   - Wait for specific content, not arbitrary time

5. **Handle network failures** - Test realistic scenarios
   - Network timeouts
   - Connection refused
   - Rate limiting (429)

6. **Maintain UI responsiveness** - Verify app doesn't freeze during slow requests
   - Tab navigation should work
   - Can switch pages
   - UI stays interactive

7. **Configure traces, videos, screenshots** - Enable artifact collection
   - Traces help debug complex failures
   - Videos show exact behavior
   - Screenshots capture final state

8. **Upload artifacts strategically** - Balance visibility vs storage
   - Always upload HTML reports (small, always useful)
   - Upload full artifacts only on failure (heavy, only needed for debugging)
   - Use retention days wisely (7 days for common, 30 for nightly)

9. **Test request/response details** - Validate beyond happy paths
   ```typescript
   const method = route.request().method();
   const body = route.request().postDataJSON();
   const url = route.request().url();
   ```

10. **Isolate tests** - Each test should clean up after itself
    - No shared state between tests
    - Routes cleared between tests automatically
    - Fresh page context for each test

## Implementation Recommendations for PiDashboard

Based on the research and existing infrastructure:

### Immediate Wins

1. **Expand error state coverage** - Add tests for all 4xx/5xx codes
2. **Test partial failures** - Some endpoints fail, others succeed
3. **Add resilience tests** - Network timeouts, rate limiting, service unavailable
4. **Verify UI responsiveness** - Tests that app stays responsive during slow requests

### Medium-Term

1. **Enhance MockAPI** - Add scenario presets (healthySystem, degradedPerformance, etc.)
2. **Custom wait utilities** - Helper functions for React Query loading states
3. **Accessibility + Resilience** - Combine a11y testing with error scenarios
4. **Performance testing** - Monitor load times during mocked requests

### Long-Term

1. **Performance budgets** - Ensure tests still pass within time constraints
2. **Flakiness detection** - Automated detection of flaky tests
3. **Visual regression** - Screenshot comparison for UI changes
4. **Test trend analysis** - Track performance over time

## Code Snippets By Use Case

### Testing a Loading State

```typescript
test('should show loading during fetch', async ({ page }) => {
  const api = new MockAPI(page);
  await api.mockEndpoint({ delay: 1000 });

  await page.goto('/');

  // Might see loading
  const spinner = page.locator('[data-testid="loading"]');
  try {
    await expect(spinner).toBeVisible({ timeout: 500 });
  } catch {
    // Loaded quickly, that's ok
  }

  // Eventually see data
  await expect(page.getByText('Expected Content')).toBeVisible({ timeout: 5000 });
});
```

### Testing an Error State

```typescript
test('should show error on API failure', async ({ page }) => {
  const api = new MockAPI(page);

  // Mock specific endpoint as error
  await api.mockError('**/api/system/info', 500, 'Service unavailable');
  await api.mockWifiStatus();
  await api.mockWifiScan();

  await page.goto('/');

  // Should show error message
  const errorMsg = page.getByText(/error|unavailable/i);
  await expect(errorMsg).toBeVisible({ timeout: 5000 });

  // Other tabs should still work
  await page.getByRole('tab', { name: /wifi/i }).click();
  await expect(page.getByText(/network|ssid/i)).toBeVisible();
});
```

### Testing Network Failure Recovery

```typescript
test('should recover from network failure', async ({ page }) => {
  let shouldFail = true;

  await page.route('**/api/endpoint', async (route) => {
    if (shouldFail) {
      await route.abort('connectionfailed');
    } else {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    }
  });

  // Initial load fails
  await page.goto('/');
  await expect(page.getByText(/offline|error/i)).toBeVisible();

  // Now enable API
  shouldFail = false;
  await page.reload();

  // Should recover
  await expect(page.getByText('Success')).toBeVisible({ timeout: 5000 });
});
```

### Mocking Slow Network with Conditional Logic

```typescript
test('should handle slow requests', async ({ page }) => {
  let requestCount = 0;

  await page.route('**/api/**', async (route) => {
    requestCount++;

    // First request takes 3 seconds
    if (requestCount === 1) {
      await new Promise(r => setTimeout(r, 3000));
    }

    // Subsequent requests are fast
    await route.continue();
  });

  await page.goto('/');

  // UI should be responsive
  await expect(page.getByRole('tablist')).toBeVisible();

  // Can navigate tabs during slow load
  await page.getByRole('tab', { name: /wifi/i }).click();
  await expect(page.getByRole('tab', { name: /wifi/i })).toHaveAttribute('data-state', 'active');
});
```

## File Structure

```
PiDashboard/
├── PLAYWRIGHT_BEST_PRACTICES.md          # Complete reference (1000+ lines)
├── PLAYWRIGHT_QUICK_REFERENCE.md         # Copy-paste templates (500+ lines)
├── PLAYWRIGHT_PIDASHBOARD_EXAMPLES.md    # Real PiDashboard examples (700+ lines)
├── PLAYWRIGHT_RESEARCH_SUMMARY.md        # This file
├── tests/
│   └── e2e/
│       ├── resilience.spec.ts            # Existing error scenario tests
│       ├── fixtures/
│       │   ├── test-base.ts              # Custom fixtures
│       │   └── mock-routes.ts            # MockAPI class implementation
│       ├── smoke.spec.ts
│       ├── wifi.spec.ts
│       └── system.spec.ts
└── playwright.config.ts                  # Artifact configuration
```

## Testing Checklist for New Features

When adding new features to PiDashboard, test:

- [ ] **Loading state** - Show loading indicator while fetching
- [ ] **Success state** - Display data correctly
- [ ] **Error state** - Handle 500 errors gracefully
- [ ] **Empty state** - Show message when no data
- [ ] **Network error** - Handle connection failures
- [ ] **Slow network** - Remain responsive during slow requests
- [ ] **Partial failures** - Other features work if one fails
- [ ] **Error recovery** - Can recover when API comes back online
- [ ] **UI responsiveness** - UI stays interactive during loading/errors
- [ ] **Console errors** - No unhandled errors logged

## Resources

- **Playwright Official:** https://playwright.dev/docs
- **Route & Mocking:** https://playwright.dev/docs/api-testing#mocking-routes
- **Artifact Upload:** https://github.com/actions/upload-artifact
- **Trace Viewer:** https://trace.playwright.dev

## Contributing

When writing new E2E tests:

1. Follow the MockAPI pattern from test-base.ts
2. Test all states: loading, success, error, empty
3. Use proper waits with timeouts
4. Don't hardcode delays
5. Keep fixtures and mocks organized
6. Document complex test scenarios

---

Generated: 2026-01-25
Research scope: Playwright API mocking, error state testing, CI artifact configuration
