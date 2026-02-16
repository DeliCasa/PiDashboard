/**
 * Inventory Delta API Client Unit Tests
 * Feature: 047-inventory-delta-viewer (T010)
 *
 * Tests the inventoryDeltaApi methods with MSW mocked endpoints.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { inventoryDeltaApi } from '@/infrastructure/api/inventory-delta';
import { V1ApiError } from '@/infrastructure/api/errors';
import {
  mockInventoryRunNeedsReview,
  mockInventoryRunPending,
  mockInventoryNotFoundResponse,
  mockInventoryServiceUnavailableResponse,
  mockReviewSuccessResponse,
  mockReviewConflictResponse,
  mockReviewInvalidResponse,
  mockRunListResponse,
} from '../../mocks/inventory-delta-fixtures';

const BASE_URL = '/api';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ============================================================================
// getLatest
// ============================================================================

describe('inventoryDeltaApi.getLatest', () => {
  it('returns validated data on success', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/latest`, () => {
        return HttpResponse.json({
          success: true,
          data: mockInventoryRunNeedsReview,
          timestamp: new Date().toISOString(),
        });
      })
    );

    const result = await inventoryDeltaApi.getLatest('test-container-id');

    expect(result).not.toBeNull();
    expect(result!.run_id).toBe(mockInventoryRunNeedsReview.run_id);
    expect(result!.status).toBe('needs_review');
    expect(result!.delta).toHaveLength(2);
  });

  it('returns pending data when analysis is in progress', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/latest`, () => {
        return HttpResponse.json({
          success: true,
          data: mockInventoryRunPending,
          timestamp: new Date().toISOString(),
        });
      })
    );

    const result = await inventoryDeltaApi.getLatest('test-container-id');

    expect(result).not.toBeNull();
    expect(result!.status).toBe('pending');
    expect(result!.delta).toBeNull();
  });

  it('returns null for INVENTORY_NOT_FOUND (404)', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/latest`, () => {
        return HttpResponse.json(mockInventoryNotFoundResponse, { status: 404 });
      })
    );

    const result = await inventoryDeltaApi.getLatest('test-container-id');
    expect(result).toBeNull();
  });

  it('throws V1ApiError for SERVICE_UNAVAILABLE (503)', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/latest`, () => {
        return HttpResponse.json(mockInventoryServiceUnavailableResponse, { status: 503 });
      })
    );

    await expect(
      inventoryDeltaApi.getLatest('test-container-id')
    ).rejects.toThrow();
  });

  it('throws on network error', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/latest`, () => {
        return HttpResponse.error();
      })
    );

    await expect(
      inventoryDeltaApi.getLatest('test-container-id')
    ).rejects.toThrow();
  });
});

// ============================================================================
// getBySession
// ============================================================================

describe('inventoryDeltaApi.getBySession', () => {
  it('returns validated data on success', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/sessions/:sessionId/inventory-delta`, () => {
        return HttpResponse.json({
          success: true,
          data: mockInventoryRunNeedsReview,
          timestamp: new Date().toISOString(),
        });
      })
    );

    const result = await inventoryDeltaApi.getBySession('test-session-id');

    expect(result).not.toBeNull();
    expect(result!.run_id).toBe(mockInventoryRunNeedsReview.run_id);
  });

  it('returns null for INVENTORY_NOT_FOUND', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/sessions/:sessionId/inventory-delta`, () => {
        return HttpResponse.json(mockInventoryNotFoundResponse, { status: 404 });
      })
    );

    const result = await inventoryDeltaApi.getBySession('test-session-id');
    expect(result).toBeNull();
  });
});

// ============================================================================
// submitReview
// ============================================================================

describe('inventoryDeltaApi.submitReview', () => {
  it('submits approve review successfully', async () => {
    server.use(
      http.post(`${BASE_URL}/v1/inventory/:runId/review`, () => {
        return HttpResponse.json(mockReviewSuccessResponse);
      })
    );

    const result = await inventoryDeltaApi.submitReview('test-run-id', {
      action: 'approve',
      corrections: [],
      notes: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('done');
  });

  it('submits override review with corrections', async () => {
    server.use(
      http.post(`${BASE_URL}/v1/inventory/:runId/review`, () => {
        return HttpResponse.json(mockReviewSuccessResponse);
      })
    );

    const result = await inventoryDeltaApi.submitReview('test-run-id', {
      action: 'override',
      corrections: [
        { name: 'Coca-Cola 330ml', sku: 'CC330', original_count: 3, corrected_count: 4 },
      ],
      notes: 'Adjusted count',
    });

    expect(result.success).toBe(true);
  });

  it('throws V1ApiError for REVIEW_CONFLICT (409)', async () => {
    server.use(
      http.post(`${BASE_URL}/v1/inventory/:runId/review`, () => {
        return HttpResponse.json(mockReviewConflictResponse, { status: 409 });
      })
    );

    try {
      await inventoryDeltaApi.submitReview('test-run-id', {
        action: 'approve',
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(V1ApiError);
      expect((error as V1ApiError).code).toBe('REVIEW_CONFLICT');
    }
  });

  it('throws V1ApiError for REVIEW_INVALID (400)', async () => {
    server.use(
      http.post(`${BASE_URL}/v1/inventory/:runId/review`, () => {
        return HttpResponse.json(mockReviewInvalidResponse, { status: 400 });
      })
    );

    try {
      await inventoryDeltaApi.submitReview('test-run-id', {
        action: 'override',
        corrections: [],
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(V1ApiError);
      expect((error as V1ApiError).code).toBe('REVIEW_INVALID');
    }
  });
});

// ============================================================================
// getRuns (Feature 048)
// ============================================================================

describe('inventoryDeltaApi.getRuns', () => {
  it('returns validated paginated data on success', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/runs`, () => {
        return HttpResponse.json(mockRunListResponse);
      })
    );

    const result = await inventoryDeltaApi.getRuns('test-container-id');

    expect(result).not.toBeNull();
    expect(result!.runs).toHaveLength(5);
    expect(result!.pagination.total).toBe(42);
    expect(result!.pagination.has_more).toBe(true);
  });

  it('passes filters as query parameters', async () => {
    let capturedUrl = '';
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/runs`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(mockRunListResponse);
      })
    );

    await inventoryDeltaApi.getRuns('test-container-id', {
      limit: 10,
      offset: 20,
      status: 'needs_review',
    });

    const url = new URL(capturedUrl);
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('offset')).toBe('20');
    expect(url.searchParams.get('status')).toBe('needs_review');
  });

  it('returns null for CONTAINER_NOT_FOUND (404)', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/runs`, () => {
        return HttpResponse.json({
          success: false,
          error: { code: 'CONTAINER_NOT_FOUND', message: 'Container not found.', retryable: false },
          timestamp: new Date().toISOString(),
        }, { status: 404 });
      })
    );

    const result = await inventoryDeltaApi.getRuns('nonexistent-id');
    expect(result).toBeNull();
  });

  it('throws V1ApiError for SERVICE_UNAVAILABLE (503)', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/runs`, () => {
        return HttpResponse.json({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Unavailable', retryable: true, retry_after_seconds: 30 },
          timestamp: new Date().toISOString(),
        }, { status: 503 });
      })
    );

    await expect(
      inventoryDeltaApi.getRuns('test-container-id')
    ).rejects.toThrow();
  });

  it('throws on network error', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/runs`, () => {
        return HttpResponse.error();
      })
    );

    await expect(
      inventoryDeltaApi.getRuns('test-container-id')
    ).rejects.toThrow();
  });

  it('omits undefined filters from query string', async () => {
    let capturedUrl = '';
    server.use(
      http.get(`${BASE_URL}/v1/containers/:containerId/inventory/runs`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(mockRunListResponse);
      })
    );

    await inventoryDeltaApi.getRuns('test-container-id', { limit: 5 });

    const url = new URL(capturedUrl);
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.has('offset')).toBe(false);
    expect(url.searchParams.has('status')).toBe(false);
  });
});
