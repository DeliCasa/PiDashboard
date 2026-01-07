/**
 * MetricCard Component
 * Displays a single system metric with icon, value, and threshold indicator
 */

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { LucideIcon } from 'lucide-react';

export type ThresholdStatus = 'normal' | 'warning' | 'critical';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  unit?: string;
  maxValue?: number;
  status?: ThresholdStatus;
  showProgress?: boolean;
  className?: string;
}

const statusColors: Record<ThresholdStatus, string> = {
  normal: 'text-green-500',
  warning: 'text-yellow-500',
  critical: 'text-red-500',
};

const progressColors: Record<ThresholdStatus, string> = {
  normal: '[&>div]:bg-green-500',
  warning: '[&>div]:bg-yellow-500',
  critical: '[&>div]:bg-red-500',
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  unit = '%',
  maxValue = 100,
  status = 'normal',
  showProgress = true,
  className,
}: MetricCardProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const displayValue = unit === '%' ? value.toFixed(1) : value.toFixed(1);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', statusColors[status])} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={cn('text-sm font-semibold', statusColors[status])}>
          {displayValue}{unit}
        </span>
      </div>
      {showProgress && (
        <Progress
          value={percentage}
          className={cn('h-2', progressColors[status])}
        />
      )}
    </div>
  );
}
