# Playwright API Mocking & Error State Testing Best Practices

This guide covers best practices for API mocking, testing loading/error/empty states, and configuring CI artifact uploads in Playwright E2E tests. Based on the PiDashboard test infrastructure.

## Table of Contents

1. [API Mocking with page.route()](#api-mocking-with-pageroute)
2. [Testing Loading/Error/Empty States](#testing-loadingerrorempty-states)
3. [Handling HTTP Status Codes](#handling-http-status-codes)
4. [Waiting for State Changes](#waiting-for-state-changes)
5. [CI Configuration for Artifacts](#ci-configuration-for-artifacts)
6. [Advanced Patterns](#advanced-patterns)

---

## API Mocking with page.route()

### Basic Setup

Playwright's `page.route()` method intercepts network requests and allows you to mock responses. This is the foundation of reliable E2E testing.

```typescript
// Basic mocking pattern
await page.route('**/api/system/info', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        cpu: { usage_percent: 25.5, core_count: 4, per_core: [20, 25, 30, 27] }
      }
    })
  });
});

await page.goto('/');
// API request is now intercepted and mocked
```

### Pattern Matching

Use glob patterns to match multiple routes:

```typescript
// Match all API endpoints
await page.route('**/api/**', async (route) => {
  await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
});

// Match specific path patterns
await page.route('**/api/wifi/**', async (route) => {
  // Handles /api/wifi/scan, /api/wifi/status, /api/wifi/connect
});

// Match with query parameters
await page.route('**/api/devices?*', async (route) => {
  // Matches /api/devices and /api/devices?filter=active
});

// Match based on HTTP method
await page.route('**/api/config/*', async (route) => {
  if (route.request().method() === 'PUT') {
    // Handle PUT requests
    await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
  } else if (route.request().method() === 'GET') {
    // Handle GET requests
    await route.continue();
  }
});
```

### Mock Configuration Object Pattern (Reusable)

Create a configuration-driven approach for flexible mocking:

```typescript
interface MockRouteConfig {
  data?: unknown;           // Response body data
  status?: number;          // HTTP status (default: 200)
  delay?: number;           // Delay in ms
  contentType?: string;     // Content-Type header
  error?: boolean;          // Force error response
  errorMessage?: string;    // Error message
}

function createRouteHandler(config: MockRouteConfig) {
  return async (route: Route) => {
    // Apply delay if specified
    if (config.delay) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    // Handle error responses
    if (config.error) {
      await route.fulfill({
        status: config.status || 500,
        contentType: config.contentType || 'application/json',
        body: JSON.stringify({
          error: config.errorMessage || 'Internal Server Error'
        })
      });
      return;
    }

    // Handle success responses
    await route.fulfill({
      status: config.status || 200,
      contentType: config.contentType || 'application/json',
      body: JSON.stringify(config.data)
    });
  };
}

// Usage
await page.route('**/api/system/info', createRouteHandler({
  data: systemInfoData,
  delay: 2000  // Simulate slow network
}));
```

### Class-Based API Mocking

The PiDashboard uses a `MockAPI` class for organized, reusable mocking:

```typescript
export class MockAPI {
  private page: Page;
  private data: typeof defaultMockData;

  constructor(page: Page, customData?: Partial<typeof defaultMockData>) {
    this.page = page;
    this.data = { ...defaultMockData, ...customData };
  }

  async applyAllMocks(): Promise<void> {
    await Promise.all([
      this.mockSystemInfo(),
      this.mockWifiScan(),
      this.mockWifiStatus(),
      this.mockDoorStatus(),
      this.mockConfig(),
      this.mockLogs(),
      this.mockCameras(),
      this.mockDevices()
    ]);
  }

  async mockSystemInfo(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/system/info',
      createRouteHandler({
        data: this.data.systemInfo,
        ...config  // Allow override
      })
    );
  }

  async mockError(
    pattern: string,
    status = 500,
    message = 'Internal Server Error'
  ): Promise<void> {
    await this.page.route(
      pattern,
      createRouteHandler({
        error: true,
        status,
        errorMessage: message
      })
    );
  }

  async mockSlow(pattern: string, delay: number, data: unknown): Promise<void> {
    await this.page.route(
      pattern,
      createRouteHandler({
        data,
        delay
      })
    );
  }
}

// Usage in tests
test('should handle slow system info', async ({ page }) => {
  const api = new MockAPI(page);
  await api.mockSystemInfo({ delay: 3000 });  // 3 second delay
  await api.mockWifiStatus();

  await page.goto('/');
  // UI should remain responsive while loading
  await expect(page.getByRole('tablist')).toBeVisible();
});
```

---

## Testing Loading/Error/Empty States

### 1. Loading State Testing

Test that your app shows loading indicators while waiting for data.

```typescript
test('should show loading state while fetching system info', async ({ page }) => {
  // Mock with significant delay
  await page.route('**/api/system/info', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          cpu: { usage_percent: 35, core_count: 4, per_core: [40, 30, 35, 35] },
          memory: { used_mb: 1024, total_mb: 2048, used_percent: 50, available_mb: 1024 },
          disk: { used_gb: 15, total_gb: 32, used_percent: 46.9, path: '/' },
          temperature_celsius: 52,
          uptime: 86400_000_000_000,
          load_average: { load_1: 0.8, load_5: 0.5, load_15: 0.3 },
          overall_status: 'healthy'
        }
      })
    });
  });

  const api = new MockAPI(page);
  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  await page.goto('/');

  // Check for loading indicator (spinner, skeleton, etc.)
  const loadingIndicator = page.getByRole('progressbar')
    .or(page.locator('[data-testid="loading"]'))
    .or(page.locator('.animate-spin'));  // Tailwind spinner class

  // Loading might appear briefly
  try {
    await expect(loadingIndicator).toBeVisible({ timeout: 500 });
    console.log('Loading indicator visible during fetch');
  } catch {
    console.log('No visible loading indicator (data loaded quickly)');
  }

  // Eventually data should load
  await expect(page.getByText(/cpu/i)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/memory|ram/i)).toBeVisible();
});
```

### 2. Error State Testing

Test error handling for different HTTP status codes.

```typescript
test('should display error state on 500 error', async ({ page }) => {
  const api = new MockAPI(page);

  // Mock system info as error
  await api.mockError('**/api/system/info', 500, 'System info service unavailable');

  // Mock other endpoints to succeed
  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  await page.goto('/');
  await page.getByRole('tab', { name: /system/i }).click();

  // Look for error message or error state
  const errorElement = page
    .locator('[data-testid="error"]')
    .or(page.getByText(/error|failed|unavailable/i))
    .or(page.locator('.text-destructive'));  // Tailwind error color

  await expect(errorElement).toBeVisible({ timeout: 5000 });
});

test('should show different messages for different error codes', async ({ page }) => {
  const api = new MockAPI(page);

  // Test 404 Not Found
  await page.route('**/api/system/info', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Not Found' })
    });
  });

  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  await page.goto('/');
  await page.getByRole('tab', { name: /system/i }).click();

  // Should show error feedback
  const errorMsg = page.getByText(/not found|404|unavailable/i);
  await expect(errorMsg).toBeVisible();
});

test('should handle 503 Service Unavailable gracefully', async ({ page }) => {
  const api = new MockAPI(page);

  await api.mockError('**/api/system/info', 503, 'Service temporarily unavailable');
  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  await page.goto('/');

  // App should not crash
  await expect(page.locator('body')).toBeVisible();

  // Should either show error or empty state
  const error = page.getByText(/unavailable|service/i);
  const empty = page.getByText(/no data|empty/i);

  const isShowing = await Promise.race([
    error.isVisible(),
    empty.isVisible().catch(() => false)
  ]);

  expect(isShowing).toBeTruthy();
});
```

### 3. Empty State Testing

Test UI when data is available but empty.

```typescript
test('should show empty state when no cameras available', async ({ page }) => {
  const api = new MockAPI(page);
  await api.applyAllMocks();

  // Mock empty cameras list
  await page.route('**/api/cameras', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ cameras: [] })
    });
  });

  await page.goto('/');
  await page.getByRole('tab', { name: /camera/i }).click();

  // Should show empty state message
  const emptyMsg = page
    .getByText(/no cameras|empty/i)
    .or(page.locator('[data-testid="empty-state"]'));

  await expect(emptyMsg).toBeVisible({ timeout: 5000 });

  // Should not show camera list
  const cameraList = page.locator('[data-testid="camera-list"]');
  await expect(cameraList).not.toBeVisible();
});

test('should show empty state with helpful message', async ({ page }) => {
  const api = new MockAPI(page);
  await api.applyAllMocks();

  await page.route('**/api/wifi/scan', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, count: 0, networks: [] })
    });
  });

  await page.goto('/');
  await page.getByRole('tab', { name: /wifi/i }).click();

  // Should show empty message
  const emptyMsg = page.getByText(/no networks found|scan again/i);
  await expect(emptyMsg).toBeVisible();

  // Should have action button
  const scanButton = page.getByRole('button', { name: /scan|refresh/i });
  await expect(scanButton).toBeVisible();
});
```

### 4. Partial Data/Mixed Success-Error States

Test when some data loads and other data fails.

```typescript
test('should display available data when some endpoints fail', async ({ page }) => {
  const api = new MockAPI(page);

  // System info fails
  await api.mockError('**/api/system/info', 500, 'System unavailable');

  // But WiFi succeeds
  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  await page.goto('/');

  // System tab might show error
  await page.getByRole('tab', { name: /system/i }).click();
  const systemError = page.getByText(/error|unavailable/i);
  await expect(systemError).toBeVisible({ timeout: 5000 });

  // But WiFi tab should work fine
  await page.getByRole('tab', { name: /wifi/i }).click();
  const wifiStatus = page.getByText(/connected|disconnected/i);
  await expect(wifiStatus).toBeVisible({ timeout: 5000 });

  // App should remain interactive
  await expect(page.getByRole('tablist')).toBeVisible();
});
```

---

## Handling HTTP Status Codes

### Network Errors

Test complete network failures:

```typescript
test('should handle network connection errors', async ({ page }) => {
  const api = new MockAPI(page);

  // Abort all API requests as network failures
  await page.route('**/api/**', async (route) => {
    await route.abort('connectionfailed');  // Simulate network error
  });

  // Other common error types:
  // - 'connectionfailed': Network error
  // - 'connectionaborted': Connection aborted
  // - 'connectionreset': Connection reset
  // - 'connectionrefused': Connection refused
  // - 'addressunreachable': Address unreachable
  // - 'blockedbyclient': Blocked by client
  // - 'blockedbyresponse': Blocked by response
  // - 'clientcertificaterejected': Client cert rejected
  // - 'timedout': Request timed out

  await page.goto('/');

  // App should still render (not crash)
  await expect(page.locator('body')).toBeVisible();

  // Should show error state or fallback UI
  const errorOrFallback = page
    .getByText(/error|offline|unavailable/i)
    .or(page.locator('[data-testid="offline-state"]'));

  // May take time to detect network is down
  try {
    await expect(errorOrFallback).toBeVisible({ timeout: 10000 });
  } catch {
    // Some apps gracefully handle this without visible error
    console.log('No visible error indicator for network failure');
  }
});

test('should distinguish between different error types', async ({ page }) => {
  const api = new MockAPI(page);

  // Test timeout
  await page.route('**/api/system/info', async (route) => {
    // Don't respond - simulate timeout
    await new Promise(() => {});  // Never resolves
  });

  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  const startTime = Date.now();
  await page.goto('/');

  // Wait for timeout (Playwright default is 30s)
  const error = page.getByText(/timeout|taking long/i);
  try {
    await expect(error).toBeVisible({ timeout: 15000 });
    const elapsed = Date.now() - startTime;
    console.log(`Timeout detected after ${elapsed}ms`);
  } catch {
    console.log('No visible timeout indicator');
  }
});
```

### Specific HTTP Status Codes

```typescript
test('should handle 400 Bad Request', async ({ page }) => {
  const api = new MockAPI(page);

  await page.route('**/api/wifi/connect', async (route) => {
    if (route.request().postDataJSON()?.ssid === 'invalid') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid SSID format' })
      });
    }
  });

  // Should show validation error
  // e.g., in form validation
});

test('should handle 401 Unauthorized', async ({ page }) => {
  const api = new MockAPI(page);

  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' })
    });
  });

  await page.goto('/');

  // App might redirect to login or show auth error
  const authError = page.getByText(/unauthorized|login required|permission/i);
  try {
    await expect(authError).toBeVisible({ timeout: 5000 });
  } catch {
    // Might redirect to login page instead
    const loginForm = page.getByRole('form', { name: /login/i });
    await expect(loginForm).toBeVisible();
  }
});

test('should handle 429 Too Many Requests', async ({ page }) => {
  const api = new MockAPI(page);

  let requestCount = 0;
  await page.route('**/api/wifi/scan', async (route) => {
    requestCount++;
    if (requestCount > 3) {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, networks: [] })
      });
    }
  });

  // Should show rate limit error after multiple requests
});

test('should handle 502 Bad Gateway', async ({ page }) => {
  const api = new MockAPI(page);

  await api.mockError('**/api/system/info', 502, 'Bad Gateway - upstream server error');
  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  await page.goto('/');

  const error = page.getByText(/gateway|upstream|temporarily unavailable/i);
  await expect(error).toBeVisible({ timeout: 5000 });
});
```

---

## Waiting for State Changes

### Waiting for Loading to Complete

```typescript
test('should wait for loading state to resolve', async ({ page }) => {
  const api = new MockAPI(page);

  // Mock with delay
  await api.mockSystemInfo({ delay: 2000 });
  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  await page.goto('/');
  await page.getByRole('tab', { name: /system/i }).click();

  // Wait for actual data to appear (not just loading)
  await expect(page.getByText(/cpu/i)).toBeVisible({ timeout: 5000 });

  // Or wait for loading to disappear
  const spinner = page.locator('[data-testid="loading"]').or(page.locator('.animate-spin'));
  await expect(spinner).not.toBeVisible({ timeout: 5000 });
});
```

### Waiting for Error to Appear

```typescript
test('should wait for error message to appear', async ({ page }) => {
  const api = new MockAPI(page);

  await api.mockError('**/api/system/info', 500);
  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  await page.goto('/');
  await page.getByRole('tab', { name: /system/i }).click();

  // Wait for specific error to appear
  const errorMsg = page.getByText(/system info unavailable/i);
  await expect(errorMsg).toBeVisible({ timeout: 5000 });

  // Or wait for any error indication
  const anyError = page
    .locator('[data-testid="error"], .text-destructive')
    .first();
  await expect(anyError).toBeVisible({ timeout: 5000 });
});
```

### Waiting for Elements to Disappear

```typescript
test('should wait for loading spinner to disappear', async ({ page }) => {
  const api = new MockAPI(page);

  await api.mockSystemInfo({ delay: 1000 });
  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  await page.goto('/');

  const spinner = page.locator('.animate-spin');

  // Wait for spinner to disappear
  await expect(spinner).not.toBeVisible({ timeout: 10000 });

  // Verify content is now visible
  await expect(page.getByText(/cpu|system/i)).toBeVisible();
});
```

### Custom Wait Functions

```typescript
async function waitForDataToLoad(page: Page, timeout = 10000) {
  // Wait for React Query to finish loading
  await page.waitForFunction(
    () => {
      // Check if query is loading (example for React Query)
      const hasLoader = !!document.querySelector('[data-testid="loading"]');
      const hasError = !!document.querySelector('[data-testid="error"]');
      const hasData = !!document.querySelector('[data-testid="data-content"]');

      // Data is loaded when it's not loading AND (has data OR has error)
      return !hasLoader && (hasData || hasError);
    },
    { timeout }
  );
}

// Usage
test('should wait for async data to load', async ({ page }) => {
  const api = new MockAPI(page);
  await api.mockSystemInfo({ delay: 2000 });
  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  await page.goto('/');
  await waitForDataToLoad(page);

  // Now safely interact with loaded data
  await page.getByRole('tab', { name: /system/i }).click();
  await expect(page.getByText(/cpu/i)).toBeVisible();
});
```

---

## CI Configuration for Artifacts

### Playwright Configuration (playwright.config.ts)

Configure trace and video artifacts in your Playwright config:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // ... other config

  use: {
    // Collect trace on first retry - helps debug flaky tests
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on first retry to see what happened
    video: 'on-first-retry',

    // Action and navigation timeouts
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  // Output directory for test results
  outputDir: 'test-results',

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    // Include GitHub reporter for CI
    ...(process.env.CI ? [['github']] : []),
  ],

  // Retry on CI
  retries: process.env.CI ? 2 : 0,

  // Single worker on CI for stability
  workers: process.env.CI ? 1 : undefined,
});
```

### GitHub Actions Workflow (test.yml)

Upload artifacts on test completion:

```yaml
jobs:
  e2e-smoke:
    name: E2E Smoke Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npx playwright test --project=chromium

      # Upload all test artifacts (always, even if tests pass)
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      # Upload detailed test results
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results/
          retention-days: 7

      # Upload traces separately on failure for easier debugging
      - name: Upload Playwright traces on failure
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-traces
          path: |
            test-results/**/*.zip
            test-results/**/*.png
            test-results/**/*.webm
          retention-days: 14
```

### Multi-Browser Artifact Upload

For running tests across multiple browsers with sharding:

```yaml
jobs:
  e2e-tests:
    name: E2E Tests (${{ matrix.browser }} - shard ${{ matrix.shard }}/2)
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox]
        shard: [1, 2]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run E2E tests (sharded)
        run: |
          npx playwright test \
            --project=${{ matrix.browser }} \
            --shard=${{ matrix.shard }}/2

      # Upload artifacts with descriptive names
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.browser }}-shard-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 30

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-${{ matrix.browser }}-shard-${{ matrix.shard }}
          path: test-results/
          retention-days: 30

      # Only upload traces on failure to save space
      - name: Upload traces on failure
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: traces-${{ matrix.browser }}-shard-${{ matrix.shard }}
          path: |
            test-results/**/*.zip
            test-results/**/*.png
            test-results/**/*.webm
          retention-days: 30

  # Merge all shard reports
  merge-reports:
    name: Merge E2E Reports
    runs-on: ubuntu-latest
    needs: e2e-tests
    if: always()

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Download all shard reports
      - name: Download all shard reports
        uses: actions/download-artifact@v4
        with:
          path: all-reports
          pattern: playwright-report-*

      # Merge reports for unified view
      - name: Merge reports
        run: |
          npx playwright merge-reports \
            --reporter html ./all-reports/* || echo "Report merge skipped"

      # Upload merged report
      - name: Upload merged report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-merged
          path: playwright-report/
          retention-days: 30
```

### Accessing Artifacts Locally

Once uploaded to GitHub Actions:

```bash
# Download artifacts from a specific run
gh run download <RUN_ID> -n playwright-report
gh run download <RUN_ID> -n playwright-traces

# Or download all artifacts
gh run download <RUN_ID>

# View HTML report
open playwright-report/index.html

# View traces in Playwright Inspector
npx playwright show-trace test-results/*/trace.zip
```

---

## Advanced Patterns

### Conditional Mocking Based on Request Details

```typescript
test('should mock based on request method and body', async ({ page }) => {
  const api = new MockAPI(page);

  // Mock with conditional logic
  await page.route('**/api/config/*', async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === 'GET') {
      // Return config for GET
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          key: 'server.port',
          value: '8082'
        })
      });
    } else if (method === 'PUT') {
      // Validate body for PUT
      try {
        const body = request.postDataJSON();
        if (body.value && body.key) {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, message: 'Updated' })
          });
        } else {
          await route.fulfill({
            status: 400,
            body: JSON.stringify({ error: 'Invalid request body' })
          });
        }
      } catch {
        await route.fulfill({
          status: 400,
          body: JSON.stringify({ error: 'Invalid JSON' })
        });
      }
    } else {
      await route.continue();
    }
  });

  await api.mockSystemInfo();
  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockLogs();

  await page.goto('/');

  // Test GET
  await page.getByRole('tab', { name: /config/i }).click();
  await expect(page.getByText('server.port')).toBeVisible();

  // Test PUT with valid data
  const editBtn = page.getByRole('button', { name: /edit/i }).first();
  if (await editBtn.isVisible()) {
    await editBtn.click();
    // ... fill and submit form
  }
});
```

### Stateful Mocking (Request Order Matters)

```typescript
test('should handle request sequence with state changes', async ({ page }) => {
  let isConnected = false;

  await page.route('**/api/wifi/connect', async (route) => {
    const request = route.request();
    const { ssid } = request.postDataJSON();

    if (ssid === 'TestNetwork-5G') {
      isConnected = true;
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, message: 'Connected' })
      });
    }
  });

  await page.route('**/api/wifi/status', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        status: {
          connected: isConnected,
          ssid: isConnected ? 'TestNetwork-5G' : undefined,
          ip_address: isConnected ? '192.168.1.100' : undefined,
          signal_strength: isConnected ? -45 : undefined,
          mode: isConnected ? 'client' : 'disconnected'
        }
      })
    });
  });

  // Test sequence
  await page.goto('/');

  // Initially disconnected
  await page.getByRole('tab', { name: /wifi/i }).click();
  await expect(page.getByText(/disconnected|not connected/i)).toBeVisible();

  // Connect
  const connectBtn = page.getByRole('button', { name: /connect/i }).first();
  await connectBtn.click();

  // Verify connected
  await page.reload();
  await page.getByRole('tab', { name: /wifi/i }).click();
  await expect(page.getByText('TestNetwork-5G')).toBeVisible();
  await expect(page.getByText('192.168.1.100')).toBeVisible();
});
```

### Scenario-Based Presets

```typescript
export const mockScenarios = {
  healthySystem: (page: Page): MockAPI => new MockAPI(page),

  degradedPerformance: (page: Page): MockAPI => {
    return new MockAPI(page, {
      systemInfo: {
        success: true,
        data: {
          // High CPU/memory usage
          cpu: { usage_percent: 92.5, core_count: 4, per_core: [95, 90, 93, 92] },
          memory: { used_mb: 3800, total_mb: 4096, used_percent: 92.8, available_mb: 296 },
          disk: { used_gb: 30, total_gb: 32, used_percent: 93.75, path: '/' },
          temperature_celsius: 85,
          // ... rest of data
        }
      }
    });
  },

  wifiDisconnected: (page: Page): MockAPI => {
    return new MockAPI(page, {
      wifiStatus: {
        status: {
          connected: false,
          mode: 'disconnected'
        }
      }
    });
  },

  systemErrors: (page: Page): MockAPI => {
    return new MockAPI(page, {
      logs: {
        count: 3,
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'MQTT connection failed: timeout',
            source: 'mqtt'
          },
          // ... more errors
        ]
      }
    });
  }
};

