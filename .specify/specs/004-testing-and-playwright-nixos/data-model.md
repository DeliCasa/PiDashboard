# Data Model: Testing Strategy & Playwright on NixOS

**Feature ID**: 004-testing-and-playwright-nixos
**Created**: 2026-01-07
**Author**: Claude Code

---

## Test Entities

This feature doesn't introduce new domain entities. Instead, it defines **test fixtures** and **mock data structures** that mirror existing domain types.

---

## Mock Data Fixtures

### WiFi Network Fixtures

```typescript
// tests/fixtures/wifi.fixture.ts
import type { WiFiNetwork, WiFiStatus } from '@/domain/types/entities';

export const mockWifiNetworks: WiFiNetwork[] = [
  {
    ssid: 'HomeNetwork',
    signal: -45,
    secured: true,
    encryption: 'wpa2',
    bssid: '00:11:22:33:44:55',
    channel: 6,
  },
  {
    ssid: 'GuestNetwork',
    signal: -70,
    secured: false,
    encryption: 'open',
    bssid: '00:11:22:33:44:66',
    channel: 11,
  },
  {
    ssid: 'SecureNetwork',
    signal: -55,
    secured: true,
    encryption: 'wpa3',
    bssid: '00:11:22:33:44:77',
    channel: 36,
  },
];

export const mockWifiStatus: WiFiStatus = {
  connected: true,
  ssid: 'HomeNetwork',
  ip: '192.168.1.100',
  signal: -45,
  mode: 'client',
};

// Backend response format (for transformation tests)
export const mockWifiScanBackendResponse = {
  success: true,
  count: 3,
  networks: [
    { ssid: 'HomeNetwork', signal: -45, security: 'WPA2', bssid: '00:11:22:33:44:55', channel: 6 },
    { ssid: 'GuestNetwork', signal: -70, security: 'Open', bssid: '00:11:22:33:44:66', channel: 11 },
    { ssid: 'SecureNetwork', signal: -55, security: 'WPA3', bssid: '00:11:22:33:44:77', channel: 36 },
  ],
};
```

### System Info Fixtures

```typescript
// tests/fixtures/system.fixture.ts
import type { SystemInfo } from '@/domain/types/entities';

export const mockSystemInfo: SystemInfo = {
  cpu: {
    usage: 25.5,
    cores: 4,
    model: 'BCM2711',
  },
  memory: {
    used: 512,
    total: 4096,
    percentage: 12.5,
  },
  disk: {
    used: 8192,
    total: 32768,
    percentage: 25,
  },
  temperature: 54.3,
  uptime: '1d 0h 0m',
  hostname: 'delicasa-pi-001',
};

// Backend response format (nanoseconds for uptime)
export const mockSystemInfoBackendResponse = {
  cpu: { usage: 25.5, cores: 4, model: 'BCM2711' },
  memory: { used: 536870912, total: 4294967296 }, // bytes
  disk: { used: 8589934592, total: 34359738368 }, // bytes
  temperature: 54.3,
  uptime: 86400000000000, // nanoseconds (1 day)
  hostname: 'delicasa-pi-001',
};
```

### Configuration Fixtures

```typescript
// tests/fixtures/config.fixture.ts
import type { ConfigEntry, ConfigCategory } from '@/domain/types/entities';

export const mockConfigEntries: ConfigEntry[] = [
  { key: 'http_port', value: '8082', category: 'system', editable: true },
  { key: 'mqtt_broker', value: 'mqtt://localhost:1883', category: 'mqtt', editable: true },
  { key: 'mqtt_topic', value: 'delicasa/+/status', category: 'mqtt', editable: true },
  { key: 'wifi_mode', value: 'client', category: 'network', editable: false },
  { key: 'tailscale_enabled', value: 'true', category: 'network', editable: true },
];

// Backend nested response format
export const mockConfigBackendResponse = {
  sections: [
    {
      name: 'Server',
      items: [
        { key: 'http_port', value: '8082' },
      ],
    },
    {
      name: 'MQTT',
      items: [
        { key: 'mqtt_broker', value: 'mqtt://localhost:1883' },
        { key: 'mqtt_topic', value: 'delicasa/+/status' },
      ],
    },
    {
      name: 'Network',
      items: [
        { key: 'wifi_mode', value: 'client' },
        { key: 'tailscale_enabled', value: 'true' },
      ],
    },
  ],
};
```

