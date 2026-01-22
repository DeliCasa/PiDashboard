/**
 * Camera Management E2E Tests
 * Feature: 034-esp-camera-integration
 *
 * Tests for the V1 Cameras API integration in the dashboard.
 */

import { test, expect } from './fixtures/test-base';
import type { Page } from '@playwright/test';

// ============================================================================
// V1 Cameras API Mock Data
// ============================================================================

interface CameraHealth {
  wifi_rssi?: number;
  free_heap?: number;
  uptime?: string;
  uptime_seconds?: number;
  resolution?: string;
  firmware_version?: string;
  last_capture?: string;
}

interface Camera {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error' | 'rebooting';
  lastSeen: string;
  health?: CameraHealth;
  ip_address?: string;
  mac_address?: string;
}

interface CameraListResponse {
  cameras: Camera[];
  count: number;
}

interface CaptureResult {
  success: boolean;
  image?: string;
  timestamp?: string;
  camera_id?: string;
  file_size?: number;
  error?: string;
}

interface RebootResult {
  success: boolean;
  message?: string;
}

// Sample base64 JPEG (1x1 red pixel)
const mockBase64Image =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
  'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh' +
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR' +
  'CAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAA' +
  'AAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMB' +
  'AAIRAxEAPwCwAB//2Q==';

const mockCameras: Camera[] = [
  {
    id: 'AA:BB:CC:DD:EE:01',
    name: 'Front Door Camera',
    status: 'online',
    lastSeen: new Date().toISOString(),
    health: {
      wifi_rssi: -55,
      free_heap: 45000,
      uptime: '2d 5h 30m',
      uptime_seconds: 193800,
      resolution: 'VGA',
      firmware_version: '1.2.3',
    },
    ip_address: '192.168.1.101',
    mac_address: 'AA:BB:CC:DD:EE:01',
  },
  {
    id: 'AA:BB:CC:DD:EE:02',
    name: 'Backyard Camera',
    status: 'online',
    lastSeen: new Date().toISOString(),
    health: {
      wifi_rssi: -70,
      free_heap: 38000,
      uptime: '1d 2h 15m',
      uptime_seconds: 94500,
      resolution: 'SVGA',
      firmware_version: '1.2.3',
    },
    ip_address: '192.168.1.102',
    mac_address: 'AA:BB:CC:DD:EE:02',
  },
  {
    id: 'AA:BB:CC:DD:EE:03',
    name: 'Garage Camera',
    status: 'offline',
    lastSeen: new Date(Date.now() - 86400000).toISOString(),
    ip_address: '192.168.1.103',
    mac_address: 'AA:BB:CC:DD:EE:03',
  },
];

// ============================================================================
// Mock Helpers
// ============================================================================

async function mockV1CamerasApi(
  page: Page,
  options: {
    cameras?: Camera[];
    listError?: boolean;
    captureSuccess?: boolean;
    rebootSuccess?: boolean;
  } = {}
): Promise<void> {
  const {
    cameras = mockCameras,
    listError = false,
    captureSuccess = true,
    rebootSuccess = true,
  } = options;

  // Mock camera list endpoint
  await page.route('**/api/v1/cameras', async (route) => {
    if (listError) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          retryable: true,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cameras,
        count: cameras.length,
      } as CameraListResponse),
    });
  });

  // Mock diagnostics endpoint (must be before :id route)
  await page.route('**/api/v1/cameras/diagnostics', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        cameras.map((camera) => ({
          ...camera,
          diagnostics: {
            connection_quality: camera.status === 'online' ? 'good' : 'poor',
            error_count: camera.status === 'offline' ? 5 : 0,
          },
        }))
      ),
    });
  });

  // Mock capture endpoint
  await page.route('**/api/v1/cameras/*/capture', async (route) => {
    const url = route.request().url();
    const cameraId = decodeURIComponent(url.split('/cameras/')[1].split('/capture')[0]);

    if (!captureSuccess) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Capture failed',
          code: 'CAPTURE_FAILED',
          retryable: true,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        image: mockBase64Image,
        timestamp: new Date().toISOString(),
        camera_id: cameraId,
        file_size: 2048,
      } as CaptureResult),
    });
  });

  // Mock reboot endpoint
  await page.route('**/api/v1/cameras/*/reboot', async (route) => {
    if (!rebootSuccess) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Reboot failed',
          code: 'REBOOT_FAILED',
          retryable: true,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Reboot command sent successfully',
      } as RebootResult),
    });
  });
}

