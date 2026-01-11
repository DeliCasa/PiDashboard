/**
 * V1 Client Error Handling Unit Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T049
 *
 * Tests for V1 API client error handling, envelope unwrapping,
 * and authentication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { z } from 'zod';
import {
  v1Get,
  v1Post,
  v1Put,
  v1Delete,
  v1Patch,
  buildV1Url,
  V1ApiError,
} from '@/infrastructure/api/v1-client';
import { setApiKey, clearApiKey } from '@/infrastructure/api/auth';

// ============================================================================
// MSW Server Setup
// ============================================================================

const server = setupServer();

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  clearApiKey();
  vi.unstubAllEnvs();
});

afterEach(() => {
  server.resetHandlers();
  server.close();
});

// ============================================================================
// Success Response Tests
// ============================================================================

describe('V1 Client - Success Responses', () => {
  it('should unwrap success response envelope', async () => {
    server.use(
      http.get('*/api/v1/test/endpoint', () => {
        return HttpResponse.json({
          success: true,
          data: { message: 'Hello World' },
          correlation_id: 'test-corr-123',
        });
      })
    );

    const result = await v1Get<{ message: string }>('/test/endpoint');

    expect(result.data).toEqual({ message: 'Hello World' });
    expect(result.correlationId).toBe('test-corr-123');
  });

  it('should include correlation ID in result', async () => {
    server.use(
      http.get('*/api/v1/test/correlation', () => {
        return HttpResponse.json({
          success: true,
          data: {},
          correlation_id: 'unique-request-id-456',
        });
      })
    );

    const result = await v1Get('/test/correlation');

    expect(result.correlationId).toBe('unique-request-id-456');
  });

  it('should handle empty data response', async () => {
    server.use(
      http.get('*/api/v1/test/empty', () => {
        return HttpResponse.json({
          success: true,
          data: null,
          correlation_id: 'empty-data-corr',
        });
      })
    );

    const result = await v1Get('/test/empty');

    expect(result.data).toBeNull();
  });

  it('should handle array data response', async () => {
    server.use(
      http.get('*/api/v1/test/array', () => {
        return HttpResponse.json({
          success: true,
          data: [1, 2, 3],
          correlation_id: 'array-corr',
        });
      })
    );

    const result = await v1Get<number[]>('/test/array');

    expect(result.data).toEqual([1, 2, 3]);
  });
});

// ============================================================================
// Error Response Tests
// ============================================================================

