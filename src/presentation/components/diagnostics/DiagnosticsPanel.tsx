/**
 * DiagnosticsPanel Component
 * Feature: 042-diagnostics-integration (T016)
 *
 * Displays camera diagnostics data including health metrics, connection quality,
 * and extended diagnostic information.
 */

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Activity, Wifi, Clock, HardDrive } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConnectionQualityFromRssi } from './ConnectionQualityBadge';
import type { CameraDiagnostics, CameraStatus } from '@/domain/types/camera-diagnostics';

interface DiagnosticsPanelProps {
  /** Camera diagnostics data */
  diagnostics: CameraDiagnostics | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format uptime in human-readable form
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);

  return parts.join(' ');
}

/**
 * Format heap memory in human-readable form
 */
function formatHeap(bytes: number): string {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Status badge colors
 */
const statusColors: Record<CameraStatus, string> = {
  online: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  offline: 'bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30',
  error: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  rebooting: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  discovered: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  pairing: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  connecting: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
};

const statusLabels: Record<CameraStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  error: 'Error',
  rebooting: 'Rebooting',
  discovered: 'Discovered',
  pairing: 'Pairing',
  connecting: 'Connecting',
};

/**
 * Loading skeleton for the panel
 */
function DiagnosticsPanelSkeleton() {
  return (
    <Card data-testid="diagnostics-panel-skeleton">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Error state display
 */
function DiagnosticsPanelError({ error }: { error: Error }) {
  return (
    <Card data-testid="diagnostics-panel-error">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription data-testid="diagnostics-error-message">
            {error.message || 'Failed to load diagnostics'}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

/**
 * Metric card for displaying individual metrics
 */
function MetricCard({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  testId: string;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
      data-testid={testId}
    >
      <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

/**
 * DiagnosticsPanel displays camera health metrics and diagnostics
 */
export function DiagnosticsPanel({
  diagnostics,
  isLoading,
  error,
  className,
}: DiagnosticsPanelProps) {
  if (isLoading) {
    return <DiagnosticsPanelSkeleton />;
  }

  if (error) {
    return <DiagnosticsPanelError error={error} />;
  }

  if (!diagnostics) {
    return (
      <Card data-testid="diagnostics-panel-empty">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No diagnostics data available</p>
        </CardContent>
      </Card>
    );
  }

  const { health, diagnostics: detail, status } = diagnostics;

  return (
    <Card className={cn('', className)} data-testid="diagnostics-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Diagnostics</CardTitle>
          <Badge
            variant="outline"
            className={cn(statusColors[status])}
            data-testid="camera-status-badge"
          >
            {statusLabels[status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Metrics */}
        {health ? (
          <div className="grid grid-cols-2 gap-3" data-testid="health-metrics">
            <MetricCard
              icon={Wifi}
              label="Signal"
              value={
                <ConnectionQualityFromRssi rssi={health.wifi_rssi} showRssi />
              }
              testId="metric-signal"
            />
            <MetricCard
              icon={HardDrive}
              label="Free Memory"
              value={formatHeap(health.heap)}
              testId="metric-heap"
            />
            <MetricCard
              icon={Clock}
              label="Uptime"
              value={formatUptime(health.uptime)}
              testId="metric-uptime"
            />
            {detail?.frame_rate && (
              <MetricCard
                icon={Activity}
                label="Frame Rate"
                value={`${detail.frame_rate} fps`}
                testId="metric-framerate"
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="no-health-data">
            Health metrics unavailable (camera may be offline)
          </p>
        )}

        {/* Extended Diagnostics */}
        {detail && (
          <div className="space-y-2 pt-2 border-t" data-testid="extended-diagnostics">
            {detail.firmware_version && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Firmware</span>
                <span data-testid="firmware-version">{detail.firmware_version}</span>
              </div>
            )}
            {detail.resolution && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Resolution</span>
                <span data-testid="resolution">{detail.resolution}</span>
              </div>
            )}
            {detail.avg_capture_time_ms && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Capture</span>
                <span data-testid="capture-time">{detail.avg_capture_time_ms}ms</span>
              </div>
            )}
            {detail.error_count > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Errors</span>
                <span className="text-red-600" data-testid="error-count">
                  {detail.error_count}
                </span>
              </div>
            )}
            {detail.last_error && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription data-testid="last-error">
                  {detail.last_error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* IP Address */}
        {diagnostics.ip_address && (
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">IP Address</span>
            <code className="text-xs" data-testid="ip-address">
              {diagnostics.ip_address}
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DiagnosticsPanel;
