/**
 * Sessions Hooks Integration Tests
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Tests for useSessions/useSession hooks with MSW.
 * V1 changes: session_id (not id), V1 endpoint URLs,
 * useSession now filters from list endpoint (no separate detail endpoint).
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '../mocks/server';
import {
  createDiagnosticsHandlers,
  diagnosticsErrorHandlers,
} from '../../mocks/handlers/diagnostics';
import { createWrapper, createTestQueryClient } from '../../setup/test-utils';
import {
  useSessions,
  useSession,
} from '@/application/hooks/useSessions';
import { activeSessionRecent } from '../../mocks/diagnostics/session-fixtures';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useSessions Hook', () => {
  it('should fetch active sessions', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSessions(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have sessions
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBeGreaterThan(0);
  });

  it('should not fetch when disabled', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSessions({ enabled: false }), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should return empty array when sessions endpoint unavailable', async () => {
    server.use(...diagnosticsErrorHandlers.sessionsUnavailable);

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should gracefully return empty array
    expect(result.current.data).toEqual([]);
  });

  it('should return empty array when no sessions', async () => {
    server.use(diagnosticsErrorHandlers.sessionsEmpty);

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should add is_stale flag to sessions', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Every session should have is_stale property
    result.current.data?.forEach((session) => {
      expect(session).toHaveProperty('is_stale');
    });
  });

  it('should keep previous data while refetching', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSessions(), { wrapper });

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

describe('useSession Hook', () => {
  it('should fetch session by session_id from list endpoint', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(
      () => useSession(activeSessionRecent.session_id),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // V1: session_id field (not id)
    expect(result.current.data?.session_id).toBe(activeSessionRecent.session_id);
    expect(result.current.data).toHaveProperty('is_stale');
  });

  it('should not fetch when sessionId is null', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSession(null), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should not fetch when disabled', async () => {
    server.use(...createDiagnosticsHandlers());

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSession('sess-12345', false), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should return null for non-existent session', async () => {
    server.use(diagnosticsErrorHandlers.sessionNotFound);

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSession('nonexistent'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});
