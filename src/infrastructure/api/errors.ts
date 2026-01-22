/**
 * V1 API Error Handling
 * Feature: 006-piorchestrator-v1-api-sync
 * Enhanced: 030-dashboard-recovery (HTMLFallbackError, createDebugInfo)
 *
 * Error code registry with user-friendly message mappings and V1 API error class.
 */

import type { ErrorCode, V1Error } from '@/domain/types/v1-api';

// ============================================================================
// HTML Fallback Error (030-dashboard-recovery)
// ============================================================================

/**
 * Error thrown when API returns HTML instead of JSON.
 * This typically indicates the request hit the SPA fallback route
 * instead of a registered API endpoint.
 */
export class HTMLFallbackError extends Error {
  readonly name = 'HTMLFallbackError';
  readonly hint = 'API route hitting SPA fallback - endpoint may not be registered';

  constructor(
    /** The endpoint that returned HTML */
    public readonly endpoint: string,
    /** Expected content type (application/json) */
    public readonly expectedContentType: string = 'application/json',
    /** Actual content type received */
    public readonly actualContentType: string,
    /** Timestamp when the error occurred */
    public readonly timestamp: Date = new Date()
  ) {
    super(`Expected JSON but received HTML from ${endpoint}`);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HTMLFallbackError);
    }
  }

  /**
   * Type guard to check if an error is an HTMLFallbackError.
   */
  static isHTMLFallbackError(error: unknown): error is HTMLFallbackError {
    return error instanceof HTMLFallbackError;
  }

  /**
   * Get user-friendly message for display.
   */
  get userMessage(): string {
    return `The API endpoint "${this.endpoint}" returned an HTML page instead of data. This may indicate the endpoint is not properly registered on the server.`;
  }
}

// ============================================================================
// Debug Info Helper (030-dashboard-recovery)
// ============================================================================

/**
 * Debug information for error reporting and support.
 */
export interface DebugInfo {
  endpoint: string;
  status?: number;
  code?: string;
  requestId?: string;
  timestamp: string;
  userAgent: string;
  origin: string;
}

/**
 * Creates a debug info object suitable for copying to clipboard.
 * Sanitizes sensitive data (no PII).
 */
export function createDebugInfo(params: {
  endpoint: string;
  status?: number;
  code?: string;
  requestId?: string;
  timestamp?: Date;
}): DebugInfo {
  return {
    endpoint: params.endpoint,
    status: params.status,
    code: params.code,
    requestId: params.requestId,
    timestamp: (params.timestamp ?? new Date()).toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
  };
}

/**
 * Formats debug info as a JSON string for clipboard copying.
 */
export function formatDebugInfoForClipboard(debugInfo: DebugInfo): string {
  return JSON.stringify(debugInfo, null, 2);
}

// ============================================================================
// Error Message Registry
// ============================================================================

/**
 * Maps error codes to user-friendly messages.
 * These messages are suitable for display in the UI.
 */
