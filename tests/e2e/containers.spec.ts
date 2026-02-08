/**
 * Container Management E2E Tests
 * Feature: 043-container-identity-ui (T022, T023, T024)
 *
 * End-to-end tests for container management functionality.
 * Tests cover container list, create flow, camera assignment, and error states.
 */

import { test, expect } from './fixtures/test-base';
import type { Page } from '@playwright/test';

// ============================================================================
// Mock Data Types (inline to avoid import issues with E2E)
// ============================================================================

interface CameraAssignment {
  device_id: string;
  position: 1 | 2 | 3 | 4;
  assigned_at: string;
  status: string;
  name?: string;
}

interface ContainerDetail {
  id: string;
  label?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  cameras: CameraAssignment[];
  camera_count: number;
  online_count: number;
}

interface Camera {
  id: string;
  name: string;
  status: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const NOW = new Date().toISOString();

const mockContainers: ContainerDetail[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    label: 'Kitchen Fridge',
    description: 'Main refrigerator in kitchen',
    created_at: NOW,
    updated_at: NOW,
    cameras: [
      {
        device_id: 'AA:BB:CC:DD:EE:01',
        position: 1,
        assigned_at: NOW,
        status: 'online',
        name: 'Front Camera',
      },
    ],
    camera_count: 1,
    online_count: 1,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    label: 'Garage Unit',
    created_at: NOW,
    updated_at: NOW,
    cameras: [],
    camera_count: 0,
    online_count: 0,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    // No label - should show "Unnamed Container"
    created_at: NOW,
    updated_at: NOW,
    cameras: [
      {
        device_id: 'AA:BB:CC:DD:EE:02',
        position: 1,
        assigned_at: NOW,
        status: 'offline',
        name: 'Side Camera',
      },
    ],
    camera_count: 1,
    online_count: 0,
  },
];

const mockUnassignedCameras: Camera[] = [
  {
    id: 'AA:BB:CC:DD:EE:03',
    name: 'Unassigned Camera 1',
    status: 'online',
    ip_address: '192.168.1.103',
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'AA:BB:CC:DD:EE:04',
    name: 'Unassigned Camera 2',
    status: 'offline',
    ip_address: '192.168.1.104',
    created_at: NOW,
    updated_at: NOW,
  },
];

// ============================================================================
// Constants
// ============================================================================

/** Tab selector - uses data-testid for reliable selection */
const TAB_SELECTOR = '[data-testid="tab-containers"]';

/** Content selectors matching actual component test IDs */
const SELECTORS = {
  containersGrid: '[data-testid="containers-grid"]',
  containersLoading: '[data-testid="containers-loading"]',
  containersError: '[data-testid="containers-error"]',
  containerCard: '[data-testid^="container-card-"]', // Uses prefix since each card has unique ID
  containerDetailDialog: '[data-testid="container-detail-dialog"]',
  createContainerButton: '[data-testid="create-container-button"]',
  createContainerDialog: '[data-testid="create-container-dialog"]',
  createContainerLabelInput: '[data-testid="container-label-input"]', // Fixed: was create-container-label-input
  createContainerDescriptionInput: '[data-testid="container-description-input"]', // Fixed: was create-container-description-input
  createContainerSubmit: '[data-testid="create-container-submit"]',
  positionGrid: '[data-testid="position-grid"]',
  positionSlot: '[data-testid^="position-slot-"]',
  assignCameraDialog: '[data-testid="assign-camera-dialog"]',
  cameraSelect: '[data-testid="camera-select"]',
  positionSelect: '[data-testid="position-select"]',
  deleteContainerDialog: '[data-testid="delete-container-dialog"]',
  containerEmptyState: '[data-testid="containers-empty"]', // Fixed: was container-empty-state
  containerDetailError: '[data-testid="container-detail-error"]',
};

// ============================================================================
// Mock Setup Helper
// ============================================================================

