/**
 * Unit Tests for Data Normalization Utilities
 * Feature: 028-api-compat
 */

import { describe, it, expect } from 'vitest';
import {
  ensureArray,
  ensureObject,
  extractList,
  extractData,
  normalizeListResponse,
  isNonEmptyArray,
} from '../../../src/lib/normalize';

describe('ensureArray', () => {
  it('returns the input array unchanged', () => {
    const input = [1, 2, 3];
    expect(ensureArray(input)).toEqual([1, 2, 3]);
    expect(ensureArray(input)).toBe(input); // Same reference
  });

  it('returns empty array for null', () => {
    expect(ensureArray(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(ensureArray(undefined)).toEqual([]);
  });

  it('returns empty array for non-array objects', () => {
    expect(ensureArray({ key: 'value' })).toEqual([]);
    expect(ensureArray({})).toEqual([]);
  });

  it('returns empty array for primitives', () => {
    expect(ensureArray('string')).toEqual([]);
    expect(ensureArray(123)).toEqual([]);
    expect(ensureArray(true)).toEqual([]);
  });

  it('returns empty array when empty array is passed', () => {
    expect(ensureArray([])).toEqual([]);
  });

  it('handles arrays of objects', () => {
    const input = [{ id: 1 }, { id: 2 }];
    expect(ensureArray(input)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('preserves type inference', () => {
    interface Device {
      mac: string;
      name: string;
    }
    const devices: Device[] = [{ mac: 'AA:BB:CC', name: 'Test' }];
    const result = ensureArray<Device>(devices);
    expect(result[0].mac).toBe('AA:BB:CC');
  });
});

describe('ensureObject', () => {
  it('returns the input object unchanged', () => {
    const input = { key: 'value' };
    expect(ensureObject(input)).toEqual({ key: 'value' });
    expect(ensureObject(input)).toBe(input); // Same reference
  });

  it('returns null for null', () => {
    expect(ensureObject(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(ensureObject(undefined)).toBeNull();
  });

  it('returns null for arrays', () => {
    expect(ensureObject([1, 2, 3])).toBeNull();
    expect(ensureObject([])).toBeNull();
  });

  it('returns null for primitives', () => {
    expect(ensureObject('string')).toBeNull();
    expect(ensureObject(123)).toBeNull();
    expect(ensureObject(true)).toBeNull();
  });

  it('returns empty object for empty object', () => {
    expect(ensureObject({})).toEqual({});
  });

  it('handles nested objects', () => {
    const input = { outer: { inner: 'value' } };
    expect(ensureObject(input)).toEqual({ outer: { inner: 'value' } });
  });
});

describe('extractList', () => {
  it('extracts entries array', () => {
    const response = { entries: [1, 2, 3], count: 3 };
    expect(extractList(response)).toEqual([1, 2, 3]);
  });

  it('extracts devices array', () => {
    const response = { devices: [{ mac: 'AA' }], count: 1 };
    expect(extractList(response)).toEqual([{ mac: 'AA' }]);
  });

  it('extracts sessions array', () => {
    const response = { sessions: [{ id: '1' }] };
    expect(extractList(response)).toEqual([{ id: '1' }]);
  });

  it('returns empty array for null response', () => {
    expect(extractList(null)).toEqual([]);
  });

  it('returns empty array for undefined response', () => {
    expect(extractList(undefined)).toEqual([]);
  });

  it('returns empty array when no recognized field found', () => {
    const response = { unknown: [1, 2, 3] };
    expect(extractList(response)).toEqual([]);
  });

  it('respects custom field priority', () => {
    const response = { custom: [1, 2, 3], entries: [4, 5] };
    expect(extractList(response, ['custom'])).toEqual([1, 2, 3]);
  });

  it('falls back through priority list', () => {
    const response = { items: [1, 2, 3] };
    expect(extractList(response)).toEqual([1, 2, 3]);
  });

  it('returns empty array for null field value', () => {
    const response = { entries: null };
    expect(extractList(response)).toEqual([]);
  });

  it('returns empty array for non-array field value', () => {
    const response = { entries: 'not an array' };
    expect(extractList(response)).toEqual([]);
  });
});

describe('extractData', () => {
  it('extracts nested data object', () => {
    const response = { data: { entries: [] } };
    expect(extractData(response)).toEqual({ entries: [] });
  });

  it('extracts with custom path', () => {
    const response = { result: { items: [] } };
    expect(extractData(response, 'result')).toEqual({ items: [] });
  });

  it('extracts with dot-separated path', () => {
    const response = { outer: { inner: { value: 42 } } };
    expect(extractData(response, 'outer.inner')).toEqual({ value: 42 });
  });

  it('returns null for null response', () => {
    expect(extractData(null)).toBeNull();
  });

  it('returns null for undefined response', () => {
    expect(extractData(undefined)).toBeNull();
  });

  it('returns null for missing path', () => {
    const response = { other: 'data' };
    expect(extractData(response, 'data')).toBeNull();
  });

  it('returns null for partial path match', () => {
    const response = { outer: null };
    expect(extractData(response, 'outer.inner')).toBeNull();
  });
});

describe('normalizeListResponse', () => {
  it('normalizes response with array field', () => {
    const response = { entries: [1, 2], count: 2 };
    const result = normalizeListResponse(response, 'entries');
    expect(result.entries).toEqual([1, 2]);
    expect(result.count).toBe(2);
  });

  it('normalizes response with null field to empty array', () => {
    const response = { entries: null as unknown as number[], count: 0 };
    const result = normalizeListResponse(response, 'entries');
    expect(result.entries).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('normalizes response with undefined field to empty array', () => {
    const response = { entries: undefined as unknown as number[], count: 0 };
    const result = normalizeListResponse(response, 'entries');
    expect(result.entries).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('returns object with empty array for null response', () => {
    const result = normalizeListResponse(null, 'entries');
    expect(result.entries).toEqual([]);
  });

  it('returns object with empty array for undefined response', () => {
    const result = normalizeListResponse(undefined, 'entries');
    expect(result.entries).toEqual([]);
  });

  it('preserves other fields in response', () => {
    const response = {
      entries: [{ id: 1 }],
      count: 1,
      timestamp: '2026-01-11',
    };
    const result = normalizeListResponse(response, 'entries');
    expect(result.timestamp).toBe('2026-01-11');
    expect(result.count).toBe(1);
  });
});

describe('isNonEmptyArray', () => {
  it('returns true for non-empty array', () => {
    expect(isNonEmptyArray([1, 2, 3])).toBe(true);
    expect(isNonEmptyArray([{ id: 1 }])).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(isNonEmptyArray([])).toBe(false);
  });

  it('returns false for null', () => {
    expect(isNonEmptyArray(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isNonEmptyArray(undefined)).toBe(false);
  });

  it('returns false for non-array values', () => {
    expect(isNonEmptyArray('string')).toBe(false);
    expect(isNonEmptyArray(123)).toBe(false);
    expect(isNonEmptyArray({ key: 'value' })).toBe(false);
  });

  it('works as type guard', () => {
    const maybeArray: number[] | null = [1, 2, 3];
    if (isNonEmptyArray(maybeArray)) {
      // Type should be narrowed to number[]
      expect(maybeArray.length).toBe(3);
    }
  });
});

describe('Real-world API response scenarios', () => {
  describe('Allowlist endpoint', () => {
    it('handles empty allowlist (028 fix)', () => {
      // Before fix: { entries: null }
      // After fix: { entries: [] }
      const response = { entries: [], count: 0 };
      const entries = ensureArray(response.entries);
      expect(entries.filter((e) => e)).toEqual([]);
    });

    it('handles populated allowlist', () => {
      const response = {
        entries: [
          { mac: 'AA:BB:CC:DD:EE:FF', description: 'Camera 1' },
          { mac: '11:22:33:44:55:66', description: 'Camera 2' },
        ],
        count: 2,
      };
      const entries = ensureArray(response.entries);
      expect(entries.length).toBe(2);
      expect(entries.map((e) => e.mac)).toEqual([
        'AA:BB:CC:DD:EE:FF',
        '11:22:33:44:55:66',
      ]);
    });

    it('handles legacy null response defensively', () => {
      // Defensive check in case backend hasn't been updated
      const response = { entries: null, count: 0 };
      const entries = ensureArray(response.entries);
      expect(entries.filter((e) => e)).toEqual([]);
    });
  });

  describe('Devices endpoint', () => {
    it('handles empty session devices (028 fix)', () => {
      const response = { devices: [], count: 0 };
      const devices = ensureArray(response.devices);
      expect(devices.length).toBe(0);
    });

    it('handles devices with state transitions', () => {
      const response = {
        devices: [
          { mac: 'AA', state: 'discovered' },
          { mac: 'BB', state: 'provisioning' },
          { mac: 'CC', state: 'verified' },
        ],
      };
      const devices = ensureArray(response.devices);
      const verified = devices.filter((d) => d.state === 'verified');
      expect(verified.length).toBe(1);
    });
  });

  describe('Sessions endpoint', () => {
    it('handles no recoverable sessions', () => {
      const response = { sessions: [] };
      const sessions = ensureArray(response.sessions);
      expect(sessions.length).toBe(0);
    });

    it('handles multiple recoverable sessions', () => {
      const response = {
        sessions: [
          { id: 'session-1', state: 'active' },
          { id: 'session-2', state: 'paused' },
        ],
      };
      const sessions = ensureArray(response.sessions);
      expect(sessions.length).toBe(2);
    });
  });
});