export const ERROR_MESSAGES: Record<ErrorCode | string, string> = {
  // Session Errors
  SESSION_NOT_FOUND: 'The provisioning session was not found. It may have expired.',
  SESSION_EXPIRED: 'The session has expired. Please start a new session.',
  SESSION_ALREADY_ACTIVE: 'Another provisioning session is already running.',
  SESSION_ALREADY_CLOSED: 'This session has already been closed.',
  SESSION_NOT_RECOVERABLE: 'This session cannot be recovered. Please start a new session.',

  // Device Errors
  DEVICE_NOT_FOUND: 'The device was not found in this session.',
  DEVICE_NOT_IN_ALLOWLIST: 'This device is not approved for provisioning. Add it to the allowlist first.',
  DEVICE_ALREADY_PROVISIONING: 'This device is already being provisioned.',
  DEVICE_INVALID_STATE: 'Cannot perform this action on the device in its current state.',
  MAX_RETRIES_EXCEEDED: 'Maximum retry attempts reached. Please try again later.',

  // Auth Errors
  TOTP_INVALID: 'The authentication code is invalid. Please try again.',
  TOTP_EXPIRED: 'The authentication code has expired. Please generate a new one.',
  RATE_LIMITED: 'Too many requests. Please wait before trying again.',
  UNAUTHORIZED: 'Authentication required. Please configure your API key.',

  // Communication Errors
  DEVICE_UNREACHABLE: 'Cannot connect to the device. Check that it is powered on and in range.',
  DEVICE_REJECTED: 'The device rejected the connection. It may be in a different mode.',
  DEVICE_TIMEOUT: 'The device is not responding. Try moving closer or restarting the device.',
  CIRCUIT_OPEN: 'Service temporarily unavailable. The system is recovering from errors.',
  VERIFICATION_TIMEOUT: 'Device verification timed out. The device may not have connected to WiFi.',

  // Infrastructure Errors
  NETWORK_ERROR: 'Network unavailable. Check your connection.',
  MQTT_UNAVAILABLE: 'Message broker is unavailable. Some features may be limited.',
  DATABASE_ERROR: 'Database error occurred. Please try again.',
  INTERNAL_ERROR: 'An internal error occurred. Please try again or contact support.',

  // Validation Errors
  VALIDATION_FAILED: 'Invalid input. Please check your data and try again.',
  INVALID_REQUEST: 'The request was invalid. Please check your input.',
  MISSING_PARAMETER: 'A required parameter was missing from the request.',

  // Camera Errors (034-esp-camera-integration)
  CAMERA_OFFLINE: 'Camera is offline. Check that it is powered on and connected to WiFi.',
  CAMERA_NOT_FOUND: 'Camera not found. It may have been removed or the ID is incorrect.',
  CAPTURE_FAILED: 'Failed to capture image. The camera may be busy or experiencing issues.',
  CAPTURE_TIMEOUT: 'Capture timed out. The camera may be slow to respond or disconnected.',
  REBOOT_FAILED: 'Failed to reboot camera. Try again or check the camera status.',
};

/**
 * Get a user-friendly message for an error code.
 * Falls back to a generic message for unknown codes.
 */
export function getUserMessage(code: ErrorCode | string): string {
  return ERROR_MESSAGES[code] || 'An unexpected error occurred. Please try again.';
}

// ============================================================================
// V1 API Error Class
// ============================================================================

/**
 * Custom error class for V1 API errors.
 * Provides structured access to error details and user-friendly messages.
 */
export class V1ApiError extends Error {
  readonly name = 'V1ApiError';

