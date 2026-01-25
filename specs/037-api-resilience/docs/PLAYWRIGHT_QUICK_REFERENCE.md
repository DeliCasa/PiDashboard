# Playwright Quick Reference & Configuration Templates

Quick reference guide and copy-paste configurations for Playwright testing with API mocking and CI artifact uploads.

## Table of Contents

1. [page.route() Patterns](#pageroute-patterns)
2. [HTTP Status Code Handlers](#http-status-code-handlers)
3. [State Testing Checklist](#state-testing-checklist)
4. [playwright.config.ts Template](#playwrightconfigts-template)
5. [GitHub Actions Templates](#github-actions-templates)
6. [Common Test Patterns](#common-test-patterns)

---

## page.route() Patterns

### Network Abort Patterns

```typescript
// Connection failed
await page.route('**/api/**', async (route) => {
  await route.abort('connectionfailed');
});

// Connection timeout
await page.route('**/api/**', async (route) => {
  await new Promise(() => {});  // Never resolves
});

// Connection reset
await page.route('**/api/**', async (route) => {
  await route.abort('connectionreset');
});

// Connection refused
await page.route('**/api/**', async (route) => {
  await route.abort('connectionrefused');
});

// DNS failed
await page.route('**/api/**', async (route) => {
  await route.abort('addressunreachable');
});
```

### Common Route Patterns

```typescript
// Exact path
await page.route('**/api/system/info', handler);

// Wildcard subdirs
await page.route('**/api/cameras/**', handler);

// Query parameters
await page.route('**/api/devices*', handler);

// Multiple patterns (need multiple calls)
await Promise.all([
  page.route('**/api/system/**', handler),
  page.route('**/api/wifi/**', handler),
  page.route('**/api/config/**', handler)
]);

// With request method check
await page.route('**/api/config/*', async (route) => {
  if (route.request().method() === 'PUT') {
    // Handle PUT
  } else if (route.request().method() === 'GET') {
    // Handle GET
  }
});

// With URL inspection
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  if (url.includes('system')) {
    // System endpoints
  } else if (url.includes('wifi')) {
    // WiFi endpoints
  }
});

// Intercept and log
await page.route('**/api/**', async (route) => {
  console.log(`[API] ${route.request().method()} ${route.request().url()}`);
  await route.continue();  // Let request through
});

// Conditional based on body
await page.route('**/api/config/*', async (route) => {
  if (route.request().method() === 'PUT') {
    const body = route.request().postDataJSON();
    if (body?.key === 'invalid') {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Invalid key' })
      });
      return;
    }
  }
  await route.continue();
});
```

---

## HTTP Status Code Handlers

### Copy-Paste Template for All Common Codes

```typescript
// 200 OK - Success
await page.route('**/api/system/info', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: {} })
  });
});

// 201 Created
await page.route('**/api/devices', async (route) => {
  if (route.request().method() === 'POST') {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, id: 'device-1' })
    });
  }
});

// 204 No Content
await page.route('**/api/config/*', async (route) => {
  if (route.request().method() === 'DELETE') {
    await route.fulfill({
      status: 204,
      body: ''
    });
  }
});

// 400 Bad Request - Invalid input
await page.route('**/api/wifi/connect', async (route) => {
  await route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Invalid network name' })
  });
});

// 401 Unauthorized - Need auth
await page.route('**/api/**', async (route) => {
  await route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Authorization required' })
  });
});

// 403 Forbidden - Not allowed
await page.route('**/api/admin/**', async (route) => {
  await route.fulfill({
    status: 403,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Access denied' })
  });
});

// 404 Not Found
await page.route('**/api/devices/nonexistent', async (route) => {
  await route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Device not found' })
  });
});

// 409 Conflict - State conflict
await page.route('**/api/devices/provision', async (route) => {
  await route.fulfill({
    status: 409,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Device already provisioned' })
  });
});

// 429 Too Many Requests - Rate limit
await page.route('**/api/wifi/scan', async (route) => {
  await route.fulfill({
    status: 429,
    contentType: 'application/json',
    headers: { 'Retry-After': '60' },
    body: JSON.stringify({ error: 'Rate limit exceeded. Retry after 60 seconds.' })
  });
});

// 500 Internal Server Error
await page.route('**/api/system/info', async (route) => {
  await route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Internal Server Error' })
  });
});

// 502 Bad Gateway - Upstream error
await page.route('**/api/**', async (route) => {
  await route.fulfill({
    status: 502,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Bad Gateway - upstream server error' })
  });
});

// 503 Service Unavailable
await page.route('**/api/**', async (route) => {
  await route.fulfill({
    status: 503,
    contentType: 'application/json',
    headers: { 'Retry-After': '30' },
    body: JSON.stringify({ error: 'Service temporarily unavailable' })
  });
});

// 504 Gateway Timeout
await page.route('**/api/**', async (route) => {
  await route.fulfill({
    status: 504,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Gateway Timeout' })
  });
});
```

---

## State Testing Checklist

### Use this checklist for every data-fetching feature:

```typescript
test('LOADING: should show loading indicator', async ({ page }) => {
  await api.mockEndpoint({ delay: 2000 });
  await page.goto('/');
  await expect(page.locator('[data-testid="loading"]')).toBeVisible();
});

test('SUCCESS: should display data when loaded', async ({ page }) => {
  await api.mockEndpoint();
  await page.goto('/');
  await expect(page.getByText('expected content')).toBeVisible();
});

test('ERROR: should show error message on 500', async ({ page }) => {
  await api.mockEndpoint({ status: 500, error: 'Service error' });
  await page.goto('/');
  await expect(page.getByText(/error|failed/i)).toBeVisible();
});

test('ERROR 4xx: should show client error on 400', async ({ page }) => {
  await api.mockEndpoint({ status: 400, error: 'Invalid input' });
  await page.goto('/');
  await expect(page.getByText(/invalid|bad request/i)).toBeVisible();
});

test('EMPTY: should show empty state when no data', async ({ page }) => {
  await api.mockEndpoint({ data: [] });
  await page.goto('/');
  await expect(page.getByText(/no data|empty/i)).toBeVisible();
});

test('NETWORK ERROR: should handle connection failure', async ({ page }) => {
  await page.route('**/api/endpoint', r => r.abort('connectionfailed'));
  await page.goto('/');
  await expect(page.getByText(/offline|connection/i)).toBeVisible();
});

test('TIMEOUT: should handle slow responses', async ({ page }) => {
  await api.mockEndpoint({ delay: 3000 });
  await page.goto('/');
  // Either shows loading or slow indicator
  await expect(page.locator('body')).toBeVisible();
});

test('RECOVERY: should recover when API becomes available', async ({ page }) => {
  let shouldFail = true;
  await page.route('**/api/endpoint', async (route) => {
    if (shouldFail) {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: 'fail' }) });
    } else {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    }
  });

  await page.goto('/');
  await expect(page.getByText(/error/i)).toBeVisible();

  shouldFail = false;
  await page.reload();
  await expect(page.getByText('expected content')).toBeVisible();
});

test('PARTIAL FAILURE: should show partial data on mixed success/error', async ({ page }) => {
  await api.mockEndpointA();
  await page.route('**/api/endpointB', r => r.abort('connectionfailed'));

  await page.goto('/');
  await expect(page.getByText('data from A')).toBeVisible();
  // Error from B should not block display of A
  await expect(page.getByText(/error/i)).toBeVisible();
});

test('RESILIENCE: should stay responsive during slow requests', async ({ page }) => {
  await api.mockEndpoint({ delay: 2000 });
  await page.goto('/');

  // Can click buttons while loading
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('body')).toBeVisible();
});
```

---

## playwright.config.ts Template

### Production-Ready Configuration

```typescript
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.VITE_BASE_URL || 'http://localhost:5173';
const livePiUrl = process.env.LIVE_PI_URL;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // CRITICAL: Test artifact configuration
  use: {
    baseURL,

    // Trace collection for debugging
    trace: 'on-first-retry',          // Collect on first retry only
    // trace: 'on',                    // Always collect (heavy)
    // trace: 'retain-on-failure',     // Keep failed traces

    // Screenshots on failure
    screenshot: 'only-on-failure',
    // screenshot: 'on',               // Every test

    // Video recording
    video: 'on-first-retry',           // On retry for failed tests
    // video: 'on',                    // Always record
    // video: 'retain-on-failure',    // Keep only failed videos

    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ...(process.env.CI ? [['github']] : []),
  ],

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
    ...(livePiUrl
      ? [
          {
            name: 'live-pi',
            testMatch: '**/live-smoke.spec.ts',
            use: { ...devices['Desktop Chrome'], baseURL: livePiUrl },
          },
        ]
      : []),
  ],

  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    ...(livePiUrl ? { command: undefined, url: undefined } : {}),
  },

  outputDir: 'test-results',
});
```

---

## GitHub Actions Templates

### Minimal E2E Test Job

```yaml
name: E2E Tests

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci
      - run: npm run build
      - run: npx playwright test --project=chromium

      # Upload artifacts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-failures
          path: |
            test-results/**/*.png
            test-results/**/*.webm
            test-results/**/*.zip
          retention-days: 14
```

### Multi-Browser with Sharding

```yaml
name: E2E Tests (Multi-Browser)

on:
  push:
    branches: [main, dev]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox]
        shard: [1, 2]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - run: |
          npx playwright test \
            --project=${{ matrix.browser }} \
            --shard=${{ matrix.shard }}/2

      # Descriptive artifact names
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: report-${{ matrix.browser }}-shard-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 30

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: failures-${{ matrix.browser }}-shard-${{ matrix.shard }}
          path: |
            test-results/**/*.{png,webm,zip}
          retention-days: 30

  # Merge reports from all shards
  merge-reports:
    runs-on: ubuntu-latest
    needs: e2e
    if: always()

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci

      - uses: actions/download-artifact@v4
        with:
          path: all-reports
          pattern: report-*

      - run: |
          npx playwright merge-reports \
            --reporter html ./all-reports/* || true

      - uses: actions/upload-artifact@v4
        with:
          name: playwright-report-merged
          path: playwright-report/
          retention-days: 30
```

### With Accessibility & Resilience Tests

```yaml
name: Full E2E Suite

on: [push, pull_request]

jobs:
  e2e-smoke:
    name: Smoke Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci && npm run build
      - run: npx playwright test --project=chromium tests/e2e/smoke.spec.ts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: smoke-report
          path: playwright-report/
          retention-days: 7

  e2e-full:
    name: Full E2E Suite
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci && npm run build
      - run: npx playwright test --project=chromium
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-report
          path: playwright-report/
          retention-days: 30

  a11y-tests:
    name: Accessibility Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci && npm run build
      - run: npx playwright test tests/e2e/accessibility.spec.ts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: a11y-report
          path: playwright-report/
          retention-days: 30

  resilience-tests:
    name: Resilience/Error Handling Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci && npm run build
      - run: npx playwright test tests/e2e/resilience.spec.ts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: resilience-report
          path: playwright-report/
          retention-days: 30
```

---

## Common Test Patterns

### Pattern: Mock with Different Responses Based on Count

```typescript
test('should retry on failure', async ({ page }) => {
  let attempts = 0;

  await page.route('**/api/flaky-endpoint', async (route) => {
    attempts++;
    if (attempts < 3) {
      await route.abort('connectionfailed');
    } else {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    }
  });

  await page.goto('/');
  // After 3 attempts, should succeed
  await expect(page.getByText('Success')).toBeVisible({ timeout: 10000 });
});
```

### Pattern: Check for Console Errors

```typescript
test('should not log console errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  const api = new MockAPI(page);
  await api.applyAllMocks();

  await page.goto('/');
  await expect(page.getByRole('tablist')).toBeVisible();

  if (errors.length > 0) {
    console.error('Console errors found:', errors);
  }
  expect(errors).toHaveLength(0);
});
```

### Pattern: Wait for React Query Loading

```typescript
test('should wait for all queries to finish', async ({ page }) => {
  const api = new MockAPI(page);
  await api.applyAllMocks();

  await page.goto('/');

  // Wait for React Query loading states to complete
  await page.waitForFunction(() => {
    // Assumes app sets data-loading attribute
    return !document.querySelector('[data-loading="true"]');
  }, { timeout: 10000 });

  // Now all data should be loaded
  await expect(page.getByRole('tablist')).toBeVisible();
});
```

### Pattern: Verify Network Request Was Made

```typescript
test('should make expected API calls', async ({ page }) => {
  const requests: string[] = [];

  await page.route('**/api/**', async (route) => {
    requests.push(route.request().url());
    await route.continue();
  });

  const api = new MockAPI(page);
  await api.applyAllMocks();

  await page.goto('/');
  await page.getByRole('tab', { name: /system/i }).click();

  // Verify system/info was requested
  expect(requests.some(r => r.includes('/system/info'))).toBeTruthy();
  expect(requests.some(r => r.includes('/wifi/status'))).toBeTruthy();
});
```

### Pattern: Simulate Slow Network with Network Conditions

```typescript
test('should remain responsive on slow 3G', async ({ browser }) => {
  const context = await browser.newContext({
    // Simulate 3G
    extraHTTPHeaders: {},
  });

  const page = await context.newPage();

  // Manually add delays to simulate slow network
  await page.route('**/api/**', async (route) => {
    await new Promise(r => setTimeout(r, 1000));  // 1s delay
    await route.continue();
  });

  const api = new MockAPI(page);
  await api.applyAllMocks();

  await page.goto('/');

  // UI should still be interactive
  await expect(page.getByRole('tablist')).toBeVisible();

  // Tab switching should work
  await page.getByRole('tab', { name: /wifi/i }).click();
  await expect(page.getByRole('tab', { name: /wifi/i })).toHaveAttribute('data-state', 'active');
});
```

---

## Accessing Test Results

### View reports locally

```bash
# Open HTML report
open playwright-report/index.html

# View traces
npx playwright show-trace test-results/trace.zip

# View screenshots
open test-results/screenshot.png

# View videos
open test-results/video.webm
```

### Download from GitHub Actions

```bash
# List runs
gh run list

# Download specific artifact
gh run download <RUN_ID> -n playwright-report

# Extract
unzip -r all-reports/

# View
open all-reports/*/index.html
```

---

## Debugging Tips

### Enable verbose logging

```typescript
test('debug', async ({ page }) => {
  // Log all network activity
  page.on('request', request =>
    console.log('>>', request.method(), request.url())
  );
  page.on('response', response =>
    console.log('<<', response.status(), response.url())
  );

  await page.goto('/');
});
```

### Pause on failure

```bash
# Run tests with pause on failure
npx playwright test --debug

# Or programmatically
await page.pause();  // Pauses test execution
```

### Increase timeouts for debugging

```bash
# Override timeout globally
npx playwright test --timeout=120000

# Or per test
test('long running test', async ({ page }) => {
  test.setTimeout(120000);
  // test code
});
```

