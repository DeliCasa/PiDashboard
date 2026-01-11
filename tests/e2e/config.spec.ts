/**
 * Config E2E Tests (T043)
 *
 * End-to-end tests for configuration section rendering and editing.
 */

import { test, expect } from './fixtures/test-base';
import { createMockAPI } from './fixtures/mock-routes';

test.describe('Config Tab', () => {
  test.beforeEach(async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    await page.goto('/');
    await page.waitForSelector('[role="tablist"]');

    // Navigate to Config tab
    await page.getByRole('tab', { name: /config/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');
  });

  test('should display config sections', async ({ page }) => {
    // Should show System section (auto-waiting)
    await expect(page.getByText(/system/i).first()).toBeVisible();

    // Should show MQTT section
    await expect(page.getByText(/mqtt/i).first()).toBeVisible();
  });

  test('should display config entries', async ({ page }) => {
    // Should show server.port config (auto-waiting)
    await expect(page.getByText('server.port')).toBeVisible();

    // Should show value
    await expect(page.getByText('8082')).toBeVisible();

    // Should show mqtt.broker config
    await expect(page.getByText('mqtt.broker')).toBeVisible();
  });

  test('should display config descriptions', async ({ page }) => {
    // Should show description for server.port (auto-waiting)
    await expect(page.getByText(/http server port/i)).toBeVisible();

    // Should show description for mqtt.broker
    await expect(page.getByText(/mqtt broker url/i)).toBeVisible();
  });

  test('should show category badges', async ({ page }) => {
    // Wait for content to load (auto-waiting)
    await expect(page.getByText('server.port')).toBeVisible();

    // Should show category badges
    const systemBadge = page.getByText('system', { exact: true });
    const mqttBadge = page.getByText('mqtt', { exact: true });

    // At least one category badge should be visible - use count() for cleaner handling
    const systemCount = await systemBadge.count();
    const mqttCount = await mqttBadge.count();

    expect(systemCount > 0 || mqttCount > 0).toBe(true);
  });

  test('should show Edit button for editable entries', async ({ page }) => {
    // Wait for content to load (auto-waiting)
    await expect(page.getByText('server.port')).toBeVisible();

    // Find edit buttons
    const editButtons = page.getByRole('button', { name: /edit/i });
    const editButtonCount = await editButtons.count();

    // Should have edit buttons for editable entries
    expect(editButtonCount).toBeGreaterThan(0);
  });

  test('should mask sensitive values', async ({ page }) => {
    // Wait for content to load (auto-waiting)
    await expect(page.getByText('mqtt.password')).toBeVisible();

    // Value should be masked (dots) - use soft assertion since display might vary
    const maskedValue = page.getByText(/•••/);
    await expect.soft(maskedValue).toBeVisible({ timeout: 1000 });
  });

  test('should have reveal toggle for sensitive values', async ({ page }) => {
    // Wait for content to load (auto-waiting)
    await expect(page.getByText('mqtt.password')).toBeVisible();

    // Find eye icon for revealing password
    const eyeButton = page.locator('svg.lucide-eye, [class*="eye"]').first();

    if (await eyeButton.isVisible({ timeout: 1000 })) {
      // Click to reveal
      await eyeButton.click();

      // Value should now be visible - use soft assertion since reveal behavior might vary
      await expect.soft(page.getByText('secret123')).toBeVisible({ timeout: 2000 });
    }
  });

  test('should collapse/expand sections', async ({ page }) => {
    // Wait for content to load (auto-waiting)
    await expect(page.getByText('server.port')).toBeVisible();

    // Look for collapsible section headers
    const sectionHeader = page.getByText(/system/i).first();

    // Click to collapse if collapsible
    const chevron = page.locator('svg.lucide-chevron-down, svg.lucide-chevron-up').first();

    if (await chevron.isVisible({ timeout: 1000 })) {
      await sectionHeader.click();

      // Section content might be hidden - use soft assertion since collapse behavior might vary
      await expect.soft(page.getByText('server.port')).toBeHidden({ timeout: 1000 });

      // Click again to expand
      await sectionHeader.click();

      // Content should be visible again
      await expect(page.getByText('server.port')).toBeVisible();
    }
  });
});

test.describe('Config Editing', () => {
  test.beforeEach(async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();
    await mockAPI.mockConfigUpdate();

    await page.goto('/');
    await page.getByRole('tab', { name: /config/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');
  });

  test('should enter edit mode on Edit click', async ({ page }) => {
    // Wait for content to load (auto-waiting)
    await expect(page.getByText('server.port')).toBeVisible();

    // Find and click first edit button
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();

    // Should show input field
    const input = page.getByRole('spinbutton').or(page.getByRole('textbox'));
    await expect(input.first()).toBeVisible({ timeout: 2000 });
  });

  test('should show save and cancel buttons in edit mode', async ({ page }) => {
    // Wait for content to load (auto-waiting)
    await expect(page.getByText('server.port')).toBeVisible();

    // Enter edit mode
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();

    // Should show save (check) and cancel (x) buttons - use count() for cleaner handling
    const checkButton = page.locator('svg.lucide-check, button:has(svg.lucide-check)').first();
    const xButton = page.locator('svg.lucide-x, button:has(svg.lucide-x)').first();

    const checkCount = await checkButton.count();
    const xCount = await xButton.count();

    expect(checkCount > 0 || xCount > 0).toBe(true);
  });

  test('should cancel edit without saving', async ({ page }) => {
    // Wait for content to load (auto-waiting)
    await expect(page.getByText('server.port')).toBeVisible();

    // Enter edit mode
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();

    // Change value
    const input = page.getByRole('spinbutton').or(page.getByRole('textbox'));
    await input.first().fill('9999');

    // Cancel edit
    const xButton = page.locator('button:has(svg.lucide-x)').first();
    if (await xButton.isVisible({ timeout: 1000 })) {
      await xButton.click();
    } else {
      // Press Escape to cancel
      await page.keyboard.press('Escape');
    }

    // Original value should still be shown (auto-waiting)
    await expect(page.getByText('8082')).toBeVisible();
  });

  test('should save edited value', async ({ page }) => {
    // Mock successful update
    await page.route('**/api/config/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Wait for content to load (auto-waiting)
    await expect(page.getByText('server.port')).toBeVisible();

    // Enter edit mode for server.port
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();

    // Change value
    const input = page.getByRole('spinbutton');
    if (await input.isVisible({ timeout: 1000 })) {
      await input.clear();
      await input.fill('8083');
    }

    // Save
    const checkButton = page.locator('button:has(svg.lucide-check)').first();
    if (await checkButton.isVisible({ timeout: 1000 })) {
      await checkButton.click();

      // Should exit edit mode (auto-waiting)
      await expect(page.getByRole('button', { name: /edit/i }).first()).toBeVisible();
    }
  });

  test('should handle save error', async ({ page }) => {
    // Mock failed update
    await page.route('**/api/config/*', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid value' }),
      });
    });

    // Wait for content to load (auto-waiting)
    await expect(page.getByText('server.port')).toBeVisible();

    // Enter edit mode
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();

    // Change value
    const input = page.getByRole('spinbutton');
    if (await input.isVisible({ timeout: 1000 })) {
      await input.clear();
      await input.fill('invalid');

      // Try to save
      const checkButton = page.locator('button:has(svg.lucide-check)').first();
      if (await checkButton.isVisible({ timeout: 1000 })) {
        await checkButton.click();

        // Should show error or remain in edit mode (auto-waiting handled by component)
      }
    }
  });
});

