/**
 * V1 API Client Wrapper
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Provides a wrapper around the base API client for V1 endpoints.
 * Handles response envelope unwrapping, authentication, and error translation.
 */

import type {
  V1Response,
  V1SuccessResponse,
  V1Result,
} from '@/domain/types/v1-api';
import { apiClient, type ApiError } from './client';
import { getApiKey, isAuthRequired } from './auth';
import { V1ApiError } from './errors';
import {
  createV1ResponseSchema,
  safeParseWithErrors,
} from './schemas';
import type { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for V1 API requests.
 */
export interface V1RequestOptions {
  /** HTTP method (default: GET) */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Request body (for POST/PUT/PATCH) */
  body?: unknown;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Whether this endpoint requires authentication */
  requiresAuth?: boolean;
  /** Optional Zod schema for response validation */
  schema?: z.ZodTypeAny;
  /** Additional headers */
  headers?: Record<string, string>;
}

// ============================================================================
// V1 API Client
// ============================================================================

/**
 * Make a V1 API request.
 *
 * This wrapper:
 * 1. Adds /v1 prefix to the endpoint
 * 2. Handles API key authentication for protected endpoints
 * 3. Unwraps V1 response envelopes
 * 4. Translates errors to V1ApiError
 * 5. Logs correlation IDs for debugging
 *
 * @param endpoint - API endpoint (e.g., '/provisioning/batch/start')
 * @param options - Request options
 * @returns Promise with data and correlation ID
 * @throws V1ApiError for API errors
 */
export async function v1Request<T>(
  endpoint: string,
  options: V1RequestOptions = {}
): Promise<V1Result<T>> {
  const {
    method = 'GET',
    body,
    timeout,
    retries,
    requiresAuth = false,
    schema,
    headers: customHeaders = {},
  } = options;

  // Build headers
  const headers: Record<string, string> = {
    ...customHeaders,
  };

  // Add auth header if required
  if (requiresAuth) {
    const apiKey = getApiKey();
    if (!apiKey && isAuthRequired()) {
      throw new V1ApiError(
        'UNAUTHORIZED',
        'API key required for this endpoint',
        false,
        undefined,
        undefined
      );
    }
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
  }

  // Build full endpoint with /v1 prefix
  const fullEndpoint = `/v1${endpoint}`;

  try {
    // Make the request
    let response: V1Response<T>;

    switch (method) {
      case 'POST':
        response = await apiClient.post<V1Response<T>>(fullEndpoint, body, {
          timeout,
          retries,
          headers,
        });
        break;
      case 'PUT':
        response = await apiClient.put<V1Response<T>>(fullEndpoint, body, {
          timeout,
          retries,
          headers,
        });
        break;
      case 'DELETE':
        response = await apiClient.delete<V1Response<T>>(fullEndpoint, {
          timeout,
          retries,
          headers,
        });
        break;
      case 'PATCH':
        response = await apiClient.patch<V1Response<T>>(fullEndpoint, body, {
          timeout,
          retries,
          headers,
        });
        break;
      default:
        response = await apiClient.get<V1Response<T>>(fullEndpoint, {
          timeout,
          retries,
          headers,
        });
    }

    // Handle error envelope
    if (!response.success) {
      throw V1ApiError.fromV1Error(response.error, response.correlation_id);
    }

    // Validate response if schema provided
    if (schema) {
      const successSchema = createV1ResponseSchema(schema);
      const validation = safeParseWithErrors(successSchema, response);
      if (!validation.success) {
        console.warn(
          `[API Contract] ${endpoint} validation failed:`,
          validation.errors
        );
      }
    }

    // Log correlation ID for debugging
    if (import.meta.env.DEV) {
      console.debug(
        `[V1 API] ${method} ${endpoint} correlation_id=${response.correlation_id}`
      );
    }

    // Return unwrapped data with correlation ID
    return {
      data: response.data,
      correlationId: response.correlation_id,
    };
  } catch (error) {
    // Re-throw V1ApiError as-is
    if (V1ApiError.isV1ApiError(error)) {
      throw error;
    }

    // Translate ApiError to V1ApiError
    if (error instanceof Error && 'status' in error) {
      const apiError = error as ApiError;
      throw new V1ApiError(
        apiError.code || 'NETWORK_ERROR',
        apiError.message,
        apiError.status >= 500, // 5xx are retryable
        undefined,
        undefined
      );
    }

    // Translate other errors
    throw new V1ApiError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      true,
      undefined,
      undefined
    );
  }
}

// ============================================================================
// Convenience Methods
// ============================================================================

/**
 * Make a GET request to a V1 endpoint.
 */
export function v1Get<T>(
  endpoint: string,
  options?: Omit<V1RequestOptions, 'method' | 'body'>
): Promise<V1Result<T>> {
  return v1Request<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Make a POST request to a V1 endpoint.
 */
export function v1Post<T>(
  endpoint: string,
  body?: unknown,
  options?: Omit<V1RequestOptions, 'method'>
): Promise<V1Result<T>> {
  return v1Request<T>(endpoint, { ...options, method: 'POST', body });
}

/**
 * Make a PUT request to a V1 endpoint.
 */
export function v1Put<T>(
  endpoint: string,
  body: unknown,
  options?: Omit<V1RequestOptions, 'method'>
): Promise<V1Result<T>> {
  return v1Request<T>(endpoint, { ...options, method: 'PUT', body });
}

/**
 * Make a DELETE request to a V1 endpoint.
 */
export function v1Delete<T>(
  endpoint: string,
  options?: Omit<V1RequestOptions, 'method' | 'body'>
): Promise<V1Result<T>> {
  return v1Request<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Make a PATCH request to a V1 endpoint.
 */
export function v1Patch<T>(
  endpoint: string,
  body: unknown,
  options?: Omit<V1RequestOptions, 'method'>
): Promise<V1Result<T>> {
  return v1Request<T>(endpoint, { ...options, method: 'PATCH', body });
}

// ============================================================================
// URL Helpers
// ============================================================================

/**
 * Build a V1 endpoint URL with query parameters.
 *
 * @param endpoint - Base endpoint (e.g., '/provisioning/batch/123')
 * @param params - Query parameters
 * @returns Full endpoint with query string
 */
export function buildV1Url(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return endpoint;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
}

// ============================================================================
// Re-exports
// ============================================================================

export { V1ApiError } from './errors';
export type { V1Result, V1Response, V1SuccessResponse };
