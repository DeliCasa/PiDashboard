/**
 * Connect Error Mapper
 * Feature: 062-piorch-grpc-client
 *
 * Maps ConnectError codes to PiDashboard error handling patterns.
 */

import { ConnectError, Code } from '@connectrpc/connect';
import { ApiError } from '@/infrastructure/api/client';

/**
 * Check if an error is a Connect "feature unavailable" error (NotFound or Unavailable).
 * Matches the existing isFeatureUnavailable() pattern from REST client.
 */
export function isRpcFeatureUnavailable(error: unknown): boolean {
  if (error instanceof ConnectError) {
    return error.code === Code.NotFound || error.code === Code.Unavailable;
  }
  return false;
}

/**
 * Map a ConnectError to an ApiError for consistent error handling.
 * Preserves the existing error patterns used by hooks and components.
 */
export function mapConnectError(error: unknown): Error {
  if (!(error instanceof ConnectError)) {
    return error instanceof Error ? error : new Error(String(error));
  }

  switch (error.code) {
    case Code.NotFound:
      return new ApiError(404, error.message, 'NOT_FOUND');

    case Code.Unavailable:
      return new ApiError(503, error.message, 'SERVICE_UNAVAILABLE');

    case Code.Unauthenticated:
      return new ApiError(401, error.message, 'UNAUTHENTICATED');

    case Code.PermissionDenied:
      return new ApiError(403, error.message, 'PERMISSION_DENIED');

    case Code.DeadlineExceeded:
      return new ApiError(504, error.message, 'DEADLINE_EXCEEDED');

    case Code.InvalidArgument:
      return new ApiError(400, error.message, 'INVALID_ARGUMENT');

    case Code.Internal:
    default:
      return new ApiError(500, error.message, 'INTERNAL_ERROR');
  }
}
