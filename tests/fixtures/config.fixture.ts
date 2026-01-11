/**
 * Config Test Fixtures (T016)
 * Mock data for Config API transformation tests
 */

import type { ConfigEntry, ConfigCategory } from '@/domain/types/entities';

// Backend API response with nested sections (bug v1.1.2)
export const configApiResponse = {
  sections: [
    {
      name: 'Server',
      description: 'Server configuration',
      items: [
        {
          key: 'server.port',
          value: '8082',
          default_value: '8082',
          type: 'number',
          description: 'HTTP server port',
          required: true,
          editable: true,
          validation: { min: 1024, max: 65535 },
        },
        {
          key: 'server.host',
          value: '0.0.0.0',
          default_value: '0.0.0.0',
          type: 'string',
          description: 'HTTP server host',
          required: true,
          editable: true,
        },
      ],
    },
    {
      name: 'MQTT',
      description: 'MQTT broker configuration',
      items: [
        {
          key: 'mqtt.broker',
          value: 'tcp://localhost:1883',
          default_value: 'tcp://localhost:1883',
          type: 'string',
          description: 'MQTT broker URL',
          required: true,
          editable: true,
        },
        {
          key: 'mqtt.password',
          value: '********',
          type: 'secret',
          description: 'MQTT password',
          required: false,
          editable: true,
        },
      ],
    },
    {
      name: 'WiFi',
      items: [
        {
          key: 'wifi.interface',
          value: 'wlan0',
          default_value: 'wlan0',
          type: 'string',
          description: 'WiFi interface name',
          editable: false,
        },
      ],
    },
    {
      name: 'Hardware',
      items: [
        {
          key: 'hardware.door_pin',
          value: '17',
          default_value: '17',
          type: 'number',
          description: 'GPIO pin for door relay',
          validation: { min: 1, max: 40 },
        },
      ],
    },
    {
      name: 'Logging',
      items: [
        {
          key: 'logging.level',
          value: 'info',
          default_value: 'info',
          type: 'select',
          description: 'Log verbosity level',
          validation: { options: ['debug', 'info', 'warn', 'error'] },
        },
      ],
    },
    {
      name: 'Heartbeat',
      items: [
        {
          key: 'heartbeat.interval',
          value: '30',
          default_value: '30',
          type: 'number',
          description: 'Heartbeat interval in seconds',
        },
      ],
    },
    {
      name: 'UnknownSection',
      items: [
        {
          key: 'unknown.setting',
          value: 'test',
          type: 'string',
        },
      ],
    },
  ],
  success: true,
};

// Expected transformed ConfigEntry array
export const expectedConfigEntries: ConfigEntry[] = [
  {
    key: 'server.port',
    value: '8082',
    default_value: '8082',
    type: 'number',
    description: 'HTTP server port',
    category: 'system',
    editable: true,
    sensitive: false,
  },
  {
    key: 'server.host',
    value: '0.0.0.0',
    default_value: '0.0.0.0',
    type: 'string',
    description: 'HTTP server host',
    category: 'system',
    editable: true,
    sensitive: false,
  },
  {
    key: 'mqtt.broker',
    value: 'tcp://localhost:1883',
    default_value: 'tcp://localhost:1883',
    type: 'string',
    description: 'MQTT broker URL',
    category: 'mqtt',
    editable: true,
    sensitive: false,
  },
  {
    key: 'mqtt.password',
    value: '********',
    default_value: undefined,
    type: 'secret',
    description: 'MQTT password',
    category: 'mqtt',
    editable: true,
    sensitive: true,
  },
];

// Section name to category mapping test cases
export const sectionMappingCases: Array<{
  section: string;
  expected: ConfigCategory;
}> = [
  { section: 'Server', expected: 'system' },
  { section: 'System', expected: 'system' },
  { section: 'Bridge', expected: 'system' },
  { section: 'MQTT', expected: 'mqtt' },
  { section: 'WiFi', expected: 'wifi' },
  { section: 'Hardware', expected: 'hardware' },
  { section: 'Heartbeat', expected: 'monitoring' },
  { section: 'Logging', expected: 'monitoring' },
  { section: 'Monitoring', expected: 'monitoring' },
  { section: 'UnknownSection', expected: 'system' }, // Unknown defaults to system
  { section: 'RandomName', expected: 'system' },
  { section: '', expected: 'system' },
];

// Edge case: empty sections
export const emptyConfigResponse = {
  sections: [],
  success: true,
};

// Edge case: section with empty items
export const emptySectionResponse = {
  sections: [
    {
      name: 'EmptySection',
      items: [],
    },
  ],
  success: true,
};
