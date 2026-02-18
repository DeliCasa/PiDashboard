/**
 * SessionStatusTimeline Component
 * Feature: 055-session-review-drilldown (T007)
 *
 * 5-step visual lifecycle indicator for inventory analysis runs.
 * Derives step states from AnalysisStatus + review presence.
 */

import { CheckCircle2, Circle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deriveTimelineSteps } from './timeline-utils';
import type { StepStatus } from './timeline-utils';
import type { InventoryAnalysisRun } from '@/domain/types/inventory';

// ============================================================================
// Sub-components
// ============================================================================

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    case 'active':
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-destructive" />;
    case 'upcoming':
      return <Circle className="h-5 w-5 text-muted-foreground/40" />;
  }
}

function Connector({ status }: { status: 'completed' | 'active' | 'upcoming' }) {
  return (
    <div
      className={cn(
        'h-0.5 flex-1',
        status === 'completed' && 'bg-green-600 dark:bg-green-400',
        status === 'active' && 'bg-primary/50',
        status === 'upcoming' && 'border-t border-dashed border-muted-foreground/30'
      )}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface SessionStatusTimelineProps {
  run: InventoryAnalysisRun;
}

export function SessionStatusTimeline({ run }: SessionStatusTimelineProps) {
  const steps = deriveTimelineSteps(run);

  return (
    <div data-testid="session-timeline" className="flex items-center gap-1 py-3">
      {steps.map((step, index) => {
        // Connector before this step (not before the first)
        const connectorStatus: 'completed' | 'active' | 'upcoming' =
          step.status === 'completed' || step.status === 'error'
            ? 'completed'
            : step.status === 'active'
              ? 'active'
              : 'upcoming';

        return (
          <div key={step.label} className="contents">
            {index > 0 && <Connector status={connectorStatus} />}
            <div
              data-testid={`timeline-step-${index}`}
              className="flex flex-col items-center gap-1"
            >
              <StepIcon status={step.status} />
              <span
                className={cn(
                  'text-[10px] leading-tight whitespace-nowrap',
                  step.status === 'completed' && 'text-foreground',
                  step.status === 'active' && 'font-medium text-primary',
                  step.status === 'error' && 'font-medium text-destructive',
                  step.status === 'upcoming' && 'text-muted-foreground/60'
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