### Network Diagnostics Fixtures

```typescript
// tests/fixtures/network.fixture.ts
import type { TailscaleStatus, BridgeStatus, MQTTStatus } from '@/domain/types/entities';

export const mockTailscaleStatus: TailscaleStatus = {
  connected: true,
  ip: '100.74.31.25',
  hostname: 'delicasa-pi-001',
  exitNode: null,
};

// Backend response format
export const mockTailscaleBackendResponse = {
  backend_state: 'Running',
  tailscale_ip: '100.74.31.25',
  hostname: 'delicasa-pi-001',
  exit_node: null,
};

export const mockBridgeStatus: BridgeStatus = {
  connected: true,
  url: 'https://dokku.tail1ba2bb.ts.net/api',
  latency: 45,
};

// Backend nested response format
export const mockBridgeBackendResponse = {
  status: {
    connected: true,
    url: 'https://dokku.tail1ba2bb.ts.net/api',
  },
  latency_ms: 45,
};

export const mockMQTTStatus: MQTTStatus = {
  connected: true,
  broker: 'mqtt://localhost:1883',
  clientId: 'pi-001',
  subscriptions: 3,
};
```

### Door Control Fixtures

```typescript
// tests/fixtures/door.fixture.ts
import type { DoorStatus, DoorOperation } from '@/domain/types/entities';

export const mockDoorStatus: DoorStatus = {
  state: 'closed',
  lastOperation: new Date('2026-01-07T10:00:00Z'),
  sensorActive: true,
};

export const mockDoorOperations: DoorOperation[] = [
  {
    id: '1',
    action: 'open',
    duration: 5,
    timestamp: new Date('2026-01-07T10:00:00Z'),
    success: true,
  },
  {
    id: '2',
    action: 'close',
    duration: 0,
    timestamp: new Date('2026-01-07T10:00:05Z'),
    success: true,
  },
];

export const mockDoorErrorState: DoorStatus = {
  state: 'unknown',
  lastOperation: null,
  sensorActive: false,
};
```

### Log Fixtures

```typescript
// tests/fixtures/logs.fixture.ts
import type { LogEntry, LogLevel } from '@/domain/types/entities';

export const mockLogEntries: LogEntry[] = [
  {
    id: '1',
    timestamp: new Date('2026-01-07T10:00:00Z'),
    level: 'info',
    source: 'wifi',
    message: 'Connected to HomeNetwork',
  },
  {
    id: '2',
    timestamp: new Date('2026-01-07T10:00:01Z'),
    level: 'debug',
    source: 'mqtt',
    message: 'Subscribed to delicasa/+/status',
  },
  {
    id: '3',
    timestamp: new Date('2026-01-07T10:00:02Z'),
    level: 'error',
    source: 'door',
    message: 'Sensor timeout',
  },
];

// Backend response format (JSON, not SSE)
export const mockLogsBackendResponse = {
  count: 3,
  logs: [
    { ts: '2026-01-07T10:00:00Z', level: 'INFO', source: 'wifi', msg: 'Connected to HomeNetwork' },
    { ts: '2026-01-07T10:00:01Z', level: 'DEBUG', source: 'mqtt', msg: 'Subscribed to delicasa/+/status' },
    { ts: '2026-01-07T10:00:02Z', level: 'ERROR', source: 'door', msg: 'Sensor timeout' },
  ],
};
```

---

## Test Data Factory

