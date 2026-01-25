# Real PiDashboard Examples: API Mocking & Error State Testing

This document shows actual patterns used in the PiDashboard test suite, with real examples you can adapt.

## Table of Contents

1. [MockAPI Class Usage](#mockapi-class-usage)
2. [Error State Examples from resilience.spec.ts](#error-state-examples)
3. [Loading State Patterns](#loading-state-patterns)
4. [Complex Scenarios](#complex-scenarios)
5. [Playwright Config Integration](#playwright-config-integration)

---

## MockAPI Class Usage

### Basic Setup Pattern (from test-base.ts)

The PiDashboard's `MockAPI` class provides a clean, reusable approach:

```typescript
// File: tests/e2e/fixtures/mock-routes.ts

export class MockAPI {
  private page: Page;
  private data: typeof defaultMockData;

  constructor(page: Page, customData?: Partial<typeof defaultMockData>) {
    this.page = page;
    this.data = { ...defaultMockData, ...customData };
  }

  // Apply all mocks at once
  async applyAllMocks(): Promise<void> {
    await Promise.all([
      this.mockSystemInfo(),
      this.mockWifiScan(),
      this.mockWifiStatus(),
      this.mockDoorStatus(),
      this.mockConfig(),
      this.mockLogs(),
      this.mockCameras(),
      this.mockDevices(),
      this.mockNetwork(),
    ]);
  }

  // Individual mock methods
  async mockSystemInfo(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/system/info',
      createRouteHandler({
        data: this.data.systemInfo,
        ...config
      })
    );
  }

  async mockWifiScan(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/wifi/scan',
      createRouteHandler({
        data: this.data.wifiScan,
        ...config
      })
    );
  }

  // Error handling
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

  // Slow responses
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
import { createMockAPI } from './fixtures/mock-routes';

test('system info test', async ({ page }) => {
  const api = createMockAPI(page);
  await api.mockSystemInfo({ delay: 1000 });
  await api.mockWifiStatus();
  // ... etc
});
```

---

## Error State Examples (from resilience.spec.ts)

### T052: Network Failure Resilience

Real example from PiDashboard's error handling tests:

```typescript
/**
 * T052 [US3] Network Failure E2E Tests
 * Tests for handling network disconnections and reconnections
 */
test.describe('Network Failure Resilience (T052)', () => {
  test('should show error state when API is unreachable', async ({ page }) => {
    // Mock all endpoints to fail with network error
    await page.route('**/api/**', async (route) => {
      await route.abort('connectionfailed');
    });

    await page.goto('/');

    // App should still render (not crash)
    await expect(page.locator('body')).toBeVisible();

    // Should show some error indication or loading state
    // The app shouldn't crash but may show error boundaries or loading states
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 10000 });
  });

  test('should recover when API becomes available', async ({ page }) => {
    let shouldFail = true;

    // Initially fail, then succeed
    await page.route('**/api/system/info', async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service unavailable' }),
        });
      } else {
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
              overall_status: 'healthy',
            },
          }),
        });
      }
    });

    // Mock other endpoints to succeed
    const mockAPI = createMockAPI(page);
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');
    await page.getByRole('tab', { name: /system/i }).click();

    // Wait for initial load (may show error or loading)
    await page.waitForTimeout(500);

    // Now fix the API
    shouldFail = false;

    // Reload to trigger recovery
    await page.reload();
    await page.getByRole('tab', { name: /system/i }).click();

    // Should now show system metrics
    await expect(page.getByText(/cpu/i)).toBeVisible({ timeout: 10000 });
  });

  test('should maintain UI responsiveness during slow network', async ({ page }) => {
    // Mock very slow responses (3 seconds)
    await page.route('**/api/system/info', async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
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
            overall_status: 'healthy',
          },
        }),
      });
    });

    const mockAPI = createMockAPI(page);
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');

    // Tab navigation should still work during slow network
    await expect(page.getByRole('tablist')).toBeVisible();

    // Should be able to switch tabs
    await page.getByRole('tab', { name: /wifi/i }).click();
    await expect(page.getByRole('tab', { name: /wifi/i })).toHaveAttribute('data-state', 'active');

    // Go back to system tab
    await page.getByRole('tab', { name: /system/i }).click();
    await expect(page.getByRole('tab', { name: /system/i })).toHaveAttribute('data-state', 'active');
  });
});
```

### T053: API Timeout E2E Tests

```typescript
test.describe('API Timeout Scenarios (T053)', () => {
  test('should handle slow WiFi scan gracefully', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    // Override WiFi scan to be slow
    await page.route('**/api/wifi/scan', async (route) => {
      await new Promise((r) => setTimeout(r, 5000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 2,
          networks: [{ ssid: 'SlowNetwork', signal: -50, security: 'WPA2', channel: 6 }],
          success: true,
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('tab', { name: /wifi/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');

    // UI should remain responsive
    await expect(page.getByRole('tablist')).toBeVisible();

    // User can still navigate away
    await page.getByRole('tab', { name: /system/i }).click();
    await expect(page.getByRole('tab', { name: /system/i })).toHaveAttribute('data-state', 'active');
  });

  test('should show appropriate feedback during long operations', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    // Mock slow config update
    await page.route('**/api/dashboard/config/*', async (route) => {
      if (route.request().method() === 'PUT') {
        await new Promise((r) => setTimeout(r, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');
    await page.getByRole('tab', { name: /config/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');

    // Wait for config to load
    await expect(page.getByText('server.port')).toBeVisible();

    // Find and click edit button
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    if (await editButton.isVisible({ timeout: 1000 })) {
      await editButton.click();

      // Try to save - may show loading state
      const saveButton = page.locator('button:has(svg.lucide-check)').first();
      if (await saveButton.isVisible({ timeout: 1000 })) {
        await saveButton.click();

        // UI should remain responsive during save
        await expect(page.getByRole('tablist')).toBeVisible();
      }
    }
  });

  test('should not block UI when multiple requests are slow', async ({ page }) => {
    // Make all API requests slow
    await page.route('**/api/**', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));

      // Return appropriate response based on endpoint
      const url = route.request().url();
      if (url.includes('/system/info')) {
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
              overall_status: 'healthy',
            },
          }),
        });
      } else if (url.includes('/wifi/status')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: { connected: true, ssid: 'Test', ip: '192.168.1.1', signal: -50 } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });

    await page.goto('/');

    // UI should still be interactive while requests are pending
    await expect(page.getByRole('tablist')).toBeVisible();

    // Should be able to navigate between tabs
    await page.getByRole('tab', { name: /wifi/i }).click();
    await expect(page.getByRole('tab', { name: /wifi/i })).toHaveAttribute('data-state', 'active');

    await page.getByRole('tab', { name: /config/i }).click();
    await expect(page.getByRole('tab', { name: /config/i })).toHaveAttribute('data-state', 'active');
  });
});
```

### T054: Partial Failure E2E Scenarios

```typescript
test.describe('Partial Failure E2E Scenarios (T054)', () => {
  test('should display available data when some endpoints fail', async ({ page }) => {
    // System info fails, but WiFi succeeds
    await page.route('**/api/system/info', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'System info unavailable' }),
      });
    });

    const mockAPI = createMockAPI(page);
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');

    // WiFi tab should still work
    await page.getByRole('tab', { name: /wifi/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');

    // WiFi content should be visible
    await expect(page.getByText(/connected|disconnected/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show mixed success/error states in System tab', async ({ page }) => {
    // Mock system info with missing network data
    await page.route('**/api/system/info', async (route) => {
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
            overall_status: 'healthy',
            // Tailscale and bridge server data missing
            tailscale_status: null,
            bridge_server: null,
          },
        }),
      });
    });

    const mockAPI = createMockAPI(page);
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockConfig();
    await mockAPI.mockLogs();

    await page.goto('/');
    await page.getByRole('tab', { name: /system/i }).click();

    // Core metrics should still display
    await expect(page.getByText(/cpu/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/memory|ram/i)).toBeVisible();
    await expect(page.getByText(/disk|storage/i)).toBeVisible();
  });
});
```

---

## Loading State Patterns

### Pattern: Multiple Endpoints with Different Delays

```typescript
test('should show loading states for tabs with different speeds', async ({ page }) => {
  const api = createMockAPI(page);

  // System info loads in 1 second
  await api.mockSystemInfo({ delay: 1000 });

  // WiFi scans take 3 seconds
  await api.mockWifiScan({ delay: 3000 });

  // Door status loads instantly
  await api.mockDoorStatus();

  await page.goto('/');

  // System tab - shorter load
  await page.getByRole('tab', { name: /system/i }).click();
  await page.waitForSelector('[role="tabpanel"][data-state="active"]');

  const systemSpinner = page.locator('[data-testid="system-loading"]');
  try {
    await expect(systemSpinner).toBeVisible({ timeout: 500 });
  } catch {
    // Loaded quickly
  }

  await expect(page.getByText(/cpu/i)).toBeVisible({ timeout: 5000 });

  // WiFi tab - longer load
  await page.getByRole('tab', { name: /wifi/i }).click();
  await page.waitForSelector('[role="tabpanel"][data-state="active"]');

  const wifiSpinner = page.locator('[data-testid="wifi-loading"]');
  await expect(wifiSpinner).toBeVisible({ timeout: 1000 });

  // Eventually loads
  await expect(page.getByText(/network|ssid/i)).toBeVisible({ timeout: 5000 });

  // Door tab - instant
  await page.getByRole('tab', { name: /door/i }).click();
  const doorSpinner = page.locator('[data-testid="door-loading"]');
  await expect(doorSpinner).not.toBeVisible();
});
```

---

## Complex Scenarios

### Scenario: Complete WiFi Connection Flow with Error Recovery

```typescript
test('should handle complete wifi connection flow with errors', async ({ page }) => {
  const api = createMockAPI(page);
  await api.applyAllMocks();

  let isConnected = false;

  // Mock WiFi scan
  await page.route('**/api/wifi/scan', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        success: true,
        count: 3,
        networks: [
          { ssid: 'HomeNetwork', signal: -50, security: 'WPA2' },
          { ssid: 'GuestNetwork', signal: -70, security: 'WPA2' },
          { ssid: 'OpenNetwork', signal: -80, security: 'Open' },
        ],
      }),
    });
  });

  // Mock WiFi status
  await page.route('**/api/wifi/status', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        status: {
          connected: isConnected,
          ssid: isConnected ? 'HomeNetwork' : undefined,
          ip_address: isConnected ? '192.168.1.100' : undefined,
          signal_strength: isConnected ? -50 : undefined,
        },
      }),
    });
  });

  // Mock WiFi connect - may fail first time
  let connectAttempts = 0;
  await page.route('**/api/wifi/connect', async (route) => {
    connectAttempts++;
    const body = route.request().postDataJSON();

    if (connectAttempts === 1) {
      // First attempt fails
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Connection timeout' }),
      });
    } else {
      // Second attempt succeeds
      isConnected = true;
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    }
  });

  await page.goto('/');

  // Step 1: Navigate to WiFi tab
  await page.getByRole('tab', { name: /wifi/i }).click();
  await expect(page.getByRole('tab', { name: /wifi/i })).toHaveAttribute('data-state', 'active');

  // Step 2: See list of networks
  await expect(page.getByText('HomeNetwork')).toBeVisible();
  await expect(page.getByText('GuestNetwork')).toBeVisible();

  // Step 3: Try to connect to HomeNetwork
  const connectBtn = page.getByRole('button', { name: /connect/i }).first();
  await connectBtn.click();

  // Step 4: See connection error
  const errorMsg = page.getByText(/connection timeout|failed/i);
  await expect(errorMsg).toBeVisible({ timeout: 5000 });

  // Step 5: Retry connection
  const retryBtn = page.getByRole('button', { name: /retry|try again/i });
  if (await retryBtn.isVisible()) {
    await retryBtn.click();
  } else {
    await connectBtn.click();
  }

  // Step 6: Connection succeeds
  const successMsg = page.getByText(/connected/i);
  await expect(successMsg).toBeVisible({ timeout: 5000 });

  // Step 7: Verify status shows connected
  await page.reload();
  await page.getByRole('tab', { name: /wifi/i }).click();
  await expect(page.getByText('HomeNetwork')).toBeVisible();
  await expect(page.getByText('192.168.1.100')).toBeVisible();
});
```

---

## Playwright Config Integration

### How PiDashboard Configures Artifacts

From `playwright.config.ts`:

```typescript
export default defineConfig({
  // ... other config

  use: {
    baseURL,

    // CRITICAL for debugging: Trace configuration
    // Collects full timeline on first retry
    trace: 'on-first-retry',

    // Screenshots on failure only (saves space)
    screenshot: 'only-on-failure',

    // Video on first retry (helps see what happened)
    video: 'on-first-retry',

    // Timeouts for interaction
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ...(process.env.CI ? [['github']] : []),
  ],

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Single worker on CI for stability
  workers: process.env.CI ? 1 : undefined,
});
```

### How GitHub Actions Uploads Artifacts

From `.github/workflows/test.yml`:

```yaml
e2e-smoke:
  name: E2E Smoke Tests
  runs-on: ubuntu-latest

  steps:
    # ... previous steps

    # Upload all test results
    - name: Upload Playwright report
      uses: actions/upload-artifact@v4
      if: always()  # Always upload, even on success
      with:
        name: playwright-report-smoke
        path: playwright-report/
        retention-days: 7

    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: test-results-smoke
        path: test-results/
        retention-days: 7

    # Upload traces only on failure
    - name: Upload Playwright traces on failure
      uses: actions/upload-artifact@v4
      if: failure()  # Only on test failure
      with:
        name: playwright-traces-smoke
        path: |
          test-results/**/*.zip
          test-results/**/*.png
          test-results/**/*.webm
        retention-days: 14
```

---

## Accessing Results

### View locally during development

```bash
# Run a single test in debug mode
npx playwright test tests/e2e/resilience.spec.ts --debug

# View HTML report after test run
open playwright-report/index.html

# View a specific trace
npx playwright show-trace test-results/trace.zip

# View all failures
find test-results -name "*.png" -o -name "*.webm"
```

### Download from GitHub Actions

```bash
# List recent runs
gh run list

# Download artifacts from a specific run
gh run download <RUN_ID> -n playwright-report-smoke

# Extract and view
unzip -d reports playwright-report-smoke
open reports/index.html
```

### CI Integration

The PiDashboard uses GitHub's artifact system to:
1. Always upload HTML report (7 days retention)
2. Always upload test results metadata (7 days)
3. Only upload traces/videos on failure (14 days to save space)
4. Merge reports from sharded runs for unified view

This strategy balances visibility, storage, and cost.

---

## Key Takeaways for Your Testing

1. **Use MockAPI class** - Organize mocks in reusable methods
2. **Mock with config objects** - Pass { status, delay, data, error }
3. **Test all states** - Loading, success, error, empty, partial failure
4. **Handle timeouts** - Simulate slow networks and service delays
5. **UI responsiveness** - Verify UI stays interactive during slow requests
6. **Error recovery** - Test that API failures are recoverable
7. **Configure artifacts** - Enable traces, videos, screenshots in config
8. **Upload on failure** - GitHub Actions artifact uploads on test failure only
9. **Use proper waits** - expect() with timeouts, not hardcoded delays
10. **Test isolation** - Each test should clean up after itself

