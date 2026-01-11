/**
 * Config API Contract Tests
 * Feature: 005-testing-research-and-hardening (T029)
 *
 * Validates that mock data matches the Zod schemas defined for config API.
 * Prevents silent drift between MSW handlers and actual API contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  ConfigItemApiSchema,
  ConfigSectionApiSchema,
  ConfigResponseSchema,
  ConfigUpdateResponseSchema,
  ConfigResetResponseSchema,
  ConfigValidationSchema,
} from '@/infrastructure/api/schemas';

/**
 * Valid mock data matching actual PiOrchestrator responses
 */
const validConfigResponse = {
  sections: [
    {
      name: 'Server',
      description: 'HTTP server configuration',
      items: [
        {
          key: 'server.port',
          value: '8082',
          default_value: '8082',
          type: 'number',
          description: 'HTTP server port',
          required: true,
          editable: true,
          validation: {
            min: 1024,
            max: 65535,
          },
        },
        {
          key: 'server.host',
          value: '0.0.0.0',
          default_value: '0.0.0.0',
          type: 'string',
          description: 'HTTP server bind address',
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
          editable: true,
        },
      ],
    },
    {
      name: 'Hardware',
      description: 'Hardware pin configuration',
      items: [
        {
          key: 'hardware.door_pin',
          value: '17',
          default_value: '17',
          type: 'number',
          description: 'GPIO pin for door control',
          editable: true,
          validation: {
            min: 0,
            max: 27,
          },
        },
        {
          key: 'hardware.enabled',
          value: 'true',
          default_value: 'true',
          type: 'boolean',
          description: 'Enable hardware controls',
          editable: true,
          validation: {
            options: ['true', 'false'],
          },
        },
      ],
    },
  ],
  success: true,
};

/**
 * Mock data variants for different scenarios
 */
const configVariants = {
  full: validConfigResponse,
  minimal: {
    sections: [
      {
        name: 'System',
        items: [
          {
            key: 'system.name',
            value: 'PiOrchestrator',
            type: 'string',
          },
        ],
      },
    ],
    success: true,
  },
  empty: {
    sections: [],
    success: true,
  },
  manyItems: {
    sections: [
      {
        name: 'Settings',
        items: Array.from({ length: 20 }, (_, i) => ({
          key: `setting.item${i}`,
          value: `value${i}`,
          type: 'string',
        })),
      },
    ],
    success: true,
  },
  withValidation: {
    sections: [
      {
        name: 'Validated',
        items: [
          {
            key: 'range.value',
            value: '50',
            type: 'number',
            validation: { min: 0, max: 100 },
          },
          {
            key: 'pattern.value',
            value: 'abc123',
            type: 'string',
            validation: { pattern: '^[a-z0-9]+$' },
          },
          {
            key: 'enum.value',
            value: 'option1',
            type: 'string',
            validation: { options: ['option1', 'option2', 'option3'] },
          },
        ],
      },
    ],
    success: true,
  },
};