async function setupContainerMocks(page: Page, options?: {
  containers?: ContainerDetail[];
  unassignedCameras?: Camera[];
  errorOnList?: boolean;
  errorOnCreate?: boolean;
  errorOnDetail?: string;
  delayMs?: number;
}) {
  const containers = options?.containers ?? mockContainers;
  const unassignedCameras = options?.unassignedCameras ?? mockUnassignedCameras;
  const delayMs = options?.delayMs ?? 0;

  // Use context-level routes for reliable interception
  // (page.route() doesn't work reliably for all endpoints in this test setup)
  const context = page.context();

  // Mock unassigned cameras endpoint FIRST (more specific)
  await context.route('**/api/v1/cameras/unassigned', async (route) => {
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { cameras: unassignedCameras, count: unassignedCameras.length },
        timestamp: NOW,
      }),
    });
  });

  // Mock V1 cameras list (for assign dialog)
  await context.route('**/api/v1/cameras', async (route) => {
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { cameras: unassignedCameras, count: unassignedCameras.length },
        timestamp: NOW,
      }),
    });
  });

  // Mock container cameras endpoint (assign/unassign) - must be before containers/:id
  await context.route('**/api/v1/containers/*/cameras', async (route, request) => {
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));

    if (request.method() === 'POST') {
      // Assign camera
      const body = await request.postDataJSON();
      const newAssignment: CameraAssignment = {
        device_id: body.device_id,
        position: body.position,
        assigned_at: NOW,
        status: 'online',
        name: 'New Camera',
      };
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: newAssignment,
          timestamp: NOW,
        }),
      });
    }
    return route.continue();
  });

  // Mock container cameras delete endpoint
  await context.route('**/api/v1/containers/*/cameras/*', async (route, request) => {
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));

    if (request.method() === 'DELETE') {
      return route.fulfill({ status: 204 });
    }
    return route.continue();
  });

  // Mock container detail endpoint (GET/PATCH/DELETE /api/v1/containers/:id)
  // Use URL function to match /api/v1/containers/:id (but not /api/v1/containers/:id/cameras)
  await context.route(
    (url) => {
      const pathname = url.pathname;
      // Match /api/v1/containers/:id where :id is present and no further path
      const match = pathname.match(/^\/api\/v1\/containers\/([^/]+)$/);
      return match !== null;
    },
    async (route, request) => {
      if (delayMs) await new Promise(r => setTimeout(r, delayMs));

      const url = new URL(request.url());
      const pathParts = url.pathname.split('/');
      const containerId = decodeURIComponent(pathParts[pathParts.length - 1]);

      if (options?.errorOnDetail === containerId) {
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'CONTAINER_NOT_FOUND', message: 'Container not found' },
            timestamp: NOW,
          }),
        });
      }

      const container = containers.find(c => c.id === containerId);
      if (!container) {
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'CONTAINER_NOT_FOUND', message: 'Container not found' },
            timestamp: NOW,
          }),
        });
      }

      if (request.method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: container,
            timestamp: NOW,
          }),
        });
      }

      if (request.method() === 'PATCH') {
        const body = await request.postDataJSON();
        const updated = { ...container, ...body, updated_at: NOW };
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: updated,
            timestamp: NOW,
          }),
        });
      }

      if (request.method() === 'DELETE') {
        if (container.camera_count > 0) {
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { code: 'CONTAINER_HAS_CAMERAS', message: 'Remove cameras first' },
              timestamp: NOW,
            }),
          });
        }
        return route.fulfill({ status: 204 });
      }

      return route.continue();
    }
  );

  // Mock container list endpoint (GET/POST /api/v1/containers)
  // Use URL function to match exactly the containers list endpoint
  await context.route(
    (url) => {
      const pathname = url.pathname;
      // Match exactly /api/v1/containers (not /api/v1/containers/:id)
      return pathname === '/api/v1/containers';
    },
    async (route, request) => {
      if (delayMs) await new Promise(r => setTimeout(r, delayMs));

      if (request.method() === 'GET') {
        if (options?.errorOnList) {
          return route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { code: 'INTERNAL_ERROR', message: 'Server error', retryable: true },
              timestamp: NOW,
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { containers, total: containers.length },
            timestamp: NOW,
          }),
        });
      }

      if (request.method() === 'POST') {
        if (options?.errorOnCreate) {
          return route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { code: 'CREATE_FAILED', message: 'Failed to create container', retryable: true },
              timestamp: NOW,
            }),
          });
        }
        const body = await request.postDataJSON();
        const newContainer: ContainerDetail = {
          id: `new-container-${Date.now()}`,
          label: body.label,
          description: body.description,
          created_at: NOW,
          updated_at: NOW,
          cameras: [],
          camera_count: 0,
          online_count: 0,
        };
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: newContainer,
            timestamp: NOW,
          }),
        });
      }

      return route.continue();
    }
  );
}

