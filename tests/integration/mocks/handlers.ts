/**
 * MSW Request Handlers (T024, T016)
 * Mock Service Worker handlers for all API endpoints
 * Updated with V1 API handlers for Feature 006
 */

import { http, HttpResponse, delay } from 'msw';
import type {
  WiFiScanApiResponse,
  WiFiStatusApiResponse,
  WiFiConnectApiResponse,
  RawSystemInfoResponse,
  HealthCheckApiResponse,
  ConfigApiResponse,
  DoorStatusApiResponse,
  DoorCommandApiResponse,
  LogsApiResponse,
  DeviceListApiResponse,
  DeviceScanApiResponse,
  ProvisionDeviceApiResponse,
} from './types';
import {
  mockBatchSession,
  mockActiveSession,
  mockClosedSession,
  mockCandidates,
  mockAllowlistEntries,
  mockNetworkStatus,
} from '../../fixtures/provisioning.fixture';
import type {
  StartSessionData,
  SessionData,
  AllowlistData,
  RecoverableSessionsData,
  DeviceOperationData,
  ProvisionAllData,
  StopSessionData,
} from '@/domain/types/provisioning';
import type { V1SuccessResponse, V1ErrorResponse } from '@/domain/types/v1-api';

// Base URL for API calls
const BASE_URL = '/api';

// Default mock data
export const mockData = {
  wifi: {
    networks: [
      { ssid: 'HomeNetwork', signal: -45, security: 'WPA2', channel: 6 },
      { ssid: 'GuestNetwork', signal: -60, security: 'WPA2', channel: 11 },
      { ssid: 'OpenCafe', signal: -55, security: 'Open', channel: 1 },
    ],
    status: {
      connected: true,
      ssid: 'HomeNetwork',
      ip: '192.168.1.100',
      signal: -45,
    },
  },
  system: {
    timestamp: new Date().toISOString(),
    cpu: { usage_percent: 35, core_count: 4, per_core: [40, 30, 35, 35] },
    memory: { used_mb: 1024, total_mb: 2048, used_percent: 50, available_mb: 1024 },
    disk: { used_gb: 15, total_gb: 32, used_percent: 46.9, path: '/' },
    temperature_celsius: 52,
    uptime: 86400_000_000_000, // 1 day in nanoseconds
    load_average: { load_1: 0.8, load_5: 0.5, load_15: 0.3 },
    overall_status: 'healthy',
  },
  config: [
    {
      name: 'Server',
      items: [
        { key: 'server.port', value: '8082', type: 'number', editable: true },
        { key: 'server.host', value: '0.0.0.0', type: 'string', editable: true },
      ],
    },
    {
      name: 'MQTT',
      items: [
        { key: 'mqtt.broker', value: 'tcp://localhost:1883', type: 'string', editable: true },
      ],
    },
  ],
  door: {
    state: 'locked' as const,
    is_locked: true,
    last_operation: {
      action: 'lock',
      timestamp: new Date().toISOString(),
      success: true,
    },
  },
  logs: [
    { id: '1', timestamp: new Date().toISOString(), level: 'info' as const, message: 'System started', source: 'main' },
    { id: '2', timestamp: new Date().toISOString(), level: 'debug' as const, message: 'WiFi scan completed', source: 'wifi' },
  ],
  devices: [
    { address: 'AA:BB:CC:DD:EE:F1', name: 'DeliCasa-ESP32-001', rssi: -55, status: 'discovered' as const, provisioned: false, last_seen: new Date().toISOString() },
    { address: 'AA:BB:CC:DD:EE:F2', name: 'DeliCasa-ESP32-002', rssi: -45, status: 'provisioned' as const, provisioned: true, last_seen: new Date().toISOString(), firmware_version: '2.0.1' },
    { address: 'AA:BB:CC:DD:EE:F3', name: 'DeliCasa-ESP32-003', rssi: -70, status: 'offline' as const, provisioned: true, last_seen: new Date().toISOString() },
  ],
  provisioningHistory: [
    { id: '1', device_address: 'AA:BB:CC:DD:EE:F2', device_name: 'DeliCasa-ESP32-002', timestamp: new Date().toISOString(), success: true, mqtt_configured: true, wifi_configured: true },
  ],
};

