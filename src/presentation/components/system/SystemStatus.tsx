/**
 * SystemStatus Component
 * Real-time system health monitoring with WebSocket and polling fallback
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T045
 */

import {
  Activity,
  Cpu,
  HardDrive,
  Thermometer,
  Clock,
  Server,
  WifiOff,
  RefreshCw,
  Radio,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSystemMonitor } from '@/application/hooks/useSystemMonitor';
import { useAdaptiveThresholds } from '@/application/hooks/useAdaptiveThresholds';
import { MetricCard } from './MetricCard';
import { ThresholdIndicator } from './ThresholdIndicator';
import { cn } from '@/lib/utils';

interface SystemStatusProps {
  className?: string;
  compact?: boolean;
  /** Whether to prefer WebSocket (default: true) */
  preferWebSocket?: boolean;
}

/**
 * Connection status indicator component
 */
function ConnectionIndicator({
  transport,
  connectionState,
  isRefreshing,
  retryCount,
  onRefresh,
}: {
  transport: 'websocket' | 'polling' | 'none';
  connectionState: string;
  isRefreshing: boolean;
  retryCount: number;
  onRefresh: () => void;
}) {
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting' || connectionState === 'reconnecting';

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Transport indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isConnected ? 'default' : 'secondary'}
              className={cn(
                'gap-1 text-xs',
                isConnecting && 'animate-pulse',
                connectionState === 'error' && 'bg-destructive text-destructive-foreground'
              )}
            >
              {transport === 'websocket' ? (
                <>
                  <Radio className="h-3 w-3" />
                  WS
                </>
              ) : transport === 'polling' ? (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Poll
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Off
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {transport === 'websocket' && 'Real-time updates via WebSocket'}
              {transport === 'polling' && 'Updates every 5 seconds via polling'}
              {transport === 'none' && 'Monitoring disabled'}
            </p>
            {retryCount > 0 && <p className="text-xs opacity-80">Retry attempt: {retryCount}</p>}
          </TooltipContent>
        </Tooltip>

        {/* Connection status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected && 'bg-green-500',
                isConnecting && 'animate-pulse bg-yellow-500',
                connectionState === 'error' && 'bg-red-500',
                connectionState === 'disconnected' && 'bg-gray-400'
              )}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="capitalize">{connectionState}</p>
          </TooltipContent>
        </Tooltip>

        {/* Refresh button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export function SystemStatus({ className, compact = false, preferWebSocket = false }: SystemStatusProps) {
  // Note: WebSocket disabled by default because this component is mounted twice
  // (overview + system tabs), causing connection conflicts. Polling works reliably.
  const {
    data: monitoringData,
    connectionState,
    transport,
    isLoading,
    isRefreshing,
    error,
    retryCount,
    refresh,
  } = useSystemMonitor({ preferWebSocket });
  const { getThresholdStatus, piModel } = useAdaptiveThresholds();

  // Extract system health from monitoring data
  const systemHealth = monitoringData?.system_health;

  if (isLoading && !systemHealth) {
    return <SystemStatusSkeleton className={className} />;
  }

  if ((error || !systemHealth) && !isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-destructive" />
              System Status
            </CardTitle>
            <ConnectionIndicator
              transport={transport}
              connectionState={connectionState}
              isRefreshing={isRefreshing}
              retryCount={retryCount}
              onRefresh={refresh}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <WifiOff className="h-8 w-8" />
            <p>{error || 'Failed to load system status'}</p>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safe fallback values if systemHealth is partially available
  const cpuUsage = systemHealth?.cpu_usage ?? 0;
  const memoryUsage = systemHealth?.memory_usage ?? 0;
  const diskUsage = systemHealth?.disk_usage ?? 0;
  const temperature = systemHealth?.temperature ?? 0;
  const uptime = systemHealth?.uptime ?? '0s';

  const cpuStatus = getThresholdStatus(cpuUsage, 'cpu');
  const memoryStatus = getThresholdStatus(memoryUsage, 'memory');
  const tempStatus = getThresholdStatus(temperature, 'temperature');

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
          <div className="flex items-center gap-2">
            <ThresholdIndicator status={overallStatus} />
            <ConnectionIndicator
              transport={transport}
              connectionState={connectionState}
              isRefreshing={isRefreshing}
              retryCount={retryCount}
              onRefresh={refresh}
            />
          </div>
        </div>
        <CardDescription className="flex items-center gap-2">
          <Server className="h-3 w-3" />
          {monitoringData?.service_status?.service_uptime ? 'PiOrchestrator' : 'System'}
          {piModel !== 'unknown' && (
            <Badge variant="outline" className="text-xs">
              {piModel.toUpperCase()}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CPU Usage */}
        <MetricCard icon={Cpu} label="CPU Usage" value={cpuUsage} status={cpuStatus} />

        {/* Memory Usage */}
        <MetricCard icon={Activity} label="Memory Usage" value={memoryUsage} status={memoryStatus} />

        {/* Disk Usage */}
        <MetricCard
          icon={HardDrive}
          label="Disk Usage"
          value={diskUsage}
          status={getThresholdStatus(diskUsage, 'memory')}
        />

        {/* Temperature & Uptime Footer */}
        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2">
            <Thermometer
              className={cn(
                'h-4 w-4',
                tempStatus === 'critical' && 'text-red-500',
                tempStatus === 'warning' && 'text-yellow-500',
                tempStatus === 'normal' && 'text-green-500'
              )}
            />
            <span className="text-sm font-medium">{temperature.toFixed(1)}°C</span>
            <ThresholdIndicator status={tempStatus} size="sm" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{uptime}</span>
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
