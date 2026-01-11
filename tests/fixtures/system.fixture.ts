/**
 * System Test Fixtures (T022)
 * Mock data for System API transformation tests (nanoseconds uptime)
 * NOTE: V1 envelope is unwrapped by proxy, so data is returned directly
 */

import type { RawSystemInfoResponse } from '@/infrastructure/api/system';
import type { SystemStatus } from '@/domain/types/entities';

// Backend raw API responses (uses nanoseconds for uptime)
// NOTE: V1 envelope is unwrapped by proxy, so these are the direct data objects
export const systemApiResponses = {
  healthy: {
    timestamp: '2026-01-07T10:30:00.000Z',
    cpu: {
      usage_percent: 25.5,
      core_count: 4,
      per_core: [30, 25, 20, 27],
    },
    memory: {
      used_mb: 512,
      total_mb: 2048,
      used_percent: 25.0,
      available_mb: 1536,
    },
    disk: {
      used_gb: 10.5,
      total_gb: 32,
      used_percent: 32.8,
      path: '/',
    },
    temperature_celsius: 45.5,
    uptime: 86400_000_000_000, // 1 day in nanoseconds
    load_average: {
      load_1: 0.5,
      load_5: 0.3,
      load_15: 0.2,
    },
    overall_status: 'healthy',
  } satisfies RawSystemInfoResponse,

  highLoad: {
    timestamp: '2026-01-07T10:30:00.000Z',
    cpu: {
      usage_percent: 95.0,
      core_count: 4,
      per_core: [98, 92, 94, 96],
    },
    memory: {
      used_mb: 1900,
      total_mb: 2048,
      used_percent: 92.8,
      available_mb: 148,
    },
    disk: {
      used_gb: 30,
      total_gb: 32,
      used_percent: 93.75,
      path: '/',
    },
    temperature_celsius: 78.5,
    uptime: 604800_000_000_000, // 7 days in nanoseconds
    load_average: {
      load_1: 4.5,
      load_5: 4.2,
      load_15: 3.8,
    },
    overall_status: 'warning',
  } satisfies RawSystemInfoResponse,

  pi3Model: {
    timestamp: '2026-01-07T10:30:00.000Z',
    cpu: {
      usage_percent: 50.0,
      core_count: 2, // Pi 3 has 4 cores but using 2 for test case
      per_core: [55, 45],
    },
    memory: {
      used_mb: 256,
      total_mb: 1024,
      used_percent: 25.0,
      available_mb: 768,
    },
    disk: {
      used_gb: 5,
      total_gb: 16,
      used_percent: 31.25,
      path: '/',
    },
    temperature_celsius: 52.0,
    uptime: 3600_000_000_000, // 1 hour in nanoseconds
    load_average: {
      load_1: 1.0,
      load_5: 0.8,
      load_15: 0.6,
    },
    overall_status: 'healthy',
  } satisfies RawSystemInfoResponse,

  freshBoot: {
    timestamp: '2026-01-07T10:30:00.000Z',
    cpu: {
      usage_percent: 10.0,
      core_count: 4,
      per_core: [12, 8, 10, 10],
    },
    memory: {
      used_mb: 300,
      total_mb: 2048,
      used_percent: 14.6,
      available_mb: 1748,
    },
    disk: {
      used_gb: 8,
      total_gb: 32,
      used_percent: 25.0,
      path: '/',
    },
    temperature_celsius: 40.0,
    uptime: 300_000_000_000, // 5 minutes in nanoseconds
    load_average: {
      load_1: 0.2,
      load_5: 0.1,
      load_15: 0.05,
    },
    overall_status: 'healthy',
  } satisfies RawSystemInfoResponse,
};

// Expected transformed SystemStatus values
export const expectedSystemStatus: Record<string, Partial<SystemStatus>> = {
  healthy: {
    cpu_usage: 25.5,
    memory_usage: 25.0,
    memory_total: 2048,
    memory_available: 1536,
    disk_usage: 32.8,
    disk_total: 32,
    disk_available: 21.5,
    temperature: 45.5,
    uptime: '1d 0h 0m',
    uptime_seconds: 86400,
    pi_model: 'pi4',
  },

  highLoad: {
    cpu_usage: 95.0,
    memory_usage: 92.8,
    temperature: 78.5,
    uptime: '7d 0h 0m',
    uptime_seconds: 604800,
    pi_model: 'pi4',
  },

  pi3Model: {
    pi_model: 'pi3',
    uptime: '1h 0m',
    uptime_seconds: 3600,
  },

  freshBoot: {
    uptime: '5m',
    uptime_seconds: 300,
  },
};

// Uptime conversion test cases (nanoseconds to human-readable)
export const uptimeConversionCases = [
  {
    nanoseconds: 60_000_000_000, // 1 minute
    expectedSeconds: 60,
    expectedString: '1m',
  },
  {
    nanoseconds: 3600_000_000_000, // 1 hour
    expectedSeconds: 3600,
    expectedString: '1h 0m',
  },
  {
    nanoseconds: 3660_000_000_000, // 1 hour 1 minute
    expectedSeconds: 3660,
    expectedString: '1h 1m',
  },
  {
    nanoseconds: 86400_000_000_000, // 1 day
    expectedSeconds: 86400,
    expectedString: '1d 0h 0m',
  },
  {
    nanoseconds: 90000_000_000_000, // 1 day 1 hour
    expectedSeconds: 90000,
    expectedString: '1d 1h 0m',
  },
  {
    nanoseconds: 259200_000_000_000, // 3 days
    expectedSeconds: 259200,
    expectedString: '3d 0h 0m',
  },
];

// Pi model detection test cases
export const piModelCases = [
  { coreCount: 4, expectedModel: 'pi4' },
  { coreCount: 8, expectedModel: 'pi4' },
  { coreCount: 2, expectedModel: 'pi3' },
  { coreCount: 1, expectedModel: 'pi3' },
];

// Byte conversion test cases
export const byteConversionCases = [
  { mb: 1024, expectedGb: 1 },
  { mb: 2048, expectedGb: 2 },
  { mb: 512, expectedGb: 0.5 },
];
