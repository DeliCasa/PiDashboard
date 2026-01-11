/**
 * Test Infrastructure Types
 * Feature: 005-testing-research-and-hardening
 *
 * Central type definitions for test configuration and infrastructure
 */

import type { z } from 'zod';

// ============================================================================
// Test Scenario Types
// ============================================================================

/**
 * Define reusable test scenarios for MSW mocks
 */
export interface TestScenario {
  name: string;
  description: string;
  api: {
    system?: Record<string, unknown>;
    wifi?: Record<string, unknown>;
    config?: Record<string, unknown>;
    door?: Record<string, unknown>;
    logs?: Record<string, unknown>;
  };
  expectations: {
    errorStates?: string[];
    loadingStates?: string[];
    successStates?: string[];
  };
}

// ============================================================================
// Resilience Test Types
// ============================================================================

/**
 * Define resilience scenario parameters
 */
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

// ============================================================================
// Flaky Test Management Types
// ============================================================================

/**
 * Track quarantined tests
 */
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

// ============================================================================
// Performance Budget Types
// ============================================================================

/**
 * Define measurable performance constraints
 */
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

// ============================================================================
// Contract Test Types
// ============================================================================

/**
 * Track schema validation outcomes
 */
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

/**
 * Map MSW handlers to schemas
 */
export interface MswHandlerContract {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  schema: z.ZodSchema;
  scenarioVariants: string[];
}

// ============================================================================
// BLE Provisioning Test Types
// ============================================================================

export type ProvisioningStep =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'writing'
  | 'verifying'
  | 'done'
  | 'error';

/**
 * Define BLE provisioning test cases
 */
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

// ============================================================================
// Mock Bluetooth Types
// ============================================================================

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
  getCharacteristic: (
    uuid: string
  ) => Promise<MockBluetoothRemoteGATTCharacteristic>;
}

export interface MockBluetoothRemoteGATTCharacteristic {
  uuid: string;
  value?: DataView;
  writeValue: (value: BufferSource) => Promise<void>;
  readValue: () => Promise<DataView>;
}

// ============================================================================
// Test Utility Types
// ============================================================================

/**
 * Helper type for creating partial mock responses
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Helper type for test assertions
 */
export type AssertionResult = {
  pass: boolean;
  message: string;
  actual?: unknown;
  expected?: unknown;
};
