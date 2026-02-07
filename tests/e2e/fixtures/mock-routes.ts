/**
 * API Mocking Utilities for Playwright E2E Tests
 *
 * Provides utilities for mocking API responses in E2E tests.
 * Allows easy customization of mock data for different test scenarios.
 */

import type { Page, Route } from '@playwright/test';

/**
 * API response types matching backend schemas (PiOrchestrator)
 */
export interface SystemInfoResponse {
  success: boolean;
  data: {
    timestamp: string;
    cpu: {
      usage_percent: number;
      core_count: number;
      per_core?: number[];
    };
    memory: {
      used_mb: number;
      total_mb: number;
      used_percent: number;
      available_mb: number;
    };
    disk: {
      used_gb: number;
      total_gb: number;
      used_percent: number;
      path: string;
    };
    temperature_celsius: number;
    uptime: number;
    load_average: {
      load_1: number;
      load_5: number;
      load_15: number;
    };
    overall_status: string;
  };
}

export interface WiFiNetwork {
  ssid: string;
  signal: number;
  security: string;
  bssid?: string;
  frequency?: number;
  channel?: number;
  quality?: number;
}

export interface WiFiScanResponse {
  success: boolean;
  count: number;
  networks: WiFiNetwork[];
}

export interface WiFiStatusResponse {
  status: {
    connected: boolean;
    ssid?: string;
    ip_address?: string;
    signal_strength?: number;
    mode?: 'client' | 'ap' | 'disconnected';
  };
}

export interface DoorStatusResponse {
  state: 'open' | 'closed' | 'unknown' | 'error';
  lock_state?: 'locked' | 'unlocked' | 'unknown' | 'error';
  last_command?: string;
  last_command_time?: string;
  error?: string;
}

export interface ConfigItem {
  key: string;
  value: string;
  default_value?: string;
  type: string;
  description?: string;
  required?: boolean;
  editable?: boolean;
  validation?: {
    options?: string[];
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ConfigSection {
  name: string;
  description?: string;
  items: ConfigItem[];
}

export interface ConfigResponse {
  success: boolean;
  sections: ConfigSection[];
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface LogsResponse {
  count: number;
  logs: LogEntry[];
}

/**
 * Default mock data for E2E tests
 */
export const defaultMockData = {
  systemInfo: {
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
  },

  wifiScan: {
    success: true,
    count: 4,
    networks: [
      { ssid: 'TestNetwork-5G', signal: -45, security: 'WPA2' },
      { ssid: 'TestNetwork-2G', signal: -55, security: 'WPA2' },
      { ssid: 'GuestNetwork', signal: -60, security: 'WPA3' },
      { ssid: 'OpenNetwork', signal: -65, security: 'Open' },
    ],
  } as WiFiScanResponse,

  wifiStatus: {
    status: {
      connected: true,
      ssid: 'TestNetwork-5G',
      ip_address: '192.168.1.100',
      signal_strength: -45,
      mode: 'client' as const,
    },
  } as WiFiStatusResponse,

  doorStatus: {
    state: 'closed',
    lock_state: 'locked',
    last_command: 'close',
    last_command_time: new Date().toISOString(),
  } as DoorStatusResponse,

  config: {
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
          {
            key: 'log.level',
            value: 'info',
            default_value: 'info',
            type: 'string',
            description: 'Logging level',
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
          {
            key: 'mqtt.password',
            value: 'secret123',
            default_value: '',
            type: 'password',
            description: 'MQTT password',
            editable: true,
          },
        ],
      },
    ],
  } as ConfigResponse,

  logs: {
    count: 4,
    logs: [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'System started successfully',
        source: 'main',
      },
      {
        timestamp: new Date(Date.now() - 30000).toISOString(),
        level: 'info',
        message: 'MQTT broker connected',
        source: 'mqtt',
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'debug',
        message: 'Configuration loaded',
        source: 'config',
      },
      {
        timestamp: new Date(Date.now() - 90000).toISOString(),
        level: 'warn',
        message: 'Temperature threshold approaching',
        source: 'monitor',
      },
    ],
  } as LogsResponse,
};