describe('V1 Client - Error Responses', () => {
  it('should throw V1ApiError for error envelope', async () => {
    server.use(
      http.get('*/api/v1/test/error', () => {
        return HttpResponse.json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found',
            retryable: false,
          },
          correlation_id: 'error-corr-123',
        });
      })
    );

    await expect(v1Get('/test/error')).rejects.toThrow(V1ApiError);
  });

  it('should preserve error code in V1ApiError', async () => {
    server.use(
      http.get('*/api/v1/test/error-code', () => {
        return HttpResponse.json({
          success: false,
          error: {
            code: 'DEVICE_TIMEOUT',
            message: 'Device timed out',
            retryable: true,
          },
          correlation_id: 'timeout-corr',
        });
      })
    );

    try {
      await v1Get('/test/error-code');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(V1ApiError.isV1ApiError(error)).toBe(true);
      if (V1ApiError.isV1ApiError(error)) {
        expect(error.code).toBe('DEVICE_TIMEOUT');
        expect(error.message).toBe('Device timed out');
        expect(error.retryable).toBe(true);
      }
    }
  });

  it('should include correlation ID in error', async () => {
    server.use(
      http.get('*/api/v1/test/error-corr', () => {
        return HttpResponse.json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal error',
            retryable: true,
          },
          correlation_id: 'internal-error-corr',
        });
      })
    );

    try {
      await v1Get('/test/error-corr');
      expect.fail('Should have thrown');
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) {
        expect(error.correlationId).toBe('internal-error-corr');
      }
    }
  });

  it('should include retry_after_seconds in error', async () => {
    server.use(
      http.get('*/api/v1/test/rate-limit', () => {
        return HttpResponse.json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests',
            retryable: true,
            retry_after_seconds: 30,
          },
          correlation_id: 'rate-limit-corr',
        });
      })
    );

    try {
      await v1Get('/test/rate-limit');
      expect.fail('Should have thrown');
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) {
        expect(error.retryAfterSeconds).toBe(30);
      }
    }
  });

  it('should translate network errors to V1ApiError', async () => {
    server.use(
      http.get('*/api/v1/test/network-fail', () => {
        return HttpResponse.error();
      })
    );

    try {
      await v1Get('/test/network-fail');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(V1ApiError.isV1ApiError(error)).toBe(true);
      if (V1ApiError.isV1ApiError(error)) {
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.retryable).toBe(true);
      }
    }
  });

  it('should translate 500 errors as retryable', async () => {
    server.use(
      http.get('*/api/v1/test/server-error', () => {
        return HttpResponse.json(
          { error: 'Server error' },
          { status: 500 }
        );
      })
    );

    try {
      await v1Get('/test/server-error');
      expect.fail('Should have thrown');
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) {
        expect(error.retryable).toBe(true);
      }
    }
  });

  it('should translate 400 errors as not retryable', async () => {
    server.use(
      http.get('*/api/v1/test/bad-request', () => {
        return HttpResponse.json(
          { error: 'Bad request' },
          { status: 400 }
        );
      })
    );

    try {
      await v1Get('/test/bad-request');
      expect.fail('Should have thrown');
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) {
        expect(error.retryable).toBe(false);
      }
    }
  });
});

// ============================================================================
// Authentication Tests
// ============================================================================

describe('V1 Client - Authentication', () => {
  it('should throw unauthorized error when auth required but no key', async () => {
    vi.stubEnv('DEV', false);

    await expect(
      v1Get('/test/protected', { requiresAuth: true })
    ).rejects.toThrow(V1ApiError);

    try {
      await v1Get('/test/protected', { requiresAuth: true });
    } catch (error) {
      if (V1ApiError.isV1ApiError(error)) {
        expect(error.code).toBe('UNAUTHORIZED');
      }
    }
  });

  it('should include API key header when provided', async () => {
    let capturedHeaders: Record<string, string> = {};

    server.use(
      http.get('*/api/v1/test/auth', ({ request }) => {
        capturedHeaders = Object.fromEntries(request.headers.entries());
        return HttpResponse.json({
          success: true,
          data: { authenticated: true },
          correlation_id: 'auth-corr',
        });
      })
    );

    setApiKey('test-api-key-12345678');
    await v1Get('/test/auth', { requiresAuth: true });

    expect(capturedHeaders['x-api-key']).toBe('test-api-key-12345678');
  });

  it('should not include API key header when not required', async () => {
    let capturedHeaders: Record<string, string> = {};

    server.use(
      http.get('*/api/v1/test/public', ({ request }) => {
        capturedHeaders = Object.fromEntries(request.headers.entries());
        return HttpResponse.json({
          success: true,
          data: {},
          correlation_id: 'public-corr',
        });
      })
    );

    setApiKey('test-api-key-12345678');
    await v1Get('/test/public', { requiresAuth: false });

    expect(capturedHeaders['x-api-key']).toBeUndefined();
  });

  it('should allow requests without auth when bypass enabled in dev', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_BYPASS_AUTH', 'true');

    server.use(
      http.get('*/api/v1/test/bypass', () => {
        return HttpResponse.json({
          success: true,
          data: { bypassed: true },
          correlation_id: 'bypass-corr',
        });
      })
    );

    // Should not throw even though no API key and auth required
    const result = await v1Get('/test/bypass', { requiresAuth: true });
    expect(result.data).toEqual({ bypassed: true });
  });
});

// ============================================================================
// HTTP Method Tests
// ============================================================================

