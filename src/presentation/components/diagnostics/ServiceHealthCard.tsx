/**
 * ServiceHealthCard Component
 * Feature: 038-dev-observability-panels
 *
 * Displays health status for a single backend service with status indicator,
 * response time, last checked timestamp, and sub-check details.
 */

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Server,
  Database,
  HardDrive,
  ChevronDown,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  HelpCircle,
  Timer,
} from 'lucide-react';
import { useState } from 'react';
import type { ServiceHealth, ServiceStatus } from '@/infrastructure/api/diagnostics-schemas';

interface ServiceHealthCardProps {
  health: ServiceHealth;
  className?: string;
}

/**
 * Service name display mapping
 */
const serviceDisplayNames: Record<string, string> = {
  bridgeserver: 'BridgeServer',
  piorchestrator: 'PiOrchestrator',
  minio: 'MinIO Storage',
};

/**
 * Service icon mapping
 */
const serviceIcons: Record<string, typeof Server> = {
  bridgeserver: Server,
  piorchestrator: Server,
  minio: HardDrive,
};

/**
 * Status badge variants and icons
 */
const statusConfig: Record<
  ServiceStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle; label: string }
> = {
  healthy: { variant: 'default', icon: CheckCircle, label: 'Healthy' },
  degraded: { variant: 'secondary', icon: AlertCircle, label: 'Degraded' },
  unhealthy: { variant: 'destructive', icon: XCircle, label: 'Unhealthy' },
  timeout: { variant: 'destructive', icon: Timer, label: 'Timeout' },
  unknown: { variant: 'outline', icon: HelpCircle, label: 'Unknown' },
};

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return 'N/A';
  }
}

/**
 * Format response time for display
 */
function formatResponseTime(ms: number | undefined): string {
  if (ms === undefined) return 'N/A';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ServiceHealthCard({ health, className }: ServiceHealthCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayName = serviceDisplayNames[health.service_name] || health.service_name;
  const ServiceIcon = serviceIcons[health.service_name] || Server;
  const config = statusConfig[health.status];
  const StatusIcon = config.icon;

  const hasChecks = health.checks && Object.keys(health.checks).length > 0;

  return (
    <Card
      data-testid={`service-health-card-${health.service_name}`}
      className={cn(
        'transition-colors',
        health.status === 'unhealthy' && 'border-destructive/50',
        health.status === 'degraded' && 'border-yellow-500/50',
        className
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ServiceIcon className="h-4 w-4 text-muted-foreground" />
              {displayName}
            </CardTitle>
            <Badge
              data-testid="service-status-badge"
              variant={config.variant}
              className="flex items-center gap-1"
            >
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-2">
          {/* Response time and last checked */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1" data-testid="response-time">
              <Timer className="h-3 w-3" />
              <span>{formatResponseTime(health.response_time_ms)}</span>
            </div>
            <div className="flex items-center gap-1" data-testid="last-checked">
              <Clock className="h-3 w-3" />
              <span>{formatTimestamp(health.last_checked)}</span>
            </div>
          </div>

          {/* Error message if present */}
          {health.error_message && (
            <div
              data-testid="error-message"
              className="text-xs text-destructive bg-destructive/10 p-2 rounded"
            >
              {health.error_message}
            </div>
          )}

          {/* Collapsible sub-checks */}
          {hasChecks && (
            <>
              <CollapsibleTrigger
                data-testid="toggle-checks"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center pt-1"
              >
                <span>Show details</span>
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')}
                />
              </CollapsibleTrigger>

              <CollapsibleContent data-testid="checks-content" className="space-y-1">
                {Object.entries(health.checks!).map(([checkName, checkResult]) => (
                  <div
                    key={checkName}
                    data-testid={`check-${checkName}`}
                    className="flex items-center justify-between text-xs py-1 border-t"
                  >
                    <div className="flex items-center gap-1.5">
                      <Database className="h-3 w-3 text-muted-foreground" />
                      <span className="capitalize">{checkName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {checkResult.status === 'healthy' ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive" />
                      )}
                      {checkResult.message && (
                        <span className="text-muted-foreground truncate max-w-[100px]">
                          {checkResult.message}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </>
          )}
        </CardContent>
      </Collapsible>
    </Card>
  );
}
