/**
 * Door API Contract Tests
 * Feature: 005-testing-research-and-hardening (T030)
 *
 * Validates that mock data matches the Zod schemas defined for door API.
 * Prevents silent drift between MSW handlers and actual API contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  DoorStateSchema,
  LockStateSchema,
  DoorStatusSchema,
  DoorOpenRequestSchema,
  DoorCommandResponseSchema,
  DoorOperationSchema,
} from '@/infrastructure/api/schemas';

/**
 * Valid mock data matching actual PiOrchestrator responses
 */
const validDoorStatus = {
  id: 'door-1',
  state: 'closed' as const,
  lockState: 'locked' as const,
  relayPin: 17,
  lastCommand: 'close',
};

const validDoorOpenRequest = {
  duration: 5000,
  testing_mode: false,
};

const validDoorCommandResponse = {
  success: true,
  state: 'open' as const,
  message: 'Door opened successfully',
};

const validDoorOperation = {
  id: 'op-12345',
  timestamp: '2026-01-07T12:00:00Z',
  command: 'open',
  result: 'success',
  duration_ms: 250,
};

/**
 * Mock data variants for different scenarios
 */
const statusVariants = {
  closedLocked: validDoorStatus,
  openUnlocked: {
    id: 'door-2',
    state: 'open' as const,
    lockState: 'unlocked' as const,
    relayPin: 17,
    lastCommand: 'open',
  },
  unknown: {
    id: 'door-3',
    state: 'unknown' as const,
    lockState: 'unknown' as const,
    relayPin: 17,
  },
  error: {
    id: 'door-4',
    state: 'error' as const,
    lockState: 'error' as const,
    relayPin: 17,
  },
};

const commandVariants = {
  success: validDoorCommandResponse,
  failure: {
    success: false,
    error: 'Door mechanism jammed',
  },
  successNoState: {
    success: true,
    message: 'Command acknowledged',
  },
  errorWithState: {
    success: false,
    state: 'error' as const,
    error: 'Hardware failure',
  },
};

