/**
 * Logs Test Fixtures (T020)
 * Mock data for Logs API transformation tests (bug v1.1.3)
 */

import type { LogEntry } from '@/domain/types/entities';

// Backend logs API response structure
export const logsApiResponses = {
  normalResponse: {
    count: 4,
    logs: [
      {
        id: 'log-001',
        timestamp: '2026-01-07T10:30:00.000Z',
        level: 'info',
        message: 'System started successfully',
        source: 'main',
      },
      {
        id: 'log-002',
        timestamp: '2026-01-07T10:30:05.000Z',
        level: 'debug',
        message: 'WiFi scan initiated',
        source: 'wifi',
        details: { interface: 'wlan0' },
      },
      {
        id: 'log-003',
        timestamp: '2026-01-07T10:30:10.000Z',
        level: 'warn',
        message: 'High CPU temperature detected',
        source: 'monitor',
        details: { temperature: 72 },
      },
      {
        id: 'log-004',
        timestamp: '2026-01-07T10:30:15.000Z',
        level: 'error',
        message: 'Failed to connect to MQTT broker',
        source: 'mqtt',
        details: { broker: 'tcp://localhost:1883', error: 'connection refused' },
      },
    ] satisfies LogEntry[],
  },

  emptyResponse: {
    count: 0,
    logs: [],
  },

  // Edge case: missing logs array
  missingLogsArray: {
    count: 0,
  },

  // Edge case: null logs
  nullLogs: {
    count: 0,
    logs: null,
  },

  singleLogResponse: {
    count: 1,
    logs: [
      {
        id: 'single-log',
        timestamp: '2026-01-07T12:00:00.000Z',
        level: 'info',
        message: 'Test message',
        source: 'test',
      },
    ] satisfies LogEntry[],
  },
};

// Expected log entries for validation
export const expectedLogEntries: LogEntry[] = [
  {
    id: 'log-001',
    timestamp: '2026-01-07T10:30:00.000Z',
    level: 'info',
    message: 'System started successfully',
    source: 'main',
  },
  {
    id: 'log-002',
    timestamp: '2026-01-07T10:30:05.000Z',
    level: 'debug',
    message: 'WiFi scan initiated',
    source: 'wifi',
    details: { interface: 'wlan0' },
  },
];

// Log level test cases
export const logLevelCases = [
  { level: 'debug', priority: 0 },
  { level: 'info', priority: 1 },
  { level: 'warn', priority: 2 },
  { level: 'error', priority: 3 },
] as const;

// Filtering test data
export const filterTestData = {
  allLogs: logsApiResponses.normalResponse.logs,
  infoAndAbove: logsApiResponses.normalResponse.logs.filter(
    (l) => l.level !== 'debug'
  ),
  errorsOnly: logsApiResponses.normalResponse.logs.filter(
    (l) => l.level === 'error'
  ),
  bySource: (source: string) =>
    logsApiResponses.normalResponse.logs.filter((l) => l.source === source),
};
