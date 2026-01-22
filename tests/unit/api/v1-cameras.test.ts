/**
 * V1 Cameras API Client Tests
 * Feature: 034-esp-camera-integration (T008)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import { v1CamerasApi } from '@/infrastructure/api/v1-cameras';
import { V1ApiError } from '@/infrastructure/api/errors';
import {
  createV1CamerasHandlers,
  mockCameras,
  mockDiagnostics,
  mockBase64Image,
  v1CamerasErrorHandlers,
} from '../../mocks/v1-cameras-handlers';

// ============================================================================
// Test Server Setup
// ============================================================================

const server = setupServer(...createV1CamerasHandlers());

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ============================================================================
// List Cameras Tests
// ============================================================================

describe('v1CamerasApi.list', () => {
  it('should return array of cameras', async () => {
    const cameras = await v1CamerasApi.list();

    expect(cameras).toBeInstanceOf(Array);
    expect(cameras.length).toBe(mockCameras.length);
  });

  it('should include camera properties', async () => {
    const cameras = await v1CamerasApi.list();
    const camera = cameras[0];

    expect(camera).toHaveProperty('id');
    expect(camera).toHaveProperty('name');
    expect(camera).toHaveProperty('status');
    expect(camera).toHaveProperty('lastSeen');
  });

  it('should include health metrics for online cameras', async () => {
    const cameras = await v1CamerasApi.list();
    const onlineCamera = cameras.find((c) => c.status === 'online');

    expect(onlineCamera?.health).toBeDefined();
    expect(onlineCamera?.health?.wifi_rssi).toBeTypeOf('number');
    expect(onlineCamera?.health?.free_heap).toBeTypeOf('number');
    expect(onlineCamera?.health?.resolution).toBeDefined();
  });

  it('should handle empty camera list', async () => {
    server.use(
      http.get('/api/v1/cameras', () =>
        HttpResponse.json({ cameras: [], count: 0 })
      )
    );

    const cameras = await v1CamerasApi.list();

    expect(cameras).toEqual([]);
  });

  it('should throw V1ApiError on server error', async () => {
    server.use(
      http.get('/api/v1/cameras', () =>
        HttpResponse.json(
          { error: 'Internal error', code: 'INTERNAL_ERROR', retryable: true },
          { status: 500 }
        )
      )
    );

    await expect(v1CamerasApi.list()).rejects.toThrow(V1ApiError);
  });
});

// ============================================================================
// Get Camera By ID Tests
// ============================================================================

describe('v1CamerasApi.getById', () => {
  it('should return camera by ID', async () => {
    const camera = await v1CamerasApi.getById('AA:BB:CC:DD:EE:01');

    expect(camera.id).toBe('AA:BB:CC:DD:EE:01');
    expect(camera.name).toBe('Front Door Camera');
  });

  it('should throw CAMERA_NOT_FOUND for invalid ID', async () => {
    try {
      await v1CamerasApi.getById('INVALID:ID');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(V1ApiError);
      expect((error as V1ApiError).code).toBe('CAMERA_NOT_FOUND');
    }
  });

  it('should URL-encode camera IDs with special characters', async () => {
    // The MAC address contains colons which should be encoded
    const camera = await v1CamerasApi.getById('AA:BB:CC:DD:EE:02');

    expect(camera.id).toBe('AA:BB:CC:DD:EE:02');
  });
});

// ============================================================================
// Get Diagnostics Tests
// ============================================================================

describe('v1CamerasApi.getDiagnostics', () => {
  it('should return diagnostics for all cameras', async () => {
    const diagnostics = await v1CamerasApi.getDiagnostics();

    expect(diagnostics).toBeInstanceOf(Array);
    expect(diagnostics.length).toBe(mockDiagnostics.length);
  });

  it('should include diagnostics info', async () => {
    const diagnostics = await v1CamerasApi.getDiagnostics();
    const diag = diagnostics[0];

    expect(diag.diagnostics).toBeDefined();
    expect(diag.diagnostics?.connection_quality).toBeDefined();
    expect(diag.diagnostics?.error_count).toBeTypeOf('number');
  });

  it('should include last_error for cameras with errors', async () => {
    const diagnostics = await v1CamerasApi.getDiagnostics();
    const offlineCamera = diagnostics.find((d) => d.status === 'offline');

    expect(offlineCamera?.diagnostics?.last_error).toBeDefined();
    expect(offlineCamera?.diagnostics?.error_count).toBeGreaterThan(0);
  });
});

// ============================================================================
// Capture Tests
// ============================================================================

describe('v1CamerasApi.capture', () => {
  it('should return base64 image on success', async () => {
    const result = await v1CamerasApi.capture('AA:BB:CC:DD:EE:01');

    expect(result.success).toBe(true);
    expect(result.image).toBe(mockBase64Image);
    expect(result.timestamp).toBeDefined();
    expect(result.camera_id).toBe('AA:BB:CC:DD:EE:01');
  });

  it('should include file size', async () => {
    const result = await v1CamerasApi.capture('AA:BB:CC:DD:EE:01');

    expect(result.file_size).toBeTypeOf('number');
    expect(result.file_size).toBeGreaterThan(0);
  });

  it('should throw CAMERA_OFFLINE for offline camera', async () => {
    try {
      await v1CamerasApi.capture('AA:BB:CC:DD:EE:03');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(V1ApiError);
      expect((error as V1ApiError).code).toBe('CAMERA_OFFLINE');
      expect((error as V1ApiError).retryable).toBe(true);
    }
  });

  it('should throw CAMERA_NOT_FOUND for invalid ID', async () => {
    try {
      await v1CamerasApi.capture('INVALID:ID');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(V1ApiError);
      expect((error as V1ApiError).code).toBe('CAMERA_NOT_FOUND');
    }
  });

  it('should handle capture timeout', async () => {
    server.use(
      http.post('/api/v1/cameras/:id/capture', async () => {
        await delay(100);
        return HttpResponse.json(
          { error: 'Capture timed out', code: 'CAPTURE_TIMEOUT', retryable: true },
          { status: 408 }
        );
      })
    );

    try {
      await v1CamerasApi.capture('AA:BB:CC:DD:EE:01');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(V1ApiError);
      expect((error as V1ApiError).code).toBe('CAPTURE_TIMEOUT');
    }
  });
});

// ============================================================================
// Reboot Tests
// ============================================================================

describe('v1CamerasApi.reboot', () => {
  it('should return success on reboot', async () => {
    const result = await v1CamerasApi.reboot('AA:BB:CC:DD:EE:01');

    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });

  it('should throw CAMERA_OFFLINE for offline camera', async () => {
    try {
      await v1CamerasApi.reboot('AA:BB:CC:DD:EE:03');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(V1ApiError);
      expect((error as V1ApiError).code).toBe('CAMERA_OFFLINE');
    }
  });

  it('should throw CAMERA_NOT_FOUND for invalid ID', async () => {
    try {
      await v1CamerasApi.reboot('INVALID:ID');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(V1ApiError);
      expect((error as V1ApiError).code).toBe('CAMERA_NOT_FOUND');
    }
  });

  it('should handle reboot failure', async () => {
    server.use(
      http.post('/api/v1/cameras/:id/reboot', () =>
        HttpResponse.json(
          { error: 'Reboot failed', code: 'REBOOT_FAILED', retryable: true },
          { status: 500 }
        )
      )
    );

    try {
      await v1CamerasApi.reboot('AA:BB:CC:DD:EE:01');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(V1ApiError);
      expect((error as V1ApiError).code).toBe('REBOOT_FAILED');
    }
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('v1CamerasApi error handling', () => {
  // Note: These tests have longer timeouts because the API client has retry logic
  // with exponential backoff (3 retries, 1s base delay)

  it('should handle network errors', async () => {
    // Must mock both V1 and legacy endpoints since the API has fallback behavior
    server.use(
      v1CamerasErrorHandlers.networkError,
      v1CamerasErrorHandlers.legacyNetworkError
    );

    await expect(v1CamerasApi.list()).rejects.toThrow(V1ApiError);
  }, 30000); // 30s timeout for retries

  it('should throw V1ApiError on 400 response', async () => {
    // Mock V1 with 400 error (no retries for 4xx)
    // Also mock legacy to return same error - both must fail for error to propagate
    server.use(
      http.get('/api/v1/cameras', () =>
        HttpResponse.json(
          { error: 'Bad request', code: 'VALIDATION_ERROR', retryable: false },
          { status: 400 }
        )
      ),
      http.get('/api/dashboard/cameras', () =>
        HttpResponse.json(
          { error: 'Bad request' },
          { status: 400 }
        )
      )
    );

    await expect(v1CamerasApi.list()).rejects.toThrow(V1ApiError);
  }, 10000);
});