/**
 * Mock route handler configuration
 * Feature: 037-api-resilience - Enhanced for error scenario testing
 */
export interface MockRouteConfig {
  /** Mock response data - will be JSON stringified */
  data?: unknown;
  /** HTTP status code (default: 200) */
  status?: number;
  /** Delay in milliseconds before responding */
  delay?: number;
  /** Content type (default: application/json) */
  contentType?: string;
  /** Force error response */
  error?: boolean;
  /** Error message for error responses */
  errorMessage?: string;
  /** Abort the request with a network error (connectionfailed, connectionreset, timedout) */
  abort?: 'connectionfailed' | 'connectionreset' | 'timedout';
}

/**
 * Create a route handler with configuration
 * Feature: 037-api-resilience - Enhanced with network abort support
 */
function createRouteHandler(config: MockRouteConfig) {
  return async (route: Route) => {
    // Handle network failures (abort)
    if (config.abort) {
      await route.abort(config.abort);
      return;
    }

    if (config.delay) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    if (config.error) {
      await route.fulfill({
        status: config.status || 500,
        contentType: config.contentType || 'application/json',
        body: JSON.stringify({
          error: config.errorMessage || 'Internal Server Error',
        }),
      });
      return;
    }

    await route.fulfill({
      status: config.status || 200,
      contentType: config.contentType || 'application/json',
      body: JSON.stringify(config.data),
    });
  };
}

/**
 * Mock endpoint helper - applies a route configuration to a pattern
 * Feature: 037-api-resilience
 */
export async function mockEndpoint(
  page: Page,
  pattern: string,
  config: MockRouteConfig
): Promise<void> {
  await page.route(pattern, createRouteHandler(config));
}

/**
 * API mocking utility class
 */
export class MockAPI {
  private page: Page;
  private data: typeof defaultMockData;

  constructor(page: Page, customData?: Partial<typeof defaultMockData>) {
    this.page = page;
    this.data = { ...defaultMockData, ...customData };
  }

  /**
   * Apply all default API mocks
   * Feature: 045-dashboard-resilience-e2e - Extended to cover all 12 tabs
   */
  async applyAllMocks(): Promise<void> {
    await Promise.all([
      this.mockSystemInfo(),
      this.mockWifiScan(),
      this.mockWifiStatus(),
      this.mockDoorStatus(),
      this.mockConfig(),
      this.mockLogs(),
      this.mockCameras(),
      this.mockDevices(),
      this.mockNetwork(),
      this.mockV1Cameras(),
      this.mockV1Containers(),
      this.mockDiagnosticsHealth(),
      this.mockSessions(),
    ]);
  }

