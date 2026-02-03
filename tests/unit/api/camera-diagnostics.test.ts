/**
 * Camera Diagnostics API Client Unit Tests
 * Feature: 042-diagnostics-integration (T012)
 *
 * Tests for camera diagnostics API client functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCameraDiagnostics, listCameraDiagnostics, cameraDiagnosticsApi } from '@/infrastructure/api/camera-diagnostics';
import { apiClient, ApiError } from '@/infrastructure/api/client';
import {
  mockCameraDiagnostics,
  mockCameraDiagnosticsVariants,
  mockCameraDiagnosticsResponse,
} from '../../mocks/diagnostics/fixtures';

// Mock the apiClient
vi.mock('@/infrastructure/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiError: class MockApiError extends Error {
    status: number;
    code?: string;
    constructor(status: number, message: string, code?: string) {
      super(message);
      this.status = status;
      this.code = code;
      this.name = 'ApiError';
    }
  },
}));

describe('Camera Diagnostics API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCameraDiagnostics', () => {
    it('should return diagnostics for valid camera ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockCameraDiagnosticsResponse);

      const result = await getCameraDiagnostics('espcam-b0f7f1');

      expect(apiClient.get).toHaveBeenCalledWith('/v1/cameras/espcam-b0f7f1/diagnostics');
      expect(result).toEqual(mockCameraDiagnostics);
    });

    it('should throw validation error for invalid camera ID format', async () => {
      await expect(getCameraDiagnostics('invalid-id')).rejects.toThrow(ApiError);
      await expect(getCameraDiagnostics('invalid-id')).rejects.toThrow('Invalid camera ID format');
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should throw validation error for empty camera ID', async () => {
      await expect(getCameraDiagnostics('')).rejects.toThrow(ApiError);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate 404 error for camera not found', async () => {
      const notFoundError = new ApiError(404, 'Camera not found', 'NOT_FOUND');
      vi.mocked(apiClient.get).mockRejectedValueOnce(notFoundError);

      await expect(getCameraDiagnostics('espcam-000000')).rejects.toThrow('Camera not found');
    });

    it('should propagate 503 error for offline camera', async () => {
      const offlineError = new ApiError(503, 'Camera offline', 'SERVICE_UNAVAILABLE');
      vi.mocked(apiClient.get).mockRejectedValueOnce(offlineError);

      await expect(getCameraDiagnostics('espcam-111111')).rejects.toThrow('Camera offline');
    });

    it('should fallback to legacy endpoint on non-404/503 errors', async () => {
      const genericError = new Error('Connection reset');
      const legacyResponse = [mockCameraDiagnostics];

      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(genericError)
        .mockResolvedValueOnce(legacyResponse);

      const result = await getCameraDiagnostics('espcam-b0f7f1');

      expect(apiClient.get).toHaveBeenCalledTimes(2);
      expect(apiClient.get).toHaveBeenNthCalledWith(1, '/v1/cameras/espcam-b0f7f1/diagnostics');
      expect(apiClient.get).toHaveBeenNthCalledWith(2, '/dashboard/cameras/diagnostics');
      expect(result).toEqual(mockCameraDiagnostics);
    });

    it('should find camera by camera_id in legacy response', async () => {
      const genericError = new Error('Connection reset');
      const legacyResponse = Object.values(mockCameraDiagnosticsVariants);

      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(genericError)
        .mockResolvedValueOnce(legacyResponse);

      const result = await getCameraDiagnostics('espcam-c2d3e4'); // offline variant

      expect(result.camera_id).toBe('espcam-c2d3e4');
      expect(result.status).toBe('offline');
    });

    it('should throw 404 when camera not found in legacy response', async () => {
      const genericError = new Error('Connection reset');
      const legacyResponse = [mockCameraDiagnostics];

      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(genericError)
        .mockResolvedValueOnce(legacyResponse);

      await expect(getCameraDiagnostics('espcam-ffffff')).rejects.toThrow('Camera not found');
    });
  });

  describe('listCameraDiagnostics', () => {
    it('should return list of camera diagnostics', async () => {
      const listResponse = Object.values(mockCameraDiagnosticsVariants);
      vi.mocked(apiClient.get).mockResolvedValueOnce(listResponse);

      const result = await listCameraDiagnostics();

      expect(apiClient.get).toHaveBeenCalledWith('/dashboard/cameras/diagnostics');
      expect(result).toHaveLength(7);
    });

    it('should return empty array on 404 error', async () => {
      const notFoundError = new ApiError(404, 'Not found', 'NOT_FOUND');
      vi.mocked(apiClient.get).mockRejectedValueOnce(notFoundError);

      const result = await listCameraDiagnostics();

      expect(result).toEqual([]);
    });

    it('should return empty array on 503 error', async () => {
      const unavailableError = new ApiError(503, 'Service unavailable', 'SERVICE_UNAVAILABLE');
      vi.mocked(apiClient.get).mockRejectedValueOnce(unavailableError);

      const result = await listCameraDiagnostics();

      expect(result).toEqual([]);
    });

    it('should throw on other errors', async () => {
      const genericError = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValueOnce(genericError);

      await expect(listCameraDiagnostics()).rejects.toThrow('Network error');
    });
  });

  describe('cameraDiagnosticsApi object', () => {
    it('should expose get method', () => {
      expect(cameraDiagnosticsApi.get).toBe(getCameraDiagnostics);
    });

    it('should expose list method', () => {
      expect(cameraDiagnosticsApi.list).toBe(listCameraDiagnostics);
    });
  });
});