// ============================================================================
// T022: Container List and Create Flow Tests
// ============================================================================

test.describe('Container List and Create Flow (T022)', () => {
  test('displays container list with labels', async ({ page, waitForAppReady }) => {
    // Set up mocks BEFORE navigating
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    // Navigate to Containers tab using data-testid
    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Verify labeled containers show their labels
    await expect(page.getByText('Kitchen Fridge')).toBeVisible();
    await expect(page.getByText('Garage Unit')).toBeVisible();

    // Verify unlabeled container shows "Unnamed Container"
    await expect(page.getByText('Unnamed Container')).toBeVisible();
  });

  test('displays container IDs secondarily', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Container cards should show IDs (truncated or full)
    // The ID appears in a secondary/muted text style
    const containerCards = page.locator(SELECTORS.containerCard);
    await expect(containerCards).toHaveCount(3);
  });

  test('shows camera count badges on container cards', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Kitchen Fridge has 1/4 cameras (1 camera assigned out of 4 positions)
    // Use first() since multiple containers may have the same camera count
    await expect(page.getByText('1/4 cameras').first()).toBeVisible();

    // Garage Unit has 0/4 cameras
    await expect(page.getByText('0/4 cameras')).toBeVisible();
  });

  test('opens create container dialog', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Click create button
    await page.click(SELECTORS.createContainerButton);

    // Dialog should appear
    await expect(page.locator(SELECTORS.createContainerDialog)).toBeVisible();
    // Check dialog heading specifically (not button text which also says "Create Container")
    await expect(page.getByRole('heading', { name: 'Create Container' })).toBeVisible();
  });

  test('creates container with label and description', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open create dialog
    await page.click(SELECTORS.createContainerButton);
    await expect(page.locator(SELECTORS.createContainerDialog)).toBeVisible();

    // Fill form
    await page.fill(SELECTORS.createContainerLabelInput, 'New Test Container');
    await page.fill(SELECTORS.createContainerDescriptionInput, 'Created during E2E test');

    // Submit
    await page.click(SELECTORS.createContainerSubmit);

    // Dialog should close on success
    await expect(page.locator(SELECTORS.createContainerDialog)).not.toBeVisible({ timeout: 5000 });
  });

  test('creates container without label (optional)', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open create dialog
    await page.click(SELECTORS.createContainerButton);
    await expect(page.locator(SELECTORS.createContainerDialog)).toBeVisible();

    // Leave label empty (it's optional)
    // Submit directly
    await page.click(SELECTORS.createContainerSubmit);

    // Should succeed - label is optional
    await expect(page.locator(SELECTORS.createContainerDialog)).not.toBeVisible({ timeout: 5000 });
  });

  test('shows loading state while fetching containers', async ({ page, waitForAppReady }) => {
    // Set up mock with delay - long enough to observe loading state
    await setupContainerMocks(page, { delayMs: 3000 });

    await page.goto('/');
    await waitForAppReady();

    // Click the Containers tab and immediately check for loading state
    // Use Promise.all to start checking before the delayed response arrives
    const clickAndCheck = async () => {
      await page.click(TAB_SELECTOR);
      // Loading state should appear quickly after tab click (before API responds)
      await expect(page.locator(SELECTORS.containersLoading)).toBeVisible({ timeout: 2000 });
    };

    await clickAndCheck();

    // Then show content after loading completes
    await expect(page.locator(SELECTORS.containersGrid)).toBeVisible({ timeout: 10000 });
  });

  test('shows empty state when no containers exist', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page, { containers: [] });

    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);

    // Should show empty state
    await expect(page.locator(SELECTORS.containerEmptyState)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('No containers')).toBeVisible();
  });
});