  /**
   * Mock system info endpoint
   */
  async mockSystemInfo(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/system/info',
      createRouteHandler({
        data: this.data.systemInfo,
        ...config,
      })
    );
  }

  /**
   * Mock WiFi scan endpoint
   */
  async mockWifiScan(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/wifi/scan',
      createRouteHandler({
        data: this.data.wifiScan,
        ...config,
      })
    );
  }

  /**
   * Mock WiFi status endpoint
   */
  async mockWifiStatus(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/wifi/status',
      createRouteHandler({
        data: this.data.wifiStatus,
        ...config,
      })
    );
  }

  /**
   * Mock WiFi connect endpoint
   */
  async mockWifiConnect(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/wifi/connect',
      createRouteHandler({
        data: { success: true, message: 'Connected successfully' },
        ...config,
      })
    );
  }

  /**
   * Mock door status endpoint
   */
  async mockDoorStatus(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/door/status',
      createRouteHandler({
        data: this.data.doorStatus,
        ...config,
      })
    );
  }

  /**
   * Mock door command endpoint
   */
  async mockDoorCommand(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/door/command',
      createRouteHandler({
        data: { success: true, message: 'Command executed' },
        ...config,
      })
    );
  }

  /**
   * Mock config endpoint
   */
  async mockConfig(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/config',
      createRouteHandler({
        data: this.data.config,
        ...config,
      })
    );
  }

  /**
   * Mock config update endpoint
   */
  async mockConfigUpdate(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/config/*',
      createRouteHandler({
        data: { success: true, message: 'Config updated' },
        ...config,
      })
    );
  }

  /**
   * Mock logs endpoint
   */
  async mockLogs(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/logs/recent',
      createRouteHandler({
        data: this.data.logs,
        ...config,
      })
    );
    // Also mock dashboard logs
    await this.page.route(
      '**/api/dashboard/logs',
      createRouteHandler({
        data: this.data.logs,
        ...config,
      })
    );
  }

  /**
   * Mock cameras endpoint
   */
  async mockCameras(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/cameras',
      createRouteHandler({
        data: { cameras: [] },
        ...config,
      })
    );
  }

  /**
   * Mock devices endpoint
   */
  async mockDevices(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/devices',
      createRouteHandler({
        data: { devices: [] },
        ...config,
      })
    );
  }

  /**
   * Mock network diagnostics endpoints
   */
  async mockNetwork(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/network/**',
      createRouteHandler({
        data: { connected: false, status: 'unavailable' },
        ...config,
      })
    );
  }

  /**
   * Mock V1 Cameras API endpoints
   * Feature: 045-dashboard-resilience-e2e
   */
  async mockV1Cameras(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/v1/cameras',
      createRouteHandler({
        data: mockCamerasResponses.withCameras,
        ...config,
      })
    );
    await this.page.route(
      '**/api/v1/cameras/*',
      createRouteHandler({
        data: {
          success: true,
          data: mockCameraData.cameraOnline,
          correlation_id: 'test-correlation-id',
          timestamp: new Date().toISOString(),
        },
        ...config,
      })
    );
    // Legacy fallback endpoint (v1CamerasApi falls back to this on V1 failure)
    await this.page.route(
      '**/api/dashboard/cameras',
      createRouteHandler({
        data: {
          cameras: [mockCameraData.cameraOnline, mockCameraData.cameraError, mockCameraData.cameraOffline],
          count: 3,
          success: true,
        },
        ...config,
      })
    );
    await this.page.route(
      '**/api/dashboard/cameras/*',
      createRouteHandler({
        data: mockCameraData.cameraOnline,
        ...config,
      })
    );
  }

  /**
   * Mock V1 Containers API endpoint
   * Feature: 045-dashboard-resilience-e2e
   */
  async mockV1Containers(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/v1/containers',
      createRouteHandler({
        data: mockContainersResponses.withContainers,
        ...config,
      })
    );
  }

  /**
   * Mock diagnostics health endpoints
   * Feature: 045-dashboard-resilience-e2e
   */
  async mockDiagnosticsHealth(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/dashboard/diagnostics/bridgeserver',
      createRouteHandler({
        data: mockDiagnosticsData.bridgeServerHealthy,
        ...config,
      })
    );
    await this.page.route(
      '**/api/dashboard/diagnostics/minio',
      createRouteHandler({
        data: mockDiagnosticsData.minioHealthy,
        ...config,
      })
    );
  }

  /**
   * Mock sessions and evidence endpoints
   * Feature: 045-dashboard-resilience-e2e
   */
  async mockSessions(config?: MockRouteConfig): Promise<void> {
    await this.page.route(
      '**/api/dashboard/diagnostics/sessions*',
      createRouteHandler({
        data: mockSessionsData.withSessions,
        ...config,
      })
    );
    await this.page.route(
      '**/api/dashboard/diagnostics/sessions/*/evidence*',
      createRouteHandler({
        data: mockEvidenceData.withEvidence,
        ...config,
      })
    );
  }

  /**
   * Mock API error for specific endpoint
   */
  async mockError(
    pattern: string,
    status = 500,
    message = 'Internal Server Error'
  ): Promise<void> {
    await this.page.route(
      pattern,
      createRouteHandler({
        error: true,
        status,
        errorMessage: message,
      })
    );
  }

  /**
   * Mock slow API response
   */
  async mockSlow(pattern: string, delay: number, data: unknown): Promise<void> {
    await this.page.route(
      pattern,
      createRouteHandler({
        data,
        delay,
      })
    );
  }

  /**
   * Update mock data dynamically
   */
  updateData(updates: Partial<typeof defaultMockData>): void {
    this.data = { ...this.data, ...updates };
  }
}

