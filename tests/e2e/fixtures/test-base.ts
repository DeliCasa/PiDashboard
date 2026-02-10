/**
 * Playwright Test Base Fixtures
 *
 * Extended fixtures for PiDashboard E2E tests.
 * Provides common utilities, page objects, and test helpers.
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, Page } from '@playwright/test';

/**
 * Custom fixture types for PiDashboard tests
 */
type PiDashboardFixtures = {
  /** Page with API mocking applied */
  mockedPage: Page;

  /** Wait for page to be fully loaded */
  waitForAppReady: () => Promise<void>;

  /** Check for console errors */
  expectNoConsoleErrors: () => Promise<void>;

  /** Navigate to a specific tab */
  navigateToTab: (tabName: string) => Promise<void>;
};

/**
 * Extended test fixture with PiDashboard-specific utilities
 */
export const test = base.extend<PiDashboardFixtures>({
  /**
   * Page with API mocking applied
   * Use this fixture when you want to test with mocked API responses
   */
  mockedPage: async ({ page }, use) => {
    // Apply default API mocks
    await applyDefaultMocks(page);
    await use(page);
  },

  /**
   * Wait for the application to be fully loaded and ready
   */
  waitForAppReady: async ({ page }, use) => {
    const waitFn = async () => {
      // Wait for the main app container
      await page.waitForSelector('[data-testid="app-container"], main', {
        state: 'visible',
        timeout: 10000,
      });

      // Wait for React hydration to complete
      await page.waitForFunction(() => {
        // Check that React has mounted
        const root = document.getElementById('root');
        return root && root.children.length > 0;
      });

      // Wait for tablist to be visible (indicates app is ready)
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });
    };

    await use(waitFn);
  },

  /**
   * Check for console errors during test
   * Feature: 037-api-resilience - Enhanced with 404/503 filtering for optional endpoints
   */
  expectNoConsoleErrors: async ({ page }, use) => {
    const consoleErrors: string[] = [];

    // Optional endpoint patterns that should not produce console errors on 404/503
    const optionalEndpointPatterns = [
      '/api/wifi/',
      '/wifi/',
      '/api/v1/cameras',
      '/api/v1/containers',
      '/api/dashboard/diagnostics',
    ];

    // Check if error is from an optional endpoint returning 404/503
    const isOptionalEndpoint404 = (text: string): boolean => {
      // Check for 404/503 status codes in error message
      const is404or503 = text.includes('404') || text.includes('503') ||
                          text.includes('Not Found') || text.includes('Service Unavailable');

      // Check if it's related to an optional endpoint
      const isOptionalEndpoint = optionalEndpointPatterns.some(pattern =>
        text.includes(pattern)
      );

      return is404or503 && isOptionalEndpoint;
    };

    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known non-critical errors
        if (
          !text.includes('ResizeObserver') &&
          !text.includes('Download the React DevTools') &&
          !text.includes('Failed to load resource') && // Network/HTTP errors in tests
          !text.includes('[API Contract]') && // Schema validation warnings (graceful degradation)
          !text.includes('Service Worker registration failed') && // SW errors in test environment
          !isOptionalEndpoint404(text) // Feature 037: Ignore 404/503 on optional endpoints
        ) {
          consoleErrors.push(text);
        }
      }
    });

    // Also ignore console warnings that might be logged as errors
    page.on('console', (msg) => {
      if (msg.type() === 'warning') {
        // Warnings are expected during tests
      }
    });

    const checkFn = async () => {
      if (consoleErrors.length > 0) {
        throw new Error(
          `Console errors detected:\n${consoleErrors.join('\n')}`
        );
      }
    };

    await use(checkFn);
  },

  /**
   * Navigate to a specific tab in the dashboard
   */
  navigateToTab: async ({ page }, use) => {
    const navigateFn = async (tabName: string) => {
      const tabSelector = `[role="tab"]:has-text("${tabName}")`;
      await page.click(tabSelector);
      await page.waitForSelector(`[role="tabpanel"][data-state="active"]`, {
        state: 'visible',
      });
    };

    await use(navigateFn);
  },
});

