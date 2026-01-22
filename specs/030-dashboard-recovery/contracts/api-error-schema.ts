/**
 * API Error Schema Contracts
 * Feature: 030-dashboard-recovery
 *
 * Defines the expected structure of API errors for validation and type safety.
 */

import { z } from 'zod';

// ============================================================================
// Enhanced API Error Schema
// ============================================================================

/**
 * Schema for the enhanced API error with debugging information.
 */
export const EnhancedApiErrorSchema = z.object({
  status: z.number().int().min(100).max(599),
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  endpoint: z.string().startsWith('/'),
  requestId: z.string().optional(),
  contentType: z.string().optional(),
  timestamp: z.coerce.date(),
});

export type EnhancedApiError = z.infer<typeof EnhancedApiErrorSchema>;

// ============================================================================
// HTML Fallback Error Schema
// ============================================================================

/**
 * Schema for HTML fallback errors (when API returns HTML instead of JSON).
 */
export const HTMLFallbackErrorSchema = z.object({
  type: z.literal('HTML_FALLBACK'),
  endpoint: z.string().startsWith('/'),
  expectedContentType: z.literal('application/json'),
  actualContentType: z.string(),
  hint: z.string().default('API route hitting SPA fallback - endpoint may not be registered'),
  timestamp: z.coerce.date(),
});

export type HTMLFallbackError = z.infer<typeof HTMLFallbackErrorSchema>;

// ============================================================================
// Debug Info Schema
// ============================================================================

/**
 * Schema for copyable debug information.
 * Note: requestId comes from X-Request-Id response header
 */
export const DebugInfoSchema = z.object({
  endpoint: z.string(),
  status: z.number().optional(),
  code: z.string().optional(),
  requestId: z.string().optional(),
  timestamp: z.string().datetime(),
  userAgent: z.string(),
  origin: z.string().url(),
});

export type DebugInfo = z.infer<typeof DebugInfoSchema>;

// ============================================================================
// Connection State Schema
// ============================================================================

/**
 * Schema for connection state values.
 */
export const ConnectionStateSchema = z.enum([
  'connected',
  'error',
  'reconnecting',
  'disconnected',
]);

export type ConnectionState = z.infer<typeof ConnectionStateSchema>;

// ============================================================================
// Device List State Schema
// ============================================================================

/**
 * Schema for device list UI state.
 */
export const DeviceListStateSchema = z.enum([
  'loading',
  'empty',
  'populated',
  'error',
]);

export type DeviceListState = z.infer<typeof DeviceListStateSchema>;

// ============================================================================
// API Response Validation Helpers
// ============================================================================

/**
 * Validates that a response has the expected content-type.
 * @param contentType - The content-type header value
 * @param expected - Expected content-type (default: 'application/json')
 * @returns true if content-type matches
 */
export function isValidContentType(
  contentType: string | null,
  expected = 'application/json'
): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes(expected.toLowerCase());
}

/**
 * Detects if a response is an HTML fallback (SPA catch-all).
 * @param contentType - The content-type header value
 * @param body - The response body (optional, for additional detection)
 * @returns true if this looks like an HTML fallback
 */
export function isHTMLFallback(
  contentType: string | null,
  body?: string
): boolean {
  // Check content-type
  if (contentType && contentType.toLowerCase().includes('text/html')) {
    return true;
  }

  // Check body for HTML markers if provided
  if (body) {
    const trimmed = body.trim().toLowerCase();
    return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
  }

  return false;
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Creates an enhanced API error object.
 */
export function createEnhancedApiError(params: {
  status: number;
  message: string;
  endpoint: string;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
  contentType?: string;
}): EnhancedApiError {
  return EnhancedApiErrorSchema.parse({
    ...params,
    timestamp: new Date(),
  });
}

/**
 * Creates an HTML fallback error object.
 */
export function createHTMLFallbackError(params: {
  endpoint: string;
  actualContentType: string;
}): HTMLFallbackError {
  return HTMLFallbackErrorSchema.parse({
    type: 'HTML_FALLBACK',
    endpoint: params.endpoint,
    expectedContentType: 'application/json',
    actualContentType: params.actualContentType,
    hint: 'API route hitting SPA fallback - endpoint may not be registered',
    timestamp: new Date(),
  });
}

/**
 * Creates a debug info object for copying/logging.
 */
export function createDebugInfo(params: {
  endpoint: string;
  status?: number;
  code?: string;
  requestId?: string;
}): DebugInfo {
  return DebugInfoSchema.parse({
    ...params,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
  });
}
