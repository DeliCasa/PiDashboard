# Data Model: Testing Research & Hardening

**Feature ID**: 005-testing-research-and-hardening
**Created**: 2026-01-07

---

## Overview

This feature does not introduce new application entities. Instead, it defines test infrastructure models and validation schemas.

---

## 1. Zod Validation Schemas

### 1.1 SystemInfo Schema

**Purpose**: Validate `/api/system/info` responses

```typescript
// src/infrastructure/api/schemas.ts
import { z } from 'zod';

export const SystemInfoSchema = z.object({
  hostname: z.string(),
  uptime: z.number(), // nanoseconds from backend
  cpu_cores: z.number().int().positive(),
  cpu_usage: z.number().min(0).max(100),
  memory_total: z.number().positive(),
  memory_used: z.number().nonnegative(),
  disk_total: z.number().positive(),
  disk_used: z.number().nonnegative(),
  temperature: z.number().nullable(),
});

export type RawSystemInfo = z.infer<typeof SystemInfoSchema>;
```

### 1.2 WiFi Schemas

**Purpose**: Validate `/api/wifi/*` responses

```typescript
export const WifiStatusSchema = z.object({
  mode: z.enum(['client', 'ap', 'disconnected']),
  ssid: z.string().optional(),
  ip: z.string().optional(),
  signal: z.number().optional(),
});

export const WifiNetworkSchema = z.object({
  ssid: z.string(),
  security: z.string(), // "WPA2", "WPA3", "Open", etc.
  signal: z.number(),
  bssid: z.string().optional(),
});

export const WifiScanResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  networks: z.array(WifiNetworkSchema),
  success: z.boolean().optional(),
});
```

### 1.3 Config Schemas

**Purpose**: Validate `/api/dashboard/config` responses

```typescript
export const ConfigItemSchema = z.object({
  key: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  type: z.enum(['string', 'number', 'boolean', 'password']).optional(),
  description: z.string().optional(),
});

export const ConfigSectionSchema = z.object({
  name: z.string(),
  items: z.array(ConfigItemSchema),
});

export const ConfigResponseSchema = z.object({
  sections: z.array(ConfigSectionSchema),
});
```

### 1.4 Door Schemas

**Purpose**: Validate `/api/door/*` responses

```typescript
export const DoorStateSchema = z.enum(['open', 'closed', 'unknown', 'error']);
export const LockStateSchema = z.enum(['locked', 'unlocked', 'unknown', 'error']);

export const DoorStatusSchema = z.object({
  state: DoorStateSchema,
  lock_state: LockStateSchema,
  last_operation: z.string().optional(),
  timestamp: z.string().optional(),
});

export const DoorCommandResponseSchema = z.object({
  success: z.boolean(),
  state: DoorStateSchema.optional(),
  error: z.string().optional(),
});
```

### 1.5 Logs Schemas

**Purpose**: Validate `/api/dashboard/logs` responses

```typescript
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: LogLevelSchema,
  message: z.string(),
  source: z.string().optional(),
});

export const LogsResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  logs: z.array(LogEntrySchema),
});
```

### 1.6 Network Schemas

**Purpose**: Validate network diagnostics responses

```typescript
export const TailscaleStatusSchema = z.object({
  backend_state: z.string(),
  tailscale_ip: z.string().optional(),
  hostname: z.string().optional(),
});

export const BridgeStatusSchema = z.object({
  status: z.object({
    connected: z.boolean(),
    url: z.string().optional(),
  }),
});

export const MqttStatusSchema = z.object({
  connected: z.boolean(),
  broker: z.string().optional(),
  error: z.string().optional(),
});
```

---

## 2. Test Configuration Entities

### 2.1 Test Scenario

**Purpose**: Define reusable test scenarios for MSW mocks

```typescript
// tests/e2e/fixtures/types.ts
export interface TestScenario {
  name: string;
  description: string;
  api: {
    system?: Partial<RawSystemInfo>;
    wifi?: Partial<WifiScanResponse>;
    config?: Partial<ConfigResponse>;
    door?: Partial<DoorStatus>;
    logs?: Partial<LogsResponse>;
  };
  expectations: {
    errorStates?: string[];
    loadingStates?: string[];
    successStates?: string[];
  };
}
```