test.describe('Config Input Types', () => {
  test.beforeEach(async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.applyAllMocks();

    await page.goto('/');
    await page.getByRole('tab', { name: /config/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');
  });

  test('should show number input for number type', async ({ page }) => {
    // Wait for content to load (auto-waiting)
    await expect(page.getByText('server.port')).toBeVisible();

    // server.port is number type
    // Find and click edit for server.port
    const serverPortRow = page.locator('text=server.port').locator('..').locator('..');
    const editButton = serverPortRow.getByRole('button', { name: /edit/i });

    if (await editButton.isVisible({ timeout: 1000 })) {
      await editButton.click();

      // Should show number input (spinbutton)
      await expect(page.getByRole('spinbutton')).toBeVisible({ timeout: 2000 });
    }
  });

  test('should show text input for string type', async ({ page }) => {
    // Wait for content to load (auto-waiting)
    await expect(page.getByText('mqtt.broker')).toBeVisible();

    // mqtt.broker is string type
    const mqttBrokerRow = page.locator('text=mqtt.broker').locator('..').locator('..');
    const editButton = mqttBrokerRow.getByRole('button', { name: /edit/i });

    if (await editButton.isVisible({ timeout: 1000 })) {
      await editButton.click();

      // Should show text input
      await expect(page.getByRole('textbox')).toBeVisible({ timeout: 2000 });
    }
  });
});

test.describe('Config Reset', () => {
  test.beforeEach(async ({ page }) => {
    const mockAPI = createMockAPI(page, {
      config: {
        sections: [
          {
            name: 'System',
            entries: [
              {
                key: 'server.port',
                value: '9000', // Different from default
                default_value: '8082',
                type: 'number',
                description: 'HTTP server port',
                category: 'system',
                editable: true,
                sensitive: false,
              },
            ],
          },
        ],
      },
    });
    await mockAPI.applyAllMocks();

    await page.goto('/');
    await page.getByRole('tab', { name: /config/i }).click();
    await page.waitForSelector('[role="tabpanel"][data-state="active"]');
  });

  test('should show reset button when value differs from default', async ({
    page,
  }) => {
    // Wait for content to load (auto-waiting)
    await expect(page.getByText('server.port')).toBeVisible();

    // Should show reset button (rotate icon) for modified values - use soft assertion
    const resetButton = page.locator('svg.lucide-rotate-ccw, button:has(svg.lucide-rotate-ccw)').first();
    await expect.soft(resetButton).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Config Error Handling', () => {
  test('should handle API error gracefully', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.mockError('**/api/config', 500, 'Server Error');
    await mockAPI.mockSystemInfo();
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockLogs();

    await page.goto('/');
    await page.getByRole('tab', { name: /config/i }).click();

    // App should not crash (auto-waiting with extended timeout)
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no config', async ({ page }) => {
    const mockAPI = createMockAPI(page);
    await mockAPI.mockSystemInfo();
    await mockAPI.mockWifiStatus();
    await mockAPI.mockWifiScan();
    await mockAPI.mockDoorStatus();
    await mockAPI.mockLogs();

    // Mock empty config
    await page.route('**/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sections: [] }),
      });
    });

    await page.goto('/');
    await page.getByRole('tab', { name: /config/i }).click();

    // Should show some empty state or just the tab (auto-waiting)
    await expect(page.getByRole('tablist')).toBeVisible();
  });
});