/**
 * Apply default API mocks for E2E tests
 * Uses the correct PiOrchestrator API response format
 */
async function applyDefaultMocks(page: Page): Promise<void> {
  // Mock system info endpoint
  await page.route('**/api/system/info', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          cpu: {
            usage_percent: 25.5,
            core_count: 4,
            per_core: [20, 25, 30, 27],
          },
          memory: {
            used_mb: 1845,
            total_mb: 4096,
            used_percent: 45.2,
            available_mb: 2251,
          },
          disk: {
            used_gb: 12,
            total_gb: 32,
            used_percent: 37.5,
            path: '/',
          },
          temperature_celsius: 42.5,
          uptime: 86400000000000, // 1 day in nanoseconds
          load_average: {
            load_1: 0.5,
            load_5: 0.4,
            load_15: 0.3,
          },
          overall_status: 'healthy',
        },
      }),
    });
  });

  // Mock V1 system info endpoint
  await page.route('**/api/v1/system/info', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          cpu: {
            usage_percent: 25.5,
            core_count: 4,
            per_core: [20, 25, 30, 27],
          },
          memory: {
            used_mb: 1845,
            total_mb: 4096,
            used_percent: 45.2,
            available_mb: 2251,
          },
          disk: {
            used_gb: 12,
            total_gb: 32,
            used_percent: 37.5,
            path: '/',
          },
          temperature_celsius: 42.5,
          uptime: 86400000000000, // 1 day in nanoseconds
          load_average: {
            load_1: 0.5,
            load_5: 0.4,
            load_15: 0.3,
          },
          overall_status: 'healthy',
        },
      }),
    });
  });

  // Mock WiFi scan endpoint
  await page.route('**/api/wifi/scan', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        count: 3,
        networks: [
          { ssid: 'TestNetwork-5G', signal: -45, security: 'WPA2' },
          { ssid: 'TestNetwork-2G', signal: -55, security: 'WPA2' },
          { ssid: 'OpenNetwork', signal: -65, security: 'Open' },
        ],
      }),
    });
  });

  // Mock WiFi status endpoint
  await page.route('**/api/wifi/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: {
          connected: true,
          ssid: 'TestNetwork-5G',
          ip_address: '192.168.1.100',
          signal_strength: -45,
          mode: 'client',
        },
      }),
    });
  });

  // Mock door status endpoint
  await page.route('**/api/door/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        state: 'closed',
        lock_state: 'locked',
        last_command: 'close',
        last_command_time: new Date().toISOString(),
      }),
    });
  });

  // Mock V1 door status endpoint (wrapped in V1 envelope)
  await page.route('**/api/v1/door/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          state: 'closed',
          lock_state: 'locked',
          last_command: 'close',
          last_command_time: new Date().toISOString(),
        },
        correlation_id: 'test-door-status',
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock V1 door history endpoint
  await page.route('**/api/v1/door/history*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { history: [] },
        correlation_id: 'test-door-history',
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock config endpoint (dashboard config)
  await page.route('**/api/dashboard/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sections: [
          {
            name: 'System',
            description: 'System configuration settings',
            items: [
              {
                key: 'server.port',
                value: '8082',
                default_value: '8082',
                type: 'number',
                description: 'HTTP server port',
                editable: true,
              },
            ],
          },
          {
            name: 'MQTT',
            description: 'MQTT broker settings',
            items: [
              {
                key: 'mqtt.broker',
                value: 'mqtt://localhost',
                default_value: 'mqtt://localhost',
                type: 'string',
                description: 'MQTT broker URL',
                editable: true,
              },
            ],
          },
        ],
      }),
    });
  });

  // Also mock /api/config for backward compatibility
  await page.route('**/api/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sections: [
          {
            name: 'System',
            description: 'System configuration settings',
            items: [
              {
                key: 'server.port',
                value: '8082',
                default_value: '8082',
                type: 'number',
                description: 'HTTP server port',
                editable: true,
              },
            ],
          },
          {
            name: 'MQTT',
            description: 'MQTT broker settings',
            items: [
              {
                key: 'mqtt.broker',
                value: 'mqtt://localhost',
                default_value: 'mqtt://localhost',
                type: 'string',
                description: 'MQTT broker URL',
                editable: true,
              },
            ],
          },
        ],
      }),
    });
  });

  // Mock logs endpoint
  await page.route('**/api/dashboard/logs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        count: 2,
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'System started',
            source: 'main',
          },
          {
            timestamp: new Date(Date.now() - 60000).toISOString(),
            level: 'debug',
            message: 'MQTT connected',
            source: 'mqtt',
          },
        ],
      }),
    });
  });

  // Also mock /api/logs/recent for backward compatibility
  await page.route('**/api/logs/recent', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        count: 2,
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'System started',
            source: 'main',
          },
          {
            timestamp: new Date(Date.now() - 60000).toISOString(),
            level: 'debug',
            message: 'MQTT connected',
            source: 'mqtt',
          },
        ],
      }),
    });
  });

  // Mock cameras endpoint (legacy /api/cameras)
  await page.route('**/api/cameras', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cameras: [],
      }),
    });
  });

  // Mock legacy dashboard cameras (fallback for V1 cameras API)
  await page.route('**/api/dashboard/cameras', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cameras: [],
        count: 0,
        success: true,
      }),
    });
  });
  await page.route('**/api/dashboard/cameras/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // Mock V1 Cameras API (Feature: 045-dashboard-resilience-e2e)
  await page.route('**/api/v1/cameras', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { cameras: [] },
        correlation_id: 'test-default',
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock V1 Containers API (Feature: 045-dashboard-resilience-e2e)
  await page.route('**/api/v1/containers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { containers: [], total: 0 },
        correlation_id: 'test-default',
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock Diagnostics endpoints (Feature: 045-dashboard-resilience-e2e)
  await page.route('**/api/dashboard/diagnostics/bridgeserver', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {},
      }),
    });
  });

  await page.route('**/api/dashboard/diagnostics/minio', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        buckets: {},
      }),
    });
  });

  await page.route('**/api/dashboard/diagnostics/sessions*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { sessions: [] },
      }),
    });
  });

  // Mock network diagnostics endpoint
  await page.route('**/api/network/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        connected: false,
        status: 'unavailable',
      }),
    });
  });

  // Mock devices endpoint
  await page.route('**/api/devices', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        devices: [],
      }),
    });
  });

  // Mock inventory run list endpoint (Feature: 048-inventory-review)
  await page.route('**/api/v1/containers/*/inventory/runs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          runs: [],
          pagination: { total: 0, limit: 20, offset: 0, has_more: false },
        },
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock session delta endpoint (Feature: 048-inventory-review)
  await page.route('**/api/v1/sessions/*/inventory-delta', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'SESSION_NOT_FOUND', message: 'Session not found', retryable: false },
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock inventory delta endpoint (Feature: 047-inventory-delta-viewer)
  await page.route('**/api/v1/containers/*/inventory/latest', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'INVENTORY_NOT_FOUND', message: 'No inventory analysis found', retryable: false },
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock V1 auto-onboard status endpoint
  await page.route('**/api/v1/onboarding/auto/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { enabled: false, status: 'idle' },
        correlation_id: 'test-auto-onboard',
        timestamp: new Date().toISOString(),
      }),
    });
  });
}

/**
 * Re-export expect for convenience
 */
export { expect };

/**
 * Test annotation helpers
 */
export const annotations = {
  /** Mark test as slow (increases timeout) */
  slow: () => test.slow(),

  /** Mark test as requiring specific browser */
  browserOnly: (browser: 'chromium' | 'firefox' | 'webkit') =>
    test.skip(
      ({ browserName }) => browserName !== browser,
      `Test only runs on ${browser}`
    ),

  /** Skip test on CI */
  skipOnCI: () => test.skip(!!process.env.CI, 'Skipped on CI'),

  /** Skip test unless LIVE_PI_URL is set */
  requiresLivePi: () =>
    test.skip(!process.env.LIVE_PI_URL, 'Requires LIVE_PI_URL to be set'),
};