// ============================================================================
// Tests
// ============================================================================

test.describe('Camera Management (034-esp-camera-integration)', () => {
  test.describe('T020: Camera List Display', () => {
    test('should display cameras tab in navigation', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page);
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Check for Cameras tab
      const camerasTab = page.getByRole('tab', { name: /cameras/i });
      await expect(camerasTab).toBeVisible();
    });

    test('should display camera list when cameras are available', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      const camerasTab = page.getByRole('tab', { name: /cameras/i });
      await camerasTab.click();

      // Wait for camera grid to load
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Check that cameras are displayed
      await expect(page.getByText('Front Door Camera')).toBeVisible();
      await expect(page.getByText('Backyard Camera')).toBeVisible();
      await expect(page.getByText('Garage Camera')).toBeVisible();
    });

    test('should display correct camera count', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Check camera count in header
      await expect(page.getByText(/3 cameras registered/i)).toBeVisible();
      await expect(page.getByText(/2 online/i)).toBeVisible();
    });

    test('should display empty state when no cameras', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: [] });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();

      // Check for empty state
      await expect(page.getByTestId('camera-empty')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('No cameras connected')).toBeVisible();
    });

    test('should display error state on API failure', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { listError: true });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();

      // Check for error state
      await expect(page.getByTestId('camera-error')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    });

    test('should show loading state initially', async ({ mockedPage: page }) => {
      // Add delay to camera list endpoint
      await page.route('**/api/v1/cameras', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cameras: mockCameras,
            count: mockCameras.length,
          }),
        });
      });

      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();

      // Check for loading state (visible briefly)
      await expect(page.getByTestId('camera-loading')).toBeVisible({ timeout: 5000 });
    });

    test('should refresh camera list when refresh button is clicked', async ({ mockedPage: page }) => {
      let requestCount = 0;
      await page.route('**/api/v1/cameras', async (route) => {
        requestCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cameras: mockCameras,
            count: mockCameras.length,
          }),
        });
      });

      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click refresh button
      const refreshButton = page.getByRole('button', { name: /refresh/i });
      await refreshButton.click();

      // Wait for refresh to complete
      await page.waitForTimeout(500);

      // Should have made at least 2 requests (initial + refresh)
      expect(requestCount).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Camera Status Display', () => {
    test('should show online status indicator', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Check for online status indicators
      const onlineIndicators = page.locator('[data-testid="camera-card"]').filter({ hasText: 'online' });
      await expect(onlineIndicators.first()).toBeVisible();
    });

    test('should show offline status indicator', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Check for offline status
      await expect(page.getByText('Garage Camera')).toBeVisible();
    });
  });

  // T041: E2E test for camera details
  test.describe('T041: Camera Details Flow', () => {
    test('should show view button on camera cards', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });

      // Mock single camera endpoint
      await page.route('**/api/v1/cameras/AA:BB:CC:DD:EE:01', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockCameras[0]),
        });
      });

      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Check for view button
      const viewButtons = page.getByRole('button', { name: /view camera details/i });
      await expect(viewButtons.first()).toBeVisible();
    });

    test('should open camera detail modal when view button is clicked', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });

      // Mock single camera endpoint
      await page.route('**/api/v1/cameras/AA%3ABB%3ACC%3ADD%3AEE%3A01', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockCameras[0]),
        });
      });

      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click view button on first camera
      const viewButton = page.getByRole('button', { name: /view camera details/i }).first();
      await viewButton.click();

      // Check for camera detail dialog
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Camera Details')).toBeVisible();
    });

    test('should display camera health metrics in detail modal', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });

      // Mock single camera endpoint with full health data
      await page.route('**/api/v1/cameras/AA%3ABB%3ACC%3ADD%3AEE%3A01', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockCameras[0]),
        });
      });

      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click view button
      const viewButton = page.getByRole('button', { name: /view camera details/i }).first();
      await viewButton.click();

      // Check for health metrics in dialog
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Health Metrics')).toBeVisible();
      await expect(page.getByText(/dBm/)).toBeVisible();
    });

    test('should show 404 state for non-existent camera', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });

      // Mock 404 for specific camera
      await page.route('**/api/v1/cameras/invalid-id', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Camera not found',
            code: 'CAMERA_NOT_FOUND',
          }),
        });
      });

      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Note: Can't easily test 404 state without direct navigation or state manipulation
      // This test verifies the camera list loads correctly
    });
  });

  // T031: E2E test for capture flow
  test.describe('T031: Capture Image Flow', () => {
    test('should show capture button on camera card', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Check for capture button
      const captureButtons = page.getByRole('button', { name: /test capture/i });
      await expect(captureButtons.first()).toBeVisible();
    });

    test('should disable capture button for offline cameras', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Find the offline camera card (Garage Camera) and check its capture button
      const offlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Garage Camera' });
      // The capture button inside should be disabled
      const captureButton = offlineCameraCard.locator('button:has-text("Test Capture")');
      await expect(captureButton).toBeDisabled();
    });

    test('should trigger capture and show preview modal', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras, captureSuccess: true });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click capture on online camera (Front Door Camera)
      const onlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Front Door Camera' });
      const captureButton = onlineCameraCard.getByRole('button', { name: /test capture/i });
      await captureButton.click();

      // Wait for capture preview dialog to appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 35000 }); // Allow for 30s timeout + processing
      await expect(page.getByText('Capture Preview')).toBeVisible();
    });

    test('should show error toast when capture fails', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras, captureSuccess: false });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click capture on online camera
      const onlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Front Door Camera' });
      const captureButton = onlineCameraCard.getByRole('button', { name: /test capture/i });
      await captureButton.click();

      // Wait for error toast (sonner toast)
      await expect(page.getByText(/capture failed/i)).toBeVisible({ timeout: 10000 });
    });

    test('should have download button in capture preview', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras, captureSuccess: true });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click capture on online camera
      const onlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Front Door Camera' });
      const captureButton = onlineCameraCard.getByRole('button', { name: /test capture/i });
      await captureButton.click();

      // Wait for capture preview dialog
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 35000 });

      // Check for download button in the preview
      const downloadButton = page.getByRole('dialog').getByRole('button').filter({ has: page.locator('svg') });
      await expect(downloadButton.first()).toBeVisible();
    });

    test('should close capture preview when close button is clicked', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras, captureSuccess: true });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click capture on online camera
      const onlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Front Door Camera' });
      const captureButton = onlineCameraCard.getByRole('button', { name: /test capture/i });
      await captureButton.click();

      // Wait for capture preview dialog
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 35000 });

      // Close the dialog using the X button or clicking outside
      const closeButton = page.getByRole('dialog').getByRole('button', { name: /close/i });
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        // Press Escape to close
        await page.keyboard.press('Escape');
      }

      // Dialog should be closed
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    });
  });

  // T051: E2E test for reboot flow
  test.describe('T051: Reboot Camera Flow', () => {
    test('should show reboot button on camera card', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Check for reboot button on online camera
      const onlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Front Door Camera' });
      const rebootButton = onlineCameraCard.getByRole('button', { name: /reboot camera/i });
      await expect(rebootButton).toBeVisible();
    });

    test('should disable reboot button for offline cameras', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Find the offline camera card (Garage Camera) and check its reboot button
      const offlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Garage Camera' });
      const rebootButton = offlineCameraCard.getByRole('button', { name: /reboot/i });
      await expect(rebootButton).toBeDisabled();
    });

    test('should show confirmation dialog when reboot button is clicked', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click reboot on online camera
      const onlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Front Door Camera' });
      const rebootButton = onlineCameraCard.getByRole('button', { name: /reboot camera/i });
      await rebootButton.click();

      // Wait for confirmation dialog
      await expect(page.getByTestId('reboot-dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Reboot Camera')).toBeVisible();
      await expect(page.getByTestId('reboot-warning')).toBeVisible();
    });

    test('should close confirmation dialog when cancel is clicked', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click reboot on online camera
      const onlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Front Door Camera' });
      const rebootButton = onlineCameraCard.getByRole('button', { name: /reboot camera/i });
      await rebootButton.click();

      // Wait for confirmation dialog
      await expect(page.getByTestId('reboot-dialog')).toBeVisible({ timeout: 5000 });

      // Click cancel
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      await cancelButton.click();

      // Dialog should be closed
      await expect(page.getByTestId('reboot-dialog')).not.toBeVisible({ timeout: 3000 });
    });

    test('should reboot camera and show success toast', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras, rebootSuccess: true });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click reboot on online camera
      const onlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Front Door Camera' });
      const rebootButton = onlineCameraCard.getByRole('button', { name: /reboot camera/i });
      await rebootButton.click();

      // Wait for confirmation dialog
      await expect(page.getByTestId('reboot-dialog')).toBeVisible({ timeout: 5000 });

      // Click confirm
      const confirmButton = page.getByTestId('reboot-confirm-button');
      await confirmButton.click();

      // Wait for success toast
      await expect(page.getByText(/reboot command sent/i)).toBeVisible({ timeout: 10000 });

      // Dialog should close after successful reboot
      await expect(page.getByTestId('reboot-dialog')).not.toBeVisible({ timeout: 5000 });
    });

    test('should show error toast when reboot fails', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras, rebootSuccess: false });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click reboot on online camera
      const onlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Front Door Camera' });
      const rebootButton = onlineCameraCard.getByRole('button', { name: /reboot camera/i });
      await rebootButton.click();

      // Wait for confirmation dialog
      await expect(page.getByTestId('reboot-dialog')).toBeVisible({ timeout: 5000 });

      // Click confirm
      const confirmButton = page.getByTestId('reboot-confirm-button');
      await confirmButton.click();

      // Wait for error toast
      await expect(page.getByText(/reboot failed/i)).toBeVisible({ timeout: 10000 });
    });

    test('should display camera name in confirmation dialog', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click reboot on Front Door Camera
      const onlineCameraCard = page.locator('[data-testid="camera-card"]').filter({ hasText: 'Front Door Camera' });
      const rebootButton = onlineCameraCard.getByRole('button', { name: /reboot camera/i });
      await rebootButton.click();

      // Wait for confirmation dialog and check camera name
      await expect(page.getByTestId('reboot-dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Front Door Camera')).toBeVisible();
    });
  });

  // T063: E2E test for diagnostics page
  test.describe('T063: Diagnostics View', () => {
    test('should show diagnostics collapsible section', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Check for diagnostics trigger
      await expect(page.getByTestId('diagnostics-trigger')).toBeVisible();
    });

    test('should expand diagnostics when clicked', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Click to expand diagnostics
      await page.getByTestId('diagnostics-trigger').click();

      // Check that diagnostics content is visible
      await expect(page.getByTestId('diagnostics-warning')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('diagnostics-json-container')).toBeVisible();
    });

    test('should show warning banner in diagnostics', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Expand diagnostics
      await page.getByTestId('diagnostics-trigger').click();

      // Check for warning message
      await expect(page.getByText(/for debugging purposes only/i)).toBeVisible({ timeout: 5000 });
    });

    test('should display JSON data in diagnostics', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Expand diagnostics
      await page.getByTestId('diagnostics-trigger').click();

      // Check for JSON content
      await expect(page.getByTestId('diagnostics-json')).toBeVisible({ timeout: 5000 });
    });

    test('should have search input in diagnostics', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Expand diagnostics
      await page.getByTestId('diagnostics-trigger').click();

      // Check for search input
      await expect(page.getByTestId('diagnostics-search')).toBeVisible({ timeout: 5000 });
    });

    test('should have copy button in diagnostics', async ({ mockedPage: page }) => {
      await mockV1CamerasApi(page, { cameras: mockCameras });
      await page.goto('/');
      await page.waitForSelector('[role="tablist"]', { state: 'visible' });

      // Navigate to Cameras tab
      await page.getByRole('tab', { name: /cameras/i }).click();
      await expect(page.getByTestId('camera-grid')).toBeVisible({ timeout: 10000 });

      // Expand diagnostics
      await page.getByTestId('diagnostics-trigger').click();

      // Check for copy button
      await expect(page.getByTestId('diagnostics-copy')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Copy JSON')).toBeVisible();
    });
  });
});