describe('V1 Client - HTTP Methods', () => {
  it('should make POST request with body', async () => {
    let capturedBody: unknown;

    server.use(
      http.post('*/api/v1/test/post', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: { created: true },
          correlation_id: 'post-corr',
        });
      })
    );

    await v1Post('/test/post', { name: 'test-item' });

    expect(capturedBody).toEqual({ name: 'test-item' });
  });

  it('should make PUT request with body', async () => {
    let capturedBody: unknown;

    server.use(
      http.put('*/api/v1/test/put', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: { updated: true },
          correlation_id: 'put-corr',
        });
      })
    );

    await v1Put('/test/put', { id: 123, name: 'updated' });

    expect(capturedBody).toEqual({ id: 123, name: 'updated' });
  });

  it('should make DELETE request', async () => {
    let requestMade = false;

    server.use(
      http.delete('*/api/v1/test/delete', () => {
        requestMade = true;
        return HttpResponse.json({
          success: true,
          data: { deleted: true },
          correlation_id: 'delete-corr',
        });
      })
    );

    await v1Delete('/test/delete');

    expect(requestMade).toBe(true);
  });

  it('should make PATCH request with body', async () => {
    let capturedBody: unknown;

    server.use(
      http.patch('*/api/v1/test/patch', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: { patched: true },
          correlation_id: 'patch-corr',
        });
      })
    );

    await v1Patch('/test/patch', { field: 'newValue' });

    expect(capturedBody).toEqual({ field: 'newValue' });
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe('V1 Client - Schema Validation', () => {
  it('should log warning when schema validation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    server.use(
      http.get('*/api/v1/test/schema', () => {
        return HttpResponse.json({
          success: true,
          data: { wrong: 'shape' },
          correlation_id: 'schema-corr',
        });
      })
    );

    const schema = z.object({
      expected: z.string(),
    });

    // Should not throw, just warn
    await v1Get('/test/schema', { schema });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should pass validation when schema matches', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    server.use(
      http.get('*/api/v1/test/valid-schema', () => {
        return HttpResponse.json({
          success: true,
          data: { name: 'test', count: 42 },
          correlation_id: 'valid-corr',
          timestamp: new Date().toISOString(),
        });
      })
    );

    const schema = z.object({
      name: z.string(),
      count: z.number(),
    });

    await v1Get('/test/valid-schema', { schema });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// URL Builder Tests
// ============================================================================

describe('buildV1Url', () => {
  it('should return endpoint without params', () => {
    expect(buildV1Url('/test/endpoint')).toBe('/test/endpoint');
  });

  it('should add query params to endpoint', () => {
    const url = buildV1Url('/test/endpoint', { page: 1, limit: 10 });
    expect(url).toBe('/test/endpoint?page=1&limit=10');
  });

  it('should skip undefined params', () => {
    const url = buildV1Url('/test/endpoint', {
      page: 1,
      filter: undefined,
    });
    expect(url).toBe('/test/endpoint?page=1');
  });

  it('should handle boolean params', () => {
    const url = buildV1Url('/test/endpoint', { active: true, deleted: false });
    expect(url).toBe('/test/endpoint?active=true&deleted=false');
  });

  it('should return endpoint when params are empty', () => {
    const url = buildV1Url('/test/endpoint', {});
    expect(url).toBe('/test/endpoint');
  });

  it('should handle only undefined params', () => {
    const url = buildV1Url('/test/endpoint', {
      a: undefined,
      b: undefined,
    });
    expect(url).toBe('/test/endpoint');
  });
});

// ============================================================================
// Custom Headers Tests
// ============================================================================

describe('V1 Client - Custom Headers', () => {
  it('should include custom headers in request', async () => {
    let capturedHeaders: Record<string, string> = {};

    server.use(
      http.get('*/api/v1/test/headers', ({ request }) => {
        capturedHeaders = Object.fromEntries(request.headers.entries());
        return HttpResponse.json({
          success: true,
          data: {},
          correlation_id: 'headers-corr',
        });
      })
    );

    await v1Get('/test/headers', {
      headers: {
        'X-Custom-Header': 'custom-value',
        'X-Another-Header': 'another-value',
      },
    });

    expect(capturedHeaders['x-custom-header']).toBe('custom-value');
    expect(capturedHeaders['x-another-header']).toBe('another-value');
  });

  it('should merge custom headers with auth header', async () => {
    let capturedHeaders: Record<string, string> = {};

    server.use(
      http.get('*/api/v1/test/merge-headers', ({ request }) => {
        capturedHeaders = Object.fromEntries(request.headers.entries());
        return HttpResponse.json({
          success: true,
          data: {},
          correlation_id: 'merge-corr',
        });
      })
    );

    setApiKey('merge-test-api-key-1');
    await v1Get('/test/merge-headers', {
      requiresAuth: true,
      headers: {
        'X-Custom': 'value',
      },
    });

    expect(capturedHeaders['x-api-key']).toBe('merge-test-api-key-1');
    expect(capturedHeaders['x-custom']).toBe('value');
  });
});

// ============================================================================
// V1ApiError Tests
// ============================================================================

describe('V1ApiError', () => {
  it('should provide user-friendly message', () => {
    const error = new V1ApiError(
      'DEVICE_UNREACHABLE',
      'Technical error message',
      false
    );

    expect(error.userMessage).toBe(
      'Cannot connect to the device. Check that it is powered on and in range.'
    );
  });

  it('should identify auth errors', () => {
    const authError = new V1ApiError('UNAUTHORIZED', 'Not authorized', false);
    const otherError = new V1ApiError('DEVICE_NOT_FOUND', 'Not found', false);

    expect(authError.isAuthError()).toBe(true);
    expect(otherError.isAuthError()).toBe(false);
  });

  it('should identify rate limit errors', () => {
    const rateError = new V1ApiError('RATE_LIMITED', 'Too many requests', true, 60);
    const otherError = new V1ApiError('NETWORK_ERROR', 'Network failed', true);

    expect(rateError.isRateLimited()).toBe(true);
    expect(otherError.isRateLimited()).toBe(false);
  });

  it('should identify session errors', () => {
    const sessionError = new V1ApiError('SESSION_EXPIRED', 'Session expired', false);
    const otherError = new V1ApiError('DEVICE_TIMEOUT', 'Timeout', true);

    expect(sessionError.isSessionError()).toBe(true);
    expect(otherError.isSessionError()).toBe(false);
  });

  it('should identify device errors', () => {
    const deviceError = new V1ApiError('DEVICE_NOT_FOUND', 'Not found', false);
    const otherError = new V1ApiError('UNAUTHORIZED', 'Unauthorized', false);

    expect(deviceError.isDeviceError()).toBe(true);
    expect(otherError.isDeviceError()).toBe(false);
  });

  it('should convert to log object', () => {
    const error = new V1ApiError(
      'SESSION_NOT_FOUND',
      'Session not found',
      false,
      undefined,
      'log-corr-123'
    );

    const logObj = error.toLogObject();

    expect(logObj).toEqual({
      name: 'V1ApiError',
      code: 'SESSION_NOT_FOUND',
      message: 'Session not found',
      retryable: false,
      retryAfterSeconds: undefined,
      correlationId: 'log-corr-123',
    });
  });

  it('should create from V1Error response', () => {
    const v1Error = {
      code: 'CIRCUIT_OPEN' as const,
      message: 'Circuit breaker open',
      retryable: true,
      retry_after_seconds: 15,
      details: 'Service unavailable',
    };

    const error = V1ApiError.fromV1Error(v1Error, 'from-error-corr');

    expect(error.code).toBe('CIRCUIT_OPEN');
    expect(error.message).toBe('Circuit breaker open');
    expect(error.retryable).toBe(true);
    expect(error.retryAfterSeconds).toBe(15);
    expect(error.correlationId).toBe('from-error-corr');
    expect(error.details).toBe('Service unavailable');
  });
});
