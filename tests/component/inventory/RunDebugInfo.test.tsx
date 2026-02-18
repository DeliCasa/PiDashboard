/**
 * RunDebugInfo Component Tests
 * Feature: 055-session-review-drilldown (T023)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunDebugInfo } from '@/presentation/components/inventory/RunDebugInfo';
import * as inventoryDelta from '@/infrastructure/api/inventory-delta';
import type { InventoryAnalysisRun } from '@/domain/types/inventory';

// Mock the inventory-delta module to control getLastRequestId
vi.mock('@/infrastructure/api/inventory-delta', () => ({
  getLastRequestId: vi.fn(() => 'req-test-123'),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);

function makeRun(overrides: Partial<InventoryAnalysisRun> = {}): InventoryAnalysisRun {
  return {
    run_id: 'run-debug-001',
    session_id: 'sess-debug-001',
    container_id: 'ctr-debug-001',
    status: 'done',
    items_before: null,
    items_after: null,
    delta: null,
    evidence: null,
    review: null,
    metadata: {
      provider: 'openai',
      processing_time_ms: 4200,
      model_version: 'gpt-4o-2024-08-06',
      error_message: null,
      created_at: '2026-02-18T10:00:00Z',
      completed_at: '2026-02-18T10:01:00Z',
    },
    ...overrides,
  };
}

beforeEach(() => {
  mockWriteText.mockClear();
  vi.mocked(inventoryDelta.getLastRequestId).mockReturnValue('req-test-123');
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText },
    writable: true,
    configurable: true,
  });
});

describe('RunDebugInfo', () => {
  it('renders collapsible container', () => {
    render(<RunDebugInfo run={makeRun()} />);
    expect(screen.getByTestId('debug-info')).toBeInTheDocument();
  });

  it('renders toggle button', () => {
    render(<RunDebugInfo run={makeRun()} />);
    expect(screen.getByTestId('debug-info-toggle')).toBeInTheDocument();
    expect(screen.getByText('Debug Info')).toBeInTheDocument();
  });

  it('starts collapsed (fields not visible)', () => {
    render(<RunDebugInfo run={makeRun()} />);
    // The copy buttons should not be visible when collapsed
    expect(screen.queryByTestId('debug-copy-run-id')).not.toBeInTheDocument();
  });

  it('expands on toggle click', async () => {
    const user = userEvent.setup();
    render(<RunDebugInfo run={makeRun()} />);

    await user.click(screen.getByTestId('debug-info-toggle'));

    expect(screen.getByTestId('debug-copy-run-id')).toBeInTheDocument();
    expect(screen.getByTestId('debug-copy-session-id')).toBeInTheDocument();
    expect(screen.getByTestId('debug-copy-container-id')).toBeInTheDocument();
    expect(screen.getByTestId('debug-copy-provider')).toBeInTheDocument();
    expect(screen.getByTestId('debug-copy-processing-time')).toBeInTheDocument();
    expect(screen.getByTestId('debug-copy-model-version')).toBeInTheDocument();
  });

  it('shows all metadata fields', async () => {
    const user = userEvent.setup();
    render(<RunDebugInfo run={makeRun()} />);

    await user.click(screen.getByTestId('debug-info-toggle'));

    expect(screen.getByText('run-debug-001')).toBeInTheDocument();
    expect(screen.getByText('sess-debug-001')).toBeInTheDocument();
    expect(screen.getByText('ctr-debug-001')).toBeInTheDocument();
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('4200ms')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o-2024-08-06')).toBeInTheDocument();
  });

  it('shows request_id when available', async () => {
    const user = userEvent.setup();
    render(<RunDebugInfo run={makeRun()} />);

    await user.click(screen.getByTestId('debug-info-toggle'));

    expect(screen.getByText('req-test-123')).toBeInTheDocument();
    expect(screen.getByTestId('debug-copy-request-id')).toBeInTheDocument();
  });

  it('hides request_id field when getLastRequestId returns undefined', async () => {
    vi.mocked(inventoryDelta.getLastRequestId).mockReturnValue(undefined);

    const user = userEvent.setup();
    render(<RunDebugInfo run={makeRun()} />);

    await user.click(screen.getByTestId('debug-info-toggle'));

    expect(screen.queryByTestId('debug-copy-request-id')).not.toBeInTheDocument();
  });

  it('copy button is rendered and clickable', async () => {
    const user = userEvent.setup();
    render(<RunDebugInfo run={makeRun()} />);

    await user.click(screen.getByTestId('debug-info-toggle'));

    const copyBtn = screen.getByTestId('debug-copy-run-id');
    expect(copyBtn).toBeInTheDocument();
    // Click the copy button — verifies it doesn't throw
    await user.click(copyBtn);
  });

  it('hides processing time when not available', async () => {
    const user = userEvent.setup();
    render(
      <RunDebugInfo
        run={makeRun({
          metadata: {
            provider: 'openai',
            created_at: '2026-02-18T10:00:00Z',
          },
        })}
      />
    );

    await user.click(screen.getByTestId('debug-info-toggle'));

    expect(screen.queryByTestId('debug-copy-processing-time')).not.toBeInTheDocument();
  });
});
