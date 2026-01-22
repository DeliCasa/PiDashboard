/**
 * AutoOnboardMetricsCard Component
 * Feature: 035-auto-onboard-dashboard
 *
 * Displays success/failure counters and timestamps.
 * Includes reset button (FR-014).
 */

import { useState } from 'react';
import { BarChart3, RotateCcw, Loader2, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { AutoOnboardMetrics } from '@/infrastructure/api/v1-auto-onboard';

interface AutoOnboardMetricsCardProps {
  metrics?: AutoOnboardMetrics;
  onReset: () => void;
  isResetting: boolean;
  className?: string;
}

function formatTimestamp(isoString?: string): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function AutoOnboardMetricsCard({
  metrics,
  onReset,
  isResetting,
  className,
}: AutoOnboardMetricsCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleReset = () => {
    onReset();
    setDialogOpen(false);
  };

  // Default values if metrics not available
  const m = metrics ?? {
    attempts: 0,
    success: 0,
    failed: 0,
    rejected_by_policy: 0,
    already_onboarded: 0,
  };

  const successRate = m.attempts > 0 ? Math.round((m.success / m.attempts) * 100) : 0;

  return (
    <Card className={cn('', className)} data-testid="auto-onboard-metrics-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Onboarding Metrics
            </CardTitle>
            <CardDescription className="text-xs">
              Success/failure tracking
            </CardDescription>
          </div>
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isResetting || !metrics}
                className="h-8 px-2"
                data-testid="reset-metrics-button"
              >
                {isResetting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                <span className="sr-only">Reset metrics</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Metrics?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all onboarding counters to zero. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Success */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Success
            </div>
            <p className="text-xl font-semibold text-green-600" data-testid="metric-success">
              {m.success}
            </p>
          </div>

          {/* Failed */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <XCircle className="h-3 w-3 text-red-500" />
              Failed
            </div>
            <p className="text-xl font-semibold text-red-600" data-testid="metric-failed">
              {m.failed}
            </p>
          </div>

          {/* Rejected */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 text-amber-500" />
              Rejected
            </div>
            <p className="text-xl font-semibold text-amber-600" data-testid="metric-rejected">
              {m.rejected_by_policy}
            </p>
          </div>

          {/* Success Rate */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              Rate
            </div>
            <p className="text-xl font-semibold" data-testid="metric-rate">
              {successRate}%
            </p>
          </div>
        </div>

        {/* Timestamps */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1" data-testid="last-success-time">
            <Clock className="h-3 w-3" />
            Last success: {formatTimestamp(metrics?.last_success_at)}
          </div>
          <div className="flex items-center gap-1" data-testid="last-failure-time">
            <Clock className="h-3 w-3" />
            Last failure: {formatTimestamp(metrics?.last_failure_at)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
