/**
 * Inventory Delta Hooks Integration Tests
 * Feature: 047-inventory-delta-viewer (T011)
 *
 * Tests useLatestInventory, useSessionDelta, and useSubmitReview
 * hooks with MSW-mocked API endpoints.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import {
  useLatestInventory,
  useSessionDelta,
  useSubmitReview,
  useInventoryRuns,
  useSessionLookup,
} from '@/application/hooks/useInventoryDelta';
import {
  createInventoryDeltaHandlers,
} from '../mocks/handlers';
import {
  mockInventoryRunNeedsReview,
  mockInventoryRunPending,
  mockInventoryNotFoundResponse,
  mockReviewSuccessResponse,
  mockReviewConflictResponse,
  mockRunListResponse,
} from '../../mocks/inventory-delta-fixtures';

// Setup MSW server with inventory handlers
const server = setupServer(...createInventoryDeltaHandlers());

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ============================================================================
// useLatestInventory
// ============================================================================

describe('useLatestInventory', () => {
  it('fetches latest inventory for a container', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useLatestInventory('test-container-id'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.run_id).toBe(mockInventoryRunNeedsReview.run_id);
    expect(result.current.data?.status).toBe('needs_review');
  });

  it('does not fetch when containerId is null', () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useLatestInventory(null),
      { wrapper }
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('does not fetch when disabled', () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useLatestInventory('test-id', false),
      { wrapper }
    );

    expect(result.current.isFetching).toBe(false);
  });

  it('returns null data for 404 (no inventory)', async () => {
    server.use(
      http.get('/api/v1/containers/:containerId/inventory/latest', () => {
        return HttpResponse.json(mockInventoryNotFoundResponse, { status: 404 });
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useLatestInventory('missing-container'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it('handles pending analysis data', async () => {
    server.use(
      ...createInventoryDeltaHandlers({ latestRun: mockInventoryRunPending })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useLatestInventory('test-container-id'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.status).toBe('pending');
    expect(result.current.data?.delta).toBeNull();
  });

  it('handles network errors', async () => {
    server.use(
      http.get('/api/v1/containers/:containerId/inventory/latest', () => {
        return HttpResponse.error();
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useLatestInventory('test-container-id'),
      { wrapper }
    );

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 15_000 }
    );
  }, 20_000);
});

// ============================================================================
// useSessionDelta
// ============================================================================

describe('useSessionDelta', () => {
  it('fetches delta for a specific session', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSessionDelta('test-session-id'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.run_id).toBe(mockInventoryRunNeedsReview.run_id);
  });

  it('does not fetch when sessionId is null', () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSessionDelta(null),
      { wrapper }
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});

// ============================================================================
// useSubmitReview
// ============================================================================

describe('useSubmitReview', () => {
  it('submits approve review and returns success', async () => {
    server.use(
      http.post('/api/v1/inventory/:runId/review', () => {
        return HttpResponse.json(mockReviewSuccessResponse);
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSubmitReview('test-run-id'),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({
        action: 'approve',
        corrections: [],
        notes: '',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('submits override review with corrections', async () => {
    server.use(
      http.post('/api/v1/inventory/:runId/review', () => {
        return HttpResponse.json(mockReviewSuccessResponse);
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSubmitReview('test-run-id'),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({
        action: 'override',
        corrections: [
          { name: 'Test', original_count: 3, corrected_count: 4 },
        ],
        notes: 'Fixed count',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('handles review conflict error', async () => {
    server.use(
      http.post('/api/v1/inventory/:runId/review', () => {
        return HttpResponse.json(mockReviewConflictResponse, { status: 409 });
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSubmitReview('test-run-id'),
      { wrapper }
    );

    try {
      await act(async () => {
        await result.current.mutateAsync({
          action: 'approve',
        });
      });
      expect.fail('Should have thrown');
    } catch {
      // Expected - mutation error
    }

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// ============================================================================
// useInventoryRuns (Feature 048)
// ============================================================================

describe('useInventoryRuns', () => {
  it('fetches paginated run list for a container', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useInventoryRuns('test-container-id'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.runs.length).toBeGreaterThan(0);
    expect(result.current.data!.pagination).toBeDefined();
  });

  it('does not fetch when containerId is null', () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useInventoryRuns(null),
      { wrapper }
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('does not fetch when disabled', () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useInventoryRuns('test-container-id', undefined, false),
      { wrapper }
    );

    expect(result.current.isFetching).toBe(false);
  });

  it('passes filters to API', async () => {
    let capturedUrl = '';
    server.use(
      http.get('/api/v1/containers/:containerId/inventory/runs', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(mockRunListResponse);
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useInventoryRuns('test-container-id', { limit: 10, offset: 5, status: 'needs_review' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const url = new URL(capturedUrl);
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('offset')).toBe('5');
    expect(url.searchParams.get('status')).toBe('needs_review');
  });

  it('handles network errors', async () => {
    server.use(
      http.get('/api/v1/containers/:containerId/inventory/runs', () => {
        return HttpResponse.error();
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useInventoryRuns('test-container-id'),
      { wrapper }
    );

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 15_000 }
    );
  }, 20_000);
});

// ============================================================================
// useSessionLookup (Feature 048)
// ============================================================================

describe('useSessionLookup', () => {
  it('returns run data for a valid session ID', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSessionLookup(),
      { wrapper }
    );

    await act(async () => {
      await result.current.lookup('test-session-id');
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.run_id).toBe(mockInventoryRunNeedsReview.run_id);
    expect(result.current.isError).toBe(false);
  });

  it('returns error for non-existent session', async () => {
    server.use(
      http.get('/api/v1/sessions/:sessionId/inventory-delta', () => {
        return HttpResponse.json(
          {
            success: false,
            error: { code: 'INVENTORY_NOT_FOUND', message: 'Not found' },
          },
          { status: 404 }
        );
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSessionLookup(),
      { wrapper }
    );

    await act(async () => {
      await result.current.lookup('nonexistent-id');
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('No inventory analysis found for this session');
  });

  it('trims whitespace from input', async () => {
    let capturedSessionId = '';
    server.use(
      http.get('/api/v1/sessions/:sessionId/inventory-delta', ({ params }) => {
        capturedSessionId = params['sessionId'] as string;
        return HttpResponse.json({
          success: true,
          data: mockInventoryRunNeedsReview,
          timestamp: new Date().toISOString(),
        });
      })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSessionLookup(),
      { wrapper }
    );

    await act(async () => {
      await result.current.lookup('  test-session-id  ');
    });

    expect(capturedSessionId).toBe('test-session-id');
    expect(result.current.data).not.toBeNull();
  });

  it('returns error for empty input', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSessionLookup(),
      { wrapper }
    );

    await act(async () => {
      await result.current.lookup('');
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('Please enter a session ID');
    expect(result.current.data).toBeNull();
  });

  it('resets state via reset()', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSessionLookup(),
      { wrapper }
    );

    // Trigger an error
    await act(async () => {
      await result.current.lookup('');
    });

    expect(result.current.isError).toBe(true);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });
});
