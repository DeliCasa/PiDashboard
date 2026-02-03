/**
 * Evidence Hooks Integration Tests
 * Feature: 038-dev-observability-panels (T047)
 *
 * Tests for useSessionEvidence hook with MSW.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '../mocks/server';
import {
  createDiagnosticsHandlers,
  diagnosticsErrorHandlers,
} from '../../mocks/handlers/diagnostics';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import { useSessionEvidence } from '@/application/hooks/useEvidence';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useSessionEvidence Hook', () => {
  it('should fetch evidence for a session', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSessionEvidence('sess-12345'), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have evidence
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBeGreaterThanOrEqual(0);
  });

  it('should not fetch when sessionId is null', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSessionEvidence(null), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should not fetch when disabled', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSessionEvidence('sess-12345', { enabled: false }),
      { wrapper }
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should return empty array when no evidence', async () => {
    server.use(diagnosticsErrorHandlers.evidenceEmpty);

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSessionEvidence('sess-12345'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should keep previous data while refetching', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSessionEvidence('sess-12345'), { wrapper });

    // Wait for initial data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Trigger refetch
    result.current.refetch();

    // Should keep previous data as placeholder
    expect(result.current.data).toBeDefined();
  });
});