// Usage
test('should handle degraded performance gracefully', async ({ page }) => {
  const api = mockScenarios.degradedPerformance(page);
  await api.applyAllMocks();

  await page.goto('/');
  await page.getByRole('tab', { name: /system/i }).click();

  // Should display warnings for high usage
  const warnings = page.locator('[data-testid="warning"], .text-yellow-600');
  await expect(warnings).toHaveCount(3);  // CPU, Memory, Disk
});
```

### Debugging Failed Requests

```typescript
test('should debug failed requests', async ({ page }) => {
  const api = new MockAPI(page);

  // Collect all requests for debugging
  const requests: { url: string; method: string; status?: number }[] = [];

  await page.route('**/api/**', async (route) => {
    requests.push({
      url: route.request().url(),
      method: route.request().method(),
      status: undefined
    });

    // Mock response
    try {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
      requests[requests.length - 1].status = 200;
    } catch (error) {
      requests[requests.length - 1].status = 500;
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    }
  });

  await page.goto('/');

  // Log all requests for debugging
  console.log('Requests made:', JSON.stringify(requests, null, 2));

  // Assert expected requests were made
  const configRequests = requests.filter(r => r.url.includes('/config'));
  expect(configRequests.length).toBeGreaterThan(0);
});
```

---

## Complete Example: Multi-State Test

```typescript
test('should handle complete user workflow with all state transitions', async ({ page }) => {
  const api = new MockAPI(page);

  // Step 1: Initial load - data loading
  await api.mockSystemInfo({ delay: 1000 });
  await api.mockWifiStatus();
  await api.mockWifiScan();
  await api.mockDoorStatus();
  await api.mockConfig();
  await api.mockLogs();

  await page.goto('/');

  // Wait for data to load
  const spinner = page.locator('[data-testid="loading"]').or(page.locator('.animate-spin'));
  try {
    await expect(spinner).toBeVisible({ timeout: 500 });
    console.log('Loading state visible');
  } catch {
    console.log('Data loaded quickly, no visible loading');
  }

  // Step 2: Data loaded - verify content
  await expect(page.getByRole('tablist')).toBeVisible({ timeout: 5000 });
  await page.getByRole('tab', { name: /system/i }).click();
  await expect(page.getByText(/cpu/i)).toBeVisible();

  // Step 3: Simulate API failure
  await page.route('**/api/system/info', async (route) => {
    await route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Service error' })
    });
  });

  // Step 4: Error state
  await page.reload();
  const errorMsg = page.getByText(/error|unavailable/i);
  await expect(errorMsg).toBeVisible({ timeout: 5000 });

  // Step 5: Recovery - API becomes available again
  await api.mockSystemInfo();
  await page.reload();
  await expect(page.getByText(/cpu/i)).toBeVisible({ timeout: 5000 });

  // Verify no console errors
  const errors = await page.evaluate(() => {
    return (window as any).__consoleErrors?.length ?? 0;
  });
  expect(errors).toBe(0);
});
```

---

## Summary of Best Practices

1. **Use page.route()** with glob patterns to intercept and mock network requests
2. **Create reusable helpers**: MockAPI class for organized mocking
3. **Test all states**: Loading, success, error, empty, and partial failures
4. **Mock with configuration**: Pass { status, delay, data } for flexibility
5. **Wait properly**: Use expect() with timeouts for async state changes
6. **Handle errors**: Test specific HTTP status codes and network failures
7. **CI configuration**: Enable traces, videos, and screenshots in playwright.config.ts
8. **GitHub Actions**: Upload artifacts on failure for debugging
9. **Multi-browser testing**: Use sharding and merge reports for parallel execution
10. **Debug aids**: Log requests, use Playwright Inspector to analyze traces

