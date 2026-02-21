/**
 * Camera Diagnostics API Contract Tests
 * Feature: 042-diagnostics-integration (T011)
 *
 * Validates that mock data matches the Zod schemas defined for camera diagnostics API.
 * Prevents silent drift between MSW handlers and actual API contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  CameraStatusSchema,
  ConnectionQualitySchema,
  SessionStatusSchema,
  CameraHealthSchema,
  DiagnosticsDetailSchema,
  CameraDiagnosticsSchema,
  CameraDiagnosticsResponseSchema,
  CameraDiagnosticsListSchema,
  CapturedEvidenceSchema,
  CapturedEvidenceResponseSchema,
  SessionDetailSchema,
  SessionDetailResponseSchema,
  ApiErrorResponseSchema,
  isValidCameraId,
  deriveConnectionQuality,
} from '@/infrastructure/api/camera-diagnostics-schemas';

import {
  mockCameraDiagnostics,
  mockCameraDiagnosticsVariants,
  mockConnectionQualityVariants,
  mockCapturedEvidence,
  mockCapturedEvidenceList,
  mockSessionDetail,
  mockSessionDetailVariants,
  mockCameraDiagnosticsResponse,
  mockCapturedEvidenceResponse,
  mockSessionDetailResponse,
  mockErrorResponses,
} from '../../mocks/diagnostics/fixtures';

describe('Camera Diagnostics API Contracts', () => {
  describe('CameraStatusSchema', () => {
    it('validates all camera statuses', () => {
      const validStatuses = ['online', 'offline', 'error', 'rebooting', 'discovered', 'pairing', 'connecting'];
      for (const status of validStatuses) {
        const result = CameraStatusSchema.safeParse(status);
        expect(result.success, `Status "${status}" should be valid`).toBe(true);
      }
    });

    it('rejects invalid statuses', () => {
      const invalidStatuses = ['unknown', 'disconnected', 'active', ''];
      for (const status of invalidStatuses) {
        const result = CameraStatusSchema.safeParse(status);
        expect(result.success, `Status "${status}" should be invalid`).toBe(false);
      }
    });
  });

  describe('ConnectionQualitySchema', () => {
    it('validates all connection qualities', () => {
      const validQualities = ['excellent', 'good', 'fair', 'poor'];
      for (const quality of validQualities) {
        const result = ConnectionQualitySchema.safeParse(quality);
        expect(result.success, `Quality "${quality}" should be valid`).toBe(true);
      }
    });

    it('rejects invalid qualities', () => {
      const invalidQualities = ['bad', 'strong', 'weak', ''];
      for (const quality of invalidQualities) {
        const result = ConnectionQualitySchema.safeParse(quality);
        expect(result.success, `Quality "${quality}" should be invalid`).toBe(false);
      }
    });
  });

  describe('SessionStatusSchema', () => {
    it('validates all session statuses', () => {
      const validStatuses = ['active', 'complete', 'partial', 'failed'];
      for (const status of validStatuses) {
        const result = SessionStatusSchema.safeParse(status);
        expect(result.success, `Session status "${status}" should be valid`).toBe(true);
      }
    });

    it('rejects invalid session statuses', () => {
      const invalidStatuses = ['pending', 'completed', 'cancelled', 'expired', ''];
      for (const status of invalidStatuses) {
        const result = SessionStatusSchema.safeParse(status);
        expect(result.success, `Session status "${status}" should be invalid`).toBe(false);
      }
    });
  });

  describe('CameraHealthSchema', () => {
    it('validates complete health data', () => {
      const health = { heap: 127700, wifi_rssi: -47, uptime: 3600 };
      const result = CameraHealthSchema.safeParse(health);
      expect(result.success).toBe(true);
    });

    it('validates health with edge values', () => {
      const edgeCases = [
        { heap: 0, wifi_rssi: 0, uptime: 0 }, // Minimum valid values
        { heap: 0, wifi_rssi: -100, uptime: 0 }, // Minimum RSSI
        { heap: 500000, wifi_rssi: -30, uptime: 86400 }, // High values
      ];

      for (const health of edgeCases) {
        const result = CameraHealthSchema.safeParse(health);
        expect(result.success, `Edge case ${JSON.stringify(health)} should be valid`).toBe(true);
      }
    });

    it('rejects invalid heap values', () => {
      const invalid = { heap: -1, wifi_rssi: -50, uptime: 1000 };
      const result = CameraHealthSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects out of range RSSI values', () => {
      const invalidRssi = [
        { heap: 100000, wifi_rssi: 1, uptime: 1000 }, // Positive RSSI
        { heap: 100000, wifi_rssi: -101, uptime: 1000 }, // Below -100
      ];

      for (const health of invalidRssi) {
        const result = CameraHealthSchema.safeParse(health);
        expect(result.success, `RSSI ${health.wifi_rssi} should be invalid`).toBe(false);
      }
    });
  });

  describe('DiagnosticsDetailSchema', () => {
    it('validates complete diagnostics detail', () => {
      const detail = {
        connection_quality: 'excellent',
        error_count: 0,
        firmware_version: '1.2.3',
        resolution: '1280x720',
        frame_rate: 25,
        avg_capture_time_ms: 150,
      };
      const result = DiagnosticsDetailSchema.safeParse(detail);
      expect(result.success).toBe(true);
    });

    it('validates minimal diagnostics detail', () => {
      const minimal = { connection_quality: 'good', error_count: 0 };
      const result = DiagnosticsDetailSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('validates detail with error info', () => {
      const withError = {
        connection_quality: 'poor',
        error_count: 5,
        last_error: 'Connection timeout',
        last_error_time: '2026-02-03T11:55:00Z',
      };
      const result = DiagnosticsDetailSchema.safeParse(withError);
      expect(result.success).toBe(true);
    });

    it('requires connection_quality field', () => {
      const invalid = { error_count: 0 };
      const result = DiagnosticsDetailSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CameraDiagnosticsSchema', () => {
    it('validates complete camera diagnostics', () => {
      const result = CameraDiagnosticsSchema.safeParse(mockCameraDiagnostics);
      expect(result.success).toBe(true);
    });

    it('validates all status variants match schema', () => {
      for (const [variantName, mockData] of Object.entries(mockCameraDiagnosticsVariants)) {
        const result = CameraDiagnosticsSchema.safeParse(mockData);
        expect(result.success, `Variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('validates all connection quality variants match schema', () => {
      for (const [variantName, mockData] of Object.entries(mockConnectionQualityVariants)) {
        const result = CameraDiagnosticsSchema.safeParse(mockData);
        expect(result.success, `Connection quality variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('validates minimal camera diagnostics', () => {
      const minimal = {
        camera_id: 'espcam-abc123',
        name: 'Test Camera',
        status: 'offline',
        last_seen: '2026-02-03T12:00:00Z',
      };
      const result = CameraDiagnosticsSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('validates camera with device_id alias', () => {
      const withAlias = {
        ...mockCameraDiagnostics,
        device_id: 'espcam-b0f7f1',
      };
      const result = CameraDiagnosticsSchema.safeParse(withAlias);
      expect(result.success).toBe(true);
    });
  });

  describe('Camera ID Validation', () => {
    it('validates correct camera ID format', () => {
      const validIds = ['espcam-abcdef', 'espcam-123456', 'espcam-ABCDEF', 'espcam-b0f7f1'];
      for (const id of validIds) {
        expect(isValidCameraId(id), `ID "${id}" should be valid`).toBe(true);
      }
    });

    it('rejects invalid camera ID formats', () => {
      const invalidIds = [
        'espcam-12345', // Too short
        'espcam-1234567', // Too long
        'esp-123456', // Wrong prefix
        'camera-abcdef', // Wrong prefix
        'espcam-ghijkl', // Invalid hex
        'espcam_abcdef', // Wrong separator
        '', // Empty
      ];
      for (const id of invalidIds) {
        expect(isValidCameraId(id), `ID "${id}" should be invalid`).toBe(false);
      }
    });
  });

  describe('CameraDiagnosticsResponseSchema', () => {
    it('validates API response wrapper', () => {
      const result = CameraDiagnosticsResponseSchema.safeParse(mockCameraDiagnosticsResponse);
      expect(result.success).toBe(true);
    });

    it('requires success field', () => {
      const invalid = { data: mockCameraDiagnostics };
      const result = CameraDiagnosticsResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CameraDiagnosticsListSchema', () => {
    it('validates array of camera diagnostics', () => {
      const list = Object.values(mockCameraDiagnosticsVariants);
      const result = CameraDiagnosticsListSchema.safeParse(list);
      expect(result.success).toBe(true);
    });

    it('validates empty array', () => {
      const result = CameraDiagnosticsListSchema.safeParse([]);
      expect(result.success).toBe(true);
    });
  });

  describe('CapturedEvidenceSchema', () => {
    it('validates complete evidence data', () => {
      const result = CapturedEvidenceSchema.safeParse(mockCapturedEvidence);
      expect(result.success).toBe(true);
    });

    it('validates all evidence in list', () => {
      for (const evidence of mockCapturedEvidenceList) {
        const result = CapturedEvidenceSchema.safeParse(evidence);
        expect(result.success, `Evidence ${evidence.id} should match schema`).toBe(true);
      }
    });

    it('validates minimal evidence data', () => {
      const minimal = {
        id: 'ev-minimal',
        camera_id: 'espcam-111111',
        session_id: 'sess-001',
        captured_at: '2026-02-03T12:00:00Z',
        image_base64: 'dGVzdA==',
      };
      const result = CapturedEvidenceSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('requires id field', () => {
      const { id: _id, ...noId } = mockCapturedEvidence;
      void _id; // Destructured to exclude from object
      const result = CapturedEvidenceSchema.safeParse(noId);
      expect(result.success).toBe(false);
    });

    it('requires camera_id field', () => {
      const { camera_id: _cameraId, ...noCameraId } = mockCapturedEvidence;
      void _cameraId; // Destructured to exclude from object
      const result = CapturedEvidenceSchema.safeParse(noCameraId);
      expect(result.success).toBe(false);
    });

    it('requires valid camera_id format', () => {
      const invalid = { ...mockCapturedEvidence, camera_id: 'invalid-id' };
      const result = CapturedEvidenceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CapturedEvidenceResponseSchema', () => {
    it('validates API response wrapper', () => {
      const result = CapturedEvidenceResponseSchema.safeParse(mockCapturedEvidenceResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('SessionDetailSchema', () => {
    it('validates complete session detail', () => {
      const result = SessionDetailSchema.safeParse(mockSessionDetail);
      expect(result.success).toBe(true);
    });

    it('validates all session variants match schema', () => {
      for (const [variantName, mockData] of Object.entries(mockSessionDetailVariants)) {
        const result = SessionDetailSchema.safeParse(mockData);
        expect(result.success, `Session variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('validates minimal session detail', () => {
      const minimal = {
        id: 'sess-minimal',
        started_at: '2026-02-03T11:00:00Z',
        status: 'active',
        capture_count: 0,
      };
      const result = SessionDetailSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('requires id field', () => {
      const { id: _id, ...noId } = mockSessionDetail;
      void _id; // Destructured to exclude from object
      const result = SessionDetailSchema.safeParse(noId);
      expect(result.success).toBe(false);
    });

    it('requires status field', () => {
      const { status: _status, ...noStatus } = mockSessionDetail;
      void _status; // Destructured to exclude from object
      const result = SessionDetailSchema.safeParse(noStatus);
      expect(result.success).toBe(false);
    });
  });

  describe('SessionDetailResponseSchema', () => {
    it('validates API response wrapper', () => {
      const result = SessionDetailResponseSchema.safeParse(mockSessionDetailResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('ApiErrorResponseSchema', () => {
    it('validates all error response variants', () => {
      for (const [variantName, mockData] of Object.entries(mockErrorResponses)) {
        const result = ApiErrorResponseSchema.safeParse(mockData);
        expect(result.success, `Error variant "${variantName}" should match schema`).toBe(true);
      }
    });

    it('validates minimal error response', () => {
      const minimal = { error: 'Something went wrong' };
      const result = ApiErrorResponseSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('validates error with details', () => {
      const withDetails = {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'camera_id', issue: 'Invalid format' },
      };
      const result = ApiErrorResponseSchema.safeParse(withDetails);
      expect(result.success).toBe(true);
    });
  });

  describe('deriveConnectionQuality utility', () => {
    it('derives excellent quality for strong signal', () => {
      expect(deriveConnectionQuality(-30)).toBe('excellent');
      expect(deriveConnectionQuality(-50)).toBe('excellent');
    });

    it('derives good quality for moderate signal', () => {
      expect(deriveConnectionQuality(-51)).toBe('good');
      expect(deriveConnectionQuality(-60)).toBe('good');
    });

    it('derives fair quality for weak signal', () => {
      expect(deriveConnectionQuality(-61)).toBe('fair');
      expect(deriveConnectionQuality(-70)).toBe('fair');
    });

    it('derives poor quality for very weak signal', () => {
      expect(deriveConnectionQuality(-71)).toBe('poor');
      expect(deriveConnectionQuality(-90)).toBe('poor');
    });
  });
});
