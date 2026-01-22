/**
 * Unit tests for API Error classes
 * Feature: 030-dashboard-recovery
 * Tasks: T005a, T009a
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  HTMLFallbackError,
  createDebugInfo,
  formatDebugInfoForClipboard,
} from '@/infrastructure/api/errors';

describe('HTMLFallbackError (T005a)', () => {
  it('should create an HTMLFallbackError with all properties', () => {
    const error = new HTMLFallbackError(
      '/api/devices',
      'application/json',
      'text/html; charset=utf-8'
    );

    expect(error.name).toBe('HTMLFallbackError');
    expect(error.endpoint).toBe('/api/devices');
    expect(error.expectedContentType).toBe('application/json');
    expect(error.actualContentType).toBe('text/html; charset=utf-8');
    expect(error.hint).toBe('API route hitting SPA fallback - endpoint may not be registered');
    expect(error.message).toBe('Expected JSON but received HTML from /api/devices');
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should have a default expectedContentType of application/json', () => {
    const error = new HTMLFallbackError(
      '/api/test',
      undefined,
      'text/html'
    );

    expect(error.expectedContentType).toBe('application/json');
  });

  it('should provide a user-friendly message via userMessage getter', () => {
    const error = new HTMLFallbackError(
      '/api/wifi/status',
      'application/json',
      'text/html'
    );

    expect(error.userMessage).toContain('/api/wifi/status');
    expect(error.userMessage).toContain('HTML page');
    expect(error.userMessage).toContain('endpoint is not properly registered');
  });

  describe('isHTMLFallbackError type guard', () => {
    it('should return true for HTMLFallbackError instances', () => {
      const error = new HTMLFallbackError('/api/test', 'application/json', 'text/html');
      expect(HTMLFallbackError.isHTMLFallbackError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Some error');
      expect(HTMLFallbackError.isHTMLFallbackError(error)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(HTMLFallbackError.isHTMLFallbackError(null)).toBe(false);
      expect(HTMLFallbackError.isHTMLFallbackError(undefined)).toBe(false);
    });

    it('should return false for plain objects', () => {
      const fakeError = {
        name: 'HTMLFallbackError',
        endpoint: '/api/test',
      };
      expect(HTMLFallbackError.isHTMLFallbackError(fakeError)).toBe(false);
    });
  });
});

describe('createDebugInfo (T009a)', () => {
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-12T10:00:00.000Z'));

    // Mock navigator and window
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Test Browser/1.0' },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: { location: { origin: 'http://localhost:5173' } },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
    });
  });

  it('should create debug info with all fields', () => {
    const debugInfo = createDebugInfo({
      endpoint: '/api/devices',
      status: 404,
      code: 'NOT_FOUND',
      requestId: 'req-123-abc',
      timestamp: new Date('2026-01-12T09:30:00.000Z'),
    });

    expect(debugInfo).toEqual({
      endpoint: '/api/devices',
      status: 404,
      code: 'NOT_FOUND',
      requestId: 'req-123-abc',
      timestamp: '2026-01-12T09:30:00.000Z',
      userAgent: 'Test Browser/1.0',
      origin: 'http://localhost:5173',
    });
  });

  it('should use current timestamp if not provided', () => {
    const debugInfo = createDebugInfo({
      endpoint: '/api/test',
    });

    expect(debugInfo.timestamp).toBe('2026-01-12T10:00:00.000Z');
  });

  it('should handle undefined optional fields', () => {
    const debugInfo = createDebugInfo({
      endpoint: '/api/test',
    });

    expect(debugInfo.endpoint).toBe('/api/test');
    expect(debugInfo.status).toBeUndefined();
    expect(debugInfo.code).toBeUndefined();
    expect(debugInfo.requestId).toBeUndefined();
  });
});

describe('formatDebugInfoForClipboard', () => {
  it('should format debug info as pretty-printed JSON', () => {
    const debugInfo = {
      endpoint: '/api/devices',
      status: 500,
      code: 'INTERNAL_ERROR',
      requestId: 'req-456',
      timestamp: '2026-01-12T10:00:00.000Z',
      userAgent: 'Chrome/120',
      origin: 'http://localhost:5173',
    };

    const formatted = formatDebugInfoForClipboard(debugInfo);

    // Should be valid JSON
    const parsed = JSON.parse(formatted);
    expect(parsed).toEqual(debugInfo);

    // Should be pretty-printed (contains newlines)
    expect(formatted).toContain('\n');
    expect(formatted).toContain('  '); // Indentation
  });

  it('should handle minimal debug info', () => {
    const debugInfo = {
      endpoint: '/api/test',
      timestamp: '2026-01-12T10:00:00.000Z',
      userAgent: 'unknown',
      origin: 'unknown',
    };

    const formatted = formatDebugInfoForClipboard(debugInfo);
    const parsed = JSON.parse(formatted);
    expect(parsed.endpoint).toBe('/api/test');
  });
});
