/**
 * V1 API Response Type Definitions
 * Pi Dashboard - DeliCasa IoT System
 *
 * Defines the standardized V1 response envelope types for PiOrchestrator API.
 * All V1 endpoints return responses wrapped in this envelope format.
 */

// ============ Error Codes ============

/**
 * All known error codes from PiOrchestrator V1 API.
 * Used for type-safe error handling and user-friendly message mapping.
 */
export type ErrorCode =
  // Session Errors
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'SESSION_ALREADY_ACTIVE'
  | 'SESSION_ALREADY_CLOSED'
  | 'SESSION_NOT_RECOVERABLE'
  // Device Errors
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_NOT_IN_ALLOWLIST'
  | 'DEVICE_ALREADY_PROVISIONING'
  | 'DEVICE_INVALID_STATE'
  | 'MAX_RETRIES_EXCEEDED'
  // Auth Errors
  | 'TOTP_INVALID'
  | 'TOTP_EXPIRED'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  // Communication Errors
  | 'DEVICE_UNREACHABLE'
  | 'DEVICE_REJECTED'
  | 'DEVICE_TIMEOUT'
  | 'CIRCUIT_OPEN'
  | 'VERIFICATION_TIMEOUT'
  // Infrastructure Errors
  | 'NETWORK_ERROR'
  | 'MQTT_UNAVAILABLE'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  // Validation Errors
  | 'VALIDATION_FAILED'
  | 'INVALID_REQUEST'
  | 'MISSING_PARAMETER';

// ============ V1 Response Envelope ============

/**
 * Structured error information from V1 API.
 */
export interface V1Error {
  /** Machine-readable error code */
  code: ErrorCode | string;
  /** Human-readable error message from backend */
  message: string;
  /** Whether the client should retry the request */
  retryable: boolean;
  /** Recommended wait time before retrying (seconds) */
  retry_after_seconds?: number;
  /** Additional context for debugging */
  details?: string;
}

/**
 * Successful V1 API response envelope.
 * @template T - The type of the data payload
 */
export interface V1SuccessResponse<T> {
  success: true;
  data: T;
  /** UUID for request tracing and debugging */
  correlation_id: string;
  /** ISO8601/RFC3339 timestamp */
  timestamp: string;
}

/**
 * Error V1 API response envelope.
 */
export interface V1ErrorResponse {
  success: false;
  error: V1Error;
  /** UUID for request tracing and debugging */
  correlation_id: string;
  /** ISO8601/RFC3339 timestamp */
  timestamp: string;
}

/**
 * Union type for all V1 API responses.
 * Use discriminated union on `success` field.
 * @template T - The type of the data payload on success
 */
export type V1Response<T> = V1SuccessResponse<T> | V1ErrorResponse;

// ============ Type Guards ============

/**
 * Type guard to check if response is successful.
 */
export function isV1Success<T>(response: V1Response<T>): response is V1SuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error.
 */
export function isV1Error<T>(response: V1Response<T>): response is V1ErrorResponse {
  return response.success === false;
}

// ============ Utility Types ============

/**
 * Extract the data type from a V1 success response.
 */
export type V1Data<T> = T extends V1SuccessResponse<infer D> ? D : never;

/**
 * Unwrapped result from V1 API call (data + correlation ID).
 */
export interface V1Result<T> {
  data: T;
  correlationId: string;
}