/**
 * Create a MockAPI instance for a page
 */
export function createMockAPI(
  page: Page,
  customData?: Partial<typeof defaultMockData>
): MockAPI {
  return new MockAPI(page, customData);
}

/**
 * Scenario-based mock presets
 */
export const mockScenarios = {
  /**
   * Healthy system with all services running
   */
  healthySystem: (page: Page): MockAPI => {
    return createMockAPI(page);
  },

  /**
   * System with high resource usage
   */
  highResourceUsage: (page: Page): MockAPI => {
    return createMockAPI(page, {
      systemInfo: {
        success: true,
        data: {
          ...defaultMockData.systemInfo.data,
          cpu: {
            ...defaultMockData.systemInfo.data.cpu,
            usage_percent: 92.5,
          },
          memory: {
            ...defaultMockData.systemInfo.data.memory,
            used_percent: 88.3,
          },
          disk: {
            ...defaultMockData.systemInfo.data.disk,
            used_percent: 95.0,
          },
          temperature_celsius: 78.5,
        },
      },
    });
  },

  /**
   * System with WiFi disconnected
   */
  wifiDisconnected: (page: Page): MockAPI => {
    return createMockAPI(page, {
      wifiStatus: {
        status: {
          connected: false,
          mode: 'disconnected' as const,
        },
      },
    });
  },

  /**
   * System with door open
   */
  doorOpen: (page: Page): MockAPI => {
    return createMockAPI(page, {
      doorStatus: {
        state: 'open',
        lock_state: 'unlocked',
        last_command: 'open',
        last_command_time: new Date().toISOString(),
      },
    });
  },

  /**
   * System with errors in logs
   */
  errorLogs: (page: Page): MockAPI => {
    return createMockAPI(page, {
      logs: {
        count: 3,
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'MQTT connection failed: timeout',
            source: 'mqtt',
          },
          {
            timestamp: new Date(Date.now() - 30000).toISOString(),
            level: 'error',
            message: 'Door sensor not responding',
            source: 'door',
          },
          {
            timestamp: new Date(Date.now() - 60000).toISOString(),
            level: 'warn',
            message: 'Retrying connection...',
            source: 'mqtt',
          },
        ],
      },
    });
  },
};

// ============================================================================
// V1 Containers API Mock Data (Feature: 045-dashboard-resilience-e2e)
// ============================================================================

/**
 * V1 Container mock data with mixed opaque ID formats
 * Verifies the UI doesn't assume UUID format for container IDs
 */
export const mockContainerData = {
  /** Container with semantic string ID */
  kitchenFridge: {
    id: 'kitchen-fridge-001',
    label: 'Kitchen Fridge',
    description: 'Main refrigerator',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    cameras: [
      {
        device_id: 'AA:BB:CC:DD:EE:FF',
        position: 1 as const,
        assigned_at: new Date().toISOString(),
        status: 'online',
        name: 'Shelf Cam',
      },
    ],
    camera_count: 1,
    online_count: 1,
  },
  /** Container with UUID ID */
  garageFreezer: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    label: 'Garage Freezer',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    cameras: [],
    camera_count: 0,
    online_count: 0,
  },
  /** Container with numeric string ID */
  numericContainer: {
    id: '12345',
    label: 'Storage Unit',
    description: 'Numeric ID container',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    cameras: [],
    camera_count: 0,
    online_count: 0,
  },
};

