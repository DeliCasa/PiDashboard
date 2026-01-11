/**
 * System API Contract Tests
 * Feature: 005-testing-research-and-hardening (T027)
 *
 * Validates that mock data matches the Zod schemas defined for system API.
 * Prevents silent drift between MSW handlers and actual API contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  SystemInfoResponseSchema,
  CpuInfoSchema,
  MemoryInfoSchema,
  DiskInfoSchema,
  LoadAverageSchema,
} from '@/infrastructure/api/schemas';
import type { ContractValidationResult } from './types';

/**
 * Valid mock data matching actual PiOrchestrator response
 * NOTE: V1 envelope is unwrapped by proxy, so we get data directly
 */
const validSystemInfoResponse = {
  timestamp: '2026-01-07T12:00:00Z',
  cpu: {
    usage_percent: 25.5,
    core_count: 4,
    per_core: [20.0, 30.0, 25.0, 27.0],
  },
  memory: {
    used_mb: 512,
    total_mb: 1024,
    used_percent: 50.0,
    available_mb: 512,
  },
  disk: {
    used_gb: 8.0,
    total_gb: 32.0,
    used_percent: 25.0,
    path: '/',
  },
  temperature_celsius: 45.5,
  uptime: 86400000000000, // 1 day in nanoseconds
  load_average: {
    load_1: 0.5,
    load_5: 0.4,
    load_15: 0.3,
  },
  overall_status: 'healthy',
};

/**
 * Mock data variants for different scenarios
 * NOTE: V1 envelope is unwrapped by proxy
 */
const mockVariants = {
  healthy: validSystemInfoResponse,
  highCpu: {
    ...validSystemInfoResponse,
    cpu: { usage_percent: 95.0, core_count: 4, per_core: [95, 96, 94, 95] },
    overall_status: 'warning',
  },
  lowMemory: {
    ...validSystemInfoResponse,
    memory: { used_mb: 900, total_mb: 1024, used_percent: 87.9, available_mb: 124 },
    overall_status: 'warning',
  },
  hotTemperature: {
    ...validSystemInfoResponse,
    temperature_celsius: 82.0,
    overall_status: 'critical',
  },
  minimalData: {
    timestamp: '2026-01-07T00:00:00Z',
    cpu: { usage_percent: 0, core_count: 1 },
    memory: { used_mb: 0, total_mb: 512, used_percent: 0, available_mb: 512 },
    disk: { used_gb: 0, total_gb: 1, used_percent: 0, path: '/' },
    temperature_celsius: 0,
    uptime: 0,
    load_average: { load_1: 0, load_5: 0, load_15: 0 },
    overall_status: 'unknown',
  },
};

/**
 * Helper to create contract validation result
 */
function validateContract(
  schema: ReturnType<typeof import('zod').z.object>,
  data: unknown,
  endpoint: string,
  schemaName: string
): ContractValidationResult {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      endpoint,
      schema: schemaName,
      timestamp: new Date().toISOString(),
      success: true,
      mockData: data,
    };
  }

  return {
    endpoint,
    schema: schemaName,
    timestamp: new Date().toISOString(),
    success: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
      expected: String(err.code),
      received: String(typeof err),
    })),
    mockData: data,
  };
}

describe('System API Contracts', () => {
  describe('SystemInfoResponseSchema', () => {
    it('validates complete healthy response', () => {
      const result = SystemInfoResponseSchema.safeParse(validSystemInfoResponse);
      expect(result.success).toBe(true);
    });

    it('validates all mock variants match schema', () => {
      for (const [variantName, mockData] of Object.entries(mockVariants)) {
        const result = SystemInfoResponseSchema.safeParse(mockData);
        expect(result.success, `Variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('rejects response without timestamp', () => {
      // V1 envelope is unwrapped - timestamp is required
      const { timestamp: _unused, ...invalid } = validSystemInfoResponse;
      const result = SystemInfoResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects response without cpu', () => {
      // V1 envelope is unwrapped - cpu is required
      const { cpu: _unused, ...invalid } = validSystemInfoResponse;
      const result = SystemInfoResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CpuInfoSchema', () => {
    it('validates valid CPU data', () => {
      // V1 envelope unwrapped - access cpu directly
      const result = CpuInfoSchema.safeParse(validSystemInfoResponse.cpu);
      expect(result.success).toBe(true);
    });

    it('rejects usage_percent > 100', () => {
      const invalid = { usage_percent: 150, core_count: 4 };
      const result = CpuInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects negative usage_percent', () => {
      const invalid = { usage_percent: -10, core_count: 4 };
      const result = CpuInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects non-positive core_count', () => {
      const invalid = { usage_percent: 50, core_count: 0 };
      const result = CpuInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('accepts response without per_core (optional)', () => {
      const minimal = { usage_percent: 50, core_count: 4 };
      const result = CpuInfoSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });

  describe('MemoryInfoSchema', () => {
    it('validates valid memory data', () => {
      // V1 envelope unwrapped - access memory directly
      const result = MemoryInfoSchema.safeParse(validSystemInfoResponse.memory);
      expect(result.success).toBe(true);
    });

    it('rejects used_percent > 100', () => {
      const invalid = { used_mb: 100, total_mb: 50, used_percent: 200, available_mb: 0 };
      const result = MemoryInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects negative memory values', () => {
      const invalid = { used_mb: -100, total_mb: 1024, used_percent: 0, available_mb: 1024 };
      const result = MemoryInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('DiskInfoSchema', () => {
    it('validates valid disk data', () => {
      // V1 envelope unwrapped - access disk directly
      const result = DiskInfoSchema.safeParse(validSystemInfoResponse.disk);
      expect(result.success).toBe(true);
    });

    it('requires path field', () => {
      const invalid = { used_gb: 8, total_gb: 32, used_percent: 25 };
      const result = DiskInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('LoadAverageSchema', () => {
    it('validates valid load average', () => {
      // V1 envelope unwrapped - access load_average directly
      const result = LoadAverageSchema.safeParse(validSystemInfoResponse.load_average);
      expect(result.success).toBe(true);
    });

    it('rejects negative load values', () => {
      const invalid = { load_1: -0.5, load_5: 0.4, load_15: 0.3 };
      const result = LoadAverageSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Contract validation helper', () => {
    it('returns success result for valid data', () => {
      const result = validateContract(
        SystemInfoResponseSchema,
        validSystemInfoResponse,
        '/api/system/info',
        'SystemInfoResponseSchema'
      );
      expect(result.success).toBe(true);
      expect(result.endpoint).toBe('/api/system/info');
      expect(result.errors).toBeUndefined();
    });

    it('returns detailed errors for invalid data', () => {
      const result = validateContract(
        SystemInfoResponseSchema,
        { invalid: true },
        '/api/system/info',
        'SystemInfoResponseSchema'
      );
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
