/**
 * ThresholdIndicator Component
 * Visual indicator for threshold status with color coding
 *
 * Feature: 005-testing-research-and-hardening (T035)
 * Added data-testid attributes for reliable test selectors.
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ThresholdStatus } from './MetricCard';

interface ThresholdIndicatorProps {
  status: ThresholdStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusLabels: Record<ThresholdStatus, string> = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
};

const statusBadgeVariants: Record<ThresholdStatus, string> = {
  normal: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

const dotSizes: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

const dotColors: Record<ThresholdStatus, string> = {
  normal: 'bg-green-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
};

export function ThresholdIndicator({
  status,
  showLabel = true,
  size = 'md',
  className,
}: ThresholdIndicatorProps) {
  if (!showLabel) {
    return (
      <span
        data-testid={`threshold-dot-${status}`}
        className={cn(
          'rounded-full animate-pulse',
          dotSizes[size],
          dotColors[status],
          className
        )}
      />
    );
  }

  return (
    <Badge
      data-testid={`threshold-badge-${status}`}
      variant="outline"
      className={cn(statusBadgeVariants[status], className)}
    >
      <span
        className={cn(
          'mr-1.5 rounded-full',
          dotSizes.sm,
          dotColors[status]
        )}
      />
      {statusLabels[status]}
    </Badge>
  );
}
