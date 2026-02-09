/**
 * EvidencePanel Container Scoping Tests
 * Feature: 046-opaque-container-identity (T020)
 *
 * Tests evidence filtering by active container's camera IDs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { EvidencePanel } from '@/presentation/components/diagnostics/EvidencePanel';
import { useActiveContainerStore } from '@/application/stores/activeContainer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the evidence hook
vi.mock('@/application/hooks/useEvidence', () => ({
  useSessionEvidence: vi.fn(),
  useInvalidateEvidence: vi.fn(() => ({ invalidate: vi.fn() })),
}));

// Mock useContainers to control container camera IDs
vi.mock('@/application/hooks/useContainers', () => ({
  useContainerCameraIds: vi.fn(),
  useContainers: vi.fn(() => ({ data: [], isLoading: false })),
}));

import { useSessionEvidence } from '@/application/hooks/useEvidence';
import { useContainerCameraIds } from '@/application/hooks/useContainers';

const mockEvidence = [
  {
    id: 'ev-1',
    session_id: 'session-1',
    captured_at: '2026-01-01T00:00:00Z',
    camera_id: 'espcam-aaa001',
    thumbnail_url: 'https://example.com/thumb/1',
    full_url: 'https://example.com/full/1',
    expires_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'ev-2',
    session_id: 'session-1',
    captured_at: '2026-01-01T00:01:00Z',
    camera_id: 'espcam-aaa001',
    thumbnail_url: 'https://example.com/thumb/2',
    full_url: 'https://example.com/full/2',
    expires_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'ev-3',
    session_id: 'session-1',
    captured_at: '2026-01-01T00:02:00Z',
    camera_id: 'espcam-bbb002',
    thumbnail_url: 'https://example.com/thumb/3',
    full_url: 'https://example.com/full/3',
    expires_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'ev-4',
    session_id: 'session-1',
    captured_at: '2026-01-01T00:03:00Z',
    camera_id: 'espcam-ccc003',
    thumbnail_url: 'https://example.com/thumb/4',
    full_url: 'https://example.com/full/4',
    expires_at: '2026-01-02T00:00:00Z',
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function renderPanel() {
  return render(
    React.createElement(
      createWrapper(),
      null,
      React.createElement(EvidencePanel, { sessionId: 'session-1' })
    )
  );
}

describe('EvidencePanel - Container Scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useActiveContainerStore.setState({ activeContainerId: null });
    });

    vi.mocked(useSessionEvidence).mockReturnValue({
      data: mockEvidence,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useSessionEvidence>);
  });

  it('shows all evidence when no container is selected (null)', () => {
    vi.mocked(useContainerCameraIds).mockReturnValue(null);

    renderPanel();

    expect(screen.getByTestId('evidence-grid')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-count')).toHaveTextContent('(4)');
  });

  it('filters evidence to container cameras when container is active', () => {
    // Container has only espcam-aaa001
    vi.mocked(useContainerCameraIds).mockReturnValue(new Set(['espcam-aaa001']));

    renderPanel();

    expect(screen.getByTestId('evidence-grid')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-count')).toHaveTextContent('(2)');
  });

  it('filters evidence to multiple container cameras', () => {
    // Container has espcam-aaa001 and espcam-bbb002
    vi.mocked(useContainerCameraIds).mockReturnValue(
      new Set(['espcam-aaa001', 'espcam-bbb002'])
    );

    renderPanel();

    expect(screen.getByTestId('evidence-grid')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-count')).toHaveTextContent('(3)');
  });

  it('shows scoped-empty state when container has no matching evidence', () => {
    // Container has camera with no evidence
    vi.mocked(useContainerCameraIds).mockReturnValue(new Set(['espcam-zzz999']));

    renderPanel();

    expect(screen.getByTestId('evidence-scoped-empty')).toBeInTheDocument();
    expect(screen.getByText('No evidence from this container\'s cameras')).toBeInTheDocument();
  });

  it('shows empty state when there is no evidence at all', () => {
    vi.mocked(useContainerCameraIds).mockReturnValue(null);
    vi.mocked(useSessionEvidence).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useSessionEvidence>);

    renderPanel();

    expect(screen.getByTestId('evidence-empty')).toBeInTheDocument();
    expect(screen.getByText('No evidence captures yet')).toBeInTheDocument();
  });

  it('updates displayed evidence when container scope changes', () => {
    // Initially no container selected
    const { rerender } = render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(EvidencePanel, { sessionId: 'session-1' })
      )
    );

    vi.mocked(useContainerCameraIds).mockReturnValue(null);

    // Should show all 4
    expect(screen.getByTestId('evidence-count')).toHaveTextContent('(4)');

    // Now switch to container with 1 camera
    vi.mocked(useContainerCameraIds).mockReturnValue(new Set(['espcam-ccc003']));

    rerender(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(EvidencePanel, { sessionId: 'session-1' })
      )
    );

    expect(screen.getByTestId('evidence-count')).toHaveTextContent('(1)');
  });
});
