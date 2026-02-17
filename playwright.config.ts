/**
 * Playwright Configuration for PiDashboard
 *
 * NixOS-compatible configuration using system-managed browsers.
 * Requires `nix develop` to set PLAYWRIGHT_BROWSERS_PATH.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test';
import os from 'os';

/**
 * Base URL for E2E tests - can be overridden via VITE_BASE_URL env var
 */
const baseURL = process.env.VITE_BASE_URL || 'http://localhost:5173';

/**
 * Resource Constraint: Limit test parallelism to avoid consuming all system resources.
 * Uses at most half of available CPUs for E2E tests (minimum 1).
 * Set PLAYWRIGHT_WORKERS env var to override.
 */
const maxWorkers = process.env.PLAYWRIGHT_WORKERS
  ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10)
  : Math.max(1, Math.floor(os.cpus().length / 2));

/**
 * Optional live Pi URL for smoke tests against real hardware
 * Set LIVE_PI_URL to enable live tests (e.g., http://192.168.1.100:8082)
 */
const livePiUrl = process.env.LIVE_PI_URL;

/**
 * Optional live E2E mode for inventory validation against real BridgeServer
 * Set LIVE_E2E=1 to enable, LIVE_BASE_URL to specify deployment URL
 */
const liveE2E = process.env.LIVE_E2E === '1';
const liveBaseUrl =
  process.env.LIVE_BASE_URL || 'https://raspberrypi.tail345cd5.ts.net';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Test file pattern
  testMatch: '**/*.spec.ts',

  // Maximum time for a single test
  timeout: 30000,

  // Maximum time for expect assertions
  expect: {
    timeout: 5000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if accidentally left test.only in code
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers to avoid consuming all system resources
  // CI: single worker for reproducibility; Local: half of CPUs
  workers: process.env.CI ? 1 : maxWorkers,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ...(process.env.CI ? [['github']] : []),
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL,

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Timeout for actions like click, fill, etc.
    actionTimeout: 10000,

    // Timeout for navigation
    navigationTimeout: 15000,

    // Block Service Workers to ensure page.route() intercepts API requests.
    // The app registers a SW (public/sw.js) that intercepts /api/* requests,
    // which would bypass Playwright's route mocking in E2E tests.
    serviceWorkers: 'block',
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewport testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    // Live Pi tests - only run when LIVE_PI_URL is set
    ...(livePiUrl
      ? [
          {
            name: 'live-pi',
            testMatch: '**/live-smoke.spec.ts',
            use: {
              ...devices['Desktop Chrome'],
              baseURL: livePiUrl,
            },
          },
        ]
      : []),
    // Live inventory E2E tests - only run when LIVE_E2E=1
    ...(liveE2E
      ? [
          {
            name: 'live-inventory',
            testMatch: '**/live-inventory-correction.spec.ts',
            timeout: 60000,
            use: {
              ...devices['Desktop Chrome'],
              baseURL: liveBaseUrl,
              trace: 'on' as const,
              screenshot: 'on' as const,
              actionTimeout: 15000,
              navigationTimeout: 30000,
            },
          },
        ]
      : []),
  ],

  // Web server configuration for local development
  // Uses e2e-specific Vite config that doesn't proxy to Pi (allows route mocking)
  // Don't start server if testing against live Pi or live E2E
  ...(livePiUrl || liveE2E
    ? {}
    : {
        webServer: {
          command: 'npx vite --config vite.config.e2e.ts',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
      }),

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Metadata for reporting
  metadata: {
    project: 'PiDashboard',
    version: '1.2.0',
    environment: process.env.CI ? 'CI' : 'local',
  },
});
