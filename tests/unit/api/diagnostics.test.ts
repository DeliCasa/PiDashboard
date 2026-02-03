/**
 * Diagnostics API Client Unit Tests
 * Feature: 038-dev-observability-panels (T013)
 *
 * Tests for diagnostics API client functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { diagnosticsApi } from '@/infrastructure/api/diagnostics';
import { apiClient } from '@/infrastructure/api/client';
import {
  bridgeServerHealthyApiResponse,
  bridgeServerNotReadyApiResponse,
  storageHealthyApiResponse,
  storageUnhealthyApiResponse,
} from '../../mocks/diagnostics/health-fixtures';

// Mock the apiClient
vi.mock('@/infrastructure/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  isFeatureUnavailable: vi.fn((error) => {
    return error?.status === 404 || error?.status === 503;
  }),
}));

describe('Diagnostics API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock performance.now for response time calculations
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBridgeServerHealth', () => {
    it('should return healthy status on successful response', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(bridgeServerHealthyApiResponse);
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(50);

      const result = await diagnosticsApi.getBridgeServerHealth();

      expect(apiClient.get).toHaveBeenCalledWith('/dashboard/diagnostics/bridgeserver');
      expect(result.service_name).toBe('bridgeserver');
      expect(result.status).toBe('healthy');
      expect(result.response_time_ms).toBe(50);
      expect(result.checks).toEqual(bridgeServerHealthyApiResponse.checks);
    });

    it('should return degraded status for not_ready response', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(bridgeServerNotReadyApiResponse);

      const result = await diagnosticsApi.getBridgeServerHealth();

      expect(result.status).toBe('degraded');
      expect(result.checks?.storage?.status).toBe('error');
    });

    it('should return unhealthy status on API error', async () => {
      const error = new Error('Connection refused');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      const result = await diagnosticsApi.getBridgeServerHealth();

      expect(result.service_name).toBe('bridgeserver');
      expect(result.status).toBe('unhealthy');
      expect(result.error_message).toBe('Connection refused');
    });

    it('should return unknown status on 404/503 errors', async () => {
      const error = { status: 404, message: 'Not found' };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      const result = await diagnosticsApi.getBridgeServerHealth();

      expect(result.status).toBe('unknown');
      expect(result.error_message).toBe('Health endpoint not available');
    });

    it('should handle invalid response schema', async () => {
      const invalidResponse = { invalid: 'data' };
      vi.mocked(apiClient.get).mockResolvedValueOnce(invalidResponse);

      const result = await diagnosticsApi.getBridgeServerHealth();

      expect(result.status).toBe('unknown');
      expect(result.error_message).toContain('Invalid response');
    });
  });

  describe('getPiOrchestratorHealth', () => {
    it('should return healthy status on successful system info response', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ cpu_percent: 50 });
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(15);

      const result = await diagnosticsApi.getPiOrchestratorHealth();

      expect(apiClient.get).toHaveBeenCalledWith('/system/info');
      expect(result.service_name).toBe('piorchestrator');
      expect(result.status).toBe('healthy');
      expect(result.response_time_ms).toBe(15);
    });

    it('should return unhealthy status on API error', async () => {
      const error = new Error('Timeout');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      const result = await diagnosticsApi.getPiOrchestratorHealth();

      expect(result.service_name).toBe('piorchestrator');
      expect(result.status).toBe('unhealthy');
      expect(result.error_message).toBe('Timeout');
    });

    it('should return unknown status on 503 error', async () => {
      const error = { status: 503, message: 'Service unavailable' };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      const result = await diagnosticsApi.getPiOrchestratorHealth();

      expect(result.status).toBe('unknown');
    });
  });

  describe('getMinioHealth', () => {
    it('should return healthy status on successful response', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(storageHealthyApiResponse);
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(25);

      const result = await diagnosticsApi.getMinioHealth();

      expect(apiClient.get).toHaveBeenCalledWith('/dashboard/diagnostics/minio');
      expect(result.service_name).toBe('minio');
      expect(result.status).toBe('healthy');
      expect(result.response_time_ms).toBe(25);
      expect(result.checks).toHaveProperty('delicasa-images');
    });

    it('should return unhealthy status on storage error', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(storageUnhealthyApiResponse);

      const result = await diagnosticsApi.getMinioHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error_message).toBe('Connection refused');
    });

    it('should return unhealthy status on API error', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      const result = await diagnosticsApi.getMinioHealth();

      expect(result.service_name).toBe('minio');
      expect(result.status).toBe('unhealthy');
      expect(result.error_message).toBe('Network error');
    });
  });

  describe('getAllHealthChecks', () => {
    it('should return all service health checks in parallel', async () => {
      vi.mocked(apiClient.get)
        .mockResolvedValueOnce(bridgeServerHealthyApiResponse)
        .mockResolvedValueOnce({ cpu_percent: 50 })
        .mockResolvedValueOnce(storageHealthyApiResponse);

      const result = await diagnosticsApi.getAllHealthChecks();

      expect(result.services).toHaveLength(3);
      expect(result.services.map((s) => s.service_name)).toEqual([
        'bridgeserver',
        'piorchestrator',
        'minio',
      ]);
      expect(result.last_refresh).toBeDefined();
    });

    it('should include unhealthy services in results', async () => {
      vi.mocked(apiClient.get)
        .mockResolvedValueOnce(bridgeServerHealthyApiResponse)
        .mockRejectedValueOnce(new Error('PiOrchestrator down'))
        .mockResolvedValueOnce(storageUnhealthyApiResponse);

      const result = await diagnosticsApi.getAllHealthChecks();

      expect(result.services).toHaveLength(3);

      const piOrchestratorHealth = result.services.find(
        (s) => s.service_name === 'piorchestrator'
      );
      expect(piOrchestratorHealth?.status).toBe('unhealthy');

      const minioHealth = result.services.find((s) => s.service_name === 'minio');
      expect(minioHealth?.status).toBe('unhealthy');
    });

    it('should handle all services failing gracefully', async () => {
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('BridgeServer error'))
        .mockRejectedValueOnce(new Error('PiOrchestrator error'))
        .mockRejectedValueOnce(new Error('MinIO error'));

      const result = await diagnosticsApi.getAllHealthChecks();

      expect(result.services).toHaveLength(3);
      expect(result.services.every((s) => s.status === 'unhealthy')).toBe(true);
    });
  });
});
