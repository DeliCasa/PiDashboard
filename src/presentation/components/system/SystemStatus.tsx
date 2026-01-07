/**
 * SystemStatus Component
 * Real-time system health monitoring with adaptive thresholds
 */

import { Activity, Cpu, HardDrive, Thermometer, Clock, Server } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemStatus } from '@/application/hooks/useSystemStatus';
import { useAdaptiveThresholds } from '@/application/hooks/useAdaptiveThresholds';
import { MetricCard } from './MetricCard';
import { ThresholdIndicator } from './ThresholdIndicator';
import { cn } from '@/lib/utils';

interface SystemStatusProps {
  className?: string;
  compact?: boolean;
}

export function SystemStatus({ className, compact = false }: SystemStatusProps) {
  const { data: systemInfo, isLoading, error } = useSystemStatus();
  const { getThresholdStatus, piModel } = useAdaptiveThresholds();

  if (isLoading) {
    return <SystemStatusSkeleton className={className} />;
  }

  if (error || !systemInfo) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-destructive" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Failed to load system status
          </div>
        </CardContent>
      </Card>
    );
  }

  const cpuStatus = getThresholdStatus(systemInfo.cpu_usage, 'cpu');
  const memoryStatus = getThresholdStatus(systemInfo.memory_usage, 'memory');
  const tempStatus = getThresholdStatus(systemInfo.temperature, 'temperature');

  // Overall status is the worst of all metrics
  const overallStatus =
    cpuStatus === 'critical' || memoryStatus === 'critical' || tempStatus === 'critical'
      ? 'critical'
      : cpuStatus === 'warning' || memoryStatus === 'warning' || tempStatus === 'warning'
      ? 'warning'
      : 'normal';

  return (
    <Card className={className}>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            System Status
          </CardTitle>
          <ThresholdIndicator status={overallStatus} />
        </div>
        <CardDescription className="flex items-center gap-2">
          <Server className="h-3 w-3" />
          {systemInfo.hostname}
          {piModel !== 'unknown' && (
            <Badge variant="outline" className="text-xs">
              {piModel.toUpperCase()}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CPU Usage */}
        <MetricCard
          icon={Cpu}
          label="CPU Usage"
          value={systemInfo.cpu_usage}
          status={cpuStatus}
        />

        {/* Memory Usage */}
        <MetricCard
          icon={Activity}
          label="Memory Usage"
          value={systemInfo.memory_usage}
          status={memoryStatus}
        />

        {/* Disk Usage */}
        <MetricCard
          icon={HardDrive}
          label="Disk Usage"
          value={systemInfo.disk_usage}
          status={getThresholdStatus(systemInfo.disk_usage, 'memory')}
        />

        {/* Temperature & Uptime Footer */}
        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2">
            <Thermometer className={cn(
              'h-4 w-4',
              tempStatus === 'critical' && 'text-red-500',
              tempStatus === 'warning' && 'text-yellow-500',
              tempStatus === 'normal' && 'text-green-500'
            )} />
            <span className="text-sm font-medium">
              {systemInfo.temperature.toFixed(1)}°C
            </span>
            <ThresholdIndicator status={tempStatus} size="sm" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{systemInfo.uptime}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemStatusSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          System Status
        </CardTitle>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
        <Skeleton className="h-12 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}
