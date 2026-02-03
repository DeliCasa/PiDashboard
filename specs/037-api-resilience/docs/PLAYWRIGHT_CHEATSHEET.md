# Playwright Testing Cheatsheet

One-page quick reference for common patterns. Print this!

## API Mocking (page.route)

```typescript
// Basic mock
await page.route('**/api/endpoint', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true })
  });
});

// Network error
await page.route('**/api/**', r => r.abort('connectionfailed'));

// Conditional (based on method)
await page.route('**/api/config/*', async (route) => {
  if (route.request().method() === 'PUT') {
    await route.fulfill({ status: 200, body: '{}' });
  } else {
    await route.continue();
  }
});

// Slow response (delay)
await page.route('**/api/**', async (route) => {
  await new Promise(r => setTimeout(r, 2000));
  await route.continue();
});

// Intercept and inspect
const body = route.request().postDataJSON();
const method = route.request().method();
const url = route.request().url();
```

## State Testing Checklist

```typescript
test('LOADING', async ({ page }) => {
  await page.route('**/api/**', async (r) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await r.continue();
  });
  const spinner = page.locator('[data-testid="loading"]');
  await expect(spinner).toBeVisible();
});

test('SUCCESS', async ({ page }) => {
  const api = new MockAPI(page);
  await api.applyAllMocks();
  await page.goto('/');
  await expect(page.getByText('expected')).toBeVisible();
});

test('ERROR', async ({ page }) => {
  const api = new MockAPI(page);
  await api.mockError('**/api/system/info', 500, 'Failed');
  await page.goto('/');
  await expect(page.getByText(/error/i)).toBeVisible();
});

test('EMPTY', async ({ page }) => {
  const api = new MockAPI(page);
  await page.route('**/api/items', r => r.fulfill({
    status: 200,
    body: JSON.stringify({ items: [] })
  }));
  await page.goto('/');
  await expect(page.getByText(/empty|no data/i)).toBeVisible();
});

test('NETWORK ERROR', async ({ page }) => {
  await page.route('**/api/**', r => r.abort('connectionfailed'));
  await page.goto('/');
  await expect(page.getByText(/offline/i)).toBeVisible();
});
```

## HTTP Status Codes

```typescript
// Success responses
200  // OK (with data)
201  // Created
204  // No Content

// Client errors
400  // Bad Request
401  // Unauthorized
403  // Forbidden
404  // Not Found
429  // Too Many Requests

// Server errors
500  // Internal Server Error
502  // Bad Gateway
503  // Service Unavailable
504  // Gateway Timeout

// Mocking examples
await route.fulfill({ status: 200, body: JSON.stringify({}) });
await route.fulfill({ status: 400, body: '{"error":"Bad request"}' });
await route.abort('connectionfailed');  // Network error
```

## Waiting Properly

```typescript
// GOOD - Wait for content
await expect(page.getByText('CPU')).toBeVisible({ timeout: 5000 });

// GOOD - Wait for loading to disappear
await expect(page.locator('.spinner')).not.toBeVisible({ timeout: 5000 });

// GOOD - Custom condition
await page.waitForFunction(() => {
  return !document.querySelector('[data-loading="true"]');
});

// BAD - Never hardcode delays
await page.waitForTimeout(2000);  // DON'T DO THIS!
```

## MockAPI Class Pattern

```typescript
// Create instance
const api = new MockAPI(page);

// Apply all mocks at once
await api.applyAllMocks();

// Or individual mocks
await api.mockSystemInfo();
await api.mockWifiStatus();
await api.mockDoorStatus({ delay: 1000 });

// Mock error
await api.mockError('**/api/endpoint', 500, 'Service down');

// Mock slow
await api.mockSlow('**/api/endpoint', 3000, { data: 'here' });
```

## playwright.config.ts Settings

```typescript
use: {
  baseURL: 'http://localhost:5173',
  trace: 'on-first-retry',      // Collect trace on retry
  screenshot: 'only-on-failure', // Screenshot on error
  video: 'on-first-retry',       // Video on retry
  actionTimeout: 10000,
  navigationTimeout: 15000,
},

retries: process.env.CI ? 2 : 0,
workers: process.env.CI ? 1 : undefined,

reporter: [
  ['list'],
  ['html', { outputFolder: 'playwright-report' }],
  ...(process.env.CI ? [['github']] : []),
],
```

## GitHub Actions Upload

```yaml
- uses: actions/upload-artifact@v4
  if: always()  # Always upload reports
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7

- uses: actions/upload-artifact@v4
  if: failure()  # Only on failure
  with:
    name: playwright-traces
    path: test-results/**/*.{zip,png,webm}
    retention-days: 14
```

## Common Patterns

