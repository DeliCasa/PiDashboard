/**
 * useRecoverableSessions Hook Integration Tests
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T039
 *
 * Tests for the session recovery hooks including:
 * - Fetching recoverable sessions
 * - Resume and discard mutations
 * - Session history
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useRecoverableSessions,
  useRecoveryMutations,
  useRecoverableSessionsWithMutations,
  useSessionHistory,
  recoveryKeys,
} from '@/application/hooks/useRecoverableSessions';
import * as sessionsModule from '@/infrastructure/api/sessions';
import type { BatchProvisioningSession } from '@/domain/types/provisioning';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/infrastructure/api/sessions', async (importOriginal) => {
  const original = await importOriginal<typeof sessionsModule>();
  return {
    ...original,
    sessionRecoveryApi: {
      getRecoverableSessions: vi.fn(),
      resumeSession: vi.fn(),
      discardSession: vi.fn(),
      getSessionHistory: vi.fn(),
    },
  };
});

// ============================================================================
// Test Setup
// ============================================================================

const mockSession1: BatchProvisioningSession = {
  id: 'sess_001',
  state: 'active',
  target_ssid: 'TargetNetwork1',
  created_at: '2026-01-10T10:00:00Z',
  updated_at: '2026-01-10T12:00:00Z',
  device_count: 5,
  provisioned_count: 3,
  verified_count: 2,
  failed_count: 0,
};

const mockSession2: BatchProvisioningSession = {
  id: 'sess_002',
  state: 'paused',
  target_ssid: 'TargetNetwork2',
  created_at: '2026-01-10T09:00:00Z',
  updated_at: '2026-01-10T11:00:00Z',
  device_count: 3,
  provisioned_count: 1,
  verified_count: 0,
  failed_count: 1,
};

const mockClosedSession: BatchProvisioningSession = {
  id: 'sess_003',
  state: 'closed',
  target_ssid: 'TargetNetwork3',
  created_at: '2026-01-09T10:00:00Z',
  updated_at: '2026-01-09T14:00:00Z',
  device_count: 4,
  provisioned_count: 4,
  verified_count: 4,
  failed_count: 0,
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useRecoverableSessions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClient();
  });

  // ============================================================================
  // Fetching Tests
  // ============================================================================

  describe('Fetching Recoverable Sessions', () => {
    it('should fetch recoverable sessions successfully', async () => {
      vi.mocked(sessionsModule.sessionRecoveryApi.getRecoverableSessions).mockResolvedValue({
        data: { sessions: [mockSession1, mockSession2] },
        status: 200,
        correlationId: 'test-123',
      });

      const { result } = renderHook(() => useRecoverableSessions(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.hasRecoverableSessions).toBe(true);
    });

    it('should return empty list when no recoverable sessions', async () => {
      vi.mocked(sessionsModule.sessionRecoveryApi.getRecoverableSessions).mockResolvedValue({
        data: { sessions: [] },
        status: 200,
        correlationId: 'test-123',
      });

      const { result } = renderHook(() => useRecoverableSessions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toHaveLength(0);
      expect(result.current.hasRecoverableSessions).toBe(false);
      expect(result.current.mostRecentSession).toBeNull();
    });

    it('should sort sessions by updated_at descending', async () => {
      vi.mocked(sessionsModule.sessionRecoveryApi.getRecoverableSessions).mockResolvedValue({
        data: { sessions: [mockSession2, mockSession1] }, // Out of order
        status: 200,
        correlationId: 'test-123',
      });

      const { result } = renderHook(() => useRecoverableSessions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should be sorted by updated_at descending
      expect(result.current.sessions[0].id).toBe('sess_001'); // More recent
      expect(result.current.sessions[1].id).toBe('sess_002');
    });

    it('should return most recent session', async () => {
      vi.mocked(sessionsModule.sessionRecoveryApi.getRecoverableSessions).mockResolvedValue({
        data: { sessions: [mockSession1, mockSession2] },
        status: 200,
        correlationId: 'test-123',
      });

      const { result } = renderHook(() => useRecoverableSessions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.mostRecentSession).toEqual(mockSession1);
    });

    it('should handle fetch error', async () => {
      vi.mocked(sessionsModule.sessionRecoveryApi.getRecoverableSessions).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useRecoverableSessions(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.errorMessage).toBe('Network error');
      expect(result.current.sessions).toHaveLength(0);
    });

    it('should not fetch when disabled', async () => {
      const { result } = renderHook(() => useRecoverableSessions({ enabled: false }), {
        wrapper: createWrapper(queryClient),
      });

      // Should not be loading since query is disabled
      expect(result.current.isLoading).toBe(false);
      expect(sessionsModule.sessionRecoveryApi.getRecoverableSessions).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Mutation Tests
  // ============================================================================

  describe('Recovery Mutations', () => {
    describe('resumeSession', () => {
      it('should resume a session successfully', async () => {
        vi.mocked(sessionsModule.sessionRecoveryApi.getRecoverableSessions).mockResolvedValue({
          data: { sessions: [mockSession1] },
          status: 200,
          correlationId: 'test-123',
        });
        vi.mocked(sessionsModule.sessionRecoveryApi.resumeSession).mockResolvedValue({
          data: {
            session: { ...mockSession1, state: 'active' },
            devices: [],
          },
          status: 200,
          correlationId: 'test-456',
        });

        const { result } = renderHook(() => useRecoveryMutations(), {
          wrapper: createWrapper(queryClient),
        });

        await act(async () => {
          await result.current.resumeSession.mutateAsync('sess_001');
        });

        expect(sessionsModule.sessionRecoveryApi.resumeSession).toHaveBeenCalledWith('sess_001');
      });

      it('should handle resume error', async () => {
        vi.mocked(sessionsModule.sessionRecoveryApi.resumeSession).mockRejectedValue(
          new Error('Session expired')
        );

        const { result } = renderHook(() => useRecoveryMutations(), {
          wrapper: createWrapper(queryClient),
        });

        await expect(
          act(async () => {
            await result.current.resumeSession.mutateAsync('sess_001');
          })
        ).rejects.toThrow('Session expired');

        // Wait for error state to be set
        await waitFor(() => {
          expect(result.current.resumeSession.error?.message).toBe('Session expired');
        });
      });
    });

    describe('discardSession', () => {
      it('should discard a session successfully', async () => {
        vi.mocked(sessionsModule.sessionRecoveryApi.getRecoverableSessions).mockResolvedValue({
          data: { sessions: [mockSession1] },
          status: 200,
          correlationId: 'test-123',
        });
        vi.mocked(sessionsModule.sessionRecoveryApi.discardSession).mockResolvedValue({
          data: { message: 'Session discarded' },
          status: 200,
          correlationId: 'test-456',
        });

        const { result } = renderHook(() => useRecoveryMutations(), {
          wrapper: createWrapper(queryClient),
        });

        await act(async () => {
          await result.current.discardSession.mutateAsync('sess_001');
        });

        expect(sessionsModule.sessionRecoveryApi.discardSession).toHaveBeenCalledWith('sess_001');
      });

      it('should optimistically remove session from list', async () => {
        vi.mocked(sessionsModule.sessionRecoveryApi.getRecoverableSessions).mockResolvedValue({
          data: { sessions: [mockSession1, mockSession2] },
          status: 200,
          correlationId: 'test-123',
        });
        vi.mocked(sessionsModule.sessionRecoveryApi.discardSession).mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({
            data: { message: 'Discarded' },
            status: 200,
            correlationId: 'test-456',
          }), 100))
        );

        // First, load the recoverable sessions
        const { result: sessionsResult } = renderHook(
          () => useRecoverableSessionsWithMutations(),
          { wrapper: createWrapper(queryClient) }
        );

        await waitFor(() => {
          expect(sessionsResult.current.isLoading).toBe(false);
        });

        expect(sessionsResult.current.sessions).toHaveLength(2);

        // Now discard one - should optimistically update
        act(() => {
          sessionsResult.current.discardSession.mutate('sess_001');
        });

        // Optimistic update should have removed the session
        await waitFor(() => {
          expect(sessionsResult.current.sessions).toHaveLength(1);
        });
      });
    });

    describe('isAnyPending', () => {
      it('should track pending state', async () => {
        let resolveResume: (value: unknown) => void;
        vi.mocked(sessionsModule.sessionRecoveryApi.resumeSession).mockImplementation(
          () => new Promise((resolve) => {
            resolveResume = resolve;
          })
        );

        const { result } = renderHook(() => useRecoveryMutations(), {
          wrapper: createWrapper(queryClient),
        });

        expect(result.current.isAnyPending).toBe(false);

        act(() => {
          result.current.resumeSession.mutate('sess_001');
        });

        // Should be pending immediately after mutation starts
        await waitFor(() => {
          expect(result.current.resumeSession.isPending).toBe(true);
        });
        expect(result.current.isAnyPending).toBe(true);

        // Resolve the promise
        act(() => {
          resolveResume!({
            data: { session: mockSession1, devices: [] },
            status: 200,
            correlationId: 'test-123',
          });
        });

        await waitFor(() => {
          expect(result.current.isAnyPending).toBe(false);
        });
      });
    });
  });

  // ============================================================================
  // Session History Tests
  // ============================================================================

  describe('useSessionHistory', () => {
    it('should fetch session history', async () => {
      vi.mocked(sessionsModule.sessionRecoveryApi.getSessionHistory).mockResolvedValue({
        data: { sessions: [mockSession1, mockClosedSession] },
        status: 200,
        correlationId: 'test-123',
      });

      const { result } = renderHook(() => useSessionHistory(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toHaveLength(2);
      expect(sessionsModule.sessionRecoveryApi.getSessionHistory).toHaveBeenCalledWith(10);
    });

    it('should respect limit option', async () => {
      vi.mocked(sessionsModule.sessionRecoveryApi.getSessionHistory).mockResolvedValue({
        data: { sessions: [mockSession1] },
        status: 200,
        correlationId: 'test-123',
      });

      const { result } = renderHook(() => useSessionHistory({ limit: 5 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(sessionsModule.sessionRecoveryApi.getSessionHistory).toHaveBeenCalledWith(5);
    });

    it('should handle history fetch error', async () => {
      vi.mocked(sessionsModule.sessionRecoveryApi.getSessionHistory).mockRejectedValue(
        new Error('Failed to fetch history')
      );

      const { result } = renderHook(() => useSessionHistory(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.sessions).toHaveLength(0);
    });
  });

  // ============================================================================
  // Query Keys Tests
  // ============================================================================

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(recoveryKeys.all).toEqual(['session-recovery']);
      expect(recoveryKeys.recoverable()).toEqual(['session-recovery', 'recoverable']);
      expect(recoveryKeys.history(10)).toEqual(['session-recovery', 'history', 10]);
      expect(recoveryKeys.history()).toEqual(['session-recovery', 'history', undefined]);
    });
  });

  // ============================================================================
  // Combined Hook Tests
  // ============================================================================

  describe('useRecoverableSessionsWithMutations', () => {
    it('should combine query and mutations', async () => {
      vi.mocked(sessionsModule.sessionRecoveryApi.getRecoverableSessions).mockResolvedValue({
        data: { sessions: [mockSession1] },
        status: 200,
        correlationId: 'test-123',
      });

      const { result } = renderHook(() => useRecoverableSessionsWithMutations(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have query results
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.hasRecoverableSessions).toBe(true);

      // Should have mutations
      expect(result.current.resumeSession).toBeDefined();
      expect(result.current.discardSession).toBeDefined();
      expect(result.current.isAnyPending).toBe(false);
    });
  });
});
