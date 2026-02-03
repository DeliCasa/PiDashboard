/**
 * DiagnosticsSection Component
 * Feature: 038-dev-observability-panels
 *
 * Main diagnostics panel with service health overview.
 * Displays health status for BridgeServer, PiOrchestrator, and MinIO.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Stethoscope, AlertCircle, CheckCircle } from 'lucide-react';
import { useHealthChecks, useRefreshHealthChecks, getOverallHealthStatus } from '@/application/hooks/useDiagnostics';
import { ServiceHealthCard } from './ServiceHealthCard';
import { SessionsPanel } from './SessionsPanel';
import { cn } from '@/lib/utils';
import { isFeatureUnavailable } from '@/infrastructure/api/client';

/**
 * Loading skeleton for health cards
 */
function HealthCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Error state component
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground text-center">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Overall health status badge
 */
function OverallHealthBadge({
  status,
}: {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}) {
  const config = {
    healthy: { variant: 'default' as const, label: 'All Systems Healthy', icon: CheckCircle },
    degraded: { variant: 'secondary' as const, label: 'Degraded', icon: AlertCircle },
    unhealthy: { variant: 'destructive' as const, label: 'Issues Detected', icon: AlertCircle },
    unknown: { variant: 'outline' as const, label: 'Checking...', icon: AlertCircle },
  };

  const { variant, label, icon: Icon } = config[status];

  return (
    <Badge
      data-testid="overall-health-badge"
      variant={variant}
      className="flex items-center gap-1"
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export function DiagnosticsSection() {
  const { data, isLoading, error, refetch, dataUpdatedAt, isFetching } = useHealthChecks();
  const { refresh } = useRefreshHealthChecks();

  // Handle error state
  if (error && !isFeatureUnavailable(error)) {
    return (
      <ErrorState
        message="Failed to fetch health status. Please check your connection."
        onRetry={() => refetch()}
      />
    );
  }

  // Determine overall health status
  const overallStatus = data?.services
    ? getOverallHealthStatus(data.services)
    : 'unknown';

  // Format last updated time
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Never';

  return (
    <div data-testid="diagnostics-section" className="space-y-6">
      {/* Service Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">DEV Diagnostics</CardTitle>
                <CardDescription>Service health monitoring</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <OverallHealthBadge status={overallStatus} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Last updated and refresh button */}
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              Last checked: <span data-testid="last-updated">{lastUpdated}</span>
            </div>
            <Button
              data-testid="refresh-health"
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isFetching}
            >
              <RefreshCw
                className={cn('h-4 w-4 mr-2', isFetching && 'animate-spin')}
              />
              Refresh
            </Button>
          </div>

          {/* Health Cards Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            {isLoading ? (
              <>
                <HealthCardSkeleton />
                <HealthCardSkeleton />
                <HealthCardSkeleton />
              </>
            ) : data?.services ? (
              data.services.map((service) => (
                <ServiceHealthCard
                  key={service.service_name}
                  health={service}
                />
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
                No health data available
              </div>
            )}
          </div>

          {/* Polling indicator */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                isFetching ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
              )}
            />
            <span>Auto-refresh every 5 seconds</span>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Panel */}
      <SessionsPanel />
    </div>
  );
}