describe('Config API Contracts', () => {
  describe('ConfigValidationSchema', () => {
    it('validates range validation', () => {
      const rangeValidation = { min: 0, max: 100 };
      const result = ConfigValidationSchema.safeParse(rangeValidation);
      expect(result.success).toBe(true);
    });

    it('validates pattern validation', () => {
      const patternValidation = { pattern: '^[a-zA-Z]+$' };
      const result = ConfigValidationSchema.safeParse(patternValidation);
      expect(result.success).toBe(true);
    });

    it('validates options validation', () => {
      const optionsValidation = { options: ['yes', 'no', 'maybe'] };
      const result = ConfigValidationSchema.safeParse(optionsValidation);
      expect(result.success).toBe(true);
    });

    it('validates combined validation', () => {
      const combined = { min: 1, max: 10, options: ['1', '5', '10'] };
      const result = ConfigValidationSchema.safeParse(combined);
      expect(result.success).toBe(true);
    });

    it('validates empty validation object', () => {
      const empty = {};
      const result = ConfigValidationSchema.safeParse(empty);
      expect(result.success).toBe(true);
    });
  });

  describe('ConfigItemApiSchema', () => {
    it('validates complete config item', () => {
      const item = validConfigResponse.sections[0].items[0];
      const result = ConfigItemApiSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('validates minimal config item', () => {
      const minimal = { key: 'test.key', value: 'test', type: 'string' };
      const result = ConfigItemApiSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('accepts various value types as strings', () => {
      const values = ['string', '123', 'true', '', '{"json": true}'];
      for (const value of values) {
        const item = { key: 'test', value, type: 'string' };
        const result = ConfigItemApiSchema.safeParse(item);
        expect(result.success, `Value "${value}" should be accepted`).toBe(true);
      }
    });

    it('accepts various item types', () => {
      const types = ['string', 'number', 'boolean', 'secret', 'path', 'url'];
      for (const type of types) {
        const item = { key: 'test', value: 'value', type };
        const result = ConfigItemApiSchema.safeParse(item);
        expect(result.success, `Type "${type}" should be accepted`).toBe(true);
      }
    });

    it('requires key field', () => {
      const invalid = { value: 'test', type: 'string' };
      const result = ConfigItemApiSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires value field', () => {
      const invalid = { key: 'test', type: 'string' };
      const result = ConfigItemApiSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires type field', () => {
      const invalid = { key: 'test', value: 'value' };
      const result = ConfigItemApiSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ConfigSectionApiSchema', () => {
    it('validates complete section', () => {
      const section = validConfigResponse.sections[0];
      const result = ConfigSectionApiSchema.safeParse(section);
      expect(result.success).toBe(true);
    });

    it('validates section without description', () => {
      const minimal = {
        name: 'Section',
        items: [{ key: 'k', value: 'v', type: 'string' }],
      };
      const result = ConfigSectionApiSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('validates section with empty items', () => {
      const emptyItems = { name: 'EmptySection', items: [] };
      const result = ConfigSectionApiSchema.safeParse(emptyItems);
      expect(result.success).toBe(true);
    });

    it('requires name field', () => {
      const invalid = { items: [] };
      const result = ConfigSectionApiSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires items field', () => {
      const invalid = { name: 'Section' };
      const result = ConfigSectionApiSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ConfigResponseSchema', () => {
    it('validates complete response', () => {
      const result = ConfigResponseSchema.safeParse(validConfigResponse);
      expect(result.success).toBe(true);
    });

    it('validates all config variants match schema', () => {
      for (const [variantName, mockData] of Object.entries(configVariants)) {
        const result = ConfigResponseSchema.safeParse(mockData);
        expect(result.success, `Variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('validates empty sections array is valid', () => {
      // V1 envelope unwrapped - success not required
      const valid = { sections: [] };
      const result = ConfigResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('requires sections field', () => {
      // V1 envelope unwrapped - sections is the only required field
      const invalid = {};
      const result = ConfigResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ConfigUpdateResponseSchema', () => {
    it('validates success response', () => {
      const success = { success: true };
      const result = ConfigUpdateResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
    });

    it('validates error response', () => {
      const error = { success: false, error: 'Invalid value' };
      const result = ConfigUpdateResponseSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it('requires success field', () => {
      const invalid = { error: 'Some error' };
      const result = ConfigUpdateResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ConfigResetResponseSchema', () => {
    it('validates success response with new value', () => {
      const success = { success: true, value: 'default_value' };
      const result = ConfigResetResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
    });

    it('validates success response without value', () => {
      const success = { success: true };
      const result = ConfigResetResponseSchema.safeParse(success);
      expect(result.success).toBe(true);
    });

    it('validates failure response', () => {
      const failure = { success: false };
      const result = ConfigResetResponseSchema.safeParse(failure);
      expect(result.success).toBe(true);
    });
  });
});
