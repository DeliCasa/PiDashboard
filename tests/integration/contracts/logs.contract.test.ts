/**
 * Logs API Contract Tests
 * Feature: 005-testing-research-and-hardening (T031)
 *
 * Validates that mock data matches the Zod schemas defined for logs API.
 * Prevents silent drift between MSW handlers and actual API contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  LogLevelSchema,
  LogEntrySchema,
  LogsResponseSchema,
  DiagnosticReportSchema,
} from '@/infrastructure/api/schemas';

/**
 * Valid mock data matching actual PiOrchestrator responses
 */
const validLogEntry = {
  timestamp: '2026-01-07T12:00:00Z',
  level: 'info' as const,
  message: 'System started successfully',
  source: 'main',
};

const validLogsResponse = {
  count: 3,
  logs: [
    {
      timestamp: '2026-01-07T12:00:00Z',
      level: 'info' as const,
      message: 'System started',
      source: 'main',
    },
    {
      timestamp: '2026-01-07T11:59:55Z',
      level: 'debug' as const,
      message: 'Loading configuration',
      source: 'config',
    },
    {
      timestamp: '2026-01-07T11:59:50Z',
      level: 'warn' as const,
      message: 'High memory usage detected',
      source: 'monitor',
      metadata: { memory_percent: 85.5 },
    },
  ],
};

const validDiagnosticReport = {
  generated_at: '2026-01-07T12:00:00Z',
  system: {
    hostname: 'raspberrypi',
    uptime_seconds: 86400,
    version: '1.0.0',
  },
  logs: [validLogEntry],
  config: {
    server_port: 8082,
    mqtt_enabled: true,
  },
};

/**
 * Mock data variants for different scenarios
 */
const logVariants = {
  info: { ...validLogEntry, level: 'info' as const },
  debug: { ...validLogEntry, level: 'debug' as const, message: 'Debug message' },
  warn: { ...validLogEntry, level: 'warn' as const, message: 'Warning message' },
  error: { ...validLogEntry, level: 'error' as const, message: 'Error message' },
  withMetadata: {
    ...validLogEntry,
    metadata: { request_id: 'abc123', duration_ms: 150 },
  },
  minimal: {
    timestamp: '2026-01-07T12:00:00Z',
    level: 'info' as const,
    message: 'Minimal log',
  },
};