// Create handlers with optional response overrides
export function createHandlers(overrides?: Partial<typeof mockData>) {
  const data = { ...mockData, ...overrides };

  return [
    // WiFi endpoints
    // NOTE: V1 envelope is unwrapped by proxy, so we return data directly
    http.get(`${BASE_URL}/wifi/scan`, async () => {
      await delay(100);
      return HttpResponse.json({
        count: data.wifi.networks.length,
        networks: data.wifi.networks,
      });
    }),

    http.get(`${BASE_URL}/wifi/status`, async () => {
      await delay(50);
      return HttpResponse.json<WiFiStatusApiResponse>({
        status: data.wifi.status,
      });
    }),

    http.post(`${BASE_URL}/wifi/connect`, async ({ request }) => {
      await delay(200);
      const body = (await request.json()) as { ssid: string; password?: string };
      return HttpResponse.json<WiFiConnectApiResponse>({
        success: true,
        message: `Connected to ${body.ssid}`,
      });
    }),

    http.post(`${BASE_URL}/wifi/disconnect`, async () => {
      await delay(100);
      return HttpResponse.json({ success: true });
    }),

    // System endpoints
    // NOTE: V1 envelope is unwrapped by proxy, so we return data directly
    http.get(`${BASE_URL}/system/info`, async () => {
      await delay(50);
      return HttpResponse.json(data.system);
    }),

    http.get(`${BASE_URL}/health`, async () => {
      await delay(25);
      return HttpResponse.json<HealthCheckApiResponse>({
        status: 'healthy',
        version: '1.2.0',
        uptime: 86400,
      });
    }),

    // Config endpoints
    // NOTE: V1 envelope is unwrapped by proxy, so we return data directly
    http.get(`${BASE_URL}/dashboard/config`, async () => {
      await delay(75);
      return HttpResponse.json({
        sections: data.config,
      });
    }),

    http.put(`${BASE_URL}/dashboard/config/:key`, async ({ params }) => {
      await delay(100);
      return HttpResponse.json({
        success: true,
        key: params.key,
      });
    }),

    http.post(`${BASE_URL}/dashboard/config/:key/reset`, async ({ params }) => {
      await delay(100);
      return HttpResponse.json({
        success: true,
        key: params.key,
        value: 'default',
      });
    }),

    // Door endpoints
    http.get(`${BASE_URL}/door/status`, async () => {
      await delay(50);
      return HttpResponse.json<DoorStatusApiResponse>(data.door);
    }),

    http.post(`${BASE_URL}/door/open`, async () => {
      await delay(150);
      return HttpResponse.json<DoorCommandApiResponse>({
        success: true,
        message: 'Door opened',
        door_state: 'unlocked',
      });
    }),

    http.post(`${BASE_URL}/door/close`, async () => {
      await delay(150);
      return HttpResponse.json<DoorCommandApiResponse>({
        success: true,
        message: 'Door closed',
        door_state: 'locked',
      });
    }),

    http.get(`${BASE_URL}/door/history`, async () => {
      await delay(75);
      return HttpResponse.json([
        {
          id: '1',
          action: 'open',
          timestamp: new Date().toISOString(),
          duration_ms: 5000,
          success: true,
        },
      ]);
    }),

    // Logs endpoints
    http.get(`${BASE_URL}/dashboard/logs`, async () => {
      await delay(50);
      return HttpResponse.json<LogsApiResponse>({
        count: data.logs.length,
        logs: data.logs,
      });
    }),

    // Device endpoints (T067)
    http.get(`${BASE_URL}/devices`, async () => {
      await delay(50);
      return HttpResponse.json<DeviceListApiResponse>({
        devices: data.devices,
      });
    }),

    http.post(`${BASE_URL}/devices/scan`, async () => {
      await delay(200);
      return HttpResponse.json<DeviceScanApiResponse>({
        success: true,
        devices_found: data.devices.length,
        duration_ms: 5000,
      });
    }),

    http.post(`${BASE_URL}/devices/:address/provision`, async ({ params }) => {
      await delay(150);
      const address = params.address as string;
      const device = data.devices.find((d) => encodeURIComponent(d.address) === address || d.address === address);
      return HttpResponse.json<ProvisionDeviceApiResponse>({
        success: true,
        message: 'Device provisioned successfully',
        device: device
          ? { ...device, status: 'provisioned', provisioned: true }
          : undefined,
      });
    }),

    http.get(`${BASE_URL}/devices/history`, async () => {
      await delay(50);
      return HttpResponse.json({
        records: data.provisioningHistory,
      });
    }),
  ];
}