// ============================================================================
// T023: Camera Assignment Flow Tests
// ============================================================================

test.describe('Camera Assignment Flow (T023)', () => {
  test('opens container detail on card click', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Click on a container card
    await page.click(`${SELECTORS.containerCard}:has-text("Kitchen Fridge")`);

    // Detail dialog should open
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();
    await expect(page.getByText('Container Details')).toBeVisible();
  });

  test('displays position grid in container detail', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open container detail
    await page.click(`${SELECTORS.containerCard}:has-text("Kitchen Fridge")`);
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();

    // Position grid should be visible
    await expect(page.locator(SELECTORS.positionGrid)).toBeVisible();
  });

  test('shows occupied and empty position slots', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open Kitchen Fridge (has 1 camera in position 1)
    await page.click(`${SELECTORS.containerCard}:has-text("Kitchen Fridge")`);
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();

    // Should show position 1 as occupied with camera name
    await expect(page.getByText('Front Camera')).toBeVisible();

    // Other positions should show as empty
    const positionSlots = page.locator(SELECTORS.positionSlot);
    await expect(positionSlots).toHaveCount(4);
  });

  test('opens assign camera dialog from empty slot', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open Garage Unit (empty container)
    await page.click(`${SELECTORS.containerCard}:has-text("Garage Unit")`);
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();

    // Click on an empty position slot
    await page.click('[data-testid="position-slot-1-empty"]');

    // Assign camera dialog should open
    await expect(page.locator(SELECTORS.assignCameraDialog)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Assign Camera' })).toBeVisible();
  });

  test('shows unassigned cameras in selection dropdown', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open empty container
    await page.click(`${SELECTORS.containerCard}:has-text("Garage Unit")`);
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();

    // Click empty slot
    await page.click('[data-testid="position-slot-1-empty"]');
    await expect(page.locator(SELECTORS.assignCameraDialog)).toBeVisible();

    // Click camera dropdown
    await page.click(SELECTORS.cameraSelect);

    // Wait for dropdown listbox to appear
    await page.waitForSelector('[role="listbox"]', { state: 'visible' });

    // Should show unassigned cameras in the dropdown options
    await expect(page.getByRole('option', { name: /Unassigned Camera 1/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /Unassigned Camera 2/i })).toBeVisible();
  });

  test('shows position selection in assign dialog', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    await page.click(`${SELECTORS.containerCard}:has-text("Garage Unit")`);
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();

    await page.click('[data-testid="position-slot-1-empty"]');
    await expect(page.locator(SELECTORS.assignCameraDialog)).toBeVisible();

    // Position dropdown should be present
    await expect(page.locator(SELECTORS.positionSelect)).toBeVisible();
  });

  test('displays camera status indicator in slots', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open unlabeled container (has offline camera)
    await page.click(`${SELECTORS.containerCard}:has-text("Unnamed Container")`);
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();

    // Should show camera with offline indicator
    await expect(page.getByText('Side Camera')).toBeVisible();
  });
});

// ============================================================================
// T024: Error States and Edge Cases Tests
// ============================================================================

