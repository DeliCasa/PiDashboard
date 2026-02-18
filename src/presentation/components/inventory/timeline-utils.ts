/**
 * Timeline Step Derivation Utility
 * Feature: 055-session-review-drilldown
 *
 * Extracted from SessionStatusTimeline to satisfy fast-refresh
 * (component files should only export components).
 */

import type { InventoryAnalysisRun } from '@/domain/types/inventory';

export type StepStatus = 'completed' | 'active' | 'error' | 'upcoming';

export interface TimelineStep {
  label: string;
  status: StepStatus;
}

export function deriveTimelineSteps(run: InventoryAnalysisRun): TimelineStep[] {
  const hasReview = run.review !== null && run.review !== undefined;

  switch (run.status) {
    case 'pending':
      return [
        { label: 'Created', status: 'completed' },
        { label: 'Capture', status: 'active' },
        { label: 'Analysis', status: 'upcoming' },
        { label: 'Delta Ready', status: 'upcoming' },
        { label: 'Finalized', status: 'upcoming' },
      ];
    case 'processing':
      return [
        { label: 'Created', status: 'completed' },
        { label: 'Capture', status: 'completed' },
        { label: 'Analysis', status: 'active' },
        { label: 'Delta Ready', status: 'upcoming' },
        { label: 'Finalized', status: 'upcoming' },
      ];
    case 'done':
    case 'needs_review':
      return [
        { label: 'Created', status: 'completed' },
        { label: 'Capture', status: 'completed' },
        { label: 'Analysis', status: 'completed' },
        { label: 'Delta Ready', status: hasReview ? 'completed' : 'active' },
        { label: 'Finalized', status: hasReview ? 'completed' : 'upcoming' },
      ];
    case 'error':
      return [
        { label: 'Created', status: 'completed' },
        { label: 'Capture', status: 'completed' },
        { label: 'Analysis', status: 'error' },
        { label: 'Delta Ready', status: 'upcoming' },
        { label: 'Finalized', status: 'upcoming' },
      ];
    default:
      return [
        { label: 'Created', status: 'upcoming' },
        { label: 'Capture', status: 'upcoming' },
        { label: 'Analysis', status: 'upcoming' },
        { label: 'Delta Ready', status: 'upcoming' },
        { label: 'Finalized', status: 'upcoming' },
      ];
  }
}