// Error handler factories for testing error states
export const errorHandlers = {
  wifiScanError: http.get(`${BASE_URL}/wifi/scan`, async () => {
    await delay(100);
    return HttpResponse.json(
      { success: false, error: 'WiFi interface not available' },
      { status: 503 }
    );
  }),

  systemError: http.get(`${BASE_URL}/system/info`, async () => {
    await delay(50);
    return HttpResponse.json(
      { success: false, error: 'System info unavailable' },
      { status: 500 }
    );
  }),

  doorUnavailable: http.get(`${BASE_URL}/door/status`, async () => {
    await delay(50);
    return HttpResponse.json(
      { success: false, error: 'Door API not available' },
      { status: 404 }
    );
  }),

  networkError: http.get(`${BASE_URL}/wifi/status`, async () => {
    await delay(500);
    return HttpResponse.error();
  }),
};

// Default handlers export
export const handlers = createHandlers();

// ============================================================================
// V1 API Helper Functions (Feature 006)
// ============================================================================

/**
 * Create a V1 success response envelope.
 */
function v1Success<T>(data: T): V1SuccessResponse<T> {
  return {
    success: true,
    data,
    correlation_id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a V1 error response envelope.
 */
function v1Error(
  code: string,
  message: string,
  retryable = false,
  retryAfterSeconds?: number
): V1ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      retryable,
      retry_after_seconds: retryAfterSeconds,
    },
    correlation_id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// V1 API Mock Data (Feature 006)
// ============================================================================

export const v1MockData = {
  sessions: {
    current: { ...mockActiveSession },
    recoverable: [mockActiveSession],
    history: [mockActiveSession, mockClosedSession],
  },
  candidates: [...mockCandidates],
  allowlist: [...mockAllowlistEntries],
  network: { ...mockNetworkStatus },
};

// ============================================================================
// V1 API Handlers Factory (Feature 006)
// ============================================================================

/**
 * Create V1 API handlers with optional overrides.
 */
export function createV1Handlers(overrides?: Partial<typeof v1MockData>) {
  const data = { ...v1MockData, ...overrides };

  return [
    // ============ Batch Provisioning Endpoints ============

    // Start batch session
    http.post(`${BASE_URL}/v1/provisioning/batch/start`, async ({ request }) => {
      await delay(150);
      const body = (await request.json()) as { target_ssid: string; target_password: string };

      // Check API key header
      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      const session = {
        ...mockBatchSession,
        id: `sess_${Date.now()}`,
        target_ssid: body.target_ssid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      data.sessions.current = session;

      return HttpResponse.json(
        v1Success<StartSessionData>({
          session,
          message: 'Batch provisioning session started',
        })
      );
    }),

    // Get session status
    http.get(`${BASE_URL}/v1/provisioning/batch/:sessionId`, async ({ request, params }) => {
      await delay(100);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      const sessionId = params.sessionId as string;
      if (sessionId !== data.sessions.current.id && !sessionId.startsWith('sess_')) {
        return HttpResponse.json(
          v1Error('SESSION_NOT_FOUND', 'Session not found'),
          { status: 404 }
        );
      }

      const url = new URL(request.url);
      const includeDevices = url.searchParams.get('include_devices') !== 'false';

      return HttpResponse.json(
        v1Success<SessionData>({
          session: data.sessions.current,
          devices: includeDevices ? data.candidates : undefined,
          timeout_remaining: '00:45:00',
          network_status: data.network,
        })
      );
    }),

    // Stop session
    http.post(`${BASE_URL}/v1/provisioning/batch/:sessionId/stop`, async ({ request }) => {
      await delay(100);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      const stoppedSession = { ...data.sessions.current, state: 'closed' as const };
      data.sessions.current = stoppedSession;

      return HttpResponse.json(
        v1Success<StopSessionData>({
          session: stoppedSession,
          message: 'Session stopped successfully',
        })
      );
    }),

    // Get devices in session
    http.get(`${BASE_URL}/v1/provisioning/batch/:sessionId/devices`, async ({ request }) => {
      await delay(75);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      return HttpResponse.json(
        v1Success({ devices: data.candidates })
      );
    }),

    // Provision single device
    http.post(
      `${BASE_URL}/v1/provisioning/batch/:sessionId/devices/:mac/provision`,
      async ({ request, params }) => {
        await delay(100);

        const apiKey = request.headers.get('X-API-Key');
        if (!apiKey) {
          return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
        }

        const mac = decodeURIComponent(params.mac as string);
        const device = data.candidates.find((d) => d.mac === mac);

        if (!device) {
          return HttpResponse.json(
            v1Error('DEVICE_NOT_FOUND', 'Device not found in session'),
            { status: 404 }
          );
        }

        return HttpResponse.json(
          v1Success<DeviceOperationData>({
            mac,
            state: 'provisioning',
            message: 'Provisioning initiated',
          })
        );
      }
    ),

    // Provision all devices
    http.post(`${BASE_URL}/v1/provisioning/batch/:sessionId/provision-all`, async ({ request }) => {
      await delay(150);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      const eligible = data.candidates.filter((d) => d.state === 'discovered' && d.in_allowlist);

      return HttpResponse.json(
        v1Success<ProvisionAllData>({
          initiated_count: eligible.length,
          skipped_count: data.candidates.length - eligible.length,
          message: `Provisioning initiated for ${eligible.length} devices`,
        })
      );
    }),

    // Retry device
    http.post(
      `${BASE_URL}/v1/provisioning/batch/:sessionId/devices/:mac/retry`,
      async ({ request, params }) => {
        await delay(100);

        const apiKey = request.headers.get('X-API-Key');
        if (!apiKey) {
          return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
        }

        const mac = decodeURIComponent(params.mac as string);

        return HttpResponse.json(
          v1Success<DeviceOperationData>({
            mac,
            state: 'provisioning',
            message: 'Retry initiated',
          })
        );
      }
    ),

    // ============ Allowlist Endpoints ============

    // List allowlist
    http.get(`${BASE_URL}/v1/provisioning/allowlist`, async ({ request }) => {
      await delay(75);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      return HttpResponse.json(
        v1Success<AllowlistData>({
          entries: data.allowlist,
        })
      );
    }),

    // Get single allowlist entry
    http.get(`${BASE_URL}/v1/provisioning/allowlist/:mac`, async ({ request, params }) => {
      await delay(50);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      const mac = decodeURIComponent(params.mac as string);
      const entry = data.allowlist.find((e) => e.mac === mac);

      if (!entry) {
        return HttpResponse.json(
          v1Error('DEVICE_NOT_IN_ALLOWLIST', 'Device not in allowlist'),
          { status: 404 }
        );
      }

      return HttpResponse.json(v1Success({ entry }));
    }),

    // Add to allowlist
    http.post(`${BASE_URL}/v1/provisioning/allowlist`, async ({ request }) => {
      await delay(100);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      const body = (await request.json()) as { mac: string; description?: string; container_id?: string };

      const newEntry = {
        mac: body.mac.toUpperCase(),
        description: body.description,
        container_id: body.container_id,
        added_at: new Date().toISOString(),
        used: false,
      };

      data.allowlist.push(newEntry);

      return HttpResponse.json(
        v1Success({ entry: newEntry, message: 'Device added to allowlist' })
      );
    }),

    // Remove from allowlist
    http.delete(`${BASE_URL}/v1/provisioning/allowlist/:mac`, async ({ request, params }) => {
      await delay(75);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      const mac = decodeURIComponent(params.mac as string);
      const index = data.allowlist.findIndex((e) => e.mac === mac);

      if (index === -1) {
        return HttpResponse.json(
          v1Error('DEVICE_NOT_IN_ALLOWLIST', 'Device not in allowlist'),
          { status: 404 }
        );
      }

      data.allowlist.splice(index, 1);

      return HttpResponse.json(
        v1Success({ success: true, message: 'Device removed from allowlist' })
      );
    }),

    // ============ Session Recovery Endpoints ============

    // Get recoverable sessions
    http.get(`${BASE_URL}/v1/provisioning/sessions/recoverable`, async ({ request }) => {
      await delay(75);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      return HttpResponse.json(
        v1Success<RecoverableSessionsData>({
          sessions: data.sessions.recoverable,
        })
      );
    }),

    // Resume session
    http.post(`${BASE_URL}/v1/provisioning/sessions/:sessionId/resume`, async ({ request }) => {
      await delay(100);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      return HttpResponse.json(
        v1Success<SessionData>({
          session: data.sessions.current,
          devices: data.candidates,
          network_status: data.network,
        })
      );
    }),

    // Get session history
    http.get(`${BASE_URL}/v1/provisioning/sessions/history`, async ({ request }) => {
      await delay(75);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      return HttpResponse.json(
        v1Success({ sessions: data.sessions.history })
      );
    }),

    // ============ Network Status Endpoint ============

    http.get(`${BASE_URL}/v1/provisioning/network/status`, async ({ request }) => {
      await delay(50);

      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey) {
        return HttpResponse.json(v1Error('UNAUTHORIZED', 'API key required'), { status: 401 });
      }

      return HttpResponse.json(v1Success(data.network));
    }),
  ];
}

// ============================================================================
// V1 Error Handlers (Feature 006)
// ============================================================================

export const v1ErrorHandlers = {
  unauthorized: http.get(`${BASE_URL}/v1/*`, async () => {
    await delay(50);
    return HttpResponse.json(
      v1Error('UNAUTHORIZED', 'API key required'),
      { status: 401 }
    );
  }),

  sessionNotFound: http.get(`${BASE_URL}/v1/provisioning/batch/:sessionId`, async () => {
    await delay(50);
    return HttpResponse.json(
      v1Error('SESSION_NOT_FOUND', 'Session not found'),
      { status: 404 }
    );
  }),

  sessionExpired: http.get(`${BASE_URL}/v1/provisioning/batch/:sessionId`, async () => {
    await delay(50);
    return HttpResponse.json(
      v1Error('SESSION_EXPIRED', 'Session has expired'),
      { status: 410 }
    );
  }),

  rateLimited: http.post(`${BASE_URL}/v1/provisioning/batch/start`, async () => {
    await delay(50);
    return HttpResponse.json(
      v1Error('RATE_LIMITED', 'Too many requests', true, 30),
      { status: 429 }
    );
  }),

  deviceNotInAllowlist: http.post(
    `${BASE_URL}/v1/provisioning/batch/:sessionId/devices/:mac/provision`,
    async () => {
      await delay(50);
      return HttpResponse.json(
        v1Error('DEVICE_NOT_IN_ALLOWLIST', 'Device not in allowlist'),
        { status: 403 }
      );
    }
  ),

  networkError: http.get(`${BASE_URL}/v1/*`, async () => {
    await delay(100);
    return HttpResponse.error();
  }),
};

// Default V1 handlers export
export const v1Handlers = createV1Handlers();

// Combined handlers (legacy + V1)
export const allHandlers = [...handlers, ...v1Handlers];