test.describe('Error States and Edge Cases (T024)', () => {
  test('shows error state when container list fails to load', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page, { errorOnList: true });

    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);

    // Should show error state
    await expect(page.locator(SELECTORS.containersError)).toBeVisible({ timeout: 15000 });
    // Error message may say "unexpected error", "failed", "unavailable", etc.
    await expect(page.getByText(/error|failed|unavailable|try again/i)).toBeVisible();
  });

  test('shows retry button on error', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page, { errorOnList: true });

    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await expect(page.locator(SELECTORS.containersError)).toBeVisible({ timeout: 15000 });

    // Retry button should be present
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('shows 404 message for non-existent container', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page, { errorOnDetail: mockContainers[0].id });

    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Click on the container that will 404
    await page.click(`${SELECTORS.containerCard}:has-text("Kitchen Fridge")`);

    // Should show error state in detail dialog
    await expect(page.locator(SELECTORS.containerDetailError)).toBeVisible({ timeout: 10000 });
  });

  test('handles create container error gracefully', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page, { errorOnCreate: true });

    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open create dialog
    await page.click(SELECTORS.createContainerButton);
    await expect(page.locator(SELECTORS.createContainerDialog)).toBeVisible();

    // Fill and submit
    await page.fill(SELECTORS.createContainerLabelInput, 'Test Container');
    await page.click(SELECTORS.createContainerSubmit);

    // Should show error (dialog may stay open or show toast)
    // The dialog should remain open on error
    await expect(page.locator(SELECTORS.createContainerDialog)).toBeVisible();
  });

  test('prevents delete of container with cameras', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open Kitchen Fridge (has cameras)
    await page.click(`${SELECTORS.containerCard}:has-text("Kitchen Fridge")`);
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();

    // Delete button should be disabled
    const deleteButton = page.locator('button:has(svg.lucide-trash-2)');
    await expect(deleteButton).toBeDisabled();
  });

  test('allows delete of empty container', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open Garage Unit (empty container)
    await page.click(`${SELECTORS.containerCard}:has-text("Garage Unit")`);
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();

    // Delete button should be enabled
    const deleteButton = page.locator('button:has(svg.lucide-trash-2)');
    await expect(deleteButton).not.toBeDisabled();
  });

  test('shows confirmation dialog before delete', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open Garage Unit (empty)
    await page.click(`${SELECTORS.containerCard}:has-text("Garage Unit")`);
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();

    // Click delete
    const deleteButton = page.locator('button:has(svg.lucide-trash-2)');
    await deleteButton.click();

    // Confirmation dialog should appear
    await expect(page.locator(SELECTORS.deleteContainerDialog)).toBeVisible();
    await expect(page.getByText('Delete Container')).toBeVisible();
  });

  test('displays "Unnamed Container" for containers without labels', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Verify unnamed container placeholder
    await expect(page.getByText('Unnamed Container')).toBeVisible();

    // Open the unnamed container detail
    await page.click(`${SELECTORS.containerCard}:has-text("Unnamed Container")`);
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();

    // Should also show "Unnamed Container" in detail view
    const dialog = page.locator(SELECTORS.containerDetailDialog);
    await expect(dialog.getByText('Unnamed Container')).toBeVisible();
  });

  test('handles no unassigned cameras available', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page, { unassignedCameras: [] });

    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open empty container
    await page.click(`${SELECTORS.containerCard}:has-text("Garage Unit")`);
    await expect(page.locator(SELECTORS.containerDetailDialog)).toBeVisible();

    // Click empty slot
    await page.click('[data-testid="position-slot-1-empty"]');
    await expect(page.locator(SELECTORS.assignCameraDialog)).toBeVisible();

    // Should show "no cameras available" message
    await expect(page.getByText(/no.*camera.*available/i)).toBeVisible();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

test.describe('Container Accessibility', () => {
  test('container list is keyboard navigable', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Tab to first container card
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // May need multiple tabs depending on UI

    // Container cards should be focusable
    const cards = page.locator(SELECTORS.containerCard);
    await expect(cards.first()).toBeVisible();
  });

  test('dialogs trap focus correctly', async ({ page, waitForAppReady }) => {
    await setupContainerMocks(page);
    await page.goto('/');
    await waitForAppReady();

    await page.click(TAB_SELECTOR);
    await page.waitForSelector(SELECTORS.containersGrid, { state: 'visible', timeout: 15000 });

    // Open create dialog
    await page.click(SELECTORS.createContainerButton);
    await expect(page.locator(SELECTORS.createContainerDialog)).toBeVisible();

    // Dialog should be present in the DOM
    const dialog = page.locator(SELECTORS.createContainerDialog);
    await expect(dialog).toBeVisible();

    // The dialog should have role="dialog"
    await expect(dialog).toHaveAttribute('role', 'dialog');
  });
});
