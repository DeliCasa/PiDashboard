/**
 * Base API Client with fetch wrapper
 * Implements error handling, timeout, and retry logic
 * Enhanced: 030-dashboard-recovery (endpoint tracking, HTML detection, Accept header)
 */

import type { ApiErrorResponse } from '@/domain/types/api';
import { HTMLFallbackError } from './errors';

const BASE_URL = '/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds per NFR-2

/**
 * Get the base URL for API calls.
 * Used for SSE connections which need absolute URLs.
 * In production, returns empty string (same-origin).
 * In development with proxy, returns empty string.
 */
export function getApiBaseUrl(): string {
  // Use same-origin for both production and development
  // Vite proxy handles /api/* in dev, same-origin in production
  return '';
}
const MAX_RETRIES = 3; // per NFR-2
const RETRY_DELAY_MS = 1000;

/**
 * Custom API Error class with HTTP status code
 * Enhanced with endpoint, requestId, and timestamp for debugging (030-dashboard-recovery)
 */
export class ApiError extends Error {
  /** Timestamp when the error occurred */
  public readonly timestamp: Date;

  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: Record<string, unknown>,
    /** The API endpoint that failed (030-dashboard-recovery) */
    public endpoint?: string,
    /** Request correlation ID from X-Request-Id header (030-dashboard-recovery) */
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.timestamp = new Date();
  }

  static fromResponse(
    status: number,
    body: ApiErrorResponse,
    endpoint?: string,
    requestId?: string
  ): ApiError {
    return new ApiError(status, body.error, body.code, body.details, endpoint, requestId);
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}

/**
 * Network error for connection failures
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Timeout error for requests exceeding timeout
 */
export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  timeout?: number;
  retries?: number;
  body?: unknown;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a content-type header indicates HTML content.
 * Used to detect SPA fallback responses (030-dashboard-recovery).
 */
function isHtmlContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.includes('text/html');
}

/**
 * Core request function with timeout and error handling
 * Enhanced with HTML fallback detection and request ID extraction (030-dashboard-recovery)
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    body,
    ...fetchOptions
  } = options;

  const url = `${BASE_URL}${endpoint}`;

  // Setup timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const fetchConfig: RequestInit = {
    ...fetchOptions,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json', // 030-dashboard-recovery: Explicitly request JSON
      ...fetchOptions.headers,
    },
  };

  if (body !== undefined) {
    fetchConfig.body = JSON.stringify(body);
  }

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < retries) {
    attempt++;

    try {
      const response = await fetch(url, fetchConfig);
      clearTimeout(timeoutId);

      // Extract request ID from response headers (030-dashboard-recovery)
      const requestId = response.headers.get('X-Request-Id') ?? undefined;
      const contentType = response.headers.get('content-type');

      // 030-dashboard-recovery: Detect HTML fallback (SPA catch-all)
      // If we received HTML when we expected JSON, throw a specific error
      if (isHtmlContentType(contentType)) {
        throw new HTMLFallbackError(
          endpoint,
          'application/json',
          contentType ?? 'text/html'
        );
      }

      // Handle non-OK responses
      if (!response.ok) {
        let errorBody: ApiErrorResponse = { error: 'Request failed' };
        try {
          errorBody = await response.json();
        } catch {
          // Use default error
        }
        // 030-dashboard-recovery: Include endpoint and requestId in error
        throw ApiError.fromResponse(response.status, errorBody, endpoint, requestId);
      }

      // Handle empty responses (204 No Content, etc.)
      if (!contentType || !contentType.includes('application/json')) {
        return undefined as T;
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(timeout);
      }

      // 030-dashboard-recovery: Don't retry on HTML fallback errors
      if (error instanceof HTMLFallbackError) {
        throw error;
      }

      // Don't retry on client errors (4xx) or ApiErrors
      if (error instanceof ApiError && error.status < 500) {
        throw error;
      }

      // Network errors and 5xx should retry
      lastError = error as Error;

      // Wait before retry with exponential backoff
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }
  }

  // All retries exhausted
  if (lastError instanceof ApiError || lastError instanceof TimeoutError) {
    throw lastError;
  }

  throw new NetworkError(lastError?.message || 'Network request failed');
}

/**
 * API client with convenience methods for HTTP verbs
 */
export const apiClient = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  /**
   * POST request
   */
  post: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(endpoint, { ...options, method: 'POST', body: data }),

  /**
   * PUT request
   */
  put: <T>(endpoint: string, data: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(endpoint, { ...options, method: 'PUT', body: data }),

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, data: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body: data }),
};

/**
 * Build URL with query parameters
 */
export function buildUrl(
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
