/**
 * API Key Management Unit Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T047
 *
 * Tests for API key storage, retrieval, and authentication helpers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getApiKey,
  setApiKey,
  clearApiKey,
  hasApiKey,
  isAuthRequired,
  isDevelopment,
  getAuthHeaders,
  isValidApiKeyFormat,
  maskApiKey,
} from '@/infrastructure/api/auth';

// ============================================================================
// Test Setup
// ============================================================================

// Mock sessionStorage
function createSessionStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _resetMocks: function () {
      this.getItem.mockClear();
      this.setItem.mockClear();
      this.removeItem.mockClear();
      this.clear.mockClear();
      store = {};
    },
  };
}

const sessionStorageMock = createSessionStorageMock();

describe('API Key Management', () => {
  beforeEach(() => {
    // Reset sessionStorage mock completely
    sessionStorageMock._resetMocks();
    vi.stubGlobal('sessionStorage', sessionStorageMock);

    // Clear env variables to avoid pollution between tests
    vi.unstubAllEnvs();

    // Clear any in-memory key by calling clearApiKey
    clearApiKey();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // ============================================================================
  // getApiKey Tests
  // ============================================================================

  describe('getApiKey', () => {
    it('should return null when no key is set', () => {
      expect(getApiKey()).toBeNull();
    });

    it('should return in-memory key when set', () => {
      setApiKey('test-api-key-12345678');
      expect(getApiKey()).toBe('test-api-key-12345678');
    });

    it('should prioritize in-memory key over environment variable', () => {
      // Set env variable (mock)
      vi.stubEnv('VITE_API_KEY', 'env-api-key-123456');
      setApiKey('memory-api-key-123');

      // Should return in-memory key
      expect(getApiKey()).toBe('memory-api-key-123');
    });

    it('should return environment variable when no in-memory key', () => {
      vi.stubEnv('VITE_API_KEY', 'env-api-key-123456');

      expect(getApiKey()).toBe('env-api-key-123456');
    });

    it('should return sessionStorage key in dev mode', () => {
      vi.stubEnv('DEV', true);
      sessionStorageMock.setItem('delicasa-api-key', 'session-key-12345');

      expect(getApiKey()).toBe('session-key-12345');
    });

    it('should not return sessionStorage key in production mode', () => {
      vi.stubEnv('DEV', false);
      sessionStorageMock.setItem('delicasa-api-key', 'session-key-12345');

      expect(getApiKey()).toBeNull();
    });
  });

  // ============================================================================
  // setApiKey Tests
  // ============================================================================

  describe('setApiKey', () => {
    it('should set in-memory key', () => {
      setApiKey('new-api-key-12345678');
      expect(getApiKey()).toBe('new-api-key-12345678');
    });

    it('should persist to sessionStorage in dev mode', () => {
      vi.stubEnv('DEV', true);
      setApiKey('dev-api-key-12345678');

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'delicasa-api-key',
        'dev-api-key-12345678'
      );
    });

    it('should not persist to sessionStorage in production mode', () => {
      vi.stubEnv('DEV', false);
      setApiKey('prod-api-key-12345');

      expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should overwrite existing key', () => {
      setApiKey('first-key-12345678');
      setApiKey('second-key-87654321');

      expect(getApiKey()).toBe('second-key-87654321');
    });
  });

  // ============================================================================
  // clearApiKey Tests
  // ============================================================================

  describe('clearApiKey', () => {
    it('should clear in-memory key', () => {
      setApiKey('key-to-clear-12345');
      clearApiKey();

      expect(getApiKey()).toBeNull();
    });

    it('should remove from sessionStorage', () => {
      setApiKey('key-to-clear-12345');
      clearApiKey();

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('delicasa-api-key');
    });
  });

  // ============================================================================
  // hasApiKey Tests
  // ============================================================================

  describe('hasApiKey', () => {
    it('should return false when no key is configured', () => {
      expect(hasApiKey()).toBe(false);
    });

    it('should return true when key is set', () => {
      setApiKey('test-key-123456789');
      expect(hasApiKey()).toBe(true);
    });

    it('should return true when env key is set', () => {
      vi.stubEnv('VITE_API_KEY', 'env-key-12345678');
      expect(hasApiKey()).toBe(true);
    });
  });

  // ============================================================================
  // isAuthRequired Tests
  // ============================================================================

  describe('isAuthRequired', () => {
    it('should return true in production mode', () => {
      vi.stubEnv('DEV', false);
      expect(isAuthRequired()).toBe(true);
    });

    it('should return true in dev mode without bypass', () => {
      vi.stubEnv('DEV', true);
      vi.stubEnv('VITE_BYPASS_AUTH', undefined);
      expect(isAuthRequired()).toBe(true);
    });

    it('should return false in dev mode with bypass enabled', () => {
      vi.stubEnv('DEV', true);
      vi.stubEnv('VITE_BYPASS_AUTH', 'true');
      expect(isAuthRequired()).toBe(false);
    });

    it('should return true when bypass is not "true"', () => {
      vi.stubEnv('DEV', true);
      vi.stubEnv('VITE_BYPASS_AUTH', 'false');
      expect(isAuthRequired()).toBe(true);
    });
  });

  // ============================================================================
  // isDevelopment Tests
  // ============================================================================

  describe('isDevelopment', () => {
    it('should return true in dev mode', () => {
      vi.stubEnv('DEV', true);
      expect(isDevelopment()).toBe(true);
    });

    it('should return false in production mode', () => {
      vi.stubEnv('DEV', false);
      expect(isDevelopment()).toBe(false);
    });
  });

  // ============================================================================
  // getAuthHeaders Tests
  // ============================================================================

  describe('getAuthHeaders', () => {
    it('should include X-API-Key header when key is set', () => {
      setApiKey('header-test-key-123');
      const headers = getAuthHeaders();

      expect(headers).toEqual({ 'X-API-Key': 'header-test-key-123' });
    });

    it('should merge with existing headers', () => {
      setApiKey('merge-test-key-12345');
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-API-Key': 'merge-test-key-12345',
      });
    });

    it('should merge with Headers object', () => {
      setApiKey('headers-obj-key-123');
      const existingHeaders = new Headers();
      existingHeaders.set('Accept', 'application/json');

      const headers = getAuthHeaders(existingHeaders);

      expect(headers).toEqual({
        accept: 'application/json',
        'X-API-Key': 'headers-obj-key-123',
      });
    });

    it('should merge with array headers', () => {
      setApiKey('array-headers-key-1');
      const existingHeaders: [string, string][] = [['X-Custom', 'value']];

      const headers = getAuthHeaders(existingHeaders);

      expect(headers).toEqual({
        'X-Custom': 'value',
        'X-API-Key': 'array-headers-key-1',
      });
    });

    it('should throw when auth required but no key configured', () => {
      vi.stubEnv('DEV', false);

      expect(() => getAuthHeaders()).toThrow('API key required but not configured');
    });

    it('should not throw when auth bypassed in dev mode', () => {
      vi.stubEnv('DEV', true);
      vi.stubEnv('VITE_BYPASS_AUTH', 'true');

      expect(() => getAuthHeaders()).not.toThrow();
    });

    it('should return empty headers when no key and auth not required', () => {
      vi.stubEnv('DEV', true);
      vi.stubEnv('VITE_BYPASS_AUTH', 'true');

      const headers = getAuthHeaders();
      expect(headers).toEqual({});
    });
  });

  // ============================================================================
  // isValidApiKeyFormat Tests
  // ============================================================================

  describe('isValidApiKeyFormat', () => {
    it('should return true for valid API key', () => {
      expect(isValidApiKeyFormat('valid-api-key-123456')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidApiKeyFormat('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidApiKeyFormat(null as unknown as string)).toBe(false);
      expect(isValidApiKeyFormat(undefined as unknown as string)).toBe(false);
    });

    it('should return false for keys shorter than 8 characters', () => {
      expect(isValidApiKeyFormat('short')).toBe(false);
      expect(isValidApiKeyFormat('1234567')).toBe(false);
    });

    it('should return true for exactly 8 characters', () => {
      expect(isValidApiKeyFormat('12345678')).toBe(true);
    });

    it('should return false for keys longer than 256 characters', () => {
      const longKey = 'a'.repeat(257);
      expect(isValidApiKeyFormat(longKey)).toBe(false);
    });

    it('should return true for 256 character key', () => {
      const maxKey = 'a'.repeat(256);
      expect(isValidApiKeyFormat(maxKey)).toBe(true);
    });

    it('should handle whitespace-only strings', () => {
      expect(isValidApiKeyFormat('        ')).toBe(false);
      expect(isValidApiKeyFormat('   key  ')).toBe(false); // trimmed is "key" = 3 chars
    });
  });

  // ============================================================================
  // maskApiKey Tests
  // ============================================================================

  describe('maskApiKey', () => {
    it('should mask middle of API key', () => {
      expect(maskApiKey('abcd12345678efgh')).toBe('abcd****efgh');
    });

    it('should return **** for short keys', () => {
      expect(maskApiKey('short')).toBe('****');
      expect(maskApiKey('1234567')).toBe('****');
    });

    it('should return **** for empty string', () => {
      expect(maskApiKey('')).toBe('****');
    });

    it('should handle exactly 8 character keys', () => {
      expect(maskApiKey('12345678')).toBe('1234****5678');
    });

    it('should handle long keys', () => {
      const longKey = 'abcdefghijklmnopqrstuvwxyz';
      expect(maskApiKey(longKey)).toBe('abcd****wxyz');
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('API Key Edge Cases', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    clearApiKey();
    sessionStorageMock._resetMocks();
    vi.stubGlobal('sessionStorage', sessionStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('should handle sessionStorage being unavailable', () => {
    // Simulate sessionStorage throwing
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    });

    vi.stubEnv('DEV', true);

    // Should not throw, just return null
    expect(getApiKey()).toBeNull();

    // Should not throw when setting
    expect(() => setApiKey('test-key-12345678')).not.toThrow();

    // In-memory should still work
    expect(getApiKey()).toBe('test-key-12345678');

    // Clear should not throw
    expect(() => clearApiKey()).not.toThrow();
  });

  it('should handle rapid set/clear cycles', () => {
    for (let i = 0; i < 100; i++) {
      setApiKey(`key-${i}-padding-12345`);
      if (i % 2 === 0) {
        clearApiKey();
      }
    }

    // After odd iterations, key should be set
    expect(getApiKey()).toBe('key-99-padding-12345');
  });
});
