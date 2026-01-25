# Contract: E2E Test Fixtures

**Feature**: 037-api-resilience
**Date**: 2026-01-25
**Type**: Test Data Contract

## Overview

This contract defines the mock data shapes and route configurations for E2E resilience testing.

## 1. Mock Data Schemas

### Camera Mocks

```typescript
// Valid camera with all fields
const mockCameraOnline = {
  id: 'cam-001',
  name: 'Front Door Camera',
  status: 'online',
  last_seen: '2026-01-25T10:00:00Z',
  ip_address: '192.168.1.100',
  mac_address: 'AA:BB:CC:DD:EE:FF',
  health: {
    wifi_rssi: -45,
    free_heap: 120000,
    uptime_seconds: 3600,
    resolution: 'VGA',
    firmware_version: '1.0.0',
  },
};

// Camera in error state
const mockCameraError = {
  ...mockCameraOnline,
  id: 'cam-002',
  name: 'Garage Camera',
  status: 'error',
  health: {
    ...mockCameraOnline.health,
    last_error: 'Connection timeout',
  },
};

// Camera offline
const mockCameraOffline = {
  ...mockCameraOnline,
  id: 'cam-003',
  name: 'Backyard Camera',
  status: 'offline',
  last_seen: '2026-01-24T15:00:00Z',
};
```

### Camera Response Variants

```typescript
// Success: Multiple cameras
const mockCamerasSuccess = {
  success: true,
  data: {
    cameras: [mockCameraOnline, mockCameraError, mockCameraOffline],
  },
};

// Success: Empty list
const mockCamerasEmpty = {
  success: true,
  data: {
    cameras: [],
  },
};

// Error: Server error
const mockCamerasServerError = {
  success: false,
  error: {
    code: 'INTERNAL_ERROR',
    message: 'Database connection failed',
  },
};
```

### WiFi Mocks

```typescript
// Valid WiFi network
const mockWifiNetwork = {
  ssid: 'HomeNetwork',
  signal_strength: -50,
  security: 'WPA2',
  channel: 6,
  frequency: 2437,
};

// WiFi status connected
const mockWifiStatusConnected = {
  connected: true,
  ssid: 'HomeNetwork',
  ip_address: '192.168.1.50',
  signal_strength: -45,
};

// WiFi status disconnected
const mockWifiStatusDisconnected = {
  connected: false,
  ssid: null,
  ip_address: null,
  signal_strength: null,
};
```

### Door Status Mocks

```typescript
const mockDoorOpen = {
  state: 'open',
  last_changed: '2026-01-25T09:30:00Z',
  battery_level: 85,
};

const mockDoorClosed = {
  state: 'closed',
  last_changed: '2026-01-25T10:00:00Z',
  battery_level: 85,
};

const mockDoorLocked = {
  state: 'locked',
  last_changed: '2026-01-25T10:05:00Z',
  battery_level: 85,
};
```

### System Info Mocks

```typescript
const mockSystemInfo = {
  hostname: 'delicasa-pi-001',
  uptime: '5 days, 12:34:56',
  cpu_usage: 25.5,
  memory_usage: 45.2,
  disk_usage: 60.0,
  temperature: 52.3,
  version: '1.3.0',
};
```

---

## 2. Route Mock Configurations

### Success Routes (Default)

```typescript
const successRoutes = {
  '/api/v1/cameras/**': {
    status: 200,
    contentType: 'application/json',
    body: mockCamerasSuccess,
  },
  '/api/wifi/status': {
    status: 200,
    contentType: 'application/json',
    body: mockWifiStatusConnected,
  },
  '/api/wifi/scan': {
    status: 200,
    contentType: 'application/json',
    body: { networks: [mockWifiNetwork] },
  },
  '/api/dashboard/door/status': {
    status: 200,
    contentType: 'application/json',
    body: mockDoorClosed,
  },
  '/api/system/info': {
    status: 200,
    contentType: 'application/json',
    body: mockSystemInfo,
  },
};
```

### Error Routes

```typescript
const errorRoutes = {
  // Server errors (5xx)
  '/api/v1/cameras/**': {
    status: 500,
    contentType: 'application/json',
    body: { error: 'Internal server error' },
  },

  // Bad gateway (proxy error)
  '/api/v1/cameras/**': {
    status: 502,
    contentType: 'text/html',
    body: '<html><body>Bad Gateway</body></html>',
  },

  // Feature unavailable
  '/api/wifi/**': {
    status: 404,
    contentType: 'application/json',
    body: { error: 'Endpoint not found' },
  },

  // Service unavailable
  '/api/wifi/**': {
    status: 503,
    contentType: 'application/json',
    body: { error: 'Service unavailable' },
  },
};
```

### Slow Response Routes (Loading State Testing)

```typescript
const slowRoutes = {
  '/api/v1/cameras/**': {
    status: 200,
    delay: 3000, // 3 second delay
    body: mockCamerasSuccess,
  },
};
```

### Network Failure Routes

```typescript
const networkFailureRoutes = {
  '/api/v1/cameras/**': {
    abort: 'connectionfailed',
  },
  '/api/wifi/**': {
    abort: 'connectionreset',
  },
  '/api/system/**': {
    abort: 'timedout',
  },
};
```

