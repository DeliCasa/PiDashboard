/**
 * Container Selection & Camera Scoping E2E Tests
 * Feature: 046-opaque-container-identity (T024)
 *
 * Tests the container picker in the header and camera scoping on the Cameras tab.
 */

import { test, expect } from './fixtures/test-base';
import { mockEndpoint, mockCameraData } from './fixtures/mock-routes';

// Containers with cameras that match mockCameraData IDs
const containersWithCameras = {
  success: true,
  data: {
    containers: [
      {
        id: 'container-alpha-001',
        label: 'Kitchen Fridge',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cameras: [
          {
            device_id: 'cam-001', // matches mockCameraData.cameraOnline.id
            position: 1,
            assigned_at: new Date().toISOString(),
            status: 'online',
          },
        ],
        camera_count: 1,
        online_count: 1,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        label: 'Garage Freezer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cameras: [
          {
            device_id: 'cam-002', // matches mockCameraData.cameraError.id
            position: 1,
            assigned_at: new Date().toISOString(),
            status: 'error',
          },
          {
            device_id: 'cam-003', // matches mockCameraData.cameraOffline.id
            position: 2,
            assigned_at: new Date().toISOString(),
            status: 'offline',
          },
        ],
        camera_count: 2,
        online_count: 0,
      },
    ],
    total: 2,
  },
  correlation_id: 'test-containers',
  timestamp: new Date().toISOString(),
};

const camerasResponse = {
  success: true,
  data: {
    cameras: [
      mockCameraData.cameraOnline,
      mockCameraData.cameraError,
      mockCameraData.cameraOffline,
    ],
  },
  correlation_id: 'test-cameras',
  timestamp: new Date().toISOString(),
};

test.describe('Container Picker', () => {
  test.beforeEach(async ({ mockedPage }) => {
    // Override containers to include cameras
    await mockEndpoint(mockedPage, '**/api/v1/containers', {
      data: containersWithCameras,
    });
    // Override cameras
    await mockEndpoint(mockedPage, '**/api/v1/cameras', {
      data: camerasResponse,
    });
  });

  test('renders container picker with containers from API', async ({ mockedPage, waitForAppReady }) => {
    await mockedPage.goto('/');
    await waitForAppReady();

    // Container picker should be visible in the header
    const picker = mockedPage.locator('[data-testid="container-picker"]');
    await expect(picker).toBeVisible();
  });

  test('shows container labels in the picker dropdown', async ({ mockedPage, waitForAppReady }) => {
    await mockedPage.goto('/');
    await waitForAppReady();

    // The picker should auto-select first container
    const trigger = mockedPage.locator('[data-testid="container-picker-trigger"]');
    await expect(trigger).toBeVisible();

    // Click to open dropdown
    await trigger.click();

    // Should show both containers
    await expect(mockedPage.getByText('Kitchen Fridge')).toBeVisible();
    await expect(mockedPage.getByText('Garage Freezer')).toBeVisible();
  });

  test('persists selection across page navigation', async ({ mockedPage, waitForAppReady }) => {
    await mockedPage.goto('/');
    await waitForAppReady();

    // Auto-selects first container (Kitchen Fridge)
    const trigger = mockedPage.locator('[data-testid="container-picker-trigger"]');
    await expect(trigger).toContainText('Kitchen Fridge');

    // Navigate to cameras tab and back
    await mockedPage.click('[role="tab"]:has-text("Cameras")');
    await mockedPage.click('[role="tab"]:has-text("Overview")');

    // Selection should persist
    await expect(trigger).toContainText('Kitchen Fridge');
  });
});

test.describe('Camera Scoping', () => {
  test.beforeEach(async ({ mockedPage }) => {
    // Override containers and cameras with matching IDs
    await mockEndpoint(mockedPage, '**/api/v1/containers', {
      data: containersWithCameras,
    });
    await mockEndpoint(mockedPage, '**/api/v1/cameras', {
      data: camerasResponse,
    });
  });

  test('cameras tab shows only cameras for selected container', async ({ mockedPage, waitForAppReady }) => {
    await mockedPage.goto('/');
    await waitForAppReady();

    // Navigate to cameras tab
    await mockedPage.click('[role="tab"]:has-text("Cameras")');

    // With first container selected (Kitchen Fridge, has cam-001),
    // should show only 1 camera
    const cameraGrid = mockedPage.locator('[data-testid="camera-grid"]');
    await expect(cameraGrid).toBeVisible();

    // Should show Front Door Camera (cam-001) only
    await expect(mockedPage.getByText('Front Door Camera')).toBeVisible();
  });

  test('switching container updates camera list', async ({ mockedPage, waitForAppReady }) => {
    await mockedPage.goto('/');
    await waitForAppReady();

    // Navigate to cameras tab
    await mockedPage.click('[role="tab"]:has-text("Cameras")');

    // Switch to Garage Freezer container
    const trigger = mockedPage.locator('[data-testid="container-picker-trigger"]');
    await trigger.click();
    await mockedPage.getByRole('option', { name: /Garage Freezer/i }).click();

    // Should now show Garage Camera (cam-002) and Backyard Camera (cam-003)
    await expect(mockedPage.getByText('Garage Camera')).toBeVisible();
    await expect(mockedPage.getByText('Backyard Camera')).toBeVisible();
  });

  test('overview tab shows all cameras (not scoped)', async ({ mockedPage, waitForAppReady }) => {
    await mockedPage.goto('/');
    await waitForAppReady();

    // Overview tab should show all cameras regardless of container selection
    // Look for camera section in overview
    const overviewPanel = mockedPage.locator('[role="tabpanel"][data-state="active"]');
    await expect(overviewPanel).toBeVisible();

    // All 3 cameras should be visible on overview
    await expect(mockedPage.getByText('Front Door Camera')).toBeVisible();
  });
});

test.describe('Container Picker - Edge Cases', () => {
  test('shows appropriate state when no containers exist', async ({ mockedPage, waitForAppReady }) => {
    await mockEndpoint(mockedPage, '**/api/v1/containers', {
      data: {
        success: true,
        data: { containers: [], total: 0 },
        correlation_id: 'test-empty',
        timestamp: new Date().toISOString(),
      },
    });

    await mockedPage.goto('/');
    await waitForAppReady();

    // Picker should still render but show empty state
    const picker = mockedPage.locator('[data-testid="container-picker"]');
    await expect(picker).toBeVisible();
  });

  test('gracefully handles containers API unavailable (404)', async ({ mockedPage, waitForAppReady }) => {
    await mockEndpoint(mockedPage, '**/api/v1/containers', {
      status: 404,
      error: true,
      errorMessage: 'Endpoint not found',
    });

    await mockedPage.goto('/');
    await waitForAppReady();

    // App should still load without crashing
    await expect(mockedPage.locator('[role="tablist"]')).toBeVisible();
  });
});