```typescript
// tests/factories/index.ts
import { mockWifiNetworks, mockWifiStatus } from '../fixtures/wifi.fixture';
import { mockSystemInfo } from '../fixtures/system.fixture';
import { mockConfigEntries } from '../fixtures/config.fixture';
import { mockDoorStatus, mockDoorOperations } from '../fixtures/door.fixture';
import { mockLogEntries } from '../fixtures/logs.fixture';

/**
 * Factory for creating test data with overrides
 */
export const testDataFactory = {
  wifi: {
    network: (overrides = {}) => ({ ...mockWifiNetworks[0], ...overrides }),
    networks: () => [...mockWifiNetworks],
    status: (overrides = {}) => ({ ...mockWifiStatus, ...overrides }),
  },

  system: {
    info: (overrides = {}) => ({ ...mockSystemInfo, ...overrides }),
    highCpu: () => ({ ...mockSystemInfo, cpu: { ...mockSystemInfo.cpu, usage: 95 } }),
    highTemp: () => ({ ...mockSystemInfo, temperature: 85 }),
  },

  config: {
    entries: () => [...mockConfigEntries],
    entry: (overrides = {}) => ({ ...mockConfigEntries[0], ...overrides }),
  },

  door: {
    status: (overrides = {}) => ({ ...mockDoorStatus, ...overrides }),
    operations: () => [...mockDoorOperations],
    errorState: () => mockDoorErrorState,
  },

  logs: {
    entries: () => [...mockLogEntries],
    entry: (overrides = {}) => ({ ...mockLogEntries[0], ...overrides }),
    errorLogs: () => mockLogEntries.filter((l) => l.level === 'error'),
  },
};
```

---

## MSW Handler Data Types

```typescript
// tests/integration/mocks/types.ts

/**
 * Backend API response types (before transformation)
 */
export interface WiFiScanApiResponse {
  success: boolean;
  count: number;
  networks: Array<{
    ssid: string;
    signal: number;
    security: string;
    bssid?: string;
    channel?: number;
  }>;
}

export interface SystemInfoApiResponse {
  cpu: { usage: number; cores: number; model?: string };
  memory: { used: number; total: number }; // bytes
  disk: { used: number; total: number }; // bytes
  temperature: number;
  uptime: number; // nanoseconds
  hostname: string;
}

export interface ConfigApiResponse {
  sections: Array<{
    name: string;
    items: Array<{ key: string; value: string }>;
  }>;
}

export interface LogsApiResponse {
  count: number;
  logs: Array<{
    ts: string;
    level: string;
    source: string;
    msg: string;
  }>;
}

export interface TailscaleApiResponse {
  backend_state: string;
  tailscale_ip: string;
  hostname: string;
  exit_node: string | null;
}

export interface BridgeApiResponse {
  status: {
    connected: boolean;
    url: string;
  };
  latency_ms: number;
}
```

---

## Test Utilities

```typescript
// tests/setup/test-utils.tsx
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/ThemeProvider';

/**
 * Create a fresh QueryClient for each test
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper with all providers for testing
 */
interface ProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

function AllProviders({ children, queryClient }: ProvidersProps) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Custom render with providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };
```

---

## State Transitions for Testing

### Door State Machine

```
      ┌─────────────┐
      │   unknown   │
      └─────┬───────┘
            │ sensor detected
            ▼
      ┌─────────────┐
      │   closed    │◄───────┐
      └─────┬───────┘        │
            │ open command    │ close command
            ▼                 │
      ┌─────────────┐        │
      │    open     │────────┘
      └─────────────┘
```

### WiFi Connection State Machine

```
      ┌─────────────┐
      │ disconnected│◄───────────┐
      └─────┬───────┘            │
            │ connect(ssid)       │ disconnect()
            ▼                     │
      ┌─────────────┐            │
      │ connecting  │            │
      └─────┬───────┘            │
            │ success             │ failure
            ▼                     │
      ┌─────────────┐            │
      │  connected  │────────────┘
      └─────────────┘
```

---

## Coverage Requirements by Data Model

| Domain Entity | Unit Tests | Integration Tests | E2E Tests |
|--------------|------------|-------------------|-----------|
| WiFiNetwork | Transformation | useWifiScan | Scan flow |
| WiFiStatus | - | useWifiStatus | Status display |
| SystemInfo | Transformation | useSystemStatus | Metrics cards |
| ConfigEntry | Transformation | useConfig | Config section |
| DoorStatus | - | useDoor | Door controls |
| LogEntry | Transformation | useLogStream | Log filtering |
| TailscaleStatus | Transformation | useNetwork | Network cards |
| BridgeStatus | Transformation | useNetwork | Network cards |