---

## 3. Mock Route Implementation Pattern

### MockAPI Class Interface

```typescript
interface MockRouteConfig {
  status?: number;
  contentType?: string;
  body?: unknown;
  delay?: number;
  abort?: 'connectionfailed' | 'connectionreset' | 'timedout';
}

interface MockAPI {
  // Apply all default success routes
  applyAllMocks(page: Page): Promise<void>;

  // Override specific endpoint
  mockEndpoint(
    page: Page,
    pattern: string,
    config: MockRouteConfig
  ): Promise<void>;

  // Preset scenarios
  mockCamerasSuccess(page: Page): Promise<void>;
  mockCamerasEmpty(page: Page): Promise<void>;
  mockCamerasError(page: Page): Promise<void>;
  mockCamerasLoading(page: Page, delayMs: number): Promise<void>;
  mockCamerasNetworkFailure(page: Page): Promise<void>;

  mockWifi404(page: Page): Promise<void>;
  mockWifi503(page: Page): Promise<void>;
  mockWifiSuccess(page: Page): Promise<void>;

  mockDoorSuccess(page: Page, state: 'open' | 'closed' | 'locked'): Promise<void>;
  mockDoorError(page: Page): Promise<void>;

  mockSystemSuccess(page: Page): Promise<void>;
  mockSystemError(page: Page): Promise<void>;
}
```

### Implementation Example

```typescript
export function createMockAPI(): MockAPI {
  return {
    async mockEndpoint(page, pattern, config) {
      await page.route(pattern, async (route) => {
        if (config.abort) {
          return route.abort(config.abort);
        }

        if (config.delay) {
          await new Promise((r) => setTimeout(r, config.delay));
        }

        return route.fulfill({
          status: config.status ?? 200,
          contentType: config.contentType ?? 'application/json',
          body: typeof config.body === 'string'
            ? config.body
            : JSON.stringify(config.body),
        });
      });
    },

    async mockCamerasSuccess(page) {
      await this.mockEndpoint(page, '**/api/v1/cameras/**', {
        status: 200,
        body: mockCamerasSuccess,
      });
    },

    async mockCamerasEmpty(page) {
      await this.mockEndpoint(page, '**/api/v1/cameras/**', {
        status: 200,
        body: mockCamerasEmpty,
      });
    },

    async mockCamerasError(page) {
      await this.mockEndpoint(page, '**/api/v1/cameras/**', {
        status: 500,
        body: { error: 'Internal server error' },
      });
    },

    // ... other preset methods
  };
}
```

---

## 4. Test Scenario Matrix

| Scenario | Mock Config | Expected UI | Test ID |
|----------|-------------|-------------|---------|
| Cameras: data present | `mockCamerasSuccess` | Camera grid with 3 cards | `cameras-data` |
| Cameras: empty list | `mockCamerasEmpty` | "No cameras connected" | `cameras-empty` |
| Cameras: server error | `mockCamerasError` | Error + Retry button | `cameras-error` |
| Cameras: loading slow | `mockCamerasLoading(3000)` | Spinner for 3s | `cameras-loading` |
| Cameras: network fail | `mockCamerasNetworkFailure` | "Connection failed" | `cameras-network` |
| WiFi: 404 | `mockWifi404` | No errors, tab hidden/disabled | `wifi-404` |
| WiFi: 503 | `mockWifi503` | "Feature unavailable" | `wifi-503` |
| WiFi: success | `mockWifiSuccess` | Network list | `wifi-success` |
| Door: open | `mockDoorSuccess('open')` | Open indicator | `door-open` |
| Door: closed | `mockDoorSuccess('closed')` | Closed indicator | `door-closed` |
| Door: error | `mockDoorError` | "Status unavailable" | `door-error` |
| System: success | `mockSystemSuccess` | Metric cards | `system-success` |
| System: error | `mockSystemError` | Error + Retry | `system-error` |

---

## 5. CI Integration Requirements

### Playwright Config

```typescript
// playwright.config.ts additions
{
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  retries: process.env.CI ? 2 : 0,
}
```

### GitHub Actions Artifact Upload

```yaml
# .github/workflows/test.yml
- name: Run E2E tests
  run: npm run test:e2e

- name: Upload E2E Report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30

- name: Upload E2E Artifacts on Failure
  uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-traces
    path: |
      test-results/
    retention-days: 7
```

---

## 6. Smoke Mode (Real Pi Testing)

### Environment Configuration

```bash
# Run against real Pi
E2E_BASE_URL=http://192.168.1.124:8082 npm run test:e2e -- --grep @smoke

# Run against Tailscale URL
E2E_BASE_URL=https://raspberrypi.tail345cd5.ts.net npm run test:e2e -- --grep @smoke
```

### Smoke Test Tags

```typescript
// tests/e2e/smoke.spec.ts
test.describe('Smoke Tests @smoke', () => {
  test('cameras tab loads', async ({ page }) => {
    // No mocks - uses real API
    await page.goto('/');
    await page.click('[data-testid="cameras-tab"]');
    // Just verify no crash, don't assert specific data
    await expect(page.locator('[data-testid^="camera-"]')).toBeVisible();
  });
});
```
