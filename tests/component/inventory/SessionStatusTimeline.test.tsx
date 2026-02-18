/**
 * SessionStatusTimeline Component Tests
 * Feature: 055-session-review-drilldown (T008)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionStatusTimeline } from '@/presentation/components/inventory/SessionStatusTimeline';
import { deriveTimelineSteps } from '@/presentation/components/inventory/timeline-utils';
import type { InventoryAnalysisRun } from '@/domain/types/inventory';

// ============================================================================
// Test Data Factory
// ============================================================================

function makeRun(overrides: Partial<InventoryAnalysisRun> = {}): InventoryAnalysisRun {
  return {
    run_id: 'run-001',
    session_id: 'sess-001',
    container_id: 'ctr-001',
    status: 'done',
    items_before: null,
    items_after: null,
    delta: null,
    evidence: null,
    review: null,
    metadata: {
      provider: 'test-provider',
      processing_time_ms: 1234,
      model_version: 'v1.0',
      error_message: null,
      created_at: '2026-02-18T10:00:00Z',
      completed_at: '2026-02-18T10:01:00Z',
    },
    ...overrides,
  };
}

// ============================================================================
// deriveTimelineSteps unit tests
// ============================================================================

describe('deriveTimelineSteps', () => {
  it('returns correct steps for pending status', () => {
    const steps = deriveTimelineSteps(makeRun({ status: 'pending' }));
    expect(steps).toEqual([
      { label: 'Created', status: 'completed' },
      { label: 'Capture', status: 'active' },
      { label: 'Analysis', status: 'upcoming' },
      { label: 'Delta Ready', status: 'upcoming' },
      { label: 'Finalized', status: 'upcoming' },
    ]);
  });

  it('returns correct steps for processing status', () => {
    const steps = deriveTimelineSteps(makeRun({ status: 'processing' }));
    expect(steps).toEqual([
      { label: 'Created', status: 'completed' },
      { label: 'Capture', status: 'completed' },
      { label: 'Analysis', status: 'active' },
      { label: 'Delta Ready', status: 'upcoming' },
      { label: 'Finalized', status: 'upcoming' },
    ]);
  });

  it('returns correct steps for done without review', () => {
    const steps = deriveTimelineSteps(makeRun({ status: 'done', review: null }));
    expect(steps).toEqual([
      { label: 'Created', status: 'completed' },
      { label: 'Capture', status: 'completed' },
      { label: 'Analysis', status: 'completed' },
      { label: 'Delta Ready', status: 'active' },
      { label: 'Finalized', status: 'upcoming' },
    ]);
  });

  it('returns correct steps for done with review (finalized)', () => {
    const steps = deriveTimelineSteps(
      makeRun({
        status: 'done',
        review: {
          reviewer_id: 'op-1',
          action: 'approve',
          corrections: [],
          notes: null,
          reviewed_at: '2026-02-18T11:00:00Z',
        },
      })
    );
    expect(steps).toEqual([
      { label: 'Created', status: 'completed' },
      { label: 'Capture', status: 'completed' },
      { label: 'Analysis', status: 'completed' },
      { label: 'Delta Ready', status: 'completed' },
      { label: 'Finalized', status: 'completed' },
    ]);
  });

  it('returns correct steps for needs_review without review', () => {
    const steps = deriveTimelineSteps(makeRun({ status: 'needs_review', review: null }));
    expect(steps).toEqual([
      { label: 'Created', status: 'completed' },
      { label: 'Capture', status: 'completed' },
      { label: 'Analysis', status: 'completed' },
      { label: 'Delta Ready', status: 'active' },
      { label: 'Finalized', status: 'upcoming' },
    ]);
  });

  it('returns correct steps for error status', () => {
    const steps = deriveTimelineSteps(makeRun({ status: 'error' }));
    expect(steps).toEqual([
      { label: 'Created', status: 'completed' },
      { label: 'Capture', status: 'completed' },
      { label: 'Analysis', status: 'error' },
      { label: 'Delta Ready', status: 'upcoming' },
      { label: 'Finalized', status: 'upcoming' },
    ]);
  });
});

// ============================================================================
// Component render tests
// ============================================================================

describe('SessionStatusTimeline', () => {
  it('renders timeline container', () => {
    render(<SessionStatusTimeline run={makeRun()} />);
    expect(screen.getByTestId('session-timeline')).toBeInTheDocument();
  });

  it('renders all 5 step elements', () => {
    render(<SessionStatusTimeline run={makeRun()} />);
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`timeline-step-${i}`)).toBeInTheDocument();
    }
  });

  it('renders step labels', () => {
    render(<SessionStatusTimeline run={makeRun()} />);
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Capture')).toBeInTheDocument();
    expect(screen.getByText('Analysis')).toBeInTheDocument();
    expect(screen.getByText('Delta Ready')).toBeInTheDocument();
    expect(screen.getByText('Finalized')).toBeInTheDocument();
  });

  it('renders for pending status', () => {
    render(<SessionStatusTimeline run={makeRun({ status: 'pending' })} />);
    expect(screen.getByTestId('session-timeline')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('renders for processing status', () => {
    render(<SessionStatusTimeline run={makeRun({ status: 'processing' })} />);
    expect(screen.getByTestId('session-timeline')).toBeInTheDocument();
  });

  it('renders for error status', () => {
    render(<SessionStatusTimeline run={makeRun({ status: 'error' })} />);
    expect(screen.getByTestId('session-timeline')).toBeInTheDocument();
  });

  it('renders finalized state when done with review', () => {
    render(
      <SessionStatusTimeline
        run={makeRun({
          status: 'done',
          review: {
            reviewer_id: 'op-1',
            action: 'approve',
            corrections: [],
            notes: null,
            reviewed_at: '2026-02-18T11:00:00Z',
          },
        })}
      />
    );
    expect(screen.getByTestId('session-timeline')).toBeInTheDocument();
  });
});
