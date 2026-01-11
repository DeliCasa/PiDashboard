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
 */
interface MockRouteConfig {
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
}

/**
 * Create a route handler with configuration
 */
function createRouteHandler(config: MockRouteConfig) {
  return async (route: Route) => {
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