  constructor(
    /** Machine-readable error code */
    public readonly code: ErrorCode | string,
    /** Backend error message */
    message: string,
    /** Whether the client should retry */
    public readonly retryable: boolean,
    /** Recommended wait time before retrying (seconds) */
    public readonly retryAfterSeconds?: number,
    /** Request correlation ID for debugging */
    public readonly correlationId?: string,
    /** Additional error details */
    public readonly details?: string
  ) {
    super(message);

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, V1ApiError);
    }
  }

  /**
   * Get a user-friendly message suitable for UI display.
   */
  get userMessage(): string {
    return getUserMessage(this.code);
  }

  /**
   * Create a V1ApiError from a V1Error response object.
   */
  static fromV1Error(error: V1Error, correlationId?: string): V1ApiError {
    return new V1ApiError(
      error.code,
      error.message,
      error.retryable,
      error.retry_after_seconds,
      correlationId,
      error.details
    );
  }

  /**
   * Type guard to check if an error is a V1ApiError.
   */
  static isV1ApiError(error: unknown): error is V1ApiError {
    return error instanceof V1ApiError;
  }

  /**
   * Check if the error is an authentication error.
   */
  isAuthError(): boolean {
    return this.code === 'UNAUTHORIZED' || this.code === 'TOTP_INVALID' || this.code === 'TOTP_EXPIRED';
  }

  /**
   * Check if the error is a rate limit error.
   */
  isRateLimited(): boolean {
    return this.code === 'RATE_LIMITED';
  }

  /**
   * Check if the error is a session error.
   */
  isSessionError(): boolean {
    return (
      this.code === 'SESSION_NOT_FOUND' ||
      this.code === 'SESSION_EXPIRED' ||
      this.code === 'SESSION_ALREADY_ACTIVE' ||
      this.code === 'SESSION_ALREADY_CLOSED' ||
      this.code === 'SESSION_NOT_RECOVERABLE'
    );
  }

  /**
   * Check if the error is a device error.
   */
  isDeviceError(): boolean {
    return (
      this.code === 'DEVICE_NOT_FOUND' ||
      this.code === 'DEVICE_NOT_IN_ALLOWLIST' ||
      this.code === 'DEVICE_ALREADY_PROVISIONING' ||
      this.code === 'DEVICE_INVALID_STATE' ||
      this.code === 'MAX_RETRIES_EXCEEDED' ||
      this.code === 'DEVICE_UNREACHABLE' ||
      this.code === 'DEVICE_REJECTED' ||
      this.code === 'DEVICE_TIMEOUT'
    );
  }

  /**
   * Check if the error is a camera error.
   * Feature: 034-esp-camera-integration
   */
  isCameraError(): boolean {
    return (
      this.code === 'CAMERA_OFFLINE' ||
      this.code === 'CAMERA_NOT_FOUND' ||
      this.code === 'CAPTURE_FAILED' ||
      this.code === 'CAPTURE_TIMEOUT' ||
      this.code === 'REBOOT_FAILED'
    );
  }

  /**
   * Convert to a plain object for logging (without exposing sensitive data).
   */
  toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      retryAfterSeconds: this.retryAfterSeconds,
      correlationId: this.correlationId,
    };
  }
}

// ============================================================================
// Error Categorization Helpers
// ============================================================================

/**
 * Error category for UI styling and handling.
 */
export type ErrorCategory = 'auth' | 'session' | 'device' | 'camera' | 'network' | 'validation' | 'infrastructure' | 'unknown';

/**
 * Get the category of an error code for UI handling.
 */
export function getErrorCategory(code: ErrorCode | string): ErrorCategory {
  if (code === 'UNAUTHORIZED' || code === 'TOTP_INVALID' || code === 'TOTP_EXPIRED') {
    return 'auth';
  }

  if (
    code === 'SESSION_NOT_FOUND' ||
    code === 'SESSION_EXPIRED' ||
    code === 'SESSION_ALREADY_ACTIVE' ||
    code === 'SESSION_ALREADY_CLOSED' ||
    code === 'SESSION_NOT_RECOVERABLE'
  ) {
    return 'session';
  }

  if (
    code === 'DEVICE_NOT_FOUND' ||
    code === 'DEVICE_NOT_IN_ALLOWLIST' ||
    code === 'DEVICE_ALREADY_PROVISIONING' ||
    code === 'DEVICE_INVALID_STATE' ||
    code === 'MAX_RETRIES_EXCEEDED' ||
    code === 'DEVICE_UNREACHABLE' ||
    code === 'DEVICE_REJECTED' ||
    code === 'DEVICE_TIMEOUT' ||
    code === 'VERIFICATION_TIMEOUT'
  ) {
    return 'device';
  }

  if (code === 'NETWORK_ERROR' || code === 'CIRCUIT_OPEN' || code === 'RATE_LIMITED') {
    return 'network';
  }

  if (code === 'VALIDATION_FAILED' || code === 'INVALID_REQUEST' || code === 'MISSING_PARAMETER') {
    return 'validation';
  }

  if (code === 'MQTT_UNAVAILABLE' || code === 'DATABASE_ERROR' || code === 'INTERNAL_ERROR') {
    return 'infrastructure';
  }

  // Camera errors (034-esp-camera-integration)
  if (
    code === 'CAMERA_OFFLINE' ||
    code === 'CAMERA_NOT_FOUND' ||
    code === 'CAPTURE_FAILED' ||
    code === 'CAPTURE_TIMEOUT' ||
    code === 'REBOOT_FAILED'
  ) {
    return 'camera';
  }

  return 'unknown';
}
