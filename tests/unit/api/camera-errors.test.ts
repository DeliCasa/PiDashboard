/**
 * Camera Error Categorization Tests
 * Feature: 034-esp-camera-integration (T010a)
 *
 * Tests error codes, categorization, and retry logic for camera-specific errors.
 */

import { describe, it, expect } from 'vitest';
import {
  V1ApiError,
  getUserMessage,
  getErrorCategory,
  ERROR_MESSAGES,
} from '@/infrastructure/api/errors';

// ============================================================================
// Error Message Registry Tests
// ============================================================================

describe('Camera Error Messages (FR-009)', () => {
  it('should have message for CAMERA_OFFLINE', () => {
    expect(ERROR_MESSAGES.CAMERA_OFFLINE).toBeDefined();
    expect(getUserMessage('CAMERA_OFFLINE')).toContain('offline');
  });

  it('should have message for CAMERA_NOT_FOUND', () => {
    expect(ERROR_MESSAGES.CAMERA_NOT_FOUND).toBeDefined();
    expect(getUserMessage('CAMERA_NOT_FOUND')).toContain('not found');
  });

  it('should have message for CAPTURE_FAILED', () => {
    expect(ERROR_MESSAGES.CAPTURE_FAILED).toBeDefined();
    expect(getUserMessage('CAPTURE_FAILED')).toContain('capture');
  });

  it('should have message for CAPTURE_TIMEOUT', () => {
    expect(ERROR_MESSAGES.CAPTURE_TIMEOUT).toBeDefined();
    expect(getUserMessage('CAPTURE_TIMEOUT')).toContain('timed out');
  });

  it('should have message for REBOOT_FAILED', () => {
    expect(ERROR_MESSAGES.REBOOT_FAILED).toBeDefined();
    expect(getUserMessage('REBOOT_FAILED')).toContain('reboot');
  });

  it('should return generic message for unknown codes', () => {
    const message = getUserMessage('UNKNOWN_ERROR_CODE');
    expect(message).toContain('unexpected');
  });
});

// ============================================================================
// Error Categorization Tests
// ============================================================================

describe('Camera Error Categorization (FR-010)', () => {
  it('should categorize CAMERA_OFFLINE as camera error', () => {
    expect(getErrorCategory('CAMERA_OFFLINE')).toBe('camera');
  });

  it('should categorize CAMERA_NOT_FOUND as camera error', () => {
    expect(getErrorCategory('CAMERA_NOT_FOUND')).toBe('camera');
  });

  it('should categorize CAPTURE_FAILED as camera error', () => {
    expect(getErrorCategory('CAPTURE_FAILED')).toBe('camera');
  });

  it('should categorize CAPTURE_TIMEOUT as camera error', () => {
    expect(getErrorCategory('CAPTURE_TIMEOUT')).toBe('camera');
  });

  it('should categorize REBOOT_FAILED as camera error', () => {
    expect(getErrorCategory('REBOOT_FAILED')).toBe('camera');
  });

  it('should not categorize NETWORK_ERROR as camera error', () => {
    expect(getErrorCategory('NETWORK_ERROR')).toBe('network');
    expect(getErrorCategory('NETWORK_ERROR')).not.toBe('camera');
  });

  it('should categorize unknown codes as unknown', () => {
    expect(getErrorCategory('SOME_UNKNOWN_CODE')).toBe('unknown');
  });
});

// ============================================================================
// V1ApiError Camera Error Tests
// ============================================================================

describe('V1ApiError.isCameraError (FR-011)', () => {
  it('should return true for CAMERA_OFFLINE', () => {
    const error = new V1ApiError('CAMERA_OFFLINE', 'Camera offline', true);
    expect(error.isCameraError()).toBe(true);
  });

  it('should return true for CAMERA_NOT_FOUND', () => {
    const error = new V1ApiError('CAMERA_NOT_FOUND', 'Not found', false);
    expect(error.isCameraError()).toBe(true);
  });

  it('should return true for CAPTURE_FAILED', () => {
    const error = new V1ApiError('CAPTURE_FAILED', 'Capture failed', true);
    expect(error.isCameraError()).toBe(true);
  });

  it('should return true for CAPTURE_TIMEOUT', () => {
    const error = new V1ApiError('CAPTURE_TIMEOUT', 'Timeout', true);
    expect(error.isCameraError()).toBe(true);
  });

  it('should return true for REBOOT_FAILED', () => {
    const error = new V1ApiError('REBOOT_FAILED', 'Reboot failed', true);
    expect(error.isCameraError()).toBe(true);
  });

  it('should return false for NETWORK_ERROR', () => {
    const error = new V1ApiError('NETWORK_ERROR', 'Network error', true);
    expect(error.isCameraError()).toBe(false);
  });

  it('should return false for DEVICE_NOT_FOUND', () => {
    const error = new V1ApiError('DEVICE_NOT_FOUND', 'Device not found', false);
    expect(error.isCameraError()).toBe(false);
  });
});

// ============================================================================
// Retry Logic Tests (FR-011)
// ============================================================================