/**
 * V1 Containers API response structures
 */
export const mockContainersResponses = {
  /** Success: Multiple containers with mixed ID formats */
  withContainers: {
    success: true,
    data: {
      containers: [
        mockContainerData.kitchenFridge,
        mockContainerData.garageFreezer,
        mockContainerData.numericContainer,
      ],
      total: 3,
    },
    correlation_id: 'test-containers',
    timestamp: new Date().toISOString(),
  },
  /** Success: Empty list */
  empty: {
    success: true,
    data: { containers: [], total: 0 },
    correlation_id: 'test-containers-empty',
    timestamp: new Date().toISOString(),
  },
};

// ============================================================================
// Diagnostics Mock Data (Feature: 045-dashboard-resilience-e2e)
// ============================================================================

/**
 * Diagnostics health mock data matching BridgeServer health response
 */
export const mockDiagnosticsData = {
  bridgeServerHealthy: {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'healthy', message: 'Database connection active' },
      storage: { status: 'healthy', message: 'MinIO connection established' },
    },
  },
  minioHealthy: {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    buckets: {
      'delicasa-images': {
        exists: true,
        accessible: true,
        object_count: 42,
      },
    },
  },
};

/**
 * Session mock data
 */
export const mockSessionsData = {
  withSessions: {
    success: true,
    data: {
      sessions: [
        {
          id: 'sess-12345',
          delivery_id: 'del-67890',
          started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          status: 'active',
          capture_count: 5,
          last_capture_at: new Date(Date.now() - 60 * 1000).toISOString(),
        },
        {
          id: 'sess-23456',
          delivery_id: 'del-78901',
          started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          status: 'active',
          capture_count: 3,
          last_capture_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
      ],
    },
  },
  empty: {
    success: true,
    data: { sessions: [] },
  },
};

/**
 * Evidence mock data
 */
export const mockEvidenceData = {
  withEvidence: {
    success: true,
    data: {
      evidence: [
        {
          id: 'img-001',
          session_id: 'sess-12345',
          captured_at: new Date(Date.now() - 60 * 1000).toISOString(),
          camera_id: 'espcam-b0f7f1',
          thumbnail_url: 'data:image/png;base64,iVBORw0KGgo=',
          full_url: 'data:image/png;base64,iVBORw0KGgo=',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          size_bytes: 45678,
          content_type: 'image/jpeg',
        },
      ],
    },
  },
};

// ============================================================================
// V1 Containers Standalone Mock Helpers (Feature: 045-dashboard-resilience-e2e)
// ============================================================================

/**
 * Apply containers success mock
 */
export async function mockContainersSuccess(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/v1/containers', {
    status: 200,
    data: mockContainersResponses.withContainers,
  });
}

/**
 * Apply containers empty mock
 */
export async function mockContainersEmpty(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/v1/containers', {
    status: 200,
    data: mockContainersResponses.empty,
  });
}

/**
 * Apply containers 404 mock (feature unavailable)
 */
export async function mockContainers404(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/v1/containers', {
    status: 404,
    error: true,
    errorMessage: 'Endpoint not found',
  });
  await mockEndpoint(page, '**/api/v1/containers/*', {
    status: 404,
    error: true,
    errorMessage: 'Endpoint not found',
  });
}

/**
 * Apply cameras 404 mock (feature unavailable)
 */
export async function mockCameras404(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/v1/cameras', {
    status: 404,
    error: true,
    errorMessage: 'Endpoint not found',
  });
  await mockEndpoint(page, '**/api/v1/cameras/*', {
    status: 404,
    error: true,
    errorMessage: 'Endpoint not found',
  });
}

/**
 * Apply cameras 503 mock (service unavailable)
 */
export async function mockCameras503(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/v1/cameras', {
    status: 503,
    error: true,
    errorMessage: 'Service unavailable',
  });
  await mockEndpoint(page, '**/api/v1/cameras/*', {
    status: 503,
    error: true,
    errorMessage: 'Service unavailable',
  });
}