### 2.2 Resilience Test Case

**Purpose**: Define resilience scenario parameters

```typescript
// tests/e2e/fixtures/resilience-types.ts
export interface ResilienceTestCase {
  name: string;
  type: 'timeout' | 'error' | 'partial-failure' | 'reconnection';
  setup: {
    endpoints: string[];
    behavior: 'fail' | 'timeout' | 'intermittent';
    duration?: number;
    failureRate?: number;
  };
  validation: {
    recoveryTimeMs: number;
    expectedState: string;
    errorMessages?: string[];
  };
}
```

### 2.3 Flaky Test Record

**Purpose**: Track quarantined tests

```typescript
// tests/e2e/quarantine/types.ts
export interface FlakyTestRecord {
  testFile: string;
  testName: string;
  quarantinedAt: string; // ISO date
  reason: string;
  failureCount: number;
  lastFailure: string; // ISO date
  issueUrl?: string;
  resolution?: {
    fixedAt?: string;
    fixCommit?: string;
    rootCause?: string;
  };
}
```

---

## 3. Performance Budget Entities

### 3.1 Performance Budget

**Purpose**: Define measurable performance constraints

```typescript
// docs/PERFORMANCE_BUDGETS.md schema
export interface PerformanceBudget {
  metric: string;
  threshold: number;
  unit: 'ms' | 'KB' | 'percent' | 'count';
  enforcement: 'pr' | 'nightly' | 'manual';
  description: string;
}

export const PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  {
    metric: 'bundle-size-gzip',
    threshold: 600,
    unit: 'KB',
    enforcement: 'pr',
    description: 'Total JS bundle size (gzipped)',
  },
  {
    metric: 'page-load-3g',
    threshold: 3000,
    unit: 'ms',
    enforcement: 'nightly',
    description: 'Page load time on simulated 3G',
  },
  {
    metric: 'api-response-p95',
    threshold: 500,
    unit: 'ms',
    enforcement: 'nightly',
    description: '95th percentile API response time',
  },
  {
    metric: 'sse-update-latency',
    threshold: 100,
    unit: 'ms',
    enforcement: 'nightly',
    description: 'SSE message propagation time',
  },
];
```

---

## 4. BLE Provisioning Test Entities

### 4.1 Mock Bluetooth Device

**Purpose**: Mock Web Bluetooth API for testing

```typescript
// tests/mocks/bluetooth.ts
export interface MockBluetoothDevice {
  id: string;
  name: string;
  gatt?: MockBluetoothRemoteGATTServer;
}

export interface MockBluetoothRemoteGATTServer {
  connected: boolean;
  connect: () => Promise<MockBluetoothRemoteGATTServer>;
  disconnect: () => void;
  getPrimaryService: (uuid: string) => Promise<MockBluetoothRemoteGATTService>;
}

export interface MockBluetoothRemoteGATTService {
  getCharacteristic: (uuid: string) => Promise<MockBluetoothRemoteGATTCharacteristic>;
}

export interface MockBluetoothRemoteGATTCharacteristic {
  uuid: string;
  value?: DataView;
  writeValue: (value: BufferSource) => Promise<void>;
  readValue: () => Promise<DataView>;
}
```

### 4.2 Provisioning Test Scenario

**Purpose**: Define BLE provisioning test cases

```typescript
// tests/integration/bluetooth/types.ts
export interface ProvisioningTestScenario {
  name: string;
  device: {
    name: string;
    id: string;
    available: boolean;
  };
  wifi: {
    ssid: string;
    password: string;
  };
  mqtt: {
    broker: string;
    port: number;
    username?: string;
    password?: string;
  };
  expectedSteps: ProvisioningStep[];
  shouldSucceed: boolean;
  failurePoint?: ProvisioningStep;
  errorMessage?: string;
}

export type ProvisioningStep =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'writing'
  | 'verifying'
  | 'done'
  | 'error';
```

---

## 5. Contract Test Entities

### 5.1 Contract Validation Result