const logsResponseVariants = {
  normal: validLogsResponse,
  empty: { count: 0, logs: [] },
  single: {
    count: 1,
    logs: [validLogEntry],
  },
  allLevels: {
    count: 4,
    logs: [
      { timestamp: '2026-01-07T12:00:04Z', level: 'debug' as const, message: 'Debug' },
      { timestamp: '2026-01-07T12:00:03Z', level: 'info' as const, message: 'Info' },
      { timestamp: '2026-01-07T12:00:02Z', level: 'warn' as const, message: 'Warning' },
      { timestamp: '2026-01-07T12:00:01Z', level: 'error' as const, message: 'Error' },
    ],
  },
  large: {
    count: 100,
    logs: Array.from({ length: 100 }, (_, i) => ({
      timestamp: `2026-01-07T${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
      level: 'info' as const,
      message: `Log entry ${i}`,
    })),
  },
};

describe('Logs API Contracts', () => {
  describe('LogLevelSchema', () => {
    it('validates all log levels', () => {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      for (const level of validLevels) {
        const result = LogLevelSchema.safeParse(level);
        expect(result.success, `Level "${level}" should be valid`).toBe(true);
      }
    });

    it('rejects invalid log levels', () => {
      const invalidLevels = ['trace', 'fatal', 'warning', 'err', 'INFO', 'DEBUG', ''];
      for (const level of invalidLevels) {
        const result = LogLevelSchema.safeParse(level);
        expect(result.success, `Level "${level}" should be invalid`).toBe(false);
      }
    });
  });

  describe('LogEntrySchema', () => {
    it('validates complete log entry', () => {
      const result = LogEntrySchema.safeParse(validLogEntry);
      expect(result.success).toBe(true);
    });

    it('validates all log entry variants match schema', () => {
      for (const [variantName, mockData] of Object.entries(logVariants)) {
        const result = LogEntrySchema.safeParse(mockData);
        expect(result.success, `Variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('requires timestamp field', () => {
      const invalid = { level: 'info', message: 'Test' };
      const result = LogEntrySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires level field', () => {
      const invalid = { timestamp: '2026-01-07T12:00:00Z', message: 'Test' };
      const result = LogEntrySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires message field', () => {
      const invalid = { timestamp: '2026-01-07T12:00:00Z', level: 'info' };
      const result = LogEntrySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('accepts entry without source (optional)', () => {
      const minimal = {
        timestamp: '2026-01-07T12:00:00Z',
        level: 'info',
        message: 'No source',
      };
      const result = LogEntrySchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('accepts empty message', () => {
      const emptyMessage = {
        timestamp: '2026-01-07T12:00:00Z',
        level: 'info',
        message: '',
      };
      const result = LogEntrySchema.safeParse(emptyMessage);
      expect(result.success).toBe(true);
    });

    it('accepts complex metadata', () => {
      const withMetadata = {
        timestamp: '2026-01-07T12:00:00Z',
        level: 'error',
        message: 'Request failed',
        source: 'http',
        metadata: {
          url: '/api/test',
          status: 500,
          error: { code: 'ERR_TIMEOUT', details: { timeout_ms: 5000 } },
          headers: ['Content-Type', 'Authorization'],
        },
      };
      const result = LogEntrySchema.safeParse(withMetadata);
      expect(result.success).toBe(true);
    });
  });

  describe('LogsResponseSchema', () => {
    it('validates complete response', () => {
      const result = LogsResponseSchema.safeParse(validLogsResponse);
      expect(result.success).toBe(true);
    });

    it('validates all response variants match schema', () => {
      for (const [variantName, mockData] of Object.entries(logsResponseVariants)) {
        const result = LogsResponseSchema.safeParse(mockData);
        expect(result.success, `Variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('requires count field', () => {
      const invalid = { logs: [] };
      const result = LogsResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires logs field', () => {
      const invalid = { count: 0 };
      const result = LogsResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects negative count', () => {
      const invalid = { count: -1, logs: [] };
      const result = LogsResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects non-integer count', () => {
      const invalid = { count: 2.5, logs: [] };
      const result = LogsResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('DiagnosticReportSchema', () => {
    it('validates complete report', () => {
      const result = DiagnosticReportSchema.safeParse(validDiagnosticReport);
      expect(result.success).toBe(true);
    });

    it('validates minimal report', () => {
      const minimal = {
        generated_at: '2026-01-07T12:00:00Z',
      };
      const result = DiagnosticReportSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('requires generated_at field', () => {
      const invalid = {
        system: {},
        logs: [],
      };
      const result = DiagnosticReportSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('accepts report with only system data', () => {
      const systemOnly = {
        generated_at: '2026-01-07T12:00:00Z',
        system: { version: '1.0.0', hostname: 'pi' },
      };
      const result = DiagnosticReportSchema.safeParse(systemOnly);
      expect(result.success).toBe(true);
    });

    it('accepts report with only logs', () => {
      const logsOnly = {
        generated_at: '2026-01-07T12:00:00Z',
        logs: [validLogEntry],
      };
      const result = DiagnosticReportSchema.safeParse(logsOnly);
      expect(result.success).toBe(true);
    });

    it('accepts report with only config', () => {
      const configOnly = {
        generated_at: '2026-01-07T12:00:00Z',
        config: { mqtt_broker: 'localhost:1883' },
      };
      const result = DiagnosticReportSchema.safeParse(configOnly);
      expect(result.success).toBe(true);
    });
  });

  describe('Log filtering scenarios', () => {
    it('validates filtered logs response (by level)', () => {
      const errorOnly = {
        count: 2,
        logs: [
          { timestamp: '2026-01-07T12:00:00Z', level: 'error', message: 'Error 1' },
          { timestamp: '2026-01-07T11:59:00Z', level: 'error', message: 'Error 2' },
        ],
      };
      const result = LogsResponseSchema.safeParse(errorOnly);
      expect(result.success).toBe(true);
    });

    it('validates filtered logs response (by source)', () => {
      const mqttOnly = {
        count: 2,
        logs: [
          { timestamp: '2026-01-07T12:00:00Z', level: 'info', message: 'Connected', source: 'mqtt' },
          { timestamp: '2026-01-07T11:59:00Z', level: 'info', message: 'Subscribed', source: 'mqtt' },
        ],
      };
      const result = LogsResponseSchema.safeParse(mqttOnly);
      expect(result.success).toBe(true);
    });

    it('validates paginated logs response', () => {
      const paginated = {
        count: 50, // Total in this page
        logs: Array.from({ length: 50 }, (_, i) => ({
          timestamp: `2026-01-07T12:${String(i).padStart(2, '0')}:00Z`,
          level: 'info' as const,
          message: `Log ${i}`,
        })),
      };
      const result = LogsResponseSchema.safeParse(paginated);
      expect(result.success).toBe(true);
    });
  });
});