/**
 * Apply diagnostics health mocks
 */
export async function mockDiagnosticsHealthSuccess(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/dashboard/diagnostics/bridgeserver', {
    data: mockDiagnosticsData.bridgeServerHealthy,
  });
  await mockEndpoint(page, '**/api/dashboard/diagnostics/minio', {
    data: mockDiagnosticsData.minioHealthy,
  });
}

/**
 * Apply diagnostics 404 mock (feature unavailable)
 */
export async function mockDiagnostics404(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/dashboard/diagnostics/**', {
    status: 404,
    error: true,
    errorMessage: 'Endpoint not found',
  });
}

/**
 * Apply sessions success mock
 */
export async function mockSessionsSuccess(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/dashboard/diagnostics/sessions*', {
    data: mockSessionsData.withSessions,
  });
  await mockEndpoint(page, '**/api/dashboard/diagnostics/sessions/*/evidence*', {
    data: mockEvidenceData.withEvidence,
  });
}

// ============================================================================
// V1 Cameras API Mock Data (Feature: 037-api-resilience)
// ============================================================================

/**
 * V1 Camera mock data - matches PiOrchestrator V1 API format
 */
export const mockCameraData = {
  /** Online camera with full health metrics */
  cameraOnline: {
    id: 'cam-001',
    name: 'Front Door Camera',
    status: 'online' as const,
    last_seen: new Date().toISOString(),
    ip_address: '192.168.1.100',
    mac_address: 'AA:BB:CC:DD:EE:FF',
    health: {
      wifi_rssi: -45,
      free_heap: 120000,
      uptime_seconds: 3600,
      resolution: 'VGA',
      firmware_version: '1.0.0',
    },
  },

  /** Camera in error state */
  cameraError: {
    id: 'cam-002',
    name: 'Garage Camera',
    status: 'error' as const,
    last_seen: new Date(Date.now() - 60000).toISOString(),
    ip_address: '192.168.1.101',
    mac_address: 'AA:BB:CC:DD:EE:01',
    health: {
      wifi_rssi: -70,
      free_heap: 50000,
      uptime_seconds: 100,
      resolution: 'VGA',
      firmware_version: '1.0.0',
      last_error: 'Connection timeout',
    },
  },

  /** Offline camera */
  cameraOffline: {
    id: 'cam-003',
    name: 'Backyard Camera',
    status: 'offline' as const,
    last_seen: new Date(Date.now() - 3600000).toISOString(),
    ip_address: '192.168.1.102',
    mac_address: 'AA:BB:CC:DD:EE:02',
    health: {
      wifi_rssi: 0,
      free_heap: 0,
      uptime_seconds: 0,
      resolution: 'VGA',
      firmware_version: '1.0.0',
    },
  },
};

/**
 * V1 Cameras API response structures
 */
export const mockCamerasResponses = {
  /** Success: Multiple cameras */
  withCameras: {
    success: true,
    data: {
      cameras: [
        mockCameraData.cameraOnline,
        mockCameraData.cameraError,
        mockCameraData.cameraOffline,
      ],
    },
    correlation_id: 'test-correlation-id',
    timestamp: new Date().toISOString(),
  },

  /** Success: Empty list */
  empty: {
    success: true,
    data: {
      cameras: [],
    },
    correlation_id: 'test-correlation-id',
    timestamp: new Date().toISOString(),
  },

  /** Error: Server error */
  serverError: {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Database connection failed',
      retryable: true,
    },
    correlation_id: 'test-correlation-id',
    timestamp: new Date().toISOString(),
  },
};

// ============================================================================
// Error Scenario Mock Presets (Feature: 037-api-resilience)
// ============================================================================

/**
 * Apply cameras success mock with data
 */