**Purpose**: Track schema validation outcomes

```typescript
// tests/integration/contracts/types.ts
export interface ContractValidationResult {
  endpoint: string;
  schema: string;
  timestamp: string;
  success: boolean;
  errors?: Array<{
    path: string;
    message: string;
    expected: string;
    received: string;
  }>;
  mockData: unknown;
}
```

### 5.2 MSW Handler Contract

**Purpose**: Map MSW handlers to schemas

```typescript
export interface MswHandlerContract {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  schema: z.ZodSchema;
  scenarioVariants: string[];
}

export const MSW_CONTRACTS: MswHandlerContract[] = [
  { method: 'GET', path: '/api/system/info', schema: SystemInfoSchema, scenarioVariants: ['default', 'high-load'] },
  { method: 'GET', path: '/api/wifi/scan', schema: WifiScanResponseSchema, scenarioVariants: ['default', 'empty', 'many'] },
  { method: 'GET', path: '/api/wifi/status', schema: WifiStatusSchema, scenarioVariants: ['connected', 'disconnected', 'ap'] },
  { method: 'GET', path: '/api/dashboard/config', schema: ConfigResponseSchema, scenarioVariants: ['default'] },
  { method: 'GET', path: '/api/door/status', schema: DoorStatusSchema, scenarioVariants: ['open', 'closed', 'error'] },
  { method: 'GET', path: '/api/dashboard/logs', schema: LogsResponseSchema, scenarioVariants: ['default', 'empty'] },
];
```

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    Test Infrastructure                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    validates    ┌─────────────────┐            │
│  │ Zod Schemas │ ──────────────► │ API Responses   │            │
│  └─────────────┘                 └─────────────────┘            │
│         │                                                        │
│         │ defines                                                │
│         ▼                                                        │
│  ┌─────────────┐    enforces     ┌─────────────────┐            │
│  │ MSW Handler │ ──────────────► │ Mock Responses  │            │
│  │  Contracts  │                 └─────────────────┘            │
│  └─────────────┘                                                 │
│                                                                  │
│  ┌─────────────┐    configures   ┌─────────────────┐            │
│  │ Test        │ ──────────────► │ E2E Tests       │            │
│  │ Scenarios   │                 └─────────────────┘            │
│  └─────────────┘                                                 │
│         │                                                        │
│         │ includes                                               │
│         ▼                                                        │
│  ┌─────────────┐    tracks       ┌─────────────────┐            │
│  │ Resilience  │ ──────────────► │ Recovery Time   │            │
│  │ Test Cases  │                 └─────────────────┘            │
│  └─────────────┘                                                 │
│                                                                  │
│  ┌─────────────┐    measures     ┌─────────────────┐            │
│  │ Performance │ ──────────────► │ CI Checks       │            │
│  │ Budgets     │                 └─────────────────┘            │
│  └─────────────┘                                                 │
│                                                                  │
│  ┌─────────────┐    manages      ┌─────────────────┐            │
│  │ Flaky Test  │ ──────────────► │ Quarantine Dir  │            │
│  │ Records     │                 └─────────────────┘            │
│  └─────────────┘                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

### Schema Validation
- All Zod schemas must match TypeScript types in `src/domain/types/`
- Schema changes require updating both schema and MSW mock responses
- Contract tests must pass before merge

### Performance Budgets
- PR enforcement: Bundle size only
- Nightly enforcement: All metrics
- Manual enforcement: User-reported metrics

### Flaky Test Management
- Quarantine after 3 failures in 7 days
- Fix within 14 days or delete
- Document root cause before unquarantine

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/infrastructure/api/schemas.ts` | Zod validation schemas |
| `tests/e2e/fixtures/types.ts` | Test scenario types |
| `tests/e2e/fixtures/resilience-types.ts` | Resilience test types |
| `tests/e2e/quarantine/types.ts` | Flaky test tracking types |
| `tests/mocks/bluetooth.ts` | Mock Bluetooth API |
| `tests/integration/contracts/types.ts` | Contract validation types |
| `docs/PERFORMANCE_BUDGETS.md` | Budget definitions |