```typescript
// Test state changes
let state = 'loading';
await page.route('**/api/**', async (route) => {
  if (state === 'error') {
    await route.fulfill({ status: 500, body: '{"error":"fail"}' });
  } else {
    await route.continue();
  }
});

// Check for console errors
const errors: string[] = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
// Later: expect(errors).toHaveLength(0);

// Verify requests were made
const requests: string[] = [];
await page.route('**/api/**', async (route) => {
  requests.push(route.request().url());
  await route.continue();
});
// Later: expect(requests.some(r => r.includes('/api/system'))).toBeTruthy();

// Partial mock (mock one endpoint, let others through)
const api = new MockAPI(page);
await api.applyAllMocks();
// Override one:
await page.route('**/api/system/info', r => r.abort('connectionfailed'));

// Test recovery from error
let shouldFail = true;
await page.route('**/api/endpoint', async (route) => {
  if (shouldFail) {
    await route.fulfill({ status: 500, body: '{"error":"fail"}' });
  } else {
    await route.fulfill({ status: 200, body: '{"success":true}' });
  }
});
shouldFail = false;
await page.reload();
```

## Test Structure

```typescript
import { test, expect } from './fixtures/test-base';
import { createMockAPI } from './fixtures/mock-routes';

test.describe('Feature Name', () => {
  test('should handle success state', async ({ page }) => {
    const api = createMockAPI(page);
    await api.applyAllMocks();

    await page.goto('/');

    await expect(page.getByText('expected')).toBeVisible();
  });

  test('should handle error state', async ({ page }) => {
    const api = createMockAPI(page);
    await api.mockError('**/api/endpoint', 500);

    await page.goto('/');

    await expect(page.getByText(/error/i)).toBeVisible();
  });
});
```

## Debug Commands

```bash
# Run test in debug mode (interactive)
npx playwright test tests/e2e/test.spec.ts --debug

# Run single test
npx playwright test tests/e2e/test.spec.ts -g "test name"

# View HTML report
open playwright-report/index.html

# View trace
npx playwright show-trace test-results/trace.zip

# Run with verbose output
npx playwright test --reporter=verbose

# Run specific project/browser
npx playwright test --project=chromium
```

## Debugging Failing Tests

```bash
# Download artifacts from CI
gh run download <RUN_ID> -n playwright-report

# Check console messages
page.on('console', msg => console.log(msg));

# Take screenshot
await page.screenshot({ path: 'debug.png' });

# Pause execution
await page.pause();

# Wait function to inspect DOM
await page.waitForFunction(() => {
  console.log('DOM:', document.body.innerHTML);
  return true;
});
```

## File Locations

```
tests/
├── e2e/                          # E2E tests
│   ├── fixtures/
│   │   ├── test-base.ts         # Custom fixtures
│   │   └── mock-routes.ts       # MockAPI class
│   ├── smoke.spec.ts            # Basic smoke tests
│   ├── resilience.spec.ts       # Error scenarios
│   └── *.spec.ts                # Feature tests
├── unit/                         # Unit tests
└── integration/                  # Integration tests

Root:
├── playwright.config.ts          # Configuration
├── PLAYWRIGHT_BEST_PRACTICES.md  # Full guide
└── PLAYWRIGHT_QUICK_REFERENCE.md # Copy-paste templates
```

## Quick Test Template

```typescript
import { test, expect } from './fixtures/test-base';
import { createMockAPI } from './fixtures/mock-routes';

test.describe('MyFeature', () => {
  test('should show data', async ({ page }) => {
    // Setup
    const api = createMockAPI(page);
    await api.applyAllMocks();

    // Execute
    await page.goto('/');
    await page.getByRole('tab', { name: /my-feature/i }).click();

    // Assert
    await expect(page.getByText('expected data')).toBeVisible();
  });

  test('should handle error', async ({ page }) => {
    const api = createMockAPI(page);
    await api.mockError('**/api/my-endpoint', 500);

    await page.goto('/');

    await expect(page.getByText(/error/i)).toBeVisible();
  });
});
```

## Status Code Quick Map

| Code | Meaning | Mock It |
|------|---------|---------|
| 200 | OK | `status: 200, data: {...}` |
| 400 | Bad request | `status: 400, error: 'Invalid'` |
| 401 | Not authenticated | `status: 401, error: 'Auth'` |
| 403 | Not authorized | `status: 403, error: 'Access'` |
| 404 | Not found | `status: 404, error: 'Not found'` |
| 500 | Server error | `status: 500, error: 'Error'` |
| 503 | Unavailable | `status: 503, error: 'Down'` |
| Network | Connection error | `route.abort('connectionfailed')` |
| Timeout | Request timeout | `new Promise(() => {})` |

---

**Print this page** and keep it at your desk for quick reference!

For complete details, see PLAYWRIGHT_BEST_PRACTICES.md