export async function mockCamerasSuccess(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/v1/cameras', {
    status: 200,
    data: mockCamerasResponses.withCameras,
  });
  // Also mock individual camera endpoints
  await mockEndpoint(page, '**/api/v1/cameras/*', {
    status: 200,
    data: {
      success: true,
      data: mockCameraData.cameraOnline,
      correlation_id: 'test-correlation-id',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Apply cameras empty list mock
 */
export async function mockCamerasEmpty(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/v1/cameras', {
    status: 200,
    data: mockCamerasResponses.empty,
  });
}

/**
 * Apply cameras server error mock (500)
 */
export async function mockCamerasError(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/v1/cameras', {
    status: 500,
    error: true,
    errorMessage: 'Internal server error',
  });
  await mockEndpoint(page, '**/api/v1/cameras/*', {
    status: 500,
    error: true,
    errorMessage: 'Internal server error',
  });
}

/**
 * Apply cameras loading mock (slow response for testing loading state)
 */
export async function mockCamerasLoading(
  page: Page,
  delayMs: number = 3000
): Promise<void> {
  await mockEndpoint(page, '**/api/v1/cameras', {
    status: 200,
    delay: delayMs,
    data: mockCamerasResponses.withCameras,
  });
}

/**
 * Apply cameras network failure mock
 */
export async function mockCamerasNetworkFailure(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/v1/cameras', {
    abort: 'connectionfailed',
  });
  await mockEndpoint(page, '**/api/v1/cameras/*', {
    abort: 'connectionfailed',
  });
}

/**
 * Apply WiFi 404 mock (feature unavailable)
 */
export async function mockWifi404(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/wifi/scan', {
    status: 404,
    error: true,
    errorMessage: 'Endpoint not found',
  });
  await mockEndpoint(page, '**/api/wifi/status', {
    status: 404,
    error: true,
    errorMessage: 'Endpoint not found',
  });
  await mockEndpoint(page, '**/api/wifi/connect', {
    status: 404,
    error: true,
    errorMessage: 'Endpoint not found',
  });
}

/**
 * Apply WiFi 503 mock (service unavailable)
 */
export async function mockWifi503(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/wifi/scan', {
    status: 503,
    error: true,
    errorMessage: 'Service unavailable',
  });
  await mockEndpoint(page, '**/api/wifi/status', {
    status: 503,
    error: true,
    errorMessage: 'Service unavailable',
  });
  await mockEndpoint(page, '**/api/wifi/connect', {
    status: 503,
    error: true,
    errorMessage: 'Service unavailable',
  });
}

/**
 * Apply WiFi network failure mock
 */
export async function mockWifiNetworkFailure(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/wifi/**', {
    abort: 'connectionfailed',
  });
}

/**
 * Apply door success mock
 */
export async function mockDoorSuccess(
  page: Page,
  state: 'open' | 'closed' | 'locked' = 'closed'
): Promise<void> {
  await mockEndpoint(page, '**/api/door/status', {
    status: 200,
    data: {
      state: state === 'locked' ? 'closed' : state,
      lock_state: state === 'locked' ? 'locked' : 'unlocked',
      last_command: state === 'locked' ? 'lock' : state,
      last_command_time: new Date().toISOString(),
    },
  });
}

/**
 * Apply door error mock
 */
export async function mockDoorError(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/door/status', {
    status: 500,
    error: true,
    errorMessage: 'Door sensor not responding',
  });
}

/**
 * Apply door network failure mock
 */
export async function mockDoorNetworkFailure(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/door/**', {
    abort: 'connectionfailed',
  });
}

/**
 * Apply system info success mock
 */
export async function mockSystemSuccess(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/system/info', {
    status: 200,
    data: defaultMockData.systemInfo,
  });
}

/**
 * Apply system info error mock
 */
export async function mockSystemError(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/system/info', {
    status: 500,
    error: true,
    errorMessage: 'System info unavailable',
  });
}

/**
 * Apply system info network failure mock
 */
export async function mockSystemNetworkFailure(page: Page): Promise<void> {
  await mockEndpoint(page, '**/api/system/**', {
    abort: 'connectionfailed',
  });
}
