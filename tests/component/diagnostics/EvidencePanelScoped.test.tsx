/**
 * EvidencePanel Container Scoping Tests
 * Feature: 046-opaque-container-identity (T020)
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Tests evidence filtering by active container's camera IDs.
 * Uses V1 CaptureEntry format with device_id instead of camera_id.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { EvidencePanel } from '@/presentation/components/diagnostics/EvidencePanel';
import { useActiveContainerStore } from '@/application/stores/activeContainer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { CaptureEntry } from '@/infrastructure/api/diagnostics-schemas';

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

// Small base64 stub
const STUB_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof';

// V1 CaptureEntry fixtures
const mockEvidence: CaptureEntry[] = [
  {
    evidence_id: 'ev-1',
    capture_tag: 'BEFORE_OPEN',
    status: 'captured',
    device_id: 'espcam-aaa001',
    container_id: 'ctr-session-1',
    session_id: 'session-1',
    created_at: '2026-01-01T00:00:00Z',
    image_data: STUB_BASE64,
    content_type: 'image/jpeg',
    image_size_bytes: 10000,
  },
  {
    evidence_id: 'ev-2',
    capture_tag: 'AFTER_CLOSE',
    status: 'captured',
    device_id: 'espcam-aaa001',
    container_id: 'ctr-session-1',
    session_id: 'session-1',
    created_at: '2026-01-01T00:01:00Z',
    image_data: STUB_BASE64,
    content_type: 'image/jpeg',
    image_size_bytes: 10000,
  },
  {
    evidence_id: 'ev-3',
    capture_tag: 'BEFORE_OPEN',
    status: 'captured',
    device_id: 'espcam-bbb002',
    container_id: 'ctr-session-1',
    session_id: 'session-1',
    created_at: '2026-01-01T00:02:00Z',
    image_data: STUB_BASE64,
    content_type: 'image/jpeg',
    image_size_bytes: 10000,
  },
  {
    evidence_id: 'ev-4',
    capture_tag: 'AFTER_CLOSE',
    status: 'captured',
    device_id: 'espcam-ccc003',
    container_id: 'ctr-session-1',
    session_id: 'session-1',
    created_at: '2026-01-01T00:03:00Z',
    image_data: STUB_BASE64,
    content_type: 'image/jpeg',
    image_size_bytes: 10000,
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

  it('filters evidence to container cameras (device_id) when container is active', () => {
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
