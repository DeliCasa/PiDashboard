/**
 * MSW Handlers for V1 Cameras API
 * Feature: 034-esp-camera-integration
 *
 * Mock Service Worker handlers for camera endpoints.
 */

import { http, HttpResponse, delay } from 'msw';
import type {
  Camera,
  CameraDiagnostics,
  CaptureResult,
  RebootResult,
  CameraListResponse,
  CameraErrorCode,
} from '@/infrastructure/api/v1-cameras-schemas';

// ============================================================================
// Constants
// ============================================================================

const BASE_URL = '/api/v1/cameras';
const LEGACY_URL = '/api/dashboard/cameras';

// ============================================================================
// Mock Data
// ============================================================================

export const mockCameras: Camera[] = [
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
      last_capture: new Date(Date.now() - 3600000).toISOString(),
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

export const mockDiagnostics: CameraDiagnostics[] = mockCameras.map((camera) => ({
  ...camera,
  diagnostics: {
    connection_quality: camera.status === 'online' ? 'good' : 'poor',
    error_count: camera.status === 'offline' ? 5 : 0,
    last_error: camera.status === 'offline' ? 'Connection timeout' : undefined,
  },
}));

// Sample base64 JPEG (1x1 red pixel, minimal valid JPEG)
export const mockBase64Image =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
  'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh' +
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR' +
  'CAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAA' +
  'AAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMB' +
  'AAIRAxEAPwCwAB//2Q==';

// ============================================================================
// Error Helpers
// ============================================================================

interface CameraError {
  error: string;
  code: CameraErrorCode;
  retryable: boolean;
  retry_after_seconds?: number;
}

function cameraError(
  code: CameraErrorCode,
  message: string,
  retryable: boolean = false,
  retryAfter?: number
): CameraError {
  return {
    error: message,
    code,
    retryable,
    retry_after_seconds: retryAfter,
  };
}

// ============================================================================
// Handlers Factory
// ============================================================================

export interface CameraMockState {
  cameras: Camera[];
  diagnostics: CameraDiagnostics[];
  captureDelay?: number;
  rebootDelay?: number;
}

const defaultState: CameraMockState = {
  cameras: [...mockCameras],
  diagnostics: [...mockDiagnostics],
  captureDelay: 500,
  rebootDelay: 200,
};

/**
 * Create V1 Cameras API handlers.
 */
export function createV1CamerasHandlers(overrides?: Partial<CameraMockState>) {
  const state = { ...defaultState, ...overrides };

  return [
    // GET /api/v1/cameras - List all cameras
    http.get(BASE_URL, async () => {
      await delay(100);
      return HttpResponse.json<CameraListResponse>({
        cameras: state.cameras,
        count: state.cameras.length,
      });
    }),

    // GET /api/v1/cameras/diagnostics - Get all diagnostics
    // NOTE: This must come BEFORE the /:id route to avoid matching "diagnostics" as an ID
    http.get(`${BASE_URL}/diagnostics`, async () => {
      await delay(100);
      return HttpResponse.json(state.diagnostics);
    }),

    // GET /api/v1/cameras/:id - Get single camera
    http.get(`${BASE_URL}/:id`, async ({ params }) => {
      await delay(75);
      const id = decodeURIComponent(params.id as string);
      const camera = state.cameras.find((c) => c.id === id);

      if (!camera) {
        return HttpResponse.json(
          cameraError('CAMERA_NOT_FOUND', `Camera ${id} not found`),
          { status: 404 }
        );
      }

      return HttpResponse.json(camera);
    }),

    // POST /api/v1/cameras/:id/capture - Capture image
    http.post(`${BASE_URL}/:id/capture`, async ({ params }) => {
      await delay(state.captureDelay ?? 500);
      const id = decodeURIComponent(params.id as string);
      const camera = state.cameras.find((c) => c.id === id);

      if (!camera) {
        return HttpResponse.json(
          cameraError('CAMERA_NOT_FOUND', `Camera ${id} not found`),
          { status: 404 }
        );
      }

      if (camera.status === 'offline') {
        return HttpResponse.json(
          cameraError('CAMERA_OFFLINE', 'Camera is offline', true, 30),
          { status: 503 }
        );
      }

      if (camera.status === 'error') {
        return HttpResponse.json(
          cameraError('CAPTURE_FAILED', 'Camera in error state', true),
          { status: 500 }
        );
      }

      return HttpResponse.json<CaptureResult>({
        success: true,
        image: mockBase64Image,
        timestamp: new Date().toISOString(),
        camera_id: id,
        file_size: 2048,
      });
    }),

    // POST /api/v1/cameras/:id/reboot - Reboot camera
    http.post(`${BASE_URL}/:id/reboot`, async ({ params }) => {
      await delay(state.rebootDelay ?? 200);
      const id = decodeURIComponent(params.id as string);
      const camera = state.cameras.find((c) => c.id === id);

      if (!camera) {
        return HttpResponse.json(
          cameraError('CAMERA_NOT_FOUND', `Camera ${id} not found`),
          { status: 404 }
        );
      }

      if (camera.status === 'offline') {
        return HttpResponse.json(
          cameraError('CAMERA_OFFLINE', 'Camera is offline', true, 30),
          { status: 503 }
        );
      }

      return HttpResponse.json<RebootResult>({
        success: true,
        message: 'Reboot command sent successfully',
      });
    }),

    // ==========================================================================
    // Legacy Endpoints (for fallback behavior)
    // ==========================================================================

    // GET /api/dashboard/cameras - Legacy list
    http.get(LEGACY_URL, async () => {
      await delay(100);
      return HttpResponse.json({
        cameras: state.cameras,
        count: state.cameras.length,
        success: true,
      });
    }),

    // GET /api/dashboard/cameras/diagnostics - Legacy diagnostics
    http.get(`${LEGACY_URL}/diagnostics`, async () => {
      await delay(100);
      return HttpResponse.json(state.diagnostics);
    }),

    // POST /api/dashboard/cameras/:id/capture - Legacy capture
    http.post(`${LEGACY_URL}/:id/capture`, async ({ params }) => {
      await delay(state.captureDelay ?? 500);
      const id = decodeURIComponent(params.id as string);
      const camera = state.cameras.find((c) => c.id === id);

      if (!camera || camera.status === 'offline') {
        return HttpResponse.json({ success: false, error: 'Camera unavailable' }, { status: 503 });
      }

      return HttpResponse.json<CaptureResult>({
        success: true,
        image: mockBase64Image,
        timestamp: new Date().toISOString(),
        camera_id: id,
        file_size: 2048,
      });
    }),

    // POST /api/dashboard/cameras/:id/reboot - Legacy reboot
    http.post(`${LEGACY_URL}/:id/reboot`, async ({ params }) => {
      await delay(state.rebootDelay ?? 200);
      const id = decodeURIComponent(params.id as string);
      const camera = state.cameras.find((c) => c.id === id);

      if (!camera || camera.status === 'offline') {
        return HttpResponse.json({ success: false, error: 'Camera unavailable' }, { status: 503 });
      }

      return HttpResponse.json<RebootResult>({
        success: true,
        message: 'Reboot command sent successfully',
      });
    }),
  ];
}

// ============================================================================
// Error Handlers
// ============================================================================

export const v1CamerasErrorHandlers = {
  /** Returns 500 for all camera requests */
  internalError: http.get(`${BASE_URL}/*`, async () => {
    await delay(50);
    return HttpResponse.json(
      cameraError('INTERNAL_ERROR', 'Internal server error', true),
      { status: 500 }
    );
  }),

  /** Simulates network error for V1 endpoint */
  networkError: http.get(BASE_URL, async () => {
    await delay(50);
    return HttpResponse.error();
  }),

  /** Simulates network error for legacy endpoint (used with networkError) */
  legacyNetworkError: http.get(LEGACY_URL, async () => {
    await delay(50);
    return HttpResponse.error();
  }),

  /** Simulates capture timeout */
  captureTimeout: http.post(`${BASE_URL}/:id/capture`, async () => {
    await delay(31000); // Exceeds 30s timeout
    return HttpResponse.json(
      cameraError('CAPTURE_TIMEOUT', 'Capture operation timed out', true),
      { status: 408 }
    );
  }),

  /** Returns empty camera list */
  emptyCameras: http.get(BASE_URL, async () => {
    await delay(50);
    return HttpResponse.json<CameraListResponse>({
      cameras: [],
      count: 0,
    });
  }),

  /** Returns camera in 'rebooting' state */
  rebootingCamera: http.get(`${BASE_URL}/:id`, async ({ params }) => {
    await delay(50);
    const id = params.id as string;
    return HttpResponse.json<Camera>({
      id,
      name: 'Rebooting Camera',
      status: 'rebooting',
      lastSeen: new Date().toISOString(),
    });
  }),
};

// ============================================================================
// Exports
// ============================================================================

/** Default handlers with mock data */
export const v1CamerasHandlers = createV1CamerasHandlers();