describe('Door API Contracts', () => {
  describe('DoorStateSchema', () => {
    it('validates all door states', () => {
      const validStates = ['open', 'closed', 'unknown', 'error'];
      for (const state of validStates) {
        const result = DoorStateSchema.safeParse(state);
        expect(result.success, `State "${state}" should be valid`).toBe(true);
      }
    });

    it('rejects invalid states', () => {
      const invalidStates = ['opening', 'closing', 'jammed', 'locked', ''];
      for (const state of invalidStates) {
        const result = DoorStateSchema.safeParse(state);
        expect(result.success, `State "${state}" should be invalid`).toBe(false);
      }
    });
  });

  describe('LockStateSchema', () => {
    it('validates all lock states', () => {
      const validStates = ['locked', 'unlocked', 'unknown', 'error'];
      for (const state of validStates) {
        const result = LockStateSchema.safeParse(state);
        expect(result.success, `Lock state "${state}" should be valid`).toBe(true);
      }
    });

    it('rejects invalid lock states', () => {
      const invalidStates = ['locking', 'unlocking', 'jammed', 'open', 'closed'];
      for (const state of invalidStates) {
        const result = LockStateSchema.safeParse(state);
        expect(result.success, `Lock state "${state}" should be invalid`).toBe(false);
      }
    });
  });

  describe('DoorStatusSchema', () => {
    it('validates complete status', () => {
      const result = DoorStatusSchema.safeParse(validDoorStatus);
      expect(result.success).toBe(true);
    });

    it('validates all status variants match schema', () => {
      for (const [variantName, mockData] of Object.entries(statusVariants)) {
        const result = DoorStatusSchema.safeParse(mockData);
        expect(result.success, `Variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('requires state field', () => {
      const invalid = { id: 'door-x', lockState: 'locked', relayPin: 17 };
      const result = DoorStatusSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('accepts status without optional fields', () => {
      const minimal = { id: 'door-m', state: 'closed', lockState: 'locked', relayPin: 17 };
      const result = DoorStatusSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('accepts status with lastCommand', () => {
      const withCommand = { id: 'door-c', state: 'error', lockState: 'error', relayPin: 17, lastCommand: 'close' };
      const result = DoorStatusSchema.safeParse(withCommand);
      expect(result.success).toBe(true);
    });
  });

  describe('DoorOpenRequestSchema', () => {
    it('validates complete request', () => {
      const result = DoorOpenRequestSchema.safeParse(validDoorOpenRequest);
      expect(result.success).toBe(true);
    });

    it('validates request with only duration', () => {
      const partial = { duration: 3000 };
      const result = DoorOpenRequestSchema.safeParse(partial);
      expect(result.success).toBe(true);
    });

    it('validates request with only testing_mode', () => {
      const partial = { testing_mode: true };
      const result = DoorOpenRequestSchema.safeParse(partial);
      expect(result.success).toBe(true);
    });

    it('validates empty request (all fields optional)', () => {
      const empty = {};
      const result = DoorOpenRequestSchema.safeParse(empty);
      expect(result.success).toBe(true);
    });

    it('rejects invalid duration type', () => {
      const invalid = { duration: '5000' };
      const result = DoorOpenRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid testing_mode type', () => {
      const invalid = { testing_mode: 'true' };
      const result = DoorOpenRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('DoorCommandResponseSchema', () => {
    it('validates success response', () => {
      const result = DoorCommandResponseSchema.safeParse(validDoorCommandResponse);
      expect(result.success).toBe(true);
    });

    it('validates all command variants match schema', () => {
      for (const [variantName, mockData] of Object.entries(commandVariants)) {
        const result = DoorCommandResponseSchema.safeParse(mockData);
        expect(result.success, `Variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('requires success field', () => {
      const invalid = { state: 'open', message: 'Done' };
      const result = DoorCommandResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates response with only success field', () => {
      const minimal = { success: true };
      const result = DoorCommandResponseSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });

  describe('DoorOperationSchema', () => {
    it('validates complete operation', () => {
      const result = DoorOperationSchema.safeParse(validDoorOperation);
      expect(result.success).toBe(true);
    });

    it('validates operation without optional fields', () => {
      const minimal = {
        timestamp: '2026-01-07T12:00:00Z',
        command: 'open',
        result: 'success',
      };
      const result = DoorOperationSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('requires timestamp field', () => {
      const invalid = { command: 'open', result: 'success' };
      const result = DoorOperationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires command field', () => {
      const invalid = { timestamp: '2026-01-07T12:00:00Z', result: 'success' };
      const result = DoorOperationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires result field', () => {
      const invalid = { timestamp: '2026-01-07T12:00:00Z', command: 'open' };
      const result = DoorOperationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('accepts various command values', () => {
      const commands = ['open', 'close', 'lock', 'unlock', 'test'];
      for (const command of commands) {
        const op = { timestamp: '2026-01-07T12:00:00Z', command, result: 'success' };
        const result = DoorOperationSchema.safeParse(op);
        expect(result.success, `Command "${command}" should be accepted`).toBe(true);
      }
    });

    it('accepts various result values', () => {
      const results = ['success', 'failure', 'timeout', 'error', 'pending'];
      for (const resultValue of results) {
        const op = { timestamp: '2026-01-07T12:00:00Z', command: 'open', result: resultValue };
        const result = DoorOperationSchema.safeParse(op);
        expect(result.success, `Result "${resultValue}" should be accepted`).toBe(true);
      }
    });
  });

  describe('Door operation history', () => {
    it('validates array of operations', () => {
      const history = [
        validDoorOperation,
        { timestamp: '2026-01-07T11:55:00Z', command: 'close', result: 'success' },
        { timestamp: '2026-01-07T11:50:00Z', command: 'open', result: 'success', duration_ms: 200 },
      ];

      for (const op of history) {
        const result = DoorOperationSchema.safeParse(op);
        expect(result.success).toBe(true);
      }
    });
  });
});