describe('Camera Error Retry Logic', () => {
  describe('Retryable errors', () => {
    it('CAMERA_OFFLINE should typically be retryable', () => {
      const error = new V1ApiError('CAMERA_OFFLINE', 'Offline', true, 30);

      expect(error.retryable).toBe(true);
      expect(error.retryAfterSeconds).toBe(30);
    });

    it('CAPTURE_FAILED should be retryable', () => {
      const error = new V1ApiError('CAPTURE_FAILED', 'Failed', true);

      expect(error.retryable).toBe(true);
    });

    it('CAPTURE_TIMEOUT should be retryable', () => {
      const error = new V1ApiError('CAPTURE_TIMEOUT', 'Timeout', true);

      expect(error.retryable).toBe(true);
    });

    it('REBOOT_FAILED should be retryable', () => {
      const error = new V1ApiError('REBOOT_FAILED', 'Reboot failed', true);

      expect(error.retryable).toBe(true);
    });
  });

  describe('Non-retryable errors', () => {
    it('CAMERA_NOT_FOUND should NOT be retryable', () => {
      const error = new V1ApiError('CAMERA_NOT_FOUND', 'Not found', false);

      expect(error.retryable).toBe(false);
    });
  });

  describe('retry_after_seconds', () => {
    it('should preserve retry_after_seconds from response', () => {
      const error = new V1ApiError('CAMERA_OFFLINE', 'Offline', true, 60);

      expect(error.retryAfterSeconds).toBe(60);
    });

    it('should handle undefined retry_after_seconds', () => {
      const error = new V1ApiError('CAPTURE_FAILED', 'Failed', true);

      expect(error.retryAfterSeconds).toBeUndefined();
    });
  });
});

// ============================================================================
// User Message Tests
// ============================================================================

describe('Camera Error User Messages', () => {
  it('should provide actionable message for CAMERA_OFFLINE', () => {
    const error = new V1ApiError('CAMERA_OFFLINE', 'Backend message', true);

    expect(error.userMessage).toContain('offline');
    expect(error.userMessage).toContain('WiFi');
  });

  it('should provide helpful message for CAPTURE_TIMEOUT', () => {
    const error = new V1ApiError('CAPTURE_TIMEOUT', 'Backend timeout', true);

    expect(error.userMessage).toContain('timed out');
  });

  it('should indicate retry possibility for retryable errors', () => {
    const error = new V1ApiError('REBOOT_FAILED', 'Failed', true);

    expect(error.userMessage).toContain('Try again');
  });
});

// ============================================================================
// Error Construction Tests
// ============================================================================

describe('V1ApiError construction with camera errors', () => {
  it('should create error with all properties', () => {
    const error = new V1ApiError(
      'CAMERA_OFFLINE',
      'Camera AA:BB:CC is not responding',
      true,
      30,
      'corr-123',
      'Additional details'
    );

    expect(error.code).toBe('CAMERA_OFFLINE');
    expect(error.message).toBe('Camera AA:BB:CC is not responding');
    expect(error.retryable).toBe(true);
    expect(error.retryAfterSeconds).toBe(30);
    expect(error.correlationId).toBe('corr-123');
    expect(error.details).toBe('Additional details');
  });

  it('should extend Error class', () => {
    const error = new V1ApiError('CAPTURE_FAILED', 'Failed', true);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('V1ApiError');
  });

  it('should have stack trace', () => {
    const error = new V1ApiError('CAPTURE_TIMEOUT', 'Timeout', true);

    expect(error.stack).toBeDefined();
  });

  it('should be identifiable via type guard', () => {
    const error = new V1ApiError('CAMERA_NOT_FOUND', 'Not found', false);

    expect(V1ApiError.isV1ApiError(error)).toBe(true);
    expect(V1ApiError.isV1ApiError(new Error('Regular error'))).toBe(false);
  });
});

// ============================================================================
// fromV1Error Factory Tests
// ============================================================================

describe('V1ApiError.fromV1Error with camera errors', () => {
  it('should create error from V1Error response object', () => {
    const v1Error = {
      code: 'CAMERA_OFFLINE' as const,
      message: 'Camera is offline',
      retryable: true,
      retry_after_seconds: 30,
    };

    const error = V1ApiError.fromV1Error(v1Error, 'corr-456');

    expect(error.code).toBe('CAMERA_OFFLINE');
    expect(error.message).toBe('Camera is offline');
    expect(error.retryable).toBe(true);
    expect(error.retryAfterSeconds).toBe(30);
    expect(error.correlationId).toBe('corr-456');
  });
});

// ============================================================================
// toLogObject Tests
// ============================================================================

describe('V1ApiError.toLogObject with camera errors', () => {
  it('should produce log-safe object without sensitive data', () => {
    const error = new V1ApiError(
      'CAPTURE_FAILED',
      'Capture failed for camera',
      true,
      undefined,
      'corr-789'
    );

    const logObj = error.toLogObject();

    expect(logObj).toEqual({
      name: 'V1ApiError',
      code: 'CAPTURE_FAILED',
      message: 'Capture failed for camera',
      retryable: true,
      retryAfterSeconds: undefined,
      correlationId: 'corr-789',
    });
  });
});
